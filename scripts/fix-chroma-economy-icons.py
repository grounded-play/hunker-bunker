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
import sys
from collections import deque

import numpy as np
from PIL import Image, ImageFilter

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


def is_green_plate(img, sample=40):
    """True when the image border is overwhelmingly chroma green."""
    rgb = np.asarray(img.convert('RGB'), dtype=np.float32)
    border = np.concatenate([
        rgb[:sample, :].reshape(-1, 3), rgb[-sample:, :].reshape(-1, 3),
        rgb[:, :sample].reshape(-1, 3), rgb[:, -sample:].reshape(-1, 3),
    ])
    r, g, b = border[:, 0], border[:, 1], border[:, 2]
    greenish = (g > r * GREEN_DOMINANCE) & (g > b * GREEN_DOMINANCE) & (g > GREEN_FLOOR)
    return float(greenish.mean()) > 0.80


def key_green(img, feather=1.5):
    """Flood-fill the green surround from the edges, leaving the subject opaque.

    Flood fill rather than a global colour test so green *inside* the subject --
    an indicator LED, a reflection -- is not punched out along with the backdrop.
    """
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
        if os.path.exists(icon) and is_green_plate(Image.open(icon)):
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

    plate = backdrop()
    for slug in offenders:
        repair(slug, plate)
        print(f'  repaired {slug} (master + 512 + 256)')
    print(f'[economy-icons] repaired {len(offenders)} icon set(s)')
    return 0


if __name__ == '__main__':
    sys.exit(main())
