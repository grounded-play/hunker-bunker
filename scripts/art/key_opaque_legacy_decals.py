#!/usr/bin/env python3
"""Replace chroma-backed public decal PNGs with reviewable RGBA versions.

The PBR legacy sticker baker already keys these images while baking KTX2, but
the compatibility PNGs must carry the same alpha so fallback/debug rendering
never exposes the green plate. Existing alpha-authored decals are untouched.
"""

from pathlib import Path

import numpy as np
from PIL import Image

from build_stickers import legacy_matte, settle_edges

ROOT = Path(__file__).resolve().parents[2]


def main() -> None:
    changed = 0
    for path in sorted((ROOT / 'public').glob('decal_*.png')):
        image = Image.open(path).convert('RGBA')
        rgba = np.asarray(image, dtype=np.float32) / 255.0
        if rgba[..., 3].min() < 0.999:
            continue
        rgb, alpha = legacy_matte(rgba[..., :3], rgba[..., 3])
        if alpha.min() >= 0.999:
            raise SystemExit(f'{path.name}: opaque decal has no recognized removable background')
        rgb = settle_edges(rgb, alpha)
        rgb[alpha < 0.005] = 0
        keyed = np.dstack((rgb, alpha))
        Image.fromarray((np.clip(keyed, 0, 1) * 255).astype(np.uint8), 'RGBA').save(path, 'PNG', optimize=True)
        changed += 1
        print(f'[decal-alpha] keyed {path.name}')
    print(f'[decal-alpha] complete changed={changed}')


if __name__ == '__main__':
    main()
