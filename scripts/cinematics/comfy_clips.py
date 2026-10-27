#!/usr/bin/env python3
"""Render the game's missing motion clips on the local ComfyUI.

Jobs come from scripts/cinematics/clip-jobs.json (build-clip-jobs.mjs).
Everything runs on this machine against the ComfyUI server at
http://127.0.0.1:8188 with locally installed models:

  still   first-frame candidates: FLUX.2 klein 4B guided by
          the player class reference image, or Z-Image Turbo (--model zimage,
          text only)
  last    last-frame candidates guided by the approved first frame and the
          same player reference; the chosen endpoint is last_frame.png
  clip    image-to-video take: LTX-Video 2B 0.9.8 distilled (default, fits
          8 GB) or Wan 2.2 TI2V 5B (--model wan, slower, offloads)
  sound   layered sound design for a job (AudioGen; scripts/cinematics/
          sound_layers.py in the AudioCraft venv, sound-layers.json)
  encode  a chosen take -> the runtime files (1280x720, 24 fps, VP9/Opus
          WebM + H.264/AAC MP4 + poster): the job's music with the newest
          sound bed under it; --preview writes them beside the take instead
  make    clip + sound + preview encode: one full clip to review
  batch   every job not live yet: sound beds, then takes back to back, each
          encoded into public/ and shipped as it lands
  status  what each job has: first frame, takes, encoded files

Takes and first frames are masters: they stay in art/source/cinematics/<job>/
(git-ignored). Only `encode` writes to public/, and it adds the job to
src/cinematics/shippedMotionClips.js, which makes the game play the clip
(docs/cinematics-comfyui-pipeline.md).

Standard library only; needs ffmpeg/ffprobe on PATH.
"""

import argparse
import json
import math
import os
import random
import re
import shutil
import subprocess
import time
import urllib.parse
import urllib.request
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
JOBS = ROOT / 'scripts/cinematics/clip-jobs.json'
MASTERS = ROOT / 'art/source/cinematics'
PUBLIC = ROOT / 'public'
SHIPPED = ROOT / 'src/cinematics/shippedMotionClips.js'
COMFY = os.environ.get('HB_COMFY_URL', 'http://127.0.0.1:8188')
COMFY_ROOT = Path(os.environ.get('HB_COMFY_ROOT', str(Path.home() / 'Desktop/icecave/xpsr/ComfyUI')))
AUDIOCRAFT_PY = os.environ.get('HB_AUDIOCRAFT_PY', str(Path.home() / 'tools/audiocraft/.venv/bin/python'))
FPS = 24

MODELS = {
    'ltxv': {'size': (1024, 576), 'frames_step': 8, 'max_seconds': 8.0},
    'wan': {'size': (1280, 704), 'frames_step': 4, 'max_seconds': 5.0},  # trained on 121 frames
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


def run_workflow(workflow, label, front=False):
    """Queue a workflow and wait for its images; `front` jumps a running batch's queue."""
    queued = comfy_json('/prompt', {'prompt': workflow, 'client_id': f'hb-cinematics-{uuid.uuid4().hex[:8]}', 'front': front})
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

def flux2_klein_still(prompt, seed, width=1280, height=720, prefix='hunker_cine/still', references=()):
    """Text-to-image, or reference-guided when `references` (uploaded image names) are given."""
    workflow = {
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
    positive = ['4', 0]
    for index, name in enumerate(references):
        node = f'r{index}'
        workflow[f'{node}_load'] = {'class_type': 'LoadImage', 'inputs': {'image': name}}
        workflow[f'{node}_scale'] = {'class_type': 'ImageScaleToTotalPixels', 'inputs': {'image': [f'{node}_load', 0], 'upscale_method': 'lanczos', 'megapixels': 1.0, 'resolution_steps': 16}}
        workflow[f'{node}_latent'] = {'class_type': 'VAEEncode', 'inputs': {'pixels': [f'{node}_scale', 0], 'vae': ['3', 0]}}
        workflow[f'{node}_ref'] = {'class_type': 'ReferenceLatent', 'inputs': {'conditioning': positive, 'latent': [f'{node}_latent', 0]}}
        positive = [f'{node}_ref', 0]
    workflow['6']['inputs']['positive'] = positive
    return workflow


def zimage_still(prompt, seed, width=1280, height=720, prefix='hunker_cine/still'):
    """Z-Image Turbo (Apache-2.0): fast text-only alternate, without references."""
    return {
        '1': {'class_type': 'UNETLoader', 'inputs': {'unet_name': 'z_image_turbo_int8_convrot.safetensors', 'weight_dtype': 'default'}},
        '2': {'class_type': 'CLIPLoader', 'inputs': {'clip_name': 'qwen_3_4b.safetensors', 'type': 'lumina2', 'device': 'default'}},
        '3': {'class_type': 'VAELoader', 'inputs': {'vae_name': 'z_image_ae.safetensors'}},
        '4': {'class_type': 'CLIPTextEncode', 'inputs': {'text': prompt, 'clip': ['2', 0]}},
        '5': {'class_type': 'ConditioningZeroOut', 'inputs': {'conditioning': ['4', 0]}},
        '6': {'class_type': 'ModelSamplingAuraFlow', 'inputs': {'model': ['1', 0], 'shift': 3.0}},
        '7': {'class_type': 'EmptySD3LatentImage', 'inputs': {'width': width, 'height': height, 'batch_size': 1}},
        '8': {'class_type': 'KSampler', 'inputs': {'model': ['6', 0], 'seed': seed, 'steps': 8, 'cfg': 1.0, 'sampler_name': 'res_multistep', 'scheduler': 'simple',
                                                   'positive': ['4', 0], 'negative': ['5', 0], 'latent_image': ['7', 0], 'denoise': 1.0}},
        '9': {'class_type': 'VAEDecode', 'inputs': {'samples': ['8', 0], 'vae': ['3', 0]}},
        '10': {'class_type': 'SaveImage', 'inputs': {'images': ['9', 0], 'filename_prefix': prefix}},
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


def with_loras(workflow, loras):
    """Chain LoRAs (name, strength) after the UNETLoader in node '1' and rewire its users."""
    if not loras:
        return workflow
    if workflow['1']['class_type'] != 'UNETLoader':
        raise SystemExit('LoRAs need a UNETLoader workflow (flux, zimage, wan)')
    users = [inputs for inputs in (node['inputs'] for node in workflow.values()) if inputs]
    previous = ['1', 0]
    for index, (name, strength) in enumerate(loras):
        workflow[f'lora{index}'] = {'class_type': 'LoraLoaderModelOnly', 'inputs': {'model': previous, 'lora_name': name, 'strength_model': strength}}
        previous = [f'lora{index}', 0]
    for inputs in users:
        for key, value in inputs.items():
            if value == ['1', 0]:
                inputs[key] = previous
    return workflow


def parse_loras(values):
    """`--lora file.safetensors:0.8` (strength defaults to 1.0)."""
    loras = []
    for value in values or []:
        name, _, strength = value.partition(':')
        loras.append((name if name.endswith('.safetensors') else f'{name}.safetensors', float(strength or 1.0)))
    return loras


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


def first_frame_source(job):
    """Return the approved first-frame source before model-specific resizing."""
    folder = job_dir(job['id'])
    if job['firstFrame'].get('image'):
        return PUBLIC / job['firstFrame']['image'].lstrip('/')
    chosen = folder / 'first_frame.png'
    if not chosen.exists():
        raise SystemExit(f"{job['id']}: no first frame yet; run `still {job['id']}` and copy the take you want to {chosen}")
    return chosen


def first_frame_for(job, size):
    """The approved first frame cropped/scaled to the model's input size."""
    folder = job_dir(job['id'])
    source = first_frame_source(job)
    out = folder / f'first_frame_{size[0]}x{size[1]}.png'
    width, height = size
    run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(source),
         '-vf', f'scale={width}:{height}:force_original_aspect_ratio=increase:flags=lanczos,crop={width}:{height}', '-frames:v', '1', str(out)])
    return out


def motion_prompt(style, job):
    ending = f" The shot ends on {job['lastFrame']}" if job.get('lastFrame') else ''
    identity = f" {job['identityLock']}" if job.get('identityLock') else ''
    return (f"{style['prefix']} {job['action'].rstrip('. ')}.{ending}{identity} "
            f"{style['continuityLock']} {style['motionSuffix']} {style['suffix']}")


def frame_prompt(style, job, endpoint):
    """Compose scene content with the versioned house and identity locks."""
    scene = job['firstFrame']['prompt'] if endpoint == 'first' else job.get('lastFrame', '')
    identity = f" {job['identityLock']}" if job.get('identityLock') else ''
    continuity = f" {style['continuityLock']}" if endpoint == 'last' else ''
    return f"{style['prefix']} {scene} {style['suffix']}{identity}{continuity}".strip()


def next_take(folder, prefix):
    taken = [int(p.stem.split('_')[-1]) for p in folder.glob(f'{prefix}_*.mp4') if p.stem.split('_')[-1].isdigit()]
    return max(taken, default=0) + 1


# ── Commands ────────────────────────────────────────────────────────────

def reference_png(path):
    """A character reference flattened onto neutral grey (the masters are keyed RGBA)."""
    source = ROOT / path
    out = MASTERS / '_references' / f'{source.stem}.png'
    if not out.exists() or out.stat().st_mtime < source.stat().st_mtime:
        out.parent.mkdir(parents=True, exist_ok=True)
        run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'color=c=0x808080:s=16x16', '-i', str(source),
             '-filter_complex', '[0][1]scale2ref[bg][fg];[bg][fg]overlay=format=auto,format=rgb24', '-frames:v', '1', str(out)])
    return out


def cmd_still(args):
    style, jobs = load_jobs()
    job = jobs[args.job]
    if not job['firstFrame'].get('prompt'):
        raise SystemExit(f"{job['id']} already has key art: {job['firstFrame']['image']}")
    folder = job_dir(job['id'])
    prompt = frame_prompt(style, job, 'first')
    references = [upload_image(reference_png(path)) for path in job['firstFrame'].get('references', [])] if args.model == 'flux' else []
    loras = parse_loras(args.lora)
    if args.prompt_extra:
        prompt = f'{prompt} {args.prompt_extra}'
    for _ in range(args.takes):
        seed = args.seed if args.seed is not None else random.randrange(2**31)
        prefix = f"hunker_cine/{job['id']}_still"
        workflow = flux2_klein_still(prompt, seed, prefix=prefix, references=references) if args.model == 'flux' else zimage_still(prompt, seed, prefix=prefix)
        workflow = with_loras(workflow, loras)
        frames = run_workflow(workflow, f"{job['id']} still ({args.model})", front=True)
        index = len(list(folder.glob('still_*.png'))) + 1
        out = folder / f'still_{index}.png'
        shutil.copy(frames[0], out)
        out.with_suffix('.json').write_text(json.dumps({'job': job['id'], 'model': 'flux-2-klein-4b' if args.model == 'flux' else 'z-image-turbo',
                                                        'seed': seed, 'prompt': prompt, 'references': job['firstFrame'].get('references', []) if references else [],
                                                        'loras': loras}, indent=2) + '\n')
        print(f'[still] {out.relative_to(ROOT)}')
    print(f"[still] pick one: cp {folder.relative_to(ROOT)}/still_<n>.png {folder.relative_to(ROOT)}/first_frame.png")


def cmd_last(args):
    """Generate a designed endpoint while carrying first-frame composition and identity."""
    style, jobs = load_jobs()
    job = jobs[args.job]
    if not job.get('lastFrame'):
        raise SystemExit(f"{job['id']} has no last-frame brief")
    folder = job_dir(job['id'])
    prompt = frame_prompt(style, job, 'last')
    reference_paths = [first_frame_for(job, (1280, 720)), *[reference_png(path) for path in job['firstFrame'].get('references', [])]]
    references = [upload_image(path) for path in reference_paths] if args.model == 'flux' else []
    for _ in range(args.takes):
        seed = args.seed if args.seed is not None else random.randrange(2**31)
        prefix = f"hunker_cine/{job['id']}_last"
        workflow = flux2_klein_still(prompt, seed, prefix=prefix, references=references) if args.model == 'flux' else zimage_still(prompt, seed, prefix=prefix)
        workflow = with_loras(workflow, loras)
        frames = run_workflow(workflow, f"{job['id']} last ({args.model})", front=True)
        index = len(list(folder.glob('last_*.png'))) + 1
        out = folder / f'last_{index}.png'
        shutil.copy(frames[0], out)
        out.with_suffix('.json').write_text(json.dumps({
            'job': job['id'], 'endpoint': 'last', 'model': 'flux-2-klein-4b' if args.model == 'flux' else 'z-image-turbo',
            'seed': seed, 'prompt': prompt, 'references': [str(path.relative_to(ROOT)) for path in reference_paths]
        }, indent=2) + '\n')
        print(f'[last] {out.relative_to(ROOT)}')
    print(f"[last] pick one: cp {folder.relative_to(ROOT)}/last_<n>.png {folder.relative_to(ROOT)}/last_frame.png")


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
        frames = frame_count(min(job['durationSec'], args.max_seconds or model['max_seconds']), model['frames_step'])
        seed = args.seed if args.seed is not None else random.randrange(2**31)
        prompt = motion_prompt(style, job)
        take = next_take(folder, f'take_{args.model}')
        prefix = f'hunker_cine/{job_id}_{args.model}_t{take}'
        builder = ltxv_i2v if args.model == 'ltxv' else wan22_i2v
        steps = args.steps or (8 if args.model == 'ltxv' else 20)
        started = time.time()
        loras = parse_loras(getattr(args, 'lora', None)) or [tuple(entry) for entry in job.get('loras', {}).get(args.model, [])]
        if getattr(args, 'prompt_extra', None):
            prompt = f'{prompt} {args.prompt_extra}'
        pngs = sorted(run_workflow(with_loras(builder(image, prompt, style['negative'], seed, frames, width, height, steps, prefix), loras), f'{job_id} {args.model} take {take}'))
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
            'size': [width, height], 'prompt': prompt, 'negative': style['negative'], 'loras': loras, 'renderSeconds': round(time.time() - started)
        }, indent=2) + '\n')
        for png in pngs:
            png.unlink(missing_ok=True)
        print(f'[clip] {out.relative_to(ROOT)} ({len(pngs)} frames) sheet {sheet.relative_to(ROOT)}')


def probe_duration(path):
    out = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(path)],
                         check=True, capture_output=True, text=True).stdout.strip()
    return float(out)


def sound_take(job_id, name=None):
    """The chosen (or newest) AudioGen bed for a job, with its take.json."""
    folder = MASTERS / job_id / 'sound'
    takes = sorted((p for p in folder.glob('take_*') if (p / 'bed.wav').exists()), key=lambda p: int(p.name.split('_')[-1])) if folder.exists() else []
    if name:
        takes = [p for p in takes if p.name == name]
        if not takes:
            raise SystemExit(f'no sound {name} for {job_id}')
    return takes[-1] if takes else None


def audio_graph(duration, music_gain_db, with_bed, bed_gain_db=-5.0):
    """Music (job track) under the sound bed, both loudness-matched, then faded and limited."""
    fade = max(0.0, duration - 0.8)
    music = f'[1:a]atrim=0:{duration:.3f},asetpts=PTS-STARTPTS,loudnorm=I=-18:TP=-2,aresample=48000,volume={music_gain_db:.1f}dB'
    if not with_bed:
        return f'{music},afade=t=in:d=0.3,afade=t=out:st={fade:.2f}:d=0.8[aout]'
    bed = f'[2:a]atrim=0:{duration:.3f},asetpts=PTS-STARTPTS,loudnorm=I=-18:TP=-2,aresample=48000,volume={bed_gain_db:.1f}dB'
    return (f'{music}[m];{bed}[b];[m][b]amix=inputs=2:normalize=0:dropout_transition=0,'
            f'afade=t=in:d=0.3,afade=t=out:st={fade:.2f}:d=0.8,alimiter=limit=0.89[aout]')


def cmd_encode(args):
    _, jobs = load_jobs()
    job = jobs[args.job]
    take = job_dir(job['id']) / f'{args.take}.mp4'
    if not take.exists():
        raise SystemExit(f'no take {take.relative_to(ROOT)}')
    duration = min(float(job['durationSec']), probe_duration(take))
    music = PUBLIC / job['audio'].lstrip('/')
    bed_take = None if args.no_sound else sound_take(job['id'], args.sound)
    music_gain, bed_gain = 0.0, -5.0
    if bed_take:
        mix = json.loads((bed_take / 'take.json').read_text())
        music_gain = float(mix.get('musicGainDb', 0))
        bed_gain = float(mix.get('bedGainDb', -5))
    graph = audio_graph(duration, music_gain, bool(bed_take), bed_gain)
    sources = ['-i', str(take), '-i', str(music)] + (['-i', str(bed_take / 'bed.wav')] if bed_take else [])
    endpoint = job_dir(job['id']) / 'last_frame.png'
    endpoint_locked = endpoint.exists() and not getattr(args, 'no_end_lock', False)
    endpoint_index = 3 if bed_take else 2
    if endpoint_locked:
        sources += ['-loop', '1', '-t', f'{duration:.3f}', '-i', str(endpoint)]
        blend = min(0.5, duration / 4)
        video_graph = (f'[0:v]scale=1280:720:flags=lanczos,fps=24,format=yuv420p,settb=AVTB[motion];'
                       f'[{endpoint_index}:v]scale=1280:720:force_original_aspect_ratio=increase:flags=lanczos,'
                       f'crop=1280:720,fps=24,format=yuv420p,settb=AVTB[end];'
                       f'[motion][end]xfade=transition=fade:duration={blend:.3f}:offset={duration - blend:.3f}[vout]')
    else:
        video_graph = '[0:v]scale=1280:720:flags=lanczos,fps=24,format=yuv420p[vout]'
    preview = job_dir(job['id']) / 'preview'
    label = f"{args.take}{'_' + bed_take.name if bed_take else ''}"
    for kind, target in job['targets'].items():
        out = (preview / f'{label}{Path(target).suffix}') if args.preview else PUBLIC / target.lstrip('/')
        out.parent.mkdir(parents=True, exist_ok=True)
        if kind == 'poster':
            run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(take), '-vf', 'scale=1280:720:flags=lanczos', '-frames:v', '1', '-q:v', '3', str(out)])
            continue
        codec = (['-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '33', '-row-mt', '1', '-c:a', 'libopus', '-b:a', '128k'] if kind == 'webm'
                 else ['-c:v', 'libx264', '-crf', '20', '-preset', 'slow', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart'])
        run(['ffmpeg', '-y', '-loglevel', 'error', *sources, '-filter_complex', f'{video_graph};{graph}',
             '-map', '[vout]', '-map', '[aout]', '-t', f'{duration:.3f}', *codec, str(out)])
        endpoint_note = ', approved last frame' if endpoint_locked else ''
        print(f'[encode] {out.relative_to(ROOT)} ({out.stat().st_size // 1024} KB, {"music + " + bed_take.name if bed_take else "music only"}{endpoint_note})')
    if not args.preview:
        mark_shipped(job['id'])
        print(f"[encode] {job['id']} is live ({SHIPPED.relative_to(ROOT)})")


def shipped_ids():
    return set(re.findall(r"^    '([^']+)',$", SHIPPED.read_text(), re.M))


def mark_shipped(job_id):
    """List the job in shippedMotionClips.js so its registry entry plays the clip."""
    body = ''.join(f"    '{job_id}',\n" for job_id in sorted(shipped_ids() | {job_id}))
    SHIPPED.write_text(re.sub(r'new Set\(\[\n.*?\]\)\);', lambda _: f'new Set([\n{body}]));', SHIPPED.read_text(), flags=re.S))


def free_comfy_vram():
    """AudioGen shares the 8 GB card: unload ComfyUI's models when its queue is empty."""
    try:
        queue = comfy_json('/queue')
        if not queue.get('queue_running') and not queue.get('queue_pending'):
            comfy_json('/free', {'unload_models': True, 'free_memory': True})
    except OSError:
        pass


def cmd_sound(args):
    free_comfy_vram()
    command = [AUDIOCRAFT_PY, str(ROOT / 'scripts/cinematics/sound_layers.py'), 'render', args.job]
    if args.seed is not None:
        command += ['--seed', str(args.seed)]
    subprocess.run(command, check=True)


def cmd_make(args):
    """One full clip: a video take, a sound bed, and the finished preview encode."""
    cmd_clip(argparse.Namespace(job=args.job, model=args.model, seed=args.seed, steps=None, max_seconds=args.max_seconds))
    cmd_sound(argparse.Namespace(job=args.job, seed=args.seed))
    folder = job_dir(args.job)
    newest = max(folder.glob(f'take_{args.model}_*.mp4'), key=lambda p: int(p.stem.split('_')[-1]))
    cmd_encode(argparse.Namespace(job=args.job, take=newest.stem, preview=True, sound=None, no_sound=False))


def cmd_batch(args):
    """Sound beds first (one AudioGen load), then takes back to back, each shipped as it lands."""
    _, jobs = load_jobs()
    targets = [job_id for job_id in (args.jobs or list(jobs)) if args.redo or job_id not in shipped_ids()]
    unscored = [job_id for job_id in targets if not sound_take(job_id)]
    if unscored:
        free_comfy_vram()
        subprocess.run([AUDIOCRAFT_PY, str(ROOT / 'scripts/cinematics/sound_layers.py'), 'render', *unscored], check=True)
    for job_id in targets:
        folder = job_dir(job_id)
        takes = sorted(folder.glob(f'take_{args.model}_*.mp4'), key=lambda p: int(p.stem.split('_')[-1]))
        if not takes or args.redo:
            cmd_clip(argparse.Namespace(job=job_id, model=args.model, seed=None, steps=None, max_seconds=args.max_seconds))
            takes = sorted(folder.glob(f'take_{args.model}_*.mp4'), key=lambda p: int(p.stem.split('_')[-1]))
        if not takes:
            continue
        cmd_encode(argparse.Namespace(job=job_id, take=takes[-1].stem, preview=False, sound=None, no_sound=False))


def cmd_status(args):
    _, jobs = load_jobs()
    for job in jobs.values():
        folder = MASTERS / job['id']
        takes = sorted(p.stem for p in folder.glob('take_*.mp4')) if folder.exists() else []
        first = 'key art' if job['firstFrame'].get('image') else ('chosen' if (folder / 'first_frame.png').exists() else 'needs still')
        last = 'chosen' if (folder / 'last_frame.png').exists() else 'needs still'
        encoded = all((PUBLIC / t.lstrip('/')).exists() for t in job['targets'].values())
        sound = sound_take(job['id'])
        print(f"{job['id']:<28} {job['kind']:<10} first: {first:<11} last: {last:<11} takes: {', '.join(takes) or '-':<30} sound: {sound.name if sound else '-':<8} encoded: {'yes' if encoded else 'no'}")


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest='command', required=True)
    s = sub.add_parser('still'); s.add_argument('job'); s.add_argument('--takes', type=int, default=3); s.add_argument('--seed', type=int)
    s.add_argument('--model', choices=['flux', 'zimage'], default='flux', help='flux: FLUX.2 klein with the class reference; zimage: Z-Image Turbo, text only')
    s.add_argument('--lora', action='append', help='models/loras file[:strength], repeatable')
    s.add_argument('--prompt-extra', help='words appended to the frame prompt (e.g. a LoRA trigger)')
    last = sub.add_parser('last'); last.add_argument('job'); last.add_argument('--takes', type=int, default=3); last.add_argument('--seed', type=int)
    last.add_argument('--model', choices=['flux', 'zimage'], default='flux', help='flux preserves first-frame and character references; zimage is text only')
    c = sub.add_parser('clip'); c.add_argument('job', help="a job id, or 'all'"); c.add_argument('--model', choices=sorted(MODELS), default='ltxv')
    c.add_argument('--seed', type=int); c.add_argument('--steps', type=int); c.add_argument('--max-seconds', type=float)
    c.add_argument('--lora', action='append', help="models/loras file[:strength], repeatable (default: the job's loras)")
    c.add_argument('--prompt-extra', help='words appended to the motion prompt (e.g. a LoRA trigger)')
    e = sub.add_parser('encode'); e.add_argument('job'); e.add_argument('take', help='take file stem, e.g. take_ltxv_2')
    e.add_argument('--preview', action='store_true', help='write next to the take for review, not into public/')
    e.add_argument('--sound', help='sound take to lay under the music, e.g. take_2 (default: newest)')
    e.add_argument('--no-sound', action='store_true', help='music only')
    e.add_argument('--no-end-lock', action='store_true', help='do not blend to an approved last_frame.png endpoint')
    so = sub.add_parser('sound'); so.add_argument('job', help="a job id, or 'all'"); so.add_argument('--seed', type=int)
    m = sub.add_parser('make'); m.add_argument('job'); m.add_argument('--model', choices=sorted(MODELS), default='ltxv')
    m.add_argument('--seed', type=int); m.add_argument('--max-seconds', type=float)
    b = sub.add_parser('batch'); b.add_argument('jobs', nargs='*', help='job ids (default: every job not live yet)')
    b.add_argument('--model', choices=sorted(MODELS), default='wan'); b.add_argument('--max-seconds', type=float)
    b.add_argument('--redo', action='store_true', help='render a new take even if the job has one or is live')
    sub.add_parser('status')
    args = parser.parse_args()
    {'still': cmd_still, 'last': cmd_last, 'clip': cmd_clip, 'encode': cmd_encode, 'sound': cmd_sound, 'make': cmd_make, 'batch': cmd_batch, 'status': cmd_status}[args.command](args)


if __name__ == '__main__':
    main()
