"""Generate placeholder inventory icons for RGB items that have no final art.

Three items (temp badge, cracked phone, wire cutters) are carried by the player
but were never illustrated, so the inventory rendered them as bare labels. These
placeholders match the shipped art's format (1024x1024, ink on cream) so layout
is honest, while reading unmistakably as unfinished so nobody mistakes one for
final art. Regenerate with:

    python3 scripts/generate-rgb-item-placeholders.py
"""

from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

OUT = Path("public/minigames/rgb/items")
SIZE = 1024
CREAM = (247, 245, 233)
INK = (28, 26, 24)
RED = (225, 29, 46)

# label, filename, simple ink glyph drawn as line work
ITEMS = [
    ("TEMP\nCONTRACTOR\nBADGE", "item_temp_badge.png", "badge"),
    ("CRACKED\nPHONE", "item_phone.png", "phone"),
    ("INSULATED\nWIRE CUTTERS", "item_wire_cutters.png", "cutters"),
]


def load_font(size, bold=False):
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold
        else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf" if bold
        else "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    ]
    for path in candidates:
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def draw_badge(d, cx, cy, s):
    d.rounded_rectangle([cx - s * 0.42, cy - s * 0.58, cx + s * 0.42, cy + s * 0.58],
                        radius=s * 0.06, outline=INK, width=9)
    d.rectangle([cx - s * 0.12, cy - s * 0.70, cx + s * 0.12, cy - s * 0.56], outline=INK, width=9)
    d.ellipse([cx - s * 0.20, cy - s * 0.38, cx + s * 0.20, cy + s * 0.02], outline=INK, width=9)
    for i in range(3):
        y = cy + s * (0.16 + i * 0.13)
        d.line([cx - s * 0.30, y, cx + s * 0.30, y], fill=INK, width=8)


def draw_phone(d, cx, cy, s):
    d.rounded_rectangle([cx - s * 0.34, cy - s * 0.62, cx + s * 0.34, cy + s * 0.62],
                        radius=s * 0.08, outline=INK, width=9)
    d.rounded_rectangle([cx - s * 0.24, cy - s * 0.48, cx + s * 0.24, cy + s * 0.44],
                        radius=s * 0.02, outline=INK, width=5)
    # the crack
    d.line([cx - s * 0.20, cy - s * 0.42, cx + s * 0.02, cy - s * 0.06], fill=INK, width=7)
    d.line([cx + s * 0.02, cy - s * 0.06, cx - s * 0.10, cy + s * 0.14], fill=INK, width=7)
    d.line([cx + s * 0.02, cy - s * 0.06, cx + s * 0.20, cy + s * 0.10], fill=INK, width=7)


def draw_cutters(d, cx, cy, s):
    d.line([cx - s * 0.30, cy + s * 0.58, cx + s * 0.06, cy - s * 0.10], fill=INK, width=14)
    d.line([cx + s * 0.30, cy + s * 0.58, cx - s * 0.06, cy - s * 0.10], fill=INK, width=14)
    d.line([cx + s * 0.06, cy - s * 0.10, cx - s * 0.02, cy - s * 0.56], fill=INK, width=12)
    d.line([cx - s * 0.06, cy - s * 0.10, cx + s * 0.02, cy - s * 0.56], fill=INK, width=12)
    d.ellipse([cx - s * 0.07, cy - s * 0.17, cx + s * 0.07, cy - s * 0.03], outline=INK, width=8)
    # insulated grips
    for sign in (-1, 1):
        d.line([cx + sign * s * 0.30, cy + s * 0.58, cx + sign * s * 0.19, cy + s * 0.36],
               fill=RED, width=22)


GLYPHS = {"badge": draw_badge, "phone": draw_phone, "cutters": draw_cutters}


def build(label, filename, glyph):
    img = Image.new("RGB", (SIZE, SIZE), CREAM)
    d = ImageDraw.Draw(img)

    d.rectangle([26, 26, SIZE - 26, SIZE - 26], outline=INK, width=6)
    GLYPHS[glyph](d, SIZE / 2, SIZE * 0.44, SIZE * 0.46)

    font = load_font(52, bold=True)
    y = SIZE * 0.78
    for line in label.split("\n"):
        w = d.textbbox((0, 0), line, font=font)[2]
        d.text(((SIZE - w) / 2, y), line, font=font, fill=INK)
        y += 62

    tag_font = load_font(30, bold=True)
    tag = "PLACEHOLDER — ART PENDING"
    tw = d.textbbox((0, 0), tag, font=tag_font)[2]
    d.rectangle([(SIZE - tw) / 2 - 20, 54, (SIZE + tw) / 2 + 20, 104], fill=RED)
    d.text(((SIZE - tw) / 2, 62), tag, font=tag_font, fill=CREAM)

    out = OUT / filename
    img.save(out)
    print(f"wrote {out}")


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    for label, filename, glyph in ITEMS:
        build(label, filename, glyph)
