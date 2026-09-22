import { describe, expect, it, vi } from 'vitest';
import {
    PENDING_RUN_SUBMITS_KEY,
    describeRunSubmitResult,
    flushPendingRunSubmits,
    isRetryableRunSubmitFailure,
    loadPendingRunSubmits,
    submitRunWithRetryQueue
} from './runSubmitQueue.js';

function memoryStorage(initial = {}) {
    const data = { ...initial };
    return {
        getItem: (k) => (k in data ? data[k] : null),
        setItem: (k, v) => { data[k] = String(v); },
        removeItem: (k) => { delete data[k]; },
        data
    };
}

const payload = (id = 'hb:1:2:TANK:seed') => ({ schemaVersion: 2, runId: id, score: 10 });

describe('isRetryableRunSubmitFailure', () => {
    it('retries network, timeout, auth-unavailable, rate-limit and 5xx failures', () => {
        expect(isRetryableRunSubmitFailure({ ok: false, reason: 'steam_backend_unreachable' })).toBe(true);
        expect(isRetryableRunSubmitFailure({ ok: false, reason: 'steam_backend_timeout' })).toBe(true);
        expect(isRetryableRunSubmitFailure({ ok: false, reason: 'steam_auth_unavailable', authTicketUnavailable: true })).toBe(true);
        expect(isRetryableRunSubmitFailure({ ok: false, status: 429 })).toBe(true);
        expect(isRetryableRunSubmitFailure({ ok: false, status: 502, reason: 'steam_leaderboard_submit_failed' })).toBe(true);
    });

    it('never retries a payload the server rejected as invalid', () => {
        expect(isRetryableRunSubmitFailure({ ok: false, status: 400, reason: 'invalid_run_payload' })).toBe(false);
        expect(isRetryableRunSubmitFailure({ ok: false, status: 401, reason: 'steam_auth_missing_steamid' })).toBe(false);
        expect(isRetryableRunSubmitFailure({ ok: true })).toBe(false);
    });
});

describe('submitRunWithRetryQueue', () => {
    it('does not queue an accepted run', async () => {
        const storage = memoryStorage();
        const result = await submitRunWithRetryQueue(payload(), vi.fn().mockResolvedValue({ ok: true }), storage);
        expect(result).toMatchObject({ ok: true, queued: false });
        expect(loadPendingRunSubmits(storage)).toEqual([]);
    });

    it('queues a run the backend could not be reached for, once per runId', async () => {
        const storage = memoryStorage();
        const submit = vi.fn().mockResolvedValue({ ok: false, reason: 'steam_backend_unreachable' });
        await submitRunWithRetryQueue(payload(), submit, storage);
        const second = await submitRunWithRetryQueue(payload(), submit, storage);
        expect(second).toMatchObject({ ok: false, queued: true });
        expect(loadPendingRunSubmits(storage).map((p) => p.runId)).toEqual(['hb:1:2:TANK:seed']);
    });

    it('drops (does not queue) a rejected run', async () => {
        const storage = memoryStorage();
        const result = await submitRunWithRetryQueue(
            payload(),
            vi.fn().mockResolvedValue({ ok: false, status: 400, reason: 'invalid_run_payload', errors: ['score_mismatch'] }),
            storage
        );
        expect(result).toMatchObject({ ok: false, queued: false });
        expect(loadPendingRunSubmits(storage)).toEqual([]);
    });

    it('treats a thrown submit as retryable', async () => {
        const storage = memoryStorage();
        const result = await submitRunWithRetryQueue(payload(), vi.fn().mockRejectedValue(new Error('ipc gone')), storage);
        expect(result).toMatchObject({ ok: false, queued: true, reason: 'steam_backend_unreachable' });
    });

    it('caps the queue so a long offline stretch cannot grow the save forever', async () => {
        const storage = memoryStorage();
        const submit = vi.fn().mockResolvedValue({ ok: false, reason: 'steam_backend_unreachable' });
        for (let i = 0; i < 30; i += 1) await submitRunWithRetryQueue(payload(`hb:${i}:x:TANK:s`), submit, storage);
        const pending = loadPendingRunSubmits(storage);
        expect(pending).toHaveLength(20);
        expect(pending.at(-1).runId).toBe('hb:29:x:TANK:s');
    });
});

describe('flushPendingRunSubmits', () => {
    it('resubmits queued runs, keeps the retryable failures, drops accepted and rejected ones', async () => {
        const storage = memoryStorage({
            [PENDING_RUN_SUBMITS_KEY]: JSON.stringify({ runs: [payload('hb:a'), payload('hb:b'), payload('hb:c')] })
        });
        const submit = vi.fn(async ({ runId }) => ({
            'hb:a': { ok: true },
            'hb:b': { ok: false, status: 503, reason: 'steam_leaderboard_submit_failed' },
            'hb:c': { ok: false, status: 400, reason: 'invalid_run_payload' }
        })[runId]);

        const summary = await flushPendingRunSubmits(submit, storage);

        expect(summary).toEqual({ attempted: 3, accepted: 1, dropped: 1, remaining: 1 });
        expect(loadPendingRunSubmits(storage).map((p) => p.runId)).toEqual(['hb:b']);
    });

    it('stops early after the first network failure so an offline flush costs one request', async () => {
        const storage = memoryStorage({
            [PENDING_RUN_SUBMITS_KEY]: JSON.stringify({ runs: [payload('hb:a'), payload('hb:b')] })
        });
        const submit = vi.fn().mockResolvedValue({ ok: false, reason: 'steam_backend_unreachable' });
        const summary = await flushPendingRunSubmits(submit, storage);
        expect(submit).toHaveBeenCalledTimes(1);
        expect(summary.remaining).toBe(2);
    });

    it('survives corrupt storage', async () => {
        const storage = memoryStorage({ [PENDING_RUN_SUBMITS_KEY]: '{nope' });
        expect(loadPendingRunSubmits(storage)).toEqual([]);
        expect(await flushPendingRunSubmits(vi.fn(), storage)).toEqual({ attempted: 0, accepted: 0, dropped: 0, remaining: 0 });
    });
});

describe('describeRunSubmitResult', () => {
    it('maps outcomes to the Game Over status line', () => {
        expect(describeRunSubmitResult({ ok: true })).toEqual({ type: 'live', text: 'SCORE LOGGED' });
        expect(describeRunSubmitResult({ ok: false, queued: true })).toEqual({ type: 'offline', text: 'UPLINK DOWN - SCORE QUEUED FOR RETRY' });
        expect(describeRunSubmitResult({ ok: false, queued: false, reason: 'invalid_run_payload', errors: ['score_mismatch'] }))
            .toEqual({ type: 'offline', text: 'SCORE REJECTED - SCORE_MISMATCH' });
    });
});
