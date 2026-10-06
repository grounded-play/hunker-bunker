import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import http from 'node:http';
import { io as ioClient } from 'socket.io-client';
import { attachRelay } from './relay.js';

function startTestServer(options = {}) {
    const httpServer = http.createServer();
    const io = attachRelay(httpServer, options);
    return new Promise((resolve) => {
        httpServer.listen(0, () => {
            const { port } = httpServer.address();
            resolve({ httpServer, io, url: `http://localhost:${port}` });
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

function emitAck(socket, event, data, timeoutMs = 1500) {
    return new Promise((resolve) => {
        const timer = setTimeout(() => resolve({ ok: false, reason: 'timeout' }), timeoutMs);
        socket.emit(event, data, (response) => {
            clearTimeout(timer);
            resolve(response);
        });
    });
}

describe('Server Relay: room-scoped filtered chat', () => {
    let httpServer;
    let io;
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

    it('exchanges filtered messages between peers in the same room', async () => {
        ({ httpServer, io, url } = await startTestServer());
        const host = await connectClient(url);
        const guest = await connectClient(url);
        sockets.push(host, guest);

        host.emit('joinRoom', {
            roomCode: 'CHAT-1',
            isHost: true,
            callsign: 'HOST_VIPER',
            buildVersion: '2.4.13-beta'
        });
        await waitForEvent(host, 'currentPlayers');

        guest.emit('joinRoom', {
            roomCode: 'CHAT-1',
            isHost: false,
            callsign: 'GUEST_GHOST',
            buildVersion: '2.4.13-beta'
        });
        await waitForEvent(guest, 'currentPlayers');

        const messagePromise = waitForEvent(guest, 'chatMessage');
        const ack = await emitAck(host, 'sendChat', {
            text: 'Hello from host! fuck that noise',
            clientNonce: 'nonce-1'
        });

        expect(ack.ok).toBe(true);
        expect(ack.message.text).toBe('Hello from host! **** that noise');
        expect(ack.message.senderName).toBe('HOST_VIPER');

        const received = await messagePromise;
        expect(received).not.toBeNull();
        expect(received.text).toBe('Hello from host! **** that noise');
        expect(received.senderName).toBe('HOST_VIPER');
    });

    it('isolates chat messages to the room', async () => {
        ({ httpServer, io, url } = await startTestServer());
        const roomA = await connectClient(url);
        const roomB = await connectClient(url);
        sockets.push(roomA, roomB);

        roomA.emit('joinRoom', { roomCode: 'ROOM-A', isHost: true, callsign: 'A' });
        await waitForEvent(roomA, 'currentPlayers');

        roomB.emit('joinRoom', { roomCode: 'ROOM-B', isHost: true, callsign: 'B' });
        await waitForEvent(roomB, 'currentPlayers');

        let roomBReceived = false;
        roomB.on('chatMessage', () => { roomBReceived = true; });

        await emitAck(roomA, 'sendChat', { text: 'Secret message for room A', clientNonce: 'nonce-a1' });
        await new Promise((resolve) => setTimeout(resolve, 100));

        expect(roomBReceived).toBe(false);
    });

    it('enforces mute and report moderation actions', async () => {
        ({ httpServer, io, url } = await startTestServer());
        const host = await connectClient(url);
        const guest = await connectClient(url);
        sockets.push(host, guest);

        host.emit('joinRoom', { roomCode: 'CHAT-MOD', isHost: true, callsign: 'HOST' });
        await waitForEvent(host, 'currentPlayers');

        guest.emit('joinRoom', { roomCode: 'CHAT-MOD', isHost: false, callsign: 'GUEST' });
        await waitForEvent(guest, 'currentPlayers');

        const sent = await emitAck(guest, 'sendChat', { text: 'Bad behaviour message', clientNonce: 'g-1' });
        expect(sent.ok).toBe(true);

        // Host reports guest message
        const reportResult = await emitAck(host, 'chatModeration', {
            action: 'report',
            senderId: sent.message.senderId,
            messageId: sent.message.id,
            reason: 'harassment'
        });
        expect(reportResult.ok).toBe(true);
        expect(reportResult.reportId).toBeDefined();

        const reports = io.getChatReports();
        expect(reports).toHaveLength(1);
        expect(reports[0].reason).toBe('harassment');
        expect(reports[0].message.text).toBe('Bad behaviour message');

        // Host mutes guest
        const muteResult = await emitAck(host, 'chatModeration', {
            action: 'mute',
            senderId: sent.message.senderId
        });
        expect(muteResult.ok).toBe(true);
        expect(muteResult.mutedSenderIds).toContain(sent.message.senderId);

        // Guest sends another message; host does not receive it
        let hostReceivedAfterMute = false;
        host.on('chatMessage', () => { hostReceivedAfterMute = true; });

        await emitAck(guest, 'sendChat', { text: 'Can you hear me now?', clientNonce: 'g-2' });
        await new Promise((resolve) => setTimeout(resolve, 100));

        expect(hostReceivedAfterMute).toBe(false);
    });

    // Playtest 2026-10-02 (Deck host, build e8b92f83): the host's socket
    // reconnected every ~10 s while waiting alone in the lobby. Each drop left
    // the room empty for a moment, the relay wiped its chat history, and the
    // friend who joined afterwards never saw what the host had written.
    it('keeps room history through a solo host reconnect, for a peer who joins afterwards', async () => {
        ({ httpServer, io, url } = await startTestServer());
        const host = await connectClient(url);
        sockets.push(host);
        host.emit('joinRoom', { roomCode: 'CHAT-RECONNECT', callsign: 'HOST_VIPER', buildVersion: '2.4.13-beta' });
        await waitForEvent(host, 'chatHistory');
        const sent = await emitAck(host, 'sendChat', { text: 'Need help!', clientNonce: 'n-1' });
        expect(sent.ok).toBe(true);

        host.disconnect();
        await new Promise((resolve) => setTimeout(resolve, 50));
        const rejoined = await connectClient(url);
        sockets.push(rejoined);
        rejoined.emit('joinRoom', { roomCode: 'CHAT-RECONNECT', callsign: 'HOST_VIPER', buildVersion: '2.4.13-beta' });
        const hostHistory = await waitForEvent(rejoined, 'chatHistory');
        expect(hostHistory.messages.map((m) => m.text)).toEqual(['Need help!']);

        const guest = await connectClient(url);
        sockets.push(guest);
        guest.emit('joinRoom', { roomCode: 'CHAT-RECONNECT', callsign: 'GUEST_GHOST', buildVersion: '2.4.13-beta' });
        const guestHistory = await waitForEvent(guest, 'chatHistory');
        expect(guestHistory.messages.map((m) => m.text)).toEqual(['Need help!']);
    });

    it('clears history once a room has stayed empty past the grace period', async () => {
        ({ httpServer, io, url } = await startTestServer({ chatRoomGraceMs: 40 }));
        const host = await connectClient(url);
        sockets.push(host);
        host.emit('joinRoom', { roomCode: 'CHAT-ABANDONED', callsign: 'HOST_VIPER', buildVersion: '2.4.13-beta' });
        await waitForEvent(host, 'chatHistory');
        await emitAck(host, 'sendChat', { text: 'anyone there?', clientNonce: 'n-2' });
        host.disconnect();
        await new Promise((resolve) => setTimeout(resolve, 150));

        const later = await connectClient(url);
        sockets.push(later);
        later.emit('joinRoom', { roomCode: 'CHAT-ABANDONED', callsign: 'LATECOMER', buildVersion: '2.4.13-beta' });
        const history = await waitForEvent(later, 'chatHistory');
        expect(history.messages).toEqual([]);
    });
});
