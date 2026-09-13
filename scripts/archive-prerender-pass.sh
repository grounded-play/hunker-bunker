#!/usr/bin/env bash
# Snapshot the current prerender state before a rebuild overwrites it.
#
# Rebuilding a scene overwrites its .blend, and re-rendering overwrites frames.
# Both are expensive to reproduce -- 683 frames and ~240MB of scenes at the time
# this was written -- and a scene rebuilt with different lighting is not
# recoverable from the generator alone, because the generator has moved on.
#
# Uses hardlinks, so a snapshot of 300MB costs kilobytes and is byte-identical
# by construction rather than by copy. Blender writes a NEW inode when it saves,
# so the archived link keeps the old bytes rather than following the edit.
#
#   scripts/archive-prerender-pass.sh [label]
set -euo pipefail
cd "$(dirname "$0")/.."

ROOT="art/source/blender-prerenders"
LABEL="${1:-pass}"
STAMP="$(date +%Y%m%d-%H%M%S)"
DEST="$ROOT/archive/${STAMP}-${LABEL}"

mkdir -p "$DEST"
for sub in scenes tests frames; do
  [ -d "$ROOT/$sub" ] || continue
  # -l hardlinks; --reflink would also work on btrfs but is not portable here.
  cp -al "$ROOT/$sub" "$DEST/$sub" 2>/dev/null || cp -a "$ROOT/$sub" "$DEST/$sub"
done

# Record what produced it, so an archived pass can be explained later.
{
  echo "archived: $(date -Iseconds)"
  echo "label:    $LABEL"
  echo "commit:   $(git rev-parse --short HEAD 2>/dev/null || echo unknown)"
  echo "branch:   $(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown)"
  echo "dirty:    $(git status --porcelain 2>/dev/null | wc -l) uncommitted path(s)"
  echo
  echo "scenes: $(find "$DEST/scenes" -name '*.blend' 2>/dev/null | wc -l)"
  echo "tests:  $(find "$DEST/tests" -name '*.png' 2>/dev/null | wc -l)"
  echo "frames: $(find "$DEST/frames" -name '*.png' 2>/dev/null | wc -l)"
} > "$DEST/MANIFEST.txt"

cat "$DEST/MANIFEST.txt"
echo "-> $DEST"
