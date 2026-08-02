import csv
import os
from PIL import Image, ImageDraw, ImageFont

OUT_DIR = os.path.join("steam", "store", "soundtrack")
MASTER_PATH = os.path.join(OUT_DIR, "source", "soundtrack_key_art_v2.png")
CSV_PATH = os.path.join(OUT_DIR, "ost_metadata.csv")
W, H = 1920, 1080
AMBER = (255, 175, 40, 255)
PINK = (211, 74, 122, 255)
WHITE = (245, 244, 238, 255)
MUTED = (159, 168, 170, 255)


def font(size, bold=True):
    family = "LiberationSans-Bold.ttf" if bold else "LiberationSans-Regular.ttf"
    path = os.path.join("/usr/share/fonts/truetype/liberation", family)
    return ImageFont.truetype(path, size)


def tracks():
    with open(CSV_PATH, newline="", encoding="utf-8") as source:
        return list(csv.DictReader(source))


def make_soundtrack_screenshot():
    master = Image.open(MASTER_PATH).convert("RGB")
    crop_h = round(master.width * H / W)
    top = max(0, (master.height - crop_h) // 2)
    canvas = master.crop((0, top, master.width, top + crop_h)).resize((W, H), Image.Resampling.LANCZOS).convert("RGBA")

    veil = Image.new("RGBA", (W, H), (0, 0, 0, 70))
    canvas = Image.alpha_composite(canvas, veil)
    draw = ImageDraw.Draw(canvas)
    rows = tracks()

    draw.rectangle((42, 42, W - 43, H - 43), outline=(109, 76, 29, 210), width=3)
    draw.line(((74, 112), (245, 112), (286, 72), (520, 72)), fill=PINK, width=5)
    draw.text((76, 134), "HUNKER BUNKER", font=font(66), fill=WHITE)
    draw.text((79, 210), "ORIGINAL GAME SOUNDTRACK", font=font(31), fill=AMBER)
    draw.text((80, 258), "43 TRACKS  //  COMPOSED BY GOVERNMENT NAME", font=font(22), fill=MUTED)

    panel = (78, 344, 970, 990)
    draw.rounded_rectangle(panel, radius=8, fill=(5, 7, 7, 226), outline=(116, 81, 30, 230), width=2)
    draw.text((112, 380), "AUDIO ARCHIVE // SELECTED SIGNALS", font=font(23), fill=AMBER)

    # Representative selections communicate the scope without pretending the
    # full 43-row catalog can remain readable inside a store screenshot.
    picks = [0, 5, 11, 16, 23, 29, 35, 42]
    y = 438
    for index in picks:
        row = rows[index]
        number = int(row["Track Number"])
        title = row["Original Name"]
        duration = row['Duration ("m:ss")']
        active = index == 0
        draw.rectangle((108, y, 934, y + 54), fill=(48, 33, 17, 240) if active else (17, 20, 20, 220))
        draw.rectangle((108, y, 114, y + 54), fill=PINK if active else (85, 64, 35, 255))
        draw.text((134, y + 14), f"{number:02d}. {title}", font=font(19, active), fill=WHITE if active else MUTED)
        draw.text((842, y + 15), duration, font=font(17, False), fill=AMBER if active else MUTED)
        y += 64

    draw.text((112, 954), "+ 35 MORE TRACKS IN THE COMPLETE ARCHIVE", font=font(18), fill=PINK)

    # A small waveform bridges the information panel into the key art.
    baseline = 928
    for i in range(58):
        amplitude = 12 + ((i * 17) % 61)
        x = 1088 + i * 12
        draw.line((x, baseline - amplitude, x, baseline + amplitude), fill=AMBER if i % 4 else PINK, width=5)
    draw.text((1088, 970), "SIGNAL 01 / 43", font=font(18), fill=WHITE)

    path = os.path.join(OUT_DIR, "screenshot_soundtrack_1920x1080.png")
    canvas.convert("RGB").save(path, "PNG", optimize=True)
    print("Saved:", path)


if __name__ == "__main__":
    make_soundtrack_screenshot()
