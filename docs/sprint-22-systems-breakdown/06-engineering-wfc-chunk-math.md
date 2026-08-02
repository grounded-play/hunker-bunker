# Engineering Deep Dive: WFC Chunk Math & The 49x49 Migration

## The Problem
During Sprint 21, the world map was re-scaled. The base unit of generation, `CHUNK_SIZE`, was originally `19`. It has been changed to `49`. 

The `CHUNK_SIZE` formula is defined in `src/tileCatalog.js` as:
```javascript
export const CHUNK_SIZE = (LATTICE * (TILE_SIZE - 1)) + 1;
```

Because `CHUNK_SIZE` increased dramatically, the macro layout of the game (how chunks are distributed) broke because many calculations still assume `19`.

## Areas of Failure (To Be Fixed in Sprint 22)

### 1. Hardcoded Tests
In `src/mazeExpedition.test.js`, tests are failing because they rely on hardcoded magic numbers rather than deriving them from the imported `CHUNK_SIZE`. 
- **Action Item:** Replace magic coordinate limits in `src/wfcGenerator.test.js` and `src/mazeExpedition.test.js`.

### 2. Radial Ring Radii Calculation
In `src/mazeExpedition.js`, the progression bands (Rings 1-4) determine where Camps, Bosses, and Hives spawn. 
Previously, this was hardcoded. Now, it uses:
```javascript
RING_RADII_TUNED_AT_CHUNK_19.map((r) => Math.round(r * (CHUNK_SIZE / 19)))
```
- **The Gap:** The function `projectPlanToChunkReservations(plan, chunkSize = CHUNK_SIZE)` is throwing collision errors because the node placement derives X/Z from unscaled radii, but re-projecting the node's world position disagrees with its own precomputed `chunkX`/`chunkY`.
- **Action Item:** Unify the world-to-chunk convention: `Math.floor(worldCoord / CHUNK_SIZE)`. Ensure `worldToChunkCoords` is used consistently during the radial projection phase.

### 3. Shape-Aware Fill (`src/landforms.js`)
The `applyRingRoadSystem` and the fill/widen passes in `src/landforms.js` currently trust a caller-supplied size instead of deriving span from the lattice and `TILE_SIZE`. This causes array out-of-bounds errors.
- **Action Item:** Make `openMazeTerrain` aware of the carved diamond/cross/ellipse plaza silhouettes so it stops blindly filling cells up to the `floorTarget`.
