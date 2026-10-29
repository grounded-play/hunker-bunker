#!/usr/bin/env python3
"""Process the 2026-10-16 World Expansion 80 raster intake.

Inputs are preserved in art/raw. Outputs:
- alpha-keyed compatibility decals in public/
- keyed archive in art/source/decals/world-expansion-80-2026-10-16/keyed/
- seamless WebP PBR suites in art/source/textures/world-expansion-80-2026-10-16/pbr/
  and BC7 bakes in public/3d/runtime/surfaces/ (PBR webp masters stay in art/source)
- BC7 KTX2 albedo/detail layers for every surface variant

The source `(2)`..`(4)` files are visual variants, not PBR channels.
"""

from __future__ import annotations

import re
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

from build_floor_surfaces import bc7_levels, write_ktx2

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / 'art/raw'
DECAL_SOURCE = ROOT / 'art/source/decals/world-expansion-80-2026-10-16/keyed'
PBR_SOURCE = ROOT / 'art/source/textures/world-expansion-80-2026-10-16/pbr'
PUBLIC = ROOT / 'public'
RUNTIME_SURFACES = PUBLIC / '3d/runtime/surfaces'
SIZE = 1024
SURFACE_VARIANT_SUFFIX = ['_a', '_b', '_c', '_d']
DECAL_VARIANT_SUFFIX = ['', '_b', '_c', '_d']

SURFACES = {
    'tex_camp_private_worn_felt': dict(rough=(0.58, 0.92), metal=0.00, normal=2.0, emissive=None),
    'tex_camp_robbed_contact_dust': dict(rough=(0.66, 0.96), metal=0.06, normal=2.4, emissive=None),
    'tex_ceiling_service_condensate': dict(rough=(0.20, 0.72), metal=0.68, normal=3.4, emissive='cyan'),
    'tex_covenant_two_hand_ivory': dict(rough=(0.26, 0.76), metal=0.05, normal=3.0, emissive='amber'),
    'tex_evac_coldchain_frost_deck': dict(rough=(0.30, 0.88), metal=0.52, normal=3.8, emissive='cyan'),
    'tex_evac_queue_burnished_deck': dict(rough=(0.24, 0.70), metal=0.76, normal=3.8, emissive='amber'),
    'tex_flood_tide_mineral': dict(rough=(0.30, 0.90), metal=0.20, normal=4.0, emissive=None),
    'tex_hazard_routed_conduit_wall': dict(rough=(0.26, 0.72), metal=0.64, normal=4.0, emissive='amber'),
    'tex_meridian_covenant_bus_floor': dict(rough=(0.22, 0.74), metal=0.72, normal=4.2, emissive='cyan'),
    'tex_moving_floor_recess_grease': dict(rough=(0.18, 0.74), metal=0.70, normal=3.8, emissive=None),
    'tex_recruited_packdown_canvas_floor': dict(rough=(0.52, 0.92), metal=0.02, normal=3.0, emissive=None),
    'tex_refusal_cautery_scale': dict(rough=(0.30, 0.78), metal=0.06, normal=3.6, emissive='red'),
    'tex_secret_memory_membrane': dict(rough=(0.14, 0.58), metal=0.02, normal=3.2, emissive='red'),
    'tex_tallow_red_mold_filter_floor': dict(rough=(0.38, 0.86), metal=0.05, normal=3.6, emissive='lime'),
    'tex_turned_resin_ingress': dict(rough=(0.12, 0.62), metal=0.18, normal=4.0, emissive='cyan'),
    'tex_vesper_oiled_tally_deck': dict(rough=(0.20, 0.68), metal=0.78, normal=4.0, emissive='amber'),
}


def source_variants(stem: str) -> list[Path]:
    paths = [RAW / f'{stem}.jpg'] + [RAW / f'{stem} ({i}).jpg' for i in range(2, 5)]
    return [path for path in paths if path.exists()]


def make_seamless(array: np.ndarray, margin: int = 128) -> np.ndarray:
    """Feather each opposing pixel pair to the same edge value."""
    out = array.copy()
    h, w = out.shape[:2]
    margin = min(margin, h // 4, w // 4)
    for d in range(margin):
        weight = 0.5 * (1.0 + np.cos(np.pi * d / margin))
        top = out[d].copy()
        bottom = out[h - 1 - d].copy()
        mean = (top + bottom) * 0.5
        out[d] = top * (1.0 - weight) + mean * weight
        out[h - 1 - d] = bottom * (1.0 - weight) + mean * weight
    for d in range(margin):
        weight = 0.5 * (1.0 + np.cos(np.pi * d / margin))
        left = out[:, d].copy()
        right = out[:, w - 1 - d].copy()
        mean = (left + right) * 0.5
        out[:, d] = left * (1.0 - weight) + mean * weight
        out[:, w - 1 - d] = right * (1.0 - weight) + mean * weight
    return out


def luminance(rgb: np.ndarray) -> np.ndarray:
    return rgb[..., 0] * 0.2126 + rgb[..., 1] * 0.7152 + rgb[..., 2] * 0.0722


def normal_xy(height: np.ndarray, strength: float) -> np.ndarray:
    dx = ndimage.sobel(height, axis=1, mode='wrap') * strength
    dy = ndimage.sobel(height, axis=0, mode='wrap') * strength
    nz = np.ones_like(dx)
    length = np.sqrt(dx * dx + dy * dy + nz * nz)
    return np.stack([-dx / length * 0.5 + 0.5, dy / length * 0.5 + 0.5], axis=-1)


def emissive_for(rgb: np.ndarray, kind: str | None) -> np.ndarray:
    out = np.zeros_like(rgb)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    if kind == 'cyan':
        mask = (b > 0.34) & (g > 0.30) & (b > r * 1.18)
        out[mask] = np.array([0.05, 0.55, 0.78])
    elif kind == 'amber':
        mask = (r > 0.48) & (g > 0.28) & (r > b * 1.45)
        out[mask] = np.array([0.72, 0.35, 0.04])
    elif kind == 'lime':
        mask = (g > 0.34) & (g > r * 1.10) & (g > b * 1.25)
        out[mask] = np.array([0.34, 0.62, 0.04])
    elif kind == 'red':
        mask = (r > 0.38) & (r > g * 1.35) & (r > b * 1.25)
        out[mask] = np.array([0.55, 0.05, 0.04])
    return out


def save_surface(stem: str, variant: int, path: Path, config: dict) -> dict:
    if variant == 0:
        # Remove outputs from the pre-registration naming pass. Runtime arrays
        # require an explicit `_a`; unsuffixed copies are dead payload.
        for target, channels in (
            (PBR_SOURCE, ('baseColor.webp', 'normal.webp', 'orm.webp', 'emissive.webp')),
            (RUNTIME_SURFACES, ('baseColor.webp', 'normal.webp', 'orm.webp', 'emissive.webp', 'albedo.ktx2', 'detail.ktx2')),
        ):
            for channel in channels:
                (target / f'{stem}_{channel}').unlink(missing_ok=True)
    image = Image.open(path).convert('RGB').resize((SIZE, SIZE), Image.Resampling.LANCZOS)
    rgb = np.asarray(image, dtype=np.float32) / 255.0
    rgb = make_seamless(np.power(rgb, 2.2))
    rgb = np.power(np.clip(rgb, 0.0, 1.0), 1.0 / 2.2)
    height = make_seamless(ndimage.gaussian_filter(luminance(rgb), 0.8, mode='wrap'))
    normal = normal_xy(height, config['normal'])
    low, high = config['rough']
    wet = np.clip((0.42 - height) / 0.42, 0.0, 1.0)
    rough = np.clip(high - wet * (high - low), 0.04, 0.98)
    metal = np.clip(config['metal'] + (height - 0.5) * (0.18 if config['metal'] > 0.2 else 0.03), 0.0, 1.0)
    emissive = emissive_for(rgb, config['emissive'])
    ao = np.clip(0.78 + (height - ndimage.gaussian_filter(height, 8, mode='wrap')) * 1.8, 0.25, 1.0)

    name = f'{stem}{SURFACE_VARIANT_SUFFIX[variant]}'
    base = (rgb * 255).astype(np.uint8)
    normal_rgb = np.dstack([normal, np.sqrt(np.clip(1.0 - np.sum((normal * 2 - 1) ** 2, axis=-1), 0, 1))])
    orm = np.dstack([ao, rough, metal])
    detail = np.dstack([normal, rough, height])
    albedo = np.dstack([rgb, metal])

    # The PBR maps are masters: the game samples only the BC7 bakes below, so
    # webp copies in public/ were 75 MiB of dead payload (retail-asset audit).
    for target in (PBR_SOURCE,):
        target.mkdir(parents=True, exist_ok=True)
        Image.fromarray(base, 'RGB').save(target / f'{name}_baseColor.webp', 'WEBP', quality=92, method=6)
        Image.fromarray((normal_rgb * 255).astype(np.uint8), 'RGB').save(target / f'{name}_normal.webp', 'WEBP', quality=91, method=6)
        Image.fromarray((orm * 255).astype(np.uint8), 'RGB').save(target / f'{name}_orm.webp', 'WEBP', quality=90, method=6)
        Image.fromarray((emissive * 255).astype(np.uint8), 'RGB').save(target / f'{name}_emissive.webp', 'WEBP', quality=90, method=6)

    RUNTIME_SURFACES.mkdir(parents=True, exist_ok=True)
    write_ktx2(RUNTIME_SURFACES / f'{name}_albedo.ktx2', bc7_levels((albedo * 255).astype(np.uint8), False), SIZE, srgb=True)
    write_ktx2(RUNTIME_SURFACES / f'{name}_detail.ktx2', bc7_levels((detail * 255).astype(np.uint8), True), SIZE, srgb=False)
    edge_error = max(float(np.abs(rgb[0] - rgb[-1]).mean()), float(np.abs(rgb[:, 0] - rgb[:, -1]).mean()))
    return {'name': name, 'edge_error': edge_error}


def robust_background(rgb: np.ndarray) -> tuple[np.ndarray, float]:
    rim = 24
    border = np.concatenate([
        rgb[:rim].reshape(-1, 3), rgb[-rim:].reshape(-1, 3),
        rgb[:, :rim].reshape(-1, 3), rgb[:, -rim:].reshape(-1, 3),
    ])
    chroma = border.max(axis=1) - border.min(axis=1)
    neutral = border[chroma < 18]
    if len(neutral) < 256:
        neutral = border
    bg = np.median(neutral, axis=0)
    distance = np.linalg.norm(neutral - bg, axis=1)
    spread = float(np.median(np.abs(distance - np.median(distance))) * 1.4826)
    return bg, max(4.0, spread)


def key_decal(path: Path) -> tuple[Image.Image, dict]:
    image = Image.open(path).convert('RGB').resize((SIZE, SIZE), Image.Resampling.LANCZOS)
    rgb = np.asarray(image, dtype=np.float32)
    bg, spread = robust_background(rgb)
    distance = np.linalg.norm(rgb - bg, axis=-1)
    chroma = rgb.max(axis=-1) - rgb.min(axis=-1)
    candidate = (distance < max(16.0, spread * 3.5)) & (chroma < 32.0)

    # Only background connected to an image edge becomes transparent.
    seed = np.zeros(candidate.shape, dtype=bool)
    seed[0] = candidate[0]
    seed[-1] = candidate[-1]
    seed[:, 0] |= candidate[:, 0]
    seed[:, -1] |= candidate[:, -1]
    connected = ndimage.binary_propagation(seed, mask=candidate)
    foreground = (~connected).astype(np.float32)
    alpha = ndimage.gaussian_filter(foreground, 1.15)
    alpha = np.clip((alpha - 0.04) / 0.92, 0.0, 1.0)

    safe = np.maximum(alpha[..., None], 0.08)
    unmix = (rgb - bg * (1.0 - alpha[..., None])) / safe
    out_rgb = np.clip(unmix, 0, 255)
    out_rgb[alpha < 0.005] = 0
    rgba = np.dstack([out_rgb.astype(np.uint8), (alpha * 255).astype(np.uint8)])
    return Image.fromarray(rgba, 'RGBA'), {
        'background': [round(float(v), 2) for v in bg],
        'coverage': round(float((alpha > 0.02).mean()), 5),
    }


def process_decals() -> list[dict]:
    DECAL_SOURCE.mkdir(parents=True, exist_ok=True)
    stems = sorted({re.sub(r' \([234]\)$', '', p.stem) for p in RAW.glob('decal_*.jpg')
                    if p.stat().st_mtime >= 1792162200})
    report = []
    for stem in stems:
        for variant, path in enumerate(source_variants(stem)):
            keyed, stats = key_decal(path)
            suffix = DECAL_VARIANT_SUFFIX[variant]
            name = f'{stem}{suffix}'
            keyed.save(DECAL_SOURCE / f'{name}.png', 'PNG', optimize=True)
            # The game loads /decal_*.png and build_stickers.py bakes the PBR
            # layers from the same root copy; a second copy under
            # 3d/runtime/decals was an unused duplicate (retail-asset audit).
            keyed.save(PUBLIC / f'{name}.png', 'PNG', optimize=True)
            report.append({'name': name, 'source': path.name, **stats})
    return report


def main() -> None:
    surface_report = []
    for stem, config in SURFACES.items():
        paths = source_variants(stem)
        if len(paths) != 4:
            raise SystemExit(f'{stem}: expected 4 variants, found {len(paths)}')
        for variant, path in enumerate(paths):
            surface_report.append(save_surface(stem, variant, path, config))
    decal_report = process_decals()
    print(f'[world80-art] surfaces={len(surface_report)} max_edge_error={max(r["edge_error"] for r in surface_report):.6f}')
    print(f'[world80-art] decals={len(decal_report)} coverage={min(r["coverage"] for r in decal_report):.3f}..{max(r["coverage"] for r in decal_report):.3f}')


if __name__ == '__main__':
    main()
