import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import http from 'node:http';
import { io as ioClient } from 'socket.io-client';
import { attachRelay } from './relay.js';

// Regression tests for the ready-up / host-start gate. Previously there was
// no readiness concept at all: any single socket in a room could emit
// matchDeploy and it would instantly launch the whole room for everyone,
// with no wait for other players to accept/ready and no synchronized
// countdown -- see the "loop is broken" report this fixes.

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

function waitForEvent(socket, eventName, timeoutMs = 1500) {
    return new Promise((resolve) => {
        const timer = setTimeout(() => resolve(null), timeoutMs);
        socket.once(eventName, (payload) => {
            clearTimeout(timer);
            resolve(payload);
        });
    });
}

describe('Server Relay: ready-up / host-start gate', () => {
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

    it('rejects matchDeploy when not every player in the room has readied up', async () => {
        ({ httpServer, url } = await startTestServer());
        const roomCode = 'READY-GATE-TEST';

        const clientA = await connectClient(url);
        const clientB = await connectClient(url);
        sockets.push(clientA, clientB);

        clientA.emit('joinRoom', { roomCode, callsign: 'HOST', opClass: 'TANK' });
        await waitForEvent(clientA, 'currentPlayers');
        clientB.emit('joinRoom', { roomCode, callsign: 'GUEST', opClass: 'SCOUT' });
        await waitForEvent(clientB, 'currentPlayers');

        // Only the host readies up -- B never does.
        clientA.emit('playerReady', { ready: true });
        await waitForEvent(clientA, 'playerReadyChanged');

        const rejected = waitForEvent(clientA, 'matchDeployRejected');
        const started = waitForEvent(clientA, 'matchStarted', 500);
        clientA.emit('matchDeploy', { mode: 'coop', seed: 'test-seed', crashPlan: null });

        expect(await rejected).not.toBeNull();
        expect(await started).toBeNull();
    });

    it('deploys only after every player readies up, and does so as a synchronized broadcast to the whole room', async () => {
        ({ httpServer, url } = await startTestServer());
        const roomCode = 'READY-GATE-DEPLOY-TEST';

        const clientA = await connectClient(url);
        const clientB = await connectClient(url);
        sockets.push(clientA, clientB);

        clientA.emit('joinRoom', { roomCode, callsign: 'HOST', opClass: 'TANK' });
        await waitForEvent(clientA, 'currentPlayers');
        clientB.emit('joinRoom', { roomCode, callsign: 'GUEST', opClass: 'SCOUT' });
        await waitForEvent(clientB, 'currentPlayers');

        clientA.emit('playerReady', { ready: true });
        clientB.emit('playerReady', { ready: true });
        await waitForEvent(clientA, 'playerReadyChanged');
        await waitForEvent(clientA, 'playerReadyChanged');

        const countdownA = waitForEvent(clientA, 'matchCountdown');
        const countdownB = waitForEvent(clientB, 'matchCountdown');
        const startedA = waitForEvent(clientA, 'matchStarted', 5000);
        const startedB = waitForEvent(clientB, 'matchStarted', 5000);
        clientA.emit('matchDeploy', { mode: 'coop', seed: 'test-seed', crashPlan: null });

        // Both players get the same countdown notice up front...
        expect(await countdownA).not.toBeNull();
        expect(await countdownB).not.toBeNull();
        // ...and the same matchStarted once it elapses -- host and guest
        // both transition via the identical broadcast, not the host
        // launching solo the instant it clicked deploy.
        const [sa, sb] = await Promise.all([startedA, startedB]);
        expect(sa).not.toBeNull();
        expect(sb).not.toBeNull();
        expect(sa.seed).toBe(sb.seed);
        expect(sa.timestamp).toBe(sb.timestamp);
    });

    it('cancels a pending countdown if a player un-readies before it fires', async () => {
        ({ httpServer, url } = await startTestServer());
        const roomCode = 'READY-GATE-CANCEL-TEST';

        const clientA = await connectClient(url);
        const clientB = await connectClient(url);
        sockets.push(clientA, clientB);

        clientA.emit('joinRoom', { roomCode, callsign: 'HOST', opClass: 'TANK' });
        await waitForEvent(clientA, 'currentPlayers');
        clientB.emit('joinRoom', { roomCode, callsign: 'GUEST', opClass: 'SCOUT' });
        await waitForEvent(clientB, 'currentPlayers');

        clientA.emit('playerReady', { ready: true });
        clientB.emit('playerReady', { ready: true });
        await waitForEvent(clientA, 'playerReadyChanged');
        await waitForEvent(clientA, 'playerReadyChanged');

        const cancelled = waitForEvent(clientA, 'matchCountdownCancelled');
        const started = waitForEvent(clientA, 'matchStarted', 4000);
        clientA.emit('matchDeploy', { mode: 'coop', seed: 'test-seed', crashPlan: null });
        await waitForEvent(clientA, 'matchCountdown');

        // B backs out mid-countdown.
        clientB.emit('playerReady', { ready: false });

        expect(await cancelled).not.toBeNull();
        expect(await started).toBeNull();
    }, 8000);

    it('a mid-countdown disconnect cancels the launch instead of deploying without that player', async () => {
        ({ httpServer, url } = await startTestServer());
        const roomCode = 'READY-GATE-DISCONNECT-TEST';

        const clientA = await connectClient(url);
        const clientB = await connectClient(url);
        sockets.push(clientA, clientB);

        clientA.emit('joinRoom', { roomCode, callsign: 'HOST', opClass: 'TANK' });
        await waitForEvent(clientA, 'currentPlayers');
        clientB.emit('joinRoom', { roomCode, callsign: 'GUEST', opClass: 'SCOUT' });
        await waitForEvent(clientB, 'currentPlayers');

        clientA.emit('playerReady', { ready: true });
        clientB.emit('playerReady', { ready: true });
        await waitForEvent(clientA, 'playerReadyChanged');
        await waitForEvent(clientA, 'playerReadyChanged');

        const cancelled = waitForEvent(clientA, 'matchCountdownCancelled');
        const started = waitForEvent(clientA, 'matchStarted', 4000);
        clientA.emit('matchDeploy', { mode: 'coop', seed: 'test-seed', crashPlan: null });
        await waitForEvent(clientA, 'matchCountdown');

        clientB.disconnect();

        expect(await cancelled).not.toBeNull();
        expect(await started).toBeNull();
    }, 8000);
});
