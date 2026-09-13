"""Render one deterministic low-cost review frame from an existing ending scene."""
import os
import sys
from pathlib import Path

import bpy

camera_name = os.environ.get("HB_SHOT_CAMERA", "")
camera = bpy.data.objects.get(camera_name)
if camera is None or camera.type != "CAMERA":
    print(f"[render_review_frame] missing camera {camera_name}", file=sys.stderr)
    sys.exit(1)

scene = bpy.context.scene
scene.camera = camera
scene.frame_set(int(os.environ.get("HB_SHOT_FRAME", "1")))
scene.render.resolution_x = 960
scene.render.resolution_y = 540
scene.render.resolution_percentage = 100
scene.cycles.samples = 32
scene.render.image_settings.file_format = "PNG"
output = Path(os.environ["HB_SHOT_OUTPUT"]).resolve()
output.parent.mkdir(parents=True, exist_ok=True)
scene.render.filepath = str(output)
bpy.ops.render.render(write_still=True)
print(f"[render_review_frame] {camera_name} -> {output}")
