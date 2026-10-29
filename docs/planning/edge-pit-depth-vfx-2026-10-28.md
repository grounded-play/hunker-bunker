# Edge Pit Depth and Cliff VFX Goal

## Goal

Make exterior edge pits read as a vast, inhabited distance rather than a dark painted plane. The player should see a near-black rim, cliff faces disappearing through depth haze, sparse lights far below at visibly different depths, and occasional upward-moving motes along the drop.

The effect must remain inexpensive enough for the existing chunk-streamed world and Steam Deck target.

## Visual Read

The pit should resolve in this order:

1. A crisp, dark lip establishes the walkable edge.
2. The cliff face loses contrast as it falls away.
3. Sparse light clusters appear on multiple virtual planes far below, moving at different parallax rates as the camera moves.
4. A small number of dim motes rise beside the cliff and fade before reaching the rim.
5. Biome colour remains legible: ember in active bunker terrain, cold cyan in cryo, and sickly green in bio.

The lower pit must not become a uniformly bright lava floor. Darkness should dominate, with lights acting as scale references.

## Performance Budget

- Add no `THREE.Light` objects.
- Add no meshes, sprites, transparent particle systems, or draw calls.
- Reuse the existing instanced void mask and canyon-drop materials.
- Generate lights, haze, and motes inside the two existing fragment shaders.
- Share the existing time uniform and avoid per-frame allocations or instance updates.
- Keep loops statically bounded and small so WebGL shader compilers can unroll them reliably.

## Implementation Plan

### Checkpoint 1: Contract and Tests

- Replace the single glowing-floor contract with multiple virtual depth layers.
- Add constants for depth planes, sparse-light density, haze, and cliff-mote strength.
- Extend shader-source tests to protect the zero-light, zero-draw-call implementation.

### Checkpoint 2: Deep Light Field

- Ray-project the existing void-mask pixels onto two distant planes.
- Hash projected cells into sparse light clusters with soft halos and occasional paired lights.
- Let the deeper layer move less under camera motion to create strong scale parallax.
- Preserve biome tint while keeping most of the void near black.

### Checkpoint 3: Cliff-Face VFX

- Replace broad lower-wall illumination with narrow, broken reflected glow.
- Add sparse shader motes that drift upward beside the existing canyon skirt.
- Fade all effects near the rim and through scene fog so navigation stays readable.

### Checkpoint 4: Verification

- Run the focused void-depth tests and the production build.
- Confirm the implementation creates no new scene objects, lights, textures, or animation-loop allocations.
- Inspect the final diff separately from the pre-existing Foundry work in `src/threeGame.js`.

## Acceptance Criteria

- Camera movement produces clear parallax between at least two apparent depths.
- Individual far lights remain readable while most pit pixels stay dark.
- Cliff motes are sparse and slow enough to imply distance rather than sparks at the player camera.
- The rim and collision edge remain visually unambiguous.
- Runtime cost stays within the existing two terrain draw paths: void mask and canyon skirt.
