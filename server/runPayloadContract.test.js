import { describe, expect, it } from 'vitest';
import { buildSteamRunScorePayload } from '../src/steam/steamEvents.js';
import { computeRunScore } from '../src/runScore.js';
import { validateRunScorePayload } from './leaderboardScoring.js';

// Cross-boundary contract: the payload the game actually builds must pass the
// server's validator. The client and server suites each use their own
// fixtures, which is how the 2026-09-15 schemaVersion 1 -> 2 bump shipped
// while every real submit was rejected with `unsupported_schema`.
function buildClientPayload({ isVictory = false, dailyOpsDate = null, runMinutes = 8, stats = {}, deposited = {} } = {}) {
    const runStartTime = 1_760_000_000_000;
    const endedAt = runStartTime + Math.round(runMinutes * 60000);
    const runStats = {
        distanceTravelled: 340,
        depthTier: 2,
        snailsKilled: 5,
        missionType: 'survey',
        missionStatus: isVictory ? 'extracted' : 'failed',
        missionLabel: 'SURVEY',
        hadNearDeath: true,
        fullHealthAtEnd: isVictory,
        pickupsCollected: 12,
        salvageBanked: 4,
        ...stats
    };
    const depositedResources = { tech: 3, coin: 7, med: 1, ...deposited };
    const score = computeRunScore({
        stats: runStats,
        missionStatus: runStats.missionStatus,
        depositedResources,
        runMs: endedAt - runStartTime
    });
    return buildSteamRunScorePayload({
        stats: runStats,
        score,
        rating: { grade: 'C', label: 'X' },
        classType: 'TANK',
        runStartTime,
        endedAt,
        isVictory,
        deathReason: isVictory ? null : 'o2',
        isDailyOps: Boolean(dailyOpsDate),
        dailyOpsDate,
        seed: 'seed-1',
        depositedResources
    });
}

describe('client run payload -> server validator contract', () => {
    it.each([
        ['death', {}],
        ['victory', { isVictory: true }],
        ['daily ops death', { dailyOpsDate: '2026-09-21' }],
        ['long run (no time bonus)', { runMinutes: 42 }],
        ['sub-minute run on a time-bonus boundary', { runMinutes: 14.976 }],
        ['zero-stat run', { runMinutes: 0.5, stats: { distanceTravelled: 0, depthTier: 0, snailsKilled: 0, hadNearDeath: false }, deposited: { tech: 0, coin: 0, med: 0 } }]
    ])('accepts a real %s payload', (_label, options) => {
        const payload = buildClientPayload(options);
        const result = validateRunScorePayload(payload);
        expect(result.errors).toEqual([]);
        expect(result.ok).toBe(true);
        expect(result.recomputedScore).toBe(payload.score);
    });

    it('matches the client leaderboard targets to the server canonical targets', () => {
        const payload = buildClientPayload({ isVictory: true, dailyOpsDate: '2026-09-21' });
        const { canonicalTargets } = validateRunScorePayload(payload);
        expect(canonicalTargets.map(({ name, score }) => ({ name, score })))
            .toEqual(payload.leaderboardTargets.map(({ name, score }) => ({ name, score })));
    });
});
