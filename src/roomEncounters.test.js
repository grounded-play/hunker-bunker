import { describe, expect, it } from 'vitest';
import { collectReachableCells, planRoomEncounter, planChunkRoomEncounters } from './roomEncounters.js';

describe('room encounters', () => {
    const grid = Array.from({ length: 7 }, () => Array(7).fill('.'));
    const baseRoom = {
        id: 'room',
        interior: [{ x: 2, y: 2 }, { x: 3, y: 3 }, { x: 4, y: 4 }],
        navigation: { doorLanes: [{ x: 3, y: 0 }] },
        populationPlan: { reserved: [] }
    };

    it('keeps safe and medical profiles enemy-free', () => {
        const result = planRoomEncounter({
            ...baseRoom,
            themeConfig: { encounterProfile: 'sterile' }
        }, grid, () => 0, { depthTier: 4 });
        expect(result.spawns).toEqual([]);
    });

    it('places required nest guards only on valid room interior', () => {
        const result = planRoomEncounter({
            ...baseRoom,
            themeConfig: { encounterProfile: 'bio-nest-guard' }
        }, grid, () => 0, { depthTier: 4 });
        expect(result.spawns.length).toBeGreaterThan(0);
        for (const spawn of result.spawns) {
            expect(baseRoom.interior).toContainEqual({ x: spawn.x, y: spawn.y });
        }
    });

    it('rejects spawns in locked progression rings', () => {
        const result = planRoomEncounter({
            ...baseRoom,
            ring: 3,
            themeConfig: { encounterProfile: 'standard' }
        }, grid, () => 0, { depthTier: 2, maxUnlockedRing: 2 });
        expect(result.spawns).toEqual([]);
    });

    it('filters spawns by reachable navigation component', () => {
        const reachable = new Set(['2,2']); // Only (2,2) is reachable
        const result = planRoomEncounter({
            ...baseRoom,
            themeConfig: { encounterProfile: 'bio-nest-guard' }
        }, grid, () => 0, { depthTier: 2, reachableCells: reachable });
        expect(result.spawns.length).toBe(1);
        expect(result.spawns[0]).toMatchObject({ x: 2, y: 2 });
    });

    it('enforces maximum pressure budget', () => {
        const largeRoom = {
            id: 'arena',
            interior: Array.from({ length: 20 }, (_, i) => ({ x: i % 5 + 1, y: Math.floor(i / 5) + 1 })),
            navigation: { doorLanes: [] },
            contentBudget: { enemiesMax: 1 },
            themeConfig: { encounterProfile: 'bio-nest-guard' }
        };
        const result = planRoomEncounter(largeRoom, grid, () => 0, { depthTier: 3 });
        expect(result.spawns.length).toBe(1);
    });

    it('honors an explicit zero enemy pressure budget', () => {
        const result = planRoomEncounter({
            ...baseRoom,
            contentBudget: { enemiesMax: 0 },
            themeConfig: { encounterProfile: 'bio-nest-guard' }
        }, grid, () => 0, { depthTier: 3 });

        expect(result.spawns).toEqual([]);
    });

    it('does not fall back outside an authored encounter zone when every zone cell is invalid', () => {
        const result = planRoomEncounter({
            ...baseRoom,
            encounterZones: [{ id: 'sealed-stage', minX: 4, minY: 4, maxX: 4, maxY: 4 }],
            quietZones: [{ minX: 4, minY: 4, maxX: 4, maxY: 4 }],
            themeConfig: { encounterProfile: 'bio-nest-guard' }
        }, grid, () => 0, { depthTier: 3 });

        expect(result.spawns).toEqual([]);
    });

    it('does not fall back to reachable cells outside an unreachable authored zone', () => {
        const result = planRoomEncounter({
            ...baseRoom,
            encounterZones: [{ minX: 4, minY: 4, maxX: 4, maxY: 4 }],
            themeConfig: { encounterProfile: 'bio-nest-guard' }
        }, grid, () => 0, {
            depthTier: 3,
            reachableCells: new Set(['2,2', '3,3'])
        });

        expect(result.spawns).toEqual([]);
    });

    it('chunk encounters map all rooms', () => {
        const results = planChunkRoomEncounters([baseRoom], grid, () => 0, { depthTier: 1 });
        expect(results.length).toBe(1);
    });
});

describe('collectReachableCells', () => {
    const navigationGrid = [
        ['#', '.', '#', '#', '#'],
        ['#', '.', 'D', '.', '#'],
        ['#', '#', '#', '.', '#'],
        ['#', '.', '#', '#', '#'],
        ['#', '#', '#', '#', '#']
    ];

    it('floods normal floor and stamped doors from walkable border cells', () => {
        expect([...collectReachableCells(navigationGrid)].sort()).toEqual([
            '1,0', '1,1', '2,1', '3,1', '3,2'
        ]);
    });

    it('does not include isolated floor pockets', () => {
        expect(collectReachableCells(navigationGrid).has('1,3')).toBe(false);
    });

    it('treats explicitly blocked door cells as impassable', () => {
        const reachable = collectReachableCells(navigationGrid, { blockedCells: new Set(['2,1']) });
        expect([...reachable].sort()).toEqual(['1,0', '1,1']);
    });
});
