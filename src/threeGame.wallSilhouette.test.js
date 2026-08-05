import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { ThreeGame } from './threeGame.js';

describe('ThreeGame - Wall Occlusion & Scanned Enemy Silhouette Outlines', () => {
    it('creates hidden player marker with floor ring and upright silhouette group', () => {
        const marker = ThreeGame.prototype.createHiddenPlayerMarker.call({ playerHeight: 1.1 });
        expect(marker).toBeInstanceOf(THREE.Group);
        expect(marker.children.length).toBeGreaterThanOrEqual(3);

        const silhouetteGroup = marker.children.find((c) => c instanceof THREE.Group);
        expect(silhouetteGroup).toBeDefined();
        // Should contain 8 outline sprites + 1 inner sprite = 9 sprites
        expect(silhouetteGroup.children).toHaveLength(9);
    });

    it('updates player silhouette texture map and opacity when hidden', () => {
        const fakeGame = {
            camera: { position: new THREE.Vector3(0, 10, 10) },
            player: { position: new THREE.Vector3(0, 0, 0) },
            playerRadius: 0.4,
            playerHeight: 1.1,
            playerSpriteLead: 0.1,
            playerSprite: {
                scale: new THREE.Vector3(1, 1, 1),
                material: { map: { id: 'player_map_1' } }
            },
            wallMeshes: [{ isMesh: true }],
            raycaster: {
                set: () => {},
                intersectObjects: () => [{ distance: 5 }]
            },
            playerMarker: {
                visible: false,
                children: [
                    { material: { opacity: 0 }, lookAt: () => {} },
                    { material: { opacity: 0 } }
                ]
            },
            playerSilhouetteGroup: new THREE.Group(),
            _playerSilhouetteOutlineMats: [new THREE.SpriteMaterial()],
            _playerSilhouetteInnerMat: new THREE.SpriteMaterial()
        };

        ThreeGame.prototype.updateHiddenPlayerMarker.call(fakeGame, 100);

        expect(fakeGame.playerMarker.visible).toBe(true);
        expect(fakeGame._playerSilhouetteInnerMat.map).toBe(fakeGame.playerSprite.material.map);
        expect(fakeGame._playerSilhouetteInnerMat.opacity).toBeGreaterThan(0.5);
    });

    it('creates multi-sprite neon outline ghost for scanned enemies', () => {
        const fakeGame = {
            scene: { add: vi.fn() },
            transientEffects: []
        };
        const fakeSprite = {
            isSprite: true,
            center: { x: 0.5, y: 0.5 },
            scale: new THREE.Vector3(1.2, 1.2, 1),
            position: new THREE.Vector3(5, 0, 5),
            material: {
                map: { id: 'enemy_tex_1' },
                color: { getHex: () => 0xff2255 }
            }
        };

        ThreeGame.prototype.spawnEnemyXrayGhost.call(fakeGame, fakeSprite, { duration: 2 });

        expect(fakeGame.scene.add).toHaveBeenCalled();
        const ghostGroup = fakeGame.scene.add.mock.calls[0][0];
        expect(ghostGroup).toBeInstanceOf(THREE.Group);
        // 8 outline sprites + 1 inner sprite = 9 children
        expect(ghostGroup.children).toHaveLength(9);
        expect(ghostGroup.material).toBeDefined();
        expect(ghostGroup.material.color.getHex()).toBe(0xff2255);
        expect(fakeGame.transientEffects).toHaveLength(1);
    });
});
