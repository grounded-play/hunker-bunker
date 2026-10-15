#!/usr/bin/env python3
"""Chroma-key all 32 magenta decals/strips (8 prompts x 4 variants) from 2026-10-12 world story."""

from pathlib import Path
from PIL import Image
import numpy as np

ROOT = Path(__file__).resolve().parent.parent.parent
RAW_DIR = ROOT / 'art/source/decals/world-story-2026-10-12/raw'
KEYED_DIR = ROOT / 'art/source/decals/world-story-2026-10-12/keyed'
PUBLIC_DIR = ROOT / 'public'

KEYED_DIR.mkdir(parents=True, exist_ok=True)
PUBLIC_DIR.mkdir(parents=True, exist_ok=True)

DECAL_BASES = [
    ('strip_arterial_spray_trail', 'decal_strip_arterial_spray'),
    ('strip_acid_trench_burn', 'decal_strip_acid_trench'),
    ('strip_viscera_drag_chute', 'decal_strip_viscera_drag'),
    ('strip_high_voltage_scorch', 'decal_strip_high_voltage_scorch'),
    ('strip_frost_heave_split', 'decal_strip_frost_heave'),
    ('strip_umbilical_vein_bundle', 'decal_strip_umbilical_veins'),
    ('decal_execution_wall_splatter', 'decal_execution_wall_splatter'),
    ('decal_queen_oviposition_pool', 'decal_queen_oviposition_pool'),
]

VARIANTS = ['a', 'b', 'c', 'd']


def key_image(img_path):
    img = Image.open(img_path).convert('RGBA')
    arr = np.array(img, dtype=np.float32)

    r = arr[..., 0]
    g = arr[..., 1]
    b = arr[..., 2]

    # Magenta screen is high R, low G, high B
    magenta_diff = np.minimum(r, b) - g
    diff_norm = np.clip(magenta_diff, 0, 255)

    # Thresholds: low diff is foreground (opaque), high diff is magenta screen (transparent)
    alpha = np.clip(1.0 - (diff_norm - 35.0) / 40.0, 0.0, 1.0)

    # Despill: pull excess magenta down towards green in fringe areas
    fringe_mask = (alpha > 0.0) & (alpha < 0.98)
    excess_magenta = np.maximum(0.0, np.minimum(r, b) - g)
    r[fringe_mask] -= excess_magenta[fringe_mask] * 0.75
    b[fringe_mask] -= excess_magenta[fringe_mask] * 0.75

    arr[..., 0] = np.clip(r, 0, 255)
    arr[..., 1] = np.clip(g, 0, 255)
    arr[..., 2] = np.clip(b, 0, 255)
    arr[..., 3] = alpha * 255.0

    out_arr = arr.astype(np.uint8)
    return Image.fromarray(out_arr, mode='RGBA')


def main():
    count = 0
    for raw_prefix, public_prefix in DECAL_BASES:
        for var in VARIANTS:
            raw_filename = f'{raw_prefix}_{var}.jpg'
            raw_path = RAW_DIR / raw_filename
            if not raw_path.exists():
                print(f"[SKIP] {raw_path} not found")
                continue

            keyed_img = key_image(raw_path)

            # Save to keyed archive
            keyed_archive_path = KEYED_DIR / f'{raw_prefix}_{var}.png'
            keyed_img.save(keyed_archive_path, format='PNG')

            # Save variant to public under both raw and decal prefix
            pub_var_path1 = PUBLIC_DIR / f'{public_prefix}_{var}.png'
            pub_var_path2 = PUBLIC_DIR / f'{raw_prefix}_{var}.png'
            keyed_img.save(pub_var_path1, format='PNG')
            if pub_var_path1 != pub_var_path2:
                keyed_img.save(pub_var_path2, format='PNG')

            # If variant 'a', also save as canonical un-suffixed decal name in public
            if var == 'a':
                canon_path1 = PUBLIC_DIR / f'{public_prefix}.png'
                canon_path2 = PUBLIC_DIR / f'{raw_prefix}.png'
                keyed_img.save(canon_path1, format='PNG')
                if canon_path1 != canon_path2:
                    keyed_img.save(canon_path2, format='PNG')

            count += 1
            print(f"[KEYED] {raw_filename} -> {keyed_archive_path.name} & {pub_var_path1.name}")

    print(f"Keyed {count} decal files successfully!")


if __name__ == '__main__':
    main()
