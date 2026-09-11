#!/usr/bin/env python3
"""Chroma-keys the 25 Sprint 34 decal images from art/source/3d/
into clean transparent RGBA PNGs in public/ with optimized palettes.
"""
import os
from PIL import Image
import numpy as np

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SOURCE_DIR = os.path.join(ROOT, 'art', 'source', '3d')
OUTPUT_DIR = os.path.join(ROOT, 'public')

# Mapping from source file in art/source/3d/ to output filename in public/
DECAL_MAP = {
    # 12 Floor decals
    'arch_floor_medallion_01.jpeg': 'decal_floor_medallion_01.png',
    'arch_floor_medallion_02.jpeg': 'decal_floor_medallion_02.png',
    'arch_floor_medallion_03.jpeg': 'decal_floor_medallion_03.png',
    'arch_floor_medallion_04.jpeg': 'decal_floor_medallion_04.png',
    'fixture_floor_grate_01.jpeg': 'decal_floor_grate_01.png',
    'fixture_floor_grate_02.jpeg': 'decal_floor_grate_02.png',
    'fixture_floor_grate_03.jpeg': 'decal_floor_grate_03.png',
    'fixture_floor_grate_04.jpeg': 'decal_floor_grate_04.png',
    'decal_friction_burn.jpeg': 'decal_friction_burn.png',
    'decal_flesh_press.jpeg': 'decal_flesh_press.png',
    'decal_fluid_seep.jpeg': 'decal_fluid_seep.png',
    'decal_condensation_run.jpeg': 'decal_condensation_run.png',

    # 13 Wall decals
    'arch_wall_panel_grille_01.jpeg': 'decal_wall_panel_grille_01.png',
    'arch_wall_panel_grille_02.jpeg': 'decal_wall_panel_grille_02.png',
    'arch_wall_panel_grille_03.jpeg': 'decal_wall_panel_grille_03.png',
    'arch_wall_panel_relief.jpeg': 'decal_wall_panel_relief.png',
    'fixture_mirror_tarnished.jpeg': 'decal_mirror_tarnished.png',
    'decal_lacquer_blister_01.jpeg': 'decal_lacquer_blister_01.png',
    'decal_lacquer_blister_02.jpeg': 'decal_lacquer_blister_02.png',
    'decal_lacquer_blister_03.jpeg': 'decal_lacquer_blister_03.png',
    'decal_bite_marks_02.jpeg': 'decal_bite_marks_02.png',
    'decal_bite_marks_03.jpeg': 'decal_bite_marks_03.png',
    'decal_spore_stain_01.jpeg': 'decal_spore_stain_01.png',
    'decal_spore_stain_02.jpeg': 'decal_spore_stain_02.png',
    'decal_spore_stain_03.jpeg': 'decal_spore_stain_03.png',
}

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
    spill_factor = np.clip(green_diff / 30.0, 0.0, 1.0)
    arr[:, :, 1] = g * (1.0 - spill_factor) + max_rb * spill_factor
    arr[:, :, 3] = alpha
    
    keyed = Image.fromarray(np.uint8(arr), mode='RGBA')
    resized = keyed.resize((256, 256), Image.Resampling.LANCZOS)
    
    # Quantize with FastOctree to keep each PNG ~18-25 KB for strict retail payload budget
    quantized = resized.quantize(colors=256, method=Image.Quantize.FASTOCTREE)
    return quantized

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    count = 0
    total_bytes = 0
    for src_name, out_name in DECAL_MAP.items():
        src_path = os.path.join(SOURCE_DIR, src_name)
        if not os.path.exists(src_path):
            print(f"[WARN] Missing {src_path}")
            continue
            
        im = Image.open(src_path)
        out = chroma_key_decal(im)
        out_path = os.path.join(OUTPUT_DIR, out_name)
        out.save(out_path, 'PNG', optimize=True)
        size = os.path.getsize(out_path)
        total_bytes += size
        print(f"Keyed {src_name} -> {out_name} ({size / 1024:.1f} KB)")
        count += 1
        
    print(f"\n[DONE] Keyed {count} decals into {OUTPUT_DIR} (Total: {total_bytes / 1024:.1f} KB)")

if __name__ == '__main__':
    main()
