"""Build the metric/origin proof asset for WORLD_3D_STRUCTURES."""

from pathlib import Path
import bpy


OUTPUT = Path(__file__).resolve().parents[2] / "public/3d/runtime/structures"


def reset_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)


def add_box(name, size, location):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return obj


def export(path):
    bpy.ops.wm.save_as_mainfile(filepath=str(path.with_suffix(".blend")))
    bpy.ops.export_scene.gltf(
        filepath=str(path),
        export_format="GLB",
        export_apply=True,
        export_yup=True,
    )
    path.with_suffix(".blend").unlink(missing_ok=True)


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)

    reset_scene()
    add_box("reference_floor", (49, 0.1, 49), (24.5, -0.05, 24.5))
    add_box("north_west_origin_marker", (1, 2, 1), (0.5, 1, 0.5))
    add_box("south_east_extent_marker", (1, 1, 1), (48.5, 0.5, 48.5))
    export(OUTPUT / "structure_reference_49m.glb")

    reset_scene()
    add_box("structure_reference_49m_collision", (49, 0.1, 49), (24.5, -0.05, 24.5))
    export(OUTPUT / "structure_reference_49m.collision.glb")


if __name__ == "__main__":
    main()
