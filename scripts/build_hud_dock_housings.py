#!/usr/bin/env python3
"""Turn the painted HUD housings into game assets + per-class window CSS.

Inputs  art/source/hud-dock/ (local masters, gitignored like all art/source/)
        {Scout,Tank,Eng}.{Left,Middle,Right}.jpg
        (painted frames on chroma green; the glass windows are green too)
Outputs public/ui/dock/<class>-<panel>.webp   transparent frame, windows cut out
        public/ui/dock/<class>-<panel>-glass.webp  dark glass for the windows only
        public/ui/dock/manifest.json          frame aspect + every window (normalised)
        src/styles/hudDockHousings.css        per-class placement of the live UI
                                              into those windows (generated; do
                                              not hand-edit, re-run this script)

    python3 scripts/build_hud_dock_housings.py

Window detection: after keying, transparent pixels connected to the image edge
are "outside"; every other transparent region is a window. Windows are sorted
left→right (then top→bottom) and classified circle/rect by fill ratio.
Slot assignment (docs/planning/hud-lower-dock-plan-2026-09-25.md §3A):
  map    : circle → radar disc, largest rect → readouts
  status : largest → vitals, tallest-narrow → infection vial, remaining → loot
  arms   : largest → weapon, the two smallest → ability tiles, others → glass
"""
import json
import os
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from chroma_key import key_distance, despill  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SRC = os.path.join(ROOT, 'art', 'source', 'hud-dock')
OUT = os.path.join(ROOT, 'public', 'ui', 'dock')
CSS = os.path.join(ROOT, 'src', 'styles', 'hudDockHousings.css')
CLASSES = {'Scout': 'scout', 'Tank': 'tank', 'Eng': 'engineer'}
PANELS = {'Left': 'map', 'Middle': 'status', 'Right': 'arms'}
# Band height in HUD units; each frame's width follows its painted aspect.
BAND_H = 150
MIN_HOLE_FRACTION = 0.002  # ignore specks smaller than this share of the frame


def key_frame(path):
    img = Image.open(path).convert('RGB')
    rgb = np.asarray(img).astype(np.float32)
    dominance = key_distance(rgb, 'green')
    # JPEG chroma noise: key generously, keep a soft 1-2 px edge
    alpha = np.clip((90 - dominance) / (90 - 30), 0.0, 1.0)
    rgb = despill(rgb, 'green')
    return rgb, alpha


def label_regions(mask):
    """4-connected components of a boolean mask (iterative, no scipy)."""
    h, w = mask.shape
    labels = np.zeros((h, w), dtype=np.int32)
    current = 0
    for y0, x0 in zip(*np.nonzero(mask)):
        if labels[y0, x0]:
            continue
        current += 1
        stack = [(y0, x0)]
        labels[y0, x0] = current
        while stack:
            y, x = stack.pop()
            for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
                if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not labels[ny, nx]:
                    labels[ny, nx] = current
                    stack.append((ny, nx))
    return labels, current


def analyse(alpha):
    h, w = alpha.shape
    opaque = alpha > 0.5
    ys, xs = np.nonzero(opaque)
    x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    clear = ~opaque
    # work at reduced resolution for the flood fill (holes are large)
    step = 2
    small = clear[::step, ::step]
    labels, n = label_regions(small)
    edge_labels = set(np.unique(np.concatenate([labels[0], labels[-1], labels[:, 0], labels[:, -1]]))) - {0}
    frame_area = (x1 - x0) * (y1 - y0)
    holes = []
    for lab in range(1, n + 1):
        if lab in edge_labels:
            continue
        yy, xx = np.nonzero(labels == lab)
        area = len(yy) * step * step
        if area < MIN_HOLE_FRACTION * frame_area:
            continue
        hx0, hx1 = xx.min() * step, (xx.max() + 1) * step
        hy0, hy1 = yy.min() * step, (yy.max() + 1) * step
        bw, bh = hx1 - hx0, hy1 - hy0
        fill = area / float(bw * bh)
        shape = 'circle' if 0.70 < fill < 0.86 and 0.8 < bw / bh < 1.25 else 'rect'
        holes.append({
            'shape': shape,
            'x': (hx0 - x0) / (x1 - x0), 'y': (hy0 - y0) / (y1 - y0),
            'w': bw / (x1 - x0), 'h': bh / (y1 - y0), 'area': area / frame_area,
        })
    holes.sort(key=lambda o: (round(o['x'], 2), o['y']))
    return (int(x0), int(y0), int(x1), int(y1)), holes


def glass_plate(alpha):
    """Near-black glass exactly where the windows are (transparent pixels not
    connected to the image edge), so live text reads over the game world."""
    clear = alpha < 0.5
    labels, n = label_regions(clear[::2, ::2])
    edge = set(np.unique(np.concatenate([labels[0], labels[-1], labels[:, 0], labels[:, -1]]))) - {0}
    windows = np.isin(labels, [l for l in range(1, n + 1) if l not in edge])
    windows = np.repeat(np.repeat(windows, 2, axis=0), 2, axis=1)[:alpha.shape[0], :alpha.shape[1]]
    rgba = np.zeros(alpha.shape + (4,), dtype=np.uint8)
    rgba[..., 0], rgba[..., 1], rgba[..., 2] = 7, 9, 10
    rgba[..., 3] = np.where(windows, 232, 0)
    return Image.fromarray(rgba, 'RGBA')


def assign(panel, holes):
    slots = {}
    by_area = sorted(range(len(holes)), key=lambda i: -holes[i]['area'])
    if panel == 'map':
        circles = [i for i in range(len(holes)) if holes[i]['shape'] == 'circle']
        radar = circles[0] if circles else by_area[0]
        slots['radar'] = radar
        rest = [i for i in by_area if i != radar]
        if rest:
            slots['readout'] = rest[0]
    elif panel == 'status':
        slots['vitals'] = by_area[0]
        rest = [i for i in range(len(holes)) if i != by_area[0]]
        vial = min(rest, key=lambda i: holes[i]['w'] / max(holes[i]['h'], 1e-6)) if rest else None
        if vial is not None and holes[vial]['w'] < holes[by_area[0]]['w'] * 0.25:
            slots['vial'] = vial
        loot = [i for i in rest if i != slots.get('vial')]
        if loot:
            slots['loot'] = max(loot, key=lambda i: holes[i]['area'])
    else:
        slots['weapon'] = by_area[0]
        small = sorted([i for i in range(len(holes)) if i != by_area[0]], key=lambda i: holes[i]['area'])
        tiles = sorted(small[:2], key=lambda i: (holes[i]['x'], holes[i]['y']))
        if tiles:
            slots['ability'] = tiles[0]
        if len(tiles) > 1:
            slots['scan'] = tiles[1]
    return slots


def main():
    os.makedirs(OUT, exist_ok=True)
    manifest = {'bandHeightU': BAND_H, 'classes': {}}
    for src_cls, cls in CLASSES.items():
        manifest['classes'][cls] = {}
        for src_panel, panel in PANELS.items():
            path = os.path.join(SRC, f'{src_cls}.{src_panel}.jpg')
            rgb, alpha = key_frame(path)
            (x0, y0, x1, y1), holes = analyse(alpha)
            rgba = np.dstack([rgb, alpha * 255.0]).clip(0, 255).astype(np.uint8)
            frame = Image.fromarray(rgba, 'RGBA').crop((x0, y0, x1, y1))
            # 2x the largest on-screen size (96u * 1.3 cap * 2)
            target_h = 256
            frame = frame.resize((round(frame.width * target_h / frame.height), target_h), Image.LANCZOS)
            dst = os.path.join(OUT, f'{cls}-{panel}.webp')
            frame.save(dst, 'WEBP', quality=90, method=6)
            glass = glass_plate(alpha[y0:y1, x0:x1])
            glass = glass.resize(frame.size, Image.LANCZOS)
            glass.save(os.path.join(OUT, f'{cls}-{panel}-glass.webp'), 'WEBP', quality=85, method=6)
            slots = assign(panel, holes)
            manifest['classes'][cls][panel] = {
                'file': f'/ui/dock/{cls}-{panel}.webp',
                'aspect': round((x1 - x0) / (y1 - y0), 4),
                'holes': [{k: (round(v, 4) if isinstance(v, float) else v) for k, v in h.items()} for h in holes],
                'slots': slots,
            }
            print(f'{cls:9} {panel:6} aspect {manifest["classes"][cls][panel]["aspect"]:.2f} holes {len(holes)} '
                  f'slots {slots} -> {os.path.relpath(dst, ROOT)} {frame.size}')
    with open(os.path.join(OUT, 'manifest.json'), 'w') as fh:
        json.dump(manifest, fh, indent=1)
    write_css(manifest)
    print('wrote', os.path.relpath(CSS, ROOT))


def write_css(manifest):
    H = manifest['bandHeightU']
    u = lambda v: f'calc({v:.1f} * var(--u))'  # noqa: E731
    lines = [
        '/* GENERATED by scripts/build_hud_dock_housings.py from art/source/hud-dock/.',
        '   Do not hand-edit: re-run the script after changing the art.',
        '   Places the painted class housings (public/ui/dock/) in the band and the live',
        '   HUD elements inside each housing\'s detected windows. Layers: glass (z 1) <',
        '   live UI (z 2) < painted frame (z 3). */',
        '',
        'html[data-hud-layout="dock"] #game-viewport { --dock-band-h: ' + u(H) + '; }',
        '',
    ]
    for cls, panels in manifest['classes'].items():
        P = f'html[data-hud-layout="dock"][data-operator-class="{cls}"] #game-viewport #ui'
        lines.append(f'/* ---- {cls} ---- */')
        left = {}
        for panel, info in panels.items():
            W = H * info['aspect']
            if panel == 'map':
                left[panel] = f'var(--hud-margin)'
            elif panel == 'status':
                left[panel] = f'calc(50% - {W / 2:.1f} * var(--u))'
            else:
                left[panel] = f'calc(100% - var(--hud-margin) - {W:.1f} * var(--u))'
            for layer in ('glass', 'housing'):
                img = info['file'].replace('.webp', '-glass.webp') if layer == 'glass' else info['file']
                lines.append(f'{P} .dock-{layer}--{panel} {{ display: block; left: {left[panel]}; width: {u(W)}; '
                             f'background-image: url("{img}"); }}')

        def box(panel, slot):
            info = panels[panel]
            W = H * info['aspect']
            h = info['holes'][info['slots'][slot]]
            inset = 0.03
            x = (h['x'] + inset * h['w']) * W
            y = (h['y'] + inset * h['h']) * H
            w = h['w'] * (1 - 2 * inset) * W
            hh = h['h'] * (1 - 2 * inset) * H
            return x, y, w, hh, W

        def place(selector, panel, slot, extra=''):
            if slot not in panels[panel]['slots']:
                lines.append(f'{P} {selector} {{ display: none !important; }}')
                return None
            x, y, w, hh, W = box(panel, slot)
            lines.append(f'{P} {selector} {{ left: calc({left[panel]} + {x:.1f} * var(--u)) !important; '
                         f'bottom: calc(var(--hud-margin) + {H - y - hh:.1f} * var(--u)) !important; '
                         f'width: {u(w)} !important; height: {u(hh)} !important; {extra}}}')
            return x, y, w, hh

        # map: the compass box covers the whole housing; its radar and readout go into windows
        W = H * panels['map']['aspect']
        lines.append(f'{P} #desktop-compass {{ left: {left["map"]} !important; width: {u(W)} !important; '
                     f'height: {u(H)} !important; }}')
        for sel, slot in (('#hud-blueprint-canvas', 'radar'), ('.desktop-compass__ring', 'radar'), ('.desktop-compass__readout', 'readout')):
            if slot in panels['map']['slots']:
                x, y, w, hh, _ = box('map', slot)
                if slot == 'radar':
                    d = min(w, hh)
                    x += (w - d) / 2; y += (hh - d) / 2; w = hh = d
                lines.append(f'{P} #desktop-compass {sel} {{ left: {u(x)} !important; top: {u(y)} !important; '
                             f'width: {u(w)} !important; height: {u(hh)} !important; }}')
                if slot == 'readout' and w < 70:
                    # narrow readout window: stack each label over its value
                    lines.append(f'{P} #desktop-compass .desktop-compass__row {{ flex-direction: column !important; '
                                 f'align-items: flex-start !important; }}')
        # status: vitals window holds hearts / O2 / hull; loot window holds the counts
        v = place('#vitals-panel', 'status', 'vitals')
        if v:
            x, y, w, hh = v
            lines.append(f'{P} #ship-status-panel {{ left: calc({left["status"]} + {x + 6:.1f} * var(--u)) !important; '
                         f'bottom: calc(var(--hud-margin) + {H - y - hh + 4:.1f} * var(--u)) !important; '
                         f'width: {u(w - 12)} !important; }}')
        loot = place('#pickup-counter-panel', 'status', 'loot')
        if loot:
            cols = 1 if loot[3] > loot[2] * 1.1 else 2
            lines.append(f'{P} #pickup-counter-panel {{ grid-template-columns: repeat({cols}, 1fr) !important; }}')
        # arms: weapon window + two ability tiles
        wpn = place('#weapon-status-panel', 'arms', 'weapon')
        if wpn and wpn[2] < 60:
            lines.append(f'{P} #weapon-status-panel .weapon-status-panel__title {{ display: none !important; }}')
        if wpn and wpn[2] < 64:
            lines.append(f'{P} #weapon-status-panel .weapon-status-panel__cache {{ display: none !important; }}')
        for sel, slot in (('#class-ability-panel', 'ability'), ('#radar-scan-panel', 'scan')):
            t = place(sel, 'arms', slot)
            if t and t[2] < 34:
                lines.append(f'{P} {sel} .class-ability-panel__name {{ display: none !important; }}')
        lines.append('')
    with open(CSS, 'w') as fh:
        fh.write('\n'.join(lines) + '\n')


if __name__ == '__main__':
    main()
