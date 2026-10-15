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
import subprocess
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

    # =========================================================================
    # 5. CONTINUOUS ROOM TONE ATMOSPHERIC BEDS (Long, subtle, seamless loops)
    # =========================================================================
    "room_tone_exterior_wind": {
        "category": "ambience",
        "duration": 65.00,
        "segments": 3,
        "segment_duration": 25.00,
        "variants": 1,
        "bus": "world",
        "out_dir": "public/audio/ambient",
        "loop": True,
        "crossfade_sec": 4.0,
        "prompt": "subtle continuous freezing arctic wind blowing across barren snowy exterior wasteland, distant cold whistling blizzard draft, wide open sub-zero winter expanse, soft atmospheric room tone",
    },
    "room_tone_interior_bunker": {
        "category": "ambience",
        "duration": 65.00,
        "segments": 3,
        "segment_duration": 25.00,
        "variants": 1,
        "bus": "world",
        "out_dir": "public/audio/ambient",
        "loop": True,
        "crossfade_sec": 4.0,
        "prompt": "subtle quiet subterranean bunker interior room tone, low continuous 50Hz ventilation air handling unit hum, soft hollow duct airflow, distant deep metallic pipe resonance",
    },
    "room_tone_cryo_subzero": {
        "category": "ambience",
        "duration": 65.00,
        "segments": 3,
        "segment_duration": 25.00,
        "variants": 1,
        "bus": "world",
        "out_dir": "public/audio/ambient",
        "loop": True,
        "crossfade_sec": 4.0,
        "prompt": "subtle freezing cryogenic vault atmospheric room tone, deep thermal contraction creaks in metal struts, quiet cold refrigerant pipe hiss, hypothermic subterranean cavern air",
    },
    "room_tone_bio_hive": {
        "category": "ambience",
        "duration": 65.00,
        "segments": 3,
        "segment_duration": 25.00,
        "variants": 1,
        "bus": "world",
        "out_dir": "public/audio/ambient",
        "loop": True,
        "crossfade_sec": 4.0,
        "prompt": "subtle alien biological hive cavern room tone, low organic respiratory breathing drone, distant subterranean moisture drips, quiet damp amniotic reverberation",
    },
    "room_tone_cathedral_crypt": {
        "category": "ambience",
        "duration": 65.00,
        "segments": 3,
        "segment_duration": 25.00,
        "variants": 1,
        "bus": "world",
        "out_dir": "public/audio/ambient",
        "loop": True,
        "crossfade_sec": 4.0,
        "prompt": "subtle cavernous stone vaulted cathedral crypt room tone, hollow cold drafts sweeping across ancient masonry, distant deep monastic echo, quiet subterranean stillness",
    },
    "room_tone_safe_ship": {
        "category": "ambience",
        "duration": 65.00,
        "segments": 3,
        "segment_duration": 25.00,
        "variants": 1,
        "bus": "world",
        "out_dir": "public/audio/ambient",
        "loop": True,
        "crossfade_sec": 4.0,
        "prompt": "subtle pressurized starship cockpit interior room tone, quiet avionics cooling fan hum, gentle life support oxygen circulation, warm insulated safe sanctuary",
    },

    # =========================================================================
    # 5. EJECTED SHELL CASINGS (SURFACE IMPACT FOLEY)
    # =========================================================================
    "shell_drop_metal": {
        "category": "casings",
        "duration": 1.10,
        "variants": 3,
        "bus": "world",
        "out_dir": "public/audio/foley/casings",
        "prompt": "brass bullet shell casing falling and bouncing on hollow steel grating, sharp metallic ting and clink, clean realistic foley",
    },
    "shell_drop_snow": {
        "category": "casings",
        "duration": 1.10,
        "variants": 3,
        "bus": "world",
        "out_dir": "public/audio/foley/casings",
        "prompt": "empty brass shell casing dropping into deep soft cold snow, muffled delicate metal tap, subzero winter foley",
    },
    "shell_drop_stone": {
        "category": "casings",
        "duration": 1.10,
        "variants": 3,
        "bus": "world",
        "out_dir": "public/audio/foley/casings",
        "prompt": "empty bullet cartridge casing landing on hard concrete stone floor, crisp ceramic rock ping and bounce, clean crisp foley",
    },
    "shell_drop_slime": {
        "category": "casings",
        "duration": 1.10,
        "variants": 3,
        "bus": "world",
        "out_dir": "public/audio/foley/casings",
        "prompt": "metal bullet shell landing in thick wet biological alien slime muck, damp squishy thud, viscous absorption foley",
    },
    "shell_drop_wood": {
        "category": "casings",
        "duration": 1.10,
        "variants": 3,
        "bus": "world",
        "out_dir": "public/audio/foley/casings",
        "prompt": "brass casing bouncing on hollow dry wooden floor planks, gentle timber clatter and roll, realistic foley",
    },

    # =========================================================================
    # 6. WEAPON FIRING SOUNDSETS (DIVERSE KINETIC & ENERGY ARCHETYPES)
    # =========================================================================
    "weapon_fire_shotgun": {
        "category": "weapons",
        "duration": 1.30,
        "variants": 3,
        "bus": "sfx",
        "out_dir": "public/audio/weapons",
        "prompt": "heavy concussive tactical shotgun blast, deep punchy low end boom, mechanical pump chamber action, crisp punchy gunshot",
    },
    "weapon_fire_carbine": {
        "category": "weapons",
        "duration": 1.10,
        "variants": 3,
        "bus": "sfx",
        "out_dir": "public/audio/weapons",
        "prompt": "punchy military assault rifle gunshot, snappy kinetic supersonic crack, crisp brass ejection chirp, clean powerful fire",
    },
    "weapon_fire_smg": {
        "category": "weapons",
        "duration": 0.90,
        "variants": 3,
        "bus": "sfx",
        "out_dir": "public/audio/weapons",
        "prompt": "rapid compact submachine gun burst shot, crisp high frequency mechanical pop, light snappy firearm discharge",
    },
    "weapon_fire_railgun": {
        "category": "weapons",
        "duration": 1.50,
        "variants": 3,
        "bus": "sfx",
        "out_dir": "public/audio/weapons",
        "prompt": "high tech electromagnetic railgun firing, high voltage capacitor whine, supersonic magnetic crack, heavy sci-fi discharge",
    },
    "weapon_fire_cryo": {
        "category": "weapons",
        "duration": 1.30,
        "variants": 3,
        "bus": "sfx",
        "out_dir": "public/audio/weapons",
        "prompt": "cryogenic freeze beam cannon firing, pressurized liquid nitrogen hiss, shattering ice crystal splinter, futuristic cold blast",
    },
    "weapon_fire_tesla": {
        "category": "weapons",
        "duration": 1.30,
        "variants": 3,
        "bus": "sfx",
        "out_dir": "public/audio/weapons",
        "prompt": "high energy tesla electrical arc zap, violent ionized plasma spark crackle, humming electric discharge",
    },

    # =========================================================================
    # 7. TRACER FLYBY SNAPS & WHOOSHES
    # =========================================================================
    "tracer_flyby_ballistic": {
        "category": "tracers",
        "duration": 0.70,
        "variants": 3,
        "bus": "sfx",
        "out_dir": "public/audio/tracers",
        "prompt": "bullet supersonic flyby whip crack, fast whiz by camera, high velocity bullet snap",
    },
    "tracer_flyby_frost": {
        "category": "tracers",
        "duration": 0.80,
        "variants": 2,
        "bus": "sfx",
        "out_dir": "public/audio/tracers",
        "prompt": "freezing ice shard whizzing by in cold air, crystalline whistling flyby, delicate frosty whoosh",
    },
    "tracer_flyby_heavy": {
        "category": "tracers",
        "duration": 0.80,
        "variants": 2,
        "bus": "sfx",
        "out_dir": "public/audio/tracers",
        "prompt": "heavy caliber bullet slug passing by closely, deep resonant concussive air displacement whoosh",
    },
    "tracer_flyby_chitin": {
        "category": "tracers",
        "duration": 0.80,
        "variants": 2,
        "bus": "sfx",
        "out_dir": "public/audio/tracers",
        "prompt": "alien acid spore needle flying past, viscous liquid hiss and insectoid aerodynamic whoosh",
    },

    # =========================================================================
    # 8. HYPER-LOCALIZED POINT-SOURCE AMBIENCE (CAMPS & HIVES)
    # =========================================================================
    "amb_point_tallow_forge": {
        "category": "points",
        "duration": 30.00,
        "segments": 2,
        "segment_duration": 18.00,
        "variants": 1,
        "bus": "world",
        "out_dir": "public/audio/ambient/points",
        "loop": True,
        "crossfade_sec": 3.0,
        "prompt": "subtle geothermal forge steam hiss, distant rhythmic anvil blacksmith clangs, warm coal hearth embers crackling",
    },
    "amb_point_vesper_generator": {
        "category": "points",
        "duration": 30.00,
        "segments": 2,
        "segment_duration": 18.00,
        "variants": 1,
        "bus": "world",
        "out_dir": "public/audio/ambient/points",
        "loop": True,
        "crossfade_sec": 3.0,
        "prompt": "heavy industrial diesel electric generator turbine hum, rhythmic electrical relay clicks, low vibrating drone",
    },
    "amb_point_meridian_chimes": {
        "category": "points",
        "duration": 30.00,
        "segments": 2,
        "segment_duration": 18.00,
        "variants": 1,
        "bus": "world",
        "out_dir": "public/audio/ambient/points",
        "loop": True,
        "crossfade_sec": 3.0,
        "prompt": "resonant ancient brass chimes tinkling in cold subterranean draft, vaulted cathedral stone resonance, quiet spiritual echo",
    },
    "amb_point_hive_sac": {
        "category": "points",
        "duration": 25.00,
        "segments": 2,
        "segment_duration": 15.00,
        "variants": 1,
        "bus": "world",
        "out_dir": "public/audio/ambient/points",
        "loop": True,
        "crossfade_sec": 3.0,
        "prompt": "pulsating alien bio organic egg sac membrane, slow wet biological heartbeat, damp fluid sloshing, unsettling creature cocoon",
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


def make_seamless_loop(waveform: np.ndarray, sample_rate: int, crossfade_sec: float = 2.5) -> np.ndarray:
    """Turn audio into a seamless loop by equal-power crossfading tail onto head."""
    if waveform.ndim > 1:
        waveform = waveform.squeeze()
    cf_samples = int(sample_rate * crossfade_sec)
    if len(waveform) <= cf_samples * 2:
        return waveform

    # The loop body length will be len(waveform) - cf_samples
    body = waveform[:-cf_samples].copy()
    tail = waveform[-cf_samples:]

    # Equal-power crossfade curve: sin^2 + cos^2 = 1 maintains constant energy
    t = np.linspace(0.0, 1.0, cf_samples, endpoint=False)
    fade_in = np.sin(t * (np.pi / 2))
    fade_out = np.cos(t * (np.pi / 2))

    body[:cf_samples] = body[:cf_samples] * fade_in + tail * fade_out
    return body


def stitch_segments(segments: list, sample_rate: int, crossfade_sec: float = 4.0) -> np.ndarray:
    """Stitch multiple sequential audio segments with equal-power crossfades for organic long beds."""
    if not segments:
        return np.zeros(0, dtype=np.float32)
    if len(segments) == 1:
        return segments[0]

    cf_samples = int(sample_rate * crossfade_sec)
    stitched = segments[0]
    t = np.linspace(0.0, 1.0, cf_samples, endpoint=False)
    fade_in = np.sin(t * (np.pi / 2))
    fade_out = np.cos(t * (np.pi / 2))

    for nxt in segments[1:]:
        if len(stitched) < cf_samples or len(nxt) < cf_samples:
            stitched = np.concatenate([stitched, nxt])
            continue

        overlap_a = stitched[-cf_samples:]
        overlap_b = nxt[:cf_samples]
        blended = overlap_a * fade_out + overlap_b * fade_in
        stitched = np.concatenate([stitched[:-cf_samples], blended, nxt[cf_samples:]])

    return stitched


def post_process_audio(waveform: np.ndarray, sample_rate: int, target_peak: float = 0.89, loop: bool = False, crossfade_sec: float = 2.5) -> np.ndarray:
    """Normalize, high-pass filter rumble, seamlessly loop if requested, and apply anti-click envelope."""
    # Ensure 1D float array
    if waveform.ndim > 1:
        waveform = waveform.squeeze()

    if loop:
        waveform = make_seamless_loop(waveform, sample_rate, crossfade_sec)

    # Peak normalization
    peak = np.max(np.abs(waveform))
    if peak > 1e-4:
        waveform = waveform * (target_peak / peak)

    if not loop:
        # Micro-fade in (3ms) and fade out (15ms) to eliminate clicks for one-shot SFX
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
            num_segs = spec.get("segments", 1)
            seg_dur = spec.get("segment_duration", spec["duration"])
            print(f"[{spec['category'].upper()}] Key: '{key}' ({spec['variants']} variants, {spec['duration']}s total across {num_segs} segments of {seg_dur}s)")
            print(f"    Prompt: \"{spec['prompt']}\"")
            print(f"    Target: {spec['out_dir']}/{key}.wav + .ogg\n")
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
        num_segs = spec.get("segments", 1)
        seg_duration = spec.get("segment_duration", duration)
        is_loop = spec.get("loop", False)
        crossfade = spec.get("crossfade_sec", 4.0 if num_segs > 1 else 2.5)
        target_peak = 0.62 if spec["category"] == "ambience" else 0.89
        out_dir = ROOT / spec["out_dir"]
        out_dir.mkdir(parents=True, exist_ok=True)

        print(f"\n[{idx}/{total_keys}] Generating '{key}' ({num_variants} takes, {duration}s total via {num_segs} segments of {seg_duration}s)...")
        print(f"    Prompt: \"{prompt}\"")

        model.set_generation_params(duration=seg_duration)

        # Generate each variant
        for v in range(num_variants):
            var_seed = (hash(key) + v * 7919) & 0x7FFFFFFF

            # Variant filename suffix
            if spec["category"] == "ambience" and num_variants == 1:
                variant_name = key
            else:
                suffix = f"_{v:03d}"
                variant_name = f"{key}{suffix}"

            wav_path = out_dir / f"{variant_name}.wav"
            ogg_path = out_dir / f"{variant_name}.ogg"

            # Generate multiple segments if requested to construct long organic beds
            generated_segments = []
            for s in range(num_segs):
                seg_seed = (var_seed + s * 104729) & 0x7FFFFFFF
                torch.manual_seed(seg_seed)
                if torch.cuda.is_available():
                    torch.cuda.manual_seed(seg_seed)

                print(f"    -> Generating segment {s + 1}/{num_segs} ({seg_duration}s)...")
                wav_tensor = model.generate([prompt])
                raw_seg = wav_tensor[0, 0].cpu().numpy().squeeze()
                generated_segments.append(raw_seg)

            if num_segs > 1:
                stitched = stitch_segments(generated_segments, sample_rate, crossfade_sec=crossfade)
            else:
                stitched = generated_segments[0]

            processed_audio = post_process_audio(
                stitched,
                sample_rate,
                target_peak=target_peak,
                loop=is_loop,
                crossfade_sec=crossfade
            )

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
