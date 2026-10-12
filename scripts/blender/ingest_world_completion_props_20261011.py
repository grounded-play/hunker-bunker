"""Build the 2026-10-11 world-completion prop batch (39 props) for the runtime.

Raw image-to-3D exports stay in art/source/3d/raw-masters-2026-10-11/.
Target triangle budget: 25,000 triangles to preserve organic biomechanical curves
and silhouette detail without faceting. Textures scaled to 2048px (sources may be 4096),
and gltfpack meshopt-compresses the geometry.

Usage:
    /snap/bin/blender -b -P scripts/blender/ingest_world_completion_props_20261011.py
    HB_PROPS=life_cistern_tank,camp_water_barrel /snap/bin/blender -b -P scripts/blender/ingest_world_completion_props_20261011.py
"""

import os
import subprocess
import sys

import bpy

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from articulation_recipes import apply_articulation  # noqa: E402
from flutter_recipes import apply_flutter  # noqa: E402


ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SOURCE_DIR = os.path.join(ROOT, 'art', 'source', '3d', 'raw-masters-2026-10-11')
RUNTIME_DIR = os.environ.get('HB_RUNTIME_DIR') or os.path.join(ROOT, 'public', '3d', 'runtime', 'new3ds')
MAX_TEXTURE_RES = 2048
WEBP_QUALITY = 92

TRIANGLE_BUDGETS = {
    'camp_canvas_tent': 25000,
    'camp_water_barrel': 25000,
    'chasm_beacon_post': 25000,
    'chasm_broken_catwalk': 25000,
    'chasm_gondola': 25000,
    'chasm_rappel_anchor': 25000,
    'crash_drag_chute': 25000,
    'crash_engine_nacelle': 25000,
    'crash_hull_panels': 25000,
    'cryo_frozen_cascade': 25000,
    'cryo_heater_station': 25000,
    'cryo_ice_blocks': 25000,
    'cryo_ice_crawler': 25000,
    'cryo_snowbound_crates': 25000,
    'hive_assimilated_generator': 25000,
    'hive_brood_dome': 25000,
    'hive_cocooned_crew': 25000,
    'hive_pheromone_node': 25000,
    'hive_resin_pillar': 25000,
    'hive_tendril_arch': 25000,
    'life_algae_tank': 25000,
    'life_arcade_cabinet': 25000,
    'life_cistern_tank': 25000,
    'life_conveyor_section': 25000,
    'life_filing_cabinets': 25000,
    'life_fire_station': 25000,
    'life_forklift': 25000,
    'life_laundry_machines': 25000,
    'life_overseer_desk': 25000,
    'life_pallet_racking': 25000,
    'life_planning_board': 25000,
    'life_scaffold_tower': 25000,
    'life_server_racks': 25000,
    'life_shower_stall': 25000,
    'life_sink_row': 25000,
    'life_surgical_lamp': 25000,
    'life_transformer_bank': 25000,
    'life_weight_bench': 25000,
    'salvage_tagged_heap': 25000,
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
    packed = path + '.packed.glb'
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
            print(f'[world-completion] {name} {line}')
        flutter_lines = list(apply_flutter(name))
        for line in flutter_lines:
            print(f'[world-completion] {name} {line}')
        color_export = {'export_vertex_color': 'ACTIVE'} if any(o.name.startswith('HB_FLUTTER') for o in bpy.data.objects) else {}
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
            **color_export,
        )
        meshopt_compress(destination)
        source_mb = os.path.getsize(source) / 1_000_000
        runtime_mb = os.path.getsize(destination) / 1_000_000
        print(f'[world-completion] {name}: {before} -> {after} tris, {source_mb:.1f} -> {runtime_mb:.2f} MB')


if __name__ == '__main__':
    main()
