import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
    TraumaManager,
    WEAPON_TRAUMA_TABLE,
    create3DMuzzleFlash,
    computeHitSquashStretch
} from './combatJuice.js';

describe('Combat Juice System', () => {
    describe('TraumaManager', () => {
        it('accumulates trauma and clamps at 1.0', () => {
            const tm = new TraumaManager();
            expect(tm.getTrauma()).toBe(0);

            tm.addTrauma(0.3);
            expect(tm.getTrauma()).toBeCloseTo(0.3);

            tm.addTrauma(0.9);
            expect(tm.getTrauma()).toBe(1.0);
        });

        it('computes squared trauma response and rotational offsets', () => {
            const tm = new TraumaManager();
            tm.addTrauma(0.5);

            const fixedRandom = () => 1.0; // max displacement
            const result = tm.update(0.1, fixedRandom);

            expect(result.offsetX).toBeGreaterThan(0);
            expect(result.roll).toBeGreaterThan(0);
            expect(result.pitch).toBeGreaterThan(0);
            expect(tm.getTrauma()).toBeLessThan(0.5); // decayed
        });

        it('returns zero offsets when trauma reaches zero', () => {
            const tm = new TraumaManager();
            const result = tm.update(0.5);
            expect(result.offsetX).toBe(0);
            expect(result.roll).toBe(0);
        });

        it('provides standard weapon trauma impulses', () => {
            expect(WEAPON_TRAUMA_TABLE.shotgun).toBeGreaterThan(WEAPON_TRAUMA_TABLE.pistol);
            expect(WEAPON_TRAUMA_TABLE.railgun).toBeGreaterThan(WEAPON_TRAUMA_TABLE.rifle);
            expect(WEAPON_TRAUMA_TABLE.explosion).toBeGreaterThan(WEAPON_TRAUMA_TABLE.shotgun);
        });
    });

    describe('create3DMuzzleFlash', () => {
        it('creates a 3D cross-quad flash group with additive blending and particles', () => {
            const camera = new THREE.PerspectiveCamera();
            const flash = create3DMuzzleFlash({ camera, isCryo: false });

            expect(flash.isGroup).toBe(true);
            expect(flash.name).toBe('MuzzleFlash3D');
            expect(flash.userData.is3DMuzzleFlash).toBe(true);
            expect(flash.children.length).toBeGreaterThanOrEqual(4);

            // Verify cross-quad additive mesh
            const mesh = flash.children[0];
            expect(mesh.material.blending).toBe(THREE.AdditiveBlending);
            expect(mesh.material.depthWrite).toBe(false);

            // Update over time and verify fade
            const finished = flash.userData.update(0.2);
            expect(finished).toBe(true);

            flash.userData.dispose();
        });

        it('applies cryo color palette for cryo muzzle flare mutator', () => {
            const flash = create3DMuzzleFlash({ isCryo: true });
            const auraMesh = flash.children[2];
            expect(auraMesh.material.color.getHex()).toBe(0x9beaff);
            flash.userData.dispose();
        });
    });

    describe('computeHitSquashStretch', () => {
        it('calculates directional compression and expansion scales', () => {
            const result = computeHitSquashStretch(0, { x: 1, y: 1, z: 1 });
            expect(result.targetScaleX).toBeGreaterThan(1);
            expect(result.targetScaleZ).toBeLessThan(1);
            expect(result.duration).toBeGreaterThan(0);
        });
    });
});
