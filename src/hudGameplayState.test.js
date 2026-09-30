import { describe, expect, it } from 'vitest';
import { resolveHudGameplayState } from './hudGameplayState.js';

describe('resolveHudGameplayState', () => {
    it.each([
        [{}, 'idle'],
        [{ abilityReady: true }, 'ability-ready'],
        [{ inCombat: true, abilityReady: true }, 'engaged'],
        [{ reloading: true, inCombat: true }, 'reloading'],
        [{ bossActive: true, reloading: true }, 'boss'],
        [{ toxic: true, bossActive: true }, 'toxic'],
        [{ frozen: true, toxic: true }, 'frozen'],
        [{ hp: 1, maxHp: 3, frozen: true }, 'critical'],
        [{ o2: 25, maxO2: 100 }, 'critical'],
        [{ hull: 10, maxHull: 100 }, 'critical'],
        [{ hazardActive: true }, 'critical'],
        [{ dead: true, hazardActive: true }, 'dead']
    ])('resolves %j as %s', (snapshot, expected) => {
        expect(resolveHudGameplayState(snapshot)).toBe(expected);
    });
});
