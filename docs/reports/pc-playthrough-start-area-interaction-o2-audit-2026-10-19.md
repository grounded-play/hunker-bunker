# PC playthrough: start area, interaction direction, and O2 repair audit

Date: 2026-10-19  
Status: fixes implemented and source-validated; packaged PC verification required  
Source session: `logs/hunker-bunker-session-2026-10-19T07-12-13-968Z-mvex2ivr-fsqa.json`

## Build boundary

The source session is a real Windows/Steam playthrough of `2.4.17-beta`, commit
`1a3eb7861245`, built at `2026-10-19T06:24:52.478Z`. It ran from
`07:03:03Z` to `07:12:13Z`.

The implementation based on this audit is currently in the working tree after
commit `d7dd9b61645b`. It expands the crash site, removes third-person wall
cutaways, makes interaction targeting directional, migrates cot placement,
and repairs O2 debug/assembly behavior. Those changes pass automated source
validation but must not be called packaged-build verified until a new PC
playthrough passes the checks below.

## Findings

| ID | Player-visible issue | Evidence | Current-source diagnosis | Status |
| --- | --- | --- | --- | --- |
| PC-01 | The crash/start area is cramped; walls crowd the ship. | The captured build used a 17×16 chamber with partitions at x=5 and x=13, and depenetrated the player at `(10.095, 7.910)` and `(15.426, 5.305)`. | The chamber is now 29×26 with an 11×11 partition/static-prop-free ship envelope, five-cell routes, and relocated authored bays. | **Implemented; PC verification pending** |
| PC-02 | A hole/gap near the start reads as traversable but cannot be crossed, while another apparent wall opening can be walked through away from the door. | The session depenetrated near the authored approach at `(6.992, -4.650)`. Two later destroyed walls were far from the start. | Third-person now keeps collision-bearing walls and fixtures at full height. The larger authored shell moves hazards away from the ship, and depenetration telemetry now records tile and blocker source. | **Implemented; PC verification pending** |
| PC-03 | Search/interact can select something other than what the player is facing, then leave movement/facing feeling wrong. | The old log records E presses but not target/facing outcomes. The old resolver allowed a sufficiently close rear prop to beat a forward prop. | Interaction now requires a 70° forward cone and line of sight when facing exists. Completion/interruption restores logical/render facing and clears stale movement input. | **Implemented; PC verification pending** |
| PC-04 | O2 generator/monitor repair would not start even after `give all`. | The old `give all` granted resources without valid ship assembly state; repeated O2 attempts produced only generic error audio. | Debug grant now installs valid module/socket records and reports eligibility. The tree reflects assembly readiness, repair returns a boolean, and every result logs a structured reason, costs, balances, levels, and assembly/bypass state. | **Implemented; PC verification pending** |
| PC-05 | Recent logs do not explain these failures precisely enough. | The captured depenetration and O2 records lacked causes. | Route/build identifiers, blocker-source depenetration data, debug-grant assembly state, and O2 result telemetry are now present. Interaction target telemetry remains a useful follow-up if packaged behavior disagrees with the new deterministic tests. | **Materially improved** |

## Fix definition

### PC-01 — replace the cramped Sector 0 footprint

Treat the crash site as a predefined set, not a decorated procedural room.

1. Author build version 3 inside the 49×49 origin capacity, retaining the
   dedicated approach chunk and centered shared socket. Replace the old 17×16
   chamber with the implemented 29×26 footprint.
2. Give the ship an unobstructed 11×11 maneuver envelope centered on the ship,
   measured after all ship modules and solid props are placed. No partition,
   wall, solid prop, construction socket, or door sweep may intersect it.
3. Keep a minimum five-cell clear path from spawn to the ship console, O2
   generator, salvage bay, and departure door. Door thresholds must remain at
   least three cells wide.
4. Move armory, salvage, repair, and departure functions into authored bays
   around that envelope. Each bay owns a prop manifest with anchor, facing,
   wall-support type, collision footprint, and clearance; random dressing may
   fill only declared optional sockets.
5. Update `src/data/crashSiteBuild.js`, `src/crashSiteBuild.js`, construction
   sockets, first-night recovery positions, and the crash-site tests together.

Acceptance: a collider-footprint test samples the complete authored set and
proves the 11×11 ship envelope and every five-cell route are occupiable. A
packaged third-person walk circles the ship in both directions without one
depenetration.

### PC-02 — make floor, wall, collision, and map agree

1. Add an authored solid-floor apron from the start room through the complete
   departure route. Random `X`, `C`, pit, and fragile-ledge cells are forbidden
   in this protected start-area mask.
2. Do not use the spawn-safe invisible blocker as the visual treatment for a
   nearby void. Every blocked edge needs an authored wall, rail, rubble lip, or
   other visible collision boundary.
3. In third-person, render collision-bearing walls at full height. Restrict
   camera-quadrant wall cutaways to isometric mode, or replace them with a
   camera-only transparency system that never resembles a doorway. Switching
   modes must immediately restore every wall and attached fixture.
4. Generate render instances, collision, minimap occupancy, and navigation
   from one finalized tile manifest. Add an audit that fails when any tile is
   visually open but collision-blocked, or visually closed but occupiable.
5. Preserve doors as the only normal openings through the authored shell;
   destroyed walls must update all four representations atomically.

Acceptance: no pit/hole lies in the protected start mask; every visible opening
in the shell is a live open/destroyed door or destroyed wall; third-person
camera rotation creates no apparent opening; map, render, and collision agree
for every crash-site tile.

### PC-03 — make interaction directional and preserve heading

1. Resolve interaction candidates in two passes: first require a forward cone
   (recommended half-angle 70°) and line of sight, then rank by angle before
   distance. Only use a 360° proximity fallback for an explicit accessibility
   option, never silently.
2. Use the same resolver for the prompt and the E action so the highlighted
   object is always the object activated.
3. Capture logical `facingYaw` when interaction begins. On complete, cancel,
   damage, or supersede, restore that value through `updateFacingYaw`; do not
   derive it from the temporary vignette pose.
4. Suppress movement during alignment, clear stale movement input when the
   vignette ends, and apply new input using the restored camera-relative basis
   on the next frame.
5. Add tests with a close object behind and a farther object ahead, plus a full
   start → turn-to-prop → complete/cancel → walk sequence.

Acceptance: with objects 0.5 units behind and 2.0 units ahead, E selects the
forward object; after every exit path the player walks in the direction shown
by the reticle/body without a corrective key press.

### PC-04 — make O2 repair state truthful and debuggable

1. Keep the current `give all` remediation that inserts valid module records
   into `carryState.installed`, but make it return and log the installed module
   IDs, sockets, assembly-bypass state, and resulting O2 eligibility.
2. Make `getUnifiedNodeState` consult `getShipGoalAssemblyStatus('o2Bubble')`.
   A missing module must display `INSTALL LIFE SUPPORT CORE AT SHIP`, not an
   available purchase card. If repair must occur at the physical generator,
   the tree action should navigate/close toward that generator rather than
   presenting a purchase that will fail.
3. Route both the physical generator button and any tree action through one
   O2 repair command returning a structured result: `ok`, `reason`, effective
   cost, bank balance, module state, bypass state, old level, and new level.
4. Surface the rejection reason in the modal and play error audio once per
   attempt. Never rely on audio as the only feedback.
5. Add an integration test for `give all` → open generator → repair level 0→1,
   and a second test proving a normal player without the module sees an install
   requirement before clicking.

Acceptance: in a clean packaged save, `give all` followed by one O2 repair
attempt succeeds, spends or bypasses the documented cost, sets level 1, shows
the O2 field, and emits one success record. Without debug, the UI and rejection
record identify the same missing prerequisite.

### PC-05 — add evidence-quality telemetry

Add these sampled structured records to the existing session log:

- `start-area-geometry-audit`: build ID/version, protected-mask size, route
  widths, forbidden hazards, and render/collision/map mismatch count.
- `player-blocked` / `depenetrated`: tile coordinate and blocker source
  (`wall`, `door`, `prop`, `ship-module`, `spawn-safe-edge`, or `hole`).
- `interaction-selected`: player position, facing yaw, selected prop ID/type,
  distance, angle, line-of-sight result, and candidate count.
- `interaction-ended`: reason, initial yaw, vignette yaw, restored yaw, and
  cleared-input state.
- `o2-repair-result`: success/reason, level transition, effective cost,
  balances, installed module IDs, and QA bypass state.

## Required validation pass

Run this on a newly packaged Windows build whose log identifies commit
`d7dd9b61645b` or a descendant:

1. Start a clean campaign in third-person and circle the ship clockwise and
   counter-clockwise; rotate the camera through 360°.
2. Walk the complete start-room perimeter and departure route. Attempt every
   visible gap. Confirm only the door/destruction paths cross the shell and no
   invisible barrier guards a floor-looking tile.
3. Put two searchable props on opposite sides of the player and verify prompt,
   E selection, animation, restored heading, and next movement direction.
4. On a normal save, verify O2 clearly names the missing module. Then run
   `give all`, repair O2 once, and verify level 1 and the visible field.
5. Export the session and require: zero crash-site depenetrations, zero
   start-area geometry mismatches, directional interaction records for every E
   press, and a successful `o2-repair-result`.

Automated validation for this implementation: 767 test files / 6,543 tests,
scoped ESLint, production build, and build-media audit all pass. Until the PC
pass exists, source implementation is complete but packaged-runtime closure is
still pending.

## Follow-up PC session — 16:30 build `93e98d3c3fa8`

The latest Windows session ran from 16:30:48 to 16:36:57 on the clean
`dev/sprint-53` build. It travelled 318 m, collected ten pickups, never brought
O2 online, and died to a pit at `(48.44, 47.97)`. Four crash-site
depenetrations were retained. Three came from the same dynamic collider around
tile `(4,16)` and one came from a dynamic collider around `(7,4)`.

This exposed two remaining authored-flow problems:

- The first north approach hub was at local `(9,9)`, 39 cells beyond the
  origin boundary. The first concrete room and useful encounter therefore did
  not read as “just beyond” the opening hallway.
- Returning profiles bypass the phase-gated Sector Zero crawler. They had no
  deterministic enemy in the opening route and depended on distant procedural
  population.

The follow-up implementation increments the crash build to version 4 and:

- moves the approach hub to local `(9,39)`, nine cells past the shared door;
- stamps the same connected 13×11 staging room for every approach variant;
- places one health, ammo, weapon, and currency pickup in that room;
- places one deterministic low-tier enemy there for returning profiles while
  preserving the protected fresh-player tutorial;
- expands the impact-cradle room and declares the ship O2 offset as part of
  that authored room;
- moves the first-night berth/O2 fixture from rounded tile `(4,16)` to `(3,15)`
  and migrates untouched existing shell records off the logged collision tile;
- validates all named origin rooms, the ship O2 point, the approach encounter,
  and every approach supply with flood-fill connectivity tests.

A new packaged Windows session is still required to close the runtime check:
the expected evidence is a short door-to-staging-room walk, all four supply
families visible, one nearby enemy on a returning profile, and no
depenetration at `(4,16)`.
