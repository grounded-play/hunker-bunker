# Steam Lobby Integration — Implementation Plan

Date: 2026-08-20. Supersedes Part B of `docs/steamstorestatus.log` (the
"walk me through setting this up" conversation at the end of that file) as
the working plan for this specific piece — that log stays as historical
record of the original walkthrough and dashboard scrape. Part A of that
walkthrough (production Steam auth) is done; see `PRODUCT_STATE.md` for the
current, corrected state of everything else.

## Where things actually stand right now

Confirmed by reading the installed `steamworks.js` v0.4.0 type definitions
directly (`node_modules/steamworks.js/client.d.ts`, `callbacks.d.ts`,
`index.d.ts`) rather than trusting the log's own uncertainty on this:

- `matchmaking.createLobby(lobbyType, maxMembers)`, `.joinLobby(lobbyId)`,
  `.getLobbies()`, and the `Lobby` class (`id`, `.join()`, `.leave()`,
  `.openInviteDialog()`, `.getMembers()`, `.getOwner()`, `.setJoinable()`,
  `.getData()`/`.setData()`/`.mergeFullData()`) all exist exactly as the
  log described.
- `callback.register(SteamCallback.GameLobbyJoinRequested, handler)` exists
  and delivers `{ lobby_steam_id, friend_steam_id }` (both `bigint`).
- **Correction to the log's own uncertainty:** no manual callback pump is
  needed. `index.d.ts` types `init()` as
  `Omit<Client, "init" | "runCallbacks">` — `runCallbacks` exists on the
  underlying Rust-side client but is deliberately not exposed to JS
  consumers, meaning this binding (`ceifa/steamworks.js`, a native N-API
  addon) pumps Steam callbacks on its own background thread. The log's own
  suggestion to "add a small callback pump — something like 50–100ms" is
  unnecessary and there's no public method to do it with anyway.
- `localplayer.setRichPresence(key, value)` exists as described.
- **Nothing lobby-related exists in this codebase yet** — confirmed via
  grep across `electron/main.cjs`/`electron/preload.cjs`: zero references
  to `matchmaking`, `createLobby`, `GameLobbyJoinRequested`, or
  `setRichPresence`. This is genuinely greenfield, same conclusion the log
  reached, now double-checked.
- **New gap found, not in the log:** `electron/main.cjs` has no
  `app.requestSingleInstanceLock()` / `second-instance` handling at all.
  Steam's `+connect_lobby <id>` cold-launch case needs this — without it,
  a friend's "Join Game" click while Hunker is already running could
  spawn a second OS process instead of routing into the existing window.
  (The already-running, no-cold-launch case — `GameLobbyJoinRequested`
  firing in a process that's already open — doesn't need this; only the
  "Steam launches a new process with `+connect_lobby` while one is
  already running" case does.)

## What already works and doesn't need to change

- `steamworks.js` is already initialized in `electron/main.cjs` against
  real App ID 4957040; `steam_appid.txt` auto-creation for dev already
  works.
- The existing `hb:getSteamAuthTicket` / `createSteamSession()` /
  `/steam/session` chain (Part A, now live in production) is untouched by
  any of this — Steam Lobbies are a discovery/party layer on top, not a
  replacement for the authenticated relay.
- `src/multiplayerLobby.js`'s room-code-based flow keeps working
  unmodified for browser dev/LAN/QA — Steam Lobbies are additive, gated on
  `window.electronAPI` being present, same pattern already used for
  `getSteamAuthTicket`/`createSteamSession`.

## Implementation, in dependency order

### 1. `electron/main.cjs` — SteamLobbyService

New functions, same style as the existing `steamClient.auth`/`.achievement`/
`.stats` IPC handlers already in this file:

- `hb:steamCreateLobby` → `steamClient.matchmaking.createLobby(LobbyType.FriendsOnly, maxPlayers)`, then `.mergeFullData({ hb_protocol, hb_mode, hb_state: 'lobby', hb_build, hb_room: 'STEAM-' + lobby.id })`.
- `hb:steamJoinLobby(lobbyId)` → `steamClient.matchmaking.joinLobby(BigInt(lobbyId))`.
- `hb:steamLeaveLobby` → `lobby.leave()`.
- `hb:steamGetLobby` → current lobby's `.getFullData()` + `.getMembers()` + `.getOwner()`, for the renderer to read state without holding the `Lobby` object itself (which can't cross the IPC/contextBridge boundary directly — only plain serializable data can).
- `hb:steamOpenInviteDialog` → `lobby.openInviteDialog()`.
- `hb:steamSetRichPresence(status, connect)` → `localplayer.setRichPresence('status', status)` + `localplayer.setRichPresence('connect', connect)`.
- `callback.register(SteamCallback.GameLobbyJoinRequested, ({ lobby_steam_id }) => { ... })`, registered once at startup (not per-request like the others), forwarding to the renderer via `mainWindow.webContents.send('hb:steamLobbyJoinRequested', lobby_steam_id.toString())`.
- Single-instance lock: `app.requestSingleInstanceLock()` near the top of the file (before `app.whenReady()`), with a `second-instance` handler that extracts `+connect_lobby <id>` from the relaunch's `argv` and forwards it the same way as the callback above, plus focuses the existing window.
- Cold-start `+connect_lobby` parsing: scan `process.argv` at startup for `+connect_lobby` followed by a lobby id; if found, hold it as `pendingLobbyId` and send it to the renderer once `mainWindow` is ready (mirroring the `second-instance` path so both cases funnel through one function).

### 2. `electron/preload.cjs` — expose the bridge

Straightforward `ipcRenderer.invoke`/`.send` wrappers under
`window.electronAPI`, matching the existing naming convention
(`getSteamAuthTicket`, `createSteamSession`, etc.):
`steamCreateLobby`, `steamJoinLobby`, `steamLeaveLobby`, `steamGetLobby`,
`steamOpenInviteDialog`, `steamSetRichPresence`, plus
`onSteamLobbyJoinRequested(handler)` subscribing to the main→renderer push
event (both the live-callback and cold-start-argv cases arrive through
this one channel).

### 3. `src/steamLobbyClient.js` (new file) — renderer-side wrapper

A small, pure-ish module (same shape as `src/gameController.js`) that:
- Wraps the `window.electronAPI.steam*` calls with the "no-op outside
  Electron" guard already established elsewhere in this codebase.
- Derives the relay room code as `STEAM-${lobbyId}` (matching the log's
  own recommendation) instead of `SECTOR-7`/random codes when a session
  originated from a Steam lobby.
- Exposes a build-compatibility check comparing local `hb_protocol`
  against the lobby's `hb_protocol` metadata, returning a clear
  `VERSION_MISMATCH` result `multiplayerLobby.js` can surface instead of
  letting mismatched builds connect and hit confusing desync bugs.

### 4. `src/multiplayerLobby.js` — wire it in

- Add "Create Co-op Lobby" / "Invite Steam Friend" UI actions that call
  into `steamLobbyClient.js` when `window.electronAPI` is present, falling
  back to the existing room-code flow otherwise (dev/browser/LAN
  unaffected).
- Subscribe to `onSteamLobbyJoinRequested` once, at the same point the
  class already sets up its socket listeners — on firing, call
  `steamLobbyClient`'s join, then reuse the existing `connect()`/`joinRoom`
  path with the derived `STEAM-<id>` room code.
- Call `steamSetRichPresence` on lobby state changes (created, player
  joined/left, ready, deployed) with the log's suggested
  `status`/`connect` shape (`status: "Co-op Expedition — 2/4 Operatives"`,
  `connect: "+connect_lobby <id>"`).

## Explicitly out of scope for this pass

- Never trust lobby metadata for damage, item grants, results, scores, or
  identity — the authenticated relay (Part A, already live) stays
  authoritative for all of that, same boundary the log already drew
  correctly. Lobby data is discovery/party-state only.
- PvP lobby flow can reuse the same `SteamLobbyService` with
  `hb_mode: 'pvp'` — not a separate implementation, just a different
  metadata value and player count.

## Sequencing

1. Single-instance lock + argv parsing (electron/main.cjs) — foundational,
   nothing else depends on it existing first, but it's needed before
   cold-start Join Game can work at all, so do it first rather than bolt
   it on last.
2. `SteamLobbyService` functions + `GameLobbyJoinRequested` registration
   (electron/main.cjs) + preload exposure.
3. `src/steamLobbyClient.js` (new, testable in isolation — pure logic like
   the `STEAM-<id>` room derivation and protocol-mismatch check can get
   real unit tests without a live Steam client, same `.prototype.call()` /
   dependency-injection pattern used throughout this session).
4. Wire into `src/multiplayerLobby.js` (UI actions + join-request
   subscription + Rich Presence calls).
5. Live verification — this is where it's genuinely blocked without real
   Steam accounts: create/join/invite/accept/`+connect_lobby` cold-start
   all need an actual second Steam account accepting a real invite. Steps
   1-4 are ordinary engineering work I can do without that; step 5 is the
   same acceptance gate Sprint 26 already names.

## Acceptance (unchanged from the log, restated for reference)

Two real Steam accounts: Account A creates a lobby and invites Account B
via the Steam overlay; B accepts (both while Hunker is running, and
separately while it's closed, to exercise both the live-callback and
`+connect_lobby` cold-start paths); both land in the same
`STEAM-<lobbyId>` relay room with real SteamID64s and `devMode: false`;
ready up, deploy, play a synchronized encounter; disconnect/reconnect
preserves identity (Sprint 26's existing host-failover work already
covers this once the relay room is Steam-lobby-derived instead of a room
code); Rich Presence shows "Join Game" correctly on both profiles.
