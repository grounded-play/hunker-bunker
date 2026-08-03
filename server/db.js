import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { createSqliteBackend } from './db-sqlite.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// Overridable so parallel test files don't race each other writing the same
// physical file (each vitest file runs in its own module registry but they
// all still hit the same real path on disk otherwise).
function getDbFilePath() {
    return process.env.HB_DB_STORAGE_PATH || path.join(__dirname, 'db_storage.json');
}

function sqliteBackendEnabled() {
    const backendEnv = String(process.env.HB_DB_BACKEND ?? '').trim().toLowerCase();
    if (backendEnv === 'json') return false;
    if (backendEnv === 'sqlite' || process.env.HB_DB_SQLITE_PATH || process.env.HB_SQLITE_DB_PATH) return true;
    return nodeSqliteAvailable();
}

function getSqliteDbFilePath() {
    if (process.env.HB_DB_SQLITE_PATH) return process.env.HB_DB_SQLITE_PATH;
    if (process.env.HB_SQLITE_DB_PATH) return process.env.HB_SQLITE_DB_PATH;
    if (process.env.HB_DB_STORAGE_PATH) {
        const dir = path.dirname(process.env.HB_DB_STORAGE_PATH);
        const base = path.basename(process.env.HB_DB_STORAGE_PATH, path.extname(process.env.HB_DB_STORAGE_PATH));
        return path.join(dir, `${base}.sqlite`);
    }
    return path.join(__dirname, 'data', 'hunker-bunker.sqlite');
}

let dbState = {
    inventories: {}, // steamid64 -> array of { itemId, itemdefid, quantity, acquiredAt, properties }
    leaderboards: {}, // boardName -> array of { steamId64, score, persona, timestamp }
    idempotency: {}, // requestId -> { status, body, timestamp, expiresAt? }
    receipts: [], // array of run receipts
    // Canonical store purchases keyed by transId/orderId with an event trail.
    // Older append-only rows are migrated into this shape during initDb().
    purchases: [] // { steamId64, sku, transId, orderId, status, createdAt, updatedAt, events }
};

let writeQueue = Promise.resolve();
let dbInitialized = false;
let lastWriteAt = null;
let lastWriteError = null;
let lastInitError = null;
const PURCHASE_EVENT_LIMIT = 50;
let sqliteBackend = null;
let sqliteBackendPath = null;
let nodeSqliteModule = null;
let nodeSqliteLoadError = null;
let nodeSqliteChecked = false;

function getNodeSqliteModule() {
    if (nodeSqliteChecked) return nodeSqliteModule;
    nodeSqliteChecked = true;
    try {
        nodeSqliteModule = require('node:sqlite');
        nodeSqliteLoadError = null;
    } catch (err) {
        nodeSqliteModule = null;
        nodeSqliteLoadError = err;
    }
    return nodeSqliteModule;
}

export function nodeSqliteAvailable() {
    return typeof getNodeSqliteModule()?.DatabaseSync === 'function';
}

function requireNodeSqliteDatabaseSync() {
    const sqliteModule = getNodeSqliteModule();
    if (typeof sqliteModule?.DatabaseSync === 'function') return sqliteModule.DatabaseSync;

    const unavailableMessage = nodeSqliteLoadError?.code === 'ERR_UNKNOWN_BUILTIN_MODULE'
        ? 'This Node runtime does not include the node:sqlite built-in module.'
        : `Unable to load node:sqlite${nodeSqliteLoadError?.message ? `: ${nodeSqliteLoadError.message}` : '.'}`;
    throw new Error(`${unavailableMessage} Use a Node runtime with node:sqlite support, or unset HB_DB_BACKEND to use the JSON backend.`);
}

function getSqliteBackend() {
    if (!sqliteBackendEnabled()) return null;
    const dbFilePath = getSqliteDbFilePath();
    if (sqliteBackend && sqliteBackendPath === dbFilePath) return sqliteBackend;
    sqliteBackend?.close?.();
    const DatabaseSync = requireNodeSqliteDatabaseSync();
    sqliteBackend = createSqliteBackend({ DatabaseSync, dbFilePath });
    sqliteBackendPath = dbFilePath;
    return sqliteBackend;
}

// Atomic writing: write to tmp, then rename to ensure crash-resistance
async function saveToDisk() {
    const dbFilePath = getDbFilePath();
    writeQueue = writeQueue.catch(() => {}).then(async () => {
        const tmpPath = `${dbFilePath}.tmp`;
        try {
            const data = JSON.stringify(dbState, null, 2);
            await fs.promises.mkdir(path.dirname(dbFilePath), { recursive: true });
            await fs.promises.writeFile(tmpPath, data, 'utf8');
            await fs.promises.rename(tmpPath, dbFilePath);
            lastWriteAt = Date.now();
            lastWriteError = null;
        } catch (err) {
            lastWriteError = err?.message ?? String(err);
            try {
                await fs.promises.unlink(tmpPath);
            } catch (unlinkErr) {
                console.debug('[hb-db] temp file unlink failed:', unlinkErr.message);
            }
            throw err;
        }
    });
    return writeQueue;
}

function normalizeTimestamp(value, fallback = Date.now()) {
    const timestamp = Number(value);
    return Number.isFinite(timestamp) && timestamp > 0 ? timestamp : fallback;
}

function normalizeOptionalString(value) {
    if (value === undefined || value === null) return null;
    const text = String(value).trim();
    return text ? text : null;
}

function purchaseEventFrom(input = {}, now = Date.now()) {
    const event = {
        status: String(input.status ?? 'unknown'),
        timestamp: normalizeTimestamp(input.updatedAt ?? input.timestamp ?? input.createdAt, now)
    };
    for (const field of ['reason', 'steamState', 'steamResult', 'steamErrorCode', 'mode']) {
        const value = normalizeOptionalString(input[field]);
        if (value) event[field] = value;
    }
    return event;
}

function mergePurchaseRecord(existing, input = {}, now = Date.now()) {
    const transId = normalizeOptionalString(input.transId ?? existing?.transId ?? input.orderId ?? existing?.orderId);
    const orderId = normalizeOptionalString(input.orderId ?? existing?.orderId ?? input.transId ?? existing?.transId);
    if (!transId && !orderId) return null;

    const createdAt = normalizeTimestamp(
        existing?.createdAt ?? existing?.timestamp ?? input.createdAt ?? input.timestamp,
        now
    );
    const previousEvents = Array.isArray(existing?.events)
        ? existing.events
        : (existing ? [purchaseEventFrom(existing, createdAt)] : []);
    const nextEvent = purchaseEventFrom(input, now);

    const next = {
        ...(existing ?? {}),
        steamId64: normalizeOptionalString(input.steamId64 ?? existing?.steamId64) ?? '',
        sku: normalizeOptionalString(input.sku ?? existing?.sku) ?? '',
        transId: transId ?? orderId,
        orderId: orderId ?? transId,
        status: String(input.status ?? existing?.status ?? 'unknown'),
        priceUsdCents: Number(input.priceUsdCents ?? existing?.priceUsdCents ?? 0) || 0,
        requestId: normalizeOptionalString(input.requestId ?? existing?.requestId),
        confirmUrl: normalizeOptionalString(input.confirmUrl ?? existing?.confirmUrl),
        currency: normalizeOptionalString(input.currency ?? existing?.currency ?? 'USD') ?? 'USD',
        createdAt,
        updatedAt: now,
        events: [...previousEvents, nextEvent].slice(-PURCHASE_EVENT_LIMIT)
    };

    for (const field of ['steamState', 'steamResult', 'steamErrorCode', 'reason']) {
        const value = normalizeOptionalString(input[field] ?? existing?.[field]);
        if (value) next[field] = value;
        else delete next[field];
    }

    if (Array.isArray(input.granted)) {
        next.granted = input.granted;
    } else if (Array.isArray(existing?.granted)) {
        next.granted = existing.granted;
    }

    return next;
}

function purchasesMatch(purchase, { transId, orderId, requestId } = {}) {
    const transIdText = normalizeOptionalString(transId);
    const orderIdText = normalizeOptionalString(orderId);
    const requestIdText = normalizeOptionalString(requestId);
    return Boolean(
        (transIdText && (purchase.transId === transIdText || purchase.orderId === transIdText))
        || (orderIdText && (purchase.orderId === orderIdText || purchase.transId === orderIdText))
        || (requestIdText && purchase.requestId === requestIdText)
    );
}

function clonePurchase(purchase) {
    if (!purchase) return null;
    return {
        ...purchase,
        events: Array.isArray(purchase.events) ? purchase.events.map((event) => ({ ...event })) : []
    };
}

function normalizePurchaseCollection(rawPurchases) {
    const normalized = [];
    for (const raw of Array.isArray(rawPurchases) ? rawPurchases : []) {
        const now = normalizeTimestamp(raw?.updatedAt ?? raw?.timestamp ?? raw?.createdAt);
        const index = normalized.findIndex((purchase) => purchasesMatch(purchase, {
            transId: raw?.transId,
            orderId: raw?.orderId,
            requestId: raw?.requestId
        }));
        const merged = mergePurchaseRecord(index >= 0 ? normalized[index] : null, raw, now);
        if (!merged) continue;
        if (index >= 0) normalized[index] = merged;
        else normalized.push(merged);
    }
    return normalized;
}

function idempotencyExpired(record, now = Date.now()) {
    const expiresAt = Number(record?.expiresAt);
    return Number.isFinite(expiresAt) && expiresAt > 0 && expiresAt <= now;
}

function isSafeDbKey(key) {
    if (key == null) return false;
    const str = String(key).trim();
    if (!str || str.length > 256) return false;
    if (str === '__proto__' || str === 'constructor' || str === 'prototype') return false;
    return true;
}

function safeGet(targetObj, rawKey) {
    if (!targetObj || typeof targetObj !== 'object') return undefined;
    const key = String(rawKey ?? '').trim();
    if (!isSafeDbKey(key)) return undefined;
    return Object.hasOwn(targetObj, key) ? targetObj[key] : undefined;
}

function safeSet(targetObj, rawKey, value) {
    if (!targetObj || typeof targetObj !== 'object') return false;
    const key = String(rawKey ?? '').trim();
    if (!isSafeDbKey(key)) return false;
    targetObj[key] = value;
    return true;
}

function safeDelete(targetObj, rawKey) {
    if (!targetObj || typeof targetObj !== 'object') return false;
    const key = String(rawKey ?? '').trim();
    if (!isSafeDbKey(key)) return false;
    delete targetObj[key];
    return true;
}

function normalizeDbStateShape() {
    dbState.inventories = dbState.inventories && typeof dbState.inventories === 'object' ? dbState.inventories : {};
    dbState.leaderboards = dbState.leaderboards && typeof dbState.leaderboards === 'object' ? dbState.leaderboards : {};
    dbState.idempotency = dbState.idempotency && typeof dbState.idempotency === 'object' ? dbState.idempotency : {};
    dbState.receipts = Array.isArray(dbState.receipts) ? dbState.receipts : [];
    dbState.purchases = normalizePurchaseCollection(dbState.purchases);
}

export async function initDb() {
    const sqlite = getSqliteBackend();
    if (sqlite) return sqlite.initDb();

    const dbFilePath = getDbFilePath();
    try {
        if (fs.existsSync(dbFilePath)) {
            const fileContent = fs.readFileSync(dbFilePath, 'utf8');
            const parsed = JSON.parse(fileContent);
            dbState = {
                ...dbState,
                ...parsed
            };
        }
        normalizeDbStateShape();
        dbInitialized = true;
        lastInitError = null;
    } catch (err) {
        dbInitialized = false;
        lastInitError = err?.message ?? String(err);
        console.warn(`[hb-db] failed to initialize disk db at ${dbFilePath}:`, err);
    }
    return getDbStatus();
}

export function getDbStatus() {
    const sqlite = getSqliteBackend();
    if (sqlite) return sqlite.getDbStatus();

    const dbFilePath = getDbFilePath();
    const envConfigured = Boolean(process.env.HB_DB_STORAGE_PATH);
    return {
        path: dbFilePath,
        storageBackend: 'json',
        envConfigured,
        durable: envConfigured,
        initialized: dbInitialized,
        exists: fs.existsSync(dbFilePath),
        idempotencyRecords: Object.keys(dbState.idempotency).length,
        purchaseRecords: dbState.purchases.length,
        lastWriteAt,
        lastWriteError,
        lastInitError
    };
}

export function getMockInventory(steamId64) {
    const sqlite = getSqliteBackend();
    if (sqlite) return sqlite.getMockInventory(steamId64);

    const sId = String(steamId64 ?? '').trim();
    if (!isSafeDbKey(sId)) return [];
    if (!safeGet(dbState.inventories, sId)) {
        // Seed default items for developers to start with
        safeSet(dbState.inventories, sId, [
            {
                itemId: `mock-inv-${Math.random().toString(36).substring(2, 10)}`,
                itemdefid: 1000,
                quantity: 10,
                acquiredAt: Date.now(),
                properties: { source: 'seed' }
            },
            {
                itemId: `mock-inv-${Math.random().toString(36).substring(2, 10)}`,
                itemdefid: 1100,
                quantity: 2,
                acquiredAt: Date.now(),
                properties: { source: 'seed' }
            }
        ]);
        void saveToDisk();
    }
    return safeGet(dbState.inventories, sId) ?? [];
}

export async function setMockInventory(steamId64, items) {
    const sqlite = getSqliteBackend();
    if (sqlite) return sqlite.setMockInventory(steamId64, items);

    const sId = String(steamId64 ?? '').trim();
    if (!isSafeDbKey(sId)) return;
    safeSet(dbState.inventories, sId, Array.isArray(items) ? items : []);
    await saveToDisk();
}

export function getMockLeaderboard(boardName) {
    const sqlite = getSqliteBackend();
    if (sqlite) return sqlite.getMockLeaderboard(boardName);

    const bName = String(boardName ?? '').trim();
    if (!isSafeDbKey(bName)) return [];
    if (!safeGet(dbState.leaderboards, bName)) {
        let entries = [];
        if (bName === 'best_run_score') {
            entries = [
                { steamId64: '76561198000000001', score: 1550, persona: 'Operator Aegis', timestamp: Date.now() - 3600000 * 4 },
                { steamId64: '76561198000000002', score: 1200, persona: 'Operator Striker', timestamp: Date.now() - 3600000 * 8 },
                { steamId64: '76561198000000003', score: 980, persona: 'Operator Scout', timestamp: Date.now() - 3600000 * 12 },
                { steamId64: '76561198000000000', score: 850, persona: 'Agent (You)', timestamp: Date.now() - 60000 }
            ];
        } else if (bName === 'survival_time_seconds') {
            entries = [
                { steamId64: '76561198000000001', score: 320, persona: 'Operator Aegis', timestamp: Date.now() - 3600000 * 4 },
                { steamId64: '76561198000000002', score: 240, persona: 'Operator Striker', timestamp: Date.now() - 3600000 * 8 },
                { steamId64: '76561198000000000', score: 180, persona: 'Agent (You)', timestamp: Date.now() - 60000 },
                { steamId64: '76561198000000003', score: 150, persona: 'Operator Scout', timestamp: Date.now() - 3600000 * 12 }
            ];
        } else if (bName === 'deepest_depth_score') {
            entries = [
                { steamId64: '76561198000000001', score: 300450, persona: 'Operator Aegis', timestamp: Date.now() - 3600000 * 4 },
                { steamId64: '76561198000000002', score: 200380, persona: 'Operator Striker', timestamp: Date.now() - 3600000 * 8 },
                { steamId64: '76561198000000003', score: 100120, persona: 'Operator Scout', timestamp: Date.now() - 3600000 * 12 },
                { steamId64: '76561198000000000', score: 100080, persona: 'Agent (You)', timestamp: Date.now() - 60000 }
            ];
        }
        const isAscending = bName === 'fastest_extraction_ms';
        entries.sort((a, b) => {
            return isAscending ? a.score - b.score : b.score - a.score;
        });
        entries.forEach((entry, index) => {
            entry.rank = index + 1;
        });
        safeSet(dbState.leaderboards, bName, entries);
        void saveToDisk();
    }
    return safeGet(dbState.leaderboards, bName) ?? [];
}

export async function saveMockLeaderboard(boardName, entries) {
    const sqlite = getSqliteBackend();
    if (sqlite) return sqlite.saveMockLeaderboard(boardName, entries);

    const bName = String(boardName ?? '').trim();
    if (!isSafeDbKey(bName)) return;
    safeSet(dbState.leaderboards, bName, Array.isArray(entries) ? entries : []);
    await saveToDisk();
}

export function checkIdempotency(requestId) {
    const sqlite = getSqliteBackend();
    if (sqlite) return sqlite.checkIdempotency(requestId);

    if (!requestId) return null;
    const key = String(requestId).trim();
    if (!isSafeDbKey(key)) return null;
    const req = safeGet(dbState.idempotency, key);
    if (!req) return null;
    if (idempotencyExpired(req)) {
        safeDelete(dbState.idempotency, key);
        void saveToDisk();
        return null;
    }
    return req;
}

export async function saveIdempotency(requestId, response, { ttlMs = null } = {}) {
    const sqlite = getSqliteBackend();
    if (sqlite) return sqlite.saveIdempotency(requestId, response, { ttlMs });

    if (!requestId) return;
    const key = String(requestId).trim();
    if (!isSafeDbKey(key)) return;
    const now = Date.now();
    const record = {
        status: response.status ?? 200,
        body: response.body ?? {},
        timestamp: now
    };
    if (Number.isFinite(ttlMs) && ttlMs > 0) {
        record.expiresAt = now + ttlMs;
    }
    safeSet(dbState.idempotency, key, {
        ...record
    });
    await saveToDisk();
}

export async function cleanupExpiredIdempotency({ now = Date.now() } = {}) {
    const sqlite = getSqliteBackend();
    if (sqlite) return sqlite.cleanupExpiredIdempotency({ now });

    let removed = 0;
    for (const [key, record] of Object.entries(dbState.idempotency)) {
        if (idempotencyExpired(record, now)) {
            safeDelete(dbState.idempotency, key);
            removed += 1;
        }
    }
    if (removed > 0) {
        await saveToDisk();
    }
    return {
        removed,
        remaining: Object.keys(dbState.idempotency).length
    };
}

export async function saveRunReceipt(receipt) {
    const sqlite = getSqliteBackend();
    if (sqlite) return sqlite.saveRunReceipt(receipt);

    dbState.receipts.push({
        ...receipt,
        timestamp: Date.now()
    });
    await saveToDisk();
}

export function findPurchaseByTransId(transId) {
    const sqlite = getSqliteBackend();
    if (sqlite) return sqlite.findPurchaseByTransId(transId);

    const purchase = dbState.purchases.find((p) => purchasesMatch(p, { transId })) ?? null;
    return clonePurchase(purchase);
}

export function findPurchaseByRequestId(requestId) {
    const sqlite = getSqliteBackend();
    if (sqlite) return sqlite.findPurchaseByRequestId(requestId);

    const purchase = dbState.purchases.find((p) => purchasesMatch(p, { requestId })) ?? null;
    return clonePurchase(purchase);
}

export function listPurchases({ steamId64 = null, status = null, limit = 100 } = {}) {
    const sqlite = getSqliteBackend();
    if (sqlite) return sqlite.listPurchases({ steamId64, status, limit });

    const steamIdText = normalizeOptionalString(steamId64);
    const statusText = normalizeOptionalString(status);
    const max = Math.min(1000, Math.max(1, Number(limit) || 100));
    return dbState.purchases
        .filter((purchase) => !steamIdText || purchase.steamId64 === steamIdText)
        .filter((purchase) => !statusText || purchase.status === statusText)
        .slice()
        .sort((a, b) => Number(b.updatedAt ?? 0) - Number(a.updatedAt ?? 0))
        .slice(0, max)
        .map(clonePurchase);
}

export async function savePurchaseState(receipt) {
    const sqlite = getSqliteBackend();
    if (sqlite) return sqlite.savePurchaseState(receipt);

    const now = Date.now();
    const index = dbState.purchases.findIndex((purchase) => purchasesMatch(purchase, {
        transId: receipt?.transId,
        orderId: receipt?.orderId,
        requestId: receipt?.requestId
    }));
    const merged = mergePurchaseRecord(index >= 0 ? dbState.purchases[index] : null, receipt, now);
    if (!merged) {
        throw new Error('purchase_state_requires_trans_id_or_order_id');
    }
    if (index >= 0) dbState.purchases[index] = merged;
    else dbState.purchases.push(merged);
    await saveToDisk();
    return clonePurchase(merged);
}

export async function savePurchaseReceipt(receipt) {
    const sqlite = getSqliteBackend();
    if (sqlite) return sqlite.savePurchaseReceipt(receipt);

    return savePurchaseState({
        ...receipt,
        timestamp: Date.now()
    });
}
