import { describe, expect, it } from 'vitest';
import {
    findWorldPlanReservationConflicts,
    getWorldReservationFootprintCells
} from './ringManifest.js';

describe('WorldPlan multi-chunk reservation footprints', () => {
    it('keeps existing reservations backward-compatible as 1x1', () => {
        expect(getWorldReservationFootprintCells({ chunkX: 4, chunkY: -2, chunkKey: '4,-2' }))
            .toEqual([{ chunkX: 4, chunkY: -2, chunkKey: '4,-2' }]);
    });

    it('expands rectangular footprints from their anchor and optional offset', () => {
        expect(getWorldReservationFootprintCells({
            chunkX: 4,
            chunkY: 5,
            footprint: { w: 2, d: 2, offsetX: -1, offsetY: 0 }
        }).map((cell) => cell.chunkKey)).toEqual(['3,5', '4,5', '3,6', '4,6']);
    });

    it('accepts blueprint-style offset footprints', () => {
        expect(getWorldReservationFootprintCells({
            chunkX: 4,
            chunkY: 5,
            footprint: [{ dx: 0, dy: -1 }, { dx: 0, dy: 0 }, { dx: 0, dy: 1 }]
        }).map((cell) => cell.chunkKey)).toEqual(['4,4', '4,5', '4,6']);
    });

    it('detects overlap on a non-pivot footprint cell', () => {
        const worldPlan = {
            reservations: [
                { id: 'bridge', chunkX: 4, chunkY: 5, chunkKey: '4,5', footprint: { w: 1, d: 3, offsetY: -1 } },
                { id: 'hospital', chunkX: 4, chunkY: 6, chunkKey: '4,6' }
            ],
            territories: []
        };
        expect(findWorldPlanReservationConflicts(worldPlan)).toContainEqual({
            kind: 'reservation_overlap',
            chunkKey: '4,6',
            reservationIds: ['bridge', 'hospital']
        });
    });
});
