# Asset Loading, GLTF Pipelines & DRACO Compression

Modern Three.js applications load 3D assets predominantly via GLTF/GLB formats, often compressed using DRACO or meshopt to dramatically reduce bandwidth.

---

## 1. Setting Up GLTFLoader with DRACOLoader

In modern bundler environments (Vite, Webpack, etc.), DRACO WebAssembly decoders must be pointed to public static paths:

```javascript
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

// Setup loader singleton
const dracoLoader = new DRACOLoader();
// Set path to where draco decoders are hosted (usually in public/draco/ or from unpkg/cdn)
dracoLoader.setDecoderPath('/draco/');
dracoLoader.preload();

export const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);
```

---

## 2. Robust Model Asset Manager with Cache & Clone

When loading characters or props that will be spawned multiple times, you must clone the model hierarchy. Standard `mesh.clone()` does not clone bone skeletons or materials properly. Use `SkeletonUtils.clone`:

```javascript
import * as THREE from 'three';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { gltfLoader } from './loaders.js';

class AssetManager {
  constructor() {
    this.cache = new Map();
  }

  async loadModel(url) {
    if (this.cache.has(url)) {
      const gltf = this.cache.get(url);
      return this.instantiate(gltf);
    }

    return new Promise((resolve, reject) => {
      gltfLoader.load(
        url,
        (gltf) => {
          this.cache.set(url, gltf);
          resolve(this.instantiate(gltf));
        },
        undefined,
        reject
      );
    });
  }

  instantiate(gltf) {
    // Correctly clones skinned meshes, bones, and hierarchies
    const model = SkeletonUtils.clone(gltf.scene);
    
    // Enable shadows across all meshes
    model.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    return {
      model,
      animations: gltf.animations || [],
    };
  }
}

export const assetManager = new AssetManager();
```

---

## 3. Normalizing Model Scale & Centering

Imported 3D models from Blender or artists frequently have arbitrary origins or scale. Automatically normalize them with `THREE.Box3`:

```javascript
export function normalizeModelBounds(model, targetHeight = 2.0) {
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());

  // Center model origin at its feet (y = 0)
  model.position.x = -center.x;
  model.position.z = -center.z;
  model.position.y = -box.min.y;

  // Scale uniformly to desired world units
  if (size.y > 0) {
    const scaleFactor = targetHeight / size.y;
    model.scale.setScalar(scaleFactor);
  }

  // Wrap in a parent group so position transforms work predictably
  const wrapper = new THREE.Group();
  wrapper.add(model);
  return wrapper;
}
```

---

## 4. Animation Mixer & Cross-Fading

Managing skeletal animations (Idle, Run, Jump, Attack) smoothly without popping:

```javascript
export class CharacterAnimator {
  constructor(model, clips) {
    this.mixer = new THREE.AnimationMixer(model);
    this.actions = new Map();
    this.currentAction = null;

    clips.forEach((clip) => {
      const action = this.mixer.clipAction(clip);
      this.actions.set(clip.name, action);
    });
  }

  play(name, crossFadeDuration = 0.2) {
    const nextAction = this.actions.get(name);
    if (!nextAction || nextAction === this.currentAction) return;

    nextAction.reset();
    nextAction.enabled = true;

    if (this.currentAction) {
      this.currentAction.crossFadeTo(nextAction, crossFadeDuration, true);
    } else {
      nextAction.play();
    }

    this.currentAction = nextAction;
  }

  update(dt) {
    this.mixer.update(dt);
  }

  dispose() {
    this.mixer.stopAllAction();
    this.mixer.uncacheRoot(this.mixer.getRoot());
  }
}
```
