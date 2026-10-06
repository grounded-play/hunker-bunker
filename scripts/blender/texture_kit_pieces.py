"""Prepare Kenney modular kit pieces for tiling surface textures.

    blender -b -P scripts/blender/texture_kit_pieces.py -- --kit modular-cave-kit

Replaces scripts/blender/restyle_kit_pieces.py's output. That pass swapped the
palette for Blender procedural noise, which glTF cannot carry, so the runtime
got flat dark grey; and it Draco-compressed the pieces, which no game loader
can decode, so none of them ever loaded.

Per piece (art/source/kits/<kit>/Models/GLB format/*.glb):
- Geometry, origin and units are kept exactly: the kit's value is its 4-unit
  socket grid, and src/world3dOverlay.js scales every piece by one factor.
- Kenney's flat palette is baked into a grey vertex tint (0.62..1.0 by palette
  luminance), so trims and insets still read as different without its colour.
- UVs are box-projected in world units (TILE units per texture repeat), so the
  texture density is the same on every piece and seams line up across pieces.
- Faces split into two materials by normal: `kit_floor` (facing up) and
  `kit_wall` (everything else). src/kitMaterials.js shares one textured
  material per kit skin and surface at runtime.
- Exported without Draco, then scripts/kits/meshopt_lossless.mjs (lossless).
"""
import argparse
import sys
from pathlib import Path

import bpy

ROOT = Path(__file__).resolve().parent.parent.parent
TILE = 2.5          # world units per texture repeat (Kenney units are metres)
FLOOR_NORMAL_Z = 0.7

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
parser = argparse.ArgumentParser()
parser.add_argument('--kit', required=True)
parser.add_argument('--out', default='public/3d/runtime/kits')
args = parser.parse_args(argv)

src_dir = ROOT / 'art/source/kits' / args.kit / 'Models' / 'GLB format'
out_dir = ROOT / args.out / args.kit
out_dir.mkdir(parents=True, exist_ok=True)


def palette_pixels(image):
    width, height = image.size
    return width, height, list(image.pixels)


def luminance(r, g, b):
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def surface_material(name):
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    bsdf.inputs['Base Color'].default_value = (1, 1, 1, 1)
    bsdf.inputs['Metallic'].default_value = 0.0
    bsdf.inputs['Roughness'].default_value = 0.8
    # Route the vertex tint through the material so the exporter keeps it.
    attr = mat.node_tree.nodes.new('ShaderNodeVertexColor')
    attr.layer_name = 'KitTint'
    mat.node_tree.links.new(attr.outputs['Color'], bsdf.inputs['Base Color'])
    return mat


written = 0
for source in sorted(src_dir.glob('*.glb')):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(source))
    meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    wall = surface_material('kit_wall')
    floor = surface_material('kit_floor')
    for obj in meshes:
        bpy.ops.object.select_all(action='DESELECT')
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
        mesh = obj.data
        # Palette sample per corner, from the piece's own colormap image.
        image = None
        for slot in obj.material_slots:
            if slot.material and slot.material.use_nodes:
                tex = next((n for n in slot.material.node_tree.nodes if n.type == 'TEX_IMAGE' and n.image), None)
                if tex:
                    image = tex.image
                    break
        src_uv = mesh.uv_layers.active
        tint = mesh.color_attributes.new('KitTint', 'BYTE_COLOR', 'CORNER')
        if image and src_uv:
            width, height, pixels = palette_pixels(image)
            lums = []
            for loop in mesh.loops:
                u, v = src_uv.data[loop.index].uv
                px = min(width - 1, max(0, int((u % 1.0) * width)))
                py = min(height - 1, max(0, int((v % 1.0) * height)))
                i = (py * width + px) * 4
                lums.append(luminance(*pixels[i:i + 3]))
            lo, hi = min(lums), max(lums)
            for loop_index, lum in enumerate(lums):
                t = 0.62 + 0.38 * ((lum - lo) / (hi - lo) if hi > lo else 1.0)
                tint.data[loop_index].color = (t, t, t, 1.0)
        else:
            for item in tint.data:
                item.color = (1, 1, 1, 1)
        mesh.color_attributes.active_color = tint

        # World-unit box projection replaces the palette UVs.
        while len(mesh.uv_layers) > 1:
            mesh.uv_layers.remove(mesh.uv_layers[-1])
        uv = mesh.uv_layers[0] if mesh.uv_layers else mesh.uv_layers.new(name='UVMap')
        mesh.materials.clear()
        mesh.materials.append(wall)
        mesh.materials.append(floor)
        for poly in mesh.polygons:
            n = poly.normal
            ax, ay, az = abs(n.x), abs(n.y), abs(n.z)
            poly.material_index = 1 if n.z > FLOOR_NORMAL_Z else 0
            for loop_index in poly.loop_indices:
                co = mesh.vertices[mesh.loops[loop_index].vertex_index].co
                if az >= ax and az >= ay:
                    u, v = co.x, co.y
                elif ax >= ay:
                    u, v = co.y, co.z
                else:
                    u, v = co.x, co.z
                uv.data[loop_index].uv = (u / TILE, v / TILE)
    for image in list(bpy.data.images):
        bpy.data.images.remove(image)

    out_path = out_dir / source.name
    bpy.ops.export_scene.gltf(
        filepath=str(out_path),
        export_format='GLB',
        export_materials='EXPORT',
        export_vertex_color='ACTIVE',
        export_apply=True,
        export_draco_mesh_compression_enable=False,
    )
    written += 1

print(f'[texture_kit_pieces] {args.kit}: {written} pieces -> {out_dir}')
