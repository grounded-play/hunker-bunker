import { describe, expect, it } from 'vitest';
import { PERSONAL_BESTS_STORAGE_KEY, createPersonalBests } from './personalBests.js';

function memoryStorage() {
    const data = new Map();
    return { getItem: (k) => (data.has(k) ? data.get(k) : null), setItem: (k, v) => data.set(k, String(v)), data };
}

// A payload the server would accept (validateRunScorePayload): its score is
// the recomputed one, so nothing here can disagree with the Steam board.
function payload({ outcome = 'death', runMs = 300_000, depthTier = 1, distance = 400, kills = 3, classType = 'SCOUT', daily = false, pvp = false } = {}) {
    const extracted = outcome === 'victory';
    const base = {
        schemaVersion: 2,
        runId: 'hb:test',
        classType,
        outcome,
        run: { runMs, ...(daily ? { dailyOps: { date: '2026-10-05' } } : {}) },
        stats: { depthTier, distanceTravelled: distance, snailsKilled: kills },
        mission: { status: extracted ? 'extracted' : 'failed' },
        depositedResources: {},
        multiplayer: pvp ? { isMultiplayer: true, mode: 'pvp' } : { isMultiplayer: false }
    };
    return base;
}

async function withScore(p) {
    const { recomputeRunScore } = await import('../server/leaderboardScoring.js');
    return { ...p, score: recomputeRunScore(p) };
}

describe('personal bests', () => {
    it('records every board the run counts for and reports what improved', async () => {
        const store = memoryStorage();
        const bests = createPersonalBests({ storage: store, now: () => 1000 });
        const run = await withScore(payload({ outcome: 'victory', runMs: 240_000, classType: 'TANK' }));
        const result = bests.recordRun(run);
        expect(result.improved.sort()).toEqual(['best_run_score', 'deepest_depth_score', 'fastest_extraction_ms', 'survival_time_seconds']);
        expect(bests.getState().fastest_extraction_ms).toEqual({ score: 240_000, at: 1000, classType: 'TANK' });
        expect(JSON.parse(store.data.get(PERSONAL_BESTS_STORAGE_KEY)).best_run_score.score).toBe(run.score);
    });

    it('keeps the better score: higher, or lower for the fastest extraction', async () => {
        const bests = createPersonalBests({ storage: memoryStorage(), now: () => 1 });
        bests.recordRun(await withScore(payload({ outcome: 'victory', runMs: 240_000 })));
        const slower = bests.recordRun(await withScore(payload({ outcome: 'victory', runMs: 400_000, distance: 10, kills: 0 })));
        expect(slower.improved).toEqual(['survival_time_seconds']);
        expect(bests.getState().fastest_extraction_ms.score).toBe(240_000);
        const faster = bests.recordRun(await withScore(payload({ outcome: 'victory', runMs: 200_000, distance: 10, kills: 0 })));
        expect(faster.improved).toContain('fastest_extraction_ms');
        expect(bests.getState().fastest_extraction_ms.score).toBe(200_000);
    });

    it('counts daily ops only on a daily run', async () => {
        const bests = createPersonalBests({ storage: memoryStorage() });
        bests.recordRun(await withScore(payload()));
        expect(bests.getState().daily_ops_score).toBeUndefined();
        expect(bests.recordRun(await withScore(payload({ daily: true }))).improved).toContain('daily_ops_score');
    });

    it('ignores runs the server would not rank (PvP, a mismatched score)', async () => {
        const bests = createPersonalBests({ storage: memoryStorage() });
        expect(bests.recordRun(await withScore(payload({ pvp: true }))).improved).toEqual([]);
        expect(bests.recordRun({ ...(await withScore(payload())), score: 999_999 }).improved).toEqual([]);
        expect(bests.getState()).toEqual({});
    });

    it('survives corrupt storage', () => {
        const store = memoryStorage();
        store.setItem(PERSONAL_BESTS_STORAGE_KEY, '{nope');
        expect(createPersonalBests({ storage: store }).getState()).toEqual({});
    });
});
