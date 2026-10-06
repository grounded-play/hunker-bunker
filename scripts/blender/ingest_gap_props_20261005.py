"""Optimize the 2026-10-05 2D->3D gap batch into runtime GLBs.

Source: art/source/3d/raw-masters-2026-10-05/ (raw ~50k-tri uploads with three
4096px PBR maps each; never shipped). Output: public/3d/runtime/new3ds/.

Matches the 2026-10-04 batch (ingest_and_optimize_new_props.py): decimate to
the prop budget, cap textures at 1024px, drop cameras and lights. Textures are
written as WebP (EXT_texture_webp, already used by prop_camp_cookfire) at high
quality: the same resolution as the PNG neighbours at a fraction of the bytes,
which the retail budget needs for a 20-model batch.

Usage:
    /snap/bin/blender -b -P scripts/blender/ingest_gap_props_20261005.py
"""

import os
import bpy

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SOURCE_DIR = os.path.join(ROOT, 'art', 'source', '3d', 'raw-masters-2026-10-05')
RUNTIME_DIR = os.path.join(ROOT, 'public', '3d', 'runtime', 'new3ds')
MAX_TEXTURE_RES = 1024
WEBP_QUALITY = 92

# Props match the 2026-10-04 batch (18k); corpses match cybersnail_dead (20k).
BUDGETS = {
    'prop_cave_eggs_hatched': 18000,
    'prop_cave_eggs_intact': 18000,
    'scatter_hive_eggs': 18000,
    'prop_cave_webs': 18000,
    'prop_cave_hive_wounded': 18000,
    'prop_cave_spores': 18000,
    'prop_spore_colony': 18000,
    'prop_cave_lichen': 18000,
    'prop_hive_carapace_molt': 18000,
    'prop_camp_meridian_radio': 18000,
    # prop_camp_grave_fresh: upload had no mound/marker; regenerate before shipping.
    'prop_camp_laundry': 18000,
    'prop_camp_shutter_lockdown': 18000,
    'prop_camp_warning_placard': 18000,
    'prop_camp_bedrolls': 18000,
    'prop_camp_cookfire_lit': 18000,
    'cryosnail_dead': 20000,
    'sporesnail_dead': 20000,
    'boss_cybersnail_dead': 20000,
    'boss_cryosnail_dead': 20000,
}


def triangles(obj):
    return sum(max(1, len(p.vertices) - 2) for p in obj.data.polygons)


def optimize_scene(target_tris):
    for obj in list(bpy.data.objects):
        if obj.type in ('LIGHT', 'CAMERA'):
            bpy.data.objects.remove(obj, do_unlink=True)
    for image in bpy.data.images:
        w, h = image.size
        if w > MAX_TEXTURE_RES or h > MAX_TEXTURE_RES:
            scale = min(MAX_TEXTURE_RES / w, MAX_TEXTURE_RES / h)
            image.scale(max(1, round(w * scale)), max(1, round(h * scale)))
    meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    total = sum(triangles(o) for o in meshes)
    if total <= target_tris:
        return total, total
    ratio = target_tris / total
    for obj in meshes:
        bpy.context.view_layer.objects.active = obj
        mod = obj.modifiers.new('DecimateBudget', 'DECIMATE')
        mod.ratio = ratio
        bpy.ops.object.modifier_apply(modifier=mod.name)
    return total, sum(triangles(o) for o in meshes)


def main():
    os.makedirs(RUNTIME_DIR, exist_ok=True)
    for name, budget in BUDGETS.items():
        src = os.path.join(SOURCE_DIR, f'{name}.glb')
        dst = os.path.join(RUNTIME_DIR, f'{name}.glb')
        if not os.path.exists(src):
            print(f'[SKIP] missing {src}')
            continue
        bpy.ops.wm.read_factory_settings(use_empty=True)
        bpy.ops.import_scene.gltf(filepath=src)
        before, after = optimize_scene(budget)
        bpy.ops.export_scene.gltf(
            filepath=dst, export_format='GLB', export_apply=True, export_animations=True,
            export_cameras=False, export_lights=False,
            export_image_format='WEBP', export_image_quality=WEBP_QUALITY,
        )
        print(f'[gap-props] {name}: {before} -> {after} tris, '
              f'{os.path.getsize(src) / 1e6:.1f} MB -> {os.path.getsize(dst) / 1e6:.2f} MB')


if __name__ == '__main__':
    main()
