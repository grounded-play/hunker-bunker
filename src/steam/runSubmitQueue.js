// Leaderboard run submits that could not reach the backend (Deck offline,
// relay down, Steam auth not ready yet) are kept in an hb_ save key and
// resubmitted later. Retries are safe: SetLeaderboardScore is KeepBest and
// the server's milestone grants are idempotent on the runId-derived key.
// Payloads the server rejected (4xx) are never retried -- resending the same
// bytes cannot change the verdict.
export const PENDING_RUN_SUBMITS_KEY = 'hb_pending_run_submits_v1';
const MAX_PENDING_RUNS = 20;

const RETRYABLE_REASONS = new Set([
    'steam_backend_unreachable',
    'steam_backend_timeout',
    'steam_auth_unavailable',
    'steam_session_unavailable',
    'fetch_unavailable'
]);

export function isRetryableRunSubmitFailure(result) {
    if (!result || result.ok) return false;
    if (result.authTicketUnavailable) return true;
    if (RETRYABLE_REASONS.has(result.reason)) return true;
    const status = Number(result.status);
    return status === 429 || status >= 500;
}

export function loadPendingRunSubmits(storage = globalThis.localStorage) {
    try {
        const parsed = JSON.parse(storage?.getItem(PENDING_RUN_SUBMITS_KEY) ?? 'null');
        return Array.isArray(parsed?.runs) ? parsed.runs.filter((run) => typeof run?.runId === 'string') : [];
    } catch {
        return [];
    }
}

function savePendingRunSubmits(runs, storage = globalThis.localStorage) {
    try {
        if (runs.length === 0) storage?.removeItem(PENDING_RUN_SUBMITS_KEY);
        else storage?.setItem(PENDING_RUN_SUBMITS_KEY, JSON.stringify({ runs: runs.slice(-MAX_PENDING_RUNS) }));
    } catch {
        // storage full/unavailable: the run is lost, same as before the queue existed
    }
}

async function attemptSubmit(payload, submitFn) {
    try {
        return (await submitFn(payload)) ?? { ok: false, reason: 'steam_backend_unreachable' };
    } catch (err) {
        return { ok: false, reason: 'steam_backend_unreachable', message: err?.message ?? String(err) };
    }
}

export async function submitRunWithRetryQueue(payload, submitFn, storage = globalThis.localStorage) {
    const result = await attemptSubmit(payload, submitFn);
    const queued = isRetryableRunSubmitFailure(result);
    if (queued) {
        const pending = loadPendingRunSubmits(storage).filter((run) => run.runId !== payload.runId);
        savePendingRunSubmits([...pending, payload], storage);
    }
    return { ...result, queued };
}

let flushInFlight = null;

export function flushPendingRunSubmits(submitFn, storage = globalThis.localStorage) {
    if (flushInFlight) return flushInFlight;
    flushInFlight = (async () => {
        const pending = loadPendingRunSubmits(storage);
        const remaining = [];
        let attempted = 0;
        let accepted = 0;
        let dropped = 0;
        for (let i = 0; i < pending.length; i += 1) {
            attempted += 1;
            const result = await attemptSubmit(pending[i], submitFn);
            if (result.ok) {
                accepted += 1;
            } else if (isRetryableRunSubmitFailure(result)) {
                remaining.push(pending[i]);
                if (RETRYABLE_REASONS.has(result.reason)) {
                    // Offline: keep the rest untouched rather than burn a request each.
                    remaining.push(...pending.slice(i + 1));
                    break;
                }
            } else {
                dropped += 1;
            }
        }
        savePendingRunSubmits(remaining, storage);
        return { attempted, accepted, dropped, remaining: remaining.length };
    })().finally(() => {
        flushInFlight = null;
    });
    return flushInFlight;
}

export function describeRunSubmitResult(result = {}) {
    if (result.ok) return { type: 'live', text: 'SCORE LOGGED' };
    if (result.queued) return { type: 'offline', text: 'UPLINK DOWN - SCORE QUEUED FOR RETRY' };
    const detail = Array.isArray(result.errors) && result.errors.length > 0 ? result.errors[0] : result.reason;
    return { type: 'offline', text: `SCORE REJECTED - ${String(detail ?? 'UNKNOWN').toUpperCase()}` };
}
