# 3D world asset coverage

Runtime source of truth: `WORLD_3D_MODELS` in `src/world3dOverlay.js`, plus the
player and enemy overlay catalogs. This list tracks upright gameplay objects
and characters. Floor decals, particles, stains, shadows, UI art, and other
intentionally flat effects are excluded.

## Connected 3D replacements

- Crashed ships: Scout, Tank, Engineer
- Base modules: console, O2 generator, hull matrix, radar dish, fusion generator
- World props: bunker junk/basic pile, storage-locker variant of bunker supplies,
  frozen human tanker, specimen tank, broken specimen tank, surgical cart, medical bed,
  diagnostic console, security barricade, conduit hub, cave bones, queen throne, biomech arch
- Room & Biomech props: ammo crate stack (`prop_ammo_crate_stack`), flesh locker (`prop_biomech_flesh_locker`),
  incubator pod (`prop_biomech_incubator`), neural synapse node (`prop_biomech_neural_synapse`),
  respirator vent (`prop_biomech_respirator`), sphincter trap (`prop_biomech_sphincter_trap`),
  triage cradle (`prop_biomech_triage_cradle`), fabricator workstation (`prop_fabricator_workstation`),
  laser trap emitter (`prop_laser_trap_emitter`), O2 filter vat (`prop_o2_filter_vat`),
  tesla coil node (`prop_tesla_coil_node`), vital monitor (`prop_vital_monitor`)
- Operators: Scout, Tank, Engineer
- Class weapons: Vector-9 Talon (`gun_scout_vector9_talon`), Siege-Breaker 50
  (`gun_tank_siege_breaker50`), Tesla-Lock MK-IV (`gun_engineer_tesla_lock`) — one
  per class, parented onto the operator's hand bone (`src/player3dOverlay.js`).
  Weapon skins: Sub-Zero Frostbite (`skin_scout_frostbite`, itemdef 4100), Deep
  Core Melter (`skin_tank_deep_core_melter`, itemdef 4107 — filename says "tank"
  but `src/loadout.js`'s `ARCHETYPE_SKINS` currently assigns 4107 to Engineer;
  unresolved naming/assignment conflict, see `docs/armory-and-class-weapons-worklog.md`),
  Cryo-Plasma Arc Driver (`skin_engineer_cryo_plasma`, itemdef 4103). Talon-C
  Carbine (Scout's tier-unlocked secondary archetype) has no mesh yet.
- Enemies: cybersnail, cryosnail, sporesnail, crawler/parasite, mycelium stalker,
  cybersnail boss, cryosnail boss, sporesnail boss, Queen, spore mortar, fungal spore vent


## Still missing 3D counterparts

### Combatants and characters

- Sentinel
- Fungal spore vent
- Bio charger
- Spore mortar
- Civilian miner
- Civilian researcher
- Alien proto-crawler
- Alien proto-spitter
- Corrupted Scout boss
- Corrupted Tank boss
- Corrupted Engineer boss

### Bunker and room props

- Biomechanical arch
- Cyber junction
- Specimen tank
- Bunker supplies (the non-locker variants)
- Conduit hub
- Medical bed
- Surgical cart
- Diagnostic console
- Broken specimen tank
- Engineering bench
- Security barricade
- Cryo sleep pod
- Ruptured coolant pump

### Cave and bio props

- Spore colony
- Biomechanical pillars (left and right)
- Cave lichen
- Cave bones
- Cave eggs (intact and hatched)
- Cave spores
- Cave webs
- Wounded cave hive
- Queen throne
- Hive resin sac
- Alien respiratory vent
- Alien feeding basin

### Camp props

- Sandbags
- Crates / single camp crate
- Bedrolls
- Cookfire (lit and doused)
- Camp cot

### Other upright world objects

- Lore terminal
- Quest prop and quest mold
- Empty exosuit body
- Ship wreckage
- Dead snail and boss-snail bodies
- Base defense turret (currently built from Three.js primitives, with no authored GLB)
- Bunker blast door and its controls (currently built from Three.js primitives,
  with no authored GLB)

## Maintenance rule

When a counterpart is added, put the optimized GLB under `public/3d/runtime`,
register it in the appropriate overlay catalog, wire it at the sprite creation
site, and move the item from “missing” to “connected” above.
