#!/usr/bin/env python3
"""Build the lived-in pass 2 floor surfaces (T1-T12) from the owner's renders.

docs/planning/lived-in-world-pass-2-2026-10-09.md, Part 4. Every surface came
in four versions (stained concrete in eight); all of them ship, so rooms and
chunks can each pick one.

For each floor surface version (T1-T10) this writes:
  art/source/textures/lived-in-pass-2/pbr/<name>_{albedo,normal,roughness,
      height,ao,metallic}.png   full PBR set, git-ignored, for review/rebakes
  public/3d/runtime/surfaces/<name>_albedo.ktx2   RGB colour (sRGB), A metalness
  public/3d/runtime/surfaces/<name>_detail.ktx2   R/G normal x/y, B roughness,
      A height (linear)

The two greyscale utility maps (T11 macro grime, T12 blend breakup) ship as
lossless WebP. T13, the wall kick-plate band, is a wall strip and is built
with the stickers (scripts/art/build_stickers.py).

Derivation (the renders are colour only):
  1. Low-frequency lighting is divided out, so a tile doesn't repeat a bright
     corner every 4 m.
  2. Seams: the image is blended with its half-offset copy through a ragged,
     height-led mask, so the borders come from the copy (which wraps) and
     the middle from the original. Each result is checked by edge error.
  3. Height is a luminance high-pass; normal is its Sobel gradient; AO is
     the cavity term; roughness and metalness come from per-surface ranges.

Runtime files are standard KTX2: BC7 blocks (stays compressed on the GPU;
44 versions x 2 maps would be ~470 MB uncompressed) with zstd
supercompression, mips down to 4 px. three's KTX2Loader reads them;
src/floorSplat.js stacks them into texture arrays. The normal's tangent u is
+world x and v is +world z; rows are stored top-down and sampled at
uv = world xz / scale with no flip.

Needs numpy, scipy, pillow, etcpak and zstandard:
  python3 -m venv /tmp/hbtex && /tmp/hbtex/bin/pip install numpy scipy pillow etcpak zstandard
  /tmp/hbtex/bin/python scripts/art/build_floor_surfaces.py [name-prefix ...]
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
SOURCE_DIR = ROOT / 'art/source/textures/lived-in-pass-2'
PBR_DIR = SOURCE_DIR / 'pbr'
RUNTIME_DIR = ROOT / 'public/3d/runtime/surfaces'
SIZE = 1024
MIN_LEVEL = 4

# Per surface: normal strength, roughness range (bright -> dark), metalness,
# and how much of the baked lighting to divide out.
SURFACES = {
    'tex_floor_deck_drain': dict(normal=5.0, rough=(0.38, 0.72), metal=0.62, delight=0.75),
    'tex_floor_concrete_stained': dict(normal=3.2, rough=(0.74, 0.95), metal=0.0, delight=0.6),
    'tex_floor_chitin_resin': dict(normal=4.5, rough=(0.22, 0.55), metal=0.04, delight=0.55),
    'tex_ground_regolith': dict(normal=4.0, rough=(0.86, 1.0), metal=0.0, delight=0.7),
    'tex_ground_rutted_dirt': dict(normal=4.2, rough=(0.8, 0.98), metal=0.0, delight=0.7),
    'tex_floor_slush_ice': dict(normal=3.0, rough=(0.12, 0.42), metal=0.0, delight=0.5),
    'tex_floor_bone_terrazzo': dict(normal=3.4, rough=(0.3, 0.62), metal=0.18, delight=0.6),
    'tex_floor_latex_mat': dict(normal=4.6, rough=(0.5, 0.78), metal=0.0, delight=0.65),
    'tex_floor_camp_planks': dict(normal=4.4, rough=(0.7, 0.95), metal=0.0, delight=0.65),
    'tex_floor_grate_trench': dict(normal=5.5, rough=(0.36, 0.74), metal=0.55, delight=0.7),
}
UTILITY = ('tex_macro_grime', 'tex_blend_breakup')


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
    """Mean step across the wrap, relative to the mean step between neighbours."""
    across = (np.abs(values[:, 0] - values[:, -1]).mean() + np.abs(values[0] - values[-1]).mean()) / 2
    inside = (np.abs(np.diff(values, axis=1)).mean() + np.abs(np.diff(values, axis=0)).mean()) / 2
    return float(across / max(inside, 1e-6))


def make_tileable(rgb, seed):
    """Borders from the half-offset copy, middle from the original."""
    half = SIZE // 2
    shifted = np.roll(rgb, (half, half), axis=(0, 1))
    coords = np.arange(SIZE, dtype=np.float32)
    border = np.minimum(coords, SIZE - 1 - coords) / half  # 0 at the edge, 1 in the middle
    window = np.minimum(border[:, None], border[None, :])
    rng = np.random.default_rng(seed)
    ragged = blur(rng.random((SIZE, SIZE)).astype(np.float32), 18)
    ragged = (ragged - ragged.mean()) / (ragged.std() + 1e-6)
    # Lead the cut along height so it follows cracks and plate edges.
    lead = luminance(rgb) - luminance(shifted)
    # The ragged lead fades out toward the border, which must be all copy.
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
    # Crevices hold grit: rougher than the faces around them.
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
            # Renormalise x/y so the reconstructed z stays unit length.
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
    """A 2D BC7 KTX2 with zstd supercompression (KTX 2.0 spec, section 3).
    `size` is the side of a square image or a (width, height) pair."""
    width, height = size if isinstance(size, tuple) else (size, size)
    compressor = zstandard.ZstdCompressor(level=19)
    packed = [compressor.compress(level) for level in levels]
    # Data Format Descriptor: one basic block, BC7 colour model, one sample.
    dfd_block = struct.pack(
        '<IHHBBBB4B8B',
        0, 2, 24 + 16,                       # vendor/type, version 2, block size
        136, 1, 2 if srgb else 1, 0,         # KHR_DF_MODEL_BC7, BT709, sRGB/linear, straight alpha
        3, 3, 0, 0,                          # 4x4 texel blocks
        16, 0, 0, 0, 0, 0, 0, 0,             # 16 bytes per block
    ) + struct.pack('<HBB4BII', 0, 127, 0, 0, 0, 0, 0, 0, 0xFFFFFFFF)
    dfd = struct.pack('<I', 4 + len(dfd_block)) + dfd_block
    header_bytes = 12 + 9 * 4 + 4 * 4 + 2 * 8 + len(levels) * 24
    dfd_offset = header_bytes
    data_offset = dfd_offset + len(dfd)
    # Level data runs smallest mip first, as the spec orders it.
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

    # The renders already carry their own shading, so AO only deepens the
    # cavities a little in the runtime colour.
    albedo = np.concatenate((rgb * (0.82 + 0.18 * ao[..., None]), metalness[..., None]), -1)
    detail = np.concatenate((normal[..., :2] * 0.5 + 0.5, roughness[..., None], height[..., None]), -1)
    RUNTIME_DIR.mkdir(parents=True, exist_ok=True)
    write_ktx2(RUNTIME_DIR / f'{name}_albedo.ktx2', bc7_levels(albedo, False), SIZE, srgb=True)
    write_ktx2(RUNTIME_DIR / f'{name}_detail.ktx2', bc7_levels(detail, True), SIZE, srgb=False)
    return {'name': name, 'edgeBefore': round(before, 2), 'edgeAfter': round(after, 2),
            'bytes': sum((RUNTIME_DIR / f'{name}_{m}.ktx2').stat().st_size for m in ('albedo', 'detail'))}


def build_utility(path):
    grey = luminance(load_source(path))
    grey = make_tileable(np.repeat(grey[..., None], 3, -1), 7)[..., 0]
    out = RUNTIME_DIR / f'{path.stem}.webp'
    RUNTIME_DIR.mkdir(parents=True, exist_ok=True)
    Image.fromarray(to_u8(normalize01(grey, 0.5, 99.5))).save(out, format='WEBP', lossless=True, method=6)
    return {'name': path.stem, 'edgeAfter': round(edge_error(grey), 2), 'bytes': out.stat().st_size}


def main():
    prefixes = sys.argv[1:]
    report = []
    for index, path in enumerate(sorted(SOURCE_DIR.glob('*.jpg'))):
        if prefixes and not any(path.stem.startswith(p) for p in prefixes):
            continue
        family = path.stem[:-2]
        if family in SURFACES:
            report.append(build_surface(path, SURFACES[family], index))
        elif family in UTILITY:
            report.append(build_utility(path))
        else:
            continue
        print(json.dumps(report[-1]), flush=True)
    total = sum(entry['bytes'] for entry in report)
    print(f'[floor surfaces] {len(report)} maps, {total / 1_048_576:.1f} MiB')


if __name__ == '__main__':
    main()
