import { describe, expect, it } from 'vitest';
import { getCharmSocketRegistry, getCharmSocketTransform } from './charmSockets.js';

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
