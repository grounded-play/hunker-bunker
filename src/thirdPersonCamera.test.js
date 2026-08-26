import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { clampCameraPositionToHit, computeMouseEdgeTurn, getThirdPersonCameraPose } from './thirdPersonCamera.js';

describe('third-person camera rig', () => {
    it('keeps a broad center workspace stable and ramps turning at screen edges', () => {
        expect(computeMouseEdgeTurn(500, 0, 1000)).toBe(0);
        expect(computeMouseEdgeTurn(750, 0, 1000)).toBe(0);
        const nearRightEdge = computeMouseEdgeTurn(900, 0, 1000);
        expect(nearRightEdge).toBeGreaterThan(0);
        expect(nearRightEdge).toBeLessThan(1);
        expect(computeMouseEdgeTurn(1000, 0, 1000)).toBe(1);
        expect(computeMouseEdgeTurn(0, 0, 1000)).toBe(-1);
    });

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
