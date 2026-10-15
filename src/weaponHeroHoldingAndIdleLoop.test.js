import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { getWeaponCalibration, getWeaponScaleForBounds } from './weaponCalibration.js';

describe('Weapon Holding Orientation and Idle Stance Verification', () => {
    const archetypes = ['gg1', 'talon', 'talon_c', 'siege_breaker', 'tesla_lock'];

    it('calibrates every weapon archetype to sit upright in RightHand with sights facing up', () => {
        for (const arch of archetypes) {
            const cal = getWeaponCalibration(arch, 'gameplay');

            // 1. Barrel / muzzle must point forward along +Y (hand aim direction)
            const muzzleVector = new THREE.Vector3(1, 0, 0).applyEuler(new THREE.Euler(...cal.rotation));
            const forwardHandAim = new THREE.Vector3(0, 1, 0);
            expect(THREE.MathUtils.radToDeg(muzzleVector.angleTo(forwardHandAim))).toBeLessThanOrEqual(1.0);

            // 2. Sight / top rail must point upward along +X (up towards thumb web/sky)
            const sightAxisVector = cal.sightAxis === '-Z' ? new THREE.Vector3(0, 0, -1) : new THREE.Vector3(0, 1, 0);
            const handSight = sightAxisVector.applyEuler(new THREE.Euler(...cal.rotation));
            const upwardHand = new THREE.Vector3(1, 0, 0);
            expect(THREE.MathUtils.radToDeg(handSight.angleTo(upwardHand))).toBeLessThanOrEqual(1.0);

            // 3. Grip / magazine must point downward along -X (down into the palm and out bottom of fist)
            const gripAxisVector = cal.sightAxis === '-Z' ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(0, -1, 0);
            const handGrip = gripAxisVector.applyEuler(new THREE.Euler(...cal.rotation));
            const downwardHand = new THREE.Vector3(-1, 0, 0);
            expect(THREE.MathUtils.radToDeg(handGrip.angleTo(downwardHand))).toBeLessThanOrEqual(1.0);

            // 4. Lateral offset (Z in hand space) must be snug to the palm (within 3 cm, not sticking outside)
            expect(Math.abs(cal.position[2])).toBeLessThanOrEqual(0.03);

            // 5. Forward offset (Y in hand space) must place the grip forward of the wrist (positive Y)
            expect(cal.position[1]).toBeGreaterThan(0.05);
            expect(cal.position[1]).toBeLessThan(0.12);
        }
    });

    it('keeps free-standing turntable rotations level for armory and reward contexts', () => {
        for (const arch of archetypes) {
            const armoryCal = getWeaponCalibration(arch, 'armory');
            const rewardCal = getWeaponCalibration(arch, 'reward');
            expect(armoryCal.rotation).toEqual([0, 0, 0]);
            expect(rewardCal.rotation).toEqual([0, 0, 0]);
        }
    });

    it('preserves archetype scale bounds within valid handheld ranges', () => {
        for (const arch of archetypes) {
            const scale = getWeaponScaleForBounds([1.15, 0.45, 0.10], arch, 'gameplay');
            expect(scale).toBeGreaterThan(0.3);
            expect(scale).toBeLessThan(1.2);
        }
    });
});
