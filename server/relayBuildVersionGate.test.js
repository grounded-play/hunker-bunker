import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import http from 'node:http';
import { io as ioClient } from 'socket.io-client';
import { attachRelay } from './relay.js';

// QA 2026-09-30: a 2.4.9 Deck joined a 2.4.13 host and the relay let it.
// 208 commits of co-op protocol apart, the two clients disagreed about who
// was down and ended each other's runs. A room is locked to its host's build.

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

describe('Server Relay: build version gate', () => {
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

    async function hostAndGuest(roomCode, hostBuild, guestBuild) {
        ({ httpServer, url } = await startTestServer());
        const host = await connectClient(url);
        const guest = await connectClient(url);
        sockets.push(host, guest);
        host.emit('joinRoom', { roomCode, callsign: 'HOST', opClass: 'TANK', buildVersion: hostBuild });
        await waitForEvent(host, 'currentPlayers');
        const rejected = waitForEvent(guest, 'joinRejected');
        const joined = waitForEvent(guest, 'currentPlayers');
        guest.emit('joinRoom', { roomCode, callsign: 'GUEST', opClass: 'SCOUT', buildVersion: guestBuild });
        return { rejected: await rejected, joined: await joined };
    }

    it('lets a guest on the same build join', async () => {
        const { rejected, joined } = await hostAndGuest('BUILD-SAME', '2.4.13-beta', '2.4.13-beta');
        expect(rejected).toBeNull();
        expect(joined).not.toBeNull();
    });

    it('rejects a guest on a different build and names both builds', async () => {
        const { rejected, joined } = await hostAndGuest('BUILD-SKEW', '2.4.13-beta', '2.4.9-beta');
        expect(rejected).toEqual({ reason: 'build_mismatch', hostBuild: '2.4.13-beta', clientBuild: '2.4.9-beta' });
        expect(joined).toBeNull();
    });

    it('rejects an old client that sends no build to a versioned host', async () => {
        const { rejected } = await hostAndGuest('BUILD-OLD-GUEST', '2.4.13-beta', undefined);
        expect(rejected?.reason).toBe('build_mismatch');
    });
});
