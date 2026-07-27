#!/usr/bin/env bash
set -euo pipefail

# Repack the normalized 2x8 working atlas into the legacy .full 4x4 contract.
# The browser loader keys green out, matching the original asset pipeline.
source_path="$1"
output_path="$2"
work_dir="$(mktemp -d)"
trap 'rm -rf "$work_dir"' EXIT

convert -size 1024x1024 'xc:#00ff00' "$work_dir/canvas.png"

# direction-index -> legacy row, base column
rows=(1 3 3 2 2 1 0 0)
columns=(2 2 0 2 0 0 2 0)

for direction in 0 1 2 3 4 5 6 7; do
    row="${rows[$direction]}"
    base_column="${columns[$direction]}"

    for frame in 0 1; do
        convert "$source_path" +repage \
            -crop "256x256+$((frame * 256))+$((direction * 256))" \
            +repage "$work_dir/frame.png"

        convert "$work_dir/canvas.png" "$work_dir/frame.png" \
            -geometry "+$(((base_column + frame) * 256))+$((row * 256))" \
            -composite "$work_dir/next.png"
        mv "$work_dir/next.png" "$work_dir/canvas.png"
    done
done

convert "$work_dir/canvas.png" -define png:color-type=6 "$output_path"
