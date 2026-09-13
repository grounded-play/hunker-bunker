"""
Bake the procedural deep-space environment to a real equirectangular HDR.

Run:
    blender -b --python scripts/blender/bake_space_hdri.py -- --size 4096

Why bake at all when the shader is procedural: a baked .exr is portable. It can
be dropped into any scene, handed to another tool, or previewed without running
this generator, and it renders faster than evaluating Voronoi at 220 scale for
every ray. The procedural version stays the source of truth; this is its output.

Equirectangular via a panoramic camera rather than a cubemap stitch, so the
result drops straight into an Environment Texture node with no reprojection.
"""
import argparse
import sys
from pathlib import Path

import bpy


def base_dir() -> Path:
    return Path(__file__).resolve().parent.parent.parent


def main() -> None:
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    parser = argparse.ArgumentParser(description="Bake the space environment to an equirect HDR.")
    parser.add_argument("--size", type=int, default=4096, help="Output width; height is half.")
    parser.add_argument("--samples", type=int, default=64)
    parser.add_argument("--out", default="art/source/hdri/space_nebula_4k.exr")
    args = parser.parse_args(argv)

    sys.path.insert(0, str(base_dir() / "scripts" / "blender"))
    from build_ending_scenes import build_space_sky_nodes

    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.samples = args.samples

    world = bpy.data.worlds.new("SpaceHDRI")
    scene.world = world
    world.use_nodes = True
    nodes = world.node_tree.nodes
    links = world.node_tree.links
    nodes.clear()
    output = nodes.new("ShaderNodeOutputWorld")
    sky = build_space_sky_nodes(world.node_tree, output, links, nodes, strength=1.0)
    links.new(sky.outputs["Background"], output.inputs["Surface"])

    cam_data = bpy.data.cameras.new("EquirectCam")
    cam_data.type = "PANO"
    # Blender 4.x/5.x moved panorama_type off the camera data onto cycles.
    if hasattr(cam_data, "panorama_type"):
        cam_data.panorama_type = "EQUIRECTANGULAR"
    elif hasattr(cam_data, "cycles"):
        cam_data.cycles.panorama_type = "EQUIRECTANGULAR"
    cam = bpy.data.objects.new("EquirectCam", cam_data)
    scene.collection.objects.link(cam)
    scene.camera = cam

    # 2:1 is the equirectangular contract; anything else reprojects wrong.
    scene.render.resolution_x = args.size
    scene.render.resolution_y = args.size // 2
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "OPEN_EXR"
    # Float32 keeps the star highlights above 1.0 that make this an HDR rather
    # than a picture of one.
    scene.render.image_settings.color_depth = "32"
    # No view transform on a bake: the .exr must carry scene-linear values, not
    # a display-referred image. AgX here would bake the tone-map in permanently.
    scene.view_settings.view_transform = "Standard"

    out_path = base_dir() / args.out
    out_path.parent.mkdir(parents=True, exist_ok=True)
    scene.render.filepath = str(out_path)
    bpy.ops.render.render(write_still=True)
    print(f"[bake_space_hdri] wrote {out_path} ({args.size}x{args.size // 2})")


if __name__ == "__main__":
    main()
