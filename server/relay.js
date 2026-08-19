import { Server } from 'socket.io';
import { verifySteamSessionToken, isSteamAuthDevFallbackAllowed } from './steamAuth.js';

// Movement & ballistics hardening: reject non-finite values, clamp to a sane world range,
// and rate-limit updates to protect the relay from flooding.
const WORLD_LIMIT = 100000;
const MIN_MOVE_INTERVAL_MS = 16; // ~60 updates/sec cap per socket
const MIN_FIRE_INTERVAL_MS = 40; // ~25 shots/sec cap per socket

// Sprint 24 Milestone A server-authoritative PvP damage
// (docs/sprint24-multiplayer-runtime-2026-08-19.md). These mirror the
// client's existing, unmodified balance -- BASE_HEARTS (src/threeGame.js)
// and the flat 10-damage-per-hit fallback every PvP shot already used
// (this.playerDamage was never actually assigned anywhere, so the
// fallback was the *only* value in practice) -- so moving authority to
// the server does not change game balance, only who gets to decide the
// outcome of a hit.
const PVP_DEFAULT_MAX_HP = 3;
const PVP_WEAPON_DAMAGE = 10;
// Real client projectile reach is PROJECTILE_SPEED(13.4) * PROJECTILE_TTL(1.15)
// =~15.4 units; this adds slack for the lag between when the attacker's
// origin was sampled and when the hit report arrives.
const PVP_WEAPON_RANGE = 20;
// Slightly under the client's real fire cooldown (WEAPON_FIRE_COOLDOWN =
// 0.14s = 140ms) to tolerate jitter without meaningfully allowing
// faster-than-legal fire.
const PVP_MIN_HIT_INTERVAL_MS = 110;

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

    // Sprint 24 Milestone A item 4: no anonymous production sockets. A
    // connecting client must present a session token minted by the
    // existing POST /steam/session route (ticket -> AuthenticateUserTicket
    // -> SteamID64 -> signed short-lived token, server/steamAuth.js). This
    // uses the exact same isSteamAuthDevFallbackAllowed() gate the REST
    // auth routes already use: outside production (no publisher key
    // configured, or HB_ALLOW_DEV_STEAM_AUTH not explicitly disabled), a
    // socket with no/invalid token is still let through as a dev-mode
    // identity so local dev/test workflows keep working -- in production,
    // it is rejected outright, closing the anonymous-socket gap the
    // Sprint 24 review flagged.
    io.use((socket, next) => {
        const token = socket.handshake.auth?.sessionToken ?? socket.handshake.query?.sessionToken;
        const verified = verifySteamSessionToken(token);
        if (verified.ok) {
            socket.steamAuth = verified;
            return next();
        }
        if (isSteamAuthDevFallbackAllowed()) {
            socket.steamAuth = { ok: true, steamId64: null, isDevMode: true, authMethod: 'unauthenticated_dev' };
            return next();
        }
        logRelayEvent('SOCKET_AUTH_REJECTED', { reason: verified.reason ?? 'unknown' });
        return next(new Error('unauthenticated_socket'));
    });

    io.on('connection', (socket) => {
        sessionTelemetry.totalConnections += 1;
        logRelayEvent('CONNECT', { socketId: socket.id, steamId64: socket.steamAuth?.steamId64 ?? null, isDevMode: Boolean(socket.steamAuth?.isDevMode) });
        const player = {
            id: socket.id,
            callsign: 'AGENT',
            opClass: 'TANK',
            steamId64: socket.steamAuth?.steamId64 ?? null,
            isDevMode: Boolean(socket.steamAuth?.isDevMode),
            x: 9,
            z: 9,
            yaw: 0,
            vx: 0,
            vz: 0,
            animState: 'idle',
            roomCode: 'SECTOR-7',
            isHost: false,
            lastMoveAt: 0,
            lastFireAt: 0,
            // Sprint 24 Milestone A: server-authoritative PvP HP + fire-rate
            // tracking. hp/maxHp/mode get (re)initialized on matchDeploy so
            // every fresh match starts full-health regardless of prior state.
            hp: PVP_DEFAULT_MAX_HP,
            maxHp: PVP_DEFAULT_MAX_HP,
            mode: 'coop',
            lastWeaponHitAt: 0
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

            const mode = matchData.mode === 'pvp' ? 'pvp' : 'coop';
            const payload = {
                seed: matchData.seed || 'SECTOR-7',
                mode,
                crashPlan: matchData.crashPlan || null,
                startedBy: socket.id,
                timestamp: Date.now()
            };

            // Sprint 24 Milestone A: (re)arm server-authoritative HP for every
            // player in the room at the start of a fresh match, not just the
            // one who clicked deploy.
            const roomSocketIds = rooms.get(roomCode);
            if (roomSocketIds) {
                roomSocketIds.forEach((id) => {
                    const p = players.get(id);
                    if (!p) return;
                    p.mode = mode;
                    p.hp = PVP_DEFAULT_MAX_HP;
                    p.maxHp = PVP_DEFAULT_MAX_HP;
                });
            }

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

        // Co-Op Downed-State relay -- Sprint 24 Milestone A. A player entering
        // "downed" (co-op only, revivable) rather than full death broadcasts
        // this so squadmates see them go down and can revive them; mirrors
        // playerRevive's shape exactly.
        socket.on('playerDowned', () => {
            logRelayEvent('PLAYER_DOWNED', { roomCode: player.roomCode, playerId: socket.id });
            if (player.roomCode) {
                socket.to(player.roomCode).emit('playerDownedBroadcast', {
                    playerId: socket.id,
                    timestamp: Date.now()
                });
            }
        });

        // Co-Op Enemy Hit-Sync relay -- Sprint 24 Milestone A. Host-authoritative-
        // style broadcast, not full server validation yet (see
        // docs/sprint24-multiplayer-runtime-2026-08-19.md): the sender's own
        // client already applied this damage locally when its projectile hit;
        // this just tells other clients in the room to apply the identical
        // damage to their own local copy of the same enemy (matched by type +
        // position on the receiving end, since enemies don't yet have a
        // cross-client-stable ID).
        socket.on('enemyDamage', (dmgData) => {
            if (!dmgData || typeof dmgData !== 'object') return;
            const x = sanitizeCoord(dmgData.x);
            const z = sanitizeCoord(dmgData.z);
            if (x === null || z === null) return;
            const damage = typeof dmgData.damage === 'number' ? Math.max(0, Math.min(999, dmgData.damage)) : 0;
            if (damage <= 0) return;
            const enemyType = sanitizeString(dmgData.enemyType, 32, 'unknown');

            if (player.roomCode) {
                socket.to(player.roomCode).emit('enemyDamaged', {
                    attackerId: socket.id,
                    enemyType,
                    x,
                    z,
                    damage
                });
            }
        });

        // Sprint 24 Milestone A: server-authoritative PvP damage
        // (docs/sprint24-multiplayer-runtime-2026-08-19.md). The VICTIM's
        // client reports being hit (this socket is the victim -- `player`
        // in this closure), naming who allegedly hit them and where that
        // attacker's shot originated. This direction is safe to
        // self-report: the only thing a lying victim can do is reduce
        // their own HP, which no rational cheater wants. The server never
        // trusts a client-supplied damage amount or fatality flag -- it
        // looks up the attacker's own server-known position (from their
        // playerMove updates, not the hit report) to range-check the
        // claim, rate-limits per attacker, and computes damage from its
        // own constant. What this does NOT do: full trajectory/line-of-
        // sight raycasting against wall geometry (the goal's own scoping
        // note says not to attempt headless server simulation this pass),
        // so a claim that passes range+rate-limit but was actually blocked
        // by a wall client-side would still be honored -- a known,
        // documented gap, not silently missed.
        socket.on('weaponHit', (hitData) => {
            if (!hitData || typeof hitData !== 'object') return;
            if (player.mode !== 'pvp') return;
            if (player.hp <= 0) return;

            const attackerId = sanitizeString(hitData.attackerId, 64, '');
            const attacker = players.get(attackerId);
            if (!attacker || !player.roomCode || attacker.roomCode !== player.roomCode) return;
            if (attacker.mode !== 'pvp') return;

            const now = Date.now();
            if (now - (attacker.lastWeaponHitAt || 0) < PVP_MIN_HIT_INTERVAL_MS) return;

            const originX = sanitizeCoord(hitData.originX);
            const originZ = sanitizeCoord(hitData.originZ);
            if (originX === null || originZ === null) return;
            const dist = Math.hypot(originX - attacker.x, originZ - attacker.z);
            if (dist > PVP_WEAPON_RANGE) return;

            attacker.lastWeaponHitAt = now;

            const damage = PVP_WEAPON_DAMAGE;
            player.hp = Math.max(0, player.hp - damage);
            const isFatal = player.hp <= 0;

            if (isFatal) {
                sessionTelemetry.fatalHits += 1;
                logRelayEvent('FATAL_HIT', { roomCode: player.roomCode, attackerId, targetId: socket.id, damage });
            }
            logRelayEvent('WEAPON_HIT', { roomCode: player.roomCode, attackerId, targetId: socket.id, damage, isFatal });

            io.to(player.roomCode).emit('playerDamaged', {
                attackerId,
                targetId: socket.id,
                damage,
                isFatal
            });
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
