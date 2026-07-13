import { buildCanonicalLeaderboardTargets, STEAM_LEADERBOARD_DEFS, validateRunScorePayload } from './leaderboardScoring.js';
import { getSteamAuthConfig, getSteamPublisherKey, verifySteamSessionTicket } from './steamAuth.js';

const STEAM_PARTNER_API = 'https://partner.steam-api.com/ISteamLeaderboards';
const leaderboardIdCache = new Map();

function getAutoCreateEnabled() {
    return process.env.HB_STEAM_LEADERBOARD_AUTO_CREATE === '1';
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

    const config = getSteamAuthConfig();
    const key = getSteamPublisherKey();
    if (!config.configured || !key) {
        return { ok: false, status: 503, reason: 'steam_leaderboards_not_configured' };
    }
    if (!auth?.steamId64) {
        return { ok: false, status: 401, reason: 'steam_auth_missing_steamid' };
    }

    const canonicalTargets = buildCanonicalLeaderboardTargets(payload);
    const results = [];
    for (const target of canonicalTargets) {
        results.push(await setLeaderboardScore({
            appId: config.appId,
            key,
            steamId64: auth.steamId64,
            target
        }));
    }

    const failed = results.filter((result) => !result.ok);
    return {
        ok: failed.length === 0,
        status: failed.length === 0 ? 200 : 502,
        reason: failed.length === 0 ? null : 'steam_leaderboard_submit_failed',
        recomputedScore: validation.recomputedScore,
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
    app.post('/steam/leaderboards/submit-run', async (req, res) => {
        const auth = await verifySteamSessionTicket({
            ticketHex: req.body?.ticketHex,
            identity: req.body?.identity
        });

        if (!auth.ok) {
            res.status(Number(auth.status) || 401).json(auth);
            return;
        }

        const result = await submitRunToSteamLeaderboards({
            auth: {
                steamId64: auth.steamId64,
                ownerSteamId64: auth.ownerSteamId64,
                appId: auth.appId
            },
            payload: req.body?.payload
        });
        res.status(Number(result.status) || (result.ok ? 200 : 500)).json(result);
    });
}
