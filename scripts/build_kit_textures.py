#!/usr/bin/env python3
"""Build the tiling surface textures for the Kenney modular kits.

    python3 scripts/build_kit_textures.py

Kenney's kits colour every piece from one 512px flat palette, so up close
they read as untextured toys. The kit pieces now carry world-scale box UVs
and a floor/wall material split (scripts/blender/texture_kit_pieces.py), and
the game shares one material per skin and surface (src/kitMaterials.js) built
from these maps.

Sources: Poly Haven, CC0 (https://polyhaven.com/license), downloaded at 1k into
art/source/textures/polyhaven/ (not shipped). The colour map is graded into the
game's palette: dark, desaturated and slightly cool. Normal and roughness maps
are converted unchanged. Output: public/3d/runtime/kits/textures/*.webp.
"""
import colorsys
import json
import urllib.request
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'art/source/textures/polyhaven'
OUT = ROOT / 'public/3d/runtime/kits/textures'

# skin_surface -> Poly Haven id, colour grade (saturation, value, tint rgb).
SETS = {
    # Damp cave rock: the warm sandstone pulled down to wet basalt.
    'cave_wall': ('rock_face_03', 0.38, 0.52, (0.92, 0.98, 1.0)),
    'cave_floor': ('brown_mud_rocks_01', 0.45, 0.55, (0.95, 0.97, 1.0)),
    # Dead-megacorp steel: riveted panels and tread plate, cold and dark.
    'space_wall': ('metal_plate_02', 0.30, 0.62, (0.90, 0.97, 1.05)),
    'space_floor': ('metal_plate', 0.25, 0.58, (0.92, 0.98, 1.04)),
}
MAPS = (('Diffuse', 'diff'), ('nor_gl', 'nor'), ('Rough', 'rough'))


def fetch(asset_id):
    SRC.mkdir(parents=True, exist_ok=True)
    files = None
    for key, name in MAPS:
        path = SRC / f'{asset_id}_{name}_1k.jpg'
        if path.exists():
            continue
        if files is None:
            with urllib.request.urlopen(f'https://api.polyhaven.com/files/{asset_id}') as response:
                files = json.load(response)
        urllib.request.urlretrieve(files[key]['1k']['jpg']['url'], path)


def grade(image, saturation, value, tint):
    pixels = image.convert('RGB').load()
    width, height = image.size
    out = Image.new('RGB', image.size)
    target = out.load()
    for y in range(height):
        for x in range(width):
            r, g, b = (c / 255 for c in pixels[x, y])
            h, s, v = colorsys.rgb_to_hsv(r, g, b)
            r, g, b = colorsys.hsv_to_rgb(h, s * saturation, v * value)
            target[x, y] = tuple(min(255, round(c * t * 255)) for c, t in zip((r, g, b), tint))
    return out


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for name, (asset_id, saturation, value, tint) in SETS.items():
        fetch(asset_id)
        diff = Image.open(SRC / f'{asset_id}_diff_1k.jpg')
        grade(diff, saturation, value, tint).save(OUT / f'{name}_color.webp', quality=88, method=6)
        Image.open(SRC / f'{asset_id}_nor_1k.jpg').convert('RGB').save(OUT / f'{name}_normal.webp', quality=92, method=6)
        Image.open(SRC / f'{asset_id}_rough_1k.jpg').convert('L').save(OUT / f'{name}_rough.webp', quality=85, method=6)
        print(f'[kit-textures] {name} <- {asset_id}')


if __name__ == '__main__':
    main()
