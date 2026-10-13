import { describe, expect, it } from 'vitest';
import {
    auditDoorApronPlacements,
    collectDoorApronCells,
    filterDoorApronPlacements,
    isOutsideDoorApron
} from './placementSafety.js';

describe('placementSafety', () => {
    it('collects and de-duplicates authored lanes and runtime door cells', () => {
        expect(collectDoorApronCells({
            roomInstances: [{ navigation: { doorLanes: [{ x: 4, y: 5 }, { x: 5, y: 5 }] } }],
            doors: [{ localX: 4, localY: 5, cells: [{ x: 5, y: 5 }, { x: 6, y: 5 }] }]
        })).toEqual([{ x: 4, y: 5 }, { x: 5, y: 5 }, { x: 6, y: 5 }]);
    });

    it('uses world, local, and pickup coordinates in the final audit', () => {
        const placements = [
            { id: 'world-blocker', x: 26, z: 45 },
            { id: 'pickup-blocker', worldX: 26, worldZ: 45 },
            { id: 'local-blocker', localX: 6, localY: 5 },
            { id: 'safe', x: 29, z: 45 }
        ];
        const result = auditDoorApronPlacements(placements, [{ x: 6, y: 5 }], {
            chunkX: 1,
            chunkY: 2,
            chunkSize: 20
        });
        expect(result.safe.map(({ id }) => id)).toEqual(['safe']);
        expect(result.violations.map(({ placement }) => placement.id)).toEqual([
            'world-blocker', 'pickup-blocker', 'local-blocker'
        ]);
    });

    it('keeps a non-solid gateway frame at its threshold but removes gameplay blockers', () => {
        const doorCells = [{ x: 8, y: 4 }];
        const placements = [
            { id: 'gateway', x: 8, z: 4, groupType: 'architecture', isSolidProp: false },
            { id: 'crate', x: 8, z: 4, groupType: 'prop' },
            { id: 'enemy', x: 8.5, z: 4, groupType: 'room-encounter' },
            { id: 'lamp', x: 11, z: 4, groupType: 'prop' }
        ];
        expect(filterDoorApronPlacements(placements, doorCells).map(({ id }) => id))
            .toEqual(['gateway', 'lamp']);
    });

    it('preserves the established 1.6-cell clearance contract', () => {
        const doors = [{ x: 5, y: 5 }];
        expect(isOutsideDoorApron(5, 5, doors)).toBe(false);
        expect(isOutsideDoorApron(6, 6, doors)).toBe(false);
        expect(isOutsideDoorApron(7, 5, doors)).toBe(true);
    });
});
