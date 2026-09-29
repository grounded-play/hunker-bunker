import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import http from 'node:http';
import { io as ioClient } from 'socket.io-client';
import { attachRelay } from './relay.js';

// A co-op session on Steam Deck + PC showed that milestone beats were entirely
// local: one player repairing the O2 generator produced no cutscene, no
// generator rise and no retaliation boss on the other client. The relay simply
// had no channel for world events. These cover the channel that fixes it, plus
// the friendly-fire shove that replaces damage between squadmates.

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
function waitForEvent(socket, eventName, timeoutMs = 1500) {
    return new Promise((resolve) => {
        const timer = setTimeout(() => resolve(null), timeoutMs);
        socket.once(eventName, (payload) => { clearTimeout(timer); resolve(payload); });
    });
}
const join = (socket, roomCode, callsign) => new Promise((resolve) => {
    socket.once('currentPlayers', resolve);
    socket.emit('joinRoom', { roomCode, callsign, opClass: 'TANK' });
});

let server; let host; let guest;
beforeEach(async () => {
    server = await startTestServer();
    host = await connectClient(server.url);
    guest = await connectClient(server.url);
    await join(host, 'WORLD1', 'HOST');
    await join(guest, 'WORLD1', 'GUEST');
});
afterEach(() => {
    host?.close(); guest?.close();
    server?.httpServer?.close();
});

describe('shared world events', () => {
    it('relays a milestone beat from one client to the rest of the room', async () => {
        const received = waitForEvent(guest, 'worldEventBroadcast');
        host.emit('worldEvent', { event: 'o2-generator-built', detail: { level: 1, bossType: 'boss_cybersnail' } });

        const payload = await received;
        expect(payload).toBeTruthy();
        expect(payload.event).toBe('o2-generator-built');
        expect(payload.detail).toEqual({ level: 1, bossType: 'boss_cybersnail' });
        expect(payload.originId).toBe(host.id);
    });

    // The originator needs the same broadcast so both clients run the beat off
    // one ordering rather than one running it locally and one over the wire.
    it('echoes the beat back to the sender for a single shared ordering', async () => {
        const echoed = waitForEvent(host, 'worldEventBroadcast');
        host.emit('worldEvent', { event: 'milestone-boss-staged', detail: {} });
        expect((await echoed)?.event).toBe('milestone-boss-staged');
    });

    it('ignores a beat with no event name', async () => {
        const received = waitForEvent(guest, 'worldEventBroadcast', 400);
        host.emit('worldEvent', { detail: { level: 1 } });
        expect(await received).toBeNull();
    });

    it('drops oversized detail rather than relaying it', async () => {
        const received = waitForEvent(guest, 'worldEventBroadcast');
        host.emit('worldEvent', { event: 'bulk', detail: { blob: 'x'.repeat(20000) } });
        const payload = await received;
        expect(payload.event).toBe('bulk');
        expect(payload.detail).toEqual({});
    });

    it('rate limits a client spamming beats', async () => {
        const seen = [];
        guest.on('worldEventBroadcast', (p) => seen.push(p));
        for (let i = 0; i < 40; i += 1) host.emit('worldEvent', { event: `spam-${i}` });
        await new Promise((r) => setTimeout(r, 500));
        expect(seen.length).toBeGreaterThan(0);
        // 20 state beats per second (raised from 8: a Tank slam breaks several walls at once).
        expect(seen.length).toBeLessThanOrEqual(20);
    });
});

describe('friendly-fire nudge', () => {
    it('relays a shove with its direction and force to the target', async () => {
        const received = waitForEvent(guest, 'playerNudged');
        host.emit('playerNudge', { targetId: guest.id, dirX: 1, dirZ: 0, force: 2 });

        const payload = await received;
        expect(payload).toBeTruthy();
        expect(payload.targetId).toBe(guest.id);
        expect(payload.attackerId).toBe(host.id);
        expect(payload.dirX).toBe(1);
        expect(payload.dirZ).toBe(0);
        expect(payload.force).toBe(2);
    });

    it('caps the force so rapid fire cannot fling a squadmate', async () => {
        const received = waitForEvent(guest, 'playerNudged');
        host.emit('playerNudge', { targetId: guest.id, dirX: 0, dirZ: 1, force: 9999 });
        expect((await received).force).toBeLessThanOrEqual(4);
    });

    it('ignores a self-nudge and a nudge with no direction', async () => {
        const selfNudge = waitForEvent(guest, 'playerNudged', 400);
        host.emit('playerNudge', { targetId: host.id, dirX: 1, dirZ: 0 });
        expect(await selfNudge).toBeNull();

        const noDir = waitForEvent(guest, 'playerNudged', 400);
        host.emit('playerNudge', { targetId: guest.id });
        expect(await noDir).toBeNull();
    });
});

describe('world event budgets', () => {
    // 2026-09-24 QA: the host streams every enemy projectile through the same
    // channel. With one shared 8/s budget a busy fight could make the relay
    // silently drop a death or a power-up drop.
    it('still relays a death after a burst of projectiles', async () => {
        const seen = [];
        guest.on('worldEventBroadcast', (payload) => seen.push(payload.event));
        for (let i = 0; i < 20; i += 1) host.emit('worldEvent', { event: 'enemy-projectile-spawned', detail: { x: i } });
        host.emit('worldEvent', { event: 'player-died', detail: { playerId: host.id, seq: 1 } });
        await new Promise((resolve) => setTimeout(resolve, 400));
        expect(seen.filter((event) => event === 'enemy-projectile-spawned')).toHaveLength(20);
        expect(seen).toContain('player-died');
    });

    it('keeps the state budget for state events', async () => {
        const seen = [];
        guest.on('worldEventBroadcast', (payload) => seen.push(payload.event));
        for (let i = 0; i < 30; i += 1) host.emit('worldEvent', { event: 'wall-destroyed', detail: { worldX: i, worldZ: 0 } });
        await new Promise((resolve) => setTimeout(resolve, 400));
        expect(seen).toHaveLength(20);
    });
});
