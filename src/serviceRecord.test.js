import { describe, expect, it } from 'vitest';
import { buildServiceRecord, formatDuration } from './serviceRecord.js';

const label = (key, params) => (params ? `${key}:${JSON.stringify(params)}` : key);

describe('service record', () => {
    it('reads a fresh save as zeros, never NaN or undefined', () => {
        const record = buildServiceRecord({ stats: {}, ledger: {}, totals: {}, t: label, locale: 'en' });
        const text = JSON.stringify(record);
        expect(text).not.toMatch(/NaN|undefined|null/);
        expect(record.map((section) => section.id)).toEqual(['career', 'combat', 'exploration', 'story']);
        const career = Object.fromEntries(record[0].rows.map((row) => [row.id, row.display]));
        expect(career).toMatchObject({ runs: '0', victories: '0', deaths: '0' });
    });

    it('formats lifetime numbers, durations, tier names and progress', () => {
        const record = buildServiceRecord({
            stats: {
                runCount: 1234, victories: 3, totalDeaths: 39, totalKills: 120400, maxKillsOneRun: 61,
                queenDefeated: true, maxDepthTier: 2, totalDistanceTravelled: 18420.7, maxCampsDiscoveredOneRun: 4,
                maxRunMs: 1_120_000, loreDropIds: ['a', 'b'], loreDrops: 2, endings: { a: 1, b: 1 },
                classesCompleted: { SCOUT: true, TANK: true }, shellsCollected: 902
            },
            ledger: { startedAt: Date.UTC(2026, 6, 4) },
            totals: { lore: 42, endings: 10, classes: 3, tierNames: ['SURFACE', 'SUB-CRUST', 'DEEP CRUST'] },
            t: label,
            locale: 'en'
        });
        const rows = Object.fromEntries(record.flatMap((section) => section.rows).map((row) => [row.id, row.display]));
        expect(rows).toMatchObject({
            runs: '1,234', victories: '3', deaths: '39', since: '2026-07-04',
            hostiles: '120,400', mostInRun: '61', queen: 'ui.records.yes', longestRun: '18m 40s',
            deepest: 'DEEP CRUST', distance: '18,421u', camps: '4',
            lore: '2 / 42', endings: '2 / 10', classes: '2 / 3', shells: '902'
        });
    });

    it('uses the larger of the lore id list and the lore counter', () => {
        const record = buildServiceRecord({ stats: { loreDrops: 5, loreDropIds: ['a'] }, totals: { lore: 42 }, t: label, locale: 'en' });
        expect(record.find((s) => s.id === 'story').rows.find((r) => r.id === 'lore').display).toBe('5 / 42');
    });

    it('uses the counts the Archive shows when the caller has them', () => {
        const record = buildServiceRecord({
            stats: { loreDrops: 5, endings: { a: 1 } },
            totals: { lore: 42, loreFound: 17, endings: 10, endingsFound: 4 },
            t: label, locale: 'en'
        });
        const story = Object.fromEntries(record.find((s) => s.id === 'story').rows.map((r) => [r.id, r.display]));
        expect(story).toMatchObject({ lore: '17 / 42', endings: '4 / 10' });
    });

    it('formats durations in hours, minutes and seconds', () => {
        expect(formatDuration(0)).toBe('0s');
        expect(formatDuration(59_999)).toBe('59s');
        expect(formatDuration(61_000)).toBe('1m 01s');
        expect(formatDuration(3_725_000)).toBe('1h 02m');
    });
});
