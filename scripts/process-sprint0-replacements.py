#!/usr/bin/env python3
"""Processes the 7 replacement icons (4146, 4148-4153) uploaded by the user:
  - 4146: mod_symbiotic_adrenaline_pump
  - 4148: voicepack_soviet_commander
  - 4149: voicepack_aura
  - 4150: hudtheme_amber_crt
  - 4151: hudtheme_emerald_radar
  - 4152: fx_emerald_void_tracer
  - 4153: fx_cryo_shockwave_muzzle

Generates the 4 required standard production resolutions:
  - public/economy/<slug>.png (256x256 RGBA)
  - public/economy/<slug>_large.png (512x512 RGBA)
  - steam/store/item_icons/<slug>_master.png (1254x1254 RGBA)
  - steam/store/item_icons/chroma/<slug>_chroma.png (1254x1254 RGBA)
"""
import os
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SOURCE_DIRS = [
    os.path.join(ROOT, 'art', 'source', '3d', 'sprint34-raw'),
    os.path.join(ROOT, 'public')
]
ECONOMY_DIR = os.path.join(ROOT, 'public', 'economy')
MASTER_DIR = os.path.join(ROOT, 'steam', 'store', 'item_icons')
CHROMA_DIR = os.path.join(ROOT, 'steam', 'store', 'item_icons', 'chroma')

ITEMS = [
    (4146, "mod_symbiotic_adrenaline_pump", "Symbiotic Adrenaline Pump"),
    (4148, "voicepack_soviet_commander", "Soviet Sub-Commander Radio"),
    (4149, "voicepack_aura", "Synthesized AI Unit 'AURA'"),
    (4150, "hudtheme_amber_crt", "Amber CRT Monitor Theme"),
    (4151, "hudtheme_emerald_radar", "Emerald Radar Phosphor HUD"),
    (4152, "fx_emerald_void_tracer", "Emerald Void Tracer Rounds"),
    (4153, "fx_cryo_shockwave_muzzle", "Cryo Shockwave Muzzle Flare"),
]

def find_source(itemdef, slug):
    names = [f"{itemdef}.jpeg", f"{itemdef}.jpg", f"{itemdef}.png", f"{slug}.jpeg", f"{slug}.jpg", f"{slug}.png"]
    for sdir in SOURCE_DIRS:
        for name in names:
            p = os.path.join(sdir, name)
            if os.path.exists(p):
                return p
    return None

def export_formats(img, slug):
    os.makedirs(ECONOMY_DIR, exist_ok=True)
    os.makedirs(MASTER_DIR, exist_ok=True)
    os.makedirs(CHROMA_DIR, exist_ok=True)

    # 1. 256x256 regular icon
    img_256 = img.resize((256, 256), Image.Resampling.LANCZOS)
    p256 = os.path.join(ECONOMY_DIR, f"{slug}.png")
    img_256.save(p256, 'PNG', optimize=True)

    # 2. 512x512 large icon
    img_512 = img.resize((512, 512), Image.Resampling.LANCZOS)
    p512 = os.path.join(ECONOMY_DIR, f"{slug}_large.png")
    img_512.save(p512, 'PNG', optimize=True)

    # 3. 1254x1254 master icon
    img_1254 = img.resize((1254, 1254), Image.Resampling.LANCZOS)
    pmaster = os.path.join(MASTER_DIR, f"{slug}_master.png")
    img_1254.save(pmaster, 'PNG', optimize=True)

    # 4. 1254x1254 chroma icon
    pchroma = os.path.join(CHROMA_DIR, f"{slug}_chroma.png")
    img_1254.save(pchroma, 'PNG', optimize=True)

    print(f"  [OK] {slug} -> 256px, 512px, 1254px master & chroma")

def main():
    print(f"=== Processing {len(ITEMS)} Replacement Icons ===")
    for itemdef, slug, name in ITEMS:
        src = find_source(itemdef, slug)
        if not src:
            print(f"  [ERROR] Source image not found for {itemdef} ({name})")
            continue
        print(f"Processing {itemdef} ({name}) from {src}...")
        raw = Image.open(src)
        rgba = raw.convert('RGBA')
        export_formats(rgba, slug)
    print("=== Replacement Processing Complete ===")

if __name__ == '__main__':
    main()
