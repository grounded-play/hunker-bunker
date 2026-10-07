#!/usr/bin/env python3
"""Build seamless PBR wall textures for Sprint 53 (W4):
- geothermal_wall: basalt plating over volcanic rock with glowing molten fissures
- hive_resin_wall: alien hive resin over industrial frame with bioluminescent veins
"""
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / 'public/3d/runtime/kits/textures'
OUT_DIR.mkdir(parents=True, exist_ok=True)

SIZE = 1024

def make_seamless(arr, margin_ratio=0.18):
    H, W = arr.shape[:2]
    rolled = np.roll(np.roll(arr, H // 2, axis=0), W // 2, axis=1)
    dy = np.abs(np.arange(H) - H / 2.0) / (H / 2.0)
    dx = np.abs(np.arange(W) - W / 2.0) / (W / 2.0)
    wy = 0.5 * (1.0 - np.cos(np.pi * np.clip(dy / (2.0 * margin_ratio), 0.0, 1.0)))
    wx = 0.5 * (1.0 - np.cos(np.pi * np.clip(dx / (2.0 * margin_ratio), 0.0, 1.0)))
    w2d = np.minimum(wy[:, None], wx[None, :])
    if arr.ndim == 3:
        w2d = w2d[:, :, None]
    return rolled * w2d + arr * (1.0 - w2d)

def compute_normal_map(arr_rgb, strength=3.5):
    lum = 0.299 * arr_rgb[:, :, 0] + 0.587 * arr_rgb[:, :, 1] + 0.114 * arr_rgb[:, :, 2]
    padded = np.pad(lum, 1, mode='wrap')
    sobel_x = (
        -1.0 * padded[:-2, :-2] + 1.0 * padded[:-2, 2:] +
        -2.0 * padded[1:-1, :-2] + 2.0 * padded[1:-1, 2:] +
        -1.0 * padded[2:, :-2] + 1.0 * padded[2:, 2:]
    )
    sobel_y = (
        -1.0 * padded[:-2, :-2] - 2.0 * padded[:-2, 1:-1] - 1.0 * padded[:-2, 2:] +
         1.0 * padded[2:, :-2] + 2.0 * padded[2:, 1:-1] + 1.0 * padded[2:, 2:]
    )
    nx = -sobel_x * strength
    ny = -sobel_y * strength
    nz = np.ones_like(nx)
    norm = np.sqrt(nx**2 + ny**2 + nz**2)
    nx /= norm
    ny /= norm
    nz /= norm
    normal_rgb = np.stack([(nx * 0.5 + 0.5), (ny * 0.5 + 0.5), (nz * 0.5 + 0.5)], axis=-1)
    return np.clip(normal_rgb * 255.0, 0, 255).astype(np.uint8)

def generate_geothermal():
    rng = np.random.default_rng(5301)
    y, x = np.mgrid[0:SIZE, 0:SIZE] / float(SIZE)
    
    # Basalt stone base: dark charcoal/black with granular noise
    base = np.zeros((SIZE, SIZE, 3), dtype=np.float32)
    noise = rng.normal(0, 0.06, (SIZE, SIZE, 1)).astype(np.float32)
    basalt_col = np.array([0.09, 0.09, 0.10], dtype=np.float32)
    base += basalt_col + noise
    
    # Industrial panel plates (bolted square panels with bevels)
    panel_x = (x * 4.0) % 1.0
    panel_y = (y * 4.0) % 1.0
    seam_x = np.minimum(panel_x, 1.0 - panel_x)
    seam_y = np.minimum(panel_y, 1.0 - panel_y)
    seam_dist = np.minimum(seam_x, seam_y)
    plate_mask = np.clip(seam_dist * 20.0, 0.0, 1.0)[:, :, None]
    
    gunmetal_col = np.array([0.22, 0.23, 0.25], dtype=np.float32)
    base = base * (1.0 - plate_mask * 0.6) + (gunmetal_col + noise * 0.5) * (plate_mask * 0.6)
    
    # Molten volcanic fissures in the seams
    fissure_noise = np.sin(x * 18.0 + y * 6.0) * np.cos(y * 14.0 - x * 4.0)
    fissure_mask = np.clip((1.0 - seam_dist * 35.0) + fissure_noise * 0.3, 0.0, 1.0)
    fissure_mask = (fissure_mask ** 3.0)[:, :, None]
    
    molten_col = np.array([0.98, 0.45, 0.08], dtype=np.float32)
    sulphur_col = np.array([0.72, 0.68, 0.22], dtype=np.float32)
    base = base * (1.0 - fissure_mask) + (molten_col * 0.85 + sulphur_col * 0.15) * fissure_mask
    
    base = np.clip(base, 0.0, 1.0)
    seamless_rgb = make_seamless(base, margin_ratio=0.15)
    
    # Emissive: glowing magma in fissures
    emissive = np.zeros_like(seamless_rgb)
    em_mask = fissure_mask[:, :, 0]
    em_mask = make_seamless(em_mask, margin_ratio=0.15)
    emissive[:, :, 0] = np.clip(em_mask * 1.0, 0, 1)
    emissive[:, :, 1] = np.clip(em_mask * 0.42, 0, 1)
    emissive[:, :, 2] = np.clip(em_mask * 0.05, 0, 1)
    
    # Roughness: plates are medium (0.5), basalt is rough (0.8), magma is low (0.2)
    rough = np.full((SIZE, SIZE), 0.75, dtype=np.float32)
    rough = rough * (1.0 - plate_mask[:, :, 0] * 0.3) - em_mask * 0.45
    rough = make_seamless(np.clip(rough, 0.1, 0.95), margin_ratio=0.15)
    
    # Normal
    normal = compute_normal_map(seamless_rgb, strength=4.0)
    
    color_img = Image.fromarray((seamless_rgb * 255.0).astype(np.uint8))
    normal_img = Image.fromarray(normal)
    rough_img = Image.fromarray((rough * 255.0).astype(np.uint8))
    emiss_img = Image.fromarray((emissive * 255.0).astype(np.uint8))
    
    color_img.save(OUT_DIR / 'geothermal_wall_color.webp', quality=88, method=6)
    normal_img.save(OUT_DIR / 'geothermal_wall_normal.webp', quality=90, method=6)
    rough_img.save(OUT_DIR / 'geothermal_wall_rough.webp', quality=85, method=6)
    emiss_img.save(OUT_DIR / 'geothermal_wall_emissive.webp', quality=88, method=6)
    print('  ✓ Geothermal wall PBR textures generated')

def generate_hive_resin():
    rng = np.random.default_rng(5302)
    y, x = np.mgrid[0:SIZE, 0:SIZE] / float(SIZE)
    
    # Vertical dripping resin cords and cartilage ribs
    drips = np.sin(x * 24.0 + np.sin(y * 12.0) * 1.5) * 0.5 + 0.5
    flow = np.sin(y * 8.0 + x * 6.0) * 0.3 + 0.7
    ribs = (drips * flow) ** 1.6
    
    noise = rng.normal(0, 0.04, (SIZE, SIZE)).astype(np.float32)
    ribs = np.clip(ribs + noise, 0.0, 1.0)[:, :, None]
    
    # Glossy amber-black resin color
    dark_resin = np.array([0.08, 0.06, 0.05], dtype=np.float32)
    amber_resin = np.array([0.28, 0.18, 0.06], dtype=np.float32)
    base = dark_resin + (amber_resin - dark_resin) * ribs
    
    # Bioluminescent emerald veins threading through the resin
    vein_pattern = np.abs(np.sin(x * 14.0 + np.cos(y * 18.0) * 2.2) * np.sin(y * 16.0 - x * 5.0))
    vein_mask = np.clip((0.15 - vein_pattern) * 10.0, 0.0, 1.0)[:, :, None]
    emerald_col = np.array([0.10, 0.85, 0.40], dtype=np.float32)
    base = base * (1.0 - vein_mask * 0.7) + emerald_col * (vein_mask * 0.7)
    
    base = np.clip(base, 0.0, 1.0)
    seamless_rgb = make_seamless(base, margin_ratio=0.15)
    
    # Emissive: emerald bioluminescent pulse
    emissive = np.zeros_like(seamless_rgb)
    em_mask = vein_mask[:, :, 0]
    em_mask = make_seamless(em_mask, margin_ratio=0.15)
    emissive[:, :, 0] = np.clip(em_mask * 0.12, 0, 1)
    emissive[:, :, 1] = np.clip(em_mask * 0.95, 0, 1)
    emissive[:, :, 2] = np.clip(em_mask * 0.45, 0, 1)
    
    # Roughness: wet glistening mucosal sheen (0.22 to 0.45)
    rough = 0.26 + 0.18 * (1.0 - ribs[:, :, 0])
    rough = make_seamless(np.clip(rough, 0.12, 0.65), margin_ratio=0.15)
    
    # Normal: deep ribbed cords
    normal = compute_normal_map(seamless_rgb, strength=4.5)
    
    color_img = Image.fromarray((seamless_rgb * 255.0).astype(np.uint8))
    normal_img = Image.fromarray(normal)
    rough_img = Image.fromarray((rough * 255.0).astype(np.uint8))
    emiss_img = Image.fromarray((emissive * 255.0).astype(np.uint8))
    
    color_img.save(OUT_DIR / 'hive_resin_wall_color.webp', quality=88, method=6)
    normal_img.save(OUT_DIR / 'hive_resin_wall_normal.webp', quality=90, method=6)
    rough_img.save(OUT_DIR / 'hive_resin_wall_rough.webp', quality=85, method=6)
    emiss_img.save(OUT_DIR / 'hive_resin_wall_emissive.webp', quality=88, method=6)
    print('  ✓ Hive resin wall PBR textures generated')

def generate_geothermal_floor():
    rng = np.random.default_rng(5303)
    y, x = np.mgrid[0:SIZE, 0:SIZE] / float(SIZE)

    base = np.zeros((SIZE, SIZE, 3), dtype=np.float32)
    noise = rng.normal(0, 0.05, (SIZE, SIZE, 1)).astype(np.float32)
    basalt_col = np.array([0.08, 0.08, 0.09], dtype=np.float32)
    base += basalt_col + noise

    # Hexagonal / tile floor grid
    tx = (x * 6.0) % 1.0
    ty = (y * 6.0) % 1.0
    tile_dist = np.minimum(np.minimum(tx, 1.0 - tx), np.minimum(ty, 1.0 - ty))
    plate_mask = np.clip(tile_dist * 24.0, 0.0, 1.0)[:, :, None]

    gunmetal_col = np.array([0.18, 0.19, 0.20], dtype=np.float32)
    base = base * (1.0 - plate_mask * 0.7) + (gunmetal_col + noise * 0.4) * (plate_mask * 0.7)

    fissure_mask = np.clip((1.0 - tile_dist * 40.0) + rng.normal(0, 0.15, (SIZE, SIZE)), 0.0, 1.0)
    fissure_mask = (fissure_mask ** 3.5)[:, :, None]
    molten_col = np.array([0.96, 0.42, 0.06], dtype=np.float32)
    base = base * (1.0 - fissure_mask) + molten_col * fissure_mask
    base = np.clip(base, 0.0, 1.0)
    seamless_rgb = make_seamless(base, margin_ratio=0.15)

    emissive = np.zeros_like(seamless_rgb)
    em_mask = make_seamless(fissure_mask[:, :, 0], margin_ratio=0.15)
    emissive[:, :, 0] = np.clip(em_mask * 0.95, 0, 1)
    emissive[:, :, 1] = np.clip(em_mask * 0.38, 0, 1)
    emissive[:, :, 2] = np.clip(em_mask * 0.04, 0, 1)

    rough = np.full((SIZE, SIZE), 0.78, dtype=np.float32)
    rough = rough * (1.0 - plate_mask[:, :, 0] * 0.25) - em_mask * 0.5
    rough = make_seamless(np.clip(rough, 0.1, 0.95), margin_ratio=0.15)

    normal = compute_normal_map(seamless_rgb, strength=3.5)

    Image.fromarray((seamless_rgb * 255.0).astype(np.uint8)).save(OUT_DIR / 'geothermal_floor_color.webp', quality=88, method=6)
    Image.fromarray(normal).save(OUT_DIR / 'geothermal_floor_normal.webp', quality=90, method=6)
    Image.fromarray((rough * 255.0).astype(np.uint8)).save(OUT_DIR / 'geothermal_floor_rough.webp', quality=85, method=6)
    Image.fromarray((emissive * 255.0).astype(np.uint8)).save(OUT_DIR / 'geothermal_floor_emissive.webp', quality=88, method=6)
    print('  ✓ Geothermal floor PBR textures generated')

def generate_hive_resin_floor():
    rng = np.random.default_rng(5304)
    y, x = np.mgrid[0:SIZE, 0:SIZE] / float(SIZE)

    # Pooling wet resin spread
    pools = np.sin(x * 12.0) * np.cos(y * 12.0) * 0.5 + 0.5
    noise = rng.normal(0, 0.05, (SIZE, SIZE)).astype(np.float32)
    pools = np.clip(pools + noise, 0.0, 1.0)[:, :, None]

    dark_resin = np.array([0.06, 0.05, 0.04], dtype=np.float32)
    amber_resin = np.array([0.22, 0.15, 0.05], dtype=np.float32)
    base = dark_resin + (amber_resin - dark_resin) * pools

    vein_pattern = np.abs(np.sin(x * 10.0 + y * 8.0) * np.sin(y * 12.0 - x * 6.0))
    vein_mask = np.clip((0.12 - vein_pattern) * 8.0, 0.0, 1.0)[:, :, None]
    emerald_col = np.array([0.08, 0.80, 0.35], dtype=np.float32)
    base = base * (1.0 - vein_mask * 0.65) + emerald_col * (vein_mask * 0.65)
    base = np.clip(base, 0.0, 1.0)
    seamless_rgb = make_seamless(base, margin_ratio=0.15)

    emissive = np.zeros_like(seamless_rgb)
    em_mask = make_seamless(vein_mask[:, :, 0], margin_ratio=0.15)
    emissive[:, :, 0] = np.clip(em_mask * 0.10, 0, 1)
    emissive[:, :, 1] = np.clip(em_mask * 0.90, 0, 1)
    emissive[:, :, 2] = np.clip(em_mask * 0.40, 0, 1)

    rough = 0.20 + 0.22 * (1.0 - pools[:, :, 0])
    rough = make_seamless(np.clip(rough, 0.10, 0.60), margin_ratio=0.15)

    normal = compute_normal_map(seamless_rgb, strength=3.8)

    Image.fromarray((seamless_rgb * 255.0).astype(np.uint8)).save(OUT_DIR / 'hive_resin_floor_color.webp', quality=88, method=6)
    Image.fromarray(normal).save(OUT_DIR / 'hive_resin_floor_normal.webp', quality=90, method=6)
    Image.fromarray((rough * 255.0).astype(np.uint8)).save(OUT_DIR / 'hive_resin_floor_rough.webp', quality=85, method=6)
    Image.fromarray((emissive * 255.0).astype(np.uint8)).save(OUT_DIR / 'hive_resin_floor_emissive.webp', quality=88, method=6)
    print('  ✓ Hive resin floor PBR textures generated')

if __name__ == '__main__':
    generate_geothermal()
    generate_geothermal_floor()
    generate_hive_resin()
    generate_hive_resin_floor()
    print('[Sprint 53] W4 wall & floor textures ready!')
