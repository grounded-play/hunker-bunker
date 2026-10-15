import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import fs from 'node:fs';
import { createPropArticulation } from './propArticulation.js';
import {
    createPropExperience,
    getPropExperienceProfile,
    isEnvironmentExperienceType
} from './propExperience.js';
import { WORLD_3D_MODELS } from './world3dOverlay.js';
import { DRESSING_TRIANGLES } from './data/dressingTriangles.js';
import { PROP_SOCKET_REGISTRY } from './data/propSockets.js';
import { getBaseModuleDefinition } from './data/baseModules.js';
import { ICE_BARRIER_STAGE_MODELS, resolveIceBarrierModel } from './iceGateSystem.js';
import { FIELD_WEAPON_DROP_CATALOG } from './fieldWeaponDrops.js';
import { getPropFxProfile } from './propFx.js';
import { PROP_INTERACTION_SPECS } from './propInteractions.js';

const COHORT_20261012_TYPES = Object.freeze([
    'barrier_ice_fractured',
    'barrier_ice_intact',
    'barrier_ice_melting',
    'base_cot_installed',
    'base_door_sealable_bulkhead',
    'base_o2_atmospheric_regulator',
    'base_o2_overhead_duct',
    'base_power_junction_box',
    'carry_field_cot_folded',
    'door_arch_guillotine_assembled',
    'door_arch_guillotine_frame',
    'door_arch_guillotine_slab',
    'ship_module_comms_transceiver',
    'ship_module_engine_manifold',
    'ship_module_life_support_core',
    'ship_module_navigation_core',
    'wall_macro_buttress_3',
    'wall_macro_straight_4',
    'weapon_flamethrower_case',
    'weapon_flamethrower_m70',
    'weapon_fuel_canister_heavy'
]);

function parseGltf(type) {
    const filePath = `public/3d/runtime/new3ds/${type}.glb`;
    const buffer = fs.readFileSync(filePath);
    expect(buffer.readUInt32LE(0)).toBe(0x46546c67); // glTF binary magic
    const jsonLength = buffer.readUInt32LE(12);
    return JSON.parse(buffer.subarray(20, 20 + jsonLength).toString('utf8'));
}

const parseGltfNodes = (type) => parseGltf(type).nodes ?? [];

function triangleCount(json) {
    return (json.meshes ?? []).reduce((total, mesh) => total + (mesh.primitives ?? []).reduce((meshTotal, primitive) => {
        if ((primitive.mode ?? 4) !== 4) return meshTotal;
        const accessorIndex = primitive.indices ?? primitive.attributes?.POSITION;
        return meshTotal + Math.floor((json.accessors?.[accessorIndex]?.count ?? 0) / 3);
    }, 0), 0);
}

describe('2026-10-12 Asset Cohort — GLB runtime files', () => {
    it('ships all 21 models with compact optimized sizes (< 5MB each)', () => {
        for (const type of COHORT_20261012_TYPES) {
            const filePath = `public/3d/runtime/new3ds/${type}.glb`;
            expect(fs.existsSync(filePath), `file missing: ${filePath}`).toBe(true);
            const stats = fs.statSync(filePath);
            expect(stats.size).toBeGreaterThan(100_000);
            expect(stats.size).toBeLessThan(5_000_000); // 95MB -> ~2MB
        }
    });

    it('keeps actual packed geometry and textures inside the declared runtime contract', () => {
        for (const type of COHORT_20261012_TYPES) {
            const json = parseGltf(type);
            expect(triangleCount(json), `actual triangles: ${type}`).toBe(DRESSING_TRIANGLES[type]);
            expect(json.extensionsRequired, `meshopt: ${type}`).toContain('EXT_meshopt_compression');
            expect(json.extensionsRequired, `WebP: ${type}`).toContain('EXT_texture_webp');
            for (const image of json.images ?? []) expect(image.mimeType, `${type} image`).toBe('image/webp');
        }
    });

    it('retains source and connection anchors through mesh optimization', () => {
        const required = {
            base_o2_atmospheric_regulator: ['FX_GLOW_00', 'FX_LIGHT_00', 'socket_duct_out', 'socket_power_in'],
            base_power_junction_box: ['FX_GLOW_00', 'FX_LIGHT_00', 'socket_power_in', 'socket_power_out'],
            wall_macro_straight_4: ['FX_LIGHT_00', 'socket_tray_in', 'socket_tray_out'],
            weapon_flamethrower_m70: ['FX_FLAME_00', 'FX_GLOW_00'],
            barrier_ice_melting: ['FX_GLOW_00', 'FX_WATER_SURFACE']
        };
        for (const [type, names] of Object.entries(required)) {
            const actual = new Set(parseGltfNodes(type).map((node) => node.name));
            for (const name of names) expect(actual.has(name), `${type}: ${name}`).toBe(true);
        }
    });

    it('ships moving parts with HB_* node hierarchy and motion metadata', () => {
        // 1. Bulkhead door vertical slide into ground
        const doorNodes = parseGltfNodes('base_door_sealable_bulkhead');
        const doorPart = doorNodes.find((n) => n.name === 'HB_DOOR_00');
        expect(doorPart).toBeDefined();
        expect(doorPart.extras?.hb_motion).toBe('slide');
        expect(doorPart.extras?.hb_open_offset?.[1]).toBeCloseTo(-1.4);

        // 2. Guillotine vertical slide lift
        const guilNodes = parseGltfNodes('door_arch_guillotine_assembled');
        const guilDoor = guilNodes.find((n) => n.name === 'HB_DOOR_00');
        expect(guilDoor).toBeDefined();
        expect(guilDoor.extras?.hb_motion).toBe('slide');
        expect(guilDoor.extras?.hb_open_offset?.[1]).toBeCloseTo(2.4);

        // 3. Flamethrower case flip lid
        const caseNodes = parseGltfNodes('weapon_flamethrower_case');
        const lidPart = caseNodes.find((n) => n.name === 'HB_LID_00');
        expect(lidPart).toBeDefined();
        expect(lidPart.extras?.hb_motion).toBe('hinge');
        expect(lidPart.extras?.hb_open_angle).toBeCloseTo(Math.PI / 2);

        // 4. Navigation core gyro rotor
        const navNodes = parseGltfNodes('ship_module_navigation_core');
        const navRotor = navNodes.find((n) => n.name === 'HB_ROTOR_00');
        expect(navRotor).toBeDefined();
        expect(navRotor.extras?.hb_motion).toBe('spin');
        expect(navRotor.extras?.hb_speed).toBeCloseTo(1.5);

        // 5. Comms transceiver scanning dish
        const commsNodes = parseGltfNodes('ship_module_comms_transceiver');
        const commsRotor = commsNodes.find((n) => n.name === 'HB_ROTOR_00');
        expect(commsRotor).toBeDefined();
        expect(commsRotor.extras?.hb_motion).toBe('spin');
        expect(commsRotor.extras?.hb_speed).toBeCloseTo(0.4);
    });
});

describe('2026-10-12 Asset Cohort — Prop Experience & Articulation', () => {
    it('classifies all 21 models into environment experience system', () => {
        for (const type of COHORT_20261012_TYPES) {
            expect(isEnvironmentExperienceType(type), `experience type: ${type}`).toBe(true);
            const profile = getPropExperienceProfile(type);
            expect(profile, `profile: ${type}`).not.toBeNull();
            expect(profile.behaviors.length).toBeGreaterThan(0);
        }
    });

    it('articulates bulkhead door and guillotine in runtime controller', () => {
        const model = new THREE.Group();
        const door = new THREE.Mesh();
        door.name = 'HB_DOOR_00';
        door.userData = {
            hb_motion: 'hinge',
            hb_axis: [0, 1, 0],
            hb_open_angle: -Math.PI / 2,
            hb_open_offset: [0, 0, 0],
            hb_duration: 1.1
        };
        model.add(door);

        const articulation = createPropArticulation(model);
        expect(articulation).not.toBeNull();
        expect(articulation.state).toBe('closed');

        articulation.toggle();
        expect(articulation.state).toBe('opening');
        while (articulation.update(0.1));
        expect(articulation.state).toBe('open');

        articulation.toggle();
        while (articulation.update(0.1));
        expect(articulation.state).toBe('closed');
    });

    it('creates interactive prop experience with acknowledge and toggle', () => {
        const root = new THREE.Group();
        const model = new THREE.Group();
        const sharedMat = new THREE.MeshStandardMaterial({
            color: 0x111111,
            emissive: new THREE.Color(0x000000),
            emissiveIntensity: 0
        });
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), sharedMat);
        mesh.userData = {
            hb_motion: 'hinge',
            hb_axis: [0, 1, 0],
            hb_open_angle: -Math.PI / 2,
            hb_duration: 0.5
        };
        model.add(mesh);
        root.add(model);

        const exp = createPropExperience(root, model, 'base_door_sealable_bulkhead');
        expect(exp).not.toBeNull();
        expect(exp.articulation).toBeDefined();

        exp.acknowledge();
        expect(exp.state).toBe('acknowledging');
        expect(exp.articulation.open).toBe(true);

        for (let i = 0; i < 6; i += 1) exp.update(0.1);
        expect(exp.state).toBe('ready');
        exp.dispose();
    });
});

describe('2026-10-12 Asset Cohort — Subsystem Registrations', () => {
    it('registers all 21 models in WORLD_3D_MODELS with physical bounds', () => {
        for (const type of COHORT_20261012_TYPES) {
            const config = WORLD_3D_MODELS[type];
            expect(config, `config for ${type}`).toBeDefined();
            expect(config.url).toBe(`/3d/runtime/new3ds/${type}.glb`);
            expect(config.height).toBeGreaterThan(0);
            expect(config.span ?? config.maxSpan ?? config.height).toBeGreaterThan(0);
        }
    });

    it('registers polygon counts in DRESSING_TRIANGLES within strict budget (< 35k)', () => {
        for (const type of COHORT_20261012_TYPES) {
            const triCount = DRESSING_TRIANGLES[type];
            expect(triCount, `triangles for ${type}`).toBeDefined();
            expect(triCount).toBeGreaterThan(5_000);
            expect(triCount).toBeLessThanOrEqual(35_000);
        }
    });

    it('registers operational sockets in PROP_SOCKETS', () => {
        expect(PROP_SOCKET_REGISTRY.base_power_junction_box).toBeDefined();
        expect(PROP_SOCKET_REGISTRY.base_power_junction_box.map((s) => s.id)).toEqual(['power_in', 'power_out']);

        expect(PROP_SOCKET_REGISTRY.base_o2_atmospheric_regulator).toBeDefined();
        expect(PROP_SOCKET_REGISTRY.base_o2_overhead_duct).toBeDefined();
        expect(PROP_SOCKET_REGISTRY.ship_module_engine_manifold).toBeDefined();
        expect(PROP_SOCKET_REGISTRY.wall_macro_straight_4).toBeDefined();
    });

    it('binds modeled practical lights and bespoke machine actions', () => {
        for (const type of [
            'base_door_sealable_bulkhead', 'door_arch_guillotine_assembled',
            'base_o2_atmospheric_regulator', 'base_power_junction_box',
            'ship_module_navigation_core', 'ship_module_comms_transceiver',
            'ship_module_engine_manifold', 'ship_module_life_support_core'
        ]) {
            expect(getPropFxProfile(type), `FX profile: ${type}`).toBeDefined();
            expect(PROP_INTERACTION_SPECS[type], `interaction: ${type}`).toBeDefined();
        }
        expect(getPropFxProfile('base_power_junction_box').light.anchor).toBe('FX_LIGHT_00');
        expect(getPropFxProfile('door_arch_guillotine_frame').light.color).toBe(0xff4433);
        expect(getPropFxProfile('base_o2_atmospheric_regulator').light.color).toBe(0x38bdf8);
    });

    it('binds modelType and carryModelType to base rebuild modules', () => {
        expect(getBaseModuleDefinition('sealable_door_1x1')?.modelType).toBe('base_door_sealable_bulkhead');
        expect(getBaseModuleDefinition('cot_bed')?.modelType).toBe('base_cot_installed');
        expect(getBaseModuleDefinition('cot_bed')?.carryModelType).toBe('carry_field_cot_folded');
        expect(getBaseModuleDefinition('o2_regulator')?.modelType).toBe('base_o2_atmospheric_regulator');
        expect(getBaseModuleDefinition('o2_duct')?.modelType).toBe('base_o2_overhead_duct');
        expect(getBaseModuleDefinition('power_junction')?.modelType).toBe('base_power_junction_box');

        expect(getBaseModuleDefinition('ship_navigation_core')?.modelType).toBe('ship_module_navigation_core');
        expect(getBaseModuleDefinition('ship_navigation_core')?.carryModelType).toBe('ship_module_navigation_core');
    });

    it('resolves ice barrier models from the authoritative heat state', () => {
        expect(ICE_BARRIER_STAGE_MODELS.frozen).toBe('barrier_ice_intact');
        expect(ICE_BARRIER_STAGE_MODELS.fractured).toBe('barrier_ice_fractured');
        expect(ICE_BARRIER_STAGE_MODELS.melting).toBe('barrier_ice_melting');

        expect(resolveIceBarrierModel({ state: 'frozen' })).toBe('barrier_ice_intact');
        expect(resolveIceBarrierModel({ state: 'fractured' })).toBe('barrier_ice_fractured');
        expect(resolveIceBarrierModel({ state: 'melting' })).toBe('barrier_ice_melting');
        expect(resolveIceBarrierModel({ state: 'melted' })).toBeNull();
    });

    it('binds heavy flamethrower drop models', () => {
        const ft = FIELD_WEAPON_DROP_CATALOG.flamethrower;
        expect(ft).toBeDefined();
        expect(ft.modelType).toBe('weapon_flamethrower_m70');
        expect(ft.caseModelType).toBe('weapon_flamethrower_case');
        expect(ft.ammoModelType).toBe('weapon_fuel_canister_heavy');
    });
});
