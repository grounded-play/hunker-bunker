import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import http from 'node:http';
import { io as ioClient } from 'socket.io-client';
import { attachRelay, PVP_DEFAULT_MAX_HP } from './relay.js';

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

function waitForEvent(socket, eventName, timeoutMs = 5000) {
    return new Promise((resolve) => {
        const timer = setTimeout(() => resolve(null), timeoutMs);
        socket.once(eventName, (payload) => {
            clearTimeout(timer);
            resolve(payload);
        });
    });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

describe('Server Relay: PvP 4-Heart Authority Contract (GAP-PV-01)', () => {
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

    it('exports PVP_DEFAULT_MAX_HP as 4 matching the client four-heart contract', () => {
        expect(PVP_DEFAULT_MAX_HP).toBe(4);
    });

    it('enforces that exactly four valid weapon hits are required to kill in PvP mode', async () => {
        ({ httpServer, url } = await startTestServer());
        const roomCode = 'PVP-4HEARTS-AUTHORITY-TEST';

        const p1 = await connectClient(url);
        const p2 = await connectClient(url);
        sockets.push(p1, p2);

        p1.emit('joinRoom', { roomCode, callsign: 'ATTACKER', opClass: 'SCOUT' });
        await waitForEvent(p1, 'currentPlayers');
        p2.emit('joinRoom', { roomCode, callsign: 'DEFENDER', opClass: 'TANK' });
        await waitForEvent(p2, 'currentPlayers');

        // Both players ready up using the playerReady event
        p1.emit('playerReady', { ready: true });
        p2.emit('playerReady', { ready: true });
        await waitForEvent(p1, 'playerReadyChanged');
        await waitForEvent(p1, 'playerReadyChanged');

        const matchStartedP1 = waitForEvent(p1, 'matchStarted', 5000);
        const matchStartedP2 = waitForEvent(p2, 'matchStarted', 5000);
        p1.emit('matchDeploy', { mode: 'pvp', seed: 'test-seed-4h' });

        const [start1, start2] = await Promise.all([matchStartedP1, matchStartedP2]);
        expect(start1?.mode).toBe('pvp');
        expect(start2?.mode).toBe('pvp');

        const damageEvents = [];
        p2.on('playerDamaged', (data) => damageEvents.push(data));

        for (const [payload, reason] of [
            [{ targetId: 'missing', originX: 9, originZ: 9 }, 'participant_unavailable'],
            [{ targetId: p2.id, originX: 'invalid', originZ: 9 }, 'invalid_impact'],
            [{ targetId: p2.id, originX: 1000, originZ: 1000 }, 'out_of_range']
        ]) {
            const rejected = waitForEvent(p1, 'weaponHitRejected');
            p1.emit('weaponHit', payload);
            expect(await rejected).toEqual({ reason });
        }
        expect(damageEvents).toHaveLength(0);

        // Attacker fires 4 consecutive hits at Defender with >110ms intervals
        for (let i = 1; i <= 4; i += 1) {
            await sleep(140);
            p1.emit('weaponHit', {
                targetId: p2.id,
                originX: 9,
                originZ: 9
            });
            await sleep(50);
        }

        expect(damageEvents).toHaveLength(4);
        expect(damageEvents.map((event) => event.remainingHp)).toEqual([3, 2, 1, 0]);
        expect(damageEvents[0]).toMatchObject({ attackerId: p1.id, targetId: p2.id, damage: 1, isFatal: false });
        expect(damageEvents[1]).toMatchObject({ attackerId: p1.id, targetId: p2.id, damage: 1, isFatal: false });
        expect(damageEvents[2]).toMatchObject({ attackerId: p1.id, targetId: p2.id, damage: 1, isFatal: false });
        // The 4th hit MUST be the only fatal hit!
        expect(damageEvents[3]).toMatchObject({ attackerId: p1.id, targetId: p2.id, damage: 1, isFatal: true });

        // A 5th hit against the already dead target is dropped
        await sleep(140);
        const deadTarget = waitForEvent(p1, 'weaponHitRejected');
        p1.emit('weaponHit', {
            targetId: p2.id,
            originX: 9,
            originZ: 9
        });
        expect(await deadTarget).toEqual({ reason: 'target_dead' });
        await sleep(50);
        expect(damageEvents).toHaveLength(4);

        // Legacy victim-reported hits must not resurrect a dead attacker's damage.
        const deadAttacker = waitForEvent(p1, 'weaponHitRejected');
        p1.emit('weaponHit', { attackerId: p2.id, originX: 9, originZ: 9 });
        expect(await deadAttacker).toEqual({ reason: 'attacker_dead' });
        expect(damageEvents).toHaveLength(4);
    }, 10000);

    it('bounds diagnostic replies and does not echo untrusted hit payloads', async () => {
        ({ httpServer, url } = await startTestServer());
        const reporter = await connectClient(url);
        sockets.push(reporter);
        const replies = [];
        reporter.on('weaponHitRejected', (reply) => replies.push(reply));
        for (let i = 0; i < 30; i += 1) reporter.emit('weaponHit', { secret: 'never echo this' });
        await sleep(100);
        expect(replies).toHaveLength(5);
        expect(replies.every((reply) => JSON.stringify(reply) === '{"reason":"not_pvp"}')).toBe(true);
    });
});
