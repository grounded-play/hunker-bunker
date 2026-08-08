# 3D world asset coverage

Runtime source of truth: `WORLD_3D_MODELS` in `src/world3dOverlay.js`, plus the
player and enemy overlay catalogs. This list tracks upright gameplay objects
and characters. Floor decals, particles, stains, shadows, UI art, and other
intentionally flat effects are excluded.

## Connected 3D replacements

- Crashed ships: Scout, Tank, Engineer
- Base modules: console, O2 generator, hull matrix, radar dish, fusion generator
- World props: bunker junk/basic pile, storage-locker variant of bunker supplies,
  frozen human tanker
- Operators: Scout, Tank, Engineer
- Enemies: cybersnail, cryosnail, sporesnail, crawler/parasite, mycelium stalker,
  cybersnail boss, cryosnail boss, sporesnail boss, Queen

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
