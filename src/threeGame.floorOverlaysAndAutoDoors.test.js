import * as THREE from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ThreeGame } from './threeGame.js';

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('floor overlays', () => {
    it('renders ground overlay decals as horizontal meshes above the floor', () => {
        const texture = new THREE.Texture();
        const game = {
            floorGeometry: new THREE.PlaneGeometry(1, 1),
            scatterTextures: { decal_oil_spill_patch: texture }
        };
        const overlay = ThreeGame.prototype.createScatterInstance.call(game, {
            type: 'decal_oil_spill_patch',
            x: 4,
            z: 7,
            scale: 1.2,
            rotation: 0.4,
            elevation: 0.01,
            scatterKey: 'ambient:1',
            groupType: 'prop',
            opacity: 1
        });

        expect(overlay).toBeInstanceOf(THREE.Mesh);
        expect(overlay).not.toBeInstanceOf(THREE.Sprite);
        expect(overlay.rotation.x).toBeCloseTo(-Math.PI / 2);
        expect(overlay.rotation.z).toBeCloseTo(0.4);
        expect(overlay.position.y).toBeGreaterThanOrEqual(0.03);
        expect(overlay.renderOrder).toBeGreaterThan(3);
        expect(overlay.material.polygonOffset).toBe(true);
        expect(overlay.userData.isFloorOverlay).toBe(true);

        texture.image = { width: 768, height: 512 };
        overlay.onBeforeRender();
        expect(overlay.scale.x).toBeCloseTo(1.8);

        overlay.material.dispose();
        game.floorGeometry.dispose();
        texture.dispose();
    });

    it('renders lived-in object props (decal_emergency_oxygen_nest) as standing 3D sprites like ship crash props', () => {
        const texture = new THREE.Texture();
        const spriteMat = new THREE.SpriteMaterial({ map: texture });
        const game = Object.assign(Object.create(ThreeGame.prototype), {
            scatterMaterials: { decal_emergency_oxygen_nest: spriteMat }
        });
        const sprite = ThreeGame.prototype.createScatterInstance.call(game, {
            type: 'decal_emergency_oxygen_nest',
            x: 4,
            z: 7,
            scale: 1.2,
            elevation: 0.08,
            scatterKey: 'ambient:2',
            groupType: 'prop',
            opacity: 1
        });

        expect(sprite).toBeInstanceOf(THREE.Sprite);
        expect(sprite.center.x).toBe(0.5);
        expect(sprite.center.y).toBe(0);
        expect(sprite.position.x).toBe(4);
        expect(sprite.position.z).toBe(7);
        expect(sprite.position.y).toBe(0.08);

        sprite.material.dispose();
        spriteMat.dispose();
        texture.dispose();
    });

    it('lays survival-pack bolts, cable coils, and bedrolls flat', () => {
        for (const type of ['scatter_bolts', 'scatter_cable_coil', 'prop_camp_bedrolls']) {
            const texture = new THREE.Texture();
            const geometry = new THREE.PlaneGeometry(1, 1);
            const overlay = ThreeGame.prototype.createScatterInstance.call({
                floorGeometry: geometry,
                scatterTextures: { [type]: texture }
            }, {
                type,
                x: 1,
                z: 2,
                scale: 1,
                rotation: 0,
                elevation: 0.01,
                scatterKey: `pack:${type}`,
                groupType: 'prop'
            });
            expect(overlay.userData.isFloorOverlay, type).toBe(true);
            expect(overlay.rotation.x, type).toBeCloseTo(-Math.PI / 2);
            overlay.material.dispose();
            geometry.dispose();
            texture.dispose();
        }
    });
});

describe('automatic doors', () => {
    function installHudStubs() {
        vi.stubGlobal('document', { getElementById: () => null });
        vi.stubGlobal('window', { AudioManager: { playMetalStress: vi.fn() } });
    }

    it('opens procedural doors on approach and closes them after departure', () => {
        installHudStubs();
        const mesh = new THREE.Object3D();
        mesh.userData = { worldX: 5, worldZ: 5, openY: -3, closedY: 1.5 };
        new THREE.Group().add(mesh);
        const door = { id: 'door', state: 'closed', lock: null };
        const game = {
            wallHeight: 2.8,
            player: { position: { x: 5, z: 6 } },
            proceduralDoorMeshes: new Map([['door', mesh]]),
            proceduralDoorStates: new Map([['door', door]]),
            mazeAccessState: {},
            isGameplayInputActive: () => true,
            activeInteractiveConsole: null
        };

        ThreeGame.prototype.updateProceduralDoors.call(game, 0.016);
        expect(game.proceduralDoorStates.get('door').state).toBe('open');

        game.player.position.set?.(20, 0, 20);
        game.player.position.x = 20;
        game.player.position.z = 20;
        ThreeGame.prototype.updateProceduralDoors.call(game, 0.016);
        expect(game.proceduralDoorStates.get('door').state).toBe('closed');
    });

    it('uses the same approach behavior for the crash-room blast door', () => {
        installHudStubs();
        const state = { open: false, destroyed: false, doorCenterX: 9, doorZ: 3, y: 1.4, targetY: 1.4, speed: 5.5 };
        const game = {
            bunkerBlastDoorGroup: { position: { y: 1.4 } },
            bunkerBlastDoorState: state,
            player: { position: { x: 9, z: 4 } },
            isGameplayInputActive: () => true,
            toggleBunkerBlastDoor: vi.fn(() => {
                state.open = !state.open;
                state.targetY = state.open ? -2.4 : 1.4;
            })
        };

        ThreeGame.prototype.updateBunkerBlastDoor.call(game, 0.016);
        expect(state.open).toBe(true);
        game.player.position.x = 20;
        game.player.position.z = 20;
        ThreeGame.prototype.updateBunkerBlastDoor.call(game, 0.016);
        expect(state.open).toBe(false);
        expect(game.toggleBunkerBlastDoor).toHaveBeenCalledTimes(2);
    });
});

describe('procedural door reinforcement ribs', () => {
    it('parents all three ribs to the animated slab so they move together', () => {
        const slab = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
        slab.scale.set(3.35, 1.72, 0.58);
        slab.position.set(5, 2.4, 8);
        const ribGroup = ThreeGame.prototype.attachProceduralDoorRibs.call({}, slab, true);

        expect(ribGroup.parent).toBe(slab);
        expect(ribGroup.children).toHaveLength(3);
        slab.position.y = -4;
        slab.updateMatrixWorld(true);
        const ribWorldY = new THREE.Vector3();
        ribGroup.children[1].getWorldPosition(ribWorldY);
        expect(ribWorldY.y).toBeCloseTo(-4);

        slab.geometry.dispose();
        ribGroup.children[0].geometry.dispose();
        ribGroup.children[0].material.dispose();
    });
});

describe('wall decals and showroom gallery', () => {
    it('mounts wall decals at mid-wall height facing outward along the wall normal', () => {
        const texture = new THREE.Texture();
        const game = Object.assign(Object.create(ThreeGame.prototype), {
            wallHeight: 2.8,
            scatterTextures: { decal_hazard_stripes: texture },
            getTileType: vi.fn(() => '.')
        });

        // Test explicit North wall face (normal faces South: nx=0, nz=1)
        const decal = ThreeGame.prototype.createScatterInstance.call(game, {
            type: 'decal_hazard_stripes',
            x: 5,
            z: 8,
            scale: 1.0,
            wallNormal: { x: 0, z: 1 }
        });

        expect(decal).toBeInstanceOf(THREE.Mesh);
        expect(decal.userData.isWallDecal).toBe(true);
        expect(decal.position.y).toBeCloseTo(2.8 * 0.48);
        expect(decal.rotation.y).toBeCloseTo(0);
        expect(decal.material.depthWrite).toBe(false);
        expect(decal.material.side).toBe(THREE.DoubleSide);
        expect(decal.position.z).toBeCloseTo(8 - 0.5 + 0.02);
        expect(decal.geometry.parameters.width).toBeLessThanOrEqual(0.96);

        // Test explicit West wall face (normal faces East: nx=1, nz=0)
        const westDecal = ThreeGame.prototype.createScatterInstance.call(game, {
            type: 'decal_hazard_stripes',
            x: 10,
            z: 12,
            scale: 1.0,
            wallNormal: { x: 1, z: 0 }
        });
        expect(westDecal.rotation.y).toBeCloseTo(Math.PI / 2);
        expect(westDecal.position.x).toBeCloseTo(10 - 0.5 + 0.02);

        decal.material.dispose();
        westDecal.material.dispose();
        texture.dispose();
    });

    it('auto-snaps wall decals to adjacent wall tiles when wallNormal is omitted', () => {
        const texture = new THREE.Texture();
        const game = Object.assign(Object.create(ThreeGame.prototype), {
            wallHeight: 2.8,
            scatterTextures: { decal_wall_breach: texture },
            getTileType: vi.fn((x, z) => (x === 4 && z === 6 ? '#' : '.')) // Wall is to the North (z=6)
        });

        const decal = ThreeGame.prototype.createScatterInstance.call(game, {
            type: 'decal_wall_breach',
            x: 4,
            z: 7, // tile at (4, 7), North neighbor is (4, 6) = '#'
            scale: 1.0
        });

        expect(decal).toBeInstanceOf(THREE.Mesh);
        expect(decal.userData.isWallDecal).toBe(true);
        expect(decal.rotation.y).toBeCloseTo(0); // Normal is (0, 1) facing South
        expect(decal.position.z).toBeCloseTo(7 - 0.5 + 0.02);

        decal.material.dispose();
        texture.dispose();
    });

    it('generates an open walkable grid for showroom chunks without hostile spawns or maze walls', () => {
        const game = Object.assign(Object.create(ThreeGame.prototype), {
            chunkSize: 19,
            performanceProfile: 'gameplay'
        });

        const grid = game.buildChunk(500, 500);
        expect(grid.length).toBe(19);
        expect(grid[0].length).toBe(19);
        expect(grid.every((row) => row.every((cell) => cell === '.'))).toBe(true);

        expect(game.isSnailTileWalkable(500 * 19 + 5, 500 * 19 + 5)).toBe(true);

        const scatter = game.createChunkScatterPlacements(500, 500, grid);
        expect(scatter).toEqual([]);
    });

    it('builds and caches showroom scene reliably', async () => {
        const game = Object.assign(Object.create(ThreeGame.prototype), {
            chunkSize: 19,
            scene: new THREE.Scene(),
            createScatterInstance: vi.fn(() => new THREE.Group()),
            createWorld3dModel: vi.fn(async () => new THREE.Group())
        });

        const showroom1 = await game.buildDebugShowroom({ debug: true });
        expect(showroom1).toBeDefined();
        expect(showroom1.spawnX).toBe(500 * 19 + 10);
        expect(showroom1.spawnZ).toBe(500 * 19 + 10);

        const showroom2 = await game.buildDebugShowroom({ debug: true });
        expect(showroom2).toBe(showroom1);
    });

    it('does not build the showroom without an explicit debug token', async () => {
        const game = Object.assign(Object.create(ThreeGame.prototype), {
            chunkSize: 19,
            scene: new THREE.Scene()
        });

        await expect(game.buildDebugShowroom()).rejects.toThrow(/explicit debug entry point/);
    });
});
