const DEFAULT_STEAM_AUTH_IDENTITY = 'hunker-bunker-backend';
const STEAM_AUTH_URL = 'https://api.steampowered.com/ISteamUserAuth/AuthenticateUserTicket/v1/';

function getSteamPublisherKey() {
    return process.env.HB_STEAM_PUBLISHER_KEY
        ?? process.env.STEAM_PUBLISHER_KEY
        ?? process.env.STEAM_WEB_API_KEY
        ?? '';
}

function getSteamAppId() {
    return Number(process.env.HB_STEAM_APPID ?? 1247290);
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
    return {
        appId,
        configured: Boolean(publisherKey),
        defaultIdentity: DEFAULT_STEAM_AUTH_IDENTITY
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
        const response = await fetch(STEAM_AUTH_URL, {
            method: 'POST',
            headers: { 'content-type': 'application/x-www-form-urlencoded' },
            body: params
        });

        if (!response.ok) {
            return {
                ok: false,
                status: response.status,
                reason: 'steam_auth_http_error'
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

export function attachSteamAuthRoutes(app) {
    app.get('/health', (_req, res) => {
        const config = getSteamAuthConfig();
        res.json({
            ok: true,
            service: 'hunker-bunker-relay',
            steam: {
                appId: config.appId,
                authConfigured: config.configured,
                defaultIdentity: config.defaultIdentity
            }
        });
    });

    app.post('/steam/session', async (req, res) => {
        const result = await verifySteamSessionTicket({
            ticketHex: req.body?.ticketHex,
            identity: req.body?.identity
        });

        const status = Number(result.status) || (result.ok ? 200 : 500);
        res.status(status).json(result);
    });
}
