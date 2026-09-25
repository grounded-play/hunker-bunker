# Style board v2: everything the game actually shows — key art, gameplay
# screenshots, the 3D models (rendered headless by render_glbs_blender.py into
# model-renders/), characters, environments, items and UI — plus a palette
# sampled from all of it and the Cathedral Biomech additions
# (docs/design/art-style-bible.md).
# Run from the repo root: python3 docs/planning/assets/hud-lower-dock/hud_style_board.py
import os, glob, textwrap, colorsys
from PIL import Image, ImageDraw, ImageFont
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '../../../..'))
GEM = '/home/caveman/.gemini/antigravity-ide/brain/6b5e702e-68fa-42ea-af35-e9deb290dda4'
def font(n, b=True):
    try: return ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSansMono%s.ttf' % ('-Bold' if b else ''), n)
    except OSError: return ImageFont.load_default()
def R(p): return p if p.startswith('/') else os.path.join(ROOT, p)
SECTIONS = [
    ('KEY ART & STORE', 230, [
        'steam/store/game-v2/steam_main_capsule_v2_en.png', 'public/title_key_art_v2.png', 'public/title_key_art.png',
        'public/door_biomech_keyart_v2.webp'],
     'title_key_art_v2 and the biomech door are already Cathedral Biomech (ribs, bone, arches). The ink capsule sets line and light. Missing: Nouveau ornament, halos, gold.'),
    ('IN-GAME SCREENSHOTS', 200, [
        f'{GEM}/current_gameplay_1920.png', 'docs/planning/assets/hud-lower-dock/../../../reports/assets/perf-2026-09-25/gameplay-quality-restored.png',
        f'{GEM}/current_tactical_map_1920.png', f'{GEM}/current_terminal_1920.png',
        'docs/reports/assets/armory-continuation-2026-09-09/scout-1280x720.png'],
     'What the player sees: dark isometric bunker, amber suit light, teal UI, DOF. The UI chrome is plain rectangles today: the biggest gap from the key art.'),
    ('3D MODELS (rendered from the game GLBs)', 150, sorted(glob.glob(os.path.join(HERE, 'model-renders', '*.webp'))),
     'Chassis, weapons and props are painted-metal sci-fi. Snails and aliens already carry bio-green and bone. The Queen, throne and spore boss are closest to Giger; the props need Nouveau trim.'),
    ('CHARACTERS (lore portraits)', 170, [
        'public/lore_portraits/queen_00.webp', 'public/lore_portraits/mayor_tina.webp', 'public/lore_portraits/meridian_kaelen.jpg',
        'public/lore_portraits/tallow_martha.webp', 'public/lore_portraits/vesper_briggs.webp', 'public/lore_portraits/voice_aura_persona.png',
        'public/lore_portraits/survivor_hybrid.webp', 'public/lore_portraits/survivor_00.webp'],
     'Painted portraits in mixed styles: the base for the 2D portrait pass. They need Mucha halo frames and the shared lighting spec.'),
    ('ENVIRONMENT & HARDWARE', 170, [
        'public/door_rust_keyart_v2.webp', 'public/door_cryo_keyart_v2.webp', 'public/door_bio_keyart_v2.webp', 'public/door_alien_keyart_v2.webp',
        'public/door_nuclear_keyart_v2.webp', 'public/ui/armory_bg_tank.jpg', 'public/ui/armory_bg_scout.jpg', 'public/ui/armory_bg_engineer.jpg',
        'public/sky/body_mothership_derelict.png'],
     'Door art is the housing template (dense riveted hardware, lamps, biome light). The Armory rooms are gritty industrial. Arches, ribs and ornament turn them into chapels.'),
    ('ITEMS, CUTSCENES & UI', 150, [
        'public/economy/armory/4100.png', 'public/economy/armory/4101.png', 'public/economy/armory/5004.png', 'public/economy/armory/frame-siege_breaker.png',
        'public/economy/armory/comm_tank_toxic_apex_chrysalis.png', 'public/schematics/schematic_00.webp', 'public/cutscenes/poster-art/death-queen.png',
        'public/cutscenes/poster-art/death-biohazard.png', 'public/interstitials/int_05_the_pipes_are_singing_key_v1.webp', 'public/hunker_bunker_select.png'],
     'Icons, schematics and posters: the item language the HUD weapon window reuses. The interstitials and death posters already lean into Giger. Menus are plain dark panels.'),
]
BONE = [(0xcd, 0xc6, 0xb0), (0xa7, 0x9f, 0x86), (0x82, 0x7c, 0x6c), (0x56, 0x54, 0x4b)]
GOLD = [(0x94, 0x70, 0x47), (0xb8, 0x89, 0x4a), (0xd9, 0xb2, 0x5f)]
def load(p, h):
    im = Image.open(R(p)).convert('RGB')
    if im.height != h: im = im.resize((max(1, int(im.width * h / im.height)), h))
    return im
def sample(paths):
    base, acc = [], []
    for p in paths:
        try: im = Image.open(R(p)).convert('RGB')
        except Exception: continue
        im.thumbnail((160, 160))
        for c in im.getdata():
            hh, l, s = colorsys.rgb_to_hls(*(v / 255 for v in c))
            (acc if (s > 0.45 and l > 0.35) else base).append(c)
    def q(px, n):
        st = Image.new('RGB', (len(px), 1)); st.putdata(px)
        qq = st.quantize(colors=n, method=Image.Quantize.MEDIANCUT); pal = qq.getpalette()[:n * 3]
        return [tuple(pal[i * 3:i * 3 + 3]) for _, i in sorted(qq.getcolors(), reverse=True)]
    return q(base, 8), q(acc, 10)
def main():
    W = 2400; pad = 20
    blocks = []
    y = 70
    for title, h, paths, note in SECTIONS:
        ims = []
        for p in paths:
            try: ims.append((load(p, h), os.path.splitext(os.path.basename(p))[0]))
            except Exception as e: print('skip', p, e)
        rows = [[]]; x = pad
        for im, name in ims:
            if x + im.width > W - pad and rows[-1]:
                rows.append([]); x = pad
            rows[-1].append((im, name)); x += im.width + 10
        blocks.append((title, h, rows, note, y))
        y += 34 + len(rows) * (h + 26) + 44
    allpaths = [p for _, _, ps, _ in SECTIONS for p in ps]
    base, acc = sample(allpaths)
    H = y + 360
    board = Image.new('RGB', (W, H), (8, 9, 11)); d = ImageDraw.Draw(board)
    d.text((pad, 16), 'HUNKER BUNKER — STYLE BOARD v2: everything the game shows, and where Cathedral Biomech takes it', font=font(26), fill=(240, 160, 50))
    d.text((pad, 48), 'Direction: Art Nouveau / Jugendstil meets Giger — sensual cathedrals of dead corporate space gods (docs/design/art-style-bible.md)', font=font(15, False), fill=(200, 200, 200))
    for title, h, rows, note, by in blocks:
        d.text((pad, by + 8), title, font=font(19), fill=(113, 205, 223))
        yy = by + 34
        for row in rows:
            x = pad
            for im, name in row:
                board.paste(im, (x, yy)); d.text((x, yy + h + 3), name[:max(8, im.width // 8)], font=font(11, False), fill=(150, 150, 150))
                x += im.width + 10
            yy += h + 26
        d.multiline_text((pad, yy), textwrap.fill('→ ' + note, 190), font=font(14, False), fill=(230, 200, 150), spacing=3)
    y0 = y + 10
    def swatches(label, cols, yy):
        d.text((pad, yy), label, font=font(15), fill=(220, 220, 220))
        sw = min(230, (W - 2 * pad) // len(cols))
        for i, c in enumerate(cols):
            d.rectangle((pad + i * sw, yy + 24, pad + (i + 1) * sw - 6, yy + 74), fill=c)
            d.text((pad + i * sw, yy + 78), '#%02x%02x%02x' % c, font=font(13), fill=(210, 210, 210))
    swatches('Sampled base (all sources above):', base, y0)
    swatches('Sampled lights / accents (bright, saturated pixels):', acc, y0 + 110)
    swatches('Cathedral Biomech additions: bone / ivory (from title_key_art_v2) and tarnished gold / brass', BONE + GOLD, y0 + 220)
    out = os.path.join(HERE, 'style-board.jpg'); board.save(out, quality=88)
    print(out, board.size); print('base', ' '.join('#%02x%02x%02x' % c for c in base)); print('accent', ' '.join('#%02x%02x%02x' % c for c in acc))
if __name__ == '__main__': main()
