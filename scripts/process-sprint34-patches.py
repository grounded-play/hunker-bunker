#!/usr/bin/env python3
"""Processes the 6 Sprint 34 patch JPEGs into clean transparent RGBA PNGs
(both 256x256 and 512x512) in public/economy/.
"""
import os
from collections import deque
from PIL import Image, ImageFilter
import numpy as np

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SOURCE_DIR = os.path.join(ROOT, 'art', 'source', '3d', 'sprint34-raw')
ECONOMY_DIR = os.path.join(ROOT, 'public', 'economy')

PATCHES = [
    (4203, "patch_deep_frost"),
    (4210, "patch_rust_bone"),
    (4217, "patch_hive_chitin"),
    (4224, "patch_horizon_corporate"),
    (4231, "patch_bunker404"),
    (4238, "patch_grand_marshal")
]

def cutout_patch(img, feather_radius=1.5):
    rgb_img = img.convert('RGB')
    arr = np.array(rgb_img, dtype=np.float32)
    w, h = rgb_img.size

    # Sample corners to determine the background color
    corners = np.concatenate([
        arr[:30, :30].reshape(-1, 3),
        arr[:30, -30:].reshape(-1, 3),
        arr[-30:, :30].reshape(-1, 3),
        arr[-30:, -30:].reshape(-1, 3)
    ])
    bg_color = np.mean(corners, axis=0)
    dist = np.linalg.norm(arr - bg_color, axis=2)
    corner_max = np.max([dist[:30, :30], dist[:30, -30:], dist[-30:, :30], dist[-30:, -30:]])
    thresh = max(float(corner_max) + 6.0, 24.0)

    # Flood fill from all 4 borders
    visited = bytearray(w * h)
    queue = deque()
    for x in range(w):
        for y in (0, h - 1):
            if dist[y, x] <= thresh:
                visited[y * w + x] = 1
                queue.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            if dist[y, x] <= thresh:
                visited[y * w + x] = 1
                queue.append((x, y))

    while queue:
        cx, cy = queue.popleft()
        for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            nx, ny = cx + dx, cy + dy
            if 0 <= nx < w and 0 <= ny < h:
                idx = ny * w + nx
                if not visited[idx] and dist[ny, nx] <= thresh:
                    visited[idx] = 1
                    queue.append((nx, ny))

    alpha_bytes = bytes(0 if v else 255 for v in visited)
    alpha_mask = Image.frombytes('L', (w, h), alpha_bytes)
    alpha_mask = alpha_mask.filter(ImageFilter.GaussianBlur(feather_radius))

    r, g, b = rgb_img.split()
    return Image.merge('RGBA', (r, g, b, alpha_mask))

def main():
    os.makedirs(ECONOMY_DIR, exist_ok=True)
    count = 0
    for itemdef, slug in PATCHES:
        src_path = os.path.join(SOURCE_DIR, f"{itemdef}.jpeg")
        if not os.path.exists(src_path):
            print(f"[WARN] Missing {src_path}")
            continue

        raw = Image.open(src_path)
        cutout = cutout_patch(raw)

        # 1. 256x256 regular icon
        img_256 = cutout.resize((256, 256), Image.Resampling.LANCZOS)
        out_256 = os.path.join(ECONOMY_DIR, f"{slug}.png")
        img_256.save(out_256, 'PNG', optimize=True)

        # 2. 512x512 large icon
        img_512 = cutout.resize((512, 512), Image.Resampling.LANCZOS)
        out_512 = os.path.join(ECONOMY_DIR, f"{slug}_large.png")
        img_512.save(out_512, 'PNG', optimize=True)

        # 3. 1254x1254 master icon
        master_dir = os.path.join(ROOT, "steam/store/item_icons")
        chroma_dir = os.path.join(ROOT, "steam/store/item_icons/chroma")
        os.makedirs(master_dir, exist_ok=True)
        os.makedirs(chroma_dir, exist_ok=True)

        img_1254 = cutout.resize((1254, 1254), Image.Resampling.LANCZOS)
        master_path = os.path.join(master_dir, f"{slug}_master.png")
        img_1254.save(master_path, "PNG", optimize=True)

        # 4. 1254x1254 chroma icon (dark backdrop)
        chroma_bg = Image.new("RGBA", (1254, 1254), (10, 15, 26, 255))
        chroma_img = Image.alpha_composite(chroma_bg, img_1254)
        chroma_path = os.path.join(chroma_dir, f"{slug}_chroma.png")
        chroma_img.save(chroma_path, "PNG", optimize=True)

        size_256_kb = os.path.getsize(out_256) / 1024
        size_512_kb = os.path.getsize(out_512) / 1024
        print(f"Processed {itemdef}.jpeg -> {slug}.png ({size_256_kb:.1f} KB), large, master, chroma")
        count += 1

    print(f"\n[DONE] Successfully processed {count} patches into {ECONOMY_DIR}")

if __name__ == '__main__':
    main()
