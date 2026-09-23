#!/usr/bin/env python3
"""
Generate public/menu_frame_overlay.webp from public/menu_bg_v3.webp.

Punches transparent cutouts for:
- Left Bay (Career Telemetry & Command Modules)
- Center Bay (Operative ID, 3D Hero Preview, SOUL Stats)
- Right Bay (Class Selection Cards)
- Advance Slot Bay (ENTER ARMORY Button Slot)

Preserves the outer biomechanical frame, top arch, bottom sphere,
central dividing pillars, and advance cradle brackets.
"""

from PIL import Image, ImageDraw
import os

def generate():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)
    bg_path = os.path.join(project_root, 'public', 'menu_bg_v3.webp')
    out_path = os.path.join(project_root, 'public', 'menu_frame_overlay.webp')

    bg = Image.open(bg_path).convert('RGBA')
    W, H = bg.size

    # The 4 bay polygons at 1280x800:
    poly_left = [
        (145, 120), (338, 120),
        (370, 152), (370, 614),
        (338, 646), (145, 646),
        (114, 614), (114, 152)
    ]

    poly_center = [
        (438, 120), (842, 120),
        (874, 152), (874, 614),
        (842, 646), (438, 646),
        (406, 614), (406, 152)
    ]

    poly_right = [
        (942, 120), (1134, 120),
        (1166, 152), (1166, 614),
        (1134, 646), (942, 646),
        (910, 614), (910, 152)
    ]

    poly_adv = [
        (934, 712), (1172, 712),
        (1178, 718), (1178, 752),
        (1172, 758), (934, 758),
        (928, 752), (928, 718)
    ]

    # Create mask at 4x resolution for smooth antialiased edges
    scale = 4
    mask_hires = Image.new('L', (W * scale, H * scale), 255)
    draw_hires = ImageDraw.Draw(mask_hires)

    for poly in [poly_left, poly_center, poly_right, poly_adv]:
        scaled_poly = [(x * scale, y * scale) for (x, y) in poly]
        draw_hires.polygon(scaled_poly, fill=0)

    # Downsample mask with high quality lanczos filtering
    mask = mask_hires.resize((W, H), Image.Resampling.LANCZOS)

    # Apply alpha mask
    bg.putalpha(mask)

    # Save lossless WebP
    bg.save(out_path, 'WEBP', lossless=True)
    print(f"[menu-overlay] Successfully generated {out_path} ({W}x{H}, {os.path.getsize(out_path)} bytes)")

if __name__ == '__main__':
    generate()
