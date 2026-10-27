import os
import glob
from PIL import Image

BRAIN_DIR = "/home/caveman/.gemini/antigravity-ide/brain/d5fac86d-4971-45b2-b0c5-12da8afcd847"
OUTPUT_DIR = "/home/caveman/Desktop/icecave/hunker-bunker/public/ui/overlays"
os.makedirs(OUTPUT_DIR, exist_ok=True)

targets = [
    ("automart_bezel_wide_*.jpg", "fab_automart_overlay.png"),
    ("console_bezel_wide_*.jpg", "console_kiosk_overlay.png"),
    ("arcade_bezel_wide_*.jpg", "arcade_cabinet_overlay.png"),
    ("armory_bezel_wide_*.jpg", "armory_workbench_overlay.png"),
]

for pattern, out_name in targets:
    matches = glob.glob(os.path.join(BRAIN_DIR, pattern))
    if not matches:
        print(f"No match for {pattern}")
        continue
    matches.sort(key=os.path.getmtime, reverse=True)
    in_path = matches[0]
    print(f"Processing {in_path} -> {out_name}...")
    
    img = Image.open(in_path).convert("RGBA")
    data = img.load()
    width, height = img.size
    
    for y in range(height):
        for x in range(width):
            r, g, b, a = data[x, y]
            max_rb = max(r, b)
            excess = g - max_rb
            
            # Pure / strong chroma green
            if excess > 45 and g > 105:
                # 100% transparent cutout
                data[x, y] = (0, 0, 0, 0)
            elif excess > 18 and g > 85:
                # Anti-aliased feathering & despill transition
                t = (excess - 18) / 27.0
                alpha = int(255 * max(0.0, 1.0 - t))
                clean_g = int(max_rb * 0.8 + g * 0.2)
                data[x, y] = (r, clean_g, b, alpha)

    out_path = os.path.join(OUTPUT_DIR, out_name)
    img.save(out_path, "PNG")
    print(f"Saved {out_path} ({width}x{height})")

print("All wide-aperture chroma overlays converted to transparent PNGs!")
