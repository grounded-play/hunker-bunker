# GPU and Memory Utilization Plan

Date: 2026-08-21. Sprint 28 performance follow-up after the measured log13
CPU/update-loop fixes.

## Goal

Use available PC and Steam Deck hardware efficiently while preserving stable
frame pacing. The target is not 100% memory occupancy: Steam Deck's 16GB is
unified CPU/GPU memory, so filling it removes the reserve needed for Chromium,
Steam, the OS, asset decoding, and transient render targets.

## Existing foundation

- Packaged Electron already enables GPU rasterization, zero-copy, and native
  GPU memory buffers (`electron/main.cjs`).
- Steam Deck is detected through Steamworks and immediately selects the
  adaptive gameplay path.
- Gameplay can shed postprocessing, shadows, and excess pixel ratio without
  hiding world chunks or actors.
- CPU subsystem timing, draw calls, triangles, resource counts, shader-program
  count, and JS heap usage already flow into exported performance logs.

The missing evidence is actual GPU execution time and resource size in bytes.
`renderer.info.memory.textures === 103` does not say whether those textures use
40MB or 1GB, and JavaScript frame duration cannot distinguish CPU submission
from GPU work.

## This implementation slice

1. Wrap each gameplay render submit with
   `EXT_disjoint_timer_query_webgl2` when supported. Queries are asynchronous,
   bounded, and discarded after a GPU-disjoint event; unsupported drivers keep
   rendering normally.
2. Sample unique scene geometry buffers, material textures, composer render
   targets, and the default framebuffer. Cache the scan for ten seconds so
   normal per-frame diagnostics read only a stored snapshot.
3. Record coarse hardware context: Steam Deck status, logical CPU count,
   browser-reported system-memory tier, drawing-buffer size, and WebGL GPU
   vendor/renderer when the debug extension permits it.
4. Add the metrics to `getPerformanceDiagnosticsSnapshot()`, which already
   feeds long-task context and exported demo logs.
5. Request the `high-performance` WebGL adapter. This selects the discrete GPU
   on hybrid PCs when Chromium/driver policy permits; it is a no-op on Deck's
   single-GPU architecture. Diagnostics explicitly identify software renderers
   so a bad packaged configuration cannot masquerade as a slow physical GPU.

## Safety and interpretation

- GPU timing is diagnostic-only in this slice. It does not change simulation,
  resolution, shadows, or shader state.
- Byte counts are estimates because WebGL does not expose authoritative driver
  VRAM allocation. Compressed mip payloads and typed geometry buffers are
  counted exactly; ordinary textures and framebuffer attachments use documented
  dimensions/format estimates.
- No static PC tier is inferred from GPU model names. Future quality promotion
  should require sustained measured CPU and GPU headroom, with prewarmed shader
  variants and hysteresis.

## Done criteria

- Timer and memory estimator have unit coverage, including unsupported and
  disjoint GPU-query paths, shared resources, compressed textures, and cached
  scans.
- Diagnostics expose GPU milliseconds, estimated bytes, and hardware context.
- Browser smoke/profile, full Vitest suite, and production build remain green.
- A packaged Steam Deck/PC capture is still required before setting automatic
  memory-eviction thresholds or promoting visual quality.

## Browser verification findings

The Chromium/SwiftShader gameplay profile passed with 856 scatter objects and
reported:

- GPU timer extension unavailable: expected for this software renderer, with
  gameplay unaffected and the unsupported state explicit.
- 784.4 MiB potential scene allocation: 757.1 MiB texture uploads and 12.9 MiB
  composer targets across 163 upload configurations / 169 Texture objects.
- 28.27ms measured frame time (35.4 FPS) with the ten-second memory scan absent
  from the sampled CPU hot list.
- Renderer identity correctly flagged SwiftShader rather than presenting it as
  physical-GPU evidence.

The scene estimate is an upper bound over loaded scene resources, not an
authoritative resident-VRAM number. Even so, textures overwhelmingly dominate
the estimate, making KTX2/Basis conversion and an asset-size audit the next
evidence-backed memory task. Automatic eviction/tier promotion remains gated on
a packaged physical PC and Steam Deck capture where GPU timer queries may be
available.

## Verification

- `npx vitest run`: 241 files, 1,952 tests passed.
- `tests/e2e/boot-and-menu.spec.js`: all three WebGL/menu cases passed.
- `tests/e2e/frame-profile.spec.js`: active gameplay profile passed; unsupported
  timer extension and software renderer were reported safely.
- `npm run build`: Vite production build and required-media audit passed without
  warnings.
