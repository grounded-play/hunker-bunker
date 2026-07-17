import { buildCanonicalLeaderboardTargets, STEAM_LEADERBOARD_DEFS, validateRunScorePayload } from './leaderboardScoring.js';
import { rateLimit } from 'express-rate-limit';
import { authenticateSteamRequest, getSteamAuthConfig, getSteamPublisherKey } from './steamAuth.js';
import { checkIdempotency, saveIdempotency } from './db.js';
import { grantItemToPlayer } from './steamGrant.js';
import { DEEP_RELIC_CACHE_ITEMDEFID } from './lootTables.js';
import { createRateLimitOptions } from './rateLimit.js';

const CLASS_VICTORY_PATCH_ITEMDEFID = Object.freeze({ SCOUT: 2000, TANK: 2001, ENGINEER: 2002 });

const STEAM_PARTNER_API = 'https://partner.steam-api.com/ISteamLeaderboards';
const leaderboardIdCache = new Map();
const mockLeaderboardStore = new Map();

const MOCK_LEADERBOARD_SEED = Object.freeze({
    best_run_score: Object.freeze([
        Object.freeze({ steamId64: '76561198000000001', score: 1550, persona: 'Operator Aegis', timestamp: Date.UTC(2026, 6, 12, 16) }),
        Object.freeze({ steamId64: '76561198000000002', score: 1200, persona: 'Operator Striker', timestamp: Date.UTC(2026, 6, 12, 12) }),
        Object.freeze({ steamId64: '76561198000000003', score: 980, persona: 'Operator Scout', timestamp: Date.UTC(2026, 6, 12, 8) }),
        Object.freeze({ steamId64: '76561198000000000', score: 850, persona: 'Agent (You)', timestamp: Date.UTC(2026, 6, 12, 19) })
    ]),
    survival_time_seconds: Object.freeze([
        Object.freeze({ steamId64: '76561198000000001', score: 320, persona: 'Operator Aegis', timestamp: Date.UTC(2026, 6, 12, 16) }),
        Object.freeze({ steamId64: '76561198000000002', score: 240, persona: 'Operator Striker', timestamp: Date.UTC(2026, 6, 12, 12) }),
        Object.freeze({ steamId64: '76561198000000000', score: 180, persona: 'Agent (You)', timestamp: Date.UTC(2026, 6, 12, 19) }),
        Object.freeze({ steamId64: '76561198000000003', score: 150, persona: 'Operator Scout', timestamp: Date.UTC(2026, 6, 12, 8) })
    ]),
    deepest_depth_score: Object.freeze([
        Object.freeze({ steamId64: '76561198000000001', score: 300450, persona: 'Operator Aegis', timestamp: Date.UTC(2026, 6, 12, 16) }),
        Object.freeze({ steamId64: '76561198000000002', score: 200380, persona: 'Operator Striker', timestamp: Date.UTC(2026, 6, 12, 12) }),
        Object.freeze({ steamId64: '76561198000000003', score: 100120, persona: 'Operator Scout', timestamp: Date.UTC(2026, 6, 12, 8) }),
        Object.freeze({ steamId64: '76561198000000000', score: 100080, persona: 'Agent (You)', timestamp: Date.UTC(2026, 6, 12, 19) })
    ])
});

function getAutoCreateEnabled() {
    return process.env.HB_STEAM_LEADERBOARD_AUTO_CREATE === '1';
}

function normalizeBoardName(boardName) {
    const normalized = String(boardName ?? '').trim();
    return STEAM_LEADERBOARD_DEFS[normalized] ? normalized : null;
}

function normalizeLeaderboardRange({ count = null, rangeStart = 0, rangeEnd = null } = {}) {
    const start = Math.max(0, Math.floor(Number(rangeStart) || 0));
    const requestedEnd = rangeEnd ?? (count == null ? 10 : start + Number(count));
    const end = Math.max(start + 1, Math.min(start + 100, Math.floor(Number(requestedEnd) || 10)));
    return { rangeStart: start, rangeEnd: end };
}

function normalizeDataRequest(value = 'RequestGlobal') {
    const raw = String(value ?? '').trim();
    const lowered = raw.toLowerCase();
    if (lowered === 'friends' || lowered === 'requestfriends') return 'RequestFriends';
    if (lowered === 'arounduser' || lowered === 'requestarounduser') return 'RequestAroundUser';
    return 'RequestGlobal';
}

function hasBearerAuth(req) {
    return /^bearer\s+\S+/i.test(String(req?.headers?.authorization ?? ''));
}

function normalizeLeaderboardEntries(data) {
    const candidates = data?.response?.entries?.entry
        ?? data?.response?.entries
        ?? data?.response?.entry
        ?? data?.entries
        ?? [];
    const list = Array.isArray(candidates) ? candidates : [candidates];

    return list
        .filter(Boolean)
        .map((entry) => ({
            steamId64: String(entry.steamid ?? entry.steamId ?? entry.steamID ?? ''),
            score: Number(entry.score) || 0,
            rank: Number(entry.rank ?? entry.global_rank ?? entry.globalRank ?? 0) || 0,
            persona: entry.persona ?? entry.name ?? 'Agent',
            timestamp: entry.timestamp ? Number(entry.timestamp) * 1000 : null,
            details: entry.details ?? null
        }))
        .filter((entry) => entry.steamId64);
}

function parseConfiguredLeaderboardIds() {
    const raw = process.env.HB_STEAM_LEADERBOARD_IDS ?? '';
    const configured = new Map();
    if (raw.trim().startsWith('{')) {
        try {
            for (const [name, value] of Object.entries(JSON.parse(raw))) {
                const id = Number(value);
                if (name && Number.isFinite(id) && id > 0) configured.set(name, id);
            }
        } catch {
            return configured;
        }
        return configured;
    }

    for (const part of raw.split(',')) {
        const [name, value] = part.split(':').map((piece) => piece?.trim());
        const id = Number(value);
        if (name && Number.isFinite(id) && id > 0) configured.set(name, id);
    }
    return configured;
}

function getCachedLeaderboardIds(appId) {
    const cacheKey = String(appId);
    if (!leaderboardIdCache.has(cacheKey)) {
        leaderboardIdCache.set(cacheKey, parseConfiguredLeaderboardIds());
    }
    return leaderboardIdCache.get(cacheKey);
}

function normalizeLeaderboardList(data) {
    const candidates = data?.response?.leaderboards
        ?? data?.response?.leaderboard
        ?? data?.leaderboards
        ?? [];
    const list = Array.isArray(candidates) ? candidates : [candidates];

    return list
        .map((leaderboard) => ({
            name: leaderboard?.name ?? leaderboard?.leaderboardname ?? leaderboard?.leaderboardName ?? '',
            id: Number(
                leaderboard?.leaderboardid
                ?? leaderboard?.leaderboardID
                ?? leaderboard?.leaderboard_id
                ?? leaderboard?.id
            )
        }))
        .filter((leaderboard) => leaderboard.name && Number.isFinite(leaderboard.id) && leaderboard.id > 0);
}

function normalizeLeaderboardId(data) {
    return Number(
        data?.response?.leaderboardid
        ?? data?.response?.leaderboardID
        ?? data?.response?.leaderboard_id
        ?? data?.response?.leaderboard?.leaderboardid
        ?? data?.leaderboardid
        ?? data?.leaderboard_id
    );
}

async function requestSteamLeaderboardApi(path, { method = 'GET', body = null } = {}) {
    if (typeof fetch !== 'function') {
        return { ok: false, status: 500, reason: 'fetch_unavailable' };
    }

    const url = `${STEAM_PARTNER_API}${path}`;
    try {
        const response = await fetch(url, {
            method,
            headers: body ? { 'content-type': 'application/x-www-form-urlencoded' } : undefined,
            body
        });
        const text = await response.text();
        let data = {};
        try {
            data = text ? JSON.parse(text) : {};
        } catch {
            data = { message: text };
        }
        return {
            ok: response.ok,
            status: response.status,
            data,
            reason: response.ok ? null : 'steam_leaderboard_http_error'
        };
    } catch (err) {
        return {
            ok: false,
            status: 502,
            reason: 'steam_leaderboard_request_failed',
            message: err?.message ?? String(err)
        };
    }
}

async function refreshLeaderboardIds(appId, key) {
    const params = new URLSearchParams({
        key,
        appid: String(appId)
    });
    const result = await requestSteamLeaderboardApi(`/GetLeaderboardsForGame/v2/?${params.toString()}`);
    if (!result.ok) return result;

    const cache = getCachedLeaderboardIds(appId);
    for (const leaderboard of normalizeLeaderboardList(result.data)) {
        cache.set(leaderboard.name, leaderboard.id);
    }
    return { ok: true, status: 200, cache };
}

async function findOrCreateLeaderboard(appId, key, name) {
    const definition = STEAM_LEADERBOARD_DEFS[name];
    if (!definition || !getAutoCreateEnabled()) {
        return {
            ok: false,
            status: 424,
            reason: 'steam_leaderboard_id_missing'
        };
    }

    const params = new URLSearchParams({
        key,
        appid: String(appId),
        name: definition.name,
        sortmethod: definition.sortmethod,
        displaytype: definition.displaytype,
        createifnotfound: 'true',
        onlytrustedwrites: 'true'
    });

    const result = await requestSteamLeaderboardApi('/FindOrCreateLeaderboard/v2/', {
        method: 'POST',
        body: params
    });
    if (!result.ok) return result;

    const leaderboardId = normalizeLeaderboardId(result.data);
    if (!Number.isFinite(leaderboardId) || leaderboardId <= 0) {
        return {
            ok: false,
            status: 502,
            reason: 'steam_leaderboard_malformed_create_response',
            data: result.data
        };
    }

    getCachedLeaderboardIds(appId).set(name, leaderboardId);
    return { ok: true, status: 200, leaderboardId };
}

async function resolveLeaderboardId(appId, key, name) {
    const cache = getCachedLeaderboardIds(appId);
    if (cache.has(name)) return { ok: true, leaderboardId: cache.get(name) };

    const refresh = await refreshLeaderboardIds(appId, key);
    if (!refresh.ok) return refresh;
    if (cache.has(name)) return { ok: true, leaderboardId: cache.get(name) };

    return findOrCreateLeaderboard(appId, key, name);
}

async function setLeaderboardScore({ appId, key, steamId64, target }) {
    const resolved = await resolveLeaderboardId(appId, key, target.name);
    if (!resolved.ok) return { ...resolved, target: target.name };

    const params = new URLSearchParams({
        key,
        appid: String(appId),
        leaderboardid: String(resolved.leaderboardId),
        steamid: String(steamId64),
        score: String(target.score),
        scoremethod: target.scoreMethod
    });

    const result = await requestSteamLeaderboardApi('/SetLeaderboardScore/v1/', {
        method: 'POST',
        body: params
    });
    return {
        ...result,
        target: target.name,
        leaderboardId: resolved.leaderboardId,
        score: target.score
    };
}

export function clearLeaderboardCache() {
    leaderboardIdCache.clear();
}

export function clearMockLeaderboards() {
    mockLeaderboardStore.clear();
}

function cloneMockEntries(entries = []) {
    return entries.map((entry) => ({ ...entry }));
}

function rankMockLeaderboard(boardName, entries = []) {
    const isAscending = boardName === 'fastest_extraction_ms';
    return cloneMockEntries(entries)
        .sort((a, b) => (isAscending ? a.score - b.score : b.score - a.score))
        .map((entry, index) => ({
            ...entry,
            rank: index + 1
        }));
}

function getMockLeaderboard(boardName) {
    if (!mockLeaderboardStore.has(boardName)) {
        mockLeaderboardStore.set(
            boardName,
            rankMockLeaderboard(boardName, MOCK_LEADERBOARD_SEED[boardName] ?? [])
        );
    }
    return cloneMockEntries(mockLeaderboardStore.get(boardName));
}

function saveMockLeaderboard(boardName, entries) {
    mockLeaderboardStore.set(boardName, rankMockLeaderboard(boardName, entries));
}

function getMockLeaderboardEntries(boardName, options = {}) {
    const { rangeStart, rangeEnd } = normalizeLeaderboardRange(options);
    return getMockLeaderboard(boardName)
        .slice(rangeStart, rangeEnd)
        .map((entry, index) => ({
            steamId64: String(entry.steamId64),
            score: Number(entry.score) || 0,
            rank: Number(entry.rank) || rangeStart + index + 1,
            persona: entry.persona ?? 'Agent',
            timestamp: entry.timestamp ?? null,
            details: null
        }));
}

export async function getLeaderboardEntries({
    boardName,
    dataRequest = 'RequestGlobal',
    rangeStart = 0,
    rangeEnd = null,
    count = null,
    steamId64 = null
} = {}) {
    const normalizedBoard = normalizeBoardName(boardName);
    if (!normalizedBoard) {
        return { ok: false, status: 404, reason: 'unknown_leaderboard' };
    }

    const range = normalizeLeaderboardRange({ count, rangeStart, rangeEnd });
    const normalizedDataRequest = normalizeDataRequest(dataRequest);
    const config = getSteamAuthConfig();
    const key = getSteamPublisherKey();

    if (!config.configured || !key) {
        return {
            ok: true,
            status: 200,
            mock: true,
            board: normalizedBoard,
            dataRequest: normalizedDataRequest,
            entries: getMockLeaderboardEntries(normalizedBoard, range)
        };
    }

    if (normalizedDataRequest !== 'RequestGlobal' && !steamId64) {
        return { ok: false, status: 401, reason: 'steamid_required_for_scoped_leaderboard_read' };
    }

    const resolved = await resolveLeaderboardId(config.appId, key, normalizedBoard);
    if (!resolved.ok) {
        return { ...resolved, board: normalizedBoard };
    }

    const params = new URLSearchParams({
        key,
        appid: String(config.appId),
        leaderboardid: String(resolved.leaderboardId),
        rangestart: String(range.rangeStart),
        rangeend: String(range.rangeEnd),
        datarequest: normalizedDataRequest
    });
    if (steamId64) params.set('steamid', String(steamId64));

    const result = await requestSteamLeaderboardApi(`/GetLeaderboardEntries/v1/?${params.toString()}`);
    if (!result.ok) {
        return {
            ...result,
            board: normalizedBoard,
            leaderboardId: resolved.leaderboardId
        };
    }

    return {
        ok: true,
        status: 200,
        mock: false,
        board: normalizedBoard,
        dataRequest: normalizedDataRequest,
        leaderboardId: resolved.leaderboardId,
        entries: normalizeLeaderboardEntries(result.data)
    };
}

// Grants tied to a run submission are derived server-side from the payload
// `validateRunScorePayload` already recomputed and validated (outcome,
// stats.fullHealthAtEnd, run.dailyOps.date) plus `isNewBest`, which the
// dev-mode loop below computes independently of anything the client
// claims. This is Tier A of the milestone-grant design: nothing here
// trusts a client-supplied flag or itemdefid — every requestId and item
// choice is derived from already-validated data, so this can't be used to
// farm items by lying about run state the same way a purely
// client-triggered call could.
async function deriveAndGrantMilestones({ auth, payload, isNewBest }) {
    const steamId = auth.steamId64;
    const isDevMode = Boolean(auth.isDevMode);
    const isVictory = payload.outcome === 'victory';
    const isFlawless = isVictory && payload.stats?.fullHealthAtEnd === true;
    const dailyOpsDate = payload.run?.dailyOps?.date ?? null;

    const grants = [];

    async function tryGrant(requestId, itemdefid, source, mode) {
        // A cache hit means this specific milestone (this run's victory
        // patch, or this calendar day's Daily Ops bonus, etc.) was already
        // claimed by an earlier submission — nothing NEW happened on this
        // submission, so it's correctly omitted from milestoneGrants rather
        // than re-reported as if it just happened again.
        if (checkIdempotency(requestId)) return;
        const grant = await grantItemToPlayer({ steamId, itemdefid, isDevMode, source, mode });
        await saveIdempotency(requestId, { status: 200, body: grant });
        if (grant.ok && Array.isArray(grant.granted)) grants.push(...grant.granted);
    }

    if (isVictory) {
        const patchItemdefid = CLASS_VICTORY_PATCH_ITEMDEFID[payload.classType] ?? CLASS_VICTORY_PATCH_ITEMDEFID.SCOUT;
        await tryGrant(`victory-${payload.runId}`, patchItemdefid, 'victory_promo', 'once');
    }
    if (isFlawless) {
        await tryGrant(`flawless-${payload.runId}`, DEEP_RELIC_CACHE_ITEMDEFID, 'flawless_bonus', 'stack');
    }
    if (isNewBest) {
        await tryGrant(`pbest-${payload.runId}`, DEEP_RELIC_CACHE_ITEMDEFID, 'personal_best_bonus', 'stack');
    }
    if (dailyOpsDate) {
        await tryGrant(`daily-ops-${steamId}-${dailyOpsDate}`, DEEP_RELIC_CACHE_ITEMDEFID, 'daily_ops_bonus', 'stack');
    }

    return grants;
}

export async function submitRunToSteamLeaderboards({ auth, payload } = {}) {
    const validation = validateRunScorePayload(payload);
    if (!validation.ok) {
        return {
            ok: false,
            status: 400,
            reason: 'invalid_run_payload',
            errors: validation.errors,
            recomputedScore: validation.recomputedScore
        };
    }

    if (!auth?.steamId64) {
        return { ok: false, status: 401, reason: 'steam_auth_missing_steamid' };
    }

    const canonicalTargets = buildCanonicalLeaderboardTargets(payload);

    if (auth.isDevMode) {
        const results = [];
        let isNewBest = false;
        for (const target of canonicalTargets) {
            const entries = getMockLeaderboard(target.name);
            const existingIndex = entries.findIndex((e) => e.steamId64 === auth.steamId64);
            const isAscending = target.name === 'fastest_extraction_ms';

            let updated = false;
            const newEntry = {
                steamId64: auth.steamId64,
                score: target.score,
                persona: auth.persona ?? 'Agent',
                timestamp: Date.now()
            };

            if (existingIndex >= 0) {
                const currentScore = entries[existingIndex].score;
                const isBetter = isAscending ? (target.score < currentScore) : (target.score > currentScore);
                if (isBetter) {
                    entries[existingIndex] = newEntry;
                    updated = true;
                }
            } else {
                entries.push(newEntry);
                updated = true;
            }

            if (updated) {
                saveMockLeaderboard(target.name, entries);
            }

            if (target.name === 'best_run_score') {
                isNewBest = updated;
            }

            results.push({
                ok: true,
                target: target.name,
                mock: true,
                leaderboardId: null,
                score: target.score,
                status: 200
            });
        }

        const milestoneGrants = await deriveAndGrantMilestones({ auth, payload, isNewBest });

        return {
            ok: true,
            status: 200,
            recomputedScore: validation.recomputedScore,
            submitted: results,
            milestoneGrants
        };
    }

    const config = getSteamAuthConfig();
    const key = getSteamPublisherKey();
    if (!config.configured || !key) {
        return { ok: false, status: 503, reason: 'steam_leaderboards_not_configured' };
    }

    const results = [];
    let isNewBestReal = false;
    for (const target of canonicalTargets) {
        const scoreResult = await setLeaderboardScore({
            appId: config.appId,
            key,
            steamId64: auth.steamId64,
            target
        });
        // Valve's real SetLeaderboardScore response includes a
        // score-changed indicator under response.params — field name/shape
        // unverified against a live Steamworks app from this repo; falls
        // back to false (no personal-best grant) if absent so a missing
        // field never over-grants.
        if (target.name === 'best_run_score') {
            const params = scoreResult?.data?.response?.params ?? {};
            isNewBestReal = params.score_changed === true || params.score_changed === 1 || params.scorechanged === 1;
        }
        results.push(scoreResult);
    }

    const failed = results.filter((result) => !result.ok);
    const milestoneGrants = failed.length === 0
        ? await deriveAndGrantMilestones({ auth, payload, isNewBest: isNewBestReal })
        : [];

    return {
        ok: failed.length === 0,
        status: failed.length === 0 ? 200 : 502,
        reason: failed.length === 0 ? null : 'steam_leaderboard_submit_failed',
        recomputedScore: validation.recomputedScore,
        milestoneGrants,
        submitted: results.map((result) => ({
            ok: result.ok,
            target: result.target,
            leaderboardId: result.leaderboardId ?? null,
            score: result.score ?? null,
            status: result.status,
            reason: result.reason ?? null
        }))
    };
}

export function attachSteamLeaderboardRoutes(app) {
    const steamRouteRateLimit = rateLimit(createRateLimitOptions());

    app.post('/steam/leaderboards/submit-run', steamRouteRateLimit, async (req, res) => {
        let auth;
        const config = getSteamAuthConfig();
        if (config.configured || hasBearerAuth(req)) {
            auth = await authenticateSteamRequest(req);
            if (!auth.ok) {
                res.status(Number(auth.status) || 401).json(auth);
                return;
            }
        } else {
            auth = {
                ok: true,
                steamId64: req.body?.mockSteamId64 ?? '76561198000000000',
                ownerSteamId64: req.body?.mockSteamId64 ?? '76561198000000000',
                persona: 'Agent',
                isDevMode: true,
                appId: config.appId
            };
        }

        const result = await submitRunToSteamLeaderboards({
            auth: {
                steamId64: auth.steamId64,
                ownerSteamId64: auth.ownerSteamId64,
                appId: auth.appId,
                persona: auth.persona ?? 'Agent',
                isDevMode: Boolean(auth.isDevMode)
            },
            payload: req.body?.payload
        });
        res.status(Number(result.status) || (result.ok ? 200 : 500)).json(result);
    });

    app.get('/steam/leaderboards/:board', steamRouteRateLimit, async (req, res) => {
        const dataRequest = normalizeDataRequest(req.query.dataRequest ?? req.query.type ?? 'RequestGlobal');
        let steamId64 = null;
        if (dataRequest !== 'RequestGlobal' && (getSteamAuthConfig().configured || hasBearerAuth(req))) {
            const auth = await authenticateSteamRequest(req);
            if (!auth.ok) {
                res.status(Number(auth.status) || 401).json(auth);
                return;
            }
            steamId64 = auth.steamId64;
        }

        const result = await getLeaderboardEntries({
            boardName: req.params.board,
            dataRequest,
            count: req.query.count,
            rangeStart: req.query.rangeStart ?? req.query.rangestart ?? 0,
            rangeEnd: req.query.rangeEnd ?? req.query.rangeend ?? null,
            steamId64
        });
        res.status(Number(result.status) || (result.ok ? 200 : 500)).json(result);
    });
}
