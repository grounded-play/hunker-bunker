import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { ThreeGame } from './threeGame.js';

describe('ThreeGame - Wall Occlusion & Scanned Enemy Outlines', () => {
    it('creates hidden player marker with 3D floor ring, beacon, and vertical pillar (no 2D avatar popups)', () => {
        const marker = ThreeGame.prototype.createHiddenPlayerMarker.call({ playerHeight: 1.1 });
        expect(marker).toBeInstanceOf(THREE.Group);
        expect(marker.children.length).toBeGreaterThanOrEqual(3);

        const pillar = marker.children[2];
        expect(pillar).toBeInstanceOf(THREE.Line);
        expect(pillar.material.depthTest).toBe(false);
    });

    it('updates player marker visibilities and pillar opacity when hidden', () => {
        const fakeGame = {
            camera: { position: new THREE.Vector3(0, 10, 10) },
            player: { position: new THREE.Vector3(0, 0, 0) },
            playerRadius: 0.4,
            wallMeshes: [{ isMesh: true }],
            raycaster: {
                set: () => {},
                intersectObjects: () => [{ distance: 5 }]
            },
            playerMarker: {
                visible: false,
                children: [
                    { material: { opacity: 0 }, lookAt: () => {} },
                    { material: { opacity: 0 } },
                    { material: { opacity: 0 } }
                ]
            }
        };

        ThreeGame.prototype.updateHiddenPlayerMarker.call(fakeGame, 100);

        expect(fakeGame.playerMarker.visible).toBe(true);
        expect(fakeGame.playerMarker.children[2].material.opacity).toBeGreaterThan(0.5);
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
        expect(ghostGroup.children).toHaveLength(9);
        expect(ghostGroup.material).toBeDefined();
        expect(ghostGroup.material.color.getHex()).toBe(0xff2255);
        expect(fakeGame.transientEffects).toHaveLength(1);
    });
});
