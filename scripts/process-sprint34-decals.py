#!/usr/bin/env python3
"""Chroma-keys the 15 Sprint 34 decal JPEGs from art/source/3d/sprint34-raw/
into clean transparent RGBA PNGs in public/.
"""
import os
from PIL import Image
import numpy as np

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SOURCE_DIR = os.path.join(ROOT, 'art', 'source', '3d', 'sprint34-raw')
OUTPUT_DIR = os.path.join(ROOT, 'public')

DECALS = [
    'decal_frost_bloom_1',
    'decal_frost_bloom_2',
    'decal_graffiti_tally_1',
    'decal_graffiti_tally_2',
    'decal_grease_pool',
    'decal_growth_creep_1',
    'decal_growth_creep_2',
    'decal_hand_smears_1',
    'decal_hand_smears_2',
    'decal_rust_bleed_1',
    'decal_rust_bleed_2',
    'decal_scorch_bloom',
    'decal_vine_iron_shadow_1',
    'decal_vine_iron_shadow_2',
    'decal_water_stain'
]

def chroma_key_decal(img):
    img = img.convert('RGBA')
    arr = np.array(img, dtype=np.float32)
    r, g, b, a = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2], arr[:, :, 3]
    
    # Calculate green dominance against max of red and blue
    max_rb = np.maximum(r, b)
    green_diff = g - max_rb
    
    # Smooth alpha mask:
    # green_diff > 35 -> alpha = 0 (background)
    # green_diff < 10 -> alpha = 255 (foreground)
    # in between -> linear transition
    alpha = np.clip(1.0 - (green_diff - 10.0) / 25.0, 0.0, 1.0) * 255.0
    
    # Despill to remove green fringes on translucent edges:
    # clamp G channel toward max_rb proportionally to spill
    spill_factor = np.clip(green_diff / 30.0, 0.0, 1.0)
    arr[:, :, 1] = g * (1.0 - spill_factor) + max_rb * spill_factor
    arr[:, :, 3] = alpha
    
    keyed = Image.fromarray(np.uint8(arr), mode='RGBA')
    
    # Resize to 512x512 for optimal runtime performance and memory budget
    return keyed.resize((512, 512), Image.Resampling.LANCZOS)

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    count = 0
    for slug in DECALS:
        src_path = os.path.join(SOURCE_DIR, f"{slug}.jpeg")
        if not os.path.exists(src_path):
            print(f"[WARN] Missing {src_path}")
            continue
            
        im = Image.open(src_path)
        out = chroma_key_decal(im)
        out_path = os.path.join(OUTPUT_DIR, f"{slug}.png")
        out.save(out_path, 'PNG', optimize=True)
        size_kb = os.path.getsize(out_path) / 1024
        print(f"Keyed {slug}.jpeg -> {slug}.png ({size_kb:.1f} KB)")
        count += 1
        
    print(f"\n[DONE] Successfully keyed {count} decals into {OUTPUT_DIR}")

if __name__ == '__main__':
    main()
