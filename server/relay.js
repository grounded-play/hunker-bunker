import { Server } from 'socket.io';

// Movement hardening: reject non-finite values, clamp to a sane world range, and
// rate-limit so a client can't spoof teleports or flood the relay.
const WORLD_LIMIT = 100000;
const MIN_MOVE_INTERVAL_MS = 16; // ~60 updates/sec cap per socket

function sanitizeCoord(value) {
    if (typeof value !== 'number' || !Number.isFinite(value)) return null;
    return Math.max(-WORLD_LIMIT, Math.min(WORLD_LIMIT, value));
}

export function attachRelay(server, { allowedOrigins = [] } = {}) {
    const io = new Server(server, {
        cors: {
            origin: allowedOrigins.length > 0 ? allowedOrigins : '*',
            methods: ['GET', 'POST']
        }
    });

    const players = {};

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
            if (now - player.lastMoveAt < MIN_MOVE_INTERVAL_MS) return;
            player.lastMoveAt = now;

            const x = sanitizeCoord(movementData.x);
            const z = sanitizeCoord(movementData.z);
            if (x === null || z === null) return;

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

    return io;
}
