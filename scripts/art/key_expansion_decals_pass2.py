import shutil
from pathlib import Path
from PIL import Image
import numpy as np

BRAIN_DIR = Path('/home/caveman/.gemini/antigravity-ide/brain/5fba5a6a-fc55-4d48-bec6-b60551f7381b')
RAW_DIR = Path('art/source/decals/world-expansion-2026-10/raw')
KEYED_DIR = Path('art/source/decals/world-expansion-2026-10/keyed')
PUBLIC_DIR = Path('public')

RAW_DIR.mkdir(parents=True, exist_ok=True)
KEYED_DIR.mkdir(parents=True, exist_ok=True)

MAPPINGS = [
    ('decal_strip_drag_marks_1791752566617.jpg', 'decal_strip_drag_marks'),
    ('decal_walkway_borders_1791752579727.jpg', 'decal_walkway_borders'),
    ('decal_strip_hive_veins_1791752595367.jpg', 'decal_strip_hive_veins'),
    ('decal_puddle_slick_1791752608200.jpg', 'decal_puddle_slick'),
    ('decal_sled_tracks_1791752627216.jpg', 'decal_sled_tracks'),
    ('decal_wall_grime_drip_1791752640726.jpg', 'decal_wall_grime_drip'),
]

for src_name, target_base in MAPPINGS:
    src_file = BRAIN_DIR / src_name
    if not src_file.exists():
        print(f"Skipping {src_name}, not found")
        continue

    raw_dest = RAW_DIR / f"{target_base}_a.jpg"
    shutil.copy2(src_file, raw_dest)
    print(f"Copied {src_name} -> {raw_dest}")

    img = Image.open(raw_dest).convert("RGBA")
    arr = np.array(img, dtype=np.float32)

    r = arr[..., 0]
    g = arr[..., 1]
    b = arr[..., 2]

    # Magenta is high R, low G, high B
    magenta_diff = np.minimum(r, b) - g
    # Normalize diff to [0, 255]
    diff_norm = np.clip(magenta_diff, 0, 255)

    # Foreground threshold: where diff is low (< 35), fully opaque
    # Magenta background: where diff is high (> 75), fully transparent
    alpha = np.clip(1.0 - (diff_norm - 35.0) / 40.0, 0.0, 1.0)

    # Despill: in fringe areas where alpha < 1.0 and min(r, b) > g,
    # pull r and b down towards g to remove pink edge fringing
    fringe_mask = (alpha > 0.0) & (alpha < 0.98)
    excess_magenta = np.maximum(0.0, np.minimum(r, b) - g)
    r[fringe_mask] -= excess_magenta[fringe_mask] * 0.7
    b[fringe_mask] -= excess_magenta[fringe_mask] * 0.7

    arr[..., 0] = np.clip(r, 0, 255)
    arr[..., 1] = np.clip(g, 0, 255)
    arr[..., 2] = np.clip(b, 0, 255)
    arr[..., 3] = alpha * 255.0

    out_arr = arr.astype(np.uint8)
    keyed_img = Image.fromarray(out_arr, mode="RGBA")

    keyed_dest = KEYED_DIR / f"{target_base}_a.png"
    public_dest = PUBLIC_DIR / f"{target_base}.png"
    keyed_img.save(keyed_dest, format="PNG")
    keyed_img.save(public_dest, format="PNG")
    print(f"Keyed and saved: {keyed_dest} & {public_dest}")
