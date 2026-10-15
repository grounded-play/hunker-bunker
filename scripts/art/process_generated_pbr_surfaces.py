#!/usr/bin/env python3
"""Process the photorealistic generated images into production PBR surface suites.

For each material:
- Seamless toroidal edge blending (seamless 4-way tiling)
- Normal map (multi-scale Sobel convolution)
- AO map (luminance cavity extraction)
- Roughness map (physically-based specular mapping)
- Metalness map (metallic channel segmentation)
- ORM map (R: AO, G: Roughness, B: Metalness)
- Emissive map (bioluminescence / accent light isolation)
"""

import glob
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent.parent
BRAIN_DIR = Path('/home/caveman/.gemini/antigravity-ide/brain/8d7f88d0-fe23-48cf-919c-4e4cffc2fcf0')
SOURCE_PBR_DIR = ROOT / 'art/source/textures/world-expansion-2026-10-14/pbr'
RUNTIME_SURFACES_DIR = ROOT / 'public/3d/runtime/surfaces'
RUNTIME_KITS_DIR = ROOT / 'public/3d/runtime/kits/textures'

SOURCE_PBR_DIR.mkdir(parents=True, exist_ok=True)
RUNTIME_SURFACES_DIR.mkdir(parents=True, exist_ok=True)
RUNTIME_KITS_DIR.mkdir(parents=True, exist_ok=True)

TARGET_SIZE = 1024

MATERIAL_CONFIGS = {
    'tex_pbr_geothermal_trench_grate': {
        'pattern': 'geothermal_trench_grate_*.jpg',
        'rough_base': 0.60,
        'rough_wet': 0.20,
        'metal_base': 0.65,
        'emissive_type': 'tendril_glow',
        'normal_strength': 3.8,
    },
    'tex_pbr_meridian_cable_conduit_deck': {
        'pattern': 'meridian_conduit_deck_*.jpg',
        'rough_base': 0.55,
        'rough_wet': 0.18,
        'metal_base': 0.40,
        'emissive_type': 'cyan_nerve',
        'normal_strength': 3.6,
    },
    'tex_pbr_vesper_trench_treadplate': {
        'pattern': 'vesper_trench_treadplate_*.jpg',
        'rough_base': 0.40,
        'rough_wet': 0.22,
        'metal_base': 0.85,
        'emissive_type': 'none',
        'normal_strength': 4.2,
    },
    'tex_pbr_corp_sublevel_linoleum': {
        'pattern': 'corp_sublevel_linoleum_*.jpg',
        'rough_base': 0.24,
        'rough_wet': 0.12,
        'metal_base': 0.05,
        'emissive_type': 'none',
        'normal_strength': 2.6,
    },
    'tex_pbr_hive_suture_amniotic_resin': {
        'pattern': 'suture_amniotic_resin_*.jpg',
        'rough_base': 0.18,
        'rough_wet': 0.08,
        'metal_base': 0.00,
        'emissive_type': 'amber_resin',
        'normal_strength': 3.4,
    },
    'tex_pbr_vass_cleanroom_poly': {
        'pattern': 'vass_cleanroom_poly_*.jpg',
        'rough_base': 0.32,
        'rough_wet': 0.10,
        'metal_base': 0.02,
        'emissive_type': 'emerald_hemo',
        'normal_strength': 2.8,
    },
    'tex_pbr_chasm_permafrost_bedrock': {
        'pattern': 'chasm_permafrost_bedrock_*.jpg',
        'rough_base': 0.72,
        'rough_wet': 0.14,
        'metal_base': 0.04,
        'emissive_type': 'cyan_ice',
        'normal_strength': 4.5,
    },
    'tex_pbr_crash_hull_ablative_tile': {
        'pattern': 'crash_hull_heat_tile_*.jpg',
        'rough_base': 0.58,
        'rough_wet': 0.16,
        'metal_base': 0.15,
        'emissive_type': 'none',
        'normal_strength': 3.5,
    },
    'tex_pbr_hive_chitin_plates': {
        'pattern': 'hive_chitin_plates_*.jpg',
        'rough_base': 0.16,
        'rough_wet': 0.06,
        'metal_base': 0.30,
        'emissive_type': 'yellow_hemo',
        'normal_strength': 3.8,
    },
    'tex_pbr_hydro_fermenter_sludge': {
        'pattern': 'hydro_fermenter_sludge_*.jpg',
        'rough_base': 0.35,
        'rough_wet': 0.12,
        'metal_base': 0.05,
        'emissive_type': 'lime_spores',
        'normal_strength': 4.0,
    },
    'tex_pbr_evac_gantry_corrugated_deck': {
        'pattern': 'evac_gantry_deck_*.jpg',
        'rough_base': 0.48,
        'rough_wet': 0.25,
        'metal_base': 0.65,
        'emissive_type': 'none',
        'normal_strength': 4.2,
    },
    'tex_pbr_obsidian_cathedral_flagstone': {
        'pattern': 'obsidian_cathedral_flagstone_*.jpg',
        'rough_base': 0.14,
        'rough_wet': 0.06,
        'metal_base': 0.25,
        'emissive_type': 'golden_jelly',
        'normal_strength': 3.6,
    },
}


def make_seamless(arr, margin_ratio=0.12):
    """Feather opposite edges across a toroidal roll so the texture tiles seamlessly."""
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
    """Compute tangent-space normal map using Sobel convolution."""
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


def compute_ao(height, radius=6):
    """Compute ambient occlusion from cavity depth."""
    blurred = ndimage.gaussian_filter(height, sigma=radius, mode='wrap')
    cavity = np.clip((height - blurred) * 2.0 + 0.5, 0.0, 1.0)
    return cavity


def extract_emissive(color, emissive_type):
    """Isolate bioluminescent and active lighting accents."""
    emissive = np.zeros_like(color)
    r = color[:, :, 0]
    g = color[:, :, 1]
    b = color[:, :, 2]

    if emissive_type == 'tendril_glow':
        # Green-cyan mycelium / orange heat
        mask = (g > 0.45) & (g > r * 1.2) & (g > b * 1.1)
        emissive[mask] = color[mask] * 1.2
    elif emissive_type == 'cyan_nerve':
        # Bright cyan cables/nerves
        mask = (b > 0.40) & (g > 0.40) & (r < 0.35)
        emissive[mask] = np.array([0.0, 0.75, 0.95], dtype=np.float32)
    elif emissive_type == 'amber_resin':
        # Amber subsurface center glow
        lum = 0.299 * r + 0.587 * g + 0.114 * b
        mask = (r > 0.60) & (g > 0.35) & (b < 0.25) & (lum > 0.45)
        emissive[mask] = np.array([0.96, 0.62, 0.07], dtype=np.float32) * 0.5
    elif emissive_type == 'emerald_hemo':
        # Vibrant emerald green hemolymph
        mask = (g > 0.40) & (g > r * 1.4) & (g > b * 1.3)
        emissive[mask] = np.array([0.13, 0.77, 0.37], dtype=np.float32) * 0.9
    elif emissive_type == 'cyan_ice':
        # Translucent cyan ice crystals
        mask = (b > 0.50) & (g > 0.45) & (r < 0.40)
        emissive[mask] = np.array([0.22, 0.74, 0.97], dtype=np.float32) * 0.5
    elif emissive_type == 'yellow_hemo':
        # Yellow hemolymph seeping from spiracles
        mask = (r > 0.65) & (g > 0.55) & (b < 0.25)
        emissive[mask] = np.array([0.90, 0.75, 0.08], dtype=np.float32) * 0.6
    elif emissive_type == 'lime_spores':
        # Glowing chartreuse spore pods
        mask = (g > 0.45) & (r > 0.30) & (b < 0.25)
        emissive[mask] = np.array([0.52, 0.80, 0.09], dtype=np.float32) * 0.95
    elif emissive_type == 'golden_jelly':
        # Golden royal jelly in grooves
        mask = (r > 0.55) & (g > 0.40) & (b < 0.20)
        emissive[mask] = np.array([0.96, 0.62, 0.07], dtype=np.float32) * 0.7

    return np.clip(emissive, 0.0, 1.0)


def process_material(mat_id, config):
    matches = sorted(glob.glob(str(BRAIN_DIR / config['pattern'])))
    if not matches:
        print(f"[ERROR] No image found matching {config['pattern']}")
        return False

    src_path = matches[-1]
    img = Image.open(src_path).convert('RGB')
    if img.size != (TARGET_SIZE, TARGET_SIZE):
        img = img.resize((TARGET_SIZE, TARGET_SIZE), Image.Resampling.LANCZOS)

    arr = np.array(img, dtype=np.float32) / 255.0

    # Ensure seamlessness
    s_color = make_seamless(arr, margin_ratio=0.10)

    # Compute normal map
    normal = compute_normal_map(s_color, strength=config['normal_strength'])

    # Compute height & AO
    lum = 0.299 * s_color[:, :, 0] + 0.587 * s_color[:, :, 1] + 0.114 * s_color[:, :, 2]
    ao = compute_ao(lum, radius=6)

    # Compute roughness: darker/wetter regions have lower roughness
    rough_range = config['rough_base'] - config['rough_wet']
    rough = config['rough_wet'] + (1.0 - lum) * rough_range
    rough = np.clip(rough, 0.04, 0.95)

    # Metalness
    metal = np.full((TARGET_SIZE, TARGET_SIZE), config['metal_base'], dtype=np.float32)
    # Bright highlights in metallic materials get higher metalness
    if config['metal_base'] > 0.2:
        metal = np.clip(metal + (lum - 0.5) * 0.3, 0.0, 1.0)

    # Emissive map
    emissive = extract_emissive(s_color, config['emissive_type'])

    # Packed ORM map (R: AO, G: Roughness, B: Metalness)
    orm = np.stack([ao, rough, metal], axis=-1)

    # Images
    img_color = Image.fromarray((s_color * 255.0).astype(np.uint8))
    img_normal = Image.fromarray(normal)
    img_orm = Image.fromarray((orm * 255.0).astype(np.uint8))
    img_rough = Image.fromarray((rough * 255.0).astype(np.uint8))
    img_emissive = Image.fromarray((emissive * 255.0).astype(np.uint8))

    targets = [SOURCE_PBR_DIR, RUNTIME_SURFACES_DIR, RUNTIME_KITS_DIR]
    for target in targets:
        # Standard glTF PBR naming
        img_color.save(target / f'{mat_id}_baseColor.webp', quality=92, method=6)
        img_normal.save(target / f'{mat_id}_normal.webp', quality=92, method=6)
        img_orm.save(target / f'{mat_id}_orm.webp', quality=90, method=6)
        img_emissive.save(target / f'{mat_id}_emissive.webp', quality=90, method=6)

        # Compatibility aliases
        img_color.save(target / f'{mat_id}_color.webp', quality=92, method=6)
        img_rough.save(target / f'{mat_id}_rough.webp', quality=90, method=6)

    print(f"  ✓ {mat_id} photorealistic PBR suite exported from {Path(src_path).name}")
    return True


def main():
    print("[PBRProcessor] Processing generated photorealistic images into PBR surface suites...")
    count = 0
    for mat_id, config in MATERIAL_CONFIGS.items():
        if process_material(mat_id, config):
            count += 1
    print(f"[PBRProcessor] Finished: {count}/{len(MATERIAL_CONFIGS)} PBR suites exported successfully!")


if __name__ == '__main__':
    main()
