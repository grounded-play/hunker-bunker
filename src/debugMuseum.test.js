import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { openDebugMuseum, closeDebugMuseum, buildMuseumAudioCatalog, setMuseumSpecimenState } from './debugMuseum.js';
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
            chunkGroups: Object.assign(new THREE.Group(), { visible: true }),
            setNoclip: vi.fn(),
            skyRig: { group: Object.assign(new THREE.Group(), { visible: true }) },
            setGodMode: vi.fn(),
            createMenuGridTexture: vi.fn(() => {
                const t = new THREE.Texture();
                t.wrapS = THREE.RepeatWrapping;
                t.wrapT = THREE.RepeatWrapping;
                return t;
            }),
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
        // Wall decals: 10 original + 9 earlier sprint 34 + 13 new sprint 34 = 32
        expect(SHOWROOM_CATEGORIES.WALL_DECALS).toHaveLength(32);
        // Floor decals: 13 original + 6 earlier sprint 34 + 12 new sprint 34 = 31
        expect(SHOWROOM_CATEGORIES.FLOOR_DECALS).toHaveLength(31);

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

    // User request 2026-09-09: the museum is a QA space. It needs a clean
    // grid floor like the hero-select backdrop, only the exhibits it spawned,
    // and no wall stopping you walking around.
    it('uses the hero-select grid texture for its floor', async () => {
        await openDebugMuseum(mockGame);
        expect(mockGame.createMenuGridTexture).toHaveBeenCalled();

        const group = scene.getObjectByName('debug-museum');
        const floor = group.getObjectByName('debug-museum-floor');
        expect(floor).toBeDefined();
        expect(floor.material.map).toBeTruthy();
        // Laid flat, and square rather than a 14-wide corridor so there is
        // room to walk around the exhibits instead of only along them.
        expect(floor.rotation.x).toBeCloseTo(-Math.PI / 2);
        expect(floor.geometry.parameters.height).toBe(floor.geometry.parameters.width);
    });

    it('adds no GridHelper of its own, since the floor texture is the grid', async () => {
        await openDebugMuseum(mockGame);
        const group = scene.getObjectByName('debug-museum');
        let helpers = 0;
        group.traverse((child) => { if (child.isGridHelper) helpers++; });
        expect(helpers).toBe(0);
    });

    it('hides world chunks so only the exhibits are visible, and restores them on close', async () => {
        await openDebugMuseum(mockGame);
        expect(mockGame.chunkGroups.visible).toBe(false);

        closeDebugMuseum(mockGame);
        expect(mockGame.chunkGroups.visible).toBe(true);
    });

    it('hides the biome sky rig so the backdrop is flat, and restores it on close', async () => {
        scene.background = new THREE.Color(0x336699);
        await openDebugMuseum(mockGame);
        expect(mockGame.skyRig.group.visible).toBe(false);
        expect(scene.background.getHex()).toBe(0x0b0d0f);

        closeDebugMuseum(mockGame);
        expect(mockGame.skyRig.group.visible).toBe(true);
        expect(scene.background.getHex()).toBe(0x336699);
    });

    it('enables noclip at normal speed so no wall blocks the tour', async () => {
        await openDebugMuseum(mockGame);
        expect(mockGame.setNoclip).toHaveBeenCalledWith(true, 1);
    });

    it('turns noclip back off on close', async () => {
        await openDebugMuseum(mockGame);
        mockGame.setNoclip.mockClear();
        closeDebugMuseum(mockGame);
        expect(mockGame.setNoclip).toHaveBeenCalledWith(false);
    });

    it('lays exhibits out in bounded category grids instead of one long line', async () => {
        await openDebugMuseum(mockGame);
        const group = scene.getObjectByName('debug-museum');
        const pedestals = group.children.filter((child) => child.children?.some((part) => part.geometry?.type === 'CylinderGeometry'));
        const rows = new Set(pedestals.map((pedestal) => pedestal.position.z.toFixed(1)));
        expect(pedestals.length).toBeGreaterThan(12);
        expect(rows.size).toBeGreaterThan(2);
    });

    it('freezes the live run, hides transient shots, and restores prior state', async () => {
        const projectile = { mesh: Object.assign(new THREE.Group(), { visible: true }) };
        mockGame.activeProjectiles = [projectile];
        mockGame.godMode = false;
        await openDebugMuseum(mockGame);
        expect(mockGame._debugMuseumSessionActive).toBe(true);
        expect(projectile.mesh.visible).toBe(false);

        closeDebugMuseum(mockGame);
        expect(mockGame._debugMuseumSessionActive).toBe(false);
        expect(projectile.mesh.visible).toBe(true);
        expect(mockGame.setGodMode).toHaveBeenLastCalledWith(false);
    });

    it('provides resettable paired specimen states', async () => {
        mockGame.createWorld3dModel = vi.fn(async () => new THREE.Group());
        await openDebugMuseum(mockGame);
        const group = scene.getObjectByName('debug-museum');
        const damaged = [];
        group.traverse((child) => {
            if (child.userData?.museumSpecimenState === 'damaged') damaged.push(child);
        });
        expect(damaged.length).toBeGreaterThan(0);
        expect(setMuseumSpecimenState(mockGame, 'damaged')).toBe(true);
        expect(damaged.every((child) => child.visible)).toBe(true);
        expect(setMuseumSpecimenState(mockGame, 'intact')).toBe(true);
        expect(damaged.every((child) => !child.visible)).toBe(true);
    });

    it('catalogs every song and alternate VO take without gameplay triggers', () => {
        const buffers = {
            music_menu: {},
            music_interstitial_01: {},
            voice_commander_reloading: {},
            voice_commander_reloading2: {},
            gunshot: {}
        };
        const catalog = buildMuseumAudioCatalog(buffers);
        expect(catalog.songs).toHaveLength(38);
        expect(catalog.voice.length).toBeGreaterThanOrEqual(24);
        expect(catalog.voice.some((row) => row.key.endsWith('2'))).toBe(true);
        expect(catalog.effects.map((row) => row.key)).toContain('gunshot');
        expect(catalog.music.map((row) => row.key)).toContain('music_menu');
    });

    it('survives a game without the optional debug hooks', async () => {
        const bare = { scene, player, createScatterInstance: mockGame.createScatterInstance };
        await expect(openDebugMuseum(bare)).resolves.toBe(true);
        expect(() => closeDebugMuseum(bare)).not.toThrow();
    });
});
