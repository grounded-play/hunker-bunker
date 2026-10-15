import os
import subprocess
import bpy
from mathutils import Vector

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SOURCE_PATH = os.path.join(ROOT, 'art', 'source', '3d', 'raw-masters-2026-10-12', 'hive_visceral_ovipositor.glb')
RUNTIME_PATH = os.path.join(ROOT, 'public', '3d', 'runtime', 'new3ds', 'hive_visceral_ovipositor.glb')

def fix_ovipositor():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=SOURCE_PATH)

    meshes = [o for o in bpy.data.objects if o.type == 'MESH']
    if not meshes:
        raise RuntimeError("No mesh found in hive_visceral_ovipositor.glb")

    mesh_obj = meshes[0]
    bpy.context.view_layer.objects.active = mesh_obj
    mesh_obj.select_set(True)

    # In raw master, long axis is Y (0.0 to 1.036m).
    # y ~ 1.0 is the wide mounting base / bulkhead collar (top).
    # y ~ 0.0 is the sphincter / tip (bottom).
    # To orient as a vertical column standing/hanging with Z as vertical:
    # We rotate -90 degrees around X:
    # Z_new = Y_old (top at Z ~ 1.0, bottom at Z ~ 0.0)
    # Y_new = -Z_old
    import math
    bpy.ops.transform.rotate(value=-math.pi / 2, orient_axis='X')
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

    # Center horizontally on X and Y, and place bottom at Z = 0
    verts = mesh_obj.data.vertices
    min_x = min(v.co.x for v in verts)
    max_x = max(v.co.x for v in verts)
    min_y = min(v.co.y for v in verts)
    max_y = max(v.co.y for v in verts)
    min_z = min(v.co.z for v in verts)

    offset = Vector((-(min_x + max_x) / 2, -(min_y + max_y) / 2, -min_z))
    bpy.ops.transform.translate(value=offset)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

    # Decimate to runtime budget (25k tris) if needed
    current_tris = sum(max(1, len(p.vertices) - 2) for p in mesh_obj.data.polygons)
    print(f"Tris before decimation: {current_tris}")
    if current_tris > 25000:
        ratio = 25000.0 / current_tris
        mod = mesh_obj.modifiers.new('Decimate', 'DECIMATE')
        mod.ratio = ratio
        bpy.ops.object.modifier_apply(modifier=mod.name)
        new_tris = sum(max(1, len(p.vertices) - 2) for p in mesh_obj.data.polygons)
        print(f"Tris after decimation: {new_tris}")

    # Scale textures if needed
    for img in bpy.data.images:
        w, h = img.size
        if w > 2048 or h > 2048:
            ratio = min(2048 / w, 2048 / h)
            img.scale(max(1, round(w * ratio)), max(1, round(h * ratio)))

    # Export optimized GLB
    bpy.ops.export_scene.gltf(
        filepath=RUNTIME_PATH,
        export_format='GLB',
        export_apply=True,
        export_animations=False,
        export_cameras=False,
        export_lights=False,
        export_image_format='WEBP',
        export_image_quality=92,
        export_extras=True,
    )
    print(f"Exported fixed vertical column to {RUNTIME_PATH}")

    # Run gltfpack meshopt compression
    packed = RUNTIME_PATH + '.packed.glb'
    subprocess.run(['npx', '-y', 'gltfpack@1.3', '-i', RUNTIME_PATH, '-o', packed, '-c', '-kn', '-km', '-ke', '-noq'],
                   check=True, cwd=ROOT, stdout=subprocess.DEVNULL)
    os.replace(packed, RUNTIME_PATH)
    print("Meshopt compression complete!")

if __name__ == '__main__':
    fix_ovipositor()
