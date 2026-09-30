#!/usr/bin/env python3
"""Turn the painted HUD housings into game assets + per-class window CSS.

Inputs  art/source/hud-dock/ (local masters, gitignored like all art/source/)
        {Scout,Tank,Eng}.{Left,Middle,Right}.jpg
        (painted frames on chroma green; the glass windows are green too)
Outputs public/ui/dock/<class>-<panel>.webp   transparent frame, windows cut out
        public/ui/dock/<class>-<panel>-glass.webp  legacy detected-window glass
        public/ui/dock/manifest.json          source analysis + runtime dimensions
        src/styles/hudDockHousings.css        fixed semantic layout and per-class
                                              skins (generated; do not hand-edit,
                                              re-run this script)

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
# Gameplay geometry is deliberately independent from the painted source dimensions.
# The art is a skin, not a layout definition. Keeping these values here makes the
# generated manifest useful to audits and prevents a newly painted class from moving
# or shrinking live information.
BAND_H = 64
PANEL_WIDTHS = {'map': 220, 'status': 520, 'arms': 380}
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
                'runtimeWidthU': PANEL_WIDTHS[panel],
                'runtimeHeightU': BAND_H,
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
        '   The runtime grid is class-invariant: art is a nine-sliced skin and never',
        '   determines live-content geometry. Layers: glass (z 1) < live UI (z 2) <',
        '   painted frame (z 3). */',
        '',
        'html[data-hud-layout="dock"] #game-viewport { --dock-band-h: ' + u(H) + '; }',
        '',
    ]
    positions = {
        'map': 'left: var(--hud-margin)',
        'status': f'left: calc(50% - {PANEL_WIDTHS["status"] / 2:.1f} * var(--u))',
        'arms': f'left: calc(100% - var(--hud-margin) - {PANEL_WIDTHS["arms"]:.1f} * var(--u))',
    }
    P = 'html[data-hud-layout="dock"] #game-viewport #ui'
    for panel, width in PANEL_WIDTHS.items():
        lines.append(
            f'{P} .dock-glass--{panel}, {P} .dock-housing--{panel} '
            f'{{ display: block; {positions[panel]}; width: {u(width)}; }}'
        )
    lines.extend([
        '',
        f'{P} .dock-glass {{',
        '  background: linear-gradient(180deg, rgba(8, 12, 16, .82), rgba(4, 7, 10, .94));',
        '  border: calc(1 * var(--u)) solid rgba(110, 201, 220, .22);',
        '  box-sizing: border-box;',
        '}',
        f'{P} .dock-housing {{',
        '  background: none;',
        '  border: calc(12 * var(--u)) solid transparent;',
        '  border-image-slice: 26% 18%;',
        '  border-image-width: calc(8 * var(--u)) calc(12 * var(--u));',
        '  border-image-repeat: stretch;',
        '  box-sizing: border-box;',
        '}',
        '',
    ])
    for cls, panels in manifest['classes'].items():
        C = f'html[data-hud-layout="dock"][data-operator-class="{cls}"] #game-viewport #ui'
        lines.append(f'/* ---- {cls}: skin only; geometry remains shared ---- */')
        for panel, info in panels.items():
            lines.append(f'{C} .dock-housing--{panel} {{ border-image-source: url("{info["file"]}"); }}')
        lines.append('')
    with open(CSS, 'w') as fh:
        fh.write('\n'.join(lines) + '\n')


if __name__ == '__main__':
    main()
