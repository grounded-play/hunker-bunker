import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

const renderer = new THREE.WebGLRenderer({ canvas: document.querySelector('canvas'), alpha: true, antialias: true, preserveDrawingBuffer: true });
renderer.setSize(320, 320);
renderer.setPixelRatio(1);
renderer.setClearColor(0x000000, 0);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.4;
const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);

window.renderArmoryPreview = async (url) => {
    const gltf = await loader.loadAsync(url);
    const scene = new THREE.Scene();
    const model = gltf.scene;
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const scale = 1.7 / Math.max(size.x, size.y, size.z, .001);
    model.scale.multiplyScalar(scale);
    box.setFromObject(model);
    model.position.sub(box.getCenter(new THREE.Vector3()));
    scene.add(model);
    scene.add(new THREE.HemisphereLight(0xdaedff, 0x77706a, 2.5));
    const key = new THREE.DirectionalLight(0xffffff, 3.8);
    key.position.set(2, 3, 5);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x8ddcff, 2.8);
    rim.position.set(-3, 1, -2);
    scene.add(rim);
    const camera = new THREE.OrthographicCamera(-1.03, 1.03, 1.03, -1.03, .1, 20);
    camera.position.set(.55, .25, 5);
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
    const png = renderer.domElement.toDataURL('image/png').split(',')[1];
    const textures = new Set();
    const materials = new Set();
    model.traverse((mesh) => {
        mesh.geometry?.dispose();
        for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
            if (!material) continue;
            materials.add(material);
            for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
        }
    });
    for (const texture of textures) { texture.dispose(); texture.source?.data?.close?.(); }
    for (const material of materials) material.dispose();
    renderer.renderLists.dispose();
    return png;
};
