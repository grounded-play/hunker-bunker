import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { openDebugMuseum, closeDebugMuseum } from './debugMuseum.js';
import { SHOWROOM_CATEGORIES, createDebugWallDecalDisplay } from './debugShowroom.js';

describe('Debug Hallway Museum', () => {
    let mockGame;
    let scene;
    let player;
    let originalDoc;

    beforeEach(() => {
        scene = new THREE.Scene();
        player = new THREE.Group();
        player.position.set(0, 0, 0);

        vi.spyOn(GLTFLoader.prototype, 'loadAsync').mockResolvedValue({
            scene: new THREE.Group()
        });

        vi.spyOn(THREE.TextureLoader.prototype, 'load').mockImplementation(() => {
            return new THREE.Texture();
        });

        mockGame = {
            scene,
            player,
            createScatterInstance: vi.fn((placement) => {
                const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
                mesh.position.set(placement.x, placement.elevation ?? 0, placement.z);
                return mesh;
            })
        };

        originalDoc = globalThis.document;
        globalThis.document = {
            createElement: (tag) => {
                if (tag === 'canvas') {
                    return {
                        width: 512,
                        height: 128,
                        getContext: () => ({
                            fillStyle: '',
                            fillRect: () => {},
                            strokeStyle: '',
                            lineWidth: 1,
                            strokeRect: () => {},
                            font: '',
                            textAlign: '',
                            textBaseline: '',
                            fillText: () => {}
                        })
                    };
                }
                return {};
            }
        };
    });

    afterEach(() => {
        globalThis.document = originalDoc;
    });

    it('returns false when no game or player is active', async () => {
        const res = await openDebugMuseum(null);
        expect(res).toBe(false);
    });

    it('mounts museum corridor, creates categories, and teleports player', async () => {
        const res = await openDebugMuseum(mockGame);
        expect(res).toBe(true);

        const museumGroup = scene.getObjectByName('debug-museum');
        expect(museumGroup).toBeDefined();
        expect(museumGroup.children.length).toBeGreaterThan(10);

        // Player is teleported to museum staging coordinates (around x: 8996, z: 9000)
        expect(mockGame.player.position.x).toBe(8996);
        expect(mockGame.player.position.z).toBe(9000);
    });

    it('cleans up and removes museum scene on closeDebugMuseum', async () => {
        await openDebugMuseum(mockGame);
        expect(scene.getObjectByName('debug-museum')).toBeDefined();

        const closed = closeDebugMuseum(mockGame);
        expect(closed).toBe(true);
        expect(scene.getObjectByName('debug-museum')).toBeUndefined();
    });

    it('keeps all decal families in the debug catalog and mounts wall decals on the panel face', () => {
        expect(SHOWROOM_CATEGORIES.COSMETIC_PLAYER_DECALS).toHaveLength(10);
        // Nine core wall decal types plus prop_torn_warning_poster, which is
        // explicitly mounted through the same wall-decal production path.
        expect(SHOWROOM_CATEGORIES.WALL_DECALS).toHaveLength(10);
        expect(SHOWROOM_CATEGORIES.FLOOR_DECALS).toHaveLength(13);

        const texture = new THREE.Texture();
        const display = createDebugWallDecalDisplay({ scatterTextures: { decal_hazard_stripes: texture } }, 'decal_hazard_stripes', {
            wallNormal: { x: 1, z: 0 }
        });
        const decal = display.children.find((child) => child.userData?.isWallDecal);

        expect(decal).toBeDefined();
        expect(decal.position.x).toBeCloseTo(0.112);
        expect(decal.position.y).toBeCloseTo(2.6 * 0.48);
        expect(decal.position.z).toBeCloseTo(0);
        expect(decal.rotation.y).toBeCloseTo(Math.PI / 2);

        display.traverse((child) => {
            child.geometry?.dispose?.();
            child.material?.dispose?.();
        });
        texture.dispose();
    });
});
