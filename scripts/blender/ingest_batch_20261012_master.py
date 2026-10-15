"""Master ingestion script for the 2026-10-12 3D asset cohort (20 models + assembled guillotine door).

Optimizes raw image-to-3D exports from art/raw/ into public/3d/runtime/new3ds/:
- Preserves organic curves with 10k-25k triangle budgets.
- Scales textures to 2048px with high-quality WebP.
- Cuts moving parts into HB_* nodes with glTF extras (hb_motion, hb_axis, hb_open_angle, hb_open_offset, hb_duration, hb_speed) for runtime articulation.
- Adds FX anchors (FX_LIGHT_*, FX_GLOW_*, FX_FLAME_*, INTERACTION_*, sockets).
- Applies meshopt compression via gltfpack.
"""

import os
import subprocess

import bmesh
import bpy
from mathutils import Matrix, Vector

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SOURCE_DIR = os.path.join(ROOT, 'art', 'raw')
RUNTIME_DIR = os.environ.get('HB_RUNTIME_DIR') or os.path.join(ROOT, 'public', '3d', 'runtime', 'new3ds')
MAX_TEXTURE_RES = 2048
WEBP_QUALITY = 92

CONFIGS = {
    'barrier_ice_fractured': {'budget': 25000, 'anchors': {'FX_GLOW_00': (0.5, 0.5, 0.5)}},
    'barrier_ice_intact': {'budget': 25000, 'anchors': {'FX_GLOW_00': (0.5, 0.5, 0.5)}},
    'barrier_ice_melting': {'budget': 25000, 'anchors': {'FX_GLOW_00': (0.5, 0.45, 0.5), 'FX_WATER_SURFACE': (0.5, 0.15, 0.5)}},
    'base_cot_installed': {'budget': 12000, 'anchors': {'FX_GLOW_00': (0.1, 0.6, 0.5), 'INTERACTION_00': (0.5, 0.5, 0.5)}},
    'base_door_sealable_bulkhead': {'budget': 18000, 'anchors': {'FX_GLOW_00': (0.5, 0.55, 0.75), 'INTERACTION_00': (0.5, 0.5, 0.75)}},
    'base_o2_atmospheric_regulator': {'budget': 15000, 'anchors': {'FX_GLOW_00': (0.5, 0.6, 0.75), 'FX_LIGHT_00': (0.5, 0.65, 0.75), 'socket_duct_out': (0.5, 0.95, 0.5), 'socket_power_in': (0.85, 0.2, 0.5)}},
    'base_o2_overhead_duct': {'budget': 10000, 'anchors': {'FX_GLOW_00': (0.5, 0.5, 0.75), 'socket_duct_in': (0.05, 0.5, 0.5), 'socket_duct_out': (0.95, 0.5, 0.5)}},
    'base_power_junction_box': {'budget': 12000, 'anchors': {'FX_GLOW_00': (0.5, 0.6, 0.8), 'FX_LIGHT_00': (0.5, 0.6, 0.85), 'socket_power_in': (0.5, 0.05, 0.5), 'socket_power_out': (0.5, 0.95, 0.5)}},
    'carry_field_cot_folded': {'budget': 10000, 'anchors': {'INTERACTION_00': (0.5, 0.5, 0.5)}},
    'door_arch_guillotine_frame': {'budget': 25000, 'anchors': {'FX_LIGHT_00': (0.5, 0.9, 0.5), 'FX_GLOW_00': (0.15, 0.5, 0.5)}},
    'door_arch_guillotine_slab': {'budget': 15000, 'anchors': {'FX_GLOW_00': (0.5, 0.1, 0.5)}},
    'door_arch_guillotine_assembled': {'budget': 35000, 'anchors': {'FX_LIGHT_00': (0.5, 0.9, 0.5), 'FX_GLOW_00': (0.15, 0.5, 0.5), 'INTERACTION_00': (0.5, 0.3, 0.5)}},
    'ship_module_comms_transceiver': {'budget': 22000, 'anchors': {'FX_GLOW_00': (0.5, 0.75, 0.5), 'FX_LIGHT_00': (0.5, 0.25, 0.7)}},
    'ship_module_engine_manifold': {'budget': 25000, 'anchors': {'FX_GLOW_00': (0.5, 0.6, 0.5), 'socket_fuel_in': (0.5, 0.1, 0.5)}},
    'ship_module_life_support_core': {'budget': 25000, 'anchors': {'FX_GLOW_00': (0.5, 0.6, 0.5), 'FX_LIGHT_00': (0.5, 0.4, 0.75), 'socket_duct_out': (0.5, 0.95, 0.5)}},
    'ship_module_navigation_core': {'budget': 22000, 'anchors': {'FX_GLOW_00': (0.5, 0.5, 0.7), 'FX_LIGHT_00': (0.5, 0.5, 0.8)}},
    'wall_macro_buttress_3': {'budget': 25000, 'anchors': {'FX_LIGHT_00': (0.5, 0.6, 0.5), 'FX_GLOW_00': (0.5, 0.4, 0.5)}},
    'wall_macro_straight_4': {'budget': 25000, 'anchors': {'FX_LIGHT_00': (0.5, 0.85, 0.7), 'socket_tray_in': (0.02, 0.6, 0.5), 'socket_tray_out': (0.98, 0.6, 0.5)}},
    'weapon_flamethrower_case': {'budget': 12000, 'anchors': {'INTERACTION_00': (0.5, 0.3, 0.05)}},
    'weapon_flamethrower_m70': {'budget': 15000, 'anchors': {'FX_FLAME_00': (0.95, 0.45, 0.5), 'FX_GLOW_00': (0.7, 0.4, 0.5)}},
    'weapon_fuel_canister_heavy': {'budget': 10000, 'anchors': {'FX_GLOW_00': (0.5, 0.75, 0.5), 'INTERACTION_00': (0.5, 0.5, 0.5)}}
}

def to_gltf(vec):
    """Blender (x, y, z), Z up -> glTF (x, z, -y), Y up."""
    return [vec[0], vec[2], -vec[1]]

def triangle_count(obj):
    return sum(max(1, len(p.vertices) - 2) for p in obj.data.polygons)

def optimize_scene(target_tris):
    for obj in list(bpy.data.objects):
        if obj.type in ('LIGHT', 'CAMERA'):
            bpy.data.objects.remove(obj, do_unlink=True)

    for image in bpy.data.images:
        w, h = image.size
        if w > MAX_TEXTURE_RES or h > MAX_TEXTURE_RES:
            ratio = min(MAX_TEXTURE_RES / w, MAX_TEXTURE_RES / h)
            image.scale(max(1, round(w * ratio)), max(1, round(h * ratio)))

    meshes = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH']
    before = sum(triangle_count(obj) for obj in meshes)
    for step in (50000, target_tris):
        current = sum(triangle_count(obj) for obj in meshes)
        if current <= step or step >= before:
            continue
        ratio = step / current
        for obj in meshes:
            bpy.context.view_layer.objects.active = obj
            mod = obj.modifiers.new('RuntimeBudget', 'DECIMATE')
            mod.ratio = ratio
            bpy.ops.object.modifier_apply(modifier=mod.name)
    return before, sum(triangle_count(obj) for obj in meshes)

def get_scene_bounds():
    meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    if not meshes:
        return Vector((0,0,0)), Vector((1,1,1))
    min_v = Vector((float('inf'), float('inf'), float('inf')))
    max_v = Vector((float('-inf'), float('-inf'), float('-inf')))
    for obj in meshes:
        for corner in obj.bound_box:
            w_co = obj.matrix_world @ Vector(corner)
            for i in range(3):
                min_v[i] = min(min_v[i], w_co[i])
                max_v[i] = max(max_v[i], w_co[i])
    return min_v, max_v

def add_anchors(name, anchors_dict):
    min_v, max_v = get_scene_bounds()
    span = max_v - min_v
    for anchor_name, frac in anchors_dict.items():
        loc = Vector((
            min_v.x + span.x * frac[0],
            min_v.y + span.y * frac[1],
            min_v.z + span.z * frac[2],
        ))
        empty = bpy.data.objects.new(anchor_name, None)
        empty.empty_display_type = 'SPHERE'
        empty.empty_display_size = max(span.length * 0.02, 0.02)
        empty.location = loc
        empty['hb_fx_anchor'] = True
        empty['hb_fx_contract'] = 1
        bpy.context.scene.collection.objects.link(empty)

def apply_articulations(name):
    """Adds runtime articulation parts with glTF extras."""
    if name == 'base_door_sealable_bulkhead':
        meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
        if not meshes:
            return
        body = meshes[0]
        body.name = 'HB_BODY'
        bpy.ops.object.select_all(action='DESELECT')
        body.select_set(True)
        bpy.context.view_layer.objects.active = body
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        
        # Door slab is centered horizontally (-0.30 to 0.30) and above sill (z > 0.08)
        bpy.ops.object.mode_set(mode='EDIT')
        bm = bmesh.from_edit_mesh(body.data)
        for f in bm.faces:
            f.select = False
        count = 0
        for f in bm.faces:
            center = f.calc_center_median()
            if -0.32 <= center.x <= 0.32 and center.z >= 0.08 and center.z <= 1.02:
                f.select = True
                count += 1
        bmesh.update_edit_mesh(body.data)
        if count > 0:
            bpy.ops.mesh.separate(type='SELECTED')
            bpy.ops.object.mode_set(mode='OBJECT')
            door = next(o for o in bpy.context.selected_objects if o is not body)
            door.name = 'HB_DOOR_00'
            door['hb_motion'] = 'slide'
            door['hb_axis'] = [0.0, 1.0, 0.0]
            door['hb_open_angle'] = 0.0
            door['hb_open_offset'] = [0.0, -1.4, 0.0]
            door['hb_duration'] = 0.9
            print(f"[articulate] base_door_sealable_bulkhead: separated {count} faces into HB_DOOR_00 (vertical slide)")
        else:
            bpy.ops.object.mode_set(mode='OBJECT')

    elif name == 'weapon_flamethrower_case':
        meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
        if not meshes:
            return
        body = meshes[0]
        body.name = 'HB_BODY'
        bpy.ops.object.select_all(action='DESELECT')
        body.select_set(True)
        bpy.context.view_layer.objects.active = body
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

        # Upper lid is at z > 0.22
        bpy.ops.object.mode_set(mode='EDIT')
        bm = bmesh.from_edit_mesh(body.data)
        for f in bm.faces:
            f.select = False
        count = 0
        for f in bm.faces:
            center = f.calc_center_median()
            if center.z >= 0.22:
                f.select = True
                count += 1
        bmesh.update_edit_mesh(body.data)
        if count > 0:
            bpy.ops.mesh.separate(type='SELECTED')
            bpy.ops.object.mode_set(mode='OBJECT')
            lid = next(o for o in bpy.context.selected_objects if o is not body)
            lid.name = 'HB_LID_00'
            pivot = Vector((0.0, 0.31, 0.22))
            offset = pivot - lid.matrix_world.translation
            lid.data.transform(Matrix.Translation(-offset))
            lid.matrix_world.translation += offset
            lid['hb_motion'] = 'hinge'
            lid['hb_axis'] = to_gltf((1.0, 0.0, 0.0))
            lid['hb_open_angle'] = 1.570796
            lid['hb_open_offset'] = [0.0, 0.0, 0.0]
            lid['hb_duration'] = 0.8
            print(f"[articulate] weapon_flamethrower_case: separated {count} faces into HB_LID_00")
        else:
            bpy.ops.object.mode_set(mode='OBJECT')

    elif name == 'ship_module_navigation_core':
        meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
        if not meshes:
            return
        body = meshes[0]
        body.name = 'HB_BODY'
        bpy.ops.object.select_all(action='DESELECT')
        body.select_set(True)
        bpy.context.view_layer.objects.active = body
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

        # Central sphere is within radius 0.25 of center (0, 0, 0.42)
        bpy.ops.object.mode_set(mode='EDIT')
        bm = bmesh.from_edit_mesh(body.data)
        for f in bm.faces:
            f.select = False
        count = 0
        pivot = Vector((0.0, 0.0, 0.42))
        for f in bm.faces:
            center = f.calc_center_median()
            if (center - pivot).length <= 0.26:
                f.select = True
                count += 1
        bmesh.update_edit_mesh(body.data)
        if count > 0:
            bpy.ops.mesh.separate(type='SELECTED')
            bpy.ops.object.mode_set(mode='OBJECT')
            rotor = next(o for o in bpy.context.selected_objects if o is not body)
            rotor.name = 'HB_ROTOR_00'
            offset = pivot - rotor.matrix_world.translation
            rotor.data.transform(Matrix.Translation(-offset))
            rotor.matrix_world.translation += offset
            rotor['hb_motion'] = 'spin'
            rotor['hb_axis'] = to_gltf((0.0, 0.0, 1.0))
            rotor['hb_speed'] = 1.5
            rotor['hb_bob'] = 0.0
            print(f"[articulate] ship_module_navigation_core: separated {count} faces into HB_ROTOR_00")
        else:
            bpy.ops.object.mode_set(mode='OBJECT')

    elif name == 'ship_module_comms_transceiver':
        meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
        if not meshes:
            return
        body = meshes[0]
        body.name = 'HB_BODY'
        bpy.ops.object.select_all(action='DESELECT')
        body.select_set(True)
        bpy.context.view_layer.objects.active = body
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

        # Dish array is at z > 0.50
        bpy.ops.object.mode_set(mode='EDIT')
        bm = bmesh.from_edit_mesh(body.data)
        for f in bm.faces:
            f.select = False
        count = 0
        pivot = Vector((0.0, 0.0, 0.52))
        for f in bm.faces:
            center = f.calc_center_median()
            if center.z >= 0.52:
                f.select = True
                count += 1
        bmesh.update_edit_mesh(body.data)
        if count > 0:
            bpy.ops.mesh.separate(type='SELECTED')
            bpy.ops.object.mode_set(mode='OBJECT')
            dish = next(o for o in bpy.context.selected_objects if o is not body)
            dish.name = 'HB_ROTOR_00'
            offset = pivot - dish.matrix_world.translation
            dish.data.transform(Matrix.Translation(-offset))
            dish.matrix_world.translation += offset
            dish['hb_motion'] = 'spin'
            dish['hb_axis'] = to_gltf((0.0, 0.0, 1.0))
            dish['hb_speed'] = 0.4
            dish['hb_bob'] = 0.0
            print(f"[articulate] ship_module_comms_transceiver: separated {count} faces into HB_ROTOR_00")
        else:
            bpy.ops.object.mode_set(mode='OBJECT')

def build_assembled_guillotine():
    """Builds door_arch_guillotine_assembled.glb by combining frame and slab."""
    frame_src = os.path.join(SOURCE_DIR, 'door_arch_guillotine_frame.glb')
    slab_src = os.path.join(SOURCE_DIR, 'door_arch_guillotine_slab.glb')
    dest = os.path.join(RUNTIME_DIR, 'door_arch_guillotine_assembled.glb')
    if not os.path.exists(frame_src) or not os.path.exists(slab_src):
        print("[SKIP] assembled guillotine missing frame or slab source")
        return

    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=frame_src)
    frame = bpy.context.scene.objects[0]
    frame.name = 'HB_BODY'

    bpy.ops.import_scene.gltf(filepath=slab_src)
    slab = next(o for o in bpy.context.scene.objects if o is not frame and o.type == 'MESH')
    slab.name = 'HB_DOOR_00'

    # Optimize both
    optimize_scene(35000)

    # Apply transforms
    bpy.ops.object.select_all(action='DESELECT')
    frame.select_set(True)
    bpy.context.view_layer.objects.active = frame
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

    slab.select_set(True)
    frame.select_set(False)
    bpy.context.view_layer.objects.active = slab
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

    # Position slab at closed rest pose (aligned at threshold z=0, resting between frame posts)
    # The guillotine door slides vertically UP when opening:
    # glTF Y is up. In Blender, Z is up -> to_gltf((0, 0, 1)) = (0, 1, 0) in glTF.
    slab['hb_motion'] = 'slide'
    slab['hb_axis'] = [0.0, 1.0, 0.0]
    slab['hb_open_angle'] = 0.0
    # Slide up 2.4 meters (in glTF space, Y is up)
    slab['hb_open_offset'] = [0.0, 2.4, 0.0]
    slab['hb_duration'] = 1.2

    add_anchors('door_arch_guillotine_assembled', CONFIGS['door_arch_guillotine_assembled']['anchors'])

    bpy.ops.export_scene.gltf(
        filepath=dest,
        export_format='GLB',
        export_apply=True,
        export_animations=False,
        export_cameras=False,
        export_lights=False,
        export_image_format='WEBP',
        export_image_quality=WEBP_QUALITY,
        export_extras=True,
    )
    packed = dest + '.packed.glb'
    subprocess.run(['npx', '-y', 'gltfpack@1.3', '-i', dest, '-o', packed, '-c', '-kn', '-km', '-ke', '-noq'],
                   check=True, cwd=ROOT, stdout=subprocess.DEVNULL)
    os.replace(packed, dest)
    print(f"[OK] door_arch_guillotine_assembled built successfully ({os.path.getsize(dest)/1e6:.2f} MB)")

def process_single(name):
    cfg = CONFIGS.get(name, {'budget': 20000, 'anchors': {}})
    source = os.path.join(SOURCE_DIR, f'{name}.glb')
    dest = os.path.join(RUNTIME_DIR, f'{name}.glb')
    if not os.path.exists(source):
        print(f"[SKIP] missing {source}")
        return

    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=source)
    before, after = optimize_scene(cfg['budget'])

    # Apply articulation if applicable
    apply_articulations(name)

    # Add anchors
    add_anchors(name, cfg.get('anchors', {}))

    bpy.ops.export_scene.gltf(
        filepath=dest,
        export_format='GLB',
        export_apply=True,
        export_animations=False,
        export_cameras=False,
        export_lights=False,
        export_image_format='WEBP',
        export_image_quality=WEBP_QUALITY,
        export_extras=True,
    )
    packed = dest + '.packed.glb'
    subprocess.run(['npx', '-y', 'gltfpack@1.3', '-i', dest, '-o', packed, '-c', '-kn', '-km', '-ke', '-noq'],
                   check=True, cwd=ROOT, stdout=subprocess.DEVNULL)
    os.replace(packed, dest)
    src_mb = os.path.getsize(source) / 1e6
    dst_mb = os.path.getsize(dest) / 1e6
    print(f"[ingest] {name}: {before} -> {after} tris, {src_mb:.1f} MB -> {dst_mb:.2f} MB")

def main():
    os.makedirs(RUNTIME_DIR, exist_ok=True)
    target = os.environ.get('HB_PROP')
    if target:
        if target == 'door_arch_guillotine_assembled':
            build_assembled_guillotine()
        else:
            process_single(target)
    else:
        for name in CONFIGS:
            if name == 'door_arch_guillotine_assembled':
                build_assembled_guillotine()
            else:
                process_single(name)

if __name__ == '__main__':
    main()
