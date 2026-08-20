import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import http from 'node:http';
import { io as ioClient } from 'socket.io-client';
import { attachRelay } from './relay.js';

// docs/multiplayer-flow-and-lobby-bugs-2026-08-20.md Phase 3: sync each
// player's equipped-weapon/charm summary onto the roster alongside opClass,
// so Phase 4's squad-composition cutscene has something real to read.
// Display-only -- no gameplay logic anywhere reads this field.

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

describe('Server Relay: per-player loadout sync', () => {
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

    it('broadcasts a joining player\'s loadout summary to the rest of the room via newPlayer', async () => {
        ({ httpServer, url } = await startTestServer());
        const roomCode = 'LOADOUT-SYNC-TEST';
        const host = await connectClient(url);
        const guest = await connectClient(url);
        sockets.push(host, guest);

        host.emit('joinRoom', { roomCode, callsign: 'HOST', opClass: 'TANK', loadout: { weapon: 'RAILGUN MK.II', hasCharm: true } });
        await waitForEvent(host, 'currentPlayers');

        const newPlayerEvent = waitForEvent(host, 'newPlayer');
        guest.emit('joinRoom', { roomCode, callsign: 'GUEST', opClass: 'SCOUT', loadout: { weapon: 'SPORE LANCE', hasCharm: false } });

        const payload = await newPlayerEvent;
        expect(payload.loadout).toEqual({ weapon: 'SPORE LANCE', hasCharm: false });
    });

    it('includes each player\'s loadout in currentPlayers for a joining socket', async () => {
        ({ httpServer, url } = await startTestServer());
        const roomCode = 'LOADOUT-SYNC-CURRENT-TEST';
        const host = await connectClient(url);
        const guest = await connectClient(url);
        sockets.push(host, guest);

        host.emit('joinRoom', { roomCode, callsign: 'HOST', opClass: 'TANK', loadout: { weapon: 'RAILGUN MK.II', hasCharm: true } });
        await waitForEvent(host, 'currentPlayers');

        const currentPlayersPromise = waitForEvent(guest, 'currentPlayers');
        guest.emit('joinRoom', { roomCode, callsign: 'GUEST', opClass: 'SCOUT' });
        const currentPlayers = await currentPlayersPromise;

        const hostEntry = Object.values(currentPlayers).find((p) => p.callsign === 'HOST');
        expect(hostEntry.loadout).toEqual({ weapon: 'RAILGUN MK.II', hasCharm: true });
    });

    it('defaults to a null loadout when none is supplied, rather than throwing', async () => {
        ({ httpServer, url } = await startTestServer());
        const roomCode = 'LOADOUT-SYNC-NONE-TEST';
        const host = await connectClient(url);
        sockets.push(host);

        const currentPlayers = waitForEvent(host, 'currentPlayers');
        host.emit('joinRoom', { roomCode, callsign: 'HOST', opClass: 'TANK' });

        const result = await currentPlayers;
        expect(Object.values(result)[0].loadout).toBeNull();
    });

    it('sanitizes an oversized or malformed loadout payload instead of trusting client input', async () => {
        ({ httpServer, url } = await startTestServer());
        const roomCode = 'LOADOUT-SYNC-SANITIZE-TEST';
        const host = await connectClient(url);
        sockets.push(host);

        const currentPlayers = waitForEvent(host, 'currentPlayers');
        host.emit('joinRoom', {
            roomCode,
            callsign: 'HOST',
            opClass: 'TANK',
            loadout: { weapon: 'X'.repeat(500), hasCharm: 'not-a-boolean', extraField: { nested: true } }
        });

        const result = await currentPlayers;
        const entry = Object.values(result)[0];
        expect(entry.loadout.weapon.length).toBeLessThanOrEqual(40);
        expect(typeof entry.loadout.hasCharm).toBe('boolean');
        expect(entry.loadout.extraField).toBeUndefined();
    });

    it('does not wipe a previously-synced loadout on a reconnect that sends no loadout data', async () => {
        ({ httpServer, url } = await startTestServer());
        const roomCode = 'LOADOUT-SYNC-RECONNECT-TEST';
        const host = await connectClient(url);
        sockets.push(host);

        host.emit('joinRoom', { roomCode, callsign: 'HOST', opClass: 'TANK', loadout: { weapon: 'RAILGUN MK.II', hasCharm: true } });
        await waitForEvent(host, 'currentPlayers');

        // Same socket rejoining (e.g. a mode switch) without resending loadout.
        const currentPlayers = waitForEvent(host, 'currentPlayers');
        host.emit('joinRoom', { roomCode, callsign: 'HOST', opClass: 'TANK' });

        const result = await currentPlayers;
        expect(Object.values(result)[0].loadout).toEqual({ weapon: 'RAILGUN MK.II', hasCharm: true });
    });
});
