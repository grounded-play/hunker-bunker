// RGB save record, per docs/mini-games/rgb/unlock-and-integration.md. Uses
// the repo's existing hb_* localStorage convention (the Electron save
// bridge mirrors every hb_* key to disk) so this record rides the existing
// save-file path without a second persistence system.

export const RGB_SAVE_KEY = 'hb_minigame_rgb_v1';

const CURRENT_VERSION = 1;

function createDefaultSave() {
    return {
        version: CURRENT_VERSION,
        unlocked: false,
        checkpoint: 'parking_lot',
        endingsSeen: [],
        gameOversSeen: [],
        settings: { hints: 'standard' },
        run: {
            timeBand: 0,
            pain: 'stable',
            evidence: [],
            inventory: [],
            flags: {}
        }
    };
}

function isPlainObject(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function migrateRgbSave(raw) {
    if (!isPlainObject(raw) || raw.version !== CURRENT_VERSION) {
        return createDefaultSave();
    }

    const fallback = createDefaultSave();
    return {
        version: CURRENT_VERSION,
        unlocked: Boolean(raw.unlocked),
        checkpoint: typeof raw.checkpoint === 'string' ? raw.checkpoint : fallback.checkpoint,
        endingsSeen: Array.isArray(raw.endingsSeen) ? [...new Set(raw.endingsSeen)] : [],
        gameOversSeen: Array.isArray(raw.gameOversSeen) ? [...new Set(raw.gameOversSeen)] : [],
        settings: {
            hints: typeof raw.settings?.hints === 'string' ? raw.settings.hints : fallback.settings.hints
        },
        run: {
            timeBand: Number.isFinite(raw.run?.timeBand) ? raw.run.timeBand : fallback.run.timeBand,
            pain: typeof raw.run?.pain === 'string' ? raw.run.pain : fallback.run.pain,
            evidence: Array.isArray(raw.run?.evidence) ? [...raw.run.evidence] : [],
            inventory: Array.isArray(raw.run?.inventory) ? [...raw.run.inventory] : [],
            flags: isPlainObject(raw.run?.flags) ? { ...raw.run.flags } : {}
        }
    };
}

export function loadRgbSave(storage) {
    try {
        const rawText = storage?.getItem(RGB_SAVE_KEY);
        if (!rawText) return createDefaultSave();
        return migrateRgbSave(JSON.parse(rawText));
    } catch {
        return createDefaultSave();
    }
}

export function saveRgbSave(storage, save) {
    try {
        storage?.setItem(RGB_SAVE_KEY, JSON.stringify(save));
    } catch {
        // best-effort, matches ProfileManager's persistence contract
    }
}

export function markUnlocked(save) {
    return { ...save, unlocked: true };
}

export function saveCheckpoint(save, checkpoint) {
    return { ...save, checkpoint };
}

export function recordEnding(save, endingId) {
    if (save.endingsSeen.includes(endingId)) return save;
    return { ...save, endingsSeen: [...save.endingsSeen, endingId] };
}

export function recordGameOver(save, gameOverId) {
    if (save.gameOversSeen.includes(gameOverId)) return save;
    return { ...save, gameOversSeen: [...save.gameOversSeen, gameOverId] };
}
