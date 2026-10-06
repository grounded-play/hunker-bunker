"""Rig the Mycelium Stalker quadruped and author its idle/walk/run clips.

    blender -b -P scripts/blender/rig_quadruped_stalker.py -- <stalker_static.glb> <out.glb>

The owner-supplied `Mycelium Stalker Quadruped.glb` (art/raw/incoming_3d_20261001)
is a single unrigged mesh, head toward -X, feet on z=0, about 1 m long. This
builds the canine skeleton from the 2026-10-01 rigging plan (spine, neck, head,
jaw, two 4-bone forelegs, two 4-bone hind legs), binds the mesh with automatic
weights, and keys three looping clips procedurally:

- idle: breathing spine, head sway, jaw twitch (2.4 s)
- walk: 4-beat lateral-sequence stalk (1.1 s)
- run: rotary gallop with spine flexion, for the Bio-Charger ram (0.55 s)

The game's enemy overlay blends idle and the travel clip by ground speed
(src/enemy3dOverlay.js). Joint positions were measured from the mesh (foot
clusters, leg cross-sections at z=0.15, torso profile); they are specific to
this mesh, not a general quadruped tool.
"""
import math
import sys

import bpy
from mathutils import Matrix, Quaternion, Vector

argv = sys.argv[sys.argv.index('--') + 1:]
src_path, out_path = argv[:2]
FPS = 30

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.scene.render.fps = FPS
bpy.ops.import_scene.gltf(filepath=src_path)
meshes = [o for o in bpy.data.objects if o.type == 'MESH']
for m in meshes:
    bpy.ops.object.select_all(action='DESELECT')
    m.select_set(True)
    bpy.context.view_layer.objects.active = m
    bpy.ops.object.parent_clear(type='CLEAR_KEEP_TRANSFORM')
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
for o in list(bpy.data.objects):
    if o.type != 'MESH':
        bpy.data.objects.remove(o, do_unlink=True)
bpy.ops.object.select_all(action='DESELECT')
for m in meshes:
    m.select_set(True)
bpy.context.view_layer.objects.active = meshes[0]
if len(meshes) > 1:
    bpy.ops.object.join()
body = bpy.context.view_layer.objects.active
body.name = 'StalkerBody'

# Joint positions (metres, Blender space). Left = +Y.
V = Vector
CHAIN = {
    'Root': (V((0.15, 0.02, 0.0)), V((0.15, 0.02, 0.12)), None),
    'Pelvis': (V((0.32, 0.02, 0.42)), V((0.18, 0.02, 0.45)), 'Root'),
    'Spine_01': (V((0.18, 0.02, 0.45)), V((0.02, 0.02, 0.47)), 'Pelvis'),
    'Spine_02': (V((0.02, 0.02, 0.47)), V((-0.14, 0.02, 0.48)), 'Spine_01'),
    'Chest': (V((-0.14, 0.02, 0.48)), V((-0.26, 0.0, 0.50)), 'Spine_02'),
    'Neck': (V((-0.26, 0.0, 0.50)), V((-0.36, -0.03, 0.48)), 'Chest'),
    'Head': (V((-0.36, -0.03, 0.48)), V((-0.50, -0.05, 0.42)), 'Neck'),
    'Jaw': (V((-0.38, -0.04, 0.38)), V((-0.50, -0.06, 0.28)), 'Head'),
}
LEGS = {
    # side: (y, front paw x, hind paw x)
    'L': (0.165, -0.133, 0.326),
    'R': (-0.125, -0.105, 0.419),
}
for side, (y, fx, hx) in LEGS.items():
    CHAIN[f'Clavicle_{side}'] = (V((-0.14, 0.02, 0.46)), V((-0.15, y, 0.42)), 'Chest')
    CHAIN[f'Shoulder_{side}'] = (V((-0.15, y, 0.42)), V((-0.03, y, 0.25)), f'Clavicle_{side}')
    CHAIN[f'Elbow_{side}'] = (V((-0.03, y, 0.25)), V((fx + 0.06, y, 0.07)), f'Shoulder_{side}')
    CHAIN[f'Wrist_{side}'] = (V((fx + 0.06, y, 0.07)), V((fx + 0.02, y, 0.02)), f'Elbow_{side}')
    CHAIN[f'Paw_{side}'] = (V((fx + 0.02, y, 0.02)), V((fx - 0.06, y, 0.0)), f'Wrist_{side}')
    CHAIN[f'Hip_{side}'] = (V((0.32, 0.02, 0.42)), V((0.28, y, 0.40)), 'Pelvis')
    CHAIN[f'Femur_{side}'] = (V((0.28, y, 0.40)), V((hx - 0.10, y, 0.25)), f'Hip_{side}')
    CHAIN[f'Knee_{side}'] = (V((hx - 0.10, y, 0.25)), V((hx + 0.04, y, 0.12)), f'Femur_{side}')
    CHAIN[f'Hock_{side}'] = (V((hx + 0.04, y, 0.12)), V((hx, y, 0.02)), f'Knee_{side}')
    CHAIN[f'Paw_Back_{side}'] = (V((hx, y, 0.02)), V((hx - 0.07, y, 0.0)), f'Hock_{side}')

arm_data = bpy.data.armatures.new('StalkerRig')
arm = bpy.data.objects.new('StalkerRig', arm_data)
bpy.context.scene.collection.objects.link(arm)
bpy.context.view_layer.objects.active = arm
bpy.ops.object.mode_set(mode='EDIT')
for name, (head, tail, parent) in CHAIN.items():
    eb = arm_data.edit_bones.new(name)
    eb.head, eb.tail = head, tail
    eb.roll = 0
    if parent:
        eb.parent = arm_data.edit_bones[parent]
        eb.use_connect = (eb.head - eb.parent.tail).length < 1e-5
# The root is a ground handle, not a deformer.
arm_data.edit_bones['Root'].use_deform = False
for side in LEGS:
    arm_data.edit_bones[f'Clavicle_{side}'].use_deform = False
    arm_data.edit_bones[f'Hip_{side}'].use_deform = False
bpy.ops.object.mode_set(mode='OBJECT')

# Bind with automatic (bone heat) weights. Heat weighting fails outright on
# this mesh (many loose, intersecting shells), so it runs on a voxel-remeshed,
# watertight proxy and the weights are transferred to the real mesh.
proxy = body.copy()
proxy.data = body.data.copy()
proxy.name = 'WeightProxy'
bpy.context.scene.collection.objects.link(proxy)
remesh = proxy.modifiers.new('Remesh', 'REMESH')
remesh.mode = 'VOXEL'
remesh.voxel_size = 0.008
bpy.ops.object.select_all(action='DESELECT')
proxy.select_set(True)
bpy.context.view_layer.objects.active = proxy
bpy.ops.object.modifier_apply(modifier=remesh.name)
proxy.vertex_groups.clear()
bpy.ops.object.select_all(action='DESELECT')
proxy.select_set(True)
arm.select_set(True)
bpy.context.view_layer.objects.active = arm
bpy.ops.object.parent_set(type='ARMATURE_AUTO')
proxy_missed = sum(1 for v in proxy.data.vertices if not v.groups)
print(f'[stalker] proxy vertices={len(proxy.data.vertices)} heat-missed={proxy_missed}')

body.vertex_groups.clear()
for vg in proxy.vertex_groups:
    body.vertex_groups.new(name=vg.name)
bpy.ops.object.select_all(action='DESELECT')
body.select_set(True)
bpy.context.view_layer.objects.active = body
dt = body.modifiers.new('WeightTransfer', 'DATA_TRANSFER')
dt.object = proxy
dt.use_vert_data = True
dt.data_types_verts = {'VGROUP_WEIGHTS'}
dt.vert_mapping = 'POLYINTERP_NEAREST'
dt.layers_vgroup_select_src = 'ALL'
dt.layers_vgroup_select_dst = 'NAME'
bpy.ops.object.modifier_apply(modifier=dt.name)
bpy.data.objects.remove(proxy, do_unlink=True)
body.parent = arm
body.matrix_parent_inverse = arm.matrix_world.inverted()
arm_mod = body.modifiers.new('Armature', 'ARMATURE')
arm_mod.object = arm


def segment_distance(p, a, b):
    ab = b - a
    t = max(0.0, min(1.0, (p - a).dot(ab) / max(ab.length_squared, 1e-9)))
    return (p - (a + ab * t)).length


# Anything the proxy still missed goes to its nearest deforming bone.
deform = [b for b in arm_data.bones if b.use_deform]
groups = {vg.name: vg for vg in body.vertex_groups}
for b in deform:
    if b.name not in groups:
        groups[b.name] = body.vertex_groups.new(name=b.name)
fixed = 0
for v in body.data.vertices:
    if any(g.weight > 1e-4 for g in v.groups):
        continue
    p = v.co
    best = min(deform, key=lambda b: segment_distance(p, b.head_local, b.tail_local))
    groups[best.name].add([v.index], 1.0, 'REPLACE')
    fixed += 1
bpy.context.view_layer.objects.active = body
bpy.ops.object.mode_set(mode='WEIGHT_PAINT')
bpy.ops.object.vertex_group_limit_total(group_select_mode='ALL', limit=4)
bpy.ops.object.vertex_group_normalize_all(group_select_mode='ALL', lock_active=False)
bpy.ops.object.mode_set(mode='OBJECT')
unweighted = sum(1 for v in body.data.vertices if not any(g.weight > 1e-4 for g in v.groups))
print(f'[stalker] vertices={len(body.data.vertices)} nearest-fallback={fixed} unweighted={unweighted} bones={len(arm_data.bones)}')

# ---------------------------------------------------------------------------
# Clips. Every rotation is about the armature's sideways axis (Y: pitch in the
# sagittal plane) or forward axis (X: roll), conjugated into each bone's rest
# frame so the angle means the same thing on every bone.

def local_rot(bone_name, axis, angle):
    rest = arm_data.bones[bone_name].matrix_local.to_3x3()
    world = Matrix.Rotation(angle, 3, axis)
    return (rest.inverted() @ world @ rest).to_quaternion()


def compose(*qs):
    out = Quaternion()
    for q in qs:
        out = out @ q
    return out


TAU = math.pi * 2
LEG_SIDES = ('L', 'R')


def leg_pose(prefix, side, phase, amp, lift, front):
    """Swing about Y (positive = paw forward, i.e. toward -X) and lift during swing."""
    swing = math.sin(TAU * phase)
    # Swing forward while the leg is in the air; lift = bend in the lower joints.
    airborne = max(0.0, math.cos(TAU * phase))
    if front:
        return {
            f'Shoulder_{side}': local_rot(f'Shoulder_{side}', 'Y', -amp * swing),
            f'Elbow_{side}': local_rot(f'Elbow_{side}', 'Y', lift * airborne),
            f'Wrist_{side}': local_rot(f'Wrist_{side}', 'Y', -0.6 * lift * airborne),
        }
    return {
        f'Femur_{side}': local_rot(f'Femur_{side}', 'Y', -amp * swing),
        f'Knee_{side}': local_rot(f'Knee_{side}', 'Y', -lift * airborne),
        f'Hock_{side}': local_rot(f'Hock_{side}', 'Y', 0.7 * lift * airborne),
    }


def idle_pose(t):
    breath = math.sin(TAU * t)
    sway = math.sin(TAU * t + 1.1)
    twitch = max(0.0, math.sin(TAU * t * 2 + 0.4)) ** 6
    return {
        'Spine_01': local_rot('Spine_01', 'Y', 0.025 * breath),
        'Spine_02': local_rot('Spine_02', 'Y', -0.03 * breath),
        'Chest': local_rot('Chest', 'Y', 0.02 * breath),
        'Neck': compose(local_rot('Neck', 'Y', 0.06 * breath), local_rot('Neck', 'Z', 0.08 * sway)),
        'Head': local_rot('Head', 'Z', 0.06 * sway),
        'Jaw': local_rot('Jaw', 'Y', -0.18 * twitch),
    }


def gait_pose(t, phases, amp, lift, spine_flex, head_bob):
    pose = {}
    for side in LEG_SIDES:
        pose.update(leg_pose('front', side, t + phases[f'F{side}'], amp, lift, True))
        pose.update(leg_pose('hind', side, t + phases[f'H{side}'], amp, lift, False))
    flex = math.sin(TAU * t * 2 if spine_flex[1] == 2 else TAU * t)
    pose['Spine_01'] = local_rot('Spine_01', 'Y', spine_flex[0] * flex)
    pose['Spine_02'] = local_rot('Spine_02', 'Y', -spine_flex[0] * flex)
    pose['Chest'] = local_rot('Chest', 'Y', 0.5 * spine_flex[0] * flex)
    pose['Neck'] = local_rot('Neck', 'Y', head_bob * math.sin(TAU * t * 2 + 0.6))
    pose['Head'] = local_rot('Head', 'Y', -0.6 * head_bob * math.sin(TAU * t * 2 + 0.6))
    pose['Jaw'] = local_rot('Jaw', 'Y', -0.08 - 0.06 * math.sin(TAU * t * 2))
    return pose


CLIPS = {
    'idle': (2.4, idle_pose),
    # 4-beat lateral sequence: LH, LF, RH, RF a quarter cycle apart.
    'walk': (1.1, lambda t: gait_pose(t, {'HL': 0.0, 'FL': 0.25, 'HR': 0.5, 'FR': 0.75}, 0.34, 0.55, (0.03, 2), 0.05)),
    # Rotary gallop: fore pair then hind pair, leads offset, strong spine flex.
    'run': (0.55, lambda t: gait_pose(t, {'FL': 0.0, 'FR': 0.1, 'HR': 0.5, 'HL': 0.6}, 0.5, 0.8, (0.12, 1), 0.09)),
}

pose_bones = arm.pose.bones
for pb in pose_bones:
    pb.rotation_mode = 'QUATERNION'
arm.animation_data_create()
for name, (duration, pose_fn) in CLIPS.items():
    action = bpy.data.actions.new(name)
    action.use_fake_user = True
    arm.animation_data.action = action
    frames = max(2, round(duration * FPS))
    for f in range(frames + 1):
        t = f / frames
        pose = pose_fn(t)
        for pb in pose_bones:
            pb.rotation_quaternion = pose.get(pb.name, Quaternion())
            pb.keyframe_insert('rotation_quaternion', frame=f + 1, group=pb.name)
    track = arm.animation_data.nla_tracks.new()
    track.name = name
    track.strips.new(name, 1, action)
    arm.animation_data.action = None

for pb in pose_bones:
    pb.rotation_quaternion = Quaternion()

bpy.ops.object.select_all(action='DESELECT')
arm.select_set(True)
body.select_set(True)
bpy.ops.export_scene.gltf(
    filepath=out_path, export_format='GLB', use_selection=True,
    export_skins=True, export_animations=True, export_animation_mode='NLA_TRACKS',
    export_apply=False
)
print('[stalker] wrote', out_path, 'clips', list(CLIPS))
