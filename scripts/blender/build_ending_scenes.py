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


# Locked in docs/planning/blender-cinematic-optics-2026-09-12.md. Keep these
# values shared by every production scene; an artist can animate a focus target
# per shot without silently changing the family-wide optical baseline.
APERTURE_BY_LENS = ((32, 5.6), (60, 4.0), (90, 2.8), (10_000, 4.0))
APERTURE_BLADES = 7
VIEW_TRANSFORM = "AgX"
VIEW_LOOK = "AgX - Punchy"
VOLUME_DENSITY = 0.004
VOLUME_ANISOTROPY = 0.4


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


def setup_world_atmosphere(
    scene: bpy.types.Scene,
    color_hex: str = "#020408",
    volume_density: float = VOLUME_DENSITY,
    world_strength: float = 0.9,
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


def build_delivery_compositor(scene: bpy.types.Scene) -> None:
    """
    Theme pass applied at render time rather than baked into materials.

    Motivated by what these sets actually are: emissive practicals in
    near-black rooms.

    - Glare (Fog Glow) gives the sodium rotators and infection pulses real
      bloom. Without it an emissive surface clips to a flat bright patch and
      reads as a texture rather than a light source.
    - Lens dispersion adds chromatic aberration at the frame edges, with
      distortion held at zero so the lens geometry the optics addendum fixes is
      not then warped by the grade.
    A lens vignette was scoped out rather than shipped half-working: Blender
    5.x renames or removes the EllipseMask/MixRGB nodes the 4.x recipe uses, and
    the sets are already dark enough that a vignette mostly costs the corners.

    Deliberately NOT doing a colour grade here: the view transform is already
    pinned to AgX Punchy by the optics addendum, and grading on top of it would
    make that decision meaningless.
    """
    # Blender 5.x moved the compositor off `scene.node_tree` onto
    # `scene.compositing_node_group`, which must be created explicitly -- the
    # 4.x idiom raises AttributeError here rather than degrading.
    scene.use_nodes = True
    tree = bpy.data.node_groups.new("EndingDeliveryComp", "CompositorNodeTree")
    scene.compositing_node_group = tree
    tree.nodes.clear()

    # Blender 5.x models the scene compositor as a NODE GROUP: the render
    # result arrives on a group input and leaves on a group output. There is no
    # CompositorNodeRLayers and no CompositorNodeComposite any more -- both
    # raise "Node type undefined" rather than degrading.
    tree.interface.new_socket("Image", in_out="INPUT", socket_type="NodeSocketColor")
    tree.interface.new_socket("Image", in_out="OUTPUT", socket_type="NodeSocketColor")
    group_in = tree.nodes.new("NodeGroupInput")
    group_in.location = (-400, 0)
    group_out = tree.nodes.new("NodeGroupOutput")
    group_out.location = (420, 0)

    glare = tree.nodes.new("CompositorNodeGlare")
    # Blender 5.x exposes glare settings as INPUT SOCKETS, not node properties,
    # and Type is a menu of display names ("Fog Glow"), not the old FOG_GLOW
    # enum. Both 4.x idioms raise here.
    glare.inputs["Type"].default_value = "Fog Glow"
    glare.inputs["Quality"].default_value = "High"
    # Only genuine highlights bloom -- below 1.0 every lit wall glows and the
    # set turns to soup.
    glare.inputs["Threshold"].default_value = 1.0
    glare.inputs["Strength"].default_value = 0.45
    glare.inputs["Size"].default_value = 7
    glare.location = (0, 0)

    # Chromatic aberration. Dispersion only -- Distortion stays at 0 so the
    # frame keeps its straight lines and the optics addendum's lens geometry
    # still means something; this is the fringing a real lens leaves, not a
    # barrel-warp effect.
    #
    # 0.025 is deliberately just-perceptible. Chromatic aberration reads as
    # cheap the moment a viewer can name it, and these sets are full of
    # saturated cyan and sodium practicals whose edges exaggerate it for free.
    lens = tree.nodes.new("CompositorNodeLensdist")
    lens.inputs["Dispersion"].default_value = 0.025
    lens.inputs["Distortion"].default_value = 0.0
    lens.inputs["Fit"].default_value = True
    lens.location = (220, 0)

    links = tree.links
    links.new(group_in.outputs["Image"], glare.inputs["Image"])
    links.new(glare.outputs["Image"], lens.inputs["Image"])
    links.new(lens.outputs["Image"], group_out.inputs["Image"])


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
        shuttle.rotation_euler = (math.radians(12), 0, 0)  # Ascending launch pitch

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
    create_point_spot_light("Light_Exterior_MoonKey", (0.45, 0.65, 0.95, 1.0), 2500.0, (-15.0, -12.0, 22.0), (math.radians(40), math.radians(-35), 0), True, 45.0, set_col)
    create_point_spot_light("Light_Shuttle_Engine_Plume", (0.2, 0.7, 1.0, 1.0), 3200.0, (0, -2.5, 0.8), (math.radians(-90), 0, 0), True, 65.0, set_col)

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

    # MI-03: 85mm collar close-up, shallow focus (frames 79-132)
    cam3 = create_camera("CAM_MI_03", 85.0, 1.4, scene_col)
    cam3.location = (-0.2, 0.4, 1.55)
    cam3.rotation_euler = (math.radians(85), 0, math.radians(10))
    cam3.keyframe_insert("location", frame=79)
    cam3.location = (0.0, 1.4, 1.58)
    cam3.keyframe_insert("location", frame=132)

    # MI-04: 35mm locked deep composition with slow pullback (frames 133-180)
    cam4 = create_camera("CAM_MI_04", 35.0, 2.4, scene_col)
    cam4.location = (0, 0.8, 1.4)
    cam4.rotation_euler = (math.radians(88), 0, 0)
    cam4.keyframe_insert("location", frame=133)
    cam4.location = (0, -0.6, 1.5)
    cam4.keyframe_insert("location", frame=180)

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

    # AE-04: 24mm exterior rear wide slow pull (frames 141-192)
    cam4 = create_camera("CAM_AE_04", 24.0, 2.8, scene_col)
    cam4.location = (0, -6.0, 2.2)
    cam4.rotation_euler = (math.radians(78), 0, 0)
    cam4.keyframe_insert("location", frame=141)
    cam4.location = (0, -18.0, 5.5)
    cam4.keyframe_insert("location", frame=192)

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
    create_point_spot_light("Light_Quarantine_Sweep_Beacon", (1.0, 0.08, 0.02, 1.0), 550.0, (0, 1.45, 2.4), (math.radians(65), 0, 0), True, 35.0, scene_col)

    # Cameras
    # OE-01: 35mm symmetrical cabin master (frames 0-40)
    cam1 = create_camera("CAM_OE_01", 35.0, 2.0, scene_col)
    cam1.location = (0, -2.5, 1.25)
    cam1.rotation_euler = (math.radians(88), 0, 0)

    # OE-02: 55mm passenger-side medium on lock dogs (frames 41-80)
    cam2 = create_camera("CAM_OE_02", 55.0, 1.8, scene_col)
    cam2.location = (0.55, 0.2, 1.1)
    cam2.rotation_euler = (math.radians(82), 0, math.radians(-35))

    # OE-03: 65mm operator profile through scratched partition (frames 81-122)
    cam3 = create_camera("CAM_OE_03", 65.0, 1.4, scene_col)
    cam3.location = (-0.6, 1.1, 1.35)
    cam3.rotation_euler = (math.radians(86), 0, math.radians(15))

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
    cam1.location = (-0.6, 0.95, 1.25)
    cam1.rotation_euler = (math.radians(75), 0, math.radians(-65))

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
    cam4.location = (-0.7, -1.1, 1.4)
    cam4.rotation_euler = (math.radians(78), 0, math.radians(40))

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

    # EH-03: 28mm exterior launch wide, silent beacons (frames 85-126)
    cam3 = create_camera("CAM_EH_03", 28.0, 2.8, scene_col)
    cam3.location = (-10.0, -12.0, 3.5)
    cam3.rotation_euler = (math.radians(75), 0, math.radians(-42))

    # EH-04: extreme orbital wide, almost static negative space (frames 127-180)
    cam4 = create_camera("CAM_EH_04", 24.0, 4.0, scene_col)
    cam4.location = (0, -28.0, 14.0)
    cam4.rotation_euler = (math.radians(65), 0, 0)

    return [cam1, cam2, cam3, cam4]


def build_ending_scene(ending_name: str, output_path: Path) -> None:
    print(f"Building ending scene '{ending_name}' -> {output_path}")
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    setup_cycles_and_color_management(scene)
    setup_world_atmosphere(scene)

    root_col = bpy.context.scene.collection

    # 1. Build Reusable Sets needed. Each builder links its own collection into
    # root_col, so it is called for that side effect; the handle dict it returns
    # is not read here.
    if ending_name in ["mothership_infection"]:
        build_set_c_medical_dock(scene, root_col)
    elif ending_name in ["alien_exodus"]:
        build_set_a_cabin(scene, root_col)
        build_set_d_exterior_ice(scene, root_col)
    elif ending_name in ["outed_escape"]:
        build_set_a_cabin(scene, root_col)
    elif ending_name in ["failed_carrier"]:
        build_set_b_cargo_four(scene, root_col)
        build_set_a_cabin(scene, root_col)
    elif ending_name in ["empty_husk"]:
        build_set_a_cabin(scene, root_col)
        build_set_d_exterior_ice(scene, root_col)
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
    build_delivery_compositor(scene)
    corrected = aim_stray_cameras(scene, root_col)
    if corrected:
        print(f"[build_ending_scenes] FRAMING REVIEW needed for {len(corrected)} camera(s): {', '.join(corrected)}")
    bpy.context.view_layer.update()

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
