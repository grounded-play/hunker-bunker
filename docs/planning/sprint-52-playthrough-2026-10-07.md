# Sprint 52 — Smooth the whole run; walk-through world, footprints, popups

Status: **acceptance reopened; fixes required** on `dev/sprint-52`. The original work landed 2026-10-07, but the 2026-10-11/12 owner playtests below disprove several completion claims. Do not ship this acceptance pass until the P0/P1 gates in this addendum pass on the installed Steam build.

## Acceptance addendum — owner playtests, 2026-10-11/12

This is the current handoff for the next pass. It combines the two physical Steam Deck playthroughs, the two distinct short PC playthroughs, the owner's screenshot, the earlier session-log report, and the web-deploy report. All installed playtests are `2.4.16-beta` at commit `920f240647e4`.

### Evidence

| Evidence | Device / duration | What it establishes |
|---|---|---|
| `hunker-bunker-session-2026-10-12T04-34-21-207Z-mv4rcjwy-9xsh.json` | Steam Deck, Scout, 7m 37s | Real Deck gameplay, menu journey, frame pacing and automatic-quality exhaustion. |
| `hunker-bunker-session-2026-10-12T06-00-02-740Z-mv4ueqiy-4cj4.json` | Steam Deck, Engineer, 6m 35s | A second real Deck run after the first run's lower quality settings persisted. |
| `hunker-bunker-session-2026-10-12T06-30-09-216Z-mv4vhg54-8h7c.json` | PC RTX 2070 SUPER, Scout, 1m 46s | First distinct PC playtest and the strongest of the two short PC frame samples. |
| `hunker-bunker-session-2026-10-12T06-31-15-951Z-mv4vivlw-flpg.json` | PC RTX 2070 SUPER, Tank, 55s | Second distinct PC playtest. `…06-31-12-513Z…` is an earlier export of this same session and must not be counted as a third run. |
| [PC world-assembly screenshot](../reports/assets/playtest-pc-2026-10-12-issues.jpg) | PC, Tank, installed Steam build | Missing/unshaded floor, a floor void, bad wall/material scale, intersecting props and decals, obstructed openings, and the sideways/backward weapon. |
| [Session-log review, 2026-10-05 → 2026-10-08](../reports/session-log-review-2026-10-08.md) | Earlier Deck and PC runs | The comparison baseline: Deck p50 46–78 ms and p95 73–177 ms; PC p50 21–33 ms and p95 29–57 ms. |
| [Netlify deploy `6acc7bec4c12830008bb97b2`](https://app.netlify.com/projects/hunkerbunker/deploys/6acc7bec4c12830008bb97b2) and local `.lighthouseci` reports | Desktop Lighthouse, `?lighthouse=1` | Same tagged code (`v2.4.16-beta` points to `920f240647e4`), but only a static initial-load check—not gameplay performance. |

The screenshot is acceptance evidence, not a composition reference:

![PC playtest: missing floor, floor void, bad wall scale and placement defects](../reports/assets/playtest-pc-2026-10-12-issues.jpg)

### Acceptance decision

- **Deck performance fails P0.** Both physical Deck runs are around 15–16 presented FPS and fail the existing p95 ≤33 ms gate.
- **PC performance also remains below the 60 FPS target.** The Scout sample is approximately 29 FPS; the Tank sample is approximately 20 FPS and contains severe streaming/first-draw stalls.
- **Controller UX fails P1.** Hero Select deliberately routes Down through Back before Initialize, while Armory relies on geometric wrapping. Neither implements the owner's expected “straight down to advance” path.
- **Hero Select fails the 3D-only art requirement.** Its DOM, runtime and e2e test intentionally permit a 2D portrait/sprite fallback.
- **Walk-under architecture is incomplete.** The documented bulkhead behavior is contradicted by the behavior table and test, and the newer tendril doorway is not classified as a walk-through arch.
- **World presentation fails P0/P1.** The PC screenshot is a release blocker: missing floor/voids affect navigation readability, while weapon, material, decal and prop placement are visibly broken.

### Performance comparison

Presented-frame intervals are wall-clock intervals retained by the session logger, not pure GPU timings. They include CPU work, stalls and presentation pacing.

| Run | p50 | p95 | Approx. FPS | Long tasks | Peak estimate / notable load |
|---|---:|---:|---:|---:|---|
| Deck Scout, `04-34-21` | 59.1 ms | 104.8 ms | 15.8 | 718; max 2.59s | heap 1.22 GiB; GPU-memory estimate 1.69 GiB; 20 chunks / 1,101 props |
| Deck Engineer, `06-00-02` | 59.2 ms | 100.9 ms | 15.6 | 1,481; max 3.22s | heap 670 MiB; GPU-memory estimate 1.85 GiB; 38 chunks / 1,367 props |
| PC Scout, `06-30-09` | 29.7 ms | 47.5 ms | 29.0 | 56; max 2.42s | GPU EMA 11.65 ms; 20 chunks; 1.76 GiB final GPU-memory estimate |
| PC Tank, `06-31-15` | retained average 49.6 ms | 104.9 ms | 20.2 | 56; max 1.69s | GPU EMA 7.96 ms; 16 chunks / 1,094 props in the stable window |
| Earlier Deck range | 46–78 ms | 73–177 ms | 13–22 | repeated multi-second stalls | Denser worlds were already below the 30 FPS target. |
| Earlier PC range | 21–33 ms | 29–57 ms | 30–48 | repeated single stalls | The new Scout sample is within this old range; the Tank sample is worse. |

Interpretation:

- The new Deck p50 (~59 ms) sits in the middle of the old 46–78 ms band. Its p95 (~101–105 ms) is better than the worst earlier 142–177 ms captures but worse than the best 73–88 ms captures. This is **not** acceptance: neither run reaches 30 FPS, and neither is the required 20–25-minute soak.
- The logger still identifies a CPU/main-thread limit. Median `renderFrame` work is about 22 ms on Deck, then scatter, camp, player and chunk work lift measured gameplay windows to roughly 39–40 ms before presentation stalls. The quality ladder lowered world detail, landmarks, effects and shadows, then repeatedly reported `graphics-auto-nothing-left` at roughly 8–26 FPS.
- The Tank PC run briefly measured a 91.5 ms frame-breakdown window while chunk/model work was arriving, then a 23.45 ms window after settling. Low GPU EMA beside poor presented pacing again points at CPU/streaming/first-use work, not only raster cost.
- The local Lighthouse reports score 96–97 with FCP 509–521 ms, LCP 1.32–1.38s and TBT 16–22 ms. That run uses the desktop Lighthouse path, an initial static page load and GPU-disabled headless Chrome. It does not exercise Electron, procedural world streaming, combat, controller input or a Deck GPU. A good Lighthouse score therefore proves the web shell loads quickly; it does not contradict the gameplay logs.

#### Performance fixes and gates

- [ ] **P0-PERF-1: profile the render-side CPU work inside `renderFrame`.** Split wall/floor/decal submission, scene traversal, EffectComposer, shadow work and renderer submit rather than leaving ~22 ms in one bucket.
- [ ] **P0-PERF-2: bound world residency during real travel.** The second Deck run reached 38 active chunks despite the earlier “flat long walk” claim. Record mount, retained and visible counts separately and prove old chunks are evicted on the installed build.
- [ ] **P0-PERF-3: remove model-arrival stalls.** Budget chunk mounting and GLB preparation across frames; prewarm only bounded, player-near variants; never mount hundreds of placements in one frame.
- [ ] **P0-PERF-4: rerun comparable acceptance.** One 25-minute fixed-route Deck run and one 10-minute RTX 2070 SUPER run on the same commit. Deck p95 ≤33 ms, PC p95 ≤16.7 ms outside explicitly tagged transitions, no gameplay stall >250 ms, and no `graphics-auto-nothing-left` loop.

### Controller focus — Hero Select and Armory

**Responsible code:** `main.js` (`moveHeroSelectPanelFocus`, `moveSpatialControllerFocus`, `SPATIAL_FOCUS_ROOT_IDS`), `src/inputActions.js` (`spatialFocusIndex`), and `tests/e2e/controller-focus.spec.js`.

What is wrong:

- Hero Select is doing what its hand-authored graph says, but that graph is wrong for the intended journey. Down from the lower command area goes to `#hero-select-back-btn`; only another Down reaches `#start-game`. The e2e test currently blesses that detour.
- Armory has no semantic “advance” edge. It asks `spatialFocusIndex` for the nearest rectangle and wraps to the opposite edge when there is no candidate. At Deck aspect ratio, footer buttons, Vault, Back or another tile can win instead of Embark.
- The logs do not record individual focus transitions, so they can confirm controller/input-mode state but cannot prove the exact bad edge. In the first Deck run Steam Input was present while deploy provenance still reported keyboard mode; the Armory click history is consistent with pointer/touch rescue. Add telemetry before the next physical validation.

Required fix:

- [ ] **P1-FOCUS-1:** define a small semantic focus graph per screen. On Hero Select, Down from the selected hero or bottom command row reaches Initialize directly; Back remains reachable with B/Escape and a deliberate left/up edge.
- [ ] **P1-FOCUS-2:** on Armory, Down from every terminal control in the lowest content row reaches Embark. Up from Embark returns to the last logical Armory control. Do not generic-wrap a terminal Down press.
- [ ] **P1-FOCUS-3:** add focus telemetry `{root, from, direction, to, inputSource}` and tests driven through the real `gamepad-menu-nav`/Steam Input route at 1280×800. Tests must cover every Hero Select class and every Armory tab/picker, with disabled/hidden controls present.

### Hero Select must be 3D-only

**Responsible code:** `index.html` (`#char-preview-fallback`, `#char-preview-sprite`), `main.js` (`PREVIEW_PORTRAITS`, `getPreviewSpriteImage`, `renderPreviewFrame`, `syncHeroPreview`, `ensureScoutHeroPreview`), and `tests/e2e/character-preview.spec.js`.

This is not an accidental stale asset. The screen currently ships a PNG `<img>`, a sprite canvas, three WebP portraits, sprite-atlas repacking, an eight-second timeout, and error handlers whose stated behavior is to keep the 2D fallback. The existing e2e accepts a PNG/WebP or sprite as success. No preview-load error appears in these retained logs, so a slow load window alone can expose the placeholder.

- [ ] **P1-HERO-1:** remove the portrait and sprite fallback nodes and their decode/timer path from Hero Select.
- [ ] **P1-HERO-2:** keep the blast door closed over a lightweight loading state until the selected 3D operator is ready. On a real load failure, show a neutral 3D diagnostic silhouette/error state and log the failed URL; never reveal 2D character art.
- [ ] **P1-HERO-3:** revise e2e so visible 2D preview nodes fail the test. Exercise first open, rapid class switching, offline/missing-model failure and slow-load simulation.

### Walk-under arches and doorway clearance

**Responsible code:** `src/propBehavior.js` (`WALK_THROUGH_ARCHES`), `src/threeGame.js` (`measureArchPillars`, placement defaults and `canOccupyPosition`), `src/world3dOverlay.js`, `src/propBehavior.test.js`, and `tests/e2e/walk-under-arch.spec.js`.

The prior B1 completion statement is inaccurate:

- `WALK_THROUGH_ARCHES` contains only the four grand arches and `prop_biomech_arch`.
- `src/propBehavior.test.js` explicitly expects `arch_bulkhead_frame` to be `SOLID`, although this document said bulkhead frames had pillar-only collision.
- `hive_tendril_arch` is registered and its asset plan calls it a non-blocking doorway frame, but it is absent from the walk-through set.
- The e2e validates only `arch_deco_archway_grand_01`, so it could not catch either gap.

- [ ] **P1-ARCH-1:** replace the partial name whitelist with explicit per-model aperture metadata: opening width/depth, post bounds, forward axis and minimum player clearance. Classify `arch_bulkhead_frame` and `hive_tendril_arch` from their measured geometry.
- [ ] **P1-ARCH-2:** reserve doorway clearance during room dressing and structural placement. Reject or relocate any blocking prop whose expanded footprint intersects the portal corridor; collision correctness alone does not prevent a crate/barricade from sealing a door.
- [ ] **P1-ARCH-3:** table-test every doorway-family model and run e2e centerline/post tests for each. Add a generated doorway-clearance sweep with player radius included.

### PC world-presentation failures

The screenshot and the two PC logs come from the same code revision. The logs contain no asset-load errors and report complete core/gameplay manifests, so investigate deterministic geometry/material/placement code first.

| Priority | Visible failure | Likely responsible code | Required fix / acceptance |
|---|---|---|---|
| P0 | Large pale floor areas and a black floor hole/void | `src/threeGame.js` chunk floor mesh/material binding; `src/floorSplat.js` no-floor mask and layer resolution; chunk seam/mount lifecycle | Add a seed/position repro from the PC log; assert every walkable tile is covered by opaque floor geometry after mount; visualize mask values; make the fallback floor material unmistakably valid. Golden capture must show no pale fallback, black hole or seam while crossing chunks. |
| P0 | Doorways can be physically blocked | room/structure planning in `src/threeGame.js`; `src/roomDressing.js`; `src/roomDressingKits.js`; behavior/collider data | Add a portal-clearance exclusion volume expanded by player radius, validate it after all structural and dressing placement, and move/drop offenders deterministically. Pathfind across every generated portal in a multi-seed test. |
| P1 | Tank sidearm points backward/sideways and does not sit correctly in the hands | `src/weaponCalibration.js` shared rotations/claimed `forwardAxis`; `src/player3dOverlay.js` `createClassWeapon` and RightHand attachment | Calibrate each weapon asset from muzzle/forward metadata and grip socket, not one shared Euler assumption. Add front/side/back gameplay captures for every class/skin and a muzzle-forward assertion against operator aim. Test the installed Tank sidearm shown here first. |
| P1 | Wall decals/floor decals float, cross an edge, or sit under/intersect walls | `src/roomDressingRenderer.js` uses a fixed wall height and a normal-derived yaw; `src/stickerDecals.js` legacy projections; dressing plan support data | Raycast/project each decal to its actual support surface; store support ID/normal/offset; clip/reject decals outside the support face; use polygon offset/depth bias only after placement is correct. Acceptance: no unsupported decal corners in a multi-seed capture sweep. |
| P1 | Props and trim are buried in walls, protrude through them or float away from support | `src/roomDressing.js`, `src/roomDressingRenderer.js`, `src/threeGame.js` placement/replacement bounds, model origin/scale data in `src/world3dOverlay.js` | Normalize model pivots and authored bounds; place by oriented bounding box against the chosen floor/wall support; reject penetration beyond a small tolerance; add post-replacement validation because a 3D GLB can be larger than its planning proxy. |
| P1 | Wall/floor texture scale is stretched, over-tiled and inconsistent between adjacent pieces | `src/wallAutotile.js` world/face UV shader logic; `src/floorSplat.js` per-surface scale values; `src/threeGame.js` texture repeat/material clones | Establish metres-per-texel per material family, derive UVs in world space, and lock adjacent faces to the same origin. Add texel-density debug view and reference captures beside the operator. Do not tune each screenshot piece by eye. |
| P1 | Wall masses/ledges overlap and some trims appear unsupported | `src/wallAutotile.js`; architecture/large-room generation and wall instance construction in `src/threeGame.js` | Validate generated wall occupancy before instancing, deduplicate coincident faces, cap ledges to their support span and add seam/overlap diagnostics. Golden test the exact logged seed `3245068347` plus a seed sweep. |

Additional visual-review rule: a “loaded successfully” asset is not necessarily placed successfully. Acceptance captures must be made from the gameplay camera after asynchronous 3D replacements finish, with collision overlays and support IDs available in a paired debug capture.

### Fix order and definition of done

1. **P0 traversal/readability:** floor coverage and holes; doorway/arch clearance.
2. **P0 performance:** bound mounts/residency and split/fix the render-side CPU bucket.
3. **P1 controller journey and 3D-only Hero Select.**
4. **P1 authored presentation:** weapon sockets, decal projection, prop support/penetration, texel density and wall overlaps.
5. **Acceptance:** installed Steam build, same commit on PC and Deck; automated seed/collision/focus suites; PC golden captures; 25-minute Deck fixed route. Attach the resulting log IDs and captures here before changing the status back to complete.

## The owner, 2026-10-07, after a Deck playthrough

- "There are alien arch doorways that are solid. They need to be walk-underable."
- "The scaling on some items is off. There is a bed that is too big."
- "The floor pieces shouldn't block you."
- "The fungus should break when you walk over it."
- "I want to leave footprints as we walk, that fade and change based on if we walked on water, blood, ice, etc."
- "The comment boxes that pop up: the second one is having its lower part cropped."
- "When I get too far from spawn the entire game starts crawling FPS-wise. This happened in the long playthrough too. Can we make the FPS and gameplay smooth and high-value the entire time?"

## What the logs show

**Captures:**
- `hunker-bunker-session-2026-10-07T16-10-02-553Z` (today). Steam Deck, 2.4.16-beta at `02710831` (the Sprint 51 build), 12 minutes, about 11 of them in gameplay.
- `…2026-10-06T22-52-30-009Z` (yesterday's long solo run, 27 minutes) shows the same pattern.

### 1. The slowdown grows with explored area, not with time

Draw calls stay flat. What grows is what's kept loaded and updated:

| Today (Deck) | 09:00 | 09:02 | 09:04 | 09:07 | 09:09 |
|---|---|---|---|---|---|
| Chunks kept loaded | 16 | 31 | 38 | 38 | 43 |
| Geometries | 710 | 1,647 | 2,068 | 2,202 | 2,829 |
| Textures | 298 | 478 | 523 | 534 | 730 |
| Draw calls | 522 | 575 | 497 | 547 | 253–600 |
| Triangles drawn | 1.5–3.1 M | 1.9 M | 4.8 M | 1.6–3.6 M | 0.6–1.3 M |

- **Long tasks:** 5–8 seconds of every 10-second window, nearly all in the `frame:render` phase. That's frames of 55–80 ms, about 12–18 FPS.
- **Yesterday:** the same climb, 16 → 43 chunks and 730 → 2,870 geometries.

**Causes found in code (`src/threeGame.js`):**

1. **Up to 81 chunks stay loaded.** The unload radius is the visible radius (1) plus `chunkResidentPadding` (3), so a 9×9 block around the player stays loaded. The farther you explore, the fuller it gets.
2. **Every frame touches every enemy and prop in every loaded chunk**, offscreen ones included. This is the `for (const child of this.scatterSprites)` loop:
   - Enemies in hidden chunks run full AI, including A* repaths (`updateSnailBehavior`, `findSnailPath`).
   - Every object runs a 3D-replacement scan 8 times a second (`loadNearbyWorld3dReplacement`).
   - Props run their bob animation even when invisible.
3. **Unloading frees too little.** `disposeChunkGroupResources` disposes only scatter materials and pickup effects. Wall, floor and dressing geometry may never be freed: the geometry count never falls when chunks unload. Needs confirming with `renderer.info` before and after an unload.
4. **The whole scene graph updates its matrices every frame**, hidden chunk groups included.

**Also seen:**
- **Deploy hitch:**
  - long tasks of 1.2–3.6 s at deploy;
  - adaptive quality engaged at **3.5 FPS** inside that hitch (09:00:03), so the whole run played at reduced resolution because of a one-time stall.
- **A 4.5-damage hit from a cryo hazard** killed a full-health co-op guest last night (#85 comment). Separate bug, listed below.

### 2. "Comment boxes": the second popup is cropped

- **Likely cause:** in the docked HUD layout (`src/styles/hudInformationArchitecture.css`), `.hud-notification-stack` has `max-height: min(220u, 32vh)` and `overflow: hidden`. Each card inside also has `overflow: hidden`.
- **Effect on the Deck:** 800 px tall, so 32vh is 256 px. When two cards stack, the second one's bottom is cut off.
- **To confirm:** a 1280×800 screenshot with two popups up.

### 3. Solid archways and floor pieces

- **Archways:** a 3D prop whose type starts with `arch_` is solid by default (`isSolidProp: placement.isSolidProp ?? placement.type.startsWith('arch_')`). Its round collider sits at the model's center, which for an archway is the middle of the opening.
  - Affected: `arch_deco_archway_grand_01…04`, `arch_bulkhead_frame`.
  - `prop_biomech_arch` (camp territory structures) is placed by a different path; check how its collider is set.
- **Floor pieces:** props placed by the room planner are solid unless the plan says otherwise (`isSolidProp: planned.blocking !== false`).
  - That includes flat floor pieces: grates, medallions, drains, puddles, bedrolls, moss.
  - The code already knows they're floor overlays (`isFloorOverlayType`), but uses that only for their height.

### 4. Fungus, footprints

- **Fungus:** no walk-over behavior exists. The fungus props:
  - `prop_cave_spores`, `prop_spore_colony`, `prop_cave_lichen`;
  - `scatter_bio_moss`, `decal_spore_growth_patch`;
  - `decal_growth_creep_*`, `state_growth_overrun_*`.
- **Footprints:**
  - A **wet-only** version exists (`spawnWetFootprint`). It makes a new mesh, geometry and material for every single print, which is itself a per-step cost.
  - Footstep audio already picks a surface, but only snow or concrete.

## Plan

Order: performance first (it affects everything), then the quick collision fixes, then the new features.

### A. Smooth for the whole run (P0)

- [x] **A1. Measure first.**
  - Add per-system frame timings to the session log every 10 s:
    - enemy AI and pathfinding;
    - the prop/scatter loop;
    - chunk mounts;
    - matrix updates;
    - render submit.
  - Also log how many enemies and props are loaded.
  - Add a headless "long walk" probe that walks the player out 6–8 chunks and back, recording frame time and those counts.
  - This becomes the before/after benchmark. It's the fixed route #52 asks for.
- [x] **A2. Offscreen enemies stop doing full work every frame.**
  - Enemies in chunks you can't see stop running full AI every frame. **Proposed:** they update at a low rate, about 4 Hz, with no pathfinding until their chunk is visible or they're near you.
  - Anything on screen behaves exactly as now. **Needs your OK** (decision 1).
- [x] **A3. The prop loop skips work nobody can see.**
  - The 3D-model scan and the bob animation run only for visible chunks.
  - Output-identical: nothing visible changes.
- [x] **A4. Unloading frees what it should.**
  - Dispose all of a chunk's own geometry, materials and textures when it unloads; never dispose shared or cached models.
  - Add a test that mounts and unloads chunks and checks `renderer.info` returns to baseline.
  - Lower `chunkResidentPadding` from 3 to 2 (7×7 instead of 9×9), only if the probe shows prefetch still stays ahead of the player.
- [x] **A5. Static chunk content stops updating its matrices every frame**: walls, floors and dressing get `matrixAutoUpdate = false` after mounting.
- [x] **A6. The deploy hitch doesn't set quality for the whole run.**
  - Adaptive resolution ignores the first ~10 s after deploy, and can step back up once frames recover.
  - Resolution remains the only thing it changes, per your standing rule.
  - Also find out what the 1.2–3.6 s deploy tasks are (likely first-use shader compiles).
- [x] **A7. Close the remaining heavy first-draw shader hitch.**
  - The 2026-10-07 shot/kill probe found that `4a9d7fa6` removed the burst-light recompiles and the opaque-then-transparent corpse compile, reducing a kill from 11 new programs / 400 ms to 3 new programs / 133 ms.
  - Identify those last program owners on the current build, prewarm only the required variants outside active play, and turn the probe into a regression budget.
  - Do not move the hitch into deploy or keep duplicate model trees alive without a bounded cache.
  - Completed 2026-10-08: regular corpse variants compile serially behind the deployment cover; late models compile against both EffectComposer ping-pong targets; exact gib materials compile before the 3D enemy replaces its sprite. The probe now allows at most one lightweight sprite program and rejects any physical/basic kill-time regression.
- **Target:**
  - On the Deck, frame time doesn't grow with distance or explored area.
  - p95 ≤ 33 ms in normal play across a 25-minute run, with no gameplay stall over 250 ms.
  - Measured before and after on the long-walk probe and on a real Deck log.
- **Not on the table:** cutting models, shadows, post-processing or animation (your standing rule). The logs show the time goes to the CPU, not the GPU.

### B. Walk under arches; floors never block (P1, reopened)

- [ ] **B1. Archways are walk-through. Reopened by the 2026-10-11/12 playtest and code audit.**
  - Grand archways work through their two pillar feet, but bulkhead frames remain explicitly solid and the tendril doorway has no aperture classification. Complete `P1-ARCH-1` through `P1-ARCH-3` above.
  - Columns and buttresses stay solid.
- [x] **B2. Floor pieces never block.** Anything flagged as a floor overlay, or a `decal_*` / `scatter_*puddle` type, is never solid, however it was placed.
- **Tests:** collision flags per type; walking through an archway's center succeeds and walking into a pillar is blocked; an e2e walk across a floor grate.

### C. Item scale (P1)

- [x] **C1. A prop lineup sheet.**
  - Render every world prop at its in-game size beside the operator, in rows by category: beds, seats, crates, machines, arches.
  - Uses the same harness approach as `scripts/capture-equipment-fit.mjs`.
  - You review one image and point at anything that's off.
- [x] **C2. Beds.**
  - Props are sized by target **height** (`WORLD_3D_MODELS[...].height`). A low, long model (a cot or bed) can come out far too long.
  - Candidates:
    - the bunker cot at spawn (added Sprint 50);
    - camp cots;
    - `prop_medical_bed`;
    - bedrolls.
  - Fix: size beds by length, so a bed is about operator length.
- [x] **C3. Fix whatever else the sheet flags,** then re-render to confirm.

### D. Fungus breaks underfoot (P1)

- [x] Walking through a fungus prop crushes it:
  - a quick squash;
  - a puff of spores, using the existing burst effects;
  - a flattened stain left behind.
- [x] It never blocks movement.
- [x] Crushed fungus stays crushed for the run, and in co-op for both players (the existing broken-prop sync).
- [x] Taller growth (`state_growth_overrun_*`, altars, looms) stays solid and breaks only when shot, as now.

### E. Footprints that change with the ground (P1)

- [x] **One pooled footprint system:**
  - drawn as a single instanced mesh;
  - a ring of about 300 prints;
  - no new objects per step.
  - It replaces `spawnWetFootprint` and costs less than the current wet prints.
- [x] **Surfaces and look:**

  | You step in / on | Your prints |
  |---|---|
  | Water or coolant | dark, wet |
  | Blood (pools, corpses, blood trails) | red |
  | Slime or spores | green |
  | Oil or grease | black |
  | Ice or snow (cryo biome, outdoors) | pressed pale prints that last longer |
  | Plain floor | none, or a faint dust print |

- [x] **Your boots carry it:**
  - after a liquid, the next ~12 steps leave prints that fade in strength;
  - each print fades out over ~20–30 s, and ice prints over ~60 s.
- [x] **Squadmates leave prints too**, drawn locally from their positions, with no extra network traffic.
- [x] **Footstep sounds** pick from the same surface (wet, snow or concrete).

### F. Popups never cropped (P1, small)

- [x] Reproduce at 1280×800 and 1920×1080 with two and three popups up.
- [x] **Fix:**
  - the newest popup always shows in full;
  - older ones collapse to their header line;
  - the stack sizes to its content, so nothing is cut.
- [x] e2e screenshot check at Deck size.

### G. Found along the way

- [x] **Cryo hazard one-shot:** 4.5 damage from a single hazard tick killed a full-health co-op guest (#85 comment). Hazard damage should go through the hearts scale like other damage. Check the cause, then fix.

## Decisions (owner, 2026-10-07)

> "walk the prop aisle and see it all, is this right, each model does its thing unique to its style and placement, enemies leave slime trails etc too, keep working on this branch and make sure enemies are static / not placed"

1. **Offscreen enemies (A2):** static. No AI or pathfinding until their chunk is on screen or they're near the player.
2. **Scale (C):** I walk the Asset Museum (the "prop aisle", `museum` command) myself, check every exhibit against the operator, and fix what's off.
3. **Each model behaves for its style and placement:** one behavior table per prop type (H below) decides:
   - **collision:** solid, pillars only, or none;
   - **underfoot:** crushable or not;
   - **floor:** flat floor piece or not;
   - **sizing:** by height or by length.
4. **Footprints (E):** enemies leave tracks too; snails leave slime trails.
5. **Museum:** no live enemies from the generated world appear there; only its own exhibits, standing still.
6. **Branch:** keep working on `dev/sprint-51`.
7. **Fungus (D):** not answered, so cosmetic (crunch, puff, stain).

### H. One behavior table for every prop (from decision 3)

- [x] `src/propBehavior.js` classifies every world prop type by style (arch, column, floor piece, fungus, bed, furniture, machine…). Every placement path reads it, replacing the scattered `startsWith('arch_')`, `planned.blocking !== false` and per-type special cases.
- [x] The museum placards show each exhibit's behavior. A coverage test fails if a registered model has no behavior.
- [x] A capture script walks the museum and screenshots every category; I review the sheets and fix what's wrong.

## Verification

- **Performance:**
  - the long-walk probe, before and after each step of A;
  - then a real Deck run of at least 20 minutes, with the log uploaded.
  - Done when frame time stays flat across the run.
- **Everything else:**
  - unit tests per item;
  - e2e walks for B;
  - screenshots for C and F at 1280×800.

## Status log (2026-10-07)

| Commit | Item | What |
|---|---|---|
| `8c0d7292` | B, C, H | **Behavior table and scale.** `src/propBehavior.js`: grand archways and the biomech arch block only at their two posts (measured from the placed model); floor pieces never block; low fungus is crushable. The museum walk (`tests/e2e/probes/museum-walk.spec.js`) found three models sprawling from height sizing: the frost vent (6.5 across), the thermal pod (5.2) and the drainage trough (9.8); `maxSpan` caps them. The bunker cot's 2D fallback shrank from 2.1 × 1.4 to the 3D cot's size. The museum hides scene-level world entities, and its placards say WALK UNDER / FLOOR / CRUSHES UNDERFOOT. |
| `6e986f2e` | D | **Fungus crushes underfoot**: a puff, a squish and a stain. Cosmetic, persistent, synced in co-op. |
| `db289d80` | (owner, mid-sprint) | **"Machine cult in purple and just boxes."** Five world textures were 64 px placeholder cards. Four now draw real art (dogtags, machinery shrine, wall breach, and the Horizon survey probe standing in for the black box). The herb cache has no art, so it is no longer placed. A test fails on any placeholder-sized world texture. |
| `01fb17d8` | (owner, mid-sprint) | **Raised floor steps** wore the wall texture and read as grey crates; they now use the floor plates. |
| `2b78cda3` | F | **Popups.** The docked deck's 176 px cap cut a second card, and a long developer-commentary card even on its own. Cards now show whole or wait their turn. Verified at 1280×800 (`tests/e2e/hud-popup-deck.spec.js`). |
| `1072606e` | A1 | **Measured the slowdown.** Gameplay writes a per-system `frame-breakdown` to the session log every 10 s. The long-walk probe (real GPU) traced it to enemy A*: 15–35 ms a frame. `src/snailPath.js` runs the same search with cheap bookkeeping; the old implementation is kept in a test, and the two return identical paths on 720 randomized searches. |
| `efabbd82` | A2, A3 | **Offscreen enemies stay static** (owner decision). Props in hidden chunks skip per-frame work. Hunters re-plan on their own timer instead of every tile the player crosses; searches per frame had climbed from 1.7 to 10. |
| `ace9181f` | A5 | **Hidden chunks skip the matrix pass**, which had grown from 2.0 to 5.2 ms with loaded chunks; it is now flat. |
| `c7dc4350` | A6 | **The deploy stall** no longer sets the resolution for the whole run: a 12 s grace period, recovery after steady high FPS, and no flapping. |
| `4a9d7fa6` | A6, A7 | **Shot and kill recompiles.** Vent lights remain in the shader light count at zero intensity instead of toggling visibility; corpse transparency is configured before its compile prewarm. The GPU probe fell from 11 new programs / 400 ms on a kill to 3 / 133 ms. See `qa-2026-10-07-no-damage-and-stalls.md`; the last three first-draw programs remain A7. |
| `1eb220f0`–`bf22ba2d` | A7 | **Exact first-kill variants.** A three-type retained corpse cache, composer-target-aware late-model prewarming, exact per-enemy gib material warmup, corpse fallback sprites, and both composer buffers reduce the current first-shot/kill probe from 11 new programs to one lightweight sprite program. The probe enforces that ceiling and rejects physical/basic variants. |
| `23337070` | E | **Footprints and trails** (`src/trackField.js`): one pooled field. Prints change with the surface (dust, snow, water, blood, slime, oil); boots carry wet surfaces for about 11 steps; squadmates leave prints. Snails leave slime streaks tinted by type, bosses a wake, walkers claw prints. This replaces the per-mark meshes and the per-frame puddle scan. |
| `d5bc4b9c` | B | **e2e:** a real grand archway in a live run: the opening is walkable, the posts are solid. |
| `ef1b40d3`, `20257ba9`, `2179f2d6` | owner wall decision | **Biome walls shipped in Sprint 53.** Tile walls now select the existing kit PBR families by biome, retain their textures under the lighting pass, and participate in the fuller lived-in room compositions. |

**Long-walk benchmark** (desktop RTX 2070, 4 rings, frame time excluding vsync):

| | Before | After |
|---|---|---|
| Frame time at the far end | ~51 ms, climbing | ~22 ms, flat |
| Pathfinding | 15–55 ms | ~1–3 ms |
| Matrix pass | grows with chunks | flat ~4 ms |

**Not changed, with reasons:**
- **A4, GPU memory on unload:** probed by teleporting across seven areas at a constant 16 chunks. Geometries stayed flat (150–170), so nothing leaks there. Textures rose as new prop types were first loaded (the model cache), and scene counts plateaued. `chunkResidentPadding` stays at 3.
- **G, cryo hazard one-shot:** already fixed. Last night's co-op run used a build (`c2e1619`) older than the Sprint 50 siphon fix (`7e3007a0`, 10 damage became 1 heart); the Steam build `02710831` has it.
- **Walls:** the open art-direction decision was resolved after this sprint. Sprint 53 routes the existing kit PBR families to tile walls by biome (`ef1b40d3`), preserves them under the lighting pass (`20257ba9`), and uses them in the expanded room compositions (`2179f2d6`).

**Owner steps:**
1. Play a Deck run of 20 minutes or more on this build and upload the log. The `PERF frame-breakdown` lines show whether frames stay flat on Deck hardware.
2. Re-check Act 1 damage and shot/kill frame times in that same capture against `docs/planning/qa-2026-10-07-no-damage-and-stalls.md`.
