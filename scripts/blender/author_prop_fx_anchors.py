"""Add Hunker Bunker FX anchors and optional idle loops to prop GLBs.

Examples:
  blender -b -P scripts/blender/author_prop_fx_anchors.py -- \
    --type life_water_still --output-dir scratch/prop-fx-authored

  blender -b -P scripts/blender/author_prop_fx_anchors.py -- \
    --all --output-dir scratch/prop-fx-authored

Anchor coordinates in the manifest are fractions of the imported visual
bounds. This makes the manifest resilient to arbitrary source units while the
runtime continues to normalize each model to its gameplay dimensions.
Production GLBs are never overwritten unless --output-dir explicitly points
at their directory.
"""

import argparse
import json
import sys
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[2]
DEFAULT_MANIFEST = ROOT / "scripts/blender/manifests/prop-fx-anchors.json"


def arguments():
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--type", action="append", dest="types")
    mode.add_argument("--all", action="store_true")
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument("--output-dir", type=Path, required=True)
    return parser.parse_args(argv)


def visual_bounds():
    corners = []
    for obj in bpy.context.scene.objects:
        if obj.type != "MESH" or not obj.visible_get():
            continue
        corners.extend(obj.matrix_world @ Vector(corner) for corner in obj.bound_box)
    if not corners:
        raise RuntimeError("Imported asset contains no visible mesh bounds")
    minimum = Vector((min(v.x for v in corners), min(v.y for v in corners), min(v.z for v in corners)))
    maximum = Vector((max(v.x for v in corners), max(v.y for v in corners), max(v.z for v in corners)))
    return minimum, maximum


def add_anchor(name, fractions, minimum, maximum):
    location = Vector(tuple(minimum[i] + (maximum[i] - minimum[i]) * fractions[i] for i in range(3)))
    anchor = bpy.data.objects.new(name, None)
    anchor.empty_display_type = "SPHERE"
    anchor.empty_display_size = max((maximum - minimum).length * 0.015, 0.01)
    anchor.location = location
    anchor["hb_fx_anchor"] = True
    anchor["hb_fx_contract"] = 1
    bpy.context.scene.collection.objects.link(anchor)
    return anchor


def add_idle_pulse(asset_type, pulse):
    roots = [obj for obj in bpy.context.scene.objects if obj.parent is None and not obj.name.startswith("FX_")]
    if not roots:
        return None
    control = bpy.data.objects.new("PROP_IDLE_LOOP_ROOT", None)
    control.empty_display_type = "PLAIN_AXES"
    bpy.context.scene.collection.objects.link(control)
    for obj in roots:
        world = obj.matrix_world.copy()
        obj.parent = control
        obj.matrix_world = world

    duration = max(float(pulse.get("duration", 4.0)), 0.5)
    fps = 30
    end = max(2, round(duration * fps))
    peak = max(1, round(end * 0.5))
    target_scale = tuple(float(value) for value in pulse.get("scale", [1.02, 1.04, 1.02]))
    for frame, scale in ((0, (1, 1, 1)), (peak, target_scale), (end, (1, 1, 1))):
        control.scale = scale
        control.keyframe_insert(data_path="scale", frame=frame)
    action = control.animation_data.action
    action.name = f"{asset_type}_idle_loop"
    # The first and last values match, so Three.js AnimationAction's default
    # LoopRepeat playback closes the cycle without a Blender cycles modifier.
    # Blender 5.x Actions are layered and no longer expose action.fcurves.
    bpy.context.scene.frame_start = 0
    bpy.context.scene.frame_end = end
    return action


def author(asset_type, entry, output_dir):
    source = ROOT / entry["source"]
    if not source.exists():
        raise FileNotFoundError(f"{asset_type}: missing source {source}")
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(source))
    minimum, maximum = visual_bounds()
    for name, fractions in entry.get("anchors", {}).items():
        add_anchor(name, fractions, minimum, maximum)
    if entry.get("idlePulse"):
        add_idle_pulse(asset_type, entry["idlePulse"])

    output_dir.mkdir(parents=True, exist_ok=True)
    destination = output_dir / f"{asset_type}.glb"
    bpy.ops.export_scene.gltf(
        filepath=str(destination),
        export_format="GLB",
        export_yup=True,
        export_animations=True,
        export_extras=True,
        export_apply=False,
    )
    print(f"[prop-fx] {asset_type}: {source.relative_to(ROOT)} -> {destination}")


def main():
    args = arguments()
    manifest_path = args.manifest if args.manifest.is_absolute() else ROOT / args.manifest
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    assets = manifest["assets"]
    selected = list(assets) if args.all else args.types
    unknown = sorted(set(selected) - set(assets))
    if unknown:
        raise KeyError(f"Unknown prop FX manifest types: {', '.join(unknown)}")
    output_dir = args.output_dir if args.output_dir.is_absolute() else ROOT / args.output_dir
    for asset_type in selected:
        author(asset_type, assets[asset_type], output_dir)


if __name__ == "__main__":
    main()
