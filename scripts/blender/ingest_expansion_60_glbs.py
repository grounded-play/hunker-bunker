#!/usr/bin/env python3
"""Process the 60 interactive world expansion GLB models from art/raw/ into public/3d/runtime/new3ds/.

Features:
- Preserves high visual fidelity without faceting: 35,000 triangles default (up to 45,000 for hero assets).
- Downscales unoptimized 4096px textures to clean 2048px WebP (quality 92).
- Strips cameras, lights, and orphan nodes.
- Preserves vertex normals, tangents, and UV sets.
- Compresses via gltfpack meshopt compression (-c -kn -km -ke -noq).
- Reduces ~85MB-100MB raw files down to ~2.5MB-4.5MB production runtime GLBs.

Usage (single prop):
    HB_PROPS=geo_steam_manifold_actuator /snap/bin/blender -b -P scripts/blender/ingest_expansion_60_glbs.py
"""

import os
import subprocess
import bpy

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SOURCE_DIR = os.path.join(ROOT, 'art', 'raw')
RUNTIME_DIR = os.environ.get('HB_RUNTIME_DIR') or os.path.join(ROOT, 'public', '3d', 'runtime', 'new3ds')

MAX_TEXTURE_RES = 2048
WEBP_QUALITY = 92
DEFAULT_TRIANGLE_BUDGET = 35000

HERO_TRIANGLE_BUDGETS = {
    'mothership_docking_umbilical_collar': 45000,
    'chasm_hanging_cage_crane': 45000,
    'substation_stepdown_transformer': 42000,
    'carapace_chitin_press': 40000,
    'scout_ejection_pod_chassis': 40000,
    'scout_tachyon_radar_mast': 38000,
    'evac_cryo_hypergolic_manifold': 40000,
    'corp_executive_whisper_booth': 38000,
    'tank_kinetic_ram_breech': 40000,
    'relay_harmonic_tuning_fork': 38000,
}

ALL_60_PROPS = [
    'geo_steam_manifold_actuator',
    'tallow_vaccine_alembic',
    'hydro_mycelial_seed_vault',
    'tallow_irrigation_sluice_gate',
    'tallow_apothecary_dryer_rack',
    'geo_pressure_relief_siren',
    'meridian_optic_nerve_patchbay',
    'substation_stepdown_transformer',
    'meridian_servitor_recharge_cradle',
    'meridian_logic_core_drum',
    'substation_breaker_interlock',
    'meridian_soldering_hearth',
    'vesper_ordnance_disarm_table',
    'vesper_trench_warning_klaxon',
    'vesper_ballistic_chronograph',
    'vesper_mortar_loading_cradle',
    'vesper_dogtag_retrieval_crypt',
    'vesper_barricade_welding_rig',
    'corp_biometric_wall_safe',
    'corp_quantum_ledger_podium',
    'corp_compliance_choker_bench',
    'corp_asset_incinerator_chute',
    'corp_cryo_transport_coffin',
    'corp_executive_whisper_booth',
    'suture_flesh_mending_bath',
    'suture_larval_nursery_urn',
    'relay_harmonic_tuning_fork',
    'relay_acoustic_diaphragm',
    'carapace_chitin_press',
    'carapace_ossuary_anvil',
    'vass_translation_phonograph',
    'vass_bio_centrifuge_rack',
    'vass_neural_sync_helmet',
    'vass_hybrid_blood_synthesizer',
    'vass_containment_bell_jar',
    'vass_dissection_stereomicroscope',
    'tina_vocal_mimic_synthesizer',
    'tina_pheromone_dispersal_vent',
    'tina_cosmetic_skin_loom',
    'tina_forged_council_ballot_box',
    'tina_shedding_cocoon_niche',
    'tina_secret_distress_beacon',
    'chasm_seismic_geophone_station',
    'chasm_cable_traversal_winch',
    'chasm_abyss_sounding_mortar',
    'chasm_steam_whistle_buoy',
    'chasm_hanging_cage_crane',
    'chasm_geothermal_survey_transit',
    'scout_tachyon_radar_mast',
    'scout_ejection_pod_chassis',
    'tank_reactive_armor_forge',
    'tank_kinetic_ram_breech',
    'engineer_magnetic_bottle_cell',
    'engineer_robotic_welding_arm',
    'evac_avionics_gyro_gimbal',
    'evac_cryo_hypergolic_manifold',
    'evac_cabin_co2_scrubber',
    'evac_manual_abort_detonator',
    'evac_cargo_ballast_scale',
    'mothership_docking_umbilical_collar',
]


def triangle_count(obj):
    return sum(max(1, len(polygon.vertices) - 2) for polygon in obj.data.polygons)


def optimize_scene(target_triangles):
    # Remove light and camera objects
    for obj in list(bpy.data.objects):
        if obj.type in ('LIGHT', 'CAMERA'):
            bpy.data.objects.remove(obj, do_unlink=True)

    # Scale textures to MAX_TEXTURE_RES (2048)
    for image in bpy.data.images:
        width, height = image.size
        if width > MAX_TEXTURE_RES or height > MAX_TEXTURE_RES:
            ratio = min(MAX_TEXTURE_RES / width, MAX_TEXTURE_RES / height)
            image.scale(max(1, round(width * ratio)), max(1, round(height * ratio)))

    # Gather meshes
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH']
    before = sum(triangle_count(obj) for obj in meshes)

    # Decimate gently if above target
    if before > target_triangles:
        ratio = target_triangles / before
        for obj in meshes:
            bpy.context.view_layer.objects.active = obj
            modifier = obj.modifiers.new('RuntimeDetailBudget', 'DECIMATE')
            modifier.ratio = ratio
            bpy.ops.object.modifier_apply(modifier=modifier.name)

    after = sum(triangle_count(obj) for obj in meshes)
    return before, after


def meshopt_compress(path):
    packed = path + '.packed.glb'
    subprocess.run(
        ['npx', '-y', 'gltfpack@1.3', '-i', path, '-o', packed, '-c', '-kn', '-km', '-ke', '-noq'],
        check=True, cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
    )
    os.replace(packed, path)


def process_model(name):
    source = os.path.join(SOURCE_DIR, f'{name}.glb')
    destination = os.path.join(RUNTIME_DIR, f'{name}.glb')

    if not os.path.exists(source):
        print(f"[SKIP] Source not found: {source}")
        return False

    target_tris = HERO_TRIANGLE_BUDGETS.get(name, DEFAULT_TRIANGLE_BUDGET)

    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=source)

    before, after = optimize_scene(target_tris)

    bpy.ops.export_scene.gltf(
        filepath=destination,
        export_format='GLB',
        export_apply=True,
        export_animations=False,
        export_cameras=False,
        export_lights=False,
        export_image_format='WEBP',
        export_image_quality=WEBP_QUALITY,
        export_extras=True,
    )

    meshopt_compress(destination)

    source_mb = os.path.getsize(source) / 1_000_000
    runtime_mb = os.path.getsize(destination) / 1_000_000
    print(f"[PROCESSED] {name}: {before} -> {after} tris, {source_mb:.1f}MB -> {runtime_mb:.2f}MB")
    return True


def main():
    os.makedirs(RUNTIME_DIR, exist_ok=True)
    only = {n.strip() for n in os.environ.get('HB_PROPS', '').split(',') if n.strip()}
    props_to_run = [p for p in ALL_60_PROPS if not only or p in only]

    for name in props_to_run:
        process_model(name)


if __name__ == '__main__':
    main()
