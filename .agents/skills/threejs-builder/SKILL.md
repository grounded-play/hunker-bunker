---
name: threejs-builder
description: >-
  Comprehensive guide and production patterns for Three.js and WebGL 3D development.
  Use this skill whenever building, modifying, debugging, or optimizing Three.js scenes,
  render pipelines, shaders, PBR materials, lighting & shadow maps, cameras, GLTF/GLB loaders,
  instanced rendering, memory leak prevention, and WebGL performance.
---

# Three.js Builder & 3D WebGL Mastery

This skill provides production-grade architectural patterns, memory management runbooks, and performance optimizations for Three.js and WebGL applications.

---

## The Golden Commandments of Three.js

1. **VRAM Is Not Garbage-Collected Automatically**:
   JavaScript garbage collection only frees CPU references. GPU resources (`Geometry`, `Material`, `Texture`, `RenderTarget`) remain leaked in WebGL VRAM unless explicitly freed via `.dispose()`. Always implement explicit teardown lifecycles.
   👉 See [references/memory-and-disposal.md](references/memory-and-disposal.md) for recursive disposal patterns.

2. **Respect the Draw Call Budget**:
   Every unique mesh, material, or non-instanced object incurs CPU-to-GPU overhead (a draw call). Target **< 50-100 draw calls** for smooth 60-120 FPS.
   - Use `InstancedMesh` for repeated objects (bullets, foliage, enemies, props).
   - Use `BatchedMesh` (Three.js r159+) or `BufferGeometryUtils.mergeGeometries` for static scenery.
   👉 See [references/performance-and-instancing.md](references/performance-and-instancing.md).

3. **Clamp Device Pixel Ratio**:
   Never pass raw `window.devicePixelRatio` without clamping! 3x or 4x Retina screens will cause severe fill-rate bottlenecks.
   ```javascript
   renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
   ```

4. **Clamp Animation Delta Time**:
   Tab switching or lag spikes produce huge `delta` values that can catapult physics objects or break animations. Always clamp:
   ```javascript
   const dt = Math.min(clock.getDelta(), 0.1); // clamp to max 100ms
   ```

5. **Linear Workflow & Color Management**:
   Configure modern color spaces and tone mapping immediately during initialization:
   ```javascript
   renderer.outputColorSpace = THREE.SRGBColorSpace;
   renderer.toneMapping = THREE.ACESFilmicToneMapping;
   renderer.toneMappingExposure = 1.0;
   ```

---

## Architectural Breakdown & Subdocs

Read the following specialized references when working on specific subsystems:

- **Memory Management & Disposal**: [references/memory-and-disposal.md](references/memory-and-disposal.md)
  - Recursive scene disposal, texture de-allocation, WebGL context loss prevention.
- **Performance, Instancing & Batching**: [references/performance-and-instancing.md](references/performance-and-instancing.md)
  - `InstancedMesh`, `BatchedMesh`, frustum culling, LOD, draw call debugging.
- **Lighting & Soft Shadows**: [references/lighting-and-shadows.md](references/lighting-and-shadows.md)
  - Directional light shadow camera frustum sizing, shadow bias & normalBias, PCFSoftShadowMap, HDR environment maps.
- **Materials & Custom Shaders**: [references/materials-and-shaders.md](references/materials-and-shaders.md)
  - `MeshStandardMaterial` vs `MeshPhysicalMaterial`, `onBeforeCompile` chunk injection, custom GLSL `ShaderMaterial`, shader warmup.
- **Asset Loading & GLTF Pipelines**: [references/asset-loading-and-draco.md](references/asset-loading-and-draco.md)
  - `GLTFLoader`, `DRACOLoader`, `KTX2Loader`, model bounding box normalization, animation mixers.
- **Cameras & Controls**: [references/cameras-and-controls.md](references/cameras-and-controls.md)
  - Smooth follow third-person camera (damped lerp/slerp), camera occlusion raycasting, resize handling.

---

## Standard Boilerplate Template

For a clean, battle-tested setup with responsive resizing, tone mapping, and teardown support, refer to:
👉 [examples/boilerplate-scene.js](examples/boilerplate-scene.js)
