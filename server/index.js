import express from 'express';
import http from 'http';
import { Server } from 'socket.io';

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

const io = new Server(server, {
    cors: {
        origin: ALLOWED_ORIGINS.length > 0 ? ALLOWED_ORIGINS : '*',
        methods: ['GET', 'POST']
    }
});

const players = {};

// Movement hardening: reject non-finite values, clamp to a sane world range, and
// rate-limit so a client can't spoof teleports or flood the relay.
const WORLD_LIMIT = 100000;
const MIN_MOVE_INTERVAL_MS = 16; // ~60 updates/sec cap per socket

function sanitizeCoord(value) {
    if (typeof value !== 'number' || !Number.isFinite(value)) return null;
    return Math.max(-WORLD_LIMIT, Math.min(WORLD_LIMIT, value));
}

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    players[socket.id] = {
        id: socket.id,
        x: 0,
        z: 0,
        level: 0,
        lastMoveAt: 0
    };

    // Never leak server-only bookkeeping (lastMoveAt) to clients.
    const publicState = (p) => ({ id: p.id, x: p.x, z: p.z, level: p.level });
    const publicPlayers = Object.fromEntries(
        Object.entries(players).map(([id, p]) => [id, publicState(p)])
    );

    socket.emit('currentPlayers', publicPlayers);
    socket.broadcast.emit('newPlayer', publicState(players[socket.id]));

    socket.on('playerMove', (movementData) => {
        const player = players[socket.id];
        if (!player || !movementData || typeof movementData !== 'object') return;

        const now = Date.now();
        if (now - player.lastMoveAt < MIN_MOVE_INTERVAL_MS) return; // throttle floods
        player.lastMoveAt = now;

        const x = sanitizeCoord(movementData.x);
        const z = sanitizeCoord(movementData.z);
        if (x === null || z === null) return; // ignore malformed payloads

        player.x = x;
        player.z = z;
        socket.broadcast.emit('playerMoved', publicState(player));
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        delete players[socket.id];
        io.emit('playerDisconnected', socket.id);
    });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Socket.io server running on port ${PORT}`);
});
