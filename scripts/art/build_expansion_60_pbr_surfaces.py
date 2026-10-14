#!/usr/bin/env python3
"""Build the 12 seamless PBR environmental surface materials for the Interactive World Expansion.

Generates full PBR suites:
- _baseColor.webp (RGB color)
- _normal.webp (tangent-space normal map via Sobel convolution)
- _orm.webp (R: Ambient Occlusion, G: Roughness, B: Metalness)
- _emissive.webp (RGB emissive glow)
Plus _color.webp and _rough.webp aliases for kit/material compatibility.

Ensures strict seamless 4-way tiling via toroidal cosine feathering.
"""

from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent.parent
SOURCE_PBR_DIR = ROOT / 'art/source/textures/world-expansion-2026-10-14/pbr'
RUNTIME_SURFACES_DIR = ROOT / 'public/3d/runtime/surfaces'
RUNTIME_KITS_DIR = ROOT / 'public/3d/runtime/kits/textures'

SOURCE_PBR_DIR.mkdir(parents=True, exist_ok=True)
RUNTIME_SURFACES_DIR.mkdir(parents=True, exist_ok=True)
RUNTIME_KITS_DIR.mkdir(parents=True, exist_ok=True)

SIZE = 1024  # Standard runtime texture resolution for surfaces (crisp & performant)


def make_seamless(arr, margin_ratio=0.15):
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


def compute_ao(height, radius=6):
    """Compute ambient occlusion from height/luminance cavities."""
    blurred = ndimage.gaussian_filter(height, sigma=radius, mode='wrap')
    cavity = np.clip((height - blurred) * 2.5 + 0.5, 0.0, 1.0)
    return cavity


def save_pbr_set(mat_id, color, normal, rough, metal, ao, emissive=None):
    """Pack and save the full PBR suite in all required target directories."""
    # Ensure seamlessness
    s_color = make_seamless(np.clip(color, 0.0, 1.0))
    s_rough = make_seamless(np.clip(rough, 0.0, 1.0))
    s_metal = make_seamless(np.clip(metal, 0.0, 1.0))
    s_ao = make_seamless(np.clip(ao, 0.0, 1.0))
    
    if emissive is not None:
        s_emiss = make_seamless(np.clip(emissive, 0.0, 1.0))
    else:
        s_emiss = np.zeros((SIZE, SIZE, 3), dtype=np.float32)

    # Compute ORM packed map (R = AO, G = Roughness, B = Metalness)
    orm = np.stack([s_ao, s_rough, s_metal], axis=-1)

    img_color = Image.fromarray((s_color * 255.0).astype(np.uint8))
    img_normal = Image.fromarray(normal)
    img_orm = Image.fromarray((orm * 255.0).astype(np.uint8))
    img_rough = Image.fromarray((s_rough * 255.0).astype(np.uint8))
    img_emissive = Image.fromarray((s_emiss * 255.0).astype(np.uint8))

    targets = [SOURCE_PBR_DIR, RUNTIME_SURFACES_DIR, RUNTIME_KITS_DIR]
    for target in targets:
        # Standard PBR glTF map naming
        img_color.save(target / f'{mat_id}_baseColor.webp', quality=90, method=6)
        img_normal.save(target / f'{mat_id}_normal.webp', quality=90, method=6)
        img_orm.save(target / f'{mat_id}_orm.webp', quality=88, method=6)
        img_emissive.save(target / f'{mat_id}_emissive.webp', quality=88, method=6)

        # Kit / legacy compatibility aliases
        img_color.save(target / f'{mat_id}_color.webp', quality=90, method=6)
        img_rough.save(target / f'{mat_id}_rough.webp', quality=88, method=6)

    print(f"  ✓ {mat_id} PBR suite written to source & runtime surfaces")


# ===========================================================================
# 1. T01: Geothermal Slotted Drainage Deck (tex_pbr_geothermal_trench_grate)
# ===========================================================================
def gen_geothermal_trench_grate():
    rng = np.random.default_rng(9101)
    y, x = np.mgrid[0:SIZE, 0:SIZE] / float(SIZE)

    # Cast iron base with verdigris patina and geothermal lime
    base = np.zeros((SIZE, SIZE, 3), dtype=np.float32)
    iron_col = np.array([0.22, 0.20, 0.19], dtype=np.float32)
    base += iron_col + rng.normal(0, 0.03, (SIZE, SIZE, 3))

    # Long rectangular drainage slots (8 columns, 16 rows per tile)
    gx = (x * 8.0) % 1.0
    gy = (y * 16.0) % 1.0
    slot_mask = (gx > 0.22) & (gx < 0.78) & (gy > 0.12) & (gy < 0.88)

    # Slot interior: deep dark pit with fleshy tendrils
    color = base.copy()
    color[slot_mask] = np.array([0.05, 0.03, 0.02], dtype=np.float32)

    # Fleshy tendrils coiling inside the slots
    tendril_phase = np.sin(x * 64.0 + y * 32.0)
    tendril_mask = slot_mask & (tendril_phase > 0.3)
    color[tendril_mask] = np.array([0.45, 0.18, 0.14], dtype=np.float32)

    # Verdigris / lime patina around slot rims
    rim_mask = ((gx > 0.15) & (gx < 0.22) | (gx > 0.78) & (gx < 0.85)) & (gy > 0.08) & (gy < 0.92)
    verdigris_col = np.array([0.15, 0.52, 0.45], dtype=np.float32)
    color[rim_mask] = color[rim_mask] * 0.4 + verdigris_col * 0.6

    normal = compute_normal_map(color, strength=4.2)
    height = 0.299 * color[:, :, 0] + 0.587 * color[:, :, 1] + 0.114 * color[:, :, 2]
    ao = compute_ao(height, radius=8)
    ao[slot_mask] *= 0.3

    rough = np.full((SIZE, SIZE), 0.55, dtype=np.float32)
    rough[slot_mask] = 0.25  # wet slimy interior
    rough[rim_mask] = 0.80

    metal = np.full((SIZE, SIZE), 0.65, dtype=np.float32)
    metal[slot_mask] = 0.05
    metal[rim_mask] = 0.20

    # Emissive: warm geothermal magma/spore pulse in pit
    emissive = np.zeros((SIZE, SIZE, 3), dtype=np.float32)
    emissive[tendril_mask] = np.array([0.65, 0.22, 0.05], dtype=np.float32)

    save_pbr_set('tex_pbr_geothermal_trench_grate', color, normal, rough, metal, ao, emissive)


# ===========================================================================
# 2. T02: Braided Conduit Substation Floor (tex_pbr_meridian_cable_conduit_deck)
# ===========================================================================
def gen_meridian_cable_conduit_deck():
    rng = np.random.default_rng(9102)
    y, x = np.mgrid[0:SIZE, 0:SIZE] / float(SIZE)

    # Vulcanized black rubber safety matting with diamond pattern
    d1 = (x * 32.0 + y * 32.0) % 1.0
    d2 = (x * 32.0 - y * 32.0) % 1.0
    diamond = np.sin(d1 * np.pi) * np.sin(d2 * np.pi)
    
    rubber_col = np.array([0.12, 0.12, 0.14], dtype=np.float32)
    color = np.zeros((SIZE, SIZE, 3), dtype=np.float32) + rubber_col + diamond[:, :, None] * 0.04
    color += rng.normal(0, 0.015, (SIZE, SIZE, 3))

    # Recessed conduit channel running down the center (x: 0.35 to 0.65)
    trough_mask = (x > 0.35) & (x < 0.65)
    color[trough_mask] = np.array([0.08, 0.08, 0.09], dtype=np.float32)

    # Copper braided cables & glistening human optic nerves inside trough
    cable_sin = np.sin(y * 80.0 + x * 20.0)
    copper_mask = trough_mask & (cable_sin > 0.2) & (x < 0.50)
    nerve_mask = trough_mask & (cable_sin > 0.0) & (x >= 0.50)

    color[copper_mask] = np.array([0.72, 0.42, 0.22], dtype=np.float32)  # braided copper
    color[nerve_mask] = np.array([0.85, 0.80, 0.72], dtype=np.float32)   # glistening white optic nerve

    normal = compute_normal_map(color, strength=3.8)
    height = 0.299 * color[:, :, 0] + 0.587 * color[:, :, 1] + 0.114 * color[:, :, 2]
    ao = compute_ao(height, radius=6)
    ao[trough_mask] *= 0.4

    rough = np.full((SIZE, SIZE), 0.60, dtype=np.float32)
    rough[nerve_mask] = 0.15  # slick glistening wet
    rough[copper_mask] = 0.35

    metal = np.full((SIZE, SIZE), 0.10, dtype=np.float32)
    metal[copper_mask] = 0.85

    # Emissive: cyan cybernetic nerve pulse
    emissive = np.zeros((SIZE, SIZE, 3), dtype=np.float32)
    emissive[nerve_mask] = np.array([0.0, 0.60, 0.85], dtype=np.float32) * 0.7

    save_pbr_set('tex_pbr_meridian_cable_conduit_deck', color, normal, rough, metal, ao, emissive)


# ===========================================================================
# 3. T03: Trench Bastion Treadplate (tex_pbr_vesper_trench_treadplate)
# ===========================================================================
def gen_vesper_trench_treadplate():
    rng = np.random.default_rng(9103)
    y, x = np.mgrid[0:SIZE, 0:SIZE] / float(SIZE)

    # 5-bar industrial steel diamond checker plate
    bx = (x * 16.0) % 1.0
    by = (y * 16.0) % 1.0
    bars = (bx > 0.2) & (bx < 0.8) & (by > 0.15) & (by < 0.45)
    
    steel_col = np.array([0.24, 0.25, 0.27], dtype=np.float32)
    color = np.zeros((SIZE, SIZE, 3), dtype=np.float32) + steel_col
    color[bars] += 0.10  # raised bar highlight
    color += rng.normal(0, 0.02, (SIZE, SIZE, 3))

    # Blood & soot stains
    soot = rng.normal(0, 0.05, (SIZE, SIZE))
    blood_mask = (y > 0.5) & (soot > 0.06)
    color[blood_mask] = np.array([0.28, 0.06, 0.05], dtype=np.float32)

    normal = compute_normal_map(color, strength=4.5)
    height = 0.299 * color[:, :, 0] + 0.587 * color[:, :, 1] + 0.114 * color[:, :, 2]
    ao = compute_ao(height, radius=7)

    rough = np.full((SIZE, SIZE), 0.45, dtype=np.float32)
    rough[bars] = 0.30
    rough[blood_mask] = 0.20

    metal = np.full((SIZE, SIZE), 0.80, dtype=np.float32)
    metal[blood_mask] = 0.10

    emissive = np.zeros((SIZE, SIZE, 3), dtype=np.float32)

    save_pbr_set('tex_pbr_vesper_trench_treadplate', color, normal, rough, metal, ao, emissive)


# ===========================================================================
# 4. T04: Sub-Level 13 Corporate Linoleum (tex_pbr_corp_sublevel_linoleum)
# ===========================================================================
def gen_corp_sublevel_linoleum():
    rng = np.random.default_rng(9104)
    y, x = np.mgrid[0:SIZE, 0:SIZE] / float(SIZE)

    # Square mottled vinyl tiles with copper grounding joints
    tx = (x * 4.0) % 1.0
    ty = (y * 4.0) % 1.0
    joint = (tx < 0.03) | (ty < 0.03)

    tile_mottle = (np.sin(x * 12.0) * np.cos(y * 12.0) * 0.05)[:, :, None]
    tile_col = np.array([0.18, 0.20, 0.22], dtype=np.float32)
    color = np.zeros((SIZE, SIZE, 3), dtype=np.float32) + tile_col + tile_mottle

    # Copper joint lines
    color[joint] = np.array([0.65, 0.45, 0.25], dtype=np.float32)

    # Forensic arterial splatter
    splatter = rng.exponential(0.02, (SIZE, SIZE)) > 0.09
    color[splatter] = np.array([0.35, 0.04, 0.04], dtype=np.float32)

    normal = compute_normal_map(color, strength=2.2)
    height = 0.299 * color[:, :, 0] + 0.587 * color[:, :, 1] + 0.114 * color[:, :, 2]
    ao = compute_ao(height, radius=5)

    rough = np.full((SIZE, SIZE), 0.28, dtype=np.float32)  # waxed high gloss
    rough[joint] = 0.45
    rough[splatter] = 0.15

    metal = np.full((SIZE, SIZE), 0.05, dtype=np.float32)
    metal[joint] = 0.80

    emissive = np.zeros((SIZE, SIZE, 3), dtype=np.float32)

    save_pbr_set('tex_pbr_corp_sublevel_linoleum', color, normal, rough, metal, ao, emissive)


# ===========================================================================
# 5. T05: Suture Amniotic Bedrock (tex_pbr_hive_suture_amniotic_resin)
# ===========================================================================
def gen_hive_suture_amniotic_resin():
    rng = np.random.default_rng(9105)
    y, x = np.mgrid[0:SIZE, 0:SIZE] / float(SIZE)

    # Translucent honey-amber resin with bone fragments and capillary veins
    amber_col = np.array([0.68, 0.42, 0.12], dtype=np.float32)
    color = np.zeros((SIZE, SIZE, 3), dtype=np.float32) + amber_col

    # Capillary branching veins
    veins = np.sin(x * 24.0 + np.sin(y * 36.0)) * np.cos(y * 24.0)
    vein_mask = veins > 0.55
    color[vein_mask] = np.array([0.55, 0.08, 0.08], dtype=np.float32)

    # Calcified bone shards
    bone_noise = rng.normal(0, 0.1, (SIZE, SIZE))
    bone_mask = (bone_noise > 0.22) & ~vein_mask
    color[bone_mask] = np.array([0.82, 0.78, 0.68], dtype=np.float32)

    normal = compute_normal_map(color, strength=3.6)
    height = 0.299 * color[:, :, 0] + 0.587 * color[:, :, 1] + 0.114 * color[:, :, 2]
    ao = compute_ao(height, radius=8)

    rough = np.full((SIZE, SIZE), 0.18, dtype=np.float32)  # wet glossy resin
    rough[bone_mask] = 0.50

    metal = np.zeros((SIZE, SIZE), dtype=np.float32)

    # Emissive: warm amber bioluminescent subsurface scatter (#f59e0b)
    emissive = np.zeros((SIZE, SIZE, 3), dtype=np.float32)
    emissive[vein_mask] = np.array([0.96, 0.62, 0.07], dtype=np.float32) * 0.6

    save_pbr_set('tex_pbr_hive_suture_amniotic_resin', color, normal, rough, metal, ao, emissive)


# ===========================================================================
# 6. T06: Xenobiology Cleanroom Polymer (tex_pbr_vass_cleanroom_poly)
# ===========================================================================
def gen_vass_cleanroom_poly():
    rng = np.random.default_rng(9106)
    y, x = np.mgrid[0:SIZE, 0:SIZE] / float(SIZE)

    # Sterile off-white antibacterial polymer wall with silicone seams
    poly_col = np.array([0.82, 0.83, 0.85], dtype=np.float32)
    color = np.zeros((SIZE, SIZE, 3), dtype=np.float32) + poly_col

    # Silicone seams (2x2 panels)
    sx = (x * 2.0) % 1.0
    sy = (y * 2.0) % 1.0
    seam = (sx < 0.015) | (sy < 0.015)
    color[seam] = np.array([0.32, 0.35, 0.38], dtype=np.float32)

    # Fluorescent emerald hemolymph splatters
    hemo_noise = rng.normal(0, 0.1, (SIZE, SIZE))
    hemo_mask = (hemo_noise > 0.24) & ~seam
    emerald_col = np.array([0.13, 0.77, 0.37], dtype=np.float32)
    color[hemo_mask] = emerald_col

    normal = compute_normal_map(color, strength=2.8)
    height = 0.299 * color[:, :, 0] + 0.587 * color[:, :, 1] + 0.114 * color[:, :, 2]
    ao = compute_ao(height, radius=6)

    rough = np.full((SIZE, SIZE), 0.35, dtype=np.float32)
    rough[seam] = 0.70
    rough[hemo_mask] = 0.10  # wet fluid

    metal = np.full((SIZE, SIZE), 0.05, dtype=np.float32)

    # Emissive: emerald bioluminescence in hemolymph (#22c55e)
    emissive = np.zeros((SIZE, SIZE, 3), dtype=np.float32)
    emissive[hemo_mask] = emerald_col * 0.85

    save_pbr_set('tex_pbr_vass_cleanroom_poly', color, normal, rough, metal, ao, emissive)


# ===========================================================================
# 7. T07: Fractured Glacial Basalt (tex_pbr_chasm_permafrost_bedrock)
# ===========================================================================
def gen_chasm_permafrost_bedrock():
    rng = np.random.default_rng(9107)
    y, x = np.mgrid[0:SIZE, 0:SIZE] / float(SIZE)

    # Dense pitch-black volcanic basalt
    basalt_col = np.array([0.10, 0.11, 0.12], dtype=np.float32)
    color = np.zeros((SIZE, SIZE, 3), dtype=np.float32) + basalt_col + rng.normal(0, 0.03, (SIZE, SIZE, 3))

    # Tectonic freeze-thaw fracture cracks with cyan ice crystals
    cracks = np.sin(x * 18.0 + y * 24.0) * np.cos(x * 24.0 - y * 18.0)
    crack_mask = np.abs(cracks) < 0.08

    ice_col = np.array([0.22, 0.74, 0.97], dtype=np.float32)
    color[crack_mask] = ice_col

    normal = compute_normal_map(color, strength=5.0)
    height = 0.299 * color[:, :, 0] + 0.587 * color[:, :, 1] + 0.114 * color[:, :, 2]
    ao = compute_ao(height, radius=9)

    rough = np.full((SIZE, SIZE), 0.75, dtype=np.float32)  # rough basalt
    rough[crack_mask] = 0.12  # glassy ice

    metal = np.full((SIZE, SIZE), 0.05, dtype=np.float32)

    emissive = np.zeros((SIZE, SIZE, 3), dtype=np.float32)
    emissive[crack_mask] = ice_col * 0.45

    save_pbr_set('tex_pbr_chasm_permafrost_bedrock', color, normal, rough, metal, ao, emissive)


# ===========================================================================
# 8. T08: Scorched Spacecraft Heat Shield (tex_pbr_crash_hull_ablative_tile)
# ===========================================================================
def gen_crash_hull_ablative_tile():
    rng = np.random.default_rng(9108)
    y, x = np.mgrid[0:SIZE, 0:SIZE] / float(SIZE)

    # Hexagonal ceramic heat tiles
    hx = (x * 6.0) % 1.0
    hy = (y * 6.0 * 1.15) % 1.0
    hex_seam = (hx < 0.04) | (hy < 0.04)

    tile_col = np.array([0.12, 0.12, 0.13], dtype=np.float32)
    color = np.zeros((SIZE, SIZE, 3), dtype=np.float32) + tile_col

    # Aerodynamic re-entry melt streaks
    scorch = np.exp(-((y - 0.5)**2) * 8.0) * (rng.normal(0, 0.08, (SIZE, SIZE)) + 0.5)
    color += scorch[:, :, None] * np.array([0.15, 0.10, 0.06], dtype=np.float32)

    # Nextel fabric expansion gaps
    color[hex_seam] = np.array([0.28, 0.28, 0.30], dtype=np.float32)

    normal = compute_normal_map(color, strength=3.5)
    height = 0.299 * color[:, :, 0] + 0.587 * color[:, :, 1] + 0.114 * color[:, :, 2]
    ao = compute_ao(height, radius=6)

    rough = np.full((SIZE, SIZE), 0.55, dtype=np.float32)
    rough[hex_seam] = 0.85

    metal = np.full((SIZE, SIZE), 0.20, dtype=np.float32)

    emissive = np.zeros((SIZE, SIZE, 3), dtype=np.float32)

    save_pbr_set('tex_pbr_crash_hull_ablative_tile', color, normal, rough, metal, ao, emissive)


# ===========================================================================
# 9. T09: Overlapping Beetle Chitin Shingles (tex_pbr_hive_chitin_plates)
# ===========================================================================
def gen_hive_chitin_plates():
    rng = np.random.default_rng(9109)
    y, x = np.mgrid[0:SIZE, 0:SIZE] / float(SIZE)

    # Overlapping shingle plates of black/midnight-purple chitin
    shingle_y = (y * 8.0) % 1.0
    shingle_edge = shingle_y < 0.10

    chitin_base = np.array([0.11, 0.08, 0.14], dtype=np.float32)
    color = np.zeros((SIZE, SIZE, 3), dtype=np.float32) + chitin_base
    color += shingle_y[:, :, None] * 0.08  # bevel gradient

    # Breathing spiracles weeping yellow hemolymph
    spiracle = (shingle_y < 0.15) & ((x * 16.0) % 1.0 < 0.12)
    color[spiracle] = np.array([0.85, 0.70, 0.10], dtype=np.float32)

    normal = compute_normal_map(color, strength=4.0)
    height = 0.299 * color[:, :, 0] + 0.587 * color[:, :, 1] + 0.114 * color[:, :, 2]
    ao = compute_ao(height, radius=7)

    rough = np.full((SIZE, SIZE), 0.16, dtype=np.float32)  # ultra-glossy chitin
    rough[spiracle] = 0.08

    metal = np.full((SIZE, SIZE), 0.35, dtype=np.float32)  # iridescent sheen

    emissive = np.zeros((SIZE, SIZE, 3), dtype=np.float32)
    emissive[spiracle] = np.array([0.90, 0.75, 0.08], dtype=np.float32) * 0.5

    save_pbr_set('tex_pbr_hive_chitin_plates', color, normal, rough, metal, ao, emissive)


# ===========================================================================
# 10. T10: Geothermal Nutrient Mulch (tex_pbr_hydro_fermenter_sludge)
# ===========================================================================
def gen_hydro_fermenter_sludge():
    rng = np.random.default_rng(9110)
    y, x = np.mgrid[0:SIZE, 0:SIZE] / float(SIZE)

    # Dense decaying black cave moss and geothermal silt
    silt_col = np.array([0.12, 0.14, 0.11], dtype=np.float32)
    color = np.zeros((SIZE, SIZE, 3), dtype=np.float32) + silt_col + rng.normal(0, 0.04, (SIZE, SIZE, 3))

    # Lime-green bioluminescent fungal spore pods (#84cc16)
    spores = rng.normal(0, 0.1, (SIZE, SIZE)) > 0.22
    lime_col = np.array([0.52, 0.80, 0.09], dtype=np.float32)
    color[spores] = lime_col

    normal = compute_normal_map(color, strength=4.6)
    height = 0.299 * color[:, :, 0] + 0.587 * color[:, :, 1] + 0.114 * color[:, :, 2]
    ao = compute_ao(height, radius=8)

    rough = np.full((SIZE, SIZE), 0.32, dtype=np.float32)  # wet sludge
    rough[spores] = 0.15

    metal = np.zeros((SIZE, SIZE), dtype=np.float32)

    emissive = np.zeros((SIZE, SIZE, 3), dtype=np.float32)
    emissive[spores] = lime_col * 0.90

    save_pbr_set('tex_pbr_hydro_fermenter_sludge', color, normal, rough, metal, ao, emissive)


# ===========================================================================
# 11. T11: Gantry Corrugated Walkway (tex_pbr_evac_gantry_corrugated_deck)
# ===========================================================================
def gen_evac_gantry_corrugated_deck():
    rng = np.random.default_rng(9111)
    y, x = np.mgrid[0:SIZE, 0:SIZE] / float(SIZE)

    # Yellow and black diagonal hazard warning stripes
    diag = (x * 8.0 + y * 8.0) % 1.0
    stripe_yellow = diag < 0.50

    color = np.zeros((SIZE, SIZE, 3), dtype=np.float32)
    color[stripe_yellow] = np.array([0.85, 0.72, 0.12], dtype=np.float32)
    color[~stripe_yellow] = np.array([0.12, 0.12, 0.14], dtype=np.float32)

    # Perforated drainage holes
    hx = (x * 16.0) % 1.0
    hy = (y * 16.0) % 1.0
    hole_dist = np.sqrt((hx - 0.5)**2 + (hy - 0.5)**2)
    hole_mask = hole_dist < 0.22
    color[hole_mask] = np.array([0.04, 0.04, 0.05], dtype=np.float32)

    normal = compute_normal_map(color, strength=4.2)
    height = 0.299 * color[:, :, 0] + 0.587 * color[:, :, 1] + 0.114 * color[:, :, 2]
    ao = compute_ao(height, radius=6)
    ao[hole_mask] *= 0.2

    rough = np.full((SIZE, SIZE), 0.50, dtype=np.float32)
    rough[hole_mask] = 0.90

    metal = np.full((SIZE, SIZE), 0.60, dtype=np.float32)
    metal[hole_mask] = 0.05

    emissive = np.zeros((SIZE, SIZE, 3), dtype=np.float32)

    save_pbr_set('tex_pbr_evac_gantry_corrugated_deck', color, normal, rough, metal, ao, emissive)


# ===========================================================================
# 12. T12: Biomechanical Obsidian Flagstone (tex_pbr_obsidian_cathedral_flagstone)
# ===========================================================================
def gen_obsidian_cathedral_flagstone():
    rng = np.random.default_rng(9112)
    y, x = np.mgrid[0:SIZE, 0:SIZE] / float(SIZE)

    # Mirror-polished black volcanic flagstone with Giger pelvic canals
    obsidian_col = np.array([0.08, 0.08, 0.09], dtype=np.float32)
    color = np.zeros((SIZE, SIZE, 3), dtype=np.float32) + obsidian_col

    # Biomechanical canal channels weeping golden jelly (#f59e0b)
    canals = np.sin(x * 12.0 + np.cos(y * 12.0)) * np.cos(y * 12.0)
    canal_mask = np.abs(canals) < 0.10
    jelly_col = np.array([0.96, 0.62, 0.07], dtype=np.float32)
    color[canal_mask] = jelly_col

    normal = compute_normal_map(color, strength=3.8)
    height = 0.299 * color[:, :, 0] + 0.587 * color[:, :, 1] + 0.114 * color[:, :, 2]
    ao = compute_ao(height, radius=7)

    rough = np.full((SIZE, SIZE), 0.12, dtype=np.float32)  # mirror polish obsidian
    rough[canal_mask] = 0.08  # wet royal jelly

    metal = np.full((SIZE, SIZE), 0.30, dtype=np.float32)

    emissive = np.zeros((SIZE, SIZE, 3), dtype=np.float32)
    emissive[canal_mask] = jelly_col * 0.75

    save_pbr_set('tex_pbr_obsidian_cathedral_flagstone', color, normal, rough, metal, ao, emissive)


def main():
    print("[ExpansionPBR] Generating 12 seamless PBR environmental surface suites...")
    gen_geothermal_trench_grate()
    gen_meridian_cable_conduit_deck()
    gen_vesper_trench_treadplate()
    gen_corp_sublevel_linoleum()
    gen_hive_suture_amniotic_resin()
    gen_vass_cleanroom_poly()
    gen_chasm_permafrost_bedrock()
    gen_crash_hull_ablative_tile()
    gen_hive_chitin_plates()
    gen_hydro_fermenter_sludge()
    gen_evac_gantry_corrugated_deck()
    gen_obsidian_cathedral_flagstone()
    print("[ExpansionPBR] All 12 PBR surface suites successfully generated and exported!")


if __name__ == '__main__':
    main()
