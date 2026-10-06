import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { ThreeGame } from './threeGame.js';
import { WORLD_3D_MODEL_ALIASES, hasWorld3dModel, resolveScatterWorld3dType, world3dModelTypeFor } from './world3dOverlay.js';

// 2026-10-05: the game is 3D. A prop with a model never draws its 2D sprite;
// the sprite keeps owning gameplay state, and only reappears if the model fails.
describe('no 2D stand-ins for props with 3D models', () => {
    const spriteProp = () => {
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial());
        sprite.userData = { type: 'prop_bunker_supplies', isSolidProp: true };
        new THREE.Group().add(sprite);
        return sprite;
    };

    it('hides the sprite material (not the object) when a 3D model is deferred', () => {
        const sprite = spriteProp();
        ThreeGame.prototype.deferWorld3dReplacement.call({}, sprite, 'prop_bunker_supplies');
        expect(sprite.material.visible).toBe(false);
        // The object stays visible so collision and targeting still treat it as present.
        expect(sprite.visible).toBe(true);
        expect(sprite.userData.world3dModelType).toBe('prop_bunker_supplies');
    });

    it('leaves sprites without a model alone', () => {
        const sprite = spriteProp();
        ThreeGame.prototype.deferWorld3dReplacement.call({}, sprite, 'definitely_not_a_model');
        expect(sprite.material.visible).toBe(true);
    });

    it('reveals the sprite as a fallback when the model fails to load', async () => {
        const sprite = spriteProp();
        const game = {
            deferWorld3dReplacement: ThreeGame.prototype.deferWorld3dReplacement,
            revealWorld3dFallback: ThreeGame.prototype.revealWorld3dFallback,
            createWorld3dModel: vi.fn(async () => null)
        };
        game.deferWorld3dReplacement(sprite, 'prop_bunker_supplies');
        await ThreeGame.prototype.setupWorld3dReplacement.call(game, sprite, 'prop_bunker_supplies');
        expect(sprite.material.visible).toBe(true);

        const throwing = { ...game, createWorld3dModel: vi.fn(async () => { throw new Error('missing'); }) };
        const second = spriteProp();
        throwing.deferWorld3dReplacement(second, 'prop_bunker_supplies');
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        await ThreeGame.prototype.setupWorld3dReplacement.call(throwing, second, 'prop_bunker_supplies');
        warn.mockRestore();
        expect(second.material.visible).toBe(true);
    });

    it('resolves 2D types whose subject ships as a GLB under another name', () => {
        const sprite = spriteProp();
        ThreeGame.prototype.deferWorld3dReplacement.call({}, sprite, 'body_human_frozen_suit');
        expect(sprite.userData.world3dModelType).toBe('prop_body_human_frozen');
        expect(sprite.material.visible).toBe(false);
    });

    it('every alias points at a registered model', () => {
        for (const [type, model] of Object.entries(WORLD_3D_MODEL_ALIASES)) {
            expect(hasWorld3dModel(model), `${type} -> ${model}`).toBe(true);
        }
    });

    // The spawn paths gate on "has a model" before deferring. They used to ask
    // with the raw 2D name, so an alias never reached the game: the deferral
    // tests above passed while every aliased prop still drew its billboard.
    const spawn = (type) => {
        const game = {
            deferWorld3dReplacement: ThreeGame.prototype.deferWorld3dReplacement,
            hashTile: () => 1,
            scatterMaterials: { [type]: new THREE.SpriteMaterial() }
        };
        return ThreeGame.prototype.createScatterInstance.call(game, { type, x: 2, z: 3, scale: 1, scatterKey: 'k' });
    };

    it.each([
        ['prop_fusion_generator', 'fusion_generator'],
        ['prop_camp_cookfire_doused', 'prop_camp_cookfire'],
        ['prop_camp_vesper_turret', 'prop_base_defense_turret'],
        ['bunker_junk_legendary', 'bunker_junk_rare'],
        // Session 2026-10-06: still flat in rooms on PC and Deck.
        ['prop_cyber_junction', 'prop_diagnostic_console'],
        ['prop_biomech_pillar_left', 'prop_biomech_arch'],
        ['prop_biomech_pillar_right', 'prop_biomech_arch'],
        ['prop_cryo_sleep_pod', 'prop_flesh_steel_coffin'],
        ['prop_camp_meridian_repair_rig', 'prop_maintenance_tool_cart'],
        ['prop_engineering_bench', 'prop_fabricator_workstation'],
        ['prop_ruptured_coolant_pump', 'prop_icey_frost_manifold']
    ])('a spawned %s prop renders as %s, not its billboard', (type, model) => {
        const sprite = spawn(type);
        expect(sprite.userData.world3dModelType).toBe(model);
        expect(sprite.material.visible).toBe(false);
    });

    it('resolves aliased scatter types for the scatter spawn path', () => {
        expect(resolveScatterWorld3dType('scatter_camp_supplies')).toBe('prop_camp_crate');
        expect(resolveScatterWorld3dType('scatter_definitely_not_a_model')).toBeNull();
    });
});

describe('2D -> 3D candidate list', () => {
    it('marks wired exactly the aliased types, and every candidate is a real model', async () => {
        const { WORLD_3D_CANDIDATES } = await import('./data/world3dCandidates.js');
        for (const entry of WORLD_3D_CANDIDATES) {
            for (const model of entry.candidates) expect(hasWorld3dModel(model), `${entry.type} -> ${model}`).toBe(true);
            if (entry.status === 'wired') expect(WORLD_3D_MODEL_ALIASES[entry.type]).toBe(entry.candidates[0]);
            else expect(WORLD_3D_MODEL_ALIASES[entry.type], `${entry.type} is aliased but still marked review`).toBeUndefined();
        }
    });
});

// Camp and hive signature and service props ship as ~10 KB placeholder tiles
// (a dashed box with initials). Territory rooms spawn them as room props and
// camp.js / hiveSite.js build them as site sprites; both must draw a model.
describe('camp and hive signature props', () => {
    it('every territory signature and service type draws a model', async () => {
        const { TERRITORY_SITE_PROFILES } = await import('./territoryStructures.js');
        for (const profile of Object.values(TERRITORY_SITE_PROFILES)) {
            for (const type of [profile.signature, profile.service]) {
                expect(hasWorld3dModel(world3dModelTypeFor(type)), type).toBe(true);
            }
        }
    });

    it('every camp and hive site signature prop names a model', async () => {
        const { CAMP_SIGNATURE_PROPS } = await import('./camp.js');
        const { HIVE_SIGNATURE_PROPS } = await import('./hiveSite.js');
        const specs = [...Object.values(CAMP_SIGNATURE_PROPS), ...Object.values(HIVE_SIGNATURE_PROPS)].flat();
        for (const spec of specs) {
            expect(spec.model, spec.id).toBeTruthy();
            expect(hasWorld3dModel(world3dModelTypeFor(spec.model)), `${spec.id} -> ${spec.model}`).toBe(true);
        }
    });
});
