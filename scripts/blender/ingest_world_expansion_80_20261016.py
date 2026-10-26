#!/usr/bin/env python3
"""Optimize and instrument the 2026-10-16 World Expansion 80 GLB cohort.

Run one or more assets with:
  HB_PROPS=id_a,id_b /snap/bin/blender -b -P scripts/blender/ingest_world_expansion_80_20261016.py

The raw image-to-3D exports are monolithic. This pass preserves that source
mesh and adds a small, readable actuator rather than making destructive blind
face cuts. The actuator carries HB articulation extras and an embedded subtle
`idle` clip; interaction-driven motion remains owned by propArticulation.js.
"""

import math
import os
import re
import subprocess

import bpy
from mathutils import Vector

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SOURCE_DIR = os.path.join(ROOT, 'art', 'raw')
RUNTIME_DIR = os.environ.get('HB_RUNTIME_DIR') or os.path.join(ROOT, 'public', '3d', 'runtime', 'new3ds')
MANIFEST_JS = os.path.join(ROOT, 'src', 'data', 'worldExpansion80.js')
MAX_TEXTURE_RES = 2048
WEBP_QUALITY = 90


def manifest_ids():
    with open(MANIFEST_JS, encoding='utf8') as manifest:
        text = manifest.read()
    match = re.search(r'WORLD_EXPANSION_80_IDS\s*=\s*Object\.freeze\(`(.*?)`\.trim', text, re.S)
    if not match:
        raise RuntimeError('Unable to read WORLD_EXPANSION_80_IDS')
    ids = match.group(1).split()
    if len(ids) != 80 or len(set(ids)) != 80:
        raise RuntimeError(f'Expected 80 unique ids, found {len(ids)}')
    return ids


ALL_PROPS = manifest_ids()


def triangle_count(obj):
    return sum(max(1, len(poly.vertices) - 2) for poly in obj.data.polygons)


def scene_bounds():
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH' and not obj.name.startswith('HB_')]
    low = Vector((float('inf'),) * 3)
    high = Vector((float('-inf'),) * 3)
    for obj in meshes:
        for corner in obj.bound_box:
            point = obj.matrix_world @ Vector(corner)
            for axis in range(3):
                low[axis] = min(low[axis], point[axis])
                high[axis] = max(high[axis], point[axis])
    return low, high


def behavior_for(name):
    spin = ('wheel', 'turnstile', 'drum', 'cam', 'rotary', 'skimmer', 'macerator', 'crusher', 'coring_chain')
    hinge = ('gate', 'airlock', 'baffle', 'iris', 'screening_arch', 'memory_skin', 'cache', 'trunk', 'hopper', 'chute')
    slide = ('rail', 'carriage', 'sled', 'limber', 'catchframe', 'load_selector', 'interlock', 'lift', 'tilt_floor')
    breathe = ('heart', 'gland', 'nest', 'suture', 'cowl', 'membrane', 'harness', 'canopy')
    if any(word in name for word in spin): return 'spin'
    if any(word in name for word in hinge): return 'hinge'
    if any(word in name for word in slide): return 'slide'
    if any(word in name for word in breathe): return 'breathe'
    return 'pulse'


def add_empty(name, location, extras=None):
    empty = bpy.data.objects.new(name, None)
    empty.location = location
    empty.empty_display_type = 'SPHERE'
    empty.empty_display_size = 0.04
    for key, value in (extras or {}).items():
        empty[key] = value
    bpy.context.scene.collection.objects.link(empty)
    return empty


def add_actuator(name):
    low, high = scene_bounds()
    span = high - low
    max_span = max(span.x, span.y, span.z, 0.1)
    behavior = behavior_for(name)
    location = Vector((low.x + span.x * 0.5, low.y - max(span.y * 0.48, 0.02), low.z + span.z * 0.62))
    size = max(max_span * 0.035, 0.012)

    if behavior == 'spin':
        bpy.ops.mesh.primitive_torus_add(major_radius=size * 1.3, minor_radius=size * 0.28,
                                        major_segments=16, minor_segments=6, location=location,
                                        rotation=(math.pi / 2, 0, 0))
        node = bpy.context.object
        node.name = 'HB_ROTOR_00'
        node['hb_motion'] = 'spin'
        node['hb_axis'] = [0.0, 0.0, 1.0]
        node['hb_speed'] = 1.2
        node['hb_bob'] = 0.0
    elif behavior == 'hinge':
        bpy.ops.mesh.primitive_cube_add(size=1, location=location)
        node = bpy.context.object
        node.scale = (size * 1.25, size * 0.22, size * 0.78)
        node.name = 'HB_LID_00'
        node['hb_motion'] = 'hinge'
        node['hb_axis'] = [1.0, 0.0, 0.0]
        node['hb_open_angle'] = math.radians(55)
        node['hb_open_offset'] = [0.0, 0.0, 0.0]
        node['hb_duration'] = 0.8
    elif behavior == 'slide':
        bpy.ops.mesh.primitive_cube_add(size=1, location=location)
        node = bpy.context.object
        node.scale = (size * 1.4, size * 0.28, size * 0.42)
        node.name = 'HB_SLIDE_00'
        node['hb_motion'] = 'slide'
        node['hb_axis'] = [1.0, 0.0, 0.0]
        node['hb_open_angle'] = 0.0
        node['hb_open_offset'] = [max(span.x * 0.12, size * 3), 0.0, 0.0]
        node['hb_duration'] = 0.9
    else:
        bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=8, radius=size, location=location)
        node = bpy.context.object
        node.scale = (1.0, 0.35, 0.7)
        node.name = 'HB_PULSE_00'
        node['hb_motion'] = 'spin'
        node['hb_axis'] = [0.0, 1.0, 0.0]
        node['hb_speed'] = 0.35
        node['hb_bob'] = 0.008 if behavior == 'breathe' else 0.003

    # Reuse the source material so the affordance belongs to the object.
    source_material = next((obj.data.materials[0] for obj in bpy.context.scene.objects
                            if obj.type == 'MESH' and obj is not node and obj.data.materials), None)
    if source_material:
        node.data.materials.append(source_material)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)

    # A very restrained embedded idle clip proves mixer support without moving
    # the whole prop. propArticulation.js can still drive the larger use state.
    bpy.context.scene.frame_start = 1
    bpy.context.scene.frame_end = 61
    base_scale = node.scale.copy()
    node.scale = base_scale
    node.keyframe_insert(data_path='scale', frame=1, group='idle')
    node.scale = base_scale * (1.035 if behavior in ('breathe', 'pulse') else 1.012)
    node.keyframe_insert(data_path='scale', frame=31, group='idle')
    node.scale = base_scale
    node.keyframe_insert(data_path='scale', frame=61, group='idle')
    if node.animation_data and node.animation_data.action:
        node.animation_data.action.name = 'idle'

    return behavior


def add_contract_nodes(name):
    low, high = scene_bounds()
    span = high - low
    center = low + span * 0.5
    front = Vector((center.x, low.y, low.z + span.z * 0.55))
    top = Vector((center.x, center.y, low.z + span.z * 0.78))
    add_empty('INTERACTION_00', front, {'hb_interaction_anchor': True})
    add_empty('FX_LIGHT_00', top, {'hb_fx_anchor': True, 'hb_fx_contract': 1})
    add_empty('FX_GLOW_00', top, {'hb_fx_anchor': True, 'hb_fx_contract': 1})
    if name.startswith('hazard_'):
        add_empty('socket_input_00', Vector((low.x, center.y, low.z + span.z * 0.35)), {'hb_socket': 'input'})
        add_empty('socket_output_00', Vector((high.x, center.y, low.z + span.z * 0.35)), {'hb_socket': 'output'})
    if any(word in name for word in ('steam', 'furnace', 'thermal')):
        add_empty('FX_STEAM_00', top, {'hb_fx_anchor': True, 'hb_fx_contract': 1})
    if any(word in name for word in ('spore', 'brood', 'suture', 'resin')):
        add_empty('FX_SPORES_00', top, {'hb_fx_anchor': True, 'hb_fx_contract': 1})


def optimize_scene(target):
    for obj in list(bpy.data.objects):
        if obj.type in ('LIGHT', 'CAMERA'):
            bpy.data.objects.remove(obj, do_unlink=True)
    for image in bpy.data.images:
        width, height = image.size
        if width > MAX_TEXTURE_RES or height > MAX_TEXTURE_RES:
            ratio = min(MAX_TEXTURE_RES / width, MAX_TEXTURE_RES / height)
            image.scale(max(1, round(width * ratio)), max(1, round(height * ratio)))
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH']
    before = sum(triangle_count(obj) for obj in meshes)
    if before > target:
        ratio = target / before
        for obj in meshes:
            bpy.context.view_layer.objects.active = obj
            obj.select_set(True)
            mod = obj.modifiers.new('RuntimeDetailBudget', 'DECIMATE')
            mod.ratio = ratio
            bpy.ops.object.modifier_apply(modifier=mod.name)
            obj.select_set(False)
    after = sum(triangle_count(obj) for obj in meshes)
    return before, after


def meshopt_compress(path):
    packed = path + '.packed.glb'
    subprocess.run(['npx', '-y', 'gltfpack@1.3', '-i', path, '-o', packed, '-c', '-kn', '-km', '-ke', '-noq'],
                   check=True, cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    os.replace(packed, path)


def process_model(name):
    source = os.path.join(SOURCE_DIR, f'{name}.glb')
    destination = os.path.join(RUNTIME_DIR, f'{name}.glb')
    if not os.path.exists(source):
        print(f'[SKIP] {name}: source missing')
        return False
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=source)
    large = any(word in name for word in ('catwalk', 'gallery', 'canopy', 'arc', 'airlock', 'carriage', 'return_tree'))
    before, after = optimize_scene(35000 if large else 25000)
    behavior = add_actuator(name)
    add_contract_nodes(name)
    os.makedirs(RUNTIME_DIR, exist_ok=True)
    temporary = destination + '.tmp.glb'
    bpy.ops.export_scene.gltf(
        filepath=temporary, export_format='GLB', export_apply=True,
        export_animations=True, export_cameras=False, export_lights=False,
        export_image_format='WEBP', export_image_quality=WEBP_QUALITY,
        export_extras=True,
    )
    meshopt_compress(temporary)
    os.replace(temporary, destination)
    print(f'[PROCESSED] {name}: motion={behavior} tris={before}->{after} bytes={os.path.getsize(source)}->{os.path.getsize(destination)}')
    return True


def main():
    only = {item.strip() for item in os.environ.get('HB_PROPS', '').split(',') if item.strip()}
    selected = [name for name in ALL_PROPS if not only or name in only]
    for name in selected:
        process_model(name)


if __name__ == '__main__':
    main()
