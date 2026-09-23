import { describe, expect, it } from 'vitest';
import {
    OVERNIGHT_STATE_KEY,
    applyOvernight,
    campFortification,
    createOvernightState,
    isCampDefensible,
    isHiveSettled,
    normalizeOvernightState,
    planAllCreepDecals,
    planCreepDecals,
    runOvernight,
    toSimInputs
} from './overnightBridge.js';
import { ACT2_CAMP_STATUSES, ACT2_HIVE_STATUSES } from './act2.js';

describe('translating the live world into simulation input', () => {
    it('reads fortification from what the player actually invested', () => {
        expect(campFortification({ level: 0 })).toBe(0);
        expect(campFortification({ level: 3 })).toBeCloseTo(0.8, 5);
        expect(campFortification({ level: 3, aided: true })).toBe(1);
        // Being liked is not the same as being dug in.
        expect(campFortification({ level: 0, bond: 5 })).toBe(0);
    });

    it('drops camps that no longer exist rather than simulating their night', () => {
        const { camps } = toSimInputs({
            campRecords: [
                { id: 'camp_tallow', status: 'alive', level: 1 },
                { id: 'camp_vesper', status: 'culled', level: 3 },
                { id: 'camp_meridian', status: 'turned', level: 2 }
            ]
        });
        expect(camps.map((c) => c.id)).toEqual(['camp_tallow']);
    });

    it('classifies every act2 camp status without throwing', () => {
        for (const status of ACT2_CAMP_STATUSES) {
            expect(typeof isCampDefensible({ status })).toBe('boolean');
        }
        expect(isCampDefensible({ status: 'alive' })).toBe(true);
        expect(isCampDefensible({ status: 'culled' })).toBe(false);
    });

    it('treats a resolved hive as settled, whichever way it was resolved', () => {
        for (const status of ACT2_HIVE_STATUSES) {
            expect(typeof isHiveSettled({ status })).toBe('boolean');
        }
        expect(isHiveSettled({ status: 'slain' })).toBe(true);
        expect(isHiveSettled({ status: 'bonded' })).toBe(true);
        expect(isHiveSettled({ status: 'dormant' })).toBe(false);
        expect(isHiveSettled({ status: 'awakened' })).toBe(false);
    });

    it('speaks the simulation vocabulary for hive status', () => {
        const { hives } = toSimInputs({
            hiveRecords: [{ id: 'hive_suture', status: 'awakened' }, { id: 'hive_relay', status: 'bonded' }]
        });
        expect(hives.find((h) => h.id === 'hive_suture').status).toBe('active');
        expect(hives.find((h) => h.id === 'hive_relay').status).toBe('purged');
    });
});

describe('overnight state', () => {
    it('keeps its own key, separate from the act2 save', () => {
        expect(OVERNIGHT_STATE_KEY).toBe('hb_overnight_v1');
        expect(OVERNIGHT_STATE_KEY.startsWith('hb_')).toBe(true);
    });

    it('survives corrupt or hostile saves', () => {
        expect(normalizeOvernightState(null)).toEqual(createOvernightState());
        expect(normalizeOvernightState('nope')).toEqual(createOvernightState());
        const cleaned = normalizeOvernightState({
            camps: { camp_a: { condition: 'not-a-condition', neglectNights: -5 } },
            hives: { hive_a: { creepRings: 99 } }
        });
        expect(cleaned.camps.camp_a.condition).toBe('secure');
        expect(cleaned.camps.camp_a.neglectNights).toBe(0);
        expect(cleaned.hives.hive_a.creepRings).toBe(3);
    });

    it('remembers condition across nights so neglect accumulates', () => {
        const records = [{ id: 'camp_vesper', status: 'alive', level: 0 }];
        let state = createOvernightState();
        const seen = [];
        for (let i = 0; i < 5; i += 1) {
            const night = runOvernight({ day: 8, campRecords: records, overnightState: state });
            state = night.state;
            seen.push(state.camps.camp_vesper.condition);
        }
        expect(seen[0]).toBe('strained');
        expect(seen.at(-1)).toBe('abandoned');
        // It degraded one visible step at a time on the way down.
        expect(seen.slice(0, 3)).toEqual(['strained', 'breached', 'overrun']);
    });

    it('lets a resupplied camp climb back out', () => {
        let state = applyOvernight(createOvernightState(), {
            camps: [{ id: 'camp_tallow', condition: 'overrun', neglectNights: 2 }],
            hives: []
        });
        const records = [{ id: 'camp_tallow', status: 'alive', level: 3, aided: true }];
        state = runOvernight({ day: 3, campRecords: records, overnightState: state }).state;
        expect(state.camps.camp_tallow.condition).toBe('breached');
        expect(state.camps.camp_tallow.neglectNights).toBe(0);
    });

    it('caps creep at one ring per night and stops once settled', () => {
        let state = createOvernightState();
        const active = [{ id: 'hive_suture', status: 'awakened' }];
        state = runOvernight({ day: 2, hiveRecords: active, overnightState: state }).state;
        expect(state.hives.hive_suture.creepRings).toBe(1);
        state = runOvernight({ day: 3, hiveRecords: active, overnightState: state }).state;
        expect(state.hives.hive_suture.creepRings).toBe(2);
        // The player bonds with it; growth stops where it stands.
        const settled = [{ id: 'hive_suture', status: 'bonded' }];
        state = runOvernight({ day: 4, hiveRecords: settled, overnightState: state }).state;
        expect(state.hives.hive_suture.creepRings).toBe(2);
    });

    it('returns a ledger for the morning debrief', () => {
        const { result } = runOvernight({
            day: 9,
            campRecords: [{ id: 'camp_vesper', status: 'alive', level: 0 }],
            hiveRecords: [{ id: 'hive_relay', status: 'dormant' }]
        });
        expect(result.ledger.length).toBeGreaterThan(0);
        expect(result.ledger.every((line) => typeof line.text === 'string')).toBe(true);
    });

    it('handles a world with no camps or hives at all', () => {
        expect(() => runOvernight({ day: 1 })).not.toThrow();
        expect(runOvernight({ day: 1 }).result.ledger).toEqual([]);
    });
});

describe('creep world presence', () => {
    const hive = { hiveId: 'hive_suture', x: 100, z: 200, creepRings: 2 };

    it('stamps nothing until the creep has actually spread', () => {
        expect(planCreepDecals({ ...hive, creepRings: 0 })).toEqual([]);
        expect(planCreepDecals({ hiveId: '', x: 1, z: 1, creepRings: 3 })).toEqual([]);
        // A hive with no recorded position cannot be stamped.
        expect(planCreepDecals({ hiveId: 'hive_relay', x: null, z: null, creepRings: 2 })).toEqual([]);
    });

    // A patch that rearranges itself every load reads as a bug, not as growth.
    it('is deterministic for the same hive and ring count', () => {
        expect(planCreepDecals(hive)).toEqual(planCreepDecals(hive));
    });

    it('gives different hives different patches', () => {
        const a = planCreepDecals(hive);
        const b = planCreepDecals({ ...hive, hiveId: 'hive_relay' });
        expect(a[0]).not.toEqual(b[0]);
    });

    it('grows outward one ring at a time and keeps earlier rings in place', () => {
        const one = planCreepDecals({ ...hive, creepRings: 1 });
        const two = planCreepDecals({ ...hive, creepRings: 2 });
        expect(two.length).toBeGreaterThan(one.length);
        // The first ring is unchanged when the second appears.
        expect(two.slice(0, one.length)).toEqual(one);
        const maxRadius = (p) => Math.max(...p.map((d) => Math.hypot(d.x - hive.x, d.z - hive.z)));
        expect(maxRadius(two)).toBeGreaterThan(maxRadius(one));
    });

    it('thins out as it reaches, and only uses real decal art', () => {
        const decals = planCreepDecals({ ...hive, creepRings: 3 });
        const inner = decals.find((d) => d.ring === 1);
        const outer = decals.find((d) => d.ring === 3);
        expect(outer.scale).toBeLessThan(inner.scale);
        for (const decal of decals) {
            expect(['decal_growth_creep_1', 'decal_growth_creep_2']).toContain(decal.type);
        }
    });

    it('plans every hive from stored state in one pass', () => {
        const state = applyOvernight(createOvernightState(), {
            camps: [],
            hives: [{ id: 'hive_suture', creepRings: 1 }, { id: 'hive_relay', creepRings: 0 }]
        });
        const decals = planAllCreepDecals(
            [{ id: 'hive_suture', x: 10, z: 10 }, { id: 'hive_relay', x: 50, z: 50 }],
            state
        );
        expect(decals.every((d) => d.hiveId === 'hive_suture')).toBe(true);
        expect(decals.length).toBeGreaterThan(0);
    });
});
