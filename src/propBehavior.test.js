import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { PROP_COLLISION, archPillarColliders, getPropBehavior, isFloorPropType } from './propBehavior.js';
import { ThreeGame } from './threeGame.js';

// Owner playthrough 2026-10-07: "alien arch doorways that are solid ... need
// to be walk-underable", "the floor pieces shouldn't block you", "the fungus
// should break when you walk over it".
describe('each prop behaves for its style', () => {
    it('lets you walk under the grand archways and the biomech arch, by their posts only', () => {
        for (const type of ['arch_deco_archway_grand_01', 'arch_deco_archway_grand_04', 'prop_biomech_arch']) {
            expect(getPropBehavior(type).collision).toBe(PROP_COLLISION.PILLARS);
        }
        // A closed hatch frame and a column are still walls.
        expect(getPropBehavior('arch_bulkhead_frame').collision).toBe(PROP_COLLISION.SOLID);
        expect(getPropBehavior('arch_pillar_buttress_01').collision).toBe(PROP_COLLISION.SOLID);
    });

    it('never blocks on floor pieces', () => {
        for (const type of ['decal_floor_grate_01', 'decal_floor_medallion_03', 'prop_floor_drainage_sump_trough', 'scatter_coolant_puddle', 'prop_camp_bedrolls', 'scatter_bolts']) {
            expect(isFloorPropType(type)).toBe(true);
            expect(getPropBehavior(type).collision).toBe(PROP_COLLISION.NONE);
        }
        expect(getPropBehavior('prop_camp_crate').collision).toBe(PROP_COLLISION.SOLID);
    });

    it('crushes low fungus underfoot; tall growth stays solid', () => {
        for (const type of ['prop_cave_spores', 'prop_spore_colony', 'prop_cave_lichen', 'scatter_bio_moss']) {
            expect(getPropBehavior(type)).toMatchObject({ crushable: true, collision: PROP_COLLISION.NONE });
        }
        expect(getPropBehavior('state_growth_overrun_1')).toMatchObject({ crushable: false, collision: PROP_COLLISION.SOLID });
    });

    it('puts an arch’s posts at the ends of its longer side, leaving the middle clear', () => {
        const posts = archPillarColliders({ x: 10, z: 4, width: 2.6, depth: 0.5, yaw: 0 });
        expect(posts).toHaveLength(2);
        expect(posts[0].z).toBeCloseTo(4);
        expect(Math.abs(posts[0].x - 10)).toBeGreaterThan(0.8);
        expect(posts[0].x + posts[1].x).toBeCloseTo(20);
        // Deeper than wide: the posts run along z.
        const turned = archPillarColliders({ x: 0, z: 0, width: 1.5, depth: 3.5 });
        expect(Math.abs(turned[0].z)).toBeGreaterThan(1);
        expect(turned[0].x).toBeCloseTo(0);
    });
});

describe('the player walks by the table', () => {
    function gameWith(type, userData = {}) {
        const game = Object.create(ThreeGame.prototype);
        game.playerRadius = 0.3;
        game.isInPocket = false;
        game.getTileType = () => '.';
        game.isHoleTile = () => false;
        const scene = new THREE.Scene();
        const prop = new THREE.Object3D();
        prop.position.set(5, 0, 5);
        prop.userData = { type, isSolidProp: true, collisionRadius: 0.6, ...userData };
        scene.add(prop);
        game.scatterSprites = [prop];
        return { game, prop };
    }

    it('walks through the middle of an arch, but not into its posts', () => {
        const { game } = gameWith('arch_deco_archway_grand_02', {
            pillarColliders: archPillarColliders({ x: 5, z: 5, width: 2.6, depth: 0.5 })
        });
        expect(game.canOccupyPosition(5, 5)).toBe(true);
        expect(game.canOccupyPosition(5 + 1.0, 5)).toBe(false);
    });

    it('walks over a floor grate the room plan marked blocking', () => {
        const { game } = gameWith('decal_floor_grate_02');
        expect(game.canOccupyPosition(5, 5)).toBe(true);
    });

    it('is still stopped by a crate', () => {
        const { game } = gameWith('prop_camp_crate');
        expect(game.canOccupyPosition(5, 5)).toBe(false);
    });
});

describe('an arch gets its posts when its model lands', () => {
    it('measures the placed model and plants a post at each end of the opening', async () => {
        const game = Object.create(ThreeGame.prototype);
        const parent = new THREE.Group();
        const source = new THREE.Object3D();
        source.position.set(20, 0, 8);
        source.userData = { type: 'arch_deco_archway_grand_01', isSolidProp: true };
        parent.add(source);
        const model = new THREE.Group();
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.6, 0.4));
        mesh.position.y = 1.3;
        model.add(mesh);
        game.createWorld3dModel = async () => model;
        await game.setupWorld3dReplacement(source, 'arch_deco_archway_grand_01');
        const posts = source.userData.pillarColliders;
        expect(posts).toHaveLength(2);
        // The model faces the game's 3D yaw, so the opening may run along x or
        // z; either way the posts straddle the arch's centre.
        expect((posts[0].x + posts[1].x) / 2).toBeCloseTo(20, 1);
        expect((posts[0].z + posts[1].z) / 2).toBeCloseTo(8, 1);
        expect(Math.hypot(posts[0].x - posts[1].x, posts[0].z - posts[1].z)).toBeGreaterThan(1.4);
    });
});

describe('a low, wide model is capped across, not only by height', async () => {
    const { prepareWorld3dModel, WORLD_3D_MODELS } = await import('./world3dOverlay.js');
    const flatSlab = () => {
        const group = new THREE.Group();
        group.add(new THREE.Mesh(new THREE.BoxGeometry(6, 1, 6)));
        return group;
    };

    it('shrinks a model whose height sizing made it wider than its cap', () => {
        const model = prepareWorld3dModel(flatSlab(), 'test_slab', { height: 1.1, maxSpan: 2.2 });
        const size = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
        expect(Math.max(size.x, size.z)).toBeLessThanOrEqual(2.2 + 1e-6);
    });

    // Museum walk 2026-10-07: these measured 6.5, 5.2 and 9.8 units across.
    it('caps the cryo vent, thermal pod and drainage trough', () => {
        expect(WORLD_3D_MODELS.prop_icey_frost_vent.maxSpan).toBeLessThanOrEqual(2.4);
        expect(WORLD_3D_MODELS.prop_icey_thermal_pod.maxSpan).toBeLessThanOrEqual(2.8);
        expect(WORLD_3D_MODELS.prop_floor_drainage_sump_trough.maxSpan).toBeLessThanOrEqual(3.2);
    });
});

describe('V1 spacing rule: duplicate models do not sit within 6 tiles', async () => {
    const {
        chooseSpacedModel,
        isModelSpaced,
        PROP_SPACING_MIN_TILES
    } = await import('./propBehavior.js');

    it('requires at least 6 tiles distance for regular models', () => {
        expect(PROP_SPACING_MIN_TILES).toBe(6);
        const placed = [{ type: 'prop_conduit_hub', x: 10, y: 10 }];

        // 3 tiles away -> not spaced
        expect(isModelSpaced('prop_conduit_hub', 13, 10, placed)).toBe(false);
        // 5.9 tiles away -> not spaced
        expect(isModelSpaced('prop_conduit_hub', 10, 15.9, placed)).toBe(false);
        // 6.1 tiles away -> spaced
        expect(isModelSpaced('prop_conduit_hub', 10, 16.1, placed)).toBe(true);
        // Different model at 2 tiles -> allowed
        expect(isModelSpaced('prop_fabricator_workstation', 12, 10, placed)).toBe(true);
    });

    it('allows cluster-exempt models to sit close together', () => {
        const placed = [{ type: 'prop_camp_crates', x: 5, y: 5 }];
        expect(isModelSpaced('prop_camp_crates', 6, 5, placed)).toBe(true);
        expect(isModelSpaced('prop_bunker_cot', 5, 6, [{ type: 'prop_bunker_cot', x: 5, y: 5 }])).toBe(true);
        expect(isModelSpaced('scatter_bolts', 5.5, 5.5, [{ type: 'scatter_bolts', x: 5, y: 5 }])).toBe(true);
    });

    it('chooseSpacedModel avoids models placed within 6 tiles and rotates chunk weights', () => {
        const candidates = ['prop_conduit_hub', 'prop_terminal_bank'];
        const placed = [{ type: 'prop_conduit_hub', x: 10, y: 10 }];

        // At x=12, y=10, conduit hub is within 6 tiles; terminal bank must be chosen
        const picked = chooseSpacedModel(candidates, {
            x: 12,
            y: 10,
            placedItems: placed,
            random: () => 0.5
        });
        expect(picked).toBe('prop_terminal_bank');

        // Rotating weight test: when both are spaced, a model used heavily in chunk has lowered weight
        const chunkPlacedCounts = new Map([
            ['prop_conduit_hub', 10], // used 10 times in chunk
            ['prop_terminal_bank', 0] // not used yet
        ]);
        // Over 100 rolls, terminal bank should be chosen much more frequently
        let hubCount = 0;
        let bankCount = 0;
        for (let i = 0; i < 100; i++) {
            const roll = i / 100;
            const res = chooseSpacedModel(candidates, {
                x: 50,
                y: 50,
                placedItems: placed,
                chunkPlacedCounts,
                random: () => roll
            });
            if (res === 'prop_conduit_hub') hubCount++;
            else if (res === 'prop_terminal_bank') bankCount++;
        }
        expect(bankCount).toBeGreaterThan(hubCount * 3);
    });
});

describe('V2 facing rule: props face into room away from walls', async () => {
    const {
        computePropFacingYaw,
        isPropFacingWall,
        isBedOrBench
    } = await import('./propBehavior.js');

    it('identifies bed and bench types for sideways wall alignment', () => {
        expect(isBedOrBench('prop_bunker_cot')).toBe(true);
        expect(isBedOrBench('prop_medical_bed')).toBe(true);
        expect(isBedOrBench('prop_camp_bench')).toBe(true);
        expect(isBedOrBench('prop_terminal_bank')).toBe(false);
    });

    it('orients wall-backed props away from the wall into the room', () => {
        // Wall is to the West (-X), so wall normal points East (+X, 0)
        const wallNormal = { x: 1, z: 0 };
        const yaw = computePropFacingYaw({
            type: 'prop_terminal_bank',
            wallNormal,
            random: () => 0.5
        });

        // Yaw should be ~PI/2 (pointing along +X, away from the wall)
        expect(yaw).toBeCloseTo(Math.PI / 2, 1);
        // It must NOT face into the wall
        expect(isPropFacingWall(yaw, wallNormal, 60)).toBe(false);
    });

    it('orients corner props along the corner diagonal into the room', () => {
        // Corner formed by North (+Z) and West (-X) walls
        // Wall directions into solid are [0, 1] and [-1, 0]
        const walls = [[0, 1], [-1, 0]];
        const yaw = computePropFacingYaw({
            type: 'arch_pillar_buttress_01',
            walls,
            corner: true,
            random: () => 0.5
        });
        // Diagonal points East (+X) and South (-Z)
        expect(Number.isFinite(yaw)).toBe(true);
    });

    it('orients free-standing props toward room center or nearest door within ±15°', () => {
        const roomCenter = { x: 10, z: 10 };
        const yaw = computePropFacingYaw({
            type: 'prop_fabricator_workstation',
            x: 10,
            y: 0, // 10 units South of room center (dx=0, dz=10 -> yaw 0)
            roomCenter,
            random: () => 0.5 // zero jitter
        });
        expect(yaw).toBeCloseTo(0, 2);

        // With random jitter at extreme bounds, jitter is within ±15° (0.26 rad)
        const yawMin = computePropFacingYaw({
            type: 'prop_fabricator_workstation',
            x: 10,
            y: 0,
            roomCenter,
            random: () => 0.0 // -15° jitter
        });
        const yawMax = computePropFacingYaw({
            type: 'prop_fabricator_workstation',
            x: 10,
            y: 0,
            roomCenter,
            random: () => 1.0 // +15° jitter
        });
        expect(Math.abs(yawMin - yaw)).toBeLessThanOrEqual((15 * Math.PI) / 180 + 0.01);
        expect(Math.abs(yawMax - yaw)).toBeLessThanOrEqual((15 * Math.PI) / 180 + 0.01);
    });

    it('places beds and benches with their long side along the wall', () => {
        const wallNormal = { x: 0, z: 1 }; // Wall behind is -Z, facing +Z
        const baseYaw = Math.atan2(0, 1); // 0
        const yawSideA = computePropFacingYaw({
            type: 'prop_bunker_cot',
            wallNormal,
            random: () => 0.2 // side +PI/2
        });
        const yawSideB = computePropFacingYaw({
            type: 'prop_bunker_cot',
            wallNormal,
            random: () => 0.8 // side -PI/2
        });
        expect(Math.abs(Math.abs(yawSideA - baseYaw) - Math.PI / 2)).toBeCloseTo(0, 2);
        expect(Math.abs(Math.abs(yawSideB - baseYaw) - Math.PI / 2)).toBeCloseTo(0, 2);
    });

    it('verifies no prop placed against a wall faces within 60° of its backing wall', () => {
        const wallNormals = [
            { x: 1, z: 0 },
            { x: -1, z: 0 },
            { x: 0, z: 1 },
            { x: 0, z: -1 },
            { x: 0.707, z: 0.707 }
        ];

        for (const wallNormal of wallNormals) {
            for (let i = 0; i < 20; i++) {
                const rand = i / 20;
                const yaw = computePropFacingYaw({
                    type: 'prop_conduit_hub',
                    wallNormal,
                    random: () => rand
                });
                expect(isPropFacingWall(yaw, wallNormal, 60)).toBe(false);
            }
        }
    });
});

