# Draws the proposed lower-dock HUD zones on real gameplay captures, computed
# from one spec in HUD units (u). 1u = 1px at 1920x1080; scaled by
# u = clamp(min(W/1920, H/1080), 0.8, 1.3) so the Deck (1280x800) keeps
# legible text (0.8 floor) instead of shrinking to 0.67.
import sys, json
from PIL import Image, ImageDraw, ImageFont

G = '/home/caveman/.gemini/antigravity-ide/brain/6b5e702e-68fa-42ea-af35-e9deb290dda4'
OUT = sys.argv[1] if len(sys.argv) > 1 else 'docs/planning/assets/hud-lower-dock'

def u_for(w, h):
    return max(0.8, min(1.3, min(w / 1920, h / 1080)))

def zones(w, h):
    u = u_for(w, h)
    m = 20 * u                      # screen-edge safe margin
    Z = []
    def box(key, name, x, y, bw, bh, kind, note=''):
        Z.append(dict(key=key, name=name, x=round(x), y=round(y), w=round(bw), h=round(bh), kind=kind, note=note))
    # Bottom band: ONE narrow band, every module the same height (owner,
    # 2026-09-25: "a narrow band so the gameplay isn't hidden"). Identical
    # geometry for every class; only the housing skin changes.
    band_h = 64 * u
    band_y = h - m - band_h
    radar_w = 220 * u
    box('D', 'RADAR', m, band_y, radar_w, band_h, 'permanent', '#desktop-compass (compact)')
    arsenal_w = 380 * u
    box('G', 'ARSENAL + ABILITIES', w - m - arsenal_w, band_y, arsenal_w, band_h, 'permanent', '#weapon-status-panel #class-ability-panel #radar-scan-panel')
    suit_w = 520 * u
    box('E', 'DASHBOARD: VITALS + LOOT', (w - suit_w) / 2, band_y, suit_w, band_h, 'permanent', '#vitals-panel #ship-status-panel #pickup-counter-panel')
    lane_w, lane_h = 520 * u, 40 * u
    box('H', 'PROMPT LANE', (w - lane_w) / 2, band_y - 10 * u - lane_h, lane_w, lane_h, 'contextual', '#loop-step-hud, PRESS-E prompts')
    tgt_w, tgt_h = 340 * u, 72 * u
    box('I', 'TARGET READOUT', w - m - tgt_w, band_y - 10 * u - tgt_h, tgt_w, tgt_h, 'contextual', '#tactical-telemeter-box')
    tx_w, tx_h = 400 * u, 132 * u
    box('T', 'TRANSMISSION (talking portrait)', m, band_y - 10 * u - tx_h, tx_w, tx_h, 'contextual', 'StarCraft-style: animated portrait + line')
    # Top band
    gear = 48 * u
    box('S', 'GEAR (fixed slot)', w - m - gear, m, gear, gear, 'fixed', '.hud-corner-settings')
    box('A', 'SECTOR TAG', m, m, 360 * u, 40 * u, 'permanent', '.level-indicator')
    box('A2', 'RUN CHIPS', m, m + 46 * u, 360 * u, 26 * u, 'contextual', '#hud-run-cards #hud-bounty-chip #hud-event-chip')
    alert_w = 560 * u
    box('B', 'ALERT LANE', (w - alert_w) / 2, m, alert_w, 52 * u, 'contextual', '#boss-status-panel #hazard-status-panel #queens-ledger-hud')
    obj_w = 380 * u
    box('C', 'OBJECTIVE DRAWER', w - m - gear - 10 * u - obj_w, m, obj_w, 56 * u, 'permanent', '#objective-tracker #mission-progress-hud #camp-quest-hud')
    box('N', 'NOTIFICATION DECK', w - m - obj_w, m + 72 * u, obj_w, min(0.34 * h, 300 * u), 'contextual', '.hud-notification-stack')
    # Player keep-out: the camera frames the operator near screen centre.
    kw, kh = 0.30 * w, 0.34 * h
    box('P', 'PLAYER KEEP-OUT', (w - kw) / 2, h * 0.52 - kh / 2, kw, kh, 'keepout', 'no HUD, ever')
    return u, Z

COL = {'permanent': (0, 214, 255), 'contextual': (255, 176, 32), 'fixed': (200, 200, 210), 'keepout': (80, 255, 150)}

def font(size):
    for p in ['/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf', '/usr/share/fonts/truetype/liberation/LiberationMono-Bold.ttf']:
        try: return ImageFont.truetype(p, size)
        except OSError: pass
    return ImageFont.load_default()

def dashed(d, box, color, width, dash=10):
    x0, y0, x1, y1 = box
    for x in range(int(x0), int(x1), dash * 2):
        d.line([(x, y0), (min(x + dash, x1), y0)], fill=color, width=width); d.line([(x, y1), (min(x + dash, x1), y1)], fill=color, width=width)
    for y in range(int(y0), int(y1), dash * 2):
        d.line([(x0, y), (x0, min(y + dash, y1))], fill=color, width=width); d.line([(x1, y), (x1, min(y + dash, y1))], fill=color, width=width)

def render(src, dst, label):
    img = Image.open(src).convert('RGB')
    w, h = img.size
    u, Z = zones(w, h)
    base = Image.blend(img, Image.new('RGB', img.size, (0, 0, 0)), 0.45)
    over = Image.new('RGBA', img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(over)
    f = font(max(11, int(15 * u))); fs = font(max(9, int(11 * u)))
    for z in Z:
        c = COL[z['kind']]
        b = (z['x'], z['y'], z['x'] + z['w'], z['y'] + z['h'])
        if z['kind'] == 'keepout':
            dashed(d, b, c + (220,), max(2, int(2 * u)), dash=int(12 * u))
        elif z['kind'] == 'contextual':
            d.rectangle(b, fill=c + (38,)); dashed(d, b, c + (255,), max(2, int(2 * u)), dash=int(8 * u))
        else:
            d.rectangle(b, fill=c + (52,), outline=c + (255,), width=max(2, int(2 * u)))
        tx, ty = z['x'] + 6 * u, z['y'] + 4 * u
        d.text((tx, ty), f"{z['key']}  {z['name']}", font=f, fill=(255, 255, 255, 255))
        if z['h'] > 40 * u and z['note']:
            d.text((tx, ty + 18 * u), z['note'], font=fs, fill=c + (255,))
        z['px'] = f"{z['w']}x{z['h']} @ {z['x']},{z['y']}"
    d.text((20 * u, h / 2 - 20 * u), f"{label}  ·  {w}x{h}  ·  u = {u:.2f}px", font=f, fill=(255, 255, 255, 230))
    d.text((20 * u, h / 2), "solid = always on   dashed amber = only when relevant   green dashed = player keep-out", font=fs, fill=(220, 220, 220, 230))
    out = Image.alpha_composite(base.convert('RGBA'), over).convert('RGB')
    out.save(dst, quality=92)
    perm = sum(z['w'] * z['h'] for z in Z if z['kind'] in ('permanent', 'fixed'))
    return dict(label=label, size=[w, h], u=round(u, 3), permanentCoverage=round(100 * perm / (w * h), 1), zones={z['key']: z['px'] for z in Z})

report = [
    render(f'{G}/current_gameplay_deck_1280.png', f'{OUT}/proposed-zones-deck-1280x800.png', 'STEAM DECK'),
    render(f'{G}/current_gameplay_1920.png', f'{OUT}/proposed-zones-1920x1080.png', 'DESKTOP 1080p'),
]
# Current HUD footprint on the Deck capture, measured from the screenshot.
current = {'level': (16,14,166,174), 'loot': (16,182,166,325), 'map': (16,485,240,784), 'sidearm': (192,17,441,57),
           'ship': (460,17,700,55), 'vitals': (791,17,1006,55), 'bulwark': (1015,17,1085,55), 'radar': (1095,17,1211,55),
           'gear': (1228,6,1272,50), 'objectives+prompt': (922,74,1262,342), 'loop-step': (517,740,762,776)}
area = sum((x1 - x0) * (y1 - y0) for x0, y0, x1, y1 in current.values())
report.append(dict(label='CURRENT DECK HUD (measured)', coverage=round(100 * area / (1280 * 800), 1), boxes=len(current)))
print(json.dumps(report, indent=1))
