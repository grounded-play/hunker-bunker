# Session Log Follow-Ups: Perf + Telemetry + Minor Bugs

Date: 2026-08-18
Source: `docs/logs/log1.json` (real session, ENGINEER, 92.6s, ended in a
pit-fall death), reviewed live against `dev/sprit-25` (== `mothership` tip as
of this doc).
Already shipped from this log, not covered below: season-pass toast gating,
active-projectile cap (PR #36), and enemy-3D-model background preload
(`src/enemy3dOverlay.js` `preloadEnemy3dTemplates`, fired from
`finishBootDiagnostics` in `main.js`).

This doc plans the six items still open from that review. Each section has:
what's confirmed, what's still a hypothesis, and the next concrete step.

## 1. Sustained long-task drip (21.4% of session frozen)

**Confirmed:** 93 long tasks >50ms across the 92.6s session, ~19.85s total.
A ~9-second unbroken run of 50-90ms tasks precedes the pit-fall death
(elapsedMs 68915-77601), with zero new chunk generation in that window (world
was already fully mounted) — rules out chunk streaming as the cause for that
stretch specifically.

**Ruled out via live testing** (real CPU profile, Chrome DevTools Protocol
`Profiler.start`/`stop`, not just wall-clock timing):
- `updateScatter` and the enemy AI behavior functions it calls
  (`updateCrawlerBehavior`, `updateChargerOrStalkerBehavior`,
  `updateSnailBehavior`) — tested with 40-50 synthetic enemies added to
  `game.scatterSprites`, real frame loop stayed a rock-solid 16.7-16.8ms.
- `triggerGameplayInteract()`'s ~13 per-press checks — each is a small
  fixed-radius scan, cheap, and event-driven (not per-frame).
- The already-fixed projectile cap and enemy-GLB preload — confirmed
  separately not responsible for this specific window (see log correlation
  in the original investigation: no new `Chunk generated` entries, no FETCH
  entries, in this window).

**Leading unconfirmed hypothesis:** the synthetic enemies used above were
bare data stubs with no `userData.enemy3dVisual` attached, so
`updateEnemy3dVisual()` (src/threeGame.js:25428-25430, calls into
`src/enemy3dOverlay.js`'s `AnimationMixer.update()` + skinned-mesh work) never
actually ran in that test. Multiple *real* enemies with loaded, animating
GLTF rigs — skinning + mixer update, once per enemy per frame — is the one
per-frame-scaling system this investigation hasn't load-tested yet, and it's
consistent with the timing: the drip's onset (~66.7s) lands right after the
`mycelium_stalker` (bio-stalker.glb) finished its first lazy-load, i.e. right
when it and any other nearby enemies would have started rendering with full
3D visuals instead of flat sprites.

**Next step:** reproduce with the game's real spawn path (not fake stubs) —
walk/teleport the player into a chunk with several live snails/crawlers,
wait for their 3D overlays to finish loading, then run the same CDP
`Profiler.start`/`stop` capture. If `AnimationMixer.update` or the skinning
matrix work shows up as the hot path, the fix is a distance/count-based
throttle (e.g. mixer update only for enemies within N units or the M
nearest, matching the pattern `MAX_ACTIVE_PROJECTILES` already established
for projectiles). If it doesn't show up, keep going down the candidate list
(shadow map re-render cost given the PCFSoftShadowMap deprecation warning in
this same log; `scanDangerHoles`' radar-reveal animation, timing permitting).

**Priority:** high — this is the actual "lag" the player feels sustained for
close to 20% of a 92-second run, distinct from the fire-burst and cold-load
freezes already fixed. **Risk:** low to implement once the hot path is
identified (same throttle/cap pattern used for projectiles); the remaining
work is almost entirely diagnostic.

## 2. Boot overhead (2.65s across 28 long tasks before title screen, incl. one 949ms task)

**Confirmed:** this is boot-time cost captured by `bootLongTaskObserver` in
`main.js` (disconnects at `boot-ready`, i.e. right when `finishBootDiagnostics`
fires) — separate from the gameplay-time cost this session already fixed.
Not yet profiled to a specific function.

**Next step:** same CDP `Profiler.start`/`stop` technique, wrapped around a
fresh `page.goto` + boot sequence (no reload mid-trace, since `autoStop`
matters here — want the full boot from navigation to `boot-ready`). Likely
candidates going in: WebGL context/shader program creation
(`renderer.compile`-equivalent work), the "Repacking sprite atlas: ENGINEER"
step logged right before the long-task burst starts (id 10, elapsedMs 609,
`LOAD` category), or `generateHeightmapGrid`/`buildChunk` for the initial
crash-site chunk mount. Whichever shows up as the 949ms sample gets a
one-line writeup here before any fix is attempted — this item hasn't earned
a hypothesis yet, unlike #1.

**Priority:** medium — one-time cost, paid once per session rather than
repeatedly, so lower urgency than #1 despite the large single number.
**Risk:** unknown until profiled; boot-critical-path changes need the same
care taken with the enemy-GLB preload fix (verify `page.goto`'s `load` event
and boot-to-`armory` timing don't regress before shipping).

## 3. Multiplayer mode mismatch (PVP selected, telemetry says coop) — FIXED

**Status: fixed and verified live.** The original telemetry-mismatch
symptom didn't reproduce, but the investigation found a real bug underneath
it (see below) and it's fixed: `src/multiplayerLobby.js`'s `deployMatch()`
and `handleRemoteMatchStart()` now call `window.game?.setupMultiplayerNetwork?.()`
right after setting `window.activeMultiplayerSession`. Verified live —
before the fix, `game.isMultiplayer`/`game.multiplayerMode` stayed
`undefined` for the entire session even after deploying a PVP match; after
the fix, they correctly become `true`/`'pvp'` immediately on deploy.

**Confirmed via code reading, not yet live-tested:** the wiring exists and
looks correct end-to-end —
- `src/multiplayerLobby.js:99-100` `setMode(mode)` sets `this.currentMode`.
- `src/multiplayerLobby.js:255,261,276` include `mode: this.currentMode` in
  the session/match payload.
- `src/multiplayerLobby.js:269,304` assign `window.activeMultiplayerSession
  = this.activeMatch`.
- `src/threeGame.js:3887` reads `this.multiplayerMode = session.mode ||
  MULTIPLAYER_SPAWN_MODES.COOP`.
- `main.js:3900-3901` (telemetry read) falls back to `'coop'` only if
  neither `game.multiplayerMode` nor `activeMultiplayerSession.mode` is set.

**Click-target hypothesis ruled out.** Checked `index.html:2421-2435`:
`.net-mode-card__title` renders *inside* `<button id="net-mode-pvp-btn">`, so
a click on the title text bubbles to the button's listener normally — no
binding gap there.

**Reproduced live end-to-end and could NOT reproduce the bug.** Replayed the
exact click sequence from the log against the running dev build (open
TACTICAL NET → click `.net-mode-card__title` inside the PVP card → click
DEPLOY SQUAD → click `#start-game` → click `#armory-btn-embark` → trigger
`handleDeath()` to reach `gameover`), inspecting the real values at each
step:
- Immediately after clicking the PVP title: `window.activeMultiplayerSession.mode
  === 'pvp'`.
- After DEPLOY SQUAD + reaching `gameplay`: still `'pvp'`.
- After death, at `gameover` (where the telemetry snippet in `main.js:3900-3901`
  actually runs): `mpMode` resolves to `'pvp'`, correctly.
- Confirmed separately: `window.game.multiplayerMode` stays `undefined` the
  whole session — `setupMultiplayerNetwork()` (`src/threeGame.js:2945`,
  called once from the constructor) runs during initial boot, ~21s before
  the player ever opens TACTICAL NET in the real log, so it always sees
  `!session` and early-returns without setting `isMultiplayer`/
  `multiplayerMode`. This is harmless *for telemetry* only because
  `main.js:3901`'s `||` chain falls through correctly to
  `activeMultiplayerSession?.mode` — but it does mean `game.isMultiplayer`
  and `game.multiplayerMode` are unreliable everywhere else they're read
  (`src/threeGame.js:3936,4021,4046,7554` all gate real PVP-only behavior
  behind `this.multiplayerMode === 'pvp'`, which is silently always false
  this way). That's a second, more consequential bug hiding under the same
  symptom: **actual PVP gameplay logic (friendly-fire rules, spawn
  placement, etc. at those four call sites) may never activate**, even
  though telemetry happens to still report the right label.

**Revised next step:** the telemetry mismatch itself is not reproducible as
described and may have been specific to that captured session (different
code revision, a real timing race, or a transient socket/session state this
repro didn't hit) — lower confidence there's a live bug here. The
`setupMultiplayerNetwork()` early-return-and-never-retry issue is real and
verified, though, and is very likely the actual root cause worth fixing:
call it again (or move its logic into `setupMultiplayerNetwork` triggered
from `deployMatch`/`handleRemoteMatchStart`, not just the constructor) so
`game.isMultiplayer`/`game.multiplayerMode` get set correctly once a session
actually exists, rather than staying frozen at their pre-session state for
the rest of the run.

**Priority:** medium, upgraded in scope — this is no longer just a telemetry
label bug but a possible dead PVP-gameplay-rules bug (4 call sites gated on
a flag that may never flip true). **Risk:** low to fix (call an existing
function from one or two more places), but changing when
`isMultiplayer`/`multiplayerMode` become true needs a test pass against the
four gated call sites before shipping, since they currently silently no-op.

## 4. Interact spam near the pit-fall death — silent failure

**Confirmed:** 8 rapid `Action: INTERACT` presses (elapsedMs 72032-73575,
~150-330ms apart) immediately preceding the pit-fall death at 77601. No
door-toggle, console, pickup, or other success `EVENT` fired in that window.

**Confirmed via code reading:** `triggerGameplayInteract()`
(`src/threeGame.js:4728-4745`) runs an ordered chain of ~13
`interactWithX()` checks every press — ship stations, blast door, procedural
door, maze access, lore terminal, black box, cave entrance, camp, scientist,
hive site, camp quest object, **hole tile**, pocket climb point,
biomechanical door. `interactWithHoleTile()` only fires
`fillHoleAt()` if a hole tile is within a 2-unit radius; there is no
"nothing here" feedback path if every check in the chain comes up empty —
the function just returns after doing nothing, same as if the player weren't
near an interactable at all.

**Open question, not yet resolved:** was the player actually near something
interactable (and one of the 13 checks has a real bug), or were they simply
not close enough to anything and correctly got no response? The position at
death (`x: 0.90, z: -18.00`, depth 0) needs to be cross-referenced against
that chunk's actual generated content to know which case this is.

**Next step:** pull chunk `(0, -1)` (or whichever chunk contains
`x≈1, z≈-18`) from a reproduction at the same seed/area, check what
interactable content (if any) existed within interact range of that death
position. If something was there and its check didn't fire, that's a real
bug in one of the 13 `interactWithX` functions. If nothing was there, this
closes as "working as intended" — but even then, consider adding a
throttled "nothing to interact with" cue (audio/HUD flash) so repeated
failed presses give the player feedback instead of silence, matching the
existing `playThrottledUiError` pattern already used elsewhere in
`fireWeaponAtCurrentAim()` for blocked-fire cases.

**Priority:** low-medium — UX polish either way; only becomes a real bug if
the chunk cross-reference finds a genuine interactable in range.
**Risk:** low.

## 5. `totalPickups` stayed 0 despite the crate dropping ammo + health

**Confirmed:** `destructible-prop-broken` (id 137, elapsedMs 54052) reported
drops `["ammo", "health"]` at `(9, 2)`; final `runStats.totalPickups` is 0.

**Assessment:** very likely benign — the player died at `(0.9, -18.0)` roughly
20 world-units away and ~23 seconds later, consistent with simply never
walking back over the drop. Not treating this as a bug without evidence.

**Next step:** a quick live check only — spawn a destructible prop, break it,
confirm the resulting pickup meshes exist in the world and increment
`totalPickups` when the player walks over them (existing pickup-radius /
magnet logic, not new code). If that works as expected, close this item with
no code change. Lowest priority of the six; do last.

**Priority:** low. **Risk:** none (verification only, no fix expected).

## 6. "INITIALIZING SYSTEMS SPRIT-25" boot text typo

**Confirmed root cause — not a code bug.** `vite.config.js:23` reads the
live git branch via `git rev-parse --abbrev-ref HEAD` (or `HB_BUILD_BRANCH`
in CI) into `buildInfo.branch`; `main.js:141` derives the on-screen label via
`buildInfo.branch.replace(/^dev\//i, '').toUpperCase()`. The branch this dev
server is actually checked out on is named `dev/sprit-25` — a real typo in
the branch name itself (should be `dev/sprint-25`), not a string-handling bug
in the display code. The display code is doing exactly what it's supposed to:
show the real branch name.

**Next step:** this is a git-ref rename, not a code change, and this repo has
had a concurrent agent/session actively working the same working directory
all session — renaming a branch out from under it is exactly the kind of
shared-state action this session's established caution rules out doing
unilaterally. **Flagging to the user for a decision, not fixing directly:**
rename `dev/sprit-25` → `dev/sprint-25` (and update any open PR base/head
refs) when it's safe to do so without disrupting concurrent work, or leave
it if the branch is short-lived anyway. Confirm first whether this label
ever reaches a real player-facing build — `HB_BUILD_BRANCH` is only set
explicitly in CI for tagged/release builds per `.github/workflows/`, so this
may already be dev/preview-only and not worth spending a branch rename on.

**Priority:** cosmetic, dev-only unless proven otherwise. **Risk:** the
branch rename itself carries real risk (shared working directory, concurrent
agent) — explicitly not doing it without user go-ahead.

## Summary / execution order

1. **#1 sustained drip** — highest value, needs a real-enemy CPU profile to
   convert the leading hypothesis into a confirmed fix.
2. **#3 multiplayer mode mismatch** — cheap to confirm/fix once the DOM
   structure around `.net-mode-card` is checked.
3. **#2 boot overhead** — needs its own CPU profile; independent of #1.
4. **#4 interact silent failure** — needs the death-position chunk
   cross-reference before it's clear whether there's a bug to fix at all.
5. **#5 totalPickups** — quick verification, expected to close with no
   change.
6. **#6 branch typo** — no code fix; needs a user decision on the rename.
