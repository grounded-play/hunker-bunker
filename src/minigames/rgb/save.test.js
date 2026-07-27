import { describe, expect, it, beforeEach } from 'vitest';
import {
    RGB_SAVE_KEY,
    loadRgbSave,
    saveRgbSave,
    markUnlocked,
    unlockChapter,
    isChapterUnlocked,
    saveChapterSnapshot,
    getChapterSnapshot,
    recordEnding,
    recordGameOver,
    saveCheckpoint,
    shouldUnlockRgb
} from './save.js';

function createMemoryStorage() {
    const map = new Map();
    return {
        getItem: (key) => (map.has(key) ? map.get(key) : null),
        setItem: (key, value) => { map.set(key, String(value)); },
        removeItem: (key) => { map.delete(key); }
    };
}

describe('loadRgbSave', () => {
    let storage;

    beforeEach(() => {
        storage = createMemoryStorage();
    });

    it('returns a fresh default save when nothing is stored', () => {
        const save = loadRgbSave(storage);
        expect(save).toEqual({
            version: 1,
            unlocked: false,
            checkpoint: 'parking_lot',
            unlockedChapters: ['parking_lot'],
            chapterSnapshots: {},
            endingsSeen: [],
            gameOversSeen: [],
            settings: { hints: 'standard' },
            run: {
                timeBand: 0,
                pain: 'stable',
                evidence: [],
                inventory: [],
                routeHistory: [],
                flags: {}
            }
        });
    });

    it('round-trips a saved record', () => {
        const original = markUnlocked(loadRgbSave(storage));
        saveRgbSave(storage, original);
        const reloaded = loadRgbSave(storage);
        expect(reloaded).toEqual(original);
    });

    it('recovers a fresh default from corrupt JSON rather than throwing', () => {
        storage.setItem(RGB_SAVE_KEY, '{not json');
        const save = loadRgbSave(storage);
        expect(save.unlocked).toBe(false);
        expect(save.checkpoint).toBe('parking_lot');
    });

    it('recovers a fresh default from a wrong-shaped value', () => {
        storage.setItem(RGB_SAVE_KEY, JSON.stringify('just a string'));
        const save = loadRgbSave(storage);
        expect(save.checkpoint).toBe('parking_lot');
    });

    it('resets to a fresh default on an unrecognized save version', () => {
        storage.setItem(RGB_SAVE_KEY, JSON.stringify({ version: 99, unlocked: true, checkpoint: 'sector_four' }));
        const save = loadRgbSave(storage);
        expect(save.version).toBe(1);
        expect(save.unlocked).toBe(false);
        expect(save.checkpoint).toBe('parking_lot');
    });
});

describe('markUnlocked', () => {
    it('sets unlocked without touching other fields', () => {
        const save = markUnlocked(loadRgbSave(createMemoryStorage()));
        expect(save.unlocked).toBe(true);
        expect(save.checkpoint).toBe('parking_lot');
    });
});

describe('unlockChapter and isChapterUnlocked', () => {
    it('unlocks specific chapters and marks save unlocked', () => {
        let save = loadRgbSave(createMemoryStorage());
        expect(isChapterUnlocked(save, 'warehouse')).toBe(false);
        save = unlockChapter(save, 'warehouse');
        expect(save.unlocked).toBe(true);
        expect(isChapterUnlocked(save, 'warehouse')).toBe(true);
        expect(save.unlockedChapters).toContain('warehouse');
    });
});

describe('saveChapterSnapshot and getChapterSnapshot', () => {
    it('stores and retrieves choice snapshots per chapter', () => {
        let save = loadRgbSave(createMemoryStorage());
        const fakeRunState = {
            timeBand: 1,
            pain: 'injured',
            evidence: ['swab_photo'],
            inventory: ['notebook'],
            routeHistory: [{ axis: 'TRUTH' }],
            flags: { keptNotebook: true }
        };
        save = saveChapterSnapshot(save, 'warehouse', fakeRunState);
        const snapshot = getChapterSnapshot(save, 'warehouse');
        expect(snapshot.timeBand).toBe(1);
        expect(snapshot.pain).toBe('injured');
        expect(snapshot.evidence).toEqual(['swab_photo']);
        expect(snapshot.flags.keptNotebook).toBe(true);
    });
});

describe('saveCheckpoint', () => {
    it('updates the checkpoint field', () => {
        const save = saveCheckpoint(loadRgbSave(createMemoryStorage()), 'medi_kiosk');
        expect(save.checkpoint).toBe('medi_kiosk');
    });
});

describe('recordEnding', () => {
    it('adds an ending id exactly once', () => {
        let save = loadRgbSave(createMemoryStorage());
        save = recordEnding(save, 'open_hand');
        save = recordEnding(save, 'open_hand');
        save = recordEnding(save, 'system_loop');
        expect(save.endingsSeen).toEqual(['open_hand', 'system_loop']);
    });
});

describe('recordGameOver', () => {
    it('adds a game-over id exactly once', () => {
        let save = loadRgbSave(createMemoryStorage());
        save = recordGameOver(save, 'crushed');
        save = recordGameOver(save, 'crushed');
        expect(save.gameOversSeen).toEqual(['crushed']);
    });
});

describe('shouldUnlockRgb', () => {
    it('unlocks once the Specimen 0047 codex entry is recorded', () => {
        expect(shouldUnlockRgb({ specimen0047Recorded: true })).toBe(true);
    });

    it('stays locked without the Specimen 0047 codex entry', () => {
        expect(shouldUnlockRgb({ specimen0047Recorded: false })).toBe(false);
        expect(shouldUnlockRgb({})).toBe(false);
    });

    it('also unlocks after any completed ending, per the optional later-tuning note', () => {
        expect(shouldUnlockRgb({ specimen0047Recorded: false, anyEndingCompleted: true })).toBe(true);
    });
});
