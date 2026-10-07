import { createHash, randomUUID } from 'node:crypto';
import { filterChatText, warmChatFilter, CHAT_MAX_CODEPOINTS, CHAT_MAX_UTF8_BYTES } from '../src/chatFilter.js';

export const CHAT_POLICY_LIMITS = Object.freeze({
    history: 50,
    receipts: 200,
    messagesPerWindow: 5,
    windowMs: 10_000,
    moderationPerWindow: 20,
    identities: 2048,
    hiddenSenders: 100,
    reports: 100,
    reportRetentionMs: 24 * 60 * 60 * 1000
});

const REPORT_REASONS = new Set(['harassment', 'hate', 'spam', 'sexual', 'threat', 'other']);
const MODERATION_ACTIONS = new Set(['mute', 'unmute', 'block', 'unblock', 'report']);
const failure = (reason) => ({ ok: false, reason });
const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

/** Per-relay, bounded chat state. Room membership is enforced by the relay. */
export function createChatPolicy({ now = Date.now, filter = filterChatText } = {}) {
    // Compile the filter now, at relay start, not on a room's first message.
    if (filter === filterChatText) warmChatFilter();
    const rooms = new Map();
    const identities = new Map();
    const reports = [];

    function identity(senderId) {
        let state = identities.get(senderId);
        if (!state) {
            if (identities.size >= CHAT_POLICY_LIMITS.identities) {
                identities.delete(identities.keys().next().value);
            }
            state = { sentAt: [], moderatedAt: [], muted: new Set(), blocked: new Set() };
        }
        // Keep recently active identities (including reconnecting Steam users).
        identities.delete(senderId);
        identities.set(senderId, state);
        return state;
    }

    function room(roomCode) {
        if (!rooms.has(roomCode)) rooms.set(roomCode, { messages: [], receipts: new Map() });
        return rooms.get(roomCode);
    }

    function consumeBudget(state, key, limit) {
        const time = now();
        state[key] = state[key].filter((at) => time - at < CHAT_POLICY_LIMITS.windowMs);
        if (state[key].length >= limit) return false;
        state[key].push(time);
        return true;
    }

    function canReceive(recipientId, senderId) {
        const recipient = identities.get(recipientId);
        const sender = identities.get(senderId);
        return !recipient?.muted.has(senderId)
            && !recipient?.blocked.has(senderId)
            && !sender?.blocked.has(recipientId);
    }

    function getModerationState(senderId) {
        const state = identity(senderId);
        return { mutedSenderIds: [...state.muted], blockedSenderIds: [...state.blocked] };
    }

    function getHistory({ roomCode, senderId }) {
        identity(senderId);
        return {
            roomCode,
            selfId: senderId,
            messages: (rooms.get(roomCode)?.messages ?? [])
                .filter((message) => canReceive(senderId, message.senderId))
                .map((message) => ({ ...message }))
        };
    }

    function send(participant, payload) {
        if (!isObject(payload)) return failure('invalid_payload');
        const { text, clientNonce } = payload;
        if (typeof clientNonce !== 'string' || !/^[A-Za-z0-9_.:-]{1,64}$/.test(clientNonce)) {
            return failure('invalid_nonce');
        }
        if (typeof text !== 'string') return failure('invalid_text');
        // Bound work before normalization/filtering or hashing attacker input.
        if (text.length > CHAT_MAX_CODEPOINTS * 2 || Buffer.byteLength(text, 'utf8') > CHAT_MAX_UTF8_BYTES) {
            return failure('message_too_long');
        }
        const state = room(participant.roomCode);
        const receiptKey = `${participant.senderId}:${clientNonce}`;
        const digest = createHash('sha256').update(text).digest('hex');
        const receipt = state.receipts.get(receiptKey);
        if (receipt) {
            return receipt.digest === digest
                ? { ok: true, message: { ...receipt.message }, duplicate: true }
                : failure('nonce_conflict');
        }
        if (!consumeBudget(identity(participant.senderId), 'sentAt', CHAT_POLICY_LIMITS.messagesPerWindow)) {
            return failure('rate_limited');
        }
        let filtered;
        let name;
        try {
            filtered = filter(text);
            name = filter(participant.senderName);
        } catch {
            return failure('filter_unavailable');
        }
        if (!filtered?.ok) return failure(filtered?.reason ?? 'filter_unavailable');
        if (typeof filtered.text !== 'string' || !filtered.text.trim()) return failure('filter_unavailable');
        const message = {
            id: randomUUID(),
            roomCode: participant.roomCode,
            senderId: participant.senderId,
            senderName: name?.ok && typeof name.text === 'string' ? [...name.text].slice(0, 32).join('') : 'AGENT',
            text: filtered.text,
            sentAt: now(),
            clientNonce
        };
        state.messages.push(message);
        if (state.messages.length > CHAT_POLICY_LIMITS.history) state.messages.shift();
        state.receipts.set(receiptKey, { digest, message });
        if (state.receipts.size > CHAT_POLICY_LIMITS.receipts) state.receipts.delete(state.receipts.keys().next().value);
        return { ok: true, message: { ...message } };
    }

    function pruneReports() {
        const oldest = now() - CHAT_POLICY_LIMITS.reportRetentionMs;
        while (reports.length && reports[0].reportedAt <= oldest) reports.shift();
    }

    function moderate(participant, payload, roomSenderIds) {
        if (!isObject(payload) || !MODERATION_ACTIONS.has(payload.action)) return failure('invalid_action');
        const { action, senderId } = payload;
        if (typeof senderId !== 'string' || senderId.length > 128 || senderId === participant.senderId) {
            return failure('invalid_target');
        }
        const state = identity(participant.senderId);
        if (!consumeBudget(state, 'moderatedAt', CHAT_POLICY_LIMITS.moderationPerWindow)) return failure('rate_limited');
        const messages = rooms.get(participant.roomCode)?.messages ?? [];
        const knownTarget = roomSenderIds.includes(senderId) || messages.some((message) => message.senderId === senderId);
        if (!knownTarget && !(action === 'unmute' && state.muted.has(senderId)) && !(action === 'unblock' && state.blocked.has(senderId))) {
            return failure('invalid_target');
        }
        if (action === 'report') {
            const message = messages.find((entry) => entry.id === payload.messageId && entry.senderId === senderId);
            if (!message || !canReceive(participant.senderId, senderId)) return failure('message_unavailable');
            const reason = REPORT_REASONS.has(payload.reason) ? payload.reason : 'other';
            pruneReports();
            const duplicate = reports.find((entry) => entry.reporterId === participant.senderId && entry.message.id === message.id);
            if (duplicate) return { ok: true, action, senderId, reportId: duplicate.id };
            const report = {
                id: randomUUID(),
                reporterId: participant.senderId,
                reason,
                reportedAt: now(),
                message: { ...message }
            };
            // Only already-filtered evidence is retained, in this dedicated
            // operator-readable queue; chat text never enters relay telemetry.
            reports.push(report);
            if (reports.length > CHAT_POLICY_LIMITS.reports) reports.shift();
            return { ok: true, action, senderId, reportId: report.id };
        }
        const collection = action === 'mute' || action === 'unmute' ? state.muted : state.blocked;
        if (action === 'unmute' || action === 'unblock') collection.delete(senderId);
        else {
            if (!collection.has(senderId) && collection.size >= CHAT_POLICY_LIMITS.hiddenSenders) return failure('moderation_limit');
            collection.add(senderId);
        }
        return { ok: true, action, senderId, ...getModerationState(participant.senderId) };
    }

    return {
        send,
        moderate,
        canReceive,
        getHistory,
        getModerationState,
        clearRoom: (roomCode) => rooms.delete(roomCode),
        getReports: () => {
            pruneReports();
            return reports.map((entry) => ({ ...entry, message: { ...entry.message } }));
        }
    };
}
