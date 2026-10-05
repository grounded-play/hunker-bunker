import { describe, expect, it } from 'vitest';
import {
    GROUNDING_DECAL_LIMIT, GROUNDING_RULES, groundingRuleFor, normalizePopulationBudget, planRoomPopulation
} from './roomPopulation.js';
import fs from 'node:fs';

// The renderer's flat floor-overlay set (threeGame.js FLOOR_OVERLAY_TYPES).
// Anything else is drawn upright, so grounding must stay inside this set.
function rendererFloorOverlayTypes() {
    const source = fs.readFileSync(new URL('./threeGame.js', import.meta.url), 'utf8');
    const body = source.match(/const FLOOR_OVERLAY_TYPES = new Set\(\[([\s\S]*?)\]\);/)?.[1] ?? '';
    return new Set([...body.matchAll(/'([^']+)'/g)].map((match) => match[1]));
}

describe('room population', () => {
    it('reserves a full doorway apron so blocking props cannot seal a connector', () => {
        const grid = Array.from({ length: 7 }, () => Array(7).fill('.'));
        const room = {
            id: 'west-complex',
            role: 'storage',
            interior: Array.from({ length: 25 }, (_, index) => ({ x: 1 + (index % 5), y: 1 + Math.floor(index / 5) })),
            navigation: { doorLanes: [{ x: 1, y: 3 }] },
            populationBudget: { signature: 1, large: 1 },
            themeConfig: { signatureProps: ['prop_bunker_supplies'] }
        };
        const plan = planRoomPopulation(room, grid, () => 0.5);
        for (let y = 2; y <= 4; y += 1) {
            for (let x = 0; x <= 2; x += 1) expect(plan.reserved).toContain(`${x},${y}`);
        }
        expect(plan.placements.every((placement) => !(placement.x <= 2 && placement.y >= 2 && placement.y <= 4))).toBe(true);
    });

    it('normalizes legacy numeric budgets', () => {
        expect(normalizePopulationBudget({ large: 1, small: 3, pickup: 1, enemy: 0 })).toEqual({
            signature: 1,
            large: { min: 1, max: 1 },
            small: { min: 3, max: 3 },
            pickup: { min: 1, max: 1 },
            enemy: { min: 0, max: 0 }
        });
    });

    it('always places a signature when a valid interior cell exists', () => {
        const room = {
            id: 'room',
            interior: [{ x: 2, y: 2 }, { x: 3, y: 2 }, { x: 4, y: 2 }],
            navigation: { doorLanes: [{ x: 2, y: 2 }] },
            populationBudget: { large: 0, small: 0, pickup: 0, enemy: 0 },
            themeConfig: { signatureProps: ['signature'] }
        };
        const grid = Array.from({ length: 7 }, () => Array(7).fill('#'));
        grid[2][2] = grid[2][3] = grid[2][4] = '.';
        const plan = planRoomPopulation(room, grid, () => 0);
        expect(plan.signaturePlaced).toBe(true);
        expect(plan.placements[0]).toMatchObject({ kind: 'signature', type: 'signature' });
        expect(plan.reserved).toContain('2,2');
    });

    it('honors an explicit zero signature budget without marking the plan degraded', () => {
        const room = {
            id: 'deliberately-empty-room',
            role: 'generic',
            interior: [{ x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 }],
            navigation: { doorLanes: [] },
            populationBudget: { signature: 0, large: 0, small: 0, pickup: 0, enemy: 0 },
            themeConfig: { signatureProps: ['must-not-spawn'] }
        };
        const grid = Array.from({ length: 4 }, () => Array(5).fill('.'));
        const plan = planRoomPopulation(room, grid, () => 0);

        expect(plan.budget.signature).toBe(0);
        expect(plan.placements).toEqual([]);
        expect(plan.signaturePlaced).toBe(false);
        expect(plan.degraded).toBe(false);
    });

    it('layers non-blocking small and ambient dressing around an ordinary room edge', () => {
        const room = {
            id: 'ordinary-room',
            role: 'generic',
            interior: Array.from({ length: 25 }, (_, index) => ({ x: index % 5 + 1, y: Math.floor(index / 5) + 1 })),
            navigation: { doorLanes: [] },
            populationBudget: { large: 1, small: 3, pickup: 0, enemy: 0 },
            themeConfig: {
                signatureProps: ['signature'],
                largeProps: ['large'],
                smallProps: ['small'],
                ambientProps: ['decal_worker_sleep_roll']
            }
        };
        const grid = Array.from({ length: 7 }, () => Array(7).fill('#'));
        for (const cell of room.interior) grid[cell.y][cell.x] = '.';

        const plan = planRoomPopulation(room, grid, () => 0);

        const props = plan.placements.filter(({ kind }) => kind !== 'pickup');
        expect(props).toHaveLength(4);
        expect(props.every(({ x, y }) => x === 1 || x === 5 || y === 1 || y === 5)).toBe(true);
        expect(plan.placements).toContainEqual(expect.objectContaining({ kind: 'small', type: 'small', blocking: false }));
        expect(plan.placements).toContainEqual(expect.objectContaining({
            kind: 'ambient', type: 'decal_worker_sleep_roll', blocking: false
        }));
    });

    it('keeps three medical fixtures and adds bounded non-blocking story dressing', () => {
        const room = {
            id: 'medical-room',
            role: 'medical',
            interior: Array.from({ length: 25 }, (_, index) => ({ x: index % 5 + 1, y: Math.floor(index / 5) + 1 })),
            navigation: { doorLanes: [] },
            populationBudget: { signature: 1, large: 3, small: 3, pickup: 0, enemy: 0 },
            themeConfig: {
                signatureProps: ['prop_medical_bed'],
                largeProps: ['prop_diagnostic_console', 'prop_surgical_cart', 'prop_specimen_tank'],
                smallProps: ['scatter_bolts'],
                ambientProps: ['decal_worker_sleep_roll']
            }
        };
        const grid = Array.from({ length: 7 }, () => Array(7).fill('#'));
        for (const cell of room.interior) grid[cell.y][cell.x] = '.';
        const plan = planRoomPopulation(room, grid, () => 0);
        const objects = plan.placements.filter(({ kind }) => kind !== 'grounding-decal');

        expect(objects.map(({ type }) => type)).toEqual([
            'prop_medical_bed', 'prop_diagnostic_console', 'prop_surgical_cart',
            'prop_floor_drainage_sump_trough', 'scatter_bolts'
        ]);
        expect(objects).toHaveLength(5);
        expect(objects.slice(3).every(({ blocking }) => blocking === false)).toBe(true);
        // M2: the medical anchors are grounded with spill/seep decals, non-blocking.
        const grounding = plan.placements.filter(({ kind }) => kind === 'grounding-decal');
        expect(grounding.length).toBeGreaterThan(0);
        expect(grounding.every(({ blocking, type }) => !blocking && ['decal_bio_sample_spill', 'decal_fluid_seep'].includes(type))).toBe(true);
    });

    it('never exceeds five total objects even when a full room also requests a pickup', () => {
        const room = {
            id: 'busy-medical-room',
            role: 'medical',
            interior: Array.from({ length: 25 }, (_, index) => ({ x: index % 5 + 1, y: Math.floor(index / 5) + 1 })),
            navigation: { doorLanes: [] },
            populationBudget: { signature: 1, large: 3, small: 3, pickup: 1, enemy: 0 },
            themeConfig: {
                signatureProps: ['prop_medical_bed'],
                largeProps: ['prop_diagnostic_console', 'prop_surgical_cart'],
                smallProps: ['scatter_bolts'],
                ambientProps: ['decal_worker_sleep_roll']
            }
        };
        const grid = Array.from({ length: 7 }, () => Array(7).fill('#'));
        for (const cell of room.interior) grid[cell.y][cell.x] = '.';

        const plan = planRoomPopulation(room, grid, () => 0);
        // Flat grounding decals have their own cap (M2); every other object counts.
        const objects = plan.placements.filter(({ kind }) => kind !== 'grounding-decal');
        expect(objects).toHaveLength(5);
        expect(objects).toContainEqual(expect.objectContaining({ kind: 'pickup' }));
        expect(plan.placements.filter(({ kind }) => kind === 'small' || kind === 'ambient')).toHaveLength(0);
    });

    it('occasionally spends the bounded story slot on a rare theme landmark', () => {
        const room = {
            id: 'shrine-room',
            role: 'generic',
            interior: Array.from({ length: 25 }, (_, index) => ({ x: index % 5 + 1, y: Math.floor(index / 5) + 1 })),
            navigation: { doorLanes: [] },
            populationBudget: { signature: 1, large: 1, small: 3, pickup: 0, enemy: 0 },
            themeConfig: {
                signatureProps: ['signature'],
                largeProps: ['large'],
                smallProps: ['small'],
                ambientProps: ['ambient'],
                rareProps: ['prop_votive_candle_shrine']
            }
        };
        const grid = Array.from({ length: 7 }, () => Array(7).fill('#'));
        for (const cell of room.interior) grid[cell.y][cell.x] = '.';

        const plan = planRoomPopulation(room, grid, () => 0);

        expect(plan.placements).toHaveLength(5);
        expect(plan.placements).toContainEqual(expect.objectContaining({
            kind: 'rare', type: 'prop_votive_candle_shrine', blocking: false
        }));
    });

    it('respects reserved fixture cells and leaves the room center open', () => {
        const room = {
            id: 'fixture-room',
            role: 'generic',
            interior: Array.from({ length: 25 }, (_, index) => ({ x: index % 5 + 1, y: Math.floor(index / 5) + 1 })),
            navigation: { doorLanes: [{ x: 1, y: 1 }], reserved: [{ x: 1, y: 2 }, { x: 3, y: 3 }] },
            populationBudget: { large: 1, small: 3, pickup: 0, enemy: 0 },
            themeConfig: { signatureProps: ['signature'], largeProps: ['large'] }
        };
        const grid = Array.from({ length: 7 }, () => Array(7).fill('#'));
        for (const cell of room.interior) grid[cell.y][cell.x] = '.';
        const plan = planRoomPopulation(room, grid, () => 0);
        expect(plan.placements).not.toContainEqual(expect.objectContaining({ x: 1, y: 1 }));
        expect(plan.placements).not.toContainEqual(expect.objectContaining({ x: 1, y: 2 }));
        expect(plan.placements).not.toContainEqual(expect.objectContaining({ x: 3, y: 3 }));
    });

    it('reserves interaction, reward, lore, and quest content anchors against random population', () => {
        const room = {
            id: 'content-room',
            role: 'generic',
            interior: Array.from({ length: 25 }, (_, index) => ({ x: index % 5 + 1, y: Math.floor(index / 5) + 1 })),
            navigation: { doorLanes: [] },
            interactionAnchors: [{ x: 1, y: 1 }],
            rewardAnchors: [{ x: 1, y: 5 }],
            loreAnchors: [{ x: 5, y: 1 }],
            contentPlan: { questProps: [{ localX: 5, localZ: 5 }] },
            populationBudget: { signature: 1, large: 1, small: 0, pickup: 0, enemy: 0 },
            themeConfig: { signatureProps: ['signature'], largeProps: ['large'] }
        };
        const grid = Array.from({ length: 7 }, () => Array(7).fill('#'));
        for (const cell of room.interior) grid[cell.y][cell.x] = '.';
        const plan = planRoomPopulation(room, grid, () => 0);

        for (const key of ['1,1', '1,5', '5,1', '5,5']) {
            expect(plan.reserved).toContain(key);
            const [x, y] = key.split(',').map(Number);
            expect(plan.placements).not.toContainEqual(expect.objectContaining({ x, y }));
        }
    });

    it('materializes authored structural props on stamped obstruction cells', () => {
        const room = {
            id: 'machinery-room',
            role: 'engineering',
            interior: [{ x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 }],
            navigation: { doorLanes: [] },
            structuralAnchors: [{ id: 'machine', x: 2, y: 2, type: 'prop_fusion_generator' }],
            populationBudget: { signature: 0, large: 0, small: 0, pickup: 0, enemy: 0 },
            themeConfig: {}
        };
        const grid = Array.from({ length: 4 }, () => Array(5).fill('.'));
        grid[2][2] = '#';
        const plan = planRoomPopulation(room, grid, () => 0);

        expect(plan.placements).toContainEqual(expect.objectContaining({
            x: 2,
            y: 2,
            kind: 'structural',
            type: 'prop_fusion_generator',
            blocking: true
        }));
        expect(plan.reserved).toContain('2,2');
    });

    it('guarantees an ammo cache in reward, storage, and security rooms', () => {
        const grid = Array.from({ length: 5 }, () => Array(8).fill('.'));
        for (const role of ['reward', 'storage', 'security']) {
            const room = {
                id: role,
                role,
                interior: Array.from({ length: 6 }, (_, index) => ({ x: index + 1, y: 2 })),
                navigation: { doorLanes: [] },
                populationBudget: { large: 0, small: 0, pickup: 0, enemy: 0 },
                themeConfig: { signatureProps: ['signature'] }
            };
            const plan = planRoomPopulation(room, grid, () => 0);
            expect(plan.placements).toContainEqual(expect.objectContaining({
                kind: 'ammo-cache', type: 'prop_bunker_supplies', blocking: true
            }));
        }
    });

    it('restricts wall-backed props (altars, cradles) to cells adjacent to walls with wallNormal', () => {
        const room = {
            id: 'altar-room',
            role: 'generic',
            interior: [
                { x: 1, y: 2 },
                { x: 2, y: 2 },
                { x: 3, y: 2 }
            ],
            navigation: { doorLanes: [] },
            populationBudget: { signature: 1, large: 0, small: 0, pickup: 0, enemy: 0 },
            themeConfig: { signatureProps: ['prop_fungal_tendril_altar'] }
        };
        const grid = Array.from({ length: 5 }, () => Array(5).fill('.'));
        grid[2][0] = '#';
        const plan = planRoomPopulation(room, grid, () => 0);
        expect(plan.placements[0]).toMatchObject({
            type: 'prop_fungal_tendril_altar',
            x: 1,
            y: 2,
            wallNormal: { x: 1, z: 0 }
        });
    });

    describe('floor grounding (lived-in world M2)', () => {
        // A 9x9 room: walls on the border, a west door at (0,4), interior 1..7.
        function groundedRoom(overrides = {}) {
            const grid = Array.from({ length: 9 }, (_, y) => Array.from({ length: 9 }, (_, x) => (
                x === 0 || y === 0 || x === 8 || y === 8 ? '#' : '.'
            )));
            grid[4][0] = '.';
            const interior = [];
            for (let y = 1; y <= 7; y += 1) for (let x = 1; x <= 7; x += 1) interior.push({ x, y });
            const room = {
                id: 'grounding-room',
                role: 'generic',
                interior,
                navigation: { doorLanes: [{ x: 0, y: 4 }, { x: 1, y: 4 }], reserved: [{ x: 6, y: 6 }] },
                populationBudget: { signature: 1, large: 1, small: 0, pickup: 1, enemy: 0 },
                themeConfig: {
                    signatureProps: ['prop_oxygen_bottle_cascade_rack'],
                    largeProps: ['prop_liturgical_terminal_lectern']
                },
                ...overrides
            };
            return { room, grid };
        }

        it('maps anchor families to floor-overlay dressing only', () => {
            const floorOverlays = rendererFloorOverlayTypes();
            expect(floorOverlays.size).toBeGreaterThan(20);
            for (const rule of GROUNDING_RULES) {
                for (const type of rule.decals) expect(floorOverlays.has(type), type).toBe(true);
            }
            expect(groundingRuleFor('prop_oxygen_bottle_cascade_rack').decals).toContain('scatter_coolant_puddle');
            expect(groundingRuleFor('prop_biomech_incubator').decals).toContain('scatter_slime_puddle');
            expect(groundingRuleFor('prop_liturgical_terminal_lectern').piece).toBe('prop_floor_conduit_bridge');
            expect(groundingRuleFor('prop_bunker_supplies').decals).toContain('decal_oil_spill_patch');
            // Anchors with their own pairings in the key art.
            expect(groundingRuleFor('prop_autopsy_dissection_slab').piece).toBe('prop_floor_drainage_sump_trough');
            expect(groundingRuleFor('prop_decon_eyewash_shower_station').decals).toContain('scatter_coolant_puddle');
            expect(groundingRuleFor('prop_pipe_organ_heat_exchanger').piece).toBe('prop_floor_conduit_bridge');
            expect(groundingRuleFor('prop_exosuit_docking_gantry').piece).toBe('prop_floor_conduit_bridge');
            expect(groundingRuleFor('prop_biomech_sphincter_hatch_vent').decals).toContain('scatter_slime_puddle');
            expect(groundingRuleFor('prop_votive_candle_shrine').decals[0]).toMatch(/^decal_floor_medallion_/);
            expect(groundingRuleFor('mystery_object')).toBeNull();
        });

        it('tethers dressing to a cell beside its anchor, never in an apron, fixture, pickup or centre cell', () => {
            const { room, grid } = groundedRoom();
            const plan = planRoomPopulation(room, grid, () => 0.42);
            const anchors = plan.placements.filter(({ kind }) => kind === 'signature' || kind === 'large');
            const grounding = plan.placements.filter(({ kind }) => kind.startsWith('grounding'));
            expect(grounding.length).toBeGreaterThan(0);
            const pickup = plan.placements.find(({ kind }) => kind === 'pickup');
            for (const placement of grounding) {
                const anchor = plan.placements.find(({ id }) => id === placement.anchorPlacementId);
                expect(anchors).toContain(anchor);
                expect(Math.abs(anchor.x - placement.x) + Math.abs(anchor.y - placement.y)).toBe(1);
                expect(placement.blocking).toBe(false);
                // West door lane (0..1, 4) and its 3x3 apron; fixture (6,6) and its ring.
                expect(placement.x <= 2 && placement.y >= 3 && placement.y <= 5).toBe(false);
                expect(placement.x >= 5 && placement.y >= 5).toBe(false);
                expect(placement.x === 4 && placement.y === 4).toBe(false);
                if (pickup) expect(`${placement.x},${placement.y}`).not.toBe(`${pickup.x},${pickup.y}`);
            }
            const cells = plan.placements.map(({ x, y }) => `${x},${y}`);
            expect(new Set(cells).size).toBe(cells.length);
        });

        it('caps flat decals per room and counts a grounding piece against the object budget', () => {
            const { room, grid } = groundedRoom();
            const plan = planRoomPopulation(room, grid, () => 0.42);
            expect(plan.placements.filter(({ kind }) => kind === 'grounding-decal').length).toBeLessThanOrEqual(GROUNDING_DECAL_LIMIT);
            expect(plan.placements.filter(({ kind }) => kind !== 'grounding-decal').length).toBeLessThanOrEqual(5);
        });

        it('prioritizes a support piece over optional edge dressing in a full room', () => {
            const { room, grid } = groundedRoom({
                populationBudget: { signature: 1, large: 1, small: 3, pickup: 1, enemy: 0 },
                themeConfig: {
                    signatureProps: ['prop_oxygen_bottle_cascade_rack'],
                    largeProps: ['prop_liturgical_terminal_lectern'],
                    smallProps: ['scatter_bolts'],
                    ambientProps: ['decal_worker_sleep_roll'],
                    rareProps: ['prop_votive_candle_shrine']
                }
            });
            const plan = planRoomPopulation(room, grid, () => 0);
            const objects = plan.placements.filter(({ kind }) => kind !== 'grounding-decal');

            expect(objects).toHaveLength(5);
            expect(objects).toContainEqual(expect.objectContaining({
                kind: 'grounding', type: 'prop_floor_drainage_sump_trough'
            }));
            expect(objects.some(({ kind }) => kind === 'ambient')).toBe(false);
        });

        it('is deterministic and leaves the shared RNG sequence untouched', () => {
            const { room, grid } = groundedRoom();
            const run = (grounding) => {
                let state = 1234;
                let calls = 0;
                const random = () => { calls += 1; state = (state * 16807) % 2147483647; return state / 2147483647; };
                return { plan: planRoomPopulation(room, grid, random, { grounding }), calls };
            };
            const grounded = run(true);
            expect(run(true).plan).toEqual(grounded.plan);
            const bare = run(false);
            // Grounding consumes no draws and changes nothing it does not add.
            expect(grounded.calls).toBe(bare.calls);
            expect(grounded.plan.placements.filter(({ kind }) => !kind.startsWith('grounding'))).toEqual(bare.plan.placements);
            expect(bare.plan.placements.some(({ kind }) => kind.startsWith('grounding'))).toBe(false);
        });
    });
});
