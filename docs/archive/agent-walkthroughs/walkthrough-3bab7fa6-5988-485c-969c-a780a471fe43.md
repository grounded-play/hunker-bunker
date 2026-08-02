# Alien & Hive Ecosystem Overhaul Walkthrough

We have completed the **Alien & Hive Ecosystem Overhaul** for Hunker Bunker, equipping the hostiles and bio-structures with vertical terrain tactics, procedural run mutations, bio-slime terrain mechanics, and alien bond relics.

---

## Key Alien Features Implemented

### 1. Vertical 3D Heightmap Tactics ([threeGame.js](file:///home/caveman/Desktop/icecave/hunker-bunker/src/threeGame.js))
- **High-Ground Ranged Spitters**:
  - `alien_proto_spitter` hostiles seek elevated plateaus ($Y = 1.5, 3.0$), gaining sightlines over lower corridors to bombard players with high-ground bio-acid.
- **Ledge Leap-Drop Crawlers**:
  - `alien_proto_crawler` hostiles execute high-speed downward leap attacks when dropping off 3D terrain cliff ledges behind the player.

---

### 2. Procedural Alien Mutations ([enemies.js](file:///home/caveman/Desktop/icecave/hunker-bunker/src/data/enemies.js))
- Added `rollAlienMutation(random, depthTier)` to dynamically scale hostile threat based on run depth and entropy:
  - **`spore_snare` (Volatile Spore-Snare)**: Hostiles detonate into lingering spore cloud fields on death.
  - **`adaptive_carapace` (Adaptive Cryo-Carapace)**: Hostiles gain $+35\%$ Max HP and elemental resistance.
  - **`tesla_drone` (Tesla Synapse Drone)**: Attendant drones discharge electric arcs across metal wall brackets when disturbed.

---

### 3. Alien Bio-Relics & Synergies ([runDrops.js](file:///home/caveman/Desktop/icecave/hunker-bunker/src/runDrops.js))
- Added biological suit relics unlocked by bonding with Alien Leaders (Nahl, Vey, Rhun):
  - **`pheromone_aura` (Hive Pheromone Aura)**: Pacifies wild snails and converts nearby crawlers into defensive bio-allies.
  - **`chitin_membrane` (Carapace Membrane)**: Grants $+30\%$ damage reduction when standing inside bio-slime terrain.
  - **`synapse_pulse` (Synapse Dash Pulse)**: Thruster dash emits a bio-pulse that stuns hostiles for $2.0\text{s}$.

---

## Verification & Test Results

Executed full project unit tests via `vitest`:

```bash
npx vitest run
```

### Output:
```
 Test Files  69 passed (69)
      Tests  549 passed (549)
   Start at  00:42:05
   Duration  1.62s
```

All **69 test files** and **549 tests** are **100% green**.
