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
    let importedLegacyCampaign = false;
    for (const [key, value] of Object.entries(data)) {
        if (key.startsWith(SAVE_PREFIX) && typeof value === 'string') {
            try {
                store.setItem(key, value);
                written++;
                if (CAMPAIGN_SPECIFIC_STORAGE_KEYS.includes(key) && key !== 'hb_campaign_world_v1') {
                    try {
                        const parsed = JSON.parse(value);
                        importedLegacyCampaign ||= Boolean(parsed && typeof parsed === 'object' && !Array.isArray(parsed));
                    } catch { /* malformed records do not identify a legacy campaign */ }
                }
            } catch { /* ignore */ }
        }
    }
    // Older exports had story/day state but no world identity. Keeping this
    // device's previous seed and opened doors would attach a different world's
    // progress to that imported campaign. Its first launch creates an identity.
    if (importedLegacyCampaign && !Object.hasOwn(data, 'hb_campaign_world_v1')) {
        try { store.removeItem('hb_campaign_world_v1'); } catch { /* best effort */ }
    }
    return written;
}

import { createBlackBoxStorage } from './blackBox.js';

// Campaign-specific keys that reset when starting a genuine NEW GAME / NEW CAMPAIGN.
// Permanent keys (hb_profile, hb_season_pass, hb_item_ownership, hb_achievements,
// hb_bank_v1, hb_fabricator_v1, hb_codex, hb_story_archive, hb_loadout) are preserved.
export const CAMPAIGN_SPECIFIC_STORAGE_KEYS = Object.freeze([
    'hb_arc_v1',
    'hb_act2_v1',
    'hb_side_stories_v1',
    'hb_day_cycle',
    'hb_fatigue',
    'hb_overnight_v1',
    'hb_wanderer_state_v1',
    'hb_bounties_v1',
    'hb_campaign_ledger_v1',
    'hb_campaign_world_v1',
    // Remove pre-versioned campaign records too, so an old save cannot be
    // resurrected by a migration after the player explicitly starts over.
    'hb_arc_state',
    'hb_act2_state',
    'hb_side_stories'
]);

export const ACTIVE_ATTEMPT_STORAGE_KEYS = Object.freeze([
    'hb_run_checkpoint_v1',
    'hb_run_checkpoint',
    'hb_run_modifiers',
    'hb_expedition_suspend_v1',
    'hb_expedition_resume_claim_v1'
]);

function removeStorageKeys(store, keys) {
    let removed = 0;
    for (const key of keys) {
        try {
            if (store.getItem(key) !== null) {
                store.removeItem(key);
                removed++;
            }
        } catch {
            // Ignore inaccessible records.
        }
    }
    return removed;
}

/**
 * End only the in-flight attempt. Campaign story state and lifetime career
 * records remain intact. Any unrecovered Black Box is retired while its loss
 * archive remains available to career/debriefing surfaces.
 */
export function resetActiveAttempt(storage = null) {
    const store = getStorage(storage);
    if (!store) return 0;
    const removed = removeStorageKeys(store, ACTIVE_ATTEMPT_STORAGE_KEYS);
    try { createBlackBoxStorage({ storage: store }).recoverActive(); } catch { /* best effort */ }
    return removed;
}

/**
 * Start a new campaign. Resets campaign narrative linchpins, story points,
 * and active run checkpoints while preserving lifetime career stats, owned
 * inventory, Dossier progress, unlocked achievements, and bank salvage.
 */
export function startNewCampaign(storage = null) {
    const store = getStorage(storage);
    if (!store) return 0;
    return resetActiveAttempt(store) + removeStorageKeys(store, CAMPAIGN_SPECIFIC_STORAGE_KEYS);
}

// Clear only persistent Hunker Bunker save records. Preferences such as audio
// mix and key bindings intentionally live outside hb_* and survive a new game.
export function clearSaveData(storage = null) {
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

// Explicit name used by destructive settings UI. Keep clearSaveData as a
// compatibility alias for existing integrations and imported save tooling.
export function resetAllDataFactory(storage = null) {
    return clearSaveData(storage);
}
