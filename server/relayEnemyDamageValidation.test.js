import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import http from 'node:http';
import { io as ioClient } from 'socket.io-client';
import { attachRelay } from './relay.js';

// Regression tests for hardening co-op enemyDamage/enemyHitReport, which
// docs/sprint24-multiplayer-runtime-2026-08-19.md documented as fully
// client-trusted gossip ("basic clamping (damage 0-999), not full server
// validation"). This doesn't move enemy-HP ownership to the server (a
// bigger, deliberately out-of-scope change) -- it validates the claim the
// same way PvP's weaponHit does: is the damage plausible, is the claimed
// hit position plausible given the reporting socket's own tracked
// position, and is it claiming hits faster than physically possible.

function startTestServer() {
    const httpServer = http.createServer();
    attachRelay(httpServer);
    return new Promise((resolve) => {
        httpServer.listen(0, () => {
            const { port } = httpServer.address();
            resolve({ httpServer, url: `http://localhost:${port}` });
        });
    });
}

function connectClient(url) {
    return new Promise((resolve, reject) => {
        const socket = ioClient(url, { reconnection: false, timeout: 2000 });
        socket.on('connect', () => resolve(socket));
        socket.on('connect_error', reject);
    });
}

function waitForEvent(socket, eventName, timeoutMs = 800) {
    return new Promise((resolve) => {
        const timer = setTimeout(() => resolve(null), timeoutMs);
        socket.once(eventName, (payload) => {
            clearTimeout(timer);
            resolve(payload);
        });
    });
}

describe('Server Relay: co-op enemy-hit-sync validation', () => {
    let httpServer;
    let url;
    let sockets;

    beforeEach(() => {
        delete process.env.HB_STEAM_PUBLISHER_KEY;
        delete process.env.HB_ALLOW_DEV_STEAM_AUTH;
        process.env.NODE_ENV = 'test';
        sockets = [];
    });

    afterEach(() => {
        for (const socket of sockets) socket.disconnect();
        httpServer?.close();
    });

    it('clamps a spoofed damage claim to the plausible ceiling instead of honoring an arbitrary huge value', async () => {
        ({ httpServer, url } = await startTestServer());
        const roomCode = 'ENEMY-DMG-CLAMP-TEST';

        const attacker = await connectClient(url);
        const observer = await connectClient(url);
        sockets.push(attacker, observer);

        attacker.emit('joinRoom', { roomCode, callsign: 'HOST', opClass: 'TANK' });
        await waitForEvent(attacker, 'currentPlayers');
        observer.emit('joinRoom', { roomCode, callsign: 'GUEST', opClass: 'SCOUT' });
        await waitForEvent(observer, 'currentPlayers');

        // Attacker is at its default spawn (x:9, z:9); claim a hit right there.
        const damaged = waitForEvent(observer, 'enemyDamaged');
        attacker.emit('enemyDamage', { x: 9, z: 9, damage: 9999, enemyType: 'snail' });
        const event = await damaged;

        expect(event).not.toBeNull();
        expect(event.damage).toBeLessThanOrEqual(50);
        expect(event.damage).toBeGreaterThan(0);
    });

    it('drops an enemyDamage claim whose position is far outside the attacker\'s own tracked range', async () => {
        ({ httpServer, url } = await startTestServer());
        const roomCode = 'ENEMY-DMG-RANGE-TEST';

        const attacker = await connectClient(url);
        const observer = await connectClient(url);
        sockets.push(attacker, observer);

        attacker.emit('joinRoom', { roomCode, callsign: 'HOST', opClass: 'TANK' });
        await waitForEvent(attacker, 'currentPlayers');
        observer.emit('joinRoom', { roomCode, callsign: 'GUEST', opClass: 'SCOUT' });
        await waitForEvent(observer, 'currentPlayers');

        // Attacker never moved from its default spawn (x:9, z:9); claiming
        // a hit 500 units away is not physically possible.
        const damaged = waitForEvent(observer, 'enemyDamaged', 400);
        attacker.emit('enemyDamage', { x: 509, z: 9, damage: 5, enemyType: 'snail' });
        const event = await damaged;

        expect(event).toBeNull();
    });

    it('rate-limits enemyDamage claims from the same attacker instead of honoring an unbounded flood', async () => {
        ({ httpServer, url } = await startTestServer());
        const roomCode = 'ENEMY-DMG-RATELIMIT-TEST';

        const attacker = await connectClient(url);
        const observer = await connectClient(url);
        sockets.push(attacker, observer);

        attacker.emit('joinRoom', { roomCode, callsign: 'HOST', opClass: 'TANK' });
        await waitForEvent(attacker, 'currentPlayers');
        observer.emit('joinRoom', { roomCode, callsign: 'GUEST', opClass: 'SCOUT' });
        await waitForEvent(observer, 'currentPlayers');

        const events = [];
        observer.on('enemyDamaged', (e) => events.push(e));

        for (let i = 0; i < 10; i += 1) {
            attacker.emit('enemyDamage', { x: 9, z: 9, damage: 5, enemyType: 'snail' });
        }
        await new Promise((resolve) => setTimeout(resolve, 300));

        // 10 hits fired back-to-back in a tight synchronous loop must not
        // all land -- the rate limit should have dropped most of them.
        expect(events.length).toBeGreaterThan(0);
        expect(events.length).toBeLessThan(10);
    });

    it('still relays a legitimate, in-range, correctly-paced hit end to end', async () => {
        ({ httpServer, url } = await startTestServer());
        const roomCode = 'ENEMY-DMG-LEGIT-TEST';

        const attacker = await connectClient(url);
        const observer = await connectClient(url);
        sockets.push(attacker, observer);

        attacker.emit('joinRoom', { roomCode, callsign: 'HOST', opClass: 'TANK' });
        await waitForEvent(attacker, 'currentPlayers');
        observer.emit('joinRoom', { roomCode, callsign: 'GUEST', opClass: 'SCOUT' });
        await waitForEvent(observer, 'currentPlayers');

        const damaged = waitForEvent(observer, 'enemyDamaged');
        attacker.emit('enemyDamage', { x: 10, z: 10, damage: 2, enemyType: 'snail' });
        const event = await damaged;

        expect(event).not.toBeNull();
        expect(event.damage).toBe(2);
        expect(event.attackerId).toBe(attacker.id);
    });

    it('validates a host-confirmed guest hit against the guest position', async () => {
        ({ httpServer, url } = await startTestServer());
        const roomCode = 'ENEMY-GUEST-HIT-TEST';

        const host = await connectClient(url);
        const guest = await connectClient(url);
        sockets.push(host, guest);
        host.emit('joinRoom', { roomCode, callsign: 'HOST', opClass: 'TANK' });
        await waitForEvent(host, 'currentPlayers');
        guest.emit('joinRoom', { roomCode, callsign: 'GUEST', opClass: 'SCOUT' });
        await waitForEvent(guest, 'currentPlayers');

        const moved = waitForEvent(host, 'playerMoved');
        guest.emit('playerMove', { x: 100, z: 100 });
        await moved;

        const reportedPromise = waitForEvent(host, 'enemyHitReported');
        guest.emit('enemyHitReport', {
            x: 101, z: 100, damage: 2, enemyType: 'crawler', scatterKey: '1,1:0:crawler'
        });
        const reported = await reportedPromise;
        expect(reported?.reporterId).toBe(guest.id);

        const damagedPromise = waitForEvent(guest, 'enemyDamaged');
        host.emit('enemyDamage', reported);
        const damaged = await damagedPromise;

        expect(damaged).not.toBeNull();
        expect(damaged.scatterKey).toBe('1,1:0:crawler');
        expect(damaged.damage).toBe(2);
    });

    it('relays canonical host enemy snapshots and rejects guest snapshots', async () => {
        ({ httpServer, url } = await startTestServer());
        const roomCode = 'ENEMY-SNAPSHOT-TEST';

        const host = await connectClient(url);
        const guest = await connectClient(url);
        sockets.push(host, guest);
        host.emit('joinRoom', { roomCode, callsign: 'HOST', opClass: 'TANK' });
        await waitForEvent(host, 'currentPlayers');
        guest.emit('joinRoom', { roomCode, callsign: 'GUEST', opClass: 'SCOUT' });
        await waitForEvent(guest, 'currentPlayers');

        const snapshotPromise = waitForEvent(guest, 'enemyStateSnapshot');
        host.emit('enemyState', {
            enemies: [{
                scatterKey: '1,1:0:crawler', enemyType: 'crawler',
                x: 12, z: 13, hp: 2, burstTriggered: false
            }]
        });
        const snapshot = await snapshotPromise;
        expect(snapshot?.enemies).toEqual([{
            scatterKey: '1,1:0:crawler', enemyType: 'crawler',
            x: 12, z: 13, hp: 2, burstTriggered: false,
            // Carried so a peer can recreate a host-owned boss it has never
            // seen; an ordinary crawler reports the defaults.
            isBoss: false, scale: null
        }]);

        const rejectedPromise = waitForEvent(host, 'enemyStateSnapshot', 300);
        guest.emit('enemyState', { enemies: snapshot.enemies });
        expect(await rejectedPromise).toBeNull();
    });
});
