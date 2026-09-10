import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { ThreeGame } from './threeGame.js';
import { createSkyProfile } from './sky/skyProfile.js';

function buildFakeLightingRig() {
    const scene = new THREE.Scene();
    const fake = {
        scene,
        playerType: 'soldier',
        player: { position: new THREE.Vector3(0, 0, 0) },
        setupLighting: ThreeGame.prototype.setupLighting,
        updateDirectionalShadowFrustum: ThreeGame.prototype.updateDirectionalShadowFrustum,
        updateSky: ThreeGame.prototype.updateSky,
        applySkyFlash: ThreeGame.prototype.applySkyFlash,
        skyProfile: createSkyProfile(4242),
        skyRig: { update: () => {} },
        timeOfDay: 0.5,
        skyElapsedSeconds: 0,
        currentBiomeKey: 'active',
        biomeMixState: { cryoMix: 0, bioMix: 0 },
        camera: { position: new THREE.Vector3(0, 10, 10) }
    };
    fake.setupLighting();
    return fake;
}

describe('ThreeGame Lighting and Dynamic Shadow Tracking', () => {
    it('sets up high-contrast lighting with directional shadow target', () => {
        const game = buildFakeLightingRig();

        expect(game.directionalLight).toBeDefined();
        expect(game.directionalLightTarget).toBeDefined();
        expect(game.directionalLight.target).toBe(game.directionalLightTarget);
        expect(game.scene.children).toContain(game.directionalLightTarget);

        // Verify contrast ratio is at least 2.5:1
        const contrastRatio = game.directionalLight.intensity / game.ambientLight.intensity;
        expect(contrastRatio).toBeGreaterThanOrEqual(2.5);

        // Verify shadow frustum bounds
        const cam = game.directionalLight.shadow.camera;
        expect(cam.left).toBe(-16);
        expect(cam.right).toBe(16);
        expect(cam.top).toBe(16);
        expect(cam.bottom).toBe(-16);
        expect(game.directionalLight.shadow.bias).toBe(-0.0004);
        expect(game.directionalLight.shadow.normalBias).toBe(0.02);
    });

    it('tracks player position when moving beyond initial spawn frustum', () => {
        const game = buildFakeLightingRig();

        // Player walks far out into the bunker / sector (> 16m from origin)
        game.player.position.set(45, 0, -60);
        game.updateDirectionalShadowFrustum();

        expect(game.directionalLightTarget.position.x).toBe(45);
        expect(game.directionalLightTarget.position.y).toBe(0);
        expect(game.directionalLightTarget.position.z).toBe(-60);

        // Directional light position must remain offset relative to the player
        const offsetX = game.directionalLight.position.x - game.player.position.x;
        const offsetZ = game.directionalLight.position.z - game.player.position.z;
        expect(offsetX).toBeCloseTo(game._sunOffset.x, 2);
        expect(offsetZ).toBeCloseTo(game._sunOffset.z, 2);
        expect(game.directionalLight.position.y).toBeCloseTo(game._sunOffset.y, 2);
    });

    it('syncs shadow camera target during updateSky', () => {
        const game = buildFakeLightingRig();
        game.player.position.set(22, 1.2, 33);
        game.updateSky(0.016);

        expect(game.directionalLightTarget.position.x).toBe(22);
        expect(game.directionalLightTarget.position.z).toBe(33);
    });
});
