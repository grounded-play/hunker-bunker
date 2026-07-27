import { describe, expect, it } from 'vitest';
import { collapseChunkLattice, LATTICE_SIZE } from './wfcGenerator.js';

function seededRandom(seed) {
    let state = (seed >>> 0) || 1;
    return () => {
        state ^= state << 13;
        state ^= state >>> 17;
        state ^= state << 5;
        return (state >>> 0) / 4294967296;
    };
}

function assertLatticeCompatible(lattice) {
    for (let my = 0; my < LATTICE_SIZE; my += 1) {
        for (let mx = 0; mx < LATTICE_SIZE; mx += 1) {
            const tile = lattice[my * LATTICE_SIZE + mx];
            expect(tile).toBeTruthy();
            if (mx < LATTICE_SIZE - 1) {
                const right = lattice[my * LATTICE_SIZE + mx + 1];
                expect(tile.sockets.e, `(${mx},${my}) east vs (${mx + 1},${my}) west`).toBe(right.sockets.w);
            }
            if (my < LATTICE_SIZE - 1) {
                const below = lattice[(my + 1) * LATTICE_SIZE + mx];
                expect(tile.sockets.s, `(${mx},${my}) south vs (${mx},${my + 1}) north`).toBe(below.sockets.n);
            }
        }
    }
}

describe('collapseChunkLattice', () => {
    it('always fully resolves all 9 cells', () => {
        for (let seed = 1; seed <= 30; seed += 1) {
            const lattice = collapseChunkLattice(seededRandom(seed));
            expect(lattice).toHaveLength(9);
            for (const tile of lattice) expect(tile).toBeTruthy();
        }
    });

    it('every adjacent pair of lattice cells has matching sockets', () => {
        for (let seed = 1; seed <= 30; seed += 1) {
            assertLatticeCompatible(collapseChunkLattice(seededRandom(seed)));
        }
    });

    it('is deterministic for a fixed seed', () => {
        const a = collapseChunkLattice(seededRandom(42)).map((t) => t.id);
        const b = collapseChunkLattice(seededRandom(42)).map((t) => t.id);
        expect(a).toEqual(b);
    });

    it('varies across seeds', () => {
        const results = new Set();
        for (let seed = 1; seed <= 15; seed += 1) {
            results.add(collapseChunkLattice(seededRandom(seed)).map((t) => t.id).join(','));
        }
        expect(results.size).toBeGreaterThan(1);
    });
});
