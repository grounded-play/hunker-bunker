"""Batch ingest and optimize the 20 raw uploaded props from public/3dprops/
into public/3d/runtime/new3ds/ for runtime use.

- Decimates heavy raw meshes (~50k tris down to ~15k-20k tris).
- Caps embedded textures at 1024x1024.
- Removes cameras and lights.
- Exports game-ready GLBs.

Usage:
    /snap/bin/blender -b -P scripts/blender/ingest_and_optimize_new_props.py
"""

import os
import bpy

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SOURCE_DIR = os.path.join(ROOT, 'public', '3dprops')
if not os.path.exists(SOURCE_DIR):
    SOURCE_DIR = os.path.join(ROOT, 'art', 'raw', 'newartandprops')
RUNTIME_DIR = os.path.join(ROOT, 'public', '3d', 'runtime', 'new3ds')

TARGET_TRIS = 18000
MAX_TEXTURE_RES = 1024

PROPS = [
    'prop_autopsy_dissection_slab.glb',
    'prop_biomech_sphincter_hatch_vent.glb',
    'prop_biomech_spore_umbilical_cable.glb',
    'prop_biomech_tracheal_wall_pipe.glb',
    'prop_ceiling_crane_hoist.glb',
    'prop_coolant_drum_leaking_pool.glb',
    'prop_corporate_saint_reliquary.glb',
    'prop_decon_eyewash_shower_station.glb',
    'prop_exhaust_blower_fan_hood.glb',
    'prop_exosuit_docking_gantry.glb',
    'prop_floor_conduit_bridge.glb',
    'prop_floor_drainage_sump_trough.glb',
    'prop_liturgical_terminal_lectern.glb',
    'prop_maintenance_tool_cart.glb',
    'prop_overhead_cage_fluorescent.glb',
    'prop_oxygen_bottle_cascade_rack.glb',
    'prop_pipe_organ_heat_exchanger.glb',
    'prop_vertebral_cable_riser.glb',
    'prop_votive_candle_shrine.glb',
    'prop_wall_cable_tray_swag.glb',
]


def optimize_scene():
    # 1. Clean out cameras and lights
    for obj in list(bpy.data.objects):
        if obj.type in ('LIGHT', 'CAMERA'):
            bpy.data.objects.remove(obj, do_unlink=True)

    # 2. Downscale textures > MAX_TEXTURE_RES
    for image in bpy.data.images:
        w, h = image.size
        if w > MAX_TEXTURE_RES or h > MAX_TEXTURE_RES:
            scale = min(MAX_TEXTURE_RES / w, MAX_TEXTURE_RES / h)
            new_w = max(1, round(w * scale))
            new_h = max(1, round(h * scale))
            try:
                image.scale(new_w, new_h)
            except Exception as e:
                print(f"Warning: could not resize {image.name}: {e}")

    # 3. Decimate mesh triangles
    for obj in bpy.context.scene.objects:
        if obj.type != 'MESH':
            continue
        bpy.context.view_layer.objects.active = obj
        tri_count = sum(max(1, len(p.vertices) - 2) for p in obj.data.polygons)
        if tri_count > TARGET_TRIS:
            mod = obj.modifiers.new('DecimateBudget', 'DECIMATE')
            mod.ratio = TARGET_TRIS / tri_count
            bpy.ops.object.modifier_apply(modifier=mod.name)
            new_tri_count = sum(max(1, len(p.vertices) - 2) for p in obj.data.polygons)
            print(f"    Mesh {obj.name}: {tri_count} tris -> {new_tri_count} tris")


def process_all():
    os.makedirs(RUNTIME_DIR, exist_ok=True)
    for filename in PROPS:
        src_path = os.path.join(SOURCE_DIR, filename)
        dst_path = os.path.join(RUNTIME_DIR, filename)

        if not os.path.exists(src_path):
            print(f"[SKIP] Source not found: {src_path}")
            continue

        raw_size_mb = os.path.getsize(src_path) / (1024 * 1024)
        print(f"\nProcessing {filename} ({raw_size_mb:.1f} MB)...")

        bpy.ops.wm.read_factory_settings(use_empty=True)
        bpy.ops.import_scene.gltf(filepath=src_path)

        optimize_scene()

        bpy.ops.export_scene.gltf(
            filepath=dst_path,
            export_format='GLB',
            export_apply=True,
            export_animations=True,
            export_cameras=False,
            export_lights=False,
        )

        opt_size_mb = os.path.getsize(dst_path) / (1024 * 1024)
        print(f"-> Exported to {dst_path}: {raw_size_mb:.1f}MB -> {opt_size_mb:.1f}MB "
              f"({((raw_size_mb - opt_size_mb) / raw_size_mb) * 100:.1f}% reduction)")


if __name__ == '__main__':
    process_all()
