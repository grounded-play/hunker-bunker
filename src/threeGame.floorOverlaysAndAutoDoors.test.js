import * as THREE from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ThreeGame } from './threeGame.js';

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('floor overlays', () => {
    it('renders room decals as horizontal meshes above the floor', () => {
        const texture = new THREE.Texture();
        const game = {
            floorGeometry: new THREE.PlaneGeometry(1, 1),
            scatterTextures: { decal_worker_sleep_roll: texture }
        };
        const overlay = ThreeGame.prototype.createScatterInstance.call(game, {
            type: 'decal_worker_sleep_roll',
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
