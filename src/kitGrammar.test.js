import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { WORLD_3D_MODELS } from './world3dOverlay.js';
import { KIT_SCALE } from './kitMaterials.js';
import { PROCEDURAL_DOOR_SLAB_THICKNESS } from './proceduralDoors.js';
import {
    KIT_SKINS, SHARED_ROLES, SKIN_ONLY_ROLES, GATE_MODEL_HALF_DEPTH, GATEWAY_ROOM_INSET,
    skinForBiome, kitPieceFor, chooseKitPiece, corridorKitPlacement, roomGatewayKitPlacement, wallShellPlacements
} from './kitGrammar.js';
import { ROOM_BUILD_CATALOG, stampRoomBuild } from './roomBuilds.js';

// Z extent (depth across the threshold) of every mesh in a GLB, from its
// POSITION accessor bounds through the node translations. Enough for the
// kit gate, whose nodes are translated but not rotated or scaled.
function glbDepthExtent(path) {
    const buffer = fs.readFileSync(path);
    const json = JSON.parse(buffer.subarray(20, 20 + buffer.readUInt32LE(12)).toString('utf8'));
    let min = Infinity;
    let max = -Infinity;
    const visit = (index, offsetZ) => {
        const node = json.nodes[index];
        expect(node.rotation ?? [0, 0, 0, 1]).toEqual([0, 0, 0, 1]);
        const z = offsetZ + (node.translation?.[2] ?? 0);
        for (const primitive of json.meshes[node.mesh]?.primitives ?? []) {
            const accessor = json.accessors[primitive.attributes.POSITION];
            min = Math.min(min, z + accessor.min[2]);
            max = Math.max(max, z + accessor.max[2]);
        }
        for (const child of node.children ?? []) visit(child, z);
    };
    for (const root of json.scenes[json.scene ?? 0].nodes) visit(root, 0);
    return { min, max };
}

describe('biome skinning', () => {
    it('routes rock biomes to the cave kit and fabricated ones to space', () => {
        expect(skinForBiome('bio')).toBe(KIT_SKINS.CAVE);
        expect(skinForBiome('active')).toBe(KIT_SKINS.SPACE);
        expect(skinForBiome('cryo')).toBe(KIT_SKINS.SPACE);
    });

    it('falls back to space for an unknown biome rather than throwing', () => {
        expect(skinForBiome('nonsense')).toBe(KIT_SKINS.SPACE);
        expect(skinForBiome(undefined)).toBe(KIT_SKINS.SPACE);
    });
});

describe('corridor topology placement', () => {
    const grid = (rows) => rows.map((row) => [...row]);

    // Rotation is three.js yaw (rotationSteps * PI/2, counter-clockwise from
    // above), which turns east to north, north to west, west to south and south
    // to east. Openings rotate the same way.
    const turn = { e: 'n', n: 'w', w: 's', s: 'e' };
    const rotate = (dirs, steps) => {
        let out = [...dirs];
        for (let i = 0; i < steps; i += 1) out = out.map((d) => turn[d]);
        return out.sort().join('');
    };
    // The kit pieces' own wall layout, measured from the source GLBs
    // (2026-10-01): which sides each base piece leaves open at rotation 0.
    const BASE_OPEN = { corridor: ['e', 'w'], corridorCorner: ['n', 'w'], corridorEnd: ['e'], corridorT: ['e', 'n', 'w'], corridorCross: ['e', 'n', 's', 'w'] };
    const opensTo = (placement) => rotate(BASE_OPEN[placement.role.replace('Wide', '')], placement.rotationSteps);

    it('turns straight modules along the route (the base piece runs east/west)', () => {
        const vertical = corridorKitPlacement(grid(['#.#', '#.#', '#.#']), 1, 1, 'active');
        const horizontal = corridorKitPlacement(grid(['###', '...', '###']), 1, 1, 'active');
        expect(vertical).toMatchObject({ type: 'kit_space_corridor', rotationSteps: 1 });
        expect(horizontal).toMatchObject({ type: 'kit_space_corridor', rotationSteps: 0 });
    });

    it('opens every module exactly toward its open neighbours', () => {
        const cases = {
            ens: ['#.#', '#..', '#.#'],
            enw: ['#.#', '...', '###'],
            ensw: ['#.#', '...', '#.#'],
            en: ['#.#', '#..', '###'],
            nw: ['#.#', '..#', '###'],
            sw: ['###', '..#', '#.#'],
            es: ['###', '#..', '#.#'],
            n: ['#.#', '#.#', '###'],
            e: ['###', '#..', '###'],
            s: ['###', '#.#', '#.#'],
            w: ['###', '..#', '###']
        };
        for (const [open, rows] of Object.entries(cases)) {
            const placement = corridorKitPlacement(grid(rows), 1, 1, 'bio');
            expect(opensTo(placement), `${open} -> ${placement.role} x${placement.rotationSteps}`).toBe(open);
        }
    });

    // The hallway generator carves corridors 2*width+1 cells across, so every
    // cell next to a marker is open; topology has to be read past the carve.
    it('reads topology past a wide carve and fits a wide module to it', () => {
        const rows = [
            '#########',
            '#########',
            '.........',
            '.........',
            '.........',
            '.........',
            '.........',
            '#########',
            '#########'
        ];
        const placement = corridorKitPlacement(grid(rows), 4, 4, 'active', { width: 2 });
        expect(placement).toMatchObject({ type: 'kit_space_corridor_wide', rotationSteps: 0 });
        // 5 carved cells across a 6-unit wide module (8 Kenney units at 0.75).
        expect(placement.modelScale).toBeCloseTo(5 / 6, 5);
        expect(corridorKitPlacement(grid(['###', '...', '###']), 1, 1, 'active').modelScale).toBe(1);
    });

    it('selects corner, junction, and intersection silhouettes from connectivity', () => {
        expect(corridorKitPlacement(grid(['#.#', '#..', '###']), 1, 1, 'bio').role).toBe('corridorCorner');
        expect(corridorKitPlacement(grid(['#.#', '...', '###']), 1, 1, 'bio').role).toBe('corridorT');
        expect(corridorKitPlacement(grid(['#.#', '...', '#.#']), 1, 1, 'bio').role).toBe('corridorCross');
    });

    it('uses the biome skin without changing topology', () => {
        const path = grid(['#.#', '#.#', '#.#']);
        expect(corridorKitPlacement(path, 1, 1, 'bio').type).toBe('kit_cave_corridor');
        expect(corridorKitPlacement(path, 1, 1, 'cryo').type).toBe('kit_space_corridor');
    });

    it('refuses walls and malformed grids', () => {
        expect(corridorKitPlacement(grid(['###', '###', '###']), 1, 1, 'active')).toBeNull();
        expect(corridorKitPlacement(null, 1, 1, 'active')).toBeNull();
    });
});

describe('role resolution', () => {
    it('resolves every shared role in both skins to a REGISTERED model', () => {
        // The point of the grammar is that a generator can ask for a role and
        // get something that renders. A role resolving to a type nobody
        // registered is the failure this guards.
        for (const biome of ['active', 'bio']) {
            for (const role of Object.keys(SHARED_ROLES)) {
                const type = kitPieceFor(role, biome);
                expect(WORLD_3D_MODELS[type], `${role} in ${biome} -> ${type}`).toBeTruthy();
            }
        }
    });

    it('gives each skin its own gate rather than a shared one', () => {
        expect(kitPieceFor('gate', 'bio')).toBe('kit_cave_gate_rock');
        expect(kitPieceFor('gate', 'active')).toBe('kit_space_gate_door');
    });

    it('returns null for a role the skin lacks, instead of substituting', () => {
        // A rock slab standing in for a powered door is worse than no door.
        expect(kitPieceFor('ladder', 'active')).toBeNull();
        expect(kitPieceFor('gateHazard', 'bio')).toBeNull();
    });

    it('resolves every skin-only role within its own skin', () => {
        for (const [skin, roles] of Object.entries(SKIN_ONLY_ROLES)) {
            const biome = skin === KIT_SKINS.CAVE ? 'bio' : 'active';
            for (const role of Object.keys(roles)) {
                expect(WORLD_3D_MODELS[kitPieceFor(role, biome)], `${role}/${skin}`).toBeTruthy();
            }
        }
    });

    it('only adds a -variation suffix where that twin actually exists', () => {
        expect(kitPieceFor('roomSmall', 'active', { variation: true })).toBe('kit_space_room_small_variation');
        // Corridors have no variation twin; asking for one must not invent a type.
        expect(kitPieceFor('corridor', 'active', { variation: true })).toBe('kit_space_corridor');
    });
});

describe('authored room gateway placement', () => {
    it.each([
        ['n', [{ x: 3, y: 2 }, { x: 4, y: 2 }, { x: 5, y: 2 }], 4, 2 + GATEWAY_ROOM_INSET, 0],
        ['e', [{ x: 8, y: 4 }, { x: 8, y: 5 }, { x: 8, y: 6 }], 8 - GATEWAY_ROOM_INSET, 5, 1],
        ['s', [{ x: 3, y: 8 }, { x: 4, y: 8 }, { x: 5, y: 8 }], 4, 8 - GATEWAY_ROOM_INSET, 2],
        ['w', [{ x: 2, y: 4 }, { x: 2, y: 5 }, { x: 2, y: 6 }], 2 + GATEWAY_ROOM_INSET, 5, 3]
    ])('insets and turns the %s frame toward the room', (side, cells, x, y, rotationSteps) => {
        expect(roomGatewayKitPlacement({ side, cells }, 'bio')).toEqual({
            type: 'kit_cave_gate', x, y, rotationSteps, modelScale: 1
        });
    });

    // Gateway probe 2026-10-04: a half-cell inset left the closed blast door
    // (a slab centred on the threshold line) running through both posts.
    it.each(['cave', 'space'])('stands the %s frame clear of the closed blast door', (skin) => {
        const { min, max } = glbDepthExtent(`public/3d/runtime/kits/modular-${skin}-kit/gate.glb`);
        const halfDepth = Math.max(-min, max);
        expect(halfDepth).toBeLessThanOrEqual(GATE_MODEL_HALF_DEPTH + 1e-6);
        const frameBackFace = GATEWAY_ROOM_INSET - halfDepth * KIT_SCALE;
        const slabRoomFace = PROCEDURAL_DOOR_SLAB_THICKNESS / 2;
        expect(frameBackFace).toBeGreaterThan(slabRoomFace);
        // ...but not so far that the frame floats in the room: under a tenth of a cell.
        expect(frameBackFace - slabRoomFace).toBeLessThan(0.1);
    });

    it('rejects malformed thresholds', () => {
        expect(roomGatewayKitPlacement({ side: 'n', cells: [] }, 'active')).toBeNull();
        expect(roomGatewayKitPlacement({ side: 'up', cells: [{ x: 1, y: 1 }] }, 'active')).toBeNull();
    });
});

describe('grid breaking', () => {
    it('is deterministic for a given seeded roll', () => {
        const a = chooseKitPiece('roomLarge', 'bio', () => 0.3);
        const b = chooseKitPiece('roomLarge', 'bio', () => 0.3);
        expect(a).toEqual(b);
    });

    it('produces different rotations across rolls, so the grid does not repeat', () => {
        const rotations = new Set([0.05, 0.3, 0.55, 0.8].map((r) => chooseKitPiece('corridor', 'active', () => r).rotationSteps));
        expect(rotations.size).toBeGreaterThan(1);
    });

    it('keeps rotation cardinal, since these pieces socket on a grid', () => {
        for (const r of [0, 0.24, 0.49, 0.74, 0.99]) {
            const piece = chooseKitPiece('corridor', 'active', () => r);
            expect([0, 1, 2, 3]).toContain(piece.rotationSteps);
        }
    });

    it('reaches the variation twin on a high roll and not on a low one', () => {
        expect(chooseKitPiece('roomWide', 'active', () => 0.9).variation).toBe(true);
        expect(chooseKitPiece('roomWide', 'active', () => 0.1).variation).toBe(false);
    });

    it('returns null for an impossible role rather than a broken piece', () => {
        expect(chooseKitPiece('ladder', 'active', () => 0.5)).toBeNull();
    });
});

describe('hostile input', () => {
    it('does not resolve inherited Object.prototype keys as roles', () => {
        // A bare SHARED_ROLES[role] returned the source text of Object's own
        // constructor as a placement type. Role names can come from authored
        // data, so this was reachable rather than theoretical.
        for (const key of ['constructor', 'toString', '__proto__', 'valueOf', 'hasOwnProperty']) {
            expect(kitPieceFor(key, 'active'), key).toBeNull();
        }
    });

    it('rejects non-string and empty roles', () => {
        expect(kitPieceFor(null, 'active')).toBeNull();
        expect(kitPieceFor(42, 'active')).toBeNull();
        expect(kitPieceFor('', 'active')).toBeNull();
    });

    it('folds a NaN roll to zero rather than producing a NaN rotation', () => {
        // A NaN rotation places the piece unrotated AND poisons any transform
        // built from it downstream, which is far harder to trace.
        const piece = chooseKitPiece('corridor', 'active', () => NaN);
        expect(Number.isFinite(piece.rotationSteps)).toBe(true);
    });

    it('clamps a random source that returns out of range', () => {
        const piece = chooseKitPiece('corridor', 'active', () => 5);
        expect([0, 1, 2, 3]).toContain(piece.rotationSteps);
    });
});

// Lived-in world M5 spike (showroom only, design-gated): replace straight
// runs of a room's boundary wall with 3-cell kit wall pieces.
describe('wall shell substitution grammar (M5 spike)', () => {
    const LONG_SIDE = { n: 'north', s: 'south', e: 'east', w: 'west' };
    const FACE = { n: [0, 0.5, 0], s: [0, -0.5, 2], e: [-0.5, 0, 3], w: [0.5, 0, 1] };

    function stamped(build, seed = 7) {
        let state = seed;
        const random = () => (state = (state * 16807) % 2147483647) / 2147483647;
        const openings = Object.fromEntries(build.sockets.map((socket) => [LONG_SIDE[socket.side], { open: true, offset: 8 }]));
        const stamp = stampRoomBuild(build, random, { openings });
        return { grid: stamp.grid, room: { interior: stamp.interior, bounds: stamp.bounds, doors: stamp.doors } };
    }

    it('covers a plain wall run with whole 3-cell kit pieces, centred, facing the room', () => {
        // 9x9: boundary walls on the border, interior 1..7, no doors.
        const grid = Array.from({ length: 9 }, (_, y) => Array.from({ length: 9 }, (_, x) => (
            x === 0 || y === 0 || x === 8 || y === 8 ? '#' : '.'
        )));
        const interior = [];
        for (let y = 1; y <= 7; y += 1) for (let x = 1; x <= 7; x += 1) interior.push({ x, y });
        const shells = wallShellPlacements(grid, { interior, bounds: { left: 1, right: 7, top: 1, bottom: 7 }, doors: [] }, 'active');
        const north = shells.filter(({ side }) => side === 'n');
        expect(north.map(({ cells }) => cells.map(({ x }) => x))).toEqual([[1, 2, 3], [4, 5, 6]]);
        expect(north[0]).toMatchObject({ type: 'kit_space_template_wall', x: 2, y: 0.5, rotationSteps: 0, modelScale: 1 });
        expect(shells.filter(({ side }) => side === 'e')[0]).toMatchObject({ x: 7.5, rotationSteps: 3 });
        expect(shells).toHaveLength(8);
    });

    it.each(ROOM_BUILD_CATALOG.map((build) => [build.id, build]))('stays on boundary walls and clear of doors in %s', (_id, build) => {
        const { grid, room } = stamped(build);
        const shells = wallShellPlacements(grid, room, 'cave');
        const doorCells = room.doors.flatMap(({ cells }) => cells);
        const used = new Set();
        const interior = new Set(room.interior.map(({ x, y }) => `${x},${y}`));
        for (const shell of shells) {
            expect(shell.type).toBe('kit_cave_template_wall');
            expect(shell.modelScale).toBe(1);
            expect(shell.cells).toHaveLength(3);
            const [dx, dy, rotationSteps] = FACE[shell.side];
            expect(shell.rotationSteps).toBe(rotationSteps);
            expect(shell.x).toBeCloseTo(shell.cells[1].x + dx);
            expect(shell.y).toBeCloseTo(shell.cells[1].y + dy);
            // Boundary walls sit one cell outside the stamped pattern's bounds.
            const onLine = { n: ({ y }) => y === room.bounds.top - 1, s: ({ y }) => y === room.bounds.bottom + 1,
                w: ({ x }) => x === room.bounds.left - 1, e: ({ x }) => x === room.bounds.right + 1 }[shell.side];
            for (const cell of shell.cells) {
                const key = `${cell.x},${cell.y}`;
                expect(grid[cell.y][cell.x]).toBe('#');
                expect(onLine(cell)).toBe(true);
                expect(used.has(key)).toBe(false);
                used.add(key);
                const inward = { n: [0, 1], s: [0, -1], e: [-1, 0], w: [1, 0] }[shell.side];
                expect(interior.has(`${cell.x + inward[0]},${cell.y + inward[1]}`)).toBe(true);
                for (const door of doorCells) {
                    expect(Math.max(Math.abs(door.x - cell.x), Math.abs(door.y - cell.y))).toBeGreaterThan(1);
                }
            }
        }
        expect(shells.length).toBeGreaterThan(0);
    });
});

