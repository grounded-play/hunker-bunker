import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { cameraFrustum, MIXER_SHADOW_REACH_M, shouldStepMixer, stepMixer } from './mixerCulling.js';

function animatedProp(x, z) {
    const scene = new THREE.Scene();
    const root = new THREE.Group();
    const arm = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    arm.name = 'arm';
    root.add(arm);
    root.position.set(x, 0, z);
    scene.add(root);
    const clip = new THREE.AnimationClip('spin', 2, [
        new THREE.NumberKeyframeTrack('arm.position[x]', [0, 1, 2], [0, 1, 0])
    ]);
    const mixer = new THREE.AnimationMixer(root);
    mixer.clipAction(clip).play();
    return { scene, root, arm, mixer };
}

function topDownCamera(x, z) {
    const camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.1, 200);
    camera.position.set(x, 30, z + 20);
    camera.lookAt(x, 0, z);
    camera.updateMatrixWorld(true);
    return camera;
}

describe('world prop mixer culling', () => {
    it('steps a prop in view', () => {
        const { mixer } = animatedProp(0, 0);
        const context = { frustum: cameraFrustum(topDownCamera(0, 0)), playerPosition: new THREE.Vector3(0, 0, 0) };
        expect(shouldStepMixer(mixer, context)).toBe(true);
    });

    it('steps a prop off screen but close enough to cast into the shadow', () => {
        const { mixer } = animatedProp(0, 0);
        const context = { frustum: cameraFrustum(topDownCamera(200, 200)), playerPosition: new THREE.Vector3(MIXER_SHADOW_REACH_M - 2, 0, 0) };
        expect(shouldStepMixer(mixer, context)).toBe(true);
    });

    it('banks time off screen and lands on the same pose as continuous stepping', () => {
        const far = { frustum: cameraFrustum(topDownCamera(200, 200)), playerPosition: new THREE.Vector3(200, 0, 200) };
        const near = { frustum: cameraFrustum(topDownCamera(0, 0)), playerPosition: new THREE.Vector3(0, 0, 0) };
        const culled = animatedProp(0, 0);
        const reference = animatedProp(0, 0);
        for (let i = 0; i < 37; i++) {
            expect(stepMixer(culled.mixer, 0.05, far)).toBe(false);
            reference.mixer.update(0.05);
        }
        expect(stepMixer(culled.mixer, 0.05, near)).toBe(true);
        reference.mixer.update(0.05);
        expect(culled.arm.position.x).toBeCloseTo(reference.arm.position.x, 6);
        expect(culled.mixer.time).toBeCloseTo(reference.mixer.time, 6);
    });

    it('does not step a prop in a hidden chunk', () => {
        const { root, mixer } = animatedProp(0, 0);
        root.parent.visible = false;
        expect(shouldStepMixer(mixer, { frustum: cameraFrustum(topDownCamera(0, 0)), playerPosition: new THREE.Vector3() })).toBe(false);
    });

    it('steps everything when it has no camera or player to judge by', () => {
        const { mixer } = animatedProp(500, 500);
        expect(shouldStepMixer(mixer, {})).toBe(true);
    });
});
