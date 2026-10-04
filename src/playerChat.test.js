import { describe, expect, it, vi, beforeEach } from 'vitest';
import { PlayerChat, CHAT_HISTORY_LIMIT } from './playerChat.js';

function createMockSocket() {
    const handlers = new Map();
    return {
        connected: true,
        on: vi.fn((event, handler) => {
            if (!handlers.has(event)) handlers.set(event, []);
            handlers.get(event).push(handler);
        }),
        off: vi.fn((event, handler) => {
            const list = handlers.get(event);
            if (list) {
                const idx = list.indexOf(handler);
                if (idx >= 0) list.splice(idx, 1);
            }
        }),
        emit: vi.fn(),
        trigger(event, data, callback) {
            const list = handlers.get(event) || [];
            for (const fn of list) fn(data, callback);
        }
    };
}

describe('PlayerChat transport and state machine', () => {
    let chat;
    let mockFilter;

    beforeEach(() => {
        mockFilter = vi.fn((text) => ({ ok: true, text: String(text ?? '') }));
        chat = new PlayerChat({ filter: mockFilter, nonce: () => 'fixed-nonce-123' });
    });

    it('initializes in disconnected, unready state', () => {
        expect(chat.ready).toBe(false);
        expect(chat.messages).toEqual([]);
        expect(chat.unread).toBe(0);
        expect(chat.visible).toBe(false);
        expect(chat.roomCode).toBeNull();
    });

    it('binds socket events on attachSocket and clears on room change', () => {
        const socket = createMockSocket();
        chat.attachSocket(socket, 'ROOM-A');

        expect(socket.on).toHaveBeenCalledWith('connect', expect.any(Function));
        expect(socket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
        expect(socket.on).toHaveBeenCalledWith('chatHistory', expect.any(Function));
        expect(socket.on).toHaveBeenCalledWith('chatMessage', expect.any(Function));
        expect(socket.on).toHaveBeenCalledWith('chatModerationState', expect.any(Function));
        expect(chat.roomCode).toBe('ROOM-A');

        chat.receive({
            id: 'msg-1',
            roomCode: 'ROOM-A',
            senderId: 'user-1',
            senderName: 'Viper',
            text: 'Hello squad',
            sentAt: 1000
        });
        expect(chat.messages).toHaveLength(1);

        // Attaching to a new room resets messages and state
        chat.attachSocket(socket, 'ROOM-B');
        expect(chat.roomCode).toBe('ROOM-B');
        expect(chat.messages).toHaveLength(0);
    });

    it('populates history and selfId on chatHistory event', () => {
        const socket = createMockSocket();
        chat.attachSocket(socket, 'ROOM-A');

        socket.trigger('chatHistory', {
            roomCode: 'ROOM-A',
            selfId: 'self-1',
            messages: [
                { id: 'm1', roomCode: 'ROOM-A', senderId: 'p1', senderName: 'Bravo', text: 'Hi', sentAt: 100 },
                { id: 'm2', roomCode: 'ROOM-A', senderId: 'p2', senderName: 'Echo', text: 'Ready', sentAt: 200 }
            ]
        });

        expect(chat.ready).toBe(true);
        expect(chat.selfId).toBe('self-1');
        expect(chat.messages).toHaveLength(2);
        expect(chat.messages[0].text).toBe('Hi');
        expect(chat.messages[1].text).toBe('Ready');
    });

    // Playtest 2026-10-02: the Deck host reconnected every ~10 s; each fresh
    // history replaced the panel, so lines on screen vanished on a reconnect.
    it('merges a reconnect history with lines already on screen, in send order', () => {
        const socket = createMockSocket();
        chat.attachSocket(socket, 'ROOM-A');
        socket.trigger('chatHistory', { roomCode: 'ROOM-A', selfId: 'self-1', messages: [] });
        chat.receive({ id: 'm1', roomCode: 'ROOM-A', senderId: 'self-1', senderName: 'Zero', text: 'Need help!', sentAt: 100 });

        socket.trigger('disconnect');
        socket.trigger('connect');
        socket.trigger('chatHistory', {
            roomCode: 'ROOM-A',
            selfId: 'self-1',
            messages: [{ id: 'm2', roomCode: 'ROOM-A', senderId: 'p2', senderName: 'Cypher', text: 'On my way', sentAt: 200 }]
        });

        expect(chat.messages.map((m) => m.text)).toEqual(['Need help!', 'On my way']);
        socket.trigger('chatHistory', {
            roomCode: 'ROOM-A',
            selfId: 'self-1',
            messages: [{ id: 'm1', roomCode: 'ROOM-A', senderId: 'self-1', senderName: 'Zero', text: 'Need help!', sentAt: 100 }]
        });
        expect(chat.messages).toHaveLength(2);
    });

    it('tells message listeners about live lines from other players only', () => {
        const socket = createMockSocket();
        chat.attachSocket(socket, 'ROOM-A');
        socket.trigger('chatHistory', {
            roomCode: 'ROOM-A',
            selfId: 'self-1',
            messages: [{ id: 'old', roomCode: 'ROOM-A', senderId: 'p2', senderName: 'Cypher', text: 'earlier', sentAt: 50 }]
        });
        const heard = [];
        chat.onMessage((message) => heard.push(message.text));
        socket.trigger('chatMessage', { id: 'a', roomCode: 'ROOM-A', senderId: 'p2', senderName: 'Cypher', text: 'Behind you', sentAt: 100 });
        socket.trigger('chatMessage', { id: 'b', roomCode: 'ROOM-A', senderId: 'self-1', senderName: 'Zero', text: 'mine', sentAt: 110 });
        socket.trigger('chatMessage', { id: 'a', roomCode: 'ROOM-A', senderId: 'p2', senderName: 'Cypher', text: 'Behind you', sentAt: 100 });
        expect(heard).toEqual(['Behind you']);
    });

    it('ignores chatHistory for mismatched roomCode', () => {
        const socket = createMockSocket();
        chat.attachSocket(socket, 'ROOM-A');

        socket.trigger('chatHistory', {
            roomCode: 'ROOM-X',
            selfId: 'self-x',
            messages: [{ id: 'm1', roomCode: 'ROOM-X', senderId: 'p1', senderName: 'P1', text: 'Leaked', sentAt: 100 }]
        });

        expect(chat.ready).toBe(false);
        expect(chat.messages).toHaveLength(0);
    });

    it('receives live chat messages and increments unread count when hidden', () => {
        const socket = createMockSocket();
        chat.attachSocket(socket, 'ROOM-A');
        chat.ready = true;
        chat.selfId = 'self-1';
        chat.setVisible(false);

        socket.trigger('chatMessage', {
            id: 'm-live-1',
            roomCode: 'ROOM-A',
            senderId: 'remote-1',
            senderName: 'Scout',
            text: 'Need ammo',
            sentAt: 500
        });

        expect(chat.messages).toHaveLength(1);
        expect(chat.unread).toBe(1);

        // Self messages do not increment unread count
        socket.trigger('chatMessage', {
            id: 'm-live-2',
            roomCode: 'ROOM-A',
            senderId: 'self-1',
            senderName: 'Me',
            text: 'Affirmative',
            sentAt: 600
        });

        expect(chat.messages).toHaveLength(2);
        expect(chat.unread).toBe(1);

        // Opening chat clears unread count
        chat.setVisible(true);
        expect(chat.unread).toBe(0);
    });

    it('drops messages from muted or blocked senders', () => {
        const socket = createMockSocket();
        chat.attachSocket(socket, 'ROOM-A');
        chat.ready = true;

        chat.setModeration({
            mutedSenderIds: ['toxic-user'],
            blockedSenderIds: ['spammer-user']
        });

        expect(chat.muted).toContain('toxic-user');
        expect(chat.blocked).toContain('spammer-user');

        socket.trigger('chatMessage', {
            id: 'm-toxic',
            roomCode: 'ROOM-A',
            senderId: 'toxic-user',
            senderName: 'Toxic',
            text: 'Annoying chatter',
            sentAt: 100
        });

        socket.trigger('chatMessage', {
            id: 'm-spam',
            roomCode: 'ROOM-A',
            senderId: 'spammer-user',
            senderName: 'SpamBot',
            text: 'Buy stuff',
            sentAt: 200
        });

        expect(chat.messages).toHaveLength(0);
    });

    it('prunes existing messages when sender is muted or blocked', () => {
        const socket = createMockSocket();
        chat.attachSocket(socket, 'ROOM-A');
        chat.ready = true;

        chat.receive({ id: 'm1', roomCode: 'ROOM-A', senderId: 'u1', senderName: 'User1', text: 'msg 1', sentAt: 100 });
        chat.receive({ id: 'm2', roomCode: 'ROOM-A', senderId: 'u2', senderName: 'User2', text: 'msg 2', sentAt: 200 });
        expect(chat.messages).toHaveLength(2);

        chat.setModeration({ mutedSenderIds: ['u1'], blockedSenderIds: [] });
        expect(chat.messages).toHaveLength(1);
        expect(chat.messages[0].senderId).toBe('u2');
    });

    it('sends messages through socket sendChat and receives ack', async () => {
        const socket = createMockSocket();
        chat.attachSocket(socket, 'ROOM-A');
        chat.ready = true;

        socket.emit.mockImplementation((event, payload, ack) => {
            if (event === 'sendChat') {
                ack({
                    ok: true,
                    message: {
                        id: 'srv-1',
                        roomCode: 'ROOM-A',
                        senderId: 'self-1',
                        senderName: 'LocalAgent',
                        text: payload.text,
                        sentAt: 1234
                    }
                });
            }
        });

        const result = await chat.send('Regroup at bunker');
        expect(result.ok).toBe(true);
        expect(chat.messages).toHaveLength(1);
        expect(chat.messages[0].text).toBe('Regroup at bunker');
        expect(socket.emit).toHaveBeenCalledWith('sendChat', {
            text: 'Regroup at bunker',
            clientNonce: 'fixed-nonce-123'
        }, expect.any(Function));
    });

    it('moderates peers via chatModeration socket event', async () => {
        const socket = createMockSocket();
        chat.attachSocket(socket, 'ROOM-A');
        chat.ready = true;

        socket.emit.mockImplementation((event, payload, ack) => {
            if (event === 'chatModeration') {
                ack({
                    ok: true,
                    action: payload.action,
                    senderId: payload.senderId,
                    mutedSenderIds: payload.action === 'mute' ? [payload.senderId] : [],
                    blockedSenderIds: payload.action === 'block' ? [payload.senderId] : []
                });
            }
        });

        const muteResult = await chat.moderate('mute', 'bad-peer', 'msg-99', 'harassment');
        expect(muteResult.ok).toBe(true);
        expect(chat.muted).toContain('bad-peer');
    });

    it('enforces CHAT_HISTORY_LIMIT bounding', () => {
        const socket = createMockSocket();
        chat.attachSocket(socket, 'ROOM-A');
        chat.ready = true;

        for (let i = 0; i < CHAT_HISTORY_LIMIT + 10; i++) {
            chat.receive({
                id: `msg-${i}`,
                roomCode: 'ROOM-A',
                senderId: 'peer',
                senderName: 'Peer',
                text: `Test ${i}`,
                sentAt: 1000 + i
            });
        }

        expect(chat.messages).toHaveLength(CHAT_HISTORY_LIMIT);
        expect(chat.messages[0].id).toBe('msg-10');
        expect(chat.messages[CHAT_HISTORY_LIMIT - 1].id).toBe(`msg-${CHAT_HISTORY_LIMIT + 9}`);
    });
});
