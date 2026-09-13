#!/usr/bin/env node
/**
 * Assembles rendered animation frames into sprite strips or 2D sprite sheets (atlases)
 * and generates standardized JSON frame specifications.
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

function parseArgs(args) {
  const options = {
    manifest: "scripts/blender/manifests/scout-walk.json",
    framesDir: "scratch/prerenders/scout-walk",
    outDir: "scratch/prerenders/assembled",
    direction: null, // If set, only assemble strip for this direction
    atlas: false,
    writeSpec: true,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--manifest" && i + 1 < args.length) {
      options.manifest = args[++i];
    } else if ((arg === "--frames-dir" || arg === "--input" || arg === "-i") && i + 1 < args.length) {
      options.framesDir = args[++i];
    } else if ((arg === "--out-dir" || arg === "--output" || arg === "-o") && i + 1 < args.length) {
      options.outDir = args[++i];
    } else if (arg === "--direction" && i + 1 < args.length) {
      options.direction = args[++i];
    } else if (arg === "--atlas") {
      options.atlas = true;
    } else if (arg === "--no-spec") {
      options.writeSpec = false;
    }
  }

  return options;
}

function runPythonAssembler(params) {
  const pythonScript = `
import json
import sys
from pathlib import Path
from PIL import Image

manifest_path = Path(sys.argv[1])
frames_dir = Path(sys.argv[2])
out_dir = Path(sys.argv[3])
target_dir = sys.argv[4] if len(sys.argv) > 4 and sys.argv[4] != "null" else None
make_atlas = sys.argv[5] == "true" if len(sys.argv) > 5 else True

with manifest_path.open("r", encoding="utf-8") as f:
    manifest = json.load(f)

subject = manifest.get("subject", "Character")
action = manifest.get("action", "action")
columns = manifest.get("columns", 8)
cell_size = manifest.get("cellSize", 256)
directions = manifest.get("directions", [])

out_dir.mkdir(parents=True, exist_ok=True)

# 1. Assemble single direction strip if requested
if target_dir:
    strip_w = columns * cell_size
    strip_h = cell_size
    strip_im = Image.new("RGBA", (strip_w, strip_h), (0, 0, 0, 0))
    missing = []
    for f_idx in range(columns):
        frame_file = frames_dir / f"{subject}.{action}.{target_dir}.{f_idx:02d}.png"
        if not frame_file.exists():
            missing.append(str(frame_file))
            continue
        with Image.open(frame_file) as im:
            strip_im.paste(im, (f_idx * cell_size, 0))
    if missing:
        print(f"Error: missing frames for direction {target_dir}: {missing}", file=sys.stderr)
        sys.exit(1)

    strip_path = out_dir / f"{subject}.{action}.{target_dir}-strip.png"
    strip_im.save(strip_path)
    print(f"Saved strip: {strip_path} ({strip_w}x{strip_h})")

# 2. Assemble full 8-direction atlas if requested
if make_atlas:
    rows = len(directions)
    atlas_w = columns * cell_size
    atlas_h = rows * cell_size
    atlas_im = Image.new("RGBA", (atlas_w, atlas_h), (0, 0, 0, 0))

    missing = []
    for r_idx, d_info in enumerate(directions):
        d_name = d_info["name"]
        for f_idx in range(columns):
            frame_file = frames_dir / f"{subject}.{action}.{d_name}.{f_idx:02d}.png"
            if not frame_file.exists():
                missing.append(str(frame_file))
                continue
            with Image.open(frame_file) as im:
                atlas_im.paste(im, (f_idx * cell_size, r_idx * cell_size))

    if missing:
        print(f"Warning: {len(missing)} missing frames for full atlas.", file=sys.stderr)
        if len(missing) == rows * columns:
            print("No frames found. Aborting atlas build.", file=sys.stderr)
            sys.exit(1)

    atlas_filename = manifest.get("targetAtlasFilename", f"{subject}.{action}_v4.png")
    atlas_path = out_dir / atlas_filename
    atlas_im.save(atlas_path)
    print(f"Saved atlas: {atlas_path} ({atlas_w}x{atlas_h})")

    # Generate sidecar spec
    spec_path = out_dir / f"{Path(atlas_filename).stem}-frame-spec.json"
    spec_data = {
        "version": 1,
        "subject": subject,
        "action": action,
        "atlasFile": atlas_filename,
        "width": atlas_w,
        "height": atlas_h,
        "columns": columns,
        "rows": rows,
        "frameWidth": cell_size,
        "frameHeight": cell_size,
        "fps": manifest.get("frameRate", 10),
        "sourceModel": manifest.get("sourceModel"),
        "sourceActionName": manifest.get("sourceActionName"),
        "calibration": manifest.get("camera"),
        "directions": [
            {
                "name": d["name"],
                "rowIndex": idx,
                "rotZ": d["rotZ"],
                "deg": d.get("deg", 0)
            }
            for idx, d in enumerate(directions)
        ]
    }
    with spec_path.open("w", encoding="utf-8") as f:
        json.dump(spec_data, f, indent=2)
    print(f"Saved sidecar spec: {spec_path}")
`;

  const res = spawnSync("python3", [
    "-c",
    pythonScript,
    params.manifest,
    params.framesDir,
    params.outDir,
    params.direction || "null",
    String(params.atlas),
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
  console.log(`Assembling sprites with manifest: ${options.manifest}`);
  if (!fs.existsSync(options.manifest)) {
    console.error(`Manifest not found: ${options.manifest}`);
    process.exit(1);
  }

  runPythonAssembler(options);
}

main();
