"""Rig the biomechanical spore umbilical cable: a floor hatch with a tentacle rising out of it.

Usage:
    /snap/bin/blender -b -P scripts/blender/rig_umbilical_tentacle.py

The model stands on its hatch (z = 0 is the floor). The rig is:

    Umbilical_Base   static, owns every hatch vertex at weight 1.0, never keyed
    Umbilical_Root   first tentacle bone, never keyed (the game yaws it to face the player)
    Umbilical_Bone_01 .. _08
    Umbilical_Tip

The chain climbs from the hatch top to the tentacle's crown, following the
tentacle's centreline slice by slice, so its S-curve bends where it is drawn.
Weights are assigned by height, blended linearly between neighbouring bones;
the hatch-to-tentacle seam blends Base into Root so the drips do not tear.

An earlier version hung the chain from the top (a ceiling rig). The hatch then
sat at the tip, the bone that swings hardest, and every action moved the floor.
"""

import math
import os
import bpy
from mathutils import Euler, Vector

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC_GLB = os.path.join(ROOT, 'public', '3d', 'runtime', 'new3ds', 'prop_biomech_spore_umbilical_cable.glb')
OUT_GLB = os.path.join(ROOT, 'public', '3d', 'runtime', 'new3ds', 'prop_biomech_spore_umbilical_cable_rigged.glb')

FPS = 30
CHAIN_BONES = 10            # Root + 8 + Tip
HATCH_TOP = 0.075           # fraction of height: the hatch slab ends here (slice histogram: dense below, ~85 verts/slice above)
SEAM_BLEND = 0.055          # fraction of height above HATCH_TOP over which Base hands over to Root
CENTRE_WINDOW = 0.05        # fraction of height sampled around each joint for the centreline


def chain_name(i):
    if i == 0:
        return 'Umbilical_Root'
    if i == CHAIN_BONES - 1:
        return 'Umbilical_Tip'
    return f'Umbilical_Bone_{i:02d}'


def import_body():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.render.fps = FPS
    bpy.ops.import_scene.gltf(filepath=SRC_GLB)
    meshes = [o for o in bpy.data.objects if o.type == 'MESH']
    if not meshes:
        raise RuntimeError('No mesh objects found in the source GLB')
    for obj in list(bpy.data.objects):
        if obj.type != 'MESH':
            bpy.data.objects.remove(obj, do_unlink=True)
    for m in meshes:
        bpy.ops.object.select_all(action='DESELECT')
        m.select_set(True)
        bpy.context.view_layer.objects.active = m
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    bpy.ops.object.select_all(action='DESELECT')
    for m in meshes:
        m.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    if len(meshes) > 1:
        bpy.ops.object.join()
    body = bpy.context.view_layer.objects.active
    body.name = 'UmbilicalBody'
    return body


def centreline(points, z, half_window):
    near = [p for p in points if abs(p.z - z) <= half_window]
    if not near:
        return None
    return Vector((sum(p.x for p in near) / len(near), sum(p.y for p in near) / len(near), z))


def build_rigged_tentacle():
    print(f'Loading {SRC_GLB} for skeletal rigging...')
    body = import_body()
    points = [v.co.copy() for v in body.data.vertices]
    min_z = min(p.z for p in points)
    max_z = max(p.z for p in points)
    height = max_z - min_z
    hatch_top = min_z + HATCH_TOP * height
    seam_top = hatch_top + SEAM_BLEND * height
    tentacle = [p for p in points if p.z >= hatch_top]
    print(f'Height {height:.3f}; hatch below z={hatch_top:.3f}; seam to z={seam_top:.3f}')

    # Joints: the tentacle's centreline at evenly spaced heights, lightly
    # smoothed. The first joint is the hatch top, directly above the base.
    step = (max_z - hatch_top) / CHAIN_BONES
    raw = []
    for k in range(CHAIN_BONES + 1):
        z = hatch_top + k * step
        c = centreline(tentacle, z, CENTRE_WINDOW * height) or (raw[-1].copy() if raw else Vector((0, 0, z)))
        c.z = z
        raw.append(c)
    joints = []
    for k, c in enumerate(raw):
        a = raw[max(0, k - 1)]
        b = raw[min(len(raw) - 1, k + 1)]
        joints.append(Vector(((a.x + 2 * c.x + b.x) / 4, (a.y + 2 * c.y + b.y) / 4, c.z)))

    arm_data = bpy.data.armatures.new('UmbilicalRig')
    arm = bpy.data.objects.new('UmbilicalRig', arm_data)
    bpy.context.scene.collection.objects.link(arm)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.mode_set(mode='EDIT')

    # Root is vertical so its parent-space Y is world up: the game yaws it
    # about that axis without tilting the tentacle.
    joints[1] = Vector((joints[0].x, joints[0].y, joints[1].z))
    base = arm_data.edit_bones.new('Umbilical_Base')
    base.head = Vector((joints[0].x, joints[0].y, min_z))
    base.tail = joints[0].copy()
    base.roll = 0
    prev = base
    bone_names = []
    for i in range(CHAIN_BONES):
        eb = arm_data.edit_bones.new(chain_name(i))
        eb.head = joints[i].copy()
        eb.tail = joints[i + 1].copy()
        eb.roll = 0
        eb.parent = prev
        eb.use_connect = True
        prev = eb
        bone_names.append(eb.name)
    bpy.ops.object.mode_set(mode='OBJECT')

    # Skin by height. Bone centres are the blend anchors.
    bpy.ops.object.select_all(action='DESELECT')
    body.select_set(True)
    arm.select_set(True)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.parent_set(type='ARMATURE_NAME')
    for vg in list(body.vertex_groups):
        body.vertex_groups.remove(vg)
    groups = {name: body.vertex_groups.new(name=name) for name in ['Umbilical_Base', *bone_names]}
    centres = [hatch_top + (i + 0.5) * step for i in range(CHAIN_BONES)]
    for v in body.data.vertices:
        z = v.co.z
        if z < hatch_top:
            groups['Umbilical_Base'].add([v.index], 1.0, 'REPLACE')
            continue
        if z < seam_top:
            s = (z - hatch_top) / (seam_top - hatch_top)
            s = s * s * (3 - 2 * s)
            groups['Umbilical_Base'].add([v.index], 1.0 - s, 'REPLACE')
            groups[bone_names[0]].add([v.index], s, 'REPLACE')
            continue
        if z <= centres[0]:
            groups[bone_names[0]].add([v.index], 1.0, 'REPLACE')
            continue
        if z >= centres[-1]:
            groups[bone_names[-1]].add([v.index], 1.0, 'REPLACE')
            continue
        i = min(CHAIN_BONES - 2, int((z - centres[0]) / step))
        t = (z - centres[i]) / step
        groups[bone_names[i]].add([v.index], 1.0 - t, 'REPLACE')
        groups[bone_names[i + 1]].add([v.index], t, 'REPLACE')

    hatch = [v for v in body.data.vertices if v.co.z < hatch_top]
    impure = sum(1 for v in hatch if any(body.vertex_groups[g.group].name != 'Umbilical_Base' and g.weight > 0 for g in v.groups))
    print(f'Hatch vertices: {len(hatch)}; with any non-base weight: {impure}')
    if impure:
        raise RuntimeError('hatch vertices must belong to Umbilical_Base only')

    # Positive pitch about a bone's local X swings the chain toward the
    # bones' local +Z. The strike lunges that way; the game measures it from
    # the root bone's rest frame, so its direction need not match world axes.
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.mode_set(mode='POSE')
    arm.animation_data_create()

    def key(pbone, frame, euler):
        pbone.rotation_mode = 'XYZ'
        pbone.rotation_euler = euler
        pbone.keyframe_insert(data_path='rotation_euler', frame=frame)

    def new_action(name):
        action = bpy.data.actions.new(name=name)
        arm.animation_data.action = action
        for pb in arm.pose.bones:
            pb.rotation_mode = 'XYZ'
            pb.rotation_euler = Euler((0, 0, 0))
        return action

    animated = bone_names[1:]  # Base and Root are never keyed

    def weight(i):
        return (i + 1) / len(animated)

    # 1. idle_sway: 2.4 s loop, a slow travelling wave.
    idle = new_action('idle_sway')
    for f in range(0, 73, 6):
        t = (f / 72.0) * math.tau
        for i, name in enumerate(animated):
            phase = t - i * 0.45
            key(arm.pose.bones[name], f, Euler((
                math.sin(phase) * 0.10 * weight(i),
                math.sin(phase * 2.0) * 0.03,
                math.cos(phase) * 0.08 * weight(i),
            )))

    # 2. coil_anticipation: 0.5 s, rears back into an S.
    coil = new_action('coil_anticipation')
    for f in (0, 8, 15):
        prog = f / 15.0
        for i, name in enumerate(animated):
            sign = -1 if i < len(animated) // 2 else 1
            key(arm.pose.bones[name], f, Euler((sign * -prog * 0.32 * (0.5 + weight(i)), 0, 0)))

    # 3. lash_strike: 0.4 s, coiled -> lunge forward -> tip snap -> rebound.
    strike = new_action('lash_strike')
    for f, pose in ((0, 'coiled'), (4, 'lunge'), (8, 'snap'), (12, 'rebound')):
        for i, name in enumerate(animated):
            if pose == 'coiled':
                pitch = -0.28 * weight(i)
            elif pose == 'lunge':
                pitch = 0.30 * (0.4 + weight(i))
            elif pose == 'snap':
                pitch = 0.55 if i >= len(animated) // 2 else 0.22
            else:
                pitch = 0.10
            key(arm.pose.bones[name], f, Euler((pitch, 0, 0)))

    # 4. sever_convulsion: 1.2 s, thrashing that settles into a limp droop.
    sever = new_action('sever_convulsion')
    for f in range(0, 37, 3):
        decay = max(0.0, 1.0 - f / 36.0)
        droop = (1.0 - decay) * 0.16
        for i, name in enumerate(animated):
            key(arm.pose.bones[name], f, Euler((
                math.sin(f * 2.5 + i) * 0.30 * decay + droop,
                0,
                math.cos(f * 3.1 + i) * 0.30 * decay,
            )))

    arm.animation_data.action = None
    for action in (idle, coil, strike, sever):
        track = arm.animation_data.nla_tracks.new()
        track.name = action.name
        track.strips.new(action.name, 0, action)
        track.mute = True
    for pb in arm.pose.bones:
        pb.rotation_euler = Euler((0, 0, 0))
    bpy.ops.object.mode_set(mode='OBJECT')

    print(f'Exporting {OUT_GLB}...')
    bpy.ops.export_scene.gltf(
        filepath=OUT_GLB,
        export_format='GLB',
        export_apply=False,
        export_animations=True,
        export_animation_mode='NLA_TRACKS',
        export_cameras=False,
        export_lights=False,
        export_skins=True,
        export_morph=False,
        export_optimize_animation_size=True,
        export_optimize_animation_keep_anim_armature=False,
    )
    print(f'-> {os.path.getsize(OUT_GLB) / (1024 * 1024):.2f} MB')


if __name__ == '__main__':
    build_rigged_tentacle()
