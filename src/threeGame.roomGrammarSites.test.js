import { describe, expect, it } from 'vitest';
import { ThreeGame } from './threeGame.js';
import { generateRadialMazeExpedition } from './mazeExpedition.js';
import { buildWorldPlan } from './ringManifest.js';

// Sprint 49 G5: the plan picks one inhabited camp court; only a world with the
// room grammar on (the solo pilot) builds it. Co-op, fixed-seed and ordinary
// campaigns keep the plain plan, so their geometry never changes.
describe('G5 camp court at runtime', () => {
    const plan = buildWorldPlan(generateRadialMazeExpedition(8128));
    const court = (chunkPlan) => chunkPlan.reservations.filter((entry) => entry.roomGrammarProfile === 'camp-court');

    it('binds the chosen camp court only when the room grammar is on', () => {
        const game = Object.create(ThreeGame.prototype);
        game.getRoomGrammarConfig = () => ({ seed: 1, version: 1 });
        const bound = game.getRoomGrammarChunkPlan(plan);
        expect(court(bound).map((entry) => entry.id)).toContain(plan.roomGrammarSites.camp.reservationId);
        expect(game.getRoomGrammarChunkPlan(plan)).toBe(bound);
        expect(court(plan)).toHaveLength(0);
    });

    it('leaves every other world on the plain plan', () => {
        const game = Object.create(ThreeGame.prototype);
        game.getRoomGrammarConfig = () => null;
        expect(game.getRoomGrammarChunkPlan(plan)).toBe(plan);
        const legacy = { ...plan, roomGrammarSites: undefined };
        game.getRoomGrammarConfig = () => ({ seed: 1, version: 1 });
        expect(game.getRoomGrammarChunkPlan(legacy)).toBe(legacy);
    });
});
