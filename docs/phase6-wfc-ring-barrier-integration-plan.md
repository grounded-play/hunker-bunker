# Phase 6.1/6.3 — WFC Ring-Barrier Integration Plan

Date: 2026-07-28. Status: design, approved by user to implement carefully
and incrementally, with the existing 2,000-seed stress test as a regression
gate at every step. Supersedes the earlier, more conservative framing in
`docs/master-implementation-plan-lane-split-2026-07-28.md` that treated
"make WFC honor reserved sockets" as requiring changes to the WFC lattice
solver itself.

## Why not the lattice solver

`src/wfcGenerator.js`'s connectivity guarantee is a spanning tree
(`buildBranchingSpanningTree`) plus, for the tutorial-only catalog, a
Hamiltonian-path search restricted to majority-color start cells
(`HAMILTONIAN_START_CELLS`) — a documented, deliberate choice made because
"WFC's local arc-consistency... only guarantees pairwise compatibility and
fragments constantly with a catalog this sparse." Adding hard reserved-socket
constraints on top of that reintroduces exactly the fragility this design
avoided, and there is no existing test coverage for a change *to* that
solver — only for its current output. This plan does not touch it.

## What "honor reserved sockets" can mean safely instead

The master plan's actual acceptance criteria (Phase 6.2) are about
**barriers and their crossings**, not intra-chunk tile arrangement:

> Generate canyon/ridge barriers between successive rings. Enumerate every
> crossing. ... Prevent destructible walls, loops, vertical bridges, or
> chunk portals from bypassing a progression gate.

The **hard bypass-prevention** half of that is already shipped and
live-verified this session: `ThreeGame.enforceRingProgressionLock()`
(committed `e9e608e`) clamps the player's actual position every frame,
regardless of which chunk/tile path they took to get there — so "no chunk
portal can bypass the gate" already holds today, structurally, without
touching chunk generation at all.

What's missing is the **visible, thematic** half: chunks near a ring
boundary don't look or feel different from any other chunk. This plan
closes that gap the safe way — **landform selection, not tile-solver
constraints.**

## The integration point: `getChunkLandform`

`src/threeGame.js:21543` already picks one of five landforms
(`MAZE`/`FIELD`/`CANYON`/`CRATER`/`RUINS`) per chunk via `pickLandform(random,
biome)`, cached in `this._chunkLandformCache`. `LANDFORMS.CANYON` already
exists, already renders distinct terrain, and already gets bonus wall HP
(`WALL_HP_CANYON_BONUS`) and exterior void generation
(`addCanyonVoidAroundWalkable`) — this is real, shipped, tested
infrastructure for exactly the "canyon barrier" concept the plan asks for.
Nothing new needs to be invented; an existing landform just needs to be
placed deliberately instead of randomly in a specific band.

**The change**: before falling through to `pickLandform`, check whether the
chunk's center world position sits within a thin band around one of the
four ring-transition radii (`RADIAL_RING_RADII[1..4]`, i.e. 42/78/118/160 —
the *nominal* ring radii, not `enforceRingProgressionLock`'s deliberately
wider soft-clamp radius, which exists for a different purpose and
shouldn't be conflated with where the visible barrier sits). If so, force
`LANDFORMS.CANYON` instead of the random pick.

```js
// src/mazeExpedition.js — pure, testable
export function isChunkOnRingBarrier(chunkX, chunkY, chunkSize, anchor, bandWidth = chunkSize) {
    const centerX = chunkX * chunkSize + chunkSize / 2;
    const centerZ = chunkY * chunkSize + chunkSize / 2;
    const distance = Math.hypot(centerX - anchor.x, centerZ - anchor.z);
    return RADIAL_RING_RADII.slice(1, 5).some((radius) => Math.abs(distance - radius) <= bandWidth / 2);
}
```

```js
// src/threeGame.js getChunkLandform, before pickLandform:
if (isChunkOnRingBarrier(chunkX, chunkY, this.chunkSize, this.getBiomeAnchorPosition())) {
    this._chunkLandformCache.set(key, LANDFORMS.CANYON);
    return LANDFORMS.CANYON;
}
```

## What this deliberately does not do

- **Does not dynamically remove the canyon once a ring unlocks.** The
  terrain is a persistent thematic tell, not a literal destructible gate —
  actual passage is still governed by `enforceRingProgressionLock`'s live
  position clamp, which already reacts to unlock state every frame
  regardless of terrain. Building "the canyon physically opens on unlock"
  is a separate, larger feature (would need dynamic geometry
  removal/regeneration) and is not in scope here.
- **Does not touch `wfcGenerator.js`, `collapseChunkLattice`, or any
  connectivity/solver code.** Only which landform enum gets chosen for a
  chunk changes; everything downstream of that (WFC tile catalog selection
  *within* a chunk, connectivity spanning tree, room population) runs
  exactly as it does today, for the `CANYON` landform exactly as it does
  for every other canyon chunk that already exists in the game.
- **Does not guarantee every ring-transition chunk is reachable/crossable**
  — a canyon-landform chunk still generates via the same connectivity
  guarantee as any other, so it won't be an impassable wall-to-wall solid
  block; it'll read as canyon terrain the player can navigate, consistent
  with how canyon chunks already work elsewhere in the game today.

## Regression gate

Every step must keep `src/mazeGenerationStress.test.js` (2,000 seeds × 3
biomes, connectivity + population invariants) and
`src/mazeExpedition.test.js` (ring-progression, chunk-reservation) green,
plus a new stress test: generate `isChunkOnRingBarrier` results across many
chunk coordinates and confirm the four expected radius bands are non-empty
and don't overlap each other implausibly.
