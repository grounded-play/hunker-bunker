import express from 'express';
import { afterEach, afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import {
    attachSteamLeaderboardRoutes,
    clearLeaderboardCache,
    clearMockLeaderboards,
    getLeaderboardEntries,
    submitRunToSteamLeaderboards
} from './steamLeaderboards.js';

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
    clearMockLeaderboards();
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

describe('getLeaderboardEntries', () => {
    it('returns seeded mock entries when Steam is not configured', async () => {
        delete process.env.HB_STEAM_PUBLISHER_KEY;
        delete process.env.STEAM_PUBLISHER_KEY;
        delete process.env.STEAM_WEB_API_KEY;
        globalThis.fetch = vi.fn();

        const result = await getLeaderboardEntries({
            boardName: 'best_run_score',
            dataRequest: 'Global',
            count: 2
        });

        expect(result).toMatchObject({
            ok: true,
            status: 200,
            mock: true,
            board: 'best_run_score',
            dataRequest: 'RequestGlobal',
            entries: [
                { rank: 1, persona: 'Operator Aegis', score: 1550 },
                { rank: 2, persona: 'Operator Striker', score: 1200 }
            ]
        });
        expect(globalThis.fetch).not.toHaveBeenCalled();
    });

    it('stores dev-mode submitted scores in the mock board', async () => {
        delete process.env.HB_STEAM_PUBLISHER_KEY;
        delete process.env.STEAM_PUBLISHER_KEY;
        delete process.env.STEAM_WEB_API_KEY;
        globalThis.fetch = vi.fn();

        const submit = await submitRunToSteamLeaderboards({
            auth: {
                steamId64: '76561198000000000',
                persona: 'Agent (You)',
                isDevMode: true
            },
            payload: validPayload()
        });

        expect(submit).toMatchObject({
            ok: true,
            status: 200,
            recomputedScore: 891,
            submitted: [
                { ok: true, target: 'best_run_score', mock: true, score: 891 },
                { ok: true, target: 'survival_time_seconds', mock: true, score: 90 },
                { ok: true, target: 'deepest_depth_score', mock: true, score: 300432 }
            ]
        });

        const board = await getLeaderboardEntries({
            boardName: 'best_run_score',
            count: 10
        });

        expect(board.entries.find((entry) => entry.steamId64 === '76561198000000000')).toMatchObject({
            score: 891,
            persona: 'Agent (You)'
        });
        expect(globalThis.fetch).not.toHaveBeenCalled();
    });

    it('calls Steam GetLeaderboardEntries with normalized request parameters', async () => {
        process.env.HB_STEAM_PUBLISHER_KEY = 'publisher-key';
        process.env.HB_STEAM_LEADERBOARD_IDS = 'best_run_score:101';
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            text: async () => JSON.stringify({
                response: {
                    entries: {
                        entry: [
                            {
                                steamid: '76561198000000001',
                                score: '1550',
                                rank: '1',
                                persona: 'Operator Aegis',
                                timestamp: '1783872000'
                            }
                        ]
                    }
                }
            })
        });

        const result = await getLeaderboardEntries({
            boardName: 'best_run_score',
            dataRequest: 'Global',
            count: 5
        });

        expect(result).toMatchObject({
            ok: true,
            status: 200,
            mock: false,
            board: 'best_run_score',
            dataRequest: 'RequestGlobal',
            leaderboardId: 101,
            entries: [
                {
                    steamId64: '76561198000000001',
                    score: 1550,
                    rank: 1,
                    persona: 'Operator Aegis'
                }
            ]
        });
        expect(globalThis.fetch).toHaveBeenCalledTimes(1);
        const url = new URL(globalThis.fetch.mock.calls[0][0]);
        expect(url.pathname).toBe('/ISteamLeaderboards/GetLeaderboardEntries/v1/');
        expect(url.searchParams.get('key')).toBe('publisher-key');
        expect(url.searchParams.get('appid')).toBe('1247290');
        expect(url.searchParams.get('leaderboardid')).toBe('101');
        expect(url.searchParams.get('rangestart')).toBe('0');
        expect(url.searchParams.get('rangeend')).toBe('5');
        expect(url.searchParams.get('datarequest')).toBe('RequestGlobal');
    });
});

describe('steam leaderboards HTTP routes', () => {
    let server;
    let baseUrl;

    beforeAll(async () => {
        const app = express();
        app.use(express.json());
        attachSteamLeaderboardRoutes(app);

        server = await new Promise((resolve) => {
            const s = app.listen(0, '127.0.0.1', () => resolve(s));
        });
        const addr = server.address();
        baseUrl = `http://127.0.0.1:${addr.port}`;
    });

    afterAll(() => {
        server.close();
    });

    it('GET /steam/leaderboards/:board returns seeded mock entries when Steam is not configured', async () => {
        delete process.env.HB_STEAM_PUBLISHER_KEY;
        delete process.env.STEAM_PUBLISHER_KEY;
        delete process.env.STEAM_WEB_API_KEY;

        const response = await fetch(`${baseUrl}/steam/leaderboards/best_run_score?type=Global&count=2`);
        expect(response.status).toBe(200);

        const body = await response.json();
        expect(body.ok).toBe(true);
        expect(body.mock).toBe(true);
        expect(body.entries).toHaveLength(2);
        expect(body.entries[0]).toMatchObject({
            rank: 1,
            persona: 'Operator Aegis'
        });
    });

    it('POST /steam/leaderboards/submit-run stores mock scores when Steam is not configured', async () => {
        delete process.env.HB_STEAM_PUBLISHER_KEY;
        delete process.env.STEAM_PUBLISHER_KEY;
        delete process.env.STEAM_WEB_API_KEY;

        const submit = await fetch(`${baseUrl}/steam/leaderboards/submit-run`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                payload: validPayload(),
                mockSteamId64: '76561198000000000'
            })
        });
        expect(submit.status).toBe(200);

        const submitBody = await submit.json();
        expect(submitBody).toMatchObject({
            ok: true,
            status: 200
        });
        expect(submitBody.submitted).toContainEqual(expect.objectContaining({
            ok: true,
            target: 'best_run_score',
            mock: true,
            score: 891
        }));

        const read = await fetch(`${baseUrl}/steam/leaderboards/best_run_score?type=Global&count=10`);
        const readBody = await read.json();
        expect(readBody.entries.find((entry) => entry.steamId64 === '76561198000000000')).toMatchObject({
            score: 891
        });
    });
});
