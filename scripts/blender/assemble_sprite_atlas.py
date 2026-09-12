"""Assemble rendered frames into an atlas strip and a contact sheet.

Phase 0 of docs/planning/blender-prerendered-animation-plan-2026-09-12.md.
Pure PIL: no Blender, so it runs in CI and in tests.

    python3 scripts/blender/assemble_sprite_atlas.py \
        --frames art/source/blender-prerenders/scout/walk --out .../scout
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys

from PIL import Image

COLUMNS = 8
ROWS = 8
DIRECTIONS = ["SE", "S", "SW", "W", "NW", "N", "NE", "E"]


def load_row(frames_dir: Path, clip: str, direction: str, cell: int) -> list[Image.Image] | None:
    images = []
    for column in range(COLUMNS):
        path = frames_dir / f"{clip}_{direction}_{column:02d}.png"
        if not path.exists():
            return None
        im = Image.open(path).convert("RGBA")
        if im.size != (cell, cell):
            raise SystemExit(f"{path.name} is {im.size}, expected {cell}x{cell}")
        images.append(im)
    return images


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--frames", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--cell", type=int, default=256)
    args = parser.parse_args()

    frames_dir = Path(args.frames)
    manifest_path = frames_dir / "frames.json"
    if not manifest_path.exists():
        print(f"[assemble] no frames.json in {frames_dir}", file=sys.stderr)
        return 2
    manifest = json.loads(manifest_path.read_text())
    clip = manifest["clip"]
    cell = args.cell

    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    rows = {d: load_row(frames_dir, clip, d, cell) for d in DIRECTIONS}
    authored = [d for d, r in rows.items() if r]

    # Per-direction strip: the Phase 0 deliverable, reviewable on its own.
    for direction in authored:
        strip = Image.new("RGBA", (COLUMNS * cell, cell), (0, 0, 0, 0))
        for column, im in enumerate(rows[direction]):
            strip.paste(im, (column * cell, 0), im)
        strip.save(out_dir / f"{clip}_{direction}_strip.png")

    # Contact sheet: every authored direction stacked, unauthored rows left
    # transparent so a partial atlas is obviously partial rather than silently
    # reusing a facing -- the exact defect the live Engineer sheet has.
    sheet = Image.new("RGBA", (COLUMNS * cell, ROWS * cell), (0, 0, 0, 0))
    for row, direction in enumerate(DIRECTIONS):
        if not rows[direction]:
            continue
        for column, im in enumerate(rows[direction]):
            sheet.paste(im, (column * cell, row * cell), im)
    sheet.save(out_dir / f"{clip}_contact_sheet.png")

    report = {
        "clip": clip,
        "cellSize": cell,
        "authoredDirections": authored,
        "missingDirections": [d for d in DIRECTIONS if d not in authored],
        "complete": len(authored) == ROWS,
    }
    (out_dir / f"{clip}_assembly.json").write_text(json.dumps(report, indent=2))
    print(f"[assemble] {len(authored)}/{ROWS} directions -> {out_dir}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
