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

// Sprint 26: co-op enemy-hit-sync (enemyDamage/enemyHitReport below) was
// still fully client-trusted gossip after the PvP damage hardening pass --
// "basic clamping (damage 0-999), not full server validation" per
// docs/sprint24-multiplayer-runtime-2026-08-19.md. Full server-authority
// (the relay owning enemy HP truth) is a real architecture change the
// review explicitly scoped out ("don't attempt headless server simulation
// yet") -- the host stays the source of truth for enemy state. This adds
// the same category of *validation* PvP got, without taking over that
// ownership: is the claimed damage plausible, and is the claimed hit
// position plausible given where the reporting socket says it actually is.
// 999 was roughly 100x any real single-hit value (base projectileDamage is
// 1-2/class, MELEE_DAMAGE 4, TURRET/ASSIST_DAMAGE 1 -- see src/threeGame.js)
// -- 50 stays generously above any known base+skill-tree-bonus combination
// while cutting the spoofable range by >90%; it's a judgment call, not a
// verified exact ceiling, same as PVP_WEAPON_RANGE's margin below.
const PVE_MAX_HIT_DAMAGE = 50;
// Reuses PvP's own range constant rather than re-deriving a PvE-specific
// one: it's the same weapons/projectiles on both sides of that constant.
const PVE_HIT_RANGE = PVP_WEAPON_RANGE;
// Deliberately reuses MIN_FIRE_INTERVAL_MS (the same ~25/sec cap already
// applied to this player's own weapon-fire relay) rather than PvP's
// stricter 110ms: co-op damage can legitimately land from multiple
// simultaneous sources per player (ranged + melee + an ENGINEER's
// auto-turret, which is attributed to the player who deployed it) in a way
// a single PvP gun's fire-rate never can, so a PvP-tight limit would risk
// false-rejecting real simultaneous hits.
const PVE_MIN_HIT_INTERVAL_MS = MIN_FIRE_INTERVAL_MS;

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

// docs/multiplayer-flow-and-lobby-bugs-2026-08-20.md Phase 3: a small,
// display-only summary of each player's equipped weapon/charm -- not the
// full loadout (mods, skins, decals stay purely local, no gameplay logic
// anywhere reads this), just enough for the roster and the squad-composition
// cutscene (Phase 4) to show what each operative brought. Untrusted client
// input, so every field gets the same defensive treatment as callsign/opClass
// above rather than trusting shape or type.
function sanitizeLoadout(value) {
    if (!value || typeof value !== 'object') return null;
    return {
        weapon: sanitizeString(value.weapon, 40, 'UNARMED'),
        hasCharm: Boolean(value.hasCharm)
    };
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

// docs/steamstorestatus.log Part A CORS fix: a packaged Electron renderer's
// Socket.IO handshake carries an Origin of 'file://' (a scheme, not a
// browser-style https://host) or no Origin header at all -- neither ever
// matches an HB_ALLOWED_ORIGINS entry, which strict production deploys
// require to be real https:// web origins (see
// server/backendEnvAudit.js's validateOrigins). Locking HB_ALLOWED_ORIGINS
// down for the real production web origin would therefore also lock out
// every legitimate packaged-game connection, not just browser tabs.
// Permits the configured web origins (unchanged) OR a missing/file://
// Electron origin; does NOT weaken auth -- the socket auth middleware
// below (io.use, verifying handshake.auth.sessionToken against a signed
// Steam session) still rejects any connection without a valid session
// regardless of which origin let the handshake through. CORS answers
// "which web page may script this connection," not "who is allowed to
// act" -- those are different questions and only the second one is
// actually a trust boundary here.
export function isAllowedRelayOrigin(origin, allowedOrigins = []) {
    if (allowedOrigins.length === 0) return true; // dev/local: no allowlist configured
    if (!origin || origin === 'null' || origin.startsWith('file://')) return true;
    return allowedOrigins.includes(origin);
}

export function attachRelay(server, { allowedOrigins = [] } = {}) {
    const io = new Server(server, {
        cors: {
            origin: (origin, callback) => {
                callback(null, isAllowedRelayOrigin(origin, allowedOrigins));
            },
            methods: ['GET', 'POST']
        }
    });

    // Map: socketId -> playerState
    const players = new Map();
    // Map: roomCode -> Set of socketIds
    const rooms = new Map();
    // Map: roomCode -> 'coop' | 'pvp'. A reconnect gets an entirely fresh
    // socket.id and therefore a fresh `player` object (mode defaults back to
    // 'coop' below) -- without this, a reconnect mid-PvP-match silently
    // fails every subsequent weaponHit for that player against the
    // `mode !== 'pvp'` guard, with no client-visible error. Set on
    // matchDeploy, read on joinRoom so a (re)joining socket picks up the
    // room's current match mode instead of always defaulting to coop.
    // HP is deliberately NOT restored here -- that's a separate design
    // decision (respawn-on-reconnect vs. exact-HP-restore) this fix doesn't
    // attempt.
    const roomModes = new Map();
    // Map: roomCode -> { timeout }. Set when a host's matchDeploy passes the
    // ready-up gate below; the actual mode/HP arm + matchStarted broadcast
    // is deferred to when this timer fires, giving every client the same
    // countdown window to reach gameplay together instead of the host
    // launching solo the instant they click deploy.
    const roomCountdowns = new Map();
    const MATCH_COUNTDOWN_MS = 3000;
    // Map: roomCode -> stable identity key (steamId64 when real, otherwise
    // the client's persisted localStorage profileId -- see
    // src/profile.js's ProfileManager) of whoever should be that room's
    // host. Host assignment used to be pure "first socket to join an empty
    // room," which is why a reconnect (a brand-new socket.id, confirmed
    // happening even during the *initial* connect sequence under load, not
    // just mid-match) could either steal an existing host's slot or land as
    // non-host in a room whose real host was mid-reconnect. This map lets a
    // reconnecting socket reclaim host status instead of being treated as
    // an unrelated new peer.
    const roomHostKeys = new Map();

    // docs/multiplayer-flow-and-lobby-bugs-2026-08-20.md Phase 2: host-set
    // private-lobby password. Map: roomCode -> SHA-256 hex hash, hashed
    // client-side (src/steamLobbyClient.js's hashPassword) -- the relay only
    // ever sees/stores the hash, never the plaintext password. Set once by
    // whoever holds host on first joinRoom for a room that doesn't have one
    // yet; every later non-host joinRoom for that room must supply a
    // matching hash or gets rejected before being added to the room. Never
    // cleared on room-empty (same lifetime rule as roomHostKeys, for the
    // same reconnect reason) -- only ever overwritten if the room's host
    // reclaims with a different password.
    const roomPasswordHashes = new Map();

    const getStableClientKey = (p) => p.steamId64 || p.profileId || null;

    const getPublicPlayer = (p) => ({
        id: p.id,
        callsign: p.callsign,
        ready: p.ready,
        opClass: p.opClass,
        loadout: p.loadout,
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
            loadout: null,
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
            lastWeaponHitAt: 0,
            lastEnemyHitAt: 0,
            // Ready-up gate (see matchDeploy below): previously nonexistent --
            // any single socket emitting matchDeploy instantly launched the
            // whole room for everyone, with no wait for other players.
            ready: false
        };
        players.set(socket.id, player);

        // Join room handler
        socket.on('joinRoom', (data = {}) => {
            const roomCode = sanitizeString(data.roomCode, 24, 'SECTOR-7').toUpperCase();
            const callsign = sanitizeString(data.callsign, 20, `OPERATIVE-${socket.id.slice(0, 4).toUpperCase()}`);
            const opClass = ['SCOUT', 'TANK', 'ENGINEER'].includes(data.opClass) ? data.opClass : 'TANK';
            const loadoutSummary = sanitizeLoadout(data.loadout);
            // No fallback here (unlike callsign/opClass): an empty string
            // must stay falsy so getStableClientKey() correctly reports "no
            // durable identity available" rather than a literal placeholder
            // string that would make every such client look like the same
            // "user."
            player.profileId = sanitizeString(data.profileId, 64, '') || null;

            // Leave existing room if any
            if (player.roomCode && rooms.has(player.roomCode)) {
                socket.leave(player.roomCode);
                rooms.get(player.roomCode).delete(socket.id);
                socket.to(player.roomCode).emit('playerDisconnected', socket.id);
            }

            player.roomCode = roomCode;
            player.callsign = callsign;
            player.opClass = opClass;
            // A reconnect (rejoin with no loadout data) shouldn't wipe a
            // previously-synced summary -- only overwrite when this joinRoom
            // actually carried one.
            if (loadoutSummary) player.loadout = loadoutSummary;
            player.ready = false;
            // Restore the room's in-progress match mode (see roomModes
            // comment above) -- covers both a genuine reconnect mid-match
            // and, harmlessly, a first-time join before any matchDeploy has
            // happened yet (roomModes has no entry, so this is a no-op and
            // player.mode keeps its 'coop' default from connection time).
            if (roomModes.has(roomCode)) {
                player.mode = roomModes.get(roomCode);
            }

            const stableKey = getStableClientKey(player);
            const recordedHostKey = roomHostKeys.get(roomCode);
            const roomSocketIdsForHost = rooms.get(roomCode);
            const currentHostStillPresent = Boolean(
                roomSocketIdsForHost && Array.from(roomSocketIdsForHost).some((id) => players.get(id)?.isHost)
            );

            // Demotes every other currently-connected player in the room --
            // called whenever this joiner is about to become host, so a
            // reclaim/promotion can never leave two sockets simultaneously
            // marked isHost in the same room (which player.isHost alone,
            // set only on the joiner, would otherwise allow).
            const demoteOtherHostsInRoom = () => {
                if (!roomSocketIdsForHost) return;
                for (const id of roomSocketIdsForHost) {
                    if (id === socket.id) continue;
                    const p = players.get(id);
                    if (p) p.isHost = false;
                }
            };

            if (!rooms.has(roomCode)) {
                rooms.set(roomCode, new Set());
            }

            // Deliberately checked BEFORE/independent of whether the room
            // Set above was just (re)created: the most common real case
            // this durability fix targets is a *solo* host's connection
            // dropping and reconnecting, which empties (and, pre-fix,
            // deleted) the room Set in between -- so gating reclaim on "the
            // room already existed" would defeat the fix for exactly that
            // case. roomHostKeys is intentionally never cleared just because
            // a room went momentarily empty (see disconnect handler below).
            if (stableKey && recordedHostKey && stableKey === recordedHostKey) {
                // This socket's stable identity matches the room's recorded
                // host, even though its socket.id is new (a reconnect) --
                // reclaim host status rather than landing as a regular peer,
                // even if someone else was promoted to host in the interim.
                demoteOtherHostsInRoom();
                player.isHost = true;
            } else if (!currentHostStillPresent) {
                // Nobody currently connected holds host -- either this is a
                // genuinely fresh room, or the recorded host is gone (never
                // had a stable key, or truly left rather than reconnecting).
                // Promote this joiner rather than leaving the room hostless.
                player.isHost = true;
                // Only claim the room's durable host record if nobody has
                // ever been recorded for it. A promotion into a room that's
                // merely *transiently* hostless (its real host may still be
                // mid-reconnect) must not overwrite that host's claim --
                // otherwise the very next reconnect from the real host would
                // find its own key already evicted by whoever got promoted
                // in the gap, defeating this fix for exactly the case it
                // targets.
                if (!recordedHostKey && stableKey) roomHostKeys.set(roomCode, stableKey);
            } else {
                player.isHost = false;
            }

            // docs/multiplayer-flow-and-lobby-bugs-2026-08-20.md Phase 2:
            // private-lobby password gate. The host's hash (if any) is
            // recorded the moment they hold host on a room with no password
            // recorded yet; every other joiner must then supply a matching
            // hash. A host who reclaims (reconnect) with a different hash
            // than what's recorded is trusted to update it -- they own the
            // room, not an attacker impersonating them, since reclaim itself
            // already required stableKey === recordedHostKey above.
            const suppliedPasswordHash = typeof data.passwordHash === 'string' && data.passwordHash.length <= 128
                ? data.passwordHash
                : null;
            if (player.isHost) {
                if (suppliedPasswordHash) {
                    roomPasswordHashes.set(roomCode, suppliedPasswordHash);
                } else {
                    roomPasswordHashes.delete(roomCode);
                }
            } else {
                const requiredPasswordHash = roomPasswordHashes.get(roomCode);
                if (requiredPasswordHash && requiredPasswordHash !== suppliedPasswordHash) {
                    socket.emit('joinRejected', { reason: 'incorrect_password' });
                    return;
                }
            }

            rooms.get(roomCode).add(socket.id);
            socket.join(roomCode);

            // Send current roster in this room to the joining player
            socket.emit('currentPlayers', getRoomPlayers(roomCode));
            // Notify other peers in this room
            socket.to(roomCode).emit('newPlayer', getPublicPlayer(player));
        });

        // Ready-up gate: previously there was no readiness concept at all --
        // any single socket emitting matchDeploy instantly deployed the
        // whole room. A player toggles their own ready state; backing out
        // while a countdown is already pending cancels the launch rather
        // than silently deploying without them.
        socket.on('playerReady', (data = {}) => {
            if (!player.roomCode) return;
            player.ready = Boolean(data.ready);
            io.to(player.roomCode).emit('playerReadyChanged', { id: socket.id, ready: player.ready });

            if (!player.ready && roomCountdowns.has(player.roomCode)) {
                const pending = roomCountdowns.get(player.roomCode);
                clearTimeout(pending.timeout);
                roomCountdowns.delete(player.roomCode);
                io.to(player.roomCode).emit('matchCountdownCancelled', { reason: 'player_unready', playerId: socket.id });
            }
        });

        // Match deployment / start event (initiated by room host). Gated on
        // every player in the room being ready, then a short synchronized
        // countdown -- matchStarted only fires once that elapses, so every
        // client (including the host, via its own io.to() echo) starts
        // together via the same handleRemoteMatchStart path client-side,
        // instead of the host launching solo the instant it clicks deploy.
        socket.on('matchDeploy', (matchData = {}) => {
            const roomCode = player.roomCode;
            if (!roomCode || roomCountdowns.has(roomCode)) return;

            const roomSocketIds = rooms.get(roomCode);
            const allReady = Boolean(roomSocketIds?.size) && Array.from(roomSocketIds).every((id) => players.get(id)?.ready);
            if (!allReady) {
                socket.emit('matchDeployRejected', { reason: 'not_all_ready' });
                return;
            }

            const mode = matchData.mode === 'pvp' ? 'pvp' : 'coop';
            const seed = matchData.seed || 'SECTOR-7';
            const crashPlan = matchData.crashPlan || null;
            const startedBy = socket.id;

            io.to(roomCode).emit('matchCountdown', { durationMs: MATCH_COUNTDOWN_MS });

            const timeout = setTimeout(() => {
                roomCountdowns.delete(roomCode);
                roomModes.set(roomCode, mode);

                // Sprint 24 Milestone A: (re)arm server-authoritative HP for
                // every player in the room at the start of a fresh match, not
                // just the one who clicked deploy. Ready resets so the next
                // deploy needs a fresh ready-up, not stale state from this one.
                const roomSocketIdsNow = rooms.get(roomCode);
                if (roomSocketIdsNow) {
                    roomSocketIdsNow.forEach((id) => {
                        const p = players.get(id);
                        if (!p) return;
                        p.mode = mode;
                        p.hp = PVP_DEFAULT_MAX_HP;
                        p.maxHp = PVP_DEFAULT_MAX_HP;
                        p.ready = false;
                    });
                }

                sessionTelemetry.matchesDeployed += 1;
                logRelayEvent('MATCH_DEPLOY', { roomCode, mode, seed, startedBy });

                io.to(roomCode).emit('matchStarted', { seed, mode, crashPlan, startedBy, timestamp: Date.now() });
            }, MATCH_COUNTDOWN_MS);

            roomCountdowns.set(roomCode, { timeout });
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

        // Sprint 26: match-completion/extraction sync -- previously a
        // player extracting was invisible to both the server and every
        // other client in the room (docs/sprint24-multiplayer-runtime-2026-08-19.md's
        // known gap #7's actual remaining half; its spawn/crash-site half
        // was already fixed by matchDeploy relaying one deployer-computed
        // crashPlan verbatim to everyone, not independently recomputed).
        // Mirrors playerDowned's shape exactly -- this is visibility, not
        // match-authority: it does NOT end the match for anyone else or
        // gate anything server-side, deliberately scoped smaller than
        // "the server decides when the whole room's run is over," which
        // would need reconciling each client's independently-computed
        // runStats/score into one server-agreed outcome (a bigger lift,
        // not attempted here).
        socket.on('playerExtracted', (data = {}) => {
            logRelayEvent('PLAYER_EXTRACTED', { roomCode: player.roomCode, playerId: socket.id });
            if (player.roomCode) {
                socket.to(player.roomCode).emit('playerExtractedBroadcast', {
                    playerId: socket.id,
                    callsign: player.callsign,
                    runScore: Number.isFinite(data?.runScore) ? data.runScore : null,
                    timestamp: Date.now()
                });
            }
        });

        // Sprint 26: shared by both enemyDamage and enemyHitReport below.
        // In both handlers `player` (the emitting socket's own tracked
        // state) IS the attacker making the claim -- neither event names a
        // separate attacker the way PvP's weaponHit does -- so validation is
        // simpler: is the claimed damage plausible, is the claimed hit
        // position plausible given where this same socket's own playerMove
        // history says it actually is, and is it claiming hits faster than
        // physically possible. Returns a clamped, validated { x, z, damage,
        // enemyType } or null if the claim should be dropped.
        function validateEnemyHitClaim(dmgData) {
            if (!dmgData || typeof dmgData !== 'object') return null;
            const x = sanitizeCoord(dmgData.x);
            const z = sanitizeCoord(dmgData.z);
            if (x === null || z === null) return null;
            const damage = typeof dmgData.damage === 'number' ? Math.max(0, Math.min(PVE_MAX_HIT_DAMAGE, dmgData.damage)) : 0;
            if (damage <= 0) return null;

            const now = Date.now();
            if (now - (player.lastEnemyHitAt || 0) < PVE_MIN_HIT_INTERVAL_MS) return null;

            const dist = Math.hypot(x - player.x, z - player.z);
            if (dist > PVE_HIT_RANGE) return null;

            player.lastEnemyHitAt = now;
            const enemyType = sanitizeString(dmgData.enemyType, 32, 'unknown');
            // Sprint 26: pass-through only, not validated against anything --
            // the server doesn't track enemy state to check it against (see
            // this function's own header comment). Purely a routing string
            // the receiving client uses to look up its local sprite by exact
            // ID instead of nearest-position matching; sanitizeString still
            // bounds its length/type like every other client-supplied field.
            const scatterKey = dmgData.scatterKey != null ? sanitizeString(dmgData.scatterKey, 64, '') || null : null;
            return { x, z, damage, enemyType, scatterKey };
        }

        // Co-Op Enemy Hit-Sync relay -- Sprint 24 Milestone A item 5,
        // host-authoritative for the first cut (see
        // docs/sprint24-multiplayer-runtime-2026-08-19.md). The client-side
        // gate now only lets the room's actual host emit this event directly
        // (a non-host client's local hit is a candidate, reported via
        // enemyHitReport below instead) -- so this broadcast is genuinely
        // the host's canonical determination, not peer gossip. Sprint 26:
        // the relay now validates the claim (see validateEnemyHitClaim)
        // instead of only clamping damage to an arbitrary 0-999 -- it still
        // doesn't own enemy HP truth (that stays with the host; full
        // server-authority would need real server-side enemy-state
        // tracking, out of scope for "don't attempt headless server
        // simulation yet"), it just refuses to relay an implausible claim.
        socket.on('enemyDamage', (dmgData) => {
            const claim = validateEnemyHitClaim(dmgData);
            if (!claim) return;
            const { x, z, damage, enemyType, scatterKey } = claim;

            if (player.roomCode) {
                socket.to(player.roomCode).emit('enemyDamaged', {
                    attackerId: socket.id,
                    enemyType,
                    scatterKey,
                    x,
                    z,
                    damage
                });
            }
        });

        // Sprint 24 Milestone A item 5: a non-host client's candidate enemy
        // hit, relayed privately to the room's host only (not broadcast) --
        // the host resolves it (matches its own local copy of the enemy,
        // applies damage, and broadcasts the canonical enemyDamage/enemyDamaged
        // outcome above) rather than every client independently deciding
        // enemy state for itself.
        socket.on('enemyHitReport', (dmgData) => {
            if (!player.roomCode) return;
            const claim = validateEnemyHitClaim(dmgData);
            if (!claim) return;
            const { x, z, damage, enemyType, scatterKey } = claim;

            const roomSocketIds = rooms.get(player.roomCode);
            const hostId = roomSocketIds
                ? [...roomSocketIds].find((id) => players.get(id)?.isHost)
                : null;
            if (!hostId || hostId === socket.id) {
                // Sprint 24 Milestone A item 5: this is the observable
                // signature of the "no host in the room" reliability gap
                // (docs/sprint24-multiplayer-runtime-2026-08-19.md) -- a
                // reporting client's hit is silently dropped whenever no
                // room member currently has isHost:true. Logged so this is
                // diagnosable from server logs instead of only inferrable
                // from a client-side symptom (enemy HP never updates).
                logRelayEvent('ENEMY_HIT_REPORT_NO_HOST', { roomCode: player.roomCode, reporterId: socket.id, hostId: hostId ?? null });
                return;
            }

            io.to(hostId).emit('enemyHitReported', {
                reporterId: socket.id,
                enemyType,
                scatterKey,
                x,
                z,
                damage
            });
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
                // A disconnect mid-countdown means the room that was
                // confirmed all-ready no longer matches who's actually
                // still here -- cancel rather than deploy without them.
                if (roomCountdowns.has(roomCode)) {
                    clearTimeout(roomCountdowns.get(roomCode).timeout);
                    roomCountdowns.delete(roomCode);
                    io.to(roomCode).emit('matchCountdownCancelled', { reason: 'player_disconnected', playerId: socket.id });
                }
                if (roomSet.size === 0) {
                    rooms.delete(roomCode);
                    roomModes.delete(roomCode);
                    // roomHostKeys is deliberately NOT cleared here -- it
                    // must survive a room going momentarily empty so a solo
                    // host's reconnect can still reclaim (see joinRoom's
                    // comment). A stale entry for an abandoned room code is
                    // harmless: a real reconnect only matches when the
                    // rejoining socket's stable identity key is actually
                    // equal, and any other joiner just gets promoted via the
                    // "nobody currently holds host" branch as normal.
                } else {
                    socket.to(roomCode).emit('playerDisconnected', socket.id);
                    // Sprint 26 goal item 5: immediate host failover. Without
                    // this, a host disconnecting mid-match (not just at the
                    // lobby) left the room permanently hostless until either
                    // the original host reconnected or a brand-new player
                    // joined -- neither of which happens for the common
                    // "co-op squad, nobody new shows up mid-run" case. Since
                    // enemyHitReport only ever routes to whoever currently
                    // has isHost, that silently froze co-op combat
                    // resolution for everyone else for the entire outage.
                    // Deliberately does NOT touch roomHostKeys: this is an
                    // interim promotion only, so the original host can still
                    // reclaim its durable slot on reconnect exactly as
                    // before (see joinRoom's reclaim branch).
                    if (player.isHost) {
                        const nextHostId = roomSet.values().next().value;
                        const nextHost = nextHostId ? players.get(nextHostId) : null;
                        if (nextHost) {
                            nextHost.isHost = true;
                            io.to(roomCode).emit('hostChanged', { hostId: nextHostId });
                        }
                    }
                }
            }
        });
    });

    return io;
}
