"""Attach the checked ending audio manifest to generated .blend VSE sessions."""
import argparse
import json
import os
import sys
from pathlib import Path

import bpy


def add_sound(editor, name, path, channel, frame):
    strips = getattr(editor, "strips", None)
    if strips is None:
        strips = getattr(editor, "sequences", None)
    if strips is None:
        raise RuntimeError("Unsupported Blender sequence editor API")
    return strips.new_sound(name=name, filepath=str(path), channel=channel, frame_start=frame)


def attach(scene_name, blend_path, manifest_path, project_root):
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    spec = manifest["scenes"][scene_name]
    bpy.ops.wm.open_mainfile(filepath=str(blend_path.resolve()))
    scene = bpy.context.scene
    scene.render.fps = manifest["fps"]
    scene.frame_start = 1
    scene.frame_end = spec["frames"]
    editor = scene.sequence_editor_create()
    strips = getattr(editor, "strips", None)
    if strips is None:
        strips = getattr(editor, "sequences", None)
    for strip in list(strips):
        if strip.type == "SOUND" and strip.name.startswith("MIX_"):
            strips.remove(strip)
    for cue in spec["cues"]:
        source = (project_root / cue["path"]).resolve()
        if not source.is_file():
            raise FileNotFoundError(source)
        strip = add_sound(editor, f"MIX_{scene_name.upper()}_{cue['stem']}_{cue['id']}_v01", source, cue["channel"], cue["frame"])
        strip.volume = cue.get("gain", 1.0)
    scene.sync_mode = "AUDIO_SYNC"
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_path.resolve()))
    print(f"Attached {len(spec['cues'])} cues to {blend_path}")


def main():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--scene", required=True)
    parser.add_argument("--blend", type=Path, required=True)
    parser.add_argument("--manifest", type=Path, default=Path("scripts/audio/ending-mix-manifest.json"))
    parser.add_argument("--project-root", type=Path, default=Path.cwd())
    args = parser.parse_args(argv)
    attach(args.scene, args.blend, args.manifest, args.project_root)


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"[attach_ending_audio] ERROR: {exc}", file=sys.stderr, flush=True)
        os._exit(1)
