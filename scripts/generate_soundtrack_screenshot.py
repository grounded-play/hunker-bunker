import os
from PIL import Image, ImageDraw, ImageFont

out_dir = os.path.join("steam", "store", "soundtrack")
os.makedirs(out_dir, exist_ok=True)

cover_path = os.path.join("dist_soundtrack", "cover.png")
cover_img = Image.open(cover_path).convert("RGBA")

# Dimensions: 1920 x 1080 (16:9 widescreen)
w, h = 1920, 1080
BG_COLOR = (10, 10, 10, 255)
AMBER_COLOR = (255, 175, 40, 255)
DIM_AMBER = (160, 105, 20, 255)
WHITE = (255, 255, 255, 255)
MUTED_GRAY = (160, 160, 160, 255)
PANEL_BG = (18, 16, 14, 230)

def get_font(size, bold=True):
    font_path = "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"
    if not os.path.exists(font_path):
        font_path = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
    try:
        return ImageFont.truetype(font_path, size)
    except Exception:
        return ImageFont.load_default()

def make_soundtrack_screenshot():
    canvas = Image.new("RGBA", (w, h), BG_COLOR)
    draw = ImageDraw.Draw(canvas)
    
    # Grid lines for tactical aesthetic
    for x_line in range(0, w, 80):
        draw.line([(x_line, 0), (x_line, h)], fill=(20, 18, 15, 255), width=1)
    for y_line in range(0, h, 80):
        draw.line([(0, y_line), (w, y_line)], fill=(20, 18, 15, 255), width=1)
        
    # Outer double border frame
    draw.rectangle([16, 16, w - 17, h - 17], outline=(40, 34, 22, 255), width=2)
    draw.rectangle([24, 24, w - 25, h - 25], outline=(25, 21, 15, 255), width=1)
    
    # Corner HUD brackets
    bracket_len = 45
    for cx, cy in [(32, 32), (w - 32, 32), (32, h - 32), (w - 32, h - 32)]:
        dx = 1 if cx == 32 else -1
        dy = 1 if cy == 32 else -1
        draw.line([(cx, cy), (cx + dx * bracket_len, cy)], fill=AMBER_COLOR, width=4)
        draw.line([(cx, cy), (cx, cy + dy * bracket_len)], fill=AMBER_COLOR, width=4)
        
    # Top Status Bar
    draw.rectangle([50, 45, 500, 85], outline=AMBER_COLOR, fill=(18, 15, 10, 240), width=2)
    draw.text((65, 56), "[ SYSTEM // AUDIO MATRIX // ONLINE ]", font=get_font(18, bold=True), fill=AMBER_COLOR)
    
    draw.text((w - 450, 56), "SEC_AUTH: GVT // 320KBPS MP3 AUDIO", font=get_font(16, bold=True), fill=WHITE)
    
    # Left Side: Cover Art (scaled 800x800)
    c_size = 840
    scaled_cover = cover_img.resize((c_size, c_size), Image.Resampling.LANCZOS)
    canvas.paste(scaled_cover, (60, (h - c_size) // 2 + 20), scaled_cover)
    
    # Right Side: Interactive Tactical Sounddeck UI Panel
    panel_left = 940
    panel_top = 120
    panel_right = w - 60
    panel_bottom = h - 60
    
    draw.rectangle([panel_left, panel_top, panel_right, panel_bottom], outline=AMBER_COLOR, fill=PANEL_BG, width=2)
    
    # Sounddeck Header
    draw.rectangle([panel_left, panel_top, panel_right, panel_top + 60], fill=(35, 28, 16, 255))
    draw.text((panel_left + 25, panel_top + 16), "HUNKER BUNKER - AUDIO MODULE", font=get_font(22, bold=True), fill=WHITE)
    draw.text((panel_right - 260, panel_top + 18), "FREE DLC EDITION", font=get_font(16, bold=True), fill=AMBER_COLOR)
    
    # Now Playing Display Box
    now_top = panel_top + 80
    draw.rectangle([panel_left + 25, now_top, panel_right - 25, now_top + 180], outline=DIM_AMBER, fill=(26, 22, 16, 255), width=1)
    
    draw.text((panel_left + 45, now_top + 18), "NOW PLAYING", font=get_font(14, bold=True), fill=AMBER_COLOR)
    draw.text((panel_left + 45, now_top + 42), "01. Hunker Bunker Main Theme", font=get_font(26, bold=True), fill=WHITE)
    draw.text((panel_left + 45, now_top + 80), "Composed by Government Name | Industrial Ambient / Tactical", font=get_font(16, bold=False), fill=MUTED_GRAY)
    
    # Waveform Equalizer visualization simulation
    eq_left = panel_left + 45
    eq_top = now_top + 115
    import random
    random.seed(42)
    for b in range(48):
        bar_x = eq_left + b * 17
        bar_h = random.randint(12, 42)
        color = AMBER_COLOR if b % 3 != 0 else WHITE
        draw.rectangle([bar_x, eq_top + (45 - bar_h), bar_x + 11, eq_top + 45], fill=color)
        
    # Tracklist Table
    track_top = now_top + 200
    draw.text((panel_left + 25, track_top), "ALBUM TRACKLIST (5 TRACKS):", font=get_font(18, bold=True), fill=AMBER_COLOR)
    
    tracks = [
        ("01", "Hunker Bunker Main Theme", "04:52", "ACTIVE"),
        ("02", "Safe Haven (Ship Sanctuary)", "03:12", "READY"),
        ("03", "Glacial Depths (Cryo Biome)", "03:48", "READY"),
        ("04", "Overgrown Bio-Sphere (Bio Biome)", "02:40", "READY"),
        ("05", "Under Siege (Combat Alert)", "03:28", "READY"),
    ]
    
    t_y = track_top + 35
    for num, name, duration, state in tracks:
        row_bg = (40, 32, 18, 255) if state == "ACTIVE" else (22, 20, 17, 200)
        draw.rectangle([panel_left + 25, t_y, panel_right - 25, t_y + 44], fill=row_bg, outline=(50, 42, 28, 255) if state != "ACTIVE" else AMBER_COLOR)
        
        prefix = "▶ " if state == "ACTIVE" else "   "
        color = WHITE if state == "ACTIVE" else MUTED_GRAY
        
        draw.text((panel_left + 40, t_y + 12), f"{prefix}{num}. {name}", font=get_font(17, bold=(state == "ACTIVE")), fill=color)
        draw.text((panel_right - 180, t_y + 12), duration, font=get_font(16, bold=False), fill=color)
        draw.text((panel_right - 100, t_y + 12), state, font=get_font(14, bold=True), fill=AMBER_COLOR if state == "ACTIVE" else (100, 100, 100, 255))
        
        t_y += 52
        
    # Bottom Badge inside panel
    draw.rectangle([panel_left + 25, panel_bottom - 60, panel_left + 350, panel_bottom - 20], fill=(220, 140, 20, 255))
    draw.text((panel_left + 45, panel_bottom - 44), "INCLUDED FREE WITH HUNKER BUNKER", font=get_font(15, bold=True), fill=(10, 10, 10, 255))
    
    out_path = os.path.join(out_dir, "screenshot_soundtrack_1920x1080.png")
    canvas.convert("RGB").save(out_path, quality=98)
    print("Saved:", out_path)

if __name__ == "__main__":
    make_soundtrack_screenshot()
