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
bpy.context.scene.camera = camera
print(f"[select_shot_camera] rendering through {camera.name}")
