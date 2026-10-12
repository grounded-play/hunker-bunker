import { describe, expect, it } from 'vitest';
import { ASSEMBLY_RECIPES, QUARTERMASTER_OFFERS, isoWeekKey, planAssembly, planQuartermasterTrade } from './quartermaster.js';

// Sprint 51 (owner: "full loop"): Deep Core Shards buy reagents weekly, and
// ingots + matrices + ambergris assemble the overclock modules 4140-4147.
const inv = (rows) => rows.map(([itemId, itemdefid, quantity]) => ({ itemId, itemdefid, quantity }));

describe('quartermaster shard trades', () => {
    it('sells a matrix for 35 shards across stacks, up to 3 a week', () => {
        const plan = planQuartermasterTrade({ inventory: inv([['s1', 4159, 20], ['s2', 4159, 30]]), itemdefid: 4157, weeklyCount: 2 });
        expect(plan).toMatchObject({ ok: true, outputItemdefid: 4157 });
        expect(plan.consumed).toEqual([{ itemId: 's1', itemdefid: 4159, quantity: 20 }, { itemId: 's2', itemdefid: 4159, quantity: 15 }]);
        expect(planQuartermasterTrade({ inventory: inv([['s1', 4159, 99]]), itemdefid: 4157, weeklyCount: 3 })).toEqual({ ok: false, reason: 'weekly_limit' });
        expect(planQuartermasterTrade({ inventory: inv([['s1', 4159, 10]]), itemdefid: 4157 })).toEqual({ ok: false, reason: 'insufficient_shards' });
        expect(planQuartermasterTrade({ inventory: [], itemdefid: 4100 })).toEqual({ ok: false, reason: 'not_offered' });
    });

    it('offers the matrix, ambergris and the earned key', () => {
        expect(Object.keys(QUARTERMASTER_OFFERS).sort()).toEqual(['4154', '4157', '4158']);
    });

    it('counts weeks by ISO week', () => {
        expect(isoWeekKey(new Date('2026-10-07T12:00:00Z'))).toBe('2026-W41');
        expect(isoWeekKey(new Date('2027-01-01T12:00:00Z'))).toBe('2026-W53');
    });
});

describe('overclock assembly', () => {
    it('builds 4142 from 40 ingots and a matrix', () => {
        const plan = planAssembly({ inventory: inv([['i1', 4156, 25], ['i2', 4156, 30], ['m1', 4157, 2]]), itemdefid: 4142 });
        expect(plan).toMatchObject({ ok: true, outputItemdefid: 4142 });
        expect(plan.consumed).toEqual([
            { itemId: 'i1', itemdefid: 4156, quantity: 25 }, { itemId: 'i2', itemdefid: 4156, quantity: 15 },
            { itemId: 'm1', itemdefid: 4157, quantity: 1 }
        ]);
    });

    it('refuses short inventories and non-overclocks', () => {
        expect(planAssembly({ inventory: inv([['i1', 4156, 40]]), itemdefid: 4142 })).toEqual({ ok: false, reason: 'insufficient_reagents' });
        expect(planAssembly({ inventory: [], itemdefid: 4160 })).toEqual({ ok: false, reason: 'not_assemblable' });
        expect(Object.keys(ASSEMBLY_RECIPES).map(Number).sort()).toEqual([4140, 4141, 4142, 4143, 4144, 4145, 4146, 4147]);
    });
});
