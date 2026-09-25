import { describe, expect, it } from 'vitest';
import { ARRIVAL_PACKS, ARRIVAL_TUNING, CRASH_DEBRIS_SLOTS, planArrivalIncident, planCrashSiteDebris } from './arrivalIncident.js';
import { EXPEDITION_CONDITIONS } from './expeditionSystem.js';

describe('the arrival incident opens every deployment with a fight', () => {
    it('has a pack and a radio line for every condition a deployment can roll', () => {
        for (const condition of EXPEDITION_CONDITIONS) {
            const plan = planArrivalIncident({ conditionId: condition.id, expeditionSeed: 7, expeditionIndex: 2 });
            expect(plan, condition.id).toBeTruthy();
            expect(plan.pack.length, condition.id).toBeGreaterThan(0);
            expect(plan.lineKey).toBe(`ui.expedition.arrival.${condition.id}`);
        }
        expect(planArrivalIncident({ conditionId: 'nope' })).toBeNull();
    });

    it('lands within reach of the wreck, from a bearing the expedition seed decides', () => {
        const bearings = new Set();
        for (let seed = 1; seed <= 40; seed += 1) {
            const plan = planArrivalIncident({ conditionId: 'glacial_gale', expeditionSeed: seed * 7919, expeditionIndex: 3 });
            expect(plan.distance).toBeGreaterThanOrEqual(ARRIVAL_TUNING.minDistance);
            expect(plan.distance).toBeLessThanOrEqual(ARRIVAL_TUNING.maxDistance);
            expect(planArrivalIncident({ conditionId: 'glacial_gale', expeditionSeed: seed * 7919, expeditionIndex: 3 })).toEqual(plan);
            bearings.add(Math.round(plan.angle * 4));
        }
        expect(bearings.size).toBeGreaterThan(10);
    });

    it('introduces a campaign gently, then brings the full pack and the elite stalker', () => {
        const first = planArrivalIncident({ conditionId: 'subzero_stillness', expeditionSeed: 3, expeditionIndex: 0 });
        expect(first.pack).toEqual([{ type: 'cybersnail', elite: false }, { type: 'cybersnail', elite: false }]);
        // A new campaign deploys first at index 1 (beginExpedition advances it).
        expect(planArrivalIncident({ conditionId: 'subzero_stillness', expeditionSeed: 3, expeditionIndex: 1 }).pack).toEqual(first.pack);
        const later = planArrivalIncident({ conditionId: 'subzero_stillness', expeditionSeed: 3, expeditionIndex: 2 });
        expect(later.pack).toEqual([{ type: 'mycelium_stalker', elite: true }]);
        expect(planArrivalIncident({ conditionId: 'spore_bloom', expeditionSeed: 3, expeditionIndex: 0 }).pack).toHaveLength(2);
        expect(planArrivalIncident({ conditionId: 'spore_bloom', expeditionSeed: 3, expeditionIndex: 4 }).pack.map((m) => m.type)).toEqual([...ARRIVAL_PACKS.spore_bloom]);
    });
});

describe('crash-site wreckage plan', () => {
    it('ranks every slot, prefers three, and differs between seeds', () => {
        const a = planCrashSiteDebris(11);
        expect(a).toHaveLength(CRASH_DEBRIS_SLOTS.length);
        expect(a.filter((entry) => entry.preferred)).toHaveLength(3);
        expect(planCrashSiteDebris(11)).toEqual(a);
        const layouts = new Set(Array.from({ length: 20 }, (_, i) => JSON.stringify(planCrashSiteDebris(i * 7919).slice(0, 3))));
        expect(layouts.size).toBeGreaterThan(10);
    });
});

