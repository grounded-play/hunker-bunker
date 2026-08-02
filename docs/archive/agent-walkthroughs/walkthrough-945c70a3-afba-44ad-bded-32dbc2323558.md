# Environmental Decal Propagation

Based on your pivot to focus strictly on placing the decals, I've successfully propagated the new environmental assets across the Hunker Bunker world, including the highly-specific **Rare Story Decals** and **14 Unique Lore Drop Objects**!

## Rare Story Decals & Scatters
We generated and wired up 5 extremely rare assets tied directly to the lore of the game. They will only spawn rarely (15% chance) and only in their specific lore-friendly room themes!
1. `decal_pod_312_breach`: Spawns rarely in `cryo-medical` or `cryo-recovery` rooms to represent the origin point of Specimen 0047.
2. `scatter_horizon_black_box`: Spawns rarely in `reward-cache` or `bunker-utility` rooms.
3. `decal_machine_cult_shrine`: Spawns rarely in `bunker-utility` or `bunker-workshop` rooms.
4. `prop_iron_guild_dogtags`: Spawns rarely in `camp-fortified` or `bunker-armory` rooms.
5. `decal_tallow_herb_cache`: Spawns rarely in `bio-resin` or `camp-fortified` rooms.

## Interactive Unique Lore Drops
Instead of the generic `lore_terminal` texture, **all 14 physical Lore Drops now have their own unique PNG asset representations in the 3D world**. 
When you walk up to collect the "Cracked Survey Probe" or the "Queen Moult Shard", you will actually see a physical representation of that exact item on the ground.

## What Changed in Code
- **`src/roomThemes.js`**: Added a new `rareProps` array to the respective themes for the 5 rare story decals.
- **`src/roomPopulation.js`**: Added a logic branch that has a small chance (15%) to spawn a `rareProp` if the current room's theme supports it.
- **`src/threeGame.js`**: 
  - Hooked up all 19 new `.png` assets (5 rare decals + 14 lore drops) to the internal texture loader and material registry.
  - Updated `spawnLoreDropSprite(drop, x, z)` to look up `this.scatterMaterials[drop.key]` dynamically, so each lore drop uses its unique texture! (It safely falls back to `lore_terminal` if a material isn't found).

Everything is now integrated into the game! You can start a run and hunt for the rare spawns and unique lore drops.
