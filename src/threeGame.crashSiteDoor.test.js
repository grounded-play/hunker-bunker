import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { ThreeGame } from './threeGame.js';
import { CHUNK_SIZE } from './tileCatalog.js';
import { CRASH_SITE_BUILD } from './data/crashSiteBuild.js';

function makeFakeGame() {
    return {
        performanceProfile: 'gameplay',
        chunkSize: CHUNK_SIZE,
        chunkCellCount: (CHUNK_SIZE - 1) / 2,
        crashedShips: null,
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
        const room = CRASH_SITE_BUILD.primaryChamber;
        expect(grid[room.top].slice(room.left, room.right + 1).every((cell) => cell === '.')).toBe(true);
        expect(grid[room.bottom].slice(room.left, room.right + 1).every((cell) => cell === '.')).toBe(true);
        expect(grid[1][1]).toBe('X');
        expect(grid[room.bottom + 1][9]).toBe('#');
        expect(grid[room.bottom + 1][CHUNK_SIZE - 1]).toBe('X');
        expect(grid[1][CHUNK_SIZE - 1]).toBe('X');

        const spawn = game.getSpawnTile();
        expect(spawn).toEqual({ x: 9, y: 9 });
        expect(grid[spawn.y][spawn.x]).toBe('.');
    });

    it('starts with the north blast door retracted so the only exit is traversable', () => {
        const game = {
            scene: { add: () => {} }
        };
        ThreeGame.prototype.setupBunkerBlastDoor.call(game);

        expect(game.bunkerBlastDoorState).toMatchObject({
            open: true,
            destroyed: false,
            doorZ: 3,
            startTileX: 8,
            endTileX: 10,
            targetY: -2.4,
            autoClose: false
        });
        expect(game.bunkerDoorButtons.interior.z).toBeGreaterThan(game.bunkerBlastDoorState.doorZ);
        expect(game.bunkerDoorButtons.exterior.z).toBeLessThan(game.bunkerBlastDoorState.doorZ);
        expect(game.bunkerFogVeilMesh).toBeUndefined();
    });

    it('resets a previously destroyed blast door to its open run-start state', () => {
        const game = {
            bunkerBlastDoorState: {
                open: false,
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
            open: true,
            destroyed: false,
            hp: 25,
            y: -2.4,
            targetY: -2.4
        });
        expect(game.bunkerBlastDoorGroup.position.y).toBe(-2.4);
        expect(game.bunkerBlastDoorGroup.visible).toBe(true);
    });

    it('fits authored frame/slab art while retaining an invisible raycast proxy', async () => {
        const scene = new THREE.Group();
        const doorGroup = new THREE.Group();
        doorGroup.position.set(9, 1.4, 3);
        const proxy = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial());
        proxy.userData.isBunkerBlastDoor = true;
        const rib = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial());
        doorGroup.add(proxy, rib);
        scene.add(doorGroup);
        const provisionalLight = new THREE.PointLight(0xff0000, 1, 3);
        scene.add(provisionalLight);
        const roots = new Map();
        const game = {
            scene,
            bunkerBlastDoorGroup: doorGroup,
            _bunkerDoorStatusLight: provisionalLight,
            createWorld3dModel: async (type) => {
                const root = new THREE.Group();
                root.name = type;
                root.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial()));
                roots.set(type, root);
                return root;
            }
        };

        expect(await ThreeGame.prototype.upgradeBunkerBlastDoorToModel.call(game)).toBe(true);
        expect(roots.get('door_arch_guillotine_frame').parent.position.toArray()).toEqual([9, 0, 3]);
        expect(roots.get('door_arch_guillotine_slab').parent).toBe(doorGroup);
        expect(roots.get('door_arch_guillotine_slab').position.y).toBe(-1.4);
        expect(proxy.visible).toBe(true);
        expect(proxy.material.colorWrite).toBe(false);
        expect(rib.visible).toBe(false);
        expect(provisionalLight.parent).toBeNull();
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
