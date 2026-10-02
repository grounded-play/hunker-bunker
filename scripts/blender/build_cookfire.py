"""Build the survivor-camp cookfire prop.

    blender -b -P scripts/blender/build_cookfire.py -- public/3d/runtime/new3ds/prop_camp_cookfire.glb

prop_camp_cookfire was mapped to the fabricator workstation model, so every
camp's cookfire rendered as a crafting bench. No cookfire model exists (the
Kenney nature kit's campfires are ~60-triangle flat-colour blocks), so this
builds one: a ring of irregular stones, a charred-log teepee over a glowing
ember bed, and a scavenged tripod with a hanging pot. Textures are Poly Haven
CC0 maps from art/source/textures/polyhaven (scripts/build_kit_textures.py
fetches the rock and metal sets; bark_brown_02 and burned_ground_01 are
fetched the same way), downscaled to 512 and graded dark; the ember glow is
generated. Units are metres; the world registry normalises the height.
"""
import math
import random
import sys
from pathlib import Path

import bpy
import numpy as np
from mathutils import Vector

ROOT = Path(__file__).resolve().parent.parent.parent
PH = ROOT / 'art/source/textures/polyhaven'
out = sys.argv[sys.argv.index('--') + 1:][0]
rng = random.Random(11)

bpy.ops.wm.read_factory_settings(use_empty=True)


def image(name, size=512, value=1.0, saturation=1.0, colour=True):
    img = bpy.data.images.load(str(PH / name))
    img.scale(size, size)
    if colour and (value != 1.0 or saturation != 1.0):
        px = np.array(img.pixels[:]).reshape(-1, 4)
        grey = px[:, :3].mean(axis=1, keepdims=True)
        px[:, :3] = (grey + (px[:, :3] - grey) * saturation) * value
        img.pixels = px.ravel().tolist()
    if not colour:
        img.colorspace_settings.name = 'Non-Color'
    img.pack()
    return img


def material(name, asset, value=1.0, saturation=1.0, metallic=0.0, emission=None):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    bsdf = next(n for n in nodes if n.type == 'BSDF_PRINCIPLED')
    col = nodes.new('ShaderNodeTexImage')
    col.image = image(f'{asset}_diff_1k.jpg', value=value, saturation=saturation)
    links.new(col.outputs['Color'], bsdf.inputs['Base Color'])
    rough = nodes.new('ShaderNodeTexImage')
    rough.image = image(f'{asset}_rough_1k.jpg', colour=False)
    links.new(rough.outputs['Color'], bsdf.inputs['Roughness'])
    nor = nodes.new('ShaderNodeTexImage')
    nor.image = image(f'{asset}_nor_1k.jpg', colour=False)
    nmap = nodes.new('ShaderNodeNormalMap')
    links.new(nor.outputs['Color'], nmap.inputs['Color'])
    links.new(nmap.outputs['Normal'], bsdf.inputs['Normal'])
    bsdf.inputs['Metallic'].default_value = metallic
    if emission is not None:
        em = nodes.new('ShaderNodeTexImage')
        em.image = emission
        links.new(em.outputs['Color'], bsdf.inputs['Emission Color'])
        bsdf.inputs['Emission Strength'].default_value = 2.2
    return mat


def ember_glow(size=512):
    # Glowing cracks: Voronoi cell edges, hottest at the centre of the bed.
    seeds = np.array([[rng.random(), rng.random()] for _ in range(55)])
    ys, xs = np.mgrid[0:size, 0:size] / size
    d1 = np.full((size, size), 9.0)
    d2 = np.full((size, size), 9.0)
    for sx, sy in seeds:
        d = np.hypot(xs - sx, ys - sy)
        d2 = np.where(d < d1, d1, np.minimum(d2, d))
        d1 = np.minimum(d1, d)
    crack = np.clip(1.0 - (d2 - d1) * 30.0, 0, 1) ** 2
    heat = np.clip(1.0 - np.hypot(xs - 0.5, ys - 0.5) * 1.9, 0, 1)
    glow = np.clip(crack * heat * 1.3 + heat ** 3 * 0.35, 0, 1)
    rgb = np.stack([glow * 1.0, glow * 0.38, glow * 0.06], axis=-1)
    img = bpy.data.images.new('cookfire_embers', size, size, alpha=False)
    img.pixels = np.concatenate([rgb, np.ones((size, size, 1))], axis=2).astype(np.float32).ravel()
    img.pack()
    return img


rock = material('cookfire_stone', 'rock_face_03', value=0.55, saturation=0.45)
char = material('cookfire_charred_log', 'bark_brown_02', value=0.28, saturation=0.4)
ash = material('cookfire_ember_bed', 'burned_ground_01', value=0.6, emission=ember_glow())
iron = material('cookfire_iron', 'metal_plate_02', value=0.5, saturation=0.3, metallic=0.75)


def finish(obj, mat, smooth=True):
    obj.data.materials.append(mat)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.02)
    bpy.ops.object.mode_set(mode='OBJECT')
    if smooth:
        bpy.ops.object.shade_smooth()
    obj.select_set(False)
    return obj


parts = []
# Stone ring: irregular, displaced, slightly sunk.
noise = bpy.data.textures.new('stone_noise', 'CLOUDS')
noise.noise_scale = 0.08
for i in range(11):
    a = i / 11 * math.tau + rng.uniform(-0.12, 0.12)
    r = 0.44 + rng.uniform(-0.03, 0.03)
    size = rng.uniform(0.085, 0.125)
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=3, radius=size, location=(math.cos(a) * r, math.sin(a) * r, size * 0.45))
    stone = bpy.context.active_object
    stone.scale = (rng.uniform(1.1, 1.45), rng.uniform(0.85, 1.1), rng.uniform(0.62, 0.82))
    stone.rotation_euler = (0, 0, a + rng.uniform(-0.4, 0.4))
    disp = stone.modifiers.new('rough', 'DISPLACE')
    disp.texture = noise
    disp.strength = size * 0.35
    bpy.ops.object.modifier_apply(modifier=disp.name)
    parts.append(finish(stone, rock))

# Ember bed.
bpy.ops.mesh.primitive_cylinder_add(vertices=40, radius=0.37, depth=0.035, location=(0, 0, 0.012))
bed = bpy.context.active_object
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.uv.cylinder_project()
bpy.ops.object.mode_set(mode='OBJECT')
# Top-down UVs so the glow texture centres on the bed.
uv = bed.data.uv_layers.active
for loop in bed.data.loops:
    co = bed.data.vertices[loop.vertex_index].co
    uv.data[loop.index].uv = (co.x / 0.74 + 0.5, co.y / 0.74 + 0.5)
bed.data.materials.append(ash)
parts.append(bed)

# Charred-log teepee: five logs leaning in to meet above the bed.
for i in range(5):
    a = i / 5 * math.tau + 0.3
    foot = (math.cos(a) * 0.3, math.sin(a) * 0.3, 0.03)
    apex = (rng.uniform(-0.03, 0.03), rng.uniform(-0.03, 0.03), 0.34)
    vec = np.subtract(apex, foot)
    length = float(np.linalg.norm(vec))
    mid = np.add(foot, apex) / 2
    bpy.ops.mesh.primitive_cylinder_add(vertices=10, radius=rng.uniform(0.032, 0.045), depth=length * 1.15, location=tuple(mid))
    log = bpy.context.active_object
    log.rotation_mode = 'QUATERNION'
    log.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(Vector(tuple(vec / length)))
    parts.append(finish(log, char))

# Scavenged tripod and pot.
apex = (0.0, 0.0, 0.9)
for i in range(3):
    a = i / 3 * math.tau + 0.5
    foot = (math.cos(a) * 0.55, math.sin(a) * 0.55, 0.0)
    vec = np.subtract(apex, foot)
    length = float(np.linalg.norm(vec))
    mid = np.add(foot, apex) / 2
    bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.013, depth=length, location=tuple(mid))
    leg = bpy.context.active_object
    leg.rotation_mode = 'QUATERNION'
    leg.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(Vector(tuple(vec / length)))
    parts.append(finish(leg, iron, smooth=False))
bpy.ops.mesh.primitive_cylinder_add(vertices=6, radius=0.006, depth=0.32, location=(0, 0, 0.74))
parts.append(finish(bpy.context.active_object, iron, smooth=False))
bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.12, depth=0.15, location=(0, 0, 0.51))
pot = bpy.context.active_object
bev = pot.modifiers.new('bevel', 'BEVEL')
bev.width = 0.02
bev.segments = 3
bpy.ops.object.modifier_apply(modifier=bev.name)
parts.append(finish(pot, iron))

bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_image_format='WEBP', export_materials='EXPORT')
tris = sum(len(p.data.polygons) for p in parts)
print('[cookfire] wrote', out, 'parts', len(parts), 'faces', tris)
