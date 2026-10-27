import os
import shutil
from PIL import Image, ImageDraw, ImageFont

IN_DIR = "docs/screenshots"
OUT_DIR = "docs/screenshots"
BRAIN_DIR = "/home/caveman/.gemini/antigravity-ide/brain/d5fac86d-4971-45b2-b0c5-12da8afcd847"

# 1. Deck vs PC side-by-side comparison sheet for Fabrication Auto-Mart
deck_img = Image.open(f"{IN_DIR}/deck_fabrication_automart.png")
pc_img = Image.open(f"{IN_DIR}/pc_fabrication_automart.png")

# Target canvas: 2560 x 1440
canvas_w, canvas_h = 2560, 1440
sheet = Image.new("RGB", (canvas_w, canvas_h), (10, 14, 18))
draw = ImageDraw.Draw(sheet)

# Header Banner
draw.rectangle([(0, 0), (canvas_w, 130)], fill=(16, 24, 32))
draw.line([(0, 130), (canvas_w, 130)], fill=(0, 229, 255), width=3)

# Place Deck (scaled to 1180 wide, 1180*800/1280 = 737 tall)
deck_resized = deck_img.resize((1180, 738), Image.Resampling.LANCZOS)
# Place PC (scaled to 1240 wide, 1240*1080/1920 = 697 tall)
pc_resized = pc_img.resize((1240, 698), Image.Resampling.LANCZOS)

# Position Side by Side
sheet.paste(deck_resized, (60, 230))
sheet.paste(pc_resized, (1260, 250))

# Borders
draw.rectangle([(58, 228), (58 + 1184, 228 + 742)], outline=(255, 181, 45), width=2)
draw.rectangle([(1258, 248), (1258 + 1244, 248 + 702)], outline=(0, 229, 255), width=2)

# Sub-panels below
deck_arcade = Image.open(f"{IN_DIR}/deck_blackice_arcade.png").resize((570, 356), Image.Resampling.LANCZOS)
pc_console = Image.open(f"{IN_DIR}/pc_console_kiosk.png").resize((600, 338), Image.Resampling.LANCZOS)
deck_armory = Image.open(f"{IN_DIR}/deck_armory_workbench.png").resize((570, 356), Image.Resampling.LANCZOS)
pc_armory = Image.open(f"{IN_DIR}/pc_armory_workbench.png").resize((600, 338), Image.Resampling.LANCZOS)

sheet.paste(deck_arcade, (60, 1020))
sheet.paste(deck_armory, (670, 1020))
sheet.paste(pc_console, (1260, 1020))
sheet.paste(pc_armory, (1900, 1020))

draw.rectangle([(58, 1018), (632, 1378)], outline=(255, 181, 45), width=1)
draw.rectangle([(668, 1018), (1242, 1378)], outline=(255, 181, 45), width=1)
draw.rectangle([(1258, 1018), (1862, 1360)], outline=(0, 229, 255), width=1)
draw.rectangle([(1898, 1018), (2502, 1360)], outline=(0, 229, 255), width=1)

out_comp = f"{OUT_DIR}/real_ingame_deck_vs_pc_comparison.png"
sheet.save(out_comp, "PNG")
print(f"Saved: {out_comp}")

# Copy to brain dir for embedding
shutil.copy(out_comp, f"{BRAIN_DIR}/real_ingame_deck_vs_pc_comparison.png")
for f in os.listdir(IN_DIR):
    if f.endswith(".png"):
        shutil.copy(f"{IN_DIR}/{f}", f"{BRAIN_DIR}/{f}")

print("All real in-game screenshots copied to artifact directory!")
