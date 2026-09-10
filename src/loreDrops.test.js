import { describe, it, expect } from 'vitest';
import {
    LORE_DROPS,
    LORE_DROP_SITES,
    LORE_STAGES,
    pickLoreDropForSite,
    getFoundLoreKeys,
    markLoreDropFound,
    getLoreDropByKey
} from './loreDrops.js';

function memoryStorage() {
    const map = new Map();
    return {
        getItem: (k) => (map.has(k) ? map.get(k) : null),
        setItem: (k, v) => map.set(k, String(v)),
        removeItem: (k) => map.delete(k)
    };
}

function mulberry32(seed) {
    let a = seed >>> 0;
    return () => {
        a |= 0;
        a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

describe('LORE_DROPS table', () => {
    it('has unique keys, valid sites and rarities, and readable text', () => {
        const keys = LORE_DROPS.map((d) => d.key);
        expect(new Set(keys).size).toBe(keys.length);
        for (const drop of LORE_DROPS) {
            expect(LORE_DROP_SITES).toContain(drop.site);
            expect(['common', 'rare', 'legendary']).toContain(drop.rarity);
            expect(drop.title.length).toBeGreaterThan(3);
            expect(drop.text.length).toBeGreaterThan(20);
        }
    });

    // STORY-02: a drop is only worth carrying home if it changes what the
    // player does next. Every entry states a place, risk, opportunity or
    // relationship, and that lead is composed into the text the reader modal
    // already shows -- so it reaches the player through existing wiring.
    it('gives every drop a narrative stage and a lead', () => {
        for (const drop of LORE_DROPS) {
            expect(LORE_STAGES).toContain(drop.stage);
            expect(drop.lead.length).toBeGreaterThan(20);
            expect(drop.text.endsWith(drop.lead)).toBe(true);
            expect(drop.text.startsWith(drop.body)).toBe(true);
        }
    });

    it('covers every site family with at least one drop', () => {
        for (const site of LORE_DROP_SITES) {
            expect(LORE_DROPS.some((d) => d.site === site)).toBe(true);
        }
    });
});

describe('pickLoreDropForSite', () => {
    it('only returns drops for the requested site (or drifters)', () => {
        for (let seed = 1; seed <= 60; seed++) {
            const drop = pickLoreDropForSite(mulberry32(seed), 'hive');
            expect(['hive', 'anywhere']).toContain(drop.site);
        }
    });

    it('never returns an already-found drop and exhausts to null', () => {
        const hivePool = LORE_DROPS.filter((d) => d.site === 'hive' || d.site === 'anywhere');
        const found = hivePool.map((d) => d.key);
        expect(pickLoreDropForSite(mulberry32(7), 'hive', found)).toBeNull();

        const partial = found.slice(0, found.length - 1);
        const drop = pickLoreDropForSite(mulberry32(7), 'hive', partial);
        expect(drop.key).toBe(found[found.length - 1]);
    });

    // STORY-02: setup before payoff. Random rarity rolls could hand a player
    // the queen's moult shard before anything established that the hive keeps
    // records at all, which reads as disconnected fragments rather than a
    // story. Selection now drains the earliest unfound stage in a site's pool
    // before offering a later one.
    it('offers the earliest unfound stage for a site', () => {
        for (let seed = 1; seed <= 60; seed++) {
            const drop = pickLoreDropForSite(mulberry32(seed), 'hive');
            const pool = LORE_DROPS.filter((d) => d.site === 'hive' || d.site === 'anywhere');
            const earliest = Math.min(...pool.map((d) => d.stage));
            expect(drop.stage).toBe(earliest);
        }
    });

    it('advances to later stages only once earlier ones are exhausted', () => {
        const pool = LORE_DROPS.filter((d) => d.site === 'cave' || d.site === 'anywhere');
        const stages = [...new Set(pool.map((d) => d.stage))].sort((a, b) => a - b);
        expect(stages.length).toBeGreaterThan(1);

        const found = pool.filter((d) => d.stage === stages[0]).map((d) => d.key);
        const drop = pickLoreDropForSite(mulberry32(3), 'cave', found);
        expect(drop.stage).toBe(stages[1]);
    });

    it('is deterministic for a given random stream', () => {
        expect(pickLoreDropForSite(mulberry32(42), 'ruins').key)
            .toBe(pickLoreDropForSite(mulberry32(42), 'ruins').key);
    });
});

describe('found-key persistence (shared world memory)', () => {
    it('marks keys once and reads them back', () => {
        const storage = memoryStorage();
        expect(getFoundLoreKeys(storage)).toEqual([]);
        expect(markLoreDropFound('drop_dogtags', storage)).toBe(true);
        expect(markLoreDropFound('drop_dogtags', storage)).toBe(false);
        expect(getFoundLoreKeys(storage)).toEqual(['drop_dogtags']);
    });

    it('coexists with terminal logs already in the store', () => {
        const storage = memoryStorage();
        storage.setItem('hb_world_memory_v1', JSON.stringify({ logsFound: ['A01'], biomesMapped: ['cryo'] }));
        markLoreDropFound('drop_moult_shard', storage);
        const mem = JSON.parse(storage.getItem('hb_world_memory_v1'));
        expect(mem.logsFound).toEqual(['A01', 'drop_moult_shard']);
        expect(mem.biomesMapped).toEqual(['cryo']); // untouched
    });
});

describe('getLoreDropByKey', () => {
    it('resolves known keys and nulls unknown ones', () => {
        expect(getLoreDropByKey('drop_prayer_stone').rarity).toBe('legendary');
        expect(getLoreDropByKey('nope')).toBeNull();
    });
});
