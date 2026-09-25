#!/usr/bin/env python3
"""Chroma-key HUD housing renders to transparent WebP.

docs/planning/hud-housing-prompts-2026-09-25.md: housings are rendered on flat
#00FF00; biology layers (`*_bio*`) on #FF00FF so the key can't eat bio-green.

    python3 scripts/chroma_key.py public/ui/suit/            # every PNG/JPG below
    python3 scripts/chroma_key.py some_panel.png --key magenta

For each image: the key colour becomes alpha (soft edge over a small tolerance
band), the key colour's spill is removed from the edge pixels, the result is
cropped to the panel silhouette, and written next to the source as .webp.
"""
import argparse
import os
import sys

import numpy as np
from PIL import Image

KEYS = {'green': (0, 255, 0), 'magenta': (255, 0, 255)}


def key_distance(rgb, key):
    """0 at the key colour, growing with distance in a key-aware way."""
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    if key == 'green':
        # How much greener than the other channels the pixel is.
        dominance = g - np.maximum(r, b)
    else:
        # How much more red+blue than green (magenta dominance).
        dominance = np.minimum(r, b) - g
    return dominance


def despill(rgb, key):
    out = rgb.copy()
    r, g, b = out[..., 0], out[..., 1], out[..., 2]
    if key == 'green':
        limit = np.maximum(r, b)
        out[..., 1] = np.minimum(g, limit)
    else:
        limit = g + (np.abs(r - b) / 2)
        out[..., 0] = np.minimum(r, np.maximum(limit, b))
        out[..., 2] = np.minimum(b, np.maximum(limit, r))
    return out


def process(path, key, low=40, high=110, pad=4):
    img = Image.open(path).convert('RGB')
    rgb = np.asarray(img).astype(np.float32)
    dominance = key_distance(rgb, key)
    # dominance >= high -> fully keyed (alpha 0); <= low -> opaque.
    alpha = np.clip((high - dominance) / (high - low), 0.0, 1.0)
    rgb = despill(rgb, key)
    rgba = np.dstack([rgb, alpha * 255.0]).clip(0, 255).astype(np.uint8)
    out = Image.fromarray(rgba, 'RGBA')
    bbox = out.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox()
    if bbox:
        x0, y0, x1, y1 = bbox
        out = out.crop((max(0, x0 - pad), max(0, y0 - pad), min(out.width, x1 + pad), min(out.height, y1 + pad)))
    dst = os.path.splitext(path)[0] + '.webp'
    out.save(dst, 'WEBP', quality=92, method=6)
    keyed = float((alpha < 0.02).mean())
    return dst, out.size, keyed


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('paths', nargs='+')
    ap.add_argument('--key', choices=sorted(KEYS), help='force the key colour (default: magenta for *_bio*, else green)')
    args = ap.parse_args()
    files = []
    for p in args.paths:
        if os.path.isdir(p):
            for root, _, names in os.walk(p):
                files += [os.path.join(root, n) for n in names if n.lower().endswith(('.png', '.jpg', '.jpeg'))]
        else:
            files.append(p)
    if not files:
        print('no images found', file=sys.stderr)
        return 1
    for f in sorted(files):
        key = args.key or ('magenta' if '_bio' in os.path.basename(f) else 'green')
        dst, size, keyed = process(f, key)
        warn = '  <- check: almost nothing keyed' if keyed < 0.05 else ''
        print(f'{f} -> {dst} {size[0]}x{size[1]} key={key} keyed={keyed:.0%}{warn}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
