import { describe, expect, it } from 'vitest';
import { getCharmSocketRegistry, getCharmSocketTransform, resolveCharmModelOffset } from './charmSockets.js';

describe('per-archetype charm sockets', () => {
    it('has distinct named sockets for every weapon archetype', () => {
        const registry = getCharmSocketRegistry();
        expect(Object.keys(registry)).toEqual(['gg1', 'talon', 'talon_c', 'siege_breaker', 'tesla_lock']);
        expect(registry.talon.position).not.toEqual(registry.siege_breaker.position);
        expect(registry.tesla_lock.anchor).toBe('power-cell-rail');
    });

    it('uses a documented fallback for unknown weapons', () => {
        expect(getCharmSocketTransform('not-a-gun')).toMatchObject({ archetype: 'gg1', usedFallback: true, anchor: 'receiver-underbarrel' });
    });
});

describe('resolveCharmModelOffset', () => {
    // Every charm previously used the same hardcoded model.position.set(0, -0.05, 0).
    // That is a blanket constant standing in for per-model normalization -- the
    // same class of mistake as the single shared weapon socket it replaced.
    it('hangs the charm from the socket by its own top edge', () => {
        const offset = resolveCharmModelOffset({ min: { x: -1, y: -3, z: -1 }, max: { x: 1, y: 1, z: 1 } });

        expect(offset[1]).toBeCloseTo(-1, 5);
    });

    it('centres the charm horizontally on the socket', () => {
        const offset = resolveCharmModelOffset({ min: { x: 2, y: 0, z: 4 }, max: { x: 4, y: 1, z: 6 } });

        expect(offset[0]).toBeCloseTo(-3, 5);
        expect(offset[2]).toBeCloseTo(-5, 5);
    });

    it('gives a taller charm a different offset than a squat one', () => {
        const tall = resolveCharmModelOffset({ min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 8, z: 1 } });
        const squat = resolveCharmModelOffset({ min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 1 } });

        expect(tall[1]).not.toBeCloseTo(squat[1], 3);
    });

    it('returns a usable offset for a degenerate bounding box', () => {
        expect(resolveCharmModelOffset(null).every(Number.isFinite)).toBe(true);
    });
});
