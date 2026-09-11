#!/usr/bin/env python3
"""Batch processing script for Sprint 34 GLBs in Blender:
- Decimates geometry and resizes PBR textures to fit within the retail payload budget
- Rigs operator skins to the official Scout/Mixamo skeleton in T-pose
- Centers and aligns weapons, charms, modules, and world props
- Exports runtime GLB assets to public/3d/runtime/new3ds/
"""
import os
import bpy

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SOURCE_DIR = os.path.join(ROOT, 'art', 'source', '3d', 'sprint34-raw')
OUTPUT_DIR = os.path.join(ROOT, 'public', '3d', 'runtime', 'new3ds')
SCOUT_GLB = os.path.join(ROOT, 'public', '3d', 'scouting-scout', 'Scout.game.glb')

os.makedirs(OUTPUT_DIR, exist_ok=True)

TEXTURE_MAX = 256

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

def decimate_mesh(mesh_obj, target_poly=3500):
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

def center_pivot(mesh_obj):
    bpy.context.view_layer.objects.active = mesh_obj
    mesh_obj.select_set(True)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    
    corners = [mesh_obj.matrix_world @ v.co for v in mesh_obj.data.vertices]
    min_x = min(c.x for c in corners)
    max_x = max(c.x for c in corners)
    min_y = min(c.y for c in corners)
    max_y = max(c.y for c in corners)
    min_z = min(c.z for c in corners)
    max_z = max(c.z for c in corners)
    
    mesh_obj.location.x -= (min_x + max_x) / 2.0
    mesh_obj.location.y -= (min_y + max_y) / 2.0
    mesh_obj.location.z -= (min_z + max_z) / 2.0
    bpy.ops.object.transform_apply(location=True, rotation=False, scale=False)

def export_glb(filepath, has_armature=False):
    bpy.ops.export_scene.gltf(
        filepath=filepath,
        export_format='GLB',
        export_image_format='JPEG',
        export_apply=not has_armature,
        export_animations=False,
        export_skins=has_armature,
        export_cameras=False,
        export_lights=False
    )
    size_kb = os.path.getsize(filepath) / 1024
    print(f"  -> Exported {os.path.basename(filepath)} ({size_kb:.1f} KB)")

def process_static_asset(src_filename, out_filename, target_poly=3000, pivot_mode='ground'):
    src_path = os.path.join(SOURCE_DIR, src_filename)
    if not os.path.exists(src_path):
        print(f"[SKIP] Missing {src_path}")
        return
        
    out_path = os.path.join(OUTPUT_DIR, out_filename)
    print(f"Processing static {src_filename} -> {out_filename}...")
    
    bpy.ops.wm.read_factory_settings(use_empty=True)
    clean_scene()
    bpy.ops.import_scene.gltf(filepath=src_path)
    clean_scene()
    
    meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    if not meshes:
        print(f"  [ERROR] No meshes in {src_filename}")
        return
        
    primary = meshes[0]
    if len(meshes) > 1:
        bpy.context.view_layer.objects.active = primary
        for m in meshes:
            m.select_set(True)
        bpy.ops.object.join()
        primary = bpy.context.active_object
        
    optimize_textures(max_size=TEXTURE_MAX)
    decimate_mesh(primary, target_poly=target_poly)
    
    if pivot_mode == 'center':
        center_pivot(primary)
    else:
        center_and_ground(primary)
        
    export_glb(out_path, has_armature=False)

def process_operator_skin(src_filename, out_filename, target_poly=7000):
    src_path = os.path.join(SOURCE_DIR, src_filename)
    if not os.path.exists(src_path):
        print(f"[SKIP] Missing {src_path}")
        return
        
    out_path = os.path.join(OUTPUT_DIR, out_filename)
    print(f"Processing operator skin {src_filename} -> {out_filename} (Rigging to ScoutRig)...")
    
    bpy.ops.wm.read_factory_settings(use_empty=True)
    clean_scene()
    
    # 1. Load Scout Armature
    bpy.ops.import_scene.gltf(filepath=SCOUT_GLB)
    clean_scene()
    armature = next(obj for obj in bpy.context.scene.objects if obj.type == 'ARMATURE')
    for m in [o for o in bpy.context.scene.objects if o.type == 'MESH']:
        bpy.data.objects.remove(m, do_unlink=True)
        
    if armature.animation_data:
        armature.animation_data_clear()
        
    # 2. Import Skin Mesh
    bpy.ops.import_scene.gltf(filepath=src_path)
    clean_scene()
    
    skin_meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    if not skin_meshes:
        print(f"  [ERROR] No skin meshes in {src_filename}")
        return
        
    primary_skin = skin_meshes[0]
    if len(skin_meshes) > 1:
        bpy.context.view_layer.objects.active = primary_skin
        for m in skin_meshes:
            m.select_set(True)
        bpy.ops.object.join()
        primary_skin = bpy.context.active_object
        
    optimize_textures(max_size=TEXTURE_MAX)
    decimate_mesh(primary_skin, target_poly=target_poly)
    
    # Scale to standard character height (1.72m)
    min_z = min((primary_skin.matrix_world @ v.co).z for v in primary_skin.data.vertices)
    max_z = max((primary_skin.matrix_world @ v.co).z for v in primary_skin.data.vertices)
    actual_h = max(0.1, max_z - min_z)
    scale_factor = 1.72 / actual_h
    primary_skin.scale = (scale_factor, scale_factor, scale_factor)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    
    # Center XY, ground Z
    min_x = min(v.co.x for v in primary_skin.data.vertices)
    max_x = max(v.co.x for v in primary_skin.data.vertices)
    min_y = min(v.co.y for v in primary_skin.data.vertices)
    max_y = max(v.co.y for v in primary_skin.data.vertices)
    min_z = min(v.co.z for v in primary_skin.data.vertices)
    primary_skin.location.x -= (min_x + max_x) / 2.0
    primary_skin.location.y -= (min_y + max_y) / 2.0
    primary_skin.location.z -= min_z
    bpy.ops.object.transform_apply(location=True, rotation=False, scale=False)
    
    # Bind to armature with automatic skin weights
    bpy.ops.object.select_all(action='DESELECT')
    primary_skin.select_set(True)
    armature.select_set(True)
    bpy.context.view_layer.objects.active = armature
    try:
        bpy.ops.object.parent_set(type='ARMATURE_AUTO')
    except Exception as e:
        print(f"  [WARN] Automatic weights warning ({e}), falling back to parent with envelope")
        bpy.ops.object.parent_set(type='ARMATURE_ENVELOPE')
        
    export_glb(out_path, has_armature=True)

def main():
    # 1. Rig Modules (4160-4167)
    modules = [
        ('4160.glb', 'mod_ballast_plating.glb'),
        ('4161.glb', 'mod_scrap_furnace.glb'),
        ('4162.glb', 'mod_queens_bane.glb'),
        ('4163.glb', 'mod_archivist_lens.glb'),
        ('4164.glb', 'mod_shard_conduit.glb'),
        ('4165.glb', 'mod_duplicate_refiner.glb'),
        ('4166.glb', 'mod_pressure_seal.glb'),
        ('4167.glb', 'mod_deep_anchor.glb')
    ]
    for src, out in modules:
        process_static_asset(src, out, target_poly=2500, pivot_mode='ground')
        
    # 2. Operator Skins (4200, 4207, 4214, 4221, 4228, 4235)
    skins = [
        ('4200.glb', 'chassis_deep_frost.glb'),
        ('4207.glb', 'chassis_rust_bone.glb'),
        ('4214.glb', 'chassis_hive_chitin.glb'),
        ('4221.glb', 'chassis_horizon_corporate.glb'),
        ('4228.glb', 'chassis_bunker404.glb'),
        ('4235.glb', 'chassis_grand_marshal.glb')
    ]
    for src, out in skins:
        process_operator_skin(src, out, target_poly=7000)
        
    # 3. Weapon Skins (4201, 4208, 4215, 4222, 4229, 4236)
    weapons = [
        ('4201.glb', 'skin_deep_frost.glb'),
        ('4208.glb', 'skin_rust_bone.glb'),
        ('4215.glb', 'skin_hive_chitin.glb'),
        ('4222.glb', 'skin_horizon_corporate.glb'),
        ('4229.glb', 'skin_bunker404.glb'),
        ('4236.glb', 'skin_grand_marshal.glb')
    ]
    for src, out in weapons:
        process_static_asset(src, out, target_poly=3500, pivot_mode='center')
        
    # 4. Charms (4202, 4209, 4216, 4223, 4230, 4237)
    charms = [
        ('4202.glb', 'charm_deep_frost.glb'),
        ('4209.glb', 'charm_rust_bone.glb'),
        ('4216.glb', 'charm_hive_chitin.glb'),
        ('4223.glb', 'charm_horizon_corporate.glb'),
        ('4230.glb', 'charm_bunker404.glb'),
        ('4237.glb', 'charm_grand_marshal.glb')
    ]
    for src, out in charms:
        process_static_asset(src, out, target_poly=2500, pivot_mode='ground')
        
    # 5. World Props & States (11 GLBs)
    props = [
        ('body_empty_exosuit.glb', 'body_empty_exosuit.glb'),
        ('body_frozen_human.glb', 'body_frozen_human.glb'),
        ('prop_camp_cot.glb', 'prop_camp_cot.glb'),
        ('prop_camp_crate.glb', 'prop_camp_crate.glb'),
        ('prop_hive_resin_sac.glb', 'prop_hive_resin_sac.glb'),
        ('scatter_bolts.glb', 'scatter_bolts.glb'),
        ('scatter_cable_coil.glb', 'scatter_cable_coil.glb'),
        ('state_barricade_improvised_1.glb', 'state_barricade_improvised_1.glb'),
        ('state_barricade_improvised_2.glb', 'state_barricade_improvised_2.glb'),
        ('state_growth_overrun_1.glb', 'state_growth_overrun_1.glb'),
        ('state_growth_overrun_2.glb', 'state_growth_overrun_2.glb')
    ]
    for src, out in props:
        process_static_asset(src, out, target_poly=2500, pivot_mode='ground')

    print("\n[DONE] Finished processing all Sprint 34 GLBs.")

if __name__ == '__main__':
    main()
