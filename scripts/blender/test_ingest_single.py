import os
import subprocess
import bpy

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
source = os.path.join(ROOT, 'art', 'raw', 'base_power_junction_box.glb')
test_out = os.path.join(ROOT, 'scratch', 'test_junction.glb')
os.makedirs(os.path.dirname(test_out), exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=source)

# Remove lights and cameras
for obj in list(bpy.data.objects):
    if obj.type in ('LIGHT', 'CAMERA'):
        bpy.data.objects.remove(obj, do_unlink=True)

# Resize textures
MAX_TEXTURE_RES = 2048
for image in bpy.data.images:
    w, h = image.size
    if w > MAX_TEXTURE_RES or h > MAX_TEXTURE_RES:
        ratio = min(MAX_TEXTURE_RES / w, MAX_TEXTURE_RES / h)
        image.scale(max(1, round(w * ratio)), max(1, round(h * ratio)))

# Decimate
TARGET_TRIS = 15000
meshes = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH']
before = sum(sum(max(1, len(p.vertices) - 2) for p in o.data.polygons) for o in meshes)

for step in (50000, TARGET_TRIS):
    current = sum(sum(max(1, len(p.vertices) - 2) for p in o.data.polygons) for o in meshes)
    if current <= step or step >= before:
        continue
    ratio = step / current
    for obj in meshes:
        bpy.context.view_layer.objects.active = obj
        mod = obj.modifiers.new('Decimate', 'DECIMATE')
        mod.ratio = ratio
        bpy.ops.object.modifier_apply(modifier=mod.name)

after = sum(sum(max(1, len(p.vertices) - 2) for p in o.data.polygons) for o in meshes)

bpy.ops.export_scene.gltf(
    filepath=test_out,
    export_format='GLB',
    export_apply=True,
    export_animations=False,
    export_cameras=False,
    export_lights=False,
    export_image_format='WEBP',
    export_image_quality=92,
    export_extras=True,
)

# gltfpack
packed = test_out + '.packed.glb'
subprocess.run(['npx', '-y', 'gltfpack@1.3', '-i', test_out, '-o', packed, '-c', '-kn', '-km', '-ke', '-noq'],
               check=True, cwd=ROOT, stdout=subprocess.DEVNULL)
os.replace(packed, test_out)

print(f"Processed base_power_junction_box: {before} -> {after} tris, size: {os.path.getsize(test_out) / 1024:.1f} KB")
