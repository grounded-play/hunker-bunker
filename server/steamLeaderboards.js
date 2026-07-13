import { verifySteamSessionTicket } from './steamAuth.js';

function summarizeRunPayload(payload = {}) {
    const targets = Array.isArray(payload.leaderboardTargets)
        ? payload.leaderboardTargets.map((target) => ({
            name: String(target?.name ?? ''),
            score: Number(target?.score) || 0,
            keep: target?.keep ?? 'best'
        }))
        : [];

    return {
        schemaVersion: Number(payload.schemaVersion) || 0,
        runId: String(payload.runId ?? ''),
        classType: String(payload.classType ?? ''),
        outcome: String(payload.outcome ?? ''),
        score: Number(payload.score) || 0,
        runMs: Number(payload.run?.runMs) || 0,
        targets
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

        res.status(501).json({
            ok: false,
            reason: 'steam_leaderboards_not_implemented',
            auth: {
                steamId64: auth.steamId64,
                ownerSteamId64: auth.ownerSteamId64,
                appId: auth.appId
            },
            received: summarizeRunPayload(req.body?.payload)
        });
    });
}
