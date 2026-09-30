#!/usr/bin/env python3
"""
Automated Steam Graphical Asset Compliance Validator.
Validates the v3 capsule and library asset set against Valve's Graphical Asset Rules.
"""

import os
import sys
import numpy as np
from PIL import Image

SPECS = {
    # Library Assets
    "steam_library_capsule_v3_en.png": {"size": (600, 900), "mode": "RGB", "full_bleed": True},
    "steam_library_header_v3_en.png": {"size": (920, 430), "mode": "RGB", "full_bleed": True},
    "steam_library_hero_v3_en.png": {"size": (3840, 1240), "mode": "RGB", "full_bleed": True},
    "steam_library_logo_v3_en.png": {"size": (1280, 720), "mode": "RGBA", "transparent_bg": True},

    # Store Capsules
    "steam_header_capsule_v3_en.png": {"size": (920, 430), "mode": "RGB", "full_bleed": True},
    "steam_small_capsule_v3_en.png": {"size": (462, 174), "mode": "RGB", "full_bleed": True},
    "steam_main_capsule_v3_en.png": {"size": (1232, 706), "mode": "RGB", "full_bleed": True},
    "steam_vertical_capsule_v3_en.png": {"size": (748, 896), "mode": "RGB", "full_bleed": True},
}


def audit_directory(directory_path):
    print(f"\n=======================================================")
    print(f"Auditing Steam Assets in: {directory_path}")
    print(f"=======================================================")

    failures = []
    passes = []

    for filename, spec in SPECS.items():
        filepath = os.path.join(directory_path, filename)
        if not os.path.exists(filepath):
            failures.append(f"[MISSING] {filename} does not exist at {filepath}")
            continue

        try:
            im = Image.open(filepath)
        except Exception as e:
            failures.append(f"[CORRUPT] {filename} failed to open: {e}")
            continue

        # Check dimensions
        if im.size != spec["size"]:
            failures.append(f"[DIMENSION MISMATCH] {filename}: expected {spec['size']}, got {im.size}")
        else:
            passes.append(f"[PASS] {filename} dimensions {im.size} match spec")

        # Check mode
        if im.mode != spec["mode"]:
            failures.append(f"[MODE MISMATCH] {filename}: expected {spec['mode']}, got {im.mode}")
        else:
            passes.append(f"[PASS] {filename} mode {im.mode} matches spec")

        # Check transparency for logo
        if spec.get("transparent_bg"):
            arr = np.array(im)
            alpha = arr[:, :, 3]
            corners = [
                alpha[0, 0], alpha[0, -1], alpha[-1, 0], alpha[-1, -1]
            ]
            if any(c != 0 for c in corners):
                failures.append(f"[TRANSPARENCY FAIL] {filename} corners are not fully transparent")
            else:
                passes.append(f"[PASS] {filename} transparent background verified (corners alpha=0)")

            # Check bbox of content
            bbox = im.getbbox()
            if not bbox:
                failures.append(f"[CONTENT EMPTY] {filename} has no non-transparent pixels")
            else:
                passes.append(f"[PASS] {filename} content bbox: {bbox}")

        # Check full-bleed (no solid letterboxing or flat bars)
        if spec.get("full_bleed"):
            arr = np.array(im)
            top_std = arr[:10, :, :3].std()
            bottom_std = arr[-10:, :, :3].std()
            left_std = arr[:, :10, :3].std()
            right_std = arr[:, -10:, :3].std()

            if top_std < 3.0:
                failures.append(f"[LETTERBOX] {filename} top edge appears flat/solid (std={top_std:.2f})")
            elif bottom_std < 3.0:
                failures.append(f"[LETTERBOX] {filename} bottom edge appears flat/solid (std={bottom_std:.2f})")
            elif left_std < 3.0:
                failures.append(f"[LETTERBOX] {filename} left edge appears flat/solid (std={left_std:.2f})")
            elif right_std < 3.0:
                failures.append(f"[LETTERBOX] {filename} right edge appears flat/solid (std={right_std:.2f})")
            else:
                passes.append(f"[PASS] {filename} full-bleed confirmed (edges std: T={top_std:.1f}, B={bottom_std:.1f}, L={left_std:.1f}, R={right_std:.1f})")

    print("\nResults:")
    for p in passes:
        print(f"  ✓ {p}")

    if failures:
        print("\nFailures:")
        for f in failures:
            print(f"  ✗ {f}")
        return False
    else:
        print("\nAll checks PASSED with 0 errors!")
        return True


if __name__ == "__main__":
    v2_ok = audit_directory("steam/store/game-v2")
    if not v2_ok:
        sys.exit(1)
