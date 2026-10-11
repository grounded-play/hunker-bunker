import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
    CORNER_BIT,
    WALL_LIGHT_SHAPE_FRAGMENT,
    CORNER_CUT_ACTIVE,
    WALL_CHAMFER,
    cornerCutPositions,
    createCornerCutDepthMaterial,
    createCornerCutPoolGeometry,
    createCornerCutWallGeometry,
    isWallAutotileEnabled,
    patchCornerCutVertexShader,
    planWallFootDressing,
    planWallTopDressing,
    wallCornerCutMask,
    wallHeightScale
} from './wallAutotile.js';

// Rows are grid y (world +z, south), columns grid x (world +x, east).
function solidAt(rows) {
    return (x, y) => rows[y]?.[x] === '#';
}

const CORNERS = { NE: [0.5, -0.5], NW: [-0.5, -0.5], SW: [-0.5, 0.5], SE: [0.5, 0.5] };
const geometry = createCornerCutWallGeometry({ height: 2.8 });

function outlineHasCorner(mask, [x, z]) {
    const positions = cornerCutPositions(geometry, mask);
    for (let i = 0; i < positions.length; i += 3) {
        if (Math.abs(positions[i] - x) < 1e-4 && Math.abs(positions[i + 2] - z) < 1e-4) return true;
    }
    return false;
}

function cutCorners(mask) {
    return Object.entries(CORNERS).filter(([, point]) => !outlineHasCorner(mask, point)).map(([name]) => name).sort();
}

describe('wallCornerCutMask', () => {
    it('cuts nothing inside a run or along a straight wall', () => {
        expect(wallCornerCutMask(solidAt(['###', '###', '###']), 1, 1)).toBe(0);
        expect(wallCornerCutMask(solidAt(['...', '###', '...']), 1, 1)).toBe(0);
    });

    it('turns a lone wall cell into an octagonal post', () => {
        const mask = wallCornerCutMask(solidAt(['...', '.#.', '...']), 1, 1);
        expect(mask).toBe(15);
        expect(cutCorners(mask)).toEqual(['NE', 'NW', 'SE', 'SW']);
    });

    it('caps the free end of a run on both corners', () => {
        const mask = wallCornerCutMask(solidAt(['...', '.#.', '.#.']), 1, 1);
        expect(mask).toBe(CORNER_BIT.NE | CORNER_BIT.NW);
        expect(cutCorners(mask)).toEqual(['NE', 'NW']);
    });

    it('cuts only the outer corner of a turn, whichever way it faces', () => {
        const cases = [
            { rows: ['...', '##.', '.#.'], cut: 'NE' },
            { rows: ['...', '.##', '.#.'], cut: 'NW' },
            { rows: ['.#.', '.##', '...'], cut: 'SW' },
            { rows: ['.#.', '##.', '...'], cut: 'SE' }
        ];
        for (const { rows, cut } of cases) {
            expect(cutCorners(wallCornerCutMask(solidAt(rows), 1, 1)), rows.join('/')).toEqual([cut]);
        }
    });

    it('turns a diagonal staircase of cells into a faceted diagonal', () => {
        const solid = solidAt([
            '#....',
            '##...',
            '.##..',
            '..##.',
            '...##'
        ]);
        for (const [x, y] of [[1, 1], [2, 2], [3, 3]]) {
            expect(cutCorners(wallCornerCutMask(solid, x, y))).toEqual(['NE']);
        }
    });
});

describe('createCornerCutWallGeometry', () => {
    it('draws exactly the old box when no corner is cut', () => {
        const positions = cornerCutPositions(geometry, 0);
        const box = new THREE.Box3();
        for (let i = 0; i < positions.length; i += 3) {
            const [x, y, z] = [positions[i], positions[i + 1], positions[i + 2]];
            box.expandByPoint(new THREE.Vector3(x, y, z));
            // Every vertex sits on the square's outline (or the top's centre).
            const onOutline = Math.abs(Math.abs(x) - 0.5) < 1e-6 || Math.abs(Math.abs(z) - 0.5) < 1e-6;
            expect(onOutline || (x === 0 && z === 0)).toBe(true);
        }
        [-0.5, -1.4, -0.5].forEach((value, i) => expect(box.min.toArray()[i]).toBeCloseTo(value, 5));
        [0.5, 1.4, 0.5].forEach((value, i) => expect(box.max.toArray()[i]).toBeCloseTo(value, 5));
        for (const corner of Object.values(CORNERS)) expect(outlineHasCorner(0, corner)).toBe(true);
    });

    it('faces every side and the top outward, cut back by the agreed amount', () => {
        const position = geometry.getAttribute('position');
        const normal = geometry.getAttribute('normal');
        const a = new THREE.Vector3();
        const b = new THREE.Vector3();
        const c = new THREE.Vector3();
        for (let t = 0; t < position.count / 3; t += 1) {
            a.fromBufferAttribute(position, t * 3);
            b.fromBufferAttribute(position, t * 3 + 1);
            c.fromBufferAttribute(position, t * 3 + 2);
            const face = new THREE.Vector3().crossVectors(b.clone().sub(a), c.clone().sub(a)).normalize();
            const centre = a.clone().add(b).add(c).divideScalar(3);
            if (Math.abs(face.y) > 0.9) expect(face.y).toBeGreaterThan(0);
            else expect(face.dot(new THREE.Vector3(centre.x, 0, centre.z))).toBeGreaterThan(0);
            expect(new THREE.Vector3().fromBufferAttribute(normal, t * 3).dot(face)).toBeGreaterThan(0.99);
        }
        expect(outlineHasCorner(15, [0.5, -0.5 + WALL_CHAMFER])).toBe(true);
        expect(outlineHasCorner(15, [0.5 - WALL_CHAMFER, -0.5])).toBe(true);
    });

    it('gives each pool its own copy carrying the instance masks', () => {
        const pool = createCornerCutPoolGeometry(geometry, [0, 15, 3]);
        const masks = pool.getAttribute('hbCornerCut');
        expect(masks).toBeInstanceOf(THREE.InstancedBufferAttribute);
        expect(Array.from(masks.array)).toEqual([0, 15, 3].map((mask) => mask + CORNER_CUT_ACTIVE));
        expect(pool.getAttribute('position')).not.toBe(geometry.getAttribute('position'));
        expect(pool.userData.ownedByWallPool).toBe(true);
    });
});

describe('corner-cut shaders', () => {
    const vertexShader = '#include <common>\nvoid main() {\n#include <begin_vertex>\n#include <project_vertex>\n}';

    it('declares the attributes and moves uncut corners after begin_vertex, once', () => {
        const patched = patchCornerCutVertexShader(vertexShader);
        expect(patched).toContain('attribute float hbCorner;');
        expect(patched).toContain('attribute float hbCornerCut;');
        expect(patched.indexOf('transformed.x')).toBeGreaterThan(patched.indexOf('#include <begin_vertex>'));
        expect(patched.indexOf('transformed.x')).toBeLessThan(patched.indexOf('#include <project_vertex>'));
        expect(patchCornerCutVertexShader(patched)).toBe(patched);
    });

    it('leaves meshes without the attributes alone, whatever stray value WebGL hands them', () => {
        const patched = patchCornerCutVertexShader(vertexShader);
        // Three leaves 0 or 1 in a missing attribute's slot (vertex colour
        // default); only stored masks reach the active range.
        expect(patched).toContain(`hbCornerCut > ${CORNER_CUT_ACTIVE - 0.5}`);
        expect(CORNER_CUT_ACTIVE).toBeGreaterThan(1);
    });

    it('casts shadows with the same outline', () => {
        const material = createCornerCutDepthMaterial();
        const shader = { vertexShader, fragmentShader: '', uniforms: {} };
        material.onBeforeCompile(shader);
        expect(shader.vertexShader).toContain('hbCornerCut');
        expect(material.customProgramCacheKey()).toBe('hb-wall-corner-cut-depth');
    });
});

describe('wallHeightScale', () => {
    const area = (landform) => {
        const rows = [];
        for (let z = 0; z < 60; z += 1) {
            const row = [];
            for (let x = 0; x < 60; x += 1) row.push(wallHeightScale(landform, x, z));
            rows.push(row);
        }
        return rows;
    };

    it('is deterministic per world cell', () => {
        expect(wallHeightScale('maze', 12, -40)).toBe(wallHeightScale('maze', 12, -40));
    });

    it('stays inside each landform\'s old height range', () => {
        const ranges = {
            maze: [0.6, 1.26],
            canyon: [1.2, 1.55],
            ruins: [0.58, 1.1],
            field: [0.72, 1.08],
            crater: [0.88, 1.28]
        };
        for (const [landform, [low, high]] of Object.entries(ranges)) {
            for (const scale of area(landform).flat()) {
                expect(scale).toBeGreaterThanOrEqual(low - 1e-9);
                expect(scale).toBeLessThanOrEqual(high + 1e-9);
            }
        }
        expect(wallHeightScale('pocket', 3, 4)).toBe(1);
    });

    it('gives neighbouring walls the same height most of the time, so runs read as built', () => {
        const rows = area('maze');
        let same = 0;
        let pairs = 0;
        for (const row of rows) {
            for (let x = 1; x < row.length; x += 1) {
                pairs += 1;
                if (row[x] === row[x - 1]) same += 1;
            }
        }
        expect(same / pairs).toBeGreaterThan(0.75);
    });

    it('still uses the whole range: low, ordinary and tall walls all occur', () => {
        const values = area('maze').flat();
        expect(Math.min(...values)).toBeLessThan(0.8);
        expect(Math.max(...values)).toBeGreaterThan(1.05);
        expect(new Set(values).size).toBeGreaterThanOrEqual(4);
    });
});

describe('isWallAutotileEnabled', () => {
    it('is on by default and off only when hb_wall_autotile is 0', () => {
        const store = (value) => ({ getItem: (key) => (key === 'hb_wall_autotile' ? value : null) });
        expect(isWallAutotileEnabled(store(null))).toBe(true);
        expect(isWallAutotileEnabled(store('1'))).toBe(true);
        expect(isWallAutotileEnabled(store('0'))).toBe(false);
        expect(isWallAutotileEnabled({ getItem: () => { throw new Error('blocked'); } })).toBe(true);
        expect(isWallAutotileEnabled(undefined)).toBe(true);
    });
});

describe('WALL_LIGHT_SHAPE_FRAGMENT', () => {
    it('lights the top lip of every side and dresses tops per area', () => {
        expect(WALL_LIGHT_SHAPE_FRAGMENT).toContain('vMapUv.y');
        expect(WALL_LIGHT_SHAPE_FRAGMENT).toContain('hbLip');
        expect(WALL_LIGHT_SHAPE_FRAGMENT).toContain('cryoMix');
        expect(WALL_LIGHT_SHAPE_FRAGMENT).toContain('bioMix');
        // Only reads names the wall shader declares before its insertion point.
        for (const name of ['cryoWallGrunge', 'bioWallGrunge', 'finalWallColor', 'vWorldNormal', 'vWorldPos']) {
            expect(WALL_LIGHT_SHAPE_FRAGMENT).toContain(name);
        }
    });
});

describe('subdivided corner-cut walls (organic bio walls)', () => {
    const fine = createCornerCutWallGeometry({ height: 2.8, heightSegments: 3, widthSegments: 2 });

    it('keeps the same outline as the plain prism for every mask', () => {
        for (const mask of [0, 1, 6, 15]) {
            const plain = cornerCutPositions(geometry, mask);
            const subdivided = cornerCutPositions(fine, mask);
            const extent = (positions) => {
                const box = new THREE.Box3();
                for (let i = 0; i < positions.length; i += 3) box.expandByPoint(new THREE.Vector3(positions[i], positions[i + 1], positions[i + 2]));
                return box;
            };
            expect(extent(subdivided).equals(extent(plain))).toBe(true);
            for (const corner of Object.values(CORNERS)) {
                const has = (positions) => {
                    for (let i = 0; i < positions.length; i += 3) {
                        if (Math.abs(positions[i] - corner[0]) < 1e-4 && Math.abs(positions[i + 2] - corner[1]) < 1e-4) return true;
                    }
                    return false;
                };
                expect(has(subdivided), `mask ${mask}`).toBe(has(plain));
            }
        }
    });

    it('collapses every sample along an uncut chamfer onto its corner', () => {
        const positions = cornerCutPositions(fine, 0);
        for (let i = 0; i < positions.length; i += 3) {
            const [x, z] = [positions[i], positions[i + 2]];
            const onOutline = Math.abs(Math.abs(x) - 0.5) < 1e-6 || Math.abs(Math.abs(z) - 0.5) < 1e-6;
            expect(onOutline || (x === 0 && z === 0)).toBe(true);
        }
    });

    it('splits the sides into rows and columns and closes the top over every sample', () => {
        const plainCount = geometry.getAttribute('position').count / 3;
        const fineCount = fine.getAttribute('position').count / 3;
        // Axis sides 2 columns, chamfers 1, all 3 rows; the top fans over all 12 rim points.
        expect(fineCount).toBe((4 * 2 + 4 * 1) * 3 * 2 + 12);
        expect(plainCount).toBe(8 * 2 + 8);
        // Every rim point of the sides' top row is a vertex of the top fan (no T-junctions).
        const position = fine.getAttribute('position');
        const normal = fine.getAttribute('normal');
        const key = (i) => `${position.getX(i).toFixed(4)},${position.getZ(i).toFixed(4)}`;
        const sideTop = new Set();
        const topRim = new Set();
        for (let i = 0; i < position.count; i += 1) {
            if (Math.abs(position.getY(i) - 1.4) > 1e-6) continue;
            if (normal.getY(i) > 0.9) topRim.add(key(i));
            else sideTop.add(key(i));
        }
        for (const point of sideTop) expect(topRim.has(point)).toBe(true);
    });
});

describe('organic bio walls', () => {
    const vertexShader = '#include <common>\nvoid main() {\n#include <begin_vertex>\n#include <project_vertex>\n}';

    it('bends only corner-cut walls, by world position, scaled into bio', () => {
        const patched = patchCornerCutVertexShader(vertexShader, { organic: { start: 130, end: 150 } });
        expect(patched).toContain('uniform vec2 uShipWorldPos;');
        expect(patched).toContain('smoothstep( 130.0, 150.0');
        expect(patched).toContain(`hbCornerCut > ${CORNER_CUT_ACTIVE - 0.5}`);
        expect(patched).toContain('hbOrganicWorld');
        // Bends after the corner cut, before projection.
        expect(patched.indexOf('hbOrganicWorld')).toBeGreaterThan(patched.indexOf('hbCornerMask'));
        expect(patched.indexOf('transformed.xz +=')).toBeLessThan(patched.indexOf('#include <project_vertex>'));
        // Never declares the ship uniform twice.
        const declared = patchCornerCutVertexShader(`uniform vec2 uShipWorldPos;\n${vertexShader}`, { organic: { start: 1, end: 2 } });
        expect(declared.match(/uniform vec2 uShipWorldPos;/g)).toHaveLength(1);
        expect(patchCornerCutVertexShader(vertexShader)).not.toContain('hbOrganicWorld');
    });

    it('casts the same bent shadow, reading the ship position when it compiles', () => {
        const ship = new THREE.Vector2(3, 4);
        const material = createCornerCutDepthMaterial({ organic: { start: 130, end: 150 }, shipWorldPos: () => ship });
        const shader = { vertexShader, fragmentShader: '', uniforms: {} };
        material.onBeforeCompile(shader);
        expect(shader.uniforms.uShipWorldPos.value).toBe(ship);
        expect(shader.vertexShader).toContain('hbOrganicWorld');
        expect(material.customProgramCacheKey()).toBe('hb-wall-corner-cut-depth-organic');
    });
});

describe('planWallTopDressing', () => {
    const along = (axis, count, fixed, biome = 'active') => Array.from({ length: count }, (_, i) => (
        axis === 'x'
            ? planWallTopDressing({ worldX: i, worldZ: fixed, runAxis: 'x', biome })
            : planWallTopDressing({ worldX: fixed, worldZ: i, runAxis: 'z', biome })
    ));

    it('is deterministic per cell', () => {
        const a = planWallTopDressing({ worldX: 4, worldZ: 9, runAxis: 'x', biome: 'active' });
        expect(planWallTopDressing({ worldX: 4, worldZ: 9, runAxis: 'x', biome: 'active' })).toEqual(a);
    });

    it('lays pipes along runs in continuous stretches, one side per run', () => {
        let pipeCells = 0;
        let continued = 0;
        for (let row = 0; row < 40; row += 1) {
            const cells = along('x', 60, row);
            for (let i = 0; i < cells.length; i += 1) {
                const pipes = cells[i].filter((item) => item.type === 'pipe');
                for (const pipe of pipes) {
                    expect(pipe.axis).toBe('x');
                    expect(Math.abs(pipe.offset)).toBeGreaterThan(0.1);
                    expect(Math.abs(pipe.offset)).toBeLessThan(0.4);
                }
                if (!pipes.length) continue;
                pipeCells += 1;
                if (cells[i + 1]?.some((item) => item.type === 'pipe' && item.offset === pipes[0].offset)) continued += 1;
            }
        }
        expect(pipeCells).toBeGreaterThan(0);
        // Stretches, not speckle: most pipe cells carry on into the next one.
        expect(continued / pipeCells).toBeGreaterThan(0.6);
    });

    it('puts no pipes where the cell is not part of a straight run', () => {
        for (let i = 0; i < 200; i += 1) {
            const items = planWallTopDressing({ worldX: i, worldZ: i * 3, runAxis: null, biome: 'active' });
            expect(items.some((item) => item.type === 'pipe')).toBe(false);
        }
    });

    it('grows nodules on bio walls instead of pipes and hatches', () => {
        const items = along('x', 200, 7, 'bio').flat();
        expect(items.some((item) => item.type === 'nodule')).toBe(true);
        expect(items.some((item) => item.type === 'pipe' || item.type === 'hatch')).toBe(false);
        for (const nodule of items) {
            expect(Math.abs(nodule.x)).toBeLessThanOrEqual(0.35);
            expect(Math.abs(nodule.z)).toBeLessThanOrEqual(0.35);
        }
    });

    it('dresses only some walls, so tops stay readable', () => {
        const cells = along('z', 400, 3);
        const dressed = cells.filter((items) => items.length > 0).length;
        expect(dressed / cells.length).toBeGreaterThan(0.1);
        expect(dressed / cells.length).toBeLessThan(0.6);
    });
});

describe('planWallFootDressing', () => {
    const allOpen = { n: true, e: true, s: true, w: true };

    it('is deterministic per cell', () => {
        const a = planWallFootDressing({ worldX: 3, worldZ: -8, openSides: allOpen, biome: 'cryo' });
        expect(planWallFootDressing({ worldX: 3, worldZ: -8, openSides: allOpen, biome: 'cryo' })).toEqual(a);
    });

    it('sits only against faces that open onto floor', () => {
        for (let i = 0; i < 400; i += 1) {
            const items = planWallFootDressing({ worldX: i, worldZ: i * 7, openSides: { n: true, e: false, s: false, w: false }, biome: 'active' });
            for (const item of items) expect(item.side).toBe('n');
        }
        expect(planWallFootDressing({ worldX: 1, worldZ: 2, openSides: { n: false, e: false, s: false, w: false }, biome: 'active' })).toEqual([]);
    });

    it('drifts snow in cryo, lumps growth in bio and scatters rubble elsewhere', () => {
        const kinds = (biome) => new Set(Array.from({ length: 300 }, (_, i) => planWallFootDressing({ worldX: i, worldZ: 5, openSides: allOpen, biome }))
            .flat().map((item) => item.type));
        expect([...kinds('cryo')]).toEqual(['drift']);
        expect([...kinds('bio')]).toEqual(['lump']);
        expect([...kinds('active')]).toEqual(['rubble']);
    });

    it('keeps low and close to the wall, and dresses only some faces', () => {
        let faces = 0;
        let dressed = 0;
        for (let i = 0; i < 500; i += 1) {
            const items = planWallFootDressing({ worldX: i * 3, worldZ: i, openSides: allOpen, biome: 'cryo' });
            faces += 4;
            dressed += new Set(items.map((item) => item.side)).size;
            for (const item of items) {
                expect(item.height).toBeLessThanOrEqual(0.32);
                expect(item.depth).toBeLessThanOrEqual(0.4);
                expect(Math.abs(item.along)).toBeLessThanOrEqual(0.4);
            }
        }
        expect(dressed / faces).toBeGreaterThan(0.08);
        expect(dressed / faces).toBeLessThan(0.35);
    });
});
