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
            if (articulation) return articulation.state;
            return remaining > 0 ? 'acknowledging' : 'ready';
        },
        acknowledge() {
            if (disposed) return false;
            articulation?.toggle();
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
