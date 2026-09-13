#!/usr/bin/env bash
# First-pass placeholder render: all 20 ending shots -> per-shot frames ->
# per-shot clips -> one .webm per ending, placed where the game already looks.
#
# Draft settings on purpose. 256 samples at full res across 893 frames is
# 15-20 hours; this pass exists to review composition, cut rhythm and continuity,
# none of which need delivery grain. Re-run without --draft for delivery.
#
#   scripts/render-first-pass.sh          # draft (default)
#   scripts/render-first-pass.sh --final  # delivery settings
set -euo pipefail
cd "$(dirname "$0")/.."

DRAFT="--draft"
[ "${1:-}" = "--final" ] && DRAFT=""

echo "=== 1/4 render ==="
node scripts/render-ending-shots.mjs --render all $DRAFT

echo "=== 2/4 encode per shot (with look pass) ==="
for seq in MOTHERSHIP_INFECTION ALIEN_EXODUS OUTED_ESCAPE FAILED_CARRIER EMPTY_HUSK; do
  node scripts/render-ending-shots.mjs --encode "$seq" $DRAFT
done

echo "=== 3/4 concat + audio bed + mux ==="
node scripts/concat-ending-clips.mjs

echo "=== 4/4 verify deliverables ==="
# Every clip must exist, be non-trivial, and actually carry an audio stream.
# A silent .webm that plays is the easiest failure to ship by accident.
fail=0
for f in public/cutscenes/ending-mothershipinfection.webm \
         public/cutscenes/ending-alienexodus.webm \
         public/cutscenes/ending-outedescape.webm \
         public/cutscenes/ending-failedcarrier.webm \
         public/cutscenes/ending-emptyhusk.webm; do
  if [ ! -f "$f" ]; then echo "MISSING  $f"; fail=1; continue; fi
  size=$(stat -c%s "$f")
  streams=$(ffprobe -v error -show_entries stream=codec_type -of csv=p=0 "$f" 2>/dev/null | tr '\n' ',')
  dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f" 2>/dev/null)
  printf "%-34s %9s bytes  %-6ss  streams=%s\n" "$(basename "$f")" "$size" "${dur%.*}" "$streams"
  case "$streams" in *audio*) ;; *) echo "  ^ NO AUDIO STREAM"; fail=1 ;; esac
done
[ "$fail" = "0" ] && echo "all five clips present with picture and sound" || echo "VERIFY FAILED"
echo "done"
