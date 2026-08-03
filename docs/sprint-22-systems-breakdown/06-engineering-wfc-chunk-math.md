# Engineering Deep Dive: WFC Chunk Math and the 49×49 Migration

## Current Formula

`src/tileCatalog.js` defines:

```js
ROOM_SIZE = 7
BAND_THICKNESS = 5
TILE_SIZE = ROOM_SIZE + (BAND_THICKNESS * 2) // 17
LATTICE = 3
CHUNK_SIZE = (LATTICE * (TILE_SIZE - 1)) + 1 // 49
```

Adjacent stamped tiles share one boundary row/column, which is why the formula subtracts one tile cell before multiplying. Tests and callers should import the derived constants rather than copy `49`, `17`, or older `19`/`13` values.

## Migration Status

The migration work described in the first draft is complete on the current branch:

- ring radii scale from the original chunk-19 tuning baseline;
- `worldToChunkCoords` and reservation projection use `CHUNK_SIZE`;
- blocker placement is chunk-size-aware and de-duplicated;
- pocket/test spans derive from current geometry;
- canyon/plain layers are separated;
- current tests pass.

## Coordinate Conventions

- World positions are continuous `x/z` values.
- Chunk coordinates are integer keys derived by `Math.floor(worldCoord / CHUNK_SIZE)`.
- The radial plan stores sites/blockers in world and projected chunk terms; validation must detect disagreement or collisions.
- Chunk-local stamping must account for the shared edge between neighboring tiles.

Any new system that places a site should use the existing conversion functions. A hardcoded multiplier is a regression even when it looks correct for the current size.

## Geometry Conventions

- `OPEN3` sockets reserve three-cell lanes.
- Band wrapping is structural: room core, wall/ledge band, then canyon/void.
- `mergeAdjacentSpaces` removes internal shells only between compatible same-role cells.
- Plain tiles represent authored open traversal, not a failed room collapse.
- Runtime widening/fill must preserve socket lanes, reserved landmarks, and role silhouettes.

## Engineering Acceptance

- Run focused WFC, tile catalog, room geometry, site placement, and stress suites.
- Validate thousands of seeds for reachability, seam correctness, reservation conflicts, and deterministic replay.
- Compare computed site chunks with actual runtime objects.
- Inspect at least one real generated chunk with debug labels disabled.
- Profile worst-case merged room generation and population.

## Future Change Checklist

If tile size, band thickness, or lattice size changes again, update derived constants first; then audit ring scale, world/chunk conversion, metadata extraction, room footprint classification, gate placement, population density, rendering budgets, and tests. Never begin by mass-replacing numeric literals without establishing which coordinate space they represent.
