import fs from 'node:fs';
import path from 'node:path';

const PURCHASE_EVENT_LIMIT = 50;

function normalizeTimestamp(value, fallback = Date.now()) {
    const timestamp = Number(value);
    return Number.isFinite(timestamp) && timestamp > 0 ? timestamp : fallback;
}

function normalizeOptionalString(value) {
    if (value === undefined || value === null) return null;
    const text = String(value).trim();
    return text ? text : null;
}

function parseJson(value, fallback) {
    try {
        return value ? JSON.parse(value) : fallback;
    } catch {
        return fallback;
    }
}

function stringifyJson(value) {
    return JSON.stringify(value ?? null);
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

function idempotencyExpired(record, now = Date.now()) {
    const expiresAt = Number(record?.expiresAt);
    return Number.isFinite(expiresAt) && expiresAt > 0 && expiresAt <= now;
}

function clonePurchase(purchase) {
    if (!purchase) return null;
    return {
        ...purchase,
        events: Array.isArray(purchase.events) ? purchase.events.map((event) => ({ ...event })) : []
    };
}

function seedLeaderboard(boardName) {
    if (boardName === 'best_run_score') {
        return [
            { steamId64: '76561198000000001', score: 1550, persona: 'Operator Aegis', timestamp: Date.now() - 3600000 * 4 },
            { steamId64: '76561198000000002', score: 1200, persona: 'Operator Striker', timestamp: Date.now() - 3600000 * 8 },
            { steamId64: '76561198000000003', score: 980, persona: 'Operator Scout', timestamp: Date.now() - 3600000 * 12 },
            { steamId64: '76561198000000000', score: 850, persona: 'Agent (You)', timestamp: Date.now() - 60000 }
        ];
    }
    if (boardName === 'survival_time_seconds') {
        return [
            { steamId64: '76561198000000001', score: 320, persona: 'Operator Aegis', timestamp: Date.now() - 3600000 * 4 },
            { steamId64: '76561198000000002', score: 240, persona: 'Operator Striker', timestamp: Date.now() - 3600000 * 8 },
            { steamId64: '76561198000000000', score: 180, persona: 'Agent (You)', timestamp: Date.now() - 60000 },
            { steamId64: '76561198000000003', score: 150, persona: 'Operator Scout', timestamp: Date.now() - 3600000 * 12 }
        ];
    }
    if (boardName === 'deepest_depth_score') {
        return [
            { steamId64: '76561198000000001', score: 300450, persona: 'Operator Aegis', timestamp: Date.now() - 3600000 * 4 },
            { steamId64: '76561198000000002', score: 200380, persona: 'Operator Striker', timestamp: Date.now() - 3600000 * 8 },
            { steamId64: '76561198000000003', score: 100120, persona: 'Operator Scout', timestamp: Date.now() - 3600000 * 12 },
            { steamId64: '76561198000000000', score: 100080, persona: 'Agent (You)', timestamp: Date.now() - 60000 }
        ];
    }
    return [];
}

export function createSqliteBackend({ DatabaseSync, dbFilePath, logger = console } = {}) {
    if (typeof DatabaseSync !== 'function') {
        throw new Error('node:sqlite DatabaseSync is unavailable');
    }
    if (!dbFilePath) {
        throw new Error('SQLite dbFilePath is required');
    }

    let db = null;
    let initialized = false;
    let lastWriteAt = null;
    let lastWriteError = null;
    let lastInitError = null;

    function ensureOpen() {
        if (db) return db;
        fs.mkdirSync(path.dirname(dbFilePath), { recursive: true });
        db = new DatabaseSync(dbFilePath);
        db.exec('PRAGMA foreign_keys = ON');
        db.exec('PRAGMA journal_mode = WAL');
        db.exec('PRAGMA busy_timeout = 5000');
        return db;
    }

    function transaction(fn) {
        const handle = ensureOpen();
        handle.exec('BEGIN IMMEDIATE');
        try {
            const result = fn(handle);
            handle.exec('COMMIT');
            lastWriteAt = Date.now();
            lastWriteError = null;
            return result;
        } catch (err) {
            try {
                handle.exec('ROLLBACK');
            } catch (rollbackErr) {
                logger.warn?.('[hb-db/sqlite] rollback failed:', rollbackErr);
            }
            lastWriteError = err?.message ?? String(err);
            throw err;
        }
    }

    function migrate() {
        const handle = ensureOpen();
        handle.exec(`
            CREATE TABLE IF NOT EXISTS inventories (
                steam_id64 TEXT NOT NULL,
                item_id TEXT NOT NULL,
                itemdefid INTEGER NOT NULL,
                quantity INTEGER NOT NULL DEFAULT 1,
                acquired_at INTEGER NOT NULL,
                properties_json TEXT,
                body_json TEXT NOT NULL,
                PRIMARY KEY (steam_id64, item_id)
            );
            CREATE INDEX IF NOT EXISTS idx_inventories_steam ON inventories (steam_id64);

            CREATE TABLE IF NOT EXISTS inventory_accounts (
                steam_id64 TEXT PRIMARY KEY,
                initialized_at INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS leaderboard_entries (
                board_name TEXT NOT NULL,
                steam_id64 TEXT NOT NULL,
                score INTEGER NOT NULL,
                persona TEXT,
                timestamp INTEGER NOT NULL,
                rank INTEGER,
                body_json TEXT NOT NULL,
                PRIMARY KEY (board_name, steam_id64)
            );
            CREATE INDEX IF NOT EXISTS idx_leaderboard_board_score ON leaderboard_entries (board_name, score);

            CREATE TABLE IF NOT EXISTS idempotency (
                request_id TEXT PRIMARY KEY,
                status INTEGER NOT NULL,
                body_json TEXT NOT NULL,
                timestamp INTEGER NOT NULL,
                expires_at INTEGER
            );

            CREATE TABLE IF NOT EXISTS run_receipts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER NOT NULL,
                body_json TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS purchases (
                trans_id TEXT PRIMARY KEY,
                order_id TEXT,
                request_id TEXT,
                steam_id64 TEXT,
                sku TEXT,
                status TEXT NOT NULL,
                price_usd_cents INTEGER NOT NULL DEFAULT 0,
                reason TEXT,
                steam_state TEXT,
                steam_result TEXT,
                steam_error_code TEXT,
                confirm_url TEXT,
                currency TEXT,
                granted_json TEXT,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                body_json TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_purchases_order ON purchases (order_id);
            CREATE INDEX IF NOT EXISTS idx_purchases_request ON purchases (request_id);
            CREATE INDEX IF NOT EXISTS idx_purchases_steam ON purchases (steam_id64);
            CREATE INDEX IF NOT EXISTS idx_purchases_status ON purchases (status);

            CREATE TABLE IF NOT EXISTS purchase_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                trans_id TEXT NOT NULL,
                status TEXT NOT NULL,
                reason TEXT,
                steam_state TEXT,
                steam_result TEXT,
                steam_error_code TEXT,
                mode TEXT,
                timestamp INTEGER NOT NULL,
                FOREIGN KEY (trans_id) REFERENCES purchases (trans_id) ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS idx_purchase_events_trans ON purchase_events (trans_id, timestamp);
        `);
    }

    function ensureInitialized() {
        if (initialized) return;
        initDb();
    }

    function rowToInventory(row) {
        const body = parseJson(row.body_json, {});
        return {
            ...body,
            itemId: String(row.item_id),
            itemdefid: Number(row.itemdefid),
            quantity: Number(row.quantity) || 1,
            acquiredAt: normalizeTimestamp(row.acquired_at),
            properties: parseJson(row.properties_json, body.properties ?? undefined)
        };
    }

    function writeInventory(steamId64, items) {
        const sId = String(steamId64);
        transaction((handle) => {
            handle.prepare('INSERT OR REPLACE INTO inventory_accounts (steam_id64, initialized_at) VALUES (?, ?)').run(sId, Date.now());
            handle.prepare('DELETE FROM inventories WHERE steam_id64 = ?').run(sId);
            const insert = handle.prepare(`
                INSERT INTO inventories
                    (steam_id64, item_id, itemdefid, quantity, acquired_at, properties_json, body_json)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `);
            for (const item of Array.isArray(items) ? items : []) {
                const itemId = String(item.itemId ?? `mock-inv-${Math.random().toString(36).substring(2, 10)}`);
                const normalized = {
                    ...item,
                    itemId,
                    itemdefid: Number(item.itemdefid),
                    quantity: Number(item.quantity) || 1,
                    acquiredAt: normalizeTimestamp(item.acquiredAt)
                };
                insert.run(
                    sId,
                    itemId,
                    normalized.itemdefid,
                    normalized.quantity,
                    normalized.acquiredAt,
                    stringifyJson(normalized.properties ?? null),
                    stringifyJson(normalized)
                );
            }
        });
    }

    function rowToLeaderboard(row) {
        const body = parseJson(row.body_json, {});
        return {
            ...body,
            steamId64: String(row.steam_id64),
            score: Number(row.score) || 0,
            persona: row.persona ?? body.persona ?? 'Agent',
            timestamp: normalizeTimestamp(row.timestamp),
            rank: Number(row.rank) || body.rank
        };
    }

    function writeLeaderboard(boardName, entries) {
        const name = String(boardName);
        transaction((handle) => {
            handle.prepare('DELETE FROM leaderboard_entries WHERE board_name = ?').run(name);
            const insert = handle.prepare(`
                INSERT INTO leaderboard_entries
                    (board_name, steam_id64, score, persona, timestamp, rank, body_json)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `);
            for (const [index, entry] of (Array.isArray(entries) ? entries : []).entries()) {
                const normalized = {
                    ...entry,
                    steamId64: String(entry.steamId64),
                    score: Number(entry.score) || 0,
                    persona: entry.persona ?? 'Agent',
                    timestamp: normalizeTimestamp(entry.timestamp),
                    rank: Number(entry.rank) || index + 1
                };
                insert.run(
                    name,
                    normalized.steamId64,
                    normalized.score,
                    normalized.persona,
                    normalized.timestamp,
                    normalized.rank,
                    stringifyJson(normalized)
                );
            }
        });
    }

    function eventsForPurchase(transId) {
        return ensureOpen().prepare(`
            SELECT status, reason, steam_state AS steamState, steam_result AS steamResult,
                   steam_error_code AS steamErrorCode, mode, timestamp
            FROM purchase_events
            WHERE trans_id = ?
            ORDER BY timestamp ASC, id ASC
        `).all(String(transId)).map((event) => {
            const cleaned = {
                status: String(event.status),
                timestamp: normalizeTimestamp(event.timestamp)
            };
            for (const field of ['reason', 'steamState', 'steamResult', 'steamErrorCode', 'mode']) {
                const value = normalizeOptionalString(event[field]);
                if (value) cleaned[field] = value;
            }
            return cleaned;
        });
    }

    function rowToPurchase(row) {
        if (!row) return null;
        const body = parseJson(row.body_json, {});
        const purchase = {
            ...body,
            steamId64: normalizeOptionalString(row.steam_id64) ?? '',
            sku: normalizeOptionalString(row.sku) ?? '',
            transId: String(row.trans_id),
            orderId: normalizeOptionalString(row.order_id) ?? String(row.trans_id),
            status: String(row.status),
            priceUsdCents: Number(row.price_usd_cents) || 0,
            requestId: normalizeOptionalString(row.request_id),
            confirmUrl: normalizeOptionalString(row.confirm_url),
            currency: normalizeOptionalString(row.currency) ?? 'USD',
            createdAt: normalizeTimestamp(row.created_at),
            updatedAt: normalizeTimestamp(row.updated_at),
            events: eventsForPurchase(row.trans_id)
        };
        for (const [field, column] of [
            ['reason', 'reason'],
            ['steamState', 'steam_state'],
            ['steamResult', 'steam_result'],
            ['steamErrorCode', 'steam_error_code']
        ]) {
            const value = normalizeOptionalString(row[column]);
            if (value) purchase[field] = value;
            else delete purchase[field];
        }
        const granted = parseJson(row.granted_json, null);
        if (Array.isArray(granted)) purchase.granted = granted;
        if (!purchase.events.length) purchase.events = [purchaseEventFrom(purchase, purchase.updatedAt)];
        return purchase;
    }

    function findPurchaseWhere(sql, value) {
        ensureInitialized();
        const placeholderCount = (sql.match(/\?/g) ?? []).length;
        const values = Array.from({ length: placeholderCount }, () => String(value));
        const row = ensureOpen().prepare(sql).get(...values);
        return clonePurchase(rowToPurchase(row));
    }

    function insertPurchaseEvent(handle, transId, event) {
        handle.prepare(`
            INSERT INTO purchase_events
                (trans_id, status, reason, steam_state, steam_result, steam_error_code, mode, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            String(transId),
            String(event.status ?? 'unknown'),
            normalizeOptionalString(event.reason),
            normalizeOptionalString(event.steamState),
            normalizeOptionalString(event.steamResult),
            normalizeOptionalString(event.steamErrorCode),
            normalizeOptionalString(event.mode),
            normalizeTimestamp(event.timestamp)
        );
    }

    async function initDb() {
        try {
            migrate();
            initialized = true;
            lastInitError = null;
            await cleanupExpiredIdempotency();
            logger.log?.('[hb-db/sqlite] initialized database store at', dbFilePath);
        } catch (err) {
            initialized = false;
            lastInitError = err?.message ?? String(err);
            logger.error?.('[hb-db/sqlite] failed to initialize database store:', err);
        }
    }

    function getDbStatus() {
        ensureInitialized();
        const handle = ensureOpen();
        const idempotencyRecords = handle.prepare('SELECT COUNT(*) AS count FROM idempotency').get().count;
        const purchaseRecords = handle.prepare('SELECT COUNT(*) AS count FROM purchases').get().count;
        return {
            path: dbFilePath,
            storageBackend: 'sqlite',
            envConfigured: Boolean(process.env.HB_DB_STORAGE_PATH || process.env.HB_DB_SQLITE_PATH || process.env.HB_SQLITE_DB_PATH),
            durable: true,
            initialized,
            exists: fs.existsSync(dbFilePath),
            idempotencyRecords: Number(idempotencyRecords) || 0,
            purchaseRecords: Number(purchaseRecords) || 0,
            lastWriteAt,
            lastWriteError,
            lastInitError
        };
    }

    function getMockInventory(steamId64) {
        ensureInitialized();
        const sId = String(steamId64);
        const account = ensureOpen().prepare('SELECT steam_id64 FROM inventory_accounts WHERE steam_id64 = ?').get(sId);
        if (account) {
            const rows = ensureOpen().prepare('SELECT * FROM inventories WHERE steam_id64 = ? ORDER BY acquired_at ASC, item_id ASC').all(sId);
            return rows.map(rowToInventory);
        }

        const seeded = [
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
        ];
        writeInventory(sId, seeded);
        return seeded;
    }

    async function setMockInventory(steamId64, items) {
        ensureInitialized();
        writeInventory(steamId64, items);
    }

    function getMockLeaderboard(boardName) {
        ensureInitialized();
        const name = String(boardName);
        const rows = ensureOpen().prepare('SELECT * FROM leaderboard_entries WHERE board_name = ? ORDER BY rank ASC').all(name);
        if (rows.length > 0) return rows.map(rowToLeaderboard);

        const entries = seedLeaderboard(name);
        const isAscending = name === 'fastest_extraction_ms';
        entries.sort((a, b) => (isAscending ? a.score - b.score : b.score - a.score));
        entries.forEach((entry, index) => {
            entry.rank = index + 1;
        });
        writeLeaderboard(name, entries);
        return entries;
    }

    async function saveMockLeaderboard(boardName, entries) {
        ensureInitialized();
        writeLeaderboard(boardName, entries);
    }

    function checkIdempotency(requestId) {
        if (!requestId) return null;
        ensureInitialized();
        const key = String(requestId);
        const row = ensureOpen().prepare('SELECT * FROM idempotency WHERE request_id = ?').get(key);
        if (!row) return null;
        const record = {
            status: Number(row.status) || 200,
            body: parseJson(row.body_json, {}),
            timestamp: normalizeTimestamp(row.timestamp),
            expiresAt: Number(row.expires_at) || undefined
        };
        if (idempotencyExpired(record)) {
            ensureOpen().prepare('DELETE FROM idempotency WHERE request_id = ?').run(key);
            lastWriteAt = Date.now();
            return null;
        }
        return record;
    }

    async function saveIdempotency(requestId, response, { ttlMs = null } = {}) {
        if (!requestId) return;
        ensureInitialized();
        const now = Date.now();
        const expiresAt = Number.isFinite(ttlMs) && ttlMs > 0 ? now + ttlMs : null;
        transaction((handle) => {
            handle.prepare(`
                INSERT INTO idempotency (request_id, status, body_json, timestamp, expires_at)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(request_id) DO UPDATE SET
                    status = excluded.status,
                    body_json = excluded.body_json,
                    timestamp = excluded.timestamp,
                    expires_at = excluded.expires_at
            `).run(
                String(requestId),
                response.status ?? 200,
                stringifyJson(response.body ?? {}),
                now,
                expiresAt
            );
        });
    }

    async function cleanupExpiredIdempotency({ now = Date.now() } = {}) {
        ensureInitialized();
        const result = ensureOpen().prepare('DELETE FROM idempotency WHERE expires_at IS NOT NULL AND expires_at > 0 AND expires_at <= ?').run(Number(now));
        if (result.changes > 0) lastWriteAt = Date.now();
        const remaining = ensureOpen().prepare('SELECT COUNT(*) AS count FROM idempotency').get().count;
        return {
            removed: Number(result.changes) || 0,
            remaining: Number(remaining) || 0
        };
    }

    async function saveRunReceipt(receipt) {
        ensureInitialized();
        const timestamp = Date.now();
        transaction((handle) => {
            handle.prepare('INSERT INTO run_receipts (timestamp, body_json) VALUES (?, ?)').run(
                timestamp,
                stringifyJson({ ...receipt, timestamp })
            );
        });
    }

    function findPurchaseByTransId(transId) {
        if (!transId) return null;
        return findPurchaseWhere('SELECT * FROM purchases WHERE trans_id = ? OR order_id = ?', transId);
    }

    function findPurchaseByRequestId(requestId) {
        if (!requestId) return null;
        return findPurchaseWhere('SELECT * FROM purchases WHERE request_id = ?', requestId);
    }

    function listPurchases({ steamId64 = null, status = null, limit = 100 } = {}) {
        ensureInitialized();
        const filters = [];
        const values = [];
        if (steamId64) {
            filters.push('steam_id64 = ?');
            values.push(String(steamId64));
        }
        if (status) {
            filters.push('status = ?');
            values.push(String(status));
        }
        const max = Math.min(1000, Math.max(1, Number(limit) || 100));
        const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
        const rows = ensureOpen().prepare(`
            SELECT * FROM purchases
            ${where}
            ORDER BY updated_at DESC
            LIMIT ${max}
        `).all(...values);
        return rows.map((row) => clonePurchase(rowToPurchase(row)));
    }

    async function savePurchaseState(receipt) {
        ensureInitialized();
        const existing = receipt?.transId
            ? findPurchaseByTransId(receipt.transId)
            : (receipt?.requestId ? findPurchaseByRequestId(receipt.requestId) : null);
        const now = Date.now();
        const merged = mergePurchaseRecord(existing, receipt, now);
        if (!merged) {
            throw new Error('purchase_state_requires_trans_id_or_order_id');
        }
        const event = purchaseEventFrom(receipt, now);

        transaction((handle) => {
            handle.prepare(`
                INSERT INTO purchases (
                    trans_id, order_id, request_id, steam_id64, sku, status,
                    price_usd_cents, reason, steam_state, steam_result,
                    steam_error_code, confirm_url, currency, granted_json,
                    created_at, updated_at, body_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(trans_id) DO UPDATE SET
                    order_id = excluded.order_id,
                    request_id = excluded.request_id,
                    steam_id64 = excluded.steam_id64,
                    sku = excluded.sku,
                    status = excluded.status,
                    price_usd_cents = excluded.price_usd_cents,
                    reason = excluded.reason,
                    steam_state = excluded.steam_state,
                    steam_result = excluded.steam_result,
                    steam_error_code = excluded.steam_error_code,
                    confirm_url = excluded.confirm_url,
                    currency = excluded.currency,
                    granted_json = excluded.granted_json,
                    updated_at = excluded.updated_at,
                    body_json = excluded.body_json
            `).run(
                merged.transId,
                merged.orderId,
                merged.requestId,
                merged.steamId64,
                merged.sku,
                merged.status,
                merged.priceUsdCents,
                normalizeOptionalString(merged.reason),
                normalizeOptionalString(merged.steamState),
                normalizeOptionalString(merged.steamResult),
                normalizeOptionalString(merged.steamErrorCode),
                normalizeOptionalString(merged.confirmUrl),
                normalizeOptionalString(merged.currency),
                Array.isArray(merged.granted) ? stringifyJson(merged.granted) : null,
                merged.createdAt,
                merged.updatedAt,
                stringifyJson(merged)
            );
            insertPurchaseEvent(handle, merged.transId, event);
        });

        return findPurchaseByTransId(merged.transId);
    }

    async function savePurchaseReceipt(receipt) {
        return savePurchaseState({
            ...receipt,
            timestamp: Date.now()
        });
    }

    function close() {
        if (!db) return;
        db.close();
        db = null;
        initialized = false;
    }

    return {
        initDb,
        getDbStatus,
        getMockInventory,
        setMockInventory,
        getMockLeaderboard,
        saveMockLeaderboard,
        checkIdempotency,
        saveIdempotency,
        cleanupExpiredIdempotency,
        saveRunReceipt,
        findPurchaseByTransId,
        findPurchaseByRequestId,
        listPurchases,
        savePurchaseState,
        savePurchaseReceipt,
        close
    };
}
