export const STEAM_ACHIEVEMENT_SYNC_KEY = 'hb_steam_achievement_sync_v1';

function readState(storage) {
    try {
        const parsed = JSON.parse(storage?.getItem(STEAM_ACHIEVEMENT_SYNC_KEY) ?? 'null');
        if (!parsed || typeof parsed !== 'object') throw new Error('empty');
        return {
            accountId: parsed.accountId ? String(parsed.accountId) : null,
            generation: Math.max(0, Number(parsed.generation) || 0),
            pending: [...new Set(Array.isArray(parsed.pending) ? parsed.pending.map(String) : [])],
            acknowledged: [...new Set(Array.isArray(parsed.acknowledged) ? parsed.acknowledged.map(String) : [])]
        };
    } catch {
        return { accountId: null, generation: 0, pending: [], acknowledged: [] };
    }
}

function saveState(storage, state) {
    try { storage?.setItem(STEAM_ACHIEVEMENT_SYNC_KEY, JSON.stringify(state)); } catch { /* best effort */ }
}

export class SteamAchievementSync {
    constructor({ storage = null, bridge = null } = {}) {
        this.storage = storage;
        this.bridge = bridge;
        this.state = readState(storage);
        this.flushing = null;
    }

    getStatus() {
        return { ...this.state, pending: [...this.state.pending], acknowledged: [...this.state.acknowledged] };
    }

    async bindCurrentAccount() {
        const identity = await this.bridge?.getSteamIdentity?.();
        const accountId = identity?.steamId64 ?? identity?.accountId;
        if (!identity?.active || !accountId) return { ok: false, reason: identity?.reason ?? 'steam_not_active' };
        const normalized = String(accountId);
        if (this.state.accountId && this.state.accountId !== normalized) {
            return { ok: false, reason: 'account_mismatch', expected: this.state.accountId, actual: normalized };
        }
        this.state.accountId = normalized;
        saveState(this.storage, this.state);
        return { ok: true, accountId: normalized };
    }

    async enqueue(key) {
        const binding = await this.bindCurrentAccount();
        if (!binding.ok) return { ...binding, queued: false };
        const normalized = String(key ?? '').trim();
        if (!normalized) return { ok: false, reason: 'invalid_key', queued: false };
        if (!this.state.acknowledged.includes(normalized) && !this.state.pending.includes(normalized)) {
            this.state.pending.push(normalized);
            saveState(this.storage, this.state);
        }
        return this.flush();
    }

    async reconcile(keys = []) {
        const binding = await this.bindCurrentAccount();
        if (!binding.ok) return binding;
        for (const key of keys.map(String)) {
            if (!this.state.acknowledged.includes(key) && !this.state.pending.includes(key)) this.state.pending.push(key);
        }
        saveState(this.storage, this.state);
        return this.flush();
    }

    async flush() {
        if (this.flushing) return this.flushing;
        this.flushing = (async () => {
            const binding = await this.bindCurrentAccount();
            if (!binding.ok) return { ...binding, pending: this.state.pending.length };
            const failed = [];
            for (const key of [...this.state.pending]) {
                let result;
                try { result = await this.bridge?.unlockAchievement?.(key, this.state.generation); } catch (error) {
                    result = { ok: false, reason: 'bridge_error', message: error?.message };
                }
                if (!result?.ok) {
                    failed.push({ key, reason: result?.reason ?? 'not_acknowledged' });
                    continue;
                }
                this.state.pending = this.state.pending.filter((pendingKey) => pendingKey !== key);
                if (!this.state.acknowledged.includes(key)) this.state.acknowledged.push(key);
                saveState(this.storage, this.state);
            }
            return { ok: failed.length === 0, pending: this.state.pending.length, failed };
        })().finally(() => { this.flushing = null; });
        return this.flushing;
    }

    markReset(generation) {
        this.state.generation = Math.max(this.state.generation + 1, Number(generation) || 0);
        this.state.pending = [];
        this.state.acknowledged = [];
        saveState(this.storage, this.state);
        return this.getStatus();
    }
}
