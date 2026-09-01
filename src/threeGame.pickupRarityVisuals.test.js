import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { ThreeGame } from './threeGame.js';

describe('pickup rarity visuals', () => {
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
