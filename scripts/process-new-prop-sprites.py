#!/usr/bin/env python3
"""Chroma-keys the 20 new prop images from art/source/3d/
into clean transparent RGBA PNGs in public/ with optimized palettes.
"""
import os
from PIL import Image
import numpy as np

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SOURCE_DIR = os.path.join(ROOT, 'art', 'source', '3d')
OUTPUT_DIR = os.path.join(ROOT, 'public')

PROPS = [
    'prop_chair_operator_wrecked',
    'prop_conduit_junction_box',
    'prop_flesh_steel_coffin',
    'prop_flesh_steel_cradle',
    'prop_flesh_steel_inhaler',
    'prop_fungal_mycelium_loom',
    'prop_fungal_resin_basin',
    'prop_fungal_spore_dispenser',
    'prop_fungal_tendril_altar',
    'prop_icey_frost_manifold',
    'prop_icey_frost_vent',
    'prop_icey_thermal_pod',
    'prop_light_cluster_dripping',
    'prop_locker_bulged',
    'prop_pipe_rupture',
    'prop_shrine_plinth_broken',
    'prop_storage_drum_dented',
    'prop_terminal_ruptured',
    'prop_valve_wheel_fused',
    'prop_vent_grate_exploded'
]

def chroma_key_prop(img):
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
    spill_factor = np.clip(green_diff / 30.0, 0.0, 1.0)
    arr[:, :, 1] = g * (1.0 - spill_factor) + max_rb * spill_factor
    arr[:, :, 3] = alpha
    
    keyed = Image.fromarray(np.uint8(arr), mode='RGBA')
    resized = keyed.resize((256, 256), Image.Resampling.LANCZOS)
    
    # Quantize with FastOctree to keep each PNG ~18-35 KB for strict retail payload budget
    quantized = resized.quantize(colors=256, method=Image.Quantize.FASTOCTREE)
    return quantized

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    count = 0
    total_bytes = 0
    for prop in PROPS:
        src_name = f"{prop}.jpeg"
        out_name = f"{prop}.png"
        src_path = os.path.join(SOURCE_DIR, src_name)
        if not os.path.exists(src_path):
            print(f"[WARN] Missing {src_path}")
            continue
            
        im = Image.open(src_path)
        out = chroma_key_prop(im)
        out_path = os.path.join(OUTPUT_DIR, out_name)
        out.save(out_path, 'PNG', optimize=True)
        size = os.path.getsize(out_path)
        total_bytes += size
        print(f"Keyed {src_name} -> {out_name} ({size / 1024:.1f} KB)")
        count += 1
        
    print(f"\n[DONE] Keyed {count} props into {OUTPUT_DIR} (Total: {total_bytes / 1024:.1f} KB)")

if __name__ == '__main__':
    main()
