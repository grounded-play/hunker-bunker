#!/usr/bin/env node
/**
 * Validates pre-rendered sprite strips, sheets, and sidecar specifications.
 * Checks dimensions, color mode, transparency, bounding boxes, and metadata integrity.
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

function parseArgs(args) {
  const options = {
    image: null,
    spec: null,
    expectedWidth: null,
    expectedHeight: null,
    cellWidth: 256,
    cellHeight: 256,
    expectedCols: null,
    expectedRows: null,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if ((arg === "--image" || arg === "--atlas" || arg === "-i") && i + 1 < args.length) {
      options.image = args[++i];
    } else if ((arg === "--spec" || arg === "--manifest" || arg === "-s") && i + 1 < args.length) {
      options.spec = args[++i];
    } else if (arg === "--width" && i + 1 < args.length) {
      options.expectedWidth = parseInt(args[++i], 10);
    } else if (arg === "--height" && i + 1 < args.length) {
      options.expectedHeight = parseInt(args[++i], 10);
    } else if (arg === "--cell" && i + 1 < args.length) {
      const val = parseInt(args[++i], 10);
      options.cellWidth = val;
      options.cellHeight = val;
    }
  }

  return options;
}

function runPythonValidation(options) {
  const pythonScript = `
import json
import sys
from pathlib import Path
from PIL import Image

image_path = Path(sys.argv[1])
spec_path = Path(sys.argv[2]) if len(sys.argv) > 2 and sys.argv[2] != "null" else None
exp_w = int(sys.argv[3]) if len(sys.argv) > 3 and sys.argv[3] != "null" else None
exp_h = int(sys.argv[4]) if len(sys.argv) > 4 and sys.argv[4] != "null" else None
cell_w = int(sys.argv[5]) if len(sys.argv) > 5 else 256
cell_h = int(sys.argv[6]) if len(sys.argv) > 6 else 256

if not image_path.exists():
    print(f"FAIL: Image not found: {image_path}", file=sys.stderr)
    sys.exit(1)

with Image.open(image_path) as im:
    width, height = im.size
    mode = im.mode
    print(f"Image: {image_path} ({width}x{height}, mode={mode})")

    if mode != "RGBA":
        print(f"FAIL: Expected RGBA image, got mode={mode}", file=sys.stderr)
        sys.exit(1)

    if exp_w is not None and width != exp_w:
        print(f"FAIL: Expected width {exp_w}, got {width}", file=sys.stderr)
        sys.exit(1)

    if exp_h is not None and height != exp_h:
        print(f"FAIL: Expected height {exp_h}, got {height}", file=sys.stderr)
        sys.exit(1)

    cols = width // cell_w
    rows = height // cell_h

    # Check each cell for content and valid framing
    empty_cells = []
    baseline_stats = []
    for r in range(rows):
        for c in range(cols):
            box = (c * cell_w, r * cell_h, (c + 1) * cell_w, (r + 1) * cell_h)
            cell = im.crop(box)
            bbox = cell.getbbox()
            if not bbox:
                empty_cells.append((r, c))
            else:
                x0, y0, x1, y1 = bbox
                baseline_stats.append(y1)
                # Verify character is not clipped at borders
                if x0 == 0 or x1 == cell_w or y0 == 0 or y1 == cell_h:
                    print(f"WARNING: Cell ({r}, {c}) touches boundary: {bbox}")

    if empty_cells:
        print(f"FAIL: {len(empty_cells)} empty cell(s) detected: {empty_cells[:5]}...", file=sys.stderr)
        sys.exit(1)

    avg_baseline = sum(baseline_stats) / len(baseline_stats)
    print(f"PASS: All {cols * rows} cells populated. Average ground baseline Y: {avg_baseline:.1f}px (target ~220-240px)")

# Validate spec if provided
if spec_path and spec_path.exists():
    with spec_path.open("r", encoding="utf-8") as f:
        spec = json.load(f)
    print(f"Sidecar spec: {spec_path} (version {spec.get('version')})")
    assert spec.get("width") == width, f"Spec width mismatch: {spec.get('width')} vs {width}"
    assert spec.get("height") == height, f"Spec height mismatch: {spec.get('height')} vs {height}"
    assert spec.get("columns") == cols, f"Spec columns mismatch"
    assert spec.get("rows") == rows, f"Spec rows mismatch"
    print("PASS: Sidecar specification perfectly matches sprite geometry.")

print("SUCCESS: All pre-rendered sprite validation criteria passed.")
`;

  const res = spawnSync("python3", [
    "-c",
    pythonScript,
    options.image,
    options.spec || "null",
    options.expectedWidth != null ? String(options.expectedWidth) : "null",
    options.expectedHeight != null ? String(options.expectedHeight) : "null",
    String(options.cellWidth),
    String(options.cellHeight),
  ], { encoding: "utf-8" });

  if (res.error) {
    throw res.error;
  }
  if (res.status !== 0) {
    console.error(res.stderr);
    process.exit(res.status ?? 1);
  }
  console.log(res.stdout);
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!options.image) {
    console.error("Usage: node scripts/validate-prerender-atlas.mjs --image <path> [--spec <path>] [--width <w>] [--height <h>] [--cell <size>]");
    process.exit(1);
  }

  runPythonValidation(options);
}

main();
