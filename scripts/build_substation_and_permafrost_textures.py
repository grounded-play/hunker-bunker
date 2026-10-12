#!/usr/bin/env python3
"""Build seamless PBR wall and ground/floor textures for Substation & Permafrost kits.
Generates full PBR suites: color, normal, rough, and optional emissive maps in WebP format.
"""
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / 'public/3d/runtime/kits/textures'
OUT_DIR.mkdir(parents=True, exist_ok=True)
BRAIN_DIR = Path('/home/caveman/.gemini/antigravity-ide/brain/5fba5a6a-fc55-4d48-bec6-b60551f7381b')

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

def generate_substation_wall():
    # Load AI-generated master
    master_path = BRAIN_DIR / 'tex_substation_wall_1791620273448.jpg'
    if master_path.exists():
        im = Image.open(master_path).convert('RGB').resize((SIZE, SIZE), Image.Resampling.LANCZOS)
        arr = np.array(im, dtype=np.float32) / 255.0
    else:
        arr = np.full((SIZE, SIZE, 3), 0.45, dtype=np.float32)

    seamless = make_seamless(arr, margin_ratio=0.15)
    normal = compute_normal_map(seamless, strength=3.8)
    
    # Concrete is rough (0.8), steel ribs are smooth (0.35)
    lum = 0.299 * seamless[:, :, 0] + 0.587 * seamless[:, :, 1] + 0.114 * seamless[:, :, 2]
    rough = 0.4 + 0.4 * lum
    rough = make_seamless(np.clip(rough, 0.25, 0.9), margin_ratio=0.15)

    Image.fromarray((seamless * 255.0).astype(np.uint8)).save(OUT_DIR / 'substation_wall_color.webp', quality=88, method=6)
    Image.fromarray(normal).save(OUT_DIR / 'substation_wall_normal.webp', quality=90, method=6)
    Image.fromarray((rough * 255.0).astype(np.uint8)).save(OUT_DIR / 'substation_wall_rough.webp', quality=85, method=6)
    print('  ✓ Substation wall PBR textures generated')

def generate_substation_floor():
    rng = np.random.default_rng(7002)
    y, x = np.mgrid[0:SIZE, 0:SIZE] / float(SIZE)

    # Dark gunmetal plate base with noise
    base = np.zeros((SIZE, SIZE, 3), dtype=np.float32)
    noise = rng.normal(0, 0.04, (SIZE, SIZE, 1)).astype(np.float32)
    plate_col = np.array([0.16, 0.17, 0.18], dtype=np.float32)
    base += plate_col + noise

    # Diamond tread crosshatch relief pattern
    d1 = np.sin((x + y) * 48.0) * 0.5 + 0.5
    d2 = np.sin((x - y) * 48.0) * 0.5 + 0.5
    tread = ((d1 * d2) ** 3.0)[:, :, None]
    
    tread_col = np.array([0.28, 0.29, 0.31], dtype=np.float32)
    base = base * (1.0 - tread * 0.6) + tread_col * (tread * 0.6)

    # Bolt seams and perimeter drainage channels
    seam_x = np.abs((x * 4.0) % 1.0 - 0.5)
    seam_y = np.abs((y * 4.0) % 1.0 - 0.5)
    groove = np.clip((np.minimum(seam_x, seam_y) - 0.46) * 30.0, 0.0, 1.0)[:, :, None]
    groove_col = np.array([0.05, 0.05, 0.06], dtype=np.float32)
    base = base * (1.0 - groove) + groove_col * groove

    base = np.clip(base, 0.0, 1.0)
    seamless_rgb = make_seamless(base, margin_ratio=0.15)
    normal = compute_normal_map(seamless_rgb, strength=4.2)
    rough = 0.42 + 0.28 * (1.0 - tread[:, :, 0])
    rough = make_seamless(np.clip(rough, 0.25, 0.85), margin_ratio=0.15)

    Image.fromarray((seamless_rgb * 255.0).astype(np.uint8)).save(OUT_DIR / 'substation_floor_color.webp', quality=88, method=6)
    Image.fromarray(normal).save(OUT_DIR / 'substation_floor_normal.webp', quality=90, method=6)
    Image.fromarray((rough * 255.0).astype(np.uint8)).save(OUT_DIR / 'substation_floor_rough.webp', quality=85, method=6)
    print('  ✓ Substation floor PBR textures generated')

def generate_permafrost_wall():
    rng = np.random.default_rng(7003)
    y, x = np.mgrid[0:SIZE, 0:SIZE] / float(SIZE)

    # Dark basalt bedrock with deep blue glacial permafrost ice rime
    base = np.zeros((SIZE, SIZE, 3), dtype=np.float32)
    noise = rng.normal(0, 0.05, (SIZE, SIZE, 1)).astype(np.float32)
    dark_rock = np.array([0.08, 0.10, 0.13], dtype=np.float32)
    base += dark_rock + noise

    # Radial crystalline frost fracture bands
    frost_pattern = np.sin(x * 16.0 + np.cos(y * 12.0) * 1.8) * np.sin(y * 18.0 - x * 6.0)
    frost_mask = np.clip((frost_pattern + 0.3) * 1.5, 0.0, 1.0)[:, :, None]
    ice_col = np.array([0.35, 0.65, 0.82], dtype=np.float32)
    base = base * (1.0 - frost_mask * 0.75) + ice_col * (frost_mask * 0.75)

    # Subsurface crystalline glowing veins
    vein_noise = np.abs(np.sin(x * 24.0 + y * 14.0) * np.cos(y * 22.0 - x * 10.0))
    vein_mask = np.clip((0.14 - vein_noise) * 9.0, 0.0, 1.0)[:, :, None]
    cyan_glow = np.array([0.15, 0.88, 0.98], dtype=np.float32)
    base = base * (1.0 - vein_mask * 0.8) + cyan_glow * (vein_mask * 0.8)

    base = np.clip(base, 0.0, 1.0)
    seamless_rgb = make_seamless(base, margin_ratio=0.15)
    normal = compute_normal_map(seamless_rgb, strength=4.0)

    # Emissive cyan pulse
    emissive = np.zeros_like(seamless_rgb)
    em_mask = make_seamless(vein_mask[:, :, 0], margin_ratio=0.15)
    emissive[:, :, 0] = np.clip(em_mask * 0.10, 0, 1)
    emissive[:, :, 1] = np.clip(em_mask * 0.75, 0, 1)
    emissive[:, :, 2] = np.clip(em_mask * 0.95, 0, 1)

    rough = 0.22 + 0.45 * (1.0 - frost_mask[:, :, 0])
    rough = make_seamless(np.clip(rough, 0.12, 0.75), margin_ratio=0.15)

    Image.fromarray((seamless_rgb * 255.0).astype(np.uint8)).save(OUT_DIR / 'permafrost_wall_color.webp', quality=88, method=6)
    Image.fromarray(normal).save(OUT_DIR / 'permafrost_wall_normal.webp', quality=90, method=6)
    Image.fromarray((rough * 255.0).astype(np.uint8)).save(OUT_DIR / 'permafrost_wall_rough.webp', quality=85, method=6)
    Image.fromarray((emissive * 255.0).astype(np.uint8)).save(OUT_DIR / 'permafrost_wall_emissive.webp', quality=88, method=6)
    print('  ✓ Permafrost wall PBR textures generated')

def generate_permafrost_floor():
    rng = np.random.default_rng(7004)
    y, x = np.mgrid[0:SIZE, 0:SIZE] / float(SIZE)

    # Compressed glacial blue ice base
    base = np.zeros((SIZE, SIZE, 3), dtype=np.float32)
    noise = rng.normal(0, 0.03, (SIZE, SIZE, 1)).astype(np.float32)
    deep_ice = np.array([0.15, 0.32, 0.48], dtype=np.float32)
    base += deep_ice + noise

    # Radial ice fractures
    cracks = np.abs(np.sin(x * 10.0 + np.sin(y * 8.0) * 2.0) * np.sin(y * 12.0))
    crack_mask = np.clip((0.1 - cracks) * 12.0, 0.0, 1.0)[:, :, None]
    white_frost = np.array([0.82, 0.94, 0.98], dtype=np.float32)
    base = base * (1.0 - crack_mask * 0.7) + white_frost * (crack_mask * 0.7)

    # Cyan sub-ice bioluminescent capillaries
    cap_noise = np.abs(np.sin(x * 20.0 - y * 16.0) * np.cos(y * 18.0 + x * 8.0))
    cap_mask = np.clip((0.12 - cap_noise) * 8.0, 0.0, 1.0)[:, :, None]
    cyan_sub = np.array([0.18, 0.90, 0.95], dtype=np.float32)
    base = base * (1.0 - cap_mask * 0.6) + cyan_sub * (cap_mask * 0.6)

    base = np.clip(base, 0.0, 1.0)
    seamless_rgb = make_seamless(base, margin_ratio=0.15)
    normal = compute_normal_map(seamless_rgb, strength=3.6)

    emissive = np.zeros_like(seamless_rgb)
    em_mask = make_seamless(cap_mask[:, :, 0], margin_ratio=0.15)
    emissive[:, :, 0] = np.clip(em_mask * 0.08, 0, 1)
    emissive[:, :, 1] = np.clip(em_mask * 0.70, 0, 1)
    emissive[:, :, 2] = np.clip(em_mask * 0.92, 0, 1)

    rough = 0.15 + 0.35 * (1.0 - crack_mask[:, :, 0])
    rough = make_seamless(np.clip(rough, 0.10, 0.65), margin_ratio=0.15)

    Image.fromarray((seamless_rgb * 255.0).astype(np.uint8)).save(OUT_DIR / 'permafrost_floor_color.webp', quality=88, method=6)
    Image.fromarray(normal).save(OUT_DIR / 'permafrost_floor_normal.webp', quality=90, method=6)
    Image.fromarray((rough * 255.0).astype(np.uint8)).save(OUT_DIR / 'permafrost_floor_rough.webp', quality=85, method=6)
    Image.fromarray((emissive * 255.0).astype(np.uint8)).save(OUT_DIR / 'permafrost_floor_emissive.webp', quality=88, method=6)
    print('  ✓ Permafrost floor PBR textures generated')

if __name__ == '__main__':
    generate_substation_wall()
    generate_substation_floor()
    generate_permafrost_wall()
    generate_permafrost_floor()
    print('[Texture Expansion] Substation & Permafrost PBR textures ready!')
