import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { PROP_FX_ANCHORS, PROP_FX_PROFILES, createPropFx, getPropFxProfile } from './propFx.js';

describe('prop FX recipes', () => {
    it('covers the representative fire, liquid, mechanical, electrical, organic and rupture slice', () => {
        for (const type of [
            'prop_camp_cookfire_lit', 'life_water_still', 'prop_specimen_tank',
            'prop_exhaust_blower_fan_hood', 'prop_vital_monitor',
            'prop_votive_candle_shrine', 'prop_hive_resin_sac', 'prop_pipe_rupture'
        ]) {
            expect(getPropFxProfile(type), type).toBeDefined();
        }
        expect(getPropFxProfile('prop_camp_crate')).toBeNull();
        expect(Object.isFrozen(PROP_FX_PROFILES)).toBe(true);
    });

    it('covers the broader active-prop pass without decorating inert clutter', () => {
        expect(Object.keys(PROP_FX_PROFILES).length).toBeGreaterThanOrEqual(80);
        for (const type of [
            'life_barrel_heater', 'prop_biomech_incubator', 'prop_icey_frost_vent',
            'base_console', 'prop_terminal_ruptured', 'prop_cave_eggs_intact',
            'life_lung_filter_bellows'
        ]) {
            expect(getPropFxProfile(type), type).toBeDefined();
        }
        // Every prop with a plausible source of light, heat, steam, liquid,
        // sparks or growth loops; inert furniture and architecture stay still.
        for (const type of [
            'life_seismic_drill', 'life_wind_mast', 'life_meat_smoking_rack', 'life_ice_core_rack',
            'life_welding_station', 'life_supply_drop_pod', 'prop_body_human_frozen', 'prop_medical_bed'
        ]) {
            expect(getPropFxProfile(type), type).toBeDefined();
        }
        for (const type of ['prop_camp_crate', 'life_pew_segment', 'prop_camp_sandbags', 'arch_pillar_buttress_01']) {
            expect(getPropFxProfile(type), type).toBeNull();
        }
    });

    it('attaches flame and a pooled-light source without exposing a live scene light', () => {
        const root = new THREE.Group();
        const model = new THREE.Group();
        root.add(model);
        const fx = createPropFx(root, model, 'prop_camp_cookfire_lit');

        expect(fx.group.parent).toBe(root);
        expect(fx.group.getObjectByName('prop_camp_cookfire_lit:PropFxLight')).toBeInstanceOf(THREE.PointLight);
        expect(fx.lightSources[0].visible).toBe(false);
        expect(fx.lightSources[0].userData.isAnchorPracticalLight).toBe(true);
        expect(fx.group.children.some((child) => child.isMesh)).toBe(true);
    });

    it('prefers a Blender-authored anchor over the fallback position', () => {
        const root = new THREE.Group();
        const model = new THREE.Group();
        const anchor = new THREE.Object3D();
        anchor.name = PROP_FX_ANCHORS.WATER;
        anchor.position.set(0.2, 0.9, -0.1);
        model.add(anchor);
        root.add(model);

        const fx = createPropFx(root, model, 'life_water_still');
        const water = fx.group.children.find((child) => child.isMesh);
        expect(water.position.toArray()).toEqual([0.2, 0.9, -0.1]);
    });

    it('places ambient effects from normalized model bounds when no authored anchor exists', () => {
        const root = new THREE.Group();
        const model = new THREE.Group();
        const body = new THREE.Mesh(new THREE.BoxGeometry(2, 4, 6));
        body.position.y = 2;
        model.add(body);
        root.add(model);

        const fx = createPropFx(root, model, 'base_console');
        const glow = fx.group.children.find((child) => child.isSprite);
        expect(glow.position.x).toBeCloseTo(0);
        expect(glow.position.y).toBeCloseTo(2.64);
        expect(glow.position.z).toBeCloseTo(0.36);
    });

    it('creates distinct spark particles and subtle organic breathing', () => {
        const sparkRoot = new THREE.Group();
        const sparkModel = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
        sparkRoot.add(sparkModel);
        const sparks = createPropFx(sparkRoot, sparkModel, 'prop_terminal_ruptured');
        expect(sparks.group.children.some((child) => child.isPoints)).toBe(true);

        const organicRoot = new THREE.Group();
        const organicModel = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
        organicRoot.add(organicModel);
        const organic = createPropFx(organicRoot, organicModel, 'prop_cave_eggs_intact');
        organic.update(0.1);
        expect(organicModel.scale.x).not.toBe(1);
        expect(Math.abs(organicModel.scale.x - 1)).toBeLessThan(0.02);
        organic.dispose();
        expect(organicModel.scale.toArray()).toEqual([1, 1, 1]);
    });

    it('hangs dust motes in the air around every practical light, and only there', () => {
        const root = new THREE.Group();
        const model = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
        root.add(model);
        const fx = createPropFx(root, model, 'prop_camp_cookfire_lit');
        const light = fx.lightSources[0];
        const motes = fx.group.getObjectByName('prop_camp_cookfire_lit:DustMotes');
        expect(motes?.isPoints).toBe(true);
        const positions = motes.geometry.getAttribute('position');
        expect(positions.count).toBeGreaterThanOrEqual(40);
        for (let i = 0; i < positions.count; i += 1) {
            // Inside the pool the light throws, from the floor up past the lamp.
            expect(Math.hypot(positions.getX(i) - light.position.x, positions.getZ(i) - light.position.z)).toBeLessThanOrEqual(light.distance * 0.5 + 1e-6);
            expect(positions.getY(i)).toBeGreaterThanOrEqual(0);
        }
        // Tinted by the light and drifting on the effect's clock.
        const uniforms = motes.material.uniforms;
        expect(uniforms.uColor.value.getHex()).not.toBe(0xffffff);
        fx.update(0.05);
        expect(uniforms.uTime.value).toBeGreaterThan(0);

        const unlitRoot = new THREE.Group();
        const unlitModel = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
        unlitRoot.add(unlitModel);
        const unlitType = Object.keys(PROP_FX_PROFILES).find((type) => !PROP_FX_PROFILES[type].light);
        const unlit = createPropFx(unlitRoot, unlitModel, unlitType);
        expect(unlit.group.children.some((child) => child.name.endsWith(':DustMotes'))).toBe(false);
    });

    it('distance-culls visual work and disables its registered light source', () => {
        const root = new THREE.Group();
        const model = new THREE.Group();
        root.add(model);
        const fx = createPropFx(root, model, 'prop_specimen_tank');
        fx.update(0.016, new THREE.Vector3(100, 0, 0));
        expect(fx.group.visible).toBe(false);
        expect(fx.lightSources[0].userData.envLightEnabled).toBe(false);

        fx.update(0.016, new THREE.Vector3(1, 0, 0));
        expect(fx.group.visible).toBe(true);
        expect(fx.lightSources[0].userData.envLightEnabled).toBe(true);
    });

    it('disposes only FX-owned GPU resources', () => {
        const root = new THREE.Group();
        const model = new THREE.Group();
        root.add(model);
        const fx = createPropFx(root, model, 'life_water_still');
        const owned = [];
        fx.group.traverse((object) => {
            if (!object.userData?.propFxOwned) return;
            vi.spyOn(object.geometry, 'dispose');
            vi.spyOn(object.material, 'dispose');
            owned.push(object);
        });
        fx.dispose();
        expect(fx.group.parent).toBeNull();
        for (const object of owned) {
            expect(object.geometry.dispose).toHaveBeenCalledOnce();
            expect(object.material.dispose).toHaveBeenCalledOnce();
        }
    });
});
