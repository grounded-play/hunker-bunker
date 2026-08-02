# System Breakdown: World Generation & WFC

## Overview
Hunker Bunker relies on a combination of Procedural Generation (via Wave Function Collapse, WFC) and authored tile constraints to build its subterranean maps. The core philosophy is "Radial WFC," generating from a central point outward to create distinct progression bands, rather than a uniform grid.

## Core Architecture
- **WFC Generator (`src/wfcGenerator.js`)**: Executes the core collapse algorithm, assigning tiles to grid coordinates based on adjacency rules (sockets) defined in the catalog.
- **Tile Catalog (`src/tileCatalog.js`)**: The authored constraints. Each tile defines its open/closed edges. Recently updated to use a "Canyon Band" model where interiors are wrapped in pit/cliff/ledge bands to create distinct islands joined by causeways.
- **Maze Expedition (`src/mazeExpedition.js`)**: Controls the macro-structure, chunking, and the placement of critical POIs (Camps, Bosses, Hives).
- **Landforms (`src/landforms.js`)**: Controls the physical geometry extraction, applying floor targets and rendering the actual Three.js meshes.

## The Radial Structure
The world is constructed in concentric rings, acting as progression gates:
- **Sector Zero (The Cave):** The origin (0,0). Contains the Queen and the final encounter.
- **Rings 1-4:** Progressive difficulty bands. The radii of these rings were recently scaled to derive dynamically from `CHUNK_SIZE` instead of hardcoded world units, spacing the progression gates more naturally.

## Current Technical Status & Sprint 22 Blockers
### The CHUNK_SIZE Migration
In Sprint 21, the base `CHUNK_SIZE` was increased from `19` to `49`. However, this value was not fully propagated across all generator functions. 
- **The Bug:** 9 internal functions and 23 tests still assert pre-band dimensions (e.g., hardcoding a pocket size of 13x13 instead of dynamically deriving it).
- **The Result:** The WFC generator is currently in a "Partial" state. It can generate the macro plan, but physical chunk projection often overlaps or throws out-of-bounds errors when placing Ring Barriers.

### Sprint 22 Scope
- **Propagate CHUNK_SIZE:** Audit all 9 remaining sites in `src/tileCatalog.js` and `src/mazeExpedition.js` that hardcode 19.
- **Finalize Canyon Bands:** Ensure `plain-open` and `plain-scatter` tiles are fully reachable in the WFC weighting picks (they currently declare all-four-open sockets but lose the weighted pick to room-hubs).
- **Shape-Aware Fill:** The maze fill/widen passes in `src/landforms.js` currently ignore the carved plaza silhouettes. They must be updated to respect these authored shapes rather than blindly opening cells up to the `floorTarget`.
