"""Generate one .blend per ending shot from the production brief.

    blender --background --python scripts/blender/build_ending_shot_scenes.py -- \
        --manifest scripts/blender/manifests/ending-shots.json \
        --out art/source/blender-prerenders/endings

Runs headless, in its own process. Never point this at an interactive session:
it resets the scene, and this repo routinely has a live Blender open with other
work in it.

Each generated file is a *greybox shell*, not finished art: camera solved to the
brief's lens and frame range, set placeholder, world and render settings, and --
the point of the exercise -- custom properties on the scene that name the shot
and the document section it came from. Opening any .blend answers "which shot is
this and where is it specified" without going back to a person.
"""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path
import sys

import bpy


# Lens fallback for shots the brief describes without a focal length (EH-04's
# "extreme orbital wide" today). Deliberately very wide so the substitution is
# obvious in the greybox rather than quietly plausible.
FALLBACK_LENS_MM = 18.0

SENSOR_MM = 36.0
RENDER_W, RENDER_H = 1920, 1080

# Optics, from docs/planning/blender-cinematic-optics-2026-09-12.md.
#
# Apertures are chosen so action geography stays legible, which the brief asks
# for explicitly. The 91mm+ band is deliberately NOT f/2.8: at 100mm on a 1.2m
# subject f/2.8 gives 21mm of total depth, and MI-03's "creeping 3% push" moves
# the camera ~36mm -- further than the entire depth of field, so the collar the
# shot exists to show would drift out of focus mid-move.
APERTURE_BY_LENS = ((32, 5.6), (60, 4.0), (90, 2.8), (10_000, 4.0))

# A real iris, not Blender's default 0 blades, which renders perfectly circular
# and obviously synthetic bokeh.
APERTURE_BLADES = 7

# Blender defaults to AgX and the brief never names a transform, so whoever
# rendered first would have silently decided the look. AgX keeps the highlight
# discipline the render baseline wants; the Punchy look restores the chroma the
# emissive palette depends on.
VIEW_TRANSFORM = "AgX"
VIEW_LOOK = "AgX - Punchy"

# Above ~0.01 at SET-C's 24m depth the far wall fogs out and the one-point
# perspective the shot depends on collapses.
VOLUME_DENSITY = 0.004
VOLUME_ANISOTROPY = 0.4


def aperture_for_lens(lens_mm: float) -> float:
    for ceiling, fstop in APERTURE_BY_LENS:
        if lens_mm <= ceiling:
            return fstop
    return 4.0

# Set placeholders. Dimensions are blocking volumes from the brief's set
# package, not modelled geometry -- they exist so framing and lens choice can be
# judged before anything is built.
SET_VOLUMES = {
    "SET-A": ("escape shuttle cabin", (6.0, 12.0, 2.6)),
    "SET-B": ("shuttle cargo compartment four", (4.0, 5.0, 2.4)),
    "SET-C": ("mothership medical dock", (18.0, 24.0, 6.0)),
    "SET-D": ("exterior ice launch", (60.0, 60.0, 20.0)),
}


def arguments() -> argparse.Namespace:
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", default="scripts/blender/manifests/ending-shots.json")
    parser.add_argument("--out", required=True)
    parser.add_argument("--sequence", default="ALL",
                        help="sequence id to build, or ALL")
    return parser.parse_args(argv)


def reset_scene() -> None:
    bpy.ops.wm.read_factory_settings(use_empty=True)


def build_set_placeholder(set_id: str) -> None:
    label, (x, y, z) = SET_VOLUMES.get(set_id, (set_id, (8.0, 8.0, 3.0)))
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0.0, 0.0, z / 2.0))
    volume = bpy.context.active_object
    volume.name = f"{set_id}_volume"
    volume.scale = (x, y, z)
    volume.display_type = "WIRE"
    volume.hide_render = True
    volume["set_id"] = set_id
    volume["set_label"] = label

    # A 1.8m figure at origin: without a human reference every lens looks
    # plausible, which is how greyboxes end up re-shot after the art lands.
    bpy.ops.mesh.primitive_cylinder_add(radius=0.22, depth=1.8, location=(0.0, 0.0, 0.9))
    stand_in = bpy.context.active_object
    stand_in.name = "operator_stand_in"
    stand_in.display_type = "SOLID"


def build_camera(shot: dict) -> bpy.types.Object:
    data = bpy.data.cameras.new(f"CAM_{shot['id']}")
    data.sensor_width = SENSOR_MM
    lens = shot.get("lensMm")
    data.lens = float(lens) if lens else FALLBACK_LENS_MM
    camera = bpy.data.objects.new(f"CAM_{shot['id']}", data)
    bpy.context.collection.objects.link(camera)

    # Distance derived from the lens so every greybox frames the stand-in
    # comparably: a long lens starts further back, as it would on set.
    distance = max(2.0, (data.lens / 50.0) * 6.0)
    camera.location = (0.0, -distance, 1.5)
    camera.rotation_euler = (math.radians(84.0), 0.0, 0.0)

    # Focus is bound to an empty, never to a dialled distance: every shot in
    # this brief has camera movement, and a keyframed focus_distance breaks the
    # moment anything moves. A rack focus is then an animation of the empty
    # between two subjects, which survives any camera move.
    focus = bpy.data.objects.new(f"FOCUS_{shot['id']}", None)
    focus.empty_display_type = "SPHERE"
    focus.empty_display_size = 0.15
    focus.location = (0.0, 0.0, 1.5)
    bpy.context.collection.objects.link(focus)

    fstop = aperture_for_lens(data.lens)
    data.dof.use_dof = True
    data.dof.focus_object = focus
    data.dof.aperture_fstop = fstop
    data.dof.aperture_blades = APERTURE_BLADES
    data.dof.aperture_ratio = 1.0

    camera["shot_id"] = shot["id"]
    camera["lens_specified"] = bool(lens)
    camera["aperture_fstop"] = fstop
    camera["focus_object"] = focus.name
    bpy.context.scene.camera = camera
    return camera


def annotate_scene(scene: bpy.types.Scene, shot: dict, sequence: dict, source_doc: str) -> None:
    """Stamp the brief back-reference onto the scene.

    This is the 'connect it to the doc' half of the job. Custom properties
    survive save/load and are visible in Blender's UI, so the file itself
    answers where its instructions live.
    """
    scene["shot_id"] = shot["id"]
    scene["sequence_id"] = sequence["id"]
    scene["sequence_name"] = sequence["name"]
    scene["source_doc"] = source_doc
    scene["doc_section"] = f"## Sequence {sequence['index']:02d} — {sequence['name']} / {shot['id']}"
    scene["brief_timing"] = shot.get("timing", "")
    scene["brief_camera"] = shot.get("camera", "")
    scene["brief_action"] = shot.get("action", "")
    scene["brief_assets"] = shot.get("assets", "")
    scene["brief_transition"] = shot.get("transition", "")
    scene["primary_sets"] = ", ".join(sequence.get("sets", []))

    # Same text as a visible annotation, so it is readable in the viewport
    # without opening the custom-properties panel.
    text = bpy.data.curves.new(name=f"SLATE_{shot['id']}", type="FONT")
    text.body = (
        f"{shot['id']}  ({sequence['name']})\n"
        f"{shot.get('timing','')}\n"
        f"{shot.get('camera','')}\n"
        f"sets: {', '.join(sequence.get('sets', []))}\n"
        f"see: {source_doc}"
    )
    text.size = 0.18
    slate = bpy.data.objects.new(f"SLATE_{shot['id']}", text)
    slate.location = (-3.0, 3.0, 0.02)
    slate.hide_render = True
    bpy.context.collection.objects.link(slate)


def configure_render(shot: dict) -> None:
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.render.resolution_x = RENDER_W
    scene.render.resolution_y = RENDER_H
    scene.render.fps = 24
    start = shot.get("startFrame")
    end = shot.get("endFrame")
    if start is not None and end is not None:
        scene.frame_start = int(start)
        scene.frame_end = int(end)
    scene.cycles.seed = 0
    scene.cycles.use_animated_seed = False
    scene.cycles.samples = 64  # greybox; final passes raise this

    # Pin the look rather than inherit whatever the renderer defaults to.
    scene.view_settings.view_transform = VIEW_TRANSFORM
    try:
        scene.view_settings.look = VIEW_LOOK
    except TypeError:
        # Look names are transform-scoped and shift between Blender versions;
        # a missing look must not take the whole scene build down.
        print(f"[shots] look '{VIEW_LOOK}' unavailable, leaving default", file=sys.stderr)
    scene.view_settings.exposure = 0.0
    scene.render.filter_size = 1.5

    # 180-degree shutter is the brief's ceiling, not a default to exceed.
    scene.render.motion_blur_shutter = 0.5
    scene.cycles.volume_step_rate = 1.0  # greybox; 0.5 for final

    scene["view_transform"] = VIEW_TRANSFORM
    scene["view_look"] = VIEW_LOOK
    scene["volume_density"] = VOLUME_DENSITY
    scene["volume_anisotropy"] = VOLUME_ANISOTROPY


def main() -> int:
    args = arguments()
    manifest_path = Path(args.manifest)
    if not manifest_path.exists():
        print(f"[shots] manifest not found: {manifest_path}", file=sys.stderr)
        print("[shots] run: node scripts/extract-ending-shots.mjs", file=sys.stderr)
        return 2

    manifest = json.loads(manifest_path.read_text())
    source_doc = manifest.get("sourceDoc", "")
    out_root = Path(args.out)
    out_root.mkdir(parents=True, exist_ok=True)

    built = []
    for sequence in manifest.get("sequences", []):
        if args.sequence != "ALL" and sequence["id"] != args.sequence:
            continue
        seq_dir = out_root / sequence["id"].lower()
        seq_dir.mkdir(parents=True, exist_ok=True)

        for shot in sequence.get("shots", []):
            reset_scene()
            bpy.context.scene.name = shot["id"]
            primary_set = (sequence.get("sets") or ["SET-A"])[0]
            build_set_placeholder(primary_set)
            build_camera(shot)
            annotate_scene(bpy.context.scene, shot, sequence, source_doc)
            configure_render(shot)

            path = seq_dir / f"{shot['id']}.blend"
            bpy.ops.wm.save_as_mainfile(filepath=str(path.resolve()))
            built.append({
                "shot": shot["id"],
                "sequence": sequence["id"],
                "set": primary_set,
                "lensMm": shot.get("lensMm") or FALLBACK_LENS_MM,
                "lensSpecified": shot.get("lensMm") is not None,
                "apertureFStop": aperture_for_lens(shot.get("lensMm") or FALLBACK_LENS_MM),
                "frames": [shot.get("startFrame"), shot.get("endFrame")],
                "blend": str(path.relative_to(out_root)),
            })
            print(f"[shots] {shot['id']:8} {primary_set}  ->  {path.name}")

    index = {
        "schemaVersion": 1,
        "sourceDoc": source_doc,
        "generator": "scripts/blender/build_ending_shot_scenes.py",
        "shots": built,
    }
    (out_root / "shot-index.json").write_text(json.dumps(index, indent=2))
    missing_lens = [b["shot"] for b in built if not b["lensSpecified"]]
    print(f"[shots] built {len(built)} scenes -> {out_root}")
    if missing_lens:
        print(f"[shots] WARN no lens in the brief, used {FALLBACK_LENS_MM}mm: {missing_lens}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
