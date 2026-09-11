#!/usr/bin/env python3
"""Key the green screen out of economy icons that shipped unprocessed.

Four Steam item icons went out as raw chroma-green plates -- the subject was
never cut out at any stage, so the master, the 512 and the 256 are all a
green rectangle. Steam serves icon_url straight from public/economy/, so these
are what players see in their inventory.

This keys the green from the high-resolution master and composites the subject
onto the same dark backdrop the correctly-processed icons use, then re-exports
every derived size. The *_chroma.* files are deliberately left alone: those are
the green source plates and are supposed to be green.

Usage: python3 scripts/fix-chroma-economy-icons.py [--check]
"""
import os
import struct
import sys
import zlib
from collections import deque

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
ECONOMY = os.path.join(ROOT, 'public', 'economy')
MASTERS = os.path.join(ROOT, 'steam', 'store', 'item_icons')

# Icons that shipped as raw green plates.
AFFECTED = [
    'charm_dark_matter',
    'mod_bio_hazard_filter',
    'mod_kinetic_impact',
    'mod_thermal_heat_exchanger',
]
# A correctly-processed sibling, used as the backdrop reference so the repaired
# icons sit in the same visual set rather than on an invented background.
BACKDROP_REFERENCE = 'mod_cryo_capacitor'
MASTER_SIZE = 1254
GREEN_DOMINANCE = 1.35   # green must exceed both other channels by this factor
GREEN_FLOOR = 90         # ...and be at least this bright, so dark green detail survives


def is_green_plate_file(filepath, sample=40):
    """True when the image border is overwhelmingly chroma green.

    Decodes the PNG border using pure Python standard library (struct + zlib)
    so --check runs in bare CI environments without numpy or Pillow.
    """
    try:
        with open(filepath, 'rb') as f:
            data = f.read()
    except OSError:
        return False

    if len(data) < 8 or data[:8] != b'\x89PNG\r\n\x1a\n':
        return False

    offset = 8
    idat = []
    width, height, bitdepth, colortype = 0, 0, 0, 0
    while offset + 8 <= len(data):
        length = struct.unpack('>I', data[offset:offset+4])[0]
        ctype = data[offset+4:offset+8]
        chunk = data[offset+8:offset+8+length]
        offset += 12 + length
        if ctype == b'IHDR':
            width, height, bitdepth, colortype = struct.unpack('>IIBB', chunk[:10])
        elif ctype == b'IDAT':
            idat.append(chunk)
        elif ctype == b'IEND':
            break

    bpp = 4 if colortype == 6 else (3 if colortype == 2 else 0)
    if not bpp or bitdepth != 8:
        return False

    try:
        raw = zlib.decompress(b''.join(idat))
    except zlib.error:
        return False

    stride = width * bpp
    expected = height * (1 + stride)
    if len(raw) < expected:
        return False

    prev_row = bytearray(stride)
    rows = []
    pos = 0
    for y in range(height):
        filter_type = raw[pos]
        pos += 1
        curr_row = bytearray(raw[pos:pos+stride])
        pos += stride
        for x in range(stride):
            left = curr_row[x - bpp] if x >= bpp else 0
            up = prev_row[x]
            up_left = prev_row[x - bpp] if x >= bpp else 0
            if filter_type == 1:
                curr_row[x] = (curr_row[x] + left) & 0xff
            elif filter_type == 2:
                curr_row[x] = (curr_row[x] + up) & 0xff
            elif filter_type == 3:
                curr_row[x] = (curr_row[x] + ((left + up) >> 1)) & 0xff
            elif filter_type == 4:
                p = left + up - up_left
                pa = abs(p - left)
                pb = abs(p - up)
                pc = abs(p - up_left)
                pr = left if (pa <= pb and pa <= pc) else (up if pb <= pc else up_left)
                curr_row[x] = (curr_row[x] + pr) & 0xff
        rows.append(curr_row)
        prev_row = curr_row

    total = 0
    greenish = 0
    for y in range(height):
        is_vert_border = (y < sample or y >= height - sample)
        for x in range(width):
            if is_vert_border or x < sample or x >= width - sample:
                idx = x * bpp
                r, g, b = rows[y][idx], rows[y][idx+1], rows[y][idx+2]
                total += 1
                if g > r * GREEN_DOMINANCE and g > b * GREEN_DOMINANCE and g > GREEN_FLOOR:
                    greenish += 1

    ratio = greenish / total if total else 0
    return ratio > 0.80


def is_green_plate(target, sample=40):
    """True when the image border is overwhelmingly chroma green."""
    if isinstance(target, str):
        return is_green_plate_file(target, sample)
    try:
        import numpy as np
        rgb = np.asarray(target.convert('RGB'), dtype=np.float32)
        border = np.concatenate([
            rgb[:sample, :].reshape(-1, 3), rgb[-sample:, :].reshape(-1, 3),
            rgb[:, :sample].reshape(-1, 3), rgb[:, -sample:].reshape(-1, 3),
        ])
        r, g, b = border[:, 0], border[:, 1], border[:, 2]
        greenish = (g > r * GREEN_DOMINANCE) & (g > b * GREEN_DOMINANCE) & (g > GREEN_FLOOR)
        return float(greenish.mean()) > 0.80
    except ImportError:
        return False


def key_green(img, feather=1.5):
    """Flood-fill the green surround from the edges, leaving the subject opaque.

    Flood fill rather than a global colour test so green *inside* the subject --
    an indicator LED, a reflection -- is not punched out along with the backdrop.
    """
    import numpy as np
    from PIL import Image, ImageFilter

    rgb = img.convert('RGB')
    arr = np.asarray(rgb, dtype=np.float32)
    h, w = arr.shape[:2]
    r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
    green = (g > r * GREEN_DOMINANCE) & (g > b * GREEN_DOMINANCE) & (g > GREEN_FLOOR)

    visited = np.zeros((h, w), dtype=bool)
    queue = deque()
    for x in range(w):
        for y in (0, h - 1):
            if green[y, x] and not visited[y, x]:
                visited[y, x] = True
                queue.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            if green[y, x] and not visited[y, x]:
                visited[y, x] = True
                queue.append((x, y))
    while queue:
        cx, cy = queue.popleft()
        for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            nx, ny = cx + dx, cy + dy
            if 0 <= nx < w and 0 <= ny < h and green[ny, nx] and not visited[ny, nx]:
                visited[ny, nx] = True
                queue.append((nx, ny))

    alpha = Image.fromarray(np.where(visited, 0, 255).astype(np.uint8), 'L')
    alpha = alpha.filter(ImageFilter.GaussianBlur(feather))

    # Spill suppression: pull green back toward the other channels at the fringe,
    # or the subject keeps a green rim against the dark backdrop.
    out = arr.copy()
    spill = out[:, :, 1] > np.maximum(out[:, :, 0], out[:, :, 2])
    out[:, :, 1] = np.where(spill, np.maximum(out[:, :, 0], out[:, :, 2]), out[:, :, 1])
    keyed = Image.fromarray(out.astype(np.uint8), 'RGB')
    keyed.putalpha(alpha)
    return keyed


def backdrop():
    """A clean dark plate matching the correctly-processed icons.

    Built from a reference icon rather than invented, so the repaired icons sit
    in the same visual set -- but the reference contains its own subject, and
    compositing onto that leaves the donor object ghosting behind the new one.
    A heavy blur destroys every recognisable feature while preserving the exact
    colour and vignette falloff that makes the set feel consistent.
    """
    import numpy as np
    from PIL import Image, ImageFilter

    ref = Image.open(os.path.join(MASTERS, f'{BACKDROP_REFERENCE}_master.png')).convert('RGB')
    ref = ref.resize((MASTER_SIZE, MASTER_SIZE), Image.LANCZOS)
    plate = ref.filter(ImageFilter.GaussianBlur(MASTER_SIZE // 8))
    # The blur lifts the mean toward the subject's brightness; pull it back so
    # the backdrop stays as dark as the reference's own edges.
    arr = np.asarray(plate, dtype=np.float32)
    edge = np.concatenate([arr[:60, :].reshape(-1, 3), arr[-60:, :].reshape(-1, 3)])
    target = edge.mean(axis=0)
    current = arr.reshape(-1, 3).mean(axis=0)
    arr = np.clip(arr * (target / np.maximum(current, 1.0)), 0, 255)
    return Image.fromarray(arr.astype(np.uint8), 'RGB').convert('RGBA')


def repair(slug, plate):
    from PIL import Image

    master_path = os.path.join(MASTERS, f'{slug}_master.png')
    master = Image.open(master_path).convert('RGBA')
    if master.size != (MASTER_SIZE, MASTER_SIZE):
        master = master.resize((MASTER_SIZE, MASTER_SIZE), Image.LANCZOS)

    composed = plate.copy()
    composed.alpha_composite(key_green(master))

    composed.save(master_path, 'PNG', optimize=True)
    for size, name in ((512, f'{slug}_large.png'), (256, f'{slug}.png')):
        composed.resize((size, size), Image.LANCZOS).save(
            os.path.join(ECONOMY, name), 'PNG', optimize=True)
    return master_path


def main():
    check = '--check' in sys.argv
    offenders = []
    for slug in AFFECTED:
        icon = os.path.join(ECONOMY, f'{slug}.png')
        if os.path.exists(icon) and is_green_plate(icon):
            offenders.append(slug)

    if check:
        if offenders:
            print(f'[economy-icons] {len(offenders)} icon(s) still on a green plate: '
                  + ', '.join(offenders))
            return 1
        print(f'[economy-icons] ok ({len(AFFECTED)} previously-green icons repaired)')
        return 0

    if not offenders:
        print('[economy-icons] nothing to repair')
        return 0

    try:
        import numpy as np  # noqa: F401
        from PIL import Image, ImageFilter  # noqa: F401
    except ImportError:
        print('[economy-icons] repair requires numpy and Pillow: pip install numpy Pillow', file=sys.stderr)
        return 1

    plate = backdrop()
    for slug in offenders:
        repair(slug, plate)
        print(f'  repaired {slug} (master + 512 + 256)')
    print(f'[economy-icons] repaired {len(offenders)} icon set(s)')
    return 0


if __name__ == '__main__':
    sys.exit(main())
