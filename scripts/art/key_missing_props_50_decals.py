#!/usr/bin/env python3
"""Chroma-key the 50 missing world-story companion decals uploaded on 2026-10-27.

Inputs: art/raw/decal_*.jpg
Outputs:
  art/source/decals/world-story-props-2026-10-27/keyed/<name>.png
  public/<name>.png
  public/3d/runtime/decals/<name>.png
"""

import csv
from pathlib import Path
from PIL import Image
import numpy as np

ROOT = Path(__file__).resolve().parent.parent.parent
RAW_DIR = ROOT / 'art/raw'
KEYED_DIR = ROOT / 'art/source/decals/world-story-props-2026-10-27/keyed'
PUBLIC_DIR = ROOT / 'public'
RUNTIME_DIR = ROOT / 'public/3d/runtime/decals'
TSV_PATH = ROOT / 'docs/planning/missing-world-story-3d-props-and-decals-2026-10-27.tsv'

KEYED_DIR.mkdir(parents=True, exist_ok=True)
RUNTIME_DIR.mkdir(parents=True, exist_ok=True)
PUBLIC_DIR.mkdir(parents=True, exist_ok=True)


def key_grey_image(img_path):
    img = Image.open(img_path).convert('RGB')
    arr = np.array(img, dtype=np.float32)
    H, W = arr.shape[:2]

    # Sample outer border (16px rim) to accurately estimate background neutral grey
    border_mask = np.ones((H, W), dtype=bool)
    border_mask[16:-16, 16:-16] = False
    bg = arr[border_mask].mean(axis=0)

    # Euclidean color distance from background
    dist = np.sqrt(np.sum((arr - bg) ** 2, axis=-1))

    # Smoothstep alpha curve:
    # Under 10 distance: completely transparent
    # Above 26 distance: fully opaque
    # In between: smooth cubic hermite interpolation
    t = np.clip((dist - 10.0) / 16.0, 0.0, 1.0)
    alpha = t * t * (3.0 - 2.0 * t)

    # Edge despill / unmixing:
    # Remove background grey component from fringe pixels so no grey halo remains
    out_rgb = np.zeros_like(arr)
    fringe = alpha > 0.002
    safe_alpha = np.maximum(alpha, 0.08)[:, :, None]
    out_rgb[fringe] = np.clip((arr[fringe] - bg * (1.0 - alpha[fringe, None])) / safe_alpha[fringe], 0, 255)

    out_rgba = np.dstack([out_rgb.astype(np.uint8), (alpha * 255.0).astype(np.uint8)])
    return Image.fromarray(out_rgba, mode='RGBA')


def main():
    with open(TSV_PATH, mode='r', encoding='utf-8') as f:
        reader = csv.DictReader(f, delimiter='\t')
        decal_rows = [r for r in reader if r['kind'] == 'decal']

    print(f"[decal_keyer] Found {len(decal_rows)} decals in TSV.")
    total_keyed = 0

    for row in decal_rows:
        base_id = row['id']
        # Locate matching files in art/raw
        exact_file = RAW_DIR / f"{base_id}.jpg"
        matching_files = []
        if exact_file.exists():
            matching_files.append((base_id, exact_file))
        else:
            # Check for numbered variants like decal_armory_spent_brass_scatter1.jpg
            variants = sorted(RAW_DIR.glob(f"{base_id}*.jpg"))
            for v in variants:
                stem = v.stem
                matching_files.append((stem, v))

        if not matching_files:
            print(f"[WARN] No raw file found for {base_id}")
            continue

        for target_name, path in matching_files:
            keyed_img = key_grey_image(path)

            keyed_dest = KEYED_DIR / f"{target_name}.png"
            keyed_img.save(keyed_dest, 'PNG', optimize=True)

            pub_dest = PUBLIC_DIR / f"{target_name}.png"
            keyed_img.save(pub_dest, 'PNG', optimize=True)

            runtime_dest = RUNTIME_DIR / f"{target_name}.png"
            keyed_img.save(runtime_dest, 'PNG', optimize=True)

            # If this is a variant like decal_armory_spent_brass_scatter1 and base_id doesn't exist yet, save base_id too
            if target_name != base_id and not (PUBLIC_DIR / f"{base_id}.png").exists():
                keyed_img.save(PUBLIC_DIR / f"{base_id}.png", 'PNG', optimize=True)
                keyed_img.save(RUNTIME_DIR / f"{base_id}.png", 'PNG', optimize=True)
                keyed_img.save(KEYED_DIR / f"{base_id}.png", 'PNG', optimize=True)
                print(f"  [KEYED BASE] {base_id}.png (from {target_name})")

            total_keyed += 1
            print(f"  [KEYED] {target_name}.png ({keyed_img.size[0]}x{keyed_img.size[1]})")

    print(f"[decal_keyer] Successfully keyed {total_keyed} decal files.")


if __name__ == '__main__':
    main()
