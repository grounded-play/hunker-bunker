"""Construct, rig, and stage the five Act 2 ending cinematics in Blender Cycles.

Aesthetic Direction: Neo-Gothic meets Cyberbiohorror Post-Punk.
Features:
- Cycles raytracing with the production AgX Punchy look and OpenImageDenoise.
- Atmospheric volumetric scatter for cathedral god-rays, coolant steam, and spore fog.
- Physical 35mm full-frame sensors with shot-safe depth of field and a seven-blade spherical iris.
- Reusable modular sets: SET-A (Cabin), SET-B (Cargo 4), SET-C (Medical Dock), SET-D (Exterior Ice).
- 20 precisely timed and calibrated cinematic camera rigs (MI-01..04, AE-01..04, OE-01..04, FC-01..04, EH-01..04).
- Kitbashes existing repository GLB assets from public/3d/runtime/new3ds/ and public/3d/runtime/.
"""

from __future__ import annotations

import argparse
import math
from pathlib import Path
import sys

import bpy

sys.path.insert(0, str(Path(__file__).resolve().parent))
from cinematic_lighting import add_separation_rim  # noqa: E402
from cinematic_fx import add_boid_swarm, add_drift_motes, add_secondary_motion, animate_camera_dynamics  # noqa: E402


# Locked in docs/planning/blender-cinematic-optics-2026-09-12.md. Keep these
# values shared by every production scene; an artist can animate a focus target
# per shot without silently changing the family-wide optical baseline.
APERTURE_BY_LENS = ((32, 5.6), (60, 4.0), (90, 2.8), (10_000, 4.0))
APERTURE_BLADES = 7
VIEW_TRANSFORM = "AgX"
VIEW_LOOK = "AgX - Punchy"
VOLUME_DENSITY = 0.004
VOLUME_ANISOTROPY = 0.4

SHOT_MID_FRAMES = {
    "MI": (21, 61, 106, 156), "AE": (22, 71, 119, 167),
    "OE": (20, 61, 102, 146), "FC": (19, 62, 104, 146),
    "EH": (23, 66, 106, 154),
}


def aperture_for_lens(lens_mm: float) -> float:
    for ceiling, fstop in APERTURE_BY_LENS:
        if lens_mm <= ceiling:
            return fstop
    return 4.0


def get_base_dir() -> Path:
    return Path(__file__).resolve().parent.parent.parent


def setup_cycles_and_color_management(scene: bpy.types.Scene) -> None:
    scene.render.engine = "CYCLES"
    scene.cycles.device = "GPU"
    preferences = bpy.context.preferences
    cycles_prefs = preferences.addons.get("cycles")
    if cycles_prefs:
        try:
            cycles_prefs.preferences.compute_device_type = "CUDA"
            cycles_prefs.preferences.get_devices()
        except Exception as exc:
            # No CUDA runtime: CPU-only CI, an AMD/Apple host, or a container
            # without the driver. Cycles would fall back to the CPU anyway, so
            # make that explicit rather than leaving the scene claiming a GPU
            # device it cannot use. Same image, slower -- not a failure, so the
            # build continues.
            print(f"[build_ending_scenes] CUDA unavailable, rendering on CPU: {exc}")
            scene.cycles.device = "CPU"

    # 256 for delivery. 128 left visible chroma noise in the deep shadows these
    # sets are mostly made of, which the denoiser then smeared into blotches --
    # worse than the noise. Cost is roughly linear, ~40s/frame at 1080p here.
    scene.cycles.samples = 256
    scene.cycles.preview_samples = 32
    scene.cycles.use_denoising = True
    scene.cycles.denoiser = "OPENIMAGEDENOISE"
    scene.cycles.max_bounces = 8
    scene.cycles.diffuse_bounces = 3
    scene.cycles.glossy_bounces = 4
    scene.cycles.transmission_bounces = 6
    scene.cycles.volume_bounces = 2

    # Pin the approved transform. Relying on the installed Blender default
    # makes saturated practicals change appearance across workstations.
    scene.view_settings.view_transform = VIEW_TRANSFORM
    scene.view_settings.look = VIEW_LOOK
    scene.view_settings.exposure = 0.0
    scene.view_settings.gamma = 1.0

    # Cinematic 1080p 24fps
    scene.render.resolution_x = 1920
    scene.render.resolution_y = 1080
    scene.render.fps = 24
    scene["cinematic_optics_spec"] = "docs/planning/blender-cinematic-optics-2026-09-12.md"
    scene["view_transform"] = VIEW_TRANSFORM
    scene["view_look"] = VIEW_LOOK
    scene["volume_density"] = VOLUME_DENSITY
    scene["volume_anisotropy"] = VOLUME_ANISOTROPY


SPACE_HDRI_PATH = "art/source/hdri/game_deep_space_4k.exr"
GAME_SPACE_LAYERS = (
    ("public/sky/cinematic_deep_space_panorama.jpg", 0.0, 1.0),
)


def build_game_space_sky_nodes(output_node, links, nodes, strength: float = 1.0):
    """Build the film sky from the same painted layers used by the game.

    All three inputs are 2:1 sky paintings, so Environment Texture can map them
    panoramically without stretching a square billboard around the horizon.
    Violet carries the cyberbiohorror identity, ember keeps skin/metal from
    receiving cyan-only reflections, and the core supplies dense stars and a
    readable galactic band. Layer gain is allowed above one before the
    Background shader: that is what turns LDR paintings into a useful authored
    HDR environment rather than a bright wallpaper that contributes no light.
    """
    base_dir = get_base_dir()
    if not all((base_dir / path).is_file() for path, _, _ in GAME_SPACE_LAYERS):
        return None

    tex_coord = nodes.new("ShaderNodeTexCoord")
    tex_coord.location = (-1300, 0)
    underfield = nodes.new("ShaderNodeRGB")
    underfield.location = (-720, 420)
    underfield.outputs[0].default_value = (0.003, 0.008, 0.025, 1.0)
    composite = underfield.outputs[0]
    for index, (relative_path, yaw, opacity) in enumerate(GAME_SPACE_LAYERS):
        mapping = nodes.new("ShaderNodeMapping")
        mapping.location = (-1120, 160 - index * 260)
        mapping.inputs["Rotation"].default_value[2] = yaw
        links.new(tex_coord.outputs["Generated"], mapping.inputs["Vector"])

        environment = nodes.new("ShaderNodeTexEnvironment")
        environment.name = f"GameSky_{Path(relative_path).stem}"
        environment.label = f"GAME SKY · {Path(relative_path).stem}"
        environment.location = (-880, 160 - index * 260)
        environment.image = bpy.data.images.load(str(base_dir / relative_path), check_existing=True)
        # Matches the game's ADDITIVE_LAYER_IDS contract: these skies read RGB
        # and intentionally ignore their keyed alpha. Blender otherwise
        # premultiplies transparent texels into black circular voids.
        environment.image.alpha_mode = "CHANNEL_PACKED"
        links.new(mapping.outputs["Vector"], environment.inputs["Vector"])

        add = nodes.new("ShaderNodeMixRGB")
        add.blend_type = "ADD"
        add.inputs["Fac"].default_value = opacity
        add.location = (-560 + index * 180, -80 - index * 90)
        links.new(composite, add.inputs[1])
        links.new(environment.outputs["Color"], add.inputs[2])
        composite = add.outputs["Color"]

    # Scene-linear peaks above 1.0 create real colored speculars and bounce.
    hdr_gain = nodes.new("ShaderNodeVectorMath")
    hdr_gain.operation = "SCALE"
    hdr_gain.location = (220, -180)
    hdr_gain.inputs[3].default_value = 1.8
    links.new(composite, hdr_gain.inputs[0])

    sky_bg = nodes.new("ShaderNodeBackground")
    sky_bg.name = "GameDeepSpaceHDR"
    sky_bg.label = "GAME SKY · HDR LIGHTING"
    sky_bg.location = (440, 80)
    sky_bg.inputs["Strength"].default_value = strength
    links.new(hdr_gain.outputs["Vector"], sky_bg.inputs["Color"])
    return sky_bg


def build_space_sky_nodes(node_tree, output_node, links, nodes, strength: float = 1.0):
    """
    A procedural deep-space environment: starfield, nebula and a cold rim glow.

    Made rather than downloaded. A CC0 sky from Poly Haven would need the
    Blender MCP bridge to a live GUI session, and a procedural sky has no
    resolution ceiling, no licence to track, and tunes per scene. It is also a
    genuine HDR -- the star highlights sit well above 1.0, so they bloom and
    light the set instead of clipping to flat white.

    Three layers, matching how space actually reads on camera:
      - deep base, near black but never pure black, so nothing clips to void;
      - nebula, low-frequency noise tinted toward the game's cyan/violet palette
        and kept dim, because a loud nebula reads as a screensaver;
      - stars, high-frequency Voronoi with a hard threshold so points stay
        points rather than blurring into a grey wash.
    """
    game_sky = build_game_space_sky_nodes(output_node, links, nodes, strength)
    if game_sky is not None:
        return game_sky

    coord = nodes.new("ShaderNodeTexCoord")
    coord.location = (-1200, -400)

    # Nebula: large, soft, and deliberately restrained.
    neb_noise = nodes.new("ShaderNodeTexNoise")
    neb_noise.location = (-1000, -300)
    neb_noise.inputs["Scale"].default_value = 2.2
    neb_noise.inputs["Detail"].default_value = 8.0
    neb_noise.inputs["Roughness"].default_value = 0.62
    links.new(coord.outputs["Generated"], neb_noise.inputs["Vector"])

    neb_ramp = nodes.new("ShaderNodeValToRGB")
    neb_ramp.location = (-800, -300)
    neb_ramp.color_ramp.elements[0].position = 0.42
    neb_ramp.color_ramp.elements[0].color = (0.004, 0.006, 0.014, 1.0)
    neb_ramp.color_ramp.elements[1].position = 0.78
    neb_ramp.color_ramp.elements[1].color = (0.045, 0.030, 0.075, 1.0)
    links.new(neb_noise.outputs["Fac"], neb_ramp.inputs["Fac"])

    # Stars: Voronoi distance, inverted and hard-clipped. A soft ramp here gives
    # grey fog instead of stars, which is the usual way procedural starfields
    # go wrong.
    star_vor = nodes.new("ShaderNodeTexVoronoi")
    star_vor.location = (-1000, -700)
    star_vor.feature = "F1"
    star_vor.inputs["Scale"].default_value = 220.0
    links.new(coord.outputs["Generated"], star_vor.inputs["Vector"])

    star_ramp = nodes.new("ShaderNodeValToRGB")
    star_ramp.location = (-800, -700)
    star_ramp.color_ramp.interpolation = "CONSTANT"
    star_ramp.color_ramp.elements[0].position = 0.0
    star_ramp.color_ramp.elements[0].color = (1.0, 1.0, 1.0, 1.0)
    star_ramp.color_ramp.elements[1].position = 0.045
    star_ramp.color_ramp.elements[1].color = (0.0, 0.0, 0.0, 1.0)
    links.new(star_vor.outputs["Distance"], star_ramp.inputs["Fac"])

    # Push stars well above 1.0. A first bake peaked at 0.172 -- stars are
    # point-sized at scale 220, so pixel filtering averages each one against its
    # black neighbours and the result was an LDR image of a starfield rather
    # than an HDR. Multiplying before the filter is what survives it.
    star_gain = nodes.new("ShaderNodeMath")
    star_gain.location = (-700, -700)
    star_gain.operation = "MULTIPLY"
    star_gain.inputs[1].default_value = 60.0
    links.new(star_ramp.outputs["Color"], star_gain.inputs[0])

    star_bright = nodes.new("ShaderNodeMixRGB")
    star_bright.location = (-600, -500)
    star_bright.blend_type = "ADD"
    star_bright.inputs["Fac"].default_value = 1.0
    links.new(neb_ramp.outputs["Color"], star_bright.inputs[1])
    links.new(star_gain.outputs["Value"], star_bright.inputs[2])

    sky_bg = nodes.new("ShaderNodeBackground")
    sky_bg.location = (-380, -500)
    sky_bg.inputs["Strength"].default_value = strength
    links.new(star_bright.outputs["Color"], sky_bg.inputs["Color"])
    return sky_bg


def setup_world_atmosphere(
    scene: bpy.types.Scene,
    color_hex: str = "#020408",
    volume_density: float = VOLUME_DENSITY,
    world_strength: float = 0.9,
    space_sky: bool = False,
) -> None:
    world = scene.world
    if not world:
        world = bpy.data.worlds.new("NeoGothicWorld")
        scene.world = world

    world.use_nodes = True
    nodes = world.node_tree.nodes
    links = world.node_tree.links
    nodes.clear()

    output_node = nodes.new(type="ShaderNodeOutputWorld")
    output_node.location = (400, 0)

    # An HDRI-equivalent environment, built procedurally rather than shipped as
    # a .hdr: no download, no licence to clear, and it tunes per scene.
    #
    # What an HDRI actually buys on a set like this is DIRECTIONAL AMBIENT --
    # cool light from above, warm bounce from the floor, and a brighter horizon
    # band. A flat background colour (what this was: 0.15 strength of near
    # black) buys none of that, which is why interiors rendered as silhouettes
    # against nothing and several shots came out pure black.
    #
    # Direction comes from the world-space vector; its Z drives a ramp from
    # floor bounce through horizon to sky.
    # Exterior scenes look at space, so they get the baked space HDRI rather
    # than the interior bounce gradient. Falls back to the gradient when the
    # .exr has not been baked yet, so the build never depends on an artifact
    # that may not exist.
    hdri_file = get_base_dir() / SPACE_HDRI_PATH
    if space_sky and hdri_file.exists():
        env = nodes.new(type="ShaderNodeTexEnvironment")
        env.location = (-400, 100)
        env.image = bpy.data.images.load(str(hdri_file), check_existing=True)
        sky_bg = nodes.new(type="ShaderNodeBackground")
        sky_bg.location = (100, 100)
        sky_bg.inputs["Strength"].default_value = world_strength
        links.new(env.outputs["Color"], sky_bg.inputs["Color"])
        links.new(sky_bg.outputs["Background"], output_node.inputs["Surface"])
        # Never put an infinite volume in a space world. Even modest density
        # extinguishes every environment ray and turns a detailed HDR into a
        # flat black background. Exterior snow/exhaust haze belongs in bounded
        # volume geometry near the set.
        return

    if space_sky:
        # Source assets remain directly usable before (or without) a bake. The
        # EXR is a render optimisation and interchange artifact, not a hidden
        # prerequisite for getting the game's sky into a scene.
        sky_bg = build_space_sky_nodes(world.node_tree, output_node, links, nodes, world_strength)
        links.new(sky_bg.outputs["Background"], output_node.inputs["Surface"])
        return

    tex_coord = nodes.new(type="ShaderNodeTexCoord")
    tex_coord.location = (-800, 100)

    separate = nodes.new(type="ShaderNodeSeparateXYZ")
    separate.location = (-600, 100)
    links.new(tex_coord.outputs["Generated"], separate.inputs["Vector"])

    # Generated runs -1..1 vertically; remap to 0..1 so the ramp reads as
    # floor -> horizon -> sky.
    map_range = nodes.new(type="ShaderNodeMapRange")
    map_range.location = (-420, 100)
    map_range.inputs["From Min"].default_value = -1.0
    map_range.inputs["From Max"].default_value = 1.0
    map_range.inputs["To Min"].default_value = 0.0
    map_range.inputs["To Max"].default_value = 1.0
    links.new(separate.outputs["Z"], map_range.inputs["Value"])

    ramp = nodes.new(type="ShaderNodeValToRGB")
    ramp.location = (-240, 100)
    ramp.color_ramp.interpolation = "EASE"
    # Floor bounce: warm and dim. Real rooms bounce their own floor colour up
    # into everything, and its absence is most of why CG interiors read flat.
    ramp.color_ramp.elements[0].position = 0.0
    ramp.color_ramp.elements[0].color = (0.055, 0.035, 0.022, 1.0)
    # Horizon: the brightest band, and the one that actually models a set.
    horizon = ramp.color_ramp.elements.new(0.48)
    horizon.color = (0.085, 0.105, 0.135, 1.0)
    # Sky: cold and slightly blue, the classic cool key from above.
    ramp.color_ramp.elements[1].position = 1.0
    ramp.color_ramp.elements[1].color = (0.045, 0.075, 0.125, 1.0)
    links.new(map_range.outputs["Result"], ramp.inputs["Fac"])

    bg_node = nodes.new(type="ShaderNodeBackground")
    bg_node.location = (100, 100)
    # Enough fill that unlit geometry still reads as a shape. Practicals remain
    # the key -- this only stops everything outside their cones being void.
    bg_node.inputs["Strength"].default_value = world_strength
    links.new(ramp.outputs["Color"], bg_node.inputs["Color"])
    links.new(bg_node.outputs["Background"], output_node.inputs["Surface"])

    # Volumetric scatter for god-rays, dust, and chilled air
    if volume_density > 0:
        vol_node = nodes.new(type="ShaderNodeVolumeScatter")
        vol_node.location = (100, -100)
        vol_node.inputs["Color"].default_value = (0.35, 0.55, 0.75, 1.0)
        vol_node.inputs["Density"].default_value = volume_density
        vol_node.inputs["Anisotropy"].default_value = VOLUME_ANISOTROPY
        links.new(vol_node.outputs["Volume"], output_node.inputs["Volume"])


def import_asset(asset_rel_path: str, collection: bpy.types.Collection) -> bpy.types.Object | None:
    base_dir = get_base_dir()
    full_path = (base_dir / asset_rel_path).resolve()
    if not full_path.exists():
        return None

    # Track objects before import
    before_objs = set(bpy.data.objects)
    try:
        bpy.ops.import_scene.gltf(filepath=str(full_path))
    except Exception as e:
        print(f"Warning: Failed to import {full_path}: {e}")
        return None

    new_objs = [o for o in bpy.data.objects if o not in before_objs]
    root_obj = None
    for o in new_objs:
        for c in o.users_collection:
            c.objects.unlink(o)
        collection.objects.link(o)
        if not o.parent:
            root_obj = o
    return root_obj


def _shell_material(name: str, base, roughness: float, metallic: float = 0.0):
    """Simple PBR surface for room shell geometry."""
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = next(n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    bsdf.inputs["Base Color"].default_value = (*base, 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    return mat


def build_room_shell(
    scene: bpy.types.Scene,
    collection: bpy.types.Collection,
    *,
    margin: float = 2.0,
    height: float = 4.0,
    floor_color=(0.052, 0.055, 0.060),
    wall_color=(0.070, 0.074, 0.082),
    ceiling_color=(0.030, 0.032, 0.036),
    name_prefix: str = "Shell",
    exterior: bool = False,
    source_collection: bpy.types.Collection | None = None,
) -> list:
    """
    Build the floor, four walls and ceiling the sets were missing entirely.

    Every ending scene was props and a character floating in void -- no floor,
    no walls, no ceiling, verified by name scan across all five. That is the
    single biggest reason these read as nothing: with no surfaces there is no
    bounce, spot cones land on nothing, shadows fall into infinity, and the
    "negative space" the framing spec warns about is literally the absence of a
    room rather than a compositional choice.

    Sized from the set's own bounds plus a margin, so each scene gets a room
    that actually contains its dressing rather than a guessed box. Normals face
    inward: Cycles renders backfaces, but an inward shell keeps the geometry
    honest for anyone opening the file.

    The ceiling is darker than the walls and the floor darker still at grazing
    angles -- rooms are lit from within here, so the ceiling is the surface
    furthest from every practical.
    """
    import mathutils

    lo = [1e9, 1e9, 1e9]
    hi = [-1e9, -1e9, -1e9]
    found = False
    source_objects = source_collection.all_objects if source_collection else scene.objects
    for obj in source_objects:
        if obj.type != "MESH" or obj.hide_render:
            continue
        found = True
        for corner in obj.bound_box:
            world = obj.matrix_world @ mathutils.Vector(corner)
            for axis in range(3):
                lo[axis] = min(lo[axis], world[axis])
                hi[axis] = max(hi[axis], world[axis])
    if not found:
        return []

    min_x, max_x = lo[0] - margin, hi[0] + margin
    min_y, max_y = lo[1] - margin, hi[1] + margin
    floor_z = lo[2]
    ceil_z = floor_z + max(height, (hi[2] - lo[2]) + 1.0)
    cx, cy = (min_x + max_x) / 2, (min_y + max_y) / 2
    size_x, size_y = max_x - min_x, max_y - min_y

    floor_mat = _shell_material(f"{name_prefix}_Floor", floor_color, 0.42, 0.15)
    wall_mat = _shell_material(f"{name_prefix}_Wall", wall_color, 0.62, 0.05)
    ceil_mat = _shell_material(f"{name_prefix}_Ceiling", ceiling_color, 0.78, 0.0)

    created = []
    if exterior:
        # An exterior set gets GROUND ONLY. Giving the ice shelf a ceiling and
        # four walls would box it in and hide the space sky entirely -- the
        # shell exists to stop props floating in void, not to put a roof on the
        # outdoors. Ground is oversized so the horizon reads as distance.
        floor_mat.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.42, 0.47, 0.55, 1.0)
        bpy.ops.mesh.primitive_plane_add(size=1.0, location=(cx, cy, floor_z))
        ground = bpy.context.active_object
        ground.name = f"{name_prefix}_Ground"
        ground.scale = (size_x * 6, size_y * 6, 1.0)
        for other in list(ground.users_collection):
            other.objects.unlink(ground)
        collection.objects.link(ground)
        ground.data.materials.append(floor_mat)
        return [ground.name]

    # VIEWPORT. A sealed shell occludes the world completely -- raising the
    # interior environment strength from 0.55 to 1.8 produced a byte-identical
    # render, which is how we know. Cutting an aperture in one wall is what
    # actually lets the game sky light the room and appear behind the cast.
    #
    # Built as four panels around a gap rather than a boolean: no modifier to
    # evaluate, no n-gon to misbehave, and each panel stays a flat quad.
    wall_h = ceil_z - floor_z
    ap_w = size_x * VIEWPORT_WIDTH_FRACTION
    ap_h = wall_h * VIEWPORT_HEIGHT_FRACTION
    # Sill above the floor so the opening reads as a window, not a missing wall.
    ap_bottom = floor_z + (wall_h - ap_h) * VIEWPORT_SILL_FRACTION
    ap_top = ap_bottom + ap_h
    side_w = (size_x - ap_w) / 2.0
    north_y = max_y
    north_rot = (math.radians(90), 0, 0)

    surfaces = (
        ("Floor", (cx, cy, floor_z), (0, 0, 0), (size_x, size_y), floor_mat),
        ("Ceiling", (cx, cy, ceil_z), (math.radians(180), 0, 0), (size_x, size_y), ceil_mat),
        # North wall in four pieces around the viewport aperture.
        ("Wall_N_Left", (cx - (ap_w / 2) - (side_w / 2), north_y, (floor_z + ceil_z) / 2), north_rot, (side_w, wall_h), wall_mat),
        ("Wall_N_Right", (cx + (ap_w / 2) + (side_w / 2), north_y, (floor_z + ceil_z) / 2), north_rot, (side_w, wall_h), wall_mat),
        ("Wall_N_Above", (cx, north_y, (ap_top + ceil_z) / 2), north_rot, (ap_w, ceil_z - ap_top), wall_mat),
        ("Wall_N_Below", (cx, north_y, (floor_z + ap_bottom) / 2), north_rot, (ap_w, ap_bottom - floor_z), wall_mat),
        ("Wall_S", (cx, min_y, (floor_z + ceil_z) / 2), (math.radians(-90), 0, 0), (size_x, ceil_z - floor_z), wall_mat),
        ("Wall_E", (max_x, cy, (floor_z + ceil_z) / 2), (0, math.radians(-90), 0), (ceil_z - floor_z, size_y), wall_mat),
        ("Wall_W", (min_x, cy, (floor_z + ceil_z) / 2), (0, math.radians(90), 0), (ceil_z - floor_z, size_y), wall_mat),
    )
    for suffix, location, rotation, (sx, sy), material in surfaces:
        bpy.ops.mesh.primitive_plane_add(size=1.0, location=location)
        plane = bpy.context.active_object
        plane.name = f"{name_prefix}_{suffix}"
        plane.rotation_euler = rotation
        plane.scale = (sx, sy, 1.0)
        for other in list(plane.users_collection):
            other.objects.unlink(plane)
        collection.objects.link(plane)
        plane.data.materials.append(material)
        created.append(plane.name)
    return created


def set_camera_focus_from_frame(scene: bpy.types.Scene, camera: bpy.types.Object) -> float | None:
    """Focus on the nearest renderable subject actually inside the camera frustum."""
    import mathutils

    parts = camera.name.split("_")
    prefix = parts[1] if len(parts) > 2 else ""
    shot_index = int(parts[2]) - 1 if len(parts) > 2 and parts[2].isdigit() else 0
    frame = SHOT_MID_FRAMES.get(prefix, (scene.frame_start,))[shot_index]
    scene.frame_set(frame)
    bpy.context.view_layer.update()
    evaluated = camera.evaluated_get(bpy.context.evaluated_depsgraph_get())
    origin = evaluated.matrix_world.translation
    forward = evaluated.matrix_world.to_quaternion() @ mathutils.Vector((0, 0, -1))
    horizontal_half = math.atan((camera.data.sensor_width * 0.5) / camera.data.lens)
    best = None
    for obj in scene.objects:
        if obj.type != "MESH" or obj.hide_render or obj.name.startswith("Shell_"):
            continue
        center = obj.matrix_world @ mathutils.Vector(obj.bound_box[0])
        corners = [obj.matrix_world @ mathutils.Vector(corner) for corner in obj.bound_box]
        center = sum(corners, mathutils.Vector()) / len(corners)
        delta = center - origin
        along = delta.dot(forward)
        if along <= camera.data.clip_start:
            continue
        off_axis = forward.angle(delta.normalized())
        if off_axis > horizontal_half * 1.15:
            continue
        if best is None or along < best:
            best = along
    focus = camera.data.dof.focus_object
    if best is not None and focus is not None:
        focus.location = (0, 0, -max(0.35, best))
        camera["autofocus_distance"] = best
    return best


def aim_object_at(obj: bpy.types.Object, target) -> None:
    """Point a light (or any -Z-forward object) at a world-space point."""
    import mathutils

    direction = mathutils.Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def key_render_visibility(objects, visible_ranges: list[tuple[int, int]]) -> None:
    """Animate object render visibility for sets sharing one stage origin.

    SET-A and SET-D are alternate locations, not simultaneous geometry.  Their
    shots live in one Blender scene for editorial convenience, so leaving both
    renderable makes the cabin walls occlude the exterior shuttle.  Stepped
    hide_render keys provide the equivalent of per-shot view layers while
    keeping the existing single-scene render workflow intact.
    """
    for obj in objects:
        for frame in range(bpy.context.scene.frame_start, bpy.context.scene.frame_end + 2):
            visible = any(start <= frame <= end for start, end in visible_ranges)
            obj.hide_render = not visible
            obj.keyframe_insert(data_path="hide_render", frame=frame)


def create_camera(
    name: str,
    focal_length_mm: float,
    f_stop: float | None = None,
    collection: bpy.types.Collection | None = None,
) -> bpy.types.Object:
    cam_data = bpy.data.cameras.new(name)
    cam_data.lens = focal_length_mm
    cam_data.sensor_width = 36.0
    cam_data.sensor_height = 24.0

    # Geography-safe lens-band defaults supersede the early shot-list f/stops.
    # The original values produced millimetres of usable focus on moving macro
    # shots. `f_stop` remains in the signature for compatibility with the
    # staging calls, but the approved optics addendum is authoritative.
    approved_fstop = aperture_for_lens(focal_length_mm)
    cam_data.dof.use_dof = True
    cam_data.dof.aperture_fstop = approved_fstop
    cam_data.dof.aperture_blades = APERTURE_BLADES
    cam_data.dof.aperture_ratio = 1.0

    cam_obj = bpy.data.objects.new(name, cam_data)
    target_col = collection if collection else bpy.context.scene.collection
    target_col.objects.link(cam_obj)

    # A camera-relative target gives every moving camera a stable starting
    # focus plane. Artists animate/re-parent this empty for rack focuses; they
    # never keyframe a brittle numeric focus_distance.
    focus = bpy.data.objects.new(f"FOCUS_{name.removeprefix('CAM_')}", None)
    focus.empty_display_type = "SPHERE"
    focus.empty_display_size = 0.12
    target_col.objects.link(focus)
    focus.parent = cam_obj
    focus.location = (0.0, 0.0, -5.0)
    cam_data.dof.focus_object = focus
    cam_obj["approved_fstop"] = approved_fstop
    cam_obj["requested_fstop_from_shot_list"] = f_stop if f_stop is not None else approved_fstop
    cam_obj["focus_target"] = focus.name
    return cam_obj




# Viewport aperture in one interior wall, as a fraction of that wall. Sized to
# read as a ship window: wide enough to admit real light and show sky behind the
# cast, not so wide the room stops being a room.
VIEWPORT_WIDTH_FRACTION = 0.46
VIEWPORT_HEIGHT_FRACTION = 0.40
VIEWPORT_SILL_FRACTION = 0.55

MAX_OFF_AXIS_DEG = 12.0


def _set_bounds_center(scene: bpy.types.Scene):
    """World-space centre of every renderable mesh in the scene."""
    import mathutils

    lo = [1e9, 1e9, 1e9]
    hi = [-1e9, -1e9, -1e9]
    found = False
    for obj in scene.objects:
        if obj.type != "MESH" or obj.hide_render:
            continue
        found = True
        for corner in obj.bound_box:
            world = obj.matrix_world @ mathutils.Vector(corner)
            for axis in range(3):
                lo[axis] = min(lo[axis], world[axis])
                hi[axis] = max(hi[axis], world[axis])
    if not found:
        return None
    return mathutils.Vector(((lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2))


def camera_off_axis_deg(camera: bpy.types.Object, target) -> float:
    """
    Angle between where a camera looks and where the subject actually is.

    Read through the evaluated depsgraph: a TRACK_TO constraint does not touch
    the object's own matrix_world, so measuring the original datablock reports
    the pre-constraint rotation and makes a corrected camera look broken.
    """
    import mathutils

    depsgraph = bpy.context.evaluated_depsgraph_get()
    evaluated = camera.evaluated_get(depsgraph)
    to_target = target - evaluated.matrix_world.translation
    if to_target.length < 1e-6:
        return 0.0
    forward = evaluated.matrix_world.to_quaternion() @ mathutils.Vector((0.0, 0.0, -1.0))
    return math.degrees(forward.angle(to_target.normalized()))


def camera_is_inside_set(camera: bpy.types.Object, scene: bpy.types.Scene) -> bool:
    """
    Is the camera standing within the set rather than looking at it?

    A close-up framing one detail from inside the room is not "off axis" in any
    meaningful sense -- the set centre is behind it, or beside it. Measuring
    those against the whole-set centre reports nonsense (CAM_MI_03 scored 45
    degrees while framing exactly what it was meant to).
    """
    import mathutils

    lo = [1e9, 1e9, 1e9]
    hi = [-1e9, -1e9, -1e9]
    for obj in scene.objects:
        if obj.type != "MESH" or obj.hide_render:
            continue
        for corner in obj.bound_box:
            world = obj.matrix_world @ mathutils.Vector(corner)
            for axis in range(3):
                lo[axis] = min(lo[axis], world[axis])
                hi[axis] = max(hi[axis], world[axis])
    loc = camera.matrix_world.translation
    return all(lo[i] <= loc[i] <= hi[i] for i in range(2))


def aim_stray_cameras(scene: bpy.types.Scene, collection: bpy.types.Collection) -> list[str]:
    """
    REPORT badly-framed cameras. Does not mutate them -- see below.

    Every shot camera here animates its LOCATION but holds a hand-authored
    static rotation, so a dolly cannot keep its subject framed -- and several
    were 20-31 degrees off the set, which on a 28mm lens puts the whole set off
    the edge of frame. Tracking an aim empty is what this file already asks for
    in create_camera's own comment ("never keyframe a brittle numeric"), applied
    to rotation as well as focus.

    An earlier version of this added a TRACK_TO constraint automatically. That
    was wrong and is reverted: CAM_MI_02 stands OUTSIDE the room and looks along
    it deliberately, so aiming it at the set centre pointed it into the unlit
    back of an exterior wall and rendered pure black -- a correctly composed
    shot made worse by an automated "fix".

    Framing is an art decision. A geometric rule cannot tell a bad angle from a
    deliberate one, so this now reports and lets validation fail loudly, and a
    human fixes the blocking.
    """
    # Evaluate first: straight after staging, the depsgraph still holds the
    # pre-staging transforms, so every camera measures as near-zero off-axis and
    # nothing gets corrected -- while validation, which runs after an update,
    # then reports the real angles. Measure and validate against the same state.
    bpy.context.view_layer.update()
    center = _set_bounds_center(scene)
    if center is None:
        return []
    corrected = []
    for camera in (o for o in scene.objects if o.type == "CAMERA" and o.name.startswith("CAM_")):
        if any(c.type == "TRACK_TO" for c in camera.constraints):
            continue
        if camera_is_inside_set(camera, scene):
            continue
        if camera_off_axis_deg(camera, center) <= MAX_OFF_AXIS_DEG:
            continue
        corrected.append(f"{camera.name} ({camera_off_axis_deg(camera, center):.1f} deg)")
    return corrected


# Materials whose name or texture suggests a lit surface. These become real
# emitters so a monitor reads as a light source rather than a painted panel --
# the single biggest difference between "game prop in a render" and "set piece".
EMISSIVE_HINTS = (
    "monitor", "screen", "display", "console", "terminal", "vital", "scanner",
    "lamp", "light", "glow", "led", "panel_lit", "hologram", "readout",
)

# Textures at or below this size are authored pixel art. Blender's default
# Linear filtering turns them to mush at cinema resolution; Closest keeps the
# crispness the game art was drawn with.
PIXEL_TEXTURE_MAX = 256


def enhance_imported_materials(scene: bpy.types.Scene) -> dict:
    """
    Bring imported game materials up to cinema standard without repainting them.

    glTF import brings the game's textures across intact -- 39 packed images
    across 15 materials in SET-C -- but every material lands at a flat
    roughness 0.5 with no emission and no surface variation. That is correct for
    a game renderer and wrong for a 1080p close-up, where uniform roughness
    reads as plastic and an unlit monitor reads as a sticker.

    Three passes, all non-destructive to the source art:

    1. Pixel-art textures are switched to Closest filtering, so the game's own
       texel grid survives instead of being blurred into mush.
    2. Roughness gets a low-amplitude noise break-up, so highlights vary across
       a surface the way a real material does.
    3. Materials that read as lit surfaces get an emission driven by their OWN
       base colour texture, so a screen emits the image it is showing rather
       than a flat wash.
    """
    stats = {"materials": 0, "pixel_filtered": 0, "roughened": 0, "emissive": 0}
    seen = set()
    for obj in scene.objects:
        if obj.type != "MESH":
            continue
        # The OBJECT name is where the meaning lives. glTF import leaves
        # materials called "Material.001" and textures called
        # "texture_pbr_20250901", so matching on those finds nothing -- but the
        # objects are named Vital_Monitor_1, Scanner_Arch_Entrance, and so on.
        object_hint = obj.name.lower()
        for slot in obj.material_slots:
            mat = slot.material
            if mat is None or mat.name in seen or not mat.use_nodes:
                continue
            seen.add(mat.name)
            stats["materials"] += 1
            nodes = mat.node_tree.nodes
            links = mat.node_tree.links
            bsdf = next((n for n in nodes if n.type == "BSDF_PRINCIPLED"), None)
            if bsdf is None:
                continue

            tex_nodes = [n for n in nodes if n.type == "TEX_IMAGE" and n.image]
            for tex in tex_nodes:
                if max(tex.image.size) <= PIXEL_TEXTURE_MAX:
                    tex.interpolation = "Closest"
                    stats["pixel_filtered"] += 1

            # 2. Roughness break-up. Only when nothing already drives roughness,
            # so an authored roughness map is never overwritten.
            if not bsdf.inputs["Roughness"].is_linked:
                base = bsdf.inputs["Roughness"].default_value
                noise = nodes.new("ShaderNodeTexNoise")
                noise.location = (bsdf.location.x - 600, bsdf.location.y - 300)
                noise.inputs["Scale"].default_value = 18.0
                noise.inputs["Detail"].default_value = 4.0
                ramp = nodes.new("ShaderNodeMapRange")
                ramp.location = (bsdf.location.x - 400, bsdf.location.y - 300)
                ramp.inputs["From Min"].default_value = 0.0
                ramp.inputs["From Max"].default_value = 1.0
                # +/-0.12 around the authored value: enough to break a uniform
                # highlight, small enough that the surface still reads as itself.
                ramp.inputs["To Min"].default_value = max(0.05, base - 0.12)
                ramp.inputs["To Max"].default_value = min(1.0, base + 0.12)
                links.new(noise.outputs["Fac"], ramp.inputs["Value"])
                links.new(ramp.outputs["Result"], bsdf.inputs["Roughness"])
                stats["roughened"] += 1

            # 3. Emission for lit surfaces, driven by the material's own texture.
            haystack = (
                object_hint + " " + mat.name.lower() + " "
                + " ".join(t.image.name for t in tex_nodes).lower()
            )
            if any(hint in haystack for hint in EMISSIVE_HINTS):
                if bsdf.inputs["Base Color"].is_linked:
                    source = bsdf.inputs["Base Color"].links[0].from_socket
                    links.new(source, bsdf.inputs["Emission Color"])
                else:
                    bsdf.inputs["Emission Color"].default_value = bsdf.inputs["Base Color"].default_value
                # Restrained: these are set dressing, not the key light, and the
                # glare node downstream will bloom whatever clears threshold 1.0.
                bsdf.inputs["Emission Strength"].default_value = 2.5
                stats["emissive"] += 1
    return stats


def build_delivery_compositor(scene: bpy.types.Scene) -> None:
    """
    DISABLED -- and this is a correction, not a deferral.

    A scene compositing node group was added here to do glare and chromatic
    aberration at render time. It rendered every frame PURE BLACK, and I
    misattributed that to camera blocking for several commits.

    Proven by bisection: with the group detached the frame renders fully lit and
    textured; with the group attached it is black. Crucially a PASS-THROUGH
    group -- Group Input wired straight to Group Output, no glare, no lens --
    produces a byte-identical black frame. So the contents were never the
    problem: the group's "Image" input never receives the render result at all.

    Blender 5.x moved the compositor to `scene.compositing_node_group`, and the
    4.x nodes that used to source and sink the render (CompositorNodeRLayers /
    CompositorNodeComposite) no longer exist. A NodeSocketColor interface socket
    named "Image" is evidently not how the render result gets bound, and I could
    not establish what is without more Blender-version archaeology than this is
    worth.

    So the look moves to ENCODE time, where ffmpeg can apply bloom and chromatic
    aberration to the rendered frames and the result can be inspected directly.
    That is a better place for it anyway: it does not cost a re-render to retune,
    which for an 893-frame sequence is the difference between minutes and hours.

    The scene is left with no compositor, which is the state that demonstrably
    renders correctly.
    """
    scene.use_nodes = False
    scene.compositing_node_group = None


MAX_OFF_AXIS_DEG = 12.0


def _set_bounds_center(scene: bpy.types.Scene):
    """World-space centre of every renderable mesh in the scene."""
    import mathutils

    lo = [1e9, 1e9, 1e9]
    hi = [-1e9, -1e9, -1e9]
    found = False
    for obj in scene.objects:
        if obj.type != "MESH" or obj.hide_render:
            continue
        found = True
        for corner in obj.bound_box:
            world = obj.matrix_world @ mathutils.Vector(corner)
            for axis in range(3):
                lo[axis] = min(lo[axis], world[axis])
                hi[axis] = max(hi[axis], world[axis])
    if not found:
        return None
    return mathutils.Vector(((lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2))


def camera_off_axis_deg(camera: bpy.types.Object, target) -> float:
    """
    Angle between where a camera looks and where the subject actually is.

    Read through the evaluated depsgraph: a TRACK_TO constraint does not touch
    the object's own matrix_world, so measuring the original datablock reports
    the pre-constraint rotation and makes a corrected camera look broken.
    """
    import mathutils

    depsgraph = bpy.context.evaluated_depsgraph_get()
    evaluated = camera.evaluated_get(depsgraph)
    to_target = target - evaluated.matrix_world.translation
    if to_target.length < 1e-6:
        return 0.0
    forward = evaluated.matrix_world.to_quaternion() @ mathutils.Vector((0.0, 0.0, -1.0))
    return math.degrees(forward.angle(to_target.normalized()))


def camera_is_inside_set(camera: bpy.types.Object, scene: bpy.types.Scene) -> bool:
    """
    Is the camera standing within the set rather than looking at it?

    A close-up framing one detail from inside the room is not "off axis" in any
    meaningful sense -- the set centre is behind it, or beside it. Measuring
    those against the whole-set centre reports nonsense (CAM_MI_03 scored 45
    degrees while framing exactly what it was meant to).
    """
    import mathutils

    lo = [1e9, 1e9, 1e9]
    hi = [-1e9, -1e9, -1e9]
    for obj in scene.objects:
        if obj.type != "MESH" or obj.hide_render:
            continue
        for corner in obj.bound_box:
            world = obj.matrix_world @ mathutils.Vector(corner)
            for axis in range(3):
                lo[axis] = min(lo[axis], world[axis])
                hi[axis] = max(hi[axis], world[axis])
    loc = camera.matrix_world.translation
    return all(lo[i] <= loc[i] <= hi[i] for i in range(2))


def aim_stray_cameras(scene: bpy.types.Scene, collection: bpy.types.Collection) -> list[str]:
    """
    REPORT badly-framed cameras. Does not mutate them -- see below.

    Every shot camera here animates its LOCATION but holds a hand-authored
    static rotation, so a dolly cannot keep its subject framed -- and several
    were 20-31 degrees off the set, which on a 28mm lens puts the whole set off
    the edge of frame. Tracking an aim empty is what this file already asks for
    in create_camera's own comment ("never keyframe a brittle numeric"), applied
    to rotation as well as focus.

    An earlier version of this added a TRACK_TO constraint automatically. That
    was wrong and is reverted: CAM_MI_02 stands OUTSIDE the room and looks along
    it deliberately, so aiming it at the set centre pointed it into the unlit
    back of an exterior wall and rendered pure black -- a correctly composed
    shot made worse by an automated "fix".

    Framing is an art decision. A geometric rule cannot tell a bad angle from a
    deliberate one, so this now reports and lets validation fail loudly, and a
    human fixes the blocking.
    """
    # Evaluate first: straight after staging, the depsgraph still holds the
    # pre-staging transforms, so every camera measures as near-zero off-axis and
    # nothing gets corrected -- while validation, which runs after an update,
    # then reports the real angles. Measure and validate against the same state.
    bpy.context.view_layer.update()
    center = _set_bounds_center(scene)
    if center is None:
        return []
    corrected = []
    for camera in (o for o in scene.objects if o.type == "CAMERA" and o.name.startswith("CAM_")):
        if any(c.type == "TRACK_TO" for c in camera.constraints):
            continue
        if camera_is_inside_set(camera, scene):
            continue
        if camera_off_axis_deg(camera, center) <= MAX_OFF_AXIS_DEG:
            continue
        corrected.append(f"{camera.name} ({camera_off_axis_deg(camera, center):.1f} deg)")
    return corrected


# Materials whose name or texture suggests a lit surface. These become real
# emitters so a monitor reads as a light source rather than a painted panel --
# the single biggest difference between "game prop in a render" and "set piece".
EMISSIVE_HINTS = (
    "monitor", "screen", "display", "console", "terminal", "vital", "scanner",
    "lamp", "light", "glow", "led", "panel_lit", "hologram", "readout",
)

# Textures at or below this size are authored pixel art. Blender's default
# Linear filtering turns them to mush at cinema resolution; Closest keeps the
# crispness the game art was drawn with.
PIXEL_TEXTURE_MAX = 256


def enhance_imported_materials(scene: bpy.types.Scene) -> dict:
    """
    Bring imported game materials up to cinema standard without repainting them.

    glTF import brings the game's textures across intact -- 39 packed images
    across 15 materials in SET-C -- but every material lands at a flat
    roughness 0.5 with no emission and no surface variation. That is correct for
    a game renderer and wrong for a 1080p close-up, where uniform roughness
    reads as plastic and an unlit monitor reads as a sticker.

    Three passes, all non-destructive to the source art:

    1. Pixel-art textures are switched to Closest filtering, so the game's own
       texel grid survives instead of being blurred into mush.
    2. Roughness gets a low-amplitude noise break-up, so highlights vary across
       a surface the way a real material does.
    3. Materials that read as lit surfaces get an emission driven by their OWN
       base colour texture, so a screen emits the image it is showing rather
       than a flat wash.
    """
    stats = {"materials": 0, "pixel_filtered": 0, "roughened": 0, "emissive": 0}
    seen = set()
    for obj in scene.objects:
        if obj.type != "MESH":
            continue
        # The OBJECT name is where the meaning lives. glTF import leaves
        # materials called "Material.001" and textures called
        # "texture_pbr_20250901", so matching on those finds nothing -- but the
        # objects are named Vital_Monitor_1, Scanner_Arch_Entrance, and so on.
        object_hint = obj.name.lower()
        for slot in obj.material_slots:
            mat = slot.material
            if mat is None or mat.name in seen or not mat.use_nodes:
                continue
            seen.add(mat.name)
            stats["materials"] += 1
            nodes = mat.node_tree.nodes
            links = mat.node_tree.links
            bsdf = next((n for n in nodes if n.type == "BSDF_PRINCIPLED"), None)
            if bsdf is None:
                continue

            tex_nodes = [n for n in nodes if n.type == "TEX_IMAGE" and n.image]
            for tex in tex_nodes:
                if max(tex.image.size) <= PIXEL_TEXTURE_MAX:
                    tex.interpolation = "Closest"
                    stats["pixel_filtered"] += 1

            # 2. Roughness break-up. Only when nothing already drives roughness,
            # so an authored roughness map is never overwritten.
            if not bsdf.inputs["Roughness"].is_linked:
                base = bsdf.inputs["Roughness"].default_value
                noise = nodes.new("ShaderNodeTexNoise")
                noise.location = (bsdf.location.x - 600, bsdf.location.y - 300)
                noise.inputs["Scale"].default_value = 18.0
                noise.inputs["Detail"].default_value = 4.0
                ramp = nodes.new("ShaderNodeMapRange")
                ramp.location = (bsdf.location.x - 400, bsdf.location.y - 300)
                ramp.inputs["From Min"].default_value = 0.0
                ramp.inputs["From Max"].default_value = 1.0
                # +/-0.12 around the authored value: enough to break a uniform
                # highlight, small enough that the surface still reads as itself.
                ramp.inputs["To Min"].default_value = max(0.05, base - 0.12)
                ramp.inputs["To Max"].default_value = min(1.0, base + 0.12)
                links.new(noise.outputs["Fac"], ramp.inputs["Value"])
                links.new(ramp.outputs["Result"], bsdf.inputs["Roughness"])
                stats["roughened"] += 1

            # 3. Emission for lit surfaces, driven by the material's own texture.
            haystack = (
                object_hint + " " + mat.name.lower() + " "
                + " ".join(t.image.name for t in tex_nodes).lower()
            )
            if any(hint in haystack for hint in EMISSIVE_HINTS):
                if bsdf.inputs["Base Color"].is_linked:
                    source = bsdf.inputs["Base Color"].links[0].from_socket
                    links.new(source, bsdf.inputs["Emission Color"])
                else:
                    bsdf.inputs["Emission Color"].default_value = bsdf.inputs["Base Color"].default_value
                # Restrained: these are set dressing, not the key light, and the
                # glare node downstream will bloom whatever clears threshold 1.0.
                bsdf.inputs["Emission Strength"].default_value = 2.5
                stats["emissive"] += 1
    return stats


def validate_production_optics(scene: bpy.types.Scene) -> None:
    """Fail the scene build when a camera drifts from the locked optics."""
    problems = []
    if scene.view_settings.view_transform != VIEW_TRANSFORM:
        problems.append(f"view transform is {scene.view_settings.view_transform!r}")
    if scene.view_settings.look != VIEW_LOOK:
        problems.append(f"view look is {scene.view_settings.look!r}")
    center = _set_bounds_center(scene)
    for camera in (obj for obj in scene.objects if obj.type == "CAMERA" and obj.name.startswith("CAM_")):
        # A TRACK_TO camera is aimed by construction, so there is nothing to
        # check -- and the constraint result is not reliably visible through the
        # depsgraph during the same build that created it.
        tracked = any(c.type == "TRACK_TO" for c in camera.constraints)
        if center is not None and not tracked and not camera_is_inside_set(camera, scene):
            off_axis = camera_off_axis_deg(camera, center)
            if off_axis > MAX_OFF_AXIS_DEG:
                # A warning, not a build failure: "off the set centre" is a
                # heuristic, and several correct shots are deliberately off it.
                print(f"[build_ending_scenes] WARNING {camera.name}: {off_axis:.1f} deg off the set centre")
        expected = aperture_for_lens(camera.data.lens)
        if not camera.data.dof.use_dof:
            problems.append(f"{camera.name}: depth of field disabled")
        if camera.data.dof.focus_object is None:
            problems.append(f"{camera.name}: missing focus target")
        if abs(camera.data.dof.aperture_fstop - expected) > 0.001:
            problems.append(f"{camera.name}: f/{camera.data.dof.aperture_fstop:g}, expected f/{expected:g}")
        if camera.data.dof.aperture_blades != APERTURE_BLADES:
            problems.append(f"{camera.name}: {camera.data.dof.aperture_blades} aperture blades")
        if abs(camera.data.dof.aperture_ratio - 1.0) > 0.001:
            problems.append(f"{camera.name}: anamorphic aperture ratio {camera.data.dof.aperture_ratio:g}")
    if problems:
        raise RuntimeError("Production optics validation failed:\n- " + "\n- ".join(problems))
    print(f"[build_ending_scenes] optics validated for {sum(o.type == 'CAMERA' for o in scene.objects)} cameras")


def create_point_spot_light(
    name: str,
    color: tuple[float, float, float, float],
    power: float,
    location: tuple[float, float, float],
    rotation: tuple[float, float, float] = (0, 0, 0),
    is_spot: bool = True,
    spot_size_deg: float = 45.0,
    collection: bpy.types.Collection | None = None,
) -> bpy.types.Object:
    light_type = "SPOT" if is_spot else "POINT"
    light_data = bpy.data.lights.new(name, type=light_type)
    light_data.color = color[:3]
    light_data.energy = power
    if is_spot:
        light_data.spot_size = math.radians(spot_size_deg)
        light_data.spot_blend = 0.35

    light_obj = bpy.data.objects.new(name, light_data)
    light_obj.location = location
    light_obj.rotation_euler = rotation
    target_col = collection if collection else bpy.context.scene.collection
    target_col.objects.link(light_obj)
    return light_obj


def build_set_a_cabin(scene: bpy.types.Scene, root_col: bpy.types.Collection) -> dict:
    """Build SET-A: Escape Shuttle Cabin with Gothic Vaulted Ribs and Brutalist Seating."""
    set_col = bpy.data.collections.new("SET_A_Cabin")
    root_col.children.link(set_col)

    # 1. Structural Gothic Bulkheads & Ribs
    rib_asset = "public/3d/runtime/new3ds/arch_rib_ceiling_vault_01.glb"
    bulkhead_asset = "public/3d/runtime/new3ds/arch_bulkhead_frame.glb"
    buttress_asset = "public/3d/runtime/new3ds/arch_pillar_buttress_01.glb"

    # Forward Cockpit Bulkhead
    bh = import_asset(bulkhead_asset, set_col)
    if bh:
        bh.name = "Bulkhead_Cockpit_Forward"
        bh.location = (0, 3.8, 0)
        bh.scale = (1.1, 1.0, 1.1)

    # Aft Bulkhead
    bh_aft = import_asset(bulkhead_asset, set_col)
    if bh_aft:
        bh_aft.name = "Bulkhead_Cabin_Aft"
        bh_aft.location = (0, -3.2, 0)
        bh_aft.scale = (1.1, 1.0, 1.1)

    # 4 Transverse Rib Arches along the cabin ceiling
    for y_pos in [2.5, 0.9, -0.7, -2.3]:
        rib = import_asset(rib_asset, set_col)
        if rib:
            rib.name = f"Gothic_Ceiling_Rib_{y_pos:.1f}"
            rib.location = (0, y_pos, 2.2)
            rib.scale = (1.25, 0.8, 1.0)

    # Lateral Flying Buttresses (Port and Starboard)
    for y_pos in [1.8, 0.0, -1.8]:
        # Port
        p_but = import_asset(buttress_asset, set_col)
        if p_but:
            p_but.location = (-1.7, y_pos, 0.0)
            p_but.rotation_euler = (0, 0, math.radians(90))
        # Starboard
        s_but = import_asset(buttress_asset, set_col)
        if s_but:
            s_but.location = (1.7, y_pos, 0.0)
            s_but.rotation_euler = (0, 0, math.radians(-90))

    # 2. Pilot Station P1 & Console C1
    console_asset = "public/3d/runtime/console.glb"
    chair_asset = "public/3d/runtime/new3ds/prop_chair_operator_wrecked.glb"

    p1_chair = import_asset(chair_asset, set_col)
    if p1_chair:
        p1_chair.name = "Station_P1_PilotChair"
        p1_chair.location = (-0.45, 2.7, 0.1)
        p1_chair.rotation_euler = (0, 0, math.radians(180))

    c1_console = import_asset(console_asset, set_col)
    if c1_console:
        c1_console.name = "Console_C1_Cockpit"
        c1_console.location = (-0.45, 3.4, 0.2)
        c1_console.rotation_euler = (0, 0, 0)

    # 3. Passenger Seats S1, S2, S3, S4
    seats = {
        "S1": (-0.85, 0.6, 0.1),   # Port forward
        "S2": (-0.85, -0.8, 0.1),  # Port mid
        "S3": (0.85, -0.1, 0.1),   # Starboard mid
        "S4": (0.85, -1.6, 0.1),   # Starboard aft jump seat
    }
    seat_objs = {}
    for s_name, loc in seats.items():
        ch = import_asset(chair_asset, set_col)
        if ch:
            ch.name = f"Station_{s_name}_Seat"
            ch.location = loc
            # Face forward/slightly inwards
            yaw = 180 if loc[0] < 0 else 180
            ch.rotation_euler = (0, 0, math.radians(yaw))
            seat_objs[s_name] = ch

    # 4. Optional Partition Gate (between cockpit and passenger bay)
    part_asset = "public/3d/runtime/new3ds/prop_security_barricade.glb"
    partition = import_asset(part_asset, set_col)
    if partition:
        partition.name = "Partition_Ballistic_Gate"
        partition.location = (0, 1.45, 0.0)
        partition.scale = (1.2, 0.3, 1.2)

    # 5. Lighting: Cold Sodium-Vapor Practicals + Overhead Chiaroscuro Slots
    # Overhead central strip (cold cyan)
    create_point_spot_light("Light_Cabin_Overhead_Forward", (0.3, 0.6, 1.0, 1.0), 320.0, (0, 1.8, 2.7), (math.radians(15), 0, 0), True, 55.0, set_col)
    create_point_spot_light("Light_Cabin_Overhead_Aft", (0.3, 0.6, 1.0, 1.0), 280.0, (0, -0.8, 2.7), (math.radians(-15), 0, 0), True, 55.0, set_col)
    # Sodium vapor underfloor grates (harsh warm post-punk)
    create_point_spot_light("Light_FloorGrate_Warm_1", (1.0, 0.65, 0.15, 1.0), 120.0, (-0.6, 0.0, 0.05), (math.radians(-90), 0, 0), False, collection=set_col)
    create_point_spot_light("Light_FloorGrate_Warm_2", (1.0, 0.65, 0.15, 1.0), 120.0, (0.6, -1.2, 0.05), (math.radians(-90), 0, 0), False, collection=set_col)

    return {"collection": set_col, "seats": seat_objs, "pilot_chair": p1_chair, "partition": partition}


def build_set_b_cargo_four(scene: bpy.types.Scene, root_col: bpy.types.Collection) -> dict:
    """Build SET-B: Cramped Cargo Compartment 4 with Thermal Containment Pod & Ruptured Manifold."""
    set_col = bpy.data.collections.new("SET_B_CargoFour")
    root_col.children.link(set_col)

    # 1. Thermal Pod & Biomech Flesh Incubator E1
    pod_asset = "public/3d/runtime/new3ds/prop_icey_thermal_pod.glb"
    flesh_asset = "public/3d/runtime/new3ds/prop_biomech_incubator.glb"
    sac_asset = "public/3d/runtime/new3ds/prop_hive_resin_sac.glb"

    pod = import_asset(pod_asset, set_col)
    if pod:
        pod.name = "Hero_Containment_Pod_E1"
        pod.location = (0.75, 1.1, 0.0)
        pod.rotation_euler = (0, 0, math.radians(-30))

    bio = import_asset(flesh_asset, set_col)
    if bio:
        bio.name = "Biomech_Flesh_Substratum"
        bio.location = (0.75, 1.1, 0.05)
        bio.scale = (0.9, 0.9, 0.9)

    sac = import_asset(sac_asset, set_col)
    if sac:
        sac.name = "Queen_Resin_Spore_Cluster"
        sac.location = (0.85, 1.25, 0.65)
        sac.scale = (0.45, 0.45, 0.45)

    # 2. Coolant Manifold & Rupture Lines
    manifold_asset = "public/3d/runtime/new3ds/prop_icey_frost_manifold.glb"
    pipe_asset = "public/3d/runtime/new3ds/prop_pipe_rupture.glb"

    mani = import_asset(manifold_asset, set_col)
    if mani:
        mani.name = "Coolant_Manifold_Upper_Port"
        mani.location = (-0.9, 1.4, 1.6)
        mani.rotation_euler = (math.radians(15), 0, math.radians(45))

    pipe = import_asset(pipe_asset, set_col)
    if pipe:
        pipe.name = "Pipe_Rupture_SporeSpill"
        pipe.location = (-0.8, 1.1, 0.9)

    # 3. Cargo Compartment Door Frame (leading to passenger bay)
    frame_asset = "public/3d/runtime/new3ds/arch_bulkhead_frame.glb"
    c_door = import_asset(frame_asset, set_col)
    if c_door:
        c_door.name = "Cargo_Passenger_Door_Aft"
        c_door.location = (0, -1.8, 0)

    # 4. Lighting: Amber containment breach strobe + frost mist backlighting
    create_point_spot_light("Light_Pod_Amber_Breach", (1.0, 0.35, 0.05, 1.0), 450.0, (0.75, 1.1, 1.8), (math.radians(-25), math.radians(15), 0), True, 40.0, set_col)
    create_point_spot_light("Light_Coolant_Vapor_Cyan", (0.1, 0.7, 1.0, 1.0), 220.0, (-0.9, 1.4, 2.0), (math.radians(-40), math.radians(-30), 0), True, 60.0, set_col)

    return {"collection": set_col, "pod": pod, "manifold": mani}


def build_set_c_medical_dock(scene: bpy.types.Scene, root_col: bpy.types.Collection) -> dict:
    """Build SET-C: Mothership Medical Dock with Sterile Symmetrical Bed Bays & Scanner Arch."""
    set_col = bpy.data.collections.new("SET_C_MedicalDock")
    root_col.children.link(set_col)

    # 1. Grand Deco Gothic Archways & Bulkheads
    arch_asset = "public/3d/runtime/new3ds/arch_deco_archway_grand_01.glb"
    scanner_arch_asset = "public/3d/runtime/new3ds/arch_bulkhead_frame.glb"

    scanner = import_asset(scanner_arch_asset, set_col)
    if scanner:
        scanner.name = "Scanner_Arch_Entrance"
        scanner.location = (0, -3.5, 0)
        scanner.scale = (1.4, 1.2, 1.4)

    hangar_arch = import_asset(arch_asset, set_col)
    if hangar_arch:
        hangar_arch.name = "Mothership_Deep_Cathedral_Arch"
        hangar_arch.location = (0, 7.5, 0)
        hangar_arch.scale = (2.2, 1.5, 2.2)

    # 2. Medical Beds 1, 2, 3 in Strict Symmetrical Parallel
    bed_asset = "public/3d/runtime/new3ds/prop_medical_bed.glb"
    monitor_asset = "public/3d/runtime/new3ds/prop_vital_monitor.glb"
    cart_asset = "public/3d/runtime/new3ds/prop_surgical_cart.glb"

    bed_positions = [
        (-2.2, 0.5, 0.0),
        (-2.2, 2.4, 0.0),
        (-2.2, 4.3, 0.0),
    ]
    beds = []
    for idx, b_pos in enumerate(bed_positions, start=1):
        bed = import_asset(bed_asset, set_col)
        if bed:
            bed.name = f"Medical_Bed_{idx}"
            bed.location = b_pos
            bed.rotation_euler = (0, 0, math.radians(90))
            beds.append(bed)

        mon = import_asset(monitor_asset, set_col)
        if mon:
            mon.name = f"Vital_Monitor_{idx}"
            mon.location = (b_pos[0] - 0.7, b_pos[1] + 0.5, 0.0)
            mon.rotation_euler = (0, 0, math.radians(45))

    cart = import_asset(cart_asset, set_col)
    if cart:
        cart.name = "Surgical_Cart_Corridor"
        cart.location = (1.8, 1.5, 0.0)

    # 3. Lighting: Sterile Clinical White-Cyan + Subliminal Green Wall Pulse
    for idx, b_pos in enumerate(bed_positions, start=1):
        create_point_spot_light(f"Light_Bed_Surgical_{idx}", (0.85, 0.95, 1.0, 1.0), 380.0, (b_pos[0], b_pos[1], 2.8), (0, 0, 0), True, 35.0, set_col)

    # Scanner cyan laser line
    create_point_spot_light("Light_Scanner_Cyan_Sweep", (0.05, 0.9, 1.0, 1.0), 600.0, (0, -3.5, 2.6), (0, 0, 0), True, 20.0, set_col)
    # Deep conduit infection green pulse (hidden in background)
    create_point_spot_light("Light_Conduit_Infection_Pulse", (0.05, 1.0, 0.25, 1.0), 180.0, (2.6, 6.0, 1.2), (math.radians(-30), math.radians(45), 0), True, 45.0, set_col)

    return {"collection": set_col, "beds": beds, "scanner": scanner}


def build_set_d_exterior_ice(scene: bpy.types.Scene, root_col: bpy.types.Collection) -> dict:
    """Build SET-D: Exterior Glacier Chasm with Launch Cradle & Beacon Spires."""
    set_col = bpy.data.collections.new("SET_D_ExteriorIce")
    root_col.children.link(set_col)

    # 1. Hero Shuttle Hull (using Scout/Tank broken ship combined assets)
    shuttle_asset = "public/3d/runtime/broken-scout-ship.glb"
    cradle_asset = "public/3d/runtime/hull-matrix.glb"
    beacon_asset = "public/3d/runtime/new3ds/prop_tesla_coil_node.glb"

    shuttle = import_asset(shuttle_asset, set_col)
    if shuttle:
        shuttle.name = "Escape_Shuttle_Hero_Hull"
        shuttle.location = (0, 0, 1.2)
        # The gameplay GLB is authored upright and at prop scale for the
        # top-down overlay. Lay it onto its flight axis and enlarge it into a
        # four-metre cinematic hero; otherwise it reads as a one-metre beacon.
        shuttle.rotation_euler = (math.radians(102), 0, 0)
        shuttle.scale = (4.0, 4.0, 4.0)

    cradle = import_asset(cradle_asset, set_col)
    if cradle:
        cradle.name = "Ice_Launch_Cradle"
        cradle.location = (0, 0, -0.4)
        cradle.scale = (2.0, 2.5, 0.8)

    # 3 Beacon Spires along the chasm rims
    beacon_locs = [(-6.5, 8.0, 2.0), (6.5, 5.0, 1.8), (-7.2, -4.0, 3.2)]
    for idx, b_loc in enumerate(beacon_locs, start=1):
        spire = import_asset(beacon_asset, set_col)
        if spire:
            spire.name = f"Beacon_Spire_Camp_{idx}"
            spire.location = b_loc
            spire.scale = (1.2, 1.2, 2.0)

    # Lighting: Abyssal blue exterior key + engine flare + beacon pulses
    moon = create_point_spot_light("Light_Exterior_MoonKey", (0.45, 0.65, 0.95, 1.0), 4200.0, (-15.0, -12.0, 22.0), is_spot=True, spot_size_deg=58.0, collection=set_col)
    aim_object_at(moon, (0.0, 0.0, 1.2))
    plume = create_point_spot_light("Light_Shuttle_Engine_Plume", (0.2, 0.7, 1.0, 1.0), 3600.0, (0, -3.5, 1.5), is_spot=True, spot_size_deg=72.0, collection=set_col)
    aim_object_at(plume, (0.0, 0.0, 1.2))
    # Broad, low-energy sky fill keeps the hull readable without flattening the
    # moon-key silhouette. Area lights are stable across both near and orbital
    # wides, unlike a narrowly aimed practical.
    fill_data = bpy.data.lights.new("Light_Exterior_SkyFill", type="AREA")
    fill_data.color = (0.16, 0.30, 0.62)
    fill_data.energy = 850.0
    fill_data.shape = "DISK"
    fill_data.size = 10.0
    fill = bpy.data.objects.new("Light_Exterior_SkyFill", fill_data)
    fill.location = (7.0, -4.0, 12.0)
    set_col.objects.link(fill)
    aim_object_at(fill, (0.0, 0.0, 1.0))

    return {"collection": set_col, "shuttle": shuttle}


def setup_scene_mothership_infection(root_col: bpy.types.Collection) -> list[bpy.types.Object]:
    """Stage Sequence 01: Mothership Infection (Shots MI-01 to MI-04)."""
    scene_col = bpy.data.collections.new("SEQ_01_Mothership_Infection")
    root_col.children.link(scene_col)

    # Staged Character Rigs
    operator_asset = "public/3d/scouting-scout/Scout.game.glb"
    civilian_miner = "public/3d/runtime/new3ds/npc_civilian_miner.glb"
    civilian_res = "public/3d/runtime/new3ds/npc_civilian_researcher.glb"

    op = import_asset(operator_asset, scene_col)
    if op:
        op.name = "Character_Operator_Infected"
        op.location = (0, -2.5, 0)
        # Animate operator walking forward along Y from -2.5 to 3.5 across frames 0..180
        op.keyframe_insert(data_path="location", frame=0)
        op.location = (0, 3.5, 0)
        op.keyframe_insert(data_path="location", frame=180)

    # Sleeping survivors on medical beds
    c1 = import_asset(civilian_miner, scene_col)
    if c1:
        c1.name = "Patient_Civilian_1"
        c1.location = (-2.2, 0.5, 0.75)
        c1.rotation_euler = (math.radians(-90), 0, math.radians(90))

    c2 = import_asset(civilian_res, scene_col)
    if c2:
        c2.name = "Patient_Civilian_2"
        c2.location = (-2.2, 2.4, 0.75)
        c2.rotation_euler = (math.radians(-90), 0, math.radians(90))

    c3 = import_asset(civilian_miner, scene_col)
    if c3:
        c3.name = "Patient_Civilian_3"
        c3.location = (-2.2, 4.3, 0.75)
        c3.rotation_euler = (math.radians(-90), 0, math.radians(90))

    # Cameras
    # MI-01: 28mm wide low track right (frames 0-42)
    cam1 = create_camera("CAM_MI_01", 28.0, 2.0, scene_col)
    cam1.location = (-1.2, -4.5, 0.8)
    cam1.rotation_euler = (math.radians(78), 0, math.radians(18))
    cam1.keyframe_insert("location", frame=0)
    cam1.location = (0.8, -4.2, 0.9)
    cam1.keyframe_insert("location", frame=42)

    # MI-02: 50mm medium lateral dolly (frames 43-78)
    cam2 = create_camera("CAM_MI_02", 50.0, 1.8, scene_col)
    cam2.location = (-3.8, 1.2, 1.1)
    cam2.rotation_euler = (math.radians(82), 0, math.radians(-75))
    cam2.keyframe_insert("location", frame=43)
    cam2.location = (-3.8, 2.8, 1.1)
    cam2.keyframe_insert("location", frame=78)
    cam2.location = (-3.0, -1.0, 1.55)
    cam2.keyframe_insert("location", frame=43)
    cam2.keyframe_insert("location", frame=78)
    aim_object_at(cam2, (0.0, -0.45, 1.15))

    # MI-03: 85mm collar close-up, shallow focus (frames 79-132)
    # The operator (Ch48) stands at (0, 1.0, 0) and reaches z=1.60, so the
    # collar this shot is named for sits at roughly z=1.40.
    #
    # As authored this camera sat 0.36m from the character with a 10 degree yaw,
    # which on an 85mm lens put the subject entirely outside the frame -- 13
    # objects in front of the camera, zero in frame, so it rendered black. It is
    # now placed a little over a metre out, level with the collar, looking
    # straight down +Y at it.
    #
    # Blender cameras look down -Z, so rotation X=90deg looks along +Y; 87deg
    # adds the slight downward tilt onto the collar. No yaw: the subject is
    # dead ahead and this is a locked close-up.
    # The operator was standing in total darkness. Every existing spot points at
    # the bed row at x=-2.2; nothing lit the character at (0, 1.0), so CAM_MI_03
    # traced real geometry for 65 seconds and produced a black frame. This is
    # the key/rim layer the framing spec calls for, added where it was missing.
    operator_collar = (0.0, 1.0, 1.40)

    # Key: clinical white from camera-left and above, the practical motivation
    # being the surgical lighting already in this room.
    op_key = create_point_spot_light(
        "Light_Operator_Key", (0.92, 0.96, 1.0, 1.0), 140.0,
        (-1.3, 0.1, 2.35), (0, 0, 0), True, 48.0, scene_col
    )
    aim_object_at(op_key, operator_collar)

    # Derive the rim from its key so distance, energy and opposing temperature
    # remain coherent when the key is moved or retinted.
    add_separation_rim(
        bpy, "Light_Operator_Rim", operator_collar, op_key, scene_col,
    )

    cam3 = create_camera("CAM_MI_03", 85.0, 1.4, scene_col)
    cam3.location = (0.05, -0.20, 1.46)
    cam3.rotation_euler = (math.radians(87), 0, 0)
    cam3.keyframe_insert("location", frame=79)
    # Slow push in -- 0.25m over 53 frames. At 85mm and ~1.2m the depth of field
    # is shallow, so the focus empty riding the camera keeps the collar sharp
    # through the move.
    cam3.location = (0.05, 0.05, 1.43)
    cam3.keyframe_insert("location", frame=132)
    # create_camera parks the focus empty 5m ahead, which is the right default
    # for a wide. On an 85mm close-up with the subject at ~1.2m that puts the
    # focus plane four metres past the collar and the shot renders as an
    # abstract blur. Pull it onto the subject.
    focus_mi3 = bpy.data.objects.get("FOCUS_MI_03")
    if focus_mi3:
        focus_mi3.location = (0.0, 0.0, -1.2)

    # MI-04: 35mm locked deep composition with slow pullback (frames 133-180)
    cam4 = create_camera("CAM_MI_04", 35.0, 2.4, scene_col)
    cam4.location = (0, 0.8, 1.4)
    cam4.rotation_euler = (math.radians(88), 0, 0)
    cam4.keyframe_insert("location", frame=133)
    cam4.location = (0, -0.6, 1.5)
    cam4.keyframe_insert("location", frame=180)
    cam4.location = (2.0, -1.0, 1.8)
    cam4.keyframe_insert("location", frame=133)
    cam4.keyframe_insert("location", frame=180)
    aim_object_at(cam4, (0.0, 2.7, 1.15))

    return [cam1, cam2, cam3, cam4]


def setup_scene_alien_exodus(root_col: bpy.types.Collection) -> list[bpy.types.Object]:
    """Stage Sequence 02: Alien Exodus (Shots AE-01 to AE-04)."""
    scene_col = bpy.data.collections.new("SEQ_02_Alien_Exodus")
    root_col.children.link(scene_col)

    # Staged Character Rigs
    operator_asset = "public/3d/scouting-scout/Scout.game.glb"
    nahl_asset = "public/3d/runtime/new3ds/npc_nahl.glb"
    vey_asset = "public/3d/runtime/new3ds/npc_alien_vey.glb"
    rhun_asset = "public/3d/runtime/new3ds/npc_alien_rhun.glb"

    op = import_asset(operator_asset, scene_col)
    if op:
        op.name = "Character_Operator_Piloting"
        op.location = (-0.45, 2.7, 0.1)
        op.rotation_euler = (0, 0, math.radians(180))

    nahl = import_asset(nahl_asset, scene_col)
    if nahl:
        nahl.name = "Passenger_Nahl_S1"
        nahl.location = (-0.85, 0.6, 0.1)
        nahl.rotation_euler = (0, 0, math.radians(160))

    vey = import_asset(vey_asset, scene_col)
    if vey:
        vey.name = "Passenger_Vey_S2"
        vey.location = (-0.85, -0.8, 0.1)
        vey.rotation_euler = (0, 0, math.radians(175))

    rhun = import_asset(rhun_asset, scene_col)
    if rhun:
        rhun.name = "Passenger_Rhun_S3"
        rhun.location = (0.85, -0.1, 0.1)
        rhun.rotation_euler = (0, 0, math.radians(190))

    # Cameras
    # AE-01: 32mm exterior 3/4 wide rising crane (frames 0-44)
    cam1 = create_camera("CAM_AE_01", 32.0, 2.2, scene_col)
    cam1.location = (-7.5, -9.0, 2.5)
    cam1.rotation_euler = (math.radians(72), 0, math.radians(-38))
    cam1.keyframe_insert("location", frame=0)
    cam1.location = (-5.5, -6.5, 6.2)
    cam1.keyframe_insert("location", frame=44)
    aim_object_at(cam1, (0.0, 0.0, 4.0))

    # AE-02: 40mm cabin aisle dolly forward (frames 45-96)
    cam2 = create_camera("CAM_AE_02", 40.0, 1.8, scene_col)
    cam2.location = (0, -2.4, 1.35)
    cam2.rotation_euler = (math.radians(88), 0, 0)
    cam2.keyframe_insert("location", frame=45)
    cam2.location = (0, 0.8, 1.38)
    cam2.keyframe_insert("location", frame=96)

    # AE-03: 70mm profile close-up of Nahl (frames 97-140)
    cam3 = create_camera("CAM_AE_03", 70.0, 1.4, scene_col)
    cam3.location = (-0.1, 0.85, 1.15)
    cam3.rotation_euler = (math.radians(86), 0, math.radians(75))
    cam3.keyframe_insert("location", frame=97)
    cam3.location = (-0.25, 0.85, 1.18)
    cam3.keyframe_insert("location", frame=140)
    # The original camera was 20 cm from Nahl and looking across the empty
    # aisle. Give the 70 mm portrait enough working distance for face + hand.
    cam3.data.lens = 55.0
    cam3.data.dof.aperture_fstop = aperture_for_lens(cam3.data.lens)
    cam3.location = (-0.85, -1.2, 2.2)
    cam3.keyframe_insert("location", frame=97)
    cam3.keyframe_insert("location", frame=140)
    aim_object_at(cam3, (-0.85, 0.6, 1.35))
    nahl_key = create_point_spot_light(
        "Light_Nahl_Profile_Key", (0.25, 0.75, 1.0, 1.0), 360.0,
        (-0.2, -0.4, 2.2), is_spot=True, spot_size_deg=58.0, collection=scene_col,
    )
    aim_object_at(nahl_key, (-0.85, 0.6, 1.1))
    add_separation_rim(
        bpy, "Light_Nahl_Profile_Rim", (-0.85, 0.6, 1.1), nahl_key, scene_col,
        spot_size_deg=48.0,
    )

    # AE-04: 24mm exterior rear wide slow pull (frames 141-192)
    cam4 = create_camera("CAM_AE_04", 24.0, 2.8, scene_col)
    cam4.location = (0, -6.0, 2.2)
    cam4.rotation_euler = (math.radians(78), 0, 0)
    cam4.keyframe_insert("location", frame=141)
    cam4.location = (0, -18.0, 5.5)
    cam4.keyframe_insert("location", frame=192)
    aim_object_at(cam4, (0.0, 0.0, 16.0))

    return [cam1, cam2, cam3, cam4]


def setup_scene_outed_escape(root_col: bpy.types.Collection) -> list[bpy.types.Object]:
    """Stage Sequence 03: Outed Escape (Shots OE-01 to OE-04)."""
    scene_col = bpy.data.collections.new("SEQ_03_Outed_Escape")
    root_col.children.link(scene_col)

    operator_asset = "public/3d/scouting-scout/Scout.game.glb"
    civilian_miner = "public/3d/runtime/new3ds/npc_civilian_miner.glb"
    civilian_res = "public/3d/runtime/new3ds/npc_civilian_researcher.glb"

    op = import_asset(operator_asset, scene_col)
    if op:
        op.name = "Character_Operator_Quarantined"
        op.location = (-0.45, 2.7, 0.1)
        op.rotation_euler = (0, 0, math.radians(180))

    c1 = import_asset(civilian_miner, scene_col)
    if c1:
        c1.name = "Survivor_S1_Guarding"
        c1.location = (-0.85, 0.6, 0.1)
        c1.rotation_euler = (0, 0, math.radians(180))

    c2 = import_asset(civilian_res, scene_col)
    if c2:
        c2.name = "Survivor_S2_Guarding"
        c2.location = (-0.85, -0.8, 0.1)
        c2.rotation_euler = (0, 0, math.radians(180))

    c3 = import_asset(civilian_miner, scene_col)
    if c3:
        c3.name = "Survivor_S3_Locking"
        c3.location = (0.85, -0.1, 0.1)
        c3.rotation_euler = (0, 0, math.radians(180))

    # Sweeping Red Quarantine Beacon
    quarantine_key = create_point_spot_light("Light_Quarantine_Sweep_Beacon", (1.0, 0.08, 0.02, 1.0), 550.0, (0, 1.45, 2.4), (math.radians(65), 0, 0), True, 35.0, scene_col)

    # Separation rim. This scene has the fewest lights of the five and every one
    # of its four cameras sits about a metre from its subject, so a figure here
    # merges into a dark wall -- the exact failure the framing spec's third
    # lighting layer exists to prevent, and the layer that existed on only one
    # subject in the whole project.
    #
    # Derived from the quarantine beacon rather than hand-placed: the rim sits
    # 140 degrees around the subject at the beacon's own distance, at 45% of its
    # energy, and opposes its temperature -- that beacon is hard red, so the rim
    # comes back cool. Re-tint the beacon and the rim follows.
    add_separation_rim(
        bpy,
        "Light_Quarantine_Rim",
        (0.0, 1.0, 1.35),
        quarantine_key,
        scene_col,
    )

    # Cameras
    # OE-01: 35mm symmetrical cabin master (frames 0-40)
    cam1 = create_camera("CAM_OE_01", 35.0, 2.0, scene_col)
    cam1.location = (0, -2.5, 1.25)
    cam1.rotation_euler = (math.radians(88), 0, 0)

    # OE-02: 55mm passenger-side medium on lock dogs (frames 41-80)
    cam2 = create_camera("CAM_OE_02", 55.0, 1.8, scene_col)
    cam2.location = (0.55, 0.2, 1.1)
    aim_object_at(cam2, (0.0, 1.45, 1.0))

    # OE-03: 65mm operator profile through scratched partition (frames 81-122)
    cam3 = create_camera("CAM_OE_03", 65.0, 1.4, scene_col)
    cam3.location = (-0.6, 1.1, 1.35)
    cam3.data.lens = 50.0
    cam3.data.dof.aperture_fstop = aperture_for_lens(cam3.data.lens)
    cam3.location = (1.5, 0.0, 1.5)
    aim_object_at(cam3, (-0.3, 2.55, 1.15))

    tribunal_key = create_point_spot_light(
        "Light_Tribunal_Cold_Key", (0.35, 0.58, 1.0, 1.0), 380.0,
        (1.2, 0.4, 2.4), is_spot=True, spot_size_deg=62.0, collection=scene_col,
    )
    aim_object_at(tribunal_key, (-0.3, 1.8, 1.0))

    # OE-04: 40mm two-plane locked shot (frames 123-168)
    cam4 = create_camera("CAM_OE_04", 40.0, 2.0, scene_col)
    cam4.location = (0.9, -1.8, 1.2)
    cam4.rotation_euler = (math.radians(86), 0, math.radians(-25))

    return [cam1, cam2, cam3, cam4]


def setup_scene_failed_carrier(root_col: bpy.types.Collection) -> list[bpy.types.Object]:
    """Stage Sequence 04: Failed Carrier (Shots FC-01 to FC-04)."""
    scene_col = bpy.data.collections.new("SEQ_04_Failed_Carrier")
    root_col.children.link(scene_col)

    operator_asset = "public/3d/scouting-scout/Scout.game.glb"
    civilian_miner = "public/3d/runtime/new3ds/npc_civilian_miner.glb"
    civilian_res = "public/3d/runtime/new3ds/npc_civilian_researcher.glb"

    op = import_asset(operator_asset, scene_col)
    if op:
        op.name = "Character_Operator_Breach"
        op.location = (0.4, 0.4, 0.05)
        op.rotation_euler = (0, 0, math.radians(45))

    c1 = import_asset(civilian_miner, scene_col)
    if c1:
        c1.name = "Survivor_Shock_1"
        c1.location = (-0.25, -1.6, 0.0)
        c1.rotation_euler = (0, 0, 0)

    c2 = import_asset(civilian_res, scene_col)
    if c2:
        c2.name = "Survivor_Shock_2"
        c2.location = (0.25, -1.75, 0.0)
        c2.rotation_euler = (0, 0, 0)

    # Cameras
    # FC-01: 50mm low macro-to-medium reveal (frames 0-38)
    cam1 = create_camera("CAM_FC_01", 50.0, 1.4, scene_col)
    cam1.location = (-2.35, -0.35, 1.35)
    aim_object_at(cam1, (-0.8, 1.1, 0.9))

    pipe_key = create_point_spot_light(
        "Light_Pipe_Rupture_Key", (0.55, 0.82, 1.0, 1.0), 520.0,
        (-2.2, -0.4, 2.7), is_spot=True, spot_size_deg=52.0, collection=scene_col,
    )
    aim_object_at(pipe_key, (-0.8, 1.1, 0.9))

    # FC-02: 35mm cramped handheld push (frames 39-84)
    cam2 = create_camera("CAM_FC_02", 35.0, 1.8, scene_col)
    cam2.location = (-0.1, -0.4, 1.1)
    cam2.rotation_euler = (math.radians(84), 0, math.radians(25))

    # FC-03: 45mm reverse toward passenger door (frames 85-122)
    cam3 = create_camera("CAM_FC_03", 45.0, 1.8, scene_col)
    cam3.location = (0.3, 0.2, 1.2)
    cam3.rotation_euler = (math.radians(82), 0, math.radians(-160))

    # FC-04: 28mm cargo master with increasing shake (frames 123-168)
    cam4 = create_camera("CAM_FC_04", 28.0, 2.0, scene_col)
    cam4.location = (2.0, -2.0, 1.8)
    aim_object_at(cam4, (0.65, 1.05, 0.85))
    cargo_master_key = create_point_spot_light(
        "Light_Cargo_Master_Key", (0.18, 0.68, 1.0, 1.0), 480.0,
        (2.2, -1.0, 2.8), is_spot=True, spot_size_deg=72.0, collection=scene_col,
    )
    aim_object_at(cargo_master_key, (0.65, 1.05, 0.85))
    add_separation_rim(
        bpy, "Light_Cargo_Operator_Rim", (0.4, 0.4, 1.15),
        cargo_master_key, scene_col, spot_size_deg=52.0,
    )

    return [cam1, cam2, cam3, cam4]


def setup_scene_empty_husk(root_col: bpy.types.Collection) -> list[bpy.types.Object]:
    """Stage Sequence 05: Empty Husk (Shots EH-01 to EH-04)."""
    scene_col = bpy.data.collections.new("SEQ_05_Empty_Husk")
    root_col.children.link(scene_col)

    operator_asset = "public/3d/scouting-scout/Scout.game.glb"
    charm_asset = "public/3d/runtime/new3ds/charm_bunker404.glb"
    bone_asset = "public/3d/runtime/new3ds/prop_cave_bones.glb"

    op = import_asset(operator_asset, scene_col)
    if op:
        op.name = "Character_Operator_Solitary"
        op.location = (-0.45, 2.7, 0.1)
        op.rotation_euler = (0, 0, math.radians(180))

    # Abandoned tokens in empty passenger seats S1, S2, S3
    ch = import_asset(charm_asset, scene_col)
    if ch:
        ch.name = "Token_Abandoned_S1"
        ch.location = (-0.85, 0.6, 0.55)
        ch.scale = (0.7, 0.7, 0.7)

    bn = import_asset(bone_asset, scene_col)
    if bn:
        bn.name = "Token_Abandoned_S3"
        bn.location = (0.85, -0.1, 0.55)
        bn.scale = (0.5, 0.5, 0.5)

    # Cameras
    # EH-01: 32mm cabin wide from aft with 3 empty restraints in foreground (frames 0-46)
    cam1 = create_camera("CAM_EH_01", 32.0, 2.0, scene_col)
    cam1.location = (0, -2.6, 1.25)
    cam1.rotation_euler = (math.radians(86), 0, 0)

    # EH-02: 55mm lateral track across empty seats (frames 47-84)
    cam2 = create_camera("CAM_EH_02", 55.0, 1.6, scene_col)
    cam2.location = (-1.4, 0.6, 0.95)
    cam2.rotation_euler = (math.radians(82), 0, math.radians(-75))
    cam2.keyframe_insert("location", frame=47)
    cam2.location = (1.4, -0.1, 0.95)
    cam2.keyframe_insert("location", frame=84)
    # Lock the midpoint on the first abandoned token; the lateral move then
    # lets the other empty seats wipe through focus instead of seeing a wall.
    scene = bpy.context.scene
    scene.frame_set(66)
    cam2.data.lens = 55.0
    cam2.location = (-0.85, 0.6, 2.5)
    cam2.keyframe_insert("location", frame=47)
    cam2.keyframe_insert("location", frame=84)
    aim_object_at(cam2, (-0.85, 0.6, 0.55))
    token_key = create_point_spot_light(
        "Light_Abandoned_Tokens", (1.0, 0.48, 0.16, 1.0), 620.0,
        (-0.5, -0.2, 1.8), is_spot=True, spot_size_deg=55.0, collection=scene_col,
    )
    aim_object_at(token_key, (-0.6, 0.35, 0.55))
    add_separation_rim(
        bpy, "Light_Abandoned_Tokens_Rim", (-0.6, 0.35, 0.55),
        token_key, scene_col, spot_size_deg=48.0,
    )

    # EH-03: 28mm exterior launch wide, silent beacons (frames 85-126)
    cam3 = create_camera("CAM_EH_03", 28.0, 2.8, scene_col)
    cam3.location = (-10.0, -12.0, 3.5)
    aim_object_at(cam3, (0.0, 0.0, 5.5))

    # EH-04: extreme orbital wide, almost static negative space (frames 127-180)
    cam4 = create_camera("CAM_EH_04", 35.0, 5.6, scene_col)
    cam4.location = (0, -28.0, 14.0)
    aim_object_at(cam4, (0.0, 1.5, 19.0))

    return [cam1, cam2, cam3, cam4]


def build_ending_scene(ending_name: str, output_path: Path) -> None:
    print(f"Building ending scene '{ending_name}' -> {output_path}")
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    setup_cycles_and_color_management(scene)
    # alien_exodus and empty_husk both stage SET-D, the exterior ice shelf, so
    # their sky is actually visible and should be space. The interior sets keep
    # the bounce gradient, where a starfield would be a window onto nothing.
    exterior = ending_name in ("alien_exodus", "empty_husk", "all")
    # The game sky is now the world for EVERY scene, not just the two that look
    # at it directly. Interiors were falling back to a flat procedural gradient,
    # so the same ending could carry two different skies depending on which shot
    # you were watching -- and interior metal and ice picked up a grey wash
    # instead of the violet/cyan the palette is built on.
    #
    # A sealed interior shell occludes most of it by design, which is correct:
    # the HDRI's job indoors is the coloured light that reaches openings and
    # reflective surfaces, not to shine through walls. Strength is what
    # separates the two cases, not which sky is used.
    setup_world_atmosphere(
        scene, space_sky=True,
        # The transferred sky contains 1.8x scene-linear peaks. Keep those HDR
        # highlights for reflections while exposing the world as deep night;
        # the moon and engine rigs remain the readable subject keys.
        # Exteriors see the sky directly and would blow out at interior levels.
        # Interiors are mostly occluded by their shell, so they need more gain to
        # land the same amount of coloured light on what little reaches them.
        # Interiors are sealed by their shell, so the world only reaches them
        # through openings and reflections -- it needs far more gain than an
        # exterior to land the same amount of light. 0.55 measured too dark in
        # a test render; the sealed shell eats most of it.
        world_strength=0.18 if exterior else 1.8,
    )

    root_col = bpy.context.scene.collection

    # 1. Build reusable sets and retain their collection identity. Mixed
    # interior/exterior scenes need a cabin shell around SET-A and ground-only
    # around SET-D; a scene-wide exterior boolean cannot represent that.
    built_sets = []
    if ending_name in ["mothership_infection"]:
        built_sets.append((build_set_c_medical_dock(scene, root_col), False))
    elif ending_name in ["alien_exodus"]:
        built_sets.append((build_set_a_cabin(scene, root_col), False))
        built_sets.append((build_set_d_exterior_ice(scene, root_col), True))
    elif ending_name in ["outed_escape"]:
        built_sets.append((build_set_a_cabin(scene, root_col), False))
    elif ending_name in ["failed_carrier"]:
        built_sets.append((build_set_b_cargo_four(scene, root_col), False))
        built_sets.append((build_set_a_cabin(scene, root_col), False))
    elif ending_name in ["empty_husk"]:
        built_sets.append((build_set_a_cabin(scene, root_col), False))
        built_sets.append((build_set_d_exterior_ice(scene, root_col), True))
    elif ending_name == "all":
        build_set_a_cabin(scene, root_col)
        build_set_b_cargo_four(scene, root_col)
        build_set_c_medical_dock(scene, root_col)
        build_set_d_exterior_ice(scene, root_col)

    # 2. Stage Ending Characters and Cameras
    cams = []
    if ending_name == "mothership_infection":
        cams = setup_scene_mothership_infection(root_col)
    elif ending_name == "alien_exodus":
        cams = setup_scene_alien_exodus(root_col)
    elif ending_name == "outed_escape":
        cams = setup_scene_outed_escape(root_col)
    elif ending_name == "failed_carrier":
        cams = setup_scene_failed_carrier(root_col)
    elif ending_name == "empty_husk":
        cams = setup_scene_empty_husk(root_col)
    elif ending_name == "all":
        setup_scene_mothership_infection(root_col)
        setup_scene_alien_exodus(root_col)
        setup_scene_outed_escape(root_col)
        setup_scene_failed_carrier(root_col)
        setup_scene_empty_husk(root_col)

    if cams:
        scene.camera = cams[0]

    # Report framing for an art pass. Deliberately does not mutate cameras.
    shell_count = 0
    shell_objects_by_set = {}
    for handle, is_exterior_set in built_sets:
        source = handle["collection"]
        # SET-B is the physical room for Failed Carrier; SET-A supplies the
        # passenger-side dressing beyond its hatch. A second co-located closed
        # shell produces coplanar walls and black occluders, not a second room.
        if ending_name == "failed_carrier" and source.name == "SET_A_Cabin":
            continue
        shell_col = bpy.data.collections.new(f"SHELL_{source.name}")
        root_col.children.link(shell_col)
        shell_names = build_room_shell(
            scene, shell_col, exterior=is_exterior_set,
            source_collection=source, name_prefix=f"Shell_{source.name}"
        )
        shell_count += len(shell_names)
        shell_objects_by_set[source.name] = [bpy.data.objects[name] for name in shell_names]
    if shell_count:
        print(f"[build_ending_scenes] per-set shell: {shell_count} surfaces")

    # Air and motion. Every scene had ZERO particle systems, and characters sat
    # on a Mixamo action with nothing layered on top -- which is most of why
    # these read as a clean Blender turntable rather than the game's key art.
    #
    # Mote colour follows each set's own palette rather than one generic dust,
    # so the particulate reinforces the scene instead of greying it out.
    fx_palette = {
        "mothership_infection": ((0.30, 1.00, 0.45), True),   # infection green, with a swarm
        "alien_exodus": ((0.45, 0.85, 1.00), True),           # cold exhaust blue
        "outed_escape": ((1.00, 0.35, 0.18), False),          # quarantine ember
        "failed_carrier": ((0.85, 1.00, 0.40), True),         # spore spill
        "empty_husk": ((0.70, 0.78, 0.95), False),            # dead ice dust
    }
    fx_color, fx_swarm = fx_palette.get(ending_name, ((0.6, 0.8, 1.0), False))
    fx_center = (0.0, 1.5, 1.6)
    fx_size = (14.0, 18.0, 6.0) if exterior else (9.0, 12.0, 4.0)
    add_drift_motes(
        bpy, f"FX_Motes_{ending_name}", root_col,
        center=fx_center, size=fx_size,
        count=2600 if exterior else 1800,
        color=fx_color, frame_end=scene.frame_end, seed=7,
    )
    if fx_swarm:
        # Boids only where something is alive in the air. A flock in the dead
        # husk would contradict that ending's whole point.
        add_boid_swarm(
            bpy, f"FX_Swarm_{ending_name}", root_col,
            center=(fx_center[0], fx_center[1] + 2.0, fx_center[2] + 0.6),
            size=(6.0, 7.0, 3.0), count=320,
            color=fx_color, frame_end=scene.frame_end, seed=11,
        )

    motion_keys = 0
    for armature in (o for o in scene.objects if o.type == "ARMATURE"):
        motion_keys += add_secondary_motion(
            armature, scene.frame_start, scene.frame_end, seed=hash(armature.name) & 0xFFFF
        )
    print(f"[build_ending_scenes] fx: motes + {'swarm' if fx_swarm else 'no swarm'}, {motion_keys} motion keys")

    # Camera dynamics. Authored cameras translate but are rotationally frozen,
    # so a shot reads as a slide. Drift adds the hand on the camera; the rack
    # gives the shot a focal narrative instead of one held depth.
    #
    # Rack range is derived from the lens: a long lens is already shallow and
    # only needs a small pull, while a wide needs a big one to be visible at
    # all. Racking every shot by a fixed metre would be invisible on the 85mm
    # and absurd on the 24mm.
    camera_keys = 0
    for camera in (o for o in scene.objects if o.type == "CAMERA" and o.name.startswith("CAM_")):
        focus = None
        focus_name = camera.get("focus_target")
        if focus_name:
            focus = bpy.data.objects.get(focus_name)
        lens = camera.data.lens
        near = max(0.6, lens / 55.0)
        rack = (near, near * (2.4 if lens < 45 else 1.5))
        camera_keys += animate_camera_dynamics(
            camera, scene.frame_start, scene.frame_end,
            seed=hash(camera.name) & 0xFFFF, focus_object=focus, rack=rack,
        )
    print(f"[build_ending_scenes] camera: {camera_keys} drift/rack keys")

    # Mixed endings cut between two locations built at the same origin.  Hide
    # the alternate location, its shell and the interior cast on each shot.
    # Without this, an exterior camera either sees a cabin wall as a solid black
    # rectangle or puts seated passengers inexplicably on the ice shelf.
    visibility = {
        "alien_exodus": ((45, 140), [(0, 44), (141, 192)], "SEQ_02_Alien_Exodus"),
        "empty_husk": ((0, 84), [(85, 180)], "SEQ_05_Empty_Husk"),
    }
    if ending_name in visibility:
        interior_range, exterior_ranges, sequence_name = visibility[ending_name]
        handles = {handle["collection"].name: handle for handle, _ in built_sets}
        cabin_objects = list(handles["SET_A_Cabin"]["collection"].all_objects)
        cabin_objects += shell_objects_by_set.get("SET_A_Cabin", [])
        exterior_objects = list(handles["SET_D_ExteriorIce"]["collection"].all_objects)
        exterior_objects += shell_objects_by_set.get("SET_D_ExteriorIce", [])
        key_render_visibility(cabin_objects, [interior_range])
        key_render_visibility(exterior_objects, exterior_ranges)
        sequence_col = bpy.data.collections.get(sequence_name)
        if sequence_col:
            interior_stage_objects = [
                obj for obj in sequence_col.all_objects if obj.type in {"MESH", "LIGHT"}
            ]
            key_render_visibility(interior_stage_objects, [interior_range])

        shuttle = handles["SET_D_ExteriorIce"].get("shuttle")
        if shuttle:
            launch_keys = {
                "alien_exodus": ((0, 1.2), (44, 7.0), (141, 8.0), (192, 25.0)),
                "empty_husk": ((85, 1.2), (126, 10.0), (127, 14.0), (180, 25.0)),
            }[ending_name]
            for frame, height in launch_keys:
                shuttle.location.z = height
                shuttle.keyframe_insert(data_path="location", frame=frame)

            # A restrained cabin/engine bounce travels with the ascending hull.
            # Static launch-pad spots correctly fall away as it climbs, but the
            # ship must retain one readable edge against the black sky.
            hero_glow = create_point_spot_light(
                "Light_Shuttle_Traveling_Glow", (0.18, 0.55, 1.0, 1.0), 900.0,
                (2.0, -2.0, 3.2), is_spot=False,
                collection=handles["SET_D_ExteriorIce"]["collection"],
            )
            key_render_visibility([hero_glow], exterior_ranges)
            for frame, height in launch_keys:
                hero_glow.location.z = height + 2.0
                hero_glow.keyframe_insert(data_path="location", frame=frame)

            # Compose from the actual animated midpoint, not from the camera's
            # last keyed location. The rotation remains locked afterward, which
            # preserves EH-03's deliberate refusal to follow the departing ship.
            exterior_cameras = (cams[0], cams[3]) if ending_name == "alien_exodus" else (cams[2], cams[3])
            for camera in exterior_cameras:
                shot_index = int(camera.name.rsplit("_", 1)[1]) - 1
                midpoint = SHOT_MID_FRAMES[camera.name.split("_")[1]][shot_index]
                scene.frame_set(midpoint)
                bpy.context.view_layer.update()
                target = shuttle.evaluated_get(bpy.context.evaluated_depsgraph_get()).matrix_world.translation
                aim_object_at(camera, target)

    material_stats = enhance_imported_materials(scene)
    print(
        f"[build_ending_scenes] materials: {material_stats['materials']} seen, "
        f"{material_stats['pixel_filtered']} pixel-filtered, "
        f"{material_stats['roughened']} roughness-varied, "
        f"{material_stats['emissive']} made emissive"
    )
    build_delivery_compositor(scene)
    corrected = aim_stray_cameras(scene, root_col)
    if corrected:
        print(f"[build_ending_scenes] FRAMING REVIEW needed for {len(corrected)} camera(s): {', '.join(corrected)}")
    bpy.context.view_layer.update()

    for camera in cams:
        distance = set_camera_focus_from_frame(scene, camera)
        print(f"[build_ending_scenes] {camera.name} focus: {distance if distance else 'manual'}")

    validate_production_optics(scene)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(output_path.resolve()))
    print(f"Successfully generated: {output_path} ({len(bpy.data.objects)} objects)")


def main() -> None:
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser(description="Generate Blender scenes for Act 2 Ending Cinematics.")
    parser.add_argument(
        "--scene",
        choices=["mothership_infection", "alien_exodus", "outed_escape", "failed_carrier", "empty_husk", "all"],
        default="all",
        help="Ending scene to generate",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path("art/source/blender-prerenders/scenes"),
        help="Target directory for .blend scenes",
    )
    parser.add_argument(
        "--render-shot",
        type=str,
        default=None,
        help="Camera name to render a frame from (e.g. CAM_AE_01)",
    )
    parser.add_argument(
        "--shot-frame",
        type=int,
        default=24,
        help="Frame number to render when --render-shot is specified",
    )
    parser.add_argument(
        "--render-out",
        type=Path,
        default=None,
        help="Output image path for --render-shot",
    )
    args = parser.parse_args(argv)

    scenes_to_build = (
        ["mothership_infection", "alien_exodus", "outed_escape", "failed_carrier", "empty_husk"]
        if args.scene == "all"
        else [args.scene]
    )

    for s_name in scenes_to_build:
        out_file = args.output_dir / f"ending_{s_name}.blend"
        build_ending_scene(s_name, out_file)

        if args.render_shot:
            cam = bpy.data.objects.get(args.render_shot)
            if cam:
                scene = bpy.context.scene
                scene.camera = cam
                scene.frame_set(args.shot_frame)
                scene.render.resolution_x = 960
                scene.render.resolution_y = 540
                scene.cycles.samples = 32
                out_img = args.render_out or Path(f"scratch/animatics/{args.render_shot}.png")
                out_img.parent.mkdir(parents=True, exist_ok=True)
                scene.render.filepath = str(out_img.resolve())
                print(f"Rendering shot preview {args.render_shot} (frame {args.shot_frame}) -> {out_img}")
                bpy.ops.render.render(write_still=True)
                print(f"Saved shot preview: {out_img}")


if __name__ == "__main__":
    main()
