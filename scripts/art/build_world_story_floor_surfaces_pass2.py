#!/usr/bin/env python3
"""Build the 2026-10-12 Pass 2 world-story floor surfaces (4 prompts x 4 variants = 16 textures)."""

import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_world_story_floor_surfaces import (
    SIZE,
    bc7_levels,
    delight,
    derive_ao,
    derive_height,
    derive_metalness,
    derive_normal,
    derive_roughness,
    edge_error,
    load_source,
    luminance,
    make_tileable,
    save_png,
    write_ktx2,
)

ROOT = Path(__file__).resolve().parent.parent.parent
SOURCE_DIR = ROOT / 'art/source/textures/world-story-2026-10-12-pass2/raw'
PBR_DIR = ROOT / 'art/source/textures/world-story-2026-10-12-pass2/pbr'
RUNTIME_DIR = ROOT / 'public/3d/runtime/surfaces'

SURFACES = {
    'tex_floor_cryo_shattered_permafrost': dict(normal=4.5, rough=(0.15, 0.55), metal=0.10, delight=0.60),
    'tex_floor_royal_jelly_calcification': dict(normal=4.2, rough=(0.12, 0.48), metal=0.05, delight=0.55),
    'tex_floor_spent_casings_drift': dict(normal=5.0, rough=(0.35, 0.75), metal=0.70, delight=0.65),
    'tex_floor_corporate_decon_foam': dict(normal=4.0, rough=(0.55, 0.90), metal=0.0, delight=0.60),
}


def build_surface(path, settings, seed):
    name = path.stem
    rgb = delight(load_source(path), settings['delight'])
    before = edge_error(luminance(rgb))
    rgb = make_tileable(rgb, seed)
    after = edge_error(luminance(rgb))

    height = derive_height(rgb)
    normal = derive_normal(height, settings['normal'])
    ao = derive_ao(height)
    roughness = derive_roughness(rgb, height, settings['rough'])
    metalness = derive_metalness(rgb, settings['metal'])

    PBR_DIR.mkdir(parents=True, exist_ok=True)
    save_png(PBR_DIR / f'{name}_albedo.png', rgb)
    save_png(PBR_DIR / f'{name}_normal.png', normal * 0.5 + 0.5)
    save_png(PBR_DIR / f'{name}_roughness.png', roughness)
    save_png(PBR_DIR / f'{name}_height.png', height)
    save_png(PBR_DIR / f'{name}_ao.png', ao)
    save_png(PBR_DIR / f'{name}_metallic.png', metalness)

    albedo = np.concatenate((rgb * (0.82 + 0.18 * ao[..., None]), metalness[..., None]), -1)
    detail = np.concatenate((normal[..., :2] * 0.5 + 0.5, roughness[..., None], height[..., None]), -1)
    RUNTIME_DIR.mkdir(parents=True, exist_ok=True)
    write_ktx2(RUNTIME_DIR / f'{name}_albedo.ktx2', bc7_levels(albedo, False), SIZE, srgb=True)
    write_ktx2(RUNTIME_DIR / f'{name}_detail.ktx2', bc7_levels(detail, True), SIZE, srgb=False)
    return {
        'name': name,
        'edgeBefore': round(before, 2),
        'edgeAfter': round(after, 2),
        'bytes': sum((RUNTIME_DIR / f'{name}_{m}.ktx2').stat().st_size for m in ('albedo', 'detail')),
    }


def main():
    prefixes = sys.argv[1:]
    report = []
    paths = sorted(SOURCE_DIR.glob('*.jpg'))
    print(f'[pbr-surfaces-pass2] processing {len(paths)} files from {SOURCE_DIR}')
    for index, path in enumerate(paths):
        if prefixes and not any(path.stem.startswith(p) for p in prefixes):
            continue
        family = path.stem[:-2]  # strip '_a', '_b', etc.
        if family in SURFACES:
            res = build_surface(path, SURFACES[family], index)
            report.append(res)
            print(json.dumps(res), flush=True)
        else:
            print(f'[pbr-surfaces-pass2] skipping unconfigured: {family}')
    total = sum(entry['bytes'] for entry in report)
    print(f'[world-story floor surfaces pass2] {len(report)} maps, {total / 1_048_576:.1f} MiB')


if __name__ == '__main__':
    main()
