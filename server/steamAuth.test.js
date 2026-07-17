import express from 'express';
import { rateLimit } from 'express-rate-limit';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    attachSteamAuthRoutes,
    createSteamSessionToken,
    getSteamAuthConfig,
    steamAuthMiddleware,
    verifySteamSessionTicket,
    verifySteamSessionToken
} from './steamAuth.js';
import { createRateLimitOptions } from './rateLimit.js';

const ORIGINAL_ENV = { ...process.env };
const ORIGINAL_FETCH = globalThis.fetch;

function restoreEnv() {
    for (const key of Object.keys(process.env)) {
        delete process.env[key];
    }
    Object.assign(process.env, ORIGINAL_ENV);
}

afterEach(() => {
    restoreEnv();
    globalThis.fetch = ORIGINAL_FETCH;
    vi.restoreAllMocks();
});

describe('steam auth backend helpers', () => {
    it('reports auth as disabled until a publisher key is configured', () => {
        delete process.env.HB_STEAM_PUBLISHER_KEY;
        delete process.env.STEAM_PUBLISHER_KEY;
        delete process.env.STEAM_WEB_API_KEY;

        expect(getSteamAuthConfig()).toMatchObject({
            appId: 4957040,
            configured: false,
            defaultIdentity: 'hunker-bunker-backend'
        });
    });

    it('rejects malformed tickets before requiring Steam configuration', async () => {
        const result = await verifySteamSessionTicket({ ticketHex: 'bad' });

        expect(result).toMatchObject({
            ok: false,
            status: 400,
            reason: 'invalid_ticket'
        });
    });

    it('reports disabled auth for valid-looking tickets when no publisher key exists', async () => {
        delete process.env.HB_STEAM_PUBLISHER_KEY;
        delete process.env.STEAM_PUBLISHER_KEY;
        delete process.env.STEAM_WEB_API_KEY;

        const result = await verifySteamSessionTicket({
            ticketHex: '00112233445566778899aabbccddeeff'
        });

        expect(result).toMatchObject({
            ok: false,
            status: 503,
            reason: 'steam_auth_not_configured'
        });
    });

    it('normalizes a successful Steam ticket verification response', async () => {
        process.env.HB_STEAM_PUBLISHER_KEY = 'publisher-key';
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({
                response: {
                    params: {
                        result: 'OK',
                        steamid: '76561198000000000',
                        ownersteamid: '76561198000000000',
                        vacbanned: false,
                        publisherbanned: false
                    }
                }
            })
        });

        const result = await verifySteamSessionTicket({
            ticketHex: '00112233445566778899aabbccddeeff',
            identity: 'custom-identity'
        });

        expect(result).toMatchObject({
            ok: true,
            status: 200,
            appId: 4957040,
            identity: 'custom-identity',
            steamId64: '76561198000000000',
            ownerSteamId64: '76561198000000000',
            vacBanned: false,
            publisherBanned: false
        });
        expect(globalThis.fetch).toHaveBeenCalledOnce();
    });

    it('creates and verifies short-lived backend session tokens', () => {
        process.env.HB_SESSION_SECRET = 'session-secret';
        const now = Date.UTC(2026, 6, 13, 12);

        const session = createSteamSessionToken({
            steamId64: '76561198000000000',
            ownerSteamId64: '76561198000000000',
            identity: 'custom-identity',
            now,
            ttlMs: 15 * 60 * 1000
        });

        expect(session).toMatchObject({
            ok: true,
            steamId64: '76561198000000000',
            appId: 4957040,
            identity: 'custom-identity'
        });

        expect(verifySteamSessionToken(session.token, { now: now + 1000 })).toMatchObject({
            ok: true,
            steamId64: '76561198000000000',
            identity: 'custom-identity',
            authMethod: 'session'
        });
    });

    it('rejects tampered backend session tokens', () => {
        process.env.HB_SESSION_SECRET = 'session-secret';
        const session = createSteamSessionToken({
            steamId64: '76561198000000000',
            now: Date.UTC(2026, 6, 13, 12)
        });
        const [encodedPayload, signature] = session.token.split('.');
        const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
        payload.steamId64 = '76561198000000001';
        const tampered = `${Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')}.${signature}`;

        expect(verifySteamSessionToken(tampered)).toMatchObject({
            ok: false,
            status: 401,
            reason: 'session_tampered'
        });
    });

    it('rejects expired backend session tokens', () => {
        process.env.HB_SESSION_SECRET = 'session-secret';
        const now = Date.UTC(2026, 6, 13, 12);
        const session = createSteamSessionToken({
            steamId64: '76561198000000000',
            now,
            ttlMs: 1000
        });

        expect(verifySteamSessionToken(session.token, { now: now + 1000 })).toMatchObject({
            ok: false,
            status: 401,
            reason: 'session_expired'
        });
    });

    it('POST /steam/session mints a bearer token after ticket verification', async () => {
        process.env.HB_STEAM_PUBLISHER_KEY = 'publisher-key';
        process.env.HB_SESSION_SECRET = 'session-secret';
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({
                response: {
                    params: {
                        result: 'OK',
                        steamid: '76561198000000000',
                        ownersteamid: '76561198000000000',
                        vacbanned: false,
                        publisherbanned: false
                    }
                }
            })
        });

        const app = express();
        app.use(express.json());
        attachSteamAuthRoutes(app);
        const server = await new Promise((resolve) => {
            const s = app.listen(0, '127.0.0.1', () => resolve(s));
        });

        try {
            const addr = server.address();
            const localFetch = ORIGINAL_FETCH;
            const response = await localFetch(`http://127.0.0.1:${addr.port}/steam/session`, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    ticketHex: '00112233445566778899aabbccddeeff',
                    identity: 'custom-identity'
                })
            });

            expect(response.status).toBe(200);
            const body = await response.json();
            expect(body).toMatchObject({
                ok: true,
                steamId64: '76561198000000000',
                identity: 'custom-identity',
                devMode: false
            });
            expect(verifySteamSessionToken(body.token)).toMatchObject({
                ok: true,
                steamId64: '76561198000000000'
            });
        } finally {
            await new Promise((resolve) => server.close(resolve));
        }
    });

    it('GET /health reports Steam auth and storage readiness', async () => {
        process.env.HB_DB_STORAGE_PATH = '/tmp/hb-health-test-db.json';
        const app = express();
        app.use(express.json());
        attachSteamAuthRoutes(app);
        const server = await new Promise((resolve) => {
            const s = app.listen(0, '127.0.0.1', () => resolve(s));
        });

        try {
            const addr = server.address();
            const response = await ORIGINAL_FETCH(`http://127.0.0.1:${addr.port}/health`);
            expect(response.status).toBe(200);
            const body = await response.json();
            expect(body).toMatchObject({
                ok: true,
                service: 'hunker-bunker-relay',
                steam: {
                    appId: 4957040,
                    session: {
                        configured: true,
                        ttlSeconds: expect.any(Number)
                    }
                },
                storage: {
                    envConfigured: true,
                    durable: true
                }
            });
            expect(body.uptimeSeconds).toEqual(expect.any(Number));
        } finally {
            await new Promise((resolve) => server.close(resolve));
        }
    });

    it('steamAuthMiddleware accepts bearer sessions without verifying another ticket', async () => {
        process.env.HB_SESSION_SECRET = 'session-secret';
        const session = createSteamSessionToken({
            steamId64: '76561198000000000'
        });

        const app = express();
        app.use(express.json());
        const routeRateLimit = rateLimit(createRateLimitOptions());
        app.get('/protected', routeRateLimit, steamAuthMiddleware, (req, res) => {
            res.json({
                ok: true,
                steamId64: req.steamId,
                isDevMode: req.isDevMode
            });
        });
        const server = await new Promise((resolve) => {
            const s = app.listen(0, '127.0.0.1', () => resolve(s));
        });

        try {
            const addr = server.address();
            const response = await ORIGINAL_FETCH(`http://127.0.0.1:${addr.port}/protected`, {
                headers: { authorization: `Bearer ${session.token}` }
            });

            expect(response.status).toBe(200);
            expect(await response.json()).toMatchObject({
                ok: true,
                steamId64: '76561198000000000',
                isDevMode: false
            });
            expect(globalThis.fetch).toBe(ORIGINAL_FETCH);
        } finally {
            await new Promise((resolve) => server.close(resolve));
        }
    });
});
