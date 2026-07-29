#!/usr/bin/env bash
set -euo pipefail

source_dir="${1:-art/source/art-remaster/sprite-prototypes/scout/direction-pairs}"
output_path="${2:-art/source/art-remaster/sprite-prototypes/scout/scout_walk_v2_atlas.png}"
work_dir="$(mktemp -d)"
trap 'rm -rf "$work_dir"' EXIT

normalize_pair() {
    local direction="$1"
    local source_path="$source_dir/$direction.png"

    for frame in 0 1; do
        local crop_x=$((frame * 793))
        convert "$source_path" \
            -crop "793x992+${crop_x}+0" +repage \
            -trim +repage \
            -filter point -resize '220x220>' \
            -gravity south -background none -extent 256x244 \
            -gravity center -extent 256x256 \
            "$work_dir/${direction}-${frame}.png"
    done

    convert \
        "$work_dir/${direction}-0.png" \
        "$work_dir/${direction}-1.png" \
        +append "$work_dir/${direction}.png"
}

for direction in east southeast south northeast north; do
    normalize_pair "$direction"
done

# Prototype-only derived directions. These guarantee matching scale and timing,
# but mirror suit asymmetry; final masters should replace them with authored art.
convert "$work_dir/east.png" -flop "$work_dir/west.png"
convert "$work_dir/southeast.png" -flop "$work_dir/southwest.png"
convert "$work_dir/northeast.png" -flop "$work_dir/northwest.png"

# Runtime direction index order:
# east, southeast, south, southwest, west, northwest, north, northeast.
convert \
    "$work_dir/east.png" \
    "$work_dir/southeast.png" \
    "$work_dir/south.png" \
    "$work_dir/southwest.png" \
    "$work_dir/west.png" \
    "$work_dir/northwest.png" \
    "$work_dir/north.png" \
    "$work_dir/northeast.png" \
    -append "$output_path"

