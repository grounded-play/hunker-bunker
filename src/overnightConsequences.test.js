import { describe, expect, it } from 'vitest';
import {
    applyShoreUp,
    buildCreepZones,
    CAMP_CONDITION_EFFECTS,
    CREEP_EFFECTS,
    creepAt,
    creepSpawnMultiplier,
    getCampConditionEffects,
    planShoreUp,
    scaleCampPrice
} from './overnightConsequences.js';
import { CAMP_CONDITIONS } from './overnightSim.js';

const hives = [
    { id: 'hive_suture', x: 100, z: 100, status: 'dormant' },
    { id: 'hive_relay', x: 300, z: 0, status: 'bonded' },
    { id: 'hive_carapace', x: -200, z: 0, status: 'wounded' }
];
const night = { hives: { hive_suture: { creepRings: 3 }, hive_relay: { creepRings: 2 }, hive_carapace: { creepRings: 0 } } };

describe('overnight creep has teeth', () => {
    it('builds zones only for spreading creep, never a bonded hive\'s', () => {
        const zones = buildCreepZones(hives, night);
        expect(zones.map((zone) => zone.hiveId)).toEqual(['hive_suture']);
        expect(zones[0].radius).toBeCloseTo(3 * 3.1 + 1.5);
        expect(buildCreepZones(hives, null)).toEqual([]);
    });

    it('slows, suffocates and, at full spread, burns', () => {
        const zones = buildCreepZones(hives, night);
        const core = creepAt(zones, 102, 100);
        expect(core.rings).toBe(3);
        expect(core.speedMultiplier).toBeCloseTo(1 - 3 * CREEP_EFFECTS.slowPerRing);
        expect(core.o2DrainMultiplier).toBeCloseTo(1 + 3 * CREEP_EFFECTS.o2DrainPerRing);
        expect(core.burns).toBe(true);
        expect(creepAt(zones, 150, 100)).toBeNull();
        const shallow = creepAt(buildCreepZones(hives, { hives: { hive_suture: { creepRings: 1 } } }), 102, 100);
        expect(shallow.burns).toBe(false);
        expect(shallow.speedMultiplier).toBeGreaterThan(core.speedMultiplier);
    });

    it('breeds hostiles in the chunks the creep reaches', () => {
        const zones = buildCreepZones(hives, night);
        expect(creepSpawnMultiplier(zones, 2, 2, 49)).toBeCloseTo(1 + 3 * CREEP_EFFECTS.spawnDensityPerRing);
        expect(creepSpawnMultiplier(zones, 8, 8, 49)).toBe(1);
        expect(creepSpawnMultiplier([], 2, 2, 49)).toBe(1);
    });
});

describe('camp condition changes what a camp can offer', () => {
    it('covers every overnight condition, worsening monotonically', () => {
        for (const condition of CAMP_CONDITIONS) expect(CAMP_CONDITION_EFFECTS[condition], condition).toBeDefined();
        const order = ['secure', 'strained', 'breached', 'overrun'];
        for (let i = 1; i < order.length; i += 1) {
            expect(getCampConditionEffects(order[i]).priceMultiplier).toBeGreaterThan(getCampConditionEffects(order[i - 1]).priceMultiplier);
        }
        expect(getCampConditionEffects('secure')).toMatchObject({ medic: true, rest: true, activeVerb: true });
        expect(getCampConditionEffects('breached')).toMatchObject({ medic: false, rest: false, activeVerb: true });
        expect(getCampConditionEffects('overrun')).toMatchObject({ medic: false, rest: false, activeVerb: false });
        expect(getCampConditionEffects('unknown')).toBe(CAMP_CONDITION_EFFECTS.secure);
    });

    it('charges more at a camp under strain, in whole shells', () => {
        expect(scaleCampPrice(10, 'secure')).toBe(10);
        expect(scaleCampPrice(10, 'strained')).toBe(13);
        expect(scaleCampPrice(10, 'breached')).toBe(15);
        expect(scaleCampPrice(7, 'overrun')).toBe(14);
    });

    it('lets a breached or overrun camp be shored up one step and resets its neglect', () => {
        expect(planShoreUp('secure')).toBeNull();
        expect(planShoreUp('strained')).toBeNull();
        expect(planShoreUp('abandoned')).toBeNull();
        const plan = planShoreUp('overrun');
        expect(plan).toEqual({ cost: 14, from: 'overrun', to: 'breached' });
        const state = { version: 1, camps: { camp_tallow: { condition: 'overrun', neglectNights: 2 } }, hives: {} };
        const next = applyShoreUp(state, 'camp_tallow', plan);
        expect(next.camps.camp_tallow).toEqual({ condition: 'breached', neglectNights: 0 });
        expect(state.camps.camp_tallow.condition).toBe('overrun');
    });
});
