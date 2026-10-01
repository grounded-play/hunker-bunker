#!/usr/bin/env python3
"""
Automated optimization and packaging script for static unrigged models:
- Decimates high-resolution geometry (~10k-12k polys for weapons, ~6k for props)
- Resizes embedded PBR textures to 1024 / 512 JPEG for rapid runtime streaming
- Centers XY and grounds Z for props
- Exports to public/3d/runtime/new3ds/ maintaining strict retail bundle budget limits
"""
import os
import bpy

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SOURCE_DIR = os.path.join(ROOT, 'art', 'raw', 'incoming_3d_20261001')
OUTPUT_DIR = os.path.join(ROOT, 'public', '3d', 'runtime', 'new3ds')

os.makedirs(OUTPUT_DIR, exist_ok=True)

CONFIGS = [
    # Weapons
    {
        'src': 'Scout Base Talon-C Frame.glb',
        'dst': 'gun_scout_talon_c.glb',
        'is_weapon': True,
        'target_poly': 12000,
        'base_tex': 1024,
        'other_tex': 512,
    },
    {
        'src': '5002 Chrono-Drifter Talon-C.glb',
        'dst': 'skin_scout_chrono_drifter.glb',
        'is_weapon': True,
        'target_poly': 12000,
        'base_tex': 1024,
        'other_tex': 512,
    },
    {
        'src': '5006 Bunker Bastion Siege-Breaker.glb',
        'dst': 'skin_tank_bunker_bastion.glb',
        'is_weapon': True,
        'target_poly': 12000,
        'base_tex': 1024,
        'other_tex': 512,
    },
    {
        'src': '5009 Archival Constructor Arc Driver.glb',
        'dst': 'skin_engineer_archival_constructor.glb',
        'is_weapon': True,
        'target_poly': 12000,
        'base_tex': 1024,
        'other_tex': 512,
    },
    {
        'src': '5010 — Hive-Weaver Bio-Plasma Emitter v2.glb',
        'dst': 'skin_engineer_hive_weaver.glb',
        'is_weapon': True,
        'target_poly': 12000,
        'base_tex': 1024,
        'other_tex': 512,
    },
    {
        'src': "4162 — Queen's Bane.glb",
        'dst': 'mod_queens_bane.glb',
        'is_weapon': True,
        'target_poly': 10000,
        'base_tex': 1024,
        'other_tex': 512,
    },
    # Props
    {
        'src': 'fixture_sconce_vine.glb',
        'dst': 'fixture_sconce_vine.glb',
        'is_weapon': False,
        'target_poly': 6000,
        'base_tex': 512,
        'other_tex': 512,
    },
    {
        'src': 'prop_conduit_junction_box.glb',
        'dst': 'prop_conduit_junction_box.glb',
        'is_weapon': False,
        'target_poly': 6000,
        'base_tex': 512,
        'other_tex': 512,
    },
    {
        'src': 'prop_flesh_steel_cradle.glb',
        'dst': 'prop_flesh_steel_cradle.glb',
        'is_weapon': False,
        'target_poly': 6000,
        'base_tex': 512,
        'other_tex': 512,
    },
    {
        'src': 'prop_fungal_tendril_altar.glb',
        'dst': 'prop_fungal_tendril_altar.glb',
        'is_weapon': False,
        'target_poly': 6000,
        'base_tex': 512,
        'other_tex': 512,
    },
    {
        'src': 'prop_pipe_rupture.glb',
        'dst': 'prop_pipe_rupture.glb',
        'is_weapon': False,
        'target_poly': 6000,
        'base_tex': 512,
        'other_tex': 512,
    },
]

def clean_scene():
    for obj in list(bpy.context.scene.objects):
        if obj.type in {'CAMERA', 'LIGHT'}:
            bpy.data.objects.remove(obj, do_unlink=True)

def process_item(cfg):
    src_path = os.path.join(SOURCE_DIR, cfg['src'])
    dst_path = os.path.join(OUTPUT_DIR, cfg['dst'])
    if not os.path.exists(src_path):
        print(f"[ERROR] Missing source: {src_path}")
        return

    orig_size_mb = os.path.getsize(src_path) / (1024 * 1024)
    print(f"\nProcessing {cfg['src']} -> {cfg['dst']} (orig: {orig_size_mb:.2f} MB)...")

    bpy.ops.wm.read_factory_settings(use_empty=True)
    clean_scene()
    bpy.ops.import_scene.gltf(filepath=src_path)
    clean_scene()

    meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    if not meshes:
        print(f"  [ERROR] No mesh in {cfg['src']}")
        return

    primary = meshes[0]
    if len(meshes) > 1:
        bpy.context.view_layer.objects.active = primary
        for m in meshes:
            m.select_set(True)
        bpy.ops.object.join()
        primary = bpy.context.active_object

    # Resize textures
    for img in list(bpy.data.images):
        name_lower = img.name.lower()
        if 'base' in name_lower or 'diffuse' in name_lower or 'color' in name_lower or 'albedo' in name_lower or ('normal' not in name_lower and 'rough' not in name_lower and 'metal' not in name_lower):
            target_size = cfg['base_tex']
        else:
            target_size = cfg['other_tex']
        if img.size[0] > target_size or img.size[1] > target_size:
            ratio = min(target_size / img.size[0], target_size / img.size[1])
            new_w = max(1, round(img.size[0] * ratio))
            new_h = max(1, round(img.size[1] * ratio))
            img.scale(new_w, new_h)

    # Decimate mesh
    poly_count = len(primary.data.polygons)
    target_poly = cfg['target_poly']
    if poly_count > target_poly:
        ratio = target_poly / poly_count
        mod = primary.modifiers.new('Decimate', 'DECIMATE')
        mod.ratio = ratio
        bpy.context.view_layer.objects.active = primary
        bpy.ops.object.modifier_apply(modifier=mod.name)
        print(f"  Decimated from {poly_count} to {len(primary.data.polygons)} polygons")

    # For props: center on XY, ground on Z
    if not cfg['is_weapon']:
        bpy.context.view_layer.objects.active = primary
        primary.select_set(True)
        bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
        corners = [primary.matrix_world @ v.co for v in primary.data.vertices]
        min_x = min(c.x for c in corners)
        max_x = max(c.x for c in corners)
        min_y = min(c.y for c in corners)
        max_y = max(c.y for c in corners)
        min_z = min(c.z for c in corners)
        primary.location.x -= (min_x + max_x) / 2.0
        primary.location.y -= (min_y + max_y) / 2.0
        primary.location.z -= min_z
        bpy.ops.object.transform_apply(location=True, rotation=False, scale=False)

    bpy.ops.export_scene.gltf(
        filepath=dst_path,
        export_format='GLB',
        export_image_format='JPEG',
        export_apply=True,
        export_animations=False,
        export_skins=False,
        export_cameras=False,
        export_lights=False
    )

    out_size_kb = os.path.getsize(dst_path) / 1024
    print(f"  [OK] Exported {cfg['dst']}: {out_size_kb:.1f} KB (reduced by {((orig_size_mb*1024 - out_size_kb)/(orig_size_mb*1024))*100:.1f}%)")

def main():
    for cfg in CONFIGS:
        process_item(cfg)
    print("\n[ALL DONE] Finished processing static unrigged models.")

if __name__ == '__main__':
    main()
