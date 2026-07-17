import { describe, it, expect, beforeEach } from 'vitest';
import {
    CAVE_STASIS_BOX_LOG_KEY,
    CHEN_CONFESSION_LOG_KEY,
    CodexStore,
    SPECIMEN_0047_ORIGIN_CODEX_ID,
    getClassWreckageLog,
    isSpecimen0047OriginFound,
    recordSpecimen0047OriginIfFound
} from './codex.js';
import { CLASS_WRECKAGE_LOGS, CODEX_ENTRIES, getCodexEntry, getCodexEntriesByCategory, CODEX_CATEGORIES } from './data/codex.js';

function makeStorage() {
    const map = new Map();
    return { getItem: (k) => (map.has(k) ? map.get(k) : null), setItem: (k, v) => map.set(k, v), removeItem: (k) => map.delete(k), _map: map };
}

describe('CodexStore', () => {
    let store, clock;
    beforeEach(() => {
        clock = { t: 1000 };
        store = new CodexStore({ storage: makeStorage(), now: () => clock.t });
    });

    it('records a new id once and reports first discovery', () => {
        expect(store.has('cybersnail')).toBe(false);
        expect(store.record('cybersnail')).toBe(true);   // first time
        expect(store.has('cybersnail')).toBe(true);
        expect(store.record('cybersnail')).toBe(false);  // repeat
        expect(store.getEntry('cybersnail').count).toBe(2);
        expect(store.getDiscoveredCount()).toBe(1);
    });

    it('ignores empty ids and persists across reloads', () => {
        expect(store.record('')).toBe(false);
        store.record('sentinel');
        const reloaded = new CodexStore({ storage: store.storage, now: () => clock.t });
        expect(reloaded.has('sentinel')).toBe(true);
    });

    it('reset clears discoveries', () => {
        store.record('foundry');
        store.reset();
        expect(store.getDiscoveredCount()).toBe(0);
    });

    it('stores optional discovery metadata', () => {
        store.record('black_box', { date: '2047-08-14', coords: { x: 4, z: 7 } });
        store.record('black_box', { coords: { x: 8, z: 9 } });

        expect(store.getEntry('black_box')).toMatchObject({
            count: 2,
            metadata: { date: '2047-08-14', coords: { x: 8, z: 9 } }
        });
    });
});

describe('codex catalog', () => {
    it('every entry is well-formed with a known category', () => {
        for (const e of CODEX_ENTRIES) {
            expect(typeof e.id).toBe('string');
            expect(typeof e.name).toBe('string');
            expect(typeof e.blurb).toBe('string');
            expect(CODEX_CATEGORIES).toContain(e.category);
        }
    });

    it('lookup + category filter work', () => {
        expect(getCodexEntry('cybersnail')?.name).toBe('CYBERSNAIL');
        expect(getCodexEntry('nope')).toBeNull();
        expect(getCodexEntriesByCategory('HOSTILE').length).toBeGreaterThan(0);
    });

    it('defines structured class wreckage payloads with matching codex entries', () => {
        for (const [classType, payload] of Object.entries(CLASS_WRECKAGE_LOGS)) {
            expect(payload.classType).toBe(classType);
            expect(getCodexEntry(payload.codexId)).toBeTruthy();
            expect(payload.date).toMatch(/2047-/);
            expect(Number.isFinite(payload.coords.x)).toBe(true);
        }
    });
});

describe('wave 3 lore gates', () => {
    it('unlocks 0047 origin only after Chen confession and stasis box logs', () => {
        expect(isSpecimen0047OriginFound([CHEN_CONFESSION_LOG_KEY])).toBe(false);
        expect(isSpecimen0047OriginFound([CHEN_CONFESSION_LOG_KEY, CAVE_STASIS_BOX_LOG_KEY])).toBe(true);

        const store = new CodexStore({ storage: makeStorage(), now: () => 22 });
        expect(recordSpecimen0047OriginIfFound(store, [CAVE_STASIS_BOX_LOG_KEY])).toBe(false);
        expect(recordSpecimen0047OriginIfFound(store, [CHEN_CONFESSION_LOG_KEY, CAVE_STASIS_BOX_LOG_KEY])).toBe(true);
        expect(store.has(SPECIMEN_0047_ORIGIN_CODEX_ID)).toBe(true);
    });

    it('returns class-keyed wreckage with runtime coordinates', () => {
        const log = getClassWreckageLog('engineer', { x: 12, z: 34, biome: 'CRYO' });

        expect(log.classType).toBe('ENGINEER');
        expect(log.codexId).toBe('wreckage_engineer_relay');
        expect(log.coords).toEqual({ sector: 'CRYO', x: 12, z: 34 });
    });
});
