#!/usr/bin/env python3
"""Pixel-level alpha and seam audit used by audit-texture-decal-usage.mjs."""

import json
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]


def main() -> None:
    failures = []
    decal_rows = []
    for path in sorted((ROOT / 'public').glob('decal_*.png')):
        rgba = np.asarray(Image.open(path).convert('RGBA'))
        alpha = rgba[..., 3]
        coverage = float((alpha > 8).mean())
        transparent = float((alpha < 8).mean())
        if alpha.min() != 0:
            failures.append(f'{path.name}: no fully transparent pixels')
        if alpha.max() < 240:
            failures.append(f'{path.name}: no solid subject pixels')
        if not 0.005 <= coverage <= 0.995:
            failures.append(f'{path.name}: implausible alpha coverage {coverage:.4f}')
        decal_rows.append({'name': path.stem, 'coverage': coverage, 'transparent': transparent})

    seam_rows = []
    source = ROOT / 'public/3d/runtime/surfaces'
    for path in sorted(source.glob('tex_*_[abcd]_baseColor.webp')):
        # Only suites retaining review WebPs are pixel-audited here. Every
        # compressed array layer is separately validated by the JS audit.
        rgb = np.asarray(Image.open(path).convert('RGB'), dtype=np.float32) / 255.0
        mean_error = max(
            float(np.abs(rgb[0] - rgb[-1]).mean()),
            float(np.abs(rgb[:, 0] - rgb[:, -1]).mean()),
        )
        if mean_error > 0.025:
            failures.append(f'{path.name}: edge mean error {mean_error:.5f}')
        seam_rows.append({'name': path.stem, 'edgeMeanError': mean_error})

    result = {
        'failures': failures,
        'decals': len(decal_rows),
        'decalCoverageMin': min(row['coverage'] for row in decal_rows),
        'decalCoverageMax': max(row['coverage'] for row in decal_rows),
        'seamLayers': len(seam_rows),
        'seamErrorMax': max(row['edgeMeanError'] for row in seam_rows),
    }
    print(json.dumps(result))
    raise SystemExit(1 if failures else 0)


if __name__ == '__main__':
    main()
