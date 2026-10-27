#!/usr/bin/env python3
"""Layered sound design for the motion clips (AudioGen, local).

    ~/tools/audiocraft/.venv/bin/python scripts/cinematics/sound_layers.py render <job...|all> [--seed N]

Each job's layers live in scripts/cinematics/sound-layers.json: an AudioGen
prompt per layer, a start time, fades and a gain. One render:

  1. generates every layer at the clip's length in one AudioGen batch
     (facebook/audiogen-medium, cached; 16 kHz mono),
  2. masters each layer: soxr to 48 kHz, high-pass, an exciter to put back
     air above AudioGen's 8 kHz ceiling, Haas widening to stereo, and
     loudness to -20 LUFS,
  3. places them (start, fades, gain relative to -10 dB) and mixes the bed.

Output: art/source/cinematics/<job>/sound/take_<n>/ (raw layers, mastered
layers, bed.wav, take.json). comfy_clips.py `encode` lays the newest bed
under the job's music (docs/cinematics-comfyui-pipeline.md).
"""

import argparse
import json
import subprocess
import sys
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
JOBS = ROOT / 'scripts/cinematics/clip-jobs.json'
LAYERS = ROOT / 'scripts/cinematics/sound-layers.json'
MASTERS = ROOT / 'art/source/cinematics'
RATE = 48000
LAYER_LUFS = -20.0
GAIN_REFERENCE_DB = -10.0


def run(cmd):
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)


def master_layer(raw, out):
    chain = ','.join([
        f'aresample={RATE}:resampler=soxr',
        'highpass=f=35',
        'aexciter=amount=3.5:drive=8.5:blend=0:freq=5500:ceil=18000',
        'pan=stereo|c0=c0|c1=c0',
        'haas=middle_source=mid:side_gain=0.9:left_delay=2.05:right_delay=12.0',
        f'loudnorm=I={LAYER_LUFS}:TP=-3:LRA=11',
        f'aresample={RATE}',
    ])
    run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(raw), '-af', chain, '-ac', '2', str(out)])


def mix_bed(layers, mastered, duration, defaults, out):
    inputs, parts = [], []
    for index, (layer, path) in enumerate(zip(layers, mastered)):
        start = float(layer.get('start', 0))
        length = max(0.2, duration - start)
        fade_in = float(layer.get('fadeIn', defaults['fadeIn']))
        fade_out = min(float(layer.get('fadeOut', defaults['fadeOut'])), length / 2)
        gain = float(layer.get('gainDb', GAIN_REFERENCE_DB)) - GAIN_REFERENCE_DB
        delay = int(round(start * 1000))
        inputs += ['-i', str(path)]
        parts.append(f'[{index}:a]atrim=0:{length:.3f},asetpts=PTS-STARTPTS,afade=t=in:d={fade_in:.2f},'
                     f'afade=t=out:st={length - fade_out:.3f}:d={fade_out:.2f},adelay={delay}|{delay},volume={gain:.1f}dB[l{index}]')
    labels = ''.join(f'[l{i}]' for i in range(len(layers)))
    graph = ';'.join(parts) + f';{labels}amix=inputs={len(layers)}:normalize=0:dropout_transition=0,apad,atrim=0:{duration:.3f},alimiter=limit=0.89[bed]'
    run(['ffmpeg', '-y', '-loglevel', 'error', *inputs, '-filter_complex', graph, '-map', '[bed]', '-ar', str(RATE), '-ac', '2', str(out)])


def render(job, spec, defaults, model, seed):
    import soundfile as sf
    import torch

    duration = float(job['durationSec'])
    layers = spec['layers']
    folder = MASTERS / job['id'] / 'sound'
    folder.mkdir(parents=True, exist_ok=True)
    take = max([int(p.name.split('_')[-1]) for p in folder.glob('take_*') if p.name.split('_')[-1].isdigit()], default=0) + 1
    out = folder / f'take_{take}'
    out.mkdir()
    model.set_generation_params(duration=min(10.0, duration + 0.5), top_k=250, cfg_coef=3.5)
    torch.manual_seed(seed if seed is not None else zlib.crc32(f"{job['id']}:{take}".encode()))
    wavs = model.generate([layer['prompt'] for layer in layers])
    mastered = []
    for layer, wav in zip(layers, wavs):
        raw = out / f"raw_{layer['id']}.wav"
        sf.write(raw, wav[0].detach().cpu().numpy(), model.sample_rate)
        master = out / f"layer_{layer['id']}.wav"
        master_layer(raw, master)
        mastered.append(master)
    bed = out / 'bed.wav'
    mix_bed(layers, mastered, duration, defaults, bed)
    (out / 'take.json').write_text(json.dumps({
        'job': job['id'], 'take': take, 'seed': seed, 'durationSec': duration, 'model': 'facebook/audiogen-medium',
        'musicGainDb': spec.get('musicGainDb', defaults['musicGainDb']),
        'bedGainDb': spec.get('bedGainDb', defaults['bedGainDb']), 'layers': layers
    }, indent=2) + '\n')
    print(f"[sound] {bed.relative_to(ROOT)} ({len(layers)} layers)", flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest='command', required=True)
    r = sub.add_parser('render')
    r.add_argument('jobs', nargs='+', help="job ids, or 'all'")
    r.add_argument('--seed', type=int)
    args = parser.parse_args()

    jobs = {job['id']: job for job in json.loads(JOBS.read_text())['jobs']}
    design = json.loads(LAYERS.read_text())
    ids = [job_id for job_id in jobs if job_id in design['jobs']] if args.jobs == ['all'] else args.jobs
    missing = [job_id for job_id in ids if job_id not in design['jobs']]
    if missing:
        raise SystemExit(f'no sound design for: {", ".join(missing)} (scripts/cinematics/sound-layers.json)')

    import torch
    from audiocraft.models import AudioGen
    device = 'cuda' if torch.cuda.is_available() else 'cpu'
    print(f'[sound] AudioGen medium on {device}', flush=True)
    model = AudioGen.get_pretrained('facebook/audiogen-medium', device=device)
    for job_id in ids:
        render(jobs[job_id], design['jobs'][job_id], design['defaults'], model, args.seed)


if __name__ == '__main__':
    sys.exit(main())
