import os
from PIL import Image, ImageDraw, ImageFont

OUT_DIR = os.path.join("steam", "store", "soundtrack")
MASTER_PATH = os.path.join(OUT_DIR, "source", "soundtrack_key_art_v2.png")
os.makedirs(OUT_DIR, exist_ok=True)

MASTER = Image.open(MASTER_PATH).convert("RGB")
AMBER = (255, 175, 40, 255)
WHITE = (245, 244, 238, 255)
PINK = (211, 74, 122, 255)
INK = (6, 8, 8, 255)


def font(size, bold=True):
    family = "LiberationSans-Bold.ttf" if bold else "LiberationSans-Regular.ttf"
    path = os.path.join("/usr/share/fonts/truetype/liberation", family)
    if not os.path.exists(path):
        path = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
    return ImageFont.truetype(path, size)


def cover_crop(width, height, focus_x=0.61, focus_y=0.54):
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


def add_readability(canvas, left_fraction=0.58):
    shade = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    pixels = shade.load()
    stop = max(1, int(canvas.width * left_fraction))
    for x in range(stop):
        strength = int(224 * (1 - x / stop) ** 1.6)
        for y in range(canvas.height):
            pixels[x, y] = (0, 0, 0, strength)
    return Image.alpha_composite(canvas, shade)


def add_frame(canvas, overlay_scale=1.0):
    draw = ImageDraw.Draw(canvas)
    w, h = canvas.size
    inset = max(5, round(min(w, h) * 0.018))
    draw.rectangle((inset, inset, w - inset - 1, h - inset - 1), outline=(100, 72, 28, 150), width=max(1, inset // 4))

    # Steam places its diagonal soundtrack ribbon in the upper-left. These
    # disconnected pink/amber traces frame that zone without putting content
    # beneath it, so the platform label reads as part of the artwork.
    sx = round(154 * overlay_scale)
    sy = round(112 * overlay_scale)
    line_w = max(2, round(3 * overlay_scale))
    draw.line(((sx, inset), (sx + round(84 * overlay_scale), inset)), fill=PINK, width=line_w)
    draw.line(((inset, sy), (inset, sy + round(42 * overlay_scale)), (inset + round(42 * overlay_scale), sy + round(84 * overlay_scale))), fill=PINK, width=line_w)
    draw.line(((sx + round(15 * overlay_scale), inset + round(16 * overlay_scale)), (sx + round(65 * overlay_scale), inset + round(16 * overlay_scale))), fill=AMBER, width=max(1, line_w - 1))
    return canvas


def draw_lockup(canvas, x, y, title_size, subtitle_size, align="left"):
    draw = ImageDraw.Draw(canvas)
    title_font = font(title_size)
    subtitle_font = font(subtitle_size)
    title = "HUNKER BUNKER"
    subtitle = "ORIGINAL GAME SOUNDTRACK"
    if align == "center":
        title_box = draw.textbbox((0, 0), title, font=title_font)
        sub_box = draw.textbbox((0, 0), subtitle, font=subtitle_font)
        title_x = x - (title_box[2] - title_box[0]) // 2
        sub_x = x - (sub_box[2] - sub_box[0]) // 2
    else:
        title_x = sub_x = x
    draw.text((title_x + 3, y + 3), title, font=title_font, fill=INK)
    draw.text((title_x, y), title, font=title_font, fill=WHITE)
    sub_y = y + round(title_size * 1.18)
    draw.text((sub_x + 2, sub_y + 2), subtitle, font=subtitle_font, fill=INK)
    draw.text((sub_x, sub_y), subtitle, font=subtitle_font, fill=AMBER)


def save_capsule(name, width, height, lockup, focus=(0.61, 0.54), shade=0.58, overlay_scale=1.0):
    canvas = cover_crop(width, height, *focus)
    canvas = add_readability(canvas, shade)
    canvas = add_frame(canvas, overlay_scale)
    draw_lockup(canvas, *lockup)
    path = os.path.join(OUT_DIR, name)
    canvas.convert("RGB").save(path, "PNG", optimize=True)
    print("Saved:", path)


def make_header_capsule():
    save_capsule(
        "header_capsule_920x430.png", 920, 430,
        (56, 202, 43, 21), focus=(0.71, 0.5), shade=0.64, overlay_scale=1.0
    )


def make_small_capsule():
    save_capsule(
        "small_capsule_462x174.png", 462, 174,
        (116, 70, 25, 12), focus=(0.82, 0.48), shade=0.78, overlay_scale=0.52
    )


def make_main_capsule():
    save_capsule(
        "main_capsule_1232x706.png", 1232, 706,
        (78, 310, 64, 29), focus=(0.69, 0.5), shade=0.62, overlay_scale=1.35
    )


def make_vertical_capsule():
    canvas = cover_crop(748, 896, focus_x=0.62, focus_y=0.52)
    bottom = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    px = bottom.load()
    start = int(canvas.height * 0.57)
    for y in range(start, canvas.height):
        strength = int(220 * ((y - start) / (canvas.height - start)) ** 1.35)
        for x in range(canvas.width):
            px[x, y] = (0, 0, 0, strength)
    canvas = Image.alpha_composite(canvas, bottom)
    canvas = add_frame(canvas, overlay_scale=1.12)
    draw_lockup(canvas, 374, 724, 45, 22, align="center")
    path = os.path.join(OUT_DIR, "vertical_capsule_748x896.png")
    canvas.convert("RGB").save(path, "PNG", optimize=True)
    print("Saved:", path)


if __name__ == "__main__":
    make_header_capsule()
    make_small_capsule()
    make_main_capsule()
    make_vertical_capsule()
