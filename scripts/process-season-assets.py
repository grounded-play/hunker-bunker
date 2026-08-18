#!/usr/bin/env python3
"""Helper script to process raw generated 1:1 image assets into the 4-file
compliance set required by scripts/audit-steam-inventory-assets.js:
- public/economy/<slug>.png (256x256 RGBA with transparent background)
- public/economy/<slug>_large.png (512x512 RGBA with transparent background)
- steam/store/item_icons/<slug>_master.png (1254x1254 RGBA with transparent background)
- steam/store/item_icons/chroma/<slug>_chroma.png (1254x1254 PNG with dark chroma backdrop)
"""
import os
import sys
from collections import deque
from PIL import Image, ImageFilter

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

def remove_dark_background_pil(img, threshold=40, feather_radius=1.5):
    """Removes dark background by flood-filling from the image borders using pure PIL,
    preserving internal dark elements and producing smooth alpha edges."""
    rgb_img = img.convert("RGB")
    w, h = rgb_img.size
    pixels = rgb_img.load()

    # Create an alpha mask array initialized to 255 (opaque)
    visited = bytearray(w * h)
    queue = deque()

    def get_brightness(x, y):
        r, g, b = pixels[x, y]
        return (r + g + b) // 3

    # Seed from all 4 borders
    for x in range(w):
        for y in (0, h - 1):
            if get_brightness(x, y) < threshold:
                idx = y * w + x
                if not visited[idx]:
                    visited[idx] = 1
                    queue.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            if get_brightness(x, y) < threshold:
                idx = y * w + x
                if not visited[idx]:
                    visited[idx] = 1
                    queue.append((x, y))

    # BFS Flood fill
    while queue:
        cx, cy = queue.popleft()
        for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            nx, ny = cx + dx, cy + dy
            if 0 <= nx < w and 0 <= ny < h:
                nidx = ny * w + nx
                if not visited[nidx]:
                    if get_brightness(nx, ny) < threshold:
                        visited[nidx] = 1
                        queue.append((nx, ny))

    # Build alpha image: visited (background) -> 0, unvisited (foreground) -> 255
    alpha_bytes = bytes(0 if v else 255 for v in visited)
    alpha_mask = Image.frombytes("L", (w, h), alpha_bytes)

    # Feather alpha mask for smooth anti-aliased edges
    alpha_mask = alpha_mask.filter(ImageFilter.GaussianBlur(feather_radius))

    r, g, b = rgb_img.split()
    return Image.merge("RGBA", (r, g, b, alpha_mask))

def process_asset(source_path, slug):
    raw_img = Image.open(source_path)
    
    # Remove dark background to yield clean transparent RGBA
    img = remove_dark_background_pil(raw_img)
    
    # Ensure square
    w, h = img.size
    if w != h:
        dim = max(w, h)
        square_img = Image.new("RGBA", (dim, dim), (0, 0, 0, 0))
        square_img.paste(img, ((dim - w) // 2, (dim - h) // 2))
        img = square_img

    # Target directories
    econ_dir = os.path.join(ROOT, "public/economy")
    master_dir = os.path.join(ROOT, "steam/store/item_icons")
    chroma_dir = os.path.join(ROOT, "steam/store/item_icons/chroma")
    os.makedirs(econ_dir, exist_ok=True)
    os.makedirs(master_dir, exist_ok=True)
    os.makedirs(chroma_dir, exist_ok=True)

    # 1. Local icon 256x256 RGBA
    img_256 = img.resize((256, 256), Image.Resampling.LANCZOS)
    local_path = os.path.join(econ_dir, f"{slug}.png")
    img_256.save(local_path, "PNG")

    # 2. Large icon 512x512 RGBA
    img_512 = img.resize((512, 512), Image.Resampling.LANCZOS)
    large_path = os.path.join(econ_dir, f"{slug}_large.png")
    img_512.save(large_path, "PNG")

    # 3. Master icon 1254x1254 RGBA
    img_1254 = img.resize((1254, 1254), Image.Resampling.LANCZOS)
    master_path = os.path.join(master_dir, f"{slug}_master.png")
    img_1254.save(master_path, "PNG")

    # 4. Chroma icon 1254x1254 PNG (high contrast chroma background)
    chroma_bg = Image.new("RGBA", (1254, 1254), (10, 15, 26, 255))
    chroma_img = Image.alpha_composite(chroma_bg, img_1254)
    chroma_path = os.path.join(chroma_dir, f"{slug}_chroma.png")
    chroma_img.save(chroma_path, "PNG")

    print(f"[processed with transparent alpha] {slug} -> 256px, 512px, 1254px master, 1254px chroma")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python3 process-season-assets.py <source_image_path> <slug>")
        sys.exit(1)
    process_asset(sys.argv[1], sys.argv[2])
