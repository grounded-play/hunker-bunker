# Walkthrough: 8-Directional Character Sprite Sheets & Code Integration

We have successfully integrated the new 8-directional character sheets and updated the game's direction mapping and animation rendering code.

---

## 1. Asset Changes & Processing
We wrote and executed [.claude-work/build_sheets.py](file:///home/caveman/Desktop/icecave/hunker-bunker/.claude-work/build_sheets.py) to compile the final assets:
- **Scout:** Processed from the 4x4 walking cycle sheet generated from scratch ([scout_walk_scratch_1780191271518.png](file:///home/caveman/.gemini/antigravity-ide/brain/c4009fbb-cbb1-4ddf-8287-1f3279190827/scout_walk_scratch_1780191271518.png)).
- **Tank & Engineer:** Processed from their respective 3x3 directional layout guides ([tank_directions_1780190858864.png](file:///home/caveman/.gemini/antigravity-ide/brain/c4009fbb-cbb1-4ddf-8287-1f3279190827/tank_directions_1780190858864.png) and [engineer_directions_1780190874378.png](file:///home/caveman/.gemini/antigravity-ide/brain/c4009fbb-cbb1-4ddf-8287-1f3279190827/engineer_directions_1780190874378.png)).

The script performed the following steps:
1. **Extraction:** Cropped each character direction from the guides/source sheets.
2. **Vertical Baseline Alignment:** Center-aligned the sprites horizontally and grounded them to a vertical baseline (`y = 220`) to eliminate vertical bouncing.
3. **Walk Cycle Construction:** Alternated walk frames and mirrored leg pixels below `y = 155` for profile/diagonal steps to ensure realistic leg transitions.
4. **Chroma Key Background:** Removed green background pixels (`r < 90 and g > 150 and b < 90`) to render clean, transparent PNG files for the Three.js runtime.

The final 4x4 sheets are installed at:
* [scout_walk.png](file:///home/caveman/Desktop/icecave/hunker-bunker/public/scout_walk.png)
* [tank_walk.png](file:///home/caveman/Desktop/icecave/hunker-bunker/public/tank_walk.png)
* [engineer_walk.png](file:///home/caveman/Desktop/icecave/hunker-bunker/public/engineer_walk.png)

---

## 2. Code Changes

### [threeGame.js](file:///home/caveman/Desktop/icecave/hunker-bunker/src/threeGame.js)
- **Octant-based direction mapping:** Added the [getFacingDirection](file:///home/caveman/Desktop/icecave/hunker-bunker/src/threeGame.js#L4795) helper to map angle ranges into 8 distinct direction octants (E, SE, S, SW, W, NW, N, NE), returning the target row index and whether the direction is a diagonal.
- **8-directional walking loop:** Updated [updatePlayerSpriteAnimation](file:///home/caveman/Desktop/icecave/hunker-bunker/src/threeGame.js#L4814) to:
  - Cycle the column offsets using a 2-frame loop (`animationTimer % 2`).
  - Shift the sampled column by `+2` when walking in a diagonal direction (e.g. Southwest is columns 2 and 3, South is columns 0 and 1).
- **Responsive aiming & standing:** Updated the standing and aiming state. If the player aims or stands still, the sprite now correctly retains its diagonal or cardinal facing pose (standing column 2 or 0) rather than snapping back to front-facing.
- **Compatibility wrapper:** Wrapped [getFacingRow](file:///home/caveman/Desktop/icecave/hunker-bunker/src/threeGame.js#L4859) to return `dir.row` for backward compatibility with other combat/firing sub-systems.

### [main.js](file:///home/caveman/Desktop/icecave/hunker-bunker/main.js)
- **Character selector preview:** Updated the character selection screen preview rendering in [renderPreviewFrame](file:///home/caveman/Desktop/icecave/hunker-bunker/main.js#L2672). It now alternates the frame index using `(frameIndex % 2)` to display a clean 2-frame walking cycle facing forward (South, columns 0 and 1) for the Scout, Tank, and Engineer.

---

## 3. Verification & Build
* All 13 unit tests passed (`npx vitest run`).
* Production build successfully bundled with Vite (`npm run build`).
* Player character movement now naturally plays 8-directional animations corresponding to their movement angle.
