import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { ThreeGame } from './threeGame.js';
import { createSkyProfile } from './sky/skyProfile.js';

// Same .call() pattern as the other threeGame.*.test.js files -- no live WebGL
// context here, so the sky rig is stubbed and only the wiring is asserted.
function buildFakeGame(overrides = {}) {
    return {
        runEntropy: 4242,
        timeOfDay: 0.5,
        skyElapsedSeconds: 0,
        currentBiomeKey: 'active',
        biomeMixState: { cryoMix: 0, bioMix: 0 },
        skyProfile: createSkyProfile(4242),
        skyRig: { update: vi.fn(), group: new THREE.Group(), dispose: vi.fn() },
        camera: { position: new THREE.Vector3(12, 2, -30) },
        scene: { fog: new THREE.Fog(0x000000, 10, 28) },
        directionalLight: new THREE.DirectionalLight(0xffffff, 1),
        // updateSky calls this on itself; the .call() pattern means the fake
        // has to carry collaborating methods explicitly.
        applySkyFlash: ThreeGame.prototype.applySkyFlash,
        playSkyTransient: ThreeGame.prototype.playSkyTransient,
        skyEvents: [],
        ...overrides
    };
}

describe('ThreeGame.playSkyTransient', () => {
    it('queues a director beat so it plays on the next sky update', () => {
        const fake = buildFakeGame();
        ThreeGame.prototype.playSkyTransient.call(fake, 'sky_fx_mothership_transit');
        ThreeGame.prototype.updateSky.call(fake, 0.016);
        expect(fake.skyState.transients[0].sheetId).toBe('sky_fx_mothership_transit');
    });

    it('refuses an atlas that is not in the manifest rather than queueing junk', () => {
        const fake = buildFakeGame();
        expect(ThreeGame.prototype.playSkyTransient.call(fake, 'not_a_sheet')).toBe(false);
        expect(fake.skyEvents).toHaveLength(0);
    });

    it('forgets a beat once it has finished, so the queue cannot grow forever', () => {
        const fake = buildFakeGame();
        ThreeGame.prototype.playSkyTransient.call(fake, 'sky_fx_sun_gutter', { duration: 3 });
        ThreeGame.prototype.updateSky.call(fake, 1);
        expect(fake.skyEvents).toHaveLength(1);
        ThreeGame.prototype.updateSky.call(fake, 30);
        expect(fake.skyEvents).toHaveLength(0);
    });
});

describe('ThreeGame.updateSky', () => {
    it('advances its own elapsed clock so weather fronts arrive on schedule', () => {
        const fake = buildFakeGame();
        ThreeGame.prototype.updateSky.call(fake, 0.5);
        expect(fake.skyElapsedSeconds).toBeCloseTo(0.5, 6);
    });

    it('drives the rig with the current biome and camera position', () => {
        const fake = buildFakeGame();
        ThreeGame.prototype.updateSky.call(fake, 0.016);
        const [args] = fake.skyRig.update.mock.calls[0];
        expect(args.biomeKey).toBe('active');
        expect(args.cameraPosition).toBe(fake.camera.position);
    });

    it('matches the fog colour to the sky horizon so the world dissolves into its own sky', () => {
        const fake = buildFakeGame();
        ThreeGame.prototype.updateSky.call(fake, 0.016);
        expect(fake.scene.fog.color.r).toBeCloseTo(fake.skyState.horizonColor.r, 5);
        expect(fake.scene.fog.color.b).toBeCloseTo(fake.skyState.horizonColor.b, 5);
    });

    it('points the directional light along the sun direction at noon', () => {
        const fake = buildFakeGame({ timeOfDay: 0.5 });
        ThreeGame.prototype.updateSky.call(fake, 0.016);
        const position = fake.directionalLight.position.clone().normalize();
        expect(position.y).toBeCloseTo(fake.skyState.sunDirection.y, 2);
    });

    it('never lets the key light drop below the horizon at night', () => {
        // A sun direction of y < 0 would light every surface from underground.
        // Intensity, not direction, is what makes night dark -- that is already
        // tuned in updateDayNightCycle and must stay its job.
        const fake = buildFakeGame({ timeOfDay: 0 });
        ThreeGame.prototype.updateSky.call(fake, 0.016);
        expect(fake.skyState.sunDirection.y).toBeLessThan(0);
        expect(fake.directionalLight.position.y).toBeGreaterThan(0);
    });

    it('leaves the light intensity alone, since the day/night cycle owns it', () => {
        const fake = buildFakeGame();
        fake.directionalLight.intensity = 2.3;
        ThreeGame.prototype.updateSky.call(fake, 0.016);
        expect(fake.directionalLight.intensity).toBe(2.3);
    });

    it('passes delta to the rig so the cloud animation advances', () => {
        const fake = buildFakeGame();
        ThreeGame.prototype.updateSky.call(fake, 0.032);
        expect(fake.skyRig.update.mock.calls[0][0].delta).toBeCloseTo(0.032, 6);
    });

    it('adds the lightning flash to the key light so a strike lights the world', () => {
        const fake = buildFakeGame();
        fake.directionalLight.intensity = 2;
        ThreeGame.prototype.updateSky.call(fake, 0.016);
        const unlit = fake.directionalLight.intensity;
        // Force a flash rather than waiting for the seeded schedule to fire.
        fake.skyProfile = { ...fake.skyProfile };
        fake.directionalLight.intensity = 2;
        ThreeGame.prototype.applySkyFlash.call(fake, 1);
        expect(fake.directionalLight.intensity).toBeGreaterThan(unlit);
    });

    it('leaves the key light untouched when there is no flash', () => {
        const fake = buildFakeGame();
        fake.directionalLight.intensity = 2;
        ThreeGame.prototype.applySkyFlash.call(fake, 0);
        expect(fake.directionalLight.intensity).toBe(2);
    });

    it('does nothing when the rig has not been built', () => {
        const fake = buildFakeGame({ skyRig: null });
        expect(() => ThreeGame.prototype.updateSky.call(fake, 0.016)).not.toThrow();
    });

    it('publishes the computed state so other systems can read the sky', () => {
        const fake = buildFakeGame();
        ThreeGame.prototype.updateSky.call(fake, 0.016);
        expect(fake.skyState.weatherState).toBeTypeOf('string');
        expect(fake.skyState.dayFactor).toBeGreaterThanOrEqual(0);
    });
});
