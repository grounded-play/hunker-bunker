import { describe, expect, it } from 'vitest';
import {
    CAMP_ACTIVE_VERBS,
    getCampActiveVerb,
    canActivateCampVerb,
    isCampVerbDegraded
} from './campEconomy.js';

describe('Camp Active Verbs UI & Mechanics', () => {
    it('defines exact canonical active verbs for Meridian, Tallow, and Vesper camps', () => {
        expect(CAMP_ACTIVE_VERBS.camp_meridian).toBeDefined();
        expect(CAMP_ACTIVE_VERBS.camp_meridian.id).toBe('route_intel');
        expect(CAMP_ACTIVE_VERBS.camp_meridian.cost).toEqual({ tech: 1 });

        expect(CAMP_ACTIVE_VERBS.camp_tallow).toBeDefined();
        expect(CAMP_ACTIVE_VERBS.camp_tallow.id).toBe('triage');
        expect(CAMP_ACTIVE_VERBS.camp_tallow.cost).toEqual({ med: 1 });

        expect(CAMP_ACTIVE_VERBS.camp_vesper).toBeDefined();
        expect(CAMP_ACTIVE_VERBS.camp_vesper.id).toBe('field_resupply');
        expect(CAMP_ACTIVE_VERBS.camp_vesper.cost).toEqual({ coin: 1 });
    });

    it('returns correct verb object by camp ID', () => {
        expect(getCampActiveVerb('camp_meridian')).toEqual(CAMP_ACTIVE_VERBS.camp_meridian);
        expect(getCampActiveVerb('camp_tallow')).toEqual(CAMP_ACTIVE_VERBS.camp_tallow);
        expect(getCampActiveVerb('camp_vesper')).toEqual(CAMP_ACTIVE_VERBS.camp_vesper);
        expect(getCampActiveVerb('unknown_camp')).toBeNull();
    });

    describe('canActivateCampVerb', () => {
        it('rejects when resources are insufficient', () => {
            const result = canActivateCampVerb('camp_meridian', {
                bankState: { tech: 0, med: 1, coin: 1 }
            });
            expect(result.allowed).toBe(false);
            expect(result.reason).toBe('insufficient_resources');
        });

        it('allows activation when resources are available', () => {
            const result = canActivateCampVerb('camp_meridian', {
                bankState: { tech: 1, med: 0, coin: 0 }
            });
            expect(result.allowed).toBe(true);
        });

        it('enforces cooldown timing for Tallow triage (90s)', () => {
            const context = {
                bankState: { med: 5 },
                nowSeconds: 100,
                lastUsedAtSeconds: 50 // 50 seconds ago, cooldown is 90s
            };
            const result = canActivateCampVerb('camp_tallow', context);
            expect(result.allowed).toBe(false);
            expect(result.reason).toBe('on_cooldown');
            expect(result.remainingSeconds).toBe(40);
        });

        it('allows Tallow triage once cooldown expires (90s+)', () => {
            const context = {
                bankState: { med: 5 },
                nowSeconds: 200,
                lastUsedAtSeconds: 50 // 150 seconds ago
            };
            const result = canActivateCampVerb('camp_tallow', context);
            expect(result.allowed).toBe(true);
        });
    });

    describe('isCampVerbDegraded', () => {
        it('detects degraded state when camp status is robbed', () => {
            expect(isCampVerbDegraded('camp_meridian', 'robbed')).toBe(true);
            expect(isCampVerbDegraded('camp_meridian', 'alive')).toBe(false);
        });
    });
});
