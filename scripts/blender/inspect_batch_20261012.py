import os
import bpy
from mathutils import Vector

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
raw_dir = os.path.join(ROOT, 'art', 'raw')
glbs = [
    "barrier_ice_fractured.glb",
    "barrier_ice_intact.glb",
    "barrier_ice_melting.glb",
    "base_cot_installed.glb",
    "base_door_sealable_bulkhead.glb",
    "base_o2_atmospheric_regulator.glb",
    "base_o2_overhead_duct.glb",
    "base_power_junction_box.glb",
    "carry_field_cot_folded.glb",
    "door_arch_guillotine_frame.glb",
    "door_arch_guillotine_slab.glb",
    "ship_module_comms_transceiver.glb",
    "ship_module_engine_manifold.glb",
    "ship_module_life_support_core.glb",
    "ship_module_navigation_core.glb",
    "wall_macro_buttress_3.glb",
    "wall_macro_straight_4.glb",
    "weapon_flamethrower_case.glb",
    "weapon_flamethrower_m70.glb",
    "weapon_fuel_canister_heavy.glb",
]

for g in glbs:
    path = os.path.join(raw_dir, g)
    if not os.path.exists(path):
        print(f"MISSING: {g}")
        continue
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=path)

    meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    total_tris = sum(sum(max(1, len(p.vertices) - 2) for p in o.data.polygons) for o in meshes)

    min_x = min_y = min_z = float('inf')
    max_x = max_y = max_z = float('-inf')
    for o in meshes:
        for v in o.bound_box:
            world_v = o.matrix_world @ Vector(v)
            min_x = min(min_x, world_v[0])
            max_x = max(max_x, world_v[0])
            min_y = min(min_y, world_v[1])
            max_y = max(max_y, world_v[1])
            min_z = min(min_z, world_v[2])
            max_z = max(max_z, world_v[2])

    dx = max_x - min_x if meshes else 0
    dy = max_y - min_y if meshes else 0
    dz = max_z - min_z if meshes else 0

    actions = [a.name for a in bpy.data.actions]
    objs = [(o.name, o.type) for o in bpy.data.objects]
    images = [(img.name, img.size[0], img.size[1]) for img in bpy.data.images]
    print(f"=== {g} ===")
    print(f"  Objects ({len(objs)}): {objs}")
    print(f"  Meshes: {len(meshes)}, Tris: {total_tris}")
    print(f"  Dims (Blender X,Y,Z): {dx:.2f} x {dy:.2f} x {dz:.2f} (Z is height in Blender)")
    print(f"  Bounds: X[{min_x:.2f}, {max_x:.2f}] Y[{min_y:.2f}, {max_y:.2f}] Z[{min_z:.2f}, {max_z:.2f}]")
    print(f"  Actions: {actions}")
    print(f"  Images: {images[:2]}")
