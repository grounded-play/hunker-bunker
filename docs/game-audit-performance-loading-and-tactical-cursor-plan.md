# Game Performance, Asset Loading & Tactical Mouse Overlay Audit & Plan

**Document Version**: 1.0.0  
**Date**: August 2026  
**Status**: Comprehensive Technical Audit & Action Plan  
**Target Systems**: `src/threeGame.js`, `main.js`, `src/mapSystem.js`, `style.css`, `index.html`

---

## 1. Executive Summary

During intensive playtesting and profiling of *Hunker Bunker*, two primary categories of friction were identified:
1. **Performance Hitches & Loading Lag**: Noticeable frame stuttering, framerate drops, and garbage collection (GC) pauses occur when entering new sectors, streaming world chunks, and loading textures/sprites dynamically.
2. **Tactical Cursor & Mouse Overlay Box Gaps**: The cursor hover detection is narrow, only responding to a small hardcoded subset of interactables. It fails to identify unscanned/fog-of-war tiles (which should display `??? [UNSCANNED SECTOR]`), ignores solid walls and structural barriers, omits loot/pickups/props, and lacks a rich, structured tactical HUD inspection box.

This document delivers a thorough root-cause audit and a systematic implementation roadmap to optimize the engine for steady 60+ FPS while delivering a state-of-the-art tactical mouse inspection display.

---

## 2. Comprehensive Performance & Loading Audit

### 2.1 Asset Loading & Main-Thread Keying Bottlenecks

#### Identified Issues:
- **Synchronous Pixel Processing**: In `loadKeyedSpriteTexture()` (`src/threeGame.js:5551-5630`), texture image processing executes on the main browser thread:
  ```javascript
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const hasSourceAlpha = imgData.data.some((value, index) => index % 4 === 3 && value < 255);
  if (!options?.layout?.hasAlpha && !hasSourceAlpha) {
      applyGreenChromaKey(imgData);
      applyBlackChromaKey(imgData, { threshold });
  }
  ctx.putImageData(imgData, 0, 0);
  ```
  Iterating over $512 \times 512$ or $1024 \times 1024$ pixel buffers (1–4 million iterations per texture) on the main JavaScript thread causes instant frame drops (15–60ms hitch per loaded asset) whenever new enemy types or biome props appear.
- **Uncached Sprite Repacking**: Texture atlases and dynamic layouts are processed ad-hoc on load, creating canvas allocations and triggering garbage collection spikes.

#### Remediation Plan:
1. **Web Worker / OffscreenCanvas Processing**: Move all chroma keying and pixel thresholding into an asynchronous background worker pool using `createImageBitmap` and `OffscreenCanvas`.
2. **Pre-baked WebP Assets with Native Alpha**: Transition all production sprites from chroma green/black backgrounds to WebP with pre-baked alpha channels, completely bypassing CPU keying at runtime.
3. **Texture Warm-Up & Global Texture Registry**: Preload and decode core sprite atlases during the initial airlock boot/staging phase so gameplay never encounters on-the-fly texture allocation pauses.

---

### 2.2 Chunk Generation & Meshing Overhead

#### Identified Issues:
- **Synchronous Procedural Generation**: In `mountChunk()` (`src/threeGame.js:19241`), when the player moves across chunk boundaries, Wave Function Collapse (WFC) and procedural generation run synchronously.
- **Heavy Per-Chunk Object Allocations**:
  ```javascript
  // Thousands of short-lived matrices created during a single chunk mount
  const matrix = new THREE.Matrix4();
  const rotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
  floorCells.forEach((cell, index) => {
      matrix.compose(new THREE.Vector3(...), rotation, new THREE.Vector3(1, 1, 1));
      floors.setMatrixAt(index, matrix);
  });
  ```
  Every chunk mount instantiates hundreds of `THREE.Matrix4`, `THREE.Vector3`, `THREE.Quaternion`, and `THREE.Euler` instances, creating high GC churn.
- **Fragmented Instanced Meshes**: Chunks create independent `InstancedMesh` pools per room style, cliff edge, canyon drop, step dressing, and surface overlay, multiplying draw calls.

#### Remediation Plan:
1. **Reusable Global Scratch Objects**: Replace per-loop allocations with static singleton scratch objects (`_scratchMatrix4`, `_scratchQuat`, `_scratchVec3`, `_scratchEuler`).
2. **Time-Sliced Chunk Generation Budget**: Impose a strict time budget (e.g., maximum 3ms per frame) for procedural generation and chunk meshing; queue work across subsequent frames if the frame delta exceeds 16ms.
3. **Unified InstancedMesh Batching**: Combine matching room styles and cliff matrices across neighboring chunks where possible, reducing total draw calls from 180+ down to under 45.

---

### 2.3 Per-Frame Game Loop & GC Thrashing

#### Identified Issues:
- **Per-Frame Allocation in `syncVisibleChunks()`**:
  ```javascript
  // Runs every frame inside render()
  const needed = new Set();
  const resident = new Set();
  this.wallMeshes = [];
  this.pickupMeshes = [];
  this.scatterSprites = [];
  ```
  Re-allocating `Set`s, `Array`s, and concatenating strings on every render frame creates continuous minor GC pauses.
- **Redundant Matrix Inversions & Raycasts**: `getWorldAimPoint()` and hover checks calculate camera projections and raycasts multiple times per frame without caching the pointer tile coordinate.

#### Remediation Plan:
1. **Chunk Visibility Spatial Invalidation**: Only re-evaluate `syncVisibleChunks()` when the player's grid position changes across tile/chunk boundaries or when a queued mount completes.
2. **Pooled Flat Arrays**: Retain pre-allocated arrays for `wallMeshes`, `pickupMeshes`, and `scatterSprites` with length truncation rather than discarding and reallocating array references.
3. **Cached Pointer World Aim**: Cache `worldAimPoint` per frame and share it across weapon aiming, telemeter HUD, and cursor inspection.

---

## 3. Tactical Mouse Overlay & Cursor Box Overhaul

### 3.1 Deficiencies in Current Cursor System
1. **No Fog of War / Unscanned State**: When aiming at unexplored terrain, the cursor clears and shows nothing. Players have no visual feedback that an area is unmapped or obscured.
2. **Ignored Walls & World Geometry**: Aiming at perimeter ice walls, rock columns, bedrock, blast doors, or chasm cliffs shows no inspect data.
3. **Ignored Pickups & Interactable Props**: Ammo boxes, scrap piles, datalogs, medkits, and biome props trigger no cursor hover feedback.
4. **Basic Floating Badge Only**: The existing `.cursor-interact-badge` only supports a single short text string with no structured telemetry, stats, or keybinding guidance.

---

### 3.2 Target Architecture: Tactical Telemeter & Inspection Box

```
+------------------------------------------------------------------+
| [#] TARGET SCANNER // TELEMETRY LINK                            |
+------------------------------------------------------------------+
| [STATE: UNEXPLORED]  ??? // UNSCANNED SECTOR                     |
| GRID COORDS: [X: +14, Z: -22]  |  RANGE: 18.4m                   |
| STATUS: RADAR OCCLUDED // NO SENSOR RETURN                       |
| ACTION: [F] DEPLOY SCAN PING OR ADVANCE INTO SECTOR              |
+------------------------------------------------------------------+
```

```
+------------------------------------------------------------------+
| [#] TARGET SCANNER // HOSTILE LOCKED                            |
+------------------------------------------------------------------+
| [THREAT: HIGH]  CYBERSNAIL (ALPHA SPECIMEN)                     |
| INTEGRITY: [■■■■■■■■■■□□□□□] 64% (128 / 200 HP)                  |
| ARMOR: CHITIN-PLATED  |  VULNERABILITY: CRYO / EXPLOSIVE        |
| DISTANCE: 6.8m  |  BEARING: 042° NE                             |
| ACTION: [L-CLICK] ENGAGE WEAPON                                  |
+------------------------------------------------------------------+
```

```
+------------------------------------------------------------------+
| [#] STRUCTURAL SCAN // ICE BULWARK                               |
+------------------------------------------------------------------+
| [OBSTACLE]  PERIMETER REINFORCED ICE WALL                        |
| COMPOSITION: SUB-ZERO GLACIAL BEDROCK                            |
| INTEGRITY: IMPERVIOUS (NON-DESTRUCTIBLE)                         |
| DISTANCE: 3.2m                                                   |
+------------------------------------------------------------------+
```

```
+------------------------------------------------------------------+
| [#] RESOURCE DETECTED // SALVAGE                                |
+------------------------------------------------------------------+
| [LOGISTICS]  HIGH-CALIBER AMMO CACHE                             |
| CONTENTS: +45 KINETIC ROUNDS  |  RARITY: COMMON                  |
| DISTANCE: 2.1m (IN PICKUP RANGE)                                 |
| ACTION: [E] COLLECT AMMUNITION                                   |
+------------------------------------------------------------------+
```

---

### 3.3 Enhanced Inspection Priority Matrix

The new `resolveTacticalInspectTarget(worldPoint, screenX, screenY)` algorithm evaluates targets in the following order:

1. **Fog of War / Unscanned Check**:
   - Check if tile `(gx, gz)` is explored via `explorationTracker.isExplored(gx, gz)` and within player line-of-sight.
   - If not explored / outside visibility radius:
     - Return `{ type: 'unscanned', title: '???', subtitle: 'UNSCANNED SECTOR', status: 'UNKNOWN SIGNAL', threat: 'UNKNOWN', icon: '❓' }`.
2. **Active Combat Targets (Enemies & Bosses)**:
   - Proximity to `queenBossSprite`, `sporesnailSprite`, `scatterSprites` (hostiles), and `remotePlayers` (PvP rivals).
   - Returns `{ type: 'enemy', title: enemyName, hp: currentHp, maxHp, threat: 'HIGH'|'MEDIUM', armorType, distance }`.
3. **NPCs & Squadmates**:
   - Proximity to camps, squadmates, or downed players.
   - Returns `{ type: 'friendly', title: npcName, role, action: 'TALK'|'REVIVE'|'BARTER' }`.
4. **Stations & World Interactables**:
   - Consoles, O2 Stations, Foundries, Black Box, Airlocks, Blast Doors.
   - Returns `{ type: 'station', title: stationName, status: isOnline ? 'ONLINE' : 'OFFLINE', prompt: '[E] OPERATE' }`.
5. **Pickups, Loot & Props**:
   - Ammo boxes, medkits, scrap salvage, lore datapads, bio pods.
   - Returns `{ type: 'pickup', title: itemName, quantity, prompt: '[E] SALVAGE' }`.
6. **Destructible & Solid Walls / World Obstacles**:
   - Destructible Corrupted Barrier (`'X'`), Cryo Ice Wall (`'C'`), Standard Walls (`'#'`), Rock Pillars, Cliff/Canyon chasms (`EXTERIOR_CANYON_TILE`).
   - Returns `{ type: 'wall', title: wallTypeLabel, composition, destructible: boolean, integrity }`.
7. **Explored Ground / Sector Terrain**:
   - Walkable sector tile (Ice Corridor, Plaza, Fungal Grove, Cryo Deck).
   - Returns `{ type: 'terrain', title: sectorName, biome: biomeKey, depth: depthTier }`.

---

## 4. Implementation Phasing & Milestones

### Phase 1: Performance Profiling & Texture/Asset Loading Optimization
- Implement background image processing / pre-baked alpha WebP.
- Eliminate per-texture main-thread synchronous pixel manipulation.
- Pre-warm common sprite textures during initial loading phase.

### Phase 2: Game Loop & Chunk Meshing GC Optimization
- Replace matrix allocations in `mountChunk()` and `syncVisibleChunks()` with static scratch pools.
- Spatial throttling for chunk visibility synchronization.
- Implement time-sliced chunk generation budget.

### Phase 3: Tactical Mouse Overlay Box & Cursor Telemetry Overhaul
- Add `resolveTacticalInspectTarget()` with full support for unscanned fog-of-war tiles (`???`), solid walls, pickups, enemies, and terrain.
- Build the Tactical Telemeter HUD box component in HTML/CSS with cybernetic sci-fi styling.
- Update tactical cursor styling and micro-animations for scanned vs unscanned states.

### Phase 4: Integration, Playtesting & Benchmark Verification
- Benchmark frame time stability (target: 0 frame drops below 60 FPS during chunk boundary crossing).
- Verify mouse hover feedback across all biomes, enemies, walls, and fog of war.
- Run comprehensive regression tests across existing test suites.

---
