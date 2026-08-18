import { Server } from 'socket.io';

// Movement & ballistics hardening: reject non-finite values, clamp to a sane world range,
// and rate-limit updates to protect the relay from flooding.
const WORLD_LIMIT = 100000;
const MIN_MOVE_INTERVAL_MS = 16; // ~60 updates/sec cap per socket
const MIN_FIRE_INTERVAL_MS = 40; // ~25 shots/sec cap per socket

function sanitizeCoord(value) {
    if (typeof value !== 'number' || !Number.isFinite(value)) return null;
    return Math.max(-WORLD_LIMIT, Math.min(WORLD_LIMIT, value));
}

function sanitizeAngle(value) {
    if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
    return Math.max(-Math.PI * 2, Math.min(Math.PI * 2, value));
}

function sanitizeString(value, maxLen = 32, fallback = 'AGENT') {
    if (typeof value !== 'string') return fallback;
    return value.trim().slice(0, maxLen) || fallback;
}

export const sessionTelemetry = {
    totalConnections: 0,
    matchesDeployed: 0,
    tradesExecuted: 0,
    revivesExecuted: 0,
    fatalHits: 0,
    recentEvents: []
};

export function logRelayEvent(type, data = {}) {
    const entry = { type, timestamp: Date.now(), ...data };
    sessionTelemetry.recentEvents.push(entry);
    if (sessionTelemetry.recentEvents.length > 100) {
        sessionTelemetry.recentEvents.shift();
    }
    console.log(`[NET-RELAY] [${type}]`, JSON.stringify(data));
}

export function getRelayTelemetry() {
    return {
        totalConnections: sessionTelemetry.totalConnections,
        matchesDeployed: sessionTelemetry.matchesDeployed,
        tradesExecuted: sessionTelemetry.tradesExecuted,
        revivesExecuted: sessionTelemetry.revivesExecuted,
        fatalHits: sessionTelemetry.fatalHits,
        recentEvents: [...sessionTelemetry.recentEvents]
    };
}

export function attachRelay(server, { allowedOrigins = [] } = {}) {
    const io = new Server(server, {
        cors: {
            origin: allowedOrigins.length > 0 ? allowedOrigins : '*',
            methods: ['GET', 'POST']
        }
    });

    // Map: socketId -> playerState
    const players = new Map();
    // Map: roomCode -> Set of socketIds
    const rooms = new Map();

    const getPublicPlayer = (p) => ({
        id: p.id,
        callsign: p.callsign,
        opClass: p.opClass,
        x: p.x,
        z: p.z,
        yaw: p.yaw,
        vx: p.vx,
        vz: p.vz,
        animState: p.animState,
        roomCode: p.roomCode,
        isHost: p.isHost
    });

    const getRoomPlayers = (roomCode) => {
        const socketIds = rooms.get(roomCode);
        if (!socketIds) return {};
        const result = {};
        socketIds.forEach((id) => {
            const player = players.get(id);
            if (player) {
                result[id] = getPublicPlayer(player);
            }
        });
        return result;
    };

    io.on('connection', (socket) => {
        sessionTelemetry.totalConnections += 1;
        logRelayEvent('CONNECT', { socketId: socket.id });
        const player = {
            id: socket.id,
            callsign: 'AGENT',
            opClass: 'TANK',
            x: 9,
            z: 9,
            yaw: 0,
            vx: 0,
            vz: 0,
            animState: 'idle',
            roomCode: 'SECTOR-7',
            isHost: false,
            lastMoveAt: 0,
            lastFireAt: 0
        };
        players.set(socket.id, player);

        // Join room handler
        socket.on('joinRoom', (data = {}) => {
            const roomCode = sanitizeString(data.roomCode, 24, 'SECTOR-7').toUpperCase();
            const callsign = sanitizeString(data.callsign, 20, `OPERATIVE-${socket.id.slice(0, 4).toUpperCase()}`);
            const opClass = ['SCOUT', 'TANK', 'ENGINEER'].includes(data.opClass) ? data.opClass : 'TANK';

            // Leave existing room if any
            if (player.roomCode && rooms.has(player.roomCode)) {
                socket.leave(player.roomCode);
                rooms.get(player.roomCode).delete(socket.id);
                socket.to(player.roomCode).emit('playerDisconnected', socket.id);
            }

            player.roomCode = roomCode;
            player.callsign = callsign;
            player.opClass = opClass;

            if (!rooms.has(roomCode)) {
                rooms.set(roomCode, new Set());
                player.isHost = true;
            } else {
                player.isHost = rooms.get(roomCode).size === 0;
            }

            rooms.get(roomCode).add(socket.id);
            socket.join(roomCode);

            // Send current roster in this room to the joining player
            socket.emit('currentPlayers', getRoomPlayers(roomCode));
            // Notify other peers in this room
            socket.to(roomCode).emit('newPlayer', getPublicPlayer(player));
        });

        // Match deployment / start event (initiated by room host)
        socket.on('matchDeploy', (matchData = {}) => {
            const roomCode = player.roomCode;
            if (!roomCode) return;

            const payload = {
                seed: matchData.seed || 'SECTOR-7',
                mode: matchData.mode === 'pvp' ? 'pvp' : 'coop',
                crashPlan: matchData.crashPlan || null,
                startedBy: socket.id,
                timestamp: Date.now()
            };

            sessionTelemetry.matchesDeployed += 1;
            logRelayEvent('MATCH_DEPLOY', { roomCode, mode: payload.mode, seed: payload.seed, startedBy: socket.id });

            io.to(roomCode).emit('matchStarted', payload);
        });

        // Player movement relay
        socket.on('playerMove', (movementData) => {
            if (!movementData || typeof movementData !== 'object') return;

            const now = Date.now();
            if (now - player.lastMoveAt < MIN_MOVE_INTERVAL_MS) return;
            player.lastMoveAt = now;

            const x = sanitizeCoord(movementData.x);
            const z = sanitizeCoord(movementData.z);
            if (x === null || z === null) return;

            player.x = x;
            player.z = z;
            player.yaw = sanitizeAngle(movementData.yaw);
            player.vx = sanitizeCoord(movementData.vx) ?? 0;
            player.vz = sanitizeCoord(movementData.vz) ?? 0;
            player.animState = sanitizeString(movementData.animState, 16, 'idle');

            if (player.roomCode) {
                socket.to(player.roomCode).emit('playerMoved', getPublicPlayer(player));
            }
        });

        // Ballistics / weapon firing relay
        socket.on('playerFire', (fireData) => {
            if (!fireData || typeof fireData !== 'object') return;

            const now = Date.now();
            if (now - player.lastFireAt < MIN_FIRE_INTERVAL_MS) return;
            player.lastFireAt = now;

            const originX = sanitizeCoord(fireData.originX);
            const originZ = sanitizeCoord(fireData.originZ);
            const dirX = sanitizeCoord(fireData.dirX);
            const dirZ = sanitizeCoord(fireData.dirZ);
            if (originX === null || originZ === null || dirX === null || dirZ === null) return;

            const payload = {
                playerId: socket.id,
                originX,
                originZ,
                dirX,
                dirZ,
                weaponType: sanitizeString(fireData.weaponType, 24, 'plasma_carbine'),
                projectileId: sanitizeString(fireData.projectileId, 32, String(Date.now())),
                color: typeof fireData.color === 'number' ? fireData.color : null
            };

            if (player.roomCode) {
                socket.to(player.roomCode).emit('playerFired', payload);
            }
        });

        // Damage & combat resolution relay
        socket.on('playerDamage', (dmgData) => {
            if (!dmgData || typeof dmgData !== 'object') return;
            const targetId = sanitizeString(dmgData.targetId, 64, '');
            const damage = typeof dmgData.damage === 'number' ? Math.max(0, Math.min(999, dmgData.damage)) : 10;
            const isFatal = Boolean(dmgData.isFatal);

            if (isFatal) {
                sessionTelemetry.fatalHits += 1;
                logRelayEvent('FATAL_HIT', { roomCode: player.roomCode, attackerId: socket.id, targetId, damage });
            }

            if (player.roomCode && targetId) {
                io.to(player.roomCode).emit('playerDamaged', {
                    attackerId: socket.id,
                    targetId,
                    damage,
                    isFatal
                });
            }
        });

        // Co-Op Revival relay
        socket.on('playerRevive', (reviveData) => {
            if (!reviveData || typeof reviveData !== 'object') return;
            const targetId = sanitizeString(reviveData.targetId, 64, '');

            sessionTelemetry.revivesExecuted += 1;
            logRelayEvent('REVIVE', { roomCode: player.roomCode, reviverId: socket.id, targetId });

            if (player.roomCode && targetId) {
                io.to(player.roomCode).emit('playerRevived', {
                    reviverId: socket.id,
                    targetId,
                    timestamp: Date.now()
                });
            }
        });

        // Operative Field Trade & Barter relay
        socket.on('playerTradeOpen', (tradeData) => {
            if (!tradeData || typeof tradeData !== 'object') return;
            const targetId = sanitizeString(tradeData.targetId, 64, '');
            if (targetId) {
                io.to(targetId).emit('playerTradeRequested', {
                    senderId: socket.id,
                    senderCallsign: player.callsign,
                    senderClass: player.opClass
                });
            }
        });

        socket.on('playerTradeOffer', (tradeData) => {
            if (!tradeData || typeof tradeData !== 'object') return;
            const targetId = sanitizeString(tradeData.targetId, 64, '');
            if (targetId && tradeData.offer) {
                io.to(targetId).emit('playerTradeOfferUpdated', {
                    senderId: socket.id,
                    offer: tradeData.offer
                });
            }
        });

        socket.on('playerTradeAccept', (tradeData) => {
            if (!tradeData || typeof tradeData !== 'object') return;
            const targetId = sanitizeString(tradeData.targetId, 64, '');
            sessionTelemetry.tradesExecuted += 1;
            logRelayEvent('TRADE_ACCEPT', { roomCode: player.roomCode, senderId: socket.id, targetId, offer: tradeData.offer });

            if (targetId) {
                io.to(targetId).emit('playerTradeAccepted', {
                    senderId: socket.id,
                    offer: tradeData.offer
                });
            }
        });

        socket.on('playerTradeCancel', (tradeData) => {
            if (!tradeData || typeof tradeData !== 'object') return;
            const targetId = sanitizeString(tradeData.targetId, 64, '');
            if (targetId) {
                io.to(targetId).emit('playerTradeClosed', {
                    senderId: socket.id
                });
            }
        });

        socket.on('disconnect', () => {
            const roomCode = player.roomCode;
            players.delete(socket.id);

            if (roomCode && rooms.has(roomCode)) {
                const roomSet = rooms.get(roomCode);
                roomSet.delete(socket.id);
                if (roomSet.size === 0) {
                    rooms.delete(roomCode);
                } else {
                    socket.to(roomCode).emit('playerDisconnected', socket.id);
                }
            }
        });
    });

    return io;
}
