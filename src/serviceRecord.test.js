import { describe, expect, it } from 'vitest';
import { buildServiceRecord, formatDuration } from './serviceRecord.js';

const label = (key, params) => (params ? `${key}:${JSON.stringify(params)}` : key);

describe('service record', () => {
    it('reads a fresh save as zeros, never NaN or undefined', () => {
        const record = buildServiceRecord({ stats: {}, ledger: {}, totals: {}, t: label, locale: 'en' });
        const text = JSON.stringify(record);
        expect(text).not.toMatch(/NaN|undefined|null/);
        expect(record.map((section) => section.id)).toEqual(['career', 'bests', 'byClass', 'combat', 'exploration', 'story']);
        expect(record.find((s) => s.id === 'bests').rows).toEqual([{ id: 'noBests', labelKey: 'ui.records.no_bests', display: '—' }]);
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

    it('shows time in the crust, personal bests and per-class records', () => {
        const record = buildServiceRecord({
            stats: {
                totalRunMs: 3_725_000,
                byClass: { SCOUT: { runs: 12, victories: 3, deaths: 9, deepestTier: 2 } }
            },
            bests: {
                best_run_score: { score: 1550, at: 1, classType: 'TANK' },
                fastest_extraction_ms: { score: 245_400, at: 1, classType: 'SCOUT' }
            },
            totals: { tierNames: ['SURFACE', 'SHALLOW', 'DEEP'], classes: 3 },
            t: label,
            locale: 'en'
        });
        const rows = (id) => record.find((s) => s.id === id).rows;
        expect(rows('career').find((r) => r.id === 'timeInCrust').display).toBe('1h 02m');
        expect(rows('bests')).toEqual([
            { id: 'best_run_score', labelKey: 'ui.records.board_best_run_score', display: '1550' },
            { id: 'fastest_extraction_ms', labelKey: 'ui.records.board_fastest_extraction_ms', display: '4m 05s' }
        ]);
        expect(rows('byClass').map((r) => [r.id, r.labelKey, r.display])).toEqual([
            ['SCOUT', 'ui.menu.scout', 'ui.records.class_line:{"runs":"12","wins":"3","tier":"DEEP"}'],
            ['TANK', 'ui.menu.tank', 'ui.records.class_line:{"runs":"0","wins":"0","tier":"SURFACE"}'],
            ['ENGINEER', 'ui.menu.engineer', 'ui.records.class_line:{"runs":"0","wins":"0","tier":"SURFACE"}']
        ]);
    });

    it('formats durations in hours, minutes and seconds', () => {
        expect(formatDuration(0)).toBe('0s');
        expect(formatDuration(59_999)).toBe('59s');
        expect(formatDuration(61_000)).toBe('1m 01s');
        expect(formatDuration(3_725_000)).toBe('1h 02m');
    });
});
