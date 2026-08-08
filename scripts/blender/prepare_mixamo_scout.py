"""Prepare the Mixamo Scouting character for Scout texture authoring.

Imports the original FBX without modifying it, removes export-only scene helpers,
extracts embedded texture images, writes UV-layout PNGs, and saves a clean Blender
working file. Run with Blender, not system Python.
"""

from __future__ import annotations

import argparse
from pathlib import Path
import shutil
import subprocess
import sys

import bpy
import bmesh


def arguments() -> argparse.Namespace:
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--size", type=int, default=2048)
    return parser.parse_args(argv)


def clean_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (bpy.data.meshes, bpy.data.curves, bpy.data.armatures):
        for datablock in list(datablocks):
            if datablock.users == 0:
                datablocks.remove(datablock)


def character_meshes() -> list[bpy.types.Object]:
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    # The downloaded FBX contains a default cube alongside the actual Ch48 meshes.
    return [obj for obj in meshes if obj.find_armature() is not None]


def remove_scene_helpers(keep_meshes: list[bpy.types.Object]) -> None:
    keep = set(keep_meshes)
    keep.update(obj.find_armature() for obj in keep_meshes)
    for obj in list(bpy.context.scene.objects):
        if obj not in keep:
            bpy.data.objects.remove(obj, do_unlink=True)


def extract_embedded_images(directory: Path) -> list[Path]:
    texture_dir = directory / "textures-original"
    texture_dir.mkdir(parents=True, exist_ok=True)
    written: list[Path] = []
    seen: set[str] = set()
    for image in bpy.data.images:
        if image.name in {"Render Result", "Viewer Node"} or not image.has_data:
            continue
        filename = Path(image.filepath).name or f"{image.name}.png"
        if filename in seen:
            continue
        seen.add(filename)
        destination = texture_dir / filename
        image.save_render(str(destination))
        written.append(destination)
    return written


def export_material_uv(obj: bpy.types.Object, material_index: int, destination: Path, size: int) -> bool:
    polygons = [poly for poly in obj.data.polygons if poly.material_index == material_index]
    if not polygons or not obj.data.uv_layers.active:
        return False

    bpy.ops.object.mode_set(mode="OBJECT") if bpy.context.object and bpy.context.object.mode != "OBJECT" else None
    bpy.ops.object.select_all(action="DESELECT")
    isolated_mesh = obj.data.copy()
    isolated = bpy.data.objects.new(f"{obj.name}_uv_export", isolated_mesh)
    bpy.context.scene.collection.objects.link(isolated)
    editable = bmesh.new()
    editable.from_mesh(isolated_mesh)
    bmesh.ops.delete(
        editable,
        geom=[face for face in editable.faces if face.material_index != material_index],
        context="FACES",
    )
    editable.to_mesh(isolated_mesh)
    editable.free()
    isolated.select_set(True)
    bpy.context.view_layer.objects.active = isolated
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    svg_path = destination.with_suffix(".svg")
    bpy.ops.uv.export_layout(
        filepath=str(svg_path),
        export_all=True,
        modified=False,
        mode="SVG",
        size=(size, size),
        opacity=0.35,
    )
    bpy.ops.object.mode_set(mode="OBJECT")
    converter = shutil.which("magick") or shutil.which("convert")
    if converter:
        subprocess.run(
            [converter, "-background", "transparent", str(svg_path), str(destination)],
            check=True,
        )
    bpy.data.objects.remove(isolated, do_unlink=True)
    bpy.data.meshes.remove(isolated_mesh)
    return True


def export_uv_layouts(meshes: list[bpy.types.Object], directory: Path, size: int) -> list[Path]:
    uv_dir = directory / "uv-layouts"
    uv_dir.mkdir(parents=True, exist_ok=True)
    written: list[Path] = []
    for obj in meshes:
        for index, material in enumerate(obj.data.materials):
            safe_object = obj.name.replace(" ", "_")
            safe_material = material.name.replace(" ", "_") if material else f"material-{index}"
            destination = uv_dir / f"{safe_object}--{safe_material}.png"
            if export_material_uv(obj, index, destination, size):
                written.append(destination)
    return written


def main() -> None:
    args = arguments()
    input_path = args.input.resolve()
    output_dir = args.output.resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    clean_scene()
    bpy.ops.import_scene.fbx(filepath=str(input_path), use_anim=True)
    meshes = character_meshes()
    if not meshes:
        raise RuntimeError("FBX did not contain an armature-bound character mesh")
    remove_scene_helpers(meshes)

    textures = extract_embedded_images(output_dir)
    blend_path = output_dir / "Scouting-scout-working.blend"
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_path))
    layouts = export_uv_layouts(meshes, output_dir, args.size)

    print(f"Prepared {len(meshes)} character meshes")
    print(f"Extracted {len(textures)} embedded textures")
    print(f"Exported {len(layouts)} UV layouts")
    print(f"Saved {blend_path}")


if __name__ == "__main__":
    main()
