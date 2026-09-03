"""Skin Mayor Tina to the Scout/Mixamo skeleton used by player locomotion.

Run from the repository root with:
    blender --background --python scripts/blender/rig_mayor_tina.py

The uploaded source is intentionally preserved.  This writes a derived,
retail-sized runtime asset beside the static encounter model.
"""

import os
import math

import bpy
from mathutils import Matrix, Vector


ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
MAYOR_SOURCE = os.path.join(ROOT, 'public', '3d', 'runtime', 'secrets', 'mayor-tina.glb')
SCOUT_SOURCE = os.path.join(ROOT, 'public', '3d', 'scouting-scout', 'Scout.game.glb')
OUTPUT = os.path.join(ROOT, 'public', '3d', 'runtime', 'secrets', 'mayor-tina-rigged.glb')
PREVIEW = os.path.join(ROOT, 'artifacts', 'mayor-tina-rig-preview.png')


def world_bounds(objects):
    minimum = Vector((float('inf'),) * 3)
    maximum = Vector((float('-inf'),) * 3)
    for obj in objects:
        for corner in obj.bound_box:
            point = obj.matrix_world @ Vector(corner)
            minimum.x = min(minimum.x, point.x)
            minimum.y = min(minimum.y, point.y)
            minimum.z = min(minimum.z, point.z)
            maximum.x = max(maximum.x, point.x)
            maximum.y = max(maximum.y, point.y)
            maximum.z = max(maximum.z, point.z)
    return minimum, maximum


def import_glb(path):
    before = set(bpy.context.scene.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    return [obj for obj in bpy.context.scene.objects if obj not in before]


def render_preview(objects, output_path):
    minimum, maximum = world_bounds(objects)
    center = (minimum + maximum) * 0.5
    radius = max(maximum - minimum)
    bpy.ops.object.camera_add(location=center + Vector((radius * 1.7, -radius * 2.5, radius * 1.35)))
    camera = bpy.context.active_object
    camera.rotation_euler = (center - camera.location).to_track_quat('-Z', 'Y').to_euler()
    camera.data.type = 'ORTHO'
    camera.data.ortho_scale = radius * 1.45
    bpy.context.scene.camera = camera
    scene = bpy.context.scene
    scene.render.engine = 'BLENDER_WORKBENCH'
    scene.display.shading.light = 'STUDIO'
    scene.display.shading.show_shadows = True
    scene.render.resolution_x = 800
    scene.render.resolution_y = 800
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = False
    scene.render.image_settings.file_format = 'PNG'
    scene.render.filepath = output_path
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    bpy.ops.render.render(write_still=True)


def distance_to_segment(point, start, end):
    segment = end - start
    length_squared = segment.length_squared
    if length_squared <= 1e-12:
        return (point - start).length
    factor = max(0.0, min(1.0, (point - start).dot(segment) / length_squared))
    return (point - (start + segment * factor)).length


def connected_components(mesh):
    parents = list(range(len(mesh.data.vertices)))

    def find(index):
        while parents[index] != index:
            parents[index] = parents[parents[index]]
            index = parents[index]
        return index

    def union(first, second):
        first_root = find(first)
        second_root = find(second)
        if first_root != second_root:
            parents[second_root] = first_root

    for edge in mesh.data.edges:
        union(edge.vertices[0], edge.vertices[1])
    components = {}
    for vertex in mesh.data.vertices:
        components.setdefault(find(vertex.index), []).append(vertex.index)
    return list(components.values())


def bind_with_proximity_weights(mesh, armature):
    """Create deterministic weights when Blender's bone heat cannot solve.

    The Mayor mesh has wings and a second pair of arms, which makes automatic
    bone heat fail. Proximity weights still give every vertex normalized skin
    influences and let the humanoid parts follow the shared Mixamo skeleton.
    """
    for group in list(mesh.vertex_groups):
        mesh.vertex_groups.remove(group)
    bones = [bone for bone in armature.data.bones if bone.use_deform]
    groups = {bone.name: mesh.vertex_groups.new(name=bone.name) for bone in bones}
    bone_segments = [
        (
            bone,
            armature.matrix_world @ bone.head_local,
            armature.matrix_world @ bone.tail_local,
        )
        for bone in bones
    ]
    components = connected_components(mesh)
    largest = sorted(components, key=len, reverse=True)[:12]
    print(f'[mayor-tina-rig] mesh islands {len(components)}; largest {[len(item) for item in largest]}')
    # The source is assembled from many disconnected hard-surface pieces. Bind
    # each complete piece rigidly to its nearest bone so armor plates, claws,
    # wings, and insect limbs articulate without triangles tearing across a
    # component boundary during the walk cycle.
    for component in components:
        centroid = Vector((0.0, 0.0, 0.0))
        for index in component:
            centroid += mesh.matrix_world @ mesh.data.vertices[index].co
        centroid /= len(component)
        _distance, nearest_bone = min(
            (
                (distance_to_segment(centroid, start, end), bone)
                for bone, start, end in bone_segments
            ),
            key=lambda item: item[0],
        )
        groups[nearest_bone.name].add(component, 1.0, 'REPLACE')

    mesh.parent = armature
    mesh.matrix_parent_inverse = armature.matrix_world.inverted()
    modifier = mesh.modifiers.new(name='MayorTinaArmature', type='ARMATURE')
    modifier.object = armature


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)

    if os.environ.get('HB_MAYOR_PREVIEW_ONLY') == '1':
        mayor_objects = import_glb(MAYOR_SOURCE)
        render_preview([obj for obj in mayor_objects if obj.type == 'MESH'], PREVIEW)
        print(f'[mayor-tina-rig] wrote source preview {PREVIEW}')
        return

    scout_objects = import_glb(SCOUT_SOURCE)
    scout_meshes = [obj for obj in scout_objects if obj.type == 'MESH']
    armature = next(obj for obj in scout_objects if obj.type == 'ARMATURE')
    # Scout's old source retains a Z-up authoring basis after import, while the
    # Mayor follows conventional glTF Y-up. Rotate the complete rig object into
    # the Mayor's upright bind space without changing any bone-local axes; the
    # shared animation quaternions therefore remain compatible.
    armature.matrix_world = Matrix.Rotation(math.radians(90), 4, 'X') @ armature.matrix_world
    bpy.context.view_layer.update()
    scout_min, scout_max = world_bounds(scout_meshes)

    # The animation GLB is loaded independently at runtime, so retain only its
    # compatible rest skeleton here. This keeps the Mayor derivative compact.
    if armature.animation_data:
        armature.animation_data_clear()
    for obj in scout_meshes:
        bpy.data.objects.remove(obj, do_unlink=True)
    for obj in list(bpy.context.scene.objects):
        if obj.type in {'CAMERA', 'LIGHT'}:
            bpy.data.objects.remove(obj, do_unlink=True)

    mayor_objects = import_glb(MAYOR_SOURCE)
    mayor_meshes = [obj for obj in mayor_objects if obj.type == 'MESH']
    if not mayor_meshes:
        raise RuntimeError('Mayor Tina source contains no mesh')

    mayor_min, mayor_max = world_bounds(mayor_meshes)

    # Match the Mayor's authored upright silhouette to the Scout bind pose.
    # Uniform scaling preserves the character design; centering each axis puts
    # limbs close enough to their matching bones for Blender's heat weights.
    scout_height = scout_max.z - scout_min.z
    mayor_height = mayor_max.z - mayor_min.z
    scale = scout_height / mayor_height
    scout_center = (scout_min + scout_max) * 0.5
    mayor_center = (mayor_min + mayor_max) * 0.5
    for obj in mayor_meshes:
        obj.scale *= scale
        obj.location = scout_center + (obj.location - mayor_center) * scale

    bpy.context.view_layer.update()
    bpy.ops.object.select_all(action='DESELECT')
    for obj in mayor_meshes:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = mayor_meshes[0]
    if len(mayor_meshes) > 1:
        bpy.ops.object.join()
    mayor = bpy.context.active_object
    mayor.name = 'MayorTina'

    # Bake the alignment before calculating bone heat, then bind to the exact
    # Mixamo skeleton expected by player3dOverlay's clip retargeter.
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    bind_with_proximity_weights(mayor, armature)

    # Keep the same naming convention as the source animation pack.
    armature.name = 'MayorTinaRig'
    armature.data.name = 'MayorTinaRig'
    for obj in bpy.context.scene.objects:
        obj.select_set(obj in {mayor, armature})
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
    )
    print(
        f'[mayor-tina-rig] height {mayor_height:.4f} -> {scout_height:.4f}; '
        f'{len(mayor.data.vertices)} vertices; wrote {OUTPUT}'
    )


if __name__ == '__main__':
    main()
