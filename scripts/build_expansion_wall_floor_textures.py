#!/usr/bin/env python3
"""Build seamless PBR wall and ground/floor textures for Cleanroom, Mycelium, Obsidian, and Toxic Sump kits.
Generates full PBR suites: color, normal, rough, and emissive maps in WebP format.
"""
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / 'public/3d/runtime/kits/textures'
OUT_DIR.mkdir(parents=True, exist_ok=True)

SIZE = 1024

def make_seamless(arr, margin_ratio=0.18):
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
    """Compute high-fidelity tangent-space normal map using Sobel convolution."""
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

# ---------------------------------------------------------------------------
# 1. CLEANROOM SUITE
# ---------------------------------------------------------------------------
def generate_cleanroom_wall():
    rng = np.random.default_rng(8101)
    y, x = np.mgrid[0:SIZE, 0:SIZE] / float(SIZE)

    # Base: Off-white sterile composite panels
    base = np.zeros((SIZE, SIZE, 3), dtype=np.float32)
    panel_col = np.array([0.76, 0.78, 0.80], dtype=np.float32)
    noise = rng.normal(0, 0.02, (SIZE, SIZE, 1)).astype(np.float32)
    base += panel_col + noise

    # 4x6 modular cassette grid
    panel_x = (x * 4.0) % 1.0
    panel_y = (y * 6.0) % 1.0
    seam_x = np.minimum(panel_x, 1.0 - panel_x)
    seam_y = np.minimum(panel_y, 1.0 - panel_y)
    seam_dist = np.minimum(seam_x * 4.0, seam_y * 6.0)
    seam_mask = np.clip(seam_dist * 35.0, 0.0, 1.0)[:, :, None]

    # Silicone gasket dark grey
    gasket_col = np.array([0.18, 0.20, 0.22], dtype=np.float32)
    color = base * seam_mask + gasket_col * (1.0 - seam_mask)

    # Cyan telemetry light bar in upper 25% of each panel
    bar_y = (panel_y > 0.15) & (panel_y < 0.20) & (seam_mask[:, :, 0] > 0.95)
    emissive = np.zeros((SIZE, SIZE, 3), dtype=np.float32)
    cyan_col = np.array([0.0, 0.85, 0.95], dtype=np.float32)
    emissive[bar_y] = cyan_col
    color[bar_y] = cyan_col * 0.9 + 0.1

    seamless_color = make_seamless(color, margin_ratio=0.10)
    seamless_emiss = make_seamless(emissive, margin_ratio=0.10)
    normal = compute_normal_map(seamless_color, strength=3.2)

    rough = np.full((SIZE, SIZE), 0.32, dtype=np.float32)
    rough[seam_mask[:, :, 0] < 0.5] = 0.75
    rough[bar_y] = 0.10
    seamless_rough = make_seamless(rough, margin_ratio=0.10)

    Image.fromarray((seamless_color * 255.0).astype(np.uint8)).save(OUT_DIR / 'cleanroom_wall_color.webp', quality=88, method=6)
    Image.fromarray(normal).save(OUT_DIR / 'cleanroom_wall_normal.webp', quality=90, method=6)
    Image.fromarray((seamless_rough * 255.0).astype(np.uint8)).save(OUT_DIR / 'cleanroom_wall_rough.webp', quality=85, method=6)
    Image.fromarray((seamless_emiss * 255.0).astype(np.uint8)).save(OUT_DIR / 'cleanroom_wall_emissive.webp', quality=85, method=6)
    print('  ✓ Cleanroom wall PBR textures generated')

def generate_cleanroom_floor():
    rng = np.random.default_rng(8102)
    y, x = np.mgrid[0:SIZE, 0:SIZE] / float(SIZE)

    # Base: Anti-static vinyl terrazzo (dark slate grey with speckles)
    base = np.zeros((SIZE, SIZE, 3), dtype=np.float32)
    tile_col = np.array([0.22, 0.24, 0.26], dtype=np.float32)
    noise = rng.normal(0, 0.035, (SIZE, SIZE, 1)).astype(np.float32)
    base += tile_col + noise

    # 8x8 square tile grid with beveled joints
    tile_x = (x * 8.0) % 1.0
    tile_y = (y * 8.0) % 1.0
    seam_x = np.minimum(tile_x, 1.0 - tile_x)
    seam_y = np.minimum(tile_y, 1.0 - tile_y)
    seam_dist = np.minimum(seam_x, seam_y)
    seam_mask = np.clip(seam_dist * 40.0, 0.0, 1.0)[:, :, None]

    grout_col = np.array([0.12, 0.13, 0.14], dtype=np.float32)
    color = base * seam_mask + grout_col * (1.0 - seam_mask)

    # Perimeter alignment amber border stripes along outer edges
    border_mask = ((x < 0.04) | (x > 0.96) | (y < 0.04) | (y > 0.96))[:, :, None]
    amber_strip = np.array([0.85, 0.65, 0.10], dtype=np.float32)
    color = color * (1.0 - border_mask * 0.7) + amber_strip * (border_mask * 0.7)

    # Cyan guidance nodes at tile intersections
    emissive = np.zeros((SIZE, SIZE, 3), dtype=np.float32)
    corner_dist = np.sqrt(seam_x**2 + seam_y**2)
    node_mask = corner_dist < 0.05
    cyan_col = np.array([0.0, 0.80, 0.92], dtype=np.float32)
    emissive[node_mask] = cyan_col
    color[node_mask] = cyan_col * 0.8 + 0.15

    seamless_color = make_seamless(color, margin_ratio=0.10)
    seamless_emiss = make_seamless(emissive, margin_ratio=0.10)
    normal = compute_normal_map(seamless_color, strength=3.4)

    rough = np.full((SIZE, SIZE), 0.38, dtype=np.float32)
    rough[seam_mask[:, :, 0] < 0.5] = 0.68
    rough[node_mask] = 0.12
    seamless_rough = make_seamless(rough, margin_ratio=0.10)

    Image.fromarray((seamless_color * 255.0).astype(np.uint8)).save(OUT_DIR / 'cleanroom_floor_color.webp', quality=88, method=6)
    Image.fromarray(normal).save(OUT_DIR / 'cleanroom_floor_normal.webp', quality=90, method=6)
    Image.fromarray((seamless_rough * 255.0).astype(np.uint8)).save(OUT_DIR / 'cleanroom_floor_rough.webp', quality=85, method=6)
    Image.fromarray((seamless_emiss * 255.0).astype(np.uint8)).save(OUT_DIR / 'cleanroom_floor_emissive.webp', quality=85, method=6)
    print('  ✓ Cleanroom floor PBR textures generated')

# ---------------------------------------------------------------------------
# 2. MYCELIUM SUITE
# ---------------------------------------------------------------------------
def generate_mycelium_wall():
    rng = np.random.default_rng(8201)
    y, x = np.mgrid[0:SIZE, 0:SIZE] / float(SIZE)

    # Base: Decaying damp iron plate with oxide staining
    base = np.zeros((SIZE, SIZE, 3), dtype=np.float32)
    iron_col = np.array([0.16, 0.14, 0.13], dtype=np.float32)
    noise = rng.normal(0, 0.05, (SIZE, SIZE, 1)).astype(np.float32)
    base += iron_col + noise

    # Branching mycelial cords (harmonic waves)
    tendril_1 = np.sin(x * 16.0 + np.sin(y * 8.0) * 2.5)
    tendril_2 = np.cos(y * 14.0 + np.sin(x * 9.0) * 2.2)
    tendril_3 = np.sin((x + y) * 12.0 + np.cos((x - y) * 8.0) * 2.0)
    cord_pattern = np.abs(tendril_1 * tendril_2 * tendril_3)
    cord_mask = np.clip((1.0 - cord_pattern * 4.0) * 2.0, 0.0, 1.0)[:, :, None]

    mycelium_col = np.array([0.72, 0.48, 0.12], dtype=np.float32)
    color = base * (1.0 - cord_mask * 0.8) + mycelium_col * (cord_mask * 0.8)

    # Spore node clusters
    spore_nodes = (np.sin(x * 24.0) * np.cos(y * 24.0) > 0.88) & (cord_mask[:, :, 0] > 0.5)
    amber_glow = np.array([1.0, 0.62, 0.08], dtype=np.float32)
    color[spore_nodes] = amber_glow

    emissive = np.zeros((SIZE, SIZE, 3), dtype=np.float32)
    emissive[spore_nodes] = amber_glow
    # Subtle ambient glow along primary mycelium cords
    cord_glow = cord_mask[:, :, 0] > 0.7
    emissive[cord_glow] = np.maximum(emissive[cord_glow], amber_glow * 0.35)

    seamless_color = make_seamless(color, margin_ratio=0.15)
    seamless_emiss = make_seamless(emissive, margin_ratio=0.15)
    normal = compute_normal_map(seamless_color, strength=4.0)

    rough = np.full((SIZE, SIZE), 0.78, dtype=np.float32)
    rough[cord_mask[:, :, 0] > 0.4] = 0.28  # wet biological cords
    rough[spore_nodes] = 0.18
    seamless_rough = make_seamless(rough, margin_ratio=0.15)

    Image.fromarray((seamless_color * 255.0).astype(np.uint8)).save(OUT_DIR / 'mycelium_wall_color.webp', quality=88, method=6)
    Image.fromarray(normal).save(OUT_DIR / 'mycelium_wall_normal.webp', quality=90, method=6)
    Image.fromarray((seamless_rough * 255.0).astype(np.uint8)).save(OUT_DIR / 'mycelium_wall_rough.webp', quality=85, method=6)
    Image.fromarray((seamless_emiss * 255.0).astype(np.uint8)).save(OUT_DIR / 'mycelium_wall_emissive.webp', quality=85, method=6)
    print('  ✓ Mycelium wall PBR textures generated')

def generate_mycelium_floor():
    rng = np.random.default_rng(8202)
    y, x = np.mgrid[0:SIZE, 0:SIZE] / float(SIZE)

    # Base: Damp dark fungal loam
    base = np.zeros((SIZE, SIZE, 3), dtype=np.float32)
    loam_col = np.array([0.11, 0.09, 0.08], dtype=np.float32)
    noise = rng.normal(0, 0.04, (SIZE, SIZE, 1)).astype(np.float32)
    base += loam_col + noise

    # Radial fungal fruiting colonies and capillary rings
    cx1, cy1 = 0.3, 0.35
    cx2, cy2 = 0.75, 0.7
    r1 = np.sqrt((x - cx1)**2 + (y - cy1)**2)
    r2 = np.sqrt((x - cx2)**2 + (y - cy2)**2)
    ring_1 = np.sin(r1 * 40.0) * 0.5 + 0.5
    ring_2 = np.sin(r2 * 36.0) * 0.5 + 0.5
    fruiting_rings = np.maximum(ring_1 * np.exp(-r1 * 3.5), ring_2 * np.exp(-r2 * 3.5))[:, :, None]

    mycelium_amber = np.array([0.65, 0.42, 0.08], dtype=np.float32)
    color = base * (1.0 - fruiting_rings * 0.75) + mycelium_amber * (fruiting_rings * 0.75)

    # Center spore vents with intense luminescence
    vent_1 = r1 < 0.08
    vent_2 = r2 < 0.08
    amber_glow = np.array([1.0, 0.65, 0.10], dtype=np.float32)
    color[vent_1 | vent_2] = amber_glow

    emissive = np.zeros((SIZE, SIZE, 3), dtype=np.float32)
    emissive[vent_1 | vent_2] = amber_glow
    capillary_glow = fruiting_rings[:, :, 0] > 0.45
    emissive[capillary_glow] = np.maximum(emissive[capillary_glow], amber_glow * 0.4)

    seamless_color = make_seamless(color, margin_ratio=0.18)
    seamless_emiss = make_seamless(emissive, margin_ratio=0.18)
    normal = compute_normal_map(seamless_color, strength=3.8)

    rough = np.full((SIZE, SIZE), 0.70, dtype=np.float32)
    rough[fruiting_rings[:, :, 0] > 0.3] = 0.22  # wet sheen
    rough[vent_1 | vent_2] = 0.14
    seamless_rough = make_seamless(rough, margin_ratio=0.18)

    Image.fromarray((seamless_color * 255.0).astype(np.uint8)).save(OUT_DIR / 'mycelium_floor_color.webp', quality=88, method=6)
    Image.fromarray(normal).save(OUT_DIR / 'mycelium_floor_normal.webp', quality=90, method=6)
    Image.fromarray((seamless_rough * 255.0).astype(np.uint8)).save(OUT_DIR / 'mycelium_floor_rough.webp', quality=85, method=6)
    Image.fromarray((seamless_emiss * 255.0).astype(np.uint8)).save(OUT_DIR / 'mycelium_floor_emissive.webp', quality=85, method=6)
    print('  ✓ Mycelium floor PBR textures generated')

# ---------------------------------------------------------------------------
# 3. OBSIDIAN SUITE
# ---------------------------------------------------------------------------
def generate_obsidian_wall():
    rng = np.random.default_rng(8301)
    y, x = np.mgrid[0:SIZE, 0:SIZE] / float(SIZE)

    # Base: Mirror-finish volcanic glass ashlar
    base = np.zeros((SIZE, SIZE, 3), dtype=np.float32)
    glass_col = np.array([0.06, 0.06, 0.08], dtype=np.float32)
    noise = rng.normal(0, 0.02, (SIZE, SIZE, 1)).astype(np.float32)
    base += glass_col + noise

    # Heavy ashlar blocks (staggered masonry grid 4x8)
    row = np.floor(y * 8.0)
    col_shift = (row % 2.0) * 0.5
    block_x = ((x * 4.0) + col_shift) % 1.0
    block_y = (y * 8.0) % 1.0
    seam_x = np.minimum(block_x, 1.0 - block_x)
    seam_y = np.minimum(block_y, 1.0 - block_y)
    seam_dist = np.minimum(seam_x * 4.0, seam_y * 8.0)
    seam_mask = np.clip(seam_dist * 25.0, 0.0, 1.0)[:, :, None]

    iron_clamp_col = np.array([0.18, 0.18, 0.20], dtype=np.float32)
    color = base * seam_mask + iron_clamp_col * (1.0 - seam_mask)

    # Engraved runic circuits (violet energy veins)
    runic_1 = np.abs(np.sin(x * 12.0 * np.pi) - np.cos(y * 8.0 * np.pi)) < 0.08
    runic_2 = np.abs(np.sin((x + y) * 8.0 * np.pi)) < 0.06
    runic_channels = (runic_1 | runic_2) & (seam_mask[:, :, 0] > 0.8)

    violet_col = np.array([0.88, 0.18, 0.98], dtype=np.float32)
    color[runic_channels] = violet_col * 0.9 + 0.1

    emissive = np.zeros((SIZE, SIZE, 3), dtype=np.float32)
    emissive[runic_channels] = violet_col

    seamless_color = make_seamless(color, margin_ratio=0.12)
    seamless_emiss = make_seamless(emissive, margin_ratio=0.12)
    normal = compute_normal_map(seamless_color, strength=3.6)

    rough = np.full((SIZE, SIZE), 0.16, dtype=np.float32)  # glass polish
    rough[seam_mask[:, :, 0] < 0.5] = 0.65  # forged iron
    rough[runic_channels] = 0.08
    seamless_rough = make_seamless(rough, margin_ratio=0.12)

    Image.fromarray((seamless_color * 255.0).astype(np.uint8)).save(OUT_DIR / 'obsidian_wall_color.webp', quality=88, method=6)
    Image.fromarray(normal).save(OUT_DIR / 'obsidian_wall_normal.webp', quality=90, method=6)
    Image.fromarray((seamless_rough * 255.0).astype(np.uint8)).save(OUT_DIR / 'obsidian_wall_rough.webp', quality=85, method=6)
    Image.fromarray((seamless_emiss * 255.0).astype(np.uint8)).save(OUT_DIR / 'obsidian_wall_emissive.webp', quality=85, method=6)
    print('  ✓ Obsidian wall PBR textures generated')

def generate_obsidian_floor():
    rng = np.random.default_rng(8302)
    y, x = np.mgrid[0:SIZE, 0:SIZE] / float(SIZE)

    # Base: Hexagonal volcanic flagstones
    base = np.zeros((SIZE, SIZE, 3), dtype=np.float32)
    obsidian_col = np.array([0.08, 0.08, 0.10], dtype=np.float32)
    noise = rng.normal(0, 0.025, (SIZE, SIZE, 1)).astype(np.float32)
    base += obsidian_col + noise

    # Hexagonal honeycomb tiling
    hx = x * 10.0
    hy = y * (10.0 * np.sqrt(3.0) / 2.0)
    h1 = np.abs(np.sin(hx * np.pi) * np.sin(hy * np.pi))
    h2 = np.abs(np.cos(hx * np.pi) * np.cos(hy * np.pi))
    hex_seams = np.clip((h1 * h2 * 8.0), 0.0, 1.0)[:, :, None]

    mortar_col = np.array([0.16, 0.15, 0.18], dtype=np.float32)
    color = base * (1.0 - (1.0 - hex_seams) * 0.6) + mortar_col * ((1.0 - hex_seams) * 0.6)

    # Radial runic leyline medallion at center
    r = np.sqrt((x - 0.5)**2 + (y - 0.5)**2)
    medallion_ring = (np.abs(r - 0.22) < 0.015) | (np.abs(r - 0.38) < 0.015)
    rad_spokes = (np.abs(np.sin(np.arctan2(y - 0.5, x - 0.5) * 6.0)) < 0.06) & (r < 0.40)
    leyline = medallion_ring | rad_spokes

    violet_col = np.array([0.90, 0.20, 1.00], dtype=np.float32)
    color[leyline] = violet_col * 0.85 + 0.15

    emissive = np.zeros((SIZE, SIZE, 3), dtype=np.float32)
    emissive[leyline] = violet_col

    seamless_color = make_seamless(color, margin_ratio=0.15)
    seamless_emiss = make_seamless(emissive, margin_ratio=0.15)
    normal = compute_normal_map(seamless_color, strength=3.5)

    rough = np.full((SIZE, SIZE), 0.18, dtype=np.float32)
    rough[hex_seams[:, :, 0] < 0.4] = 0.58
    rough[leyline] = 0.10
    seamless_rough = make_seamless(rough, margin_ratio=0.15)

    Image.fromarray((seamless_color * 255.0).astype(np.uint8)).save(OUT_DIR / 'obsidian_floor_color.webp', quality=88, method=6)
    Image.fromarray(normal).save(OUT_DIR / 'obsidian_floor_normal.webp', quality=90, method=6)
    Image.fromarray((seamless_rough * 255.0).astype(np.uint8)).save(OUT_DIR / 'obsidian_floor_rough.webp', quality=85, method=6)
    Image.fromarray((seamless_emiss * 255.0).astype(np.uint8)).save(OUT_DIR / 'obsidian_floor_emissive.webp', quality=85, method=6)
    print('  ✓ Obsidian floor PBR textures generated')

# ---------------------------------------------------------------------------
# 4. TOXIC SUMP SUITE
# ---------------------------------------------------------------------------
def generate_toxic_sump_wall():
    rng = np.random.default_rng(8401)
    y, x = np.mgrid[0:SIZE, 0:SIZE] / float(SIZE)

    # Base: Corroded industrial plate with chemical oxidation
    base = np.zeros((SIZE, SIZE, 3), dtype=np.float32)
    iron_col = np.array([0.22, 0.23, 0.22], dtype=np.float32)
    noise = rng.normal(0, 0.05, (SIZE, SIZE, 1)).astype(np.float32)
    base += iron_col + noise

    # Vertical corrugated panels and drainage conduits
    ribs = np.sin(x * 32.0 * np.pi) * 0.5 + 0.5
    rib_mask = (ribs ** 2.0)[:, :, None]
    color = base * 0.8 + rib_mask * 0.25

    # Hazard chevron warning band along wall footing (y > 0.85)
    chevron_y = y > 0.85
    chevron_pattern = np.sin((x + y * 2.0) * 28.0 * np.pi) > 0.0
    hazard_yellow = np.array([0.88, 0.72, 0.08], dtype=np.float32)
    hazard_black = np.array([0.10, 0.10, 0.10], dtype=np.float32)
    hazard_band = np.where(chevron_pattern[:, :, None], hazard_yellow, hazard_black)
    color[chevron_y] = hazard_band[chevron_y]

    # Amber caution light strip at top (y < 0.08)
    caution_bar = (y > 0.03) & (y < 0.07)
    amber_col = np.array([1.0, 0.75, 0.10], dtype=np.float32)
    color[caution_bar] = amber_col

    emissive = np.zeros((SIZE, SIZE, 3), dtype=np.float32)
    emissive[caution_bar] = amber_col

    seamless_color = make_seamless(color, margin_ratio=0.12)
    seamless_emiss = make_seamless(emissive, margin_ratio=0.12)
    normal = compute_normal_map(seamless_color, strength=3.8)

    rough = np.full((SIZE, SIZE), 0.65, dtype=np.float32)
    rough[caution_bar] = 0.15
    rough[chevron_y] = 0.55
    seamless_rough = make_seamless(rough, margin_ratio=0.12)

    Image.fromarray((seamless_color * 255.0).astype(np.uint8)).save(OUT_DIR / 'toxic_sump_wall_color.webp', quality=88, method=6)
    Image.fromarray(normal).save(OUT_DIR / 'toxic_sump_wall_normal.webp', quality=90, method=6)
    Image.fromarray((seamless_rough * 255.0).astype(np.uint8)).save(OUT_DIR / 'toxic_sump_wall_rough.webp', quality=85, method=6)
    Image.fromarray((seamless_emiss * 255.0).astype(np.uint8)).save(OUT_DIR / 'toxic_sump_wall_emissive.webp', quality=85, method=6)
    print('  ✓ Toxic sump wall PBR textures generated')

def generate_toxic_sump_floor():
    rng = np.random.default_rng(8402)
    y, x = np.mgrid[0:SIZE, 0:SIZE] / float(SIZE)

    # Base: Perforated cast-iron sump grating over dark sub-deck drainage
    base = np.zeros((SIZE, SIZE, 3), dtype=np.float32)
    grate_col = np.array([0.17, 0.17, 0.18], dtype=np.float32)
    noise = rng.normal(0, 0.03, (SIZE, SIZE, 1)).astype(np.float32)
    base += grate_col + noise

    # Hexagonal drainage perforation holes
    hex_x = (x * 32.0) % 1.0 - 0.5
    hex_y = (y * 32.0) % 1.0 - 0.5
    hex_r = np.sqrt(hex_x**2 + hex_y**2)
    hole_mask = (hex_r < 0.28)[:, :, None]

    drain_void = np.array([0.04, 0.04, 0.05], dtype=np.float32)
    color = base * (1.0 - hole_mask) + drain_void * hole_mask

    # Center drainage channel with yellow hazard safety edging
    trench_y = (y > 0.44) & (y < 0.56)
    trench_edge = ((y > 0.43) & (y < 0.45)) | ((y > 0.55) & (y < 0.57))
    hazard_yellow = np.array([0.88, 0.72, 0.08], dtype=np.float32)
    color[trench_edge] = hazard_yellow

    # Amber emergency under-grate beacons
    beacon_nodes = (r := np.sqrt((x - 0.5)**2 + (y - 0.5)**2)) < 0.06
    amber_glow = np.array([1.0, 0.75, 0.10], dtype=np.float32)
    color[beacon_nodes] = amber_glow

    emissive = np.zeros((SIZE, SIZE, 3), dtype=np.float32)
    emissive[beacon_nodes] = amber_glow

    seamless_color = make_seamless(color, margin_ratio=0.12)
    seamless_emiss = make_seamless(emissive, margin_ratio=0.12)
    normal = compute_normal_map(seamless_color, strength=4.2)

    rough = np.full((SIZE, SIZE), 0.50, dtype=np.float32)
    rough[hole_mask[:, :, 0]] = 0.90
    rough[beacon_nodes] = 0.15
    seamless_rough = make_seamless(rough, margin_ratio=0.12)

    Image.fromarray((seamless_color * 255.0).astype(np.uint8)).save(OUT_DIR / 'toxic_sump_floor_color.webp', quality=88, method=6)
    Image.fromarray(normal).save(OUT_DIR / 'toxic_sump_floor_normal.webp', quality=90, method=6)
    Image.fromarray((seamless_rough * 255.0).astype(np.uint8)).save(OUT_DIR / 'toxic_sump_floor_rough.webp', quality=85, method=6)
    Image.fromarray((seamless_emiss * 255.0).astype(np.uint8)).save(OUT_DIR / 'toxic_sump_floor_emissive.webp', quality=85, method=6)
    print('  ✓ Toxic sump floor PBR textures generated')

if __name__ == '__main__':
    print('Generating 4 expansion PBR suites (32 texture maps)...')
    generate_cleanroom_wall()
    generate_cleanroom_floor()
    generate_mycelium_wall()
    generate_mycelium_floor()
    generate_obsidian_wall()
    generate_obsidian_floor()
    generate_toxic_sump_wall()
    generate_toxic_sump_floor()
    print('All expansion wall & ground textures generated successfully!')
