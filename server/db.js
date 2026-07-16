import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Overridable so parallel test files don't race each other writing the same
// physical file (each vitest file runs in its own module registry but they
// all still hit the same real path on disk otherwise).
function getDbFilePath() {
    return process.env.HB_DB_STORAGE_PATH || path.join(__dirname, 'db_storage.json');
}

let dbState = {
    inventories: {}, // steamid64 -> array of { itemId, itemdefid, quantity, acquiredAt, properties }
    leaderboards: {}, // boardName -> array of { steamId64, score, persona, timestamp }
    idempotency: {}, // requestId -> { status, body, timestamp }
    receipts: [], // array of run receipts
    purchases: [] // array of store purchase receipts (steamId64, sku, transId, status, timestamp)
};

let writeQueue = Promise.resolve();
let dbInitialized = false;
let lastWriteAt = null;
let lastWriteError = null;
let lastInitError = null;

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

export async function initDb() {
    const dbFilePath = getDbFilePath();
    try {
        if (fs.existsSync(dbFilePath)) {
            const content = await fs.promises.readFile(dbFilePath, 'utf8');
            // Merge onto the defaults rather than replacing dbState outright,
            // so a store file written before a new top-level key existed
            // (e.g. `purchases`) doesn't wipe that key back to undefined.
            dbState = { ...dbState, ...JSON.parse(content) };
        } else {
            await saveToDisk();
        }
        dbInitialized = true;
        lastInitError = null;
        console.log('[hb-db] initialized database store at', dbFilePath);
    } catch (err) {
        lastInitError = err?.message ?? String(err);
        console.error('[hb-db] failed to initialize database store:', err);
    }
}

export function getDbStatus() {
    const dbFilePath = getDbFilePath();
    const envConfigured = Boolean(process.env.HB_DB_STORAGE_PATH);
    return {
        path: dbFilePath,
        envConfigured,
        durable: envConfigured,
        initialized: dbInitialized,
        exists: fs.existsSync(dbFilePath),
        lastWriteAt,
        lastWriteError,
        lastInitError
    };
}

export function getMockInventory(steamId64) {
    const sId = String(steamId64);
    if (!dbState.inventories[sId]) {
        // Seed default items for developers to start with
        dbState.inventories[sId] = [
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
        void saveToDisk();
    }
    return dbState.inventories[sId];
}

export async function setMockInventory(steamId64, items) {
    const sId = String(steamId64);
    dbState.inventories[sId] = Array.isArray(items) ? items : [];
    await saveToDisk();
}

export function getMockLeaderboard(boardName) {
    if (!dbState.leaderboards[boardName]) {
        if (boardName === 'best_run_score') {
            dbState.leaderboards[boardName] = [
                { steamId64: '76561198000000001', score: 1550, persona: 'Operator Aegis', timestamp: Date.now() - 3600000 * 4 },
                { steamId64: '76561198000000002', score: 1200, persona: 'Operator Striker', timestamp: Date.now() - 3600000 * 8 },
                { steamId64: '76561198000000003', score: 980, persona: 'Operator Scout', timestamp: Date.now() - 3600000 * 12 },
                { steamId64: '76561198000000000', score: 850, persona: 'Agent (You)', timestamp: Date.now() - 60000 }
            ];
        } else if (boardName === 'survival_time_seconds') {
            dbState.leaderboards[boardName] = [
                { steamId64: '76561198000000001', score: 320, persona: 'Operator Aegis', timestamp: Date.now() - 3600000 * 4 },
                { steamId64: '76561198000000002', score: 240, persona: 'Operator Striker', timestamp: Date.now() - 3600000 * 8 },
                { steamId64: '76561198000000000', score: 180, persona: 'Agent (You)', timestamp: Date.now() - 60000 },
                { steamId64: '76561198000000003', score: 150, persona: 'Operator Scout', timestamp: Date.now() - 3600000 * 12 }
            ];
        } else if (boardName === 'deepest_depth_score') {
            dbState.leaderboards[boardName] = [
                { steamId64: '76561198000000001', score: 300450, persona: 'Operator Aegis', timestamp: Date.now() - 3600000 * 4 },
                { steamId64: '76561198000000002', score: 200380, persona: 'Operator Striker', timestamp: Date.now() - 3600000 * 8 },
                { steamId64: '76561198000000003', score: 100120, persona: 'Operator Scout', timestamp: Date.now() - 3600000 * 12 },
                { steamId64: '76561198000000000', score: 100080, persona: 'Agent (You)', timestamp: Date.now() - 60000 }
            ];
        } else {
            dbState.leaderboards[boardName] = [];
        }
        const isAscending = boardName === 'fastest_extraction_ms';
        dbState.leaderboards[boardName].sort((a, b) => {
            return isAscending ? a.score - b.score : b.score - a.score;
        });
        dbState.leaderboards[boardName].forEach((entry, index) => {
            entry.rank = index + 1;
        });
        void saveToDisk();
    }
    return dbState.leaderboards[boardName];
}

export async function saveMockLeaderboard(boardName, entries) {
    dbState.leaderboards[boardName] = Array.isArray(entries) ? entries : [];
    await saveToDisk();
}

export function checkIdempotency(requestId) {
    if (!requestId) return null;
    const req = dbState.idempotency[String(requestId)];
    if (!req) return null;
    return req;
}

export async function saveIdempotency(requestId, response) {
    if (!requestId) return;
    dbState.idempotency[String(requestId)] = {
        status: response.status ?? 200,
        body: response.body ?? {},
        timestamp: Date.now()
    };
    await saveToDisk();
}

export async function saveRunReceipt(receipt) {
    dbState.receipts.push({
        ...receipt,
        timestamp: Date.now()
    });
    await saveToDisk();
}

export function findPurchaseByTransId(transId) {
    return dbState.purchases.find((p) => p.transId === String(transId)) ?? null;
}

export async function savePurchaseReceipt(receipt) {
    dbState.purchases.push({
        ...receipt,
        timestamp: Date.now()
    });
    await saveToDisk();
}
