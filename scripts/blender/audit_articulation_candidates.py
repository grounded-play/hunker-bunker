"""Render and report articulation candidates from the lived-in pass-2 GLBs.

Usage:
    blender -b -P scripts/blender/audit_articulation_candidates.py

Outputs review frames and a machine-readable geometry report under
docs/reports/assets/prop-articulation-audit/. This script does not modify GLBs.
"""

from __future__ import annotations

import json
import math
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[2]
INPUT_DIR = ROOT / "public" / "3d" / "runtime" / "new3ds"
OUTPUT_DIR = ROOT / "docs" / "reports" / "assets" / "prop-articulation-audit"
NAMES = (
    "life_ribcage_rescue_cabinet",
    "life_supply_drop_pod",
    "life_seismic_drill",
    "life_ice_bore_winch",
    "life_confessional",
)


def world_bounds(objects):
    points = [obj.matrix_world @ Vector(corner) for obj in objects for corner in obj.bound_box]
    low = Vector((min(p.x for p in points), min(p.y for p in points), min(p.z for p in points)))
    high = Vector((max(p.x for p in points), max(p.y for p in points), max(p.z for p in points)))
    return low, high


def component_stats(obj):
    mesh = obj.data
    adjacency = [[] for _ in mesh.vertices]
    for edge in mesh.edges:
        a, b = edge.vertices
        adjacency[a].append(b)
        adjacency[b].append(a)
    remaining = set(range(len(mesh.vertices)))
    components = []
    while remaining:
        seed = remaining.pop()
        stack = [seed]
        vertices = [seed]
        while stack:
            current = stack.pop()
            for neighbor in adjacency[current]:
                if neighbor in remaining:
                    remaining.remove(neighbor)
                    stack.append(neighbor)
                    vertices.append(neighbor)
        coords = [obj.matrix_world @ mesh.vertices[index].co for index in vertices]
        low = [min(point[axis] for point in coords) for axis in range(3)]
        high = [max(point[axis] for point in coords) for axis in range(3)]
        components.append({
            "vertices": len(vertices),
            "min": [round(value, 5) for value in low],
            "max": [round(value, 5) for value in high],
            "center": [round((low[i] + high[i]) * 0.5, 5) for i in range(3)],
            "size": [round(high[i] - low[i], 5) for i in range(3)],
        })
    components.sort(key=lambda item: item["vertices"], reverse=True)
    return components


def create_material_world():
    world = bpy.data.worlds.new("AuditWorld")
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.012, 0.015, 0.022, 1)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.4
    bpy.context.scene.world = world
    for rotation, energy, size in (
        ((math.radians(42), 0, math.radians(35)), 1200, 5.0),
        ((math.radians(-55), 0, math.radians(-120)), 700, 4.0),
    ):
        data = bpy.data.lights.new("AuditArea", "AREA")
        data.energy = energy
        data.shape = "DISK"
        data.size = size
        light = bpy.data.objects.new("AuditArea", data)
        light.rotation_euler = rotation
        light.location = (3, -4, 5) if energy > 1000 else (-4, 2, 3)
        bpy.context.scene.collection.objects.link(light)


def render_view(name, objects, low, high, suffix, direction):
    center = (low + high) * 0.5
    size = high - low
    camera_data = bpy.data.cameras.new(f"AuditCamera:{suffix}")
    camera = bpy.data.objects.new(f"AuditCamera:{suffix}", camera_data)
    bpy.context.scene.collection.objects.link(camera)
    camera_data.type = "ORTHO"
    camera_data.ortho_scale = max(size.x, size.y, size.z) * 1.35
    camera.location = center + Vector(direction).normalized() * max(size.length, 1.0) * 2.4
    track = (center - camera.location).to_track_quat("-Z", "Y")
    camera.rotation_euler = track.to_euler()
    bpy.context.scene.camera = camera
    bpy.context.scene.render.filepath = str(OUTPUT_DIR / f"{name}-{suffix}.png")
    bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(camera, do_unlink=True)
    bpy.data.cameras.remove(camera_data)


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    report = {}
    for name in NAMES:
        bpy.ops.wm.read_factory_settings(use_empty=True)
        bpy.ops.import_scene.gltf(filepath=str(INPUT_DIR / f"{name}.glb"))
        meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
        low, high = world_bounds(meshes)
        report[name] = {
            "bounds": {
                "min": [round(value, 5) for value in low],
                "max": [round(value, 5) for value in high],
                "size": [round(value, 5) for value in high - low],
            },
            "meshes": [
                {
                    "name": obj.name,
                    "vertices": len(obj.data.vertices),
                    "triangles": len(obj.data.loop_triangles),
                    "components": component_stats(obj),
                }
                for obj in meshes
            ],
        }
        create_material_world()
        scene = bpy.context.scene
        scene.render.engine = "BLENDER_EEVEE"
        scene.render.resolution_x = 720
        scene.render.resolution_y = 720
        scene.render.resolution_percentage = 100
        scene.render.image_settings.file_format = "PNG"
        scene.render.film_transparent = False
        render_view(name, meshes, low, high, "front", (0, -1, 0.22))
        render_view(name, meshes, low, high, "side", (1, 0, 0.18))
        render_view(name, meshes, low, high, "three-quarter", (1, -1, 0.7))

    with open(OUTPUT_DIR / "geometry-report.json", "w", encoding="utf-8") as handle:
        json.dump(report, handle, indent=2)
    print(f"[prop-articulation-audit] wrote {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
