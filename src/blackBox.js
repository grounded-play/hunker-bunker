const STORAGE_KEY = 'hb_black_box_v1';

export const EMPTY_BLACK_BOX_STATE = Object.freeze({
    active: false,
    x: 0,
    z: 0,
    depth: 0,
    classType: 'SCOUT',
    salvage: Object.freeze({ tech: 0, coin: 0, med: 0 }),
    cause: 'unknown',
    timestamp: 0,
    log: '',
    archive: Object.freeze([])
});

function cloneSalvage(salvage = {}) {
    return {
        tech: Math.max(0, Math.floor(Number(salvage.tech) || 0)),
        coin: Math.max(0, Math.floor(Number(salvage.coin) || 0)),
        med: Math.max(0, Math.floor(Number(salvage.med) || 0))
    };
}

function normalizeArchive(archive) {
    return Array.isArray(archive)
        ? archive.filter((entry) => entry && typeof entry === 'object').map((entry) => ({ ...entry }))
        : [];
}

export function createBlackBoxStorage({ storage = null, storageKey = STORAGE_KEY, now = () => Date.now() } = {}) {
    return {
        storage,
        storageKey,
        now,

        load() {
            try {
                const raw = this.storage?.getItem(this.storageKey);
                if (!raw) return { ...EMPTY_BLACK_BOX_STATE, salvage: cloneSalvage(), archive: [] };
                const parsed = JSON.parse(raw);
                return {
                    active: Boolean(parsed?.active),
                    x: Number.isFinite(parsed?.x) ? parsed.x : 0,
                    z: Number.isFinite(parsed?.z) ? parsed.z : 0,
                    depth: Number.isFinite(parsed?.depth) ? Math.max(0, Math.floor(parsed.depth)) : 0,
                    classType: typeof parsed?.classType === 'string' ? parsed.classType : 'SCOUT',
                    salvage: cloneSalvage(parsed?.salvage),
                    cause: typeof parsed?.cause === 'string' ? parsed.cause : 'unknown',
                    timestamp: Number.isFinite(parsed?.timestamp) ? parsed.timestamp : 0,
                    log: typeof parsed?.log === 'string' ? parsed.log : '',
                    archive: normalizeArchive(parsed?.archive)
                };
            } catch {
                return { ...EMPTY_BLACK_BOX_STATE, salvage: cloneSalvage(), archive: [] };
            }
        },

        save(state) {
            const normalized = {
                ...state,
                salvage: cloneSalvage(state?.salvage),
                archive: normalizeArchive(state?.archive)
            };
            try {
                this.storage?.setItem(this.storageKey, JSON.stringify(normalized));
            } catch {
                // localStorage may be unavailable; gameplay continues without persistence.
            }
            return normalized;
        },

        recordDeath({ x = 0, z = 0, depth = 0, classType = 'SCOUT', salvage = {}, cause = 'unknown', log = '' } = {}) {
            const previous = this.load();
            const timestamp = this.now();
            const entry = {
                x: Number.isFinite(x) ? x : 0,
                z: Number.isFinite(z) ? z : 0,
                depth: Number.isFinite(depth) ? Math.max(0, Math.floor(depth)) : 0,
                classType,
                salvage: cloneSalvage(salvage),
                cause,
                timestamp,
                log: log || `Operator ${classType} lost at depth ${Math.round(depth)}. Cause: ${cause}.`
            };
            return this.save({
                active: true,
                ...entry,
                archive: [...normalizeArchive(previous.archive), entry]
            });
        },

        recoverActive() {
            const state = this.load();
            if (!state.active) return null;
            this.save({ ...state, active: false, salvage: cloneSalvage() });
            return state;
        },

        clear() {
            return this.save({ ...EMPTY_BLACK_BOX_STATE, salvage: cloneSalvage(), archive: [] });
        }
    };
}

export const blackBoxStore = createBlackBoxStorage({
    storage: typeof window !== 'undefined' ? window.localStorage : null
});
