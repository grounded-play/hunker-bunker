import { describe, expect, it } from 'vitest';
import {
    ABANDONMENT_NEGLECT_NIGHTS,
    CAMP_CONDITIONS,
    CREEP_RING_CAP,
    nightlyThreat,
    resolveCampNight,
    resolveHiveNight,
    simulateOvernight
} from './overnightSim.js';

describe('hive creep', () => {
    it('spreads at most one ring per sleep', () => {
        let hive = { id: 'hive_suture', creepRings: 0 };
        const seen = [];
        for (let i = 0; i < 5; i += 1) {
            hive = { ...hive, ...resolveHiveNight(hive) };
            seen.push(hive.creepRings);
        }
        expect(seen).toEqual([1, 2, 3, 3, 3]);
        expect(Math.max(...seen)).toBeLessThanOrEqual(CREEP_RING_CAP);
    });

    it('leaves settled hives alone', () => {
        for (const status of ['purged', 'bonded', 'parleyed']) {
            const result = resolveHiveNight({ id: 'hive_relay', creepRings: 1, status });
            expect(result.grew).toBe(false);
            expect(result.creepRings).toBe(1);
        }
    });
});

describe('camp nights', () => {
    const threat = nightlyThreat(5);

    it('holds when fortification meets the night', () => {
        const result = resolveCampNight({ id: 'camp_tallow', condition: 'secure', fortification: 1 }, threat);
        expect(result.held).toBe(true);
        expect(result.condition).toBe('secure');
        expect(result.neglectNights).toBe(0);
    });

    it('degrades exactly one visible step per failed night', () => {
        let camp = { id: 'camp_vesper', condition: 'secure', fortification: 0 };
        const steps = [];
        for (let i = 0; i < 3; i += 1) {
            camp = { ...camp, ...resolveCampNight(camp, threat) };
            steps.push(camp.condition);
        }
        expect(steps).toEqual(['strained', 'breached', 'overrun']);
    });

    it('abandons only after repeated neglect, never on a first bad night', () => {
        let camp = { id: 'camp_meridian', condition: 'secure', fortification: 0 };
        const conditions = [];
        for (let i = 0; i < 8; i += 1) {
            camp = { ...camp, ...resolveCampNight(camp, threat) };
            conditions.push(camp.condition);
        }
        expect(conditions[0]).not.toBe('abandoned');
        const firstAbandon = conditions.indexOf('abandoned');
        expect(firstAbandon).toBeGreaterThanOrEqual(ABANDONMENT_NEGLECT_NIGHTS);
        // Once lost it stays lost, and stops generating further change.
        const after = resolveCampNight({ id: 'camp_meridian', condition: 'abandoned' }, threat);
        expect(after.changed).toBe(false);
    });

    it('lets a resupplied camp climb back one step per good night', () => {
        let camp = { id: 'camp_tallow', condition: 'overrun', fortification: 1, neglectNights: 2 };
        camp = { ...camp, ...resolveCampNight(camp, threat) };
        expect(camp.condition).toBe('breached');
        expect(camp.neglectNights).toBe(0);
        camp = { ...camp, ...resolveCampNight(camp, threat) };
        expect(camp.condition).toBe('strained');
    });

    it('asks more of a camp as the campaign wears on', () => {
        const early = nightlyThreat(1);
        const late = nightlyThreat(12);
        expect(late).toBeGreaterThan(early);
        const camp = { id: 'camp_vesper', condition: 'secure', fortification: 0.4 };
        expect(resolveCampNight(camp, early).held).toBe(true);
        expect(resolveCampNight(camp, late).held).toBe(false);
    });
});

describe('simulateOvernight', () => {
    it('is deterministic, so the player can predict the night before resting', () => {
        const input = {
            day: 6,
            camps: [{ id: 'camp_tallow', condition: 'secure', fortification: 0.2 }],
            hives: [{ id: 'hive_suture', creepRings: 0 }]
        };
        expect(simulateOvernight(input)).toEqual(simulateOvernight(input));
    });

    it('reports every change as a ledger line for the morning debrief', () => {
        const result = simulateOvernight({
            day: 7,
            camps: [
                { id: 'camp_tallow', condition: 'secure', fortification: 0 },
                { id: 'camp_vesper', condition: 'secure', fortification: 1 }
            ],
            hives: [{ id: 'hive_suture', creepRings: 0 }]
        });
        const kinds = result.ledger.map((line) => line.kind);
        expect(kinds).toContain('camp');
        expect(kinds).toContain('hive');
        expect(result.ledger.some((line) => line.severity === 'warning')).toBe(true);
        expect(result.ledger.every((line) => typeof line.text === 'string' && line.text.length > 0)).toBe(true);
    });

    it('survives empty and malformed input', () => {
        expect(simulateOvernight().camps).toEqual([]);
        expect(simulateOvernight({ camps: null, hives: 'nope' }).hives).toEqual([]);
        expect(simulateOvernight({ day: -5 }).day).toBe(1);
    });

    it('keeps every camp condition on the documented ladder', () => {
        const result = simulateOvernight({
            day: 9,
            camps: [{ id: 'a', condition: 'bogus', fortification: 0 }],
            hives: []
        });
        expect(CAMP_CONDITIONS).toContain(result.camps[0].condition);
    });
});
