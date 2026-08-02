# System Breakdown: World Generation and WFC

## PM Summary

The 49×49 canyon-band migration is merged and green. Sprint 22 should not be framed as “repair 23 failing tests.” The remaining risk is whether the mathematically valid world produces readable routes, memorable spaces, fair site placement, and useful tactical variety in a real run.

## Generation Layers

1. **Regional topology (`src/mazeExpedition.js`):** creates the seeded macro route graph, ring sites, blockers, progression validation, and world/chunk projection.
2. **Tier/progression model (`src/mazeTiers.js`):** describes hall/room/plain profiles, tier unlock requirements, sites, and route redundancy toward the Queen.
3. **Chunk WFC (`src/wfcGenerator.js`):** collapses a 3×3 lattice, stamps authored tiles, validates seams, merges same-role neighboring cells, and extracts metadata.
4. **Tile vocabulary (`src/tileCatalog.js`):** defines 17×17 tile patterns (`ROOM_SIZE = 7`, `BAND_THICKNESS = 5`) and derives `CHUNK_SIZE = 49`.
5. **Room interpretation (`src/roomGeometry.js`, `src/roomThemes.js`):** turns lattice cells into room instances, roles, material styles, props, and encounter profiles.
6. **Runtime projection (`src/threeGame.js`, `src/landforms.js`):** streams geometry, enforces progression, populates rooms, and renders floors, doors, canyon edges, and sites.

## What Landed in the Tile-Bands Merge

- `CHUNK_SIZE` propagation and ring-radius scaling.
- Canyon bands around interior tiles and separate plain handling.
- Deterministic, named ring-gate landmarks: bulkhead, gantry, membrane, and pressure hatch.
- Chunk-size-aware gate placement and de-duplication.
- Ring 2's collapsed bridge returning a traversal unlock.
- Adjacent same-role cells merging into multi-cell rooms and continuous halls.
- Stress and focused tests updated to derive dimensions rather than assert old 19/13 constants.

The current automated suite passes. Treat older notes about 23 failures, out-of-bounds ring barriers, and a partially merged feature branch as historical context.

## Invariants to Protect

- Every required site is reachable under its intended unlock state.
- Locked rings cannot be bypassed by alternate edges or movement impulses.
- Door/socket lanes remain aligned and at least three cells wide.
- Canyon void never consumes authored traversal lanes.
- Story nodes and ring gates occupy distinct chunks.
- The same seed produces the same macro topology and landmarks.
- Merged spaces retain their role and do not erase necessary shell boundaries.

## Sprint 22 Acceptance Work

### Seed portfolio

Keep a small recorded portfolio: ordinary seed, loop-heavy seed, long-spine seed, dense merged-room seed, and worst observed site-spacing seed. For each, record route length, first-ring clarity, gate identity, camp/hive placement, and any dead-looking space.

### Room and hallway legibility

Measure actual merged-space footprints and classify them with `mazeTiers` profiles. The PM question is not “are rooms non-square?” but “can the player distinguish corridor, chamber, camp approach, hive approach, reward pocket, and gate landmark without debug labels?”

### Gate affordance

Verify each gate communicates what blocks it, which objective unlocks it, and what changed after unlock. Ring 2 must visibly reconnect through the bridge rather than only change permission state.

### Performance

49×49 chunks have materially more cells and dressing opportunities. Capture frame time, streaming hitch, memory, and first-generation time on desktop and Deck-class hardware.

## Open Product Questions

- How much plain/open space is desirable before tactical emptiness becomes visual emptiness?
- Should all rings have a fixed identity per run, or only fixed gate types with variable surrounding rooms?
- How many independent routes should remain after a gate unlock?
- What is the acceptable walking time between ship, first camp, and first boss?

## Evidence

- Merge: `4db5980`.
- Follow-up room/art integration: `5863b9c`.
- Core tests: `src/wfcGenerator.test.js`, `src/tileCatalog.test.js`, `src/mazeExpedition.test.js`, `src/mazeGenerationStress.test.js`, `src/threeGame.regionalTopology.test.js`, and site/room quality suites.
