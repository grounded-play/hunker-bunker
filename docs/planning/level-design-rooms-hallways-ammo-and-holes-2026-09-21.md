# Level Design Overhaul: Macro Rooms, Wider Corridors, Hole Pacing, and Early-Game Ammo Economy

**Status:** Proposed Architecture & Balance Specification  
**Date:** 2026-09-21  
**Parent:** [Authored Set Pieces, Crash-Site Building, and Run Variety](authored-setpieces-crash-site-and-run-building-plan-2026-09-12.md)  
**Siblings:** [Gate Stage Areas — Detailed Level Design](gate-stage-areas-design-2026-09-12.md), [Expedition Coherence Execution Plan](expedition-coherence-plan-2026-09-09.md)  
**Primary Seams:** `src/threeGame.js`, `src/data/ammoEconomy.js`, `main.js`, `src/data/hallwayBuilds.js`, `src/hallwayConnector.js`, `src/architecturalMaze.js`, `src/chunkStructure.js`, `src/data/roomBuilds.js`

---

## 1. Executive Summary & Problem Diagnosis

During gameplay review, two acute friction points undermine the opening minutes of a run, exacerbated by claustrophobic and bunched spatial layout:

1. **Early-Game Ammo Starvation:**
   - **The +1 Ammo Flaw:** Picking up a loose ammo box or enemy ammo drop calls `pickupCounterState.ammo = Math.min(activeAmmoCapacity, previousValue + 1)` in `main.js:3421`. Each pickup awards exactly **one bullet**.
   - **Negative Combat Margin:** A standard clip holds 6 rounds (`WEAPON_CLIP_SIZE = 6`), and defeating a basic snail takes 3–5 shots. On death, an enemy drops at most 1 ammo pickup (`+1 bullet`). Every basic enemy engagement yields a net deficit of **-2 to -4 bullets**.
   - **Spawn Exclusion Zone:** Within a 9-tile radius (`Math.hypot <= 9.0`) of the crash site origin, `isNearSpawnClearing` suppresses all pickups, crates, and props. The player exits the ship into the procedural dungeon with no initial resource buffers.
   - **Glacial Passive Regen:** Base passive clip regeneration (`WEAPON_AMMO_REFILL_INTERVAL`) is **10 seconds per round**. If the player exhausts their starting 30 rounds in the first minute, refilling a single clip requires a 60-second passive retreat.

2. **Excessive & Intrusive Hole Hazards:**
   - **Mass Wall Replacement (8%):** In `threeGame.js:32246`, `getHoleCutForLandform` sets `holeCut` to `0.08` for `MAZE` and `RUINS`. In a chunk with 150–250 wall cells, 12–20 floor pits are carved directly into wall faces, corners, and doorway thresholds.
   - **Incoherent Navigation:** Wall holes convert impassable `#` tiles into walkable-hazard void cells with fall colliders, opening dangerous cavities in the walls and along narrow corridors where players dodge or strafe.
   - **Dead-End Room Pits:** `verticalWfc.js` replaces entire 5×5 room interiors with `VERTICAL_TILE.PIT` lethal holes.
   - **Vent Clutter:** Hole tiles trigger a 40% roll to spawn a `fungal_spore_vent`, creating hazard density spikes right at the perimeter of movement corridors.

3. **Claustrophobic, Bunched, & "Random-Feeling" Levels:**
   - **Narrow Alleys (1–2m):** In `src/data/hallwayBuilds.js`, archetypes declare `widthRange: [1, 1]` or `[1, 2]`. With a camera distance of 3.65m and player bounding radius ~0.4m, a 1–2m hallway leaves no room for tactical dodging, weapon aim lead, or passing enemy silhouettes.
   - **Single-Chunk "Box Cramming":** Rooms in `src/data/roomBuilds.js` and `architecturalMaze.js` are constrained to a single 19×19 chunk (effectively 9×8 to 13×13 playable footprint after outer canyon/wall margins). Because adjacent chunks frequently roll room nodes, the dungeon feels like bunched 10m boxes chained directly together without spatial breathing room or distinct macro landmarks.
   - **Lack of Topological Rhythm:** World layout generates rooms per chunk using localized random rolls rather than a structured macro rhythm (e.g., *Crash Landmark → Wide Arterial Highway → Tactical Chokepoint → Expansive Multi-Chunk Plaza → Breather Connector*).

---

## 2. Early-Game Ammo Economy Overhaul

### 2.1 Ammo Pickup Value Scale
Ammo pickups should reward meaningful ammunition rather than single cartridge increments:
- **Base Ammo Pickup Yield:** Increase from `+1` to `+4` rounds (2/3 of a standard clip) per world pickup.
- **Ammo Crate / Locker Yield:** Crates drop ammo packs yielding `+6` rounds (1 full clip).
- **Rarity Scaling:**
  - Common ammo cache: `+4` rounds.
  - Rare ammo cache: `+8` rounds.
  - Legendary surplus: `+16` rounds.
- **Implementation Point:** In `main.js:3421`, change the flat `previousValue + 1` to a configurable payload `event?.detail?.amount ?? 4`.

### 2.2 Crash-Site Resupply Footing
To ensure players never enter the first combat encounter empty-handed:
- **Crash Site Armory Lockers:** Place two guaranteed resupply containers at the crash site exit threshold (just outside the 9m clearing, flanking the north exit airlock).
- **Starting Reserve Tuning:** Increase base `STARTING_RUN_AMMO` from 30 to **42** rounds (7 full clips), matching standard military assault loadouts and ensuring at least 8–10 enemy encounters before requiring world scavenging.
- **Guaranteed Drop from Early Enemies:** In Ring 1 (Depth 0), guarantee that the first 5 enemy kills drop an ammo cache (+4 rounds) to establish positive feedback and teach scavenging.

### 2.3 Passive Regeneration Floor
- Decrease `WEAPON_AMMO_REFILL_INTERVAL` from 10s to **6.0s** per round when completely dry (0 clip, 0 reserve), reducing full empty-clip wait time from 60s to 36s.
- Maintain existing skill upgrade progression (`ammoRefill` tier reducing interval toward 3.6s).

---

## 3. Hazard & Pit Hole Pacing Overhaul

### 3.1 Slashing Procedural Hole Cut Density
The wall-replacement pit hole generation is vastly overtuned:
- **MAZE / RUINS `holeCut`:** Reduce from `0.08` to **`0.015`** (an ~80% reduction).
  - Current: ~15–20 holes per chunk.
  - Proposed: 2–4 holes per chunk, making them notable tactical hazards rather than terrain noise.
- **CRATER `holeCut`:** Reduce from `0.05` to **`0.02`**.
- **FIELD `holeCut`:** Retain at `0.01–0.02`.
- **Tutorial & Ring 0 (Crash Site & Immediate Ring):** Explicitly clamp `holeCut = 0.0` within Ring 0 so the starting area is 100% free of accidental pit hazards.

### 3.2 Hazard Placement Rules & Threshold Clearances
- **Portal & Door Buffer:** Enforce that no hole tile can generate within **3 cells** of any chunk edge opening or room doorway (`Math.hypot(x - portalX, y - portalY) > 3.0`). This eliminates the classic "hole right in the door" issue.
- **Corridor Centerline Protection:** In connectors, holes are restricted to alcoves and lateral wall recesses; the primary arterial corridor line must remain clear.
- **Fungal Spore Vent Coupling:** Reduce spore vent spawn chance on hole tiles from 40% to **20%**, preventing clusters of hazard turrets on the few remaining pits.

---

## 4. Corridor & Hallway Widening Specification

### 4.1 Metric Standards (1 cell = 1 meter)
Based on camera parameters (FOV 58°, distance 3.65m, look-ahead 4.2m) and player navigation bounds:
- **Arterial Highways:** **4–5 cells wide** (carve stroke radius 2). Used for main routes between landmarks and ring crossings. Allows full strafing, dodging, projectile visibility, and fluid camera tracking.
- **Standard Connectors:** **3 cells wide** (carve stroke radius 1 with clean margins). Used for intermediate branches and service passages.
- **Tactical Chokepoints / Airlocks:** **2 cells wide**, strictly bounded to short transitions (length 2–3 cells) with clear lighting and warning cues. Never long 1-wide alleys.

### 4.2 Archetype Catalog Updates (`src/data/hallwayBuilds.js`)
Update all existing hallway archetypes with wider profiles:
- `short_connector`: `widthRange: [3, 4]` (was `[1, 1]`).
- `pressure_corridor`: `widthRange: [3, 4]` (was `[1, 2]`), with dedicated 1-tile cover recesses rather than constricted lanes.
- `service_passage`: `widthRange: [2, 3]` (was `[1, 1]`).
- `canyon_causeway`: `widthRange: [3, 3]` (was `[1, 1]`) with solid side barriers.
- `defensive_approach`: `widthRange: [4, 5]` (was `[2, 3]`), designed for squad firefights.
- `camp_approach`: `widthRange: [3, 4]` (was `[1, 2]`), offering welcoming sightlines.

---

## 5. Macro Rooms & Anti-Bunching Architecture

### 5.1 Multi-Chunk "Macro Room" Footprints
The primary cause of the "bunched, claustrophobic boxes" feel is that rooms are confined to single 19×19 chunks. By introducing multi-chunk authored footprints (as outlined in Layer 2 of the Set-Piece Plan):
- **Small Outposts:** 1×1 chunk (19×19m, interior ~13×13m).
- **Medium Complexes (Hospitals, Armories, O2 Hubs):** 2×1 or 1×2 chunks (38×19m, interior ~30×13m).
- **Major Plazas (Camps, Hives, Crash Citadel, Boss Arenas):** 2×2 chunks (38×38m) or 3×3 chunks (57×57m).
- Interior spaces in macro rooms feel grand, open, and readable, providing clear sightlines and distinct combat arenas.

### 5.2 Macro Pacing & Anti-Bunching Policy
To prevent dense clusters of rooms:
- **Minimum Connector Buffer:** A room node must be separated from any other room node by at least **1 full connector chunk** unless explicitly declared as a sub-module of a unified multi-chunk place set.
- **Zoning Rhythm Ratio:** Generation must enforce a macro ratio of approximately **1 Room Chunk : 2 Connector Chunks**.
  - Pattern: `[Major Room / Landmark] → [Wide Arterial Connector] → [Branching / Service Connector] → [Next Major Room]`.
- **Relief & Compression:** Alternating between wide open chambers (relief) and structured tactical corridors (compression) gives the world intentional pacing rather than uniform chaos.

---

## 6. Execution Roadmap & Verification Plan

### Phase 1: Immediate Gameplay Fixes (Ammo & Holes)
1. Update `src/data/ammoEconomy.js` and `main.js` to scale ammo pickup amounts to `+4` rounds and starting reserve to `42`.
2. Tune `getHoleCutForLandform` in `src/threeGame.js` from `0.08` to `0.015`, and enforce Ring 0 hole immunity.
3. Validate with unit tests (`combatEconomy.test.js`, `threeGame.holeTiles.test.js`).

### Phase 2: Corridor & Hallway Widening
1. Update `widthRange` across all entries in `src/data/hallwayBuilds.js`.
2. Adjust `carveLine` and `realizeHallwayConnector` in `src/hallwayConnector.js` and `src/architecturalMaze.js` to ensure clean 3–5 cell carving without ragged boundary artifacts.
3. Update `hallwayConnector.test.js` to reflect new width boundaries.

### Phase 3: Macro Rooms & Topology Integration
1. Extend `src/chunkStructure.js` and `src/roomBuilds.js` to support 2×1 and 2×2 multi-chunk room footprints.
2. Update the radial topology planner to enforce minimum connector separation between discrete room instances.
3. Characterize in the browser with visual verification across biomes.
