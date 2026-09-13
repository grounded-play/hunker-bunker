#!/usr/bin/env bash
# One representative frame per shot, across every ending sequence.
#
# Why a test pass rather than a full render: 20 frames is minutes, 893 frames is
# hours. Every black-frame defect this sprint would have been caught by looking
# at one frame per shot, and three of them went unnoticed far longer than that.
#
#   scripts/render-shot-tests.sh            # render all 20
#   scripts/render-shot-tests.sh --plan     # print the plan only
set -u
OUT="art/source/blender-prerenders/tests"
PLAN_ONLY=0
[ "${1:-}" = "--plan" ] && PLAN_ONLY=1

plan() {
  node - <<'JS'
const { readFileSync } = require('node:fs');
const m = JSON.parse(readFileSync('scripts/blender/manifests/ending-shots.json','utf8'));
for (const seq of m.sequences) {
  const slug = seq.id.toLowerCase();
  for (const shot of seq.shots) {
    // Mid-shot frame: the camera has moved off its first keyframe, so a
    // composition that only works at frame one is exposed.
    const mid = Math.round((Number(shot.startFrame) + Number(shot.endFrame)) / 2);
    console.log([`art/source/blender-prerenders/scenes/ending_${slug}.blend`,
                 `CAM_${shot.id.replace(/-/g,'_')}`, mid, shot.id].join('\t'));
  }
}
JS
}

if [ "$PLAN_ONLY" = "1" ]; then plan; exit 0; fi

mkdir -p "$OUT"
plan | while IFS=$'\t' read -r blend cam frame shot; do
  HB_SHOT_CAMERA="$cam" blender -b "$blend" -P scripts/blender/select_shot_camera.py \
    -o "$OUT/${shot}-####" -F PNG -f "$frame" >/dev/null 2>&1
  f=$(printf "%s/%s-%04d.png" "$OUT" "$shot" "$frame")
  size=$(stat -c%s "$f" 2>/dev/null || echo 0)
  # A ~940KB 1080p PNG from these sets is the signature of a black frame --
  # which is how three defects this sprint hid behind a zero exit code.
  flag=""
  [ "$size" -lt 1000000 ] && flag="  <-- SUSPECT (likely black)"
  printf "%-8s frame %-4s %10s bytes%s\n" "$shot" "$frame" "$size" "$flag"
done
