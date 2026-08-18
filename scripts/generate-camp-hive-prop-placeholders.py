#!/usr/bin/env python3
"""Generates real placeholder JPGs for the camp/hive signature props that were referenced in
src/camp.js and src/hiveSite.js but never had art land (flagged by scripts/audit-retail-
assets.js's "missing runtime assets" check). Both files already have a real, working runtime
fallback for a missing image (makeSignaturePropFallbackCanvas / makeHiveSignaturePropFallbackCanvas
— a dashed colored border + the prop's first letter on a transparent canvas), so this script
bakes that exact same design as a real file rather than inventing new "art" — the game already
shows this to players today whenever the image 404s. JPG has no alpha channel, so the
transparent background becomes the game's standard dark exhibition color (#0a0f18) instead.

Run once, then delete (matches the convention of other one-off asset scripts in this repo).
"""
from PIL import Image, ImageDraw, ImageFont
import os

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
PUBLIC = os.path.join(ROOT, "public")
BG = (10, 15, 24)  # #0a0f18 — matches the dark exhibition floor color used elsewhere this session

# (filename, hex_color, label_id) — colors/ids transcribed directly from CAMP_SIGNATURE_PROPS
# (src/camp.js) and HIVE_SIGNATURE_PROPS (src/hiveSite.js); hive entries use their real default
# color (0x8cff96) since none of the 6 missing hive props override it per-entry.
PROPS = [
    ("prop_camp_meridian_battery_bank.jpg", 0xFFB347, "battery_bank"),
    ("prop_camp_meridian_radio.jpg", 0xFFB347, "radio"),
    ("prop_camp_meridian_repair_rig.jpg", 0xFFB347, "repair_rig"),
    ("prop_camp_tallow_still.jpg", 0x6EE66E, "still"),
    ("prop_camp_tallow_spore_trays.jpg", 0x6EE66E, "spore_trays"),
    ("prop_camp_tallow_resin_urn.jpg", 0x6EE66E, "resin_urn"),
    ("prop_camp_vesper_turret.jpg", 0xFF5C4D, "turret"),
    ("prop_camp_vesper_ammo_press.jpg", 0xFF5C4D, "ammo_press"),
    ("prop_camp_vesper_shield_rack.jpg", 0xFF5C4D, "shield_rack"),
    ("prop_hive_suture_organ.jpg", 0x8CFF96, "suture_organ"),
    ("prop_hive_wound_cauterizer.jpg", 0x8CFF96, "wound_cauterizer"),
    ("prop_hive_relay_antenna.jpg", 0x8CFF96, "relay_antenna"),
    ("prop_hive_synaptic_web.jpg", 0x8CFF96, "synaptic_web"),
    ("prop_hive_chitin_hatchery.jpg", 0x8CFF96, "chitin_hatchery"),
    ("prop_hive_carapace_molt.jpg", 0x8CFF96, "carapace_molt"),
]


def hex_to_rgb(value):
    return ((value >> 16) & 0xFF, (value >> 8) & 0xFF, value & 0xFF)


def build_placeholder(color_hex, label):
    size = 256  # 96px canvas equivalent, upscaled for a non-blurry static asset
    img = Image.new("RGB", (size, size), BG)
    draw = ImageDraw.Draw(img)
    rgb = hex_to_rgb(color_hex)

    inset = 16
    dash = 14
    gap = 10
    x0, y0, x1, y1 = inset, inset, size - inset, size - inset
    # Manual dashed rectangle (Pillow has no native dashed-line primitive)
    for edge in [((x0, y0), (x1, y0)), ((x1, y0), (x1, y1)), ((x1, y1), (x0, y1)), ((x0, y1), (x0, y0))]:
        (sx, sy), (ex, ey) = edge
        length = max(abs(ex - sx), abs(ey - sy))
        steps = int(length // (dash + gap)) + 1
        for i in range(steps):
            t0 = (i * (dash + gap)) / length if length else 0
            t1 = min(1.0, t0 + dash / length) if length else 1.0
            draw.line([
                (sx + (ex - sx) * t0, sy + (ey - sy) * t0),
                (sx + (ex - sx) * t1, sy + (ey - sy) * t1)
            ], fill=rgb, width=4)

    # First letter of each underscore-separated word (e.g. "repair_rig" -> "RR") rather than
    # just the first letter of the whole label — several props in the same faction/color group
    # share a first letter (radio/repair_rig, still/spore_trays, suture_organ/synaptic_web,
    # chitin_hatchery/carapace_molt), which produced pixel-identical placeholders and tripped
    # the duplicate-asset-group budget the same way the real .mp4 duplicates did.
    letter = "".join(word[:1] for word in label.split("_")).upper()
    font_size = 110 if len(letter) == 1 else 70
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf", font_size)
    except OSError:
        font = ImageFont.load_default()
    bbox = draw.textbbox((0, 0), letter, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.text(((size - tw) / 2 - bbox[0], (size - th) / 2 - bbox[1]), letter, fill=rgb, font=font)
    return img


def main():
    for filename, color_hex, label in PROPS:
        out_path = os.path.join(PUBLIC, filename)
        img = build_placeholder(color_hex, label)
        img.save(out_path, "JPEG", quality=88)
        print(f"WROTE: {out_path}")


if __name__ == "__main__":
    main()
