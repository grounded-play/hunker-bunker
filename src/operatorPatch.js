import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { assetUrl } from './assetUrl.js';

// Fit once in the model's bind pose, then inherit the chest bone's animation.
// No camera-facing transform or depth override is used for either surface.
export function createOperatorPatch(root, { targetHeight = 1.85, loader = new THREE.TextureLoader() } = {}) {
    root.updateWorldMatrix(true, true);
    const bodyMeshes = [];
    let chest = null;
    root.traverse((object) => {
        if (object.isMesh) bodyMeshes.push(object);
        if (object.isBone && /Spine2$|Chest$/i.test(object.name)) chest = object;
    });
    if (!chest) root.traverse((object) => {
        if (!chest && object.isBone && /Spine1$|Spine$/i.test(object.name)) chest = object;
    });
    const bounds = new THREE.Box3().setFromObject(root);
    const rotation = root.getWorldQuaternion(new THREE.Quaternion());
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(rotation);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(rotation);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(rotation);
    const origin = root.getWorldPosition(new THREE.Vector3());
    origin.y = bounds.min.y;
    const anchor = origin.clone().addScaledVector(up, targetHeight * 0.71)
        .addScaledVector(right, targetHeight * 0.055);
    const ray = new THREE.Raycaster();
    const sample = (x, y) => {
        const start = anchor.clone().addScaledVector(right, x).addScaledVector(up, y)
            .addScaledVector(forward, targetHeight * 2);
        ray.set(start, forward.clone().negate());
        return ray.intersectObjects(bodyMeshes, false)[0];
    };
    const width = targetHeight * 0.082;
    const thickness = targetHeight * 0.0035;
    const gap = targetHeight * 0.004;
    // Corners also sample the armor, preventing a flat patch cutting into a
    // curved breastplate. Respect measured armor depth, with a small clearance for animation.
    const hits = [[0, 0], [-0.35, -0.35], [0.35, -0.35], [-0.35, 0.35], [0.35, 0.35]]
        .map(([x, y]) => sample(x * width, y * width)).filter(Boolean);
    const measuredDepth = hits.length ? Math.max(...hits.map((hit) => hit.point.clone().sub(anchor).dot(forward))) : targetHeight * 0.028;
    const depth = THREE.MathUtils.clamp(measuredDepth, targetHeight * 0.02, targetHeight * 0.16);
    anchor.addScaledVector(forward, depth + gap + thickness / 2);

    const mount = new THREE.Group();
    mount.name = 'OperatorChestPatch';
    mount.visible = false;
    mount.userData.surfaceFitted = hits.length > 0;
    mount.position.copy(anchor);
    mount.quaternion.copy(rotation);
    const backing = new THREE.Mesh(
        new RoundedBoxGeometry(width * 0.94, width * 0.94, thickness, 2, thickness * 0.35),
        new THREE.MeshStandardMaterial({
            color: 0x14181c,
            roughness: 0.92,
            metalness: 0.1,
            depthTest: true,
            depthWrite: true
        })
    );
    backing.name = 'PatchClothBacking';
    const face = new THREE.Mesh(
        new THREE.PlaneGeometry(width, width),
        new THREE.MeshStandardMaterial({
            roughness: 0.85,
            metalness: 0.08,
            transparent: true,
            alphaTest: 0.05,
            side: THREE.FrontSide,
            depthTest: true,
            depthWrite: true
        })
    );
    face.name = 'PatchArtwork';
    face.position.z = thickness / 2 + 0.0006;
    for (const mesh of [backing, face]) {
        mesh.userData.isOperatorPatch = true;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.renderOrder = 7;
        mesh.frustumCulled = false;
        mount.add(mesh);
    }
    // attach() preserves the measured world pose and compensates inherited
    // centimeter rig scales, including community chassis with different units.
    mount.updateMatrixWorld(true);
    (chest || root).attach(mount);
    let generation = 0;
    let disposed = false;
    return {
        root: mount,
        setImage(path) {
            const request = ++generation;
            mount.visible = false;
            face.material.map?.dispose();
            face.material.map = null;
            face.material.needsUpdate = true;
            if (!path || disposed) return;
            loader.load(assetUrl(path), (texture) => {
                if (disposed || request !== generation) { texture.dispose(); return; }
                texture.colorSpace = THREE.SRGBColorSpace;
                face.material.map = texture;
                face.material.needsUpdate = true;
                mount.visible = true;
            }, undefined, () => {
                if (request === generation) mount.visible = false;
            });
        },
        dispose() {
            if (disposed) return;
            disposed = true;
            generation++;
            mount.removeFromParent();
            face.material.map?.dispose();
            for (const mesh of [backing, face]) { mesh.geometry.dispose(); mesh.material.dispose(); }
        }
    };
}
