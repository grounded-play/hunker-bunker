import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import fs from 'node:fs';
import { read as readKtx2 } from 'three/examples/jsm/libs/ktx-parse.module.js';
import { FLOOR_LAYER, buildFloorSplatData } from './floorSplat.js';
import { STICKER_LAYERS } from './data/stickerLayers.js';
import { STICKER_FAMILIES, planChunkStickers, surfaceCategory } from './stickerPlanner.js';
import { buildStickerMesh, createStickerMaterial, legacyDecalLayerIndex, stickerLayerIndex, stickerTransform } from './stickerDecals.js';

// A cryo room (x 2-6, y 2-6) behind a door at (4, 1), a hallway above it and
// exterior ground down the left side.
const GRID = [
    'O.........',
    'O###D####.',
    'O#.....#..',
    'O#.....#..',
    'O#.....#..',
    'O#.....#..',
    'O#.....#..',
    'O#######..',
    'O.........',
    'O.........'
];
const ROOM = {
    id: 'room-a',
    theme: 'cryo-rough',
    themeConfig: { floorStyle: 'cryo-rough' },
    interior: [2, 3, 4, 5, 6].flatMap((y) => [2, 3, 4, 5, 6].map((x) => ({ x, y }))),
    navigation: { doorLanes: [{ x: 4, y: 2 }] }
};
const metadata = { roomInstances: [ROOM] };
const plan = (options = {}) => {
    const splat = buildFloorSplatData({ grid: GRID, size: 10, metadata, maze: true, ledgeGround: true, landform: 'maze', variantKey: '0,0' });
    return planChunkStickers({ grid: GRID, size: 10, layer: splat.layer, metadata, landform: 'maze', originX: 100, originZ: 200, ...options });
};

describe('planChunkStickers', () => {
    it('is the same every time for the same chunk', () => {
        expect(plan()).toEqual(plan());
    });

    it('lays grime along wall feet and a mud fan on each side of the door', () => {
        const items = plan();
        expect(items.filter((item) => item.family === 'decal_edge_wallbase_grime').length).toBeGreaterThan(10);
        const fans = items.filter((item) => item.family === 'decal_blend_mud_fan');
        const offsets = fans.map((fan) => fan.z - 200).sort();
        expect(offsets).toHaveLength(2);
        expect(offsets[0]).toBeCloseTo(0.05);
        expect(offsets[1]).toBeCloseTo(1.95);
    });

    it('puts frost where ice meets another floor and leans it into the ice', () => {
        const splat = buildFloorSplatData({ grid: GRID, size: 10, metadata, maze: true, ledgeGround: true, landform: 'maze', variantKey: '0,0' });
        const frost = plan().filter((item) => item.family === 'decal_edge_frost_creep');
        expect(frost.length).toBeGreaterThan(0);
        for (const strip of frost) {
            // Image "up" (-sin yaw, -cos yaw) is the dense frost edge.
            const x = Math.round(strip.x - 100 - Math.sin(strip.yaw) * 0.5);
            const y = Math.round(strip.z - 200 - Math.cos(strip.yaw) * 0.5);
            expect(surfaceCategory(splat.layer[y * 10 + x]), JSON.stringify(strip)).toBe('cryo');
        }
    });

    it('keeps every sticker inside the chunk and off walls and canyon', () => {
        for (const item of plan()) {
            expect(item.x - 100).toBeGreaterThanOrEqual(-0.5);
            expect(item.x - 100).toBeLessThanOrEqual(9.5);
            expect(STICKER_FAMILIES[item.family], item.family).toBeDefined();
        }
    });

    it('drops contact grime under the props it is given', () => {
        const grime = plan({ props: [{ x: 104, z: 204, radius: 0.8 }] }).filter((item) => item.family === 'decal_contact_grime');
        expect(grime).toHaveLength(1);
        expect(grime[0]).toMatchObject({ x: 104, z: 204 });
    });

    it('sorts surfaces into the families that get transition strips', () => {
        expect(surfaceCategory(FLOOR_LAYER.CRYO)).toBe('cryo');
        expect(surfaceCategory(FLOOR_LAYER.HIVE)).toBe('bio');
        expect(surfaceCategory(FLOOR_LAYER.NONE)).toBe(null);
    });
});

describe('sticker layers', () => {
    it('has four versions of every family and ships both maps for each', () => {
        for (const family of Object.keys(STICKER_FAMILIES)) {
            for (let variant = 0; variant < 4; variant += 1) {
                const layer = stickerLayerIndex(family, variant);
                expect(layer, `${family} ${variant}`).toBeGreaterThanOrEqual(0);
                expect(STICKER_LAYERS[layer].name).toBe(`${family}_${'abcd'[variant]}`);
            }
        }
        for (const { name } of STICKER_LAYERS) {
            for (const [map, vkFormat] of [['albedo', 146], ['detail', 145]]) {
                const container = readKtx2(new Uint8Array(fs.readFileSync(`public/3d/runtime/decals/${name}_${map}.ktx2`)));
                expect(container.vkFormat, `${name}_${map}`).toBe(vkFormat);
                expect(`${container.pixelWidth}x${container.pixelHeight}`).toBe('1024x512');
            }
        }
    });

    it('sizes floor stickers by depth and aspect and stands wall stickers on their bottom edge', () => {
        const layer = stickerLayerIndex('decal_contact_grime', 0);
        const floor = stickerTransform({ family: 'decal_contact_grime', surface: 'floor', x: 1, z: 2, yaw: 0 }, layer);
        expect(floor.scale.y).toBeCloseTo(STICKER_FAMILIES.decal_contact_grime.depth);
        expect(floor.scale.x).toBeCloseTo(STICKER_FAMILIES.decal_contact_grime.depth * STICKER_LAYERS[layer].aspect);
        const wall = stickerTransform({ family: 'tex_wall_kickplate_band', surface: 'wall', x: 0, z: 0, normalX: 1, normalZ: 0, bottom: 0, length: 1 },
            stickerLayerIndex('tex_wall_kickplate_band', 0));
        expect(wall.position.y).toBeCloseTo(STICKER_FAMILIES.tex_wall_kickplate_band.height / 2);
        // Facing +x: the plane's +z normal turns to +x.
        expect(new THREE.Vector3(0, 0, 1).applyQuaternion(wall.quaternion).x).toBeCloseTo(1);
    });

    it('draws a chunk\'s stickers as one instanced mesh with a layer per instance', () => {
        const mesh = buildStickerMesh(plan(), createStickerMaterial());
        expect(mesh.isInstancedMesh).toBe(true);
        expect(mesh.count).toBe(mesh.userData.stickerCount);
        expect(mesh.geometry.getAttribute('aSticker').count).toBe(mesh.count);
    });
});

describe('room-dressing PNG decals on the PBR path', () => {
    it('gives every public/decal_*.png a baked PBR layer and ships both maps', async () => {
        const { LEGACY_DECAL_LAYERS } = await import('./data/legacyDecalLayers.js');
        const pngs = fs.readdirSync('public')
            .filter((file) => /^decal_.*\.png$/.test(file))
            .map((file) => file.slice(0, -4))
            .sort();
        expect(LEGACY_DECAL_LAYERS.map((layer) => layer.name)).toEqual(pngs);
        for (const { name } of LEGACY_DECAL_LAYERS) {
            for (const map of ['albedo', 'detail']) {
                expect(fs.existsSync(`public/3d/runtime/decals/legacy/${name}_${map}.ktx2`), `${name}_${map}`).toBe(true);
            }
        }
    });

    it('maps all four delivered route-decal variants into the PBR array', async () => {
        const { LEGACY_DECAL_LAYERS } = await import('./data/legacyDecalLayers.js');
        for (const family of [
            'decal_door_wear_apron', 'decal_junction_turn_wear', 'decal_sled_tracks',
            'decal_strip_cart_ruts', 'decal_strip_drag_marks', 'decal_strip_drain_gutter',
            'decal_strip_hive_veins', 'decal_walkway_borders'
        ]) {
            for (let variant = 0; variant < 4; variant += 1) {
                const layer = legacyDecalLayerIndex(family, variant);
                expect(layer, `${family} ${variant}`).toBeGreaterThanOrEqual(0);
                expect(LEGACY_DECAL_LAYERS[layer].name).toBe(`${family}${['', '_b', '_c', '_d'][variant]}`);
            }
        }
    });

    it('draws a room\'s decals as one mesh placed like the PNG batches, keeping hide handles', async () => {
        const { buildLegacyDecalMesh } = await import('./stickerDecals.js');
        const items = [
            { layer: 'floorDecal', type: 'decal_oil_spill_patch', x: 2, y: 3, yaw: 0.5, size: 1.2 },
            { layer: 'wallDecal', type: 'decal_rust_bleed_1', x: 1, y: 0.6, normal: { x: 0, z: 1 }, height: 1.4, size: 0.9 },
            { layer: 'floorDecal', type: 'decal_not_baked', x: 0, y: 0, size: 1 }
        ];
        const mesh = buildLegacyDecalMesh(items, createStickerMaterial());
        expect(mesh.count).toBe(2);
        const wall = new THREE.Matrix4();
        mesh.getMatrixAt(1, wall);
        expect(new THREE.Vector3().setFromMatrixPosition(wall).y).toBeCloseTo(1.4);
        expect(items[0].batchInstances[0]).toEqual({ batch: mesh, index: 0 });
        expect(items[2].batchInstances).toBeUndefined();
    });
});
