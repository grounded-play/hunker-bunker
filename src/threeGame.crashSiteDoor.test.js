import { describe, expect, it } from 'vitest';
import { ThreeGame } from './threeGame.js';
import { CHUNK_SIZE } from './tileCatalog.js';

function makeFakeGame() {
    return {
        performanceProfile: 'gameplay',
        chunkSize: CHUNK_SIZE,
        chunkCellCount: (CHUNK_SIZE - 1) / 2,
        getSpawnTile: ThreeGame.prototype.getSpawnTile
    };
}

describe('clearSpawnArea — door/portal alignment', () => {
    it('turns touching cliff tops into a walkable secret path while isolated cliffs still fall', () => {
        const tiles = new Map([
            ['4,4', 'C'],
            ['5,4', 'C'],
            ['9,9', 'C']
        ]);
        const game = {
            getTileType: (x, z) => tiles.get(`${x},${z}`) ?? 'X',
            // isCliffSecretPath reads getCachedTileType (cache-only, never
            // triggers a chunk build) rather than getTileType -- same fake
            // lookup semantics are fine here since this test has no real
            // chunkCache to peek.
            getCachedTileType: (x, z) => tiles.get(`${x},${z}`) ?? 'X',
            getWallKey: (x, z) => `${x},${z}`,
            filledHoleKeys: new Set(),
            isCliffSecretPath: ThreeGame.prototype.isCliffSecretPath
        };

        expect(ThreeGame.prototype.isCliffSecretPath.call(game, 4, 4)).toBe(true);
        expect(ThreeGame.prototype.getHoleVisualInfo.call(game, 4, 4)).toBeNull();
        expect(ThreeGame.prototype.getHoleVisualInfo.call(game, 9, 9)).toMatchObject({ cliff: true, lethal: true });
    });

    it('allows snails only on structural floor and traversal tiles', () => {
        const game = {
            getTileType: (x) => ({
                0: '.',
                1: 'R',
                2: 'B',
                3: 'L',
                4: '#',
                5: 'X',
                6: 'C',
                7: 'P',
                8: null
            })[x]
        };

        expect([0, 1, 2, 3].every((x) => ThreeGame.prototype.isSnailTileWalkable.call(game, x, 0))).toBe(true);
        expect([4, 5, 6, 7, 8].some((x) => ThreeGame.prototype.isSnailTileWalkable.call(game, x, 0))).toBe(false);
    });

    it('keeps the crash-floor decal centered under the active class ship', () => {
        const floorPosition = { x: 0, z: 0 };
        const game = {
            playerType: 'TANK',
            crashedShips: [
                { type: 'SCOUT', tileX: 9, tileZ: 9, isVisible: false },
                { type: 'TANK', tileX: 9, tileZ: 9, isVisible: false },
                { type: 'ENGINEER', tileX: 9, tileZ: 9, isVisible: false }
            ],
            crashSiteFloorMesh: { position: floorPosition }
        };

        ThreeGame.prototype.updateCrashedShipsVisibility.call(game);

        expect(floorPosition).toMatchObject({ x: 9, z: 9 });
        expect(game.crashedShips.map((ship) => ship.isVisible)).toEqual([false, true, false]);
    });

    it('authors one enlarged crash room with canyon outside and one north exit', () => {
        const game = makeFakeGame();
        const grid = Array(CHUNK_SIZE).fill(null).map(() => Array(CHUNK_SIZE).fill('.'));
        ThreeGame.prototype.clearSpawnArea.call(game, grid, 0, 0);

        expect(grid[0].slice(8, 11)).toEqual(['.', '.', '.']);
        for (let x = 0; x < CHUNK_SIZE; x += 1) {
            if (x >= 8 && x <= 10) continue;
            const expected = x === 7 || x === 11 ? '#' : 'X';
            expect(grid[0][x], `north edge x=${x}`).toBe(expected);
        }
        expect(grid[9][9]).toBe('.');
        expect(grid[4].slice(2, 17).every((cell) => cell === '.')).toBe(true);
        expect(grid[17].slice(2, 17).every((cell) => cell === '.')).toBe(true);
        expect(grid[1][1]).toBe('X');
        expect(grid[18][9]).toBe('#');
        expect(grid[18][0]).toBe('X');
        expect(grid.every((row) => row[0] === 'X')).toBe(true);
        expect(grid.every((row) => row[CHUNK_SIZE - 1] === 'X')).toBe(true);

        const spawn = game.getSpawnTile();
        expect(spawn).toEqual({ x: 9, y: 9 });
        expect(grid[spawn.y][spawn.x]).toBe('.');
    });

    it('starts the north blast door closed across that three-wide hallway', () => {
        const game = {
            scene: { add: () => {} }
        };
        ThreeGame.prototype.setupBunkerBlastDoor.call(game);

        expect(game.bunkerBlastDoorState).toMatchObject({
            open: false,
            destroyed: false,
            doorZ: 3,
            startTileX: 8,
            endTileX: 10,
            targetY: 1.4
        });
        expect(game.bunkerDoorButtons.interior.z).toBeGreaterThan(game.bunkerBlastDoorState.doorZ);
        expect(game.bunkerDoorButtons.exterior.z).toBeLessThan(game.bunkerBlastDoorState.doorZ);
        expect(game.bunkerFogVeilMesh).toBeUndefined();
    });

    it('resets a previously opened or destroyed blast door to its closed run-start state', () => {
        const game = {
            bunkerBlastDoorState: {
                open: true,
                destroyed: true,
                hp: 0,
                maxHp: 25,
                y: -2.4,
                targetY: -2.4
            },
            bunkerBlastDoorGroup: {
                position: { y: -2.4 },
                visible: false
            }
        };

        ThreeGame.prototype.resetBunkerBlastDoor.call(game);

        expect(game.bunkerBlastDoorState).toMatchObject({
            open: false,
            destroyed: false,
            hp: 25,
            y: 1.4,
            targetY: 1.4
        });
        expect(game.bunkerBlastDoorGroup.position.y).toBe(1.4);
        expect(game.bunkerBlastDoorGroup.visible).toBe(true);
    });

    it('forces the shared north edge portal to the authored hallway center', () => {
        const game = {
            chunkCellCount: (CHUNK_SIZE - 1) / 2,
            hashTile: () => 99
        };
        expect(ThreeGame.prototype.getEdgeOpening.call(game, 'horizontal', 0, 0)).toEqual({
            open: true,
            offset: 4
        });
    });
});
