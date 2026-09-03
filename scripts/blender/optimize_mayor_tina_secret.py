"""Build retail-sized runtime GLBs for the Mayor Tina secret encounter."""

import os

import bpy


ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SOURCE_DIR = os.path.join(ROOT, 'art', 'source', '3d', 'uploads-mayor-tina')
OUTPUT_DIR = os.path.join(ROOT, 'public', '3d', 'runtime', 'secrets')
TARGETS = (
    ('Mayor.Tina.glb', 'mayor-tina.glb', 40000),
    ('Teacup.Roach.glb', 'teacup-roach.glb', 30000),
)


def optimize_scene(target_polygons):
    for obj in list(bpy.context.scene.objects):
        if obj.type in {'CAMERA', 'LIGHT'}:
            bpy.data.objects.remove(obj, do_unlink=True)

    for image in bpy.data.images:
        width, height = image.size
        if width > 1024 or height > 1024:
            scale = min(1024 / width, 1024 / height)
            image.scale(max(1, round(width * scale)), max(1, round(height * scale)))

    for obj in bpy.context.scene.objects:
        if obj.type != 'MESH' or len(obj.data.polygons) <= target_polygons:
            continue
        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)
        modifier = obj.modifiers.new('RuntimeDecimate', 'DECIMATE')
        modifier.ratio = target_polygons / len(obj.data.polygons)
        bpy.ops.object.modifier_apply(modifier=modifier.name)


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    for source_name, output_name, target_polygons in TARGETS:
        source_path = os.path.join(SOURCE_DIR, source_name)
        output_path = os.path.join(OUTPUT_DIR, output_name)
        bpy.ops.wm.read_factory_settings(use_empty=True)
        bpy.ops.import_scene.gltf(filepath=source_path)
        before = sum(len(obj.data.polygons) for obj in bpy.context.scene.objects if obj.type == 'MESH')
        optimize_scene(target_polygons)
        after = sum(len(obj.data.polygons) for obj in bpy.context.scene.objects if obj.type == 'MESH')
        bpy.ops.export_scene.gltf(
            filepath=output_path,
            export_format='GLB',
            export_apply=True,
            export_animations=False,
            export_cameras=False,
            export_lights=False,
        )
        print(f'[mayor-tina-secret] {source_name}: {before} -> {after} polygons; wrote {output_path}')


if __name__ == '__main__':
    main()
