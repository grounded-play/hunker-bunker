#!/usr/bin/env python3
"""Key and bake the lived-in pass 2 stickers (D1-D20) and the wall kick-plate
band (T13) into runtime decal layers.

docs/planning/lived-in-world-pass-2-2026-10-09.md, Parts 3 and 4. The owner
made four versions of each sticker; all ship.

Keying is a soft difference matte, not the runtime's hard flood fill: alpha
comes from how far a pixel's colour sits from the key, measured against the
key colour read from the image's own border (some renders drift off pure
#00FF00), then the key's spill is pulled out of the edge pixels. D3 and D9
were rendered on magenta so their green resin and spores survive.

Each sticker is trimmed to its content and stretched into a 1024x512 layer;
the decal quad restores its aspect. Tall stickers (wall streaks, soot) are
turned on their side first so they keep their resolution, and the quad turns
them back.

Writes, per sticker version:
  art/source/decals/lived-in-pass-2/keyed/<name>.png   keyed RGBA for review
  public/3d/runtime/decals/<name>_albedo.ktx2   RGB colour (sRGB), A coverage
  public/3d/runtime/decals/<name>_detail.ktx2   R/G normal x/y, B roughness,
                                                A metalness (linear)
and src/data/stickerLayers.js, the generated layer table.

Same environment as build_floor_surfaces.py:
  /tmp/hbtex/bin/python scripts/art/build_stickers.py [name-prefix ...]
  /tmp/hbtex/bin/python scripts/art/build_stickers.py --legacy [--force]
      room-dressing PNG decals (public/decal_*.png) -> PBR layers; incremental
"""

import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_floor_surfaces import bc7_levels, derive_normal, luminance, write_ktx2  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent.parent
STICKER_DIR = ROOT / 'art/source/decals/lived-in-pass-2'
TEXTURE_DIR = ROOT / 'art/source/textures/lived-in-pass-2'
KEYED_DIR = STICKER_DIR / 'keyed'
RUNTIME_DIR = ROOT / 'public/3d/runtime/decals'
TABLE_PATH = ROOT / 'src/data/stickerLayers.js'
LAYER_W, LAYER_H = 1024, 512

# Roughness and metalness per sticker family; normal strength for the relief.
FAMILIES = {
    'decal_edge_wallbase_grime': dict(rough=0.92, metal=0.0, normal=2.5),
    'decal_edge_frost_creep': dict(rough=0.3, metal=0.0, normal=2.0),
    'decal_edge_resin_creep': dict(rough=0.25, metal=0.0, normal=3.0),
    'decal_edge_dust_drift': dict(rough=0.97, metal=0.0, normal=1.5),
    'decal_blend_mud_fan': dict(rough=0.75, metal=0.0, normal=2.0),
    'decal_blend_rust_bloom': dict(rough=0.85, metal=0.25, normal=2.5),
    'decal_blend_scuff_path': dict(rough=0.55, metal=0.1, normal=1.5),
    'decal_blend_cracked_seam': dict(rough=0.85, metal=0.05, normal=3.0),
    'decal_blend_spore_dusting': dict(rough=0.95, metal=0.0, normal=1.5),
    'decal_contact_grime': dict(rough=0.9, metal=0.0, normal=1.5),
    'decal_floor_lane_chevrons': dict(rough=0.6, metal=0.15, normal=2.0),
    'decal_butts_and_ash': dict(rough=0.9, metal=0.0, normal=2.5),
    'decal_spilled_rations': dict(rough=0.45, metal=0.3, normal=2.5),
    'decal_paper_scatter': dict(rough=0.8, metal=0.0, normal=2.0),
    'decal_spent_casings': dict(rough=0.35, metal=0.8, normal=3.0),
    'decal_wall_soot_plume': dict(rough=0.95, metal=0.0, normal=1.0),
    'decal_wall_mineral_streaks': dict(rough=0.35, metal=0.0, normal=2.0),
    'decal_floor_taped_cables': dict(rough=0.5, metal=0.05, normal=3.0),
    'decal_wall_home_mural': dict(rough=0.7, metal=0.1, normal=1.5),
    'decal_alien_tracks': dict(rough=0.6, metal=0.0, normal=2.5),
    'tex_wall_kickplate_band': dict(rough=0.65, metal=0.45, normal=3.0),
}
MAGENTA_KEYED = {'decal_edge_resin_creep', 'decal_blend_spore_dusting'}


def smoothstep(edge0, edge1, value):
    t = np.clip((value - edge0) / (edge1 - edge0), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def border_key(rgb):
    border = np.concatenate((rgb[:6].reshape(-1, 3), rgb[-6:].reshape(-1, 3),
                             rgb[:, :6].reshape(-1, 3), rgb[:, -6:].reshape(-1, 3)))
    return np.median(border, axis=0)


def key_alpha(rgb, magenta):
    """Soft matte: 0 at the key colour, 1 once the key's channel stops leading."""
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    key = border_key(rgb)
    if magenta:
        lead = np.minimum(r, b) - g
        key_lead = min(key[0], key[2]) - key[1]
    else:
        lead = g - np.maximum(r, b)
        key_lead = key[1] - max(key[0], key[2])
    key_lead = max(float(key_lead), 0.2)
    # Normalised lead: 1 = as keyed as the background, 0 or less = subject.
    keyed = lead / key_lead
    alpha = 1.0 - smoothstep(0.12, 0.62, keyed)
    # Specks fully inside the key read as dust; drop isolated noise only.
    alpha = np.where(ndimage.uniform_filter(alpha, 3) < 0.04, 0.0, alpha)
    return alpha


def despill(rgb, alpha, magenta):
    """Pull the key colour's spill out of the edges: the keyed channel(s) may
    not lead the others by more than a hair."""
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    if magenta:
        spill = np.clip(np.minimum(r, b) - (g + 0.02), 0.0, None)
        r, b = r - spill, b - spill
    else:
        # Average-based cap: haze over the key (smoke, dust) goes neutral
        # instead of olive.
        cap = (r + b) * 0.5 + 0.03
        g = np.minimum(g, cap)
    return np.clip(np.stack((r, g, b), -1), 0.0, 1.0)


def settle_edges(rgb, alpha):
    """Soft edge pixels still carry some key colour mixed in. Take their
    colour from the nearest solid part of the sticker instead, the way grit
    at an edge matches the grit beside it; alpha keeps the soft shape."""
    solid = alpha > 0.9
    if not solid.any():
        return rgb
    _, indices = ndimage.distance_transform_edt(~solid, return_indices=True)
    nearest = rgb[indices[0], indices[1]]
    keep = smoothstep(0.5, 0.9, alpha)[..., None]
    return nearest * (1.0 - keep) + rgb * keep


def bleed_colour(rgb, alpha):
    """Fill transparent texels with nearby opaque colour so mips don't fringe."""
    solid = alpha > 0.5
    if not solid.any():
        return rgb
    _, indices = ndimage.distance_transform_edt(~solid, return_indices=True)
    filled = rgb[indices[0], indices[1]]
    return np.where(solid[..., None], rgb, filled)


def trim(rgb, alpha, pad=10):
    ys, xs = np.nonzero(alpha > 0.03)
    if len(xs) == 0:
        raise ValueError('sticker keyed to nothing')
    y0, y1 = max(0, ys.min() - pad), min(alpha.shape[0], ys.max() + pad + 1)
    x0, x1 = max(0, xs.min() - pad), min(alpha.shape[1], xs.max() + pad + 1)
    return rgb[y0:y1, x0:x1], alpha[y0:y1, x0:x1]


def resize(values, width, height):
    """Lanczos resize in float, one plane at a time."""
    planes = values[..., None] if values.ndim == 2 else values
    out = [np.asarray(Image.fromarray(planes[..., c].astype(np.float32), mode='F').resize((width, height), Image.Resampling.LANCZOS))
           for c in range(planes.shape[2])]
    result = np.clip(np.stack(out, -1), 0.0, 1.0)
    return result[..., 0] if values.ndim == 2 else result


def kickplate_band(path):
    """T13 is a full wall swatch: keep it opaque, feather the top so it sinks into the wall."""
    rgb = np.asarray(Image.open(path).convert('RGB'), dtype=np.float32) / 255.0
    rows = np.linspace(0.0, 1.0, rgb.shape[0])[:, None]
    alpha = np.broadcast_to(smoothstep(0.0, 0.12, rows), rgb.shape[:2]).copy()
    return rgb, alpha


def build(path, family):
    settings = FAMILIES[family]
    if family == 'tex_wall_kickplate_band':
        rgb, alpha = kickplate_band(path)
    else:
        rgb = np.asarray(Image.open(path).convert('RGB'), dtype=np.float32) / 255.0
        magenta = family in MAGENTA_KEYED
        alpha = key_alpha(rgb, magenta)
        rgb = despill(rgb, alpha, magenta)
        rgb = settle_edges(rgb, alpha)
        rgb, alpha = trim(rgb, alpha)
    height_px, width_px = alpha.shape
    aspect = width_px / height_px
    rotated = aspect < 1.0
    if rotated:
        rgb, alpha = np.ascontiguousarray(np.rot90(rgb, -1)), np.ascontiguousarray(np.rot90(alpha, -1))
    rgb = bleed_colour(rgb, alpha)

    KEYED_DIR.mkdir(parents=True, exist_ok=True)
    keyed = np.concatenate((rgb, alpha[..., None]), -1)
    Image.fromarray((np.clip(keyed, 0, 1) * 255).astype(np.uint8), mode='RGBA').save(KEYED_DIR / f'{path.stem}.png', optimize=True)

    rgb = resize(rgb, LAYER_W, LAYER_H)
    alpha = resize(alpha, LAYER_W, LAYER_H)
    height = ndimage.gaussian_filter(luminance(rgb), 1.2) * alpha
    normal = derive_normal(height, settings['normal'])
    roughness = np.full(alpha.shape, settings['rough']) + (0.5 - luminance(rgb)) * 0.15
    metalness = np.full(alpha.shape, settings['metal'])
    albedo = np.concatenate((rgb, alpha[..., None]), -1)
    detail = np.concatenate((normal[..., :2] * 0.5 + 0.5, np.clip(roughness, 0.04, 1.0)[..., None], metalness[..., None]), -1)
    RUNTIME_DIR.mkdir(parents=True, exist_ok=True)
    write_ktx2(RUNTIME_DIR / f'{path.stem}_albedo.ktx2', bc7_levels(albedo, False), (LAYER_W, LAYER_H), srgb=True)
    write_ktx2(RUNTIME_DIR / f'{path.stem}_detail.ktx2', bc7_levels(detail, True), (LAYER_W, LAYER_H), srgb=False)
    edge = alpha[(alpha > 0.05) & (alpha < 0.95)]
    return {
        'name': path.stem,
        'aspect': round(aspect, 3),
        'rotated': rotated,
        'softEdge': round(float(edge.size) / max(1, int((alpha > 0.05).sum())), 3),
    }


def write_table(entries):
    lines = [
        '/**',
        ' * Generated by scripts/art/build_stickers.py: one entry per sticker layer,',
        ' * in decal-array order. `aspect` is the trimmed width / height before any',
        ' * turn; `rotated` stickers were turned 90 degrees to fit the 2:1 layer.',
        ' */',
        'export const STICKER_LAYERS = Object.freeze([',
    ]
    for entry in entries:
        lines.append(f"    Object.freeze({{ name: '{entry['name']}', aspect: {entry['aspect']}, rotated: {str(entry['rotated']).lower()} }}),")
    lines[-1] = lines[-1].rstrip(',')
    lines.append(']);')
    TABLE_PATH.write_text('\n'.join(lines) + '\n')


def sources():
    for path in sorted(STICKER_DIR.glob('*.jpg')):
        yield path, path.stem[:-2]
    for path in sorted(TEXTURE_DIR.glob('tex_wall_kickplate_band_*.jpg')):
        yield path, 'tex_wall_kickplate_band'


# Room-dressing PNG decals (public/decal_*.png, the older set plus whatever the
# decal agents add) get a compressed PBR twin in their own 512px array, drawn
# by the sticker renderer instead of a runtime-keyed canvas per type.
LEGACY_SIZE = 512
LEGACY_DIR = ROOT / 'public/3d/runtime/decals/legacy'
LEGACY_TABLE = ROOT / 'src/data/legacyDecalLayers.js'
# (pattern, roughness, metalness): first match wins.
LEGACY_SURFACES = [
    (r'grate|grille|medallion|panel|chevron|stripes|stencil|meridian|mirror', 0.5, 0.55),
    (r'spill|pool|seep|fluid|condensation|water|slime|sample|acid|coolant', 0.18, 0.05),
    (r'frost|fracture|ice', 0.25, 0.0),
    (r'splatter', 0.35, 0.05),
    (r'rust|scorch|burn|bullet|scars|breach|claw|bite', 0.8, 0.2),
    (r'.', 0.82, 0.0),
]


def legacy_matte(rgb, alpha):
    """Keep real alpha; otherwise key a green or near-black backdrop softly."""
    if alpha is not None and (alpha < 0.999).any():
        return rgb, alpha
    border = np.concatenate((rgb[:4].reshape(-1, 3), rgb[-4:].reshape(-1, 3), rgb[:, :4].reshape(-1, 3), rgb[:, -4:].reshape(-1, 3)))
    key = np.median(border, axis=0)
    if key[1] > 0.5 and key[1] - max(key[0], key[2]) > 0.25:
        matte = key_alpha(rgb, False)
        return despill(rgb, matte, False), matte
    if key.max() < 0.12:
        # A black backdrop: alpha from distance to black, like the runtime key.
        lum = rgb.max(-1)
        return rgb, smoothstep(0.04, 0.16, lum)
    return rgb, np.ones(rgb.shape[:2])


def build_legacy(path):
    import re
    image = Image.open(path).convert('RGBA')
    rgba = np.asarray(image, dtype=np.float32) / 255.0
    rgb, alpha = legacy_matte(rgba[..., :3], rgba[..., 3])
    rgb = settle_edges(rgb, alpha)
    aspect = image.width / image.height
    rgb = resize(rgb, LEGACY_SIZE, LEGACY_SIZE)
    alpha = resize(alpha, LEGACY_SIZE, LEGACY_SIZE)
    rough, metal = next((r, m) for pattern, r, m in LEGACY_SURFACES if re.search(pattern, path.stem))
    height = ndimage.gaussian_filter(luminance(rgb), 1.0) * alpha
    normal = derive_normal(height, 1.6)
    roughness = np.clip(np.full(alpha.shape, rough) + (0.5 - luminance(rgb)) * 0.12, 0.04, 1.0)
    albedo = np.concatenate((rgb, alpha[..., None]), -1)
    detail = np.concatenate((normal[..., :2] * 0.5 + 0.5, roughness[..., None], np.full(alpha.shape, metal)[..., None]), -1)
    LEGACY_DIR.mkdir(parents=True, exist_ok=True)
    write_ktx2(LEGACY_DIR / f'{path.stem}_albedo.ktx2', bc7_levels(albedo, False), LEGACY_SIZE, srgb=True)
    write_ktx2(LEGACY_DIR / f'{path.stem}_detail.ktx2', bc7_levels(detail, True), LEGACY_SIZE, srgb=False)
    return {'name': path.stem, 'aspect': round(aspect, 3), 'rotated': False}


def write_legacy_table(entries):
    lines = [
        '/**',
        ' * Generated by scripts/art/build_stickers.py --legacy: the room-dressing PNG',
        ' * decals (public/decal_*.png) baked to a 512px PBR KTX2 array, in layer order.',
        ' * `aspect` is the PNG\'s width / height; room dressing keeps its own sizes.',
        ' */',
        'export const LEGACY_DECAL_LAYERS = Object.freeze([',
    ]
    for entry in entries:
        lines.append(f"    Object.freeze({{ name: '{entry['name']}', aspect: {entry['aspect']}, rotated: false }}),")
    lines[-1] = lines[-1].rstrip(',')
    lines.append(']);')
    LEGACY_TABLE.write_text('\n'.join(lines) + '\n')


def main_legacy():
    """Bake every public/decal_*.png; ones whose layers are newer than the PNG
    are only re-measured, so a new delivery processes just the new decals."""
    entries = []
    baked = 0
    paths = sorted((ROOT / 'public').glob('decal_*.png'))
    for path in paths:
        albedo = LEGACY_DIR / f'{path.stem}_albedo.ktx2'
        detail = LEGACY_DIR / f'{path.stem}_detail.ktx2'
        fresh = albedo.exists() and detail.exists() and min(albedo.stat().st_mtime, detail.stat().st_mtime) >= path.stat().st_mtime
        if fresh and '--force' not in sys.argv:
            with Image.open(path) as image:
                entries.append({'name': path.stem, 'aspect': round(image.width / image.height, 3), 'rotated': False})
            continue
        entries.append(build_legacy(path))
        baked += 1
        print(f'[stickers] baked {path.stem}', flush=True)
    write_legacy_table(entries)
    print(f'[stickers] {len(entries)} legacy decal layers ({baked} baked now)')


def main():
    if '--legacy' in sys.argv:
        main_legacy()
        return
    prefixes = sys.argv[1:]
    entries = []
    for path, family in sources():
        if prefixes and not any(path.stem.startswith(p) for p in prefixes):
            continue
        entries.append(build(path, family))
        print(json.dumps(entries[-1]), flush=True)
    if not prefixes:
        write_table(entries)
    print(f'[stickers] {len(entries)} layers')


if __name__ == '__main__':
    main()
