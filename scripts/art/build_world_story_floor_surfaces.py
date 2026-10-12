#!/usr/bin/env python3
"""Build the 2026-10-12 world-story mature floor surfaces (12 prompts x 4 variants = 48 textures).

docs/planning/lore-and-world-story-assets-and-textures-2026-10-12.md, Section 5 & 6.
For each surface variant, writes:
  art/source/textures/world-story-2026-10-12/pbr/<name>_{albedo,normal,roughness,height,ao,metallic}.png
  public/3d/runtime/surfaces/<name>_albedo.ktx2   RGB colour (sRGB), A metalness (BC7)
  public/3d/runtime/surfaces/<name>_detail.ktx2   R/G normal x/y, B roughness, A height (linear BC7)
"""

import json
import struct
import sys
from pathlib import Path

import etcpak
import numpy as np
import zstandard
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent.parent
SOURCE_DIR = ROOT / 'art/source/textures/world-story-2026-10-12/raw'
PBR_DIR = ROOT / 'art/source/textures/world-story-2026-10-12/pbr'
RUNTIME_DIR = ROOT / 'public/3d/runtime/surfaces'
SIZE = 1024
MIN_LEVEL = 4

SURFACES = {
    'tex_floor_blood_drain_grate': dict(normal=5.5, rough=(0.30, 0.75), metal=0.65, delight=0.70),
    'tex_floor_charred_crematorium': dict(normal=4.0, rough=(0.70, 0.95), metal=0.0, delight=0.65),
    'tex_floor_amniotic_slime_crust': dict(normal=4.2, rough=(0.15, 0.50), metal=0.05, delight=0.55),
    'tex_floor_frostbitten_trench': dict(normal=3.8, rough=(0.20, 0.60), metal=0.0, delight=0.55),
    'tex_floor_battery_acid_corrosion': dict(normal=4.8, rough=(0.50, 0.85), metal=0.40, delight=0.65),
    'tex_floor_chitinous_eggshell_drift': dict(normal=3.8, rough=(0.40, 0.80), metal=0.0, delight=0.60),
    'tex_floor_cannibal_butchery_planks': dict(normal=4.4, rough=(0.65, 0.95), metal=0.0, delight=0.65),
    'tex_floor_necrotic_bio_sludge': dict(normal=4.0, rough=(0.18, 0.52), metal=0.0, delight=0.50),
    'tex_floor_shattered_safety_glass': dict(normal=4.2, rough=(0.25, 0.65), metal=0.20, delight=0.60),
    'tex_floor_hydraulic_oil_slick': dict(normal=3.2, rough=(0.10, 0.45), metal=0.15, delight=0.55),
    'tex_floor_tallow_spore_fungus': dict(normal=3.6, rough=(0.45, 0.85), metal=0.0, delight=0.60),
    'tex_floor_scorched_plasma_crater': dict(normal=4.5, rough=(0.40, 0.75), metal=0.35, delight=0.65),
}


def smoothstep(edge0, edge1, value):
    t = np.clip((value - edge0) / (edge1 - edge0), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def luminance(rgb):
    return rgb[..., 0] * 0.299 + rgb[..., 1] * 0.587 + rgb[..., 2] * 0.114


def blur(values, sigma):
    if values.ndim == 3:
        return np.stack([ndimage.gaussian_filter(values[..., c], sigma, mode='wrap') for c in range(values.shape[2])], -1)
    return ndimage.gaussian_filter(values, sigma, mode='wrap')


def edge_error(values):
    across = (np.abs(values[:, 0] - values[:, -1]).mean() + np.abs(values[0] - values[-1]).mean()) / 2
    inside = (np.abs(np.diff(values, axis=1)).mean() + np.abs(np.diff(values, axis=0)).mean()) / 2
    return float(across / max(inside, 1e-6))


def make_tileable(rgb, seed):
    half = SIZE // 2
    shifted = np.roll(rgb, (half, half), axis=(0, 1))
    coords = np.arange(SIZE, dtype=np.float32)
    border = np.minimum(coords, SIZE - 1 - coords) / half
    window = np.minimum(border[:, None], border[None, :])
    rng = np.random.default_rng(seed)
    ragged = blur(rng.random((SIZE, SIZE)).astype(np.float32), 18)
    ragged = (ragged - ragged.mean()) / (ragged.std() + 1e-6)
    lead = luminance(rgb) - luminance(shifted)
    wobble = (ragged * 0.05 + lead * 0.12) * np.clip(window * 5.0, 0.0, 1.0)
    mask = smoothstep(0.18, 0.34, window + wobble)
    return rgb * mask[..., None] + shifted * (1.0 - mask[..., None])


def delight(rgb, amount):
    lum = luminance(rgb)
    low = blur(lum, 110)
    gain = np.clip(lum.mean() / np.maximum(low, 1e-3), 0.55, 1.8) ** amount
    return np.clip(rgb * gain[..., None], 0.0, 1.0)


def normalize01(values, low=1, high=99):
    lo, hi = np.percentile(values, [low, high])
    return np.clip((values - lo) / max(hi - lo, 1e-6), 0.0, 1.0)


def derive_height(rgb):
    lum = luminance(rgb)
    fine = lum - blur(lum, 22)
    broad = lum - blur(lum, 90)
    return normalize01(fine * 0.7 + broad * 0.3)


def derive_normal(height, strength):
    dx = ndimage.sobel(height, axis=1, mode='wrap') / 8.0
    dy = ndimage.sobel(height, axis=0, mode='wrap') / 8.0
    n = np.stack((-dx * strength * SIZE / 256, -dy * strength * SIZE / 256, np.ones_like(height)), -1)
    return n / np.linalg.norm(n, axis=-1, keepdims=True)


def derive_ao(height):
    cavity = blur(height, 10) - height
    return np.clip(1.0 - np.maximum(cavity, 0.0) * 3.2, 0.35, 1.0)


def derive_roughness(rgb, height, rough_range):
    bright, dark = rough_range
    lum = normalize01(luminance(rgb), 2, 98)
    value = dark + (bright - dark) * lum
    value += (1.0 - height) * 0.08
    return np.clip(value, 0.04, 1.0)


def derive_metalness(rgb, metal):
    if metal <= 0.0:
        return np.zeros(rgb.shape[:2], np.float32)
    saturation = rgb.max(-1) - rgb.min(-1)
    rust = np.clip((rgb[..., 0] - rgb[..., 2]) * 3.0, 0.0, 1.0)
    return np.clip(metal * (1.0 - saturation * 2.5) * (1.0 - rust), 0.0, 1.0)


def to_u8(values):
    return np.clip(np.round(values * 255.0), 0, 255).astype(np.uint8)


def save_png(path, values):
    Image.fromarray(to_u8(values)).save(path, optimize=True)


def mip_chain(rgba, is_normal_map):
    levels = [rgba]
    while min(levels[-1].shape[:2]) > MIN_LEVEL:
        prev = levels[-1]
        h, w = prev.shape[0] // 2, prev.shape[1] // 2
        nxt = prev.reshape(h, 2, w, 2, 4).mean(axis=(1, 3))
        if is_normal_map:
            xy = nxt[..., :2] * 2.0 - 1.0
            length = np.sqrt(np.clip(1.0 - (xy ** 2).sum(-1), 0.0, 1.0) + (xy ** 2).sum(-1))
            nxt[..., :2] = (xy / np.maximum(length, 1e-6)[..., None]) * 0.5 + 0.5
        levels.append(nxt)
    return levels


def bc7_levels(rgba, is_normal_map):
    return [etcpak.compress_bc7(np.ascontiguousarray(to_u8(level)).tobytes(), level.shape[1], level.shape[0], None)
            for level in mip_chain(rgba, is_normal_map)]


VK_FORMAT_BC7_UNORM_BLOCK = 145
VK_FORMAT_BC7_SRGB_BLOCK = 146
KTX2_IDENTIFIER = bytes([0xAB, 0x4B, 0x54, 0x58, 0x20, 0x32, 0x30, 0xBB, 0x0D, 0x0A, 0x1A, 0x0A])


def write_ktx2(path, levels, size, srgb):
    width, height = size if isinstance(size, tuple) else (size, size)
    compressor = zstandard.ZstdCompressor(level=19)
    packed = [compressor.compress(level) for level in levels]
    dfd_block = struct.pack(
        '<IHHBBBB4B8B',
        0, 2, 24 + 16,
        136, 1, 2 if srgb else 1, 0,
        3, 3, 0, 0,
        16, 0, 0, 0, 0, 0, 0, 0,
    ) + struct.pack('<HBB4BII', 0, 127, 0, 0, 0, 0, 0, 0, 0xFFFFFFFF)
    dfd = struct.pack('<I', 4 + len(dfd_block)) + dfd_block
    header_bytes = 12 + 9 * 4 + 4 * 4 + 2 * 8 + len(levels) * 24
    dfd_offset = header_bytes
    data_offset = dfd_offset + len(dfd)
    offsets = [0] * len(levels)
    cursor = data_offset
    for index in reversed(range(len(levels))):
        offsets[index] = cursor
        cursor += len(packed[index])
    with open(path, 'wb') as out:
        out.write(KTX2_IDENTIFIER)
        out.write(struct.pack('<9I', VK_FORMAT_BC7_SRGB_BLOCK if srgb else VK_FORMAT_BC7_UNORM_BLOCK,
                              1, width, height, 0, 0, 1, len(levels), 2))
        out.write(struct.pack('<IIIIQQ', dfd_offset, len(dfd), 0, 0, 0, 0))
        for index in range(len(levels)):
            out.write(struct.pack('<QQQ', offsets[index], len(packed[index]), len(levels[index])))
        out.write(dfd)
        for index in reversed(range(len(levels))):
            out.write(packed[index])


def load_source(path):
    image = Image.open(path).convert('RGB')
    if image.size != (SIZE, SIZE):
        image = image.resize((SIZE, SIZE), Image.Resampling.LANCZOS)
    return np.asarray(image, dtype=np.float32) / 255.0


def build_surface(path, settings, seed):
    name = path.stem
    rgb = delight(load_source(path), settings['delight'])
    before = edge_error(luminance(rgb))
    rgb = make_tileable(rgb, seed)
    after = edge_error(luminance(rgb))

    height = derive_height(rgb)
    normal = derive_normal(height, settings['normal'])
    ao = derive_ao(height)
    roughness = derive_roughness(rgb, height, settings['rough'])
    metalness = derive_metalness(rgb, settings['metal'])

    PBR_DIR.mkdir(parents=True, exist_ok=True)
    save_png(PBR_DIR / f'{name}_albedo.png', rgb)
    save_png(PBR_DIR / f'{name}_normal.png', normal * 0.5 + 0.5)
    save_png(PBR_DIR / f'{name}_roughness.png', roughness)
    save_png(PBR_DIR / f'{name}_height.png', height)
    save_png(PBR_DIR / f'{name}_ao.png', ao)
    save_png(PBR_DIR / f'{name}_metallic.png', metalness)

    albedo = np.concatenate((rgb * (0.82 + 0.18 * ao[..., None]), metalness[..., None]), -1)
    detail = np.concatenate((normal[..., :2] * 0.5 + 0.5, roughness[..., None], height[..., None]), -1)
    RUNTIME_DIR.mkdir(parents=True, exist_ok=True)
    write_ktx2(RUNTIME_DIR / f'{name}_albedo.ktx2', bc7_levels(albedo, False), SIZE, srgb=True)
    write_ktx2(RUNTIME_DIR / f'{name}_detail.ktx2', bc7_levels(detail, True), SIZE, srgb=False)
    return {'name': name, 'edgeBefore': round(before, 2), 'edgeAfter': round(after, 2),
            'bytes': sum((RUNTIME_DIR / f'{name}_{m}.ktx2').stat().st_size for m in ('albedo', 'detail'))}


def main():
    prefixes = sys.argv[1:]
    report = []
    for index, path in enumerate(sorted(SOURCE_DIR.glob('*.jpg'))):
        if prefixes and not any(path.stem.startswith(p) for p in prefixes):
            continue
        family = path.stem[:-2]  # strip '_a', '_b', etc.
        if family in SURFACES:
            report.append(build_surface(path, SURFACES[family], index))
        else:
            continue
        print(json.dumps(report[-1]), flush=True)
    total = sum(entry['bytes'] for entry in report)
    print(f'[world-story floor surfaces] {len(report)} maps, {total / 1_048_576:.1f} MiB')


if __name__ == '__main__':
    main()
