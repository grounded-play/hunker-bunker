"""Build the 2026-10-12 world-story mature prop batch (40 props) for runtime.

Raw image-to-3D exports are in art/source/3d/raw-masters-2026-10-12/.
Target triangle budget: 25,000 triangles to preserve organic biomechanical curves
and silhouette detail without faceting. Textures scaled to 2048px (sources may be 4096),
and gltfpack meshopt-compresses the geometry.

Usage:
    /snap/bin/blender -b -P scripts/blender/ingest_world_story_props_20261012.py
"""

import os
import subprocess
import sys

import bpy

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
try:
    from articulation_recipes import apply_articulation
except ImportError:
    apply_articulation = lambda name: []
try:
    from flutter_recipes import apply_flutter
except ImportError:
    apply_flutter = lambda name: []

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SOURCE_DIR = os.path.join(ROOT, 'art', 'source', '3d', 'raw-masters-2026-10-12')
RUNTIME_DIR = os.environ.get('HB_RUNTIME_DIR') or os.path.join(ROOT, 'public', '3d', 'runtime', 'new3ds')
MAX_TEXTURE_RES = 2048
WEBP_QUALITY = 92

PROPS = [
    # Corporate Horizon Atrocities & Governance
    'corp_interrogation_chair',
    'corp_debt_severing_kiosk',
    'corp_dissection_gurney',
    'corp_executive_sarcophagus',
    'corp_incinerator_hopper',
    'corp_suppression_barrier',
    # Meridian Camp & Cyber-Deity Rites
    'meridian_cyber_graft_bench',
    'meridian_mainframe_altar',
    'meridian_capacitor_bomb',
    'meridian_servitor_dock',
    # Tallow Camp & Spore Gestation
    'tallow_compost_fermenter',
    'tallow_spore_cradle',
    'tallow_flesh_trellis',
    'tallow_sacrificial_altar',
    # Vesper Iron Guild & Frontline Butchery
    'vesper_amputation_rig',
    'vesper_autocannon_bipod',
    'vesper_hanging_cage',
    'vesper_reloading_station',
    # Mayor Tina's Infiltration & Metamorphosis
    'tina_molted_carapace',
    'tina_covert_nursery_chest',
    'tina_mimic_vanity',
    'tina_trophy_trove',
    # The PregAlien Hive & Visceral Assimilation
    'hive_visceral_ovipositor',
    'hive_vivisected_engineer',
    'hive_gestation_sac',
    'hive_pulmonary_bellows',
    'hive_amniotic_feeder_trough',
    'hive_sphincter_iris',
    # Cryo District: Hypothermic Brutality
    'cryo_ruptured_pod',
    'cryo_cannibal_butchery_table',
    'cryo_ice_core_specimen',
    'cryo_thawing_trough',
    'cryo_frozen_shelter_pod',
    # The Chasm Void & Final Drops
    'chasm_hanging_elevator',
    'chasm_suicide_ledge_cross',
    'chasm_dredge_hook_crane',
    # Industrial Meat & Crash Debris
    'ind_biomass_grinder',
    'ind_hydraulic_manifold',
    'ind_fuel_rod_cask',
    'crash_cockpit_canopy',
]

TRIANGLE_BUDGET = 25000


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
    for name in PROPS:
        if only and name not in only:
            continue
        source = os.path.join(SOURCE_DIR, f'{name}.glb')
        destination = os.path.join(RUNTIME_DIR, f'{name}.glb')
        if not os.path.exists(source):
            print(f'[SKIP] missing {source}')
            continue

        bpy.ops.wm.read_factory_settings(use_empty=True)
        bpy.ops.import_scene.gltf(filepath=source)
        before, after = optimize_scene(TRIANGLE_BUDGET)
        for line in apply_articulation(name):
            print(f'[world-story] {name} {line}')
        flutter_lines = list(apply_flutter(name))
        for line in flutter_lines:
            print(f'[world-story] {name} {line}')
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
        print(f'[world-story] {name}: {before} -> {after} tris, {source_mb:.1f} -> {runtime_mb:.2f} MB')


if __name__ == '__main__':
    main()
