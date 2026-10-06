import { describe, it, expect } from 'vitest';
import { ThreeGame } from './threeGame.js';

// QA 2026-09-30: walking along the cryo/bio line (distance 103 <-> 104 under a
// bio-bias card) flipped the player's biome five times in 2.5 minutes, each
// with an ENTERING ... SECTOR toast and an O2 drain swap. The player's biome
// now changes only once they are clearly across the line.
const game = {
    getRunCardEffects: () => ({}),
    getBiomeKeyFromDistance: ThreeGame.prototype.getBiomeKeyFromDistance
};
const key = (distance, currentKey) => ThreeGame.prototype.getPlayerBiomeKey.call(game, distance, currentKey);

describe('player biome hysteresis', () => {
    it('stays in the current biome while hovering on a threshold', () => {
        expect(key(140.5, 'cryo')).toBe('cryo');
        expect(key(139.5, 'bio')).toBe('bio');
    });

    it('switches once the player is clearly across', () => {
        expect(key(150, 'cryo')).toBe('bio');
        expect(key(130, 'bio')).toBe('cryo');
    });

    it('takes the raw biome when there is no current one', () => {
        expect(key(140.5, null)).toBe('bio');
    });
});
