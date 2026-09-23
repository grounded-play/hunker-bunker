import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ThreeGame } from './threeGame.js';
import { REST_PHASES, createDayState } from './dayCycle.js';

function stubs() {
    globalThis.CustomEvent = class CustomEvent {
        constructor(type, options = {}) { this.type = type; this.detail = options.detail; }
    };
    globalThis.window = { dispatchEvent: vi.fn() };
}

const bunkerGame = (overrides = {}) => ({
    dayState: createDayState(),
    _activeCampQuest: null,
    getSpawnTile: () => ({ x: 100, y: 200 }),
    canRestAt: ThreeGame.prototype.canRestAt,
    getBunkerRestPoint: ThreeGame.prototype.getBunkerRestPoint,
    getRestPointAt: ThreeGame.prototype.getRestPointAt,
    ...overrides
});

describe('bunker cot rest point', () => {
    beforeEach(() => stubs());

    it('anchors the cot to the bunker spawn', () => {
        const point = bunkerGame().getBunkerRestPoint();
        expect(point.id).toBe('bunker_cot');
        expect(Number.isFinite(point.x)).toBe(true);
        expect(Number.isFinite(point.z)).toBe(true);
    });

    it('offers rest only within reach of the cot', () => {
        const game = bunkerGame();
        const cot = game.getBunkerRestPoint();
        expect(game.getRestPointAt(cot.x, cot.z)?.id).toBe('bunker_cot');
        // Standing across the base is not standing at the bed.
        expect(game.getRestPointAt(cot.x + 40, cot.z)).toBe(null);
    });

    // The whole point of Phase 5b: one rule, asked by every bed. The cot must
    // not grow a second opinion about when sleeping is allowed.
    it('defers to the same canRestNow rule the camp verb uses', () => {
        const midRest = bunkerGame({
            dayState: { ...createDayState(), phase: REST_PHASES.RESTING }
        });
        const cot = midRest.getBunkerRestPoint();
        expect(midRest.getRestPointAt(cot.x, cot.z)).toBe(null);

        const busy = bunkerGame({ _activeCampQuest: { id: 'contract' } });
        expect(busy.getRestPointAt(cot.x, cot.z)).toBe(null);
    });

    it('carries the next day so the prompt can name it', () => {
        const game = bunkerGame();
        const cot = game.getBunkerRestPoint();
        expect(game.getRestPointAt(cot.x, cot.z).nextDay).toBe(2);

        const later = bunkerGame({ dayState: { ...createDayState(), day: 6 } });
        expect(later.getRestPointAt(cot.x, cot.z).nextDay).toBe(7);
    });

    it('is inert without a player position or a spawn tile', () => {
        const game = bunkerGame({ getSpawnTile: () => null });
        expect(() => game.getRestPointAt(0, 0)).not.toThrow();
        expect(game.getRestPointAt(Number.NaN, Number.NaN)).toBe(null);
    });
});
