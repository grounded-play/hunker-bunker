import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearLeaderboardCache, submitRunToSteamLeaderboards } from './steamLeaderboards.js';

const ORIGINAL_ENV = { ...process.env };
const ORIGINAL_FETCH = globalThis.fetch;

function restoreEnv() {
    for (const key of Object.keys(process.env)) {
        delete process.env[key];
    }
    Object.assign(process.env, ORIGINAL_ENV);
}

function validPayload() {
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
        }
    };
}

afterEach(() => {
    restoreEnv();
    globalThis.fetch = ORIGINAL_FETCH;
    clearLeaderboardCache();
    vi.restoreAllMocks();
});

describe('submitRunToSteamLeaderboards', () => {
    it('rejects invalid payloads before calling Steam', async () => {
        process.env.HB_STEAM_PUBLISHER_KEY = 'publisher-key';
        globalThis.fetch = vi.fn();

        const result = await submitRunToSteamLeaderboards({
            auth: { steamId64: '76561198000000000' },
            payload: { ...validPayload(), score: 1 }
        });

        expect(result).toMatchObject({
            ok: false,
            status: 400,
            reason: 'invalid_run_payload',
            errors: ['score_mismatch']
        });
        expect(globalThis.fetch).not.toHaveBeenCalled();
    });

    it('submits canonical target scores to configured Steam leaderboards', async () => {
        process.env.HB_STEAM_PUBLISHER_KEY = 'publisher-key';
        process.env.HB_STEAM_LEADERBOARD_IDS = [
            'best_run_score:101',
            'survival_time_seconds:102',
            'deepest_depth_score:103'
        ].join(',');
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            text: async () => JSON.stringify({ response: { result: 1 } })
        });

        const result = await submitRunToSteamLeaderboards({
            auth: { steamId64: '76561198000000000' },
            payload: validPayload()
        });

        expect(result).toMatchObject({
            ok: true,
            status: 200,
            recomputedScore: 891,
            submitted: [
                { ok: true, target: 'best_run_score', leaderboardId: 101, score: 891 },
                { ok: true, target: 'survival_time_seconds', leaderboardId: 102, score: 90 },
                { ok: true, target: 'deepest_depth_score', leaderboardId: 103, score: 300432 }
            ]
        });
        expect(globalThis.fetch).toHaveBeenCalledTimes(3);

        const firstBody = globalThis.fetch.mock.calls[0][1].body;
        expect(firstBody.get('leaderboardid')).toBe('101');
        expect(firstBody.get('steamid')).toBe('76561198000000000');
        expect(firstBody.get('score')).toBe('891');
        expect(firstBody.get('scoremethod')).toBe('KeepBest');
    });
});
