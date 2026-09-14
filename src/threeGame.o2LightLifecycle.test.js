import { describe, expect, it, vi, afterEach } from 'vitest';
import * as THREE from 'three';
import { ThreeGame } from './threeGame.js';
import { BaseLights } from './baseLights.js';

// Exercise runtime power changes, not just BaseLights. The old unit suite
// passed even though ensureO2BubbleVisualState disposed the prebuilt grid.
describe('DP-02: O2 runtime retains its shader light set', () => {
    afterEach(() => vi.unstubAllGlobals());

    function setup() {
        vi.stubGlobal('window', { dispatchEvent: vi.fn() });
        const scene = new THREE.Scene();
        const ship = { tileX: 9, tileZ: 9 };
        const generator = { isOnline: false, radius: 3.9 };
        const game = {
            scene, playerType: 'SCOUT', unlocks: {},
            baseLights: new BaseLights(scene),
            getActiveShip: () => ship,
            getActiveO2GeneratorPosition: () => ({ x: 9, z: 9 }),
            getO2GeneratorState: () => generator,
            hasUpgrade: () => false,
            revealFoundry: vi.fn(), closeConsoleModal: vi.fn(), setInputEnabled: vi.fn(),
            createO2BubbleObjects: ThreeGame.prototype.createO2BubbleObjects,
            ensureO2BubbleVisualState: ThreeGame.prototype.ensureO2BubbleVisualState,
            igniteBaseLights: ThreeGame.prototype.igniteBaseLights,
            startO2StartupSequence: ThreeGame.prototype.startO2StartupSequence,
            cancelO2StartupSequence: ThreeGame.prototype.cancelO2StartupSequence,
            updateO2StartupSequence: ThreeGame.prototype.updateO2StartupSequence
        };
        game.baseLights.build(9, 9);
        game.ensureO2BubbleVisualState();
        return { game, generator };
    }

    const visibleLights = scene => {
        const ids = [];
        scene.traverseVisible(node => { if (node.isLight) ids.push(node.uuid); });
        return ids.sort();
    };

    it('retains the same nine light identities through offline, restore, reset and repair', () => {
        const { game, generator } = setup();
        const ids = visibleLights(game.scene);
        expect(ids).toHaveLength(9);
        expect(game.baseLights.built).toBe(true);
        expect(game.o2BubbleObjects.light.intensity).toBe(0);
        for (let cycle = 0; cycle < 3; cycle++) {
            generator.isOnline = true;
            game.ensureO2BubbleVisualState();
            expect(visibleLights(game.scene)).toEqual(ids);
            expect(game.baseLights.isIgnited).toBe(true);
            expect(game.o2BubbleObjects.light.intensity).toBeGreaterThan(0);
            generator.isOnline = false;
            game.ensureO2BubbleVisualState();
            game.baseLights.update(10);
            expect(visibleLights(game.scene)).toEqual(ids);
            expect(game.baseLights.isIgnited).toBe(false);
            expect(game.baseLights.fixtures.every(f => f.light.intensity === 0)).toBe(true);
            expect(game.o2BubbleObjects.light.intensity).toBe(0);
            expect(game.o2BubbleObjects.ring.visible).toBe(false);
        }
    });

    it('animates the live startup without removing/readding visible lights', () => {
        const { game, generator } = setup();
        const ids = visibleLights(game.scene);
        const complete = vi.fn();
        generator.isOnline = true;
        game.startO2StartupSequence('boss_cybersnail', { skipDialogue: true, onComplete: complete });
        expect(visibleLights(game.scene)).toEqual(ids);
        game.updateO2StartupSequence(1.2);
        expect(visibleLights(game.scene)).toEqual(ids);
        game.updateO2StartupSequence(1.8);
        expect(visibleLights(game.scene)).toEqual(ids);
        expect(complete).toHaveBeenCalledOnce();
        game.baseLights.dispose();
        expect(visibleLights(game.scene)).toHaveLength(1);
    });

    it('cancels a lost rise without leaving an active sequence or stale completion callback', () => {
        const { game, generator } = setup();
        generator.isOnline = true;
        const complete = vi.fn();
        game.startO2StartupSequence('boss_cybersnail', { onComplete: complete });
        game.cancelO2StartupSequence();
        game.updateO2StartupSequence(100);
        expect(game.o2StartupSequenceActive).toBe(false);
        expect(game._onO2StartupSequenceComplete).toBeNull();
        expect(complete).not.toHaveBeenCalled();
        expect(game.o2BubbleObjects.ring.visible).toBe(true);
    });
});
