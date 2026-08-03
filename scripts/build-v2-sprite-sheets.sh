#!/usr/bin/env bash
set -euo pipefail

asset_dir="${1:-art/source/art-remaster/sprites-v2}"
work_dir="$(mktemp -d)"
trap 'rm -rf "$work_dir"' EXIT

normalize_class_atlas() {
    local class_name="$1"
    local source_rows="$2"
    local source_path="$asset_dir/${class_name}_walk_v2_source.png"
    local dimensions
    dimensions="$(identify -format '%w %h' "$source_path")"
    local width="${dimensions% *}"
    local height="${dimensions#* }"
    local source_cell_width=$((width / 2))
    local source_cell_height=$((height / source_rows))

    for row in 0 1 2 3 4 5 6; do
        for frame in 0 1; do
            convert "$source_path" \
                -crop "${source_cell_width}x${source_cell_height}+$((frame * source_cell_width))+$((row * source_cell_height))" \
                +repage -trim +repage \
                -filter point -resize '220x220>' \
                -gravity south -background none -extent 256x244 \
                -gravity center -extent 256x256 \
                "$work_dir/${class_name}-${row}-${frame}.png"
        done
        convert "$work_dir/${class_name}-${row}-0.png" \
            "$work_dir/${class_name}-${row}-1.png" \
            +append "$work_dir/${class_name}-${row}.png"
    done

    # The generators either clipped or omitted NE. Mirror NW as a deterministic
    # temporary row; final art can replace it without changing the atlas layout.
    convert "$work_dir/${class_name}-5.png" -flop "$work_dir/${class_name}-7.png"

    convert \
        "$work_dir/${class_name}-0.png" \
        "$work_dir/${class_name}-1.png" \
        "$work_dir/${class_name}-2.png" \
        "$work_dir/${class_name}-3.png" \
        "$work_dir/${class_name}-4.png" \
        "$work_dir/${class_name}-5.png" \
        "$work_dir/${class_name}-6.png" \
        "$work_dir/${class_name}-7.png" \
        -append "$asset_dir/${class_name}_walk_v2.png"
}

normalize_enemy_sheet() {
    local source_name="$1"
    convert "$asset_dir/${source_name}.png" \
        -filter point -resize 1024x1024! \
        "$asset_dir/${source_name}.png"
}

normalize_class_atlas tank 8
normalize_class_atlas engineer 7

for enemy in \
    alien_proto_crawler_walk_v2 \
    alien_proto_spitter_walk_v2 \
    boss_corrupted_scout_v2 \
    boss_corrupted_tank_v2 \
    boss_corrupted_engineer_v2
do
    normalize_enemy_sheet "$enemy"
done

# The crawler generator returned front, profiles, then back. Reorder to the
# runtime's south, north, east, west contract.
convert "$asset_dir/alien_proto_crawler_walk_v2.png" \
    -crop 1024x256+0+0 +repage "$work_dir/crawler-south.png"
convert "$asset_dir/alien_proto_crawler_walk_v2.png" \
    -crop 1024x256+0+768 +repage "$work_dir/crawler-north.png"
convert "$asset_dir/alien_proto_crawler_walk_v2.png" \
    -crop 1024x256+0+256 +repage "$work_dir/crawler-east.png"
convert "$asset_dir/alien_proto_crawler_walk_v2.png" \
    -crop 1024x256+0+512 +repage "$work_dir/crawler-west.png"
convert \
    "$work_dir/crawler-south.png" \
    "$work_dir/crawler-north.png" \
    "$work_dir/crawler-east.png" \
    "$work_dir/crawler-west.png" \
    -append "$asset_dir/alien_proto_crawler_walk_v2.png"

