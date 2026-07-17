import { describe, expect, it } from 'vitest';
import { ThreeGame } from './threeGame.js';
import { buildUnifiedSkillTree } from './skillTree.js';

// Spatial arrow-key navigation over the Bunker Tree (wave-6 punch list
// §4c: tab order followed DOM insertion order, not the visual grid, and
// there was no arrow-key movement at all). findSkillTreeNeighbor is pure
// row/col logic — exercised here against the REAL tree topology so a
// layout change that breaks navigation shows up as a failing expectation,
// via the established ThreeGame.prototype.method.call(fakeThis, ...) pattern.

const tree = buildUnifiedSkillTree({ playerClass: 'SCOUT' });
const nodes = tree.nodes;

function neighbor(nodeId, key) {
    return ThreeGame.prototype.findSkillTreeNeighbor.call({}, nodeId, key, nodes);
}

function nodeAt(id) {
    return nodes.find((n) => n.id === id);
}

describe('findSkillTreeNeighbor', () => {
    it('moves down to the nearest row below, preferring the closest column', () => {
        // Class root sits at (row 1, col 2); the two row-3 class nodes are
        // its nearest neighbors below — NOT the row-7 node directly in-column.
        const rootId = nodes.find((n) => n.branch === 'class' && n.row === 1)?.id;
        const next = nodeAt(neighbor(rootId, 'ArrowDown'));
        expect(next.row).toBe(3);
        expect([1, 3]).toContain(next.col);
    });

    it('moves right along the same row instead of leaping to a distant row', () => {
        // (13,1) class node -> right should reach the (13,3) class node,
        // not a low-row node in a nearer column.
        const leftId = nodes.find((n) => n.row === 13 && n.col === 1)?.id;
        const next = nodeAt(neighbor(leftId, 'ArrowRight'));
        expect(next.row).toBe(13);
        expect(next.col).toBe(3);
    });

    it('moves up preferring the same column over a diagonal', () => {
        // ammoRefill sits at (5,3); scout_ammo_1 at (3,3) is directly above
        // and must beat the diagonal shotSpeed at (3,4).
        const current = nodeAt('weapon_ammoRefill');
        expect([current.row, current.col]).toEqual([5, 3]);
        const next = nodeAt(neighbor('weapon_ammoRefill', 'ArrowUp'));
        expect([next.row, next.col]).toEqual([3, 3]);
    });

    it('returns null at the grid edge', () => {
        // O2 generator sits on row 1 — nothing above it.
        expect(neighbor('ship_o2_generator', 'ArrowUp')).toBeNull();
    });

    it('returns null for unknown nodes and non-arrow keys', () => {
        expect(neighbor('nope', 'ArrowDown')).toBeNull();
        expect(neighbor('ship_o2_generator', 'Enter')).toBeNull();
    });

    it('every node reaches every other via arrow moves (no unreachable islands)', () => {
        // Navigation graph connectivity: starting anywhere, repeated arrow
        // moves must be able to reach every node — otherwise a controller
        // player literally cannot select some upgrade.
        const start = nodes[0].id;
        const seen = new Set([start]);
        const queue = [start];
        while (queue.length) {
            const id = queue.shift();
            for (const key of ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']) {
                const next = neighbor(id, key);
                if (next && !seen.has(next)) {
                    seen.add(next);
                    queue.push(next);
                }
            }
        }
        expect(seen.size).toBe(nodes.length);
    });
});
