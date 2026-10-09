"""Build the 2026-10-09 lived-in prop batch (props 41-80) for the runtime.

Prop 80, the smouldering hull shard, was not in the upload.
Raw image-to-3D exports stay in the ignored art/source tree. Unlike the
2026-10-08 batch, these keep their detail: cutting the 50k-triangle exports to
the 3k-14k prompt-sheet budgets faceted every organic curve, while 25k is
indistinguishable from the source. Textures stay at 2048px (sources are 4096),
and gltfpack meshopt-compresses the geometry so the files stay small.

Usage:
    /snap/bin/blender -b -P scripts/blender/ingest_lived_in_props_20261009.py
    HB_PROPS=life_pew_segment,life_ore_cart /snap/bin/blender -b -P ...
"""

import os
import subprocess
import sys

import bpy

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from articulation_recipes import apply_articulation  # noqa: E402


ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SOURCE_DIR = os.path.join(ROOT, 'art', 'source', '3d', 'raw-masters-2026-10-09')
RUNTIME_DIR = os.environ.get('HB_RUNTIME_DIR') or os.path.join(ROOT, 'public', '3d', 'runtime', 'new3ds')
MAX_TEXTURE_RES = 2048
WEBP_QUALITY = 92

TRIANGLE_BUDGETS = {
    'life_cochlear_intercom': 25000,
    'life_ceiling_collapse': 25000,
    'life_ribcage_rescue_cabinet': 25000,
    'life_checkpoint_post': 25000,
    'life_pneumatic_tube_node': 25000,
    'life_janitor_cart': 25000,
    'life_wayfinding_totem': 25000,
    'life_dropped_kit_pile': 25000,
    'life_seismic_drill': 25000,
    'life_supply_drop_pod': 25000,
    'life_colossal_limb': 25000,
    'life_wind_mast': 25000,
    'life_guide_rope_stakes': 25000,
    'life_fallen_comm_dish': 25000,
    'life_tarp_leanto': 25000,
    'life_pipeline_trestle': 25000,
    'life_ice_sled': 25000,
    'life_ice_core_rack': 25000,
    'life_ice_bore_winch': 25000,
    'life_parka_hooks': 25000,
    'life_brood_comb': 25000,
    'life_hive_dew_funnel': 25000,
    'life_hive_feeding_bladder': 25000,
    'life_assimilated_desk': 25000,
    'life_fungal_cable_bundle': 25000,
    'life_ore_cart': 25000,
    'life_drip_buckets': 25000,
    'life_rope_anchor_post': 25000,
    'life_confessional': 25000,
    'life_devotion_tree': 25000,
    'life_pew_segment': 25000,
    'life_barber_chair': 25000,
    'life_meat_smoking_rack': 25000,
    'life_training_dummy': 25000,
    'life_lookout_perch': 25000,
    'life_welding_station': 25000,
    'life_exosuit_teardown': 25000,
    'life_fuse_bypass_panel': 25000,
    'life_pod_seat_row': 25000,
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
    # A 1.5M-triangle export collapsed straight to a few thousand tears open,
    # so very dense sources step down through 50k first.
    for step_target in (50_000, target_triangles):
        current = sum(triangle_count(obj) for obj in meshes)
        if current <= step_target or step_target >= before:
            continue
        ratio = step_target / current
        for obj in meshes:
            bpy.context.view_layer.objects.active = obj
            modifier = obj.modifiers.new('RuntimeTriangleBudget', 'DECIMATE')
            modifier.ratio = ratio
            bpy.ops.object.modifier_apply(modifier=modifier.name)
    return before, sum(triangle_count(obj) for obj in meshes)


def meshopt_compress(path):
    """EXT_meshopt_compression on the geometry; textures pass through as-is."""
    packed = path + '.packed.glb'
    # -kn/-ke keep the HB_* part nodes and their motion extras.
    subprocess.run(['npx', '-y', 'gltfpack@1.3', '-i', path, '-o', packed, '-c', '-kn', '-km', '-ke', '-noq'],
                   check=True, cwd=ROOT, stdout=subprocess.DEVNULL)
    os.replace(packed, path)


def main():
    os.makedirs(RUNTIME_DIR, exist_ok=True)
    only = {name for name in os.environ.get('HB_PROPS', '').split(',') if name}
    for name, target in TRIANGLE_BUDGETS.items():
        if only and name not in only:
            continue
        source = os.path.join(SOURCE_DIR, f'{name}.glb')
        destination = os.path.join(RUNTIME_DIR, f'{name}.glb')
        if not os.path.exists(source):
            print(f'[SKIP] missing {source}')
            continue

        bpy.ops.wm.read_factory_settings(use_empty=True)
        bpy.ops.import_scene.gltf(filepath=source)
        before, after = optimize_scene(target)
        for line in apply_articulation(name):
            print(f'[lived-in 2] {name} {line}')
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
        print(f'[lived-in 2] {name}: {before} -> {after} tris, {source_mb:.1f} -> {runtime_mb:.2f} MB')


if __name__ == '__main__':
    main()
