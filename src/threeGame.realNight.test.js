import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { ThreeGame } from './threeGame.js';

function createNightTestGame(overrides = {}) {
    const baseLightIntensity = {
        ambient: 1.0,
        directional: 1.5,
        fill: 0.8,
        characterRimLight: 0.5,
        playerGlow: 0.8
    };

    const game = {
        baseLightIntensity,
        ambientLight: new THREE.AmbientLight(0xffffff, baseLightIntensity.ambient),
        directionalLight: new THREE.DirectionalLight(0xffffff, baseLightIntensity.directional),
        fillLight: new THREE.DirectionalLight(0xffffff, baseLightIntensity.fill),
        characterRimLight: new THREE.DirectionalLight(0xffffff, baseLightIntensity.characterRimLight),
        playerGlow: { intensity: baseLightIntensity.playerGlow, distance: 10, decay: 1.5 },
        suitFillLight: { intensity: 1.0, distance: 10, decay: 1.2, color: new THREE.Color(0xffffff) },
        playerForwardSpotLight: { intensity: 3.6, distance: 10, angle: 0.5, color: new THREE.Color(0xffffff) },
        playerForwardCone: { material: { opacity: 0.3 } },
        playerLightPool: { material: { opacity: 0.3 } },
        scene: {
            fog: new THREE.Fog(0x223344, 20, 50),
            background: new THREE.Color(0x223344)
        },
        baseFogRange: { near: 20, far: 50 },
        timeOfDay: 0.0,
        dayCycleSeconds: 120,
        nightVision: false,
        userBrightness: 1.0,
        biomeMixState: { bioMix: 0, cryoMix: 0 },
        isGameplayInputActive: () => false,
        getDayFactor: () => 0.0,
        updatePlayerDarkness: () => {},
        updateDayNightCycle: ThreeGame.prototype.updateDayNightCycle,
        ...overrides
    };

    return game;
}

describe('ThreeGame L1: Real night tuning', () => {
    it('drops ambient to ~20% and directional to ~10% at night', () => {
        const game = createNightTestGame({
            getDayFactor: () => 0.0 // midnight
        });

        game.updateDayNightCycle(0);

        // Ambient drops to ~20% (clamped at floor ~0.18 for brightness 1.0)
        expect(game.ambientLight.intensity).toBeCloseTo(0.20, 2);
        // Directional drops to ~10%
        expect(game.directionalLight.intensity).toBeCloseTo(0.15, 2); // 1.5 * 0.10
    });

    it('restores full daylight intensity at noon', () => {
        const game = createNightTestGame({
            getDayFactor: () => 1.0 // noon
        });

        game.updateDayNightCycle(0);

        expect(game.ambientLight.intensity).toBeCloseTo(1.0, 2);
        expect(game.directionalLight.intensity).toBeCloseTo(1.5, 2);
    });

    it('tints directional light towards cold blue moonlight at night', () => {
        const game = createNightTestGame({
            getDayFactor: () => 0.0
        });

        game.updateDayNightCycle(0);

        // Moonlight color is 0x3d6699 (r ~ 0.24, g ~ 0.40, b ~ 0.60)
        // With lerp (1.0 - dayBlend) * 0.75, blue channel should dominate red
        expect(game.directionalLight.color.b).toBeGreaterThan(game.directionalLight.color.r);
    });

    it('adds faint green bioluminescent floor glow in the bio ring at night', () => {
        const game = createNightTestGame({
            getDayFactor: () => 0.0,
            biomeMixState: { bioMix: 0.9, cryoMix: 0 }
        });

        game.updateDayNightCycle(0);

        // Bio glow is 0x113318 (greenish), lerped into ambient light color
        expect(game.ambientLight.color.g).toBeGreaterThan(game.ambientLight.color.r);
    });

    it('widens and warms the suit light profile at night for player readability', () => {
        const nightGame = createNightTestGame({ getDayFactor: () => 0.0 });
        const dayGame = createNightTestGame({ getDayFactor: () => 1.0 });

        nightGame.updateDayNightCycle(0);
        dayGame.updateDayNightCycle(0);

        // Spot angle is wider at night (1.30 vs 0.92 multiplier)
        expect(nightGame.playerForwardSpotLight.angle).toBeGreaterThan(dayGame.playerForwardSpotLight.angle);
        // Spot distance is farther at night (1.35 vs 0.88 multiplier)
        expect(nightGame.playerForwardSpotLight.distance).toBeGreaterThan(dayGame.playerForwardSpotLight.distance);
        // Suit light color is warmer (more red than blue)
        expect(nightGame.playerForwardSpotLight.color.r).toBeGreaterThan(nightGame.playerForwardSpotLight.color.b);
    });

    it('tightens and darkens fog at night', () => {
        const nightGame = createNightTestGame({ getDayFactor: () => 0.0 });
        const dayGame = createNightTestGame({ getDayFactor: () => 1.0 });

        nightGame.updateDayNightCycle(0);
        dayGame.updateDayNightCycle(0);

        expect(nightGame.scene.fog.near).toBeLessThan(dayGame.scene.fog.near);
        expect(nightGame.scene.fog.far).toBeLessThan(dayGame.scene.fog.far);
        // Night fog is darker (lower luminance)
        const nightFogLum = nightGame.scene.fog.color.r + nightGame.scene.fog.color.g + nightGame.scene.fog.color.b;
        const dayFogLum = dayGame.scene.fog.color.r + dayGame.scene.fog.color.g + dayGame.scene.fog.color.b;
        expect(nightFogLum).toBeLessThan(dayFogLum);
    });

    it('respects user brightness setting to ensure playable floor', () => {
        const darkGame = createNightTestGame({
            baseLightIntensity: { ambient: 0.05, directional: 0.05, fill: 0.05, characterRimLight: 0.05, playerGlow: 0.05 },
            userBrightness: 1.5,
            getDayFactor: () => 0.0
        });

        darkGame.updateDayNightCycle(0);

        // Clamped by minAmbientFloor = 0.18 * 1.5 = 0.27
        expect(darkGame.ambientLight.intensity).toBeGreaterThanOrEqual(0.25);
    });

    // Capture 2026-10-07: updateSky runs after this and resets the fog to the
    // horizon colour every frame, so night came out washed-out grey-cream.
    it('keeps the fog dark at night after the sky sets its colour', () => {
        const game = createNightTestGame({ getDayFactor: () => 0.0 });
        game.updateDayNightCycle(0);
        game.scene.fog.color.setHex(0xc8c0b0); // what the sky's horizon colour wrote
        game.applyNightFog = ThreeGame.prototype.applyNightFog;
        game.applyNightFog();
        const { r, g, b } = game.scene.fog.color;
        expect(Math.max(r, g, b)).toBeLessThan(0.25);
    });

    it('leaves the daytime fog colour alone', () => {
        const game = createNightTestGame({ getDayFactor: () => 1.0 });
        game.updateDayNightCycle(0);
        game.scene.fog.color.setHex(0xc8c0b0);
        game.applyNightFog = ThreeGame.prototype.applyNightFog;
        game.applyNightFog();
        expect(game.scene.fog.color.getHex()).toBe(0xc8c0b0);
    });

    it('lights a pool around the operator at night, not a floodlight', () => {
        const night = createNightTestGame({ getDayFactor: () => 0.0 });
        const day = createNightTestGame({ getDayFactor: () => 1.0 });
        night.updateDayNightCycle(0);
        day.updateDayNightCycle(0);
        expect(night.suitFillLight.intensity / day.suitFillLight.intensity).toBeLessThanOrEqual(1.84);
        expect(night.playerForwardSpotLight.intensity / day.playerForwardSpotLight.intensity).toBeLessThanOrEqual(1.67);
    });
});

