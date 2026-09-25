# Lighting, Shadows & PBR Tone Mapping in Three.js

Properly configured lighting and shadows make the difference between a flat, amateur WebGL render and a cinematic, immersive game world.

---

## 1. Renderer Setup for Photorealistic PBR

```javascript
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // smooth, realistic penumbra
renderer.outputColorSpace = THREE.SRGBColorSpace; // correct linear-to-sRGB conversion
renderer.toneMapping = THREE.ACESFilmicToneMapping; // filmic highlight compression
renderer.toneMappingExposure = 1.0;
```

---

## 2. DirectionalLight Shadow Optimization

The most common mistake with `DirectionalLight` shadows is leaving the shadow camera frustum at default settings, which wastes shadow map resolution on areas off-screen or causes low-res blocky shadows.

### Tight Frustum Sizing & Bias Tuning

```javascript
const sunLight = new THREE.DirectionalLight(0xffffff, 2.5);
sunLight.position.set(30, 50, 30);
sunLight.castShadow = true;

// Shadow Map Resolution (balance performance vs sharpness)
sunLight.shadow.mapSize.width = 2048;
sunLight.shadow.mapSize.height = 2048;

// Tightly bound the orthographic shadow camera around the gameplay area
const d = 30; // half-width of active area
sunLight.shadow.camera.left = -d;
sunLight.shadow.camera.right = d;
sunLight.shadow.camera.top = d;
sunLight.shadow.camera.bottom = -d;
sunLight.shadow.camera.near = 0.5;
sunLight.shadow.camera.far = 150;

// ELIMINATE SHADOW ACNE & PETER-PANNING:
// normalBias offsets shadow sampling along geometry surface normals
sunLight.shadow.bias = -0.0005;
sunLight.shadow.normalBias = 0.03;

scene.add(sunLight);
```

### Static Shadow Optimization
If lighting and world geometry do not change every frame, stop re-rendering the shadow map on every tick:

```javascript
// Render shadow map once, then freeze:
renderer.shadowMap.autoUpdate = false;
renderer.shadowMap.needsUpdate = true; // call only when lights or static casters move
```

---

## 3. High Dynamic Range (HDR) Environment Maps

For PBR materials (`MeshStandardMaterial` and `MeshPhysicalMaterial`), metallic reflections and roughness reflections rely heavily on an environment map.

```javascript
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

export function loadEnvironment(scene, renderer, hdrUrl) {
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  pmremGenerator.compileEquirectangularShader();

  new RGBELoader().load(hdrUrl, (texture) => {
    const envMap = pmremGenerator.fromEquirectangular(texture).texture;
    scene.environment = envMap;
    // scene.background = envMap; // if skybox is desired

    texture.dispose();
    pmremGenerator.dispose();
  });
}
```

---

## 4. Cast vs Receive Shadows Strategy

Shadow map passes are expensive. Follow these rules:
- **Players, Enemies, Bosses**: `castShadow = true`, `receiveShadow = true`.
- **Large Ground, Walls, Floors**: `castShadow = false`, `receiveShadow = true`.
- **Small Debris, Decals, Foliage, Particles**: `castShadow = false`, `receiveShadow = false`.
- **Static Lights**: Limit dynamic point lights casting shadows (`pointLight.castShadow`) to at most 1-2 hero lights. Point light shadows generate an expensive 6-sided cubemap.
