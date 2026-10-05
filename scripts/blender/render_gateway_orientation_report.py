"""Render the Sprint 49 M1 four-side gateway alignment review plate.

Run from the repository root:
  blender --background --python scripts/blender/render_gateway_orientation_report.py
"""
from math import radians
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "docs/reports/assets/sprint-49/gateway-cardinal-alignment.png"
KIT_SCALE = 0.75

bpy.ops.wm.read_factory_settings(use_empty=True)


def material(name, color, metallic=0.0, roughness=0.65):
    value = bpy.data.materials.new(name)
    value.diffuse_color = (*color, 1.0)
    value.metallic = metallic
    value.roughness = roughness
    value.use_nodes = True
    shader = value.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*color, 1.0)
    shader.inputs["Metallic"].default_value = metallic
    shader.inputs["Roughness"].default_value = roughness
    return value


FLOOR_MAT = material("room-side floor", (0.08, 0.18, 0.19), metallic=0.2)
CORRIDOR_MAT = material("corridor-side floor", (0.08, 0.09, 0.11), metallic=0.1)
SLAB_MAT = material("procedural door slab", (0.18, 0.21, 0.23), metallic=0.75, roughness=0.32)
LINE_MAT = material("threshold marker", (0.95, 0.42, 0.08), metallic=0.1, roughness=0.4)
SPACE_GATE_MAT = material("space frame", (0.16, 0.42, 0.52), metallic=0.65, roughness=0.28)
CAVE_GATE_MAT = material("cave frame", (0.36, 0.20, 0.12), metallic=0.25, roughness=0.62)


def cube(name, location, scale, surface):
    bpy.ops.mesh.primitive_cube_add(location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    obj.data.materials.append(surface)
    return obj


def add_label(text, location, size=0.42):
    bpy.ops.object.text_add(location=location, rotation=(0, 0, 0))
    label = bpy.context.object
    label.data.body = text
    label.data.align_x = "CENTER"
    label.data.size = size
    label.data.extrude = 0.012
    label.data.materials.append(LINE_MAT)


def import_gate(path, name, location, yaw_steps, surface):
    before = set(bpy.context.scene.objects)
    bpy.ops.import_scene.gltf(filepath=str(path))
    imported = [obj for obj in bpy.context.scene.objects if obj not in before]
    root = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(root)
    for obj in imported:
        if obj.parent is None:
            obj.parent = root
        if obj.type == "MESH":
            obj.data.materials.clear()
            obj.data.materials.append(surface)
    root.location = (*location[:2], 0.02)
    root.rotation_euler.z = radians(yaw_steps * 90)
    root.scale = (KIT_SCALE, KIT_SCALE, KIT_SCALE)
    return root


def add_panel(side, origin, gate_path, offset, yaw_steps, surface):
    ox, oy = origin
    inward = Vector(offset).normalized()
    horizontal = side in ("NORTH", "SOUTH")

    # The threshold is orange; teal is the room side and charcoal the corridor.
    room_center = Vector((ox, oy)) + inward * 2.0
    corridor_center = Vector((ox, oy)) - inward * 1.5
    floor_scale = (2.4, 1.5, 0.04) if horizontal else (1.5, 2.4, 0.04)
    cube(f"{side} room", (*room_center, -0.07), floor_scale, FLOOR_MAT)
    cube(f"{side} corridor", (*corridor_center, -0.08), floor_scale, CORRIDOR_MAT)

    slab_scale = (1.675, 0.29, 1.45) if horizontal else (0.29, 1.675, 1.45)
    cube(f"{side} authoritative slab", (ox, oy, 1.45), slab_scale, SLAB_MAT)
    marker_scale = (1.9, 0.035, 0.025) if horizontal else (0.035, 1.9, 0.025)
    cube(f"{side} threshold", (ox, oy, 0.01), marker_scale, LINE_MAT)

    gate_xy = Vector((ox, oy)) + Vector(offset)
    import_gate(gate_path, f"{side} open kit frame", gate_xy, yaw_steps, surface)
    add_label(
        f"{side}   inset ({offset[0]:+.1f}, {offset[1]:+.1f})   yaw {yaw_steps * 90} deg",
        (ox, oy - 3.0, 3.35),
    )


world = bpy.data.worlds.new("Gateway review world")
bpy.context.scene.world = world
world.color = (0.012, 0.015, 0.02)

space_gate = ROOT / "public/3d/runtime/kits/modular-space-kit/gate.glb"
cave_gate = ROOT / "public/3d/runtime/kits/modular-cave-kit/gate.glb"
add_panel("NORTH", (-4.5, 4.0), space_gate, (0.0, 0.5), 0, SPACE_GATE_MAT)
add_panel("EAST", (4.5, 4.0), cave_gate, (-0.5, 0.0), 1, CAVE_GATE_MAT)
add_panel("SOUTH", (-4.5, -4.0), cave_gate, (0.0, -0.5), 2, CAVE_GATE_MAT)
add_panel("WEST", (4.5, -4.0), space_gate, (0.5, 0.0), 3, SPACE_GATE_MAT)

add_label("SPRINT 49 M1 — SHIPPED GATE GLBs + AUTHORITATIVE DOOR SLABS", (0, 9.0, 3.35), 0.52)
add_label("teal = room side     orange = threshold     charcoal = corridor", (0, 8.35, 3.35), 0.34)

bpy.ops.object.light_add(type="AREA", location=(0, 0, 12))
key = bpy.context.object
key.data.energy = 1800
key.data.shape = "DISK"
key.data.size = 10
bpy.ops.object.light_add(type="AREA", location=(-8, -5, 6))
bpy.context.object.data.energy = 850
bpy.context.object.data.color = (0.35, 0.65, 1.0)
bpy.context.object.data.size = 7

bpy.ops.object.camera_add(location=(0, -0.5, 22), rotation=(0, 0, 0))
camera = bpy.context.object
camera.data.type = "ORTHO"
camera.data.ortho_scale = 19.5
camera.rotation_euler = (0, 0, 0)
camera.rotation_euler.x = 0
# Cameras look down local -Z; identity rotation gives a deterministic plan view.
bpy.context.scene.camera = camera

scene = bpy.context.scene
scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x = 1400
scene.render.resolution_y = 1000
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.film_transparent = False
OUTPUT.parent.mkdir(parents=True, exist_ok=True)
scene.render.filepath = str(OUTPUT)
bpy.ops.render.render(write_still=True)
print(f"[gateway_orientation_report] wrote {OUTPUT}")
