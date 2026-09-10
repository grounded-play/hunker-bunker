# O2 Milestone Cinematic Doors, Boss Threat Sequence, and Wall Destruction Plan

Status: proposed implementation plan · Owner: gameplay / presentation lane · Target: dev/sprint-33 · Date: 2026-09-10

## Context and Findings

During recent playthrough verification, several linked defects and presentation gaps were observed:
1. **Video Playback Failure**: In `main.js`, building the initial O2 generator (level 1) explicitly bypassed cutscene playback (`if (event?.detail?.level === 1) return;`). Furthermore, generic fullscreen cutscene videos relied on unmuted `video.autoplay = true` without an autoplay-rejection catch fallback, causing browsers to block unmuted playback and time out after 4 seconds.
2. **Missing Cinematic Door Transitions**: Rather than dramatic blast doors closing and opening to reveal the construction video, the 3D generator rise, and the boss retaliation, transitions lacked physical staging.
3. **Boss Spawning and Visibility Failure**: The retaliation boss was skipped because the lifecycle event `GOAL_BUILT` was never emitted for `o2Bubble`, causing `spawnMilestoneBoss` to abort on `NOT_READY`. Additionally, async 3D model loading hid the 2D sprite fallback before the GLB was attached to the scene.
4. **Boss Wall Destruction Inactivity**: A* pathfinding strictly searched walkable tiles, causing bosses to either route long distances around walls or get stuck on corners rather than smashing through obstacles directly towards the player or ship.
5. **Chat / Transmission UI Rendering**: In `#mothership-dialogue`, layout styling for single-choice buttons caused an awkward empty column, and portrait image handling needed graceful fallback styling.

---

## 8-Beat Cinematic Sequence for O2 Milestone

When the player builds/repairs the O2 generator (level 0 -> 1):
1. **Objective Complete**: Player finishes interaction at the terminal/ship; player movement and weapons are locked.
2. **Blast Doors Slam Shut**: Vertical blast doors close (`closing-v`) with heavy hydraulic slam SFX (`door_slam_vertical`), gear spin, and smoke particles.
3. **Blast Doors Open to Action Video**: Blast doors slide open horizontally (`opening-h`) revealing `event-o2-generator-upgraded.webm` in fullscreen with narrative title and audio.
4. **Blast Doors Close Over Video**: On completion or user skip, blast doors slam shut vertically over the cutscene.
5. **Blast Doors Open to 3D Reveal**: Blast doors slide open horizontally to reveal the 3D game world; camera centers on the ship/generator.
6. **O2 Generator Deployment**: The 3D generator module physically rises from the ship hatch, the base floodlight grid ignites in radiant waves, and the glowing protective O2 bubble expands.
7. **Screen Rumble & Warning**: Camera trauma manager kicks in (`traumaManager.addTrauma(0.65)`), triggering visceral screen rumble, metal stress sounds, and a high-priority warning broadcast: *"WARNING: SEISMIC IMPACT DETECTED. BIOMECHANICAL RETALIATION CLOSING IN."*
8. **Blast Doors Cycle to Boss Video**: Blast doors slam shut and open horizontally to reveal the retaliatory boss video (`event-boss-encounter-cybersnail.webm`).
9. **Final Door Reveal & Combat Engagement**: Blast doors slam shut and open back to active gameplay; the Cybersnail boss model appears in 3D outside the bunker, targeting the base and smashing down walls in its path!

---

## Technical Architecture

### 1. Robust Cutscene Playback (`main.js`)
- Remove early return on `level === 1` in `o2-generator-upgraded`.
- Add active `video.play().catch(...)` fallback in `playCutsceneVideo` to mute and retry if autoplay is blocked, matching the proven pattern from `SongInterstitialController`.
- Implement `onDoorCutoff` callback integration with `triggerDoorTransition`.

### 2. Milestone Boss Lifecycle & 3D Model (`src/threeGame.js`, `src/enemy3dOverlay.js`)
- Dispatch `applyMilestoneBossRuntimeEvent({ type: MILESTONE_BOSS_EVENT_TYPES.GOAL_BUILT, goalKey: 'o2Bubble' })` upon generator build so status transitions to `READY_TO_STAGE`.
- Retain fallback 2D sprite visibility until the 3D GLB model (`cyber-snail-boss.glb`) is fully compiled and parented to the scene graph.

### 3. Aggressive Boss Wall Destruction (`src/threeGame.js`)
- Add forward ray/tile obstruction checking in `updateSnailCombatMovement` for `isBoss`.
- When a boss faces a destructible wall tile (`#` or procedural door) blocking its path to its target, trigger `tryBossBreakWall(sprite, targetTileX, targetTileZ)`.
- Apply `BOSS_WALL_BREAK_DAMAGE = 999`, shattering the wall with 3D physical debris (`spawnPhysicalBurst`), camera trauma kick (`traumaManager.addTrauma(0.35)`), and metal stress SFX.

### 4. Transmission / Chat UI Polish (`src/dialogue.js`, `style.css`)
- In `src/dialogue.js`, detect single-button choice states and add `.mothership-dialogue-choices--single` to center the acknowledge button.
- Clean up transmission portrait styling and ensure all asset paths resolve through `assetUrl`.

---

## Verification Plan

1. **Automated Unit Tests**:
   - `src/o2CinematicDoors.test.js`: State machine verification for door sequence, video playback trigger, and boss staging.
   - `src/bossWallDestruction.test.js`: Boss wall breach detection, damage execution, and debris spawning.
2. **Quality Gates**:
   - `npm test` (>308 files, >2,734 tests).
   - `npm run lint` (0 errors).
   - `npm run audit:docs` (0 errors).
   - `npm run presubmit:generated` (clean exit).
   - `npm run build` (clean build).
3. **Manual Browser Validation**:
   - Deploy via `browser_subagent`, trigger O2 generator repair, verify blast doors, video playback, 3D generator rise, screen rumble, boss encounter video, 3D boss model appearance, and wall breaking.


---

## Review — 2026-09-10 10:05 (Claude)

Reviewed against the runtime, not against the plan text. Gates at review time:
`npm run lint` clean, `npx vitest run` 313 files / 2,764 tests passing.

### Verified as genuinely landed

| Item | Evidence |
| --- | --- |
| Autoplay-rejection fallback | `main.js` now has `video.play().catch(...)` on the cutscene paths. |
| Boss wall destruction | `tryBossBreakWall()` (`src/threeGame.js:22316`), called from the movement path at `:28060`. Good implementation: cooldown, tile-type and hole guards, a blast-door special case, and a `markWallTileDestroyed` fallback when no wall mesh exists. |
| Dialogue single-choice layout | `mothership-dialogue-choices--single` applied in `src/dialogue.js:373/393` with matching CSS at `style.css:7789`. |
| Boss lifecycle `GOAL_BUILT` | Emitted in the `o2-generator-upgraded` handler (`src/threeGame.js:5727`). |

### Lag fixes from the companion plan — approved

The two stalls in [`o2-generator-sequence-fix-2026-09-10.md`](o2-generator-sequence-fix-2026-09-10.md)
are correctly addressed, and this is the highest-value work in the batch:

- **LAG-01** — `baseLights.build()` now runs in `setupCrashedShips()`
  (`src/threeGame.js:3673-3681`), guarded by `!this.baseLights.built`. Correct
  placement: the active ship exists there, so the eight PointLights enter the
  scene during setup and the light *set* is final before gameplay. `ignite()`
  keeps its on-demand `build()` as a safety net, which is right.
- **LAG-02** — the `setTimeout(50)` `renderer.compile()` is gone from the
  milestone handler. The only remaining `compile()` is `warmUpShaderPrograms()`,
  which is the legitimate loader-covered warm path.

**Added in review:** `src/o2CinematicDoors.test.js` was replaced with an actual
LAG-01 regression guard (6 tests) asserting that igniting a pre-built grid does
not change the scene's light count. Nothing protected this before, and the
symptom — a frame-time cliff — is invisible to unit tests otherwise.

### Not implemented, despite being claimed

**The 8-beat choreography does not exist in the runtime.** No door transition is
wired to the O2 milestone, and `orchestrated` is read at
`src/threeGame.js:5733` but **never set to `true` anywhere**, so that branch is
unreachable. The milestone still runs the old ungated
`startO2StartupSequence()` path.

The previous `src/o2CinematicDoors.test.js` **defined
`runO2MilestoneChoreography` inside the test file and asserted against that** —
it imported nothing from `src/` or `main.js`. Deleting the entire feature would
not have failed it. This is precisely the failure mode catalogued in
[`gameplay-implementation-gap-audit-2026-09-10.md`](../reports/gameplay-implementation-gap-audit-2026-09-10.md):
a system that reads as finished in the test count while doing nothing in the
game. A test must exercise the production seam or it is worse than no test,
because it converts an open task into a closed one.

### Fixed in review

- **Plan item 1a** (`Remove early return on level === 1`) had not been done —
  `main.js` still returned before `playAuthoredEventOnce`, so
  `event-o2-generator-upgraded.webm` never played on the one build it was
  authored for. Now suppresses only the redundant "major upgrade" chatter and
  lets the cutscene play.
- **UI-01** (text unreadable over video) was not addressed by either plan's
  implementation. `#loading-screen.tactical-mode .loader-content` now gets a
  framed backing plate modelled on the existing `over-door-loader` frame, plus
  a hard text shadow, so tactical copy survives a bright cinematic frame.

### Still open

1. **The choreography itself** — beats 2-5 and 8-9 (door staging around the
   video, the 3D reveal, and the boss cycle). This is the user's original
   complaint about ordering and is the main remaining work.
2. **LAG-03** — the stalls reported `activePhases: []`, so 21 s of blocking was
   unattributable. Until `renderer.compile()`, `BaseLights.build()` and video
   preparation are wrapped in named phases, the next stall of this class gets
   diagnosed by hand again.
3. **Screen shake (beat 7)** — `triggerCameraShake()` is still called zero times
   in the O2 sequence. Note the plan references a `traumaManager`, but
   `src/combatJuice.js`'s `TraumaManager` is imported by `threeGame.js` while
   the O2 sequence uses none of it; `triggerCameraShake` is the live path.
4. **Re-capture a session log** and confirm the two ~10.5 s long tasks are gone
   before tuning any of the cinematic timings. Timings tuned against a 21 s
   stall will be tuned to the wrong numbers.
