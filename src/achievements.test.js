import { describe, expect, it } from 'vitest';
import {
    ACHIEVEMENT_DEFS,
    ACHIEVEMENT_STORAGE_KEY,
    AchievementEngine,
    applyAchievementEvent,
    createDefaultAchievementState,
    getAchievementProgress,
    hasAnyUnlock,
    migrateAchievements,
    recordRunEnd
} from './achievements.js';

function makeStorage(seed = {}) {
    const map = new Map(Object.entries(seed));
    return {
        get length() { return map.size; },
        key(index) { return [...map.keys()][index] ?? null; },
        getItem(key) { return map.has(key) ? map.get(key) : null; },
        setItem(key, value) { map.set(key, String(value)); },
        removeItem(key) { map.delete(key); }
    };
}

describe('achievements definitions', () => {
    it('defines the requested launch set', () => {
        const keys = ACHIEVEMENT_DEFS.map((def) => def.key);

        expect(keys).toContain('quick_study');
        expect(keys).toContain('hunkered');
        expect(keys).toContain('scouts_honor');
        expect(keys).toContain('tank_commander');
        expect(keys).toContain('chief_engineer');
        expect(keys).toContain('cartographer');
        expect(keys).toContain('archivist');
        expect(keys).toContain('kin');
        expect(keys).toContain('ghost');
        expect(keys).toContain('hardened');
        expect(keys).toContain('slay_the_queen');
        expect(keys.filter((key) => key.startsWith('ending_'))).toHaveLength(10);
        expect(ACHIEVEMENT_DEFS.find((def) => def.key === 'scouts_honor')?.icon).toBe('victory_scout');
        expect(ACHIEVEMENT_DEFS.find((def) => def.key === 'tank_commander')?.icon).toBe('victory_tank');
        expect(ACHIEVEMENT_DEFS.find((def) => def.key === 'chief_engineer')?.icon).toBe('victory_engineer');
    });
});

describe('achievement migration', () => {
    it('migrates the v1 death stub without losing counters', () => {
        const migrated = migrateAchievements({
            totalDeaths: 7,
            totalKills: 12,
            maxKillsOneRun: 5,
            deepTierReachedAlive: true,
            unlockedHardened: true
        }, 1234);

        expect(migrated.schemaVersion).toBe(2);
        expect(migrated.stats.totalDeaths).toBe(7);
        expect(migrated.stats.totalKills).toBe(12);
        expect(migrated.stats.maxKillsOneRun).toBe(5);
        expect(migrated.stats.deepTierReachedAlive).toBe(true);
        expect(migrated.unlocked.hardened).toEqual({ unlockedAt: 1234, migrated: true });
    });
});

describe('achievement checks', () => {
    it('unlocks quick study for a death inside five seconds', () => {
        const { state, newUnlocks } = applyAchievementEvent(
            createDefaultAchievementState(),
            'run-end',
            { outcome: 'death', runMs: 4900 },
            2000
        );

        expect(newUnlocks.map((def) => def.key)).toContain('quick_study');
        expect(state.unlocked.quick_study).toBeTruthy();
    });

    it('unlocks hardened on the fifth death', () => {
        let state = createDefaultAchievementState();
        for (let i = 0; i < 4; i++) {
            state = applyAchievementEvent(state, 'run-end', { outcome: 'death', runMs: 6000 }, i).state;
        }
        const result = applyAchievementEvent(state, 'run-end', { outcome: 'death', runMs: 6000 }, 5);

        expect(result.state.stats.totalDeaths).toBe(5);
        expect(result.newUnlocks.map((def) => def.key)).toContain('hardened');
    });

    it('unlocks class and ending achievements on victory', () => {
        const result = applyAchievementEvent(
            createDefaultAchievementState(),
            'run-end',
            { outcome: 'victory', ending: 'clean_escape', classType: 'SCOUT', runMs: 8000 },
            3000
        );
        const keys = result.newUnlocks.map((def) => def.key);

        expect(keys).toContain('scouts_honor');
        expect(keys).toContain('ending_clean_escape');
        expect(result.state.stats.classesCompleted.SCOUT).toBe(true);
        expect(result.state.stats.endings.clean_escape).toBe(true);
    });

    it('tracks cartographer, archivist, kin, and ghost from events', () => {
        let state = applyAchievementEvent(createDefaultAchievementState(), 'run-start', { classType: 'TANK' }, 1).state;
        state = applyAchievementEvent(state, 'act2-milestone', { key: 'campDiscovered', campId: 'camp_meridian' }, 2).state;
        state = applyAchievementEvent(state, 'act2-milestone', { key: 'campDiscovered', campId: 'camp_tallow' }, 3).state;
        let result = applyAchievementEvent(state, 'act2-milestone', { key: 'campDiscovered', campId: 'camp_vesper' }, 4);
        expect(result.newUnlocks.map((def) => def.key)).toContain('cartographer');

        state = result.state;
        for (let i = 0; i < 12; i++) {
            result = applyAchievementEvent(state, 'lore-drop-collected', { id: `lore-${i}` }, 10 + i);
            state = result.state;
        }
        expect(result.newUnlocks.map((def) => def.key)).toContain('archivist');

        result = applyAchievementEvent(state, 'hive-choice-resolved', { hiveId: 'hive_suture', bond: 5 }, 30);
        expect(result.newUnlocks.map((def) => def.key)).toContain('kin');

        result = applyAchievementEvent(result.state, 'reveal-reached', {}, 40);
        expect(result.newUnlocks.map((def) => def.key)).toContain('ghost');
    });

    it('does not unlock ghost after suspicion changed', () => {
        let state = applyAchievementEvent(createDefaultAchievementState(), 'run-start', {}, 1).state;
        state = applyAchievementEvent(state, 'player-suspicion-changed', { suspicion: 1 }, 2).state;
        const result = applyAchievementEvent(state, 'reveal-reached', {}, 3);

        expect(result.newUnlocks.map((def) => def.key)).not.toContain('ghost');
    });

    it('reports progress for counter achievements', () => {
        const state = migrateAchievements({ totalDeaths: 3 });
        const hardened = ACHIEVEMENT_DEFS.find((def) => def.key === 'hardened');

        expect(getAchievementProgress(hardened, state)).toEqual({ current: 3, target: 5 });
    });
});

describe('achievement persistence wrappers', () => {
    it('persists unlocks through storage', () => {
        const storage = makeStorage();
        const result = recordRunEnd(
            { outcome: 'death', runMs: 1000 },
            { storage, now: 100 }
        );
        const stored = JSON.parse(storage.getItem(ACHIEVEMENT_STORAGE_KEY));

        expect(result.newUnlocks.map((def) => def.key)).toContain('quick_study');
        expect(stored.unlocked.quick_study).toBeTruthy();
        expect(hasAnyUnlock(stored)).toBe(true);
    });

    it('engine records events against the same schema', () => {
        const storage = makeStorage();
        const engine = new AchievementEngine({ storage, now: () => 99 });
        const result = engine.recordEvent('hive-choice-resolved', { bond: 5 });

        expect(result.newUnlocks.map((def) => def.key)).toContain('kin');
        expect(engine.getState().unlocked.kin.unlockedAt).toBe(99);
    });
});
