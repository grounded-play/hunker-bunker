import { describe, expect, it } from 'vitest';
import { chooseGrammarSite, scoreGrammarSite } from './roomGrammarSiteSelection.js';

describe('G5 grammar site selection', () => {
    const candidates = [
        { id: 'blocked', reachable: true, occupied: true, safeRadius: 8, travelDistance: 2, routeAdjacency: 3, exitCount: 2 },
        { id: 'unsafe', reachable: true, safeRadius: 2, travelDistance: 2, routeAdjacency: 4, exitCount: 3 },
        { id: 'isolated', reachable: true, safeRadius: 5, travelDistance: 7, routeAdjacency: 1, exitCount: 1 },
        { id: 'court-a', reachable: true, safeRadius: 6, travelDistance: 2, routeAdjacency: 3, exitCount: 2 },
        { id: 'court-b', reachable: true, safeRadius: 6, travelDistance: 2, routeAdjacency: 3, exitCount: 2 }
    ];

    it('rejects occupied, unreachable, unsafe and quest-incompatible sites', () => {
        expect(scoreGrammarSite(candidates[0])).toBeNull();
        expect(scoreGrammarSite(candidates[1])).toBeNull();
        expect(scoreGrammarSite({ ...candidates[3], questCompatible: false })).toBeNull();
        expect(scoreGrammarSite({ ...candidates[3], reachable: false })).toBeNull();
    });

    it('prefers safe, connected sites near the target travel distance', () => {
        expect(scoreGrammarSite(candidates[3])).toBeGreaterThan(scoreGrammarSite(candidates[2]));
        expect(['court-a', 'court-b']).toContain(chooseGrammarSite(candidates, { seed: 91 }).id);
    });

    it('breaks equal-score ties deterministically without input-order dependence', () => {
        const chosen = chooseGrammarSite(candidates, { seed: 91 });
        expect(chooseGrammarSite([...candidates].reverse(), { seed: 91 })).toEqual(chosen);
        expect(chooseGrammarSite([], { seed: 91 })).toBeNull();
    });
});
