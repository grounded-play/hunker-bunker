# Whole-Game GLB Census, Coverage Gaps, and New 80-Asset Brief — 2026-10-15

**Document ID:** `HB-AUDIT-2026-10-15-WORLD80-R2`  
**Status:** Phase 1 audit complete; Phase 2 prompts and room activation delivered (section 15)  
**Companion census:** [world-glb-inventory-2026-10-15.tsv](./world-glb-inventory-2026-10-15.tsv)  
**Supersedes for selection purposes:** [interactive-world-expansion-80-glbs-master-plan-2026-10-15.md](./interactive-world-expansion-80-glbs-master-plan-2026-10-15.md)

## 1. Captured owner ask

Before writing another prompt batch:

1. Inventory every current runtime GLB, including image textures, runtime materials, animations, and Hunker Bunker node extras.
2. Review the whole game: room themes/builds, camps, hives, quests, Act 2, endings, placement, interactions, materials, and decals.
3. Identify real gaps. Do not make a second eyewash station, desk, compactor, console, tank, or yesterday's asset under a new name.
4. Treat owner-completed rows 1–13 of the current 80 sheet as spent production work. Evaluate them honestly and improve rows 14–80.
5. After the gap list is accepted, author 80 new 3D prompts plus only the materials and decals needed to support their placements.
6. Design prompt, placement, gameplay/story job, articulation, collision, material, and decal support together.

This document completes the census and gap-analysis phase. It intentionally does **not** contain the final 80 prompts.

## 2. Evidence and scope

Audited current runtime files and definitions:

- `public/**/*.glb`
- `src/world3dOverlay.js`, `modelPresentationRegistry.js`, `roomThemes.js`
- `src/roomDressingKits.js`, `roomPopulation.js`
- `src/propInteractions.js`, `propExperience.js`, `propFx.js`
- `src/data/propSockets.js`, `roomBuilds.js`, `campQuests.js`
- `src/data/missions.js`, `terminalEvents.js`
- the art bible, narrative bible, endings design, and 2026-10-11 through 2026-10-15 asset sets

`dist/`, packaged Electron builds, and `art/raw/` were excluded from the runtime total because they duplicate or precede `public/` assets.

## 3. Authoritative GLB census

| Runtime directory | GLBs | Image-textured | Runtime-material geometry | Reference/collision | Primary purpose |
|---|---:|---:|---:|---:|---|
| `public/3d/runtime/new3ds/` | 483 | 483 | 0 | 0 | World props, characters, enemies, equipment, setpieces |
| `public/3d/runtime/kits/modular-cave-kit/` | 40 | 0 | 40 | Modular cave geometry |
| `public/3d/runtime/kits/modular-space-kit/` | 40 | 0 | 40 | Modular bunker geometry |
| `public/3d/runtime/community/` | 30 | 30 | 0 | Community operator skins |
| `public/3d/runtime/` | 19 | 19 | 0 | Core machines, ships, bosses |
| `public/3d/runtime/secrets/` | 3 | 3 | 0 | Secrets |
| `public/3d/runtime/structures/` | 2 | 0 | 0 | Reference and collision hull |
| `public/3d/scouting-scout/` | 1 | 1 | 0 | Scout character |
| `public/3d/` | 1 | 1 | 0 | Environment reference |
| **Total** | **619** | **537** | **80** | **2** | |

The companion TSV is the complete 619-row list with path, prefix, size, meshes, nodes, materials, images, used texture slots, animations, Hunker Bunker extras, runtime keys, and registry coverage.

### 3.1 Correction: “no embedded image” is not “missing texture”

The previous plan called 82 files untextured. That is misleading:

- The 80 kit GLBs intentionally contain geometry/material slots without image maps. `src/kitMaterials.js` replaces them at runtime.
- The kit system exposes 16 skins: cave, space, cathedral, bunker, biomech, Giger, reliquary, cryo deck, geothermal, hive resin, substation, permafrost, cleanroom, mycelium, obsidian, and toxic sump.
- `public/3d/runtime/kits/textures/` already contains 200 supporting images.
- The two structure files are reference/collision geometry.
- All 483 `new3ds` files contain image textures and used texture slots.

The material gap is **placement-specific state variation**, not rescuing 82 grey models.

### 3.2 Runtime integration

| System | Explicit entries |
|---|---:|
| `WORLD_3D_MODELS` | 485 |
| `WORLD_3D_STRUCTURES` | 1 |
| `PROP_INTERACTION_SPECS` | 197 |
| `PROP_FX_PROFILES` | 319 |
| `PROP_EXPERIENCE_PROFILES` | 189 |
| `PROP_SOCKET_REGISTRY` | 23 |
| Room themes | 26 |
| Authored room builds | 28 |
| Authored anchors | 146 |
| Unique authored anchor types | 34 |
| `new3ds` GLBs with animation clips | 38 |
| `new3ds` GLBs with embedded `hb_*`/FX/socket extras | 28 |

All registered model URLs currently resolve. Of 485 models, 193 have explicit interactions, 315 explicit FX, 189 explicit experience profiles, and 20 registered keys have sockets.

### 3.3 Strongest finding

The game has an **activation and composition gap**, not a simple asset-count gap.

The 28 authored rooms use only 34 unique types across 146 anchors. Repetition centers on supplies, lore terminals, conduit hubs, pipe-organ exchangers, lecterns, cyber junctions, diagnostic consoles, medical beds, lockers, and engineering benches. Hundreds of GLBs sit in broad random pools or non-world cosmetic roles.

A new object has value only when it enters an authored anchor, named vignette, quest state, traversal beat, or interaction chain.

## 4. Existing asset families

| Prefix | Count | Coverage |
|---|---:|---|
| `life_*` | 97 | Daily life, camps, utilities, work areas |
| `prop_*` | 85 | General bunker, medical, biomech, fixtures, machinery |
| `chassis_*` | 23 | Operator bodies |
| `skin_*` | 22 | Weapon/class finishes |
| `mod_*` | 16 | Equipment mods |
| `charm_*` | 16 | Charms |
| `arch_*` | 14 | Cathedral architecture |
| `chasm_*` | 13 | Void traversal and survey |
| `corp_*` | 13 | Corporate punishment, records, executive machinery |
| `hive_*` | 12 | Hive organs and structures |
| `cryo_*` | 10 | Cryo hazards and survival |
| `npc_*` | 10 | Named characters |
| `vesper_*` | 10 | Iron Guild objects |
| `tina_*` | 9 | Mimic/infiltration story |
| `evac_*` | 8 | Escape vessel and launch |
| `meridian_*` | 8 | Power-grid/cyber camp |
| `state_*` | 8 | Damage/overgrowth states |
| `vass_*` | 8 | Acoustic xenobiology |
| `tallow_*` | 7 | Hydroponics and medicine |
| `base_*` | 5 | Base modules |
| `boss_*` | 5 | Bosses/remains |
| `crash_*` | 4 | Crash wreckage |
| `gun_*` | 4 | Weapons |
| `ship_*` | 4 | Recoverable ship modules |
| Other smaller families | 60 | Doors, barriers, aliens, brood identities, scatter, setpieces |

### 4.1 Saturated categories

Do not spend new slots here without a new mechanic and materially different silhouette:

- desks, benches, tables, consoles, terminals, plinths, podiums;
- lockers, chests, crates, racks, cabinets, pallets;
- vats, tanks, pods, cradles, incubators, troughs;
- presses, grinders, compactors, forges, incinerators;
- showers, eyewash/decon stations, chairs, gurneys, autopsy furniture;
- radios, acoustic consoles, tuning devices, beacons;
- junctions, manifolds, pipe fixtures, valves, generators;
- egg sacs, ovipositors, gestation chambers, pheromone organs, spore emitters;
- crash cockpits, nacelles, hull panels, fuel and ejection hardware;
- memorials, shrines, reliquaries, altars, confessionals, votives;
- water stills, cookfires, welding benches, sanitation, bunks, camp storage.

A prettier version is still a duplicate.

## 5. Existing material/decal coverage

- 38 registered floor families produce 156 compressed variants.
- 25 room-theme mappings select those floor families.
- 16 shared kit skins cover walls and floors.
- 200 kit texture images support modular materials.
- Hundreds of current/legacy runtime decal maps support wall, floor, boundary, trail, route-wear, and grounding layers.

Future support art must be placement-specific:

1. threshold apron from repeated operation;
2. contact stain tied to the footprint;
3. service route leading to/from the prop;
4. interaction-state mark: sealed/open, clean/contaminated, powered/burned;
5. narrative residue explaining who used it.

“Another rusty floor,” blood pool, or hazard stencil is not a gap.

## 6. Room and placement audit

### 6.1 What works

- Floor and wall-backed props.
- Structural, signature, interaction, reward, and lore anchors.
- Bunker, cryo, bio, camp, cathedral dressing.
- Role additions for medical, cryo-lab, security, armory, storage, reward, engineering, workshop.
- Deterministic grounding decals and collision-aware vignettes.
- Wall elevation/depth profiles and runtime kit materials.
- Persistent one-shot/repeatable interactions with FX and articulation layers.

### 6.2 Placement gaps

| Weak class | Evidence | Needed |
|---|---|---|
| True ceiling network | One explicit ceiling-mounted model | Ceiling anchors, clearance, hanging collision, endpoints |
| Tabletop sockets | “TABLETOP” exists only in prose | Parent sockets and micro-prop rules |
| Floor recesses | Treated as normal floor props | Cutout stamp, rim decal, navigation mask |
| Threshold mechanisms | Mostly bespoke doors | Door-apron reservation and open-state navigation |
| Wall apertures | Wall props sit in front of walls | Wall substitution/cutout |
| Multi-cell motion | Population is cell-oriented | Swept-volume reservation |
| Carry-to-install | Only folded/installed cot proves pattern | General paired-state/save contract |
| Machinery chains | 23 socket registrations | Inputs/outputs and conduit routing |
| Before/after/destroyed families | A few barriers/doors | Standard state-family swaps |
| Evidence on furniture | No general tabletop grammar | Nonblocking micro-prop layer |

### 6.3 Composition gaps

- quest rooms that change after completion;
- camp rooms reflecting grow, rob, cull, recruit, and turn outcomes;
- hazards controlled by separate source/controller/beneficiary machinery;
- traversal whose moving part changes reachability;
- inspection scenes with focal evidence;
- room-scale infrastructure crossing ceiling, wall, and floor;
- quiet domestic/private spaces;
- boarding spaces reflecting the real ending vector.

## 7. Story gaps

### 7.1 Meridian

Already strong in cyber/power machinery. Missing:

- signed Grid Covenant with ownership-transfer state;
- probe-return cradle rather than another radar;
- source/breaker/beneficiary power chain;
- robbed/recruited/turned infrastructure variants;
- Kaelen's private/social space.

### 7.2 Tallow

Already strong in cultivation/medicine. Missing:

- red-mold quarantine and crop-preservation states;
- lost-cultist rescue endpoint;
- Martha's “warm pipes” return location;
- communal care/food distribution that is not another cookfire;
- recruited/turned hydroponic states.

### 7.3 Vesper

Already strong in weapons and punishment. Missing:

- inspectable, stateful Iron Ledger;
- defense-grid command and post-holdout damage;
- surrender/disarm/recruit staging;
- robbed-armory evidence;
- Briggs's private maintenance ritual.

### 7.4 Alien relationships

Nahl/Suture, Vey/Relay, and Rhun/Carapace need:

- one three-state covenant object each;
- gift/accept/refuse states;
- one shared-work object each;
- post-reveal trust/rejection evidence;
- mirrored human/alien objects about body ownership.

### 7.5 Corporate, Vass, Tina

These areas are saturated. New work must close plot actions:

- Chen: consequence/evidence chains, not furniture.
- Vass: experiment sequence and translation outcomes, not instruments.
- Tina: contradiction and hidden-route logic, not more anatomy.
- Bay C/Specimen 0047: distributed traceable evidence.
- Sector Zero: cause-and-effect machinery tied to the breach.

### 7.6 Act 2/endings

Missing physical states:

- human embarkation and restraints/storage;
- turned-passenger containment;
- Queen-aboard interface distinct from egg cargo;
- concealed egg coolant storage;
- camp-specific boarding tokens/manifests;
- empty four-seat cockpit for Scorched Sky;
- mixed-crew divider/life-support split;
- launch damage/recovery from camp choices.

## 8. Interaction/articulation audit

A meaningful prop needs:

1. `WORLD_3D_MODELS` registration.
2. Stable type and save/scatter key.
3. `PROP_INTERACTION_SPECS` prompt, repeatability, outcome, sound.
4. `PROP_EXPERIENCE_PROFILES` response/articulation.
5. `PROP_FX_PROFILES` powered/liquid/thermal/organic feedback.
6. Optional cable/pipe/trachea sockets.
7. Named nodes/extras such as `HB_DOOR_00`, `HB_LID_00`, `HB_ROTOR_00`, `FX_LIGHT_00`, `INTERACTION_00`.
8. Persistent state and collision changes when needed.

Current experience behavior is skewed: `use` and `damage` appear 179 times each; ambient 45, inspect 5, pickup 2, carry 1, sleep-anchor 1, structural 4.

The next set should broaden verbs: connect, disconnect, carry, install, remove, calibrate, route, brace, release, shelter, board, clean, contaminate, sample, preserve, sign, witness, refuse, repair, sacrifice one system to another, and reveal a route.

Every future row must specify nearest existing assets, story beat, verb, room/build, placement class, footprint, swept volume, states, persistence, collision, nodes/extras, FX, sockets, material/decal support, and acceptance test.

## 9. Current 80 proposal audit

### 9.1 Owner-completed rows 1–13

No GLBs with the new names are in `public/` yet, so these are completed source-art work awaiting ingest.

| Row | Asset | Audit |
|---:|---|---|
| 1 | Chen desk | Redundant unless it becomes a unique confession/ledger state |
| 2 | Shredder furnace | Direct overlap: `corp_incinerator_hopper` and `corp_asset_incinerator_chute` |
| 3 | Bullion trunk | Viable evidence cache for Chen's escape financing |
| 4 | Decanter caddy | Distinct small evidence; needs tabletop grammar |
| 5 | Hologram plinth | Overlaps ledger podium, route table, planning board, consoles |
| 6 | Shock gate | Viable navigation-changing threshold |
| 7 | Capsule chute | Overlaps `life_pneumatic_tube_node` and corporate chutes |
| 8 | Bodyguard rack | Overlaps lockers, mask racks, equipment benches |
| 9 | Acid skimmer | Viable only as moving sump-state cleanup |
| 10 | Neutralizer vat | Saturated tank/vat family |
| 11 | Macerator pump | Overlaps `ind_biomass_grinder` and drainage machinery |
| 12 | Eyewash | Direct duplicate: `prop_decon_eyewash_shower_station` |
| 13 | Barrel crusher | Overlaps grinders, chitin press, forges |

Keep completed art as references/state components where useful; do not spend new generation slots reproducing the same function.

### 9.2 Rows 14–80 before rewriting

| Rows | Ideas | Verdict | Direction |
|---:|---|---|---|
| 14–16 | Spill barrier, siphon, rinse booth | REWORK, REWORK, REPLACE | Threshold baffle; connectable hose; decon already saturated |
| 17–24 | Vass lab suite | KEEP 19 only; replace rest | Microtome has a distinct sampling verb; all others overlap shipped Vass/medical/acoustic assets |
| 25–32 | Tina suite | REWORK 28/32; replace rest | Identity archive and wall-substitution shortcut; mimic hardware is saturated |
| 33–40 | Royal/hive suite | REWORK 37/39; replace rest | Room-length hazard channel and consequential alliance interface |
| 41–48 | Cryo suite | KEEP 45; REWORK 41; replace rest | Breakable route states and archival morgue wall |
| 49–56 | Geothermal suite | KEEP 49/51/52; REWORK 50/53/55 | Macro turbine, floor brace, wall aperture; make remaining ideas network/state driven |
| 57–64 | Crash suite | KEEP 63/64; REWORK 59; replace rest | Tactical illumination, traversal cutter, recoverable black-box evidence |
| 65–72 | Gantry suite | KEEP 68; REWORK 70; replace rest | Flame-threshold hazard and actual lift transition |
| 73–80 | Camp suite | KEEP 73/77; replace rest | Barter mechanic and private domestic space |

Across rows 14–80: 10 strong keeps, 12 substantial reworks, 45 replacements. Polishing the old prose would still make more of the same.

## 10. Gap-first envelope for the eventual 80

This is a capacity plan, not the final manifest.

| Suite | Slots | Purpose |
|---|---:|---|
| Camp consequence state modules | 12 | Four per camp: grown, robbed, recruited, turned/cull aftermath |
| Named camp-quest anchors | 12 | One destination/completion object per quest |
| Act 2 boarding and five-ending states | 10 | Passengers, Queen, eggs, manifest, mixed crew, empty cockpit |
| Traversal-changing mechanisms | 8 | Gates, bridges, braces, lifts, cutters, flood/pressure barriers |
| Before/after/destroyed state families | 8 | Designed as state sets |
| Networked hazard controllers | 8 | Source/controller/beneficiary with sockets |
| Authored room-scale setpieces | 8 | Multi-cell macro silhouettes |
| Small evidence/tabletop objects | 6 | Covenants, black boxes, samples, personal evidence |
| Ceiling/overhead network | 4 | True ceiling grammar |
| Secret apertures/reveals | 4 | Wall substitution and hidden routes |
| **Total** | **80** | |

Existing keeps/reworks compete for these slots; they are not additional.

## 11. Material/decal contract

Do not choose an arbitrary fixed texture list before selecting the 80. For each suite define:

- existing base material family;
- clean, used, failed, and aftermath contact variants;
- directional tracks, cable/hose routes, runoff, or drag;
- powered/unpowered, sealed/breached, sterile/contaminated state mark;
- real-world scale and floor/wall/threshold/recess/furniture surface;
- limited valid rooms so unique evidence does not become wallpaper.

Likely needs: threshold aprons, recess rims, swept-volume warning arcs, camp-choice aftermath, passenger-state boarding queues, and quest-completion traces.

## 12. Prompt style references for Phase 2

Use in this order:

1. [Art Style Bible](../design/art-style-bible.md) for Nordic Cathedral Biomech form, palette, and Order/Decay/Synthesis.
2. [Refined 80-prompt TSV](./interactive-world-expansion-80-glbs-prompts-2026-10-15.tsv) for neutral-grey isolation, dimensions, technical exclusions, and subtle sensual vocabulary.
3. [60-GLB Master Plan](./interactive-world-expansion-60-glbs-master-plan-2026-10-14.md) for interaction fields and budgets.
4. `public/keyart/` for actual silhouette and surface density.
5. The three nearest shipped GLBs named in every candidate record.

### 12.1 3D prompt example structure

```text
Asset/job: [ID], serving [story beat] in [room/theme].
A single [object] with [distinct silhouette], [metres], for [placement/footprint].
Its readable moving part is [node], which [motion/state]. Include [sockets/FX].
Match Nordic Cathedral Biomech: restrained Nordic hard-line geometry beneath
decayed industrial material, biology emerging from seams and joints. Sensuality
stays suggestive and ambiguous through pressure, curvature, membrane tension
and wet/dry contrast. Preserve gameplay readability.
[Neutral-grey isolation and negative block.]
```

### 12.2 Surface example structure

```text
Seamless PBR [floor/wall/threshold/recess] material supporting [asset/room],
showing [specific traffic, residue, state]. Orthogonal, evenly lit, physically
scaled, with albedo/normal/roughness/ORM intent. No hero object or cast shadow.
```

### 12.3 Decal example structure

```text
Alpha-ready [surface] mark caused by [interaction], [metres], [direction],
with [before/after evidence]. Neutral-grey extraction background, orthogonal,
crisp boundary, no scenery.
```

## 13. Approval gates

A candidate enters the final 80 only if:

- no exact or functional duplicate exists;
- its nearest three GLBs are named and distinction is concrete;
- it owns a room, quest, choice, traversal, ending, or chain;
- its placement exists or includes runtime work;
- interaction is more than “press E for loot”;
- moving parts have feasible pivots/swept volume;
- material/decal support has a local purpose;
- state persistence is specified;
- it has an authored-room/vignette path;
- it adds an underrepresented silhouette.

## 14. Next deliverable

After review:

1. Build the exact 80-row gap manifest without image-generation prose.
2. Include nearest assets, destination, placement, verb, states, nodes/extras, support art, and acceptance test.
3. Remove collisions.
4. Then author 80 full prompts and the minimum necessary matching material/decal prompts.

This prevents another batch of desks, tanks, compactors, duplicate crash parts, and renamed laboratory furniture.

## 15. Phase 2 delivered (2026-10-15)

### 15.1 Prompts

- **Sheet:** [interactive-world-expansion-80-glbs-prompts-2026-10-15.tsv](./interactive-world-expansion-80-glbs-prompts-2026-10-15.tsv), 120 rows in the same 6-column format as every earlier prompt sheet:
  - rows 1–13: the owner's completed prompts, unchanged;
  - rows 14–80: 67 new props, hand-written in the rows 1–13 style (dimensions, construction, the state to depict, story, one accent light, then the shared style and render blocks);
  - rows 81–96: 16 support materials;
  - rows 97–120: 24 support decals.
- **Contract:** [world-expansion-80-gap-manifest-2026-10-15.md](./world-expansion-80-gap-manifest-2026-10-15.md) gives each prop's story hook, room, placement, verbs, persisted states, named nodes, three nearest shipped models and acceptance test.
- **Source:** both files come from `scripts/generate-world-expansion-80-prompts.mjs`. The script refuses to run if:
  - a nearest model isn't registered;
  - a new id already ships;
  - support art is undefined or unused;
  - rows 1–13 are missing.

The 12 camp-quest rows map one-to-one to the real quests in `src/data/campQuests.js` (grid_covenant, lost_probe, reactor_venting, spore_cleansing, lost_cultist, warm_pipes, iron_ledger, bunker_holdout), plus the leaders' private spaces.

**Changes from the first-pass draft of rows 14–80:**
- 15 "nearest shipped" references named models that don't exist (`prop_security_locker`, `gantry_crane_winch_drum`, `prop_hydraulic_piston_actuator`, `prop_fusion_generator`, ...). All now point at registered models.
- 43 rows referenced decals that were never defined. Support art is now 16 materials and 24 decals, each used.
- Functional duplicates were replaced:

| Draft concept | Duplicated | Replacement |
|---|---|---|
| cable ferry | `chasm_gondola` | swing catwalk span |
| counterweight bridge spool | the chasm stitcher and the catwalk | ballast tilt floor (uses the carry system) |
| pressure-door backbrace | Rhun's breach brace | pressure equaliser bladder |
| turbine lung | `hive_pulmonary_bellows` plus a generator | steam rotary airlock |
| final manifest punchwheel | `evac_manifest_allocation_terminal` and the muster abacus | turned-passenger jettison seat (a missing ending state) |
| Vey echo chime | a tuning device | twin listening cowl |
| lost-cultist waybell | a beacon | escort tether reel (the quest is an escort out of ventilation tunnels) |
| Rhun shield molt | `tina_molted_carapace`, `prop_hive_carapace_molt` | load-bearing yoke (heavy carry without the sprint penalty) |
| turned broadcast bloom | an antenna | resin-choked breaker gallery (a state of `substation_breaker_interlock`) |
| robbed cable frame | a third "absence frame" | stripped transformer carcass |
| armour screen | a fifth barricade | moving target rail |
| march rack | another rack | gun limber |
| Kaelen cable calendar | `life_memorial_board` | drafting scroll reel (Kaelen is the chief engineer) |

### 15.2 Room activation

**A runtime bug was found in-game.** `createScatterInstance` dropped every registered model that ships without a 2D sprite, unless the model was on a 27-type allowlist. Room population had been picking these story models and losing them silently. One 3.4-minute walk lost six of them (vaccine alembic, ossuary anvil, armor forge, larval urn, sluice gate, stepdown transformer). All seven authored `base_console` control anchors had also never drawn. These models now get the GLB-only 3D anchor.

**Activation pass:** 44 generic anchors in the 28 authored rooms now use room-specific shipped models:
- the anchors replaced were conduit hubs, cyber junctions, valve wheels, consoles, benches and the never-drawn base consoles;
- anchor ids, positions and quest destinations are unchanged;
- each model is used in one room;
- wall-backed models sit only on wall-adjacent anchors.

**Verified in-game:** nothing was dropped in a 5.5-minute walk, and the gate hydraulics, cryo coffin, decon scrubber, scaffold towers, sump trough, mycelium loom and cable risers all load in 3D.

**Still open:**
- reward anchors still use `prop_bunker_supplies`, because loot hangs off that type;
- lore anchors still use `lore_terminal`;
- swapped interaction anchors keep their old non-blocking collision.
