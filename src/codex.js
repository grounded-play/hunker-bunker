// ── Codex store (meta-progression) ────────────────────────────
// doc 11 §3.2: turn the rich existing enemies/terminals/lore into a "learn the
// world" meta layer. Entries are discovered by encountering things in a run and
// persist across runs in localStorage (the repo's `hb_*` convention). Pure +
// testable; the catalog of entries lives in src/data/codex.js.

const STORAGE_KEY = 'hb_codex_v1';

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
    record(id) {
        if (!id) return false;
        const existing = this.state.entries[id];
        if (existing) {
            existing.count = (existing.count ?? 1) + 1;
            this.save();
            return false;
        }
        this.state.entries[id] = { count: 1, firstSeen: this.now() };
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

export const codexStore = new CodexStore();
