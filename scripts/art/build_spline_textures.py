#!/usr/bin/env python3
"""Bake the spline conduit textures (wires, veins, coolant pipes, vines, metal
collars) from bands of the owner's sticker art.

Each layer comes from one band of a keyed sticker (scripts/art/build_stickers.py
writes them to art/source/decals/lived-in-pass-2/keyed/): the band is cut out,
made seamless along its length, and turned so the length runs down the image
(texture v = along the run, u = around it, matching
src/splineGeometry.js). Writes, per layer,
  public/3d/runtime/splines/spline_<kind>_albedo.ktx2   RGB (sRGB), A unused
  public/3d/runtime/splines/spline_<kind>_detail.ktx2   R/G normal, B roughness, A metalness
in the layer order of src/splineDressingRenderer.js SPLINE_LAYERS.

  /tmp/hbtex/bin/python scripts/art/build_spline_textures.py
"""

import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_floor_surfaces import bc7_levels, luminance, write_ktx2  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent.parent
KEYED = ROOT / 'art/source/decals/lived-in-pass-2/keyed'
OUT = ROOT / 'public/3d/runtime/splines'
SIZE = 512

# The band's height is the conduit's diameter as drawn, so a length of
# pi * height is one circumference: each layer keeps TURNS circumferences of
# length, and the geometry repeats it every TURNS * 2 * pi * radius metres
# (SPLINE_LAYERS[].turns in src/splineDressingRenderer.js).
TURNS = 2
# kind: (sticker, band rows y0-y1, first column, roughness, metalness, normal strength)
LAYERS = [
    ('wire', 'decal_floor_taped_cables_a', (14, 112), 60, 0.55, 0.05, 3.0),
    ('vein', 'decal_edge_resin_creep_a', (95, 235), 100, 0.28, 0.0, 3.5),
    ('pipe', 'decal_edge_frost_creep_c', (20, 72), 80, 0.35, 0.35, 2.5),
    ('vine', 'decal_edge_resin_creep_a', (255, 340), 200, 0.75, 0.0, 3.0),
    ('metal', 'decal_blend_cracked_seam_b', (35, 135), 0, 0.45, 0.75, 3.0),
]


def seamless_along(rgb, blend=0.18):
    """Cross-fade the run's two ends so it repeats along its length (axis 0)."""
    length = rgb.shape[0]
    overlap = int(length * blend)
    head = rgb[:overlap]
    tail = rgb[-overlap:]
    weight = np.linspace(0.0, 1.0, overlap)[:, None, None]
    joined = rgb[:-overlap].copy()
    joined[:overlap] = tail * (1.0 - weight) + head * weight
    return joined


def band(name, rows, first):
    image = Image.open(KEYED / f'{name}.png').convert('RGBA')
    rgba = np.asarray(image, dtype=np.float32) / 255.0
    # TURNS circumferences of length, plus the overlap seamless_along eats.
    length = int(round((rows[1] - rows[0]) * math.pi * TURNS / (1 - 0.18)))
    crop = rgba[rows[0]:rows[1], first:first + length]
    rgb, alpha = crop[..., :3], crop[..., 3:]
    # Holes in the band (between strands) read as shadowed depth, not key colour.
    rgb = rgb * alpha + (1.0 - alpha) * rgb.mean(axis=(0, 1)) * 0.25
    # Length runs down the image: rows = along the conduit, columns = around it.
    return np.ascontiguousarray(np.transpose(rgb, (1, 0, 2)))


def resize(rgb, width, height):
    planes = [np.asarray(Image.fromarray(rgb[..., c].astype(np.float32), mode='F').resize((width, height), Image.Resampling.LANCZOS))
              for c in range(3)]
    return np.clip(np.stack(planes, -1), 0.0, 1.0)


def normal_from(height, strength):
    dx = ndimage.sobel(height, axis=1, mode='wrap') / 8.0
    dy = ndimage.sobel(height, axis=0, mode='wrap') / 8.0
    n = np.stack((-dx * strength * 2, -dy * strength * 2, np.ones_like(height)), -1)
    return n / np.linalg.norm(n, axis=-1, keepdims=True)


def build(kind, name, rows, first, rough, metal, strength):
    rgb = seamless_along(band(name, rows, first))
    rgb = resize(rgb, SIZE, SIZE)
    height = luminance(rgb)
    height = (height - height.min()) / max(1e-6, np.ptp(height))
    normal = normal_from(ndimage.gaussian_filter(height, 0.8, mode='wrap'), strength)
    roughness = np.clip(rough + (0.5 - height) * 0.2, 0.05, 1.0)
    metalness = np.full(height.shape, metal)
    albedo = np.concatenate((rgb, np.ones(height.shape)[..., None]), -1)
    detail = np.concatenate((normal[..., :2] * 0.5 + 0.5, roughness[..., None], metalness[..., None]), -1)
    OUT.mkdir(parents=True, exist_ok=True)
    write_ktx2(OUT / f'spline_{kind}_albedo.ktx2', bc7_levels(albedo, False), SIZE, srgb=True)
    write_ktx2(OUT / f'spline_{kind}_detail.ktx2', bc7_levels(detail, True), SIZE, srgb=False)
    Image.fromarray((rgb * 255).astype(np.uint8)).save(KEYED.parent / f'spline_{kind}_preview.png')
    print(f'[splines] {kind}: from {name} rows {rows}')


def main():
    for layer in LAYERS:
        build(*layer)


if __name__ == '__main__':
    main()
