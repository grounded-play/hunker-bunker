#!/usr/bin/env python3
"""Build runtime PBR maps from the generated Sprint 53 wall masters."""

from pathlib import Path

import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parent.parent
SOURCE_DIR = ROOT / "art/raw/textures/sprint53"
OUT_DIR = ROOT / "public/3d/runtime/kits/textures"
SIZE = 1024
EDGE_BLEND = 96


def smoothstep(value):
    return value * value * (3.0 - 2.0 * value)


def blend_opposite_edges(arr, margin=EDGE_BLEND):
    """Feather opposite edges to the same pixels so the result tiles cleanly."""
    result = arr.copy()
    for axis in (1, 0):
        length = result.shape[axis]
        for offset in range(margin):
            low_index = offset
            high_index = length - 1 - offset
            low = np.take(result, low_index, axis=axis).copy()
            high = np.take(result, high_index, axis=axis).copy()
            shared = (low + high) * 0.5
            keep = smoothstep(offset / max(1, margin - 1))
            low_blend = shared * (1.0 - keep) + low * keep
            high_blend = shared * (1.0 - keep) + high * keep

            low_slice = [slice(None)] * result.ndim
            high_slice = [slice(None)] * result.ndim
            low_slice[axis] = low_index
            high_slice[axis] = high_index
            result[tuple(low_slice)] = low_blend
            result[tuple(high_slice)] = high_blend
    return result


def normal_from_height(height, strength):
    padded = np.pad(height, 1, mode="wrap")
    dx = (
        -padded[:-2, :-2] + padded[:-2, 2:]
        - 2.0 * padded[1:-1, :-2] + 2.0 * padded[1:-1, 2:]
        - padded[2:, :-2] + padded[2:, 2:]
    )
    dy = (
        -padded[:-2, :-2] - 2.0 * padded[:-2, 1:-1] - padded[:-2, 2:]
        + padded[2:, :-2] + 2.0 * padded[2:, 1:-1] + padded[2:, 2:]
    )
    nx = -dx * strength
    ny = -dy * strength
    nz = np.ones_like(nx)
    magnitude = np.sqrt(nx * nx + ny * ny + nz * nz)
    return np.stack((nx / magnitude, ny / magnitude, nz / magnitude), axis=-1) * 0.5 + 0.5


def save_webp(name, pixels, *, grayscale=False):
    data = np.clip(pixels * 255.0, 0, 255).astype(np.uint8)
    mode = "L" if grayscale else "RGB"
    Image.fromarray(data, mode=mode).save(
        OUT_DIR / name,
        format="WEBP",
        lossless=True,
        method=6,
    )


def edge_error(pixels):
    horizontal = np.abs(pixels[:, 0] - pixels[:, -1]).mean()
    vertical = np.abs(pixels[0] - pixels[-1]).mean()
    return max(float(horizontal), float(vertical))


def runtime_edge_error(prefix):
    errors = []
    for suffix in ("color", "normal", "rough", "emissive"):
        image = Image.open(OUT_DIR / f"{prefix}_wall_{suffix}.webp").convert("RGB")
        pixels = np.asarray(image, dtype=np.float32) / 255.0
        errors.append(edge_error(pixels))
    return max(errors)


def load_master(filename):
    source = SOURCE_DIR / filename
    if not source.exists():
        raise FileNotFoundError(f"Missing generated source texture: {source}")
    image = Image.open(source).convert("RGB").resize((SIZE, SIZE), Image.Resampling.LANCZOS)
    pixels = np.asarray(image, dtype=np.float32) / 255.0
    return blend_opposite_edges(pixels)


def build_geothermal():
    color = load_master("geothermal_wall_color_source.png")
    red, green, blue = np.moveaxis(color, -1, 0)
    luminance = red * 0.299 + green * 0.587 + blue * 0.114
    orange = np.clip((red - green * 1.18) * 3.2, 0.0, 1.0) * np.clip((green - blue) * 4.0, 0.0, 1.0)
    mineral = np.clip((red + green - blue * 1.35) * 0.55, 0.0, 1.0)

    height = blend_opposite_edges(np.clip(luminance * 0.72 + mineral * 0.18 - orange * 0.12, 0.0, 1.0))
    normal = blend_opposite_edges(normal_from_height(height, 3.4))
    roughness = blend_opposite_edges(np.clip(0.88 - luminance * 0.34 - orange * 0.34, 0.24, 0.92))
    emissive = np.stack((orange, orange * 0.36, orange * 0.035), axis=-1)
    emissive = blend_opposite_edges(emissive)

    save_webp("geothermal_wall_color.webp", color)
    save_webp("geothermal_wall_normal.webp", normal)
    save_webp("geothermal_wall_rough.webp", roughness, grayscale=True)
    save_webp("geothermal_wall_emissive.webp", emissive)
    return runtime_edge_error("geothermal")


def build_hive_resin():
    color = load_master("hive_resin_wall_color_source.png")
    red, green, blue = np.moveaxis(color, -1, 0)
    luminance = red * 0.299 + green * 0.587 + blue * 0.114
    saturation = np.max(color, axis=-1) - np.min(color, axis=-1)
    emerald = np.clip((green - red * 1.08) * 4.5, 0.0, 1.0) * np.clip((green - blue * 0.92) * 3.0, 0.0, 1.0)

    height = blend_opposite_edges(np.clip(luminance * 0.82 + saturation * 0.12 - emerald * 0.08, 0.0, 1.0))
    normal = blend_opposite_edges(normal_from_height(height, 3.8))
    roughness = blend_opposite_edges(np.clip(0.60 - luminance * 0.30 - saturation * 0.18, 0.16, 0.68))
    emissive = np.stack((emerald * 0.08, emerald, emerald * 0.38), axis=-1)
    emissive = blend_opposite_edges(emissive)

    save_webp("hive_resin_wall_color.webp", color)
    save_webp("hive_resin_wall_normal.webp", normal)
    save_webp("hive_resin_wall_rough.webp", roughness, grayscale=True)
    save_webp("hive_resin_wall_emissive.webp", emissive)
    return runtime_edge_error("hive_resin")


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    geothermal_error = build_geothermal()
    hive_error = build_hive_resin()
    print(f"[Sprint 53] generated wall maps ready at {SIZE}px")
    print(f"  geothermal edge error: {geothermal_error:.6f}")
    print(f"  hive resin edge error: {hive_error:.6f}")


if __name__ == "__main__":
    main()
