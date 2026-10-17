import { describe, expect, it, vi } from 'vitest';
import { ThreeGame } from './threeGame.js';

// AAA plan §7.4: 25,000+ at the camp arcade cabinet earns "Arcade Reflexes"
// for the rest of the expedition. The only real stat it can promise is reload
// speed (there is no "weapon handling" stat): reloads take 10% less time.
function fake() {
    const game = Object.create(ThreeGame.prototype);
    Object.assign(game, { reloadSpeedMult: 0.8, showBunkerLine: vi.fn() });
    return game;
}

describe('Arcade Reflexes run buff', () => {
    it('makes reloads 10% faster, once per run', () => {
        const game = fake();
        expect(game.getReloadDurationMult()).toBeCloseTo(0.8);
        expect(game.grantArcadeReflexes()).toBe(true);
        expect(game.getReloadDurationMult()).toBeCloseTo(0.72);
        expect(game.grantArcadeReflexes()).toBe(false);
        expect(game.getReloadDurationMult()).toBeCloseTo(0.72);
    });

    it('ends with the run', () => {
        const game = fake();
        game.grantArcadeReflexes();
        game.clearRunBuffs();
        expect(game.getReloadDurationMult()).toBeCloseTo(0.8);
    });
});
