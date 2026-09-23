import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { groupDangerZones, lipEdgeQuads } from './dangerZones.js';
import { ThreeGame } from './threeGame.js';

// Map legend: X canyon, C cliff (danger), . floor, # wall.
function parse(rows) {
    const tiles = new Map();
    rows.forEach((row, z) => [...row].forEach((ch, x) => tiles.set(`${x},${z}`, ch)));
    return tiles;
}
function zonesFor(rows) {
    const tiles = parse(rows);
    const danger = new Map([...tiles].filter(([, ch]) => ch === 'X' || ch === 'C')
        .map(([key]) => { const [x, z] = key.split(',').map(Number); return [key, { x, z }]; }));
    return groupDangerZones(danger, (x, z) => tiles.get(`${x},${z}`) === '.', { x: 0, z: 0 });
}

describe('radar danger zones', () => {
    it('merges a whole canyon rim into one zone instead of a ring per tile', () => {
        const zones = zonesFor([
            '.....',
            'CCCCC',
            'XXXXX',
            'XXXXX'
        ]);
        expect(zones).toHaveLength(1);
        expect(zones[0].tiles).toHaveLength(15);
        // Only the rim facing the floor is outlined.
        expect(zones[0].lipEdges).toHaveLength(5);
        expect(zones[0].lipEdges.every((edge) => edge.side === 'n' && edge.z === 1)).toBe(true);
        expect(zones[0].lipTiles).toHaveLength(5);
    });

    it('keeps separate hazards separate and joins diagonal touches', () => {
        const zones = zonesFor([
            'X...X',
            '.X...',
            '.....'
        ]);
        expect(zones.map((zone) => zone.tiles.length).sort()).toEqual([1, 2]);
    });

    it('gives a walled-in pit no lip and reports reveal distance from the scan', () => {
        const [walled] = zonesFor(['###', '#X#', '###']);
        expect(walled.lipEdges).toEqual([]);
        const [open] = zonesFor(['...', '..X']);
        expect(open.minDistance).toBeCloseTo(Math.hypot(2, 1));
    });

    it('lays each lip bar on the danger side of its tile edge', () => {
        expect(lipEdgeQuads([{ x: 3, z: 4, side: 'n' }], 0.1)).toEqual([[2.5, 3.5, 3.5, 3.6]]);
        expect(lipEdgeQuads([{ x: 3, z: 4, side: 'e' }], 0.1)).toEqual([[3.4, 3.5, 3.5, 4.5]]);
    });
});

describe('radar scan draws grouped danger outlines', () => {
    function world(rows) {
        const tiles = parse(rows);
        const w = {
            scene: new THREE.Scene(),
            transientEffects: [],
            getCachedTileType: (x, z) => tiles.get(`${Math.round(x)},${Math.round(z)}`) ?? '#',
            getHoleVisualInfo: (x, z) => (['X', 'C'].includes(tiles.get(`${x},${z}`)) ? { x, z, scale: 1 } : null),
            spawnHoleDangerOutline: vi.fn()
        };
        for (const method of ['planRadarDangerZones', 'scanDangerHoles', 'spawnDangerZoneOutline']) {
            w[method] = ThreeGame.prototype[method];
        }
        return w;
    }

    it('spawns one outline for a cliff band as the sweep reaches it, never one per tile', () => {
        const w = world(['.........', '.........', '.........', '.........', '.........', 'CCCCCCCCC', 'XXXXXXXXX']);
        const zones = w.planRadarDangerZones(4, 0, 12);
        const pinged = new Set();
        w.scanDangerHoles(4, 0, 0, pinged, zones);
        expect(w.scene.children).toHaveLength(0);
        w.scanDangerHoles(4, 0, 12, pinged, zones);
        w.scanDangerHoles(4, 0, 12, pinged, zones);
        const outlines = w.scene.children.filter((child) => child.name.startsWith('radar-danger-zone:'));
        expect(outlines).toHaveLength(1);
        expect(w.spawnHoleDangerOutline).not.toHaveBeenCalled();
        const lipVertices = outlines[0].children[1].geometry.getAttribute('position').count;
        expect(lipVertices).toBe(9 * 6);
    });

    it('still rings a lone pit', () => {
        const w = world(['...', '.X.', '...']);
        w.scanDangerHoles(1, 1, 3, new Set());
        expect(w.spawnHoleDangerOutline).toHaveBeenCalledTimes(1);
        expect(w.scene.children).toHaveLength(0);
    });
});
