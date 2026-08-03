import { describe, expect, it, vi } from 'vitest';
import { buildSteamStatUpdates, STEAM_STAT_DEFS, syncSteamStats } from './steamStats.js';

describe('canonical Steam stats', () => {
    it('defines stable Steamworks API names', () => {
        expect(Object.keys(STEAM_STAT_DEFS)).toEqual([
            'total_deaths',
            'longest_run_seconds'
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
});
