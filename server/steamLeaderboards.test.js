import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import express from 'express';
import { afterEach, afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import {
    attachSteamLeaderboardRoutes,
    clearLeaderboardCache,
    clearMockLeaderboards,
    clearPersonaCache,
    getLeaderboardEntries,
    parseSetLeaderboardScoreResult,
    submitRunToSteamLeaderboards
} from './steamLeaderboards.js';
import { initDb, getMockInventory, setMockInventory } from './db.js';
import { recomputeRunScore } from './leaderboardScoring.js';

// Isolated from server/db_storage.json so this file's milestone-grant
// writes (idempotency + mock inventory, added alongside the leaderboard
// submission) never race steamInventory.test.js/steamStore.test.js writing
// the same physical file in a parallel worker.
const TEST_DB_PATH = path.join(os.tmpdir(), `hb-steam-leaderboards-test-${process.pid}-${Date.now()}.json`);
process.env.HB_DB_STORAGE_PATH = TEST_DB_PATH;
const ORIGINAL_ENV = { ...process.env };
const ORIGINAL_FETCH = globalThis.fetch;

beforeAll(async () => {
    await initDb();
});

afterAll(() => {
    for (const p of [TEST_DB_PATH, `${TEST_DB_PATH}.tmp`]) {
        try { fs.unlinkSync(p); } catch { /* already gone */ }
    }
});

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

// A valid, full-health VICTORY payload with a correctly recomputed score
// (validateRunScorePayload rejects any client/server score mismatch).
// runSuffix varies runId (and hence every milestone's requestId) so
// different test cases don't collide on idempotency; dailyOpsDate is only
// set when a test needs a Daily Ops run.
function buildVictoryPayload(steamId, { runSuffix = 'x', dailyOpsDate = null, statsOverride = {} } = {}) {
    const payload = {
        schemaVersion: 1,
        runId: `hb:1000:91000:TANK:${steamId}-${runSuffix}`,
        classType: 'TANK',
        outcome: 'victory',
        mission: { type: 'extraction', status: 'extracted', label: 'EXTRACTION' },
        run: {
            runMs: 90000,
            dailyOps: dailyOpsDate ? { date: dailyOpsDate } : null
        },
        stats: {
            distanceTravelled: 200,
            totalPickups: 10,
            generatorLevel: 2,
            depthTier: 2,
            snailsKilled: 5,
            hadNearDeath: false,
            fullHealthAtEnd: true,
            ...statsOverride
        },
        depositedResources: { tech: 2, coin: 1, med: 0 }
    };
    payload.score = recomputeRunScore(payload);
    return payload;
}

afterEach(() => {
    restoreEnv();
    globalThis.fetch = ORIGINAL_FETCH;
    clearLeaderboardCache();
    clearMockLeaderboards();
    clearPersonaCache();
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

describe('submitRunToSteamLeaderboards milestone grants (Tier A)', () => {
    it('grants the class victory patch on a victory submission, idempotent on retry', async () => {
        delete process.env.HB_STEAM_PUBLISHER_KEY;
        const steamId = 'milestone-victory-steamid';
        await setMockInventory(steamId, []);
        const auth = { steamId64: steamId, persona: 'Agent', isDevMode: true };
        const payload = buildVictoryPayload(steamId);

        const first = await submitRunToSteamLeaderboards({ auth, payload });
        expect(first.ok).toBe(true);
        expect(first.milestoneGrants).toContainEqual(expect.objectContaining({ itemdefid: 2001 })); // Tank patch
        expect(getMockInventory(steamId).filter((i) => i.itemdefid === 2001)).toHaveLength(1);

        // Retry with the identical payload (same runId): idempotent on the
        // server-derived requestId, not a second patch.
        const second = await submitRunToSteamLeaderboards({ auth, payload });
        expect(second.ok).toBe(true);
        expect(getMockInventory(steamId).filter((i) => i.itemdefid === 2001)).toHaveLength(1);
    });

    it('grants a bonus Deep Relic Cache for a flawless (full-health) victory', async () => {
        delete process.env.HB_STEAM_PUBLISHER_KEY;
        const steamId = 'milestone-flawless-steamid';
        await setMockInventory(steamId, []);

        const auth = { steamId64: steamId, persona: 'Agent', isDevMode: true };
        const result = await submitRunToSteamLeaderboards({ auth, payload: buildVictoryPayload(steamId) });

        expect(result.ok).toBe(true);
        expect(result.milestoneGrants).toContainEqual(expect.objectContaining({ itemdefid: 4000 }));
    });

    it('does not grant a second personal-best bonus for a lower-scoring later run', async () => {
        delete process.env.HB_STEAM_PUBLISHER_KEY;
        const steamId = 'milestone-pbest-steamid';
        await setMockInventory(steamId, []);
        const auth = { steamId64: steamId, persona: 'Agent', isDevMode: true };

        // First-ever submission is always a "new best" (nothing to beat
        // yet) — grants both a flawless cache and a personal-best cache.
        const first = await submitRunToSteamLeaderboards({
            auth,
            payload: buildVictoryPayload(steamId, { runSuffix: 'first' })
        });
        expect(first.ok).toBe(true);
        const cachesAfterFirst = first.milestoneGrants.filter((g) => g.itemdefid === 4000).length;
        expect(cachesAfterFirst).toBe(2); // flawless + personal-best

        // A strictly worse run (fewer kills/pickups, same class/health)
        // still gets its own flawless grant, but must not also claim a
        // personal-best bonus since it didn't beat the first run's score.
        const second = await submitRunToSteamLeaderboards({
            auth,
            payload: buildVictoryPayload(steamId, {
                runSuffix: 'second',
                statsOverride: { snailsKilled: 0, totalPickups: 0, distanceTravelled: 10 }
            })
        });
        expect(second.ok).toBe(true);
        const cachesAfterSecond = second.milestoneGrants.filter((g) => g.itemdefid === 4000).length;
        expect(cachesAfterSecond).toBe(1); // flawless only, no personal-best
    });

    it('grants a Daily Ops bonus cache once per calendar day, not per run', async () => {
        delete process.env.HB_STEAM_PUBLISHER_KEY;
        const steamId = 'milestone-dailyops-steamid';
        await setMockInventory(steamId, []);
        const auth = { steamId64: steamId, persona: 'Agent', isDevMode: true };
        const date = '2026-07-14';

        const first = await submitRunToSteamLeaderboards({
            auth,
            payload: buildVictoryPayload(steamId, { runSuffix: 'a', dailyOpsDate: date })
        });
        // First Daily Ops run of the day: flawless + personal-best + daily-ops.
        expect(first.milestoneGrants.filter((g) => g.itemdefid === 4000)).toHaveLength(3);

        const second = await submitRunToSteamLeaderboards({
            auth,
            payload: buildVictoryPayload(steamId, {
                runSuffix: 'b',
                dailyOpsDate: date,
                statsOverride: { snailsKilled: 0, totalPickups: 0, distanceTravelled: 10 }
            })
        });
        // Second (lower-scoring) run same day: only its own flawless grant —
        // no second personal-best, no second daily-ops bonus for the same date.
        expect(second.milestoneGrants.filter((g) => g.itemdefid === 4000)).toHaveLength(1);
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
        expect(url.searchParams.get('appid')).toBe('4957040');
        expect(url.searchParams.get('leaderboardid')).toBe('101');
        expect(url.searchParams.get('rangestart')).toBe('0');
        expect(url.searchParams.get('rangeend')).toBe('5');
        expect(url.searchParams.get('datarequest')).toBe('RequestGlobal');
    });
});

// Response shapes below are Valve's documented partner Web API shapes
// (ISteamLeaderboards/GetLeaderboardEntries/v1, SetLeaderboardScore/v1,
// ISteamUser/GetPlayerSummaries/v2) -- not the invented `response.entries.entry`
// shape the reader originally assumed, which made every live board read empty.
describe('Valve partner API response shapes', () => {
    const VALVE_ENTRIES = {
        leaderboardEntryInformation: {
            appID: 4957040,
            leaderboardID: 101,
            totalLeaderBoardEntryCount: 2,
            leaderboardEntries: [
                { steamID: '76561198000000011', score: 1550, rank: 1, ugcid: '-1', detailData: '' },
                { steamID: '76561198000000012', score: 980, rank: 2, ugcid: '-1', detailData: '' }
            ]
        }
    };

    function routeFetch(routes) {
        return vi.fn(async (url) => {
            const href = String(url);
            const match = Object.entries(routes).find(([fragment]) => href.includes(fragment));
            if (!match) throw new Error(`unexpected fetch ${href}`);
            const [, body] = match;
            return { ok: true, status: 200, text: async () => JSON.stringify(body) };
        });
    }

    it('reads leaderboardEntryInformation.leaderboardEntries and resolves persona names', async () => {
        process.env.HB_STEAM_PUBLISHER_KEY = 'publisher-key';
        process.env.HB_STEAM_LEADERBOARD_IDS = 'best_run_score:101';
        globalThis.fetch = routeFetch({
            '/GetLeaderboardEntries/': VALVE_ENTRIES,
            '/GetPlayerSummaries/': {
                response: {
                    players: [
                        { steamid: '76561198000000011', personaname: 'Aegis' },
                        { steamid: '76561198000000012', personaname: 'Striker' }
                    ]
                }
            }
        });

        const result = await getLeaderboardEntries({ boardName: 'best_run_score', count: 10 });

        expect(result.ok).toBe(true);
        expect(result.entries).toEqual([
            expect.objectContaining({ steamId64: '76561198000000011', score: 1550, rank: 1, persona: 'Aegis' }),
            expect.objectContaining({ steamId64: '76561198000000012', score: 980, rank: 2, persona: 'Striker' })
        ]);
        const summaryUrl = new URL(globalThis.fetch.mock.calls.find(([u]) => String(u).includes('GetPlayerSummaries'))[0]);
        expect(summaryUrl.searchParams.get('steamids')).toBe('76561198000000011,76561198000000012');
    });

    it('still returns entries when the persona lookup fails', async () => {
        process.env.HB_STEAM_PUBLISHER_KEY = 'publisher-key';
        process.env.HB_STEAM_LEADERBOARD_IDS = 'best_run_score:101';
        globalThis.fetch = vi.fn(async (url) => {
            if (String(url).includes('GetPlayerSummaries')) throw new Error('network down');
            return { ok: true, status: 200, text: async () => JSON.stringify(VALVE_ENTRIES) };
        });

        const result = await getLeaderboardEntries({ boardName: 'best_run_score', count: 10 });

        expect(result.ok).toBe(true);
        expect(result.entries).toHaveLength(2);
        expect(result.entries[0].persona).toBe('Agent');
    });

    it('parses SetLeaderboardScore result codes and score_changed', () => {
        expect(parseSetLeaderboardScoreResult({ result: { result: 1, score_changed: true, global_rank_new: 4 } }))
            .toEqual({ ok: true, resultCode: 1, scoreChanged: true, globalRankNew: 4 });
        expect(parseSetLeaderboardScoreResult({ result: { result: 1, score_changed: false } }))
            .toMatchObject({ ok: true, scoreChanged: false });
        expect(parseSetLeaderboardScoreResult({ result: { result: 8 } }))
            .toMatchObject({ ok: false, resultCode: 8 });
        // No body-level result at all: fall back to the HTTP status the caller already checked.
        expect(parseSetLeaderboardScoreResult({})).toMatchObject({ ok: true, resultCode: null, scoreChanged: false });
    });

    it('fails a submit when Steam answers HTTP 200 with a non-OK result code', async () => {
        process.env.HB_STEAM_PUBLISHER_KEY = 'publisher-key';
        process.env.HB_STEAM_LEADERBOARD_IDS = 'best_run_score:101,survival_time_seconds:102,deepest_depth_score:103';
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            text: async () => JSON.stringify({ result: { result: 8 } })
        });

        const result = await submitRunToSteamLeaderboards({
            auth: { steamId64: '76561198000000000' },
            payload: validPayload()
        });

        expect(result).toMatchObject({ ok: false, status: 502, reason: 'steam_leaderboard_submit_failed' });
        expect(result.submitted[0]).toMatchObject({ ok: false, reason: 'steam_leaderboard_result_8' });
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
