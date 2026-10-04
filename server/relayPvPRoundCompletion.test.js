import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import http from 'node:http';
import { io as ioClient } from 'socket.io-client';
import { attachRelay } from './relay.js';

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

describe('Server Relay: PvP Round Completion and Synchronized Rematch', () => {
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

    it('broadcasts pvpRoundCompleted on fatal combat hit and synchronizes rematch', async () => {
        ({ httpServer, url } = await startTestServer());
        const roomCode = 'PVP-ROUND-SYNC-TEST';

        const p1 = await connectClient(url);
        const p2 = await connectClient(url);
        sockets.push(p1, p2);

        p1.emit('joinRoom', { roomCode, callsign: 'ATTACKER', opClass: 'SCOUT' });
        await waitForEvent(p1, 'currentPlayers');
        p2.emit('joinRoom', { roomCode, callsign: 'DEFENDER', opClass: 'TANK' });
        await waitForEvent(p2, 'currentPlayers');

        p1.emit('playerReady', { ready: true });
        p2.emit('playerReady', { ready: true });
        await waitForEvent(p1, 'playerReadyChanged');
        await waitForEvent(p1, 'playerReadyChanged');

        const matchStarted1 = waitForEvent(p1, 'matchStarted', 5000);
        const matchStarted2 = waitForEvent(p2, 'matchStarted', 5000);
        p1.emit('matchDeploy', { mode: 'pvp', seed: 'round-1-seed' });
        await Promise.all([matchStarted1, matchStarted2]);

        const roundCompletedP1 = waitForEvent(p1, 'pvpRoundCompleted', 5000);
        const roundCompletedP2 = waitForEvent(p2, 'pvpRoundCompleted', 5000);

        // 4 hits to deliver fatal damage
        for (let i = 1; i <= 4; i += 1) {
            await sleep(140);
            p1.emit('weaponHit', {
                targetId: p2.id,
                originX: 9,
                originZ: 9
            });
            await sleep(50);
        }

        const [outcome1, outcome2] = await Promise.all([roundCompletedP1, roundCompletedP2]);
        expect(outcome1).toMatchObject({
            winnerId: p1.id,
            loserId: p2.id,
            reason: 'combat'
        });
        expect(outcome2).toMatchObject({
            winnerId: p1.id,
            loserId: p2.id,
            reason: 'combat'
        });

        // Rematch voting: P1 votes rematch first
        const p1Progress = waitForEvent(p1, 'pvpRematchVoteProgress');
        p1.emit('pvpRematchVote');
        expect(await p1Progress).toEqual({ votedCount: 1, requiredCount: 2 });

        // P2 votes rematch second: triggers synchronized matchStarted
        const rematchStartedP1 = waitForEvent(p1, 'matchStarted');
        const rematchStartedP2 = waitForEvent(p2, 'matchStarted');
        p2.emit('pvpRematchVote');

        const [rematch1, rematch2] = await Promise.all([rematchStartedP1, rematchStartedP2]);
        expect(rematch1?.mode).toBe('pvp');
        expect(rematch2?.mode).toBe('pvp');
        expect(rematch1?.roundId).toBeDefined();
        expect(rematch1?.roundId).toBe(rematch2?.roundId);
    }, 12000);

    it('broadcasts pvpRoundCompleted on environmental death in PvP mode', async () => {
        ({ httpServer, url } = await startTestServer());
        const roomCode = 'PVP-ENV-DEATH-TEST';

        const p1 = await connectClient(url);
        const p2 = await connectClient(url);
        sockets.push(p1, p2);

        p1.emit('joinRoom', { roomCode, callsign: 'SURVIVOR', opClass: 'SCOUT' });
        await waitForEvent(p1, 'currentPlayers');
        p2.emit('joinRoom', { roomCode, callsign: 'VICTIM', opClass: 'TANK' });
        await waitForEvent(p2, 'currentPlayers');

        p1.emit('playerReady', { ready: true });
        p2.emit('playerReady', { ready: true });
        await waitForEvent(p1, 'playerReadyChanged');
        await waitForEvent(p1, 'playerReadyChanged');

        const matchStartedP1 = waitForEvent(p1, 'matchStarted', 5000);
        const matchStartedP2 = waitForEvent(p2, 'matchStarted', 5000);
        p1.emit('matchDeploy', { mode: 'pvp', seed: 'env-seed' });
        await Promise.all([matchStartedP1, matchStartedP2]);

        const roundCompletedP1 = waitForEvent(p1, 'pvpRoundCompleted', 5000);
        const roundCompletedP2 = waitForEvent(p2, 'pvpRoundCompleted', 5000);

        // P2 dies to poison hazard puddle
        p2.emit('worldEvent', {
            event: 'player-died',
            detail: { reason: 'poison', x: 12, z: 15 }
        });

        const [outcome1, outcome2] = await Promise.all([roundCompletedP1, roundCompletedP2]);
        expect(outcome1).toMatchObject({
            winnerId: p1.id,
            loserId: p2.id,
            reason: 'poison'
        });
        expect(outcome2).toMatchObject({
            winnerId: p1.id,
            loserId: p2.id,
            reason: 'poison'
        });
    }, 10000);
});
