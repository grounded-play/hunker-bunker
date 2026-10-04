"""Rig the biomechanical spore umbilical cable with a 10-bone armature and procedural actions.

Usage:
    /snap/bin/blender -b -P scripts/blender/rig_umbilical_tentacle.py
"""

import math
import os
import sys
import bpy
from mathutils import Vector, Quaternion, Matrix, Euler

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC_GLB = os.path.join(ROOT, 'public', '3d', 'runtime', 'new3ds', 'prop_biomech_spore_umbilical_cable.glb')
OUT_GLB = os.path.join(ROOT, 'public', '3d', 'runtime', 'new3ds', 'prop_biomech_spore_umbilical_cable_rigged.glb')

FPS = 30
NUM_BONES = 10


def build_rigged_tentacle():
    if not os.path.exists(SRC_GLB):
        # Fallback to public/3dprops if runtime not ready yet
        alt_src = os.path.join(ROOT, 'public', '3dprops', 'prop_biomech_spore_umbilical_cable.glb')
        if os.path.exists(alt_src):
            src_path = alt_src
        else:
            raise FileNotFoundError(f"Cannot find umbilical cable GLB at {SRC_GLB} or {alt_src}")
    else:
        src_path = SRC_GLB

    print(f"Loading {src_path} for skeletal rigging...")
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.render.fps = FPS
    bpy.ops.import_scene.gltf(filepath=src_path)

    # Clean non-mesh objects
    meshes = [o for o in bpy.data.objects if o.type == 'MESH']
    if not meshes:
        raise RuntimeError("No mesh objects found in GLTF scene")

    # Apply transforms and join meshes if multiple
    for m in meshes:
        bpy.ops.object.select_all(action='DESELECT')
        m.select_set(True)
        bpy.context.view_layer.objects.active = m
        bpy.ops.object.parent_clear(type='CLEAR_KEEP_TRANSFORM')
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

    bpy.ops.object.select_all(action='DESELECT')
    for m in meshes:
        m.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    if len(meshes) > 1:
        bpy.ops.object.join()

    body = bpy.context.view_layer.objects.active
    body.name = 'UmbilicalBody'

    # Find bounding box in world space
    bb = [body.matrix_world @ Vector(corner) for corner in body.bound_box]
    min_x = min(v.x for v in bb)
    max_x = max(v.x for v in bb)
    min_y = min(v.y for v in bb)
    max_y = max(v.y for v in bb)
    min_z = min(v.z for v in bb)
    max_z = max(v.z for v in bb)

    center_x = (min_x + max_x) * 0.5
    center_y = (min_y + max_y) * 0.5
    height = max_z - min_z
    print(f"Tentacle Bounding Box: X:[{min_x:.2f}, {max_x:.2f}], Y:[{min_y:.2f}, {max_y:.2f}], Z:[{min_z:.2f}, {max_z:.2f}] (Height: {height:.2f}m)")

    # Construct armature
    arm_data = bpy.data.armatures.new('UmbilicalRig')
    arm = bpy.data.objects.new('UmbilicalRig', arm_data)
    bpy.context.scene.collection.objects.link(arm)
    bpy.context.view_layer.objects.active = arm

    bpy.ops.object.mode_set(mode='EDIT')
    bone_names = []
    # Build bone chain from top (ceiling anchor) down to bottom tip
    step_z = height / NUM_BONES
    prev_bone = None

    for i in range(NUM_BONES):
        bname = 'Umbilical_Root' if i == 0 else f'Umbilical_Bone_{i:02d}'
        if i == NUM_BONES - 1:
            bname = 'Umbilical_Tip'
        bone_names.append(bname)

        head_z = max_z - i * step_z
        tail_z = max_z - (i + 1) * step_z

        eb = arm_data.edit_bones.new(bname)
        eb.head = Vector((center_x, center_y, head_z))
        eb.tail = Vector((center_x, center_y, tail_z))
        eb.roll = 0

        if prev_bone:
            eb.parent = prev_bone
            eb.use_connect = True
        prev_bone = eb

    bpy.ops.object.mode_set(mode='OBJECT')

    # Bind armature with automatic weights
    bpy.ops.object.select_all(action='DESELECT')
    body.select_set(True)
    arm.select_set(True)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.parent_set(type='ARMATURE_AUTO')

    # Fallback skinning check: ensure all vertices have at least one weight group
    missed = sum(1 for v in body.data.vertices if not v.groups)
    print(f"Automatic skinning completed. Unweighted vertices: {missed} of {len(body.data.vertices)}")

    if missed > 0:
        print("Assigning missed vertices to closest bone by Z-height...")
        for v in body.data.vertices:
            if not v.groups:
                z_rel = (max_z - v.co.z) / max(height, 1e-4)
                bone_idx = max(0, min(NUM_BONES - 1, int(z_rel * NUM_BONES)))
                bname = bone_names[bone_idx]
                vg = body.vertex_groups.get(bname)
                if not vg:
                    vg = body.vertex_groups.new(name=bname)
                vg.add([v.index], 1.0, 'REPLACE')

    # Create Procedural Animation Actions
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.mode_set(mode='POSE')

    # Helper to insert keyframe on pose bone
    def key_bone_rot(action, bone, frame, euler_rot):
        bone.rotation_mode = 'XYZ'
        bone.rotation_euler = euler_rot
        bone.keyframe_insert(data_path='rotation_euler', frame=frame)

    # 1. Action: idle_sway (72 frames = 2.4s @ 30fps)
    action_idle = bpy.data.actions.new(name='idle_sway')
    arm.animation_data_create()
    arm.animation_data.action = action_idle

    for f in range(0, 73, 6):
        t = (f / 72.0) * math.pi * 2.0
        for i, bname in enumerate(bone_names):
            if i == 0:
                continue  # Root bone anchored
            pbone = arm.pose.bones[bname]
            phase = t + (i * 0.45)
            # Gentle sinusoidal organic curl
            pitch = math.sin(phase) * 0.08 * (i / NUM_BONES)
            yaw = math.cos(phase * 0.7) * 0.10 * (i / NUM_BONES)
            roll = math.sin(phase * 1.3) * 0.04
            key_bone_rot(action_idle, pbone, f, Euler((pitch, yaw, roll)))

    # 2. Action: coil_anticipation (15 frames = 0.5s)
    action_coil = bpy.data.actions.new(name='coil_anticipation')
    arm.animation_data.action = action_coil

    for f in [0, 8, 15]:
        prog = f / 15.0
        for i, bname in enumerate(bone_names):
            pbone = arm.pose.bones[bname]
            if i == 0:
                continue
            # S-curve coil contraction
            sign = 1 if (i % 2 == 0) else -1
            pitch = sign * prog * 0.35 * (i / NUM_BONES)
            yaw = prog * 0.15
            key_bone_rot(action_coil, pbone, f, Euler((pitch, yaw, 0)))

    # 3. Action: lash_strike (12 frames = 0.4s)
    action_strike = bpy.data.actions.new(name='lash_strike')
    arm.animation_data.action = action_strike

    # f=0: coiled, f=4: whip forward extension, f=8: tip snap, f=12: rebound
    for f in [0, 4, 8, 12]:
        for i, bname in enumerate(bone_names):
            pbone = arm.pose.bones[bname]
            if i == 0:
                continue
            if f == 0:
                pitch = 0.3 * (i / NUM_BONES)
            elif f == 4:
                # Forward thrust
                pitch = -0.45 * (i / NUM_BONES)
            elif f == 8:
                # Tip snap down
                pitch = -0.70 if i >= 6 else -0.30
            else:
                pitch = -0.15
            key_bone_rot(action_strike, pbone, f, Euler((pitch, 0, 0)))

    # 4. Action: sever_convulsion (36 frames = 1.2s)
    action_sever = bpy.data.actions.new(name='sever_convulsion')
    arm.animation_data.action = action_sever

    for f in range(0, 37, 3):
        decay = max(0.0, 1.0 - (f / 36.0))
        for i, bname in enumerate(bone_names):
            pbone = arm.pose.bones[bname]
            if i == 0:
                continue
            # Spastic random trembling settling to limp hanging
            jitter_x = math.sin(f * 2.5 + i) * 0.35 * decay
            jitter_y = math.cos(f * 3.1 + i) * 0.35 * decay
            key_bone_rot(action_sever, pbone, f, Euler((jitter_x, jitter_y, 0)))

    # Store all actions in NLA tracks so glTF exporter packages all animations
    for act in [action_idle, action_coil, action_strike, action_sever]:
        track = arm.animation_data.nla_tracks.new()
        track.name = act.name
        track.strips.new(act.name, 0, act)

    bpy.ops.object.mode_set(mode='OBJECT')

    # Export rigged model
    print(f"Exporting rigged umbilical tentacle to {OUT_GLB}...")
    bpy.ops.export_scene.gltf(
        filepath=OUT_GLB,
        export_format='GLB',
        export_apply=False,
        export_animations=True,
        export_nla_strips=True,
        export_cameras=False,
        export_lights=False,
        export_skins=True,
        export_morph=True
    )
    final_mb = os.path.getsize(OUT_GLB) / (1024 * 1024)
    print(f"-> Successfully exported rigged umbilical tentacle ({final_mb:.2f} MB)")


if __name__ == '__main__':
    build_rigged_tentacle()
