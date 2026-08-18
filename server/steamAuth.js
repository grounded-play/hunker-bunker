import crypto from 'node:crypto';
import { rateLimit } from 'express-rate-limit';
import { getDbStatus } from './db.js';
import { createRateLimitOptions } from './rateLimit.js';

const DEFAULT_STEAM_AUTH_IDENTITY = 'hunker-bunker-backend';
const DEV_STEAM_ID64 = '76561198000000000';
const STEAM_AUTH_URL = 'https://api.steampowered.com/ISteamUserAuth/AuthenticateUserTicket/v1/';
const STEAM_SESSION_TTL_MS = 15 * 60 * 1000;
const DEV_SESSION_SECRET = 'hunker-bunker-local-dev-session-secret';

export function getSteamPublisherKey() {
    return process.env.HB_STEAM_PUBLISHER_KEY
        ?? process.env.STEAM_PUBLISHER_KEY
        ?? process.env.STEAM_WEB_API_KEY
        ?? '';
}

function getSteamAppId() {
    return Number(process.env.HB_STEAM_APPID ?? 4957040);
}

function isHexTicket(value) {
    return typeof value === 'string'
        && value.length >= 32
        && value.length <= 8192
        && value.length % 2 === 0
        && /^[0-9a-f]+$/i.test(value);
}

function normalizeIdentity(value) {
    const identity = String(value ?? DEFAULT_STEAM_AUTH_IDENTITY).trim();
    if (!identity) return DEFAULT_STEAM_AUTH_IDENTITY;
    return identity.slice(0, 128);
}

function normalizeSteamId64(value) {
    const steamId64 = String(value ?? '').trim();
    return /^\d{17}$/.test(steamId64) ? steamId64 : null;
}

let ephemeralSessionSecret = null;

function normalizeSessionSecret() {
    const explicit = String(
        process.env.HB_SESSION_SECRET
        ?? process.env.HB_STEAM_SESSION_SECRET
        ?? ''
    ).trim();
    if (explicit) {
        return {
            secret: explicit,
            mode: 'explicit',
            configured: true
        };
    }

    const publisherKey = getSteamPublisherKey();
    if (publisherKey) {
        return {
            secret: publisherKey,
            mode: 'publisher_key',
            configured: true
        };
    }

    // Session tokens are HMAC-signed with this secret, so anything that can
    // reach this branch without an explicit/publisher secret must not use a
    // value visible in this public repo (the DEV_SESSION_SECRET constant) —
    // that would let anyone forge a bearer token for any steamId64/persona,
    // bypassing authenticateSteamRequest's ticket check entirely. Gate on
    // isDevFallbackAllowed() (the same check ticket-fallback already uses)
    // rather than a bare NODE_ENV==='production' check, so an operator who
    // sets HB_ALLOW_DEV_STEAM_AUTH=false but leaves NODE_ENV unset (common
    // outside containerized prod setups) still gets a real random secret
    // instead of the hardcoded one.
    if (!isDevFallbackAllowed()) {
        if (!ephemeralSessionSecret) {
            ephemeralSessionSecret = crypto.randomBytes(32).toString('hex');
            console.warn('[security] Generating ephemeral session secret; no explicit HB_SESSION_SECRET/publisher key configured.');
        }
        return {
            secret: ephemeralSessionSecret,
            mode: 'ephemeral',
            configured: true
        };
    }

    return {
        secret: DEV_SESSION_SECRET,
        mode: 'dev_fallback',
        configured: true
    };
}

function isDevFallbackAllowed(allowDevFallbackParam = true) {
    if (!allowDevFallbackParam) return false;
    if (process.env.NODE_ENV === 'production') return false;
    if (process.env.HB_ALLOW_DEV_STEAM_AUTH === 'false') return false;
    return true;
}

function getSteamSessionTtlMs() {
    const raw = Number(process.env.HB_SESSION_TTL_SECONDS);
    if (!Number.isFinite(raw) || raw <= 0) return STEAM_SESSION_TTL_MS;
    return Math.min(24 * 60 * 60, Math.max(60, Math.floor(raw))) * 1000;
}

function encodeBase64UrlJson(value) {
    return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
}

function decodeBase64UrlJson(value) {
    return JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
}

function signSessionPayload(encodedPayload) {
    const { secret } = normalizeSessionSecret();
    return crypto.createHmac('sha256', secret).update(encodedPayload).digest('base64url');
}

function signaturesMatch(left, right) {
    const leftBuffer = Buffer.from(String(left ?? ''), 'utf8');
    const rightBuffer = Buffer.from(String(right ?? ''), 'utf8');
    return leftBuffer.length === rightBuffer.length
        && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function getBearerToken(req) {
    const authorization = String(req?.headers?.authorization ?? '').trim();
    if (!authorization) return null;

    const [scheme, token] = authorization.split(/\s+/);
    if (scheme?.toLowerCase() !== 'bearer' || !token) return null;
    return token;
}

function normalizeSteamAuthResponse(data) {
    const params = data?.response?.params;
    if (!params || typeof params !== 'object') {
        return { ok: false, reason: 'steam_auth_malformed_response' };
    }

    if (params.result !== 'OK') {
        return {
            ok: false,
            reason: 'steam_auth_rejected',
            steamResult: params.result ?? null
        };
    }

    return {
        ok: true,
        steamId64: params.steamid ?? null,
        ownerSteamId64: params.ownersteamid ?? null,
        vacBanned: Boolean(params.vacbanned),
        publisherBanned: Boolean(params.publisherbanned)
    };
}

export function getSteamAuthConfig() {
    const publisherKey = getSteamPublisherKey();
    const appId = getSteamAppId();
    const session = normalizeSessionSecret();
    return {
        appId,
        configured: Boolean(publisherKey),
        defaultIdentity: DEFAULT_STEAM_AUTH_IDENTITY,
        session: {
            configured: session.configured,
            signingMode: session.mode,
            ttlSeconds: Math.floor(getSteamSessionTtlMs() / 1000)
        }
    };
}

export function createSteamSessionToken({
    steamId64,
    ownerSteamId64 = steamId64,
    appId = getSteamAppId(),
    identity = DEFAULT_STEAM_AUTH_IDENTITY,
    persona = 'Agent',
    isDevMode = false,
    now = Date.now(),
    ttlMs = getSteamSessionTtlMs()
} = {}) {
    const normalizedSteamId = normalizeSteamId64(steamId64);
    if (!normalizedSteamId) {
        return {
            ok: false,
            status: 500,
            reason: 'invalid_session_steamid'
        };
    }

    const issuedAt = Math.floor(Number(now) / 1000);
    const expiresAt = Math.floor((Number(now) + Number(ttlMs)) / 1000);
    const payload = {
        v: 1,
        steamId64: normalizedSteamId,
        ownerSteamId64: normalizeSteamId64(ownerSteamId64) ?? normalizedSteamId,
        appId: Number(appId) || getSteamAppId(),
        identity: normalizeIdentity(identity),
        iat: issuedAt,
        exp: expiresAt,
        devMode: Boolean(isDevMode)
    };
    const personaText = String(persona ?? '').trim();
    if (personaText) payload.persona = personaText.slice(0, 64);

    const encodedPayload = encodeBase64UrlJson(payload);
    const signature = signSessionPayload(encodedPayload);
    return {
        ok: true,
        token: `${encodedPayload}.${signature}`,
        steamId64: payload.steamId64,
        ownerSteamId64: payload.ownerSteamId64,
        appId: payload.appId,
        identity: payload.identity,
        expiresAt: expiresAt * 1000,
        ttlSeconds: Math.max(0, Math.floor((expiresAt * 1000 - Number(now)) / 1000))
    };
}

export function verifySteamSessionToken(token, { now = Date.now() } = {}) {
    const raw = String(token ?? '').trim();
    if (!raw) {
        return {
            ok: false,
            status: 401,
            reason: 'missing_session'
        };
    }

    const parts = raw.split('.');
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
        return {
            ok: false,
            status: 401,
            reason: 'malformed_session'
        };
    }

    const expectedSignature = signSessionPayload(parts[0]);
    if (!signaturesMatch(parts[1], expectedSignature)) {
        return {
            ok: false,
            status: 401,
            reason: 'session_tampered'
        };
    }

    let payload;
    try {
        payload = decodeBase64UrlJson(parts[0]);
    } catch {
        return {
            ok: false,
            status: 401,
            reason: 'malformed_session'
        };
    }

    const steamId64 = normalizeSteamId64(payload?.steamId64);
    if (!steamId64) {
        return {
            ok: false,
            status: 401,
            reason: 'malformed_session'
        };
    }

    const expiresAtMs = Number(payload.exp) * 1000;
    if (!Number.isFinite(expiresAtMs) || expiresAtMs <= Number(now)) {
        return {
            ok: false,
            status: 401,
            reason: 'session_expired'
        };
    }

    const appId = Number(payload.appId);
    if (appId !== getSteamAppId()) {
        return {
            ok: false,
            status: 401,
            reason: 'session_app_mismatch'
        };
    }

    return {
        ok: true,
        status: 200,
        steamId64,
        ownerSteamId64: normalizeSteamId64(payload.ownerSteamId64) ?? steamId64,
        persona: payload.persona ?? 'Agent',
        appId,
        identity: normalizeIdentity(payload.identity),
        issuedAt: Number(payload.iat) * 1000,
        expiresAt: expiresAtMs,
        isDevMode: Boolean(payload.devMode),
        authMethod: 'session'
    };
}

function createDevSteamAuth(identity) {
    const config = getSteamAuthConfig();
    return {
        ok: true,
        status: 200,
        steamId64: DEV_STEAM_ID64,
        ownerSteamId64: DEV_STEAM_ID64,
        persona: 'Agent',
        isDevMode: true,
        appId: config.appId,
        identity: normalizeIdentity(identity),
        authMethod: 'dev_fallback'
    };
}

export async function verifySteamSessionTicket({ ticketHex, identity } = {}) {
    const config = getSteamAuthConfig();
    if (!isHexTicket(ticketHex)) {
        return {
            ok: false,
            status: 400,
            reason: 'invalid_ticket'
        };
    }

    if (!config.configured) {
        return {
            ok: false,
            status: 503,
            reason: 'steam_auth_not_configured'
        };
    }

    if (typeof fetch !== 'function') {
        return {
            ok: false,
            status: 500,
            reason: 'fetch_unavailable'
        };
    }

    const params = new URLSearchParams({
        key: getSteamPublisherKey(),
        appid: String(config.appId),
        ticket: ticketHex
    });

    try {
        const response = await fetch(`${STEAM_AUTH_URL}?${params.toString()}`, {
            method: 'GET'
        });

        if (!response.ok) {
            return {
                ok: false,
                status: response.status,
                reason: 'steam_auth_http_error',
                upstream: {
                    service: 'steamworks-authenticate-user-ticket',
                    method: 'GET',
                    status: response.status,
                    appId: config.appId,
                    identity: normalizeIdentity(identity)
                }
            };
        }

        const verified = normalizeSteamAuthResponse(await response.json());
        return {
            ...verified,
            status: verified.ok ? 200 : 401,
            appId: config.appId,
            identity: normalizeIdentity(identity)
        };
    } catch (err) {
        return {
            ok: false,
            status: 502,
            reason: 'steam_auth_request_failed',
            message: err?.message ?? String(err)
        };
    }
}

export async function authenticateSteamRequest(req, { allowDevFallback = true } = {}) {
    const bearerToken = getBearerToken(req);
    if (bearerToken) {
        return verifySteamSessionToken(bearerToken);
    }

    const ticketHex = req.body?.ticketHex ?? req.query?.ticketHex;
    const identity = req.body?.identity ?? req.query?.identity;

    if (!ticketHex) {
        return {
            ok: false,
            status: 401,
            reason: 'missing_ticket'
        };
    }

    const auth = await verifySteamSessionTicket({ ticketHex, identity });
    if (!auth.ok) {
        if (isDevFallbackAllowed(allowDevFallback) && auth.reason === 'steam_auth_not_configured') {
            return createDevSteamAuth(identity);
        }
        return auth;
    }

    return {
        ...auth,
        isDevMode: false,
        authMethod: 'ticket'
    };
}

export async function steamAuthMiddleware(req, res, next) {
    const auth = await authenticateSteamRequest(req);
    if (!auth.ok) {
        return res.status(Number(auth.status) || 401).json(auth);
    }

    req.steamId = auth.steamId64;
    req.steamAuth = auth;
    req.isDevMode = Boolean(auth.isDevMode);
    return next();
}

export function attachSteamAuthRoutes(app) {
    const steamRouteRateLimit = rateLimit(createRateLimitOptions());

    app.get('/health', (_req, res) => {
        const config = getSteamAuthConfig();
        res.json({
            ok: true,
            service: 'hunker-bunker-relay',
            uptimeSeconds: Math.floor(process.uptime()),
            steam: {
                appId: config.appId,
                authConfigured: config.configured,
                defaultIdentity: config.defaultIdentity,
                session: config.session
            },
            storage: getDbStatus()
        });
    });

    app.post('/steam/session', steamRouteRateLimit, async (req, res) => {
        const auth = await verifySteamSessionTicket({
            ticketHex: req.body?.ticketHex,
            identity: req.body?.identity
        });

        const result = auth.ok
            ? auth
            : (isDevFallbackAllowed(true) && auth.reason === 'steam_auth_not_configured'
                ? createDevSteamAuth(req.body?.identity)
                : auth);

        if (!result.ok) {
            const status = Number(result.status) || 401;
            res.status(status).json(result);
            return;
        }

        const session = createSteamSessionToken({
            steamId64: result.steamId64,
            ownerSteamId64: result.ownerSteamId64,
            appId: result.appId,
            identity: result.identity ?? req.body?.identity,
            persona: result.persona ?? 'Agent',
            isDevMode: Boolean(result.isDevMode)
        });

        const status = Number(session.status) || (session.ok ? 200 : 500);
        res.status(status).json({
            ...session,
            devMode: Boolean(result.isDevMode),
            authMethod: result.authMethod ?? 'ticket'
        });
    });
}
