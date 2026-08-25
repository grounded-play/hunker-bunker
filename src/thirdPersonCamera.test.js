import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { clampCameraPositionToHit, getThirdPersonCameraPose } from './thirdPersonCamera.js';

describe('third-person camera rig', () => {
    it('places the camera behind and to the right of its focus', () => {
        const pose = getThirdPersonCameraPose({
            playerPosition: new THREE.Vector3(10, 0, 20),
            planarForward: new THREE.Vector2(0, 1),
            planarRight: new THREE.Vector2(1, 0)
        });
        expect(pose.position.x).toBeGreaterThan(10);
        expect(pose.position.y).toBeGreaterThan(pose.focus.y);
        expect(pose.position.z).toBeLessThan(20);
        expect(pose.lookAt.z).toBeGreaterThan(20);
    });

    it('pulls the camera in front of a wall hit with padding', () => {
        const focus = new THREE.Vector3(0, 1, 0);
        const desired = new THREE.Vector3(0.7, 3, -5);
        const resolved = clampCameraPositionToHit(focus, desired, 2.5);
        expect(resolved.distanceTo(focus)).toBeCloseTo(2.28, 5);
        expect(resolved.distanceTo(focus)).toBeLessThan(desired.distanceTo(focus));
    });

    it('keeps the desired position when no obstruction is closer', () => {
        const focus = new THREE.Vector3(0, 1, 0);
        const desired = new THREE.Vector3(0.7, 3, -5);
        expect(clampCameraPositionToHit(focus, desired, 20)).toEqual(desired);
    });
});
