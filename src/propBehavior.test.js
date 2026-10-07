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
