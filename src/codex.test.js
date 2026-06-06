import { describe, it, expect, beforeEach } from 'vitest';
import { CodexStore } from './codex.js';
import { CODEX_ENTRIES, getCodexEntry, getCodexEntriesByCategory, CODEX_CATEGORIES } from './data/codex.js';

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
});
