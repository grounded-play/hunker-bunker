# Scout Walk Pre-Rendered Vertical Slice Report

## Executive Summary

As planned in [Blender Pre-Rendered Animation Plan](./blender-prerendered-animation-plan-2026-09-12.md), we implemented and validated the first vertical slice of the offline Blender pre-rendering pipeline. This slice targets the Scout class walk cycle, taking the retail 3D rig ([Scout.game.glb](../../public/3d/scouting-scout/Scout.game.glb)) and baking its animation into transparent, calibrated orthographic sprite frames.

The initial deliverable—an 8-frame east-facing walk strip—has been successfully rendered, assembled, and validated against the engine's isometric perspective and cell geometry contracts.

---

## Technical Specifications & Calibration

### Source Asset & Action
- **Model**: `public/3d/scouting-scout/Scout.game.glb`
- **Armature**: `ScoutRig`
- **Action**: `walk` (duration: 32.8 frames; sampled at 8 equidistant phase steps: frames 0, 4, 8, 12, 16, 20, 24, 28)
- **Phase alignment**: Foot plant contact poses fall cleanly on frames 0 and 4.

### Camera & Geometric Contract
- **Projection**: Orthographic
- **Elevation / Pitch**: 50.0° from horizontal (matching the game's isometric angle)
- **Distance Y**: 5.0m
- **Target Z**: 0.18m (precisely calibrated to place ground contact at Y ≈ 230px with 28px top margin)
- **Ortho Scale**: 2.80m (accommodates full 1.90m arm/stride extension with 41px horizontal margins on each side)
- **Cell Resolution**: 256 × 256 pixels, 32-bit RGBA with transparent background

### Lighting Setup
- **Key Light**: Sun lamp, energy 2.8, rotation `(45°, 20°, -35°)` (crisp warm rim & form highlights)
- **Fill Light**: Sun lamp, energy 1.2, rotation `(65°, -15°, 145°)` (soft diffuse fill, preventing pitch-black self-shadows)
- **Rim Light**: Sun lamp, energy 1.5, rotation `(25°, 0°, 180°)` (backlight edge definition against dark cavern backgrounds)

---

## Pipeline Automation

Three automated scripts establish this deterministic pipeline:

1. **Renderer**: [render_prerender_atlas.py](../../scripts/blender/render_prerender_atlas.py)
   - Executes headlessly via Blender CLI (`blender --background --factory-startup --python ...`)
   - Reads declarative JSON manifests (`scripts/blender/manifests/*.json`)
   - Bakes actions into transparent RGBA PNGs with configurable frame count, directions, and sample counts.

2. **Assembler**: [assemble-prerender-atlas.mjs](../../scripts/assemble-prerender-atlas.mjs)
   - Stitches individual frames into horizontal direction strips or full 2D sprite sheets.
   - Generates standardized JSON sidecar metadata specifications documenting cell dimensions, frame rates, and direction row mappings.
   - Accessible via npm script: `npm run prerender:assemble`.

3. **Validator**: [validate-prerender-atlas.mjs](../../scripts/validate-prerender-atlas.mjs)
   - Automatically verifies dimensions, RGBA color mode, empty cell detection, edge clipping, and ground baseline positioning.
   - Accessible via npm script: `npm run prerender:validate`.

---

## Validation Results

### East Walk Strip (`Scout.walk.east-strip.png`)
- **Dimensions**: 2048 × 256 pixels (8 columns × 1 row)
- **Cell Geometry**: 256 × 256 pixels
- **Populated Cells**: 8 / 8
- **Average Ground Baseline**: Y = 229.6px (target window: 220–240px)
- **Head Clearance Margin**: 28.4px (zero clipping at top frame border)
- **Foot Clearance Margin**: 26.4px (zero clipping at bottom frame border)
- **Side Clearance Margins**: 41.0px left and right (centered at X = 128px)
- **Status**: PASSED

---

## Production Roadmap for Remaining Assets

1. **Scout 8×8 Walk Atlas (`Scout.walk_v4.png`)**:
   - Render remaining 7 directions (SE, S, SW, W, NW, N, NE) using the calibrated manifest.
   - Assemble 2048 × 2048 atlas and generate `Scout.walk-v4-frame-spec.json`.
   - Register layout in `src/playerSpriteLayouts.js` to replace legacy 2-frame fallback.

2. **Engineer Walk Fix**:
   - Render matching 8×8 atlas for Engineer to fix inverted direction frames.

3. **Idle & Combat Reactions**:
   - Scout & Engineer idle cycles (4 frames × 8 directions).
   - Hit reaction and dodge/dash animations.
