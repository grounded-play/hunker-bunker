import * as THREE from 'three';
import { disposeHierarchy } from '../references/memory-and-disposal.js';

/**
 * Creates and initializes a production-ready Three.js application
 * with linear color space, tone mapping, soft shadows, responsive resizing,
 * and a clamped render loop.
 */
export function createThreeApp(container = document.body) {
  // 1. Scene
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0f1117);

  // 2. Camera
  const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 5, 10);

  // 3. Renderer
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // Enable PBR color management and soft shadows
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  container.appendChild(renderer.domElement);

  // 4. Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 1.8);
  dirLight.position.set(10, 20, 10);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.set(2048, 2048);
  dirLight.shadow.bias = -0.0005;
  dirLight.shadow.normalBias = 0.02;

  const d = 15;
  dirLight.shadow.camera.left = -d;
  dirLight.shadow.camera.right = d;
  dirLight.shadow.camera.top = d;
  dirLight.shadow.camera.bottom = -d;
  dirLight.shadow.camera.near = 0.5;
  dirLight.shadow.camera.far = 50;
  scene.add(dirLight);

  // 5. Clamped Loop & Resize
  const clock = new THREE.Clock();
  let animationFrameId = null;

  function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }
  window.addEventListener('resize', onResize);

  function animate() {
    animationFrameId = requestAnimationFrame(animate);

    // Clamp delta time to avoid physics/animation explosions on lag spikes
    const dt = Math.min(clock.getDelta(), 0.1);

    // Application update hook here...

    renderer.render(scene, camera);
  }
  animate();

  // 6. Clean Teardown Method
  function destroy() {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }
    window.removeEventListener('resize', onResize);
    disposeHierarchy(scene);
    scene.clear();
    renderer.dispose();
    renderer.forceContextLoss();
    if (renderer.domElement.parentNode) {
      renderer.domElement.parentNode.removeChild(renderer.domElement);
    }
  }

  return {
    scene,
    camera,
    renderer,
    destroy,
  };
}
