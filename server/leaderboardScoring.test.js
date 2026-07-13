import { describe, expect, it } from 'vitest';
import {
    buildCanonicalLeaderboardTargets,
    recomputeRunScore,
    validateRunScorePayload
} from './leaderboardScoring.js';

function basePayload(overrides = {}) {
    return {
        schemaVersion: 1,
        runId: 'hb:1000:91000:ENGINEER:no-seed',
        classType: 'ENGINEER',
        outcome: 'death',
        score: 891,
        mission: {
            type: 'survey',
            status: 'failed',
            label: 'SURVEY'
        },
        run: {
            runMs: 90000,
            dailyOps: null
        },
        stats: {
            distanceTravelled: 432,
            totalPickups: 17,
            generatorLevel: 2,
            depthTier: 3,
            snailsKilled: 8,
            hadNearDeath: true,
            fullHealthAtEnd: false
        },
        depositedResources: {
            tech: 5,
            coin: 3,
            med: 1
        },
        ...overrides
    };
}

describe('leaderboard scoring', () => {
    it('recomputes the same score as the current game formula for failed runs', () => {
        expect(recomputeRunScore(basePayload())).toBe(891);
        expect(validateRunScorePayload(basePayload())).toMatchObject({
            ok: true,
            recomputedScore: 891
        });
    });

    it('rejects mismatched client scores', () => {
        const result = validateRunScorePayload(basePayload({ score: 9999 }));

        expect(result).toMatchObject({
            ok: false,
            errors: ['score_mismatch'],
            recomputedScore: 891
        });
    });

    it('includes daily and fastest extraction targets only when appropriate', () => {
        const payload = basePayload({
            runId: 'hb:10:2010:SCOUT:37',
            classType: 'SCOUT',
            outcome: 'victory',
            score: 1244,
            mission: { type: 'survey', status: 'extracted', label: 'SURVEY' },
            run: {
                runMs: 2000,
                dailyOps: { date: '2026-07-12' }
            },
            stats: {
                distanceTravelled: 900,
                totalPickups: 0,
                generatorLevel: 0,
                depthTier: 2,
                snailsKilled: 0,
                hadNearDeath: false,
                fullHealthAtEnd: true
            },
            depositedResources: { tech: 0, coin: 0, med: 0 }
        });

        expect(validateRunScorePayload(payload)).toMatchObject({ ok: true });
        expect(buildCanonicalLeaderboardTargets(payload)).toEqual([
            { name: 'best_run_score', score: 1244, scoreMethod: 'KeepBest' },
            { name: 'survival_time_seconds', score: 2, scoreMethod: 'KeepBest' },
            { name: 'deepest_depth_score', score: 200900, scoreMethod: 'KeepBest' },
            { name: 'daily_ops_score', score: 1244, scoreMethod: 'KeepBest' },
            { name: 'fastest_extraction_ms', score: 2000, scoreMethod: 'KeepBest' }
        ]);
    });
});
