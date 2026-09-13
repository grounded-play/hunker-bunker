"""Render a directional sprite atlas from a Mixamo-rigged character.

Phase 0 of docs/planning/blender-prerendered-animation-plan-2026-09-12.md.

Runs headless, in its own Blender process:

    blender --background --python scripts/blender/render_sprite_atlas.py -- \
        --clip walk --direction E --out art/source/blender-prerenders/scout

Never run this against an interactive session. It resets the scene, and this
repo routinely has a live Blender open with other work in it.

Determinism is the point of Phase 0's exit criteria, so everything that can
drift is pinned: a fixed sample count, integer frame indices, a fixed seed,
no denoiser, and a camera derived from constants rather than the saved view.
"""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path
import sys

import bpy


# Mirrors src/spriteAtlasContract.js. These are read off Tank.walk_v4.png,
# the atlas that already ships and works.
COLUMNS = 8
ROWS = 8
CELL = 256

# Row order must match DIRECTION_NAMES in the JS contract, which is itself
# derived from getDirectionIndexFromScreenAxes: screen-right is east at index 0.
DIRECTIONS = ["E", "SE", "S", "SW", "W", "NW", "N", "NE"]

# Clip sources, reusing the mapping build_mixamo_scout_glb.py already
# established rather than inventing a second source of truth.
CLIPS = {
    "walk": "Basic Shooter Pack/walking.fbx",
    "run": "Basic Shooter Pack/run.fbx",
    "idle": "Basic Shooter Pack/rifle aiming idle.fbx",
}

# The game's camera is a fixed isometric. Elevation is the angle the plan's
# camera section specifies; distance is set so a 1.8m character fills the cell
# with the headroom the anchor contract expects.
CAMERA_ELEVATION_DEG = 35.264  # true isometric
CAMERA_DISTANCE = 6.0
# Tuned empirically from the Phase 0 strip. At 2.6 the character filled only
# ~55% of the cell height, throwing away resolution the atlas already pays for
# in file size; at 1.75 the feet clipped, because a ~1.8m figure cannot fit a
# 1.75-unit orthographic box at all. 2.1 fills ~70% with the feet inside the
# cell across the whole cycle.
ORTHO_SCALE = 2.1


def arguments() -> argparse.Namespace:
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", default="art/source/mixamo/scout")
    parser.add_argument("--clip", default="walk", choices=sorted(CLIPS))
    parser.add_argument("--direction", default="E",
                        help="single direction name, or ALL for the full atlas")
    parser.add_argument("--out", required=True)
    parser.add_argument("--cell", type=int, default=CELL)
    return parser.parse_args(argv)


def reset_scene() -> None:
    bpy.ops.wm.read_factory_settings(use_empty=True)


def frame_indices(action: bpy.types.Action) -> list[int]:
    """Even samples across the clip, excluding the loop endpoint.

    Frame 0 and frame N of a cycle are the same pose; sampling both makes the
    walk hitch once per loop. Mirrors frameSequence() in the JS contract.
    """
    start, end = (int(round(v)) for v in action.frame_range)
    span = max(1, end - start)
    return [start + int(round(span * i / COLUMNS)) for i in range(COLUMNS)]


def configure_render(cell: int) -> None:
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.render.resolution_x = cell
    scene.render.resolution_y = cell
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.color_depth = "8"
    # Determinism: fixed seed, fixed samples, no adaptive sampling or denoise.
    scene.cycles.seed = 0
    scene.cycles.use_animated_seed = False
    scene.cycles.samples = 128
    scene.cycles.use_adaptive_sampling = False
    scene.cycles.use_denoising = False


def place_camera(yaw_deg: float, target_z: float = 0.95) -> bpy.types.Object:
    """Orbit an orthographic camera to a yaw at the fixed isometric elevation.

    Orthographic matters: a perspective camera changes the character's apparent
    scale between directions, which the plan's exit criteria explicitly forbid.
    """
    yaw = math.radians(yaw_deg)
    pitch = math.radians(CAMERA_ELEVATION_DEG)
    x = CAMERA_DISTANCE * math.cos(pitch) * math.sin(yaw)
    y = -CAMERA_DISTANCE * math.cos(pitch) * math.cos(yaw)
    z = CAMERA_DISTANCE * math.sin(pitch) + target_z

    data = bpy.data.cameras.new("AtlasCamera")
    data.type = "ORTHO"
    data.ortho_scale = ORTHO_SCALE
    camera = bpy.data.objects.new("AtlasCamera", data)
    bpy.context.collection.objects.link(camera)
    camera.location = (x, y, z)

    target = bpy.data.objects.new("AtlasTarget", None)
    bpy.context.collection.objects.link(target)
    target.location = (0.0, 0.0, target_z)
    track = camera.constraints.new("TRACK_TO")
    track.target = target
    track.track_axis = "TRACK_NEGATIVE_Z"
    track.up_axis = "UP_Y"

    bpy.context.scene.camera = camera
    return camera


def add_lighting() -> None:
    """Three-point rig, fixed. Deliberately not the .blend's saved lighting:
    a sprite sheet re-rendered months later must match the first pass."""
    for name, loc, energy in (
        ("Key", (4.0, -4.0, 6.0), 900.0),
        ("Fill", (-5.0, -2.0, 3.0), 300.0),
        ("Rim", (0.0, 5.0, 4.0), 500.0),
    ):
        data = bpy.data.lights.new(name, type="AREA")
        data.energy = energy
        data.size = 5.0
        light = bpy.data.objects.new(name, data)
        light.location = loc
        bpy.context.collection.objects.link(light)


def recentre_in_place(armature: bpy.types.Object, root_bone: str = "mixamorig1:Hips") -> None:
    """Cancel the clip's root motion so the character walks on the spot.

    Mixamo locomotion clips travel forward in world space. Rendered straight,
    the character drifts across its cell and clips the edge by the last frames,
    which the atlas contract forbids -- a sprite must not slide inside its own
    cell.

    Horizontal travel is cancelled and vertical is left alone: the up-down bob
    is part of the walk, and flattening it produces a glide.
    """
    pose = armature.pose.bones.get(root_bone)
    if pose is None:
        # Fall back to whatever the first root-level bone is called, so a rig
        # with a different prefix still centres rather than silently drifting.
        pose = next((b for b in armature.pose.bones if b.parent is None), None)
        if pose is None:
            return
    bpy.context.view_layer.update()
    world = armature.matrix_world @ pose.head
    armature.location.x -= world.x
    armature.location.y -= world.y
    bpy.context.view_layer.update()


def main() -> int:
    args = arguments()
    source = Path(args.source)
    clip_path = source / "animations" / CLIPS[args.clip]
    if not clip_path.exists():
        print(f"[atlas] clip not found: {clip_path}", file=sys.stderr)
        return 2

    out_dir = Path(args.out) / args.clip
    out_dir.mkdir(parents=True, exist_ok=True)

    character_path = source / "Scouting.fbx"
    if not character_path.exists():
        print(f"[atlas] character not found: {character_path}", file=sys.stderr)
        return 2

    reset_scene()

    # The Mixamo animation packs are armature-only: importing a clip on its own
    # yields a rig with no mesh, and every frame renders fully transparent
    # while the render still reports success. Import the character for the
    # mesh, then take only the action from the clip -- the same split
    # build_mixamo_scout_glb.py uses.
    bpy.ops.import_scene.fbx(filepath=str(character_path.resolve()), use_anim=False)
    armature = next((o for o in bpy.context.scene.objects if o.type == "ARMATURE"), None)
    meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    if armature is None:
        print("[atlas] character FBX has no armature", file=sys.stderr)
        return 3
    if not meshes:
        print("[atlas] character FBX has no mesh -- nothing would render", file=sys.stderr)
        return 3

    before = set(bpy.context.scene.objects)
    bpy.ops.import_scene.fbx(filepath=str(clip_path.resolve()), use_anim=True)
    imported = [o for o in bpy.context.scene.objects if o not in before]
    clip_rig = next((o for o in imported if o.type == "ARMATURE"), None)
    action = clip_rig.animation_data.action if clip_rig and clip_rig.animation_data else None
    if action is None:
        print("[atlas] clip contained no action", file=sys.stderr)
        return 3

    armature.animation_data_create()
    armature.animation_data.action = action
    # Blender 4.4+ made actions "slotted": assigning .action alone leaves
    # action_slot unbound, the rig evaluates to its bind pose, and the render
    # still reports success -- eight identical frames of a character standing
    # still. Bind the slot explicitly. (This is also why Action.fcurves no
    # longer exists on 5.x; the data lives under layers/strips/channelbags.)
    slots = getattr(action, "slots", None)
    if slots:
        armature.animation_data.action_slot = slots[0]
    elif not hasattr(action, "fcurves"):
        print("[atlas] action has neither slots nor fcurves; cannot bind", file=sys.stderr)
        return 3
    # Drop the clip's own rig and meshes so only the character renders.
    for obj in imported:
        bpy.data.objects.remove(obj, do_unlink=True)

    configure_render(args.cell)
    add_lighting()

    frames = frame_indices(action)
    directions = DIRECTIONS if args.direction.upper() == "ALL" else [args.direction.upper()]

    rendered = []
    for name in directions:
        if name not in DIRECTIONS:
            print(f"[atlas] unknown direction {name}", file=sys.stderr)
            return 4
        row = DIRECTIONS.index(name)
        place_camera(row * (360.0 / ROWS))
        for column, frame in enumerate(frames):
            bpy.context.scene.frame_set(frame)
            recentre_in_place(armature)
            path = out_dir / f"{args.clip}_{name}_{column:02d}.png"
            bpy.context.scene.render.filepath = str(path)
            bpy.ops.render.render(write_still=True)
            rendered.append({"direction": name, "row": row, "column": column,
                             "sourceFrame": frame, "file": path.name})

    manifest = {
        "clip": args.clip,
        "source": str(clip_path),
        "columns": COLUMNS,
        "rows": ROWS,
        "cellSize": args.cell,
        "sampledFrames": frames,
        "frames": rendered,
    }
    (out_dir / "frames.json").write_text(json.dumps(manifest, indent=2))
    print(f"[atlas] rendered {len(rendered)} frames -> {out_dir}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
