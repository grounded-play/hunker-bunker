import { describe, expect, it } from 'vitest';
import { isHotspotAvailable } from './gating.js';
import { createRunState } from './state.js';

const base = () => createRunState();
const seen = (...ids) => new Set(ids);

describe('isHotspotAvailable', () => {
    it('hides a once-hotspot that has already been visited', () => {
        const hotspot = { id: 'a', once: true };
        expect(isHotspotAvailable(hotspot, base(), seen())).toBe(true);
        expect(isHotspotAvailable(hotspot, base(), seen('a'))).toBe(false);
    });

    it('keeps a repeatable hotspot available after it is visited', () => {
        const hotspot = { id: 'a' };
        expect(isHotspotAvailable(hotspot, base(), seen('a'))).toBe(true);
    });

    it('requires every requiresAllOf dependency to be visited', () => {
        const hotspot = { id: 'c', requiresAllOf: ['a', 'b'] };
        expect(isHotspotAvailable(hotspot, base(), seen('a'))).toBe(false);
        expect(isHotspotAvailable(hotspot, base(), seen('a', 'b'))).toBe(true);
    });

    describe('excludesAllOf', () => {
        it('hides a hotspot once its excluded sibling is visited', () => {
            const keep = { id: 'keep', excludesAllOf: ['surrender'] };
            expect(isHotspotAvailable(keep, base(), seen())).toBe(true);
            expect(isHotspotAvailable(keep, base(), seen('surrender'))).toBe(false);
        });

        it('is unaffected by unrelated visits', () => {
            const keep = { id: 'keep', excludesAllOf: ['surrender'] };
            expect(isHotspotAvailable(keep, base(), seen('something_else'))).toBe(true);
        });
    });

    describe('requires.minVisitedOf', () => {
        const exit = {
            id: 'exit',
            requires: { minVisitedOf: { ids: ['a', 'b', 'c', 'd'], count: 3 } }
        };

        it('stays locked below the threshold', () => {
            expect(isHotspotAvailable(exit, base(), seen())).toBe(false);
            expect(isHotspotAvailable(exit, base(), seen('a', 'b'))).toBe(false);
        });

        it('unlocks once enough of the listed beats are visited', () => {
            expect(isHotspotAvailable(exit, base(), seen('a', 'b', 'c'))).toBe(true);
            expect(isHotspotAvailable(exit, base(), seen('a', 'b', 'c', 'd'))).toBe(true);
        });

        it('only counts ids from its own list', () => {
            expect(isHotspotAvailable(exit, base(), seen('x', 'y', 'z'))).toBe(false);
        });
    });

    describe('trust gates', () => {
        const strong = { id: 'strong', requires: { minTrust4A: 2 } };
        const weak = { id: 'weak', requires: { maxTrust4A: 1 } };

        it('opens the strong-calibration path only at or above the trust threshold', () => {
            expect(isHotspotAvailable(strong, { ...base(), trust4A: 1 }, seen())).toBe(false);
            expect(isHotspotAvailable(strong, { ...base(), trust4A: 2 }, seen())).toBe(true);
        });

        it('opens the weak-calibration path only below the trust threshold', () => {
            expect(isHotspotAvailable(weak, { ...base(), trust4A: 1 }, seen())).toBe(true);
            expect(isHotspotAvailable(weak, { ...base(), trust4A: 2 }, seen())).toBe(false);
        });

        it('is mutually exclusive so exactly one rescue path is ever offered', () => {
            for (const trust4A of [0, 1, 2, 3, 4]) {
                const state = { ...base(), trust4A };
                const open = [strong, weak].filter((h) => isHotspotAvailable(h, state, seen()));
                expect(open).toHaveLength(1);
            }
        });
    });

    describe('pre-existing gates still hold', () => {
        it('honours flag requirements', () => {
            const hotspot = { id: 'a', requires: { flags: { noticedMarisolPressure: true } } };
            expect(isHotspotAvailable(hotspot, base(), seen())).toBe(false);
            const noticed = { ...base(), flags: { ...base().flags, noticedMarisolPressure: true } };
            expect(isHotspotAvailable(hotspot, noticed, seen())).toBe(true);
        });

        it('honours maxTimeBand', () => {
            const hotspot = { id: 'a', requires: { maxTimeBand: 2 } };
            expect(isHotspotAvailable(hotspot, { ...base(), timeBand: 2 }, seen())).toBe(true);
            expect(isHotspotAvailable(hotspot, { ...base(), timeBand: 3 }, seen())).toBe(false);
        });

        it('honours painSet', () => {
            const hotspot = { id: 'a', requires: { painSet: true } };
            expect(isHotspotAvailable(hotspot, base(), seen())).toBe(false);
            expect(isHotspotAvailable(hotspot, { ...base(), pain: 'injured' }, seen())).toBe(true);
        });

        it('honours canExpose', () => {
            const hotspot = { id: 'a', requires: { canExpose: true } };
            expect(isHotspotAvailable(hotspot, base(), seen())).toBe(false);
            const armed = {
                ...base(),
                evidence: ['training_profile', 'camera_discrepancy', 'swab_photo', 'kiosk_record']
            };
            expect(isHotspotAvailable(hotspot, armed, seen())).toBe(true);
        });
    });
});
