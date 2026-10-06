import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { ThreeGame } from './threeGame.js';
import { BankManager } from './bank.js';

// Sprint 50 economy audit: props called `game.addScrap?.(n)` nine times and
// promised "+15 SCRAP", but ThreeGame had no addScrap, so the optional call
// silently did nothing. Every hook a prop calls must exist on the game.
describe('prop interactions reach real game methods', () => {
    it('every game.<hook>?.() a prop calls exists on ThreeGame', () => {
        const source = readFileSync(new URL('./propInteractions.js', import.meta.url), 'utf8');
        const hooks = [...new Set([...source.matchAll(/game\.([A-Za-z0-9_]+)\?\.\(/g)].map((m) => m[1]))];
        expect(hooks.length).toBeGreaterThan(0);
        const missing = hooks.filter((name) => typeof ThreeGame.prototype[name] !== 'function');
        expect(missing).toEqual([]);
    });
});

describe('scrap from props', () => {
    const gameWithBank = () => {
        const bank = new BankManager();
        return { bank, game: { bank, addScrap: ThreeGame.prototype.addScrap } };
    };

    it('banks scrap as tech, the currency the bank already maps scrap to', () => {
        const { bank, game } = gameWithBank();
        const before = bank.getState().tech;
        expect(game.addScrap(15)).toBe(true);
        const after = bank.getState().tech;
        expect(after - before).toBe(15);
    });

    it('ignores zero, negative and non-numeric amounts', () => {
        const { bank, game } = gameWithBank();
        const deposit = vi.spyOn(bank, 'deposit');
        expect(game.addScrap(0)).toBe(false);
        expect(game.addScrap(-5)).toBe(false);
        expect(game.addScrap('lots')).toBe(false);
        expect(deposit).not.toHaveBeenCalled();
    });
});
