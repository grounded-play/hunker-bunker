import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import fs from 'node:fs';
import { read as readKtx2 } from 'three/examples/jsm/libs/ktx-parse.module.js';
import {
    FLOOR_ARRAY_SOURCES,
    FLOOR_LAYER,
    FLOOR_SPLAT_FRAGMENT_PARS,
    FLOOR_SURFACES,
    FLOOR_SURFACE_COUNT,
    ROOM_THEME_SURFACE,
    SURFACE_LAYER_FIRST,
    routeSurfaceForCell,
    floorSurfaceFileNames,
    stackCompressedLayers,
    surfaceForLayer,
    surfaceLayer,
    ROOM_FLOOR_MATERIAL_FAMILY,
    WALL_DISTANCE_SCALE,
    buildFloorLayerArray,
    buildFloorSplatData,
    computeChunkPathWear,
    floorLayerForStyle,
    isFloorSplatEnabled,
    scopeSpecularSofteningToBaseFloor
} from './floorSplat.js';
import { softenDirectSpecularHighlights } from './threeGame.js';

// 7x7: a walled room (interior x 2-4, y 2-4) with a door at (3, 1), corridor
// above it, exterior ground on the left column and canyon on the right.
const GRID = [
    'O.....X',
    'O##D##X',
    'O#...#X',
    'O#...#X',
    'O#...#X',
    'O#####X',
    'O.....X'
];
const ROOM = {
    id: 'room-a',
    themeConfig: { floorStyle: 'cryo-tile' },
    interior: [2, 3, 4].flatMap((y) => [2, 3, 4].map((x) => ({ x, y }))),
    navigation: { doorLanes: [{ x: 3, y: 2 }] }
};
const at = (splat, x, y) => {
    const i = (y * splat.size + x) * 4;
    return {
        layer: splat.data[i],
        wall: splat.data[i + 1] / WALL_DISTANCE_SCALE,
        wear: splat.data[i + 2] / 255,
        wet: splat.data[i + 3] / 255
    };
};

describe('buildFloorSplatData', () => {
    const build = (options = {}) => buildFloorSplatData({
        grid: GRID,
        size: 7,
        metadata: { roomInstances: [ROOM] },
        maze: true,
        ledgeGround: true,
        surfaces: false,
        ...options
    });

    it('layers the surfaces in the old overlay order', () => {
        const splat = build();
        expect(at(splat, 1, 0).layer).toBe(FLOOR_LAYER.HALLWAY);
        expect(at(splat, 0, 3).layer).toBe(FLOOR_LAYER.GROUND);
        expect(at(splat, 2, 3).layer).toBe(FLOOR_LAYER.CRYO);
        // The door and its lane into the room take the threshold surface.
        expect(at(splat, 3, 1).layer).toBe(FLOOR_LAYER.HALLWAY);
        expect(at(splat, 3, 2).layer).toBe(FLOOR_LAYER.HALLWAY);
    });

    it('leaves walls, canyon and cliffs without a floor surface', () => {
        const splat = build();
        expect(at(splat, 1, 1).layer).toBe(FLOOR_LAYER.NONE);
        expect(at(splat, 6, 3).layer).toBe(FLOOR_LAYER.NONE);
    });

    it('uses the base floor outside mazes and plain floor for ledges without ground', () => {
        const splat = build({ maze: false, ledgeGround: false });
        expect(at(splat, 1, 0).layer).toBe(FLOOR_LAYER.BASE);
        expect(at(splat, 0, 3).layer).toBe(FLOOR_LAYER.BASE);
        expect(at(splat, 2, 3).layer).toBe(FLOOR_LAYER.CRYO);
    });

    it('paints the crash chunk with the standard room surface', () => {
        const splat = build({ metadata: null, maze: false, crashRoom: true });
        expect(at(splat, 3, 3).layer).toBe(FLOOR_LAYER.ROOM);
        expect(at(splat, 3, 1).layer).toBe(FLOOR_LAYER.HALLWAY);
    });

    it('blends crash scorch through the floor splat instead of an overlay plane', () => {
        const options = {
            grid: Array.from({ length: 15 }, () => Array(15).fill('.')),
            size: 15,
            crashRoom: true,
            crashImpact: { x: 7, y: 7, radius: 3.75 },
            variantKey: '0,0'
        };
        const splat = buildFloorSplatData(options);
        expect(surfaceForLayer(at(splat, 7, 7).layer)?.id).toBe('tex_floor_scorched_plasma_crater');
        expect(surfaceForLayer(at(splat, 0, 0).layer)?.id).not.toBe('tex_floor_scorched_plasma_crater');
        expect(buildFloorSplatData(options).layer).toEqual(splat.layer);
    });

    it('records the distance to the nearest wall in cells', () => {
        const splat = build();
        expect(at(splat, 1, 1).wall).toBe(0);
        expect(at(splat, 2, 2).wall).toBe(1);
        expect(at(splat, 3, 3).wall).toBe(2);
    });

    it('carries each style\'s wetness', () => {
        const splat = build();
        expect(at(splat, 2, 3).wet).toBeCloseTo(0.28, 2);
        expect(at(splat, 1, 0).wet).toBeCloseTo(0.38, 2);
        expect(at(splat, 0, 3).wet).toBe(0);
    });

    it('records deterministic traffic path wear in the B channel along routes', () => {
        const splat = build();
        // Door at (3, 1) and its approach / lane should have non-zero traffic wear
        expect(at(splat, 3, 1).wear).toBeGreaterThan(0);
        // Wall cell should have 0 wear
        expect(at(splat, 1, 1).wear).toBe(0);

        const directWear = computeChunkPathWear({ grid: GRID, size: 7, metadata: { roomInstances: [ROOM] } });
        expect(directWear).toBeInstanceOf(Uint8Array);
        expect(directWear[1 * 7 + 3]).toBeGreaterThan(0);
    });
});

describe('new floor surfaces', () => {
    const build = (options = {}) => buildFloorSplatData({
        grid: GRID,
        size: 7,
        metadata: { roomInstances: [{ ...ROOM, theme: 'cryo-rough' }] },
        maze: true,
        ledgeGround: true,
        landform: 'field',
        variantKey: '3,-2',
        ...options
    });

    it('gives hallways the deck plate, rooms their theme surface and field ground regolith', () => {
        const splat = build();
        expect(['tex_floor_deck_drain', 'tex_path_worn_deck', 'tex_path_polished_concrete', 'tex_shoulder_swept_grit'])
            .toContain(surfaceForLayer(at(splat, 1, 0).layer).id);
        expect(['tex_floor_deck_drain', 'tex_path_worn_deck', 'tex_path_polished_concrete', 'tex_shoulder_swept_grit'])
            .toContain(surfaceForLayer(at(splat, 3, 1).layer).id);
        expect(['tex_floor_slush_ice', 'tex_path_packed_snow', 'tex_path_slush_track', 'tex_shoulder_ice_crust'])
            .toContain(surfaceForLayer(at(splat, 2, 3).layer).id);
        expect(['tex_ground_regolith', 'tex_path_gravel_scree', 'tex_shoulder_swept_grit'])
            .toContain(surfaceForLayer(at(splat, 0, 3).layer).id);
    });

    it('keeps the atlas floor for themes without a new surface and rock in canyons', () => {
        const splat = build({ metadata: { roomInstances: [{ ...ROOM, theme: 'cryo-medical' }] }, landform: 'canyon' });
        expect(at(splat, 2, 3).layer).toBe(FLOOR_LAYER.CRYO);
        expect([FLOOR_LAYER.GROUND, 'tex_path_gravel_scree', 'tex_shoulder_swept_grit'])
            .toContain(surfaceForLayer(at(splat, 0, 3).layer)?.id ?? at(splat, 0, 3).layer);
    });

    it('picks a stable version per key and uses every version somewhere', () => {
        expect(surfaceLayer('tex_floor_latex_mat', 'room-a')).toBe(surfaceLayer('tex_floor_latex_mat', 'room-a'));
        const seen = new Set(Array.from({ length: 64 }, (_, i) => surfaceLayer('tex_floor_concrete_stained', `room-${i}`)));
        expect(seen.size).toBe(8);
    });

    it('maps every room theme surface and file to a layer below the NONE marker', () => {
        for (const id of Object.values(ROOM_THEME_SURFACE)) expect(FLOOR_SURFACES.some((s) => s.id === id), id).toBe(true);
        expect(floorSurfaceFileNames()).toHaveLength(FLOOR_SURFACE_COUNT);
        expect(floorSurfaceFileNames()[4]).toBe('tex_floor_concrete_stained_a');
        expect(SURFACE_LAYER_FIRST + FLOOR_SURFACE_COUNT).toBeLessThan(FLOOR_LAYER.NONE);
    });

    it('uses every authored path, shoulder and puddle family in a reachable route state', () => {
        const cases = [
            [FLOOR_LAYER.HALLWAY, 255, 0, ['tex_path_worn_deck', 'tex_path_polished_concrete']],
            [FLOOR_LAYER.CRYO, 255, 0, ['tex_path_packed_snow', 'tex_path_slush_track']],
            [FLOOR_LAYER.BIO, 255, 0, ['tex_path_resin_trail', 'tex_path_trodden_spores']],
            [FLOOR_LAYER.CAMP, 255, 0, ['tex_path_mud_track']],
            [FLOOR_LAYER.GROUND, 255, 0, ['tex_path_gravel_scree']],
            [FLOOR_LAYER.HALLWAY, 80, 0, ['tex_shoulder_swept_grit']],
            [FLOOR_LAYER.CRYO, 80, 0, ['tex_shoulder_ice_crust']],
            [FLOOR_LAYER.BIO, 80, 0, ['tex_shoulder_resin_lip']]
        ];
        const seen = new Set();
        for (const [layer, wear, wetness, expected] of cases) {
            for (let i = 0; i < 64; i += 1) {
                const id = surfaceForLayer(routeSurfaceForCell(layer, { wear, wetness, key: `route-${i}` }))?.id;
                if (expected.includes(id)) seen.add(id);
            }
        }
        for (const expected of cases.flatMap((entry) => entry[3])) expect(seen.has(expected), expected).toBe(true);
        const puddleKey = Array.from({ length: 64 }, (_, i) => `puddle-${i}`).find((key) =>
            surfaceForLayer(routeSurfaceForCell(FLOOR_LAYER.HALLWAY, { wear: 0, wetness: 0.8, key }))?.id === 'tex_overlay_puddles');
        expect(puddleKey).toBeDefined();
    });

    it('draws each surface as its fallback until the arrays load', () => {
        expect(FLOOR_SPLAT_FRAGMENT_PARS).toContain('if (layer < 20.0 - 0.5) { scale = 4.00; groundLike = 0.0; return 6.0; }');
        expect(FLOOR_SPLAT_FRAGMENT_PARS).toContain('uSurfacesReady > 0.5) return layer;');
    });
});

describe('floor surface files', () => {
    it('ships every version as matching BC7 KTX2 albedo (sRGB) and detail (linear) maps', () => {
        let shape = null;
        for (const name of floorSurfaceFileNames()) {
            for (const [map, vkFormat] of [['albedo', 146], ['detail', 145]]) {
                const container = readKtx2(new Uint8Array(fs.readFileSync(`public/3d/runtime/surfaces/${name}_${map}.ktx2`)));
                expect(container.vkFormat, `${name}_${map}`).toBe(vkFormat);
                const current = `${container.pixelWidth}x${container.pixelHeight}x${container.levels.length}`;
                shape ??= current;
                expect(current, `${name}_${map}`).toBe(shape);
            }
        }
        expect(shape).toBe('1024x1024x9');
    });

    it('stacks one map of every version into a compressed array, level by level', () => {
        const layer = (fill) => ({
            image: { width: 8, height: 8 },
            format: THREE.RGBA_BPTC_Format,
            mipmaps: [
                { data: new Uint8Array(64).fill(fill), width: 8, height: 8 },
                { data: new Uint8Array(16).fill(fill), width: 4, height: 4 }
            ]
        });
        const array = stackCompressedLayers([layer(1), layer(2)], THREE.SRGBColorSpace);
        expect(array).toBeInstanceOf(THREE.CompressedArrayTexture);
        expect(array.image.depth).toBe(2);
        expect([...array.mipmaps[1].data]).toEqual([...new Array(16).fill(1), ...new Array(16).fill(2)]);
        expect(() => stackCompressedLayers([layer(1), { ...layer(2), mipmaps: layer(2).mipmaps.slice(0, 1) }])).toThrow(/differ/);
    });
});

describe('floorLayerForStyle', () => {
    it('gives every authored room floor style an atlas surface', () => {
        for (const style of Object.keys(ROOM_FLOOR_MATERIAL_FAMILY)) {
            expect(floorLayerForStyle(style), style).toBeGreaterThanOrEqual(FLOOR_LAYER.UTILITY);
            expect(floorLayerForStyle(style), style).toBeLessThanOrEqual(FLOOR_LAYER.ROOM);
        }
    });

    it('falls back to the base floor for styles without an atlas surface', () => {
        expect(floorLayerForStyle('giger')).toBe(FLOOR_LAYER.BASE);
    });
});

describe('buildFloorLayerArray', () => {
    it('cuts each atlas quadrant and ground rock into its own layer', async () => {
        const draws = [];
        const documentRef = {
            createElement: () => ({
                getContext: () => ({
                    clearRect: () => {},
                    drawImage: (image, sx, sy, sw, sh) => draws.push({ image: image.name, sx, sy, sw, sh }),
                    getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) })
                })
            })
        };
        const image = (name, size) => ({ name, naturalWidth: size, naturalHeight: size });
        const array = await buildFloorLayerArray({
            roomAtlas: image('room', 1000),
            siteAtlas: image('site', 800),
            ground: { active: image('active', 600), cryo: image('cryo', 600), bio: image('bio', 600) },
            size: 4,
            documentRef,
            yieldTask: async () => {}
        });
        expect(array).toBeInstanceOf(THREE.DataArrayTexture);
        expect(array.image.depth).toBe(FLOOR_ARRAY_SOURCES.length);
        expect(array.colorSpace).toBe(THREE.SRGBColorSpace);
        // Utility sits at UV (0, 0.5): the top-left quarter of the image.
        expect(draws[0]).toEqual({ image: 'room', sx: 0, sy: 0, sw: 500, sh: 500 });
        // Bio sits at UV (0.5, 0): the bottom-right quarter.
        expect(draws[3]).toEqual({ image: 'room', sx: 500, sy: 500, sw: 500, sh: 500 });
        expect(draws[4]).toEqual({ image: 'site', sx: 0, sy: 0, sw: 400, sh: 400 });
        expect(draws.slice(8).map((draw) => draw.image)).toEqual(['active', 'cryo', 'bio']);
    });
});

describe('isFloorSplatEnabled', () => {
    it('is on unless the player opts out', () => {
        expect(isFloorSplatEnabled({ getItem: () => null })).toBe(true);
        expect(isFloorSplatEnabled({ getItem: () => '0' })).toBe(false);
        expect(isFloorSplatEnabled({ getItem: () => { throw new Error('blocked'); } })).toBe(true);
    });
});

describe('scopeSpecularSofteningToBaseFloor', () => {
    it('limits the base plates\' specular softening to their share of the blend', () => {
        const shader = { fragmentShader: THREE.ShaderLib.standard.fragmentShader };
        softenDirectSpecularHighlights(shader);
        const scoped = scopeSpecularSofteningToBaseFloor(shader.fragmentShader);
        expect(scoped).toContain('material.roughness = mix(material.roughness, max(material.roughness, 0.60), hbSplatBaseWeight);');
        expect(scoped).toContain('reflectedLight.directSpecular *= mix(1.0, 0.35, hbSplatBaseWeight);');
        expect(scoped).not.toContain('reflectedLight.directSpecular *= 0.35;');
    });
});
