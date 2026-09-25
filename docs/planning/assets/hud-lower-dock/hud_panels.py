# Three-panel band: exact slot map (in HUD units, 1u = 1px at 1920x1080) and a
# reference board cropped from the Gemini concept renders.
# Run: python3 docs/planning/assets/hud-lower-dock/hud_panels.py
import os
import textwrap
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
G = '/home/caveman/.gemini/antigravity-ide/brain/6b5e702e-68fa-42ea-af35-e9deb290dda4'

def font(size, bold=True):
    name = 'DejaVuSansMono-Bold.ttf' if bold else 'DejaVuSansMono.ttf'
    try: return ImageFont.truetype(f'/usr/share/fonts/truetype/dejavu/{name}', size)
    except OSError: return ImageFont.load_default()

BAND_H = 64
PANELS = {
    'LEFT — MAP': dict(w=220, color=(0, 214, 255), slots=[
        ('radar disc (minimap, heading, blips)', 4, 4, 56, 56, '#desktop-compass + #hud-blueprint-canvas'),
        ('scan ring', 0, 0, 64, 64, '#radar-scan-panel cooldown as a ring round the disc'),
        ('BASE 12u ↗', 72, 8, 140, 14, '#desktop-compass-distance'),
        ('NODE 112u', 72, 26, 140, 14, '#desktop-compass-radar-distance'),
        ('[M]/Ⓓ↑  [Q] scan', 72, 44, 140, 14, 'live glyphs'),
    ]),
    'CENTRE — HEALTH & STATUS': dict(w=520, color=(80, 255, 160), slots=[
        ('lamp row (housing): SUIT O₂ HULL THERM TOX', 150, -10, 220, 8, 'physical lamps on the top bezel'),
        ('hearts ♥♥♥ (1–6)', 12, 6, 170, 22, '#vitals-hearts'),
        ('status icons: ❄ cold · ☣ toxin · ⛓ corrode · ☠ infection · fatigue · cover', 190, 6, 150, 22, 'hazard/status/fatigue/cover (only active ones)'),
        ('O₂  ▰▰▰▰▰▰▱  88%', 12, 32, 328, 12, '#vitals-o2-bar + #vitals-o2-pct'),
        ('HULL ▰▰▰▰▱ 82%', 12, 48, 328, 8, '#ship-status-panel'),
        ('infection gauge (Act 2 only)', 348, 6, 12, 50, 'act2 infectionLoad 0–100'),
        ('✚ MED  ⬢ TECH', 368, 8, 144, 22, '#pickup-count-health / -weapon'),
        ('◎ COIN  ✪ SHELL', 368, 34, 144, 22, '#pickup-count-coin / -shells'),
    ]),
    'RIGHT — GUN & AMMO': dict(w=380, color=(255, 150, 40), slots=[
        ('weapon silhouette window', 6, 6, 120, 52, 'equipped weapon icon (Armory art)'),
        ('SIDEARM', 134, 4, 110, 12, 'weapon name'),
        ('06 / 18', 134, 16, 110, 28, '#weapon-clip-current / -max'),
        ('cache 42/60 + reload arc', 134, 46, 110, 12, '#weapon-ammo-cache + #weapon-reload-bar'),
        ('[F] class ability', 252, 6, 60, 52, '#class-ability-panel'),
        ('[V]/[Space] melee·dash', 316, 6, 58, 52, 'cooldown pips'),
    ]),
}

def slot_map(scale=3, deck=False):
    u = 0.8 if deck else 1.0
    gap = 12
    total_w = sum(p['w'] for p in PANELS.values()) + 2 * gap
    W = int((total_w + 80) * scale)
    H = int((BAND_H + 240) * scale)
    img = Image.new('RGB', (W, H), (10, 13, 18))
    d = ImageDraw.Draw(img)
    f = font(int(4.2 * scale)); fs = font(int(3.2 * scale), bold=False); ft = font(int(6 * scale))
    title = 'THREE-PANEL BAND — slot map (u = 1px @1080p; Deck ×0.8 → 51px tall)'
    d.text((20 * scale, 12 * scale), title, font=ft, fill=(235, 235, 235))
    d.text((20 * scale, 24 * scale), 'Same geometry for every class. Housing art (frame, bezel, lamps) differs per class and reacts; everything drawn here is the live UI layer.', font=fs, fill=(170, 180, 190))
    x = 40
    y0 = 84
    for name, p in PANELS.items():
        c = p['color']
        px0, py0 = x * scale, y0 * scale
        px1, py1 = (x + p['w']) * scale, (y0 + BAND_H) * scale
        # housing (margin) and glass (content)
        d.rectangle((px0 - 6 * scale, py0 - 14 * scale, px1 + 6 * scale, py1 + 6 * scale), fill=(26, 30, 36), outline=(70, 76, 86), width=scale)
        d.rectangle((px0, py0, px1, py1), fill=(6, 12, 16), outline=c, width=scale)
        d.text((px0, py0 - 40 * scale), name, font=ft, fill=c)
        d.text((px0, py0 - 28 * scale), f"{p['w']} × {BAND_H} u   (Deck {round(p['w'] * 0.8)} × {round(BAND_H * 0.8)} px)", font=fs, fill=(170, 180, 190))
        notes = []
        for i, (label, sx, sy, sw, sh, src) in enumerate(p['slots']):
            b = ((x + sx) * scale, (y0 + sy) * scale, (x + sx + sw) * scale, (y0 + sy + sh) * scale)
            if label == 'scan ring':
                d.ellipse(b, outline=(0, 160, 200), width=scale)
                notes.append((i + 1, label, src)); continue
            if 'radar disc' in label:
                d.ellipse(b, fill=(0, 40, 50), outline=c, width=scale)
            else:
                d.rectangle(b, fill=tuple(int(v * 0.18) for v in c), outline=c, width=max(1, scale // 2))
            d.text((b[0] + 1.5 * scale, b[1] + 0.8 * scale), f"{i + 1}", font=f, fill=(255, 255, 255))
            notes.append((i + 1, label, src))
        ny = (y0 + BAND_H + 18) * scale
        for n, label, src in notes:
            d.text((px0, ny), f"{n}. {label}", font=f, fill=(230, 230, 230)); ny += 6 * scale
            d.text((px0 + 4 * scale, ny), src, font=fs, fill=tuple(int(v * 0.8) for v in c)); ny += 6.5 * scale
        x += p['w'] + gap
    out = os.path.join(HERE, 'three-panel-slot-map.png')
    img.save(out)
    return out

def reference_board():
    crops = [
        ('ui_class_chassis_tank_1790355769678.jpg', (0, 415, 340, 768), 'TANK · radar module', 'KEEP: round armoured bezel, amber glass, bolts, chevrons. DROP: text, unit legend.'),
        ('ui_class_chassis_tank_1790355769678.jpg', (455, 352, 925, 420), 'TANK · top bezel lamps', 'KEEP: beacon lamps + toggles = status-lamp row.'),
        ('ui_class_chassis_tank_1790355769678.jpg', (1040, 415, 1376, 768), 'TANK · weapon dock', 'KEEP: plate, hazard stripes, weapon window. DROP: baked gun art/text.'),
        ('ui_class_chassis_scout_1790355823336.jpg', (35, 455, 475, 705), 'SCOUT · radar screen', 'KEEP: slim angular dark bezel, cyan glass. DROP: second map pane, text.'),
        ('ui_class_chassis_scout_1790355823336.jpg', (495, 455, 860, 700), 'SCOUT · centre module', 'KEEP: side light-bars, thin frame. DROP: invented stats (thrusters, shields).'),
        ('ui_class_chassis_scout_1790355823336.jpg', (900, 455, 1340, 725), 'SCOUT · weapon screen', 'KEEP: frame. DROP: tabs (inventory/skills/log).'),
        ('ui_class_chassis_engineer_1790355885039.jpg', (55, 430, 480, 700), 'ENGINEER · left meters', 'KEEP: heat-sink fins, copper conduit, gauge bezels. DROP: text.'),
        ('ui_class_chassis_engineer_1790355885039.jpg', (485, 470, 545, 650), 'ENGINEER · LED column', 'KEEP: diagnostic LEDs = status lamps.'),
        ('ui_class_chassis_engineer_1790355885039.jpg', (900, 470, 1345, 705), 'ENGINEER · tool dock', 'KEEP: conduit-wrapped dock plate. DROP: baked tools/text.'),
        ('ui_chassis_tank_frozen_1790356145980.jpg', (300, 205, 700, 520), 'FREEZE · ice on bolts', 'KEEP: icicles on bolts, frost crust, ice-web on glass. DROP: tank vehicle/treads.'),
        ('hud_state_freezing_1790355306499.jpg', (0, 470, 700, 700), 'FREEZE · frosted bezel edge', 'KEEP: icicle lip, frosted bars. DROP: turns/AP, MOVE/ATTACK.'),
        ('hud_state_damaged_1790355479912.jpg', (365, 480, 920, 700), 'DAMAGE · cracked glass + sparks', 'KEEP: crack webs, sparks, red beacons. DROP: first-person windshield.'),
        ('hud_state_damaged_1790355479912.jpg', (1070, 585, 1210, 700), 'DAMAGE · repair plate', 'KEEP: "REPAIR REQUIRED" plate idea (localised, not baked).'),
        ('operator_doom_face_states_1790355514232.jpg', (40, 200, 1340, 600), 'PORTRAITS (dialogue / transmission only)', 'KEEP: state progression nominal → strained → critical → frozen. Not in the band.'),
    ]
    tw = 430
    cols = 3
    rows = []
    for fname, box, title, note in crops:
        im = Image.open(os.path.join(G, fname)).crop(box)
        scale = tw / im.width if im.width > tw else 1
        if 'PORTRAITS' in title:
            scale = (tw * 3 + 20) / im.width
        im = im.resize((int(im.width * scale), int(im.height * scale)))
        rows.append((im, title, note))
    # layout: portraits full width at the end
    pad = 20
    f = font(18); fs = font(14, bold=False)
    x = y = pad
    W = cols * tw + (cols + 1) * pad
    placed = []
    rowh = 0
    for im, title, note in rows:
        if 'PORTRAITS' in title:
            if x > pad:
                y += rowh + 96; x = pad; rowh = 0
            placed.append((im, title, note, x, y)); y += im.height + 96; x = pad; rowh = 0
            continue
        if x + tw > W:
            y += rowh + 96; x = pad; rowh = 0
        placed.append((im, title, note, x, y))
        rowh = max(rowh, im.height)
        x += tw + pad
    H = y + (rowh + 96 if x > pad else 0) + pad
    board = Image.new('RGB', (W, H + 60), (12, 14, 18))
    d = ImageDraw.Draw(board)
    d.text((pad, 8), 'REFERENCE BOARD — crops from the Gemini renders. Housing material only; every screen is left BLANK for the live UI.', font=f, fill=(235, 235, 235))
    for im, title, note, px, py in placed:
        board.paste(im, (px, py + 40))
        d.text((px, py + 44 + im.height), title, font=f, fill=(255, 200, 90))
        wrap = 150 if im.width > tw + pad else 50
        d.multiline_text((px, py + 66 + im.height), textwrap.fill(note, wrap), font=fs, fill=(190, 200, 210), spacing=2)
    out = os.path.join(HERE, 'reference-board.jpg')
    board.save(out, quality=90)
    return out

if __name__ == '__main__':
    print(slot_map())
    print(reference_board())
