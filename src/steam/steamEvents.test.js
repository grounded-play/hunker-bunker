import { describe, expect, it } from 'vitest';
import { buildSteamRunScorePayload } from './steamEvents.js';

describe('buildSteamRunScorePayload', () => {
    it('builds normalized leaderboard targets for a normal failed run', () => {
        const payload = buildSteamRunScorePayload({
            stats: {
                distanceTravelled: 432,
                totalPickups: 17,
                generatorLevel: 2,
                depthTier: 3,
                depthTierName: 'ABYSS',
                biomeKey: 'bio',
                biomeLabel: 'BIO',
                snailsKilled: 8,
                missionType: 'survey',
                missionStatus: 'failed',
                missionLabel: 'SURVEY',
                hadNearDeath: true
            },
            score: 1234,
            rating: { grade: 'B', label: 'PARTIAL SUCCESS' },
            classType: 'engineer',
            runStartTime: 1000,
            endedAt: 91000,
            deathReason: 'o2',
            depositedResources: { tech: 5, coin: 3, med: 1 }
        });

        expect(payload).toMatchObject({
            schemaVersion: 1,
            runId: 'hb:1000:91000:ENGINEER:no-seed',
            classType: 'ENGINEER',
            outcome: 'death',
            deathReason: 'o2',
            score: 1234,
            run: {
                runMs: 90000,
                dailyOps: null
            },
            stats: {
                distanceTravelled: 432,
                depthTier: 3,
                snailsKilled: 8,
                hadNearDeath: true
            },
            depositedResources: { tech: 5, coin: 3, med: 1 }
        });
        expect(payload.leaderboardTargets).toEqual([
            { name: 'best_run_score', score: 1234, keep: 'best' },
            { name: 'survival_time_seconds', score: 90, keep: 'best' },
            { name: 'deepest_depth_score', score: 300432, keep: 'best' }
        ]);
    });

    it('adds daily and fastest extraction targets for a daily victory', () => {
        const payload = buildSteamRunScorePayload({
            stats: {
                distanceTravelled: 900,
                depthTier: 2,
                missionStatus: 'extracted'
            },
            score: 2222,
            rating: { grade: 'S', label: 'EXEMPLARY FIELD PERFORMANCE' },
            classType: 'SCOUT',
            runStartTime: 10,
            endedAt: 2010,
            isVictory: true,
            isDailyOps: true,
            dailyOpsDate: '2026-07-12',
            seed: 37,
            runCards: [{ id: 'low_o2', label: 'LOW O2' }]
        });

        expect(payload).toMatchObject({
            runId: 'hb:10:2010:SCOUT:37',
            outcome: 'victory',
            deathReason: null,
            run: {
                dailyOps: { date: '2026-07-12' },
                cards: [{ id: 'low_o2', label: 'LOW O2' }]
            }
        });
        expect(payload.leaderboardTargets).toEqual([
            { name: 'best_run_score', score: 2222, keep: 'best' },
            { name: 'survival_time_seconds', score: 2, keep: 'best' },
            { name: 'deepest_depth_score', score: 200900, keep: 'best' },
            { name: 'daily_ops_score', score: 2222, keep: 'best' },
            { name: 'fastest_extraction_ms', score: 2000, keep: 'best' }
        ]);
    });
});
