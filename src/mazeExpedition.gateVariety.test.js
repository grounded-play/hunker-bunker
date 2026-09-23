import { describe, expect, it } from 'vitest';
import { RING_BLOCKER_FEATURES, generateRadialMazeExpedition } from './mazeExpedition.js';

/**
 * The variety ratchet.
 *
 * Gate placement used to be a deterministic argmin over spine chunks with no
 * random() call at all, so across 60 seeds ring-3-gate sat at 2,7 in every
 * single run and the other three had two or three placements that were axis
 * mirrors of each other. The seed was real; it just never reached the four
 * decisions a player navigates by.
 *
 * These tests fail if that regresses.
 */
const SEED_COUNT = 60;
const seedFor = (index) => (Math.imul(index + 1, 0x9e3779b1) ^ 0x5eed) >>> 0;

function gatePositionsAcrossSeeds(count = SEED_COUNT) {
    const positions = new Map();
    for (let i = 0; i < count; i += 1) {
        const expedition = generateRadialMazeExpedition(seedFor(i));
        for (const blocker of expedition.blockers ?? []) {
            if (!positions.has(blocker.id)) positions.set(blocker.id, new Set());
            if (blocker.chunkX != null) positions.get(blocker.id).add(`${blocker.chunkX},${blocker.chunkY}`);
        }
    }
    return positions;
}

describe('ring gate placement variety', () => {
    it('gives every gate many distinct placements across seeds', () => {
        const positions = gatePositionsAcrossSeeds();
        expect(positions.size).toBe(RING_BLOCKER_FEATURES.length);
        for (const [gateId, placements] of positions) {
            // Floor, not target: the ceiling is bounded by plan validity, since
            // a gate that wanders too far eats the route chunks the territory
            // planner needs. Measured 10-31 at the current band.
            expect(placements.size, `${gateId} placements across ${SEED_COUNT} seeds`).toBeGreaterThanOrEqual(8);
        }
    });

    it('still places every gate somewhere', () => {
        for (let i = 0; i < 12; i += 1) {
            const expedition = generateRadialMazeExpedition(seedFor(i));
            for (const blocker of expedition.blockers ?? []) {
                expect(Number.isInteger(blocker.chunkX), `${blocker.id} chunkX`).toBe(true);
                expect(Number.isInteger(blocker.chunkY), `${blocker.id} chunkY`).toBe(true);
            }
        }
    });

    // Two gates sharing a chunk would put two progression walls in one place.
    it('never puts two gates in the same chunk', () => {
        for (let i = 0; i < 30; i += 1) {
            const expedition = generateRadialMazeExpedition(seedFor(i));
            const keys = (expedition.blockers ?? [])
                .filter((blocker) => blocker.chunkX != null)
                .map((blocker) => `${blocker.chunkX},${blocker.chunkY}`);
            expect(new Set(keys).size).toBe(keys.length);
        }
    });

    it('keeps gates on the spine, where the route actually runs', () => {
        for (let i = 0; i < 20; i += 1) {
            const expedition = generateRadialMazeExpedition(seedFor(i));
            const spine = new Set(expedition.topology?.spineChunkKeys ?? []);
            for (const blocker of expedition.blockers ?? []) {
                if (blocker.chunkX == null) continue;
                expect(spine.has(`${blocker.chunkX},${blocker.chunkY}`), `${blocker.id} on spine`).toBe(true);
            }
        }
    });

    // Variety must not turn into chaos: a gate still has to sit between the
    // ring it guards and the ring it opens, or the route stops making sense.
    it('keeps each gate in the band between the rings it separates', () => {
        for (let i = 0; i < 20; i += 1) {
            const expedition = generateRadialMazeExpedition(seedFor(i));
            const ordered = [...(expedition.blockers ?? [])]
                .filter((blocker) => blocker.chunkX != null)
                .sort((a, b) => a.ring - b.ring);
            const radii = ordered.map((blocker) => Math.hypot(blocker.x, blocker.z));
            for (let r = 1; r < radii.length; r += 1) {
                expect(radii[r], `gate ${r + 1} further out than gate ${r}`).toBeGreaterThan(radii[r - 1]);
            }
        }
    });

    it('is reproducible: the same seed lays out the same gates', () => {
        const a = generateRadialMazeExpedition(0xabcdef);
        const b = generateRadialMazeExpedition(0xabcdef);
        expect((a.blockers ?? []).map((x) => `${x.id}:${x.chunkX},${x.chunkY}`))
            .toEqual((b.blockers ?? []).map((x) => `${x.id}:${x.chunkX},${x.chunkY}`));
    });
});
