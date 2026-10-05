import { describe, expect, it } from 'vitest';
import { ThreeGame, isRoomGatewayFrameEligible } from './threeGame.js';
import { GATEWAY_ROOM_INSET } from './kitGrammar.js';

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

    it('gives authored rooms one open kit gateway without changing collision authority', () => {
        const game = makeFakeGame();
        game.getBiomeKeyForWorldPosition = () => 'active';
        game.wfcMetadataCache = new Map([['0,0', {
            generatorId: 'authored-room',
            roomInstances: [{
                id: 'medical-bay',
                doors: [{
                    id: 'entry',
                    side: 'e',
                    cells: [{ x: 14, y: 7 }, { x: 14, y: 8 }, { x: 14, y: 9 }]
                }],
                populationPlan: { placements: [] }
            }]
        }]]);

        const placements = ThreeGame.prototype.createChunkSetPiecePlacements.call(
            game,
            0,
            0,
            buildTwoBlockGrid(17)
        );
        const gateway = placements.find(({ scatterKey }) => scatterKey.startsWith('room-gateway:'));

        expect(gateway).toMatchObject({
            x: 14 - GATEWAY_ROOM_INSET,
            z: 8,
            type: 'kit_space_gate',
            rotation: Math.PI / 2,
            socketed: true,
            modelScale: 1,
            hp: Infinity,
            groupType: 'architecture',
            isSolidProp: false
        });
    });

    it.each([
        ['locked procedural gate', { doors: [{ id: 'entry', lock: { type: 'power' } }] }, {}],
        ['ring crossing', { ringCrossingId: 'ring-2' }, {}],
        ['authored structural gateway', {}, { roomBuild: { id: 'ring_crossing_landmark', family: 'gate' } }],
        ['content-plan bulkhead', {}, { contentPlan: { structural: [{ type: 'arch_bulkhead_frame' }] } }]
    ])('does not double-frame a %s', (_label, metadata, roomPatch) => {
        const door = { id: 'entry', side: 'n', cells: [{ x: 7, y: 2 }] };
        const room = { id: 'room', doors: [door], populationPlan: { placements: [] }, ...roomPatch };
        const game = makeFakeGame();
        game.getBiomeKeyForWorldPosition = () => 'active';
        game.wfcMetadataCache = new Map([['0,0', { roomInstances: [room], ...metadata }]]);

        expect(isRoomGatewayFrameEligible(room, door, { roomInstances: [room], ...metadata })).toBe(false);
        const placements = ThreeGame.prototype.createChunkSetPiecePlacements.call(
            game, 0, 0, buildTwoBlockGrid(17)
        );
        expect(placements.some(({ scatterKey }) => scatterKey.startsWith('room-gateway:'))).toBe(false);
    });

    it('keeps an ordinary legacy door without an id eligible for a presentation frame', () => {
        const door = { side: 'w', cells: [{ x: 2, y: 4 }, { x: 2, y: 5 }, { x: 2, y: 6 }] };
        expect(isRoomGatewayFrameEligible({ id: 'legacy-room', doors: [door] }, door)).toBe(true);
    });

    it('turns hallway route markers into biome-skinned, cardinal kit architecture', () => {
        const game = makeFakeGame();
        game.getBiomeKeyForWorldPosition = () => 'bio';
        game.wfcMetadataCache = new Map([['0,0', {
            generatorId: 'hallway-connector',
            roomInstances: [],
            wayfindingMarkers: [{
                x: 12,
                y: 3,
                dressingKit: 'pipes_and_cable_trays',
                lightingRhythm: 'dim'
            }]
        }]]);

        const connectorGrid = Array.from({ length: 17 }, () => Array(17).fill('#'));
        for (let x = 10; x <= 14; x += 1) connectorGrid[3][x] = '.';
        const placements = ThreeGame.prototype.createChunkSetPiecePlacements.call(
            game,
            0,
            0,
            connectorGrid
        );
        const kit = placements.find((placement) => placement.scatterKey.startsWith('hallway-kit:'));

        // An east-west route: the base corridor module already runs east-west
        // (measured from the kit's walls), so no turn.
        expect(kit).toMatchObject({
            type: 'kit_cave_corridor',
            rotation: 0,
            socketed: true,
            modelScale: 1,
            groupType: 'architecture',
            isSolidProp: false,
            dressingKit: 'pipes_and_cable_trays',
            lightingRhythm: 'dim'
        });
    });

    it('fits a wide hallway with the wide module, turned along a north-south route', () => {
        const game = makeFakeGame();
        game.getBiomeKeyForWorldPosition = () => 'active';
        game.wfcMetadataCache = new Map([['0,0', {
            generatorId: 'hallway-connector',
            roomInstances: [],
            wayfindingMarkers: [{ x: 8, y: 8, width: 3, dressingKit: 'gate_staging', lightingRhythm: 'dim' }]
        }]]);
        const connectorGrid = Array.from({ length: 17 }, () => Array(17).fill('#'));
        for (let y = 0; y < 17; y += 1) for (let x = 5; x <= 11; x += 1) connectorGrid[y][x] = '.';
        const placements = ThreeGame.prototype.createChunkSetPiecePlacements.call(game, 0, 0, connectorGrid);
        const kit = placements.find((placement) => placement.scatterKey.startsWith('hallway-kit:'));
        expect(kit).toMatchObject({ type: 'kit_space_corridor_wide', rotation: Math.PI / 2, socketed: true });
        expect(kit.modelScale).toBeCloseTo(7 / 6, 5);
    });
});
