#!/usr/bin/env python3
"""Key the chroma-green kiosk overlays and measure their cutouts.

    python3 scripts/ui/key-kiosk-overlays.py

Two kinds of source, in `art/source/ui/kiosk-overlays/` (or dropped into
`public/ui/overlays/`, which is then moved out of the shipped build):

- `*_overlay.jpg`: flat #00FF00 where screens and buttons go; keyed here
  (fringe grown and despilled) to a transparent `*_overlay.webp`;
- `*_overlay.png`: already keyed, transparent holes and transparent outer
  edges (the game shows through around the machine); re-encoded to webp.

The holes (green, or transparent regions that do not touch the frame edge) are
measured into `src/data/kioskOverlays.json` as percentage rectangles, largest
first, with the machine's opaque bounds, so the UI is laid into the holes
exactly (src/kioskFrame.js). A png wins over a jpg of the same name. Re-run
after adding or replacing an overlay.
"""

import json
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent.parent
OVERLAYS = ROOT / 'public/ui/overlays'          # the keyed webps the game loads
SOURCES = [ROOT / 'art/source/ui/kiosk-overlays', OVERLAYS]  # masters (public/ only as a drop zone)
OUT = ROOT / 'src/data/kioskOverlays.json'
MIN_AREA = 0.0003  # of the frame: smaller specks are artefacts, not cutouts
MIN_SIDE = 3.0     # % of the frame: thinner slivers are gaps (handles, seams, coin slots), not cutouts


def green_mask(rgb):
    r, g, b = (rgb[..., i].astype(np.int16) for i in range(3))
    # Strongly green, with the JPEG ringing at the edges included.
    return (g > 140) & (g - r > 70) & (g - b > 70)


def measure(mask, opaque):
    """Hole rectangles and the machine's bounds, in % of the frame."""
    height, width = mask.shape
    labels, count = ndimage.label(ndimage.binary_closing(mask, iterations=3))
    holes = []
    for index, box in enumerate(ndimage.find_objects(labels), start=1):
        ys, xs = box
        area = int((labels[box] == index).sum()) / (width * height)
        if area < MIN_AREA or min(100 * (xs.stop - xs.start) / width, 100 * (ys.stop - ys.start) / height) < MIN_SIDE:
            continue
        holes.append({
            'x': round(100 * xs.start / width, 2), 'y': round(100 * ys.start / height, 2),
            'w': round(100 * (xs.stop - xs.start) / width, 2), 'h': round(100 * (ys.stop - ys.start) / height, 2),
            'area': round(100 * area, 2)
        })
    holes.sort(key=lambda hole: -hole['area'])
    ys, xs = np.nonzero(opaque)
    bounds = {
        'x': round(100 * xs.min() / width, 2), 'y': round(100 * ys.min() / height, 2),
        'w': round(100 * (xs.max() + 1 - xs.min()) / width, 2), 'h': round(100 * (ys.max() + 1 - ys.min()) / height, 2)
    }
    return holes, bounds


def keyed(path):
    """An already-keyed png: holes are the transparent regions inside the machine."""
    rgba = np.asarray(Image.open(path).convert('RGBA'))
    clear = rgba[..., 3] < 128
    labels, _ = ndimage.label(clear)
    edge = set(np.unique(np.concatenate([labels[0], labels[-1], labels[:, 0], labels[:, -1]]))) - {0}
    holes_mask = clear & ~np.isin(labels, list(edge))
    Image.fromarray(rgba, 'RGBA').save(OVERLAYS / f'{path.stem}.webp', 'WEBP', quality=90, method=6)
    holes, bounds = measure(holes_mask, ~clear)
    height, width = clear.shape
    return {'image': f'/ui/overlays/{path.with_suffix(".webp").name}', 'aspect': [width, height], 'bounds': bounds, 'cutouts': holes}


def key(path):
    image = Image.open(path).convert('RGB')
    rgb = np.asarray(image)
    mask = green_mask(rgb)
    # Grow the hole a pixel to swallow the green fringe, then despill what is
    # left near it so no green halo sits on the bezel.
    grown = ndimage.binary_dilation(mask, iterations=2)
    out = rgb.astype(np.int16).copy()
    near = ndimage.binary_dilation(grown, iterations=4) & ~grown
    limit = np.maximum(out[..., 0], out[..., 2])
    out[..., 1] = np.where(near, np.minimum(out[..., 1], limit), out[..., 1])
    alpha = np.where(grown, 0, 255).astype(np.uint8)
    rgba = np.dstack([out.clip(0, 255).astype(np.uint8), alpha])
    Image.fromarray(rgba, 'RGBA').save(OVERLAYS / f'{path.stem}.webp', 'WEBP', quality=90, method=6)

    holes, bounds = measure(mask, np.ones_like(mask))
    height, width = mask.shape
    return {'image': f'/ui/overlays/{path.with_suffix(".webp").name}', 'aspect': [width, height], 'bounds': bounds, 'cutouts': holes}


def main():
    found = {}
    for folder in reversed(SOURCES):  # art/source wins over the drop zone
        for path in sorted(folder.glob('*_overlay.jpg')) + sorted(folder.glob('*_overlay.png')):
            found.setdefault(path.stem, {})[path.suffix] = path
    result = {}
    for name, paths in sorted(found.items()):
        result[name] = keyed(paths['.png']) if '.png' in paths else key(paths['.jpg'])
    OUT.write_text(json.dumps(result, indent=2) + '\n')
    for name, overlay in result.items():
        print(f"[kiosk] {name}: {len(overlay['cutouts'])} cutouts -> {overlay['image']}")


if __name__ == '__main__':
    main()
