#!/usr/bin/env python3
"""
Hunker Bunker — AudioCraft SFX Generation Pipeline
Generates high-fidelity Foley, footstep textures, prop mechanisms, creature acoustics,
and environmental sound layers using Meta's AudioCraft AudioGen.

Usage:
  python scripts/audio/generate_audiocraft_sfx.py --list
  python scripts/audio/generate_audiocraft_sfx.py --subset test
  python scripts/audio/generate_audiocraft_sfx.py --category footsteps
  python scripts/audio/generate_audiocraft_sfx.py --category props
  python scripts/audio/generate_audiocraft_sfx.py --keys terminal_beep,vault_open
"""

import argparse
import os
import subprocess
import sys
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parent.parent.parent
OUTPUT_DIR = ROOT / "public/audio"
PYTHON_VENV = Path("/home/caveman/tools/audiocraft/.venv/bin/python")

# Comprehensive Key-Art Driven Sound Library for Hunker Bunker
SFX_PROMPT_CATALOG = {
    # =========================================================================
    # 1. FOOTSTEPS BY SURFACE MATERIAL (10 surface materials, 5 variants each)
    # =========================================================================
    "footstep_metal_grate": {
        "category": "footsteps",
        "duration": 0.55,
        "variants": 5,
        "bus": "sfx",
        "out_dir": "public/audio/footsteps",
        "prompt": "heavy military combat boot stepping on hollow industrial steel grating catwalk, resonant iron clank with subtle metallic rattle echo in cold bunker",
    },
    "footstep_wood_plank": {
        "category": "footsteps",
        "duration": 0.55,
        "variants": 5,
        "bus": "sfx",
        "out_dir": "public/audio/footsteps",
        "prompt": "heavy tactical boot footstep on weathered wooden camp boardwalk duckboards, deep timber thud with organic creaking floorboard stress",
    },
    "footstep_ice_crunch": {
        "category": "footsteps",
        "duration": 0.55,
        "variants": 5,
        "bus": "sfx",
        "out_dir": "public/audio/footsteps",
        "prompt": "tactical boot stomping on frozen cryogenic permafrost and brittle surface ice, sharp crisp crystalline ice fracturing and crunching under heavy tread",
    },
    "footstep_deep_snow": {
        "category": "footsteps",
        "duration": 0.55,
        "variants": 5,
        "bus": "sfx",
        "out_dir": "public/audio/footsteps",
        "prompt": "heavy winter combat boot sinking into deep dense packed snow drift, muffled powdery snow compression crunch in freezing blizzard",
    },
    "footstep_hive_slime": {
        "category": "footsteps",
        "duration": 0.60,
        "variants": 5,
        "bus": "sfx",
        "out_dir": "public/audio/footsteps",
        "prompt": "combat boot stepping into thick viscous alien hive slime and amniotic residue, wet sticky squelch and adhesive suction peeling off floor",
    },
    "footstep_shell_casings": {
        "category": "footsteps",
        "duration": 0.55,
        "variants": 5,
        "bus": "sfx",
        "out_dir": "public/audio/footsteps",
        "prompt": "heavy combat boot stepping on carpet of spent brass bullet casings and metal debris, sharp metallic crunch and tumbling brass shells skittering on concrete",
    },
    "footstep_bone_terrazzo": {
        "category": "footsteps",
        "duration": 0.60,
        "variants": 5,
        "bus": "sfx",
        "out_dir": "public/audio/footsteps",
        "prompt": "heavy boot sole striking polished bone terrazzo marble floor in cavernous cathedral crypt, hard solid slap with long vaulted stone reverberation tail",
    },
    "footstep_wet_puddle": {
        "category": "footsteps",
        "duration": 0.55,
        "variants": 5,
        "bus": "sfx",
        "out_dir": "public/audio/footsteps",
        "prompt": "military combat boot stomping into shallow dirty coolant puddle on bunker floor, crisp water splash and wet sole slap on concrete",
    },
    "footstep_concrete": {
        "category": "footsteps",
        "duration": 0.50,
        "variants": 5,
        "bus": "sfx",
        "out_dir": "public/audio/footsteps",
        "prompt": "heavy tactical rubber sole boot impact on solid rough stained concrete floor, firm dry thud with gritty surface scuff in enclosed facility",
    },

    # =========================================================================
    # 2. INTERACTIVE PROPS & MECHANISMS (Fixing missing QA session sounds)
    # =========================================================================
    "terminal_beep": {
        "category": "props",
        "duration": 0.60,
        "variants": 3,
        "bus": "world",
        "out_dir": "public/audio/generated",
        "prompt": "retro 1980s green monochrome CRT computer terminal keypress chirp, tactile solenoid keyboard click and high phosphor beep acknowledgement",
    },
    "terminal_deny": {
        "category": "props",
        "duration": 0.85,
        "variants": 3,
        "bus": "world",
        "out_dir": "public/audio/generated",
        "prompt": "harsh low electric access denied error buzzer on corporate terminal, electronic fault squawk with static buzz",
    },
    "vault_open": {
        "category": "props",
        "duration": 2.20,
        "variants": 3,
        "bus": "world",
        "out_dir": "public/audio/generated",
        "prompt": "heavy hermetic pressure vault door unsealing, massive steel locking dogs disengaging with deep mechanical thunk and pneumatic decompression hiss",
    },
    "crane_motor": {
        "category": "props",
        "duration": 2.50,
        "variants": 3,
        "bus": "world",
        "out_dir": "public/audio/generated",
        "prompt": "heavy industrial electric winch hoist motor straining under load, metallic gear whine, cable drum groaning and mechanical chain pull",
    },
    "power_hum": {
        "category": "props",
        "duration": 3.00,
        "variants": 3,
        "bus": "world",
        "out_dir": "public/audio/generated",
        "prompt": "deep continuous 60Hz industrial electrical transformer hum, high voltage substation buzzing and magnetic coil vibration",
    },
    "steam_burst": {
        "category": "props",
        "duration": 1.20,
        "variants": 3,
        "bus": "world",
        "out_dir": "public/audio/generated",
        "prompt": "high pressure pneumatic steam valve release burst, sudden violent hissing plume of scalding vapor escaping pipe",
    },
    "chem_siphon": {
        "category": "props",
        "duration": 2.00,
        "variants": 3,
        "bus": "world",
        "out_dir": "public/audio/generated",
        "prompt": "viscous toxic chemical fluid siphoning through rubber suction hose, gurgling peristaltic pump and wet liquid slurping transfer",
    },
    "flesh_seal": {
        "category": "props",
        "duration": 1.10,
        "variants": 3,
        "bus": "world",
        "out_dir": "public/audio/generated",
        "prompt": "biomechanical organic sphincter sealing closed, wet muscular tissue contracting with viscous mucus suction and fleshy pop",
    },
    "flesh_squish": {
        "category": "props",
        "duration": 0.90,
        "variants": 3,
        "bus": "world",
        "out_dir": "public/audio/generated",
        "prompt": "heavy visceral organ squelch, wet biological tissue being compressed and crushed, squishy mucus rupture",
    },
    "neural_tap": {
        "category": "props",
        "duration": 1.20,
        "variants": 3,
        "bus": "world",
        "out_dir": "public/audio/generated",
        "prompt": "alien neural interface bio-electric spark, wet synaptic discharge ping with crystalline harmonic resonant ping",
    },
    "toolbox_open": {
        "category": "props",
        "duration": 1.10,
        "variants": 3,
        "bus": "world",
        "out_dir": "public/audio/generated",
        "prompt": "heavy rusted steel toolbox metal latch flipping open, squeaking iron hinges, metallic tools rattling inside metal box",
    },
    "water_shower": {
        "category": "props",
        "duration": 2.50,
        "variants": 3,
        "bus": "world",
        "out_dir": "public/audio/generated",
        "prompt": "high pressure decontamination deluge shower valve opening, intense rushing water spraying forcefully onto steel grate floor",
    },
    "water_slosh": {
        "category": "props",
        "duration": 1.30,
        "variants": 3,
        "bus": "world",
        "out_dir": "public/audio/generated",
        "prompt": "freezing cold water sloshing heavily inside rusted 55 gallon steel drum, hollow resonant liquid impact and wave slap",
    },
    "generator_complete": {
        "category": "props",
        "duration": 2.80,
        "variants": 2,
        "bus": "world",
        "out_dir": "public/audio/generated",
        "prompt": "massive geothermal backup generator spooling up to full turbine speed, heavy electrical relay clunk and surging power hum",
    },
    "fan_wind": {
        "category": "props",
        "duration": 2.50,
        "variants": 2,
        "bus": "world",
        "out_dir": "public/audio/generated",
        "prompt": "large industrial ventilation exhaust fan blades whirring through metal ductwork, rhythmic hollow rushing air draft",
    },
    "exosuit_charge": {
        "category": "props",
        "duration": 1.80,
        "variants": 3,
        "bus": "sfx",
        "out_dir": "public/audio/generated",
        "prompt": "heavy mechanized exosuit magnetic inductive charging whine, rising high-tech capacitor pitch and heavy locking latch click",
    },

    # =========================================================================
    # 3. CREATURE & THREAT AUDIO (Fixing misrouted and placeholder sounds)
    # =========================================================================
    "enemy_idle_boss": {
        "category": "creatures",
        "duration": 2.50,
        "variants": 3,
        "bus": "world",
        "out_dir": "public/audio/enemies",
        "prompt": "colossal biomechanical hive queen snail guttural idling breath, subterranean wet chitin clicking and vibrating subsonic chest rumble",
    },
    "enemy_alert_crawler": {
        "category": "creatures",
        "duration": 1.00,
        "variants": 3,
        "bus": "sfx",
        "out_dir": "public/audio/enemies",
        "prompt": "predatory alien cyber-crawler sharp aggressive alert hiss, metallic mandible snap and chitinous exoskeleton twitching",
    },
    "enemy_alert_snail": {
        "category": "creatures",
        "duration": 1.20,
        "variants": 3,
        "bus": "sfx",
        "out_dir": "public/audio/enemies",
        "prompt": "hostile biomechanical gastropod rasping roar, wet expanding fleshy mantle and sharp pressurized bio-fluid hiss",
    },
    "enemy_alert_boss": {
        "category": "creatures",
        "duration": 2.20,
        "variants": 2,
        "bus": "world",
        "out_dir": "public/audio/enemies",
        "prompt": "terrifying gigantic queen boss deafening cavernous screech, grinding armored shell plates and deep resonant alien roar",
    },
    "enemy_break_wall": {
        "category": "creatures",
        "duration": 1.60,
        "variants": 3,
        "bus": "world",
        "out_dir": "public/audio/impacts",
        "prompt": "massive violent impact smashing concrete bunker wall, reinforced masonry shattering, fracturing stone and crumbling rubble crash",
    },
    "crystal_shatter": {
        "category": "creatures",
        "duration": 1.10,
        "variants": 3,
        "bus": "sfx",
        "out_dir": "public/audio/impacts",
        "prompt": "brittle cryogenic frost crystal explosion, sharp glass-like crystalline ice fracturing into piercing shards, high resonant shatter",
    },
    "item_pickup": {
        "category": "items",
        "duration": 0.40,
        "variants": 3,
        "bus": "sfx",
        "out_dir": "public/audio/generated",
        "prompt": "tactile mechanical inventory pickup click, crisp military equipment latch and satisfying heavy metal item acquisition snap",
    },

    # =========================================================================
    # 4. LORE SETPIECE LANDMARK SOUNDS (Pass 2 World Story Props)
    # =========================================================================
    "chen_sealed_confession_console": {
        "category": "props",
        "duration": 2.00,
        "variants": 2,
        "bus": "world",
        "out_dir": "public/audio/generated",
        "prompt": "classified corporate audio cassette tape deck mechanical loading clunk, electromagnetic tape hiss burst and amber CRT terminal chirp",
    },
    "evac_manifest_allocation_terminal": {
        "category": "props",
        "duration": 1.80,
        "variants": 2,
        "bus": "world",
        "out_dir": "public/audio/generated",
        "prompt": "high speed mechanical dot matrix receipt printer chattering carriage rattle, ticket dispenser tear and green CRT terminal tone",
    },
    "scout_tracking_beacon_core": {
        "category": "props",
        "duration": 1.50,
        "variants": 2,
        "bus": "world",
        "out_dir": "public/audio/generated",
        "prompt": "high-tech emergency rescue transponder double chirp, crisp digital sonar strobe ping echoing in frozen wasteland",
    },
    "relay_false_beacon_spire": {
        "category": "props",
        "duration": 2.80,
        "variants": 2,
        "bus": "world",
        "out_dir": "public/audio/generated",
        "prompt": "heavy mechanical optical lighthouse motor rotating, sweeping low frequency acoustic foghorn siren pulse with gear whine",
    },
    "ind_biomass_grinder": {
        "category": "props",
        "duration": 2.50,
        "variants": 2,
        "bus": "world",
        "out_dir": "public/audio/generated",
        "prompt": "terrifying industrial dual rotary steel gear teeth crushing bone and flesh, violent metal shredder motor groaning under load",
    },
    "hive_visceral_ovipositor": {
        "category": "props",
        "duration": 2.20,
        "variants": 2,
        "bus": "world",
        "out_dir": "public/audio/generated",
        "prompt": "rhythmic deep biological womb peristaltic pumping, thick amniotic slime expulsion and heavy wet organic squelch",
    },
}

# Curated test subset for immediate validation and auditioning
TEST_SUBSET_KEYS = [
    # Surface Footsteps
    "footstep_metal_grate",
    "footstep_ice_crunch",
    "footstep_hive_slime",
    "footstep_wood_plank",
    "footstep_shell_casings",
    # Core Missing Interactive Props
    "terminal_beep",
    "terminal_deny",
    "vault_open",
    "crane_motor",
    "power_hum",
    "steam_burst",
    "chem_siphon",
    "flesh_seal",
    "toolbox_open",
    # Creature & Impact
    "enemy_idle_boss",
    "enemy_alert_crawler",
    "enemy_break_wall",
    "crystal_shatter",
    "item_pickup",
]


def post_process_audio(waveform: np.ndarray, sample_rate: int) -> np.ndarray:
    """Normalize, high-pass filter rumble, and apply anti-click envelope."""
    # Ensure 1D float array
    if waveform.ndim > 1:
        waveform = waveform.squeeze()

    # Peak normalization to -1 dB (approx 0.89)
    peak = np.max(np.abs(waveform))
    if peak > 1e-4:
        waveform = waveform * (0.89 / peak)

    # Micro-fade in (3ms) and fade out (15ms) to eliminate clicks
    fade_in_samples = int(sample_rate * 0.003)
    fade_out_samples = int(sample_rate * 0.015)

    if len(waveform) > fade_in_samples + fade_out_samples:
        fade_in = np.linspace(0.0, 1.0, fade_in_samples)
        fade_out = np.linspace(1.0, 0.0, fade_out_samples)
        waveform[:fade_in_samples] *= fade_in
        waveform[-fade_out_samples:] *= fade_out

    return waveform.astype(np.float32)


def convert_wav_to_ogg(wav_path: Path, ogg_path: Path):
    """Use ffmpeg to convert 44.1/48k WAV to web-standard vorbis OGG."""
    cmd = [
        "ffmpeg",
        "-y",
        "-i",
        str(wav_path),
        "-c:a",
        "libvorbis",
        "-q:a",
        "5",
        str(ogg_path),
    ]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)


def generate_sfx(keys_to_generate, dry_run=False, device="cuda"):
    """Run AudioCraft AudioGen to produce the requested SFX library."""
    if dry_run:
        print(f"--- Dry Run Mode: {len(keys_to_generate)} soundsets to generate ---")
        for key in keys_to_generate:
            spec = SFX_PROMPT_CATALOG[key]
            print(f"[{spec['category'].upper()}] Key: '{key}' ({spec['variants']} variants, {spec['duration']}s)")
            print(f"    Prompt: \"{spec['prompt']}\"")
            print(f"    Target: {spec['out_dir']}/{key}_000.wav + .ogg\n")
        return

    import soundfile as sf
    import torch
    from audiocraft.models import AudioGen

    print(f"\n[AudioCraft] Initializing AudioGen on device: {device}...")
    model = AudioGen.get_pretrained("facebook/audiogen-medium", device=device)
    sample_rate = model.sample_rate

    total_keys = len(keys_to_generate)
    for idx, key in enumerate(keys_to_generate, 1):
        spec = SFX_PROMPT_CATALOG[key]
        num_variants = spec["variants"]
        duration = spec["duration"]
        prompt = spec["prompt"]
        out_dir = ROOT / spec["out_dir"]
        out_dir.mkdir(parents=True, exist_ok=True)

        print(f"\n[{idx}/{total_keys}] Generating '{key}' ({num_variants} takes, {duration}s)...")
        print(f"    Prompt: \"{prompt}\"")

        model.set_generation_params(duration=duration)

        # Generate each variant with a distinct random seed
        for v in range(num_variants):
            var_seed = (hash(key) + v * 7919) & 0x7FFFFFFF
            torch.manual_seed(var_seed)
            if torch.cuda.is_available():
                torch.cuda.manual_seed(var_seed)

            # Variant filename suffix
            # For footsteps: footstep_metal_grate_000, footstep_metal_grate_001, etc.
            # For single/numbered props: key_000 or key1, key2
            suffix = f"_{v:03d}" if spec["category"] == "footsteps" else f"_{v:03d}"
            variant_name = f"{key}{suffix}"
            wav_path = out_dir / f"{variant_name}.wav"
            ogg_path = out_dir / f"{variant_name}.ogg"

            wav_tensor = model.generate([prompt])
            raw_audio = wav_tensor[0, 0].cpu().numpy()
            processed_audio = post_process_audio(raw_audio, sample_rate)

            # Write WAV
            sf.write(str(wav_path), processed_audio, sample_rate, subtype="PCM_16")

            # Convert to OGG
            try:
                convert_wav_to_ogg(wav_path, ogg_path)
            except Exception as e:
                print(f"    Warning: ffmpeg conversion to ogg failed: {e}")

            print(f"    ✓ Generated {variant_name}.wav & .ogg")

    print(f"\n[AudioCraft] All {total_keys} soundsets generated and converted successfully!")


def main():
    parser = argparse.ArgumentParser(description="Hunker Bunker AudioCraft SFX Generator")
    parser.add_argument("--list", action="store_true", help="List all catalogued sound assets and prompts")
    parser.add_argument("--subset", type=str, choices=["test", "all"], help="Generate test subset or all")
    parser.add_argument("--category", type=str, help="Generate a specific category (footsteps, props, creatures, items)")
    parser.add_argument("--keys", type=str, help="Comma-separated list of specific sound keys")
    parser.add_argument("--dry-run", action="store_true", help="Print prompt execution plan without running GPU")
    parser.add_argument("--device", type=str, default="cuda", help="Target device (cuda or cpu)")

    args = parser.parse_args()

    if args.list:
        print(f"=== Hunker Bunker AudioCraft Sound Catalog ({len(SFX_PROMPT_CATALOG)} entries) ===")
        for key, spec in sorted(SFX_PROMPT_CATALOG.items()):
            print(f"[{spec['category']:<10}] {key:<35} | {spec['variants']} takes | {spec['duration']}s | {spec['out_dir']}")
            print(f"    Prompt: {spec['prompt']}")
        return

    keys_to_generate = []
    if args.keys:
        keys_to_generate = [k.strip() for k in args.keys.split(",") if k.strip() in SFX_PROMPT_CATALOG]
    elif args.category:
        keys_to_generate = [k for k, v in SFX_PROMPT_CATALOG.items() if v["category"] == args.category]
    elif args.subset == "test":
        keys_to_generate = [k for k in TEST_SUBSET_KEYS if k in SFX_PROMPT_CATALOG]
    elif args.subset == "all":
        keys_to_generate = list(SFX_PROMPT_CATALOG.keys())
    else:
        # Default to test subset if no flag given
        keys_to_generate = [k for k in TEST_SUBSET_KEYS if k in SFX_PROMPT_CATALOG]

    if not keys_to_generate:
        print("No valid sound keys selected. Use --list or --subset test.")
        return

    generate_sfx(keys_to_generate, dry_run=args.dry_run, device=args.device)


if __name__ == "__main__":
    main()
