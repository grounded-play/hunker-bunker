import { describe, expect, it } from 'vitest';
import { ThreeGame } from './threeGame.js';

function makeFakeGame() {
    return {
        performanceProfile: 'gameplay',
        chunkSize: 19,
        chunkCellCount: 9,
        getSpawnTile: ThreeGame.prototype.getSpawnTile
    };
}

describe('clearSpawnArea — door/portal alignment', () => {
    it('authors one circular room with its only exit centered on the north/top wall', () => {
        const game = makeFakeGame();
        const grid = Array(19).fill(null).map(() => Array(19).fill('.'));
        ThreeGame.prototype.clearSpawnArea.call(game, grid, 0, 0);

        expect(grid[0].slice(8, 11)).toEqual(['.', '.', '.']);
        for (let x = 0; x < 19; x += 1) {
            if (x >= 8 && x <= 10) continue;
            expect(grid[0][x], `north edge x=${x}`).toBe('#');
        }
        expect(grid[9][9]).toBe('.');
        expect(grid[1][1]).toBe('#');
        expect(grid[17][17]).toBe('#');
        expect(grid[18].every((cell) => cell === '#')).toBe(true);
        expect(grid.every((row) => row[0] === '#')).toBe(true);
        expect(grid.every((row) => row[18] === '#')).toBe(true);
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
            chunkCellCount: 9,
            hashTile: () => 99
        };
        expect(ThreeGame.prototype.getEdgeOpening.call(game, 'horizontal', 0, 0)).toEqual({
            open: true,
            offset: 4
        });
    });
});
