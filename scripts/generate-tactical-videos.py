#!/usr/bin/env python3
"""
generate_tactical_videos.py

Generates tactical terminal cutscenes and videos in the aesthetic of Hunker Bunker
using the local external `ff-tracking` engine at /home/caveman/Desktop/icecave/ff-tracking.

Features:
- Author presets (credits, intro, boss_alert)
- Validates cameras and line lengths via `cargo test -p hud`
- Executes two-pass Skia Vulkan SkSL render + procedural audio synthesis
- Transcodes to web-optimized WebM (VP9/Opus) and MP4 (H.264/AAC)
- Generates poster JPG for cutscene fallback
- Directly installs final assets into public/cutscenes/
"""

import argparse
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

HUNKER_ROOT = Path(__file__).resolve().parent.parent
FF_ROOT = Path("/home/caveman/Desktop/icecave/ff-tracking")
CARGO_BIN = Path.home() / ".cargo" / "bin" / "cargo"

PRESETS = {
    "credits": {
        "output_base": "credits-terminal",
        "scenes": """pub const SCENE_LIST: [SceneDef; SCENES] = [
    SceneDef {
        kind: Kind::Cursor,
        text: "›",
        palette: Palette::Mono,
        cam: cam(0.18, 0.62, -0.05, 3.3, 3.7, 10.0, 0.0, 1.1),
        hero: (720.0, 560.0),
        size: 120.0,
    },
    SceneDef {
        kind: Kind::Typing,
        text: "HUNKER BUNKER",
        palette: Palette::Thermal,
        cam: cam(0.38, -0.22, 0.04, 2.5, 2.8, 50.0, 0.0, 1.2),
        hero: (420.0, 540.0),
        size: 108.0,
    },
    SceneDef {
        kind: Kind::Typing,
        text: "◈ PERSONNEL ARCHIVE",
        palette: Palette::Phosphor,
        cam: cam(0.12, -0.55, 0.06, 2.0, 2.2, 50.0, -10.0, 1.0),
        hero: (280.0, 600.0),
        size: 84.0,
    },
    SceneDef {
        kind: Kind::Typing,
        text: "TUESDAY CINEMA CLUB",
        palette: Palette::Amber,
        cam: cam(-0.12, 0.5, -0.03, 2.2, 2.4, 0.0, 0.0, 1.5),
        hero: (260.0, 480.0),
        size: 84.0,
    },
    SceneDef {
        kind: Kind::Typing,
        text: "lead: tcc team",
        palette: Palette::Mono,
        cam: cam(0.78, 0.1, -0.12, 2.3, 2.5, 30.0, 0.0, 1.2),
        hero: (380.0, 560.0),
        size: 80.0,
    },
    SceneDef {
        kind: Kind::Typing,
        text: "engine: Three.js r184",
        palette: Palette::Navy,
        cam: cam(0.26, -0.36, 0.0, 2.0, 2.4, 0.0, 0.0, 1.0),
        hero: (260.0, 540.0),
        size: 78.0,
    },
    SceneDef {
        kind: Kind::Typing,
        text: "audio: tcc collective",
        palette: Palette::Neon,
        cam: cam(0.2, 0.32, 0.05, 2.2, 2.3, -120.0, 0.0, 1.1),
        hero: (260.0, 520.0),
        size: 78.0,
    },
    SceneDef {
        kind: Kind::Typing,
        text: "discord.gg/XXwwz3rauu",
        palette: Palette::Phosphor,
        cam: cam(0.32, -0.26, -0.02, 2.2, 2.1, 0.0, 0.0, 1.3),
        hero: (260.0, 560.0),
        size: 76.0,
    },
    SceneDef {
        kind: Kind::Typing,
        text: "thanks: our community",
        palette: Palette::Mono,
        cam: Cam {
            tilt_x: 0.15,
            tilt_y: -0.16,
            roll: 0.0,
            zoom: (2.05, 2.1),
            pan: (0.0, 0.0),
            blur: 0.8,
            shake: 3.0,
        },
        hero: (260.0, 520.0),
        size: 76.0,
    },
    SceneDef {
        kind: Kind::Typing,
        text: "THANK YOU FOR DEPLOYING",
        palette: Palette::Amber,
        cam: cam(0.22, 0.58, -0.08, 1.9, 2.2, 10.0, 0.0, 1.2),
        hero: (220.0, 560.0),
        size: 72.0,
    },
    SceneDef {
        kind: Kind::Collapse,
        text: "",
        palette: Palette::Thermal,
        cam: cam(0.3, 0.2, 0.03, 1.35, 2.7, 0.0, 0.0, 1.0),
        hero: (960.0, 540.0),
        size: 80.0,
    },
    SceneDef {
        kind: Kind::Done,
        text: "SYS ACTIVE",
        palette: Palette::Neon,
        cam: cam(0.46, -0.32, 0.06, 2.8, 1.9, 0.0, 0.0, 1.2),
        hero: (960.0, 540.0),
        size: 80.0,
    },
];""",
        "log": """pub const LOG: [&str; 24] = [
    "› sys.boot  bunker_zero_seven.core",
    "  read      threejs_r184_engine     ok",
    "  mount     room_dressing_kits      60 models",
    "  verify    exosuit_wall_charger    aligned",
    "› archive   personnel_records       loaded",
    "  credit    tuesday_cinema_club     lead",
    "  audio     procedural_synthesizer  -14 LUFS",
    "  read      shaders/lens.sksl       compiled",
    "› net.sync  discord.gg/XXwwz3rauu   connected",
    "  cluster   cryo bio cyber surface  healthy",
    "  protocol  quarantine_stage_nine   active",
    "  monitor   heartbeat_ok            0 errors",
    "  ok        tactical_command_ready",
    "› mission   hunker_bunker_deep_extraction",
    "  operator  scout tank engineer     deployed",
    "  payload   black_box_recovered     encrypted",
    "  signal    beacon_transmission     0.02 ms",
    "  warn      spore_density_rising    nominal",
    "  ok        telemetry_lock_engaged",
    "› thanks    community_cadets        acknowledged",
    "  system    sys_version_2_4_16      verified",
    "  integrity 100% hash check pass    green",
    "  terminal  session_archive_stored",
    "› status    ready_for_next_drop",
];"""
    },
    "intro": {
        "output_base": "intro-boot",
        "scenes": """pub const SCENE_LIST: [SceneDef; SCENES] = [
    SceneDef {
        kind: Kind::Cursor,
        text: "›",
        palette: Palette::Paper,
        cam: cam(0.18, 0.62, -0.05, 3.3, 3.7, 10.0, 0.0, 1.1),
        hero: (720.0, 560.0),
        size: 120.0,
    },
    SceneDef {
        kind: Kind::Typing,
        text: "SECURE BUNKER 07",
        palette: Palette::Amber,
        cam: cam(0.38, -0.22, 0.04, 2.5, 2.8, 50.0, 0.0, 1.2),
        hero: (380.0, 540.0),
        size: 96.0,
    },
    SceneDef {
        kind: Kind::Typing,
        text: "BIO-BREACH DETECTED",
        palette: Palette::Thermal,
        cam: cam(0.12, -0.55, 0.06, 2.1, 2.3, 60.0, -10.0, 1.0),
        hero: (280.0, 600.0),
        size: 84.0,
    },
    SceneDef {
        kind: Kind::Typing,
        text: "QUARANTINE FAILED",
        palette: Palette::Thermal,
        cam: cam(-0.12, 0.5, -0.03, 2.4, 2.4, 0.0, 0.0, 1.6),
        hero: (320.0, 480.0),
        size: 84.0,
    },
    SceneDef {
        kind: Kind::Typing,
        text: "exosuit: gantry locked",
        palette: Palette::Mono,
        cam: cam(0.78, 0.1, -0.12, 2.0, 2.3, 30.0, 0.0, 1.2),
        hero: (260.0, 560.0),
        size: 76.0,
    },
    SceneDef {
        kind: Kind::Typing,
        text: "weapons: calibrated",
        palette: Palette::Navy,
        cam: cam(0.26, -0.36, 0.0, 2.1, 2.8, 0.0, 0.0, 1.0),
        hero: (280.0, 540.0),
        size: 78.0,
    },
    SceneDef {
        kind: Kind::Typing,
        text: "deploy squad: 3 cad",
        palette: Palette::Mono,
        cam: cam(0.2, 0.32, 0.05, 2.2, 2.3, -120.0, 0.0, 1.1),
        hero: (280.0, 520.0),
        size: 78.0,
    },
    SceneDef {
        kind: Kind::Typing,
        text: "DIRECTIVE: DEEP RUN",
        palette: Palette::Amber,
        cam: cam(0.32, -0.26, -0.02, 2.6, 2.1, 0.0, 0.0, 1.3),
        hero: (300.0, 560.0),
        size: 88.0,
    },
    SceneDef {
        kind: Kind::Typing,
        text: "verifying 180 telemetry",
        palette: Palette::Phosphor,
        cam: Cam {
            tilt_x: 0.15,
            tilt_y: -0.16,
            roll: 0.0,
            zoom: (2.05, 2.1),
            pan: (0.0, 0.0),
            blur: 0.8,
            shake: 4.0,
        },
        hero: (260.0, 520.0),
        size: 72.0,
    },
    SceneDef {
        kind: Kind::Typing,
        text: "✓ ALL SYSTEMS GO",
        palette: Palette::Phosphor,
        cam: cam(0.22, 0.62, -0.08, 2.4, 2.6, 20.0, 0.0, 1.2),
        hero: (420.0, 560.0),
        size: 92.0,
    },
    SceneDef {
        kind: Kind::Collapse,
        text: "",
        palette: Palette::Thermal,
        cam: cam(0.3, 0.2, 0.03, 1.35, 2.7, 0.0, 0.0, 1.0),
        hero: (960.0, 540.0),
        size: 80.0,
    },
    SceneDef {
        kind: Kind::Done,
        text: "DEPLOY",
        palette: Palette::Neon,
        cam: cam(0.46, -0.32, 0.06, 3.0, 1.9, 0.0, 0.0, 1.2),
        hero: (960.0, 540.0),
        size: 80.0,
    },
];""",
        "log": """pub const LOG: [&str; 24] = [
    "› alarm   quarantine breach sector 4",
    "  sensor  seismic anomaly +4.2 Richter",
    "  vital   cadet life signs detected",
    "  o2_gen  pressure falling 78% -> 42%",
    "› engage  emergency exosuit deployment",
    "  chassis heavy_titanium_plating",
    "  primary arc_welder_plasma_cutter",
    "  decon   cycle 1 complete",
    "› airlock blast door seal opening",
    "  threat  crawler brood approaching",
    "  queen   chitin armor resonant",
    "  radar   contacts: 18 hostile",
    "  status  extraction in progress",
    "› weapons lock armed",
    "  ammo    slugs rockets flame active",
    "  shield  reactive barrier online",
    "  beacon  transmitting distress signal",
    "  gps     grounded_icecave_grid",
    "  warning extreme thermal delta",
    "› mission authorized by tactical cmd",
    "  orders  purge hive survive return",
    "  counter countdown 00:06:00",
    "  ready   lock confirms drop zone",
    "› execute drop now",
];"""
    }
}


def patch_hud_lib(scenes_block: str, log_block: str):
    hud_lib = FF_ROOT / "hud" / "src" / "lib.rs"
    content = hud_lib.read_text(encoding="utf-8")

    # Replace SCENE_LIST
    scene_pattern = re.compile(r"pub const SCENE_LIST: \[SceneDef; SCENES\] = \[.*?\];", re.DOTALL)
    if not scene_pattern.search(content):
        raise RuntimeError("Could not find SCENE_LIST in hud/src/lib.rs")
    content = scene_pattern.sub(scenes_block, content, count=1)

    # Replace LOG
    log_pattern = re.compile(r"pub const LOG: \[&str; 24\] = \[.*?\];", re.DOTALL)
    if not log_pattern.search(content):
        raise RuntimeError("Could not find LOG in hud/src/lib.rs")
    content = log_pattern.sub(log_block, content, count=1)

    hud_lib.write_text(content, encoding="utf-8")


def run_cmd(cmd, cwd=None, env=None):
    print(f"\n[EXEC] {' '.join(cmd) if isinstance(cmd, list) else cmd} (in {cwd or '.'})")
    merged_env = os.environ.copy()
    if env:
        merged_env.update(env)
    res = subprocess.run(cmd, cwd=cwd, env=merged_env, shell=isinstance(cmd, str))
    if res.returncode != 0:
        raise RuntimeError(f"Command failed with code {res.returncode}")


def build_and_render(output_base: str):
    env = {
        "BINDGEN_EXTRA_CLANG_ARGS": "-I/usr/lib/gcc/x86_64-linux-gnu/13/include",
        "RUSTFLAGS": "-L /home/caveman/.local/lib",
    }

    # 1. Validate with cargo test -p hud
    print("\n--> Step 1: Validating scenes via cargo test -p hud...")
    run_cmd([str(CARGO_BIN), "test", "-p", "hud"], cwd=str(FF_ROOT), env=env)

    # 2. Build binaries if needed
    print("\n--> Step 2: Compiling release binaries...")
    run_cmd(
        [str(CARGO_BIN), "build", "--release", "-p", "hud", "-p", "flat", "-p", "lens"],
        cwd=str(FF_ROOT),
        env=env
    )

    # 3. Export tracks
    print("\n--> Step 3: Exporting tracks...")
    run_cmd(["target/release/tracks"], cwd=str(FF_ROOT))

    # 4. Render Flat Pass 1
    print("\n--> Step 4: Rendering Flat Pass 1 (3840x2160)...")
    os.makedirs(FF_ROOT / "out" / "pass", exist_ok=True)
    run_cmd(["target/release/flat", "render", "-o", "out/pass/flat.mp4"], cwd=str(FF_ROOT))

    # 5. Synthesize Procedural Audio
    print("\n--> Step 5: Synthesizing procedural audio with tools/sfx.py...")
    run_cmd(["python3", "tools/sfx.py"], cwd=str(FF_ROOT))

    # 6. Render Lens Pass 2
    print("\n--> Step 6: Rendering Lens Pass 2 (1920x1080 SkSL Vulkan)...")
    run_cmd(["target/release/lens", "render", "-o", "out/tracking.mp4"], cwd=str(FF_ROOT))

    # 7. Transcode into public/cutscenes
    print("\n--> Step 7: Transcoding and installing into public/cutscenes/...")
    cutscenes_dir = HUNKER_ROOT / "public" / "cutscenes"
    cutscenes_dir.mkdir(parents=True, exist_ok=True)

    raw_mp4 = FF_ROOT / "out" / "tracking.mp4"
    dest_webm = cutscenes_dir / f"{output_base}.webm"
    dest_mp4 = cutscenes_dir / f"{output_base}.mp4"
    dest_poster = cutscenes_dir / f"{output_base}-poster.jpg"

    # Produce WebM (VP9 + Opus)
    cmd_webm = [
        "ffmpeg", "-y", "-i", str(raw_mp4),
        "-c:v", "libvpx-vp9", "-crf", "22", "-b:v", "0",
        "-c:a", "libopus", "-b:a", "128k",
        str(dest_webm)
    ]
    run_cmd(cmd_webm)

    # Produce MP4 (H264 + AAC, faststart)
    cmd_mp4 = [
        "ffmpeg", "-y", "-i", str(raw_mp4),
        "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart",
        str(dest_mp4)
    ]
    run_cmd(cmd_mp4)

    # Produce Poster JPEG at t=4.5s (hero frame)
    cmd_poster = [
        "ffmpeg", "-y", "-ss", "00:00:04.5", "-i", str(raw_mp4),
        "-vframes", "1", "-q:v", "2",
        str(dest_poster)
    ]
    run_cmd(cmd_poster)

    print(f"\n[DONE] Successfully generated {output_base}:")
    print(f"  - WebM:   {dest_webm} ({dest_webm.stat().st_size / 1024:.1f} KB)")
    print(f"  - MP4:    {dest_mp4} ({dest_mp4.stat().st_size / 1024:.1f} KB)")
    print(f"  - Poster: {dest_poster} ({dest_poster.stat().st_size / 1024:.1f} KB)")


def main():
    parser = argparse.ArgumentParser(description="Generate tactical terminal videos for Hunker Bunker")
    parser.add_argument("--preset", choices=list(PRESETS.keys()), default="credits", help="Scene preset")
    args = parser.parse_args()

    preset_data = PRESETS[args.preset]
    print(f"=== Generating preset: {args.preset} ({preset_data['output_base']}) ===")

    # Backup original hud/src/lib.rs
    hud_lib = FF_ROOT / "hud" / "src" / "lib.rs"
    backup = hud_lib.with_suffix(".rs.bak")
    if not backup.exists():
        shutil.copy2(hud_lib, backup)

    try:
        patch_hud_lib(preset_data["scenes"], preset_data["log"])
        build_and_render(preset_data["output_base"])
    finally:
        # Keep original backup available
        pass

if __name__ == "__main__":
    main()
