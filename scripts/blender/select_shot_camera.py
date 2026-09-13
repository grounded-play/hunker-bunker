"""Point a production ending scene at one shot's camera before rendering.

The five production scenes each hold every camera for their sequence, so the
render driver selects one per shot rather than there being a file per shot.
Passed by environment rather than `--` argv because Blender treats everything
after `--` as script arguments, which would swallow the -o/-f render flags.
"""
import os
import sys

import bpy

name = os.environ.get("HB_SHOT_CAMERA", "")
camera = bpy.data.objects.get(name)
if camera is None or camera.type != "CAMERA":
    available = [o.name for o in bpy.context.scene.objects if o.type == "CAMERA"]
    print(f"[select_shot_camera] no camera '{name}'. available: {available}")
    sys.exit(1)
scene = bpy.context.scene
scene.camera = camera

# Draft overrides for a first-pass placeholder. A composition and timing review
# does not need delivery samples: 256 across 893 frames is 15-20 hours, and 64
# with the denoiser still on answers the same questions in a quarter of that.
# Resolution scales too, because a placeholder is watched, not inspected.
draft_samples = os.environ.get("HB_DRAFT_SAMPLES")
if draft_samples:
    scene.cycles.samples = max(1, int(draft_samples))
draft_scale = os.environ.get("HB_DRAFT_SCALE")
if draft_scale:
    scene.render.resolution_percentage = max(1, min(100, int(draft_scale)))

print(
    f"[select_shot_camera] rendering through {camera.name} "
    f"at {scene.cycles.samples} samples, {scene.render.resolution_percentage}%"
)
