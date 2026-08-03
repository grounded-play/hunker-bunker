import os
from PIL import Image, ImageDraw, ImageFont

out_dir = os.path.join("steam", "store", "soundtrack")
os.makedirs(out_dir, exist_ok=True)

cover_path = os.path.join("dist_soundtrack", "cover.png")
cover_img = Image.open(cover_path).convert("RGBA")

def get_font(size, bold=True):
    font_path = "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"
    if not os.path.exists(font_path):
        font_path = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
    try:
        return ImageFont.truetype(font_path, size)
    except Exception:
        return ImageFont.load_default()

def make_primary_album_cover():
    # Resize to exact 1000x1000 JPG requirement
    res = cover_img.resize((1000, 1000), Image.Resampling.LANCZOS)
    out_path = os.path.join(out_dir, "album_cover_1000x1000.jpg")
    res.convert("RGB").save(out_path, "JPEG", quality=98)
    print("Saved Primary Album Cover:", out_path)

def make_additional_liner_notes():
    # 1000x1000 Additional Art (Liner Notes / Booklet Page)
    w, h = 1000, 1000
    canvas = Image.new("RGBA", (w, h), (12, 12, 12, 255))
    draw = ImageDraw.Draw(canvas)
    
    # Outer Frame
    draw.rectangle([20, 20, w - 21, h - 21], outline=(255, 175, 40, 255), width=2)
    draw.rectangle([26, 26, w - 27, h - 27], outline=(40, 32, 20, 255), width=1)
    
    # Corner HUD
    for cx, cy in [(32, 32), (w - 32, 32), (32, h - 32), (w - 32, h - 32)]:
        dx = 1 if cx == 32 else -1
        dy = 1 if cy == 32 else -1
        draw.line([(cx, cy), (cx + dx * 30, cy)], fill=(255, 175, 40, 255), width=3)
        draw.line([(cx, cy), (cx, cy + dy * 30)], fill=(255, 175, 40, 255), width=3)
        
    draw.text((60, 60), "HUNKER BUNKER — OFFICIAL LINER NOTES", font=get_font(28, bold=True), fill=(255, 255, 255, 255))
    draw.text((60, 105), "TRACK DESCRIPTIONS & FIELD AUDIO NOTES", font=get_font(18, bold=True), fill=(255, 175, 40, 255))
    
    notes = [
        ("01. Hunker Bunker Main Theme (04:52)",
         "Primary tactical theme greeting operators at the entrance of the deep bio-vaults.\nLayered heavy analog basslines with resonant low-pass filter sweeps."),
        
        ("02. Safe Haven - Ship Sanctuary (03:12)",
         "Warm ambient sanctuary vibes inside the player's recovery vessel.\nFeatures lush organic synth pads and soothing modular tape delays."),
        
        ("03. Glacial Depths - Cryo Biome (03:48)",
         "Cold, isolating pads echoing through frozen sub-sectors.\nBuilt using metallic FM synthesis and crystalline reverb tails."),
        
        ("04. Overgrown Bio-Sphere - Bio Biome (02:40)",
         "Organic clicks and unsettling synthesizer sweeps inside flora sectors.\nRhythmic granular textures mixed with deep subsurface pulse."),
        
        ("05. Under Siege - Combat Alert (03:28)",
         "Fast-paced tension driving operators during close-quarters encounters.\nHigh-speed chiptune arpeggios over relentless industrial drums.")
    ]
    
    y_pos = 165
    for title, desc in notes:
        draw.rectangle([60, y_pos, w - 60, y_pos + 115], fill=(22, 19, 15, 255), outline=(50, 42, 28, 255))
        draw.text((80, y_pos + 15), title, font=get_font(18, bold=True), fill=(255, 175, 40, 255))
        
        lines = desc.split("\n")
        draw.text((80, y_pos + 48), lines[0], font=get_font(14, bold=False), fill=(220, 220, 220, 255))
        draw.text((80, y_pos + 72), lines[1], font=get_font(13, bold=False), fill=(160, 160, 160, 255))
        
        y_pos += 135
        
    # Credits Footer
    draw.text((60, h - 85), "Composed, Produced & Mixed by: Government Name", font=get_font(16, bold=True), fill=(255, 255, 255, 255))
    draw.text((60, h - 55), "Copyright © 2026 Tuesday Cinema Club. Free DLC Release.", font=get_font(14, bold=False), fill=(150, 150, 150, 255))
    
    out_path = os.path.join(out_dir, "additional_art_liner_notes_1000x1000.jpg")
    canvas.convert("RGB").save(out_path, "JPEG", quality=98)
    print("Saved Additional Art (Liner Notes):", out_path)

if __name__ == "__main__":
    make_primary_album_cover()
    make_additional_liner_notes()
