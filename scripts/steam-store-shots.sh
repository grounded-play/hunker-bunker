#!/usr/bin/env bash
# Finish raw frames from tests/e2e/probes/steam-store-shots.spec.js for the
# Steam store: the probe saves the 16:10 game stage at 2x; this trims the top
# to 16:9 (the HUD sits on the bottom edge, so it stays whole) and downsamples
# to 1920x1080. See docs/planning/steam-store-page-v2-copy-and-images-2026-10-14.md.
#   scripts/steam-store-shots.sh <raw dir> <out dir> [name ...]
# With no names, every PNG in <raw dir> is finished.
set -euo pipefail
raw=${1:?raw dir}
out=${2:?out dir}
shift 2
mkdir -p "$out"
names=("$@")
if [ ${#names[@]} -eq 0 ]; then
    mapfile -t names < <(cd "$raw" && ls ./*.png | sed 's#^\./##; s#\.png$##')
fi
for name in "${names[@]}"; do
    src="$raw/$name.png"
    read -r w h < <(identify -format '%w %h\n' "$src")
    crop_h=$(( w * 9 / 16 ))
    if [ "$crop_h" -gt "$h" ]; then crop_h=$h; fi
    convert "$src" -gravity south -crop "${w}x${crop_h}+0+0" +repage \
        -filter Lanczos -resize 1920x1080! -unsharp 0x0.6+0.4+0.02 \
        -strip "$out/$name.png"
    echo "$out/$name.png"
done
