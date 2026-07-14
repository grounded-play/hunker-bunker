import { describe, expect, it } from 'vitest';
import { getDisclosedOdds, rollDeepRelicCache, DEEP_RELIC_CACHE_DROP_TABLE } from './lootTables.js';

describe('lootTables', () => {
    it('disclosed odds sum to 100 percent', () => {
        const odds = getDisclosedOdds();
        const total = odds.reduce((sum, row) => sum + row.percent, 0);
        expect(total).toBeCloseTo(100, 1);
    });

    it('disclosed odds cover every drop table entry', () => {
        const odds = getDisclosedOdds();
        expect(odds).toHaveLength(DEEP_RELIC_CACHE_DROP_TABLE.length);
        for (const row of DEEP_RELIC_CACHE_DROP_TABLE) {
            expect(odds.find((o) => o.itemdefid === row.itemdefid)).toBeTruthy();
        }
    });

    it('rolls the lowest-weight bucket at roll=0', () => {
        const result = rollDeepRelicCache(() => 0);
        expect(result.itemdefid).toBe(DEEP_RELIC_CACHE_DROP_TABLE[0].itemdefid);
    });

    it('rolls the last bucket at roll just under 1', () => {
        const result = rollDeepRelicCache(() => 0.999999);
        const last = DEEP_RELIC_CACHE_DROP_TABLE[DEEP_RELIC_CACHE_DROP_TABLE.length - 1];
        expect(result.itemdefid).toBe(last.itemdefid);
    });

    it('never returns undefined across the full roll range', () => {
        for (let i = 0; i <= 100; i++) {
            const result = rollDeepRelicCache(() => i / 100);
            expect(result).toBeTruthy();
            expect(typeof result.itemdefid).toBe('number');
        }
    });
});
