"""
Separation lighting — the third layer every ending scene was missing.

docs/planning/cinematic-framing-and-lighting-spec-2026-09-13.md names three
layers a shot needs: environment, practical key, and separation. The first two
exist across all five scenes. The third existed on exactly one subject (the
mothership operator, added when its shot rendered black) and nowhere else.

Without a rim, a dark figure against a dark wall is one shape. These sets are
deliberately near-black, so that is the default state rather than an edge case.

The geometry here is deliberately pure and bpy-free so it can be unit tested:
placing a rim correctly is trigonometry, and trigonometry that only runs inside
Blender is trigonometry nobody checks.
"""
from __future__ import annotations

import math

# A rim wants to be roughly opposite the key, offset enough that it grazes the
# subject's edge rather than lighting its face. 140 degrees is the classic
# three-quarter-back position; less reads as a second key, more slips behind the
# subject and lights nothing the camera can see.
RIM_ANGLE_DEG = 140.0

# A rim that competes with the key stops being a rim. Held well under it.
RIM_ENERGY_RATIO = 0.45

# Rims sit above the subject so the highlight runs along the shoulder line
# rather than up from the floor, which reads as uplighting and looks theatrical.
RIM_HEIGHT_LIFT = 0.55


def rim_position(subject, key_position, *, angle_deg: float = RIM_ANGLE_DEG, lift: float = RIM_HEIGHT_LIFT):
    """
    Where the rim goes, given the subject and the key.

    Rotates the key's horizontal offset around the subject by `angle_deg` and
    keeps the key's distance, so a close key produces a close rim and the pair
    stay in proportion. Height is the subject's plus a lift.

    Returns a plain tuple so this is testable without Blender.
    """
    sx, sy, sz = (float(v) for v in subject)
    kx, ky, kz = (float(v) for v in key_position)

    dx, dy = kx - sx, ky - sy
    radius = math.hypot(dx, dy)
    if radius < 1e-6:
        # Key is directly above the subject, so there is no horizontal direction
        # to rotate. Fall back to a fixed offset rather than dividing by zero.
        radius = 1.0
        base_angle = 0.0
    else:
        base_angle = math.atan2(dy, dx)

    theta = base_angle + math.radians(angle_deg)
    return (
        sx + (math.cos(theta) * radius),
        sy + (math.sin(theta) * radius),
        sz + abs(lift) + max(0.0, kz - sz) * 0.35,
    )


def rim_energy(key_energy: float, ratio: float = RIM_ENERGY_RATIO) -> float:
    """Rim energy as a fraction of the key it separates against."""
    return max(0.0, float(key_energy)) * max(0.0, float(ratio))


def rim_color_for_key(key_color):
    """
    A rim reads as separation when it opposes the key in temperature.

    Warm key gets a cool rim and vice versa. Judged on the blue-vs-red balance
    of the key itself rather than a hand-picked colour per shot, so this stays
    correct when a key is retinted.
    """
    r, g, b = (float(c) for c in key_color[:3])
    if b > r:
        # Cool key -> warm rim.
        return (1.0, 0.72, 0.42, 1.0)
    return (0.42, 0.68, 1.0, 1.0)


def add_separation_rim(bpy, name, subject, key_light, collection, *, spot_size_deg: float = 42.0):
    """
    Create and aim a rim for one subject, derived from an existing key light.

    Takes `bpy` as an argument rather than importing it, so the geometry above
    can be imported and tested in plain Python.
    """
    key_energy = getattr(key_light.data, "energy", 100.0)
    key_color = tuple(getattr(key_light.data, "color", (1.0, 1.0, 1.0)))[:3]

    position = rim_position(subject, tuple(key_light.location))
    data = bpy.data.lights.new(name, type="SPOT")
    data.energy = rim_energy(key_energy)
    data.color = rim_color_for_key(key_color)[:3]
    data.spot_size = math.radians(spot_size_deg)
    data.spot_blend = 0.5

    obj = bpy.data.objects.new(name, data)
    obj.location = position
    collection.objects.link(obj)

    direction = (
        subject[0] - position[0],
        subject[1] - position[1],
        subject[2] - position[2],
    )
    import mathutils

    obj.rotation_euler = mathutils.Vector(direction).to_track_quat("-Z", "Y").to_euler()
    return obj
