#!/usr/bin/env bash
set -euo pipefail

root="${1:-public/art-remaster/sprite-v4/scout}"
strip_dir="$root/strips"
output="$root/Scout.walk_v4.png"
work_dir="$(mktemp -d)"
trap 'rm -rf "$work_dir"' EXIT

directions=(east southeast south southwest west northwest north northeast)

for row in "${!directions[@]}"; do
    direction="${directions[$row]}"
    source_path="$strip_dir/$direction.png"
    python scripts/split-transparent-strip.py \
        --input "$source_path" \
        --output-dir "$work_dir/split" \
        --prefix "$direction" \
        --expected 8

    for frame in 0 1 2 3 4 5 6 7; do
        convert "$work_dir/split/${direction}-${frame}.png" \
            -filter point -resize '220x220>' \
            -gravity south -background none -extent 256x240 \
            -gravity center -extent 256x256 \
            "$work_dir/${direction}-${frame}.png"
    done

    convert \
        "$work_dir/${direction}-0.png" \
        "$work_dir/${direction}-1.png" \
        "$work_dir/${direction}-2.png" \
        "$work_dir/${direction}-3.png" \
        "$work_dir/${direction}-4.png" \
        "$work_dir/${direction}-5.png" \
        "$work_dir/${direction}-6.png" \
        "$work_dir/${direction}-7.png" \
        +append "$work_dir/${direction}.png"
done

convert \
    "$work_dir/east.png" \
    "$work_dir/southeast.png" \
    "$work_dir/south.png" \
    "$work_dir/southwest.png" \
    "$work_dir/west.png" \
    "$work_dir/northwest.png" \
    "$work_dir/north.png" \
    "$work_dir/northeast.png" \
    -append +repage "$output"
