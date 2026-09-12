"""Render transparent orthographic sprite frames from 3D models and actions in headless Blender."""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path
import sys

import bpy


def parse_arguments() -> argparse.Namespace:
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser(description="Render sprite frames from Blender rigs.")
    parser.add_argument("--manifest", required=True, type=Path, help="Path to manifest JSON")
    parser.add_argument("--output", required=True, type=Path, help="Directory for output PNGs")
    parser.add_argument("--direction", default="all", help="Direction to render (or 'all')")
    parser.add_argument("--fps", type=int, default=None, help="FPS override")
    return parser.parse_args(argv)


def reset_scene() -> None:
    bpy.ops.wm.read_factory_settings(use_empty=True)


def import_model(model_path: Path) -> bpy.types.Object:
    resolved = model_path.resolve()
    if not resolved.exists():
        raise FileNotFoundError(f"Source model not found: {resolved}")
    if resolved.suffix.lower() in [".glb", ".gltf"]:
        bpy.ops.import_scene.gltf(filepath=str(resolved))
    elif resolved.suffix.lower() == ".fbx":
        bpy.ops.import_scene.fbx(filepath=str(resolved), use_anim=True)
    else:
        raise ValueError(f"Unsupported model format: {resolved.suffix}")

    armatures = [obj for obj in bpy.data.objects if obj.type == "ARMATURE"]
    if not armatures:
        raise RuntimeError(f"No armature found in imported model {resolved}")
    return armatures[0]


def setup_lighting() -> None:
    key_data = bpy.data.lights.new("KeyLight", type="SUN")
    key_data.energy = 2.8
    key_obj = bpy.data.objects.new("KeyLight", key_data)
    key_obj.rotation_euler = (math.radians(45), math.radians(20), math.radians(-35))
    bpy.context.scene.collection.objects.link(key_obj)

    fill_data = bpy.data.lights.new("FillLight", type="SUN")
    fill_data.energy = 1.2
    fill_obj = bpy.data.objects.new("FillLight", fill_data)
    fill_obj.rotation_euler = (math.radians(65), math.radians(-15), math.radians(145))
    bpy.context.scene.collection.objects.link(fill_obj)

    rim_data = bpy.data.lights.new("RimLight", type="SUN")
    rim_data.energy = 1.5
    rim_obj = bpy.data.objects.new("RimLight", rim_data)
    rim_obj.rotation_euler = (math.radians(25), math.radians(0), math.radians(180))
    bpy.context.scene.collection.objects.link(rim_obj)


def setup_camera(camera_config: dict) -> bpy.types.Object:
    cam_data = bpy.data.cameras.new("RenderCam")
    cam_data.type = camera_config.get("type", "ORTHO")
    cam_data.ortho_scale = camera_config.get("orthoScale", 2.25)
    cam_obj = bpy.data.objects.new("RenderCam", cam_data)
    bpy.context.scene.collection.objects.link(cam_obj)
    bpy.context.scene.camera = cam_obj

    pitch_deg = camera_config.get("pitchDeg", 50)
    pitch = math.radians(pitch_deg)
    dist_y = camera_config.get("distY", 5.0)
    target_z = camera_config.get("targetZ", 0.95)

    cam_obj.location = (0, -dist_y, target_z + dist_y * math.tan(math.radians(90 - pitch_deg)))
    cam_obj.rotation_euler = (pitch, 0, 0)
    return cam_obj


def main() -> None:
    args = parse_arguments()
    manifest_path = args.manifest.resolve()
    with manifest_path.open("r", encoding="utf-8") as f:
        manifest = json.load(f)

    output_dir = args.output.resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    reset_scene()

    model_path = Path(manifest["sourceModel"])
    if not model_path.is_absolute():
        model_path = Path.cwd() / model_path

    armature = import_model(model_path)
    action_name = manifest.get("sourceActionName", "walk")
    action = bpy.data.actions.get(action_name)
    if not action:
        # Fallback to first available action
        if bpy.data.actions:
            action = bpy.data.actions[0]
            print(f"Warning: action '{action_name}' not found; using '{action.name}'")
        else:
            raise RuntimeError("No actions found in imported model")

    if armature.animation_data:
        armature.animation_data.action = action

    cam_cfg = manifest.get("camera", {})
    setup_camera(cam_cfg)
    setup_lighting()

    cell_size = manifest.get("cellSize", 256)
    scene = bpy.context.scene
    scene.render.resolution_x = cell_size
    scene.render.resolution_y = cell_size
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    if hasattr(scene, "eevee"):
        scene.eevee.taa_render_samples = 16

    start_frame, end_frame = action.frame_range
    num_frames = manifest.get("columns", 8)
    duration = end_frame - start_frame
    frame_step = duration / num_frames

    directions = manifest.get("directions", [])
    if args.direction != "all":
        directions = [d for d in directions if d["name"] == args.direction]
        if not directions:
            raise ValueError(f"Direction '{args.direction}' not found in manifest")

    subject = manifest.get("subject", "Character")
    action_label = manifest.get("action", "action")

    rendered_files = []
    for d_info in directions:
        d_name = d_info["name"]
        rot_z = d_info["rotZ"]
        armature.rotation_euler = (0, 0, math.radians(rot_z))

        for f_idx in range(num_frames):
            frame_val = round(start_frame + f_idx * frame_step)
            scene.frame_set(frame_val)
            file_name = f"{subject}.{action_label}.{d_name}.{f_idx:02d}.png"
            file_path = output_dir / file_name
            scene.render.filepath = str(file_path)
            bpy.ops.render.render(write_still=True)
            rendered_files.append(str(file_path))
            print(f"Rendered: {file_name} (frame {frame_val}, rotZ {rot_z}°)")
            sys.stdout.flush()

    print(f"Complete: {len(rendered_files)} frames rendered to {output_dir}")


if __name__ == "__main__":
    main()
