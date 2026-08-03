"""Generate 15 dedicated interstitial PNG assets for RGB mini-game story beats.

Output format: 1280x800, 16:10 logical stage fit.
Style: Graphic realism, high contrast, screen-printed texture, dark charcoal/gray palette, sharp digital red.

Run with:
    python3 scripts/generate-rgb-interstitial-assets.py
"""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

BASE_DIR = Path("public/minigames/rgb/interstitials")
WIDTH = 1280
HEIGHT = 800

# Color Palette
BG_DARK = (18, 20, 24)
BG_MID = (32, 36, 42)
INK_LIGHT = (235, 235, 230)
INK_DIM = (140, 145, 150)
RED_ALERT = (225, 29, 46)
AMBER_FIRE = (235, 120, 20)
GRID_LINE = (45, 50, 58)

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

def draw_base_frame(title_text, subtitle_text, red_accent=True):
    img = Image.new("RGB", (WIDTH, HEIGHT), BG_DARK)
    d = ImageDraw.Draw(img)
    
    # Outer frame & subtle grid
    d.rectangle([20, 20, WIDTH - 20, HEIGHT - 20], outline=GRID_LINE, width=3)
    for x in range(80, WIDTH, 120):
        d.line([x, 20, x, HEIGHT - 20], fill=(26, 30, 36), width=1)
    for y in range(80, HEIGHT, 100):
        d.line([20, y, WIDTH - 20, y], fill=(26, 30, 36), width=1)
        
    # Header bar
    accent = RED_ALERT if red_accent else AMBER_FIRE
    d.rectangle([40, 40, WIDTH - 40, 95], fill=BG_MID, outline=GRID_LINE, width=2)
    d.rectangle([40, 40, 52, 95], fill=accent)
    
    font_header = load_font(24, bold=True)
    font_sub = load_font(18, bold=False)
    d.text((68, 48), title_text.upper(), font=font_header, fill=INK_LIGHT)
    d.text((68, 73), subtitle_text.upper(), font=font_sub, fill=INK_DIM)
    
    return img, d

# Individual Asset Builders
def build_c1_marisol(path):
    img, d = draw_base_frame("CHAPTER 1 // INTAKE", "MARISOL — WORKPLACE ENTRANCE")
    # Gate & silhouette
    d.rectangle([100, 160, 500, 720], fill=BG_MID, outline=GRID_LINE, width=4)
    # Chainlink fence pattern
    for i in range(120, 480, 40):
        d.line([i, 160, i + 80, 720], fill=GRID_LINE, width=2)
        d.line([i + 80, 160, i, 720], fill=GRID_LINE, width=2)
    # Character figure
    d.ellipse([640, 220, 840, 420], outline=INK_LIGHT, width=6) # head/vest outline
    d.polygon([(560, 720), (640, 420), (840, 420), (920, 720)], fill=BG_MID, outline=INK_LIGHT)
    d.rectangle([680, 460, 800, 540], fill=RED_ALERT) # temp contractor badge
    font = load_font(20, bold=True)
    d.text((695, 490), "SHIFT IN", font=font, fill=INK_LIGHT)
    img.save(path)

def build_c1_turnstile(path):
    img, d = draw_base_frame("CHAPTER 1 // INTAKE", "TEMP CONTRACTOR TURNSTILE SCAN")
    d.rectangle([200, 180, 600, 720], fill=BG_MID, outline=INK_LIGHT, width=6)
    # Badge Reader glowing red
    d.rectangle([660, 260, 1080, 540], fill=(50, 10, 15), outline=RED_ALERT, width=8)
    d.rectangle([680, 280, 1060, 520], fill=RED_ALERT)
    font_bold = load_font(36, bold=True)
    font_sub = load_font(22, bold=True)
    d.text((710, 340), "ACCESS GRANTED", font=font_bold, fill=INK_LIGHT)
    d.text((710, 410), "MORALES, ELIAS // TEMP #9042", font=font_sub, fill=INK_LIGHT)
    img.save(path)

def build_c2_notebook(path):
    img, d = draw_base_frame("CHAPTER 2 // CALIBRATION", "TECHNICAL NOTEBOOK — JOINT 3 SKETCH")
    d.rectangle([140, 150, 1140, 730], fill=(230, 228, 215), outline=GRID_LINE, width=4)
    # Spine
    d.line([640, 150, 640, 730], fill=(160, 155, 140), width=6)
    # Diagram lines
    d_ink = ImageDraw.Draw(img)
    font_hand = load_font(26, bold=True)
    d_ink.ellipse([240, 240, 480, 480], outline=(30, 30, 30), width=6)
    d_ink.line([360, 360, 540, 360], fill=(30, 30, 30), width=6)
    d_ink.text((200, 530), "NOT HARDER. SMARTER.", font=font_hand, fill=(180, 20, 30))
    d_ink.text((200, 580), "DOUBLE TAP = RELEASE / RECENTER", font=font_hand, fill=(30, 30, 30))
    d_ink.text((700, 240), "JOINT 3 HYDRAULIC OFFSET", font=font_hand, fill=(30, 30, 30))
    d_ink.text((700, 300), "- SHIFT 2 INCHES LEFT", font=font_hand, fill=(30, 30, 30))
    d_ink.text((700, 350), "- APPLY LIGHT PRESSURE", font=font_hand, fill=(30, 30, 30))
    img.save(path)

def build_c2_joint(path):
    img, d = draw_base_frame("CHAPTER 2 // CALIBRATION", "ROBOT 4A — JOINT 3 MAINTENANCE")
    # Industrial robot arm joint close-up
    d.ellipse([440, 200, 840, 600], fill=BG_MID, outline=INK_LIGHT, width=8)
    d.ellipse([520, 280, 760, 520], fill=BG_DARK, outline=RED_ALERT, width=6)
    d.line([640, 200, 640, 600], fill=RED_ALERT, width=4)
    d.line([440, 400, 840, 400], fill=RED_ALERT, width=4)
    font = load_font(28, bold=True)
    d.text((475, 640), "PRESSURE POINT // 2 INCH OFFSET", font=font, fill=INK_LIGHT)
    img.save(path)

def build_c2_metric(path):
    img, d = draw_base_frame("CHAPTER 2 // CALIBRATION", "TERMINAL METRIC — CLEAR ERROR LOG")
    d.rectangle([160, 160, 1120, 720], fill=BG_MID, outline=INK_LIGHT, width=4)
    d.rectangle([200, 200, 1080, 680], fill=(12, 14, 18), outline=GRID_LINE, width=2)
    font_lg = load_font(34, bold=True)
    font_med = load_font(24, bold=True)
    d.text((240, 260), "SORT METRIC: 100% ACCURACY", font=font_lg, fill=INK_LIGHT)
    d.line([240, 320, 1040, 320], fill=RED_ALERT, width=4)
    d.text((240, 360), "[BADGE OVERRIDE DETECTED]", font=font_med, fill=RED_ALERT)
    d.text((240, 420), "VARIANCE RECORD CLEARED BY MORALES, E.", font=font_med, fill=INK_LIGHT)
    img.save(path)

def build_c3_impact(path):
    img, d = draw_base_frame("CHAPTER 3 // INCIDENT REVIEW", "IMPACT MOMENT — 4A PATH DEVIATION")
    # Dynamic sharp hazard lines
    d.polygon([(100, 720), (450, 200), (600, 200), (250, 720)], fill=BG_MID, outline=INK_LIGHT)
    d.polygon([(650, 160), (1150, 500), (1050, 650), (550, 310)], fill=RED_ALERT)
    font_lg = load_font(42, bold=True)
    d.text((200, 400), "UNPROGRAMMED STRIKE", font=font_lg, fill=INK_LIGHT)
    d.text((200, 460), "LOCATION: LINE 4A // 18:42 PM", font=load_font(24, bold=True), fill=INK_DIM)
    img.save(path)

def build_c3_swab(path):
    img, d = draw_base_frame("CHAPTER 3 // INCIDENT REVIEW", "COMPULSORY MEDICAL SWAB READER")
    d.rectangle([240, 180, 1040, 700], fill=BG_MID, outline=INK_LIGHT, width=6)
    d.rectangle([300, 240, 980, 500], fill=(40, 8, 12), outline=RED_ALERT, width=6)
    font_xl = load_font(44, bold=True)
    font_sub = load_font(24, bold=True)
    d.text((360, 310), "STATUS: INCONCLUSIVE", font=font_xl, fill=RED_ALERT)
    d.text((360, 390), "SUBSTANCE SCREEN CANNOT CLEAR TECHNICIAN", font=font_sub, fill=INK_LIGHT)
    d.text((300, 560), "SAMPLE ID: #9042-SWAB-01", font=font_sub, fill=INK_DIM)
    img.save(path)

def build_c3_phone_snap(path):
    img, d = draw_base_frame("CHAPTER 3 // INCIDENT REVIEW", "EVIDENCE PHOTO — LAPTOP & SWAB READER")
    # Viewfinder border
    d.rectangle([140, 150, 1140, 730], outline=RED_ALERT, width=4)
    d.line([140, 200, 200, 200], fill=RED_ALERT, width=6)
    d.line([140, 200, 140, 260], fill=RED_ALERT, width=6)
    font = load_font(28, bold=True)
    d.text((180, 180), "EVIDENCE RECORD SAVED // PHONE MEMORY", font=font, fill=INK_LIGHT)
    d.rectangle([200, 280, 600, 650], fill=BG_MID, outline=INK_LIGHT, width=4)
    d.rectangle([660, 280, 1080, 650], fill=BG_MID, outline=RED_ALERT, width=4)
    d.text((240, 440), "LAPTOP FOOTAGE", font=font, fill=INK_LIGHT)
    d.text((700, 440), "SWAB RESULT", font=font, fill=RED_ALERT)
    img.save(path)

def build_c3_hr_reach(path):
    img, d = draw_base_frame("CHAPTER 3 // INCIDENT REVIEW", "HR DESK — NOTEBOOK RETENTION REACH")
    d.rectangle([100, 500, 1180, 740], fill=BG_MID, outline=INK_LIGHT, width=4) # Desk
    d.rectangle([300, 340, 580, 540], fill=(20, 20, 20), outline=INK_LIGHT, width=4) # Notebook
    font = load_font(26, bold=True)
    d.text((320, 420), "CALIBRATION\nNOTEBOOK", font=font, fill=INK_LIGHT)
    # Hand reaching
    d.polygon([(1080, 360), (700, 440), (720, 500), (1080, 460)], fill=RED_ALERT)
    d.text((740, 390), "HR RETENTION REACH", font=font, fill=INK_LIGHT)
    img.save(path)

def build_c4_paycheck(path):
    img, d = draw_base_frame("CHAPTER 4 // MEDI-KIOSK", "PAYCHECK DEDUCTIONS ITEMIZATION")
    d.rectangle([180, 150, 1100, 730], fill=BG_MID, outline=INK_LIGHT, width=4)
    font_title = load_font(32, bold=True)
    font_row = load_font(22, bold=True)
    d.text((220, 200), "FINAL PAYSTUB // MORALES, E.", font=font_title, fill=INK_LIGHT)
    d.line([220, 250, 1060, 250], fill=GRID_LINE, width=3)
    
    rows = [
        ("BASE PAY (40 HRS @ $16.50)", "$660.00", INK_LIGHT),
        ("PRODUCTIVITY VARIANCE PENALTY", "-$346.00", RED_ALERT),
        ("EQUIPMENT DELAY DEDUCTION", "-$300.00", RED_ALERT),
        ("NET DISBURSEMENT", "$14.00", INK_LIGHT),
    ]
    y = 300
    for label, val, color in rows:
        d.text((220, y), label, font=font_row, fill=color)
        d.text((940, y), val, font=font_row, fill=color)
        y += 70
    img.save(path)

def build_c4_bag_3inch(path):
    img, d = draw_base_frame("CHAPTER 4 // MEDI-KIOSK", "DISPENSER ARM — LUCIA'S PRESCRIPTION BAG")
    # Glass barrier
    d.rectangle([100, 150, 1180, 730], fill=(20, 24, 30), outline=INK_LIGHT, width=8)
    d.line([640, 150, 640, 730], fill=RED_ALERT, width=4)
    # Medicine bag behind glass
    d.rectangle([720, 300, 1020, 600], fill=(240, 240, 235), outline=GRID_LINE, width=4)
    font = load_font(28, bold=True)
    d.text((740, 420), "LUCIA MORALES\nALBUTEROL", font=font, fill=(30, 30, 30))
    d.text((200, 420), "REINFORCED GLASS\nGAP: 3 INCHES", font=font, fill=RED_ALERT)
    img.save(path)

def build_c4_utility_map(path):
    img, d = draw_base_frame("CHAPTER 4 // MEDI-KIOSK", "CALIBRATION NOTEBOOK — UTILITY CONDUIT MAP")
    d.rectangle([160, 150, 1120, 730], fill=(230, 228, 215), outline=GRID_LINE, width=4)
    font = load_font(26, bold=True)
    d.text((220, 200), "REAR CONDUIT ACCESS // SERVER BASEMENT", font=font, fill=(30, 30, 30))
    # Hand drawn map lines
    d.line([240, 320, 500, 320], fill=(180, 20, 30), width=6)
    d.line([500, 320, 500, 580], fill=(180, 20, 30), width=6)
    d.line([500, 580, 950, 580], fill=(180, 20, 30), width=6)
    d.text((540, 400), "PHARMACY KIOSK", font=font, fill=(30, 30, 30))
    d.text((700, 620), "SERVER ROOM ACCESS", font=font, fill=(180, 20, 30))
    img.save(path)

def build_c5_wire_cutters(path):
    img, d = draw_base_frame("CHAPTER 5 // SERVER ROOM", "PRIMARY DATA TRUNK — INSULATED CUTTERS")
    d.rectangle([100, 480, 1180, 640], fill=BG_MID, outline=INK_LIGHT, width=8) # Trunk
    font = load_font(32, bold=True)
    d.text((140, 540), "PRIMARY DATA TRUNK // SORT_ARM_4A MODEL", font=font, fill=INK_LIGHT)
    # Cutters outline
    d.line([640, 200, 640, 540], fill=RED_ALERT, width=16)
    d.text((680, 260), "INSULATED CUTTERS CLAMPED", font=font, fill=RED_ALERT)
    img.save(path)

def build_c5_battery(path):
    img, d = draw_base_frame("CHAPTER 5 // SERVER ROOM", "NONCOMPLIANT LITHIUM BATTERY STAGING")
    d.rectangle([200, 220, 1080, 680], fill=BG_MID, outline=AMBER_FIRE, width=6)
    font_lg = load_font(36, bold=True)
    font_med = load_font(24, bold=True)
    d.text((260, 280), "STAGED PALLET: LITHIUM CELLS + DRY CARDBOARD", font=font_lg, fill=AMBER_FIRE)
    d.text((260, 360), "SAFETY CLEARANCE: 0 FEET (VIOLATION)", font=font_med, fill=RED_ALERT)
    d.text((260, 420), "FLAMMABILITY HAZARD NEAR PRIMARY DATA CABLE", font=font_med, fill=INK_LIGHT)
    img.save(path)

def build_c6_alarm(path):
    img, d = draw_base_frame("CHAPTER 6 // SECTOR 4", "MANUAL FIRE ALARM PULL STATION", red_accent=False)
    d.rectangle([440, 180, 840, 680], fill=BG_MID, outline=RED_ALERT, width=8)
    d.rectangle([500, 360, 780, 600], fill=RED_ALERT)
    font_lg = load_font(36, bold=True)
    font_med = load_font(22, bold=True)
    d.text((540, 240), "FIRE ALARM", font=font_lg, fill=INK_LIGHT)
    d.text((560, 460), "PULL DOWN", font=font_lg, fill=INK_LIGHT)
    d.text((470, 710), "LOCKDOWN STROBES ACTIVE", font=font_med, fill=AMBER_FIRE)
    img.save(path)

BUILDERS = {
    "c1/img_c1_marisol_intake.png": build_c1_marisol,
    "c1/img_c1_badge_turnstile.png": build_c1_turnstile,
    "c2/img_c2_notebook_diagram.png": build_c2_notebook,
    "c2/img_c2_joint_focus.png": build_c2_joint,
    "c2/img_c2_terminal_metric_wipe.png": build_c2_metric,
    "c3/img_c3_collision_impact.png": build_c3_impact,
    "c3/img_c3_swab_reader.png": build_c3_swab,
    "c3/img_c3_phone_snap_evidence.png": build_c3_phone_snap,
    "c3/img_c3_hr_hand_reach.png": build_c3_hr_reach,
    "c4/img_c4_paycheck_stub.png": build_c4_paycheck,
    "c4/img_c4_medicine_bag_3inch.png": build_c4_bag_3inch,
    "c4/img_c4_utility_map_spread.png": build_c4_utility_map,
    "c5/img_c5_wire_cutter_trunk.png": build_c5_wire_cutters,
    "c5/img_c5_battery_pallet.png": build_c5_battery,
    "c6/img_c6_fire_alarm_pull.png": build_c6_alarm,
}

if __name__ == "__main__":
    for rel_path, builder in BUILDERS.items():
        out_path = BASE_DIR / rel_path
        out_path.parent.mkdir(parents=True, exist_ok=True)
        builder(out_path)
        print(f"Wrote interstitial asset: {out_path}")
