// Buying Cache Keys with real (or, on a beta build, Valve sandbox) money.
//
// The backend opens the transaction (InitTxn, usersession=client). Steam then
// shows its own approval dialog in the game overlay and reports the answer
// through MicroTxnAuthorizationResponse; only after that can the backend
// capture the payment and grant the keys (finalize). A web session instead
// returns a URL to open in the overlay. Every step reports a status the store
// shows next to the BUY buttons, so a press never ends in silence.
//
// `pending` remembers transactions approved but not yet settled, so the next
// store visit finishes them instead of stranding paid keys.

const DEFAULT_APPROVAL_TIMEOUT_MS = 10 * 60_000;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function isCompleted(result) {
    return Boolean(result?.ok && (result.purchaseStatus === 'completed' || result.status === 'completed'));
}

function isStillPending(result) {
    return result?.purchaseStatus === 'pending' || result?.nextAction === 'retry_finalize';
}

function waitForApproval(api, orderId, timeoutMs) {
    if (typeof api.onMicroTxnAuthorization !== 'function') return Promise.resolve(null);
    return new Promise((resolve) => {
        let unsubscribe = () => {};
        const timer = setTimeout(() => { unsubscribe(); resolve(null); }, timeoutMs);
        unsubscribe = api.onMicroTxnAuthorization((detail) => {
            if (String(detail?.orderId) !== String(orderId)) return;
            clearTimeout(timer);
            unsubscribe();
            resolve({ authorized: Boolean(detail.authorized) });
        }) ?? (() => {});
    });
}

async function finalizeWithRetry(api, transId, { attempts, delayMs }) {
    let last = null;
    for (let attempt = 0; attempt < attempts; attempt += 1) {
        if (attempt > 0) await wait(delayMs);
        last = await api.finalizeSteamPurchase(transId).catch((err) => ({ ok: false, reason: err?.message ?? 'finalize_failed' }));
        if (isCompleted(last) || !isStillPending(last)) return last;
    }
    return last;
}

export async function runSteamKeyPurchase({
    api,
    sku,
    onStatus = () => {},
    pending,
    approvalTimeoutMs = DEFAULT_APPROVAL_TIMEOUT_MS,
    finalizeAttempts = 5,
    retryDelayMs = 2000
}) {
    const init = await api.purchaseSteamKeys(sku).catch((err) => ({ ok: false, reason: err?.message ?? 'purchase_request_failed' }));
    if (isCompleted(init)) {
        onStatus({ key: 'completed', tone: 'success' });
        return { state: 'completed', result: init };
    }
    if (!init?.ok || !init.transId) {
        const reason = init?.reason ?? 'purchase_request_failed';
        onStatus(reason === 'sandbox_not_allowed'
            ? { key: 'sandbox_not_allowed', tone: 'error' }
            : { key: 'failed', tone: 'error', reason });
        return { state: 'refused', reason, result: init };
    }

    onStatus({ key: init.sandbox ? 'awaiting_sandbox' : 'awaiting_approval', tone: 'info' });
    // Subscribe before opening any overlay so a fast answer is not missed.
    const approval = waitForApproval(api, init.orderId, approvalTimeoutMs);
    if (init.confirmUrl) await api.openSteamOverlayToUrl?.(init.confirmUrl);
    const answer = await approval;
    if (answer && !answer.authorized) {
        onStatus({ key: 'declined', tone: 'info' });
        return { state: 'declined', result: init };
    }

    pending?.add(init.transId);
    const finalized = await finalizeWithRetry(api, init.transId, { attempts: finalizeAttempts, delayMs: retryDelayMs });
    if (isCompleted(finalized)) {
        pending?.remove(init.transId);
        onStatus({ key: 'completed', tone: 'success' });
        return { state: 'completed', result: finalized };
    }
    if (isStillPending(finalized)) {
        onStatus({ key: 'pending', tone: 'info' });
        return { state: 'pending', result: finalized };
    }
    pending?.remove(init.transId);
    const reason = finalized?.reason ?? 'finalize_failed';
    onStatus({ key: 'failed', tone: 'error', reason });
    return { state: 'failed', reason, result: finalized };
}

export async function finishPendingPurchases({ api, pending }) {
    let completed = 0;
    for (const transId of pending.list()) {
        const result = await api.finalizeSteamPurchase(transId).catch(() => null);
        if (!result) continue;
        if (isCompleted(result)) {
            completed += 1;
            pending.remove(transId);
        } else if (!isStillPending(result)) {
            pending.remove(transId);
        }
    }
    return { completed };
}
