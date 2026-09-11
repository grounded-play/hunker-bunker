#!/usr/bin/env python3
"""Batch processing script for the 20 newly added Sprint 34 World Art GLBs:
- Decimates geometry to ~1,400 polygons
- Resizes PBR textures to max 192x192 JPEG
- Centers XY and grounds Z
- Exports optimized runtime GLBs to public/3d/runtime/new3ds/ (~80-100 KB each)
- Preserves retail asset budget headroom
"""
import os
import bpy

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SOURCE_DIR = os.path.join(ROOT, 'art', 'source', '3d')
OUTPUT_DIR = os.path.join(ROOT, 'public', '3d', 'runtime', 'new3ds')

os.makedirs(OUTPUT_DIR, exist_ok=True)

TEXTURE_MAX = 192
TARGET_POLY = 1400

GLB_FILES = [
    'arch_bulkhead_frame.glb',
    'arch_deco_archway_grand_01.glb',
    'arch_deco_archway_grand_02.glb',
    'arch_deco_archway_grand_03.glb',
    'arch_deco_archway_grand_04.glb',
    'arch_niche_shrine.glb',
    'arch_pillar_buttress_01.glb',
    'arch_pillar_buttress_02.glb',
    'arch_pillar_buttress_03.glb',
    'arch_pillar_buttress_04.glb',
    'arch_rib_ceiling_vault_01.glb',
    'arch_rib_ceiling_vault_02.glb',
    'arch_rib_ceiling_vault_03.glb',
    'arch_window_stained.glb',
    'fixture_clock_dead.glb',
    'fixture_sconce_vine.glb',
    'state_column_shattered.glb',
    'state_wall_breached_01.glb',
    'state_wall_breached_02.glb',
    'state_wall_breached_03.glb'
]

def clean_scene():
    for obj in list(bpy.context.scene.objects):
        if obj.type in {'CAMERA', 'LIGHT'}:
            bpy.data.objects.remove(obj, do_unlink=True)

def optimize_textures(max_size=TEXTURE_MAX):
    for img in list(bpy.data.images):
        if img.size[0] > max_size or img.size[1] > max_size:
            ratio = min(max_size / img.size[0], max_size / img.size[1])
            new_w = max(1, round(img.size[0] * ratio))
            new_h = max(1, round(img.size[1] * ratio))
            img.scale(new_w, new_h)

def decimate_mesh(mesh_obj, target_poly=TARGET_POLY):
    poly_count = len(mesh_obj.data.polygons)
    if poly_count > target_poly:
        ratio = target_poly / poly_count
        mod = mesh_obj.modifiers.new('Decimate', 'DECIMATE')
        mod.ratio = ratio
        bpy.context.view_layer.objects.active = mesh_obj
        bpy.ops.object.modifier_apply(modifier=mod.name)

def center_and_ground(mesh_obj):
    bpy.context.view_layer.objects.active = mesh_obj
    mesh_obj.select_set(True)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    
    corners = [mesh_obj.matrix_world @ v.co for v in mesh_obj.data.vertices]
    min_x = min(c.x for c in corners)
    max_x = max(c.x for c in corners)
    min_y = min(c.y for c in corners)
    max_y = max(c.y for c in corners)
    min_z = min(c.z for c in corners)
    
    mesh_obj.location.x -= (min_x + max_x) / 2.0
    mesh_obj.location.y -= (min_y + max_y) / 2.0
    mesh_obj.location.z -= min_z
    bpy.ops.object.transform_apply(location=True, rotation=False, scale=False)

def export_glb(filepath):
    bpy.ops.export_scene.gltf(
        filepath=filepath,
        export_format='GLB',
        export_image_format='JPEG',
        export_apply=True,
        export_animations=False,
        export_skins=False,
        export_cameras=False,
        export_lights=False
    )
    size_kb = os.path.getsize(filepath) / 1024
    print(f"  -> Exported {os.path.basename(filepath)} ({size_kb:.1f} KB)")

def process_model(filename):
    src_path = os.path.join(SOURCE_DIR, filename)
    if not os.path.exists(src_path):
        print(f"[SKIP] Missing {src_path}")
        return 0
        
    out_path = os.path.join(OUTPUT_DIR, filename)
    print(f"Processing {filename}...")
    
    bpy.ops.wm.read_factory_settings(use_empty=True)
    clean_scene()
    bpy.ops.import_scene.gltf(filepath=src_path)
    clean_scene()
    
    meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    if not meshes:
        print(f"  [ERROR] No meshes in {filename}")
        return 0
        
    primary = meshes[0]
    if len(meshes) > 1:
        bpy.context.view_layer.objects.active = primary
        for m in meshes:
            m.select_set(True)
        bpy.ops.object.join()
        primary = bpy.context.active_object
        
    optimize_textures(max_size=TEXTURE_MAX)
    decimate_mesh(primary, target_poly=TARGET_POLY)
    center_and_ground(primary)
    export_glb(out_path)
    return os.path.getsize(out_path)

def main():
    total_bytes = 0
    count = 0
    for filename in GLB_FILES:
        bytes_written = process_model(filename)
        total_bytes += bytes_written
        count += 1
        
    print(f"\n[DONE] Optimized {count} GLBs into {OUTPUT_DIR} (Total: {total_bytes / 1024:.1f} KB)")

if __name__ == '__main__':
    main()
