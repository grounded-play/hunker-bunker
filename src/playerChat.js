import { filterChatText } from './chatFilter.js';

export const CHAT_HISTORY_LIMIT = 50;

// Transport state is independent of the DOM and survives a socket reconnect.
// Nothing here writes conversations to storage, console output or telemetry.
export class PlayerChat {
    constructor({ filter = filterChatText, ackTimeoutMs = 5000, nonce = () => crypto.randomUUID() } = {}) {
        this.filter = filter;
        this.ackTimeoutMs = ackTimeoutMs;
        this.nonce = nonce;
        this.listeners = new Set();
        this.socket = null;
        this.handlers = {};
        this.generation = 0;
        this.roomCode = null;
        this.selfId = null;
        this.ready = false;
        this.messages = [];
        this.muted = [];
        this.blocked = [];
        this.names = new Map();
        this.pending = null;
        this.sending = false;
        this.error = null;
        this.unread = 0;
        this.visible = false;
    }

    subscribe(listener) {
        this.listeners.add(listener);
        listener(this);
        return () => this.listeners.delete(listener);
    }

    notify() { for (const listener of this.listeners) listener(this); }

    attachSocket(socket, roomCode = null) {
        for (const [event, handler] of Object.entries(this.handlers)) this.socket?.off(event, handler);
        this.generation += 1;
        this.socket = socket;
        this.ready = false;
        this.sending = false;
        this.error = null;
        if (!socket || roomCode !== this.roomCode) {
            this.messages = [];
            this.names.clear();
            this.pending = null;
            this.unread = 0;
            this.selfId = null;
            this.muted = [];
            this.blocked = [];
        }
        this.roomCode = roomCode;
        this.handlers = {
            connect: () => { this.ready = false; this.error = null; this.notify(); },
            disconnect: () => {
                this.ready = false;
                this.sending = false;
                this.generation += 1; // Late acknowledgements cannot cross a connection boundary.
                this.notify();
            },
            chatHistory: (payload) => {
                if (payload?.roomCode !== this.roomCode || !Array.isArray(payload.messages)) return;
                this.selfId = typeof payload.selfId === 'string' ? payload.selfId : null;
                this.messages = payload.messages.slice(-CHAT_HISTORY_LIMIT).map((entry) => this.validate(entry)).filter(Boolean);
                this.ready = true; // Only an accepted room join enables the composer.
                this.notify();
            },
            chatMessage: (message) => this.receive(message),
            chatModerationState: (state) => { this.setModeration(state); this.notify(); }
        };
        for (const [event, handler] of Object.entries(this.handlers)) socket?.on(event, handler);
        this.notify();
    }

    validate(message) {
        if (!message || message.roomCode !== this.roomCode
            || typeof message.id !== 'string' || message.id.length > 128
            || typeof message.senderId !== 'string' || message.senderId.length > 128
            || !Number.isFinite(message.sentAt) || Math.abs(message.sentAt) > 8.64e15) return null;
        try {
            const text = this.filter(message.text);
            const name = this.filter(message.senderName);
            if (!text?.ok || !name?.ok) throw new Error('filter_unavailable');
            const clean = { id: message.id, roomCode: message.roomCode, senderId: message.senderId,
                senderName: [...name.text].slice(0, 32).join(''), text: text.text, sentAt: message.sentAt };
            this.names.set(clean.senderId, clean.senderName);
            if (this.names.size > 150) this.names.delete(this.names.keys().next().value);
            return clean;
        } catch {
            this.error = 'filter_unavailable';
            return null;
        }
    }

    receive(message) {
        const clean = this.validate(message);
        if (!clean) { this.notify(); return; }
        if (this.messages.some((entry) => entry.id === clean.id)
            || this.muted.includes(clean.senderId) || this.blocked.includes(clean.senderId)) return;
        this.messages.push(clean);
        this.messages = this.messages.slice(-CHAT_HISTORY_LIMIT);
        if (!this.visible && clean.senderId !== this.selfId) this.unread = Math.min(CHAT_HISTORY_LIMIT, this.unread + 1);
        this.notify();
    }

    setVisible(visible) {
        this.visible = visible;
        if (visible) this.unread = 0;
        this.notify();
    }

    setModeration(state) {
        const ids = (value) => Array.isArray(value) ? value.filter((id) => typeof id === 'string' && id.length <= 128).slice(0, 100) : [];
        this.muted = ids(state?.mutedSenderIds);
        this.blocked = ids(state?.blockedSenderIds);
        this.messages = this.messages.filter((message) => !this.muted.includes(message.senderId) && !this.blocked.includes(message.senderId));
    }

    acknowledge(event, payload) {
        const socket = this.socket;
        const generation = this.generation;
        return new Promise((resolve) => {
            let settled = false;
            const finish = (result) => {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                resolve(generation === this.generation ? (result ?? { ok: false, reason: 'invalid_response' }) : { ok: false, reason: 'stale_connection' });
            };
            const timer = setTimeout(() => finish({ ok: false, reason: 'timeout' }), this.ackTimeoutMs);
            try { socket.emit(event, payload, finish); }
            catch { finish({ ok: false, reason: 'disconnected' }); }
        });
    }

    async send(text) {
        if (!this.ready || !this.socket?.connected) return { ok: false, reason: 'disconnected' };
        if (this.sending) return { ok: false, reason: 'busy' };
        let filtered;
        try { filtered = this.filter(text); } catch { /* fail closed below */ }
        if (!filtered?.ok) {
            this.error = filtered?.reason ?? 'filter_unavailable';
            this.notify();
            return { ok: false, reason: this.error };
        }
        // A timeout retry reuses both the exact wire text and nonce; an edited
        // draft is a new message. Do not automatically replay after reconnect.
        if (this.pending?.text !== filtered.text) this.pending = { text: filtered.text, clientNonce: this.nonce() };
        const generation = this.generation;
        this.sending = true;
        this.error = null;
        this.notify();
        const result = await this.acknowledge('sendChat', this.pending);
        if (generation !== this.generation) return { ok: false, reason: 'stale_connection' };
        this.sending = false;
        if (result.ok) {
            this.receive(result.message);
            this.pending = null;
        } else this.error = result.reason;
        this.notify();
        return result;
    }

    async moderate(action, senderId, messageId = null, reason = 'other') {
        if (!this.ready || !this.socket?.connected) return { ok: false, reason: 'disconnected' };
        const generation = this.generation;
        const result = await this.acknowledge('chatModeration', { action, senderId, messageId, reason });
        if (generation !== this.generation) return { ok: false, reason: 'stale_connection' };
        this.error = result.ok ? null : result.reason;
        if (result.ok && action !== 'report') this.setModeration(result);
        this.notify();
        return result;
    }
}

export const playerChat = new PlayerChat();
