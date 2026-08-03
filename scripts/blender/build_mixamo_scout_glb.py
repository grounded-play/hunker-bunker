"""Build the retail Scout GLB from the supplied Mixamo FBX source files."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
import struct
import sys

import bpy


CLIPS = {
    "idle": "Basic Shooter Pack/rifle aiming idle.fbx",
    "walk": "Basic Shooter Pack/walking.fbx",
    "run": "Basic Shooter Pack/rifle run.fbx",
    "backward": "Basic Shooter Pack/run backwards.fbx",
    "strafeLeft": "Basic Shooter Pack/strafe left.fbx",
    "strafeRight": "Basic Shooter Pack/strafe right.fbx",
    "fire": "Basic Shooter Pack/firing rifle.fbx",
    "reload": "Basic Shooter Pack/reloading.fbx",
    "hit": "Basic Shooter Pack/hit reaction.fbx",
    "fall": "Action Adventure Pack/falling idle.fbx",
    "land": "Action Adventure Pack/hard landing.fbx",
}


def arguments() -> argparse.Namespace:
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", required=True, type=Path)
    parser.add_argument("--animations", required=True, type=Path)
    parser.add_argument("--textures", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--texture-size", default=1024, type=int)
    return parser.parse_args(argv)


def reset_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for action in list(bpy.data.actions):
        bpy.data.actions.remove(action)


def character_armature(objects: list[bpy.types.Object]) -> bpy.types.Object:
    armatures = [obj for obj in objects if obj.type == "ARMATURE"]
    if len(armatures) != 1:
        raise RuntimeError(f"expected one armature, found {[obj.name for obj in armatures]}")
    return armatures[0]


def import_fbx(path: Path) -> list[bpy.types.Object]:
    before = set(bpy.context.scene.objects)
    bpy.ops.import_scene.fbx(filepath=str(path.resolve()), use_anim=True)
    return [obj for obj in bpy.context.scene.objects if obj not in before]


def remove_objects(objects: list[bpy.types.Object], keep: set[bpy.types.Object] | None = None) -> None:
    keep = keep or set()
    for obj in objects:
        if obj not in keep and obj.name in bpy.data.objects:
            bpy.data.objects.remove(obj, do_unlink=True)


def optimize_materials(meshes: list[bpy.types.Object], texture_directory: Path, texture_size: int) -> None:
    texture_by_material = {
        "Ch48_body": texture_directory / "Ch48_1001_Diffuse.png",
        "Ch48_body1": texture_directory / "Ch48_1002_Diffuse.png",
        "Ch48_hair": texture_directory / "Ch48_1003_Diffuse.png",
    }
    for obj in meshes:
        for material in obj.data.materials:
            if not material or not material.use_nodes or not material.node_tree:
                continue
            nodes = material.node_tree.nodes
            links = material.node_tree.links
            principled = next((node for node in nodes if node.type == "BSDF_PRINCIPLED"), None)
            if not principled:
                continue
            for node in list(nodes):
                if node.type == "TEX_IMAGE":
                    nodes.remove(node)
                elif node.type == "NORMAL_MAP":
                    nodes.remove(node)
            texture_path = texture_by_material.get(material.name)
            if not texture_path or not texture_path.exists():
                raise RuntimeError(f"missing diffuse texture for {material.name}: {texture_path}")
            image = bpy.data.images.load(str(texture_path.resolve()), check_existing=False)
            width, height = image.size
            maximum = max(width, height)
            if maximum > texture_size:
                ratio = texture_size / maximum
                image.scale(max(1, round(width * ratio)), max(1, round(height * ratio)))
            image.pack()
            diffuse = nodes.new("ShaderNodeTexImage")
            diffuse.name = f"{material.name}_Diffuse"
            diffuse.image = image
            links.new(diffuse.outputs["Color"], principled.inputs["Base Color"])
            if "hair" in material.name.lower():
                links.new(diffuse.outputs["Alpha"], principled.inputs["Alpha"])
            principled.inputs["Roughness"].default_value = 0.72
            principled.inputs["Metallic"].default_value = 0.08
            principled.inputs["Emission Color"].default_value = (0, 0, 0, 1)
            principled.inputs["Emission Strength"].default_value = 0
            principled.inputs["Specular IOR Level"].default_value = 0.5
            material.surface_render_method = "DITHERED" if "hair" in material.name.lower() else "DITHERED"


def add_animation(base_armature: bpy.types.Object, source_path: Path, name: str) -> None:
    imported = import_fbx(source_path)
    source_armature = character_armature(imported)
    action = source_armature.animation_data.action if source_armature.animation_data else None
    if not action:
        raise RuntimeError(f"{source_path.name} contained no active animation")
    action.name = name

    base_armature.animation_data_create()
    track = base_armature.animation_data.nla_tracks.new()
    track.name = name
    strip = track.strips.new(name, int(action.frame_range[0]), action)
    strip.name = name
    strip.action_frame_start = action.frame_range[0]
    strip.action_frame_end = action.frame_range[1]
    remove_objects(imported)


def verify_glb(path: Path) -> None:
    data = path.read_bytes()
    if data[:4] != b"glTF":
        raise RuntimeError("export did not produce a binary glTF file")
    json_length = struct.unpack_from("<I", data, 12)[0]
    document = json.loads(data[20 : 20 + json_length].decode("utf-8"))
    clip_names = {animation.get("name") for animation in document.get("animations", [])}
    missing = set(CLIPS) - clip_names
    if missing:
        raise RuntimeError(f"GLB is missing animation clips: {sorted(missing)}")
    if len(document.get("skins", [])) != 1:
        raise RuntimeError(f"expected one skin, found {len(document.get('skins', []))}")
    if len(document.get("images", [])) != 3:
        raise RuntimeError(f"expected three embedded diffuse images, found {len(document.get('images', []))}")


def main() -> None:
    args = arguments()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    reset_scene()

    imported_base = import_fbx(args.base)
    base_armature = character_armature(imported_base)
    meshes = [obj for obj in imported_base if obj.type == "MESH" and obj.find_armature() == base_armature]
    if not meshes:
        raise RuntimeError("base FBX contained no armature-bound meshes")
    remove_objects(imported_base, keep={base_armature, *meshes})
    base_armature.name = "ScoutRig"
    base_armature.animation_data_clear()
    for action in list(bpy.data.actions):
        bpy.data.actions.remove(action)

    optimize_materials(meshes, args.textures, args.texture_size)
    for name, relative_path in CLIPS.items():
        add_animation(base_armature, args.animations / relative_path, name)

    bpy.ops.object.select_all(action="DESELECT")
    for obj in [base_armature, *meshes]:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = base_armature
    bpy.ops.export_scene.gltf(
        filepath=str(args.output.resolve()),
        export_format="GLB",
        use_selection=True,
        export_animations=True,
        export_animation_mode="NLA_TRACKS",
        export_nla_strips=True,
        export_anim_slide_to_zero=True,
        export_skins=True,
        export_morph=False,
        export_cameras=False,
        export_lights=False,
        export_apply=False,
    )
    verify_glb(args.output.resolve())
    print(f"Exported {args.output} with {len(CLIPS)} clips: {', '.join(CLIPS)}")


if __name__ == "__main__":
    main()
