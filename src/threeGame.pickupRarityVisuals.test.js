import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { GAMEPLAY_BLOOM, PICKUP_RARITY_EMISSIVE, ThreeGame, pickupIdleGlowOpacity } from './threeGame.js';

describe('pickup rarity visuals', () => {
    // 2026-10-14 playtest: pickups read as blown-out white domes. The rarity
    // accent is a tint and a soft ring, not a light source.
    it('keeps the default rarity glow subtle', () => {
        const body = new THREE.Group();
        const core = new THREE.Mesh(
            new THREE.BoxGeometry(1, 1, 1),
            new THREE.MeshStandardMaterial({ color: 0xd9d7c5, emissive: 0x000000, emissiveIntensity: 0.1 })
        );
        body.add(core);
        const pickup = new THREE.Group();
        pickup.userData = { body, glow: null, shadow: null, burst: null, rarity: { key: 'basic', color: 0xb7c3d0 } };
        pickup.add(body);
        ThreeGame.prototype.applyPickupRarityVisuals.call({}, pickup);
        expect(PICKUP_RARITY_EMISSIVE).toBeLessThanOrEqual(0.4);
        expect(core.material.emissiveIntensity).toBeCloseTo(PICKUP_RARITY_EMISSIVE, 5);
        // The pickup meshes ship with their own emissive (0.72-0.85 for
        // health and weapon bodies); the rarity pass sets the accent strength
        // rather than only raising it, or those stay blown out.
        const hot = new THREE.Mesh(
            new THREE.BoxGeometry(1, 1, 1),
            new THREE.MeshStandardMaterial({ color: 0xd9a6b3, emissive: 0xada9b5, emissiveIntensity: 0.85 })
        );
        const hotBody = new THREE.Group();
        hotBody.add(hot);
        const hotPickup = new THREE.Group();
        hotPickup.userData = { body: hotBody, glow: null, shadow: null, burst: null, rarity: { key: 'basic', color: 0xb7c3d0 } };
        ThreeGame.prototype.applyPickupRarityVisuals.call({}, hotPickup);
        expect(hot.material.emissiveIntensity).toBeCloseTo(PICKUP_RARITY_EMISSIVE, 5);
        hot.geometry.dispose();
        hot.material.dispose();
        for (let t = 0; t < 4; t += 0.05) {
            const opacity = pickupIdleGlowOpacity(t, 1.3);
            expect(opacity).toBeGreaterThan(0.15);
            expect(opacity).toBeLessThanOrEqual(0.4);
        }
        core.geometry.dispose();
        core.material.dispose();
    });

    // The composer renders into a half-float target, so lit surfaces exceed
    // 1.0 before tone mapping; a threshold under ~1 blooms the whole set.
    it('blooms only genuine emissives, with a restrained halo', () => {
        expect(GAMEPLAY_BLOOM.threshold).toBeGreaterThanOrEqual(1.5);
        expect(GAMEPLAY_BLOOM.strength).toBeLessThanOrEqual(0.5);
        expect(GAMEPLAY_BLOOM.radius).toBeLessThanOrEqual(0.4);
    });

    it('tints the pickup body and emissive channel to the rarity color', () => {
        const body = new THREE.Group();
        const core = new THREE.Mesh(
            new THREE.BoxGeometry(1, 1, 1),
            new THREE.MeshStandardMaterial({
                color: 0xffcc58,
                emissive: 0x221100,
                emissiveIntensity: 0.2
            })
        );
        const glow = new THREE.Mesh(
            new THREE.RingGeometry(0.2, 0.4),
            new THREE.MeshBasicMaterial({ color: 0xffffff })
        );
        body.add(core, glow);

        const pickup = new THREE.Group();
        pickup.userData = {
            body,
            glow,
            shadow: null,
            burst: null,
            rarity: { key: 'rare', color: 0x58bbff, emissiveIntensity: 1.1 }
        };
        pickup.add(body);

        ThreeGame.prototype.applyPickupRarityVisuals.call({}, pickup);

        expect(core.material.userData.pickupRarityColor).toBe(0x58bbff);
        expect(core.material.emissiveIntensity).toBe(1.1);
        expect(core.material.color.b).toBeGreaterThan(core.material.color.r);
        expect(glow.material.userData.pickupRarityColor).toBeUndefined();

        core.geometry.dispose();
        core.material.dispose();
        glow.geometry.dispose();
        glow.material.dispose();
    });
});
