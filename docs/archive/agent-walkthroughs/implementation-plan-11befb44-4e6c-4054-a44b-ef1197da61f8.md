# Game Performance Audit, Asset Loading Optimization & Tactical Mouse Overlay Overhaul

**Conversation ID**: `11befb44-4e6c-4054-a44b-ef1197da61f8`
**Status**: Completed

Audit and remediate game performance bottlenecks and asset loading hitches, while expanding the in-game cursor and mouse overlay display box into a rich tactical telemetry inspector that correctly surfaces unscanned fog-of-war tiles (`???`), solid walls, pickups, enemies, and world entities.

## User Review Required

> [!IMPORTANT]
> The tactical cursor inspection system is expanding from a simple contextual badge to a dual-mode telemetry inspector:
> 1. **Floating Crosshair Dynamic Bracket & Sub-badge**: Fast, lightweight readout following the mouse cursor.
> 2. **Tactical Telemetry Display Box**: A cybernetic HUD telemeter box (dockable in the HUD corner or toggled on hover) displaying detailed target metrics (Integrity/HP, Rarity, Threat, Wall Composition, Distance, and Action Prompts).

> [!NOTE]
> All core sprite chroma-keying on the main thread will be moved to an asynchronous worker / offscreen pipeline and backed by preloaded asset registries to eliminate loading hitches when exploring new biomes.

---

## Open Questions

> [!NOTE]
> 1. **Telemeter HUD Box Placement**: Would you prefer the expanded tactical inspect box to float directly alongside the tactical cursor, or dock in a dedicated corner HUD telemetry panel (like bottom-right or top-right radar frame) with a compact badge following the cursor? (Plan supports both with a setting toggle).
> 2. **Unscanned Sector Behavior**: When hovering over uncharted fog of war tiles, should clicking the tile trigger a suit radar ping / beacon marker or simply retain the `??? [UNSCANNED SECTOR]` advisory?

---

## Proposed Changes

Grouped by component layer:

### Core Engine & Hover Telemetry

#### [MODIFY] [src/threeGame.js](file:///home/caveman/Desktop/icecave/hunker-bunker/src/threeGame.js)
- Refactor `checkHoverInteractable()` into a comprehensive `resolveTacticalInspectTarget()`:
  - **Fog of War / Unscanned Check**: Query `this.explorationTracker.isExplored(gx, gz)` and line-of-sight. If unexplored or outside vision, return `{ type: 'unscanned', title: '???', subtitle: 'UNSCANNED SECTOR', status: 'UNKNOWN SIGNAL', threat: 'UNKNOWN' }`.
  - **Solid Walls & Structures**: Inspect tile catalog (`#`, rock columns, perimeter ice, bedrock, canyon cliffs, pillars, blast bulkheads). Return `{ type: 'wall', title: 'WALL // REINFORCED ICE', composition: 'GLACIAL BEDROCK', destructible: false }`.
  - **Pickups & Items**: Inspect `this.pickupMeshes` and `this.loreDrops` for ammo, weapon drops, scrap, medkits, datapads.
  - **Enemies & Bosses**: Provide threat level, HP fraction, distance in meters, and vulnerability tags.
  - **Explored Terrain**: Return biome sector details, depth tier, and terrain name.
- Optimize `syncVisibleChunks()`: Spatial caching to avoid running every frame; reuse pre-allocated flat arrays.
- Eliminate per-chunk `THREE.Matrix4` / `Vector3` / `Quaternion` allocations in `mountChunk()` and dressing passes by utilizing singleton scratch pools.
- Asynchronous / non-blocking texture image processing in `loadKeyedSpriteTexture()`.

#### [MODIFY] [src/mapSystem.js](file:///home/caveman/Desktop/icecave/hunker-bunker/src/mapSystem.js)
- Add fast O(1) `isTileScanned(worldX, worldZ)` and `getExplorationState(worldX, worldZ)` methods for instant hover queries without array scans.

---

### UI & Tactical Cursor Display Box

#### [MODIFY] [index.html](file:///home/caveman/Desktop/icecave/hunker-bunker/index.html)
- Add the `#tactical-telemeter-box` HUD overlay component containing:
  - Header classification indicator (Status, Target Lock, Scanning)
  - Target Title (`???`, `CYBERSNAIL`, `PERIMETER WALL`, `AMMO CACHE`)
  - Sub-metrics: Integrity bar, Armor/Composition, Coordinates `[X, Z]`, Range in meters
  - Contextual Action Keybind Prompt (`[L-CLICK] ENGAGE`, `[E] SALVAGE`, `[F] SCAN`)

#### [MODIFY] [style.css](file:///home/caveman/Desktop/icecave/hunker-bunker/style.css)
- Add styling for the Tactical Telemeter Box with glassmorphism, cybernetic borders, scanlines, and animated bracket corners.
- Add distinct cursor states:
  - `.cursor-unscanned`: Dimmed amber static-noise brackets with pulsing `???` badge.
  - `.cursor-wall`: Industrial slate/blue brackets for solid structures.
  - `.cursor-loot`: Golden/emerald brackets for collectibles and scrap.
  - `.cursor-hostile`: Aggressive crimson locking brackets for enemies.

#### [MODIFY] [main.js](file:///home/caveman/Desktop/icecave/hunker-bunker/main.js)
- Wire up tactical telemeter DOM updates and smooth cursor coordinate tracking.
- Connect hover events to update both the floating cursor badge and the HUD telemeter box.

---

### Documentation

#### [NEW] [docs/game-audit-performance-loading-and-tactical-cursor-plan.md](file:///home/caveman/Desktop/icecave/hunker-bunker/docs/game-audit-performance-loading-and-tactical-cursor-plan.md)
- Complete technical audit document detailing performance profiling findings, GC allocation metrics, texture keying pipeline, and tactical cursor inspection specifications.

---

## Verification Plan

### Automated Tests
- Run existing unit and integration test suites:
  ```bash
  npm test
  ```
- Run targeted Three.js and map system tests:
  ```bash
  npx vitest run src/mapSystem.test.js src/threeGame.mappingMission.test.js src/threeGame.wallSilhouette.test.js
  ```
- Add new unit tests for `resolveTacticalInspectTarget` covering:
  - Unscanned / fog of war tiles (`???`)
  - Solid walls and destructible barriers
  - Hostile enemies and bosses
  - Pickups, stations, and explored ground

### Manual Verification
- Launch the development build (`npm run dev`) and test with browser subagent:
  1. Hover over dark/unexplored areas outside visibility radius $\rightarrow$ Confirm cursor and telemeter display `??? [UNSCANNED SECTOR]`.
  2. Hover over solid perimeter walls and rock pillars $\rightarrow$ Confirm cursor displays wall classification and composition.
  3. Hover over enemies $\rightarrow$ Confirm hostile lock, health bar, and threat tier.
  4. Hover over ammo, consoles, and camps $\rightarrow$ Confirm interaction prompts (`[E]`).
  5. Cross chunk boundaries and monitor FPS meter to confirm smooth 60 FPS without hitches or stuttering.
