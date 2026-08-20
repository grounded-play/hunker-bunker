# Multiplayer flow rework + lobby bugs — 2026-08-20

Source: a real two-machine playtest, reported live and backed by
`docs/logs/log9.json` (a single-player-side session export, Electron/Steam
build, 2026-08-20 17:49-17:51 UTC). The user's report, verbatim:

> so it's not really working, I can't see the other persons lobby, the
> numbers on the two systems don't match... I have not seen the agent name
> match what I set it at, and there is drift on the settings name and the
> one we start at a new run

...plus a feature request: restructure the new-run flow so class select is
followed by armory, then a **third, deeper screen** ("behind doors") that
segments PvP vs. team-up and absorbs everything currently on the tactical
lobby menu, before the run starts — with a custom cutscene keyed to which
players joined the squad and what they're running.

This document has two parts: bugs (diagnosed against real evidence, one
fixed this pass, two left open with a recommended path), and the new-run
flow redesign (planning only — not built this pass, this is what the user
asked to have documented).

## Part 1 — bugs

### 1a. Agent name wrong + per-machine stat drift — FIXED this pass

**Root cause: `window.profileManager` vs `window.profile`, a dead global
reference.** `main.js:2138-2139` creates the one real `ProfileManager` and
assigns it to `window.profile` — that's the only name ever assigned,
anywhere in the codebase. Five call sites across three files had drifted to
reading `window.profileManager` instead, a name nothing ever assigns:

- `src/multiplayerLobby.js:256` and `:418` — roster callsign lookup
- `src/multiplayerLobby.js:289` — `profileId` sent in `joinRoom`
- `main.js:3968` — `recordMultiplayerRun()`
- `main.js:8557` — trade-modal self callsign
- `src/playerTrade.js:218-219` — `recordTradeCompleted()`

Every one of these is optional-chained (`window.profileManager?.x?.()`), so
each silently no-op'd instead of throwing — nothing in the console ever
flagged it. The multiplayer roster's callsign lookup fell through to the
hardcoded `'AGENT'` fallback **100% of the time, for every player**, which
is exactly the `"AGENT (HOST)"` string clicked in `log9.json` entry 51 (the
user had definitely set a real callsign; it just never had a chance to
reach the roster display). `recordMultiplayerRun()` and
`recordTradeCompleted()` are both correctly implemented in `src/profile.js`
(lines 97-109 and 111) — they just never ran, on either machine, so local
multiplayer/trade stats (`multiplayerMatches`, `multiplayerVictories`,
`coopExpeditions`, `pvpDuels`) silently stayed at zero. That's the most
likely explanation for **"the numbers on the two systems don't match"**:
other stat paths (Steam stats sync, fixed in a prior pass) may be updating
normally while these local counters never move at all, and two players
comparing their own screens would see exactly that kind of mismatch.

**Fix shipped:** all five call sites now read `window.profile` instead of
the dead `window.profileManager` name. Regression-guarded with
`src/profileManagerGlobalName.test.js`, a repo-wide scan (same pattern as
the existing `act2StateSurfaceAudit.test.js`) that fails if
`window.profileManager` ever reappears anywhere in `src/` or `main.js` —
verified live to fail with the typo reintroduced, pass with the fix. Full
suite (1799 tests) and a production build both green after the change.

**Re: "drift on the settings name and the one we start at a new run"** —
investigated directly: the Settings screen (`#operator-callsign`,
`main.js:10872-10878`) and the new-run roster screen
(`#roster-callsign-input`, `renderRosterModal()` at `main.js:10936-10982`)
both correctly read/write the *same* `window.profile` object already —
there was never a second, unsynced store between those two screens. The
"drift" the user is describing is almost certainly this same bug seen from
a different angle: Settings and the roster screen both show the real
callsign correctly, while the one place being compared against —
the multiplayer lobby — always showed the broken `'AGENT'` fallback. That
reads as "the name I set doesn't match what shows up," even though the
underlying stored value was never actually wrong or split into two stores.

### 1b. Can't see the other player's lobby — NOT fixed, real environment limitation found

Traced the full pipeline and it is correct on our side, end to end:

- `electron/main.cjs` `hb:steamCreateLobby` (~line 928): `visibility`
  defaults to `'public'`, resolves to Steamworks `LobbyType.Public` (`2`)
  correctly, and `hb_protocol`/`hb_mode`/`hb_room` metadata is set via
  `setLobbyData` before the lobby is usable.
- `hb:steamGetLobbies` (~line 984): calls `matchmaking.getLobbies()` and
  filters for `lobby.data?.hb_protocol`, correctly excluding unrelated
  same-AppID lobbies. Not a filtering bug.
- `src/steamLobbyClient.js` / `src/multiplayerLobby.js`
  `refreshSteamLobbies()`: correctly wired, renders every lobby the backend
  returns.
- AppID is consistent everywhere checked (`steam_appid.txt`,
  `electron/main.cjs`): `4957040`. Ruled out as a mismatch.

**The real suspect:** the installed `steamworks.js` (v0.4.0) exposes
`getLobbies(): Promise<Array<Lobby>>` — **zero parameters**, no way to pass
a distance/region filter from JS. Per Valve's own Steamworks documentation
for `ISteamMatchmaking::AddRequestLobbyListDistanceFilter`: if a caller
never explicitly adds a distance filter before `RequestLobbyList`, Steam
applies `k_ELobbyDistanceFilterDefault`, which Valve documents as
restricting results to the **same immediate region** — not worldwide. If
this native binding's Rust implementation never calls that filter function
(nothing in the JS-facing surface allows it to), every `getLobbies()` call
is implicitly region-restricted with no override available in this package
version. That matches the reported symptom exactly: the lobby is genuinely
Public, metadata is correct, everything server-side checks out — but two
players in different Steam-determined regions never see each other in the
browse list.

**This is a real limitation of the currently-installed native binding, not
a bug in this codebase.** Two real paths forward, neither of which is a
quick patch:

1. Fork/patch the native `steamworks.js` binding (or find/upgrade to a
   version whose Rust layer calls `AddRequestLobbyListDistanceFilter` with
   `Worldwide`) — the "correct" long-term fix, but real native-binding work.
2. Don't depend on Steam's native lobby browse-list for cross-region
   discovery at all. The room-code path already routes through the
   self-hosted relay backend (`steam.tuesdaycinema.club`, confirmed live in
   `PRODUCT_STATE.md`) which has no region restriction — the pragmatic
   near-term fix is likely to lean on that path (e.g., a "recent/friends'
   lobbies" list sourced from the relay's own room registry rather than
   Steam's `getLobbies()`) rather than waiting on the native binding.

Recommend picking one of these explicitly before touching this again;
flagging it here rather than guessing further blind.

### 1c. "Numbers on the two systems don't match" — partially explained, rest unresolved

1a above (`recordMultiplayerRun`/`recordTradeCompleted` never firing) is
the strongest single explanation and is now fixed. One other synced-number
display was found: `src/multiplayerLobby.js:534-535`,
`${mode} // ${memberCount}/4 OPERATIVES`, sourced from the Steam lobby's
member list *at the moment of the last manual refresh* — since it's
poll-on-refresh rather than push-synced, two clients refreshing at
different moments could legitimately show different counts for a few
seconds, which might also be part of what was seen. If the mismatch the
user saw wasn't stat counts and wasn't member count, we don't yet know
which numbers — worth a follow-up describing exactly which two numbers
didn't match next time it's reproduced.

## Part 2 — new-run flow redesign (planning only, not built this pass)

### Current flow, as it actually exists today

**Solo:** Title → `#title-newrun-btn` → briefing/roster screen
(`.char-card` class select + roster modal, "CONFIRM CALLSIGN & DEPLOY") →
`#start-game` ("INITIALIZE") → `openArmoryGate()` (`main.js:7043-7045`) →
**Armory screen** (`appPhase='armory'`, UI in `src/armoryUi.js`, live —
`ARMORY_SCREEN_ENABLED = true` in `src/featureFlags.js:20`) →
`#armory-btn-embark` → `closeArmoryScreen({embark:true})` → gameplay. Daily
Ops follows the identical pattern.

**Multiplayer — structurally separate today, this is the core problem:**
`MultiplayerLobby.bindUi()` (`src/multiplayerLobby.js:170-206`) binds the
tactical-net modal open to *two* buttons — `#title-multiplayer-btn` on the
title screen directly, and `#briefing-multiplayer-btn` inside the roster
screen — so there's no single canonical entry point and no enforced
ordering against class selection. Worse: the modal's deploy button fires
`startMultiplayerRun()` (`src/gameController.js:78`, called from
`multiplayerLobby.js:767`) directly — a **completely separate code path
from `openArmoryGate`** (only 2 call sites exist,
`main.js:7045`/`7058`, both solo). **Multiplayer players never see the
Armory screen at all today.** This is exactly backwards from what's wanted.

The tactical-net modal itself (confirmed in `src/multiplayerLobby.js`)
already contains everything the user wants folded into the new third
screen: mode cards (`#net-mode-coop-btn`/`#net-mode-pvp-btn`), room
code create/join, the Steam public-lobby browser + refresh, the roster list
(`#net-roster-list`), ready/deploy (`#net-deploy-btn`), and invite friends
(`#net-steam-invite-btn`). Nothing there needs to be rebuilt from scratch —
it needs to be **relocated** to fire after armory instead of standing
beside/before it.

**Cutscene infrastructure — further along than expected.** Contrary to a
stale note in project memory, per-class intro video assets already exist:
`public/cutscenes/{scout,tank,engineer}-class-intro.{mp4,webm}` (+ posters,
+ a second `-intro.webm` set). Selection is via
`CLASS_CHARACTER_INTRO_BASENAMES`/`CLASS_INTRO_WEBM_BASENAMES`
(`main.js:6022-6031`), played by `playClassIntroSequence(playerType)`
(`main.js:6141`), invoked from `runMissionIntroSequence()`
(`main.js:6744`) — but only from the solo/Daily-Ops launch path
(`main.js:7036`, `7101`), only for the **local player's own single class**,
and **never called from the multiplayer deploy path at all**. Separately,
`src/cutscene.js` is a different, older system (the crash-intro ship-drop
animation) — don't conflate the two when building this.

**Squad roster data — half of what's needed already exists.**
`MultiplayerLobby.players` (a `Map`, entries `{id, callsign, opClass, ping,
isSelf, ready}`, set at `multiplayerLobby.js:292-338`) already tracks each
player's **class** — enough to drive a squad-composition cutscene selector
keyed on which classes are present. It does **not** sync per-player
**loadout** (weapons/mods/charms) — that data lives only in the local
`loadoutManager` on each machine and is never sent to peers or attached to
a roster entry. The user's "and loadouts as well" ask requires adding that
sync; it's genuinely new, not a relocation of existing data.

### Desired flow

```
Title → NEW RUN
  → Class select (existing roster/briefing screen, kept)
  → Armory (existing screen, kept — now the SAME path for solo and multiplayer)
  → NEW: Deployment Briefing screen ("third screen, behind doors")
      - Segment: SOLO / CO-OP / PVP
      - If CO-OP or PVP: host-a-lobby, browse/join open lobbies, host sets
        the lobby private with a password (new), roster, ready-up, and
        Steam friends invite — today's tactical-net modal contents
        relocated here, plus the new private+password capability
      - Replaces BOTH current entry points (#title-multiplayer-btn and
        #briefing-multiplayer-btn) with this one canonical spot
  → Squad-composition + loadout-aware cutscene (new)
      - Solo: existing single-class playClassIntroSequence, unchanged
      - Squad: new selector reading the full roster (class + loadout per
        player), not just the local player's class
  → Gameplay start
```

### What this actually requires, broken into phases

**Phase 1 and 2 — SHIPPED and live-verified 2026-08-20 (later).** Both
phases below were built together, since Phase 2's screen needed Phase 1's
rerouting to have anywhere to open into. Live-tested end to end against the
real running dev server (Playwright driving a real browser, not just unit
tests): title → NEW RUN → class select → Armory → embark now opens the
Deployment Briefing screen with SOLO active by default (`net-mode-solo-btn`
has the `active` class, telemetry/roster columns correctly hidden, Armory
itself correctly torn down); clicking **DEPLOY SOLO** launches straight
into real gameplay (`performanceProfile: 'gameplay'`, `isMultiplayer:
false`, fullscreen game container) with zero console errors throughout.
Separately verified picking CO-OP connects to a real local relay server
(`ONLINE // RELAY ACTIVE`), correctly hides the private-lobby fields once
connected, and that the "×" close button correctly returns to the title
menu (`onCancel`) instead of leaving the screen in a dead state. Also
verified the old title-screen "TACTICAL NET" button, now rebound to the
same flow as "NEW RUN" instead of skipping class-select/Armory, correctly
opens the roster/class-select screen. Full test suite (1821 tests) and a
production build both green throughout.

**Phase 1 — reroute multiplayer through armory (structural, no new UI).**
Removed the title-screen and briefing-screen tactical-net entry points as
standalone modal-openers; `#title-multiplayer-btn` is now rebound to the
same handler as `#title-newrun-btn` (`main.js`'s new
`startNewTacticalRunFlow()`), and `#briefing-multiplayer-btn`'s container
is hidden (`index.html`, `#multiplayer-command`) rather than deleted.
`#start-game`'s Armory-embark callback (`main.js`) now opens the
Deployment Briefing screen instead of calling `launchStandardRun`
directly; `src/gameController.js`'s `startMultiplayerRun` no longer
DOM-clicks back through Armory (`clickThroughToArmoryEmbark` removed
entirely) since Armory has already run by the time it fires — it just
sets up the multiplayer session and calls the same launch callback Armory
itself captured. This fixes the "multiplayer players never see Armory in
the right order" gap and gives every run — solo or multiplayer — one
shared launch sequence.

**Phase 2 — build the Deployment Briefing screen.** Reused the existing
tactical-net modal (`#multiplayer-modal`) rather than building a new one
from scratch: added a SOLO mode card (`#net-mode-solo-btn`, default-active
whenever the screen opens, regardless of what mode was picked last run —
opening this screen must never imply a live relay/Steam connection by
surprise) alongside the existing CO-OP/PVP cards. `multiplayerLobby.js`'s
`openModal()` now takes `{ onLaunch, onCancel }` callbacks instead of
opening itself from a button click; `setMode()` only calls `connect()` when
CO-OP/PVP is actually chosen (previously `openModal()` connected
unconditionally on every open, which would have silently created a live
Steam lobby even for a run that turns out solo). SOLO's deploy button
(`handleDeployButtonClick`) skips the entire relay/ready-up path and calls
`onLaunch` directly; a completed CO-OP/PVP deploy (`finalizeDeploy`) does
the same after `setupMultiplayerNetwork()` runs. The "×" button
(`cancelModal`, new) is the only path that fires `onCancel` — the two
success paths call the plain `closeModal()` instead, so a completed deploy
can never race with "return to menu."

The user specified the exact lobby capabilities CO-OP/PVP must expose here.
Checked each against what's actually in the codebase today (`visibility`
grep across `electron/main.cjs`/`src/steamLobbyClient.js`/
`src/multiplayerLobby.js`, and a DOM search of `index.html`'s multiplayer
modal markup):

- **Host a lobby** — exists, reuse as-is. `createSteamLobby()`.
- **Join an open (public) lobby** — exists in code
  (`refreshSteamLobbies()`/lobby browser), but is the exact feature blocked
  by 1b above (region-filter limitation). Relocating this UI doesn't fix
  that; resolving 1b is a prerequisite for this capability actually working
  cross-region, not just cross-desk/same-network.
- **Host sets the lobby private, with a password — SHIPPED.** Built as
  designed, with one deliberate correction from the original plan: the
  password hash never touches Steam lobby metadata at all (metadata is
  readable by any lobby member by design, so even a hash sitting there
  would be a real crack-offline target). Instead:
  - `#net-private-toggle` + `#net-private-password` (`index.html`, in the
    telemetry column, hidden once connected) set `hostPrivate`/
    `hostPasswordValue` on the `MultiplayerLobby` instance.
    `maybeCreateSteamLobby()` maps `hostPrivate` directly to Steam's real
    `LobbyType.Private` (matches actual Steamworks semantics — invite-only,
    never in browse results) and passes a `passwordRequired` **boolean**
    (not the password) to `hb:steamCreateLobby`, stored as `hb_pw_required`
    lobby metadata purely so a joiner's UI knows to prompt.
  - The actual hash (`src/steamLobbyClient.js`'s `hashPassword`, SHA-256 via
    Web Crypto) is computed client-side and sent only over the `joinRoom`
    socket event to `server/relay.js`, which is the only place that ever
    stores or compares it (`roomPasswordHashes`, keyed by room code) — the
    relay never sees or needs the plaintext. A mismatched or missing hash
    on a password-protected room gets a `joinRejected` event before the
    socket is ever added to the room; the client shows a toast and
    disconnects (`multiplayerLobby.js`'s `joinRejected` handler).
  - Since a Private lobby is never in the browse list by definition, the
    password prompt only makes sense (and is only wired) on the direct-join
    path — `handleSteamLobbyJoinRequested`, which handles both a Steam
    invite accept and the `+connect_lobby` cold-start case. `window.prompt`
    is a deliberate MVP placeholder for the password entry UI there, not a
    themed dialog — flagged in-code as a known follow-up, not a silent cut
    corner.
  - Server-side gate covered by 5 new integration tests
    (`server/relayPrivateLobbyPassword.test.js`, real socket.io client
    against `attachRelay`): host sets a password on first join, a
    no-password guest gets rejected, a wrong-hash guest gets rejected, a
    correct-hash guest is admitted, and an unpassworded room stays
    ungated. Client-side covered in `multiplayerLobby.test.js` (hash
    forwarding on create, prompt-and-hash on join, no-prompt when
    unrequired, cancelled-prompt leaves the hash null rather than hashing
    an empty string) and `steamLobbyClient.test.js` (`hashPassword` itself).
- **Steam friends invite** — exists and already works when launched via
  Steam (`#net-steam-invite-btn` → `openSteamInviteDialog()`, honestly
  gated behind `isLaunchedViaSteam()` per a prior pass's fix). Relocating
  it into the new screen is copy-the-markup-and-rewire-the-button-id level
  work, not new logic — the one thing to preserve is that existing honest
  warning path (it categorically can't open the overlay if the binary
  wasn't launched through Steam, and the UI should keep saying so rather
  than silently failing).

**Phase 3 and 4 — SHIPPED and live-verified 2026-08-20 (evening).**

**Phase 3 — sync per-player loadout onto the roster.** The roster entry
shape (`{id, callsign, opClass, ping, isSelf, ready}`) now carries
`loadout: { weapon, hasCharm }` too. `src/multiplayerLobby.js`'s new
`getLocalLoadoutSummary(opClass)` reads it from the same `window.loadout`/
`window.fabricator` singletons `main.js` already exposes for the Armory UI
(`loadout.getEquippedLabel(fabricator, opClass)` for a real weapon name,
`getEquippedCharmId(opClass)` for the boolean) — display-only, not the full
loadout (mods/skins/decals stay purely local; nothing gameplay-relevant
reads this field). Sent alongside `opClass` in the `joinRoom` emit;
`server/relay.js` stores it per-player (`sanitizeLoadout`, same defensive
treatment as callsign/opClass — untrusted client input, capped length,
type-checked, unknown fields dropped) and forwards it through the existing
`getPublicPlayer` shape used by `currentPlayers`/`newPlayer`/`playerMoved`,
so every roster-sync path picked it up for free. Also threaded through the
offline/local-fallback session (`fallbackLocalSession`) and the roster UI
itself (`net-roster-loadout`, a small subtitle line under each player's
class badge). Covered by 5 new relay integration tests
(`server/relayLoadoutSync.test.js`) plus client-side tests for
`getLocalLoadoutSummary` and the `fallbackLocalSession` self-entry.
**Live-verified**: a real CO-OP connect against the dev relay showed the
host's real equipped-weapon label ("SIDEARM") on its own roster row.

**Phase 4 — squad-composition cutscene.** Design call made without a
follow-up conversation (per the active `/goal`'s "don't pause to ask"
directive) given a hard constraint discovered while investigating: no new
video assets exist per squad composition, and none can be authored this
pass. Rather than block on that, went with the simplest option already
flagged above as a fallback — the intro video itself stays exactly what it
already is (the local player's own single-class cut, unchanged,
`playClassIntroSequence`/`runMissionIntroSequence` untouched in that
respect) — but a new **squad manifest overlay**
(`buildSquadManifestPanel()`, `main.js`) is composited on top whenever
`window.game.isMultiplayer` is true, reading the live roster straight from
`multiplayerLobby.players` (still populated at this point -- only
`disconnect()` clears it, never a successful deploy) and rendering real
callsigns, classes, and Phase 3's synced loadout summary, top-left,
non-interactive (`pointer-events: none`, never blocks the existing
skip-on-click/keypress handlers). It's a child of the cutscene's own
`overlay` element, so `cleanupAndResolve()`'s existing `overlay.remove()`
tears it down automatically — no new cleanup path needed. **Live-verified**
end to end: a real CO-OP deploy against the dev relay showed the panel
rendering "PHANTOM-9 (HOST)" / "TANK // SIDEARM" during the actual cutscene,
and the run correctly proceeded into real gameplay
(`performanceProfile: 'gameplay'`, `isMultiplayer: true`) after skip, with
zero new console errors. Not unit-tested — `main.js` has no unit-test
infrastructure at all (same pre-existing gap `src/gameController.js`'s own
header comment already documents), so this follows the same
live-verification-only precedent every other `main.js`-level change in this
document used.

### Resolved during Phase 1/2 implementation

- **Does SOLO pass through the Deployment Briefing screen?** Yes, resolved
  as shown: default-selected, one click through (`DEPLOY SOLO`), same
  screen every run reaches regardless of mode.
- **Private-lobby password: hashed, and not through Steam at all.** Resolved
  as documented above — the relay (`server/relay.js`) is the only place
  that ever sees the hash; Steam lobby metadata carries only a boolean
  `hb_pw_required` flag.

### Still open

- For 1b (lobby visibility): patch the native `steamworks.js` binding, or
  lean on the relay backend for cross-region discovery? Affects whether the
  Steam lobby browser ever actually works cross-region, independent of the
  screen it lives on now.
- Phase 4 shipped the roster-overlay fallback (see above) because no new
  per-composition video assets exist or could be authored this pass. If
  bespoke squad-intro video ever becomes real asset scope, that's a
  genuinely bigger follow-up, not a tweak to what's here.
- The join-side password prompt (`window.prompt` in
  `handleSteamLobbyJoinRequested`) is an explicit MVP placeholder, not a
  themed dialog — worth a real UI pass whenever another lobby-UI pass
  touches this screen next.
- `main.js` still has zero unit-test infrastructure — Phase 4's
  `buildSquadManifestPanel()` is only covered by live verification, same as
  every other `main.js`-level change in this document.

### Meetup correction — explicit host versus join

The first implementation still made CO-OP/PVP selection call `connect()`;
because `connect()` creates a Steam lobby when no lobby id exists, two players
who both selected CO-OP became hosts of separate lobbies. This is now fixed:
mode selection only selects the mode, the button reads `HOST NEW LOBBY`, and
only that explicit action creates a lobby. Steam invite acceptance and public
lobby JOIN rows remain the join paths. The join sequencing regression is also
covered so a guest's existing lobby is left before the invited target is
joined.

### Ready state and host deployment authority

The relay now broadcasts the full roster with each ready transition, and the
client treats that snapshot as authoritative. This closes the stale-screen
case where each account saw only its own ready choice. The relay also rejects
`matchDeploy` from any non-host, even when every player is ready. Readiness is
therefore a shared confirmation, while deployment remains a host-only command;
the host's final button is labeled `START SQUAD` after the roster reaches
ready-for-all. Focused coverage lives in `server/relayReadyUp.test.js`.
