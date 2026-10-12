"""Build the 2026-10-12 world-story pass 2 prop batch (19 props) for runtime.

Raw image-to-3D exports are in art/source/3d/raw-masters-2026-10-12-pass2/.
Target triangle budget: 25,000 triangles to preserve organic biomechanical curves
and silhouette detail without faceting. Textures scaled to 2048px,
and gltfpack meshopt-compresses the geometry.

Usage:
    /snap/bin/blender -b -P scripts/blender/ingest_world_story_props_pass2.py
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
SOURCE_DIR = os.path.join(ROOT, 'art', 'source', '3d', 'raw-masters-2026-10-12-pass2')
RUNTIME_DIR = os.environ.get('HB_RUNTIME_DIR') or os.path.join(ROOT, 'public', '3d', 'runtime', 'new3ds')
MAX_TEXTURE_RES = 2048
WEBP_QUALITY = 92

PROPS = [
    'bay_c_pod_312_rupture',
    'carapace_sentry_chrysalis',
    'chen_sealed_confession_console',
    'corp_biometric_collar_chute',
    'crawler_signal_antenna_rig',
    'decon_exosuit_scrubber_station',
    'engineer_wave_relay_dynamo',
    'evac_four_seat_cockpit_module',
    'evac_manifest_allocation_terminal',
    'evac_preflight_fuel_umbilical',
    'queen_royal_brood_throne',
    'relay_false_beacon_spire',
    'royal_egg_clutch_caul',
    'scout_tracking_beacon_core',
    'sector_zero_bore_drillhead',
    'suture_mercy_cocoon_canopy',
    'tank_orbital_siege_cannon',
    'vass_acoustic_resonator_tank',
    'vass_hybrid_embryo_incubator',
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
            print(f'[world-story-pass2] {name} {line}')
        flutter_lines = list(apply_flutter(name))
        for line in flutter_lines:
            print(f'[world-story-pass2] {name} {line}')
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
        print(f'[world-story-pass2] {name}: {before} -> {after} tris, {source_mb:.1f} -> {runtime_mb:.2f} MB')


if __name__ == '__main__':
    main()
