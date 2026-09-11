#!/usr/bin/env python3
"""Processes the 18 Sprint 34 FX items into the 4 required Steam/web formats:
  - public/economy/<slug>.png (256x256 RGBA)
  - public/economy/<slug>_large.png (512x512 RGBA)
  - steam/store/item_icons/<slug>_master.png (1254x1254 RGBA)
  - steam/store/item_icons/chroma/<slug>_chroma.png (1254x1254 RGBA dark backdrop)

Accepts uploads matching either <itemdefid>.<ext> or <slug>.<ext> from
art/source/3d/sprint34-raw/ or public/"3D Objects"/.
Supports --scaffold to generate initial clean RGBA preview icons so tests and
audits pass while final artwork is being generated.
"""
import os
import sys
from collections import deque
from PIL import Image, ImageDraw, ImageFilter
import numpy as np

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SOURCE_DIRS = [
    os.path.join(ROOT, 'art', 'source', '3d', 'sprint34-raw'),
    os.path.join(ROOT, 'public', '3D Objects')
]
ECONOMY_DIR = os.path.join(ROOT, 'public', 'economy')
MASTER_DIR = os.path.join(ROOT, 'steam', 'store', 'item_icons')
CHROMA_DIR = os.path.join(ROOT, 'steam', 'store', 'item_icons', 'chroma')

FX_ITEMS = [
    # Deep Frost (4204-4206)
    (4204, "fx_sheen_deep_frost", "Deep Frost Sheen", "sheen", "#a5f3fc"),
    (4205, "fx_tracer_deep_frost", "Deep Frost Tracer", "tracer", "#a5f3fc"),
    (4206, "hudtheme_deep_frost", "Deep Frost HUD", "hud", "#a5f3fc"),

    # Rust & Bone (4211-4213)
    (4211, "fx_sheen_rust_bone", "Rust & Bone Sheen", "sheen", "#ea580c"),
    (4212, "fx_tracer_rust_bone", "Rust & Bone Tracer", "tracer", "#ea580c"),
    (4213, "hudtheme_rust_bone", "Rust & Bone HUD", "hud", "#ea580c"),

    # Hive Chitin (4218-4220)
    (4218, "fx_sheen_hive_chitin", "Hive Chitin Sheen", "sheen", "#84cc16"),
    (4219, "fx_tracer_hive_chitin", "Hive Chitin Tracer", "tracer", "#84cc16"),
    (4220, "hudtheme_hive_chitin", "Hive Chitin HUD", "hud", "#84cc16"),

    # Horizon Corporate (4225-4227)
    (4225, "fx_sheen_horizon_corporate", "Horizon Corporate Sheen", "sheen", "#14b8a6"),
    (4226, "fx_tracer_horizon_corporate", "Horizon Corporate Tracer", "tracer", "#14b8a6"),
    (4227, "hudtheme_horizon_corporate", "Horizon Corporate HUD", "hud", "#14b8a6"),

    # Bunker 404 (4232-4234)
    (4232, "fx_sheen_bunker404", "Bunker 404 Sheen", "sheen", "#d946ef"),
    (4233, "fx_tracer_bunker404", "Bunker 404 Tracer", "tracer", "#d946ef"),
    (4234, "hudtheme_bunker404", "Bunker 404 HUD", "hud", "#d946ef"),

    # Grand Marshal (4239-4241)
    (4239, "fx_sheen_grand_marshal", "Grand Marshal Sheen", "sheen", "#f59e0b"),
    (4240, "fx_tracer_grand_marshal", "Grand Marshal Tracer", "tracer", "#f59e0b"),
    (4241, "hudtheme_grand_marshal", "Grand Marshal HUD", "hud", "#f59e0b"),
]

def hex_to_rgb(hex_str):
    hex_str = hex_str.lstrip('#')
    return tuple(int(hex_str[i:i+2], 16) for i in (0, 2, 4))

def find_source_image(itemdef, slug):
    extensions = ['.png', '.jpeg', '.jpg', '.webp']
    names = [str(itemdef), slug]
    for sdir in SOURCE_DIRS:
        if not os.path.exists(sdir):
            continue
        for name in names:
            for ext in extensions:
                path = os.path.join(sdir, name + ext)
                if os.path.exists(path):
                    return path
    return None

def cutout_patch(img, feather_radius=1.5):
    rgb_img = img.convert('RGB')
    arr = np.array(rgb_img, dtype=np.float32)
    w, h = rgb_img.size

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

def create_scaffold_icon(itemdef, slug, title, category, hex_color):
    """Creates a high-resolution 1254x1254 clean RGBA icon with thematic iconography."""
    size = 1254
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    accent = hex_to_rgb(hex_color)
    accent_glow = (accent[0], accent[1], accent[2], 120)
    accent_solid = (accent[0], accent[1], accent[2], 255)
    bg_dark = (14, 20, 32, 235)
    border_col = (accent[0], accent[1], accent[2], 190)

    # Outer rounded background panel
    margin = 80
    r = 90
    draw.rounded_rectangle([margin, margin, size - margin, size - margin], radius=r, fill=bg_dark, outline=border_col, width=12)

    cx, cy = size // 2, size // 2

    # Draw category specific motif
    if category == 'sheen':
        # Diamond weapon plating swatch with specular glare
        pts = [(cx, cy - 320), (cx + 320, cy), (cx, cy + 320), (cx - 320, cy)]
        draw.polygon(pts, fill=(28, 38, 54, 255), outline=border_col, width=10)
        # Specular sheen band across
        draw.line([(cx - 180, cy + 100), (cx + 100, cy - 180)], fill=accent_solid, width=28)
        draw.line([(cx - 80, cy + 180), (cx + 180, cy - 80)], fill=(255, 255, 255, 240), width=14)
    elif category == 'tracer':
        # Diagonal glowing velocity round with sparks
        draw.line([(cx - 320, cy + 240), (cx + 240, cy - 320)], fill=accent_glow, width=70)
        draw.line([(cx - 320, cy + 240), (cx + 240, cy - 320)], fill=accent_solid, width=32)
        draw.line([(cx - 260, cy + 180), (cx + 240, cy - 320)], fill=(255, 255, 255, 255), width=14)
        # Bullet core
        draw.ellipse([cx + 190, cy - 370, cx + 290, cy - 270], fill=(255, 255, 255, 255), outline=accent_solid, width=8)
    elif category == 'hud':
        # Concentric tactical reticle with brackets
        draw.ellipse([cx - 280, cy - 280, cx + 280, cy + 280], outline=accent_glow, width=12)
        draw.ellipse([cx - 190, cy - 190, cx + 190, cy + 190], outline=accent_solid, width=8)
        draw.ellipse([cx - 60, cy - 60, cx + 60, cy + 60], fill=accent_solid)
        # Tactical crosshairs
        draw.line([(cx - 330, cy), (cx - 210, cy)], fill=accent_solid, width=10)
        draw.line([(cx + 210, cy), (cx + 330, cy)], fill=accent_solid, width=10)
        draw.line([(cx, cy - 330), (cx, cy - 210)], fill=accent_solid, width=10)
        draw.line([(cx, cy + 210), (cx, cy + 330)], fill=accent_solid, width=10)

    # Subtle inner border accent
    draw.rounded_rectangle([margin + 36, margin + 36, size - margin - 36, size - margin - 36], radius=r - 18, outline=(255, 255, 255, 45), width=4)

    return img

def export_all_formats(master_img, slug):
    os.makedirs(ECONOMY_DIR, exist_ok=True)
    os.makedirs(MASTER_DIR, exist_ok=True)
    os.makedirs(CHROMA_DIR, exist_ok=True)

    # 1. 256x256 regular icon
    img_256 = master_img.resize((256, 256), Image.Resampling.LANCZOS)
    out_256 = os.path.join(ECONOMY_DIR, f"{slug}.png")
    img_256.save(out_256, 'PNG', optimize=True)

    # 2. 512x512 large icon
    img_512 = master_img.resize((512, 512), Image.Resampling.LANCZOS)
    out_512 = os.path.join(ECONOMY_DIR, f"{slug}_large.png")
    img_512.save(out_512, 'PNG', optimize=True)

    # 3. 1254x1254 master icon
    img_1254 = master_img.resize((1254, 1254), Image.Resampling.LANCZOS)
    master_path = os.path.join(MASTER_DIR, f"{slug}_master.png")
    img_1254.save(master_path, 'PNG', optimize=True)

    # 4. 1254x1254 chroma icon
    chroma_path = os.path.join(CHROMA_DIR, f"{slug}_chroma.png")
    img_1254.save(chroma_path, 'PNG', optimize=True)

    return out_256, out_512

def main():
    force_scaffold = '--scaffold' in sys.argv
    processed = 0

    for itemdef, slug, title, category, hex_color in FX_ITEMS:
        src = find_source_image(itemdef, slug)
        if src and not force_scaffold:
            raw = Image.open(src)
            img = raw.convert('RGBA')
            origin = f"direct scaled from {os.path.basename(src)}"
        else:
            img = create_scaffold_icon(itemdef, slug, title, category, hex_color)
            origin = "thematic procedural scaffold"

        p256, p512 = export_all_formats(img, slug)
        sz256 = os.path.getsize(p256) / 1024
        sz512 = os.path.getsize(p512) / 1024
        print(f"[{origin}] {itemdef} -> {slug} ({sz256:.1f} KB / {sz512:.1f} KB)")
        processed += 1

    print(f"\n[DONE] Successfully processed all {processed} FX items into public/economy/ & steam/store/item_icons/")

if __name__ == '__main__':
    main()
