// Regression coverage for the log13 shader-recompilation storm
// (docs/log13-gameplay-fps-plan-2026-08-20.md).
//
// The property under test is NOT "the closest lights win" -- that was already
// true. It is that the *number of lights the renderer sees* never changes,
// because three.js bakes `numPointLights` into every material's program cache
// key (WebGLPrograms.js:472-474), so a fluctuating count forces every material
// in view to recompile its shader mid-frame.
import { describe, expect, it, beforeEach } from 'vitest';
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
});
