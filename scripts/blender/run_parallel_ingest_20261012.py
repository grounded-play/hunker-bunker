#!/usr/bin/env python3
"""Run parallel ingestion of the 20 2026-10-12 assets + assembled guillotine door."""

import os
import shutil
import subprocess
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
BLENDER = os.environ.get('BLENDER_BIN') or shutil.which('blender') or '/snap/bin/blender'
SCRIPT = os.path.join(ROOT, 'scripts/blender/ingest_batch_20261012_master.py')

PROPS = [
    'barrier_ice_fractured',
    'barrier_ice_intact',
    'barrier_ice_melting',
    'base_cot_installed',
    'base_door_sealable_bulkhead',
    'base_o2_atmospheric_regulator',
    'base_o2_overhead_duct',
    'base_power_junction_box',
    'carry_field_cot_folded',
    'door_arch_guillotine_frame',
    'door_arch_guillotine_slab',
    'door_arch_guillotine_assembled',
    'ship_module_comms_transceiver',
    'ship_module_engine_manifold',
    'ship_module_life_support_core',
    'ship_module_navigation_core',
    'wall_macro_buttress_3',
    'wall_macro_straight_4',
    'weapon_flamethrower_case',
    'weapon_flamethrower_m70',
    'weapon_fuel_canister_heavy',
]

def process_item(name):
    t0 = time.time()
    env = os.environ.copy()
    env['HB_PROP'] = name
    cmd = [BLENDER, '-b', '-P', SCRIPT]
    res = subprocess.run(cmd, cwd=ROOT, env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    elapsed = time.time() - t0
    if res.returncode != 0:
        print(f"[FAIL] {name} ({elapsed:.1f}s):\n{res.stdout[-1200:]}")
        return False, name
    for line in res.stdout.splitlines():
        if '[ingest]' in line or '[articulate]' in line or '[OK]' in line:
            print(line)
    return True, name

def main():
    # Blender expands the source textures in memory; two workers keeps the
    # default safe on development machines while still cutting batch time.
    concurrency = max(1, int(sys.argv[1])) if len(sys.argv) > 1 else 2
    print(f"Starting parallel ingestion of {len(PROPS)} assets with {concurrency} workers...")
    t_start = time.time()
    with ThreadPoolExecutor(max_workers=concurrency) as pool:
        futures = {pool.submit(process_item, p): p for p in PROPS}
        successes = 0
        for f in as_completed(futures):
            ok, name = f.result()
            if ok:
                successes += 1
    total_time = time.time() - t_start
    print(f"Parallel ingestion complete: {successes}/{len(PROPS)} succeeded in {total_time:.1f}s.")

if __name__ == '__main__':
    main()
