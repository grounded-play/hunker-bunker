import express from 'express';
import http from 'http';
import { attachRelay } from './relay.js';
import { attachSteamAuthRoutes } from './steamAuth.js';
import { attachSteamLeaderboardRoutes } from './steamLeaderboards.js';

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

attachSteamAuthRoutes(app);
attachSteamLeaderboardRoutes(app);
attachRelay(server, { allowedOrigins: ALLOWED_ORIGINS });

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Socket.io server running on port ${PORT}`);
});
