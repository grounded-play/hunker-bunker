"""Rig a static humanoid GLB onto a Mixamo skeleton by weight transfer.

    blender -b -P scripts/blender/rig_by_weight_transfer.py -- \
        <target_static.glb> <reference_rigged.glb> <out.glb>

The target (an unrigged T-pose character) is scaled to the reference body's
height and stood on the same ground and centre line. The reference's skin
weights are copied by nearest-surface interpolation (Data Transfer), the
target is bound to the reference armature, and the reference mesh is dropped.
The output carries the reference's Mixamo skeleton (and its one clip), so the
game's existing retargeting animates it like any community chassis.

Used for the 2026-10-01 incoming models (Ghost Runner, corrupted Kaelen).
"""
import sys
import bpy
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:]
target_path, reference_path, out_path = argv[:3]

bpy.ops.wm.read_factory_settings(use_empty=True)


def import_glb(path):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    return [o for o in bpy.data.objects if o not in before]


def world_bbox(objects):
    pts = [o.matrix_world @ Vector(c) for o in objects for c in o.bound_box]
    lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    return lo, hi


def join_meshes(meshes, name):
    bpy.ops.object.select_all(action='DESELECT')
    for m in meshes:
        m.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    if len(meshes) > 1:
        bpy.ops.object.join()
    joined = bpy.context.view_layer.objects.active
    joined.name = name
    return joined


ref_objects = import_glb(reference_path)
armature = next(o for o in ref_objects if o.type == 'ARMATURE')
armature.data.pose_position = 'REST'
# Only skinned body meshes carry weights; Mixamo exports also leave a stray,
# unweighted Icosphere, which is discarded.
ref_meshes = [o for o in ref_objects if o.type == 'MESH' and len(o.vertex_groups) > 0]
for stray in [o for o in ref_objects if o.type == 'MESH' and len(o.vertex_groups) == 0]:
    bpy.data.objects.remove(stray, do_unlink=True)
bpy.context.view_layer.update()

target_objects = import_glb(target_path)
target_meshes = [o for o in target_objects if o.type == 'MESH']
# Bake the importer's parent transforms into the mesh, then drop the empties.
for m in target_meshes:
    bpy.ops.object.select_all(action='DESELECT')
    m.select_set(True)
    bpy.context.view_layer.objects.active = m
    bpy.ops.object.parent_clear(type='CLEAR_KEEP_TRANSFORM')
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
for o in target_objects:
    if o.type != 'MESH':
        bpy.data.objects.remove(o, do_unlink=True)
target = join_meshes(target_meshes, 'Body')

# Fit the target to the reference body: same height, feet on the same ground,
# same centre line. Both are T-pose humanoids facing the same way.
ref_lo, ref_hi = world_bbox(ref_meshes)
tgt_lo, tgt_hi = world_bbox([target])
scale = (ref_hi.z - ref_lo.z) / max(1e-6, (tgt_hi.z - tgt_lo.z))
target.scale = (scale, scale, scale)
bpy.context.view_layer.update()
tgt_lo, tgt_hi = world_bbox([target])
ref_c = (ref_lo + ref_hi) / 2
tgt_c = (tgt_lo + tgt_hi) / 2
target.location += Vector((ref_c.x - tgt_c.x, ref_c.y - tgt_c.y, ref_lo.z - tgt_lo.z))
bpy.ops.object.select_all(action='DESELECT')
target.select_set(True)
bpy.context.view_layer.objects.active = target
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

# Reference source mesh for weights: all reference body parts in rest pose.
for m in ref_meshes:
    for mod in list(m.modifiers):
        if mod.type == 'ARMATURE':
            m.modifiers.remove(mod)
source = join_meshes(ref_meshes, 'WeightSource')

# Same vertex groups (bone names) on the target, then copy weights.
for vg in source.vertex_groups:
    if vg.name not in target.vertex_groups:
        target.vertex_groups.new(name=vg.name)
bpy.ops.object.select_all(action='DESELECT')
target.select_set(True)
bpy.context.view_layer.objects.active = target
dt = target.modifiers.new('WeightTransfer', 'DATA_TRANSFER')
dt.object = source
dt.use_vert_data = True
dt.data_types_verts = {'VGROUP_WEIGHTS'}
dt.vert_mapping = 'POLYINTERP_NEAREST'
dt.layers_vgroup_select_src = 'ALL'
dt.layers_vgroup_select_dst = 'NAME'
bpy.ops.object.modifier_apply(modifier=dt.name)

# Keep the four strongest influences per vertex (glTF skinning), normalized.
bpy.ops.object.vertex_group_limit_total(group_select_mode='ALL', limit=4)
bpy.ops.object.vertex_group_normalize_all(group_select_mode='ALL', lock_active=False)

bpy.data.objects.remove(source, do_unlink=True)
target.parent = armature
target.matrix_parent_inverse = armature.matrix_world.inverted()
arm_mod = target.modifiers.new('Armature', 'ARMATURE')
arm_mod.object = armature
armature.data.pose_position = 'POSE'

unweighted = sum(1 for v in target.data.vertices if not v.groups)
print(f'[rig] vertices={len(target.data.vertices)} unweighted={unweighted} bones={len(armature.data.bones)}')

bpy.ops.object.select_all(action='DESELECT')
armature.select_set(True)
target.select_set(True)
bpy.ops.export_scene.gltf(
    filepath=out_path, export_format='GLB', use_selection=True,
    export_skins=True, export_animations=True, export_apply=False
)
print('[rig] wrote', out_path)
