import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { ThreeGame, disposeTransientEffect } from './threeGame.js';

beforeEach(() => {
    const ctx = { fillText: vi.fn() };
    vi.stubGlobal('document', { createElement: () => ({ width: 0, height: 0, getContext: () => ctx }) });
});
afterEach(() => vi.unstubAllGlobals());

function game() {
    const g = { scene: new THREE.Scene(), transientEffects: [] };
    for (const method of ['getDamagePipTexture', 'spawnDamagePip', 'spawnRainSplash']) g[method] = ThreeGame.prototype[method];
    return g;
}

describe('transient effects share their GPU resources', () => {
    it('draws each damage label once and keeps it through every pip that used it', () => {
        const g = game();
        g.spawnDamagePip(0, 0, 2);
        g.spawnDamagePip(1, 1, 2.2);
        const [a, b] = g.transientEffects;
        const texture = a.mesh.material.map;
        expect(b.mesh.material.map).toBe(texture);
        const dispose = vi.spyOn(texture, 'dispose');
        for (const effect of g.transientEffects) disposeTransientEffect(g, effect);
        expect(dispose).not.toHaveBeenCalled();
        g.spawnDamagePip(0, 0, 3);
        expect(g._damagePipTextures.size).toBe(2);
    });

    it('stops caching at the cap and lets uncached pip textures die with their pip', () => {
        const g = game();
        for (let i = 0; i < 60; i += 1) g.spawnDamagePip(0, 0, i);
        expect(g._damagePipTextures.size).toBe(48);
        const late = g.transientEffects.at(-1);
        const dispose = vi.spyOn(late.mesh.material.map, 'dispose');
        disposeTransientEffect(g, late);
        expect(dispose).toHaveBeenCalled();
    });

    it('reuses one ring and one droplet geometry for every rain splash', () => {
        const g = game();
        g.spawnRainSplash(0, 0);
        g.spawnRainSplash(2, 2);
        const geometries = g.transientEffects.map((effect) => effect.mesh.children.map((child) => child.geometry));
        expect(new Set(geometries.flat()).size).toBe(2);
        const dispose = vi.spyOn(geometries[0][0], 'dispose');
        for (const effect of g.transientEffects) disposeTransientEffect(g, effect);
        expect(dispose).not.toHaveBeenCalled();
    });
});
