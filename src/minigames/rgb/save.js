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
        unlockedChapters: ['parking_lot'],
        chapterSnapshots: {},
        endingsSeen: [],
        gameOversSeen: [],
        discoveredBeats: [],
        settings: { hints: 'standard' },
        run: {
            timeBand: 0,
            pain: 'stable',
            evidence: [],
            inventory: [],
            routeHistory: [],
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
    const unlockedChapters = Array.isArray(raw.unlockedChapters) && raw.unlockedChapters.length > 0
        ? [...new Set(raw.unlockedChapters)]
        : fallback.unlockedChapters;

    const chapterSnapshots = isPlainObject(raw.chapterSnapshots) ? { ...raw.chapterSnapshots } : {};

    return {
        version: CURRENT_VERSION,
        unlocked: Boolean(raw.unlocked),
        checkpoint: typeof raw.checkpoint === 'string' ? raw.checkpoint : fallback.checkpoint,
        unlockedChapters,
        chapterSnapshots,
        endingsSeen: Array.isArray(raw.endingsSeen) ? [...new Set(raw.endingsSeen)] : [],
        gameOversSeen: Array.isArray(raw.gameOversSeen) ? [...new Set(raw.gameOversSeen)] : [],
        discoveredBeats: Array.isArray(raw.discoveredBeats)
            ? [...new Set(raw.discoveredBeats.filter((id) => typeof id === 'string'))]
            : [],
        settings: {
            hints: typeof raw.settings?.hints === 'string' ? raw.settings.hints : fallback.settings.hints
        },
        run: {
            timeBand: Number.isFinite(raw.run?.timeBand) ? raw.run.timeBand : fallback.run.timeBand,
            pain: typeof raw.run?.pain === 'string' ? raw.run.pain : fallback.run.pain,
            evidence: Array.isArray(raw.run?.evidence) ? [...raw.run.evidence] : [],
            inventory: Array.isArray(raw.run?.inventory) ? [...raw.run.inventory] : [],
            routeHistory: Array.isArray(raw.run?.routeHistory)
                ? raw.run.routeHistory.filter(isPlainObject).map((entry) => ({ ...entry }))
                : [],
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
    const chapters = save.unlockedChapters?.includes('parking_lot')
        ? save.unlockedChapters
        : ['parking_lot', ...(save.unlockedChapters ?? [])];
    return { ...save, unlocked: true, unlockedChapters: chapters };
}

export function unlockChapter(save, chapterId) {
    if (!chapterId) return save;
    const existing = save.unlockedChapters ?? ['parking_lot'];
    if (existing.includes(chapterId)) return { ...save, unlocked: true };
    return {
        ...save,
        unlocked: true,
        unlockedChapters: [...existing, chapterId]
    };
}

export function isChapterUnlocked(save, chapterId) {
    if (!save.unlocked) return false;
    return (save.unlockedChapters ?? ['parking_lot']).includes(chapterId);
}

export function saveChapterSnapshot(save, chapterId, runState) {
    if (!chapterId || !runState) return save;
    const snapshots = { ...(save.chapterSnapshots ?? {}) };
    snapshots[chapterId] = {
        timeBand: runState.timeBand ?? 0,
        pain: runState.pain ?? 'stable',
        evidence: Array.isArray(runState.evidence) ? [...runState.evidence] : [],
        inventory: Array.isArray(runState.inventory) ? [...runState.inventory] : [],
        routeHistory: Array.isArray(runState.routeHistory) ? [...runState.routeHistory] : [],
        flags: isPlainObject(runState.flags) ? { ...runState.flags } : {}
    };
    return { ...save, chapterSnapshots: snapshots };
}

export function getChapterSnapshot(save, chapterId) {
    return save.chapterSnapshots?.[chapterId] ?? null;
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

export function recordDiscoveredBeat(save, beatId) {
    if (!beatId || typeof beatId !== 'string') return save;
    const discovered = save.discoveredBeats ?? [];
    if (discovered.includes(beatId)) return save;
    return { ...save, discoveredBeats: [...discovered, beatId] };
}

// Canonical gate: recover the Chen confession log + the cave stasis-box
// record, which together record the unified Specimen 0047 codex entry.
// Optional later tuning (also implemented here): a completed Hunker Bunker
// ending unlocks RGB too, so players who miss the two records aren't
// permanently excluded.
export function shouldUnlockRgb({ specimen0047Recorded = false, anyEndingCompleted = false } = {}) {
    return Boolean(specimen0047Recorded) || Boolean(anyEndingCompleted);
}

