"""Build the 2026-10-08 lived-in prop batch for the runtime.

Raw image-to-3D exports stay in the ignored art/source tree. Runtime GLBs are
decimated to the prompt-sheet budgets, capped at 1024px textures, and stripped
of authoring cameras/lights.

Usage:
    /snap/bin/blender -b -P scripts/blender/ingest_lived_in_props_20261008.py
"""

import os

import bpy


ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SOURCE_DIR = os.path.join(ROOT, 'art', 'source', '3d', 'raw-masters-2026-10-08')
RUNTIME_DIR = os.path.join(ROOT, 'public', '3d', 'runtime', 'new3ds')
MAX_TEXTURE_RES = 1024
WEBP_QUALITY = 92

TRIANGLE_BUDGETS = {
    'life_mess_table': 6000,
    'life_bunk_stack': 7000,
    'life_galley_hotplate': 5000,
    'life_card_table': 6000,
    'life_memorial_board': 5000,
    'life_hydro_rack': 7000,
    'life_water_still': 6000,
    'life_suit_drying_rack': 6000,
    'life_latrine_stall': 5000,
    'life_barrel_heater': 4000,
    'life_route_map_table': 6000,
    'life_reloading_bench': 7000,
    'life_covered_stretcher': 4000,
    'life_pipe_hammock': 5000,
    'life_flood_lamp_tripod': 4000,
    'life_vending_machine': 6000,
    'life_cargo_pallet_netted': 6000,
    'life_footlocker_open': 4000,
    'life_tally_bulkhead': 3000,
    'life_mask_rack': 6000,
    'life_infusion_cradle': 7000,
    'life_sanitation_bidet': 5000,
    'life_sleep_sleeve': 8000,
    'life_pheromone_censer': 6000,
    'life_ammo_ovipositor': 6000,
    'life_sensory_chair': 7000,
    'life_resin_extractor': 6000,
    'life_umbilical_tether': 5000,
    'life_vulval_drain_sump': 4000,
    'life_tactile_console': 6000,
    'life_scent_distiller': 5000,
    'life_bone_clamp_rig': 6000,
    'life_fuel_probe_boom': 7000,
    'life_warmth_hearth': 5000,
    'life_peristaltic_feeder': 5000,
    'life_pelvic_autopsy_trough': 7000,
    'life_acoustic_ear_horn': 5000,
    'life_stigmata_inscriber': 7000,
    'life_lung_filter_bellows': 6000,
    'life_vertebral_restraint_rack': 6000,
}


def triangle_count(obj):
    return sum(max(1, len(polygon.vertices) - 2) for polygon in obj.data.polygons)


def optimize_scene(target_triangles):
    for obj in list(bpy.data.objects):
        if obj.type in ('LIGHT', 'CAMERA'):
            bpy.data.objects.remove(obj, do_unlink=True)

    for image in bpy.data.images:
        width, height = image.size
        if width > MAX_TEXTURE_RES or height > MAX_TEXTURE_RES:
            ratio = min(MAX_TEXTURE_RES / width, MAX_TEXTURE_RES / height)
            image.scale(max(1, round(width * ratio)), max(1, round(height * ratio)))

    meshes = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH']
    before = sum(triangle_count(obj) for obj in meshes)
    if before > target_triangles:
        ratio = target_triangles / before
        for obj in meshes:
            bpy.context.view_layer.objects.active = obj
            modifier = obj.modifiers.new('RuntimeTriangleBudget', 'DECIMATE')
            modifier.ratio = ratio
            bpy.ops.object.modifier_apply(modifier=modifier.name)
    return before, sum(triangle_count(obj) for obj in meshes)


def main():
    os.makedirs(RUNTIME_DIR, exist_ok=True)
    for name, target in TRIANGLE_BUDGETS.items():
        source = os.path.join(SOURCE_DIR, f'{name}.glb')
        destination = os.path.join(RUNTIME_DIR, f'{name}.glb')
        if not os.path.exists(source):
            print(f'[SKIP] missing {source}')
            continue

        bpy.ops.wm.read_factory_settings(use_empty=True)
        bpy.ops.import_scene.gltf(filepath=source)
        before, after = optimize_scene(target)
        bpy.ops.export_scene.gltf(
            filepath=destination,
            export_format='GLB',
            export_apply=True,
            export_animations=False,
            export_cameras=False,
            export_lights=False,
            export_image_format='WEBP',
            export_image_quality=WEBP_QUALITY,
        )
        source_mb = os.path.getsize(source) / 1_000_000
        runtime_mb = os.path.getsize(destination) / 1_000_000
        print(f'[lived-in] {name}: {before} -> {after} tris, {source_mb:.1f} -> {runtime_mb:.2f} MB')


if __name__ == '__main__':
    main()
