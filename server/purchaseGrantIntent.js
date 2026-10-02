import { createHash } from 'node:crypto';

const FIELDS = ['version', 'requestId', 'appId', 'sandbox', 'steamId64', 'orderId', 'transId', 'sku', 'itemdefid', 'quantity'];

/** Freeze both request identity and entitlement before any external grant. */
export function createPurchaseGrantIntent(purchase, { appId, sandbox, itemdefid, quantity }) {
    const identity = JSON.stringify(['hb-paid-grant-v1', appId, sandbox, purchase.steamId64, purchase.orderId, purchase.transId, purchase.sku]);
    const value = createHash('sha256').update(identity).digest().readBigUInt64BE(0);
    return {
        version: 1, requestId: String(value || 1n), appId, sandbox,
        steamId64: purchase.steamId64, orderId: purchase.orderId,
        transId: purchase.transId, sku: purchase.sku, itemdefid, quantity
    };
}

/** Shared by both DB adapters; an existing intent can never be silently replaced. */
export function mergePurchaseGrantIntent(existing, input, purchase) {
    const intent = existing?.grantIntent ?? input?.grantIntent;
    if (!intent) return undefined;
    if (intent.version !== 1 || !/^[1-9]\d{0,19}$/.test(intent.requestId)
        || typeof intent.requestId !== 'string' || BigInt(intent.requestId) > 18446744073709551615n
        || !Number.isSafeInteger(intent.appId) || intent.appId <= 0
        || typeof intent.sandbox !== 'boolean'
        || !Number.isSafeInteger(intent.itemdefid) || intent.itemdefid <= 0
        || !Number.isSafeInteger(intent.quantity) || intent.quantity < 1 || intent.quantity > 1000) {
        throw new Error('invalid_purchase_grant_intent');
    }
    for (const field of ['steamId64', 'orderId', 'transId', 'sku']) {
        if (typeof intent[field] !== 'string' || !intent[field] || intent[field] !== purchase[field]) {
            throw new Error('purchase_grant_identity_conflict');
        }
    }
    if (existing?.grantIntent && input?.grantIntent !== undefined
        && FIELDS.some((field) => input.grantIntent?.[field] !== intent[field])) {
        throw new Error('purchase_grant_intent_conflict');
    }
    return Object.fromEntries(FIELDS.map((field) => [field, intent[field]]));
}
