# WebGL Memory Management & Resource Disposal in Three.js

Unlike standard JavaScript garbage collection which cleans up heap memory automatically, **WebGL GPU resources (VRAM) are not freed when JS object references are lost**. If you remove a mesh or switch scenes without calling `.dispose()`, the GPU textures, buffer attributes, and shader programs remain resident in video memory, inevitably leading to browser tab crashes (`WebGL: CONTEXT_LOST_WEBGL`).

---

## What Must Be Disposed?

1. **Geometries**: `geometry.dispose()` frees vertex buffer objects (VBOs) in GPU memory.
2. **Materials**: `material.dispose()` frees the compiled shader program.
3. **Textures**: `texture.dispose()` frees the texture memory on the GPU. Note that disposing a material **does NOT** dispose its attached textures! You must dispose each texture individually (`map`, `normalMap`, `roughnessMap`, `metalnessMap`, `aoMap`, `alphaMap`, `envMap`, `emissiveMap`).
4. **Render Targets**: `renderTarget.dispose()` and `renderTarget.texture.dispose()`.
5. **Post-processing Passes & Composers**: `composer.dispose()`.

---

## Universal Recursive Scene Disposal Helper

Use this production pattern whenever removing subtrees, changing levels, or unmounting Three.js scenes:

```javascript
/**
 * Recursively disposes of a Three.js object hierarchy, releasing all geometries,
 * materials, and attached textures from GPU memory.
 * @param {THREE.Object3D} root
 */
export function disposeHierarchy(root) {
  if (!root) return;

  root.traverse((node) => {
    // 1. Dispose Geometry
    if (node.geometry) {
      node.geometry.dispose();
    }

    // 2. Dispose Materials and their associated textures
    if (node.material) {
      const materials = Array.isArray(node.material) ? node.material : [node.material];

      materials.forEach((mat) => {
        // Dispose all common texture slots
        const textureKeys = [
          'map',
          'alphaMap',
          'aoMap',
          'bumpMap',
          'displacementMap',
          'emissiveMap',
          'envMap',
          'lightMap',
          'metalnessMap',
          'normalMap',
          'roughnessMap',
          'specularMap',
          'gradientMap',
        ];

        textureKeys.forEach((key) => {
          if (mat[key] && typeof mat[key].dispose === 'function') {
            mat[key].dispose();
          }
        });

        // Dispose material itself
        if (typeof mat.dispose === 'function') {
          mat.dispose();
        }
      });
    }

    // 3. Clear custom references or listeners
    if (node.skeleton) {
      node.skeleton.dispose?.();
    }
  });

  // Remove from parent if still attached
  if (root.parent) {
    root.parent.remove(root);
  }
}
```

---

## Full Renderer Teardown & Context Destruction

When completely unmounting a Three.js application or component:

```javascript
export function teardownThreeApp(app) {
  // 1. Stop animation loop
  if (app.animationFrameId) {
    cancelAnimationFrame(app.animationFrameId);
    app.animationFrameId = null;
  }

  // 2. Remove resize and input listeners
  window.removeEventListener('resize', app.onWindowResize);

  // 3. Dispose entire scene graph
  if (app.scene) {
    disposeHierarchy(app.scene);
    app.scene.clear();
  }

  // 4. Dispose EffectComposer and RenderTargets
  if (app.composer) {
    app.composer.dispose?.();
  }

  // 5. Dispose WebGLRenderer
  if (app.renderer) {
    app.renderer.dispose();
    app.renderer.forceContextLoss();
    if (app.renderer.domElement && app.renderer.domElement.parentNode) {
      app.renderer.domElement.parentNode.removeChild(app.renderer.domElement);
    }
    app.renderer = null;
  }
}
```

---

## Auditing Memory Leaks in DevTools

To verify that objects are properly de-allocated:
1. In the console, log `renderer.info.memory`:
   ```javascript
   console.log({
     geometries: renderer.info.memory.geometries,
     textures: renderer.info.memory.textures,
     calls: renderer.info.render.calls,
     triangles: renderer.info.render.triangles,
   });
   ```
2. Spawn/despawn objects in your game or change scenes.
3. Verify that `geometries` and `textures` counts return to baseline rather than continuously climbing monotonically.
