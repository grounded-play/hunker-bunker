# Materials, Custom Shaders & Shader Warmup in Three.js

Three.js provides flexible material workflows ranging from standard PBR to fully customized GLSL vertex and fragment shaders.

---

## 1. Material Hierarchy & Performance

| Material | Cost | Lighting Interaction | Best For |
| :--- | :--- | :--- | :--- |
| `MeshBasicMaterial` | Very Low | None (unlit) | UI elements, reticles, debug shapes, skyboxes, unlit billboards |
| `MeshLambertMaterial` | Low | Gouraud (per-vertex) | Distant low-poly meshes, performance-constrained platforms |
| `MeshStandardMaterial` | Medium | Physically Based (roughness/metalness) | Primary choice for modern games and 3D objects |
| `MeshPhysicalMaterial` | High | Advanced PBR (clearcoat, transmission, sheen) | Hero characters, glass, fluids, car paint, silk |
| `ShaderMaterial` | Custom | Programmable GLSL | Dissolve effects, shield shields, holographic UI, custom terrain |

---

## 2. Modifying Built-in Materials with `onBeforeCompile`

When you want standard lighting, shadows, and environment reflections but need custom vertex distortion (wind, waving grass) or fragment logic (hit flash, sci-fi scanlines), modifying a `MeshStandardMaterial` via `onBeforeCompile` avoids rewriting the entire lighting shader from scratch:

```javascript
const grassMaterial = new THREE.MeshStandardMaterial({
  color: 0x44aa44,
  roughness: 0.8,
});

grassMaterial.userData.time = { value: 0 };

grassMaterial.onBeforeCompile = (shader) => {
  // Pass custom uniform
  shader.uniforms.uTime = grassMaterial.userData.time;

  // Add uniform declaration to vertex shader
  shader.vertexShader = `
    uniform float uTime;
  ` + shader.vertexShader;

  // Inject wind vertex displacement into begin_vertex chunk
  shader.vertexShader = shader.vertexShader.replace(
    '#include <begin_vertex>',
    `
    #include <begin_vertex>
    // Only sway the upper vertices (height > 0)
    if (transformed.y > 0.1) {
      float sway = sin(uTime * 3.0 + transformed.x * 2.0 + transformed.z) * 0.15;
      transformed.x += sway * (transformed.y);
    }
    `
  );
};

// Crucial: define a cache key so Three.js doesn't mistakenly reuse unpatched shaders
grassMaterial.customProgramCacheKey = () => 'grass_wind_v1';
```

---

## 3. Custom GLSL ShaderMaterial Pattern

For completely custom effects (e.g. energy forcefields, portals, dissolves):

```javascript
const shieldMaterial = new THREE.ShaderMaterial({
  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    varying vec2 vUv;

    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      vViewPosition = -mvPosition.xyz;
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: `
    uniform vec3 uColor;
    uniform float uTime;
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    varying vec2 vUv;

    void main() {
      // Fresnel rim calculation
      vec3 normal = normalize(vNormal);
      vec3 viewDir = normalize(vViewPosition);
      float fresnel = 1.0 - max(dot(viewDir, normal), 0.0);
      fresnel = pow(fresnel, 2.5);

      // Hex scan pulse
      float pulse = 0.5 + 0.5 * sin(uTime * 4.0 - vUv.y * 10.0);
      vec3 finalColor = uColor * (fresnel + pulse * 0.3);
      float alpha = clamp(fresnel + pulse * 0.2, 0.0, 0.9);

      gl_FragColor = vec4(finalColor, alpha);
    }
  `,
  uniforms: {
    uColor: { value: new THREE.Color(0x00e5ff) },
    uTime: { value: 0 },
  },
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  side: THREE.DoubleSide,
});
```

---

## 4. Shader Warmup to Prevent First-Hit Stutters

WebGL compiles shaders lazily on the first frame an object is rendered in view of the camera. When a player fires a weapon or encounters an enemy for the first time, compiling shaders on the fly causes a noticeable 50-200ms frame stutter.

**Solution**: Warm up / pre-compile all materials during loading screens:

```javascript
/**
 * Compiles all shaders in the scene before entering gameplay.
 * @param {THREE.WebGLRenderer} renderer
 * @param {THREE.Scene} scene
 * @param {THREE.Camera} camera
 */
export function warmupShaders(renderer, scene, camera) {
  // Three.js built-in scene compiler
  renderer.compile(scene, camera);

  // For off-screen or pooled objects not yet in the scene:
  // Render a 1x1 scratch frame with them in front of the camera
}
```
