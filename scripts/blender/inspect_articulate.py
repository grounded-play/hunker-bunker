import os
import bpy
from mathutils import Vector

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))

def inspect(name):
    path = os.path.join(ROOT, 'art', 'raw', name)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=path)
    obj = bpy.context.scene.objects[0]
    bb = [obj.matrix_world @ Vector(v) for v in obj.bound_box]
    xs = [v.x for v in bb]
    ys = [v.y for v in bb]
    zs = [v.z for v in bb]
    print(f"=== {name} ===")
    print(f"  X: [{min(xs):.3f}, {max(xs):.3f}] (span {max(xs)-min(xs):.3f})")
    print(f"  Y: [{min(ys):.3f}, {max(ys):.3f}] (span {max(ys)-min(ys):.3f})")
    print(f"  Z: [{min(zs):.3f}, {max(zs):.3f}] (span {max(zs)-min(zs):.3f})")

inspect("base_door_sealable_bulkhead.glb")
inspect("weapon_flamethrower_case.glb")
inspect("door_arch_guillotine_frame.glb")
inspect("door_arch_guillotine_slab.glb")
inspect("ship_module_navigation_core.glb")
