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

echo "=== 1/3 render ==="
node scripts/render-ending-shots.mjs --render all $DRAFT

echo "=== 2/3 encode per shot ==="
for seq in MOTHERSHIP_INFECTION ALIEN_EXODUS OUTED_ESCAPE FAILED_CARRIER EMPTY_HUSK; do
  node scripts/render-ending-shots.mjs --encode "$seq" $DRAFT
done

echo "=== 3/3 concat per ending ==="
node scripts/concat-ending-clips.mjs
echo "done"
