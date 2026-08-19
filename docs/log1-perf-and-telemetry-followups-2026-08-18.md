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

**Root cause found and confirmed via live CPU profile** (CDP
`Profiler.start`/`stop` across a full `page.reload()` through to
`boot-ready`/splash). The dominant cost, by a wide margin, is
**`src/textureKeying.js`'s chroma-key pixel processing**:
`applyBlackChromaKey`/`applyGreenChromaKey`/`isBlackChromaPixel`/
`isGreenChromaPixel`/their internal flood-fill `enqueue` closures, plus the
`getImageData`/`drawImage`/`putImageData` canvas calls around them in
`processImage()` (`src/threeGame.js:5658`). Summed self-time across these
functions in the captured profile: **~2.6 seconds** — matching the log's
2.65s figure almost exactly. `getProgramInfoLog` (WebGL shader
compile/link, ~253ms) is a distant second contributor.

**Why it's expensive:** `applyBlackChromaKey`/`applyGreenChromaKey`
(`src/textureKeying.js:22-146`) run a flood-fill (`Uint8Array` visited set +
`Int32Array` queue, BFS from the image edges) followed by a full
width×height pass, entirely in plain JS on the main thread, once per sprite
image that needs its chroma background keyed out. `loadKeyedSpriteTexture`
(`src/threeGame.js:5622`) does cache the *result* — but only in an
in-memory `Map` (`keyedSpriteTextureCache`) that's empty at the start of
every single page load. Nothing persists this across sessions, so every
boot re-runs the exact same pixel-by-pixel work on the exact same static
PNG files.

**Proposed fixes, not yet implemented (this is a real optimization, not a
one-line change — needs its own scoped pass):**
1. **Persist the keyed result across sessions** — cache the post-chroma-key
   `ImageData`/canvas (or the decoded bitmap) in IndexedDB keyed by
   asset path + a content hash/version, so only the *first-ever* boot on a
   given browser profile pays this cost. Biggest win, moderate complexity
   (async storage API, cache invalidation when source PNGs change).
2. **Pre-bake chroma-keyed assets at build time** — if the source PNGs are
   static repo assets (not runtime-generated), run the same
   `applyBlackChromaKey`/`applyGreenChromaKey` logic once in a build script
   and ship pre-keyed PNGs (already-transparent) instead of doing it in the
   browser at all. Best runtime cost (zero), but needs confirming which
   sprite paths are static vs actually dynamic/generated per-run first.
3. **Move the pixel loop off the main thread** — a Web Worker (transferring
   the `ImageData` buffer) would keep boot from stalling even without
   caching. Doesn't reduce total CPU work, just stops it from blocking
   rendering/input, similar in spirit to the enemy-GLB background-preload
   fix already shipped this session.

Option 1 or 2 is the real fix (eliminates the repeated work, not just moves
it); option 3 is a fallback if the assets genuinely must be keyed live every
time (e.g. some overlay is truly runtime-generated).

**Priority:** medium — one-time cost, paid once per session rather than
repeatedly, so lower urgency than #1's per-run drip despite the large
single number; but ~2.6s wasted identically on every single boot, forever,
is a real win once fixed. **Risk:** low for option 3 (pure relocation, same
pattern already validated this session); moderate for options 1-2 (new
caching/build-step surface area) — needs its own test pass before shipping,
not a quick patch.

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

## 4. Interact spam near the pit-fall death — silent failure — FIXED (UX gap)

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

**Exact reproduction not feasible:** `runEntropy` (the seed logged as
`"Seed: 3428689285"` at `ThreeGame initialized`, elapsedMs 2810) gets
re-rolled to a fresh value once the run actually starts
(`respawnPlayer({resetRunState: true})`, ~32s later in the real log) and is
never logged again — so the exact chunk content the player was standing in
at death can't be regenerated from this log alone. Whether that specific
death had a genuine interactable in range that silently failed to fire
stays an open, unresolvable-from-this-log question.

**Fixed the general gap regardless.** Whether or not that exact death had a
real interactable nearby, the underlying UX problem was real and
reproducible: `triggerGameplayInteract()`
(`src/threeGame.js:4728-4750`) discarded the return value of 12 of its 13
`interactWithX()` checks, so a press near nothing interactable was
indistinguishable from the game not registering the keypress at all — no
success, no "nothing here" cue, just silence either way. Now tracks whether
any check succeeded and plays the existing throttled `ui_error` cue
(`playThrottledUiError`, same pattern `fireWeaponAtCurrentAim()` already
uses for blocked-fire cases) when none did. Verified live: at a position with
all 13 checks confirmed individually returning `false`, the cue now fires;
previously it did not.

**Priority:** closed — shipped. **Risk:** low; verified all 1677 existing
tests still pass, and the fix only adds a cue on the already-existing
"nothing happened" path — it doesn't change any interact behavior.

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

**Fixed and shipped:** #3 (multiplayer mode never propagating to
`game.isMultiplayer`/`multiplayerMode`), #4 (interact presses near nothing
gave no feedback). **Closed, not bugs:** #5 (`totalPickups` correctly
tracks banked resources, not world pickups), #6 (branch-name typo confirmed
never reaches shipped/tagged builds). **Root cause found, fix proposed but
not yet implemented:** #2 (boot-time chroma-key pixel processing, ~2.6s
every session, needs a scoped caching/build-step pass — see section 2's
three options). **Still open, hardest remaining item:** #1 (the sustained
drip) — four independent live-reproduction attempts all failed to
reproduce it; next step is capturing a real trace from an actual future
occurrence rather than further synthetic guessing (see section 1's
"Recommended next step").

1. **#3 multiplayer mode mismatch — FIXED.** `setupMultiplayerNetwork()` now
   re-runs from `deployMatch()`/`handleRemoteMatchStart()`; verified live
   that `game.isMultiplayer`/`game.multiplayerMode` correctly flip on
   deploy instead of staying `undefined` all session. Shipped in
   commit `1f22fcc`.
2. **#4 interact silent failure — FIXED.** `triggerGameplayInteract()` now
   tracks whether any of its 13 checks succeeded and plays the existing
   throttled `ui_error` cue when none did, instead of silent no-op either
   way. Verified live.
3. **#5 totalPickups — CLOSED, not a bug.** The field tracks banked
   resources, not world pickups; 0 is correct for a run that never returned
   to deposit anything.
4. **#6 branch typo — CLOSED for shipped builds.** Confirmed tagged Steam
   releases get the version tag as the label, never a branch name; this only
   ever shows up in local dev. Rename is optional dev-loop tidiness, not a
   player-facing fix, and is a user decision given the shared working
   directory risk.
5. **#2 boot overhead — root cause found, fix not yet implemented.**
   Confirmed via live CPU profile: ~2.6s of every single boot goes into
   `src/textureKeying.js`'s chroma-key pixel processing, re-run from scratch
   every session because the only cache is in-memory and empty on every page
   load. Three fix options proposed in section 2 (persist the keyed result,
   pre-bake at build time, or move it off the main thread) — the first two
   are the real fix but need their own scoped implementation pass, not a
   quick patch.
6. **#1 sustained drip — still open, hardest remaining item.** Four
   independent live-reproduction attempts (bare-stub enemies, full real
   frame loop, real 3D-enemy CPU profile, 68s continuous-play CPU profile)
   all failed to reproduce it. This needs a real trace captured from an
   actual future occurrence rather than more synthetic guessing — see the
   "Recommended next step" in section 1.
