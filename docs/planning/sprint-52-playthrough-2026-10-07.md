# Sprint 52 — Smooth the whole run; walk-through world, footprints, popups

Status: **done 2026-10-07** on `dev/sprint-51` (local only), awaiting a Deck run. See the status log at the end.

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

- [ ] **A1. Measure first.**
  - Add per-system frame timings to the session log every 10 s:
    - enemy AI and pathfinding;
    - the prop/scatter loop;
    - chunk mounts;
    - matrix updates;
    - render submit.
  - Also log how many enemies and props are loaded.
  - Add a headless "long walk" probe that walks the player out 6–8 chunks and back, recording frame time and those counts.
  - This becomes the before/after benchmark. It's the fixed route #52 asks for.
- [ ] **A2. Offscreen enemies stop doing full work every frame.**
  - Enemies in chunks you can't see stop running full AI every frame. **Proposed:** they update at a low rate, about 4 Hz, with no pathfinding until their chunk is visible or they're near you.
  - Anything on screen behaves exactly as now. **Needs your OK** (decision 1).
- [ ] **A3. The prop loop skips work nobody can see.**
  - The 3D-model scan and the bob animation run only for visible chunks.
  - Output-identical: nothing visible changes.
- [ ] **A4. Unloading frees what it should.**
  - Dispose all of a chunk's own geometry, materials and textures when it unloads; never dispose shared or cached models.
  - Add a test that mounts and unloads chunks and checks `renderer.info` returns to baseline.
  - Lower `chunkResidentPadding` from 3 to 2 (7×7 instead of 9×9), only if the probe shows prefetch still stays ahead of the player.
- [ ] **A5. Static chunk content stops updating its matrices every frame**: walls, floors and dressing get `matrixAutoUpdate = false` after mounting.
- [ ] **A6. The deploy hitch doesn't set quality for the whole run.**
  - Adaptive resolution ignores the first ~10 s after deploy, and can step back up once frames recover.
  - Resolution remains the only thing it changes, per your standing rule.
  - Also find out what the 1.2–3.6 s deploy tasks are (likely first-use shader compiles).
- **Target:**
  - On the Deck, frame time doesn't grow with distance or explored area.
  - p95 ≤ 33 ms in normal play across a 25-minute run, with no gameplay stall over 250 ms.
  - Measured before and after on the long-walk probe and on a real Deck log.
- **Not on the table:** cutting models, shadows, post-processing or animation (your standing rule). The logs show the time goes to the CPU, not the GPU.

### B. Walk under arches; floors never block (P1, small)

- [ ] **B1. Archways are walk-through.**
  - Grand archways, bulkhead frames and biomech arches block only at their two pillar feet: two small colliders at each side of the opening, along the model's width.
  - Columns and buttresses stay solid.
- [ ] **B2. Floor pieces never block.** Anything flagged as a floor overlay, or a `decal_*` / `scatter_*puddle` type, is never solid, however it was placed.
- **Tests:** collision flags per type; walking through an archway's center succeeds and walking into a pillar is blocked; an e2e walk across a floor grate.

### C. Item scale (P1)

- [ ] **C1. A prop lineup sheet.**
  - Render every world prop at its in-game size beside the operator, in rows by category: beds, seats, crates, machines, arches.
  - Uses the same harness approach as `scripts/capture-equipment-fit.mjs`.
  - You review one image and point at anything that's off.
- [ ] **C2. Beds.**
  - Props are sized by target **height** (`WORLD_3D_MODELS[...].height`). A low, long model (a cot or bed) can come out far too long.
  - Candidates:
    - the bunker cot at spawn (added Sprint 50);
    - camp cots;
    - `prop_medical_bed`;
    - bedrolls.
  - Fix: size beds by length, so a bed is about operator length.
- [ ] **C3. Fix whatever else the sheet flags,** then re-render to confirm.

### D. Fungus breaks underfoot (P1)

- [ ] Walking through a fungus prop crushes it:
  - a quick squash;
  - a puff of spores, using the existing burst effects;
  - a flattened stain left behind.
- [ ] It never blocks movement.
- [ ] Crushed fungus stays crushed for the run, and in co-op for both players (the existing broken-prop sync).
- [ ] Taller growth (`state_growth_overrun_*`, altars, looms) stays solid and breaks only when shot, as now.

### E. Footprints that change with the ground (P1)

- [ ] **One pooled footprint system:**
  - drawn as a single instanced mesh;
  - a ring of about 300 prints;
  - no new objects per step.
  - It replaces `spawnWetFootprint` and costs less than the current wet prints.
- [ ] **Surfaces and look:**

  | You step in / on | Your prints |
  |---|---|
  | Water or coolant | dark, wet |
  | Blood (pools, corpses, blood trails) | red |
  | Slime or spores | green |
  | Oil or grease | black |
  | Ice or snow (cryo biome, outdoors) | pressed pale prints that last longer |
  | Plain floor | none, or a faint dust print |

- [ ] **Your boots carry it:**
  - after a liquid, the next ~12 steps leave prints that fade in strength;
  - each print fades out over ~20–30 s, and ice prints over ~60 s.
- [ ] **Squadmates leave prints too**, drawn locally from their positions, with no extra network traffic.
- [ ] **Footstep sounds** pick from the same surface (wet, snow or concrete).

### F. Popups never cropped (P1, small)

- [ ] Reproduce at 1280×800 and 1920×1080 with two and three popups up.
- [ ] **Fix:**
  - the newest popup always shows in full;
  - older ones collapse to their header line;
  - the stack sizes to its content, so nothing is cut.
- [ ] e2e screenshot check at Deck size.

### G. Found along the way

- [ ] **Cryo hazard one-shot:** 4.5 damage from a single hazard tick killed a full-health co-op guest (#85 comment). Hazard damage should go through the hearts scale like other damage. Check the cause, then fix.

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

- [ ] `src/propBehavior.js` classifies every world prop type by style (arch, column, floor piece, fungus, bed, furniture, machine…). Every placement path reads it, replacing the scattered `startsWith('arch_')`, `planned.blocking !== false` and per-type special cases.
- [ ] The museum placards show each exhibit's behavior. A coverage test fails if a registered model has no behavior.
- [ ] A capture script walks the museum and screenshots every category; I review the sheets and fix what's wrong.

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
| `23337070` | E | **Footprints and trails** (`src/trackField.js`): one pooled field. Prints change with the surface (dust, snow, water, blood, slime, oil); boots carry wet surfaces for about 11 steps; squadmates leave prints. Snails leave slime streaks tinted by type, bosses a wake, walkers claw prints. This replaces the per-mark meshes and the per-frame puddle scan. |
| `d5bc4b9c` | B | **e2e:** a real grand archway in a live run: the opening is walkable, the posts are solid. |

**Long-walk benchmark** (desktop RTX 2070, 4 rings, frame time excluding vsync):

| | Before | After |
|---|---|---|
| Frame time at the far end | ~51 ms, climbing | ~22 ms, flat |
| Pathfinding | 15–55 ms | ~1–3 ms |
| Matrix pass | grows with chunks | flat ~4 ms |

**Not changed, with reasons:**
- **A4, GPU memory on unload:** probed by teleporting across seven areas at a constant 16 chunks. Geometries stayed flat (150–170), so nothing leaks there. Textures rose as new prop types were first loaded (the model cache), and scene counts plateaued. `chunkResidentPadding` stays at 3.
- **G, cryo hazard one-shot:** already fixed. Last night's co-op run used a build (`c2e1619`) older than the Sprint 50 siphon fix (`7e3007a0`, 10 damage became 1 heart); the Steam build `02710831` has it.
- **Walls** are textured blocks in one metal set for every biome. The kit PBR sets (cave, space, cathedral, bunker, biomech, giger, reliquary, cryo deck) exist but never reach the tile walls. Re-skinning walls by biome is an art-direction call for the owner.

**Owner steps:**
1. Play a Deck run of 20 minutes or more on this build and upload the log. The `PERF frame-breakdown` lines show whether frames stay flat on Deck hardware.
2. Decide on per-biome wall textures (above).

