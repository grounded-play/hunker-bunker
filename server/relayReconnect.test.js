import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import http from 'node:http';
import { io as ioClient } from 'socket.io-client';
import { attachRelay } from './relay.js';

// Regression test for the reconnect PvP-mode-reset gap
// (docs/sprint24-multiplayer-runtime-2026-08-19.md, "Known gaps" #6): a
// mid-match reconnect gets a brand-new socket.id and therefore a brand-new
// server-side player object, whose `mode` defaults back to 'coop'. Every
// subsequent weaponHit for that player was then silently rejected by the
// `mode !== 'pvp'` guard, with nothing surfaced to the client. Fixed by
// tracking each room's active match mode (relay.js's `roomModes` map) and
// restoring it on joinRoom, not just on matchDeploy.

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

// playerReady is broadcast room-wide, so a single socket sees one
// playerReadyChanged per player who readies up, in whatever order those
// broadcasts actually arrive -- wait until `count` distinct ready=true ids
// have been seen rather than racing on the first event.
function waitForReadyCount(socket, count, timeoutMs = 1500) {
    return new Promise((resolve) => {
        const seen = new Set();
        const timer = setTimeout(() => {
            socket.off('playerReadyChanged', onChange);
            resolve(false);
        }, timeoutMs);
        function onChange({ id, ready }) {
            if (ready) seen.add(id);
            if (seen.size >= count) {
                clearTimeout(timer);
                socket.off('playerReadyChanged', onChange);
                resolve(true);
            }
        }
        socket.on('playerReadyChanged', onChange);
    });
}

describe('Server Relay: PvP mode survives a mid-match reconnect', () => {
    let httpServer;
    let url;
    let sockets;

    beforeEach(() => {
        // Force the dev-fallback auth path regardless of ambient env state,
        // since these test sockets connect with no real Steam session token.
        delete process.env.HB_STEAM_PUBLISHER_KEY;
        delete process.env.HB_ALLOW_DEV_STEAM_AUTH;
        process.env.NODE_ENV = 'test';
        sockets = [];
    });

    afterEach(() => {
        for (const socket of sockets) socket.disconnect();
        httpServer?.close();
    });

    it("restores a reconnecting player's pvp mode from the room's active match so weaponHit is honored, not silently dropped", async () => {
        ({ httpServer, url } = await startTestServer());
        const roomCode = 'RECONNECT-TEST';

        const clientA = await connectClient(url); // host / attacker, stays connected
        const clientB = await connectClient(url); // victim, will simulate a reconnect
        sockets.push(clientA, clientB);

        clientA.emit('joinRoom', { roomCode, callsign: 'HOST', opClass: 'TANK' });
        await waitForEvent(clientA, 'currentPlayers');

        clientB.emit('joinRoom', { roomCode, callsign: 'GUEST', opClass: 'SCOUT' });
        await waitForEvent(clientB, 'currentPlayers');

        // Ready-up gate: matchDeploy is rejected unless every player in the
        // room has readied up first (see server/relay.js's playerReady /
        // matchDeploy handlers).
        const bothReady = waitForReadyCount(clientA, 2);
        clientA.emit('playerReady', { ready: true });
        clientB.emit('playerReady', { ready: true });
        expect(await bothReady).toBe(true);

        // Host deploys a PvP match -- server runs the synchronized countdown,
        // then arms mode='pvp' for both players once it elapses.
        const matchStartedA = waitForEvent(clientA, 'matchStarted', 5000);
        const matchStartedB = waitForEvent(clientB, 'matchStarted', 5000);
        clientA.emit('matchDeploy', { mode: 'pvp', seed: 'test-seed', crashPlan: null });
        const [startedA, startedB] = await Promise.all([matchStartedA, matchStartedB]);
        expect(startedA?.mode).toBe('pvp');
        expect(startedB?.mode).toBe('pvp');

        // Simulate B's connection dying and reconnecting mid-match. A real
        // reconnect hands the server a brand-new socket.id (and therefore a
        // brand-new player object) -- a fresh connection here reproduces
        // that exactly.
        clientB.disconnect();
        const clientB2 = await connectClient(url);
        sockets.push(clientB2);
        clientB2.emit('joinRoom', { roomCode, callsign: 'GUEST', opClass: 'SCOUT' });
        await waitForEvent(clientB2, 'currentPlayers');

        // B2 (the reconnected victim) reports being hit by A. A never moved
        // from its default spawn (x:9, z:9), so aiming the claimed origin
        // there passes the server's range check trivially.
        const damagedOnA = waitForEvent(clientA, 'playerDamaged');
        clientB2.emit('weaponHit', { attackerId: clientA.id, originX: 9, originZ: 9 });
        const damagedEvent = await damagedOnA;

        expect(damagedEvent).not.toBeNull();
        expect(damagedEvent.targetId).toBe(clientB2.id);
        expect(damagedEvent.attackerId).toBe(clientA.id);
        expect(damagedEvent.damage).toBe(10);
    });

    it('still defaults a genuinely fresh join (no prior matchDeploy in that room) to coop, not stale pvp state', async () => {
        ({ httpServer, url } = await startTestServer());
        const roomCode = 'FRESH-ROOM-TEST';

        const clientA = await connectClient(url);
        sockets.push(clientA);
        clientA.emit('joinRoom', { roomCode, callsign: 'HOST', opClass: 'TANK' });
        await waitForEvent(clientA, 'currentPlayers');

        // No matchDeploy has happened in this room -- a weaponHit here must
        // still be rejected (mode stays 'coop'), proving the roomModes
        // lookup doesn't leak pvp state into unrelated/fresh rooms.
        const damagedOnA = waitForEvent(clientA, 'playerDamaged', 400);
        clientA.emit('weaponHit', { attackerId: clientA.id, originX: 9, originZ: 9 });
        const damagedEvent = await damagedOnA;

        expect(damagedEvent).toBeNull();
    });
});
