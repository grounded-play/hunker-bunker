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

**Enemy-3D-visual hypothesis also ruled out**, now via a real CPU profile
(CDP `Profiler.start`/`stop`, sampled at 100us) captured against a live
gameplay session with 23 *real* enemies (spawned through the game's actual
chunk-mount path, not fake stubs) that already had loaded 3D visuals
(`userData.enemy3dVisual` set, actively running `AnimationMixer.update()` +
skinning every frame via `updateEnemy3dVisual`). Over a 4-second capture,
the profiler was 94% idle; `updateEnemy3dVisual`/`AnimationMixer.update`
don't even appear in the top 20 functions by self-time. This is the third
independent live test (bare-stub `updateScatter` call, full real-frame RAF
loop, now a real sampled CPU profile with genuine loaded 3D enemies) to
show no meaningful per-enemy cost. Enemy count/AI/3D-rendering is no longer
a credible lead for this drip.

**Still unexplained.** What's ruled out so far: enemy AI/behavior loop,
interact handlers, chunk streaming (no `Chunk generated` entries in the
drip window), the projectile cap and GLB-parse freezes already fixed, and
now enemy 3D-visual animation/skinning at realistic and above-realistic
enemy counts. Remaining candidates, in the order worth checking next:
- **Shadow map re-rendering** — this same log has a
  `THREE.WebGLShadowMap: PCFSoftShadowMap has been deprecated` warning
  (id 55), meaning shadow maps are active; re-rendering the scene from each
  shadow-casting light's perspective scales with both light count and
  shadow-casting mesh count and wasn't included in any of the three tests
  above (all used a fixed/default light rig). Worth a CPU profile captured
  specifically while positioned so many enemies + player + any dynamic
  lights are all shadow-casting simultaneously.
- **GC pauses from accumulated garbage over the run** — none of the three
  tests ran for a comparable wall-clock duration to the real session's ~77
  seconds of pre-death gameplay; a slow leak (retained references, growing
  arrays never trimmed) could produce GC pressure that only shows up after
  a minute-plus of continuous play, which no test here has actually done.
  Worth a profile that plays continuously for 60-90s rather than a few
  seconds of synthetic setup.
- **`scanDangerHoles`' radar-reveal animation** — not yet timed out as a
  possibility; the one radar-scan press in the log (elapsedMs 47006) is
  ~20s before the drip starts, which argues against it, but the growing-
  radius animation's actual duration hasn't been checked against that gap.

**Update: the 60-90s continuous-play profile was also run, and also came up
empty.** Captured a real CDP CPU profile over a full 68-second simulated
session (continuous movement + randomized firing + randomized interact
presses, texturally matching the real log rather than idle) against the
live dev build. Result: 96.5% idle, garbage collector time totaled 29ms
across the whole 68s (not a leak), and no function came anywhere near a
50ms+ self-time bucket. This rules out GC pressure from this specific
synthetic load as well.

**Status after four independent live-reproduction attempts (bare-stub
`updateScatter`, full real-frame RAF loop, real-3D-enemy short CPU profile,
68s continuous-play CPU profile) — none reproduce the drip.** This has
stopped being a "try the next hypothesis" problem and become a "the
reproduction itself is missing something real about that session" problem.
Candidates not yet tried, because they can't be synthesized the same way:
- **Shadow map cost** — still untested (see above); needs a scene with
  actual shadow-casting geometry density matching a real explored area, not
  a freshly-booted default scene.
- **Platform/driver difference** — the original log's `userAgent` is
  Windows Chrome 151; all reproduction here ran on headless Linux Chrome via
  Playwright. A GPU/driver-specific cost (e.g. real shadow map compilation,
  texture upload stalls) wouldn't show up in this environment at all.
- **Genuine multi-minute session state** — the real run was 92s total with
  ~77s of gameplay before death; even the 68s synthetic test kept a mostly
  static enemy/chunk population instead of the organic growth of a real
  played run (more chunks discovered over time, more scatter sprites
  accumulated, more destroyed-wall/hole state tracked).

**Recommended next step, given reproduction has failed four times:** stop
guessing and capture a **real trace from an actual play session** next time
this happens — either ask for a fresh session log with the gameplay long-task
observer active (already wired, see `startGameplayLongTaskDiagnostics` in
`main.js`, which is exactly what produced the data this whole investigation
is based on) alongside a browser-side CPU profile taken during that same
real session (Chrome DevTools' Performance panel, manually, since headless
reproduction isn't surfacing it), or add a lightweight production-safe
sampling profiler that activates automatically once several long tasks fire
in a short window, so the next real occurrence captures its own call stack
without needing a human to catch it live.

**Priority:** high — this is the actual "lag" the player feels sustained for
close to 20% of a 92-second run, distinct from the fire-burst and cold-load
freezes already fixed. **Risk/effort:** significant remaining diagnostic
cost; four rounds of live reproduction have not found it, so the highest-
value next step is capturing real data from the next occurrence rather than
a fifth synthetic guess.

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

## 5. `totalPickups` stayed 0 despite the crate dropping ammo + health — CLOSED, not a bug

**Confirmed via code reading — this was a misread of the field, not a bug.**
`src/threeGame.js:17451-17456` (`getRunStats()`):

```js
const bankState = this.bank.getState();
const totalBanked = (bankState.med ?? 0) + (bankState.tech ?? 0) + (bankState.coin ?? 0);
return { ..., totalPickups: totalBanked, ... };
```

`totalPickups` is actually "total MED/TECH/COIN **banked** at the bunker,"
not "items picked up in the world." Ammo and health crate drops are
consumables, not bank-tracked resources, so they were never going to move
this counter even if the player had walked over them. The player in this
log died mid-run without ever returning to deposit anything (matches
`runDepositedResources: {tech: 0, coin: 0, med: 0}` in the same log), so
`totalPickups: 0` is exactly correct, expected behavior — closing with no
code change and no further live verification needed.

**Priority:** none — closed. **Risk:** none.

## 6. "INITIALIZING SYSTEMS SPRIT-25" boot text typo

**Confirmed root cause — not a code bug.** `vite.config.js:23` reads the
live git branch via `git rev-parse --abbrev-ref HEAD` (or `HB_BUILD_BRANCH`
in CI) into `buildInfo.branch`; `main.js:141` derives the on-screen label via
`buildInfo.branch.replace(/^dev\//i, '').toUpperCase()`. The branch this dev
server is actually checked out on is named `dev/sprit-25` — a real typo in
the branch name itself (should be `dev/sprint-25`), not a string-handling bug
in the display code. The display code is doing exactly what it's supposed to:
show the real branch name.

**Confirmed this never reaches real players.** Checked
`.github/workflows/steam-build.yml:58`:
`HB_BUILD_BRANCH: ${{ github.head_ref || github.ref_name }}`. The only
workflow runs that actually upload to Steam are tag-triggered (`v*`) or
manual `workflow_dispatch` (per the same workflow's trigger comment,
verified earlier in this investigation for the projectile-cap PR). For a
tag-triggered run, `github.ref_name` is the version tag (e.g. `v1.2.3`), not
a branch name at all — so a real tagged release build's loading screen would
read "INITIALIZING SYSTEMS V1.2.3", never a branch name, typo'd or not.
Every non-tag CI run (including this typo'd `dev/sprit-25` branch's own push
builds) only packages and proves buildability; nothing about that artifact
reaches a player. This closes as **confirmed non-issue for shipped
builds** — dev/preview-loop cosmetic noise only.

**Next step, if it's still worth doing:** this is a git-ref rename, not a
code change, and this repo has had a concurrent agent/session actively
working the same working directory all session — renaming a branch out
from under it is exactly the kind of shared-state action this session's
established caution rules out doing unilaterally. Flagging to the user:
rename `dev/sprit-25` → `dev/sprint-25` (and update any open PR base/head
refs) when it's safe to do so without disrupting concurrent work, purely
for dev-loop tidiness — not because it affects anything players see.

**Priority:** cosmetic, dev-only, confirmed not shipped. **Risk:** the
branch rename itself carries real risk (shared working directory, concurrent
agent) — explicitly not doing it without user go-ahead, and arguably not
worth the risk at all given it's confirmed invisible to players.

## Summary / execution order

1. **#3 multiplayer mode mismatch — FIXED.** `setupMultiplayerNetwork()` now
   re-runs from `deployMatch()`/`handleRemoteMatchStart()`; verified live
   that `game.isMultiplayer`/`game.multiplayerMode` correctly flip on
   deploy instead of staying `undefined` all session. Shipped in
   commit `1f22fcc`.
2. **#5 totalPickups — CLOSED, not a bug.** The field tracks banked
   resources, not world pickups; 0 is correct for a run that never returned
   to deposit anything.
3. **#6 branch typo — CLOSED for shipped builds.** Confirmed tagged Steam
   releases get the version tag as the label, never a branch name; this only
   ever shows up in local dev. Rename is optional dev-loop tidiness, not a
   player-facing fix, and is a user decision given the shared working
   directory risk.
4. **#1 sustained drip — still open, hardest remaining item.** Four
   independent live-reproduction attempts (bare-stub enemies, full real
   frame loop, real 3D-enemy CPU profile, 68s continuous-play CPU profile)
   all failed to reproduce it. This needs a real trace captured from an
   actual future occurrence rather than more synthetic guessing — see the
   "Recommended next step" in section 1.
5. **#2 boot overhead — still open**, independent of #1, needs its own CPU
   profile of the boot sequence specifically.
6. **#4 interact silent failure — still open**, needs the death-position
   chunk cross-reference to know if there's a real bug here at all.
