"""Compose the game's additive sky paintings into an opaque film panorama.

The runtime deliberately ignores alpha for nebula layers. Blender premultiplies
those keyed PNGs before a World Environment Texture sees them, producing black
voids in a panorama. This deterministic transfer reads RGB directly, performs
the same additive stack, and writes one opaque 2:1 source image for Blender.

Run:
    python3 scripts/blender/compose_game_space_panorama.py
"""
from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageChops, ImageEnhance, ImageFilter


ROOT = Path(__file__).resolve().parent.parent.parent
LAYERS = (
    ("public/sky/nebula_band_core.png", 0.0, 0.72),
    ("public/sky/nebula_band_core.png", 0.5, 0.45),
    ("public/sky/nebula_veil_violet.png", 38.0 / 360.0, 0.42),
    ("public/sky/nebula_veil_ember.png", -57.0 / 360.0, 0.24),
)
CELESTIALS = (
    # path, centre x/y in normalized panorama space, angular-size proxy
    ("public/sky/body_planet_dead_ocean.png", 0.78, 0.32, 0.16),
    ("public/sky/body_moon_shattered.png", 0.18, 0.62, 0.085),
)


# The source paintings concentrate their nebula in a horizontal band, so the
# top and bottom of a 2:1 wrap fall back to the flat base colour. Measured on
# the first bake: polar rows sat at 0.11 against 1.79 at the galactic core -- a
# 16x step that renders as a hard-edged dark disc at the zenith, which looked
# like a projection artifact and is really just an empty sky cap.
POLAR_BAND_FRACTION = 0.34
POLAR_MIRROR_GAIN = 1.15


def fill_polar_caps(panorama: Image.Image) -> Image.Image:
    """
    Carry band content into the polar caps so the sky has no flat plate.

    Blends a heavily blurred copy of the panorama into the caps, weighted from
    zero at the edge of the band to full at the pole, so the cap resolves to the
    sky's own local average colour rather than a flat plate.

    A vertical mirror was tried first and does not work: flipping top-to-bottom
    maps pole to pole, so each cap samples the other cap and stays exactly as
    dark. Blur is what actually carries band colour upward.

    Deliberately not stretching the band's own last row upward either: that
    produces vertical streaking at the pole, the other classic equirect tell.
    """
    width, height = panorama.size
    # Radius a good fraction of the height, so the blur reaches well past the
    # band edge and the cap inherits real sky colour rather than its own dark.
    blurred = panorama.filter(ImageFilter.GaussianBlur(radius=height * 0.16))
    blurred = ImageEnhance.Brightness(blurred).enhance(POLAR_MIRROR_GAIN)

    # One L-mask: white at both poles, black across the middle band.
    mask = Image.new("L", (1, height), 0)
    band = max(1, int(height * POLAR_BAND_FRACTION))
    for y in range(band):
        # Smoothstep so the blend has no visible seam where it begins.
        t = 1.0 - (y / band)
        weight = int(255 * (t * t * (3 - 2 * t)))
        mask.putpixel((0, y), weight)
        mask.putpixel((0, height - 1 - y), weight)
    mask = mask.resize((width, height))

    return Image.composite(blurred, panorama, mask)


def compose(output: Path) -> None:
    size = (2048, 1024)
    result = Image.new("RGB", size, (2, 5, 15))
    for relative_path, horizontal_turn, gain in LAYERS:
        # RGB conversion intentionally discards alpha without premultiplying,
        # matching the game's additive/ignoreAlpha material contract.
        layer = Image.open(ROOT / relative_path).convert("RGB").resize(size, Image.Resampling.LANCZOS)
        layer = ImageChops.offset(layer, round(size[0] * horizontal_turn), 0)
        layer = ImageEnhance.Brightness(layer).enhance(gain)
        result = ImageChops.add(result, layer, scale=1.0, offset=0)
    # Celestial bodies remain alpha-composited solids, exactly as in the game.
    # Their placement is sparse and asymmetric: each acts as a landmark while
    # leaving most of the orbital frame available for uncomfortable emptiness.
    result_rgba = result.convert("RGBA")
    for relative_path, center_x, center_y, size_fraction in CELESTIALS:
        body = Image.open(ROOT / relative_path).convert("RGBA")
        diameter = round(size[1] * size_fraction)
        body.thumbnail((diameter, diameter), Image.Resampling.LANCZOS)
        left = round(size[0] * center_x - body.width / 2)
        top = round(size[1] * center_y - body.height / 2)
        result_rgba.alpha_composite(body, (left, top))
    result = result_rgba.convert("RGB")

    result = fill_polar_caps(result)
    output.parent.mkdir(parents=True, exist_ok=True)
    result.save(output, format="JPEG", quality=94, subsampling=0, optimize=True)
    print(f"[compose_game_space_panorama] wrote {output} ({size[0]}x{size[1]})")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--out", type=Path,
        default=ROOT / "public/sky/cinematic_deep_space_panorama.jpg",
    )
    args = parser.parse_args()
    compose(args.out.resolve())


if __name__ == "__main__":
    main()
