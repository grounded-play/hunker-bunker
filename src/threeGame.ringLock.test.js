import { describe, expect, it } from 'vitest';
import { ThreeGame } from './threeGame.js';

// Phase 6.2 live enforcement: enforceRingProgressionLock (src/threeGame.js)
// clamps the player's position to the soft ring boundary from
// src/mazeExpedition.js. Follows the established
// ThreeGame.prototype.method.call(fakeThis, ...) pattern
// (see threeGame.campQuests.test.js).

function makeFakeThis(overrides = {}) {
    return {
        player: { position: { x: 0, z: 0 } },
        isGameplayInputActive: () => true,
        bank: { getState: () => ({ unlocks: {} }) },
        getBiomeAnchorPosition: () => ({ x: 0, z: 0 }),
        ...overrides
    };
}

describe('enforceRingProgressionLock', () => {
    it('does nothing when there is no player', () => {
        const fakeThis = makeFakeThis({ player: null });
        expect(() => ThreeGame.prototype.enforceRingProgressionLock.call(fakeThis)).not.toThrow();
    });

    it('does nothing while gameplay input is not active (menus/cutscenes/dialogue)', () => {
        const fakeThis = makeFakeThis({
            player: { position: { x: 5000, z: 0 } },
            isGameplayInputActive: () => false
        });
        ThreeGame.prototype.enforceRingProgressionLock.call(fakeThis);
        expect(fakeThis.player.position).toEqual({ x: 5000, z: 0 });
    });

    it('leaves the player alone well within the unlocked ring', () => {
        const fakeThis = makeFakeThis({ player: { position: { x: 20, z: 0 } } });
        ThreeGame.prototype.enforceRingProgressionLock.call(fakeThis);
        expect(fakeThis.player.position).toEqual({ x: 20, z: 0 });
    });

    it('pulls the player back when they end up far beyond ring 1 with no goals unlocked', () => {
        const fakeThis = makeFakeThis({ player: { position: { x: 1000, z: 0 } } });
        ThreeGame.prototype.enforceRingProgressionLock.call(fakeThis);
        expect(fakeThis.player.position.x).toBeLessThan(1000);
        expect(fakeThis.player.position.x).toBeGreaterThan(0);
        expect(fakeThis.player.position.z).toBe(0);
    });

    it('reads real unlock state from bank.getState().unlocks -- more goals unlocked means a farther boundary', () => {
        const noGoals = makeFakeThis({ player: { position: { x: 1000, z: 0 } } });
        ThreeGame.prototype.enforceRingProgressionLock.call(noGoals);

        const allGoals = makeFakeThis({
            player: { position: { x: 1000, z: 0 } },
            bank: { getState: () => ({ unlocks: { o2Bubble: true, hullExpansion: true, radarNode: true, reactorCompressor: true } }) }
        });
        ThreeGame.prototype.enforceRingProgressionLock.call(allGoals);

        // ring 5 (every goal unlocked) has no boundary at all
        expect(allGoals.player.position).toEqual({ x: 1000, z: 0 });
        expect(noGoals.player.position.x).toBeLessThan(allGoals.player.position.x);
    });

    it('clamps relative to the live biome anchor, not the world origin', () => {
        const fakeThis = makeFakeThis({
            player: { position: { x: 1000, z: 50 } },
            getBiomeAnchorPosition: () => ({ x: 0, z: 50 })
        });
        ThreeGame.prototype.enforceRingProgressionLock.call(fakeThis);
        expect(fakeThis.player.position.z).toBeCloseTo(50, 5);
        expect(fakeThis.player.position.x).toBeLessThan(1000);
    });
});
