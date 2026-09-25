#!/usr/bin/env python3
"""Verify transparent WebP edges against dark and light backgrounds."""

import os
import sys
import numpy as np
from PIL import Image

BASE = "public/ui/suit"
OUT = "public/ui/suit/edge_check"
os.makedirs(OUT, exist_ok=True)

DARK_BG = (14, 18, 22, 255)      # In-game dark background
LIGHT_BG = (240, 242, 245, 255)  # Light test background

classes = ['scout', 'tank', 'engineer']
panels = ['map', 'health', 'gun']

passed = 0
failed = 0

for c in classes:
    for p in panels:
        webp_path = os.path.join(BASE, c, f"{p}.webp")
        if not os.path.exists(webp_path):
            print(f"Missing {webp_path}")
            failed += 1
            continue

        im = Image.open(webp_path).convert("RGBA")
        w, h = im.size

        # Check for green fringing in semi-transparent / transparent edge pixels
        arr = np.asarray(im)
        r, g, b, a = arr[..., 0], arr[..., 1], arr[..., 2], arr[..., 3]
        # Any pixel where green heavily dominates (spill) and alpha > 0
        green_fringe = (a > 10) & (g > r + 30) & (g > b + 30)
        fringe_count = int(green_fringe.sum())

        # Composite on dark
        dark = Image.new("RGBA", (w, h), DARK_BG)
        dark.alpha_composite(im)
        dark.save(os.path.join(OUT, f"{c}_{p}_on_dark.png"))

        # Composite on light
        light = Image.new("RGBA", (w, h), LIGHT_BG)
        light.alpha_composite(im)
        light.save(os.path.join(OUT, f"{c}_{p}_on_light.png"))

        if fringe_count > 5:
            print(f"FAIL: {webp_path} has {fringe_count} green fringe pixels")
            failed += 1
        else:
            print(f"PASS: {webp_path} ({w}x{h}) - clean edges (fringe pixels: {fringe_count})")
            passed += 1

print(f"\nVerification summary: {passed} passed, {failed} failed.")
if failed > 0:
    sys.exit(1)
