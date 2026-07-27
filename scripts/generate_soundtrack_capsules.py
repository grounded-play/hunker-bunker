import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

out_dir = os.path.join("steam", "store", "soundtrack")
os.makedirs(out_dir, exist_ok=True)

cover_path = os.path.join("dist_soundtrack", "cover.png")
cover_img = Image.open(cover_path).convert("RGBA")

# Helmet graphic crop (120, 80) to (904, 830)
helmet_crop = cover_img.crop((120, 80, 904, 830))

BG_COLOR = (12, 12, 12, 255)
AMBER_COLOR = (255, 175, 40, 255)
AMBER_GLOW = (255, 150, 0, 180)
WHITE = (255, 255, 255, 255)
MUTED_GRAY = (170, 170, 170, 255)

# Font loading helper
def get_font(size, bold=True):
    font_path = "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"
    if not os.path.exists(font_path):
        font_path = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
    try:
        return ImageFont.truetype(font_path, size)
    except Exception:
        return ImageFont.load_default()

def create_base_canvas(width, height):
    canvas = Image.new("RGBA", (width, height), BG_COLOR)
    draw = ImageDraw.Draw(canvas)
    
    # Outer HUD double border
    draw.rectangle([6, 6, width - 7, height - 7], outline=(45, 38, 25, 255), width=2)
    draw.rectangle([10, 10, width - 11, height - 11], outline=(25, 22, 18, 255), width=1)
    
    # Corner brackets (Tactical HUD)
    bracket_len = min(28, min(width, height) // 8)
    for cx, cy in [(14, 14), (width - 14, 14), (14, height - 14), (width - 14, height - 14)]:
        dx = 1 if cx == 14 else -1
        dy = 1 if cy == 14 else -1
        draw.line([(cx, cy), (cx + dx * bracket_len, cy)], fill=AMBER_COLOR, width=3)
        draw.line([(cx, cy), (cx, cy + dy * bracket_len)], fill=AMBER_COLOR, width=3)
        
    return canvas

def draw_text_with_shadow(draw, position, text, font, fill, shadow_fill=(0, 0, 0, 200), offset=(2, 2)):
    x, y = position
    sx, sy = offset
    draw.text((x + sx, y + sy), text, font=font, fill=shadow_fill)
    draw.text((x, y), text, font=font, fill=fill)

def make_header_capsule():
    # 920x430 px
    w, h = 920, 430
    canvas = create_base_canvas(w, h)
    
    # Helmet right-aligned
    h_size = 390
    scaled_helmet = helmet_crop.resize((h_size, h_size), Image.Resampling.LANCZOS)
    canvas.paste(scaled_helmet, (w - h_size - 25, (h - h_size) // 2 + 5), scaled_helmet)
    
    draw = ImageDraw.Draw(canvas)
    
    font_badge = get_font(13, bold=True)
    font_title = get_font(38, bold=True)
    font_sub = get_font(22, bold=True)
    font_meta = get_font(15, bold=False)
    font_badge_txt = get_font(16, bold=True)
    
    # Tech Tag
    draw.rectangle([40, 45, 260, 72], outline=AMBER_COLOR, width=2)
    draw.text((50, 51), "[ SYSTEM // SOUNDTRACK ]", font=font_badge, fill=AMBER_COLOR)
    
    # Main Title & Subtitle
    draw_text_with_shadow(draw, (40, 92), "HUNKER BUNKER", font_title, WHITE)
    draw_text_with_shadow(draw, (40, 142), "ORIGINAL GAME SOUNDTRACK", font_sub, AMBER_COLOR)
    
    # Credits & info
    draw.text((40, 200), "COMPOSED BY GOVERNMENT NAME", font=font_meta, fill=WHITE)
    draw.text((40, 230), "5 Official Tracks | Industrial Ambient & Chiptune", font=font_meta, fill=MUTED_GRAY)
    
    # Free DLC Pill
    draw.rectangle([40, 310, 260, 360], fill=(220, 140, 20, 255))
    draw.text((56, 324), "FREE SOUNDTRACK DLC", font=font_badge_txt, fill=(10, 10, 10, 255))
    
    out_path = os.path.join(out_dir, "header_capsule_920x430.png")
    canvas.convert("RGB").save(out_path, quality=95)
    print("Saved:", out_path)

def make_small_capsule():
    # 462x174 px
    w, h = 462, 174
    canvas = create_base_canvas(w, h)
    
    # Helmet on right
    h_size = 155
    scaled_helmet = helmet_crop.resize((h_size, h_size), Image.Resampling.LANCZOS)
    canvas.paste(scaled_helmet, (w - h_size - 10, (h - h_size) // 2), scaled_helmet)
    
    draw = ImageDraw.Draw(canvas)
    font_title = get_font(21, bold=True)
    font_sub = get_font(13, bold=True)
    font_badge = get_font(12, bold=True)
    
    draw_text_with_shadow(draw, (20, 22), "HUNKER BUNKER", font_title, WHITE)
    draw_text_with_shadow(draw, (20, 52), "SOUNDTRACK", font_sub, AMBER_COLOR)
    
    draw.rectangle([20, 110, 150, 145], fill=(220, 140, 20, 255))
    draw.text((32, 120), "FREE DLC", font=font_badge, fill=(10, 10, 10, 255))
    
    out_path = os.path.join(out_dir, "small_capsule_462x174.png")
    canvas.convert("RGB").save(out_path, quality=95)
    print("Saved:", out_path)

def make_main_capsule():
    # 1232x706 px
    w, h = 1232, 706
    canvas = create_base_canvas(w, h)
    
    # Helmet right
    h_size = 640
    scaled_helmet = helmet_crop.resize((h_size, h_size), Image.Resampling.LANCZOS)
    canvas.paste(scaled_helmet, (w - h_size - 30, (h - h_size) // 2 + 10), scaled_helmet)
    
    draw = ImageDraw.Draw(canvas)
    
    font_badge = get_font(18, bold=True)
    font_title = get_font(56, bold=True)
    font_sub = get_font(30, bold=True)
    font_meta = get_font(22, bold=False)
    font_track_head = get_font(18, bold=True)
    font_track = get_font(17, bold=False)
    font_pill = get_font(22, bold=True)
    
    # Badge
    draw.rectangle([60, 65, 380, 105], outline=AMBER_COLOR, width=2)
    draw.text((75, 74), "[ OFFICIAL SOUNDTRACK ]", font=font_badge, fill=AMBER_COLOR)
    
    draw_text_with_shadow(draw, (60, 130), "HUNKER BUNKER", font_title, WHITE, offset=(3, 3))
    draw_text_with_shadow(draw, (60, 205), "ORIGINAL GAME SOUNDTRACK", font_sub, AMBER_COLOR, offset=(3, 3))
    draw.text((60, 260), "COMPOSED BY GOVERNMENT NAME", font=font_meta, fill=WHITE)
    
    # Tracklist Panel
    draw.rectangle([60, 330, 540, 540], outline=(70, 58, 38, 255), fill=(18, 16, 14, 220))
    draw.text((80, 345), "INCLUDED TRACKS:", font=font_track_head, fill=AMBER_COLOR)
    
    tracks = [
        "01. Hunker Bunker Main Theme",
        "02. Safe Haven (Ship Sanctuary)",
        "03. Glacial Depths (Cryo Biome)",
        "04. Overgrown Bio-Sphere (Bio Biome)",
        "05. Under Siege (Combat Alert)"
    ]
    for i, t in enumerate(tracks):
        draw.text((80, 380 + i * 29), t, font=font_track, fill=(220, 220, 220, 255))
        
    draw.rectangle([60, 585, 340, 645], fill=(220, 140, 20, 255))
    draw.text((82, 604), "FREE DLC WITH GAME", font=font_pill, fill=(10, 10, 10, 255))
    
    out_path = os.path.join(out_dir, "main_capsule_1232x706.png")
    canvas.convert("RGB").save(out_path, quality=95)
    print("Saved:", out_path)

def make_vertical_capsule():
    # 748x896 px
    w, h = 748, 896
    canvas = create_base_canvas(w, h)
    
    # Helmet centered upper region
    h_size = 560
    scaled_helmet = helmet_crop.resize((h_size, h_size), Image.Resampling.LANCZOS)
    canvas.paste(scaled_helmet, ((w - h_size) // 2, 40), scaled_helmet)
    
    draw = ImageDraw.Draw(canvas)
    
    font_title = get_font(44, bold=True)
    font_sub = get_font(24, bold=True)
    font_meta = get_font(20, bold=False)
    font_pill = get_font(22, bold=True)
    
    draw_text_with_shadow(draw, (180, 610), "HUNKER BUNKER", font_title, WHITE, offset=(3, 3))
    draw_text_with_shadow(draw, (140, 670), "ORIGINAL GAME SOUNDTRACK", font_sub, AMBER_COLOR, offset=(2, 2))
    draw.text((200, 720), "COMPOSED BY GOVERNMENT NAME", font=font_meta, fill=WHITE)
    
    draw.rectangle([210, 785, 530, 845], fill=(220, 140, 20, 255))
    draw.text((238, 804), "FREE SOUNDTRACK DLC", font=font_pill, fill=(10, 10, 10, 255))
    
    out_path = os.path.join(out_dir, "vertical_capsule_748x896.png")
    canvas.convert("RGB").save(out_path, quality=95)
    print("Saved:", out_path)

if __name__ == "__main__":
    make_header_capsule()
    make_small_capsule()
    make_main_capsule()
    make_vertical_capsule()
