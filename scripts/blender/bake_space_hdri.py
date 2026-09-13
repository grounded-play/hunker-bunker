"""
Bake the procedural deep-space environment to a real equirectangular HDR.

Run:
    blender -b --python scripts/blender/bake_space_hdri.py -- --size 4096

The game-sky transfer is already a 2:1 equirectangular panorama. Promote its
linear pixels directly to float EXR rather than rendering it through a panoramic
camera: Blender 5.2's panorama bake introduces projection singularities, while
direct promotion is lossless, deterministic and substantially faster.
"""
import argparse
import sys
from pathlib import Path

import bpy
import numpy as np


def base_dir() -> Path:
    return Path(__file__).resolve().parent.parent.parent


def main() -> None:
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    parser = argparse.ArgumentParser(description="Bake the space environment to an equirect HDR.")
    parser.add_argument("--size", type=int, default=4096, help="Output width; height is half.")
    parser.add_argument("--samples", type=int, default=64, help="Retained for CLI compatibility; direct promotion does not sample.")
    parser.add_argument("--out", default="art/source/hdri/game_deep_space_4k.exr")
    parser.add_argument("--source", default="public/sky/cinematic_deep_space_panorama.jpg")
    parser.add_argument("--gain", type=float, default=1.8)
    args = parser.parse_args(argv)

    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    source_path = base_dir() / args.source
    if not source_path.is_file():
        raise FileNotFoundError(
            f"Missing {source_path}; run scripts/blender/compose_game_space_panorama.py first"
        )
    source = bpy.data.images.load(str(source_path), check_existing=False)
    source.scale(args.size, args.size // 2)
    pixels = np.empty(len(source.pixels), dtype=np.float32)
    source.pixels.foreach_get(pixels)
    rgba = pixels.reshape((-1, 4))
    rgba[:, :3] *= max(0.0, args.gain)
    rgba[:, 3] = 1.0

    hdr = bpy.data.images.new(
        "GameDeepSpaceHDR", width=args.size, height=args.size // 2,
        alpha=True, float_buffer=True,
    )
    hdr.pixels.foreach_set(pixels)
    scene.render.image_settings.file_format = "OPEN_EXR"
    scene.render.image_settings.color_depth = "32"
    scene.view_settings.view_transform = "Standard"

    out_path = base_dir() / args.out
    out_path.parent.mkdir(parents=True, exist_ok=True)
    hdr.save_render(str(out_path), scene=scene)
    print(f"[bake_space_hdri] wrote {out_path} ({args.size}x{args.size // 2}, gain {args.gain:g})")


if __name__ == "__main__":
    main()
