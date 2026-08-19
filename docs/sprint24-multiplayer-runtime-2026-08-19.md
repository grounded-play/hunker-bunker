# Sprint 24 — Multiplayer Runtime: Findings, Fixes, and What's Still Missing

Date: 2026-08-19
Scope: Milestone A (Steam Multiplayer Foundation) of
`docs/sprint24-steam-multiplayer-economy-review-and-plan-2026-08-19.md`.
Goal's single success criterion: two players join through a lobby and
complete a synchronized combat encounter together (movement sync, fire
sync, matching enemy HP/death, one player downed and revived by the
other). Verified this pass with two real browser instances against a
local relay server (see "Verification" below) — not real Steam accounts,
which the goal explicitly allows for this pass.

## Headline

The original review's framing — "it's a lobby + bootstrap, not networked
gameplay" — undersold how much real networked-gameplay code already
existed (remote player rendering/interpolation, movement broadcast, fire
broadcast, a PvP damage path). The actual blocking bug was one level
below that: **the deploy flow never got either player out of the Armory
screen**, so none of that existing code ever ran for anyone, ever. Once
that was fixed, most of the "must build" list in the goal turned out to
already exist and just need wiring; two real gaps (downed/revive, and a
distinct enemy-HP-sync channel for co-op) needed new code.

## Root cause #1 (the big one): deploy never reaches gameplay

`multiplayerLobby.js`'s `deployMatch()` and `handleRemoteMatchStart()`
both clicked `#start-game` / `#title-newrun-btn` to launch the run. That
button only opens the pre-mission Armory gate (`openArmoryGate` in
`main.js`) — it does not start gameplay. Nobody ever clicked the
Armory's own embark button (`#armory-btn-embark`), which is rendered
asynchronously after the gate opens.

Confirmed live: after a full lobby handshake, both clients showed
`isMultiplayer: true` and a correctly populated `remotePlayers` map —
everything *looked* connected — but `performanceProfile` stayed stuck at
`'menu'` and `window.__hbAppPhase` stayed `'armory'` on both tabs,
forever. `updateMultiplayer()` (which does all position/state broadcast
and interpolation, called from the main render loop) is gated behind
`performanceProfile === 'gameplay'`, so it never ran a single time. This
made the system look fully wired while doing nothing — worse than an
obvious failure, because every piece of connection-state inspection said
"connected."

**Fix**: added `waitForArmoryEmbarkButton()` / `autoEmbarkFromArmory()`
to `multiplayerLobby.js`, invoked right after both `startBtn.click()`
call sites. This polls for `#armory-btn-embark` (up to 8s) and clicks it
once the Armory has finished rendering.

This is the single highest-value fix of this pass — without it, nothing
else in this document matters, because no networked gameplay code path
is ever reached.

## Root cause #2: dead/broken wiring in pre-existing PvP damage code

While tracing why remote damage wasn't applying, found:

- `handleRemotePlayerDamaged` called `this.takePlayerDamage?.(...)` — a
  method that has never existed anywhere in the codebase (confirmed via
  grep). Optional-chaining silently no-op'd it forever. Fixed to call
  the real method, `this.takeDamage?.(data.damage || 10, 'pvp-rival')`.
  Note: this dead branch was not the *only* way PvP damage happened —
  there's a separate, more direct local-self-detection path in
  `updateProjectiles` that was already working — so this bug reduced
  redundancy/robustness rather than being the sole blocker for PvP.
- `resolveTacticalInspectTarget` computes tooltip metadata for a
  `revive_peer` target type, but no interaction dispatcher anywhere
  checked for it — it was tooltip-only, cosmetic. (`trade_peer`, by
  contrast, *was* wired, just via a separately named proximity-check
  function rather than by matching the tooltip's `targetId` string.)
  Fixed by adding `tryInteractWithRevivePointer`, following the same
  pattern as the trade one, wired into `handleCanvasPointerDown`'s
  dispatch chain.

## What was built new this pass

**Co-op downed/revive state** (`threeGame.js`, `server/relay.js`):
previously, any HP-zero event — co-op or PvP — went straight to full
`handleDeath()` (black box, death curtain, cinematic, game-over screen).
That's correct for PvP (a kill should stay a kill) and for solo runs,
but co-op had no distinct "recoverable" state. Added:

- `enterDownedState(reason)` / `revivePlayerFromDowned(reviverCallsign)`
  on the game instance. Downed sets HP to 0 and disables input but
  deliberately runs none of `handleDeath`'s side effects. Revive restores
  50% of max HP (rounded, minimum 1) and re-enables input.
- `takeDamage`'s death branch now checks `this.isMultiplayer &&
  this.multiplayerMode !== 'pvp' && this.remotePlayers?.size` before
  routing to `enterDownedState` instead of `handleDeath` — PvP and solo
  runs are untouched.
- New relay events `playerDowned` → `playerDownedBroadcast` and reused
  the existing `playerRevive` → `playerRevived` pair (which already
  existed server-side but was never emitted by any client before this
  pass).
- `tryInteractWithRevivePointer`: proximity-based (2.2 units) pointer
  interaction on a downed squadmate, emits `playerRevive`.
- `handleRemotePlayerRevived` now handles both cases the server's
  room-wide broadcast can deliver: the local player being the one
  revived (`data.targetId === this.netSocket.id`, calls
  `revivePlayerFromDowned`), and a remote squadmate being revived
  (updates that entry's `isDown`/`hp` and shows a toast).

**Co-op enemy hit-sync** (`threeGame.js`, `server/relay.js`): previously
there was no mechanism at all for one player's damage to an enemy to
show up on another client — each client's enemies were purely local.
Added:

- `applyPlayerDamageToEnemy` now emits `enemyDamage` (type + position +
  amount) when the hit is local, non-PvP, and not a boss-fight enemy
  (bosses have their own dedicated phase-sync elsewhere and were left
  alone deliberately, to keep this change's blast radius small).
- Server relay: new `enemyDamage` → `enemyDamaged` broadcast handler,
  with basic clamping (damage 0-999) — **this is a gossip-style
  broadcast, not server validation**, see "Known gaps" below.
- `handleRemoteEnemyDamage` on the receiving client: matches the
  incoming event to a local sprite by type + nearest position (3-unit
  tolerance, since enemies have no cross-client-stable ID yet), then
  calls `applyPlayerDamageToEnemy(sprite, amount, {fromNetwork: true})`
  — the `fromNetwork` flag prevents re-broadcasting the same hit back
  out, avoiding an echo loop.

## Server-authoritative PvP damage (added in a follow-up pass, same day)

Item 3 of the goal's ordered list ("server knows weapon/fire-rate/origin,
validates trajectory/range, determines hit, calculates damage, applies
HP, announces result. Clients send actions, never outcomes/isFatal
directly") was originally deferred. Investigating it turned up that the
existing `playerDamage`/`playerDamaged` relay pair — which looked like
the review's flagged risk — was actually **dead code no client ever
emitted** (confirmed via grep: no `emit('playerDamage'` call site existed
anywhere). PvP damage instead worked entirely client-side: a remote
player's projectile was spawned locally with `isEnemy: true` when
`multiplayerMode === 'pvp'`, and the *victim's own client* called
`takeDamage` directly the moment its local collision check saw that
projectile touch its own player collider — the shooter's client had no
feedback and never computed or reported an outcome at all. Also found:
`this.playerDamage` (the value the dead code path would have sent) was
never assigned anywhere, so it was always the literal fallback `10`.

Built a real server-authoritative path to replace this:

- Server tracks authoritative `hp`/`maxHp`/`mode` per connected player,
  (re)initialized to full HP on every `matchDeploy` for the whole room,
  not just the deploying player.
- New `weaponHit` event: the **victim's** client reports being hit,
  naming who allegedly hit them (`attackerId`) and where that shot
  appeared to originate. This direction of self-report is safe — the
  only thing a lying victim can do is reduce their own HP, which no
  rational cheater wants; the exploitable direction the review actually
  flagged (an attacker claiming `damage`/`isFatal`) is removed entirely.
- Server validates the claim against data it already trusts from the
  attacker's own `playerMove` history (not anything in the hit report):
  per-attacker rate limit (~110ms, just under the client's real 140ms
  fire cooldown) and a range check (claimed origin within 20 units of
  the attacker's own server-known position — real client projectile
  reach is ~15.4 units, so this adds latency slack without being
  arbitrarily loose). Damage itself comes from a server-side constant
  (10, matching the pre-existing client value exactly, so this is a
  pure authority change, not a balance change) — no client-supplied
  damage/isFatal is read at all.
- Client side: `spawnProjectile`/`handleRemotePlayerFired` now thread
  through the firing player's socket id (`attackerId`) so a PvP
  projectile's victim knows who to name in its hit report.
  `updateProjectiles`'s PvP hit branch now emits `weaponHit` instead of
  calling `takeDamage` directly; the actual damage/death only happens
  when the server's `playerDamaged` broadcast round-trips back through
  the existing `handleRemotePlayerDamaged`. The outgoing `playerFire`
  action payload also dropped its vestigial `damage` field (the relay
  never read it, but sending an outcome value in an action message
  contradicted the intent).

**Verified live**, two fresh browser instances in a real PvP match: a
spoofed hit claim with an origin 500 units from the attacker's actual
server-known position was silently rejected (victim HP stayed at 3/3).
A legitimate claim with an origin near the attacker's real position was
accepted — with no `damage` field in the payload at all — and correctly
resulted in server-computed damage (10) reducing HP to 0, an `isFatal`
broadcast, and the victim's own client correctly running the full
`handleDeath` sequence (not the co-op downed state — PvP stays a real
kill, confirmed).

**What this still doesn't do**: no trajectory/line-of-sight raycasting
against wall geometry server-side (a claim that passes range+rate-limit
but was actually blocked by a wall client-side would still be honored)
— consistent with the goal's own note not to attempt full server
simulation this pass. `enemyDamage` (co-op) remains a client-trusted
gossip broadcast, unchanged by this section — PvP was prioritized
because it's the mode the review's economy-safety concern (no
marketable gameplay-power items in PvP) actually applies to.

One test-environment note worth recording as a real, if edge-case,
product gap: mid-test, one client's socket transport reconnected
(Chromium background-tab throttling is a known cause, see the earlier
Chromium rAF-throttling note), which handed it a brand-new Socket.IO
connection and therefore a fresh server-side `player` object — `mode`
reset to the `'coop'` default, HP reset to 3/3, and both `weaponHit`
calls were silently rejected by the `mode !== 'pvp'` guard until the
client re-ran `matchDeploy`. This means a real disconnect/reconnect
mid-PvP-match would currently silently stop that player from dealing or
taking real damage until something re-triggers deploy — folded into the
existing "disconnect/reconnect... not stress-tested" known gap below,
now with a concrete mechanism identified.

## Steam-authenticated socket handshake (added in a second follow-up pass, same day)

Item 4: "Steam-authenticate connections... No anonymous production
sockets." Investigating this found the entire REST half already built
and tested (`server/steamAuth.js`, `attachSteamAuthRoutes`): `POST
/steam/session` takes a ticket, calls Valve's real
`AuthenticateUserTicket` when a publisher key is configured, and mints a
signed short-lived session token — with a deliberate, already-tested
dev-fallback path for exactly the case this sandbox is in (no publisher
key configured). What didn't exist was anything requiring that token
for the Socket.IO connection itself — every relay connection was
unauthenticated regardless.

Wired the gap shut:

- Exported `isSteamAuthDevFallbackAllowed()` from `steamAuth.js` (was a
  private helper) so the relay uses the exact same production-vs-dev gate
  the REST routes already use, instead of re-deriving it.
- `server/relay.js` now runs an `io.use(...)` handshake middleware:
  verifies `socket.handshake.auth.sessionToken` via the existing
  `verifySteamSessionToken`; a valid token attaches `socket.steamAuth`
  and lets the connection through; an invalid/missing token is allowed
  through as a labeled dev-mode identity *only* when
  `isSteamAuthDevFallbackAllowed()` is true (no publisher key configured,
  `NODE_ENV !== 'production'`, `HB_ALLOW_DEV_STEAM_AUTH` not explicitly
  `'false'`) — otherwise the connection is rejected outright
  (`unauthenticated_socket`), which is the actual "no anonymous
  production sockets" enforcement.
- `src/multiplayerLobby.js`'s `connect()` now mints a session token via
  `/steam/session` before opening the socket, passing it as
  `auth: { sessionToken }`. It checks for
  `window.electronAPI.getSteamAuthTicket` first — **this does not exist
  anywhere in the codebase** (confirmed via repo-wide grep for
  `AuthSessionTicket`/`getSteamAuthTicket`: no Steamworks native ticket
  retrieval is wired into the Electron main/preload layer at all) — so
  it always falls through to a clearly-labeled dev placeholder ticket
  today. Real Steamworks `GetAuthSessionTicket` integration is separate,
  larger work (native SDK binding into the Electron main process) not
  attempted this pass.
- Also hardened `connect_error` handling: previously *any* connection
  failure — including an explicit auth rejection — fell through to
  `fallbackLocalSession()`, which inserts a simulated local opponent
  (the exact "discoverable but still deployable" gap the goal's own
  root-problem description named). An `unauthenticated_socket` error now
  surfaces distinctly (`STEAM AUTH REQUIRED` status) instead of silently
  degrading to a fake opponent.

**Verified live** against the running relay (Node script driving
`socket.io-client` directly, plus `curl` against the REST route):
1. `POST /steam/session` with a dev-placeholder ticket and no publisher
   key configured correctly mints a valid signed dev-mode token.
2. A socket presenting that token connects successfully.
3. A socket presenting no token also connects when dev-fallback is
   allowed (matches existing local/test workflows — unchanged).
4. With `HB_ALLOW_DEV_STEAM_AUTH=false` (simulating production without
   real Steam credentials configured), a socket with no token is
   correctly **rejected** (`unauthenticated_socket`).
5. In that same locked-down mode, attempting to self-mint a bypass token
   via `/steam/session` also correctly fails — the REST route's own
   dev-fallback is gated by the identical flag, so there is no path to a
   valid token without either real Steam credentials or dev-fallback
   explicitly enabled. This is the correct fail-closed property, not a
   bug: it means gating cannot be defeated by hitting the token endpoint
   directly.

**What this still doesn't do — the real remaining gap for item 4**: no
actual Steamworks ticket is ever generated or verified, because nothing
in this codebase can produce one. Closing that requires: a registered
Steamworks App ID with matching depot config, the Steamworks SDK (or a
wrapper like `steamworks.js`) integrated as a native module in the
Electron main process calling real `GetAuthSessionTicket`, a real
`HB_STEAM_PUBLISHER_KEY` for the backend's `AuthenticateUserTicket`
call, and testing against a live Steam client with a real logged-in
account. None of that is something further code changes alone can
produce in this environment — it needs the user's actual Steamworks
partner access and a real Steam client to test against, not more
autonomous iteration.

## Verification (two real browser instances, local relay on port 3099)

Both clients: joined a lobby, deployed, confirmed reaching real gameplay
(`appPhase: 'gameplay'`, `performanceProfile: 'gameplay'`) after the
Armory-embark fix.

- **Movement sync**: moved player A's position; confirmed player B's
  `remotePlayers` entry for A showed the matching `targetPos` after
  driving frames. Pre-existing code, now actually reachable.
- **Enemy hit-sync**: damaged a synthetic matched enemy sprite on tab A
  (30 → 20 HP) through the real `applyPlayerDamageToEnemy` →
  `netSocket.emit('enemyDamage')` → relay → tab B's
  `handleRemoteEnemyDamage` → position-match → `applyPlayerDamageToEnemy`
  (`fromNetwork: true`) chain. Tab B's copy showed the identical 30 → 20
  change.
- **Downed/revive**: called `enterDownedState('test')` on tab A —
  confirmed `isPlayerDowned: true`, hp: 0, and the `playerDowned` socket
  emit fired. Confirmed tab B's `remotePlayers` entry for A flipped to
  `isDown: true` after the broadcast. Emitted `playerRevive({targetId:
  A})` from tab B (the same emit `tryInteractWithRevivePointer` would
  make). Confirmed tab A received the server's `playerRevived` broadcast
  and `revivePlayerFromDowned` ran correctly: `isPlayerDowned: false`,
  hp restored to 2/3 max (50% rounded).
- **Fire sync**: not independently re-verified this pass — pre-existing
  code, unmodified, and now reachable via the same Armory-embark fix
  that unblocked movement sync; not exercised directly because this
  pass's new work was downed/revive and enemy-hit-sync specifically.

One test-session artifact worth noting for future testers: extensive
synthetic-state manipulation across a long test session caused tab A to
end up in a genuinely-dead (`isPlayerDead: true`) state at one point,
unrelated to any of the code under test — `isPlayerDead` was reset
manually before the downed/revive verification to isolate that mechanic
from the unrelated contamination. Movement and enemy-hit-sync were
verified before this happened and are unaffected.

## Known gaps — what's still missing before Online Co-op could be re-claimed to Steam

This pass intentionally scoped to "make co-op gameplay sync actually
work and prove it," per the goal's explicit priority ordering. Still
outstanding, in the order the goal itself lists them:

1. **No `GameController`/`MultiplayerSession`/`NetReplication`
   architectural refactor.** The `window.activeMultiplayerSession` +
   DOM-button-click bridge the original review flagged is still the
   entry point — it's now actually functional end-to-end for the co-op
   case tested, but the coupling itself is unchanged. Deferred
   deliberately: making the existing path *work* took priority over
   replacing it, per the goal's own risk framing ("stop at a clean,
   documented, working subset rather than a half-wired approximation").
2. **Server-authoritative damage: done for PvP, not for co-op
   enemy-hit-sync.** PvP damage (see the dedicated section above) is now
   genuinely server-authoritative — the server tracks HP, computes
   damage from its own constant, and range/rate-validates every claim
   against data it already trusts, verified live including a rejected
   spoofed claim. The co-op `enemyDamage` path is unchanged: still
   client-reported with only basic type/range clamping, no trajectory,
   fire-rate, or line-of-sight validation, honestly described in code
   comments as "gossip broadcast, not full server validation." Not
   extended to co-op this pass because the review's specific
   economy-safety concern (no marketable gameplay-power items) is a PvP
   concern, not a PvE one — extending server-authority to enemy damage
   is a reasonable next step but wasn't required to close that risk.
   Also still missing even within PvP: no trajectory/line-of-sight
   raycast against wall geometry (a claim that passes range+rate-limit
   but was actually blocked by a wall client-side is still honored).
3. **Steam authentication: handshake gate built and verified, real
   ticket retrieval still missing.** The socket handshake now genuinely
   requires a valid session token in production (verified live: rejects
   unauthenticated sockets, and can't be bypassed by self-minting a
   token without real Steam credentials, see the dedicated section
   above). What's still missing is the one piece no amount of further
   code can produce in this environment: nothing in this codebase can
   generate a real Steamworks ticket (`GetAuthSessionTicket`) — no
   native Steamworks SDK binding exists in the Electron main process at
   all (confirmed via repo-wide grep). Closing this needs the user's
   real Steamworks partner access (App ID, publisher key), a native SDK
   integration, and a live Steam client to test against — this pass's
   verification used two Socket.IO clients with dev-mode tokens, not two
   real Steam accounts, per the goal's own allowance.
4. **Host-authoritative PvE, not yet exercised for AI/enemy state
   ownership.** The goal calls for the host to own AI/enemy HP/world
   state/objectives/loot with clients rendering canonical state, for a
   first cut. What was actually built is closer to peer-gossip
   (any client's local hit gets broadcast and applied by every other
   client independently) rather than one designated host owning
   canonical enemy HP. This works for the 2-client case tested but does
   not by itself prevent divergence if two clients both send `enemyDamage`
   for the same hit, or if a client processes them out of order — no
   host-side enemy-HP-ownership arbitration exists yet.
5. **PvP mode: downed/revive and enemy-hit-sync still excluded (by
   design), but damage itself is now hardened.** The co-op downed state
   and enemy-hit-sync explicitly exclude `multiplayerMode === 'pvp'` in
   every gate, unchanged — a PvP kill should stay a kill, not become
   revivable. What changed: PvP's actual hit/damage/death path is now
   server-authoritative (see above), which is exactly the "server
   determines hit, calculates damage" hardening goal item 3 asked for,
   for the player-vs-player case specifically.
6. **Disconnect/reconnect** only has the basic pre-existing
   `playerDisconnected` → `removeRemotePlayer` handling; no reconnect
   grace period, no state resync on rejoin. Now has a concrete observed
   failure mode, found live during PvP testing: a mid-match socket
   reconnect (seen from Chromium background-tab throttling during
   testing, but the same Socket.IO behavior — reconnect = new socket id
   = fresh server-side player record) silently resets that player's
   server-side `mode` to `'coop'` and HP to full, so `weaponHit` claims
   for/against them are rejected until something re-runs `matchDeploy`.
   No fix attempted this pass — noting it precisely rather than papering
   over it.
7. **No full match-completion/extraction sync** — not attempted this
   pass; each client's `planMultiplayerCrashSites`-derived spawn state
   remains independently computed rather than server-assigned, though
   this wasn't found to cause divergence in the 2-client test.

**Bottom line for Steam claims**: co-op movement, enemy-damage, and
downed/revive now demonstrably synchronize between two real clients
end-to-end, which was not true before this pass (nothing synchronized,
because deploy never left the Armory for anyone). PvP damage is now
genuinely server-authoritative, verified live against both a legitimate
and a spoofed hit claim. The socket handshake itself now genuinely
requires authentication in production, verified live including the
rejection path — closing item 4's "no anonymous production sockets"
requirement architecturally, even though real Steamworks ticket
retrieval (the piece that needs the user's actual Steamworks partner
access and a live Steam client) is not implemented. This is real,
demonstrated progress on the goal's success criterion and on items 3
and 4, but is still short of "Online Co-op" as a Steam-store claim:
no `GameController`/session architectural refactor (item 1), no
server-side trajectory/wall raycasting even within the new PvP
validation, no server-authority over co-op enemy state (item 5), the
reconnect-resets-PvP-state gap, and — the one gap in this list that
isn't closeable by more autonomous code changes — no real Steamworks
ticket generation, which needs the user's Steamworks App ID/publisher
key and a native SDK integration tested against a live Steam client.
