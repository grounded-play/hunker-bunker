#!/usr/bin/env python3
"""Batch render and encode opening cinematic intros (flight and crash sequences)."""

import argparse
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))
import comfy_clips as c

OPENINGS = [
    'opening-launch-scout',
    'opening-launch-tank',
    'opening-launch-engineer',
    'opening-flight-scout',
    'opening-flight-tank',
    'opening-flight-engineer',
    'opening-crash-scout',
    'opening-crash-tank',
    'opening-crash-engineer',
]

def render_and_encode(model='ltxv'):
    print(f"=== Rendering and Encoding Opening Intros ({model}) ===", flush=True)
    for idx, job_id in enumerate(OPENINGS):
        folder = c.job_dir(job_id)
        takes = sorted(folder.glob(f'take_{model}_*.mp4'), key=lambda p: int(p.stem.split('_')[-1]))
        if not takes:
            print(f"\n[{idx+1}/{len(OPENINGS)}] Rendering video take for {job_id}...", flush=True)
            c.cmd_clip(argparse.Namespace(
                job=job_id, model=model, seed=8800 + idx, steps=None, max_seconds=None, lora=None, prompt_extra=None
            ))
            takes = sorted(folder.glob(f'take_{model}_*.mp4'), key=lambda p: int(p.stem.split('_')[-1]))
        
        if takes:
            take_stem = takes[-1].stem
            print(f"[{idx+1}/{len(OPENINGS)}] Encoding {job_id} ({take_stem}) -> public/cutscenes/...", flush=True)
            c.cmd_encode(argparse.Namespace(
                job=job_id, take=take_stem, preview=False, sound=None, no_sound=True, no_end_lock=False
            ))
        else:
            print(f"ERROR: Could not generate take for {job_id}", flush=True)

if __name__ == '__main__':
    start = time.time()
    render_and_encode('ltxv')
    print(f"\n[DONE] Finished in {(time.time() - start)/60:.1f} minutes", flush=True)
