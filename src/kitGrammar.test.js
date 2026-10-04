import { describe, expect, it } from 'vitest';
import { WORLD_3D_MODELS } from './world3dOverlay.js';
import {
    KIT_SKINS, SHARED_ROLES, SKIN_ONLY_ROLES,
    skinForBiome, kitPieceFor, chooseKitPiece, corridorKitPlacement, roomGatewayKitPlacement
} from './kitGrammar.js';

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
    it('centres an open biome-skinned frame on a north/south threshold', () => {
        expect(roomGatewayKitPlacement({
            side: 'n',
            cells: [{ x: 3, y: 2 }, { x: 4, y: 2 }, { x: 5, y: 2 }]
        }, 'bio')).toEqual({
            type: 'kit_cave_gate',
            x: 4,
            y: 2,
            rotationSteps: 0,
            modelScale: 1
        });
    });

    it('turns east/west frames cardinally and rejects malformed thresholds', () => {
        expect(roomGatewayKitPlacement({
            side: 'e',
            cells: [{ x: 8, y: 4 }, { x: 8, y: 5 }, { x: 8, y: 6 }]
        }, 'active')).toMatchObject({ type: 'kit_space_gate', x: 8, y: 5, rotationSteps: 1 });
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
