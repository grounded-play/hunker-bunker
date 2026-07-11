// ── Codex store (meta-progression) ────────────────────────────
// doc 11 §3.2: turn the rich existing enemies/terminals/lore into a "learn the
// world" meta layer. Entries are discovered by encountering things in a run and
// persist across runs in localStorage (the repo's `hb_*` convention). Pure +
// testable; the catalog of entries lives in src/data/codex.js.

import { CLASS_WRECKAGE_LOGS, LORE_METADATA } from './data/codex.js';

const STORAGE_KEY = 'hb_codex_v1';
export const CHEN_CONFESSION_LOG_KEY = 'B03';
export const CAVE_STASIS_BOX_LOG_KEY = 'C09';
export const SPECIMEN_0047_ORIGIN_CODEX_ID = 'specimen_0047';

function defaultState() {
    return { entries: {} };
}

export class CodexStore {
    constructor({ storage = null, storageKey = STORAGE_KEY, now = () => Date.now() } = {}) {
        this.storage = storage ?? (typeof window !== 'undefined' ? window.localStorage : null);
        this.storageKey = storageKey;
        this.now = now;
        this.state = this.load();
    }

    load() {
        try {
            const raw = this.storage?.getItem(this.storageKey);
            if (!raw) return defaultState();
            const parsed = JSON.parse(raw);
            return { entries: parsed?.entries && typeof parsed.entries === 'object' ? parsed.entries : {} };
        } catch {
            return defaultState();
        }
    }

    save() {
        try {
            this.storage?.setItem(this.storageKey, JSON.stringify(this.state));
        } catch {
            // best-effort
        }
    }

    has(id) {
        return Boolean(this.state.entries[id]);
    }

    // Record an encounter. Returns true the FIRST time an id is discovered (so
    // callers can fire a "CODEX UPDATED" toast only on genuinely new entries).
    record(id, metadata = null) {
        if (!id) return false;
        const existing = this.state.entries[id];
        if (existing) {
            existing.count = (existing.count ?? 1) + 1;
            existing.lastSeen = this.now();
            if (metadata && typeof metadata === 'object') {
                existing.metadata = { ...(existing.metadata ?? {}), ...metadata };
            }
            this.save();
            return false;
        }
        const firstSeen = this.now();
        this.state.entries[id] = metadata && typeof metadata === 'object'
            ? { count: 1, firstSeen, lastSeen: firstSeen, metadata: { ...metadata } }
            : { count: 1, firstSeen };
        this.save();
        return true;
    }

    getEntry(id) {
        return this.state.entries[id] ?? null;
    }

    getDiscoveredIds() {
        return Object.keys(this.state.entries);
    }

    getDiscoveredCount() {
        return this.getDiscoveredIds().length;
    }

    reset() {
        this.state = defaultState();
        this.save();
    }
}

function normalizeLogKeySet(foundLogs = []) {
    if (foundLogs instanceof Set) return foundLogs;
    if (Array.isArray(foundLogs)) {
        return new Set(foundLogs.map((key) => String(key ?? '').trim()).filter(Boolean));
    }
    if (foundLogs?.logsFound) return normalizeLogKeySet(foundLogs.logsFound);
    return new Set();
}

export function isSpecimen0047OriginFound(foundLogs = []) {
    const keys = normalizeLogKeySet(foundLogs);
    return keys.has(CHEN_CONFESSION_LOG_KEY) && keys.has(CAVE_STASIS_BOX_LOG_KEY);
}

export function recordSpecimen0047OriginIfFound(store, foundLogs = []) {
    if (!store || typeof store.record !== 'function') return false;
    if (!isSpecimen0047OriginFound(foundLogs)) return false;
    return store.record(SPECIMEN_0047_ORIGIN_CODEX_ID, {
        gate: 'origin_weld',
        requiredLogs: [CHEN_CONFESSION_LOG_KEY, CAVE_STASIS_BOX_LOG_KEY],
        chenConfession: LORE_METADATA[CHEN_CONFESSION_LOG_KEY] ?? null,
        stasisBox: LORE_METADATA[CAVE_STASIS_BOX_LOG_KEY] ?? null
    });
}

export function getClassWreckageLog(playerType = 'SCOUT', discoveredAt = {}) {
    const key = String(playerType ?? '').trim().toUpperCase();
    const log = CLASS_WRECKAGE_LOGS[key] ?? CLASS_WRECKAGE_LOGS.SCOUT;
    const runtimeCoords = Number.isFinite(discoveredAt?.x) && Number.isFinite(discoveredAt?.z)
        ? { sector: discoveredAt.sector ?? discoveredAt.biome ?? log.coords.sector, x: discoveredAt.x, z: discoveredAt.z }
        : log.coords;
    return Object.freeze({
        ...log,
        coords: Object.freeze({ ...runtimeCoords }),
        discoveredAt: discoveredAt?.date ?? null
    });
}

export const codexStore = new CodexStore();
