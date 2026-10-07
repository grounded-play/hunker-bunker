import { describe, expect, it } from 'vitest';
import { BOOT_CARRY_MIN, TRACK_SURFACES, createTrackField, slimeColorFor, stepBoots, trackAlpha } from './trackField.js';

// Owner, 2026-10-07: "I want to leave footprints as we walk that fade and
// change based on if we walked on water, blood, ice, etc ... enemies leave
// slime trails too".
describe('boots carry what you stepped in', () => {
    it('leaves faint dust on plain floor and pressed prints in snow', () => {
        expect(stepBoots(null, null).print).toEqual({ surface: 'dust', strength: 1 });
        expect(stepBoots(null, 'snow').print).toEqual({ surface: 'snow', strength: 1 });
    });

    it('loads the boots in blood, then fades over the next steps', () => {
        let { print, boots } = stepBoots(null, 'blood');
        expect(print).toEqual({ surface: 'blood', strength: 1 });
        const strengths = [];
        for (let i = 0; i < 20; i++) {
            ({ print, boots } = stepBoots(boots, null));
            if (print.surface === 'blood') strengths.push(print.strength);
        }
        expect(strengths.length).toBeGreaterThanOrEqual(10);
        expect(strengths.length).toBeLessThanOrEqual(13);
        expect(strengths.every((value, i) => i === 0 || value < strengths[i - 1])).toBe(true);
        expect(Math.min(...strengths)).toBeGreaterThanOrEqual(BOOT_CARRY_MIN);
        // ...and then back to dust.
        expect(print.surface).toBe('dust');
    });

    it('a fresh liquid replaces what the boots carried', () => {
        const { boots } = stepBoots(null, 'blood');
        expect(stepBoots(boots, 'water').print.surface).toBe('water');
    });
});

describe('marks fade', () => {
    it('holds full strength, then eases out to nothing at the end of its life', () => {
        expect(trackAlpha(0.5, 0, 10)).toBe(0.5);
        expect(trackAlpha(0.5, 5, 10)).toBe(0.5);
        expect(trackAlpha(0.5, 8, 10)).toBeCloseTo(0.25);
        expect(trackAlpha(0.5, 10, 10)).toBe(0);
    });

    it('lasts longest in snow and briefest as dust', () => {
        const lives = Object.fromEntries(Object.entries(TRACK_SURFACES).map(([k, v]) => [k, v.life]));
        expect(lives.snow).toBeGreaterThan(lives.blood);
        expect(lives.dust).toBeLessThan(lives.water);
    });

    it('tints slime by snail type', () => {
        expect(slimeColorFor('cryosnail')).not.toBe(slimeColorFor('sporesnail'));
    });
});

describe('the pooled field', () => {
    it('reuses a fixed ring of slots and expires old marks', () => {
        const field = createTrackField({ printCapacity: 4, smearCapacity: 4 });
        for (let i = 0; i < 6; i++) field.addPrint({ x: i, z: 0, surface: 'water', now: 0 });
        expect(field.prints.mesh.count).toBe(4);
        expect(field.prints.next).toBe(2);
        field.addSmear({ x: 0, z: 0, color: slimeColorFor('cybersnail'), life: 2, now: 0 });
        expect(field.update(1)).toBe(5);
        expect(field.update(100)).toBe(0);
        field.dispose();
    });
});
