import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
    FLOOR_ARRAY_SOURCES,
    FLOOR_LAYER,
    ROOM_FLOOR_MATERIAL_FAMILY,
    WALL_DISTANCE_SCALE,
    buildFloorLayerArray,
    buildFloorSplatData,
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
    return { layer: splat.data[i], wall: splat.data[i + 1] / WALL_DISTANCE_SCALE, wet: splat.data[i + 3] / 255 };
};

describe('buildFloorSplatData', () => {
    const build = (options = {}) => buildFloorSplatData({
        grid: GRID,
        size: 7,
        metadata: { roomInstances: [ROOM] },
        maze: true,
        ledgeGround: true,
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
