# Sprint 12 Hex Foundation Progress

**Date:** 2026-06-01
**Slice picked up:** Tuesday hex foundation — pure coordinate math and tests.

## Review Notes

- The weekly north star is accurate for a foundation sprint: keep fog-of-war, cleanup, and hex terrain separated so the large terrain migration does not destabilize the current square chunk game.
- The archived Agent 1/2 hex docs describe a larger terrain class with height/noise/rendering responsibilities. For this first sprint slice, the safer starting point is the weekly plan's smaller pure math module.
- This gives Sprint 12 a stable contract for axial/cube math before Three.js rendering or chunk integration begins.

## Implemented

- Added `src/hex.js` as a dependency-free pure module.
- Added `src/hex.test.js` with Vitest coverage for:
  - axial/cube conversion
  - direction and neighbor math
  - distance calculation
  - flat-top pixel/world conversion
  - cube-balanced rounding
  - rings, spirals, and map keys

## API Landed

- `HEX_DIRECTIONS`
- `DEFAULT_HEX_SIZE`
- `axialToCube(hex)`
- `cubeToAxial(cube)`
- `addHex(a, b)`
- `scaleHex(hex, factor)`
- `hexNeighbor(hex, directionIndex)`
- `hexNeighbors(hex)`
- `hexDistance(a, b)`
- `hexRound(hex)`
- `hexToPixel(hex, size)`
- `pixelToHex(point, size)`
- `hexRing(center, radius)`
- `hexSpiral(center, radius)`
- `hexKey(hex)`

## Next

- Wire the module into a flagged Three.js render layer behind `FEATURE_HEX_TERRAIN`.
- Decide whether the larger archived `HexTerrain` class should wrap this pure module or remain separate as the rendering/integration facade.
- Keep the default flag off until the grid render is visually verified.
