import { describe, expect, it, vi } from 'vitest';
import { RECORD_BOARDS, availableScopes, createBoardCache, recordsStatus, selfRank } from './recordsTab.js';

describe('Archive → RECORDS logic', () => {
    it('lists the five Steam boards, best run first', () => {
        expect(RECORD_BOARDS).toEqual(['best_run_score', 'survival_time_seconds', 'deepest_depth_score', 'fastest_extraction_ms', 'daily_ops_score']);
    });

    it('offers Friends and Around me only with a Steam session', () => {
        expect(availableScopes({ steam: true })).toEqual(['Global', 'Friends', 'AroundUser']);
        expect(availableScopes({ steam: false })).toEqual(['Global']);
    });

    it('caches a board and scope for a minute so chip-hopping does not refetch', async () => {
        let clock = 0;
        const fetch = vi.fn(async ({ board, scope }) => ({ state: 'live', entries: [{ board, scope }], selfSteamId: null }));
        const cache = createBoardCache({ fetch, now: () => clock, ttlMs: 60_000 });
        await cache.get('best_run_score', 'Global');
        await cache.get('best_run_score', 'Global');
        expect(fetch).toHaveBeenCalledTimes(1);
        await cache.get('best_run_score', 'Friends');
        expect(fetch).toHaveBeenCalledTimes(2);
        clock = 61_000;
        await cache.get('best_run_score', 'Global');
        expect(fetch).toHaveBeenCalledTimes(3);
    });

    it('does not keep an offline answer, so the next look retries', async () => {
        const fetch = vi.fn(async () => ({ state: 'offline', entries: [], selfSteamId: null }));
        const cache = createBoardCache({ fetch, now: () => 0, ttlMs: 60_000 });
        await cache.get('best_run_score', 'Global');
        await cache.get('best_run_score', 'Global');
        expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('describes each board state', () => {
        const t = (key, params) => (params ? `${key}:${JSON.stringify(params)}` : key);
        expect(recordsStatus({ state: 'loading' }, t)).toBe('ui.records.loading');
        expect(recordsStatus({ state: 'offline' }, t)).toBe('ui.records.offline');
        expect(recordsStatus({ state: 'live', board: 'best_run_score', scope: 'Global' }, t))
            .toBe('ui.records.status:{"board":"ui.records.board_best_run_score","scope":"ui.records.scope_global"}');
        expect(recordsStatus({ state: 'mock', board: 'daily_ops_score', scope: 'Friends' }, t))
            .toBe('ui.records.status_mock:{"board":"ui.records.board_daily_ops_score","scope":"ui.records.scope_friends"}');
    });

    it('finds your own rank in an Around me result', () => {
        const result = { state: 'live', selfSteamId: '9', entries: [{ steamId64: '8', rank: 11 }, { steamId64: '9', rank: 12 }] };
        expect(selfRank(result)).toBe(12);
        expect(selfRank({ ...result, selfSteamId: null })).toBeNull();
        expect(selfRank({ state: 'offline', entries: [] })).toBeNull();
    });
});
