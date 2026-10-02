"""Build the Proto Spitter from the proto-crawler body and a glowing acid sac.

    blender -b -P scripts/blender/build_spitter.py -- \
        public/3d/runtime/new3ds/alien_proto_crawler_A.glb \
        public/3d/runtime/new3ds/alien_proto_spitter.glb

The spitter's 2D design (art/source/art-remaster/sprites-v2/
alien_proto_spitter_walk_v2.png) is the crawler with a large green
honeycomb acid sac on its back. No 3D source exists, and the game used to
show a green-tinted crawler. This adds the sac to the crawler_A body:
an ellipsoid parented to the animated Thorax node (so it rides the idle
cycle), textured with a generated honeycomb (dark wet membrane, glowing
yellow-green cell walls) used as both base colour and emissive.

The crawler faces glTF +Z (Blender -Y); the sac sits behind the head on the
dorsal hump, measured from the body's bounds.
"""
import math
import random
import sys

import bpy
import numpy as np

src, out = sys.argv[sys.argv.index('--') + 1:][:2]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)

thorax = bpy.data.objects.get('Thorax')
body = next(o for o in bpy.data.objects if o.type == 'MESH')
lo = np.min([body.matrix_world @ v.co for v in body.data.vertices], axis=0)
hi = np.max([body.matrix_world @ v.co for v in body.data.vertices], axis=0)
height = hi[2] - lo[2]

# Honeycomb texture: Voronoi cell walls over a dark membrane, wrapped in u.
SIZE = 512
rng = random.Random(7)
seeds = np.array([[rng.random(), rng.random()] for _ in range(70)])
ys, xs = np.mgrid[0:SIZE, 0:SIZE] / SIZE
d1 = np.full((SIZE, SIZE), 9.0)
d2 = np.full((SIZE, SIZE), 9.0)
for sx, sy in seeds:
    for wrap in (-1, 0, 1):
        dx = xs - (sx + wrap)
        dy = (ys - sy) * 0.6
        d = np.sqrt(dx * dx + dy * dy)
        d2 = np.where(d < d1, d1, np.minimum(d2, d))
        d1 = np.minimum(d1, d)
edge = np.clip(1.0 - (d2 - d1) * 38.0, 0.0, 1.0) ** 1.6       # bright cell walls
centre = np.clip(1.0 - d1 * 9.0, 0.0, 1.0) * 0.35              # faint cell cores
glow = np.clip(edge + centre, 0.0, 1.0)
membrane = np.array([0.05, 0.12, 0.02])
wall = np.array([0.72, 1.0, 0.22])
rgb = membrane[None, None, :] * (1 - glow[..., None]) + wall[None, None, :] * glow[..., None]
img = bpy.data.images.new('spitter_sac', SIZE, SIZE, alpha=False)
img.pixels = np.concatenate([rgb, np.ones((SIZE, SIZE, 1))], axis=2).astype(np.float32).ravel()
img.pack()

mat = bpy.data.materials.new('spitter_acid_sac')
mat.use_nodes = True
nodes, links = mat.node_tree.nodes, mat.node_tree.links
bsdf = next(n for n in nodes if n.type == 'BSDF_PRINCIPLED')
tex = nodes.new('ShaderNodeTexImage')
tex.image = img
links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
links.new(tex.outputs['Color'], bsdf.inputs['Emission Color'])
bsdf.inputs['Emission Strength'].default_value = 1.4
bsdf.inputs['Roughness'].default_value = 0.22
bsdf.inputs['Metallic'].default_value = 0.0

# The sac: on the dorsal hump just behind the head (-Y is the front).
bpy.ops.mesh.primitive_uv_sphere_add(segments=40, ring_count=20, radius=1.0)
sac = bpy.context.active_object
sac.name = 'AcidSac'
length = hi[1] - lo[1]
sac.scale = (height * 0.62, height * 0.72, height * 0.52)
sac.location = (0.5 * (lo[0] + hi[0]), lo[1] + length * 0.42, hi[2] - height * 0.08)
bpy.ops.object.shade_smooth()
sac.data.materials.append(mat)
if thorax:
    world = sac.matrix_world.copy()
    sac.parent = thorax
    sac.matrix_world = world

bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_animations=True, export_apply=False)
print('[spitter] wrote', out, 'sac', tuple(round(x, 3) for x in sac.location), 'parent', sac.parent.name if sac.parent else None)
