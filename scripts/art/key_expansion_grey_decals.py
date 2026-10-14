#!/usr/bin/env python3
"""Chroma-key all 12 expansion grey decals (4 variants each = 48 raw inputs).

Inputs: art/raw/decal_*.jpg
Outputs:
  art/source/decals/world-expansion-2026-10-14/keyed/<name>_<variant>.png
  public/<name>.png (primary variant)
  public/<name>_<variant>.png
  public/3d/runtime/decals/<name>.png
"""

import os
import glob
from pathlib import Path
from PIL import Image
import numpy as np

ROOT = Path(__file__).resolve().parent.parent.parent
RAW_DIR = ROOT / 'art/raw'
KEYED_DIR = ROOT / 'art/source/decals/world-expansion-2026-10-14/keyed'
PUBLIC_DIR = ROOT / 'public'
RUNTIME_DIR = ROOT / 'public/3d/runtime/decals'

KEYED_DIR.mkdir(parents=True, exist_ok=True)
RUNTIME_DIR.mkdir(parents=True, exist_ok=True)

DECAL_NAMES = [
    'decal_alien_embryo_crown',
    'decal_amputation_arterial_spray',
    'decal_chasm_shear_fault_line',
    'decal_corp_confidential_seal',
    'decal_crash_drag_skid_trench',
    'decal_evac_seat_assignment_stencil',
    'decal_geothermal_steam_scorch',
    'decal_hive_symbiont_trail',
    'decal_meridian_binary_litany',
    'decal_tina_dermis_shed_residue',
    'decal_vass_neural_diagram',
    'decal_vesper_kill_tally',
]


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
    # If a pixel is semi-transparent, remove the background grey component so no grey fringe remains
    out_rgb = np.zeros_like(arr)
    fringe = alpha > 0.002
    safe_alpha = np.maximum(alpha, 0.08)[:, :, None]
    out_rgb[fringe] = np.clip((arr[fringe] - bg * (1.0 - alpha[fringe, None])) / safe_alpha[fringe], 0, 255)

    # Combine into RGBA
    out_rgba = np.dstack([out_rgb.astype(np.uint8), (alpha * 255.0).astype(np.uint8)])
    return Image.fromarray(out_rgba, mode='RGBA')


def main():
    print(f"[decal_keyer] Starting grey keying for {len(DECAL_NAMES)} decal sets...")
    
    total_processed = 0
    for base_name in DECAL_NAMES:
        # 4 files: base_name.jpg, base_name (2).jpg, base_name (3).jpg, base_name (4).jpg
        variants = [
            ('a', RAW_DIR / f"{base_name}.jpg"),
            ('b', RAW_DIR / f"{base_name} (2).jpg"),
            ('c', RAW_DIR / f"{base_name} (3).jpg"),
            ('d', RAW_DIR / f"{base_name} (4).jpg"),
        ]
        
        for suffix, path in variants:
            if not path.exists():
                print(f"  [WARN] Missing {path.name}")
                continue
            
            keyed_img = key_grey_image(path)
            
            # Save to keyed archive
            keyed_dest = KEYED_DIR / f"{base_name}_{suffix}.png"
            keyed_img.save(keyed_dest, 'PNG', optimize=True)
            
            # Save variant to public
            pub_variant = PUBLIC_DIR / f"{base_name}_{suffix}.png"
            keyed_img.save(pub_variant, 'PNG', optimize=True)
            
            # If variant a, also save as default un-suffixed decal
            if suffix == 'a':
                pub_primary = PUBLIC_DIR / f"{base_name}.png"
                keyed_img.save(pub_primary, 'PNG', optimize=True)
                runtime_dest = RUNTIME_DIR / f"{base_name}.png"
                keyed_img.save(runtime_dest, 'PNG', optimize=True)
            
            total_processed += 1
            print(f"  [KEYED] {base_name}_{suffix}.png (size {keyed_img.size[0]}x{keyed_img.size[1]})")

    print(f"[decal_keyer] Completed. Successfully keyed {total_processed} decal variants.")


if __name__ == '__main__':
    main()
