// Regression coverage for the log13 shader-recompilation storm
// (docs/log13-gameplay-fps-plan-2026-08-20.md).
//
// The property under test is NOT "the closest lights win" -- that was already
// true. It is that the *number of lights the renderer sees* never changes,
// because three.js bakes `numPointLights` into every material's program cache
// key (WebGLPrograms.js:472-474), so a fluctuating count forces every material
// in view to recompile its shader mid-frame.
import { describe, expect, it, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import { ThreeGame } from './threeGame.js';

function makeGame() {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera();
    camera.position.set(0, 0, 0);
    const game = {
        scene,
        camera,
        envDynamicLights: [],
        _envLightBudgetTimer: 0,
        registerEnvLight: ThreeGame.prototype.registerEnvLight,
        updateEnvLightBudget: ThreeGame.prototype.updateEnvLightBudget,
        _ensureEnvLightPool: ThreeGame.prototype._ensureEnvLightPool
    };
    return game;
}

// What the renderer actually counts: lights reachable from the scene root
// with visible !== false (WebGLRenderer.projectObject bails on visible===false).
function visibleLightCount(scene) {
    let n = 0;
    scene.traverseVisible((o) => { if (o.isLight) n += 1; });
    return n;
}

function addLight(game, x) {
    const light = new THREE.PointLight(0xffffff, 1.5, 6);
    light.position.set(x, 0, 0);
    game.scene.add(light);
    game.registerEnvLight(light);
    return light;
}

describe('env light budget', () => {
    let game;
    beforeEach(() => { game = makeGame(); });

    it('keeps the visible light count identical as lights come and go', () => {
        for (let i = 0; i < 3; i++) addLight(game, i * 2);
        game._envLightBudgetTimer = 0;
        game.updateEnvLightBudget(1);
        const baseline = visibleLightCount(game.scene);

        // Far more lights than the budget.
        for (let i = 0; i < 20; i++) addLight(game, 3 + i * 2);
        game._envLightBudgetTimer = 0;
        game.updateEnvLightBudget(1);
        expect(visibleLightCount(game.scene)).toBe(baseline);

        // And back down again (chunk unloads).
        for (const light of game.envDynamicLights.slice(0, 18)) light.parent?.remove(light);
        game._envLightBudgetTimer = 0;
        game.updateEnvLightBudget(1);
        expect(visibleLightCount(game.scene)).toBe(baseline);
    });

    it('holds the count steady while the camera moves through a light field', () => {
        for (let i = 0; i < 24; i++) addLight(game, i * 3);
        const counts = new Set();
        for (let step = 0; step < 12; step++) {
            game.camera.position.set(step * 6, 0, 0);
            game._envLightBudgetTimer = 0;
            game.updateEnvLightBudget(1);
            counts.add(visibleLightCount(game.scene));
        }
        expect(counts.size).toBe(1);
    });

    it('lights the nearest registered sources and parks the rest at zero intensity', () => {
        const near = addLight(game, 1);
        near.color.set(0xff0000);
        for (let i = 0; i < 15; i++) addLight(game, 50 + i * 5);
        game._envLightBudgetTimer = 0;
        game.updateEnvLightBudget(1);

        const lit = [];
        game.scene.traverseVisible((o) => {
            if (o.isLight && o.userData?.isEnvLightSlot && o.intensity > 0) lit.push(o);
        });
        expect(lit.length).toBeGreaterThan(0);
        // The nearest source's position and colour must be represented.
        const match = lit.find((slot) => Math.abs(slot.position.x - 1) < 1e-6);
        expect(match).toBeDefined();
        expect(match.color.getHex()).toBe(0xff0000);
    });

    it('never leaves a registered source contributing directly', () => {
        for (let i = 0; i < 5; i++) addLight(game, i);
        game._envLightBudgetTimer = 0;
        game.updateEnvLightBudget(1);
        for (const light of game.envDynamicLights) {
            expect(light.visible).toBe(false);
        }
    });

    it('parks disabled or ancestor-hidden sources without changing pool visibility', () => {
        const group = new THREE.Group();
        game.scene.add(group);
        const source = new THREE.PointLight(0xffffff, 2, 6);
        group.add(source);
        game.registerEnvLight(source);

        source.userData.envLightEnabled = false;
        game._envLightBudgetTimer = 0;
        game.updateEnvLightBudget(1);
        expect(game.envLightPool.every((slot) => slot.visible)).toBe(true);
        expect(game.envLightPool.every((slot) => slot.intensity === 0)).toBe(true);

        source.userData.envLightEnabled = true;
        group.visible = false;
        game._envLightBudgetTimer = 0;
        game.updateEnvLightBudget(1);
        expect(game.envLightPool.every((slot) => slot.visible)).toBe(true);
        expect(game.envLightPool.every((slot) => slot.intensity === 0)).toBe(true);
    });

    it('gives only the nearest room-anchor practical a pooled slot', () => {
        const ordinary = addLight(game, 3);
        ordinary.color.set(0xffffff);
        const nearAnchor = addLight(game, 1);
        nearAnchor.color.set(0x5fe3ff);
        nearAnchor.userData.isAnchorPracticalLight = true;
        const farAnchor = addLight(game, 20);
        farAnchor.color.set(0xffa648);
        farAnchor.userData.isAnchorPracticalLight = true;

        game._envLightBudgetTimer = 0;
        game.updateEnvLightBudget(1);
        let litColors = game.envLightPool.filter(({ intensity }) => intensity > 0)
            .map(({ color }) => color.getHex());
        expect(litColors).toContain(0x5fe3ff);
        expect(litColors).toContain(0xffffff);
        expect(litColors).not.toContain(0xffa648);

        game.camera.position.set(22, 0, 0);
        game._envLightBudgetTimer = 0;
        game.updateEnvLightBudget(1);
        litColors = game.envLightPool.filter(({ intensity }) => intensity > 0)
            .map(({ color }) => color.getHex());
        expect(litColors).toContain(0xffa648);
        expect(litColors).not.toContain(0x5fe3ff);
        expect(visibleLightCount(game.scene)).toBe(8);
    });

    it('registers prop FX lights as hidden sources and updates their effects', () => {
        const light = new THREE.PointLight(0xff8844, 1.2, 4);
        light.visible = false;
        const propFx = {
            registered: false,
            lightSources: [light],
            update: vi.fn(),
            dispose: vi.fn()
        };
        const root = new THREE.Group();
        root.userData.propFx = propFx;
        root.add(light);
        game.world3dPropEffects = new Set();
        game.registerWorld3dPropFx = ThreeGame.prototype.registerWorld3dPropFx;
        game.updateWorld3dMixers = ThreeGame.prototype.updateWorld3dMixers;
        game.disposeWorld3dPropFx = ThreeGame.prototype.disposeWorld3dPropFx;

        game.registerWorld3dPropFx(root);
        expect(light.visible).toBe(false);
        expect(light.userData.envLightEnabled).toBe(true);
        expect(game.envDynamicLights).toContain(light);
        game.updateWorld3dMixers(0.016);
        expect(propFx.update).toHaveBeenCalledWith(0.016, game.camera.position);

        game.disposeWorld3dPropFx(root);
        expect(propFx.dispose).toHaveBeenCalledOnce();
        expect(game.world3dPropEffects.size).toBe(0);
    });

    it('registers, acknowledges, updates and disposes per-instance prop presentation', () => {
        const experience = {
            registered: false,
            acknowledge: vi.fn(() => true),
            update: vi.fn(),
            dispose: vi.fn()
        };
        const root = new THREE.Group();
        root.userData.propExperience = experience;
        const source = new THREE.Object3D();
        source.userData.world3dRoot = root;
        game.registerWorld3dPropExperience = ThreeGame.prototype.registerWorld3dPropExperience;
        game.acknowledgePropExperience = ThreeGame.prototype.acknowledgePropExperience;
        game.disposeWorld3dPropExperience = ThreeGame.prototype.disposeWorld3dPropExperience;
        game.updateWorld3dMixers = ThreeGame.prototype.updateWorld3dMixers;

        game.registerWorld3dPropExperience(root);
        expect(game.acknowledgePropExperience(source)).toBe(true);
        expect(experience.acknowledge).toHaveBeenCalledOnce();
        game.updateWorld3dMixers(0.016);
        expect(experience.update).toHaveBeenCalledWith(0.016);

        game.disposeWorld3dPropExperience(root);
        expect(experience.dispose).toHaveBeenCalledOnce();
        expect(game.world3dPropExperiences.size).toBe(0);
    });
});

// QA 2026-10-15 (docs/planning/qa-2026-10-15-pve-coop-session.md): 32-38 s
// Windows freezes. The startup warm-up compiled every material for 25 point
// lights; then three camp beacons, the bed install socket light and the O2
// indicator light (all added straight to the scene, outside the pool) took the
// count to 29, and every material in view recompiled. A retry dipped to 26 and
// back. These sources now go through the pool, so the count never moves.
describe('scene lights outside the pool', () => {
    let game;
    beforeEach(() => {
        game = makeGame();
        Object.assign(game, {
            performanceProfile: 'gameplay',
            carryState: { installed: [] },
            getFirstNightBasePlan: () => ({ installSocket: { transform: { x: 2, z: 3, yaw: 0 } } }),
            getTerrainHeightAt: () => 0,
            updateBaseAtmosphere: () => {},
            registerCampLights: ThreeGame.prototype.registerCampLights
        });
        game._ensureEnvLightPool();
    });

    const directLights = (scene) => {
        const lights = [];
        scene.traverseVisible((o) => { if (o.isLight && !o.userData?.isEnvLightSlot) lights.push(o); });
        return lights;
    };

    it('registers a light once however often it is offered', () => {
        const light = new THREE.PointLight(0xffffff, 1, 4);
        game.scene.add(light);
        game.registerEnvLight(light);
        game.registerEnvLight(light);
        expect(game.envDynamicLights.filter((l) => l === light)).toHaveLength(1);
    });

    it('lights the bed install socket and the O2 indicator through the pool', () => {
        ThreeGame.prototype.setupBedInstallSocketVisual.call(game);
        ThreeGame.prototype.setupBaseAtmosphereIndicator.call(game);
        expect(game.bedInstallSocketVisual.visible).toBe(true);
        expect(game.baseAtmosphereIndicator.visible).toBe(true);
        expect(directLights(game.scene)).toEqual([]);
        expect(game.envDynamicLights).toContain(game.bedInstallSocketVisual.userData.light);
        expect(game.envDynamicLights).toContain(game.baseAtmosphereIndicator.userData.statusLight);
    });

    it('lights camp beacons through the pool', async () => {
        const { SurvivorCamp } = await import('./camp.js');
        const camp = new SurvivorCamp(game.scene, { id: 'camp_a', label: 'CAMP', playerType: 'SCOUT' });
        camp.reveal(4, 4, 0);
        game.registerCampLights(camp);
        expect(camp.beacon).toBeTruthy();
        expect(directLights(game.scene)).toEqual([]);
        expect(game.envDynamicLights).toContain(camp.beacon);
    });
});
