import { describe, expect, it } from 'vitest';
import {
    cameraCutawayQuadrant,
    isDefaultCameraFacingRoomWall,
    planDefaultRoomCutawayCells,
    planRoomBoundaryCells,
    planRoomCutawayCells,
    planRoomPracticalLights,
    ROOM_CUTAWAY_HEIGHT
} from './roomPresentation.js';
import { collapseChunkLattice, extractChunkWfcMetadata } from './wfcGenerator.js';

function room(width = 5, depth = 3) {
    const interior = [];
    for (let y = 1; y <= depth; y += 1) {
        for (let x = 1; x <= width; x += 1) interior.push({ x, y });
    }
    return { interior };
}

describe('room presentation planning', () => {
    it('places a bounded pair of fixtures along a large room long axis', () => {
        const plan = planRoomPracticalLights(room(6, 3), { biome: 'active' });
        expect(plan.fixtures).toHaveLength(2);
        expect(plan.fixtures.every((fixture) => fixture.rotationY === 0)).toBe(true);
        expect(plan.fixtures.every((fixture) => fixture.z === 1)).toBe(true);
        expect(plan.proxy).toMatchObject({ color: 0x71cddf, intensity: 1.45, distance: 7.5 });
    });

    it('uses one fixture for compact rooms and a biome-specific palette', () => {
        const plan = planRoomPracticalLights(room(2, 2), { biome: 'bio' });
        expect(plan.fixtures).toHaveLength(1);
        expect(plan.fixtures[0].color).toBe(0x63e6a7);
        expect(plan.proxy.color).toBe(0x63e6a7);
    });

    it('identifies only the east and south foreground walls for the default camera', () => {
        const sample = room(3, 3);
        expect(isDefaultCameraFacingRoomWall({ x: 4, y: 2 }, sample)).toBe(true);
        expect(isDefaultCameraFacingRoomWall({ x: 2, y: 4 }, sample)).toBe(true);
        expect(isDefaultCameraFacingRoomWall({ x: 0, y: 2 }, sample)).toBe(false);
        expect(isDefaultCameraFacingRoomWall({ x: 2, y: 0 }, sample)).toBe(false);
        expect(ROOM_CUTAWAY_HEIGHT).toBeLessThan(1);
    });

    it('finds foreground walls in a real collapsed bunker layout', () => {
        let state = 42;
        const random = () => {
            state ^= state << 13;
            state ^= state >>> 17;
            state ^= state << 5;
            return (state >>> 0) / 4294967296;
        };
        const metadata = extractChunkWfcMetadata(collapseChunkLattice(random));
        const foreground = metadata.roomInstances.flatMap((candidate) => (
            candidate.wallCells.filter((cell) => isDefaultCameraFacingRoomWall(cell, candidate))
        ));
        expect(metadata.roomInstances.length).toBeGreaterThan(0);
        expect(foreground.length).toBeGreaterThan(0);
    });

    it('derives cutaways from the final grid when wall metadata is absent', () => {
        const sample = room(3, 3);
        const grid = Array.from({ length: 6 }, () => Array(6).fill('.'));
        for (let index = 1; index <= 3; index += 1) {
            grid[index][4] = '#';
            grid[4][index] = '#';
        }
        expect(planDefaultRoomCutawayCells(sample, grid)).toEqual(expect.arrayContaining([
            { x: 4, y: 2 },
            { x: 2, y: 4 }
        ]));
        expect(planDefaultRoomCutawayCells(sample, grid)).toHaveLength(6);
    });

    it('maps camera azimuths to stable world quadrants', () => {
        expect(cameraCutawayQuadrant(Math.PI / 4)).toBe('se');
        expect(cameraCutawayQuadrant((Math.PI * 3) / 4)).toBe('ne');
        expect(cameraCutawayQuadrant((-Math.PI * 3) / 4)).toBe('nw');
        expect(cameraCutawayQuadrant(-Math.PI / 4)).toBe('sw');
        expect(cameraCutawayQuadrant(-0.01, 'se')).toBe('se');
        expect(cameraCutawayQuadrant(-0.12, 'se')).toBe('sw');
    });

    it('selects the two room edges nearest each camera quadrant', () => {
        const sample = room(3, 3);
        const grid = Array.from({ length: 6 }, () => Array(6).fill('.'));
        for (let index = 1; index <= 3; index += 1) {
            grid[index][0] = '#';
            grid[index][4] = '#';
            grid[0][index] = '#';
            grid[4][index] = '#';
        }
        expect(planRoomCutawayCells(sample, grid, 'se')).toContainEqual({ x: 4, y: 2 });
        expect(planRoomCutawayCells(sample, grid, 'se')).toContainEqual({ x: 2, y: 4 });
        expect(planRoomCutawayCells(sample, grid, 'nw')).toContainEqual({ x: 0, y: 2 });
        expect(planRoomCutawayCells(sample, grid, 'nw')).toContainEqual({ x: 2, y: 0 });
        expect(planRoomBoundaryCells(sample, grid)).toHaveLength(12);
    });
});
