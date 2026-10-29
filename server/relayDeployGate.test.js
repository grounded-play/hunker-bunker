import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import http from 'node:http';
import { io as ioClient } from 'socket.io-client';
import { attachRelay, RELAY_FEATURES } from './relay.js';

// Owner ask 2026-10-28: in multiplayer, hold everyone at the doors until
// x / x have loaded, then open them together.
function startTestServer() {
    const httpServer = http.createServer();
    attachRelay(httpServer);
    return new Promise((resolve) => {
        httpServer.listen(0, () => resolve({ httpServer, url: `http://localhost:${httpServer.address().port}` }));
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

async function deployedSquad(url, roomCode, mode = 'coop') {
    const host = await connectClient(url);
    const guest = await connectClient(url);
    host.emit('joinRoom', { roomCode, callsign: 'HOST', opClass: 'ENGINEER' });
    await waitForEvent(host, 'currentPlayers');
    guest.emit('joinRoom', { roomCode, callsign: 'GUEST', opClass: 'TANK' });
    await waitForEvent(guest, 'currentPlayers');
    host.emit('playerReady', { ready: true });
    guest.emit('playerReady', { ready: true });
    await waitForEvent(host, 'playerReadyChanged');
    await waitForEvent(host, 'playerReadyChanged');
    const started = [waitForEvent(host, 'matchStarted', 6000), waitForEvent(guest, 'matchStarted', 6000)];
    host.emit('matchDeploy', { mode, seed: 'gate-test', pvpReadinessVersion: 1 });
    const [hostStart, guestStart] = await Promise.all(started);
    return { host, guest, hostStart, guestStart };
}

describe('Server Relay: squad deploy gate', () => {
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

    it('opens the doors only once every deployed operator has loaded', async () => {
        ({ httpServer, url } = await startTestServer());
        const { host, guest, hostStart, guestStart } = await deployedSquad(url, 'GATE-ALL-LOADED');
        sockets.push(host, guest);
        expect(RELAY_FEATURES).toContain('deployGate');
        expect(hostStart.deployGateId).toBeTruthy();
        expect(guestStart.deployGateId).toBe(hostStart.deployGateId);
        const gateId = hostStart.deployGateId;

        const opened = [];
        host.on('deployGateOpen', (data) => opened.push(['host', data]));
        guest.on('deployGateOpen', (data) => opened.push(['guest', data]));
        const progress = waitForEvent(guest, 'deployGateProgress');
        host.emit('deployLoaded', { gateId });
        expect(await progress).toMatchObject({ gateId, loaded: 1, total: 2 });
        expect(opened).toHaveLength(0);

        const hostOpen = waitForEvent(host, 'deployGateOpen');
        guest.emit('deployLoaded', { gateId });
        expect(await hostOpen).toMatchObject({ gateId, reason: 'all_loaded', loaded: 2, total: 2 });
    });

    it('does not let an operator who left hold the squad', async () => {
        ({ httpServer, url } = await startTestServer());
        const { host, guest, hostStart } = await deployedSquad(url, 'GATE-LEAVER');
        sockets.push(host);
        const gateId = hostStart.deployGateId;
        host.emit('deployLoaded', { gateId });
        await waitForEvent(host, 'deployGateProgress');
        const hostOpen = waitForEvent(host, 'deployGateOpen');
        guest.disconnect();
        expect(await hostOpen).toMatchObject({ gateId, reason: 'all_loaded', loaded: 1, total: 1 });
    });

    it('tells a late or stale report that nobody is waiting', async () => {
        ({ httpServer, url } = await startTestServer());
        const { host, guest } = await deployedSquad(url, 'GATE-STALE');
        sockets.push(host, guest);
        const reply = waitForEvent(host, 'deployGateOpen');
        host.emit('deployLoaded', { gateId: 'not-this-gate' });
        expect(await reply).toMatchObject({ reason: 'not_waiting' });
    });
});
