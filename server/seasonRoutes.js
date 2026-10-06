// Server-held Season progress routes
// (docs/planning/season-server-progress-plan-2026-10-06.md). Every route is
// bound to the caller's Steam session; the ledger applies the game's season
// rules plus the server's timing and cap rules.
import { rateLimit } from 'express-rate-limit';
import { steamAuthMiddleware } from './steamAuth.js';
import { createRateLimitOptions } from './rateLimit.js';
import { createSeasonLedger } from './seasonLedger.js';

export function attachSeasonRoutes(app, { ledger = createSeasonLedger() } = {}) {
    const limit = rateLimit(createRateLimitOptions());
    const ctx = (req) => ({ isDevMode: Boolean(req.isDevMode) });
    const send = (res, promise) => Promise.resolve(promise)
        .then((body) => res.json(body))
        .catch((err) => {
            console.warn('[season] request failed:', err?.message ?? err);
            res.status(503).json({ ok: false, reason: 'season_ledger_unavailable' });
        });
    const int = (value) => (Number.isSafeInteger(Number(value)) ? Number(value) : null);

    app.get('/steam/season/state', limit, steamAuthMiddleware, (req, res) => {
        send(res, ledger.state(req.steamId));
    });
    app.post('/steam/season/run/begin', limit, steamAuthMiddleware, (req, res) => {
        send(res, ledger.beginRun(req.steamId, { initialDepth: int(req.body?.initialDepth) ?? 0 }, ctx(req)));
    });
    app.post('/steam/season/run/event', limit, steamAuthMiddleware, (req, res) => {
        const { runId, kind, id, crossing } = req.body ?? {};
        send(res, ledger.recordEvent(req.steamId, {
            runId: String(runId ?? ''), kind, id, tier: int(req.body?.tier), crossing: crossing === true, atMs: int(req.body?.atMs)
        }, ctx(req)));
    });
    app.post('/steam/season/run/settle', limit, steamAuthMiddleware, (req, res) => {
        send(res, ledger.settleRun(req.steamId, { runId: String(req.body?.runId ?? ''), outcome: req.body?.outcome, atMs: int(req.body?.atMs) }, ctx(req)));
    });
    app.post('/steam/season/activity', limit, steamAuthMiddleware, (req, res) => {
        const { id, onboarding, target } = req.body ?? {};
        send(res, ledger.recordActivity(req.steamId, { id, onboarding, target }, ctx(req)));
    });
    app.post('/steam/season/claim', limit, steamAuthMiddleware, (req, res) => {
        send(res, ledger.claim(req.steamId, { tier: int(req.body?.tier), track: req.body?.track, selectedChoice: int(req.body?.selectedChoice) }, ctx(req)));
    });
    app.post('/steam/season/ack', limit, steamAuthMiddleware, (req, res) => {
        send(res, ledger.ack(req.steamId, { receiptIds: req.body?.receiptIds }, ctx(req)));
    });
    app.post('/steam/season/import', limit, steamAuthMiddleware, (req, res) => {
        send(res, ledger.importLocal(req.steamId, { state: req.body?.state }, ctx(req)));
    });
}
