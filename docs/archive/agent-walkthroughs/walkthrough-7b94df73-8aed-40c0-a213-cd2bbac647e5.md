# Walkthrough - Menu Spacing, Isolated Showroom, and Reset Logic

This walkthrough summarizes the changes made to reposition menu elements, place the menu character showcase in a clean, blank background area, fix the shadow map deprecation warning, resolve AudioContext errors, smooth out hero stage color changes, and enforce comprehensive session/Daily Ops state reset upon exit or death.

## Changes Made

### 1. Menu Layout Repositioning & S.O.U.L. Window Compactness
- Adjusted `.action-row` inside [style.css](file:///home/caveman/Desktop/icecave/hunker-bunker/style.css):
  - Changed default `margin-top` to `calc(var(--vu) * -26.5)` (from `-16.5`) to raise the INITIALIZE button and S.O.U.L. stats panel further up.
  - Adjusted the mobile/small-screen rule in `@media (max-height: 430px)`, setting `margin-top` to `calc(var(--vu) * -17.5)` (from `-10.5`).
- Adjusted `.char-card` inside [style.css](file:///home/caveman/Desktop/icecave/hunker-bunker/style.css):
  - Shrunk vertical padding in the default layout to `calc(var(--vu) * 1.45) calc(var(--vu) * 2.5)` (from `2.5`).
  - Shrunk vertical padding in the mobile/responsive query to `calc(var(--vu) * 1.1) calc(var(--vu) * 2.15)` (from `1.9`).
- Adjusted `.hero-stats-compact` inside [style.css](file:///home/caveman/Desktop/icecave/hunker-bunker/style.css):
  - Shrunk grid spacing (`row-gap` to `0.28vu`) and vertical padding (`padding: 0.45vu 1.6vu 0.45vu`).
  - Reduced text font sizes: title to `1.15vu`, label to `1.05vu`, and value to `1.15vu`.
  - Shrunk `.pip` indicator elements to `1.1vu` (from `1.42vu`) for default viewports and adjusted `.hero-stats-compact` row-gap in mobile media queries.
- These tweaks make the S.O.U.L. stats window significantly more compact, preventing it from bleeding over the bottom border, and layout everything beautifully.

### 2. Smooth Hero Preview Stage Glow Lerp
- Added modern CSS `@property` rules at the top of [style.css](file:///home/caveman/Desktop/icecave/hunker-bunker/style.css) to register `--preview-glow-border`, `--preview-glow-bg`, and `--preview-glow-shadow` as `<color>` type variables.
- Added transition rules on `.char-preview-stage` in [style.css](file:///home/caveman/Desktop/icecave/hunker-bunker/style.css) for these variables, as well as `border-color` and `box-shadow` fallbacks.
- This produces a very smooth, premium color crossfade/lerp transition when selecting different heroes (Scout: Green, Tank: Orange, Engineer: Blue) rather than snapping instantly.

### 3. Isolated Showcase Area for Menu
- Updated `getSpawnTile()` in [threeGame.js](file:///home/caveman/Desktop/icecave/hunker-bunker/src/threeGame.js) to return coordinate values inside chunk `(100, 100)` when `this.performanceProfile === 'menu'`.
- Updated `setPerformanceProfile()` in [threeGame.js](file:///home/caveman/Desktop/icecave/hunker-bunker/src/threeGame.js):
  - When transitioning to `'menu'`, the player, glowing ring, and marker are teleported to chunk `(100, 100)`.
  - Calls `clearLoadedChunksForRunReset()` and `syncVisibleChunks(true)` to unload chunk `(0, 0)` and mount the blank showcase chunk.
- Since chunk generation in menu mode yields flat empty floor grids, this isolates the character showcase from all wreckage, crashed ships, console terminals, floor indicators, or starting room props.

### 4. Audio & Deprecation Warning Fixes
- Suppressed demo gameplay sounds on the menu:
  - Added checks in [threeGame.js](file:///home/caveman/Desktop/icecave/hunker-bunker/src/threeGame.js) to verify `this.performanceProfile !== 'menu'` before calling `window.AudioManager?.playProceduralFootstep()` and playing `amb_metal_stress` sounds during showcase movement.
  - This solves the Chrome warning console errors regarding suspended AudioContext `source.start(0)` calls prior to user gestures.
- Swapped WebGL shadow map types:
  - Changed `THREE.PCFSoftShadowMap` to `THREE.PCFShadowMap` in [threeGame.js](file:///home/caveman/Desktop/icecave/hunker-bunker/src/threeGame.js) to resolve ThreeJS deprecation warnings.

### 5. Comprehensive Session & Daily Ops Reset on Exit
- Updated `main.js` [main.js](file:///home/caveman/Desktop/icecave/hunker-bunker/main.js):
  - Inside the `confirmYes` event listener (Abort Mission confirmation), added verification for `_isDailyOpsRun`.
  - If a daily ops run is aborted, it calculates the current run score, saves the daily record as completed (so they cannot restart it), disables the Daily Ops button on the menu, and resets the active seed offset and flags.
  - Reordered starting flows in `startBtn`, `dailyOpsBtn`, and `gameOverTryAgain` click handlers: setting the performance profile to `'gameplay'` *before* calling `resetRunToStartingState(...)` so the player is spawned at the correct starting ship coordinates `(9, 9)` in chunk `(0, 0)`.

## Verification Results

### Automated Tests
- Ran ESLint check to verify syntax correctness:
  ```bash
  npm run lint
  ```
  *Result: Clean run, no linting errors.*
- Ran project unit tests using Vitest:
  ```bash
  npm run test
  ```
  *Result: 11 tests passed across generator.test.js and bank.test.js.*
