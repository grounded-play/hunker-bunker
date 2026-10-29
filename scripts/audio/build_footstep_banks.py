#!/usr/bin/env python3
"""
Footstep bank builder (2026-10-17).

The first AudioGen pass asked for one 0.55 s footstep per call. AudioGen does
not do single steps well: the clips were mushy, 16 kHz mono (nothing above
8 kHz, so no grit or crunch), padded to a fixed length, and 15 dB apart in
loudness between surfaces. This builder instead:

  1. generate: asks AudioGen for long takes of someone *walking* on each
     material (it renders natural, spaced steps), several prompt phrasings
     per material. Raw takes go to art/source/audio/footsteps/takes (masters
     never ship).
  2. process: slices every take at its onsets, rejects overlapped / noisy /
     weak hits, keeps the best N per material for variety, trims each to a
     tight envelope, resamples to 48 kHz, restores the high band AudioGen
     cannot produce with a per-material synthesized transient layer
     (grit, crunch, metal ring, splash), loudness-matches every step, and
     writes public/audio/footsteps/<key>_NNN.ogg plus a report.

Run with the AudioCraft venv:
  ~/tools/audiocraft/.venv/bin/python scripts/audio/build_footstep_banks.py generate [--keys a,b]
  ~/tools/audiocraft/.venv/bin/python scripts/audio/build_footstep_banks.py process [--keys a,b]
"""

import argparse
import json
import subprocess
import zlib
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent.parent
TAKES_DIR = ROOT / "art/source/audio/footsteps/takes"
OUT_DIR = ROOT / "public/audio/footsteps"
REPORT_PATH = ROOT / "docs/reports/footstep-banks-2026-10-17.json"

SR_GEN = 16000
SR_OUT = 48000
VARIANTS = 10
TAKE_SECONDS = 8.0

BOOT = "one person in heavy military boots"
CLEAN = "close-up recording, single walker, no music, no voices, no background noise"

# key -> (prompts, enhancement profile, loudness offset dB, max step length s)
MATERIALS = {
    "footstep_concrete": ([
        f"footsteps of {BOOT} walking slowly on a rough dry concrete floor in an empty bunker, firm heel strikes with gritty scuff, {CLEAN}",
        f"slow footsteps on bare concrete in an underground facility, hard rubber boot soles, {CLEAN}",
    ], "grit", 0.0, 0.32),
    "footstep_metal_deck": ([
        f"footsteps of {BOOT} walking slowly on a solid steel deck plate in a ship corridor, dull metallic thud, {CLEAN}",
        f"slow heavy boot steps on thick metal floor plating, low resonant clank, {CLEAN}",
    ], "metal", 1.0, 0.38),
    "footstep_metal_grate": ([
        f"footsteps of {BOOT} walking slowly on a hollow steel grating catwalk, ringing rattling metal grate, {CLEAN}",
        f"slow boot steps on an industrial metal mesh walkway, clanging hollow grate with rattle, {CLEAN}",
    ], "metal", 1.5, 0.45),
    "footstep_ice_crunch": ([
        f"footsteps of {BOOT} walking slowly on brittle frozen ice crust, sharp crisp crackling ice under each step, {CLEAN}",
        f"slow steps breaking thin ice and frost on frozen ground, crisp crunch, {CLEAN}",
    ], "crunch", 0.0, 0.40),
    "footstep_snow": ([
        f"footsteps of {BOOT} walking slowly on packed snow, firm squeaky snow crunch, {CLEAN}",
        f"slow steps on cold compacted snow path, crisp compressing crunch, {CLEAN}",
    ], "crunch", -1.0, 0.40),
    "footstep_deep_snow": ([
        f"footsteps of {BOOT} trudging slowly through deep powder snow, soft muffled sinking crunch, {CLEAN}",
        f"slow heavy steps wading through deep fresh snow outdoors, {CLEAN}",
    ], "crunch_soft", -2.5, 0.50),
    "footstep_slush": ([
        f"footsteps of {BOOT} walking slowly through wet icy slush, watery crunchy squelch, {CLEAN}",
        f"slow steps in melting slush and wet snow, sloppy icy splash, {CLEAN}",
    ], "wet", -1.0, 0.50),
    "footstep_gravel": ([
        f"footsteps of {BOOT} walking slowly on loose gravel and dirt, crunching stones under each step, {CLEAN}",
        f"slow steps on rocky scree and packed dirt ground, gravel crunch, {CLEAN}",
    ], "crunch", 0.0, 0.42),
    "footstep_mud": ([
        f"footsteps of {BOOT} walking slowly through thick sticky mud, wet sucking squelch, {CLEAN}",
        f"slow steps in deep muddy ground, boots pulling out of mud, {CLEAN}",
    ], "wet", -1.0, 0.55),
    "footstep_wood_plank": ([
        f"footsteps of {BOOT} walking slowly on old wooden floorboards, hollow timber knock with slight creak, {CLEAN}",
        f"slow steps on a wooden boardwalk deck, solid wood thud, {CLEAN}",
    ], "wood", 0.0, 0.40),
    "footstep_soft_fabric": ([
        f"footsteps of {BOOT} walking slowly on a canvas tarp laid over the floor, soft muffled cloth thump, {CLEAN}",
        f"slow steps on thick felt matting, soft dull footfalls, {CLEAN}",
    ], "soft", -3.0, 0.32),
    "footstep_rubber_mat": ([
        f"footsteps of {BOOT} walking slowly on a rubber floor mat in a hospital, soft squeaky rubber footfalls, {CLEAN}",
        f"slow steps on a sticky rubberized lab floor, light squeak, {CLEAN}",
    ], "soft", -2.0, 0.32),
    "footstep_bone_terrazzo": ([
        f"footsteps of {BOOT} walking slowly on polished stone tiles in a large cathedral, hard sharp clack with stone echo, {CLEAN}",
        f"slow steps on a marble floor in a cavernous hall, crisp hard heel strikes, {CLEAN}",
    ], "grit", 0.5, 0.50),
    "footstep_hive_slime": ([
        f"footsteps of {BOOT} walking slowly through thick sticky slime, gooey wet squelch, {CLEAN}",
        f"slow steps on a sticky gelatinous floor, boots peeling off goo, {CLEAN}",
    ], "wet", -1.5, 0.50),
    "footstep_organic": ([
        f"footsteps of {BOOT} walking slowly on spongy moss and fungus, soft damp squishy steps, {CLEAN}",
        f"slow steps on soft wet organic ground, muffled squish, {CLEAN}",
    ], "soft", -2.0, 0.42),
    "footstep_chitin": ([
        f"footsteps of {BOOT} walking slowly over dry broken eggshells and brittle husks, sharp papery crackling crunch, {CLEAN}",
        f"slow steps crushing dry beetle shells and dead leaves, brittle crackle, {CLEAN}",
    ], "crunch", 0.0, 0.42),
    "footstep_glass": ([
        f"footsteps of {BOOT} walking slowly over broken glass shards, crunching and tinkling glass, {CLEAN}",
        f"slow steps grinding shattered window glass on a floor, {CLEAN}",
    ], "glass", 0.0, 0.45),
    "footstep_shell_casings": ([
        f"footsteps of {BOOT} walking slowly over scattered spent brass bullet casings, metallic jingling clinks, {CLEAN}",
        f"slow steps kicking loose brass shells on a concrete floor, bright metal tinkles, {CLEAN}",
    ], "glass", 0.0, 0.45),
    "footstep_wet_puddle": ([
        f"footsteps of {BOOT} walking slowly through shallow puddles of water on concrete, splashing steps, {CLEAN}",
        f"slow steps splashing in a flooded corridor, water splash under each boot, {CLEAN}",
    ], "wet", 0.0, 0.50),
    # Not a surface: the kit jostling with each step (ammo pouches, buckles,
    # armour plates), layered quietly under every footstep.
    "footstep_gear_rattle": ([
        "soldier walking slowly in full combat gear, only the equipment rattling with each step, ammo pouches buckles and armour plates jostling, no footsteps, close-up, no music, no voices",
        "slow walk with a heavy backpack and rifle sling clinking and rustling with each step, gear foley only, no music",
    ], "metal_light", -6.0, 0.35),
}


def take_paths(key):
    return sorted(TAKES_DIR.glob(f"{key}__*.wav"))


def cmd_generate(keys, takes_per_prompt):
    import torch
    import soundfile as sf
    from audiocraft.models import AudioGen

    TAKES_DIR.mkdir(parents=True, exist_ok=True)
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"[gen] AudioGen medium on {device}")
    model = AudioGen.get_pretrained("facebook/audiogen-medium", device=device)
    model.set_generation_params(duration=TAKE_SECONDS, top_k=250, cfg_coef=3.5)
    for key in keys:
        prompts = MATERIALS[key][0]
        for p_index, prompt in enumerate(prompts):
            for t_index in range(takes_per_prompt):
                out = TAKES_DIR / f"{key}__p{p_index}t{t_index}.wav"
                if out.exists():
                    continue
                torch.manual_seed(zlib.crc32(f"{key}:{p_index}:{t_index}".encode()))
                wav = model.generate([prompt])[0, 0].detach().cpu().numpy()
                sf.write(out, wav, SR_GEN)
                print(f"[gen] {out.name}")


# ── processing ──────────────────────────────────────────────────────────────

def db(x):
    return 20 * np.log10(np.maximum(x, 1e-9))


def denoise_take(y, sr):
    """Spectral subtraction against the take's own floor: the median spectrum
    of its quietest 20% of frames. AudioGen takes carry a steady tonal room
    hum that otherwise rings through every step and stops tails decaying."""
    import librosa
    stft = librosa.stft(y, n_fft=1024, hop_length=256)
    mag, phase = np.abs(stft), np.angle(stft)
    energy = mag.sum(axis=0)
    quiet = mag[:, energy <= np.percentile(energy, 20)]
    noise = np.median(quiet, axis=1, keepdims=True)
    cleaned = np.maximum(mag - 1.6 * noise, 0.06 * mag)
    return librosa.istft(cleaned * np.exp(1j * phase), hop_length=256, length=len(y))


def frame_rms(y, hop, win):
    pad = np.pad(y, (win // 2, win // 2))
    frames = np.lib.stride_tricks.sliding_window_view(pad, win)[::hop]
    return np.sqrt(np.mean(frames ** 2, axis=1) + 1e-12)


def detect_steps(y, sr):
    """Attack sample indices of distinct footfalls in a take.

    Peak-picking on a smoothed loudness envelope (librosa's onset detector
    missed most steps in a steady walk), then each attack is found by
    walking back from its peak to where the hit begins to rise."""
    from scipy.signal import find_peaks
    hop, win = int(0.005 * sr), int(0.015 * sr)
    env = db(frame_rms(y, hop, win))
    peaks, _ = find_peaks(env, prominence=7, distance=int(0.28 * sr / hop))
    attacks = []
    for p in peaks:
        floor = env[p] - 20
        k = p
        while k > 0 and p - k < int(0.08 * sr / hop) and env[k - 1] > floor:
            k -= 1
        attacks.append(max(0, k * hop - int(0.004 * sr)))
    return attacks


def score_segment(seg, sr, next_gap):
    """(ok, score, info) for one candidate step."""
    hop, win = int(0.005 * sr), int(0.010 * sr)
    rms = frame_rms(seg, hop, win)
    peak_i = int(np.argmax(rms))
    peak = rms[peak_i]
    if peak < 10 ** (-40 / 20):
        return False, 0, "quiet"
    # The slice must open on the hit: its first 60 ms within 6 dB of the
    # loudest moment (a heel-toe roll or a ringing grate may peak later).
    early = rms[: max(1, int(0.06 * sr / hop))]
    if db(early.max()) < db(peak) - 6:
        return False, 0, "late-peak"
    pre = rms[: max(1, peak_i - 2)]
    floor = np.percentile(rms, 10)
    snr = db(peak) - db(floor)
    if snr < 16:
        return False, 0, "noisy"
    # A second footfall inside the slice (overlap) disqualifies it.
    tail = rms[peak_i + int(0.12 * sr / hop):]
    if tail.size and db(tail.max()) > db(peak) - 9:
        return False, 0, "double"
    attack = db(peak) - db(pre.mean() if pre.size else floor)
    # A footfall is a hit, not a hiss: reward energy front-loaded in the
    # first 40 ms over the rest of the slice.
    head = rms[: max(1, int(0.04 * sr / hop))].mean()
    body = rms[int(0.04 * sr / hop):].mean() if rms.size > int(0.04 * sr / hop) else head
    punch = db(head) - db(body)
    score = snr + 0.5 * attack + 1.5 * punch + (2 if next_gap > 0.35 * sr else 0)
    return True, score, f"snr={snr:.1f}"


DECAY = {  # profile -> (hold after the hit s, decay time constant s)
    "grit": (0.05, 0.05), "crunch": (0.09, 0.06), "crunch_soft": (0.10, 0.07),
    "metal": (0.05, 0.11), "metal_light": (0.04, 0.07), "glass": (0.08, 0.08),
    "wet": (0.10, 0.08), "wood": (0.05, 0.06), "soft": (0.05, 0.045),
}


def envelope_trim(seg, sr, max_len, profile="grit"):
    hop, win = int(0.005 * sr), int(0.010 * sr)
    rms = frame_rms(seg, hop, win)
    # A footfall dies away: hold through the hit, then a natural decay.
    hold, tau = DECAY.get(profile, (0.06, 0.06))
    early_peak = int(np.argmax(rms[: max(1, int(0.08 * sr / hop))])) * hop
    t = np.arange(len(seg)) / sr
    seg = seg * np.where(t < early_peak / sr + hold, 1.0, np.exp(-(t - early_peak / sr - hold) / tau))
    rms = frame_rms(seg, hop, win)
    peak = rms.max()
    above = np.where(db(rms) > db(peak) - 42)[0]
    end = min(len(seg), int((above[-1] + 6) * hop) if above.size else len(seg), int(max_len * sr))
    out = seg[:end].copy()
    fade_in = int(0.002 * sr)
    fade_out = min(int(0.03 * sr), len(out) // 3)
    out[:fade_in] *= np.linspace(0, 1, fade_in)
    out[-fade_out:] *= np.linspace(1, 0, fade_out) ** 2
    return out


def spectral_centroid(seg, sr):
    spec = np.abs(np.fft.rfft(seg * np.hanning(len(seg))))
    freqs = np.fft.rfftfreq(len(seg), 1 / sr)
    return float((spec * freqs).sum() / max(spec.sum(), 1e-9))


def high_band_layer(env48, profile, rng, sr=SR_OUT):
    """Synthesized air above AudioGen's 8 kHz ceiling, shaped by the step's
    own envelope so it reads as the same event."""
    from scipy.signal import butter, sosfilt
    n = len(env48)
    t = np.arange(n) / sr
    noise = rng.standard_normal(n)

    def band(sig, lo, hi):
        sos = butter(4, [lo, min(hi, sr / 2 - 100)], btype="band", fs=sr, output="sos")
        return sosfilt(sos, sig)

    if profile in ("grit",):
        layer = band(noise, 4500, 17000) * np.exp(-t / 0.022)
        gain = 0.55
    elif profile in ("crunch", "crunch_soft"):
        grains = np.zeros(n)
        count = rng.integers(14, 34)
        for at in rng.uniform(0, 0.16, count):
            i = int(at * sr)
            if i < n:
                grains[i] += rng.uniform(0.3, 1.0) * rng.choice([-1, 1])
        layer = band(np.convolve(grains, np.exp(-np.arange(int(0.0015 * sr)) / (0.0004 * sr)), mode="same"), 3000, 16000)
        layer += band(noise, 5000, 16000) * np.exp(-t / 0.045) * 0.35
        gain = 0.55 if profile == "crunch" else 0.30
    elif profile in ("metal", "metal_light"):
        layer = np.zeros(n)
        for _ in range(rng.integers(3, 6)):
            f = rng.uniform(2600, 7800)
            layer += np.sin(2 * np.pi * f * t + rng.uniform(0, 6.28)) * np.exp(-t / rng.uniform(0.04, 0.12))
        layer += band(noise, 5500, 16000) * np.exp(-t / 0.012) * 0.8
        gain = 0.30 if profile == "metal" else 0.22
    elif profile == "glass":
        layer = np.zeros(n)
        for _ in range(rng.integers(5, 10)):
            f = rng.uniform(3500, 11000)
            onset = rng.uniform(0, 0.12)
            tt = np.clip(t - onset, 0, None)
            layer += (t >= onset) * np.sin(2 * np.pi * f * tt) * np.exp(-tt / rng.uniform(0.02, 0.07)) * rng.uniform(0.3, 1)
        gain = 0.32
    elif profile == "wet":
        layer = band(noise, 2500, 14000) * np.exp(-t / 0.07) * (1 + 0.6 * np.sin(2 * np.pi * 37 * t))
        gain = 0.32
    elif profile == "wood":
        layer = band(noise, 3500, 12000) * np.exp(-t / 0.014)
        gain = 0.30
    else:  # soft
        layer = band(noise, 4000, 10000) * np.exp(-t / 0.01)
        gain = 0.12
    shaped = layer * (env48 / max(env48.max(), 1e-9)) ** 0.5
    return shaped / max(np.abs(shaped).max(), 1e-9) * gain


def excite_high_band(up, sr=SR_OUT):
    """Bandwidth extension: AudioGen stops at 8 kHz. Saturating the step's
    own 3-8 kHz band makes harmonics above it that follow the sound sample
    for sample; high-passed and set ~6 dB under the top of the real band,
    the spectrum rolls off instead of hitting a wall."""
    from scipy.signal import butter, sosfilt
    band = sosfilt(butter(4, [3000, 7800], btype="band", fs=sr, output="sos"), up)
    top = sosfilt(butter(4, [6000, 7800], btype="band", fs=sr, output="sos"), up)
    drive = band / max(np.abs(band).max(), 1e-9)
    harmonics = np.tanh(5 * drive) - 0.15 * np.tanh(5 * drive) ** 3
    air = sosfilt(butter(6, 8200, btype="high", fs=sr, output="sos"), harmonics)
    target = np.sqrt(np.mean(top ** 2)) * 0.5
    return air * target / max(np.sqrt(np.mean(air ** 2)), 1e-12)


def loudness_db(seg, sr):
    """Short-term level of the footfall itself (first 150 ms)."""
    head = seg[: int(0.15 * sr)]
    return db(np.sqrt(np.mean(head ** 2) + 1e-12))


def cmd_process(keys, target_db):
    import soundfile as sf
    from scipy.signal import resample_poly

    report = {}
    if REPORT_PATH.exists():
        report = json.loads(REPORT_PATH.read_text())
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for key in keys:
        _, profile, offset_db, max_len = MATERIALS[key]
        rng = np.random.default_rng(zlib.crc32(key.encode()))
        candidates = []
        rejects = {}
        for path in take_paths(key):
            y, sr = sf.read(path)
            if y.ndim > 1:
                y = y.mean(axis=1)
            from scipy.signal import butter, sosfilt
            y = sosfilt(butter(2, 45, btype="high", fs=sr, output="sos"), y)
            y = denoise_take(y, sr)
            onsets = detect_steps(y, sr)
            for i, onset in enumerate(onsets):
                nxt = onsets[i + 1] if i + 1 < len(onsets) else len(y)
                start = onset
                end = min(len(y), start + int(max_len * sr), nxt - int(0.01 * sr))
                if end - start < int(0.08 * sr):
                    rejects["short"] = rejects.get("short", 0) + 1
                    continue
                seg = y[start:end]
                ok, score, why = score_segment(seg, sr, nxt - onset)
                if not ok:
                    rejects[why] = rejects.get(why, 0) + 1
                    continue
                candidates.append((score, seg, spectral_centroid(seg, sr), path.name))
        candidates.sort(key=lambda c: -c[0])
        # Variety: walk the ranked list, skipping near-duplicates in timbre.
        chosen = []
        for cand in candidates:
            if all(abs(cand[2] - other[2]) > 60 for other in chosen):
                chosen.append(cand)
            if len(chosen) == VARIANTS:
                break
        for cand in candidates:
            if len(chosen) == VARIANTS:
                break
            if cand not in chosen:
                chosen.append(cand)
        if not chosen:
            print(f"[proc] {key}: no usable steps ({rejects})")
            continue
        for old in OUT_DIR.glob(f"{key}_*.ogg"):
            old.unlink()
        for old in OUT_DIR.glob(f"{key}_*.wav"):
            old.unlink()
        stats = []
        for index, (score, seg, centroid, source) in enumerate(chosen):
            trimmed = envelope_trim(seg, SR_GEN, max_len, profile)
            up = resample_poly(trimmed, SR_OUT // 1000, SR_GEN // 1000)
            env = np.abs(up)
            env = np.convolve(env, np.ones(96) / 96, mode="same")
            body = up / max(np.abs(up).max(), 1e-9)
            mixed = body + excite_high_band(body) + high_band_layer(env, profile, rng)
            level = loudness_db(mixed, SR_OUT)
            mixed *= 10 ** ((target_db + offset_db - level) / 20)
            peak = np.abs(mixed).max()
            if peak > 0.89:
                mixed *= 0.89 / peak
            wav_tmp = OUT_DIR / f".{key}_{index:03d}.wav"
            sf.write(wav_tmp, mixed.astype(np.float32), SR_OUT, subtype="FLOAT")
            out = OUT_DIR / f"{key}_{index:03d}.ogg"
            subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(wav_tmp), "-c:a", "libvorbis", "-q:a", "5", str(out)], check=True)
            wav_tmp.unlink()
            stats.append({
                "file": out.name,
                "source": source,
                "duration_s": round(len(mixed) / SR_OUT, 3),
                "level_db": round(float(loudness_db(mixed, SR_OUT)), 1),
                "peak_db": round(float(db(np.abs(mixed).max())), 1),
                "centroid_hz": round(centroid),
                "score": round(float(score), 1)
            })
        report[key] = {
            "profile": profile,
            "takes": len(take_paths(key)),
            "candidates": len(candidates),
            "rejected": rejects,
            "variants": stats
        }
        print(f"[proc] {key}: {len(stats)} steps from {len(candidates)} candidates, rejected {rejects}")
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.write_text(json.dumps(report, indent=2) + "\n")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=["generate", "process", "list"])
    parser.add_argument("--keys", default="")
    parser.add_argument("--takes", type=int, default=2, help="takes per prompt")
    parser.add_argument("--target-db", type=float, default=-21.0)
    args = parser.parse_args()
    keys = [k for k in args.keys.split(",") if k] or list(MATERIALS)
    unknown = [k for k in keys if k not in MATERIALS]
    if unknown:
        raise SystemExit(f"unknown keys: {unknown}")
    if args.command == "list":
        for key in keys:
            print(key, MATERIALS[key][1], len(take_paths(key)), "takes")
    elif args.command == "generate":
        cmd_generate(keys, args.takes)
    else:
        cmd_process(keys, args.target_db)


if __name__ == "__main__":
    main()
