import { describe, expect, it, vi } from 'vitest';
import { buildRevealedChunkCells, roomsReachedByScan } from './mapReveal.js';
import { ThreeGame } from './threeGame.js';

// 12x12 chunk: an open hall across row 5-6, a room in the lower-right.
function chunkGrid() {
    return Array.from({ length: 12 }, (_, y) => Array.from({ length: 12 }, (_, x) => {
        if (y === 5 || y === 6) return '.';
        if (x >= 7 && x <= 10 && y >= 8 && y <= 10) return '.';
        return '#';
    }));
}
const room = { id: 'r1', interior: [{ x: 8, y: 9 }, { x: 9, y: 9 }, { x: 10, y: 10 }] };

describe('tactical map fog of war', () => {
    it('reveals nothing of a discovered chunk that was never scanned or walked', () => {
        expect(buildRevealedChunkCells(chunkGrid(), { chunkKey: '0,0', chunkX: 0, chunkY: 0, chunkSize: 12, rooms: [room] })).toEqual([]);
        expect(buildRevealedChunkCells(chunkGrid(), { chunkKey: '0,0', chunkX: 0, chunkY: 0, chunkSize: 12 })).toEqual([]);
    });

    it('draws scanned hall cells with the walls that outline them', () => {
        const cells = buildRevealedChunkCells(chunkGrid(), {
            chunkKey: '1,0', chunkX: 1, chunkY: 0, chunkSize: 12,
            discoveredCellKeys: new Set(['15,5', '16,5'])
        });
        expect(cells.filter((cell) => cell.kind === 'hall')).toEqual([{ x: 3, y: 5, kind: 'hall' }, { x: 4, y: 5, kind: 'hall' }]);
        const walls = cells.filter((cell) => cell.kind === 'wall').map(({ x, y }) => `${x},${y}`).sort();
        expect(walls).toEqual(['3,4', '4,4']);
    });

    it('shows a discovered room whole, including authored rooms with only an interior', () => {
        const cells = buildRevealedChunkCells(chunkGrid(), {
            chunkKey: '0,0', chunkX: 0, chunkY: 0, chunkSize: 12, rooms: [room],
            discoveredRoomKeys: new Set(['0,0:r1'])
        });
        expect(cells.filter((cell) => cell.kind === 'room')).toHaveLength(3);
    });

    it('lets a scan reach only the rooms inside its pulse', () => {
        const near = { id: 'near', interior: [{ x: 2, y: 2 }] };
        const far = { id: 'far', footprint: [{ x: 40, y: 40 }] };
        const reached = roomsReachedByScan([near, far], { chunkX: 0, chunkY: 0, chunkSize: 49, x: 0, z: 0, radius: 10 });
        expect(reached.map((entry) => entry.id)).toEqual(['near']);
        expect(roomsReachedByScan(undefined, { chunkX: 0, chunkY: 0, chunkSize: 49, x: 0, z: 0, radius: 10 })).toEqual([]);
    });
});

describe('radar scan updates the map', () => {
    function world() {
        const grid = Array.from({ length: 49 }, () => Array(49).fill('.'));
        const w = {
            chunkSize: 49,
            chunkCache: new Map([['0,0', grid], ['1,0', grid]]),
            wfcMetadataCache: new Map([
                ['0,0', { roomInstances: [{ id: 'close', interior: [{ x: 22, y: 24 }] }, { id: 'distant', interior: [{ x: 1, y: 1 }] }] }]
            ]),
            explorationTracker: { recordRadarScan: vi.fn() },
            discoveredMapChunkKeys: new Set(),
            _detailedChunksDirty: false,
            checkMappingMissionComplete: vi.fn()
        };
        w.recordRadarScanDiscovery = ThreeGame.prototype.recordRadarScanDiscovery;
        return w;
    }

    it('reveals the pulse radius, only the rooms it reaches, and invalidates the map cache', () => {
        const w = world();
        w.recordRadarScanDiscovery(24, 24, 10);
        expect(w._detailedChunksDirty).toBe(true);
        expect(w.discoveredMapCellKeys.has('24,24')).toBe(true);
        expect(w.discoveredMapCellKeys.has('24,36')).toBe(true);
        expect(w.discoveredMapCellKeys.has('24,40')).toBe(false);
        expect([...w.discoveredMapRoomKeys]).toEqual(['0,0:close']);
        expect(w.lastRadarScan).toMatchObject({ x: 24, z: 24, radius: 10, dissipationDuration: 400 });
        expect(w.lastRadarScan.freshCells.has('22,24')).toBe(true);
        const firstFresh = w.lastRadarScan.freshCells.size;
        expect(firstFresh).toBeGreaterThan(300);
        w.recordRadarScanDiscovery(24, 24, 10);
        expect(w.lastRadarScan.freshCells.size).toBe(0);
    });
});
