import express from 'express';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { attachSeasonRoutes } from './seasonRoutes.js';
import { createSteamSessionToken } from './steamAuth.js';

// The routes only wire the Steam session to the ledger; the rules live in
// seasonLedger.js. What matters here: no session, no access, and the SteamID
// always comes from the session, never the body.
describe('season routes', () => {
    let server;
    let baseUrl;
    const calls = [];
    const ledger = new Proxy({}, {
        get: (_target, verb) => vi.fn(async (steamId, body, ctx) => {
            calls.push({ verb, steamId, body, ctx });
            return { ok: true, verb };
        })
    });

    beforeAll(async () => {
        process.env.HB_SESSION_SECRET = 'season-route-test-secret';
        const app = express();
        app.use(express.json());
        attachSeasonRoutes(app, { ledger });
        server = await new Promise((resolve) => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
        baseUrl = `http://127.0.0.1:${server.address().port}`;
    });
    afterAll(() => server.close());

    const auth = () => ({ 'content-type': 'application/json', authorization: `Bearer ${createSteamSessionToken({ steamId64: '76561198000000077', isDevMode: false }).token}` });

    it('refuses a caller without a Steam session', async () => {
        const res = await fetch(`${baseUrl}/steam/season/state`);
        expect(res.status).toBe(401);
        expect(calls).toHaveLength(0);
    });

    it('routes each verb with the session SteamID', async () => {
        const post = (path, body) => fetch(`${baseUrl}${path}`, { method: 'POST', headers: auth(), body: JSON.stringify(body) }).then((r) => r.json());
        expect(await post('/steam/season/run/event', { runId: 'season-run:x', kind: 'objective', id: 'o1', atMs: 25000, steamId: '1' }))
            .toEqual({ ok: true, verb: 'recordEvent' });
        expect(calls.at(-1)).toMatchObject({ steamId: '76561198000000077', body: { runId: 'season-run:x', kind: 'objective', id: 'o1', atMs: 25000 } });
        for (const [path, verb] of [['/steam/season/run/begin', 'beginRun'], ['/steam/season/run/settle', 'settleRun'], ['/steam/season/activity', 'recordActivity'],
            ['/steam/season/claim', 'claim'], ['/steam/season/ack', 'ack'], ['/steam/season/import', 'importLocal']]) {
            expect(await post(path, {})).toEqual({ ok: true, verb });
        }
        const state = await fetch(`${baseUrl}/steam/season/state`, { headers: auth() }).then((r) => r.json());
        expect(state).toEqual({ ok: true, verb: 'state' });
    });
});
