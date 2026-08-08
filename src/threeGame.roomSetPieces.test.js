import { describe, expect, it } from 'vitest';
import { ThreeGame } from './threeGame.js';

// A grid with two solid 5x3 floor blocks, far enough apart that neither has
// any "doorway" cell (wall-floor-wall on one axis) — isolates the "Room Set
// Pieces" roll path from the separate archway-pillar path, both of which
// live in createChunkSetPiecePlacements.
function buildTwoBlockGrid(chunkSize) {
    const grid = Array.from({ length: chunkSize }, () => Array(chunkSize).fill('#'));
    for (let y = 2; y <= 4; y += 1) {
        for (let x = 2; x <= 6; x += 1) grid[y][x] = '.'; // "chamber" block
        for (let x = 10; x <= 14; x += 1) grid[y][x] = '.'; // "corridor" block
    }
    return grid;
}

function buildRoomTypeGrid(chunkSize) {
    const roomTypes = Array.from({ length: chunkSize }, () => Array(chunkSize).fill(null));
    for (let y = 2; y <= 4; y += 1) {
        for (let x = 2; x <= 6; x += 1) roomTypes[y][x] = 'chamber';
        for (let x = 10; x <= 14; x += 1) roomTypes[y][x] = 'corridor';
    }
    return roomTypes;
}

function makeFakeGame() {
    return {
        chunkSize: 17,
        runEntropy: 1,
        globalSeedOffset: 0,
        hashTile: ThreeGame.prototype.hashTile,
        // Always returns 0: doorway roll (< 0.25) and prop roll (< 0.07)
        // both "succeed" every time they're checked, isolating room-gating
        // as the only thing that can still exclude a placement.
        createSeededRandom: () => () => 0,
        getRoomTypeGrid: () => buildRoomTypeGrid(17),
        getSpawnTile: () => ({ x: 100, y: 100 })
    };
}

describe('createChunkSetPiecePlacements — room-gated set dressing', () => {
    it('only places Room Set Pieces on chamber-classified cells, never corridor cells', () => {
        const game = makeFakeGame();
        const grid = buildTwoBlockGrid(17);
        const placements = ThreeGame.prototype.createChunkSetPiecePlacements.call(game, 0, 0, grid);

        const roomPropPlacements = placements.filter((p) => p.scatterKey.startsWith('prop:'));
        expect(roomPropPlacements.length).toBeGreaterThan(0);

        for (const placement of roomPropPlacements) {
            const localX = Math.round(placement.x);
            const localY = Math.round(placement.z);
            // The corridor block spans local x 10..14 — none of those columns
            // should ever produce a room set piece.
            expect(localX, `placement at (${localX},${localY})`).toBeLessThan(10);
        }
    });

    it('removes authored props from the ship starting-room clear zone', () => {
        const game = makeFakeGame();
        game.getSpawnTile = () => ({ x: 3, y: 3 });
        game.wfcMetadataCache = new Map([['0,0', {
            roomInstances: [{
                populationPlan: {
                    placements: [
                        { id: 'near', x: 4, y: 4, kind: 'signature', type: 'prop_bunker_supplies' },
                        { id: 'far', x: 14, y: 14, kind: 'signature', type: 'prop_specimen_tank' }
                    ]
                }
            }]
        }]]);

        const placements = ThreeGame.prototype.createChunkSetPiecePlacements.call(
            game,
            0,
            0,
            buildTwoBlockGrid(17)
        );

        expect(placements.map(({ scatterKey }) => scatterKey)).toEqual(['room_plan:far']);
    });
});
