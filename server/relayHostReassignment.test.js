import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import http from 'node:http';
import { io as ioClient } from 'socket.io-client';
import { attachRelay } from './relay.js';

// Regression tests for the host-reassignment durability gap flagged in
// docs/sprint24-multiplayer-runtime-2026-08-19.md's known gap #4: host
// assignment used to be pure "first socket to join an empty room," with no
// resilience against reconnection -- a reconnecting host (a brand-new
// socket.id) could either steal an existing host's slot or land as
// non-host in a room whose real host was mid-reconnect. Fixed by tracking
// each room's host via a stable identity key (steamId64 when real,
// otherwise the client's persisted profileId -- see server/relay.js's
// roomHostKeys / getStableClientKey).

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

describe('Server Relay: host-reassignment durability', () => {
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

    it('a reconnecting host (new socket.id, same profileId) reclaims host status even from a player promoted in the interim', async () => {
        ({ httpServer, url } = await startTestServer());
        const roomCode = 'HOST-RECLAIM-TEST';
        const hostProfileId = 'op-stable-host-id';

        const hostA = await connectClient(url);
        sockets.push(hostA);
        hostA.emit('joinRoom', { roomCode, callsign: 'HOST', opClass: 'TANK', profileId: hostProfileId });
        const rosterA = await waitForEvent(hostA, 'currentPlayers');
        expect(rosterA[hostA.id]?.isHost).toBe(true);

        // Host disconnects for good (from the server's perspective -- it
        // has no way yet to know this socket will reconnect).
        hostA.disconnect();

        // A guest joins while nobody currently holds host -- correctly
        // promoted, exercising the *other* branch (the "no host present"
        // case), not the reclaim path this test is actually about.
        const guest = await connectClient(url);
        sockets.push(guest);
        guest.emit('joinRoom', { roomCode, callsign: 'GUEST', opClass: 'SCOUT', profileId: 'op-guest-id' });
        const rosterGuest = await waitForEvent(guest, 'currentPlayers');
        expect(rosterGuest[guest.id]?.isHost).toBe(true);

        // The original host reconnects: brand-new socket.id, same durable
        // profileId. It should reclaim host status even though guest
        // currently holds it.
        const hostA2 = await connectClient(url);
        sockets.push(hostA2);
        hostA2.emit('joinRoom', { roomCode, callsign: 'HOST', opClass: 'TANK', profileId: hostProfileId });
        const rosterA2 = await waitForEvent(hostA2, 'currentPlayers');

        expect(rosterA2[hostA2.id]?.isHost).toBe(true);
        // The single-host invariant must hold: guest is demoted, not just
        // "also still host" alongside the reclaiming original.
        expect(rosterA2[guest.id]?.isHost).toBe(false);
    });

    it('promotes another player to host when the recorded host never reconnects and the room fully emptied out (no matching profileId shows up)', async () => {
        ({ httpServer, url } = await startTestServer());
        const roomCode = 'HOST-PROMOTE-TEST';

        // Solo host, deliberately -- with server/relayHostFailover.test.js's
        // immediate-failover fix, disconnecting while ANY other player is
        // still in the room now promotes that player instantly rather than
        // leaving the room hostless, so this scenario (nobody currently
        // connected holds host at all) now requires the room to have gone
        // fully empty, not just lost its host.
        const hostA = await connectClient(url);
        sockets.push(hostA);
        hostA.emit('joinRoom', { roomCode, callsign: 'HOST', opClass: 'TANK', profileId: 'op-original-host' });
        await waitForEvent(hostA, 'currentPlayers');

        // Original host leaves for good; nobody else is in the room, so it
        // goes fully empty (rooms/roomModes deleted, roomHostKeys survives).
        hostA.disconnect();
        await new Promise((resolve) => setTimeout(resolve, 50));

        // A newcomer joins the now-empty room under a different profileId --
        // the recorded host key doesn't match and the room currently holds
        // nobody, so this joiner should be promoted rather than the room
        // staying permanently hostless.
        const newcomer = await connectClient(url);
        sockets.push(newcomer);
        newcomer.emit('joinRoom', { roomCode, callsign: 'NEWCOMER', opClass: 'ENGINEER', profileId: 'op-newcomer-id' });
        const roster = await waitForEvent(newcomer, 'currentPlayers');

        expect(roster[newcomer.id]?.isHost).toBe(true);
    });

    it('falls back to first-to-join behavior for clients with no profileId (backward compatible with older clients)', async () => {
        ({ httpServer, url } = await startTestServer());
        const roomCode = 'HOST-NO-PROFILEID-TEST';

        const hostA = await connectClient(url);
        sockets.push(hostA);
        hostA.emit('joinRoom', { roomCode, callsign: 'HOST', opClass: 'TANK' }); // no profileId field at all
        const rosterA = await waitForEvent(hostA, 'currentPlayers');
        expect(rosterA[hostA.id]?.isHost).toBe(true);

        const guest = await connectClient(url);
        sockets.push(guest);
        guest.emit('joinRoom', { roomCode, callsign: 'GUEST', opClass: 'SCOUT' });
        const rosterGuest = await waitForEvent(guest, 'currentPlayers');
        expect(rosterGuest[guest.id]?.isHost).toBe(false);
    });
});
