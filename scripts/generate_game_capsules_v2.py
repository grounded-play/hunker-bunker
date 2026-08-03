import os
from PIL import Image, ImageDraw, ImageFont

OUT_DIR = os.path.join("steam", "store", "game-v2")
MASTER_PATH = os.path.join(OUT_DIR, "source", "game_key_art_v2.png")
MASTER = Image.open(MASTER_PATH).convert("RGB")

WHITE = (244, 245, 240, 255)
AMBER = (238, 145, 41, 255)
CYAN = (76, 205, 210, 255)
INK = (4, 7, 8, 255)


def font(size):
    path = "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"
    if not os.path.exists(path):
        path = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
    return ImageFont.truetype(path, size)


def cover_crop(width, height, focus_x=0.57, focus_y=0.5):
    source_ratio = MASTER.width / MASTER.height
    target_ratio = width / height
    if source_ratio > target_ratio:
        crop_w = round(MASTER.height * target_ratio)
        left = round((MASTER.width - crop_w) * focus_x)
        left = max(0, min(left, MASTER.width - crop_w))
        box = (left, 0, left + crop_w, MASTER.height)
    else:
        crop_h = round(MASTER.width / target_ratio)
        top = round((MASTER.height - crop_h) * focus_y)
        top = max(0, min(top, MASTER.height - crop_h))
        box = (0, top, MASTER.width, top + crop_h)
    return MASTER.crop(box).resize((width, height), Image.Resampling.LANCZOS).convert("RGBA")


def darken_for_title(canvas, side="left", extent=0.62):
    shade = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    px = shade.load()
    if side == "bottom":
        start = int(canvas.height * (1 - extent))
        for y in range(start, canvas.height):
            strength = int(220 * ((y - start) / max(1, canvas.height - start)) ** 1.25)
            for x in range(canvas.width):
                px[x, y] = (0, 0, 0, strength)
    else:
        stop = int(canvas.width * extent)
        for x in range(stop):
            strength = int(220 * (1 - x / max(1, stop)) ** 1.55)
            for y in range(canvas.height):
                px[x, y] = (0, 0, 0, strength)
    return Image.alpha_composite(canvas, shade)


def draw_title(canvas, x, y, size, align="left"):
    draw = ImageDraw.Draw(canvas)
    face = font(size)
    text = "HUNKER BUNKER"
    bbox = draw.textbbox((0, 0), text, font=face, stroke_width=max(1, size // 28))
    width = bbox[2] - bbox[0]
    if align == "center":
        x -= width // 2
    stroke = max(2, size // 18)
    draw.text((x, y), text, font=face, fill=WHITE, stroke_width=stroke, stroke_fill=INK)
    rule_y = y + round(size * 1.08)
    draw.line((x + 2, rule_y, x + min(width, round(size * 3.15)), rule_y), fill=AMBER, width=max(3, size // 12))
    draw.line((x + min(width, round(size * 3.15)) + 8, rule_y, x + min(width, round(size * 4.2)), rule_y), fill=CYAN, width=max(2, size // 18))


def draw_frame(canvas):
    draw = ImageDraw.Draw(canvas)
    w, h = canvas.size
    inset = max(5, round(min(w, h) * 0.018))
    draw.rectangle((inset, inset, w - inset - 1, h - inset - 1), outline=(131, 82, 34, 155), width=max(1, inset // 4))
    length = max(26, round(min(w, h) * 0.12))
    draw.line((inset, inset + length, inset, inset, inset + length, inset), fill=CYAN, width=max(2, inset // 3))
    draw.line((w - inset - length, h - inset, w - inset, h - inset, w - inset, h - inset - length), fill=AMBER, width=max(2, inset // 3))


def save_wide(filename, width, height, title_xy, title_size, focus_x, shade_extent):
    canvas = cover_crop(width, height, focus_x=focus_x)
    canvas = darken_for_title(canvas, "left", shade_extent)
    draw_frame(canvas)
    draw_title(canvas, *title_xy, title_size)
    path = os.path.join(OUT_DIR, filename)
    canvas.convert("RGB").save(path, "PNG", optimize=True)
    print("Saved:", path)


def make_header():
    save_wide("steam_header_capsule_v2_en.png", 920, 430, (46, 206), 48, 0.67, 0.66)


def make_small():
    save_wide("steam_small_capsule_v2_en.png", 462, 174, (20, 70), 27, 0.78, 0.71)


def make_main():
    save_wide("steam_main_capsule_v2_en.png", 1232, 706, (66, 342), 68, 0.63, 0.64)


def make_vertical():
    canvas = cover_crop(748, 896, focus_x=0.88, focus_y=0.52)
    canvas = darken_for_title(canvas, "bottom", 0.38)
    draw_frame(canvas)
    draw_title(canvas, 374, 760, 48, align="center")
    path = os.path.join(OUT_DIR, "steam_vertical_capsule_v2_en.png")
    canvas.convert("RGB").save(path, "PNG", optimize=True)
    print("Saved:", path)


if __name__ == "__main__":
    make_header()
    make_small()
    make_main()
    make_vertical()
