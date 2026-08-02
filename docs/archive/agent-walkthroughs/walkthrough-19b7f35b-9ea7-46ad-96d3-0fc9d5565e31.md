# Walkthrough - Compass Visibility and Targeting Fixes

We have modified the tactical compass behavior to ensure it points at the active terminal at spawn and remains visible at all times on the HUD (not just on mobile/touch layout).

## Changes Made

### 1. Compass Targeting Update
- In [threeGame.js](file:///home/caveman/Desktop/icecave/hunker-bunker/src/threeGame.js#L840-L865), we modified `getSpawnCompassState()` to search for the active crashed ship corresponding to the player's selected type (`this.playerType`).
- If found, the compass target coordinates are set to that ship's terminal position (i.e. `tileX/Z + consoleOffset.x/z`).
- Otherwise, it falls back to the default spawn tile coordinates.

### 2. Compass Visibility Update
- In [main.js](file:///home/caveman/Desktop/icecave/hunker-bunker/main.js#L277-L293), we updated `syncTouchMoveControlVisibility()`.
- The parent `#touch-move-control` element (which contains the compass) is now toggled visible as long as the HUD is active (`isHUD === true`).
- The joystick ring (`.touch-move-control__ring`) and its label (`.touch-move-control__label`) are independently toggled visible or hidden based on the user's `state.settings.touchControls` configuration.
- When `state.settings.touchControls` is false, the joystick ring is hidden and the parent container collapses so the compass sits beautifully at the bottom-left corner of the screen.

## Verification
- Ran `npm run build` to verify that all JS, CSS, and HTML assets compile without errors.
