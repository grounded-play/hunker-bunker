import { describe, expect, it } from 'vitest';
import {
    buildScuttlerBalanceReport,
    SCUTTLER_BALANCE_SCENARIOS,
    simulateScuttlerEncounter
} from './chitin-scuttler-balance-report.js';

describe('Chitin Scuttler deterministic balance probe', () => {
    it('is deterministic and uses the real enemy reason for every hit', () => {
        const first = simulateScuttlerEncounter({ seed: 84 });
        const second = simulateScuttlerEncounter({ seed: 84 });
        expect(first).toEqual(second);
        expect(first.hits.length).toBeGreaterThan(0);
        expect(first.hits.every((hit) => hit.reason === 'chitin_scuttler')).toBe(true);
    });

    it('gives the player a visible reaction beat before the first possible hit', () => {
        for (const positions of Object.values(SCUTTLER_BALANCE_SCENARIOS)) {
            const result = simulateScuttlerEncounter({ positions });
            expect(result.firstHitSeconds).toBeGreaterThanOrEqual(0.28);
        }
    });

    it('makes a perpendicular dodge safer than standing still for every base chassis', () => {
        const rows = buildScuttlerBalanceReport();
        for (const range of Object.keys(SCUTTLER_BALANCE_SCENARIOS)) {
            const stationary = rows.find((row) => row.range === range && row.response === 'stationary');
            for (const sidestep of rows.filter((row) => row.range === range && row.response.endsWith('-sidestep'))) {
                const improved = sidestep.survived
                    || sidestep.lethalTimeSeconds > stationary.lethalTimeSeconds;
                expect(improved, `${range}/${sidestep.response} did not improve survival`).toBe(true);
            }
        }
    });

    it('lets continuous return fire clear the three-member pack before death', () => {
        const rows = buildScuttlerBalanceReport().filter((row) => row.response.endsWith('-fire'));
        expect(rows).toHaveLength(6);
        for (const row of rows) {
            expect(row.survived, `${row.range}/${row.response} was lethal`).toBe(true);
            expect(row.enemiesKilled).toBe(3);
        }
    });
});
