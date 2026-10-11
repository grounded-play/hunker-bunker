# Hunker Bunker world-design doctrine — 2026-10-10

**Status:** central design document

**Scope:** world structure, level composition, room shape, pacing, landmarks, spatial storytelling,
lighting intent, and review criteria only

**Out of scope for this pass:** code, model cutting, animation implementation, new asset generation,
texture baking, balance changes, and production scheduling

This document is the shared design target for the next world pass. The earlier
[`world-floor-decals-layout-expansion-2026-10-10.md`](world-floor-decals-layout-expansion-2026-10-10.md)
remains the supporting art-intake plan; where the two overlap, this spatial doctrine decides
what should be built and the intake plan decides how art reaches runtime.
The companion
[`n64-architectural-level-design-overhaul-2026-10-10.md`](n64-architectural-level-design-overhaul-2026-10-10.md)
is the architectural reference, chunk-world diagnosis, and live lane index.

## North star

The bunker should feel like a vast, damaged place that people built, occupied, repaired,
worshipped in, fought through, and lost control of—not a set of rectangular gameplay trays
covered with expensive props.

Every important space must be memorable as a navigable idea:

> One primary purpose, one dominant silhouette, one primary spatial verb, one visible promise,
> one meaningful state change.

The goal is not to imitate Nintendo 64 graphics or copy any classic layout. The useful lesson
from the best N64 games is that limited geometry forced strong composition. A room was a
mountain, ship, tree, cistern, temple mechanism, factory floor, or character—not a neutral box
waiting for decoration.

## Why the current world feels sterile and blocky

### Geometry begins as a rectangle

All 12 original authored builds use `rectRoomPattern(width, height, obstructions)`. It fills a
complete rectangle and can only add rectangular wall islands. Three rooms—`power_puzzle`,
`trap_vault`, and `reward_cache`—have no internal obstruction at all. The cathedral builds remain
rectilinear cell fields assembled from rectangular stamps; some chamfer corners or add divider
walls, but they do not encode height and most retain box-dominant massing.

This makes blockiness a topology problem before textures, lighting, props, or decals are loaded.

### The procedural grammar changes area more than silhouette

Current profiles vary rectangular block sets inside a rectangular border. A fixed perimeter
circulation rule tends to produce the same donut: outer wall, clear ring, central island.
That is a useful archetype, but it cannot be the identity of nearly every machine room.

### Dressing is evenly probable rather than purposefully composed

The system visits wall-adjacent cells and independently rolls for props, clutter, decals, and
corners. Open-floor vignettes and extra decal clusters are similarly selected from generic
candidates. The common result is an encrusted perimeter, isolated floor speckles, and no causal
relationship between the room's hero interaction and its supporting objects.

### Function is subordinate to biome

Medical, armory, radar, and reactor rooms frequently share the same dominant floor and wall
language. A player sees “bio room” before “triage room.” The newer bespoke floors distinguish
families, but high-frequency material across the entire footprint competes with props and routes.

### Lighting identifies colour, not drama

Repeated green practicals communicate “interactive/biological” but rarely stage an arrival,
reveal a purpose, separate foreground from background, or show what changed. Equal illumination
is another form of sterility.

### The review camera rewards coverage

An isometric dollhouse capture proves that assets exist; it does not prove that the actual game
camera gets a strong threshold reveal, understands a route, or sees a distant promise. The new
review standard is the default isometric gameplay camera first, with third-person/player-height
views used as supplementary scale and sightline checks.

## What we take from landmark N64 design

| Precedent | Useful principle | Hunker Bunker translation |
| --- | --- | --- |
| *Ocarina of Time* | Dungeons progress from room puzzles toward whole-dungeon mechanisms; a room greets the player with authored impact. | A major sector revolves around one changing machine or physical state, and each room is a variation on that spatial verb. |
| *Ocarina of Time* | Body-scaled rooms, staged camera reveals, visible future destinations, and shortcuts make complex spaces readable. | Size from player movement first; frame the objective early; revisit the landmark from a new angle; open a return path. |
| *Majora's Mask* | Comparative observation: a compact hub becomes alive through schedules, changed context, and repeated visits. | Reuse a smaller number of distinctive hubs in different operational states instead of continuously adding undifferentiated rooms. |
| *Super Mario 64* | Compact diorama-like spaces support several goals because moving through them is intrinsically legible and enjoyable. | A room's route and visual contour must work in greybox; reuse it for repair, defense, retrieval, or escape without redressing the same box. |
| *Banjo-Kazooie* | Theme affects landmark, movement, inhabitants, sound, and tasks; giant mechanisms can function like characters. | A sector theme changes traversal and behavior, not only its material palette. Give each sector one machine-character with a silhouette and state. |
| *GoldenEye 007* | Interesting, plausible architecture was sometimes made before objectives, producing alternate routes and rooms with no direct gameplay purpose. | Carve plausible nonobjective volume from the existing footprint: observation booths, bypasses, lockers, overlooks, and machinery voids. Then layer objectives across the place. |
| *Perfect Dark* | The same mission space supports deeper objectives and gadgets, but unclear objectives can become frustrating. | Layer optional interactions into reusable rooms while making every actionable station visually distinct and causally connected. |
| *Mario Kart 64* | Height, undulation, occlusion, and moving backgrounds break flat repetition; spaces large only for size were cut. | Use visual height, overhead machinery, and changing sightlines now; treat traversable ramps, pits, and half-levels as a future vertical-room capability. Reject empty acreage and disorienting complexity. |

These principles are supported by Nintendo's developer discussions of [Ocarina's dungeon
“hospitality” and cumulative experience](https://iwataasks.nintendo.com/interviews/3ds/zelda-ocarina-of-time/2/5/),
[location-based real-time staging](https://iwataasks.nintendo.com/interviews/3ds/zelda-ocarina-of-time/1/5/),
and [camera work used to explain spatial situations](https://iwataasks.nintendo.com/interviews/3ds/how-nintendo-3ds-made/4/9/).
GoldenEye director Martin Hollis described both its Mario-inspired mission variety and the
freedom created by building interesting, partially nonessential architecture before filling it
with objectives in his [development retrospective](https://www.mi6-hq.com/sections/articles/gaming_ge64_making_of).

## World-scale structure

### The bunker is a chain of memorable districts, not a uniform maze

Use six district identities as a spatial overlay on the current origin-plus-five-ring progression.
They do not replace ring goals, reservations, blockers, or recurring camps/hives until a separate
topology migration is approved. Districts may overlap a ring; their names are working names and
their spatial roles are design targets:

1. **Broken Spine — arrival and orientation.** Crashed infrastructure, long axial sightlines,
   exposed exterior wounds, and the first safe shortcut back to the ship.
2. **Lived-In Hold — human survival.** Compressed habitable pockets inside larger machinery,
   improvised warmth, laundry, food, sleep, sanitation, memorials, and guarded thresholds.
3. **Pressure Works — industrial operation.** Pumps, vents, fabrication, radar, conduits, bore
   machinery, and loud process lines arranged around service loops.
4. **Cryo Wound — frozen extraction.** Sloped-looking ice, half-buried equipment, visual shafts,
   melt channels, visibility blocked by vapor, and rooms transformed by thaw/freeze state.
5. **Wet Hive — biological occupation.** Soft boundary intrusions, asymmetric growth, wet
   basins, breathing apertures, nested chambers, and routes that constrict or open like tissue.
6. **Machine Cathedral — ideology and command.** Long processional axes, side chapels/work
   bays, towering mechanisms, controlled darkness, and a strong apse or reliquary destination.

At full maturity each district should provide:

- one macro landmark visible from at least two spaces;
- one world-character or anchor—a machine, organism, communal hearth, memorial, aperture, or
  inhabited routine—with a nameable purpose and visible state;
- one hub that changes after branch completion;
- one main loop and one earned shortcut;
- a small family of hero rooms with different route archetypes;
- cross-district vistas or physical overlaps; every direction needs its own readable reveal even
  when one connection serves both districts;
- one quiet inhabited room and one threatening threshold;
- a unique silhouette and sensory signature even with materials disabled.

### District overlay and current-room crosswalk

This assignment is a design lens, not a progression rewrite. Existing room IDs, reservations,
biome selection, portal sockets, and ring roles remain authoritative. Uneven counts expose gaps in
the current catalog; they are not permission to add rooms before the proof pass.

| Spatial identity overlay | Current rooms | Relationship to existing topology |
| --- | --- | --- |
| Broken Spine | `ring_crossing_landmark`, `trap_vault`, `reward_cache` | Changing crossing/hub plus hostile and reward thresholds; can recur where the ring manifest already reserves crossings. |
| Lived-In Hold | `medical_triage`, `field_fabricator`, `armory_cage`, `room_stasis_bunk_sepulcher` | Safe or defended human-use pockets embedded across rings rather than one contiguous biome. |
| Pressure Works | `o2_scrubber`, `hull_fabrication_bay`, `reactor_vent_station`, `reactor_compressor_hall`, `radar_alignment_post` | Industrial role family that can occupy existing active reservations across multiple rings. |
| Cryo Wound | `power_puzzle`, `room_subdeck_cryo_exchanger`, `room_quarantine_airlock_threshold` | Frozen-state identity layered onto compatible biome/reservation slots; no traversable height implied. |
| Wet Hive | `room_xenobiotic_incubation_cloister`, `room_cyber_surgical_fabrication_ward` | Biological incursion that may cross ring boundaries and recur through existing hive logic. |
| Machine Cathedral | `room_biomech_machine_nave`, `room_corpospace_executive_crypt`, `room_deep_space_astrogation_apse` | Rare destination/command identity attached to existing major-room reservations. |

### World rhythm

Use this sequence as a rhythm, not a mandatory linear formula:

```text
safe orientation
  -> compressed connector
  -> partial landmark glimpse
  -> inhabited or functional room
  -> route choice / side loop
  -> danger or system complication
  -> landmark room and state change
  -> shortcut / quiet release
  -> changed hub
```

No more than two ordinary connectors should occur without one of the following: a vista, route
choice, height change, inhabitation beat, mechanical event, or strong environmental question.

This sequence is a palette, not a checklist. Each hero room should omit, invert, or recombine at
least one beat, and neighboring rooms may not use the same reveal and route archetype.

### Hub rule

A hub earns repetition only by changing. A district or sector milestone should alter one primary
spatial/gameplay channel plus one confirming sensory channel. Reserve three-channel changes for
major hubs and sector milestones. Minor interactions need one clear local response. A hub that
does not change is a corridor intersection and should be smaller.

## Spatial shape lexicon

Rectangles remain valid for deliberately utilitarian support spaces. Hero and major rooms draw
from the following footprint vocabulary:

| Shape | Read | Best use |
| --- | --- | --- |
| Offset L | destination hidden around a pivot | reveal rooms, command posts, medical intake |
| T chamber | strong choice with visible rejoin | security, puzzle, defense |
| Hourglass | compression into a dramatic release | quarantine, gates, ritual thresholds |
| Offset twin chamber | two functions in tension | clean/dirty, surgery/fabrication, sleep/service |
| Broken ring | circulation around a hero with an interrupted side | reactor, O2, hive basin |
| Stepped crescent | organic enclosure without a full ring | nest, memorial, fungal nursery |
| Processional nave | long promise with side pockets | machine cathedral, radar, boss approach |
| Fork and rejoin | readable route choice | combat, stealth, hazard bypass |
| Stacked pit | landmark appears below, with a suggested upper route | drill, exchanger, salvage; traversable tiers require a vertical-room contract |
| Apse and forecourt | focus framed by a wider staging area | reliquary, reward, terminal climax |

On the cardinal grid, curves and diagonals read through two-to-five-cell steps, angled props,
beveled facade modules, inset corners, overhangs, and floor borders. Do not solve diagonal
silhouette solely by placing debris against an unchanged square wall.

### Wall and ceiling rules

- A non-support room may not present the same uninterrupted wall treatment for more than about
  six cells without a recess, projection, opening, column rhythm, material break, or vertical
  event.
- Every hero room has a distinctive envelope. Symmetry is valid when it expresses ceremony,
  ideology, security, or industrial order, provided local damage, use, or state prevents sterile
  repetition.
- Ceilings participate in composition: low-looking at approach, framed above the reveal, tallest
  at the landmark, then compressed again at exit. Foreground ceiling masses must preserve the
  isometric cutaway and player aim lane.
- Use three height bands: low service/cover, human work band, and tall landmark/gantry band.
- Background machinery crosses views or moves beyond reach, making the room feel embedded in a
  larger facility.

## Room anatomy

Every major room brief answers these questions before props are selected:

1. **Purpose and inhabitant:** Who built it? Who used it last? What task happened every shift?
2. **One-sentence fantasy:** “The half-frozen bore hall where the old drill still bucks against
   the ice.”
3. **Primary landmark:** What silhouette is identifiable at the threshold?
4. **Spatial verb:** Circle, descend, cross, align, vent, separate, climb, purge, or defend.
5. **Entry compression:** What blocks the complete view?
6. **First reveal:** Where is the authored three-second read?
7. **Visible promise:** What destination, sealed route, bridge, or mechanism is shown before it
   is reached?
8. **Route:** Direct spine, optional loop, risky bypass, and/or earned shortcut.
9. **Height treatment:** Visual massing now—a catwalk silhouette, overlook, ceiling event, or
   visible lower layer. Traversable ramps, pits, and stacked routes require a vertical-room contract.
10. **State delta:** What changes after use or on revisit?
11. **Behavior pockets:** Where do work, rest, storage, cleanup, and improvisation leave evidence?
12. **Sensory signature:** One dominant motion, one local sound, one light gradient, one material
    contrast.
13. **Quiet zone:** Where can the eye and player rest?

### Composition ratio

- **60% navigation and quiet support:** readable floor, structural rhythm, negative space.
- **30% functional cluster:** hero mechanism plus two to four supporting objects.
- **10% story accent:** one dense narrative pocket, damage event, shrine, or optional reward.

The percentage describes visual attention, not literal polygon area.
The 60/30/10 split, quiet-floor range, approximate wall rhythm, and route-clearance targets in
this document are initial Hunker Bunker heuristics, not measurements derived from the cited games.
They are review prompts until playtests produce project-specific thresholds.

### Route archetypes

Every compact room chooses one; every major room combines two:

- **Processional:** landmark framed from entry; approach changes scale or risk.
- **Hero loop:** circulate around one dominant machine, seeing different functions on each side.
- **Fork and rejoin:** safer/slower versus riskier/richer path with a visible reconnection.
- **Reveal pivot:** the goal is hidden at entry and exposed by one deliberate turn.
- **Descent and return:** objective below; return at a new height or through a shortcut.
- **Threshold trial:** the room is the boundary between incompatible states.

### Plausible nonobjective volume

As a starting project heuristic, let roughly 15–25% of a major room's *perceived architecture*
serve plausible but non-mandatory purposes: an observation booth, maintenance crawl, unused locker
bay, inaccessible machinery void, worker alcove, or overlook. Carve it from the planned footprint;
do not mandate extra traversable dead-end floor. It makes architecture feel built for a world
rather than only for the player's objective. An authored dead end should pay with a story,
resource, view, tactical position, or sensory beat.

## Landmark, prop, and story hierarchy

### Three-shape composition

Every room uses:

1. one dominant mass or hero silhouette;
2. one supporting mass that explains or opposes it;
3. one small story cluster that humanizes or complicates it.

Do not distribute five equally weighted props across a rectangle. Supporting pieces must form a
causal sentence: tank -> hose -> pump -> drain; bed -> monitor -> cart -> cleanup stain; drill ->
winch -> core rack -> cuttings fan.

### Resident-first dressing

For inhabited rooms, write the resident or crew behavior before furnishing:

- where they enter and remove gear;
- how they reach the machine;
- where tools are kept;
- where waste, water, heat, food, and sleep occur;
- what broke and how they improvised around it;
- what route they defend or avoid.

Place wear, cables, chairs, containers, stains, notes, and repairs along that behavior. Random
detail can vary the cluster, but it may not invent the cluster's meaning.

### Density islands

Cluster detail into two or three authored islands separated by quiet navigation bands. The floor
does not need evidence everywhere. Empty space is what allows a hero prop, animated door, water
surface, or distant light to matter.

## Reveal, occlusion, and camera intent

### Reveal archetypes

**Compress -> reveal -> inhabit -> release** is one strong archetype, not the default for every
room:

1. Enter through a narrow, bent, low, fogged, or partially blocked threshold.
2. Glimpse light, motion, sound, or silhouette before seeing the full room.
3. Reveal the landmark from a framed point with a readable route.
4. Descend or move closer into the human work layer.
5. Re-see the landmark from another side or height after interaction.
6. Leave through a shortcut or calmer release path.

Alternatives include immediate full disclosure for safe civic rooms, a processional approach with
a continuously visible landmark, and a reverse reveal during escape. Neighboring hero rooms should
not repeat the same reveal pattern.

Occlusion must be informative. A wall, column, vapor curtain, machine, or visual height change
hides part of the answer while revealing a cue. Strong authored cues—a unique light, framed curve,
or conspicuous opening—must pay off. Ordinary architecture may terminate in atmosphere, evidence,
or a view without pretending to be an objective.

### Three-second threshold test

Within roughly three seconds of entering a major room, the player should understand:

- what the room principally does;
- where the dominant landmark is;
- where the first safe route begins;
- whether the room is safe, active, broken, or hostile;
- what remains mysterious.

## Lighting and atmosphere as spatial information

- **Threshold cue:** a restrained edge, spill, or silhouette separating connector from room.
- **Hero key:** the brightest local contrast belongs to the interaction or its consequence.
- **Background depth:** lower-value moving machinery, windows, shafts, or haze extend the world.
- **State colour:** local to the machine—dormant amber, operable cyan/white, hazardous red,
  biological green. Biome colour is secondary.
- **Darkness has shape:** use darkness to hide secondary detail and reveal silhouettes, not to
  make the route unreadable.
- **One dominant motion:** drill, fan, fluid, pod, hanging light, curtain, or breathing wall.
  Smaller ambient motions support it. If everything moves, nothing feels alive.
- **Sound pulls before light confirms:** a pump, breath, chain, water drip, or electrical rhythm
  can announce the next space around a bend.

## Surface doctrine

Surfaces support topology; they do not replace it.

- As a starting target, keep 35–50% of walkable floor outside dressing and high-contrast surface
  masks. Record the measured plan-data percentage, then let art review judge whether it *reads*
  quiet; do not mix the two into one opaque score.
- Use a lower-frequency traversal field on the main route.
- Put wear, frost, resin, oil, cuttings, footprints, and cleaning marks around a physical cause.
- Reserve the most detailed/high-contrast floor treatment for one story pocket or hazard.
- Let boundaries describe state: clean/dirty, dry/wet, warm/frozen, human/hive, powered/dead.
- A room must remain recognizable with all textures replaced by grey values.

## The original 20-room redesign briefs

The live catalog now contains 26 builds: these 20 established rooms plus six N64 signature
blueprint prototypes in `src/data/n64RoomBlueprints.js`. The six prototypes expand the comparison
set; they do not bypass P0 gameplay-camera approval or establish traversable verticality.

| Room | New spatial identity | Route and reveal | Landmark/state change |
| --- | --- | --- | --- |
| `medical_triage` | offset clean/dirty U, not open rectangle | pivot past intake screen into treatment bay; return by supply side | triage cradle; light/monitor/door and contamination boundary change |
| `armory_cage` | T-shaped cage and inspection lane | view locked cache early; flank via two unequal aisles | cage/locker wall opens; task light and security state change |
| `o2_scrubber` | broken ring around breathing tower | circle intake and exhaust sides; shortcut through service hatch | scrubber visibly spins/breathes; vapor, sound, air clarity change |
| `field_fabricator` | offset workshop with loading notch | compressed material intake opens onto work cell | fabricator cycle; tray, light, sound, and output state change |
| `power_puzzle` | three-lobed relay chamber | teach one relay, fork to two others, rejoin at control | central bus illuminates progressively and opens visible route |
| `trap_vault` | hourglass threshold into false forecourt | safe observation, risky direct line, hidden bypass | trap geometry telegraphs, fires, then exposes reward route |
| `reward_cache` | compact apse and antechamber | conceal cache until one turn; one optional lore alcove | container/hatch opens and changes the room's only bright light |
| `ring_crossing_landmark` | gatehouse forecourt, not four-way box | compressed gate vestibule opens to fork around landmark | ring mechanism aligns; bridge/door and district vista change |
| `reactor_vent_station` | tall-looking vent throat with service crescent | show exhaust above; flat route wraps to valve beneath a false upper edge | valve rotates; plume, fan, red/white light, and safe-route cue change |
| `hull_fabrication_bay` | long shop floor with asymmetric gantry silhouette | central clear process line plus flat inspection side beneath visual gantry | press/drill operates; work light, sparks, carriage position change |
| `radar_alignment_post` | processional sightline into dish court | dish visible early; control reached through offset calibration bays | dish turns toward sky/sector; sweep light and distant response change |
| `reactor_compressor_hall` | one dominant compressor island, not block forest | service loop plus risky hot-side bypass | piston/compressor cycle, pressure lights, steam barriers change |
| `room_biomech_machine_nave` | quiet nave, side chapels, bright apse | long promise with optional side pockets and a fixed cross-cut | machine-saint/lectern wakes; ribs pulse and the cross-cut is newly emphasized |
| `room_corpospace_executive_crypt` | reliquary apse with visually sunken forecourt | flat route circles central tomb and returns along a raised-looking side | reliquary unfolds; inscriptions/light and guardian state change |
| `room_xenobiotic_incubation_cloister` | wet contained court inside dry broken ring | dry perimeter loop versus short hazardous crossing | incubation basin drains/fills; pods, bubbles, access change |
| `room_subdeck_cryo_exchanger` | offset service loop with dark failure bay | manifolds read across room; vapor hides shortcut until purge | exchanger spins; frost, coolant, vapor and lighting recede |
| `room_cyber_surgical_fabrication_ward` | offset twin chambers: care versus manufacture | central threshold reveals incompatible bays, later joins them | surgical/fabrication mode changes beds, arms, lights, access |
| `room_deep_space_astrogation_apse` | stepped command amphitheater | rise through stations toward framed celestial instrument | array aligns; projection, shutters, audio and destination cue change |
| `room_stasis_bunk_sepulcher` | pod rows around a calm inspection spine | glimpsed failed pod pulls player to side loop; exit through service end | selected pods open/fail; frost, vapor and occupancy silhouette change |
| `room_quarantine_airlock_threshold` | strict two-stage hourglass | dirty staging -> occluded purge cell -> clean reveal | seals close/open; mist, drains, colour and route switch state |

### Capability classification

The briefs above describe the desired experience, not assumed runtime support. A
`requires topology mutation` state must remain a presentation change until that separate
capability is designed and approved. Every room needs a flat-navigable fallback; visual height may
never be used to imply a reachable route that the current room contract cannot provide.

| Room(s) | Current design capability | Boundary |
| --- | --- | --- |
| `medical_triage`, `armory_cage`, `o2_scrubber`, `field_fabricator`, `hull_fabrication_bay`, `radar_alignment_post`, `reactor_compressor_hall`, `room_corpospace_executive_crypt`, `room_deep_space_astrogation_apse`, `room_stasis_bunk_sepulcher` | requires prop interaction | Motion/light/audio/presentation may confirm use; geometry and route remain fixed. |
| `power_puzzle`, `trap_vault` | existing progression gate plus prop interaction | Preserve current sockets and gate semantics; stage feedback around them. |
| `room_quarantine_airlock_threshold` | presentation-only airlock plus prop interaction | Exterior doors are distance-driven, not mutually interlocked; authored plume zones are metadata today. Keep the route fixed and do not claim a damaging/disabled purge cycle until runtime state is wired. |
| `reward_cache` | presentation-only plus prop interaction | One local opening and response; no world-state burden. |
| `ring_crossing_landmark` | existing progression gate; topology mutation only after detached proof | First prove the fixture away from live portal/reservation logic. |
| `reactor_vent_station`, `room_biomech_machine_nave`, `room_xenobiotic_incubation_cloister`, `room_cyber_surgical_fabrication_ward` | requires prop interaction; proposed access change requires topology mutation | Flat route stays legal before and after interaction unless mutation support is separately approved. |
| `room_subdeck_cryo_exchanger` | requires prop interaction; traversable height/shortcut requires vertical-room contract and topology mutation | Initial proof uses a flat offset loop, visual depth, vapor, and hazard readability only. |

## Proof set and review order

### P0A — prove flat single-chunk grammar

Redesign three rooms in greybox only:

1. `medical_triage` — small safe room, clean/dirty hierarchy, reveal pivot.
2. `reactor_compressor_hall` — industrial loop around a machine-character.
3. `room_biomech_machine_nave` — long processional composition and side pockets.

These prove compact/large, safe/hostile, active/bio, and reveal/loop/processional archetypes
without making portal integration or unsupported height block the shape doctrine.

### P0B — prove integration boundaries

4. `ring_crossing_landmark` — prove the four-socket fixture detached from live progression, then
   validate it against current portal and reservation contracts before integration.
5. `room_subdeck_cryo_exchanger` — use a flat offset service loop, visual height, vapor occlusion,
   and a hazard bypass. Traversable descent/return is a later vertical-room-contract proof, not an
   acceptance gate for this pass.

### Active implementation lane — Lane A

**Owner:** Codex/root, claimed 2026-10-10

**Scope:** flat authored-room greyboxes; no vertical-contract or progression migration

**Current proof set:** `medical_triage`, `reactor_compressor_hall`,
`room_biomech_machine_nave`

The medical room uses an offset clean/dirty partition, eastward reveal pivot, protected treatment
pocket, supply-side loop, and quiet arrival apron. The compressor hall replaces six equal blocks
with one asymmetric core, a subordinate heat shield, a broad safe service loop, and a shorter
two-cell hazardous bypass. The machine nave preserves a seven-cell processional axis, opens a
cross-cut, and gives its opposing side chapels separate reward and lore purposes.

Hero hierarchy is now authored rather than random. Medical and the nave promote an existing
interaction anchor via `signatureAnchorId`; the compressor declares a separate presentational
`signatureAnchors` hero prop. The population planner respects both forms, so practical light and
review focus stay on the medical bed, compressor drive, or apse lectern instead of an unrelated
theme prop.

Verified so far: catalog validation, all rotations, connector reachability, semantic safe-versus-
hazardous compressor routes, companion-width hot bypass, population, dressing, destruction
handling, and fixed orthographic gameplay-camera/cutaway captures for all four rotations. Those
captures live at `docs/reports/assets/furnished-rooms/p0a-*-game-camera-r*.png`. Live in-campaign
threshold/return views remain open before P0A sign-off. The compressor drive aperture was widened
to three cells after the rotation review showed the original one-cell recess was visually owned by
its walls. Medical beds and Tesla drives now receive the same restrained cyan task-light family as
oxygen/coolant equipment, so authored signature promotion produces a real focal pool.

### P1 — extend proven shapes

`armory_cage`, `o2_scrubber`, `field_fabricator`, `room_quarantine_airlock_threshold`,
`room_cyber_surgical_fabrication_ward`, and `room_stasis_bunk_sepulcher`.

`o2_scrubber` is the first P1 proof because it is a mandatory ship-goal room used across three
tiers and every biome. Its generic centered block is replaced by a thin broken U-ring: the north
approach splits around a stepped scrubber crown, both routes rejoin south of the machine, and the
player turns back into a quiet three-cell control cavity. The east exhaust is hazardous; the west
intake remains the service route. `o2_control` keeps its progression-critical identity and owns the
cyan focal practical. All four rotation/cutaway captures live at
`docs/reports/assets/furnished-rooms/p1-o2_scrubber-game-camera-r*.png`.

`room_stasis_bunk_sepulcher` is the second P1 proof and the intentional release after the nave.
Its offset sleeping comb leaves a completely open three-cell west/east inspection spine. A real
cyan thermal pod, using the existing `chrysalis_pod_console` interaction ID, invites a short
northward inspection without blocking traversal; low flesh-steel cradles replace the tall exosuit
gantries, and survivor supplies plus the final slate form one optional southeast story pocket.
All four rotation/cutaway captures live at
`docs/reports/assets/furnished-rooms/p1-stasis_bunk_sepulcher-game-camera-r*.png`.

`room_quarantine_airlock_threshold` is the third P1 proof. Two offset three-cell sluice openings
replace the open octagon and create a fixed S-shaped crossing: dirty south staging → west override
pocket → central purge gallery → east upper sluice → clean north recovery. The existing exchanger
keeps `airlock_purge_override`, owns an amber task light, and remains outside both traversal gates;
the emergency O₂ rack moves off-axis into the clean bay. Both exterior socket doors stamp in the
two-ended proof, and all four rotation/cutaway captures live at
`docs/reports/assets/furnished-rooms/p1-quarantine_airlock-game-camera-r*.png`.

This is currently architectural/presentational truth, not a simulated pressure cycle. Exterior
doors already open and close by proximity, but they have no mutual-exclusion FSM. The exchanger's
generic interaction reports a bypass, while authored `hazardZones` have no live damage consumer.
Do not describe the plume as damaging or mechanically disabled until that state contract lands.

`armory_cage` is the fourth P1 proof and the reward-focused answer to the three-room
O₂ → stasis → quarantine sequence. A thin T-shaped cage divides the room into two unequal
flanks: the north route is shorter but exposed to the encounter pocket, while the south route is
longer and stays behind cover. The progression-stable `armory_lock` console sits on the west
approach as the compass objective; it no longer steals the focal hierarchy from the prize. The
existing `ammo_crate` interaction is visible beyond the cage and owns the amber signature
practical. Weapon racks reinforce both ends of the barrier without occupying either route. Tests
pin the exact wall pattern, prove both flanks and the east exit reachable, and prove the north
route shorter. All four rotation/cutaway captures live at
`docs/reports/assets/furnished-rooms/p1-armory_cage-game-camera-r*.png`.

This is a fixed architectural reward choice, not yet an opening locker simulation. The ammo crate
retains its existing generic interaction; opening panels, lock-state animation, contents reveal,
and synchronized light/audio feedback remain presentation work and must not alter the two routes.
The next P1 candidate is `field_fabricator`.

### Authored-geometry save policy

`ROOM_BUILD_VERSION` is not currently persisted or compared. `interiorVersion` selects the room-
grammar pilot, `layoutVersion` pins macro geography, and `WORLD_PLAN_VERSION` pins reservations;
none pins the authored pattern catalog. Reloading an older map therefore stamps current patterns
and can reapply coordinate-keyed wall damage, doors, discovery, or suspended actor positions to
different geometry.

Until a dedicated authored-geometry version gate lands, these redesigns are approved only for new
maps/disposable review profiles. A live build with resumable campaigns must persist
`roomBuildVersion` in authored-world and suspend identity, reject missing/mismatched map-local
state, and route the player through `beginNewRun`, which already preserves story/world
transformations while clearing coordinate-local geometry state. Do not repurpose
`interiorVersion` or claim old-map compatibility.

### P2 — complete the authored catalog

Puzzle, trap, cache, radar, vent, hull bay, crypt, cloister, and astrogation rooms. Six signature
blueprint prototypes landed concurrently with this pass; treat them as comparison greyboxes and
do not expand the catalog further until P0A and P0B read in the default gameplay camera.

## Greybox process

For each proof room:

1. Write purpose, inhabitant, one-sentence fantasy, landmark, spatial verb, and state delta.
2. Draw three distinct footprint thumbnails using the shape lexicon.
3. Choose one based on threshold read and route, not prop capacity.
4. Block floor, walls, ceiling mass, visual height bands, and routes only.
5. Play it through the default isometric gameplay camera with no textures or dressing; use one
   supplemental third-person/player-height pass to check scale and long sightlines.
6. Add the hero volume and one supporting mass.
7. Verify reveal, loop/rejoin, quiet space, collision, and return view.
8. Only then assign functional clusters, story pocket, surfaces, lights, sound, motion, and decals.

No “temporary” clutter is allowed during steps 1–7. It hides bad massing.

## Acceptance rubric

### Silhouette and identity

- Identifiable from an untextured overhead silhouette.
- Distinguishable from both neighboring rooms in a blind matched-capture review.
- One dominant mass, one subordinate mass, one story cluster.
- Every non-support room has a distinctive envelope. Symmetry may express ceremony, ideology,
  security, or industrial order when local damage, use, or state prevents sterile repetition.

### Navigation

- Primary landmark and first decision read within about three seconds of entry.
- Main route preserves player collision width plus the combat, camera, and companion-avoidance
  margin established in a room-specific grid translation; no fixed cell count substitutes for it.
- Major rooms provide a loop/fork-and-rejoin, descent-and-return where supported, or a deliberately
  recontextualized return; compact rooms have one clear route archetype.
- A visible promise is paid off.
- Dead ends provide a reward, story, view, tactical position, or sensory beat.
- Shortcut or changed return view recontextualizes the landmark.

### Composition

- The plan-data quiet-floor mask begins near the 35–50% heuristic and is reviewed separately for
  whether the rendered room actually reads quiet.
- No uninterrupted identical wall treatment longer than roughly six cells in a hero room.
- Props form functional causal clusters; no evenly scattered inventory.
- Highest local contrast belongs to the hero or its consequence.
- High-frequency floor material does not cover the whole footprint.

### State and life

- Minor interaction changes one clear local channel. A hero interaction or district milestone
  changes one primary spatial/gameplay channel plus one confirming sensory channel. Three or more
  channels are reserved for major hubs and sector milestones.
- Revisit communicates the change from the threshold.
- One dominant motion and a restrained ambient layer.
- Human occupation is legible through behavior, not generic mess.

### Review captures

Every room review includes:

1. default isometric gameplay camera at the threshold;
2. the framed first reveal in the same camera;
3. side route or visual-height event, including aim-lane and cutaway-occlusion checks;
4. return view after shortcut/state change, or the planned fixed-route equivalent;
5. untextured overhead silhouette;
6. a short recorded threshold clip in which reviewers answer: “What is this room?”, “Where can I
   safely go first?”, “What is the landmark?”, and “What changed?”;
7. optional third-person/player-height sightline and scale check.

A showroom overview or beauty shot alone cannot approve a room. Identity is tested with a blind
matched set of same-camera captures rather than an unrecorded “five-second” assertion.

### Runtime compatibility gates

The doctrine does not override existing gameplay contracts. Before a greybox can graduate:

- preserve portal/socket positions and reservation semantics, or document an approved migration;
- prove two-player/companion clearance through routes, thresholds, cover, and interaction pockets;
- inspect aim lanes and camera cutaway behavior, especially beneath foreground ceiling masses;
- validate encounter spawns, hazards, cover, and retreat space against the revised footprint;
- keep every required anchor reachable before and after permitted destruction/state changes;
- keep persisted interior versions and room IDs stable, or explicitly migrate them;
- compare route time to the prior room so a visual improvement does not silently distort pacing.

## Anti-goals

- Do not copy Zelda dungeon layouts, Banjo worlds, Mario objectives, or GoldenEye facilities.
- Do not pursue retro low-poly nostalgia as the solution.
- Do not add more props to disguise an unchanged rectangular footprint.
- Do not make every room larger, multi-level, or nonlinear.
- Do not force a puzzle into every room.
- Do not use darkness, fog, or visual noise to manufacture mystery without a payoff.
- Do not animate every object or give every landmark the same green glow.
- As an inference from the Water Temple discussion, avoid global-state layouts whose current
  state, differentiated routes, or next consequence cannot be read and recalled.
- Do not generate new texture batches until the P0A/P0B greyboxes prove where visual material is
  actually needed.

## Decisions made in this design pass

1. The next world improvement is a topology and composition pass, not an asset-volume pass.
2. Five existing rooms are the proof set; no new room production precedes their greybox review.
3. Rectangular support rooms stay, but hero rooms use a broader footprint and route vocabulary.
4. Six spatial identities overlay the existing origin-plus-five-ring topology; they are not yet a
   progression migration.
5. Default isometric gameplay-camera reveal/return captures are mandatory; player-height views
   supplement scale and sightline review.
6. Props, decals, light, motion, and sound derive from room purpose and resident behavior.
7. Quiet space, distinctive envelopes, visible promises, varied routes, and changed revisits are
   explicit design requirements.

## Collaborative research record

- **Zelda review:** *Ocarina of Time* and *Majora's Mask*—landmarks, authored reveals,
  body-scale design, compact changed worlds, whole-dungeon mechanisms, and stateful hubs.
- **Comparative N64 review:** *Super Mario 64*, *Banjo-Kazooie/Tooie*, *GoldenEye 007*,
  *Perfect Dark*, and *Mario Kart 64*—diorama reuse, theme totality, plausible architecture,
  layered objectives, vertical rhythm, and ruthless removal of empty scale.
- **Repository review:** current room data, procedural grammar, population, dressing, lighting,
  renderer, plans, and the 20 current furnished-room captures.
- **Synthesis:** translated the shared findings into the six-district world structure, spatial
  lexicon, 20-room briefs, P0 proof set, and acceptance rubric above.

The game-development design guidance materially shaped the deterministic grammar, readable
feedback, and state-change requirements. It does not authorize implementation in this pass.

## Reference shelf

- [Nintendo: Ocarina of Time original development staff—cumulative experience and dungeon impact](https://iwataasks.nintendo.com/interviews/3ds/zelda-ocarina-of-time/2/5/)
- [Nintendo: finding cinematic locations inside playable Hyrule](https://iwataasks.nintendo.com/interviews/3ds/zelda-ocarina-of-time/1/5/)
- [Nintendo: camera techniques used to explain spatial situations](https://iwataasks.nintendo.com/interviews/3ds/how-nintendo-3ds-made/4/9/)
- [Nintendo: Ocarina of Time developer interview hub](https://www.nintendo.com/en-gb/iwata_asks/interview_43214/43214.html)
- [Ocarina of Time dungeon-development interview translation](https://zeldadungeon.net/wiki/Interview:Ocarina_of_Time_Development_-_Dungeons_Part_1)
- [Nintendo Power interview: Ocarina shortcuts and character events](https://zeldadungeon.net/wiki/Interview:Nintendo_Power_November_2008)
- [Nintendo: Majora's Mask 3D developer interview](https://iwataasks.nintendo.com/interviews/3ds/majoras-mask-3d/0/0/)
- [Super Mario 64 developer interview translation](https://daverupert.com/2016/09/super-mario-64-1996-developer-interviews/)
- [GoldenEye director Martin Hollis: development retrospective](https://www.mi6-hq.com/sections/articles/gaming_ge64_making_of)
- [GDC Vault: Classic Postmortem—GoldenEye 007](https://gdcvault.com/play/1016460/Classic-Postmortem-GoldenEye)
- [Rare team: Banjo-Kazooie development retrospective](https://www.nintendolife.com/news/2018/12/feature_20_years_after_the_release_of_banjo-kazooie_we_speak_to_the_guys_who_made_it)
- [Rare team: Banjo-Tooie development and interconnected-world ambitions](https://www.nintendolife.com/news/2021/01/feature_banjo-tooie_turns_20_-_the_rare_team_tells_the_story_of_bombs_bugs_and_bottles)
- [Perfect Dark developer interview](https://www.blastmagazine.com/2010/03/17/interview-perfect-dark-xbla/)
- [Mario Kart 64 developer interview translation](https://shmuplations.com/mariokart64/)
