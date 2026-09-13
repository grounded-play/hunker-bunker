"""
Motion and particulate for the ending scenes.

The sets render clean and still, which reads as a Blender turntable rather than
the game's key art. Two causes, both fixable in data:

1. Characters carry a Mixamo action but nothing on top of it, so a seated figure
   is genuinely frozen between keyframes.
2. There were ZERO particle systems across all five scenes. Real rooms in this
   game are full of spore drift, ember, coolant vapour and dust. Empty air is
   most of why a render looks sterile next to concept art.

Everything here is additive: it layers onto existing animation and dressing
rather than replacing authored work.
"""
from __future__ import annotations

import math
import random

# Secondary motion amplitudes, in radians. Deliberately small -- this is the
# drift and breath a "still" performer always has, not a second performance.
# Anything larger fights the authored action instead of supporting it.
SWAY_SPINE = 0.035
SWAY_HEAD = 0.055
SWAY_ARM = 0.045
BREATH_PERIOD_FRAMES = 52.0


def _pose_bone(armature, *names):
    for name in names:
        bone = armature.pose.bones.get(name)
        if bone is not None:
            return bone
    # Mixamo rigs appear with and without the "1" suffix in this project.
    for bone in armature.pose.bones:
        for name in names:
            if bone.name.endswith(name.split(":")[-1]):
                return bone
    return None


def add_secondary_motion(armature, frame_start: int, frame_end: int, *, seed: int = 0, step: int = 6):
    """
    Layer breath and sway onto whatever action the rig already has.

    Keys in ADDITION to the existing action's keyframes, at a coarse step, so
    the result is drift rather than jitter. Each bone gets its own phase offset:
    a spine and a head moving in lockstep reads as a mannequin on a turntable,
    which is exactly the problem being fixed.
    """
    rng = random.Random(seed)
    targets = [
        (_pose_bone(armature, "mixamorig1:Spine1", "mixamorig:Spine1", "Spine1"), SWAY_SPINE),
        (_pose_bone(armature, "mixamorig1:Spine2", "mixamorig:Spine2", "Spine2"), SWAY_SPINE * 0.8),
        (_pose_bone(armature, "mixamorig1:Head", "mixamorig:Head", "Head"), SWAY_HEAD),
        (_pose_bone(armature, "mixamorig1:LeftArm", "mixamorig:LeftArm", "LeftArm"), SWAY_ARM),
        (_pose_bone(armature, "mixamorig1:RightArm", "mixamorig:RightArm", "RightArm"), SWAY_ARM),
    ]
    keyed = 0
    for bone, amplitude in targets:
        if bone is None:
            continue
        bone.rotation_mode = "XYZ"
        phase = rng.uniform(0.0, math.tau)
        rate = rng.uniform(0.85, 1.25)
        base = tuple(bone.rotation_euler)
        for frame in range(frame_start, frame_end + 1, step):
            t = (frame / BREATH_PERIOD_FRAMES) * rate * math.tau + phase
            bone.rotation_euler = (
                base[0] + math.sin(t) * amplitude,
                base[1] + math.sin(t * 0.61 + 1.1) * amplitude * 0.55,
                base[2] + math.cos(t * 0.47) * amplitude * 0.7,
            )
            bone.keyframe_insert("rotation_euler", frame=frame)
            keyed += 1
    return keyed


def add_drift_motes(bpy, name, collection, *, center, size, count=900, color=(0.45, 0.85, 1.0),
                    scale=0.018, frame_end=260, seed=1, emission=2.4):
    """
    A volume of slow-drifting particulate: spores, dust, ember, coolant vapour.

    An emitter mesh scattering tiny emissive spheres, rather than world
    volumetrics. Volumetrics fill space evenly and read as fog; discrete motes
    catch the practicals, parallax against the camera move, and give the eye
    something to track -- which is what actually sells depth.
    """
    emitter_mesh = bpy.data.meshes.new(f"{name}_emitter")
    emitter = bpy.data.objects.new(f"{name}_emitter", emitter_mesh)
    collection.objects.link(emitter)
    emitter.location = center
    # Emit from volume, so motes fill the room instead of hugging a surface.
    import bmesh
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bm.to_mesh(emitter_mesh)
    bm.free()
    emitter.scale = size
    emitter.hide_render = True

    mote_mesh = bpy.data.meshes.new(f"{name}_mote")
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=1, radius=scale)
    bm.to_mesh(mote_mesh)
    bm.free()
    mote = bpy.data.objects.new(f"{name}_mote", mote_mesh)
    collection.objects.link(mote)
    mote.hide_render = True

    material = bpy.data.materials.new(f"{name}_mote_mat")
    material.use_nodes = True
    bsdf = next(n for n in material.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Emission Color"].default_value = (*color, 1.0)
    # Motes must emit, not just reflect: these rooms are too dark to light a
    # 2cm sphere by bounce alone, and unlit motes simply vanish.
    bsdf.inputs["Emission Strength"].default_value = emission
    mote_mesh.materials.append(material)

    system = emitter.modifiers.new(f"{name}_psys", "PARTICLE_SYSTEM")
    settings = system.particle_system.settings
    settings.count = count
    settings.emit_from = "VOLUME"
    settings.distribution = "RAND"
    # Alive for the whole shot: particles that die mid-shot pop out of frame.
    settings.frame_start = -frame_end
    settings.frame_end = 1
    settings.lifetime = frame_end * 3
    settings.physics_type = "NEWTON"
    settings.normal_factor = 0.0
    settings.factor_random = 0.35
    # Near-zero gravity so motes hang and drift rather than raining down.
    settings.effector_weights.gravity = 0.015
    settings.render_type = "OBJECT"
    settings.instance_object = mote
    settings.particle_size = 1.0
    settings.size_random = 0.7
    emitter.particle_systems[-1].seed = seed
    return emitter


def add_boid_swarm(bpy, name, collection, *, center, size, count=140, color=(0.7, 1.0, 0.35),
                   scale=0.05, frame_end=260, seed=3):
    """
    A boid flock -- drifting spores with flight behaviour, for hive and alien air.

    Boids rather than Newtonian particles because a flock banks, clumps and
    scatters. That motion is the difference between "particles were added" and
    "something lives in this room".
    """
    emitter = add_drift_motes(
        bpy, name, collection, center=center, size=size, count=count,
        color=color, scale=scale, frame_end=frame_end, seed=seed, emission=3.2,
    )
    settings = emitter.particle_systems[-1].settings
    settings.physics_type = "BOIDS"
    settings.boids.use_flight = True
    settings.boids.use_land = False
    settings.boids.air_speed_max = 1.6
    settings.boids.air_personal_space = 0.35
    return emitter
