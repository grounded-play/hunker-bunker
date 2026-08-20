import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import http from 'node:http';
import { io as ioClient } from 'socket.io-client';
import { attachRelay } from './relay.js';

// docs/multiplayer-flow-and-lobby-bugs-2026-08-20.md Phase 2: host-set
// private lobby password. The relay only ever sees/stores a client-hashed
// value (src/steamLobbyClient.js's hashPassword, SHA-256 hex) -- these
// tests exercise the server-side gate directly with plain test strings
// standing in for real hashes, since the relay treats passwordHash as an
// opaque string and never hashes or compares plaintext itself.

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

describe('Server Relay: private lobby password gate', () => {
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

    it('lets the host set a room password on first join, with no password required for that host itself', async () => {
        ({ httpServer, url } = await startTestServer());
        const roomCode = 'PW-GATE-HOST-TEST';
        const host = await connectClient(url);
        sockets.push(host);

        host.emit('joinRoom', { roomCode, callsign: 'HOST', opClass: 'TANK', passwordHash: 'hash-abc' });
        const currentPlayers = await waitForEvent(host, 'currentPlayers');

        expect(currentPlayers).not.toBeNull();
        expect(Object.values(currentPlayers)[0].isHost).toBe(true);
    });

    it('rejects a guest joinRoom with no password when the room requires one', async () => {
        ({ httpServer, url } = await startTestServer());
        const roomCode = 'PW-GATE-REJECT-TEST';
        const host = await connectClient(url);
        const guest = await connectClient(url);
        sockets.push(host, guest);

        host.emit('joinRoom', { roomCode, callsign: 'HOST', opClass: 'TANK', passwordHash: 'correct-hash' });
        await waitForEvent(host, 'currentPlayers');

        const rejected = waitForEvent(guest, 'joinRejected');
        const currentPlayers = waitForEvent(guest, 'currentPlayers', 500);
        guest.emit('joinRoom', { roomCode, callsign: 'GUEST', opClass: 'SCOUT' });

        expect(await rejected).toEqual({ reason: 'incorrect_password' });
        expect(await currentPlayers).toBeNull();
    });

    it('rejects a guest joinRoom with a mismatched password hash', async () => {
        ({ httpServer, url } = await startTestServer());
        const roomCode = 'PW-GATE-MISMATCH-TEST';
        const host = await connectClient(url);
        const guest = await connectClient(url);
        sockets.push(host, guest);

        host.emit('joinRoom', { roomCode, callsign: 'HOST', opClass: 'TANK', passwordHash: 'correct-hash' });
        await waitForEvent(host, 'currentPlayers');

        const rejected = waitForEvent(guest, 'joinRejected');
        guest.emit('joinRoom', { roomCode, callsign: 'GUEST', opClass: 'SCOUT', passwordHash: 'wrong-hash' });

        expect(await rejected).toEqual({ reason: 'incorrect_password' });
    });

    it('admits a guest joinRoom with the matching password hash', async () => {
        ({ httpServer, url } = await startTestServer());
        const roomCode = 'PW-GATE-MATCH-TEST';
        const host = await connectClient(url);
        const guest = await connectClient(url);
        sockets.push(host, guest);

        host.emit('joinRoom', { roomCode, callsign: 'HOST', opClass: 'TANK', passwordHash: 'correct-hash' });
        await waitForEvent(host, 'currentPlayers');

        const currentPlayers = waitForEvent(guest, 'currentPlayers');
        const rejected = waitForEvent(guest, 'joinRejected', 500);
        guest.emit('joinRoom', { roomCode, callsign: 'GUEST', opClass: 'SCOUT', passwordHash: 'correct-hash' });

        expect(await currentPlayers).not.toBeNull();
        expect(await rejected).toBeNull();
    });

    it('does not gate a room that was created with no password at all', async () => {
        ({ httpServer, url } = await startTestServer());
        const roomCode = 'PW-GATE-NONE-TEST';
        const host = await connectClient(url);
        const guest = await connectClient(url);
        sockets.push(host, guest);

        host.emit('joinRoom', { roomCode, callsign: 'HOST', opClass: 'TANK' });
        await waitForEvent(host, 'currentPlayers');

        const currentPlayers = waitForEvent(guest, 'currentPlayers');
        const rejected = waitForEvent(guest, 'joinRejected', 500);
        guest.emit('joinRoom', { roomCode, callsign: 'GUEST', opClass: 'SCOUT' });

        expect(await currentPlayers).not.toBeNull();
        expect(await rejected).toBeNull();
    });
});
