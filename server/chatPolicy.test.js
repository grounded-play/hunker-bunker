import { describe, expect, it } from 'vitest';
import { createChatPolicy, CHAT_POLICY_LIMITS } from './chatPolicy.js';

const participant = (senderId = 'host', roomCode = 'ROOM') => ({ senderId, roomCode, senderName: 'Host' });
const payload = (clientNonce = 'n1', text = 'hello') => ({ clientNonce, text });

describe('chat policy safety and lifecycle', () => {
    it('uses server identity, rejects malformed messages, and bounds Unicode payloads', () => {
        const policy = createChatPolicy();
        const sent = policy.send(participant(), { ...payload(), senderId: 'forged', senderName: 'Admin', roomCode: 'OTHER' });
        expect(sent.message).toMatchObject({ senderId: 'host', senderName: 'Host', roomCode: 'ROOM' });
        expect(policy.send(participant(), null).ok).toBe(false);
        expect(policy.send(participant(), payload('!')).reason).toBe('invalid_nonce');
        expect(policy.send(participant(), payload('n2', 'x'.repeat(401))).ok).toBe(false);
        expect(policy.send(participant(), payload('n3', '😀'.repeat(401))).ok).toBe(false);
        expect(policy.send(participant(), payload('n4', { text: 'object' })).ok).toBe(false);
    });

    it('deduplicates unchanged retries, rejects nonce reuse for changed text, and rate limits', () => {
        let now = 0;
        const policy = createChatPolicy({ now: () => now });
        const sent = policy.send(participant(), payload());
        expect(policy.send(participant(), payload())).toMatchObject({ ok: true, duplicate: true, message: { id: sent.message.id } });
        expect(policy.send(participant(), payload('n1', 'changed')).reason).toBe('nonce_conflict');
        for (let i = 1; i < CHAT_POLICY_LIMITS.messagesPerWindow; i += 1) expect(policy.send(participant(), payload(`x${i}`)).ok).toBe(true);
        expect(policy.send(participant(), payload('limit')).reason).toBe('rate_limited');
        now += CHAT_POLICY_LIMITS.windowMs;
        expect(policy.send(participant(), payload('limit')).ok).toBe(true);
    });

    it('never delivers text when the filter fails', () => {
        for (const filter of [() => { throw new Error('missing'); }, () => null, () => ({ ok: false })]) {
            const policy = createChatPolicy({ filter });
            expect(policy.send(participant(), payload()).reason).toBe('filter_unavailable');
            expect(policy.getHistory(participant()).messages).toEqual([]);
        }
    });

    it('bounds room history and removes messages and receipts when the room ends', () => {
        let now = 0;
        const policy = createChatPolicy({ now: () => now });
        for (let i = 0; i < 75; i += 1) {
            now += CHAT_POLICY_LIMITS.windowMs;
            expect(policy.send(participant(), payload(`n${i}`)).ok).toBe(true);
        }
        const history = policy.getHistory(participant());
        expect(history.selfId).toBe('host');
        expect(history.messages).toHaveLength(CHAT_POLICY_LIMITS.history);
        expect(policy.getHistory(participant('other', 'OTHER')).messages).toEqual([]);
        policy.clearRoom('ROOM');
        expect(policy.getHistory(participant()).messages).toEqual([]);
        expect(policy.send(participant(), payload('n0')).duplicate).toBeUndefined();
    });

    it('mute is one-way, block is mutual, and both can be undone', () => {
        const policy = createChatPolicy();
        policy.send(participant('guest'), payload());
        expect(policy.moderate(participant(), { action: 'mute', senderId: 'guest' }, ['host', 'guest']).ok).toBe(true);
        expect(policy.canReceive('host', 'guest')).toBe(false);
        expect(policy.canReceive('guest', 'host')).toBe(true);
        expect(policy.getHistory(participant()).messages).toEqual([]);
        policy.moderate(participant(), { action: 'unmute', senderId: 'guest' }, []);
        policy.moderate(participant(), { action: 'block', senderId: 'guest' }, ['guest']);
        expect(policy.canReceive('guest', 'host')).toBe(false);
        policy.moderate(participant(), { action: 'unblock', senderId: 'guest' }, []);
        expect(policy.canReceive('guest', 'host')).toBe(true);
        expect(policy.canReceive('host', 'guest')).toBe(true);
    });

    it('rejects unknown/self targets and stores only filtered, deduplicated, expiring reports', () => {
        let now = 0;
        const policy = createChatPolicy({ now: () => now });
        const sent = policy.send(participant('guest'), payload('n1', 'fuck'));
        expect(policy.moderate(participant(), { action: 'mute', senderId: 'host' }, ['host']).reason).toBe('invalid_target');
        expect(policy.moderate(participant(), { action: 'mute', senderId: 'stranger' }, ['host']).reason).toBe('invalid_target');
        const report = { action: 'report', senderId: 'guest', messageId: sent.message.id, reason: 'spam' };
        const first = policy.moderate(participant(), report, ['guest']);
        expect(first.ok).toBe(true);
        expect(policy.moderate(participant(), report, ['guest']).reportId).toBe(first.reportId);
        expect(policy.getReports()).toHaveLength(1);
        expect(policy.getReports()[0].message.text).toBe('****');
        expect(policy.moderate(participant('other', 'OTHER'), report, []).ok).toBe(false);
        now = CHAT_POLICY_LIMITS.reportRetentionMs;
        expect(policy.getReports()).toEqual([]);
    });
});
