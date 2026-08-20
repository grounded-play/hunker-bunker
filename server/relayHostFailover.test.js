import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import http from 'node:http';
import { io as ioClient } from 'socket.io-client';
import { attachRelay } from './relay.js';

// Sprint 26 goal item 5 ("reliable reconnect and match continuity") + item 4
// ("harden shared-state authority"): relayHostReassignment.test.js covers a
// disconnected host reclaiming its slot on RECONNECT, and a brand-new
// joinRoom promoting someone once nobody holds host. Neither covers the gap
// in between: if the host disconnects mid-match and every OTHER player just
// stays connected (the common case -- a co-op squad doesn't have a random
// newcomer show up mid-run), the room was left permanently hostless until
// either the original host reconnected or a new player joined. Since
// enemyHitReport is only ever routed to the room's current host (see
// server/relay.js's handler and its ENEMY_HIT_REPORT_NO_HOST log line),
// that meant a host drop froze co-op combat resolution for everyone else in
// the room for the duration of the outage, however long it lasted. Fixed by
// promoting a remaining connected player immediately on disconnect,
// broadcast via a new 'hostChanged' event, without touching roomHostKeys --
// the original host can still reclaim its durable slot on reconnect exactly
// as before.

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

describe('Server Relay: immediate host failover on mid-match disconnect', () => {
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

    it('promotes a remaining connected player to host the instant the host disconnects, with no newcomer required', async () => {
        ({ httpServer, url } = await startTestServer());
        const roomCode = 'HOST-FAILOVER-TEST';

        const host = await connectClient(url);
        sockets.push(host);
        host.emit('joinRoom', { roomCode, callsign: 'HOST', opClass: 'TANK', profileId: 'op-host-id' });
        await waitForEvent(host, 'currentPlayers');

        const guest = await connectClient(url);
        sockets.push(guest);
        guest.emit('joinRoom', { roomCode, callsign: 'GUEST', opClass: 'SCOUT', profileId: 'op-guest-id' });
        await waitForEvent(guest, 'currentPlayers');

        const hostChangedPromise = waitForEvent(guest, 'hostChanged');
        host.disconnect();
        const hostChanged = await hostChangedPromise;

        expect(hostChanged).not.toBeNull();
        expect(hostChanged.hostId).toBe(guest.id);
    });

    it('does not touch the durable host record, so the original host still reclaims it on reconnect', async () => {
        ({ httpServer, url } = await startTestServer());
        const roomCode = 'HOST-FAILOVER-RECLAIM-TEST';
        const hostProfileId = 'op-durable-host-id';

        const hostA = await connectClient(url);
        sockets.push(hostA);
        hostA.emit('joinRoom', { roomCode, callsign: 'HOST', opClass: 'TANK', profileId: hostProfileId });
        await waitForEvent(hostA, 'currentPlayers');

        const guest = await connectClient(url);
        sockets.push(guest);
        guest.emit('joinRoom', { roomCode, callsign: 'GUEST', opClass: 'SCOUT', profileId: 'op-guest-id' });
        await waitForEvent(guest, 'currentPlayers');

        const hostChangedPromise = waitForEvent(guest, 'hostChanged');
        hostA.disconnect();
        await hostChangedPromise; // guest is now the interim host

        const hostA2 = await connectClient(url);
        sockets.push(hostA2);
        hostA2.emit('joinRoom', { roomCode, callsign: 'HOST', opClass: 'TANK', profileId: hostProfileId });
        const rosterA2 = await waitForEvent(hostA2, 'currentPlayers');

        expect(rosterA2[hostA2.id]?.isHost).toBe(true);
        expect(rosterA2[guest.id]?.isHost).toBe(false);
    });

    it('does not emit hostChanged when the disconnecting player was not host', async () => {
        ({ httpServer, url } = await startTestServer());
        const roomCode = 'HOST-FAILOVER-NONHOST-TEST';

        const host = await connectClient(url);
        sockets.push(host);
        host.emit('joinRoom', { roomCode, callsign: 'HOST', opClass: 'TANK', profileId: 'op-host-id' });
        await waitForEvent(host, 'currentPlayers');

        const guest = await connectClient(url);
        sockets.push(guest);
        guest.emit('joinRoom', { roomCode, callsign: 'GUEST', opClass: 'SCOUT', profileId: 'op-guest-id' });
        await waitForEvent(guest, 'currentPlayers');

        const hostChangedPromise = waitForEvent(host, 'hostChanged', 500);
        guest.disconnect();
        const hostChanged = await hostChangedPromise;

        expect(hostChanged).toBeNull();
    });
});
