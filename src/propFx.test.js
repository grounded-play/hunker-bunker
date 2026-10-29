import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { PROP_FX_ANCHORS, PROP_FX_PROFILES, applyPropFxQuality, createPropFx, getPropFxProfile, resolvePropFxTransform, setPropFxQuality } from './propFx.js';

describe('prop FX recipes', () => {
    const recentVerticalSlice = [
        'life_arcade_cabinet', 'life_surgical_lamp', 'cryo_heater_station',
        'hive_brood_dome', 'chasm_beacon_post', 'corp_executive_sarcophagus',
        'corp_suppression_barrier', 'meridian_capacitor_bomb',
        'tina_covert_nursery_chest', 'hive_sphincter_iris',
        'ind_biomass_grinder', 'crash_cockpit_canopy'
    ];

    it('gives every first-slice recent GLB a bounded authored effect recipe', () => {
        for (const type of recentVerticalSlice) {
            const recipe = getPropFxProfile(type);
            expect(recipe, type).toBeDefined();
            expect(recipe.maxDistance, type).toBeLessThanOrEqual(24);
        }
    });

    it('keeps all first-slice practical sources shadowless and state-switchable', () => {
        for (const type of recentVerticalSlice) {
            const root = new THREE.Group();
            const model = new THREE.Mesh(new THREE.BoxGeometry(1, 2, 1));
            root.add(model);
            const fx = createPropFx(root, model, type);
            expect(fx.lightSources.length, type).toBe(1);
            for (const light of fx.lightSources) expect(light.castShadow, type).toBe(false);
            fx.setMode('disabled');
            expect(fx.enabled, type).toBe(false);
            fx.setMode('on');
            expect(fx.enabled, type).toBe(true);
            fx.dispose();
        }
    });

    const pass2Props = [
        'bay_c_pod_312_rupture', 'chen_sealed_confession_console', 'decon_exosuit_scrubber_station',
        'engineer_wave_relay_dynamo', 'evac_four_seat_cockpit_module', 'tank_orbital_siege_cannon',
        'queen_royal_brood_throne', 'carapace_sentry_chrysalis', 'royal_egg_clutch_caul',
        'vass_acoustic_resonator_tank', 'vass_hybrid_embryo_incubator', 'suture_mercy_cocoon_canopy',
        'relay_false_beacon_spire', 'corp_biometric_collar_chute', 'crawler_signal_antenna_rig',
        'evac_manifest_allocation_terminal', 'evac_preflight_fuel_umbilical', 'scout_tracking_beacon_core',
        'sector_zero_bore_drillhead'
    ];

    it('gives every pass 2 GLB a bounded authored effect recipe', () => {
        for (const type of pass2Props) {
            const recipe = getPropFxProfile(type);
            expect(recipe, type).toBeDefined();
            expect(recipe.maxDistance, type).toBeLessThanOrEqual(24);
        }
    });

    it('keeps all pass 2 practical sources shadowless and state-switchable', () => {
        for (const type of pass2Props) {
            const root = new THREE.Group();
            const model = new THREE.Mesh(new THREE.BoxGeometry(1, 2, 1));
            root.add(model);
            const fx = createPropFx(root, model, type);
            expect(fx.lightSources.length, type).toBe(1);
            for (const light of fx.lightSources) expect(light.castShadow, type).toBe(false);
            fx.setMode('disabled');
            expect(fx.enabled, type).toBe(false);
            fx.setMode('on');
            expect(fx.enabled, type).toBe(true);
            fx.dispose();
        }
    });

    const waveDProps = [
        'corp_interrogation_chair', 'corp_debt_severing_kiosk', 'corp_dissection_gurney',
        'corp_incinerator_hopper', 'meridian_cyber_graft_bench', 'meridian_mainframe_altar',
        'meridian_servitor_dock', 'tallow_compost_fermenter', 'tallow_spore_cradle',
        'tallow_flesh_trellis', 'tallow_sacrificial_altar', 'vesper_amputation_rig',
        'vesper_autocannon_bipod', 'vesper_hanging_cage', 'vesper_reloading_station'
    ];

    it('gives every Wave D world-story GLB a bounded authored effect recipe', () => {
        for (const type of waveDProps) {
            const recipe = getPropFxProfile(type);
            expect(recipe, type).toBeDefined();
            expect(recipe.maxDistance, type).toBeLessThanOrEqual(24);
        }
    });

    it('keeps all Wave D practical sources shadowless and state-switchable', () => {
        for (const type of waveDProps) {
            const root = new THREE.Group();
            const model = new THREE.Mesh(new THREE.BoxGeometry(1, 2, 1));
            root.add(model);
            const fx = createPropFx(root, model, type);
            expect(fx.lightSources.length, type).toBe(1);
            for (const light of fx.lightSources) expect(light.castShadow, type).toBe(false);
            fx.setMode('disabled');
            expect(fx.enabled, type).toBe(false);
            fx.setMode('on');
            expect(fx.enabled, type).toBe(true);
            fx.dispose();
        }
    });

    const waveEProps = [
        'tina_molted_carapace', 'tina_mimic_vanity', 'tina_trophy_trove',
        'hive_visceral_ovipositor', 'hive_vivisected_engineer', 'hive_gestation_sac',
        'hive_pulmonary_bellows', 'hive_amniotic_feeder_trough', 'cryo_ruptured_pod',
        'cryo_cannibal_butchery_table', 'cryo_ice_core_specimen', 'cryo_thawing_trough',
        'cryo_frozen_shelter_pod', 'chasm_hanging_elevator', 'chasm_suicide_ledge_cross',
        'chasm_dredge_hook_crane', 'ind_hydraulic_manifold', 'ind_fuel_rod_cask'
    ];

    it('gives every Wave E world-story GLB a bounded authored effect recipe', () => {
        for (const type of waveEProps) {
            const recipe = getPropFxProfile(type);
            expect(recipe, type).toBeDefined();
            expect(recipe.maxDistance, type).toBeLessThanOrEqual(24);
        }
    });

    const waveFFxProps = [
        'life_server_racks', 'life_transformer_bank', 'life_fire_station',
        'life_conveyor_section', 'life_cistern_tank', 'life_scaffold_tower',
        'life_forklift', 'life_shower_stall', 'life_laundry_machines',
        'life_overseer_desk', 'life_planning_board', 'life_algae_tank',
        'cryo_ice_crawler', 'cryo_frozen_cascade', 'cryo_snowbound_crates',
        'cryo_ice_blocks', 'hive_resin_pillar', 'hive_cocooned_crew',
        'hive_pheromone_node', 'hive_tendril_arch', 'hive_assimilated_generator',
        'crash_engine_nacelle', 'salvage_tagged_heap', 'camp_canvas_tent'
    ];

    it('gives all Wave F machinery & camps authored effect recipes', () => {
        for (const type of waveFFxProps) {
            const recipe = getPropFxProfile(type);
            expect(recipe, type).toBeDefined();
            expect(recipe.maxDistance, type).toBeLessThanOrEqual(24);
        }
    });

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

    it('preserves an authored outlet orientation relative to a rotated prop root', () => {
        const parent = new THREE.Group();
        const root = new THREE.Group();
        root.rotation.y = Math.PI / 3;
        parent.add(root);
        const model = new THREE.Group();
        const anchor = new THREE.Object3D();
        anchor.name = PROP_FX_ANCHORS.EMITTER;
        anchor.position.set(0.3, 0.7, -0.2);
        anchor.rotation.z = -Math.PI / 2;
        model.add(anchor);
        root.add(model);

        const transform = resolvePropFxTransform(root, model, {
            anchor: PROP_FX_ANCHORS.EMITTER,
            position: [9, 9, 9],
            direction: [0, 1, 0]
        });
        const direction = new THREE.Vector3(0, 1, 0).applyQuaternion(transform.quaternion);

        expect(transform.source).toBe('anchor');
        expect(transform.anchor).toBe(PROP_FX_ANCHORS.EMITTER);
        expect(transform.position.toArray()).toEqual(expect.arrayContaining([
            expect.closeTo(0.3, 6), expect.closeTo(0.7, 6), expect.closeTo(-0.2, 6)
        ]));
        expect(direction.x).toBeCloseTo(1, 6);
        expect(direction.y).toBeCloseTo(0, 6);
        expect(direction.z).toBeCloseTo(0, 6);
    });

    it('uses an explicit fallback direction when a model has no outlet anchor', () => {
        const root = new THREE.Group();
        const model = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2));
        root.add(model);
        const transform = resolvePropFxTransform(root, model, {
            anchor: 'FX_MISSING',
            bounds: [1, 0.5, 0.5],
            direction: [1, 0, 0]
        });
        const direction = new THREE.Vector3(0, 1, 0).applyQuaternion(transform.quaternion);

        expect(transform.source).toBe('bounds');
        expect(transform.position.toArray()).toEqual([1, 0, 0]);
        expect(direction.x).toBeCloseTo(1, 6);
        expect(direction.y).toBeCloseTo(0, 6);
        expect(direction.z).toBeCloseTo(0, 6);
    });

    it('orients pipe steam along its fallback outlet without rotating away its origin', () => {
        const root = new THREE.Group();
        const model = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
        root.add(model);
        const fx = createPropFx(root, model, 'prop_pipe_rupture');
        const steam = fx.group.children.find((child) => child.isPoints);
        const direction = new THREE.Vector3(0, 1, 0).applyQuaternion(steam.quaternion);

        expect(steam.userData.propFxTransformSource).toBe('position');
        expect(steam.position.toArray()).toEqual([0, 0.56, 0]);
        expect(direction.x).toBeGreaterThan(0.98);
        expect(direction.y).toBeGreaterThan(0.1);
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

describe('prop FX shaders compile', () => {
    // Playtest 2026-10-11: every rising-points effect (steam, smoke, sparks,
    // spores, bubbles) failed to link because the vertex stage read uStyle
    // without declaring it, so none of them ever drew. checkShaderErrors is
    // off in the game, so the only symptom was a WebGL warning per frame.
    const undeclaredUniforms = (source) => {
        const declared = new Set([...source.matchAll(/uniform\s+\w+\s+(u[A-Z]\w*)\s*;/g)].map((match) => match[1]));
        const used = new Set([...source.matchAll(/\b(u[A-Z]\w*)\b/g)].map((match) => match[1]));
        return [...used].filter((name) => !declared.has(name));
    };

    it('declares every uniform each stage uses, for every profile', () => {
        const problems = [];
        for (const type of Object.keys(PROP_FX_PROFILES)) {
            const root = new THREE.Group();
            const model = new THREE.Group();
            root.add(model);
            const fx = createPropFx(root, model, type);
            fx?.group?.traverse((object) => {
                const material = object.material;
                if (!material?.isShaderMaterial) return;
                for (const [stage, source] of [['vertex', material.vertexShader], ['fragment', material.fragmentShader]]) {
                    const missing = undeclaredUniforms(source);
                    if (missing.length) problems.push(`${type} ${object.name || object.type} ${stage}: ${missing.join(', ')}`);
                }
            });
        }
        expect(problems).toEqual([]);
    });
});

describe('prop FX quality (Settings > Graphics > Effects)', () => {
    const build = (type) => {
        const root = new THREE.Group();
        const model = new THREE.Group();
        root.add(model);
        return createPropFx(root, model, type);
    };
    const owned = (fx) => {
        const out = [];
        fx.group.traverse((object) => { if (object.userData?.propFxOwned) out.push(object); });
        return out;
    };

    it('full shows everything; reduced drops only the dust motes; off keeps flames and water but no particles', () => {
        const fx = build('prop_camp_cookfire_lit');
        for (const level of ['full', 'reduced', 'off']) {
            applyPropFxQuality(fx.group, level);
            for (const object of owned(fx)) {
                const motes = object.name.endsWith(':DustMotes');
                const particle = object.isPoints || object.isSprite;
                const expected = level === 'full' || (level === 'reduced' ? !motes : !particle);
                expect(object.visible, `${level} ${object.name || object.type}`).toBe(expected);
            }
        }
        applyPropFxQuality(fx.group, 'full');
    });

    it('never touches the pooled practical light', () => {
        const fx = build('prop_camp_cookfire_lit');
        const light = fx.group.getObjectByName('prop_camp_cookfire_lit:PropFxLight');
        const before = light.visible;
        applyPropFxQuality(fx.group, 'off');
        expect(light.visible).toBe(before);
    });

    it('props built later follow the current level', () => {
        setPropFxQuality('off');
        try {
            const fx = build('prop_biomech_respirator');
            const particles = owned(fx).filter((object) => object.isPoints);
            expect(particles.length).toBeGreaterThan(0);
            expect(particles.every((object) => !object.visible)).toBe(true);
        } finally {
            setPropFxQuality('full');
        }
    });
});
