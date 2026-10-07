import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { ThreeGame } from './threeGame.js';

// Owner, 2026-10-07: footprints that change with the ground, and enemy slime.
describe('what the ground leaves on your boots', () => {
    function game({ scatter = [], corpses = [], puddles = [], biome = 'active' } = {}) {
        const g = Object.create(ThreeGame.prototype);
        const sprites = scatter.map(([type, x, z]) => {
            const s = new THREE.Sprite();
            s.position.set(x, 0, z);
            s.userData = { type, baseScaleX: 1, baseScaleY: 1 };
            return s;
        });
        Object.assign(g, {
            scatterSprites: sprites,
            corpses: corpses.map(([x, z]) => { const c = new THREE.Sprite(); c.position.set(x, 0.05, z); return c; }),
            dynamicPuddles: puddles.map(([x, z]) => ({ x, z, radius: 0.5, active: true })),
            currentBiome: biome,
            isOutdoors: () => false
        });
        return g;
    }

    it('reads water, slime, blood and oil from the floor', () => {
        const g = game({ scatter: [['scatter_coolant_puddle', 0, 0], ['scatter_slime_puddle', 5, 0], ['prop_blood_trail', 10, 0], ['decal_grease_pool', 15, 0]] });
        expect(g.getTrackSurfaceAt(0.1, 0)).toBe('water');
        expect(g.getTrackSurfaceAt(5, 0.1)).toBe('slime');
        expect(g.getTrackSurfaceAt(10, 0)).toBe('blood');
        expect(g.getTrackSurfaceAt(15, 0)).toBe('oil');
        expect(g.getTrackSurfaceAt(30, 30)).toBeNull();
    });

    it('reads blood from a corpse and slime from a spore pool', () => {
        const g = game({ corpses: [[2, 2]], puddles: [[8, 8]] });
        expect(g.getTrackSurfaceAt(2.2, 2)).toBe('blood');
        expect(g.getTrackSurfaceAt(8, 8)).toBe('slime');
    });

    it('reads snow in the cryo biome', () => {
        expect(game({ biome: 'cryo' }).getTrackSurfaceAt(0, 0)).toBe('snow');
    });

    it('a step leaves a print and loads the boots', () => {
        const g = game({ scatter: [['prop_blood_trail', 0, 0]] });
        g.trackField = { addPrint: vi.fn(), addSmear: vi.fn() };
        g.leaveBootPrint(0, 0, 1, 0, 5);
        g.leaveBootPrint(3, 0, 1, 0, 5.4);
        expect(g.trackField.addPrint.mock.calls[0][0]).toMatchObject({ surface: 'blood', strength: 1 });
        expect(g.trackField.addPrint.mock.calls[1][0].surface).toBe('blood');
        expect(g.trackField.addPrint.mock.calls[1][0].strength).toBeLessThan(1);
    });

    it('snail slime goes into the pooled field, not a new sprite', () => {
        const g = game();
        g.scene = new THREE.Scene();
        g.trackField = { addPrint: vi.fn(), addSmear: vi.fn() };
        g.spawnVisualSnailTrail(1, 1, 'cryosnail', false);
        expect(g.trackField.addSmear).toHaveBeenCalledTimes(1);
        expect(g.scene.children).toHaveLength(0);
    });
});

describe('everyone leaves tracks as they move', () => {
    it('crawlers leave a mark every stride, not every frame', () => {
        const g = Object.create(ThreeGame.prototype);
        g.trackField = { addPrint: vi.fn(), addSmear: vi.fn() };
        const crawler = new THREE.Sprite();
        crawler.userData = { type: 'crawler' };
        g.trackEnemyStep(crawler);
        crawler.position.set(0.1, 0, 0);
        g.trackEnemyStep(crawler);
        crawler.position.set(0.6, 0, 0);
        g.trackEnemyStep(crawler);
        expect(g.trackField.addPrint).toHaveBeenCalledTimes(2);
    });

    it('a squadmate leaves boot prints as they walk', () => {
        const g = Object.create(ThreeGame.prototype);
        Object.assign(g, { scatterSprites: [], corpses: [], dynamicPuddles: [], currentBiome: 'active', isOutdoors: () => false });
        g.trackField = { addPrint: vi.fn(), addSmear: vi.fn() };
        const remote = { mesh: new THREE.Object3D() };
        g.trackRemoteSteps(remote);
        remote.mesh.position.set(0.3, 0, 0);
        g.trackRemoteSteps(remote);
        remote.mesh.position.set(0.7, 0, 0);
        g.trackRemoteSteps(remote);
        expect(g.trackField.addPrint).toHaveBeenCalledTimes(1);
        expect(g.trackField.addPrint.mock.calls[0][0]).toMatchObject({ surface: 'dust', dirX: 1 });
    });
});
