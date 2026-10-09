"""Cut moving parts out of monolithic lived-in props (world-prop-interactivity
master plan, Wave 2 and 3).

The image-to-3D props arrive as one fused mesh, already posed open (doors swung
out, lids off). A recipe selects a part by region in the import's coordinates
(Blender, Z up, metres of the source export), separates it into its own node
named HB_*, puts the node's origin on the hinge or shaft, and leaves it in its
rest pose: doors closed, rotors at zero. The motion itself is described in the
node's glTF extras, which three.js loads into `userData`; src/propArticulation.js
drives it at runtime:

    hb_motion        'hinge' or 'spin'
    hb_axis          rotation axis in glTF space (x, y up, z toward the front)
    hb_open_angle    hinge: radians from rest (closed) to open
    hb_open_offset   hinge: glTF-space slide from rest to open
    hb_duration      hinge: seconds to open or close
    hb_speed         spin: radians per second while working
    hb_bob           spin: glTF-space travel along the axis per cycle

Called from ingest_lived_in_props_20261009.py after decimation and before export.
"""

import math

import bmesh
import bpy
from mathutils import Matrix, Quaternion, Vector


def to_gltf(vector):
    """Blender (x, y, z), Z up -> glTF (x, z, -y), Y up."""
    return [vector[0], vector[2], -vector[1]]


def _box(xmin=-9, xmax=9, ymin=-9, ymax=9, zmin=-9, zmax=9):
    return lambda c: xmin <= c.x <= xmax and ymin <= c.y <= ymax and zmin <= c.z <= zmax


def _any(*selectors):
    return lambda c: any(select(c) for select in selectors)


def _near_segment(a, b, radius, zmin=-9, zmax=9, ymax=9):
    a = Vector((a[0], a[1]))
    b = Vector((b[0], b[1]))
    ab = b - a

    def select(c):
        if not (zmin <= c.z <= zmax and c.y <= ymax):
            return False
        p = Vector((c.x, c.y))
        t = max(0.0, min(1.0, (p - a).dot(ab) / ab.dot(ab)))
        return (p - (a + ab * t)).length <= radius
    return select


def _plane_slab(centre, normal, thickness, radius, extra=lambda c: True):
    """Faces within `thickness` of a plane and `radius` of a point on it."""
    centre = Vector(centre)
    normal = Vector(normal).normalized()

    def select(c):
        offset = c - centre
        depth = offset.dot(normal)
        return abs(depth) <= thickness and (offset - normal * depth).length <= radius and extra(c)
    return select


def _cylinder(axis, centre, radius, lo, hi):
    """Faces within `radius` of an axis-aligned line ('x' or 'z') between lo and hi."""
    def select(c):
        if axis == 'z':
            return lo <= c.z <= hi and math.hypot(c.x - centre[0], c.y - centre[1]) <= radius
        return lo <= c.x <= hi and math.hypot(c.y - centre[0], c.z - centre[1]) <= radius
    return select


# Hinged doors: `hinge_end` picks which end of the separated slab carries the
# hinge (the end nearest the body); `closed_dir` is the direction, seen from
# above, the slab points when shut; `slide` moves the shut door clear of
# anything the scan left bulging out of the opening.
RECIPES = {
    'life_ribcage_rescue_cabinet': [
        # The slab left of the frame, plus anything well in front of the
        # cabinet (only the open door reaches there: its handle sits inboard).
        dict(name='HB_DOOR_00', motion='hinge', select=_any(_box(xmax=-0.165, ymax=0.095, zmin=0.05), _box(ymax=-0.07)),
             hinge_end='max_y', closed_dir=(1.0, 0.0), slide=(0.0, -0.07, 0.0), duration=0.85),
    ],
    'life_confessional': [
        # Each booth door: the slab along its swing line, plus everything in
        # front of the booth line on its side (only the open doors reach there).
        dict(name='HB_DOOR_00', motion='hinge',
             select=_any(_near_segment((-0.37, -0.14), (-0.44, -0.37), 0.055, ymax=-0.14), _box(xmax=-0.25, ymax=-0.165)),
             hinge_end='max_y', closed_dir=(1.0, 0.0), slide=(0.0, 0.0, 0.0), duration=1.1),
        dict(name='HB_DOOR_01', motion='hinge',
             select=_any(_near_segment((0.31, -0.14), (0.40, -0.36), 0.055, ymax=-0.14), _box(xmin=0.25, ymax=-0.165)),
             hinge_end='max_y', closed_dir=(-1.0, 0.0), slide=(0.0, 0.0, 0.0), duration=1.1),
    ],
    'life_supply_drop_pod': [
        # The lid stands off the pod's right side. Its plane was fitted to the
        # scan; the opening is where the shell has a hole (facing front and up,
        # (0.30, -0.82, 0.49)). One swing about the axis taking the lid's
        # outward normal onto the opening's normal (rim plane fitted from the
        # shell around the hole, centre (-0.043, -0.101, 0.341)) seats it 3.5 cm
        # proud of the rim; the residual move is a short slide along the axis.
        dict(name='HB_LID_00', motion='hinge_axis',
             select=_plane_slab((0.225, 0.015, 0.29), (0.833, 0.551, 0.052), 0.08, 0.26, lambda c: c.z > 0.1 and c.x > 0.135),
             axis=(0.3099, -0.3865, -0.8687), pivot=(0.0405, 0.0206, 0.2217), closed_angle=math.radians(93.96),
             slide=(0.3099 * -0.0825, -0.3865 * -0.0825, -0.8687 * -0.0825), duration=1.3),
    ],
    'life_seismic_drill': [
        # The vertebral auger bit under the mast, boring into the ground.
        dict(name='HB_ROTOR_00', motion='spin', select=_cylinder('z', (0.0, 0.022), 0.05, 0.03, 0.33),
             axis=(0.0, 0.0, 1.0), pivot=(0.0, 0.022, 0.18), speed=9.0, bob=0.025),
    ],
    'life_ice_bore_winch': [
        # The cable drum between the tripod's side plates.
        dict(name='HB_ROTOR_00', motion='spin', select=_cylinder('x', (-0.048, 0.62), 0.08, -0.14, 0.1),
             axis=(1.0, 0.0, 0.0), pivot=(-0.02, -0.048, 0.62), speed=2.6, bob=0.0),
    ],
}


def _separate(obj, select, name):
    for other in bpy.context.selected_objects:
        other.select_set(False)
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.mode_set(mode='EDIT')
    mesh = bmesh.from_edit_mesh(obj.data)
    world = obj.matrix_world
    # Imports arrive fully selected; clear every element, or entering edit
    # mode flushes the old vertex selection onto every face.
    for element in (*mesh.verts, *mesh.edges, *mesh.faces):
        element.select = False
    count = 0
    for face in mesh.faces:
        if select(world @ face.calc_center_median()):
            face.select_set(True)
            count += 1
    bmesh.update_edit_mesh(obj.data)
    if count == 0:
        bpy.ops.object.mode_set(mode='OBJECT')
        raise RuntimeError(f'{name}: the selection matched no faces')
    bpy.ops.mesh.separate(type='SELECTED')
    bpy.ops.object.mode_set(mode='OBJECT')
    part = next(o for o in bpy.context.selected_objects if o is not obj)
    part.name = name
    part.data.name = name
    return part, count


def _set_origin(part, pivot):
    offset = Vector(pivot) - part.matrix_world.translation
    part.data.transform(Matrix.Translation(-offset))
    part.matrix_world.translation += offset


def _hinge(part, recipe):
    world = part.matrix_world
    points = [world @ v.co for v in part.data.vertices]
    key = {'max_y': lambda p: p.y, 'min_y': lambda p: -p.y}[recipe['hinge_end']]
    top = max(key(p) for p in points)
    near = [p for p in points if top - key(p) <= 0.025]
    far_top = min(key(p) for p in points)
    far = [p for p in points if key(p) - far_top <= 0.025]
    hinge = sum(near, Vector()) / len(near)
    tip = sum(far, Vector()) / len(far)
    pivot = Vector((hinge.x, hinge.y, min(p.z for p in points)))
    current = math.atan2(tip.y - hinge.y, tip.x - hinge.x)
    target = math.atan2(recipe['closed_dir'][1], recipe['closed_dir'][0])
    closed = (target - current + math.pi) % (2 * math.pi) - math.pi
    _set_origin(part, pivot)
    # glTF imports use quaternion mode, which would ignore an Euler angle.
    part.rotation_mode = 'XYZ'
    part.rotation_euler = (0.0, 0.0, closed)
    slide = Vector(recipe['slide'])
    part.location = part.location + slide
    part['hb_motion'] = 'hinge'
    part['hb_axis'] = to_gltf((0.0, 0.0, 1.0))
    part['hb_open_angle'] = -closed
    part['hb_open_offset'] = to_gltf(-slide)
    part['hb_duration'] = recipe['duration']
    return f'hinge at ({pivot.x:.3f}, {pivot.y:.3f}) closes {math.degrees(closed):.1f} deg'


def _hinge_axis(part, recipe):
    """A hinge on an arbitrary axis (lids that close onto tilted openings)."""
    axis = Vector(recipe['axis']).normalized()
    _set_origin(part, recipe['pivot'])
    part.rotation_mode = 'QUATERNION'
    part.rotation_quaternion = Quaternion(axis, recipe['closed_angle'])
    slide = Vector(recipe.get('slide', (0.0, 0.0, 0.0)))
    part.location = part.location + slide
    part['hb_motion'] = 'hinge'
    part['hb_axis'] = to_gltf(axis)
    part['hb_open_angle'] = -recipe['closed_angle']
    part['hb_open_offset'] = to_gltf(-slide)
    part['hb_duration'] = recipe['duration']
    return f"hinge on axis {tuple(round(v, 3) for v in axis)} closes {math.degrees(recipe['closed_angle']):.1f} deg"


def _spin(part, recipe):
    _set_origin(part, recipe['pivot'])
    axis = Vector(recipe['axis'])
    part['hb_motion'] = 'spin'
    part['hb_axis'] = to_gltf(axis)
    part['hb_speed'] = recipe['speed']
    part['hb_bob'] = recipe['bob']
    return f"spins at {recipe['speed']} rad/s"


def apply_articulation(prop_name):
    """Cut the recipe's parts out of the scene's (single) mesh. Returns a report."""
    recipe_list = RECIPES.get(prop_name)
    if not recipe_list:
        return []
    meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    if len(meshes) > 1:
        bpy.ops.object.select_all(action='DESELECT')
        for mesh in meshes:
            mesh.select_set(True)
        bpy.context.view_layer.objects.active = meshes[0]
        bpy.ops.object.join()
    body = next(o for o in bpy.context.scene.objects if o.type == 'MESH')
    body.name = 'HB_BODY'
    # The raw exports carry a 90-degree X rotation on the object; bake it so
    # local and world space agree before cutting and placing pivots.
    bpy.ops.object.select_all(action='DESELECT')
    body.select_set(True)
    bpy.context.view_layer.objects.active = body
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    report = []
    for recipe in recipe_list:
        part, faces = _separate(body, recipe['select'], recipe['name'])
        detail = {'hinge': _hinge, 'hinge_axis': _hinge_axis, 'spin': _spin}[recipe['motion']](part, recipe)
        report.append(f"{recipe['name']}: {faces} faces, {detail}")
    return report
