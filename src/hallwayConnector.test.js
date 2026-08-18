import { describe, expect, it } from 'vitest';
import {
    HALLWAY_BUILD_CATALOG,
    selectHallwayArchetype,
    pushRecentArchetype,
    realizeHallwayConnector
} from './hallwayConnector.js';
import { CHUNK_SIZE } from './tileCatalog.js';

function seededRandom(seed) {
    let state = (seed >>> 0) || 1;
    return () => {
        state ^= state << 13;
        state ^= state >>> 17;
        state ^= state << 5;
        return (state >>> 0) / 4294967296;
    };
}

describe('HALLWAY_BUILD_CATALOG', () => {
    it('every archetype declares a valid width range, positive cooldown, and non-empty family lists', () => {
        for (const archetype of HALLWAY_BUILD_CATALOG) {
            expect(archetype.widthRange[0]).toBeGreaterThanOrEqual(1);
            expect(archetype.widthRange[1]).toBeGreaterThanOrEqual(archetype.widthRange[0]);
            expect(archetype.repetitionCooldown).toBeGreaterThanOrEqual(1);
            expect(archetype.compatibleFamilies.from.length).toBeGreaterThan(0);
            expect(archetype.compatibleFamilies.to.length).toBeGreaterThan(0);
        }
    });

    it('has unique archetype ids', () => {
        const ids = HALLWAY_BUILD_CATALOG.map((a) => a.id);
        expect(new Set(ids).size).toBe(ids.length);
    });
});

describe('selectHallwayArchetype', () => {
    it('only returns archetypes compatible with both the source and destination family', () => {
        const picked = selectHallwayArchetype(HALLWAY_BUILD_CATALOG, { fromFamily: 'entry', toFamily: 'camp', roll: 0.5 });
        expect(picked.id).toBe('camp_approach');
    });

    it('is deterministic for a given roll', () => {
        const options = { fromFamily: 'o2', toFamily: 'gate', roll: 0.9 };
        const a = selectHallwayArchetype(HALLWAY_BUILD_CATALOG, options);
        const b = selectHallwayArchetype(HALLWAY_BUILD_CATALOG, options);
        expect(a).toBe(b);
    });

    it('avoids an archetype on cooldown when a compatible alternative exists', () => {
        // camp_approach is the only entry->camp compatible archetype in
        // this catalog slice; putting it on cooldown must fall back to
        // allowing it again rather than returning null and deadlocking
        // generation over presentation variety.
        const recent = ['camp_approach'];
        const picked = selectHallwayArchetype(HALLWAY_BUILD_CATALOG, {
            fromFamily: 'entry',
            toFamily: 'camp',
            recentArchetypeIds: recent,
            roll: 0.1
        });
        expect(picked).not.toBeNull();
        expect(picked.id).toBe('camp_approach');
    });

    it('returns null when no archetype is compatible with the requested families', () => {
        expect(selectHallwayArchetype(HALLWAY_BUILD_CATALOG, { fromFamily: 'nonexistent', toFamily: 'nonexistent' })).toBeNull();
    });
});

describe('pushRecentArchetype', () => {
    it('trims history to the catalog\'s longest declared cooldown window', () => {
        const maxCooldown = Math.max(...HALLWAY_BUILD_CATALOG.map((a) => a.repetitionCooldown));
        let recent = [];
        for (let i = 0; i < maxCooldown + 5; i += 1) {
            recent = pushRecentArchetype(recent, `archetype-${i}`);
        }
        expect(recent.length).toBe(maxCooldown);
        expect(recent[recent.length - 1]).toBe(`archetype-${maxCooldown + 4}`);
    });
});

describe('realizeHallwayConnector', () => {
    const archetype = HALLWAY_BUILD_CATALOG.find((a) => a.id === 'service_passage');

    it('produces a chunk-sized grid with a width inside the archetype\'s declared range', () => {
        const result = realizeHallwayConnector(archetype, seededRandom(1), {
            openings: { west: { open: true, offset: 2 }, east: { open: true, offset: 7 } }
        });
        expect(result.grid.length).toBe(CHUNK_SIZE);
        expect(result.width).toBeGreaterThanOrEqual(archetype.widthRange[0]);
        expect(result.width).toBeLessThanOrEqual(archetype.widthRange[1]);
        expect(result.archetypeId).toBe('service_passage');
    });

    it('is deterministic for a given seed', () => {
        const options = { openings: { north: { open: true, offset: 4 }, south: { open: true, offset: 4 } } };
        const a = realizeHallwayConnector(archetype, seededRandom(6), options);
        const b = realizeHallwayConnector(archetype, seededRandom(6), options);
        expect(a.grid).toEqual(b.grid);
        expect(a.wayfindingMarkers).toEqual(b.wayfindingMarkers);
    });

    it('emits passive wayfinding markers tagged with the archetype\'s dressing kit for a connector long enough to need them', () => {
        const result = realizeHallwayConnector(archetype, seededRandom(2), {
            openings: { west: { open: true, offset: 1 }, east: { open: true, offset: 22 } }
        });
        expect(result.wayfindingMarkers.length).toBeGreaterThan(0);
        for (const marker of result.wayfindingMarkers) {
            expect(marker.dressingKit).toBe(archetype.dressingKit);
            expect(marker.lightingRhythm).toBe(archetype.lightingRhythm);
        }
    });

    it('only carves toward chunk-edge sockets that were declared active', () => {
        const result = realizeHallwayConnector(archetype, seededRandom(4), {
            openings: { north: { open: true, offset: 4 } }
        });
        expect(result.diagnostics.portalCount).toBe(1);
    });
});
