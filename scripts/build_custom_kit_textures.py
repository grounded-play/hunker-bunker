#!/usr/bin/env python3
"""Build seamless custom PBR textures for the modular kits in Nordic Cathedral Biomech style.

    python3 scripts/build_custom_kit_textures.py

Builds custom high-fidelity texture suites that live alongside the original CC0 textures:
- cathedral_wall: Weathered Nordic granite ashlar with blackened iron strap bindings and carved interlace
- cathedral_floor: Crypt granite flagstones with recessed mortar lines and bronze corner insets
- bunker_wall: Industrial blackened iron bulkhead plating with rivets, conduits, and verdigris
- bunker_floor: Heavy hexagonal anti-slip drainage grating over dark sub-deck machinery
- biomech_wall: Cathedral stone split open by Giger tracheal ribs and bioluminescent mycelium veins
- biomech_floor: Segmented chitinous organic carapace floor with wet sheen and spore capillaries

Coexists with the original CC0 textures (cave_wall, cave_floor, space_wall, space_floor)
so all sets can be used together dynamically across biomes, room roles, and variation pieces.
"""
import glob
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC_DIR = ROOT / 'art/source/textures/kits_generated'
OUT_DIR = ROOT / 'public/3d/runtime/kits/textures'

TEXTURE_TARGETS = {
    'cathedral_wall': {
        'pattern': 'cathedral_stone_wall*.jpg',
        'roughness_base': 0.82,
        'roughness_contrast': 0.15,
        'normal_strength': 3.2,
        'emissive': False,
    },
    'cathedral_floor': {
        'pattern': 'cathedral_stone_floor*.jpg',
        'roughness_base': 0.78,
        'roughness_contrast': 0.18,
        'normal_strength': 3.0,
        'emissive': False,
    },
    'bunker_wall': {
        'pattern': 'bulkhead_metal_wall*.jpg',
        'roughness_base': 0.52,
        'roughness_contrast': 0.22,
        'normal_strength': 3.5,
        'emissive': False,
    },
    'bunker_floor': {
        'pattern': 'grating_metal_floor*.jpg',
        'roughness_base': 0.58,
        'roughness_contrast': 0.25,
        'normal_strength': 3.8,
        'emissive': False,
    },
    'biomech_wall': {
        'pattern': 'biomech_vein_wall*.jpg',
        'roughness_base': 0.65,
        'roughness_contrast': 0.35,
        'normal_strength': 3.6,
        'emissive': True,
        'emissive_tint': (0.35, 1.0, 0.45), # Bioluminescent toxic green
    },
    'biomech_floor': {
        'pattern': 'biomech_chitin_floor*.jpg',
        'roughness_base': 0.45, # Wet chitin
        'roughness_contrast': 0.35,
        'normal_strength': 3.4,
        'emissive': True,
        'emissive_tint': (0.85, 0.95, 0.25), # Sickly amber/green
    },
    'giger_wall': {
        'pattern': 'giger_biomech_wall*.jpg',
        'roughness_base': 0.38, # Wet polished biomech metallic chitin
        'roughness_contrast': 0.32,
        'normal_strength': 3.8,
        'emissive': True,
        'emissive_tint': (1.0, 0.65, 0.15), # Glowing amber capillary veins
        'emissive_mode': 'amber',
    },
    'giger_floor': {
        'pattern': 'giger_biomech_floor*.jpg',
        'roughness_base': 0.35, # Wet ribbed exoskeleton floor
        'roughness_contrast': 0.30,
        'normal_strength': 3.6,
        'emissive': True,
        'emissive_tint': (1.0, 0.70, 0.20), # Amber bio-fluid channels
        'emissive_mode': 'amber',
    },
    'reliquary_wall': {
        'pattern': 'reliquary_wall*.jpg',
        'roughness_base': 0.36, # Polished obsidian and brushed titanium
        'roughness_contrast': 0.30,
        'normal_strength': 3.8,
        'emissive': True,
        'emissive_tint': (1.0, 0.65, 0.15), # Inlaid amber fiber-optic microcircuits
        'emissive_mode': 'amber',
    },
    'reliquary_floor': {
        'pattern': 'reliquary_floor*.jpg',
        'roughness_base': 0.35, # Wet polished obsidian and titanium floor
        'roughness_contrast': 0.28,
        'normal_strength': 3.6,
        'emissive': True,
        'emissive_tint': (1.0, 0.65, 0.15), # Inlaid amber fiber-optic microcircuits
        'emissive_mode': 'amber',
    },
    'cryo_deck_wall': {
        'pattern': 'cryo_deck_wall*.jpg',
        'roughness_base': 0.48, # Cold-rolled steel and frost rime
        'roughness_contrast': 0.28,
        'normal_strength': 3.7,
        'emissive': True,
        'emissive_tint': (0.2, 0.95, 1.0), # Glowing cyan diagnostic status strips
        'emissive_mode': 'cyan',
    },
    'cryo_deck_floor': {
        'pattern': 'cryo_deck_floor*.jpg',
        'roughness_base': 0.45, # Hexagonal anti-slip grating and ice
        'roughness_contrast': 0.32,
        'normal_strength': 3.9,
        'emissive': True,
        'emissive_tint': (0.15, 0.95, 1.0), # Sub-grate glowing cyan coolant pool
        'emissive_mode': 'cyan',
    },
}


def make_seamless(arr, margin_ratio=0.18):
    """Seamless toroidal cross-fade blending with smooth cosine transition."""
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


def compute_normal_map(arr_rgb, strength=3.0):
    """Compute OpenGL tangent space normal map via Sobel convolution with periodic boundaries."""
    lum = 0.299 * arr_rgb[:, :, 0] + 0.587 * arr_rgb[:, :, 1] + 0.114 * arr_rgb[:, :, 2]
    padded = np.pad(lum, 1, mode='wrap')

    sobel_x = (
        -1.0 * padded[:-2, :-2] + 1.0 * padded[:-2, 2:] +
        -2.0 * padded[1:-1, :-2] + 2.0 * padded[1:-1, 2:] +
        -1.0 * padded[2:, :-2] + 1.0 * padded[2:, 2:]
    ) / 8.0

    sobel_y = (
        -1.0 * padded[:-2, :-2] - 2.0 * padded[:-2, 1:-1] - 1.0 * padded[:-2, 2:] +
        1.0 * padded[2:, :-2] + 2.0 * padded[2:, 1:-1] + 1.0 * padded[2:, 2:]
    ) / 8.0

    nx = -sobel_x * strength
    ny = -sobel_y * strength
    nz = np.ones_like(nx)
    norm = np.maximum(1e-6, np.sqrt(nx**2 + ny**2 + nz**2))
    nx /= norm
    ny /= norm
    nz /= norm

    normal_rgb = np.stack([nx * 0.5 + 0.5, ny * 0.5 + 0.5, nz * 0.5 + 0.5], axis=-1)
    return np.clip(normal_rgb * 255.0, 0, 255).astype(np.uint8)


def compute_roughness_map(arr_rgb, base_rough=0.7, contrast=0.2):
    """Derive linear roughness map from luminance and micro-texture."""
    lum = 0.299 * arr_rgb[:, :, 0] + 0.587 * arr_rgb[:, :, 1] + 0.114 * arr_rgb[:, :, 2]
    rough = base_rough + (0.5 - lum) * contrast
    return np.clip(rough * 255.0, 0, 255).astype(np.uint8)


def compute_emissive_map(arr_rgb, tint=(0.4, 1.0, 0.4), mode='green'):
    """Extract vibrant bioluminescent mycelium, cyan telemetry, or warm amber capillary channels."""
    r, g, b = arr_rgb[:, :, 0], arr_rgb[:, :, 1], arr_rgb[:, :, 2]
    if mode == 'amber':
        # Warm amber/orange channels in crevices: red + green dominate over blue
        amber_excess = np.maximum(0.0, np.minimum(r, g * 1.5) - b * 1.2)
        brightness = np.maximum(r, g)
        mask = np.clip((amber_excess * 4.0) * np.clip(brightness * 1.8, 0.0, 1.0), 0.0, 1.0)
        mask = mask ** 1.6
    elif mode == 'cyan':
        # Glowing cyan / teal status strips: green + blue dominate over red
        cyan_excess = np.maximum(0.0, np.minimum(g, b) - r * 1.3)
        brightness = np.maximum(g, b)
        mask = np.clip((cyan_excess * 4.5) * np.clip(brightness * 1.8, 0.0, 1.0), 0.0, 1.0)
        mask = mask ** 1.5
    else:
        green_excess = np.maximum(0.0, g - np.maximum(r, b) * 0.85)
        brightness = np.maximum(r, np.maximum(g, b))
        mask = np.clip((green_excess * 3.5) * np.clip(brightness * 1.5, 0.0, 1.0), 0.0, 1.0)
        mask = mask ** 1.8

    emissive_r = mask * tint[0]
    emissive_g = mask * tint[1]
    emissive_b = mask * tint[2]
    emissive_rgb = np.stack([emissive_r, emissive_g, emissive_b], axis=-1)
    return np.clip(emissive_rgb * 255.0, 0, 255).astype(np.uint8)


def process_texture_set(target_name, config):
    pattern = str(SRC_DIR / config['pattern'])
    matches = glob.glob(pattern)
    if not matches:
        raise FileNotFoundError(f'No source image found matching {pattern}')

    source_path = matches[0]
    print(f'[kit-textures] Processing {target_name} from {Path(source_path).name}...')

    img = Image.open(source_path).convert('RGB')
    if img.size != (1024, 1024):
        img = img.resize((1024, 1024), Image.Resampling.LANCZOS)

    arr = np.array(img, dtype=np.float32) / 255.0

    # 1. Seamless wrapping
    seamless_rgb = make_seamless(arr, margin_ratio=0.18)

    # 2. Save color map
    color_img = Image.fromarray(np.clip(seamless_rgb * 255.0, 0, 255).astype(np.uint8))
    color_out = OUT_DIR / f'{target_name}_color.webp'
    color_img.save(color_out, quality=88, method=6)

    # 3. Normal map
    normal_arr = compute_normal_map(seamless_rgb, strength=config['normal_strength'])
    normal_img = Image.fromarray(normal_arr)
    normal_out = OUT_DIR / f'{target_name}_normal.webp'
    normal_img.save(normal_out, quality=90, method=6)

    # 4. Roughness map
    rough_arr = compute_roughness_map(seamless_rgb, base_rough=config['roughness_base'], contrast=config['roughness_contrast'])
    rough_img = Image.fromarray(rough_arr)
    rough_out = OUT_DIR / f'{target_name}_rough.webp'
    rough_img.save(rough_out, quality=85, method=6)

    # 5. Emissive map (if supported)
    if config.get('emissive'):
        emissive_arr = compute_emissive_map(
            seamless_rgb,
            tint=config.get('emissive_tint', (0.4, 1.0, 0.4)),
            mode=config.get('emissive_mode', 'green')
        )
        emissive_img = Image.fromarray(emissive_arr)
        emissive_out = OUT_DIR / f'{target_name}_emissive.webp'
        emissive_img.save(emissive_out, quality=88, method=6)
        print(f'  ✓ Saved: color, normal, rough, emissive -> {OUT_DIR}/{target_name}_*.webp')
    else:
        print(f'  ✓ Saved: color, normal, rough -> {OUT_DIR}/{target_name}_*.webp')


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for name, config in TEXTURE_TARGETS.items():
        process_texture_set(name, config)
    print('[kit-textures] Custom modular kit textures built successfully alongside original CC0 textures!')


if __name__ == '__main__':
    main()
