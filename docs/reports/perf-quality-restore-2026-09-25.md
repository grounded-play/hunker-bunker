# Full quality restored; frame time recovered on the CPU instead (2026-09-25)

Owner, after the 2026-09-25 PC session: the game looked and played worse
because the FPS "fix" dropped the shaders and 3D; undo it, keep all the
quality, and optimize a different way.

## What the "fix" was

`05c4300` (landed inside a minimap commit) turned the adaptive-quality tier
into an emergency mode that, once engaged:

- bypassed the post-processing composer (DOF / tilt-shift);
- froze shadow-map updates for the rest of the run;
- swapped every 3D enemy for its 2D sprite;
- stopped loading 3D prop models (sprite fallbacks stayed);
- ran the player's 3D animation at 10 Hz;
- updated the suit-light cone's wall contour at 4 Hz.

On a Steam Deck the tier engages on the first gameplay frame
(`reason: 'steam-deck'`), so every Deck run got all of this. On the PC it
engaged 97 s in (`logs/…06-27-40-524Z-mugkws10-6ryp.json`: 22.3 fps,
`postprocessing: false`). It also reversed an earlier owner decision
(`bccc488`, 2026-08-26: adaptive quality lowers render resolution only).

## Why it could not have worked

The same PC log: GPU time averaged **8.4 ms** a frame (≈12 ms in the worst
windows) while frames arrived every **~48 ms**, and `frame:render` itself
took ~20 ms. The frame was being lost on the main thread in game logic;
removing GPU work (post-processing, shadows, 3D) cost the look and bought
back almost nothing.

## Older cuts, same kind (Sprint 28, `fbf260f`, 2026-08-21)

The owner's second pass ("make it cool looking first") found the rest. That
commit had also, for FPS:

- cut the gameplay render budget from 1.35× / 3.6 MP to 1.15× / 2.2 MP. The
  owner's 2304×1440 @125% PC rendered at pixel ratio **0.81**, about 65 % of
  native, from the first frame;
- switched the suit light's shadows off entirely;
- halved the sun's shadow map (2048 → 1024).

And the adaptive tier forced every Steam Deck to 0.85 resolution on frame one.
The logs show resolution was never the limit: PC 8.4 ms GPU in ~48 ms frames;
Deck GPU under 1 ms with 11,106 long tasks.

Restored: the 1.35× / 3.6 MP budget, suit-light shadows (set once at creation
so no shader recompiles mid-run), and the 2048 sun shadow map. The Deck is no
longer forced down. Adaptive resolution now engages only when slow frames are
GPU-bound (measured GPU time ≥ 60 % of the frame); a CPU-bound slowdown keeps
full resolution and logs `adaptive-resolution-kept-cpu-bound`. With no GPU
timer it falls back to the FPS rule. Headless cost of the restored shadows:
~1.5 ms CPU per frame (`WebGLShadowMap.render` 17 → 42 ms over the profile),
well inside what the CPU fixes below freed. Screenshot:
`assets/perf-2026-09-25/gameplay-quality-restored.png`.

## What changed instead

All of 05c4300's quality cuts are reverted; the adaptive tier is back to
resolution-only. `05c4300`'s pure-CPU savings (overlay cache, collider
subset, mounted-chunk filter) are kept. New, all output-identical:

| Cost found (headless CPU profile, `tests/e2e/probes/gameplay-cpu.spec.js`) | Fix | Proof it is identical |
| :--- | :--- | :--- |
| Suit-light cone: 22 rays/frame, each walking all ~2,300 wall instances inside three's `InstancedMesh.raycast` — 93 % of `updatePlayer` | `src/wallRaycastIndex.js`: cached per-instance bounding spheres; a ray skips instances it cannot reach; the rest go through three's own `Mesh.raycast` | `src/wallRaycastIndex.test.js`: 1,400+ random rays match `intersectObjects` hit-for-hit (object, instance, face, distance, order), incl. destroyed/moved/resized walls and layers |
| Fog-of-war line of sight (`hasWallBetween`), projectile, camera and audio wall rays — same walk | Same index at all 7 wall raycast sites | Same test |
| Enemy A* (`findSnailPath`) tested every explored edge against every zone and door with full object normalisation — 95 % of `updateScatter` | `createAttackPathBlocker` (`src/roomContainment.js`): boxes gathered once per search; an edge that touches none returns early; anything that might be blocked runs the original `shouldBlockAttackPath` | `src/roomContainment.attackPathBlocker.test.js`: every edge of a 65×65 grid across 12 mixed worlds matches; door state read live |
| three draws each transparent `DoubleSide` material in two passes, flipping `needsUpdate` twice per object per frame — ~60 program re-resolves a frame from flat floor decals, puddles and effect rings | `src/singlePassFlatMaterials.js`: `forceSinglePass` only for materials whose every mesh has zero thickness (a flat plane shows one face from any angle, so the passes cover the same pixels); chunks and GLBs on mount, runtime effects by a 2 Hz sweep | `src/singlePassFlatMaterials.test.js`; solids, shared-with-solid and reshaped geometry keep two passes |
| Menu capped at 30 fps rendered at 20 on a 60 Hz display (exact comparison missed by vsync jitter) | quarter-interval tolerance | `src/threeGame.menuFrameCap.test.js` |

## Measured (headless Chromium, software GL — relative numbers only)

| Run | Game logic ms/frame | `updatePlayer` | `updateScatter` | material re-resolves/frame |
| :--- | ---: | ---: | ---: | ---: |
| quality restored, before optimizing | 42.0 | 17.8 | 8.5 | 60 |
| + wall raycast index | 27.6 | 2.6 | 11.1 | — |
| + A* edge pre-check | 16.4 | 2.5 | 2.6 | 60 |
| + single-pass flat decals (final) | 13.3 | 2.2 | 3.4 | **0** |

Adaptive mode engaged in every headless run (software GL is slow) and
post-processing stayed on (`post: true`) — the restored contract. Raw
outputs: `docs/reports/assets/perf-2026-09-25/`.

`renderFrame` time is not comparable headless (software rasterisation
dominates it). What the owner's PC and Deck gain is **not measured yet**:
the next session's log should show the gameplay frame interval fall while
`postprocessing: true` and 3D enemies stay on.

## Not done

- Chunk-mount spikes (`syncVisibleChunks`, up to ~60 ms) are unchanged.
- ~1,000–2,000 draw calls a frame on the PC (hundreds of individual pickup
  and prop meshes). Instancing them would cut CPU submit cost without
  changing the look; a larger change, not attempted here.
- The long-task reporter's GPU-memory scene walk (≤ once per 10 s) still
  runs during stalls.
