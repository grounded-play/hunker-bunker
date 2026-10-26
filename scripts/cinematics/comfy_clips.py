#!/usr/bin/env python3
"""Render the game's missing motion clips on the local ComfyUI.

Jobs come from scripts/cinematics/clip-jobs.json (build-clip-jobs.mjs).
Everything runs on this machine against the ComfyUI server at
http://127.0.0.1:8188 with locally installed models:

  still   FLUX.2 klein 4B (distilled) first frame for a job without key art
  clip    image-to-video take: LTX-Video 2B 0.9.8 distilled (default, fits
          8 GB) or Wan 2.2 TI2V 5B (--model wan, slower, offloads)
  encode  a chosen take -> the runtime files (1280x720, 24 fps, VP9/Opus
          WebM + H.264/AAC MP4 + poster), music muxed from the job's track;
          --preview writes them beside the take for review instead
  status  what each job has: first frame, takes, encoded files

Takes and first frames are masters: they stay in art/source/cinematics/<job>/
(git-ignored). Only `encode` writes to public/. A clip is not live until its
registry entry says so (docs/cinematics-comfyui-pipeline.md).

Standard library only; needs ffmpeg/ffprobe on PATH.
"""

import argparse
import json
import math
import os
import random
import shutil
import subprocess
import sys
import time
import urllib.parse
import urllib.request
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
JOBS = ROOT / 'scripts/cinematics/clip-jobs.json'
MASTERS = ROOT / 'art/source/cinematics'
PUBLIC = ROOT / 'public'
COMFY = os.environ.get('HB_COMFY_URL', 'http://127.0.0.1:8188')
COMFY_ROOT = Path(os.environ.get('HB_COMFY_ROOT', str(Path.home() / 'Desktop/icecave/xpsr/ComfyUI')))
FPS = 24

MODELS = {
    'ltxv': {'size': (1024, 576), 'frames_step': 8},
    'wan': {'size': (1280, 704), 'frames_step': 4},
}


# ── ComfyUI API ─────────────────────────────────────────────────────────

def _request(path, data=None, headers=None, timeout=60):
    req = urllib.request.Request(f'{COMFY}{path}', data=data, headers=headers or {})
    with urllib.request.urlopen(req, timeout=timeout) as response:
        return response.read()


def comfy_json(path, payload=None, timeout=60):
    data = json.dumps(payload).encode() if payload is not None else None
    headers = {'Content-Type': 'application/json'} if payload is not None else {}
    return json.loads(_request(path, data, headers, timeout) or b'{}')


def upload_image(path):
    boundary = uuid.uuid4().hex
    name = f'hb_{path.stem}_{uuid.uuid4().hex[:6]}.png'
    body = b''.join([
        f'--{boundary}\r\nContent-Disposition: form-data; name="image"; filename="{name}"\r\n'.encode(),
        b'Content-Type: image/png\r\n\r\n', path.read_bytes(), b'\r\n',
        f'--{boundary}\r\nContent-Disposition: form-data; name="overwrite"\r\n\r\ntrue\r\n'.encode(),
        f'--{boundary}--\r\n'.encode(),
    ])
    result = json.loads(_request('/upload/image', body, {'Content-Type': f'multipart/form-data; boundary={boundary}'}))
    return result['name']


def run_workflow(workflow, label):
    queued = comfy_json('/prompt', {'prompt': workflow, 'client_id': f'hb-cinematics-{uuid.uuid4().hex[:8]}'})
    prompt_id = queued['prompt_id']
    started = time.time()
    print(f'[comfy] {label}: queued {prompt_id}', flush=True)
    while True:
        time.sleep(5)
        history = comfy_json(f'/history/{prompt_id}')
        entry = history.get(prompt_id)
        if not entry:
            continue
        status = entry.get('status', {})
        if status.get('status_str') == 'error':
            messages = [m for m in status.get('messages', []) if m[0] == 'execution_error']
            raise RuntimeError(f'{label} failed: {json.dumps(messages)[:1200]}')
        if status.get('completed'):
            print(f'[comfy] {label}: done in {time.time() - started:.0f}s', flush=True)
            images = []
            for output in entry.get('outputs', {}).values():
                images.extend(output.get('images', []))
            return [COMFY_ROOT / ('output' if i['type'] == 'output' else i['type']) / i.get('subfolder', '') / i['filename'] for i in images]


# ── Workflows (API format, from ComfyUI's bundled templates) ────────────

def flux2_klein_still(prompt, seed, width=1280, height=720, prefix='hunker_cine/still'):
    return {
        '1': {'class_type': 'UNETLoader', 'inputs': {'unet_name': 'flux-2-klein-4b.safetensors', 'weight_dtype': 'default'}},
        '2': {'class_type': 'CLIPLoader', 'inputs': {'clip_name': 'qwen_3_4b.safetensors', 'type': 'flux2', 'device': 'default'}},
        '3': {'class_type': 'VAELoader', 'inputs': {'vae_name': 'flux2-vae.safetensors'}},
        '4': {'class_type': 'CLIPTextEncode', 'inputs': {'text': prompt, 'clip': ['2', 0]}},
        '5': {'class_type': 'ConditioningZeroOut', 'inputs': {'conditioning': ['4', 0]}},
        '6': {'class_type': 'CFGGuider', 'inputs': {'model': ['1', 0], 'positive': ['4', 0], 'negative': ['5', 0], 'cfg': 1.0}},
        '7': {'class_type': 'Flux2Scheduler', 'inputs': {'steps': 4, 'width': width, 'height': height}},
        '8': {'class_type': 'KSamplerSelect', 'inputs': {'sampler_name': 'euler'}},
        '9': {'class_type': 'RandomNoise', 'inputs': {'noise_seed': seed}},
        '10': {'class_type': 'EmptyFlux2LatentImage', 'inputs': {'width': width, 'height': height, 'batch_size': 1}},
        '11': {'class_type': 'SamplerCustomAdvanced', 'inputs': {'noise': ['9', 0], 'guider': ['6', 0], 'sampler': ['8', 0], 'sigmas': ['7', 0], 'latent_image': ['10', 0]}},
        '12': {'class_type': 'VAEDecode', 'inputs': {'samples': ['11', 0], 'vae': ['3', 0]}},
        '13': {'class_type': 'SaveImage', 'inputs': {'images': ['12', 0], 'filename_prefix': prefix}},
    }


def ltxv_i2v(image_name, prompt, negative, seed, frames, width, height, steps, prefix):
    return {
        '1': {'class_type': 'CheckpointLoaderSimple', 'inputs': {'ckpt_name': 'ltxv-2b-0.9.8-distilled-fp8.safetensors'}},
        '2': {'class_type': 'CLIPLoader', 'inputs': {'clip_name': 't5xxl_fp8_e4m3fn_scaled.safetensors', 'type': 'ltxv', 'device': 'default'}},
        '3': {'class_type': 'CLIPTextEncode', 'inputs': {'text': prompt, 'clip': ['2', 0]}},
        '4': {'class_type': 'CLIPTextEncode', 'inputs': {'text': negative, 'clip': ['2', 0]}},
        '5': {'class_type': 'LoadImage', 'inputs': {'image': image_name}},
        '6': {'class_type': 'LTXVImgToVideo', 'inputs': {'positive': ['3', 0], 'negative': ['4', 0], 'vae': ['1', 2], 'image': ['5', 0],
                                                         'width': width, 'height': height, 'length': frames, 'batch_size': 1, 'strength': 1.0}},
        '7': {'class_type': 'LTXVConditioning', 'inputs': {'positive': ['6', 0], 'negative': ['6', 1], 'frame_rate': float(FPS)}},
        '8': {'class_type': 'LTXVScheduler', 'inputs': {'steps': steps, 'max_shift': 2.05, 'base_shift': 0.95, 'stretch': True, 'terminal': 0.1, 'latent': ['6', 2]}},
        '9': {'class_type': 'KSamplerSelect', 'inputs': {'sampler_name': 'euler'}},
        '10': {'class_type': 'SamplerCustom', 'inputs': {'model': ['1', 0], 'add_noise': True, 'noise_seed': seed, 'cfg': 1.0,
                                                         'positive': ['7', 0], 'negative': ['7', 1], 'sampler': ['9', 0], 'sigmas': ['8', 0], 'latent_image': ['6', 2]}},
        '11': {'class_type': 'VAEDecodeTiled', 'inputs': {'samples': ['10', 0], 'vae': ['1', 2], 'tile_size': 512, 'overlap': 64, 'temporal_size': 64, 'temporal_overlap': 8}},
        '12': {'class_type': 'SaveImage', 'inputs': {'images': ['11', 0], 'filename_prefix': prefix}},
    }


def wan22_i2v(image_name, prompt, negative, seed, frames, width, height, steps, prefix):
    return {
        '1': {'class_type': 'UNETLoader', 'inputs': {'unet_name': 'wan2.2_ti2v_5B_fp16.safetensors', 'weight_dtype': 'default'}},
        '2': {'class_type': 'CLIPLoader', 'inputs': {'clip_name': 'umt5_xxl_fp8_e4m3fn_scaled.safetensors', 'type': 'wan', 'device': 'default'}},
        '3': {'class_type': 'VAELoader', 'inputs': {'vae_name': 'wan2.2_vae.safetensors'}},
        '4': {'class_type': 'CLIPTextEncode', 'inputs': {'text': prompt, 'clip': ['2', 0]}},
        '5': {'class_type': 'CLIPTextEncode', 'inputs': {'text': negative, 'clip': ['2', 0]}},
        '6': {'class_type': 'LoadImage', 'inputs': {'image': image_name}},
        '7': {'class_type': 'Wan22ImageToVideoLatent', 'inputs': {'vae': ['3', 0], 'width': width, 'height': height, 'length': frames, 'batch_size': 1, 'start_image': ['6', 0]}},
        '8': {'class_type': 'ModelSamplingSD3', 'inputs': {'model': ['1', 0], 'shift': 8.0}},
        '9': {'class_type': 'KSampler', 'inputs': {'model': ['8', 0], 'seed': seed, 'steps': steps, 'cfg': 5.0, 'sampler_name': 'uni_pc', 'scheduler': 'simple',
                                                   'positive': ['4', 0], 'negative': ['5', 0], 'latent_image': ['7', 0], 'denoise': 1.0}},
        '10': {'class_type': 'VAEDecodeTiled', 'inputs': {'samples': ['9', 0], 'vae': ['3', 0], 'tile_size': 512, 'overlap': 64, 'temporal_size': 64, 'temporal_overlap': 8}},
        '11': {'class_type': 'SaveImage', 'inputs': {'images': ['10', 0], 'filename_prefix': prefix}},
    }


# ── Jobs and files ──────────────────────────────────────────────────────

def load_jobs():
    data = json.loads(JOBS.read_text())
    return data['style'], {job['id']: job for job in data['jobs']}


def job_dir(job_id):
    path = MASTERS / job_id
    path.mkdir(parents=True, exist_ok=True)
    return path


def run(cmd):
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)


def frame_count(duration, step):
    """Frames for `duration` seconds that the model accepts (step*k + 1)."""
    return int(math.ceil((duration * FPS - 1) / step)) * step + 1


def first_frame_for(job, size):
    """The job's first frame as a PNG cropped/scaled to the model's size."""
    folder = job_dir(job['id'])
    if job['firstFrame'].get('image'):
        source = PUBLIC / job['firstFrame']['image'].lstrip('/')
    else:
        chosen = folder / 'first_frame.png'
        if not chosen.exists():
            raise SystemExit(f"{job['id']}: no first frame yet; run `still {job['id']}` and copy the take you want to {chosen}")
        source = chosen
    out = folder / f'first_frame_{size[0]}x{size[1]}.png'
    width, height = size
    run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(source),
         '-vf', f'scale={width}:{height}:force_original_aspect_ratio=increase:flags=lanczos,crop={width}:{height}', '-frames:v', '1', str(out)])
    return out


def motion_prompt(style, job):
    ending = f" The shot ends on {job['lastFrame']}" if job.get('lastFrame') else ''
    return f"{job['action'].rstrip('. ')}.{ending} {style['motionSuffix']}"


def next_take(folder, prefix):
    taken = [int(p.stem.split('_')[-1]) for p in folder.glob(f'{prefix}_*.mp4') if p.stem.split('_')[-1].isdigit()]
    return max(taken, default=0) + 1


# ── Commands ────────────────────────────────────────────────────────────

def cmd_still(args):
    style, jobs = load_jobs()
    job = jobs[args.job]
    if not job['firstFrame'].get('prompt'):
        raise SystemExit(f"{job['id']} already has key art: {job['firstFrame']['image']}")
    folder = job_dir(job['id'])
    prompt = f"{style['prefix']} {job['firstFrame']['prompt']} {style['suffix']}"
    for _ in range(args.takes):
        seed = args.seed if args.seed is not None else random.randrange(2**31)
        frames = run_workflow(flux2_klein_still(prompt, seed, prefix=f"hunker_cine/{job['id']}_still"), f"{job['id']} still")
        index = len(list(folder.glob('still_*.png'))) + 1
        out = folder / f'still_{index}.png'
        shutil.copy(frames[0], out)
        out.with_suffix('.json').write_text(json.dumps({'job': job['id'], 'model': 'flux-2-klein-4b', 'seed': seed, 'prompt': prompt}, indent=2) + '\n')
        print(f'[still] {out.relative_to(ROOT)}')
    print(f"[still] pick one: cp {folder.relative_to(ROOT)}/still_<n>.png {folder.relative_to(ROOT)}/first_frame.png")


def cmd_clip(args):
    style, jobs = load_jobs()
    targets = list(jobs) if args.job == 'all' else [args.job]
    for job_id in targets:
        job = jobs[job_id]
        model = MODELS[args.model]
        width, height = model['size']
        folder = job_dir(job_id)
        try:
            image = upload_image(first_frame_for(job, (width, height)))
        except SystemExit as missing:
            print(f'[clip] skip: {missing}')
            continue
        frames = frame_count(min(job['durationSec'], args.max_seconds), model['frames_step'])
        seed = args.seed if args.seed is not None else random.randrange(2**31)
        prompt = motion_prompt(style, job)
        take = next_take(folder, f'take_{args.model}')
        prefix = f'hunker_cine/{job_id}_{args.model}_t{take}'
        builder = ltxv_i2v if args.model == 'ltxv' else wan22_i2v
        steps = args.steps or (8 if args.model == 'ltxv' else 20)
        started = time.time()
        pngs = sorted(run_workflow(builder(image, prompt, style['negative'], seed, frames, width, height, steps, prefix), f'{job_id} {args.model} take {take}'))
        out = folder / f'take_{args.model}_{take}.mp4'
        listing = folder / f'.frames_{take}.txt'
        listing.write_text(''.join(f"file '{p}'\nduration {1 / FPS:.6f}\n" for p in pngs))
        run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', str(listing), '-r', str(FPS),
             '-c:v', 'libx264', '-crf', '12', '-preset', 'slow', '-pix_fmt', 'yuv420p', str(out)])
        listing.unlink()
        sheet = out.with_suffix('.sheet.jpg')
        run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(out), '-vf', f'select=not(mod(n\\,{max(1, len(pngs) // 6)})),scale=480:-1,tile=6x1', '-frames:v', '1', str(sheet)])
        out.with_suffix('.json').write_text(json.dumps({
            'job': job_id, 'model': args.model, 'take': take, 'seed': seed, 'steps': steps, 'frames': len(pngs),
            'size': [width, height], 'prompt': prompt, 'negative': style['negative'], 'renderSeconds': round(time.time() - started)
        }, indent=2) + '\n')
        for png in pngs:
            png.unlink(missing_ok=True)
        print(f'[clip] {out.relative_to(ROOT)} ({len(pngs)} frames) sheet {sheet.relative_to(ROOT)}')


def cmd_encode(args):
    _, jobs = load_jobs()
    job = jobs[args.job]
    take = job_dir(job['id']) / f'{args.take}.mp4'
    if not take.exists():
        raise SystemExit(f'no take {take.relative_to(ROOT)}')
    duration = job['durationSec']
    audio = PUBLIC / job['audio'].lstrip('/')
    fade = max(0.0, duration - 0.8)
    video = 'scale=1280:720:flags=lanczos,fps=24,format=yuv420p'
    audio_filter = f'afade=t=in:d=0.3,afade=t=out:st={fade:.2f}:d=0.8'
    preview = job_dir(job['id']) / 'preview'
    for kind, target in job['targets'].items():
        out = (preview / f'{args.take}{Path(target).suffix}') if args.preview else PUBLIC / target.lstrip('/')
        out.parent.mkdir(parents=True, exist_ok=True)
        if kind == 'poster':
            run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(take), '-vf', 'scale=1280:720:flags=lanczos', '-frames:v', '1', '-q:v', '3', str(out)])
            continue
        codec = (['-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '33', '-row-mt', '1', '-c:a', 'libopus', '-b:a', '96k'] if kind == 'webm'
                 else ['-c:v', 'libx264', '-crf', '20', '-preset', 'slow', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart'])
        run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(take), '-i', str(audio), '-map', '0:v:0', '-map', '1:a:0',
             '-t', f'{duration}', '-vf', video, '-af', audio_filter, *codec, str(out)])
        print(f'[encode] {out.relative_to(ROOT)} ({out.stat().st_size // 1024} KB)')
    if not args.preview:
        print('[encode] the clip is not live until its registry entry lists it (docs/cinematics-comfyui-pipeline.md)')


def cmd_status(args):
    _, jobs = load_jobs()
    for job in jobs.values():
        folder = MASTERS / job['id']
        takes = sorted(p.stem for p in folder.glob('take_*.mp4')) if folder.exists() else []
        first = 'key art' if job['firstFrame'].get('image') else ('chosen' if (folder / 'first_frame.png').exists() else 'needs still')
        encoded = all((PUBLIC / t.lstrip('/')).exists() for t in job['targets'].values())
        print(f"{job['id']:<28} {job['kind']:<10} first frame: {first:<11} takes: {', '.join(takes) or '-':<30} encoded: {'yes' if encoded else 'no'}")


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest='command', required=True)
    s = sub.add_parser('still'); s.add_argument('job'); s.add_argument('--takes', type=int, default=3); s.add_argument('--seed', type=int)
    c = sub.add_parser('clip'); c.add_argument('job', help="a job id, or 'all'"); c.add_argument('--model', choices=sorted(MODELS), default='ltxv')
    c.add_argument('--seed', type=int); c.add_argument('--steps', type=int); c.add_argument('--max-seconds', type=float, default=8.0)
    e = sub.add_parser('encode'); e.add_argument('job'); e.add_argument('take', help='take file stem, e.g. take_ltxv_2')
    e.add_argument('--preview', action='store_true', help='write next to the take for review, not into public/')
    sub.add_parser('status')
    args = parser.parse_args()
    {'still': cmd_still, 'clip': cmd_clip, 'encode': cmd_encode, 'status': cmd_status}[args.command](args)


if __name__ == '__main__':
    sys.exit(main())
