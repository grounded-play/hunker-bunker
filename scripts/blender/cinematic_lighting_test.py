"""Unit tests for the separation-rim geometry. Pure Python, no Blender needed.

    python3 -m unittest discover -s scripts/blender -p '*_test.py'
"""
import math
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from cinematic_lighting import (  # noqa: E402
    RIM_ANGLE_DEG,
    rim_color_for_key,
    rim_energy,
    rim_position,
)


def angle_between(subject, point):
    return math.degrees(math.atan2(point[1] - subject[1], point[0] - subject[0]))


def wrapped_delta(a, b):
    """Signed angular difference wrapped to [-180, 180].

    A naive abs(a - b) reports 220 degrees for a correct 140 degree rotation,
    which is how this looked broken on first inspection when it was not.
    """
    return (b - a + 180.0) % 360.0 - 180.0


class RimGeometry(unittest.TestCase):
    subject = (0.0, 0.0, 1.4)
    key = (-1.3, 0.1, 2.35)

    def test_rim_sits_at_the_authored_angle_from_the_key(self):
        rim = rim_position(self.subject, self.key)
        delta = wrapped_delta(angle_between(self.subject, self.key), angle_between(self.subject, rim))
        self.assertAlmostEqual(abs(delta), RIM_ANGLE_DEG, places=3)

    def test_rim_keeps_the_key_distance_so_the_pair_stay_in_proportion(self):
        rim = rim_position(self.subject, self.key)
        key_radius = math.hypot(self.key[0] - self.subject[0], self.key[1] - self.subject[1])
        rim_radius = math.hypot(rim[0] - self.subject[0], rim[1] - self.subject[1])
        self.assertAlmostEqual(key_radius, rim_radius, places=6)

    def test_rim_is_above_the_subject_so_it_grazes_the_shoulder_not_the_floor(self):
        rim = rim_position(self.subject, self.key)
        self.assertGreater(rim[2], self.subject[2])

    def test_key_directly_overhead_does_not_divide_by_zero(self):
        rim = rim_position(self.subject, (0.0, 0.0, 3.0))
        self.assertTrue(all(math.isfinite(v) for v in rim))

    def test_rim_energy_stays_well_under_the_key(self):
        self.assertLess(rim_energy(140.0), 140.0)
        self.assertAlmostEqual(rim_energy(140.0), 63.0, places=6)

    def test_negative_key_energy_cannot_produce_a_negative_rim(self):
        self.assertEqual(rim_energy(-50.0), 0.0)

    def test_rim_opposes_the_key_temperature(self):
        cool_key_rim = rim_color_for_key((0.3, 0.6, 1.0))
        warm_key_rim = rim_color_for_key((1.0, 0.7, 0.3))
        self.assertGreater(cool_key_rim[0], cool_key_rim[2])   # cool key -> warm rim
        self.assertGreater(warm_key_rim[2], warm_key_rim[0])   # warm key -> cool rim


if __name__ == "__main__":
    unittest.main()
