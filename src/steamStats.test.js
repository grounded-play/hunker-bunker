import { describe, expect, it, vi } from 'vitest';
import { buildSteamStatUpdates, STEAM_STAT_DEFS, syncSteamStats } from './steamStats.js';

describe('canonical Steam stats', () => {
    it('defines stable Steamworks API names', () => {
        expect(Object.keys(STEAM_STAT_DEFS)).toEqual([
            'total_deaths',
            'longest_run_seconds',
            'total_kills',
            'total_runs',
            'total_victories',
            'shells_collected',
            'lore_drops_collected',
            'max_hive_bond'
        ]);
    });

    it('derives integer values from achievement state', () => {
        expect(buildSteamStatUpdates({
            stats: { totalDeaths: 4, maxRunMs: 125999 }
        })).toEqual([
            { apiName: 'total_deaths', value: 4 },
            { apiName: 'longest_run_seconds', value: 125 }
        ]);
    });

    it('sends only canonical, finite stats', () => {
        const setStat = vi.fn();
        const updates = syncSteamStats({
            stats: { totalDeaths: 3, maxRunMs: Number.NaN }
        }, setStat);

        expect(updates).toEqual([{ apiName: 'total_deaths', value: 3 }]);
        expect(setStat).toHaveBeenCalledExactlyOnceWith('total_deaths', 3);
    });

    // docs/steamstorestatus.log: Steamworks App Admin > Stats defines 8
    // stats (App 4957040); this file previously only read/synced the first
    // 2, leaving total_kills/total_runs/total_victories/shells_collected/
    // lore_drops_collected/max_hive_bond dashboard-only with nothing ever
    // writing to them, despite src/achievements.js already tracking every
    // one of those counters in achievementState.stats.
    it('derives all 6 previously-unwired stats from their existing achievementState.stats counters', () => {
        const updates = buildSteamStatUpdates({
            stats: {
                totalKills: 42,
                runCount: 7,
                victories: 3,
                shellsCollected: 158,
                loreDropIds: ['a', 'b', 'c'],
                loreDrops: 0,
                maxHiveBond: 4
            }
        });

        expect(updates).toEqual(expect.arrayContaining([
            { apiName: 'total_kills', value: 42 },
            { apiName: 'total_runs', value: 7 },
            { apiName: 'total_victories', value: 3 },
            { apiName: 'shells_collected', value: 158 },
            { apiName: 'lore_drops_collected', value: 3 },
            { apiName: 'max_hive_bond', value: 4 }
        ]));
    });

    it('lore_drops_collected falls back to the legacy loreDrops counter when loreDropIds is empty', () => {
        const updates = buildSteamStatUpdates({
            stats: { loreDropIds: [], loreDrops: 9 }
        });

        expect(updates).toContainEqual({ apiName: 'lore_drops_collected', value: 9 });
    });

    it('syncSteamStats calls setStat for every one of the 8 canonical stats when all are present', () => {
        const setStat = vi.fn();
        const updates = syncSteamStats({
            stats: {
                totalDeaths: 1,
                maxRunMs: 60000,
                totalKills: 2,
                runCount: 3,
                victories: 4,
                shellsCollected: 5,
                loreDropIds: ['x'],
                maxHiveBond: 6
            }
        }, setStat);

        expect(updates).toHaveLength(8);
        expect(setStat).toHaveBeenCalledTimes(8);
        expect(setStat).toHaveBeenCalledWith('max_hive_bond', 6);
    });
});
