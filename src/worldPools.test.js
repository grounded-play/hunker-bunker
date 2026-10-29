import { describe, expect, it, vi } from 'vitest';
import { WorldPoolSystem } from './worldPools.js';

describe('WorldPoolSystem', () => {
    it('rejects duplicate stable IDs and detects contained positions', () => {
        const system = new WorldPoolSystem();
        const pool = system.add({ id: 'pool:a', x: 2, z: 3, radius: 1, substance: 'bio_slime' });
        expect(system.add({ id: 'pool:a', x: 8, z: 8 })).toBeNull();
        expect(system.contains({ x: 2.5, y: 0, z: 3 }, (item) => item.substance === 'bio_slime')).toBe(true);
        expect(system.contains({ x: 4, y: 0, z: 3 })).toBe(false);
        expect(system.remove(pool)).toBe(true);
        expect(pool.active).toBe(false);
    });

    it('merges nearby compatible pools with bounded growth', () => {
        const system = new WorldPoolSystem();
        const first = system.add({ id: 'pool:a', x: 0, z: 0, radius: 1, substance: 'water', expiresAt: 4 });
        const merged = system.add({ id: 'pool:b', x: 0.5, z: 0, radius: 0.8, substance: 'water', expiresAt: 8 });
        expect(merged).toBe(first);
        expect(system.pools).toHaveLength(1);
        expect(first.radius).toBeCloseTo(1.2);
        expect(first.expiresAt).toBe(8);
    });

    it('expires pools and evicts the oldest when capped', () => {
        const system = new WorldPoolSystem({ maxPools: 2 });
        system.add({ id: 'old', x: 0, z: 0, createdAt: 1, expiresAt: 3 }, { merge: false });
        system.add({ id: 'new', x: 5, z: 0, createdAt: 2 }, { merge: false });
        system.add({ id: 'newest', x: 10, z: 0, createdAt: 3 }, { merge: false });
        expect(system.pools.map((pool) => pool.id)).toEqual(['new', 'newest']);
        system.pools[0].expiresAt = 4;
        expect(system.update(4)).toBe(1);
        expect(system.pools.map((pool) => pool.id)).toEqual(['newest']);
    });

    it('keeps the public array stable for existing track and relic adapters', () => {
        const system = new WorldPoolSystem();
        const alias = system.pools;
        system.add({ id: 'pool:a', x: 0, z: 0 });
        system.clear();
        expect(system.pools).toBe(alias);
        expect(alias).toEqual([]);
    });

    it('applies pool payloads on a per-target cadence and rearms after exit', () => {
        const system = new WorldPoolSystem();
        system.add({
            id: 'coolant:a',
            x: 0,
            z: 0,
            radius: 1,
            tickInterval: 0.5,
            payload: [{ kind: 'damage', amount: 1 }]
        });
        const apply = vi.fn();
        const inside = { x: 0.5, y: 0, z: 0 };
        expect(system.tickExposure(0.1, 'player:a', inside, apply)).toBe(1);
        expect(system.tickExposure(0.1, 'player:a', inside, apply)).toBe(0);
        expect(system.tickExposure(0.4, 'player:a', inside, apply)).toBe(1);
        expect(system.tickExposure(0.1, 'player:b', inside, apply)).toBe(1);
        system.tickExposure(0.1, 'player:a', { x: 5, y: 0, z: 0 }, apply);
        expect(system.tickExposure(0.1, 'player:a', inside, apply)).toBe(1);
    });
});
