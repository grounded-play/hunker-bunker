"""Cloth that flutters: cut the cloth of a lived-in prop into an HB_FLUTTER
node and bake how freely each vertex moves.

Kept apart from articulation_recipes.py (hinges and rotors, driven by E):
flutter runs all the time, on every instance, from the shared material
(src/clothFlutter.js), so these props stay in the static instanced batch.

Per vertex, COLOR_0 carries:
  R  flutter weight, 0 where the cloth is held, rising smoothly to 1;
  G  distance from the nearest hold, as a share of the furthest (wave phase).
A cloth is held where it was cut from the rest of the mesh (so the seam never
tears) and along any `holds` lines, like the bones a tarp is lashed to.

Node extras (glTF): hb_motion = 'flutter', hb_amp (local units at weight 1),
hb_speed (radians/second), hb_axis (displacement direction in the node's
space; [0, 0, 0] pushes along the surface normal).

Coordinates below are the raw master's, after transform_apply (Blender Z up).
"""

import bmesh
import bpy
from mathutils import Vector
from mathutils.kdtree import KDTree

# Faces belong to the cloth when `select(center, hsv)` is true. hsv is the
# base-colour texture sampled at the face's UV centre.
RECIPES = {
    # 52: the striped windsock on its arm at the top of the mast.
    'life_wind_mast': {
        'part': 'HB_FLUTTER_sock',
        'select': lambda c, hsv: c.x > 0.06 and 0.68 < c.z < 0.9 and abs(c.y) < 0.06,
        'holds': [],
        'falloff': 0.2,
        # Wags side to side across the wind (Blender y is glTF -z).
        'axis': [0.0, 0.0, 1.0],
        'amp': 0.03,
        'speed': 3.4,
    },
    # 55: the tarp over the two bone arches, with its flap down the side.
    'life_tarp_leanto': {
        'part': 'HB_FLUTTER_tarp',
        # Dark cloth above the ground clutter, not the lantern under the ridge.
        'select': lambda c, hsv: hsv[2] < 0.3 and c.z > 0.2
        and not (-0.03 < c.x < 0.13 and -0.32 < c.y < -0.15 and 0.25 < c.z < 0.47),
        # Lashed along the ridge and the two arches.
        'holds': [
            ((0.05, -0.3, 0.52), (0.05, 0.35, 0.52)),
            ((-0.44, -0.25, 0.0), (0.05, -0.25, 0.52)), ((0.05, -0.25, 0.52), (0.53, -0.25, 0.0)),
            ((-0.44, 0.2, 0.0), (0.05, 0.2, 0.52)), ((0.05, 0.2, 0.52), (0.53, 0.2, 0.0)),
        ],
        'falloff': 0.12,
        'axis': [0.0, 0.0, 0.0],
        'amp': 0.012,
        'speed': 1.7,
    },
}


def _base_image(obj):
    for material in obj.data.materials:
        if not material or not material.use_nodes:
            continue
        for node in material.node_tree.nodes:
            if node.type == 'TEX_IMAGE' and node.image:
                return node.image
    return None


def _face_hsv(mesh, image, pixels, face):
    import colorsys
    if image is None or not mesh.uv_layers.active:
        return (0.0, 0.0, 0.5)
    uv = mesh.uv_layers.active.data
    u = sum(uv[i].uv.x for i in face.loop_indices) / len(face.loop_indices)
    v = sum(uv[i].uv.y for i in face.loop_indices) / len(face.loop_indices)
    width, height = image.size
    x = min(width - 1, max(0, int(u % 1 * width)))
    y = min(height - 1, max(0, int(v % 1 * height)))
    k = (y * width + x) * 4
    return colorsys.rgb_to_hsv(*pixels[k:k + 3])


def _smoothstep(edge, value):
    t = min(1.0, max(0.0, value / edge))
    return t * t * (3 - 2 * t)


def _hold_points(lines, step=0.01):
    points = []
    for start, end in lines:
        a, b = Vector(start), Vector(end)
        count = max(1, int((b - a).length / step))
        points.extend(a.lerp(b, i / count) for i in range(count + 1))
    return points


def apply_flutter(name):
    """Cut and weight the prop's cloth, if it has a recipe. Yields log lines."""
    recipe = RECIPES.get(name)
    if not recipe:
        return
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH']
    if len(meshes) != 1:
        yield f'flutter: expected one mesh, found {len(meshes)}; skipped'
        return
    obj = meshes[0]
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    obj.rotation_mode = 'XYZ'

    image = _base_image(obj)
    pixels = image.pixels[:] if image else None
    mesh = obj.data
    cloth_faces = {face.index for face in mesh.polygons if recipe['select'](face.center, _face_hsv(mesh, image, pixels, face))}
    if not cloth_faces:
        yield 'flutter: no cloth faces matched; skipped'
        return

    bpy.ops.object.mode_set(mode='EDIT')
    bm = bmesh.from_edit_mesh(mesh)
    for element in (*bm.verts, *bm.edges, *bm.faces):
        element.select = False
    bm.faces.ensure_lookup_table()
    for index in cloth_faces:
        bm.faces[index].select = True
    bmesh.update_edit_mesh(mesh)
    bpy.ops.mesh.separate(type='SELECTED')
    bpy.ops.object.mode_set(mode='OBJECT')
    cloth = next(o for o in bpy.context.selected_objects if o is not obj)
    cloth.name = recipe['part']
    cloth.data.name = recipe['part']

    # Held where the cloth meets what it was cut from, and along the holds.
    rest = KDTree(len(obj.data.vertices))
    for index, vertex in enumerate(obj.data.vertices):
        rest.insert(vertex.co, index)
    rest.balance()
    held = [v.co.copy() for v in cloth.data.vertices if rest.find(v.co)[2] < 1e-5]
    held += _hold_points(recipe['holds'])
    tree = KDTree(len(held))
    for index, point in enumerate(held):
        tree.insert(point, index)
    tree.balance()
    distances = [tree.find(v.co)[2] for v in cloth.data.vertices] if held else [recipe['falloff']] * len(cloth.data.vertices)
    furthest = max(distances) or 1.0

    attribute = cloth.data.color_attributes.new('Col', 'FLOAT_COLOR', 'POINT')
    for index, distance in enumerate(distances):
        attribute.data[index].color = (_smoothstep(recipe['falloff'], distance), distance / furthest, 0.0, 1.0)
    cloth.data.color_attributes.active_color = attribute
    # The rest of the prop carries no colour attribute, so nothing else is tinted.
    for leftover in list(obj.data.color_attributes):
        obj.data.color_attributes.remove(leftover)

    cloth['hb_motion'] = 'flutter'
    cloth['hb_amp'] = recipe['amp']
    cloth['hb_speed'] = recipe['speed']
    cloth['hb_axis'] = recipe['axis']
    yield (f'flutter: {cloth.name} {len(cloth.data.polygons)} faces, {len(held)} hold points, '
           f'free reach {furthest:.3f}')
