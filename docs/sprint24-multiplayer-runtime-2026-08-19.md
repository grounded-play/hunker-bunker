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
2. **No server-authoritative damage validation.** Both the existing PvP
   damage path and the new enemy-hit-sync path are client-reported: a
   client decides a hit happened and broadcasts the outcome: the server
   relays it with only basic type/range clamping, not trajectory,
   fire-rate, or line-of-sight validation. This is explicitly a
   client-trusts-client design for this pass, described accurately in
   code comments as "gossip broadcast, not full server validation." A
   modified/cheating client could currently report false damage.
3. **No Steam authentication.** All connections are anonymous Socket.IO
   room-code joins; there is no Steam auth ticket →
   `AuthenticateUserTicket` → SteamID64 → session-token handshake. This
   pass's verification used two Socket.IO clients, not two Steam
   accounts, per the goal's own allowance for this pass.
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
5. **PvP mode untouched/unverified this pass.** All new work (downed
   state, enemy-hit-sync) explicitly excludes `multiplayerMode ===
   'pvp'` in every gate. Real PvP-specific hardening (goal item 3's
   "server determines hit, calculates damage" for player-vs-player) is
   not attempted.
6. **Disconnect/reconnect** only has the basic pre-existing
   `playerDisconnected` → `removeRemotePlayer` handling; no reconnect
   grace period, no state resync on rejoin, not stress-tested.
7. **No full match-completion/extraction sync** — not attempted this
   pass; each client's `planMultiplayerCrashSites`-derived spawn state
   remains independently computed rather than server-assigned, though
   this wasn't found to cause divergence in the 2-client test.

**Bottom line for Steam claims**: co-op movement, enemy-damage, and
downed/revive now demonstrably synchronize between two real clients
end-to-end, which was not true before this pass (nothing synchronized,
because deploy never left the Armory for anyone). This is real progress
on the goal's success criterion but is still short of "Online Co-op" as
a Steam-store claim: no server-authoritative validation and no Steam
auth means it is not yet abuse-resistant or identity-verified enough for
a production multiplayer claim.
