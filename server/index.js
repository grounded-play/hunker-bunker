import express from 'express';
import http from 'http';
import { initDb } from './db.js';
import { attachRelay } from './relay.js';
import { attachSteamAuthRoutes } from './steamAuth.js';
import { attachSteamLeaderboardRoutes } from './steamLeaderboards.js';
import { attachSteamInventoryRoutes } from './steamInventory.js';
import { attachSteamStoreRoutes } from './steamStore.js';
import { auditSteamBackendEnv, formatBackendEnvIssue } from './backendEnvAudit.js';

const backendEnvAudit = auditSteamBackendEnv(process.env);
for (const warning of backendEnvAudit.warnings) {
    console.warn(`[backend-audit] warning: ${formatBackendEnvIssue(warning)}`);
}
if (!backendEnvAudit.ok) {
    const details = backendEnvAudit.failures.map((issue) => `- ${formatBackendEnvIssue(issue)}`).join('\n');
    throw new Error(`[backend-audit] startup refused (${backendEnvAudit.failures.length} issue(s), strict=${backendEnvAudit.strict}):\n${details}`);
}

const app = express();
const server = http.createServer(app);

// CORS: lock to explicit origins in production via HB_ALLOWED_ORIGINS
// (comma-separated). If unset, allow all but warn — preserves zero-config local
// dev (doc 11 §3.6 / deepestdive #3).
const ALLOWED_ORIGINS = (process.env.HB_ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
if (ALLOWED_ORIGINS.length === 0) {
    console.warn('[hb-relay] HB_ALLOWED_ORIGINS not set — allowing all origins (dev only).');
}

function isAllowedOrigin(origin) {
    return !origin || ALLOWED_ORIGINS.length === 0 || ALLOWED_ORIGINS.includes(origin);
}

app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (isAllowedOrigin(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin ?? '*');
        res.setHeader('Vary', 'Origin');
    }
    res.setHeader('Access-Control-Allow-Headers', 'content-type, authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    if (req.method === 'OPTIONS') {
        res.status(isAllowedOrigin(origin) ? 204 : 403).end();
        return;
    }
    next();
});
app.use(express.json({ limit: '16kb' }));
app.use('/steam', (req, res, next) => {
    const startedAt = Date.now();
    res.on('finish', () => {
        const requestId = typeof req.body?.requestId === 'string'
            ? req.body.requestId.slice(0, 96)
            : undefined;
        const log = {
            method: req.method,
            path: req.path,
            status: res.statusCode,
            durationMs: Date.now() - startedAt,
            requestId,
            hasTicket: Boolean(req.body?.ticketHex || req.query?.ticketHex),
            hasBearer: Boolean(req.headers.authorization)
        };
        console.info('[hb-request]', JSON.stringify(log));
    });
    next();
});
// Initialize DB before routing
await initDb();

attachSteamAuthRoutes(app);
attachSteamLeaderboardRoutes(app);
attachSteamInventoryRoutes(app);
attachSteamStoreRoutes(app);
attachRelay(server, { allowedOrigins: ALLOWED_ORIGINS });

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Socket.io server running on port ${PORT}`);
});
