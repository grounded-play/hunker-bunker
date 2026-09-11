"""Build the distinct `_A` variant meshes for the sentinel and crawler families.

Both variants shipped as byte-identical copies of their base export, so the
variant spawning added in docs/planning/enemy-variant-spawning-2026-09-10.md had
nothing to show: an enemy resolved to `sentinel_A` looked exactly like one that
resolved to `sentinel`.

These are photoscan-derived single-mesh assets (22-25k polys, three shared 1024
PBR maps) parented to an empty rig carrying an `idle` action. So rather than
author from scratch, derive the variant from its base and change the two things
that actually read at gameplay camera distance:

  1. Silhouette, here. Proportions are reshaped by moving existing vertices --
     scale, taper and a radial bulge -- so the variant is separable from its
     base as a shape. Nothing is ever ADDED: a first attempt joined primitives
     onto these meshes and they rendered as untextured grey cones, because new
     geometry has no place in the scan's UV layout.
  2. Colour, in the engine. Per-variant tinting is a `tint` entry in
     enemy3dOverlay's MODEL_CONFIG, which multiplies the material colour at
     load. That is the existing pattern (cryosnail re-tints the cybersnail
     mesh), it costs no payload, and it cannot damage the scan textures.

The rig empties and the `idle` action are preserved untouched, so the variants
animate exactly like their base and need no engine change.

Run: blender --background --python scripts/blender/build_enemy_variant_meshes.py
"""

import bpy
import math
import os

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
RUNTIME_DIR = os.path.join(ROOT, 'public', '3d', 'runtime', 'new3ds')

# Deterministic: the same commit must produce the same mesh, so a rebuild is a
# no-op in git rather than a fresh blob every time.
SEED = 20260910

# Held under the 25k runtime ceiling that optimize_uploaded_glbs.py enforces,
# with margin for the triangulation the GLB exporter applies on the way out.
POLY_CEILING = 24000


def _clear():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def _mesh_object():
    for obj in bpy.context.scene.objects:
        if obj.type == 'MESH':
            return obj
    raise RuntimeError('imported GLB has no mesh')


def _local_bounds(obj):
    xs = [v.co.x for v in obj.data.vertices]
    ys = [v.co.y for v in obj.data.vertices]
    zs = [v.co.z for v in obj.data.vertices]
    return (min(xs), max(xs)), (min(ys), max(ys)), (min(zs), max(zs))


def _scale_vertices(obj, sx, sy, sz):
    """Reshape by moving vertices, leaving the object transform (and therefore
    the rig parenting and the idle action) completely alone."""
    for v in obj.data.vertices:
        v.co.x *= sx
        v.co.y *= sy
        v.co.z *= sz
    obj.data.update()


def _taper(obj, axis, amount):
    """Narrow one axis progressively along the model's height, which is what
    separates a lean chassis from a squat one in silhouette."""
    (_, _), (_, _), (zmin, zmax) = _local_bounds(obj)
    span = max(1e-6, zmax - zmin)
    for v in obj.data.vertices:
        t = (v.co.z - zmin) / span
        factor = 1.0 - amount * t
        if axis == 'x':
            v.co.x *= factor
        else:
            v.co.y *= factor
    obj.data.update()


def _bulge(obj, centre_t, width_t, amount):
    """Swell the mesh radially around a band of its height.

    This is the only shape tool here that reads as organic rather than as a
    scale, and like every other tool in this file it only MOVES existing
    vertices -- it never adds geometry. That matters: an earlier attempt joined
    primitives onto these meshes and they rendered as untextured grey cones,
    because new geometry has no place in the scan's UV layout. Deforming what is
    already there keeps the texture, the normals and the UVs intact.
    """
    (_, _), (_, _), (zmin, zmax) = _local_bounds(obj)
    span = max(1e-6, zmax - zmin)
    for v in obj.data.vertices:
        t = (v.co.z - zmin) / span
        falloff = math.exp(-((t - centre_t) ** 2) / max(1e-6, 2.0 * width_t * width_t))
        factor = 1.0 + amount * falloff
        v.co.x *= factor
        v.co.y *= factor
    obj.data.update()


def _decimate_if_needed(obj):
    if len(obj.data.polygons) <= POLY_CEILING:
        return
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    mod = obj.modifiers.new('VariantDecimate', 'DECIMATE')
    mod.ratio = POLY_CEILING / len(obj.data.polygons)
    bpy.ops.object.modifier_apply(modifier=mod.name)


def _export(path):
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB',
                              use_selection=True, export_apply=False,
                              export_animations=True)


def build_sentinel_a():
    """Scout sentinel. ENEMY_STATS gives it 4 HP / 1.6 speed against the heavy
    sentinel_B's 5 HP / 1.5, so it should read lighter and faster: a narrow,
    tapered chassis carrying its mass low."""
    _clear()
    bpy.ops.import_scene.gltf(filepath=os.path.join(RUNTIME_DIR, 'sentinel.glb'))
    obj = _mesh_object()

    # Lean scout frame: narrow across the body, taller, and tapered so the
    # silhouette closes to a point. Vertical growth is kept modest because
    # enemy3dOverlay.normalizeRoot() scales the model to a fixed config height,
    # so a taller bounding box just shrinks the body to compensate.
    _scale_vertices(obj, 0.78, 0.70, 1.15)
    _taper(obj, 'x', 0.30)
    # Pull the mass down into the lower chassis so it does not read as the base
    # model squeezed -- the widest point moves, which is what the eye catches.
    _bulge(obj, centre_t=0.30, width_t=0.22, amount=0.16)
    _decimate_if_needed(obj)
    _export(os.path.join(RUNTIME_DIR, 'sentinel_A.glb'))
    return len(obj.data.polygons)


def build_crawler_a():
    """Brood crawler. Same stats as its base, so this one is purely visual
    variety: a broader, stockier body with a swollen abdomen, so a mixed group
    does not look cloned."""
    _clear()
    bpy.ops.import_scene.gltf(filepath=os.path.join(RUNTIME_DIR, 'alien_proto_crawler.glb'))
    obj = _mesh_object()

    # Brood form: wider across the legs, shorter front-to-back, with a swollen
    # abdomen. Same vertex-only rule as the sentinel above.
    _scale_vertices(obj, 1.22, 0.86, 0.94)
    _taper(obj, 'y', 0.18)
    _bulge(obj, centre_t=0.55, width_t=0.28, amount=0.20)
    _decimate_if_needed(obj)
    _export(os.path.join(RUNTIME_DIR, 'alien_proto_crawler_A.glb'))
    return len(obj.data.polygons)


if __name__ == '__main__':
    print(f'[variant-meshes] sentinel_A polys={build_sentinel_a()}')
    print(f'[variant-meshes] alien_proto_crawler_A polys={build_crawler_a()}')
    print('[variant-meshes] done')
