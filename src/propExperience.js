import * as THREE from 'three';
import { createPropArticulation } from './propArticulation.js';

const freezeProfile = (value) => Object.freeze({
    ...value,
    behaviors: Object.freeze([...(value.behaviors ?? [])]),
    presentation: value.presentation ? Object.freeze({ ...value.presentation }) : null
});

const terminal = (color, options = {}) => freezeProfile({
    behaviors: ['use', 'proximity', 'damage'],
    dynamic: true,
    updateDistance: 18,
    presentation: {
        acknowledgeColor: color,
        acknowledgeDuration: options.duration ?? 0.55,
        acknowledgeIntensity: options.intensity ?? 2.4
    }
});

// Props with cut-out moving parts (scripts/blender/articulation_recipes.py):
// E opens/closes their doors or starts/stops their rotors.
const mechanism = (color, behaviors = ['use', 'damage']) => freezeProfile({
    behaviors,
    dynamic: true,
    updateDistance: 18,
    articulated: true,
    presentation: { acknowledgeColor: color, acknowledgeDuration: 0.45, acknowledgeIntensity: 1.2 }
});

export const PROP_EXPERIENCE_PROFILES = Object.freeze({
    life_arcade_cabinet: terminal(0x55d9ff, { intensity: 2.1 }),
    life_surgical_lamp: terminal(0xe9fff4, { duration: 0.35, intensity: 1.5 }),
    cryo_heater_station: terminal(0xff7a24, { duration: 0.4, intensity: 1.7 }),
    hive_brood_dome: terminal(0x92d65c, { duration: 0.5, intensity: 1.5 }),
    chasm_beacon_post: terminal(0xef4444, { duration: 0.35, intensity: 2 }),
    corp_executive_sarcophagus: terminal(0xd946ef, { intensity: 2 }),
    corp_suppression_barrier: mechanism(0xef4444),
    meridian_capacitor_bomb: terminal(0xffa648, { duration: 0.45, intensity: 2.2 }),
    tina_covert_nursery_chest: terminal(0x76d95c, { duration: 0.5, intensity: 1.6 }),
    hive_sphincter_iris: mechanism(0xa3e635),
    ind_biomass_grinder: mechanism(0xff8a2b, ['use', 'ambient', 'damage']),
    crash_cockpit_canopy: terminal(0xff7a24, { duration: 0.45, intensity: 1.7 }),

    // Pass 2 world-story mature models (19 models)
    bay_c_pod_312_rupture: terminal(0x4deeea, { duration: 0.45, intensity: 1.8 }),
    chen_sealed_confession_console: terminal(0xffa834, { duration: 0.5, intensity: 2.0 }),
    decon_exosuit_scrubber_station: mechanism(0xd8f8ff, ['use', 'ambient', 'damage']),
    engineer_wave_relay_dynamo: mechanism(0x38bdf8, ['use', 'ambient', 'damage']),
    evac_four_seat_cockpit_module: terminal(0xff7830, { duration: 0.5, intensity: 1.9 }),
    tank_orbital_siege_cannon: mechanism(0xff4433, ['use', 'damage']),

    queen_royal_brood_throne: terminal(0xa855f7, { duration: 0.6, intensity: 2.2 }),
    carapace_sentry_chrysalis: terminal(0xa3e635, { duration: 0.4, intensity: 1.6 }),
    royal_egg_clutch_caul: terminal(0xf59e0b, { duration: 0.45, intensity: 1.7 }),
    vass_acoustic_resonator_tank: mechanism(0x06b6d4, ['use', 'ambient', 'damage']),
    vass_hybrid_embryo_incubator: terminal(0x84cc16, { duration: 0.5, intensity: 1.8 }),
    suture_mercy_cocoon_canopy: terminal(0x2dd4bf, { duration: 0.55, intensity: 2.0 }),
    relay_false_beacon_spire: mechanism(0xfbbf24, ['use', 'ambient', 'damage']),

    corp_biometric_collar_chute: mechanism(0xef4444, ['use', 'damage']),
    crawler_signal_antenna_rig: mechanism(0xff3333, ['use', 'ambient', 'damage']),
    evac_manifest_allocation_terminal: terminal(0x4ade80, { duration: 0.45, intensity: 2.1 }),
    evac_preflight_fuel_umbilical: mechanism(0xfacc15, ['use', 'damage']),
    scout_tracking_beacon_core: terminal(0x60a5fa, { duration: 0.35, intensity: 2.2 }),
    sector_zero_bore_drillhead: mechanism(0xffedd5, ['use', 'ambient', 'damage']),

    // Wave D: Pass 1 Corporate, Meridian, Tallow & Vesper (15 models)
    corp_interrogation_chair: terminal(0xef4444, { duration: 0.45, intensity: 1.8 }),
    corp_debt_severing_kiosk: terminal(0xf59e0b, { duration: 0.45, intensity: 2.0 }),
    corp_dissection_gurney: terminal(0xe2e8f0, { duration: 0.4, intensity: 1.6 }),
    corp_incinerator_hopper: mechanism(0xf97316, ['use', 'ambient', 'damage']),
    meridian_cyber_graft_bench: mechanism(0x06b6d4, ['use', 'ambient', 'damage']),
    meridian_mainframe_altar: terminal(0x38bdf8, { duration: 0.5, intensity: 2.1 }),
    meridian_servitor_dock: mechanism(0x2563eb, ['use', 'damage']),
    tallow_compost_fermenter: terminal(0x65a30d, { duration: 0.4, intensity: 1.7 }),
    tallow_spore_cradle: terminal(0x84cc16, { duration: 0.45, intensity: 1.6 }),
    tallow_flesh_trellis: mechanism(0x16a34a),
    tallow_sacrificial_altar: terminal(0xdc2626, { duration: 0.5, intensity: 2.0 }),
    vesper_amputation_rig: mechanism(0xb91c1c, ['use', 'damage']),
    vesper_autocannon_bipod: mechanism(0xf59e0b, ['use', 'damage']),
    vesper_hanging_cage: mechanism(0xef4444, ['use', 'damage']),
    vesper_reloading_station: mechanism(0xfde047, ['use', 'damage']),

    // Wave E: Pass 1 Hive, Cryo Brutality, Tina & Chasm (18 models)
    tina_molted_carapace: terminal(0xa3e635, { duration: 0.4, intensity: 1.6 }),
    tina_mimic_vanity: terminal(0xf1f5f9, { duration: 0.45, intensity: 1.8 }),
    tina_trophy_trove: terminal(0xfbbf24, { duration: 0.5, intensity: 2.2 }),
    hive_visceral_ovipositor: terminal(0xe11d48, { duration: 0.5, intensity: 2.0 }),
    hive_vivisected_engineer: terminal(0x06b6d4, { duration: 0.45, intensity: 1.8 }),
    hive_gestation_sac: terminal(0xf59e0b, { duration: 0.45, intensity: 1.7 }),
    hive_pulmonary_bellows: mechanism(0xf43f5e, ['use', 'ambient', 'damage']),
    hive_amniotic_feeder_trough: terminal(0x84cc16, { duration: 0.4, intensity: 1.7 }),
    cryo_ruptured_pod: terminal(0x38bdf8, { duration: 0.45, intensity: 1.7 }),
    cryo_cannibal_butchery_table: terminal(0xd97706, { duration: 0.45, intensity: 1.8 }),
    cryo_ice_core_specimen: terminal(0x0ea5e9, { duration: 0.45, intensity: 1.9 }),
    cryo_thawing_trough: mechanism(0xf97316, ['use', 'ambient', 'damage']),
    cryo_frozen_shelter_pod: mechanism(0xef4444, ['use', 'damage']),
    chasm_hanging_elevator: mechanism(0xf59e0b, ['use', 'damage']),
    chasm_suicide_ledge_cross: terminal(0xf59e0b, { duration: 0.5, intensity: 1.8 }),
    chasm_dredge_hook_crane: mechanism(0xeab308, ['use', 'damage']),
    ind_hydraulic_manifold: mechanism(0x0284c7, ['use', 'ambient', 'damage']),
    ind_fuel_rod_cask: mechanism(0xf59e0b, ['use', 'damage']),

    // Wave F: 2026-10-11 World Completion Machinery, Daily Life & Camps (28 models)
    life_pallet_racking: mechanism(0x94a3b8),
    life_server_racks: terminal(0x38bdf8, { duration: 0.45, intensity: 2.0 }),
    life_transformer_bank: mechanism(0xef4444, ['use', 'ambient', 'damage']),
    life_fire_station: mechanism(0xdc2626, ['use', 'damage']),
    life_conveyor_section: mechanism(0xfacc15, ['use', 'damage']),
    life_cistern_tank: terminal(0x38bdf8, { duration: 0.4, intensity: 1.8 }),
    life_scaffold_tower: mechanism(0xfef08a),
    life_forklift: mechanism(0xf59e0b, ['use', 'damage']),
    life_sink_row: mechanism(0x38bdf8),
    life_shower_stall: mechanism(0x0284c7, ['use', 'ambient']),
    life_laundry_machines: mechanism(0xf59e0b),
    life_weight_bench: mechanism(0x94a3b8),
    life_filing_cabinets: mechanism(0x94a3b8),
    life_overseer_desk: terminal(0x22c55e, { duration: 0.45, intensity: 1.8 }),
    life_planning_board: terminal(0xfef08a, { duration: 0.45, intensity: 1.7 }),
    life_algae_tank: terminal(0x22c55e, { duration: 0.4, intensity: 1.8 }),
    cryo_ice_crawler: mechanism(0x7dd3fc, ['use', 'damage']),
    cryo_snowbound_crates: mechanism(0x38bdf8),
    cryo_ice_blocks: mechanism(0x7dd3fc),
    hive_resin_pillar: terminal(0x4ade80, { duration: 0.45, intensity: 1.8 }),
    hive_cocooned_crew: terminal(0x84cc16, { duration: 0.5, intensity: 2.0 }),
    hive_pheromone_node: terminal(0xa3e635, { duration: 0.4, intensity: 1.7 }),
    hive_assimilated_generator: mechanism(0x84cc16, ['use', 'ambient', 'damage']),
    crash_engine_nacelle: mechanism(0xf97316, ['use', 'damage']),
    crash_hull_panels: mechanism(0x94a3b8),
    salvage_tagged_heap: mechanism(0xf59e0b, ['use', 'damage']),
    camp_canvas_tent: mechanism(0xfbbf24, ['use']),
    camp_water_barrel: mechanism(0x38bdf8),
    life_ribcage_rescue_cabinet: mechanism(0xef4444),
    life_confessional: mechanism(0xffb84d),
    life_seismic_drill: mechanism(0xffa648, ['use', 'ambient', 'damage']),
    life_ice_bore_winch: mechanism(0x5fe3ff, ['use', 'ambient', 'damage']),
    life_supply_drop_pod: mechanism(0xffa648, ['use', 'inspect', 'damage']),
    base_console: terminal(0x52ff9a),
    o2_generator: terminal(0x55d9ff, { intensity: 2.8 }),
    prop_diagnostic_console: terminal(0x52ff9a),
    prop_fabricator_workstation: terminal(0x55d9ff),
    prop_liturgical_terminal_lectern: terminal(0xffb84d),
    prop_terminal_ruptured: terminal(0xef4444, { duration: 0.42, intensity: 1.8 }),
    prop_camp_meridian_radio: terminal(0xf59e0b, { intensity: 1.9 }),
    life_route_map_table: terminal(0x55d9ff),
    life_tactile_console: terminal(0x76d95c),
    life_assimilated_desk: terminal(0x76d95c),
    life_cochlear_intercom: terminal(0xf59e0b, { duration: 0.4, intensity: 1.8 })
});

const BASE_ENVIRONMENT_TYPES = new Set([
    'base_console', 'o2_generator', 'hull_matrix', 'radar', 'fusion_generator',
    'basic_pile', 'storage_locker', 'frozen_tanker', 'bunker_junk_rare', 'bunker_junk_uncommon'
]);

export function isEnvironmentExperienceType(type) {
    if (typeof type !== 'string') return false;
    if (BASE_ENVIRONMENT_TYPES.has(type)) return true;
    return /^(prop_|life_|scatter_|state_|arch_|fixture_|body_)/.test(type);
}

function inferredProfile(type) {
    if (!isEnvironmentExperienceType(type)) return null;
    if (/^(arch_|state_wall_|state_column_)/.test(type)) {
        return freezeProfile({ behaviors: ['structural'] });
    }
    if (/^(fixture_|state_growth_)/.test(type) || /(fire|light|vent|water|liquid|spore|fungal|hive|bellows|heater)/.test(type)) {
        return freezeProfile({ behaviors: ['ambient', 'damage'] });
    }
    if (/^(body_)|body_human|covered_stretcher/.test(type)) {
        return freezeProfile({ behaviors: ['inspect'] });
    }
    if (/crate|locker|supplies|pile|cart|rack|drum|bones|molt/.test(type)) {
        return freezeProfile({ behaviors: ['inspect', 'damage'] });
    }
    return freezeProfile({ behaviors: ['reactive', 'damage'] });
}

export function getPropExperienceProfile(type) {
    return PROP_EXPERIENCE_PROFILES[type] ?? inferredProfile(type);
}

export function isDynamicPropExperienceType(type) {
    return getPropExperienceProfile(type)?.dynamic === true;
}

function materialsOf(object) {
    return Array.isArray(object.material) ? object.material : [object.material];
}

/**
 * Per-instance presentation controller. Geometry and textures remain shared;
 * only emissive-capable materials are cloned so one console can acknowledge E
 * without lighting every copy of the same cached GLB.
 */
export function createPropExperience(root, model, type) {
    const profile = getPropExperienceProfile(type);
    const presentation = profile?.presentation;
    const articulation = createPropArticulation(model);
    if (!root || !model || (!presentation && !articulation)) return null;

    const clones = new Map();
    const assignments = [];
    const targets = [];
    model.traverse((object) => {
        if (!object.isMesh || !object.material) return;
        const originals = materialsOf(object);
        let changed = false;
        const replacements = originals.map((material) => {
            if (!material?.emissive?.isColor) return material;
            changed = true;
            if (!clones.has(material)) {
                const clone = material.clone();
                clone.name = `${material.name || type}:PropExperience`;
                clone.userData = { ...clone.userData, propExperienceOwned: true };
                clones.set(material, clone);
                targets.push({
                    material: clone,
                    baseEmissive: clone.emissive.clone(),
                    baseIntensity: Number.isFinite(clone.emissiveIntensity) ? clone.emissiveIntensity : 1
                });
            }
            return clones.get(material);
        });
        if (!changed) return;
        assignments.push({ object, original: object.material });
        object.material = Array.isArray(object.material) ? replacements : replacements[0];
    });

    const pulseColor = new THREE.Color(presentation?.acknowledgeColor ?? 0xffffff);
    const duration = presentation?.acknowledgeDuration ?? 0;
    let remaining = 0;
    let declaredState = 'ready';
    let disposed = false;

    const applyStrength = (strength) => {
        for (const target of targets) {
            target.material.emissive.copy(target.baseEmissive).lerp(pulseColor, strength);
            target.material.emissiveIntensity = target.baseIntensity
                + (presentation?.acknowledgeIntensity ?? 0) * strength;
        }
    };

    return {
        type,
        profile,
        registered: false,
        articulation,
        get state() {
            if (declaredState !== 'ready') return declaredState;
            return remaining > 0 ? 'acknowledging' : 'ready';
        },
        setState(next) {
            if (disposed) return false;
            declaredState = String(next || 'ready');
            if (articulation?.set) {
                articulation.set({
                    open: declaredState === 'open',
                    working: declaredState === 'working' || declaredState === 'on'
                });
            }
            return declaredState;
        },
        acknowledge({ toggleArticulation = true } = {}) {
            if (disposed) return false;
            if (toggleArticulation) articulation?.toggle();
            if (duration > 0) {
                remaining = duration;
                applyStrength(0.12);
            }
            return true;
        },
        update(delta = 0) {
            if (disposed) return;
            articulation?.update(delta);
            if (remaining <= 0) return;
            remaining = Math.max(0, remaining - Math.min(Math.max(Number(delta) || 0, 0), 0.1));
            const progress = 1 - remaining / duration;
            applyStrength(Math.sin(progress * Math.PI));
            if (remaining === 0) applyStrength(0);
        },
        dispose() {
            if (disposed) return;
            disposed = true;
            for (const assignment of assignments) assignment.object.material = assignment.original;
            for (const material of clones.values()) material.dispose();
            clones.clear();
        }
    };
}
