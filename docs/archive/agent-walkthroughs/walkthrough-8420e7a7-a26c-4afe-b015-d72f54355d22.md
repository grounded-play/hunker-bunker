# Walkthrough — Game UI Overhaul & Full-Screen Tactical Map Overlay

This walkthrough documents the full-screen **Tactical Blueprint Map Overlay** and **UI Overhaul** implemented for Hunker Bunker.

## Changes Made

### 1. Map & Fog-of-War Exploration System
- **[`src/mapSystem.js`](file:///home/caveman/Desktop/icecave/hunker-bunker/src/mapSystem.js)**: Created `ExplorationTracker` class to map 3D world coordinates to grid cells, track explored WFC room tiles, shrouded fog-of-war, room categories, and landmark positions.
- **[`src/mapSystem.test.js`](file:///home/caveman/Desktop/icecave/hunker-bunker/src/mapSystem.test.js)**: Unit tests covering grid conversion, tile exploration, landmark filtering, and clean state resets.

### 2. Full-Screen Tactical Map UI Modal
- **[`index.html`](file:///home/caveman/Desktop/icecave/hunker-bunker/index.html)**: Added `#tactical-map-modal` modal markup containing `#tactical-map-canvas`, scanline overlays, blueprint legend, and exploration stats (`#map-stat-tiles`, `#map-stat-signals`).
- **[`style.css`](file:///home/caveman/Desktop/icecave/hunker-bunker/style.css)**: Implemented dark glassmorphism styling (`backdrop-filter: blur(16px)`), glowing cyan border accents, blueprint grid lines, and responsive layout.

### 3. Gameplay & Input Integration
- **[`src/threeGame.js`](file:///home/caveman/Desktop/icecave/hunker-bunker/src/threeGame.js)**: Integrated `ExplorationTracker` into ThreeGame engine and added `getTacticalMapState()`, registering player coordinates, Camps, Hive Sites, Black Box, and Objectives.
- **[`src/browserGamepad.js`](file:///home/caveman/Desktop/icecave/hunker-bunker/src/browserGamepad.js)** & **[`src/inputActions.js`](file:///home/caveman/Desktop/icecave/hunker-bunker/src/inputActions.js)**: Added `toggleMap` button mappings (`Select/View` button, `M` key, `Tab` key).
- **[`main.js`](file:///home/caveman/Desktop/icecave/hunker-bunker/main.js)**: Implemented `drawTacticalMapOverlay()` to render room silhouettes, grid lines, fog-of-war, landmark icons, and player position arrow on canvas. Added keyboard (`M`, `Tab`, `ESC`) and click listeners to toggle map overlay.

---

## Verification Results

### Unit Tests
- `npm test`: **99 test suites passed (768 tests total)**.
- `src/mapSystem.test.js`: **5/5 tests passed**.

### End-to-End Tests
- **[`tests/e2e/tactical-map.spec.js`](file:///home/caveman/Desktop/icecave/hunker-bunker/tests/e2e/tactical-map.spec.js)**: Verifies opening the map via `M` / `Tab`, asserting canvas & legend visibility, and closing via `ESC`.
