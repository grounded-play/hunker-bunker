"""Skin Mayor Tina to the Scout/Mixamo skeleton used by player locomotion.

Run from the repository root with:
    /snap/bin/blender -b -P scripts/blender/rig_mayor_tina.py

The game plays the Scout locomotion pack on this rig by copying each bone's
local rotation (player3dOverlay.retargetMixamoClip keeps quaternion tracks
only). So the rig must keep every Scout bone's rest ORIENTATION exactly; only
bone positions may change. This script:

1. Imports the Scout skeleton as-is (upright, front -Y) and drops its meshes.
2. Moves each joint into Tina's body (a 1.12 m upright roach in a T-pose),
   preserving each bone's rest rotation, and checks the exported rest
   rotations against Scout.game.glb.
3. Weights by surface (geodesic) distance from seed regions per bone, on the
   welded mesh. Tina is one connected surface: her inner legs touch the
   abdomen but join the body only at the waist, so straight-line proximity
   would glue abdomen to legs while surface distance does not.

Her second (outer) leg pair hangs on two extra bones, TinaMidLegLeft/Right,
pivoting at the outer legs' own roots. The clips never name them; each
carries an `hbFollow` extra, and player3dOverlay copies the named thigh's
rotation onto it every frame, so the outer legs stride with the thighs
without shearing their roots through the body. The wings follow the upper
spine; the skirt and abdomen follow the hips.

An earlier version rotated the skeleton 90 degrees onto its back while the
mesh stood upright, which skinned every vertex to a leg or toe bone.
"""

import heapq
import json
import math
import os
import struct

import bpy
from mathutils import Matrix, Vector


ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
MAYOR_SOURCE = os.path.join(ROOT, 'public', '3d', 'runtime', 'secrets', 'mayor-tina.glb')
SCOUT_SOURCE = os.path.join(ROOT, 'public', '3d', 'scouting-scout', 'Scout.game.glb')
OUTPUT = os.path.join(ROOT, 'public', '3d', 'runtime', 'secrets', 'mayor-tina-rigged.glb')

PREFIX = 'mixamorig1:'
BLEND = 0.012        # metres of surface over which neighbouring limb bones blend
# The spine, neck and head each turn a little in every clip; blending them
# over a wider band spreads that turn instead of shearing one seam.
AXIAL_BLEND = 0.035
AXIAL = {'Hips', 'Spine', 'Spine1', 'Spine2', 'Neck', 'Head'}
MAX_INFLUENCES = 3

# Joint pivots in Tina's space (Blender world: Z up, front -Y, Left = +X),
# from gridded front/side renders and slice centroids of mayor-tina.glb.
JOINTS = {
    'Hips': (0.0, -0.02, 0.60),
    'Spine': (0.0, -0.03, 0.64),
    'Spine1': (0.0, -0.03, 0.71),
    'Spine2': (0.0, -0.03, 0.78),
    'Neck': (0.0, -0.05, 0.89),
    'Head': (0.0, -0.06, 0.94),
    'HeadTop_End': (0.0, -0.06, 1.10),
}
SIDED_JOINTS = {
    'Shoulder': (0.05, -0.02, 0.87),
    'UpLeg': (0.085, -0.035, 0.60),
    'Leg': (0.145, -0.045, 0.40),
    'Foot': (0.13, -0.025, 0.06),
    'ToeBase': (0.135, -0.06, 0.015),
}
# The arms are not mirror images: her right forearm angles forward to hold
# the syringe.
# Outer (middle) leg roots: (name, followed thigh, head). Children of Hips
# with the thigh's rest orientation, so copying its local rotation swings
# them the same way about their own root.
MID_LEGS = [
    ('TinaMidLegLeft', 'LeftUpLeg', (0.155, -0.005, 0.54)),
    ('TinaMidLegRight', 'RightUpLeg', (-0.155, -0.005, 0.54)),
]
ARM_JOINTS = {
    'LeftArm': (0.13, 0.0, 0.875),
    'LeftForeArm': (0.255, 0.01, 0.83),
    'LeftHand': (0.36, -0.035, 0.82),
    'RightArm': (-0.13, 0.02, 0.86),
    'RightForeArm': (-0.25, -0.015, 0.825),
    'RightHand': (-0.36, -0.09, 0.825),
}


def box(xr=(-9, 9), yr=(-9, 9), zr=(-9, 9)):
    def test(p, side):
        x = p.x * side  # centre seeds pass side=1
        return xr[0] <= x <= xr[1] and yr[0] <= p.y <= yr[1] and zr[0] <= p.z <= zr[1]
    return test


def capsule(a, b, radius, yr=None, xz_only=False, absolute=False):
    a = Vector(a)
    b = Vector(b)

    def test(p, side):
        q = Vector((p.x if absolute else p.x * side, p.y, p.z))
        if yr and not (yr[0] <= q.y <= yr[1]):
            return False
        aa, bb = a.copy(), b.copy()
        if xz_only:
            q.y = aa.y = bb.y = 0.0
        seg = bb - aa
        t = max(0.0, min(1.0, (q - aa).dot(seg) / seg.length_squared))
        return (q - (aa + seg * t)).length <= radius
    return test


# Seeds per bone, in priority order (a vertex seeds the first bone it fits).
# Sided seeds are written for Left (+X) and mirrored for Right.
CENTRE_SEEDS = [
    ('Head', [box((-0.10, 0.10), (-0.30, -0.04), (0.95, 1.20))]),
    ('Neck', [box((-0.05, 0.05), (-0.30, -0.02), (0.885, 0.94))]),
    ('Spine2', [box((-0.10, 0.10), (-0.30, -0.02), (0.77, 0.87)),
                box((-0.30, 0.30), (0.06, 0.30), (0.45, 0.95)),     # wings
                box((-0.30, 0.30), (0.075, 0.30), (0.05, 0.45))]),  # wing tips, behind the abdomen
    ('Spine1', [box((-0.08, 0.08), (-0.30, -0.03), (0.69, 0.77))]),
    ('Spine', [box((-0.06, 0.06), (-0.30, -0.03), (0.62, 0.69))]),
    ('Hips', [box((-0.08, 0.08), (-0.00, 0.30), (0.12, 0.50)),      # abdomen
              # abdomen front and flanks; the left thigh is fused to it, and
              # without these the thigh's weight floods the belly plates
              box((-0.125, 0.125), (-0.02, 0.30), (0.12, 0.52)),
              box((-0.05, 0.05), (-0.30, -0.04), (0.25, 0.60)),     # skirt
              # waist sides between the thigh and outer-leg roots: each
              # root blends into the hips, not into the other leg
              box((0.105, 0.16), (-0.03, 0.04), (0.53, 0.64)),
              box((-0.16, -0.105), (-0.03, 0.04), (0.53, 0.64))]),
]
SIDED_SEEDS = [
    ('Hand', [box((0.37, 9), (-9, 9), (0.60, 1.00))]),
    ('Foot', [capsule((0.13, -0.025, 0.055), (0.137, -0.06, 0.005), 0.035)]),
    # Shin and thigh tubes at the measured leg radius (spines included):
    # limbs seed before the torso, so the whole leg must sit inside them.
    ('Leg', [capsule((0.145, -0.044, 0.39), (0.154, -0.037, 0.34), 0.034),
             capsule((0.154, -0.037, 0.34), (0.147, -0.027, 0.28), 0.034),
             capsule((0.147, -0.027, 0.28), (0.118, -0.025, 0.20), 0.034),
             capsule((0.118, -0.025, 0.20), (0.13, -0.024, 0.075), 0.034)]),
    ('UpLeg', [capsule((0.09, -0.04, 0.585), (0.145, -0.044, 0.415), 0.03)]),
]
MID_LEG_SEEDS = [
    capsule((0.17, 0.0, 0.55), (0.235, -0.016, 0.46), 0.03, yr=(-0.30, 0.03)),
    capsule((0.235, -0.016, 0.46), (0.216, -0.016, 0.28), 0.03),
    capsule((0.216, -0.016, 0.28), (0.248, -0.016, 0.125), 0.03),
    capsule((0.248, -0.016, 0.125), (0.266, -0.016, 0.02), 0.03),
]
ARM_SEEDS = [
    ('LeftForeArm', [capsule((0.27, 0.005, 0.83), (0.35, -0.03, 0.822), 0.032, yr=(-0.30, 0.05), absolute=True)]),
    ('LeftArm', [capsule((0.14, 0.01, 0.87), (0.24, 0.012, 0.835), 0.032, yr=(-0.30, 0.05), absolute=True)]),
    ('RightForeArm', [capsule((-0.27, -0.025, 0.822), (-0.35, -0.08, 0.825), 0.036, yr=(-0.30, 0.05), absolute=True)]),
    ('RightArm', [capsule((-0.14, 0.025, 0.85), (-0.24, -0.005, 0.83), 0.032, yr=(-0.30, 0.05), absolute=True)]),
]


def import_glb(path):
    before = set(bpy.context.scene.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    return [obj for obj in bpy.context.scene.objects if obj not in before]


def joint_targets():
    targets = {PREFIX + name: Vector(p) for name, p in JOINTS.items()}
    for name, (x, y, z) in SIDED_JOINTS.items():
        targets[f'{PREFIX}Left{name}'] = Vector((x, y, z))
        targets[f'{PREFIX}Right{name}'] = Vector((-x, y, z))
    for name, p in ARM_JOINTS.items():
        targets[PREFIX + name] = Vector(p)
    return targets


def fit_skeleton(armature):
    """Move joints into Tina, keeping every bone's rest rotation."""
    targets = joint_targets()
    to_local = armature.matrix_world.inverted()
    bpy.context.view_layer.objects.active = armature
    bpy.ops.object.mode_set(mode='EDIT')
    bones = armature.data.edit_bones
    old = {b.name: (b.matrix.copy(), b.length) for b in bones}
    scout_top = (armature.matrix_world @ old[PREFIX + 'HeadTop_End'][0].translation).z
    scale = targets[PREFIX + 'HeadTop_End'].z / scout_top
    for b in bones:
        b.use_connect = False

    new_heads = {}

    def place(bone):
        if bone.name in targets:
            head = to_local @ targets[bone.name]
        else:
            # Unlisted bones (fingers, end effectors) keep their offset from
            # the parent's joint, scaled to Tina.
            parent = bone.parent
            head = new_heads[parent.name] + (old[bone.name][0].translation - old[parent.name][0].translation) * scale
        new_heads[bone.name] = head
        rotation, length = old[bone.name]
        bone.matrix = Matrix.Translation(head) @ rotation.to_3x3().to_4x4()
        bone.length = length * scale
        for child in bone.children:
            place(child)

    for bone in [b for b in bones if b.parent is None]:
        place(bone)
    for name, thigh, head in MID_LEGS:
        source = bones[PREFIX + thigh]
        follower = bones.new(name)
        follower.parent = bones[PREFIX + 'Hips']
        # Head, tail and roll rather than .matrix: a new bone has zero length
        # and drops an assigned matrix's orientation.
        follower.head = to_local @ Vector(head)
        follower.tail = follower.head + (source.tail - source.head)
        follower.roll = source.roll
        follower.use_deform = True
    bpy.ops.object.mode_set(mode='OBJECT')
    for name, thigh, _head in MID_LEGS:
        armature.data.bones[name]['hbFollow'] = PREFIX + thigh
    print(f'[mayor-tina-rig] skeleton scale {scale:.3f}')


def weld(mesh):
    """Map every vertex to a welded position id and build its surface graph."""
    key_to_id = {}
    vid = []
    positions = []
    for v in mesh.data.vertices:
        p = mesh.matrix_world @ v.co
        key = (round(p.x, 5), round(p.y, 5), round(p.z, 5))
        if key not in key_to_id:
            key_to_id[key] = len(positions)
            positions.append(p)
        vid.append(key_to_id[key])
    adjacency = [dict() for _ in positions]
    for e in mesh.data.edges:
        a, b = vid[e.vertices[0]], vid[e.vertices[1]]
        if a == b:
            continue
        d = (positions[a] - positions[b]).length
        adjacency[a][b] = d
        adjacency[b][a] = d
    return vid, positions, adjacency


def geodesic(adjacency, sources):
    dist = [math.inf] * len(adjacency)
    heap = []
    for s in sources:
        dist[s] = 0.0
        heap.append((0.0, s))
    heapq.heapify(heap)
    while heap:
        d, u = heapq.heappop(heap)
        if d > dist[u]:
            continue
        for v, w in adjacency[u].items():
            nd = d + w
            if nd < dist[v]:
                dist[v] = nd
                heapq.heappush(heap, (nd, v))
    return dist


def seed_sets(positions):
    rules = [(PREFIX + name, tests, 1) for name, tests in CENTRE_SEEDS]
    for name, tests in SIDED_SEEDS:
        rules.append((f'{PREFIX}Left{name}', tests, 1))
        rules.append((f'{PREFIX}Right{name}', tests, -1))
    for name, tests in ARM_SEEDS:
        rules.append((PREFIX + name, tests, 1 if name.startswith('Left') else -1))
    for name, _thigh, _head in MID_LEGS:
        rules.append((name, MID_LEG_SEEDS, 1 if name.endswith('Left') else -1))
    # Sided rules first: limbs are thin and must win over the torso boxes.
    rules.sort(key=lambda r: 0 if ('Left' in r[0] or 'Right' in r[0]) else 1)
    seeds = {name: [] for name, _, _ in rules}
    for i, p in enumerate(positions):
        side_of_p = 1 if p.x >= 0 else -1
        for name, tests, side in rules:
            if side != side_of_p and ('Left' in name or 'Right' in name):
                continue
            if any(t(p, side) for t in tests):
                seeds[name].append(i)
                break
    return seeds


def blend_width(bone_name):
    return AXIAL_BLEND if bone_name.split(':')[-1] in AXIAL else BLEND


def bind_geodesic(mesh, armature):
    vid, positions, adjacency = weld(mesh)
    seeds = seed_sets(positions)
    for name, ids in seeds.items():
        print(f'[mayor-tina-rig] seeds {name}: {len(ids)}')
        if not ids:
            raise RuntimeError(f'no seed vertices for {name}')
    distances = {name: geodesic(adjacency, ids) for name, ids in seeds.items()}

    for group in list(mesh.vertex_groups):
        mesh.vertex_groups.remove(group)
    groups = {b.name: mesh.vertex_groups.new(name=b.name) for b in armature.data.bones if b.use_deform}
    names = list(distances)
    unreached = 0
    welded_weights = []
    for i in range(len(positions)):
        ds = sorted(((distances[n][i], n) for n in names))
        if not math.isfinite(ds[0][0]):
            unreached += 1
            ds = [(0.0, PREFIX + 'Hips')]
        best, best_name = ds[0]
        picks = []
        for d, n in ds[:MAX_INFLUENCES]:
            tau = max(blend_width(n), blend_width(best_name))
            if d - best < 4 * tau:
                picks.append((math.exp(-(d - best) / tau), n))
        total = sum(w for w, _ in picks)
        welded_weights.append([(w / total, n) for w, n in picks])
    for v in mesh.data.vertices:
        for w, n in welded_weights[vid[v.index]]:
            groups[n].add([v.index], w, 'REPLACE')
    print(f'[mayor-tina-rig] welded points {len(positions)}; unreached {unreached}')

    mesh.parent = armature
    mesh.matrix_parent_inverse = armature.matrix_world.inverted()
    modifier = mesh.modifiers.new(name='MayorTinaArmature', type='ARMATURE')
    modifier.object = armature


def glb_rest_rotations(path):
    with open(path, 'rb') as handle:
        data = handle.read()
    length = struct.unpack('<I', data[12:16])[0]
    doc = json.loads(data[20:20 + length])
    joints = {i for skin in doc.get('skins', []) for i in skin['joints']}
    return {doc['nodes'][i]['name']: doc['nodes'][i].get('rotation', [0, 0, 0, 1]) for i in joints}


def glb_follow_extras(path):
    with open(path, 'rb') as handle:
        data = handle.read()
    length = struct.unpack('<I', data[12:16])[0]
    doc = json.loads(data[20:20 + length])
    return {n['name']: n['extras']['hbFollow'] for n in doc['nodes'] if 'hbFollow' in n.get('extras', {})}


def check_rest_rotations():
    scout = glb_rest_rotations(SCOUT_SOURCE)
    tina = glb_rest_rotations(OUTPUT)
    worst = 0.0
    followers = {name: PREFIX + thigh for name, thigh, _head in MID_LEGS}
    for name, q in tina.items():
        if name in followers:
            if followers[name] not in tina:
                raise RuntimeError(f'{name} follows a missing bone')
            # A follower must rest exactly like the thigh it copies.
            name = followers[name]
        if name not in scout:
            raise RuntimeError(f'{name} is not a Scout bone')
        r = scout[name]
        dot = abs(sum(a * b for a, b in zip(q, r)))
        worst = max(worst, 1.0 - min(1.0, dot))
    print(f'[mayor-tina-rig] rest rotations vs Scout: {len(tina)} bones, worst 1-|dot| {worst:.2e}')
    if worst > 1e-5:
        raise RuntimeError('rest rotations drifted from the Scout skeleton; locomotion would retarget wrong')


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)

    scout_objects = import_glb(SCOUT_SOURCE)
    armature = next(obj for obj in scout_objects if obj.type == 'ARMATURE')
    if armature.animation_data:
        armature.animation_data_clear()
    for obj in scout_objects:
        if obj is not armature:
            bpy.data.objects.remove(obj, do_unlink=True)

    mayor_objects = import_glb(MAYOR_SOURCE)
    mayor_meshes = [obj for obj in mayor_objects if obj.type == 'MESH']
    if not mayor_meshes:
        raise RuntimeError('Mayor Tina source contains no mesh')
    bpy.ops.object.select_all(action='DESELECT')
    for obj in mayor_meshes:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = mayor_meshes[0]
    if len(mayor_meshes) > 1:
        bpy.ops.object.join()
    mayor = bpy.context.active_object
    mayor.name = 'MayorTina'
    bpy.ops.object.parent_clear(type='CLEAR_KEEP_TRANSFORM')
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

    fit_skeleton(armature)
    bind_geodesic(mayor, armature)

    armature.name = 'MayorTinaRig'
    armature.data.name = 'MayorTinaRig'
    bpy.ops.object.select_all(action='DESELECT')
    mayor.select_set(True)
    armature.select_set(True)
    bpy.context.view_layer.objects.active = armature
    os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=OUTPUT,
        export_format='GLB',
        use_selection=True,
        export_apply=False,
        export_animations=False,
        export_skins=True,
        export_all_influences=False,
        export_cameras=False,
        export_lights=False,
        export_extras=True,
    )
    check_rest_rotations()
    follows = glb_follow_extras(OUTPUT)
    print(f'[mayor-tina-rig] follower bones: {follows}')
    if len(follows) != len(MID_LEGS):
        raise RuntimeError('follower bones lost their hbFollow extras on export')
    print(f'[mayor-tina-rig] {len(mayor.data.vertices)} vertices; wrote {OUTPUT}')


if __name__ == '__main__':
    main()
