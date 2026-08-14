// ── Operator Profile + Save Codes ─────────────────────────────
// The no-backend identity tier from .claude_work/01-feature-port-from-mothership.md
// §B.1: a local callsign + stable profile id wrapping the existing persistent
// state, plus export/import of a portable save code so progress can move between
// devices/browsers without a server. A later cloud-sync tier (§B.2) can layer on
// top of this same snapshot format.

const PROFILE_KEY = 'hb_profile_v1';
const SAVE_PREFIX = 'hb_';            // every Hunker Bunker persistent key
const SAVE_MAGIC = 'HBSAVE1';          // versioned save-code envelope tag

function getStorage(storage) {
    return storage ?? (typeof window !== 'undefined' ? window.localStorage : null);
}

function randomId() {
    return 'op-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

function sanitizeCallsign(raw) {
    return String(raw ?? '')
        .toUpperCase()
        .replace(/[^A-Z0-9 _-]/g, '')
        .trim()
        .slice(0, 16);
}

export class ProfileManager {
    constructor({ storage = null } = {}) {
        this.storage = getStorage(storage);
        this.state = this.load();
        // Persist immediately so a freshly generated profile id is stable across reloads.
        this.save();
    }

    load() {
        try {
            const raw = this.storage?.getItem(PROFILE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && typeof parsed === 'object') {
                    return {
                        callsign: sanitizeCallsign(parsed.callsign) || 'AGENT',
                        profileId: typeof parsed.profileId === 'string' ? parsed.profileId : randomId(),
                        createdAt: Number.isFinite(parsed.createdAt) ? parsed.createdAt : Date.now(),
                        multiplayerMatches: Number(parsed.multiplayerMatches) || 0,
                        multiplayerVictories: Number(parsed.multiplayerVictories) || 0,
                        tradesCompleted: Number(parsed.tradesCompleted) || 0,
                        coopExpeditions: Number(parsed.coopExpeditions) || 0,
                        pvpDuels: Number(parsed.pvpDuels) || 0
                    };
                }
            }
        } catch {
            // fall through to a fresh profile
        }
        return {
            callsign: 'AGENT',
            profileId: randomId(),
            createdAt: Date.now(),
            multiplayerMatches: 0,
            multiplayerVictories: 0,
            tradesCompleted: 0,
            coopExpeditions: 0,
            pvpDuels: 0
        };
    }

    save() {
        try {
            this.storage?.setItem(PROFILE_KEY, JSON.stringify(this.state));
        } catch {
            // best-effort
        }
    }

    getCallsign() { return this.state.callsign; }
    getProfileId() { return this.state.profileId; }

    setCallsign(raw) {
        const clean = sanitizeCallsign(raw) || 'AGENT';
        this.state.callsign = clean;
        this.save();
        return clean;
    }

    getStats() {
        return {
            multiplayerMatches: Number(this.state.multiplayerMatches || 0),
            multiplayerVictories: Number(this.state.multiplayerVictories || 0),
            tradesCompleted: Number(this.state.tradesCompleted || 0),
            coopExpeditions: Number(this.state.coopExpeditions || 0),
            pvpDuels: Number(this.state.pvpDuels || 0)
        };
    }

    recordMultiplayerRun({ mode = 'coop', isVictory = false } = {}) {
        this.state.multiplayerMatches = (this.state.multiplayerMatches || 0) + 1;
        if (isVictory) {
            this.state.multiplayerVictories = (this.state.multiplayerVictories || 0) + 1;
        }
        if (mode === 'pvp') {
            this.state.pvpDuels = (this.state.pvpDuels || 0) + 1;
        } else {
            this.state.coopExpeditions = (this.state.coopExpeditions || 0) + 1;
        }
        this.save();
        return this.getStats();
    }

    recordTradeCompleted() {
        this.state.tradesCompleted = (this.state.tradesCompleted || 0) + 1;
        this.save();
        return this.getStats();
    }
}

// Base64 helpers that work in browser and node (tests).
function toBase64(str) {
    if (typeof btoa === 'function') return btoa(unescape(encodeURIComponent(str)));
    return globalThis.Buffer.from(str, 'utf-8').toString('base64');
}
function fromBase64(b64) {
    if (typeof atob === 'function') return decodeURIComponent(escape(atob(b64)));
    return globalThis.Buffer.from(b64, 'base64').toString('utf-8');
}

// Snapshot every hb_ persistent key into a portable, base64 save code.
export function exportSaveCode(storage = null) {
    const store = getStorage(storage);
    if (!store) return '';
    const data = {};
    const len = store.length ?? 0;
    for (let i = 0; i < len; i++) {
        const key = store.key(i);
        if (key && key.startsWith(SAVE_PREFIX)) {
            data[key] = store.getItem(key);
        }
    }
    return SAVE_MAGIC + ':' + toBase64(JSON.stringify(data));
}

// Restore a save code into storage. Returns the number of keys written, or -1
// if the code is malformed (caller surfaces an error).
export function importSaveCode(code, storage = null) {
    const store = getStorage(storage);
    if (!store || typeof code !== 'string') return -1;
    const trimmed = code.trim();
    const prefix = SAVE_MAGIC + ':';
    if (!trimmed.startsWith(prefix)) return -1;
    let data;
    try {
        data = JSON.parse(fromBase64(trimmed.slice(prefix.length)));
    } catch {
        return -1;
    }
    if (!data || typeof data !== 'object') return -1;

    let written = 0;
    for (const [key, value] of Object.entries(data)) {
        if (key.startsWith(SAVE_PREFIX) && typeof value === 'string') {
            try { store.setItem(key, value); written++; } catch { /* ignore */ }
        }
    }
    return written;
}

import { blackBoxStore } from './blackBox.js';

// Clear only persistent Hunker Bunker save records. Preferences such as audio
// mix and key bindings intentionally live outside hb_* and survive a new game.
export function clearSaveData(storage = null) {
    try { blackBoxStore.clear(); } catch { /* best effort */ }
    const store = getStorage(storage);
    if (!store) return 0;

    let removed = 0;
    for (let i = (store.length ?? 0) - 1; i >= 0; i--) {
        const key = store.key(i);
        if (key?.startsWith(SAVE_PREFIX)) {
            try {
                store.removeItem(key);
                removed++;
            } catch {
                // Ignore inaccessible records; callers still get best-effort count.
            }
        }
    }
    return removed;
}
