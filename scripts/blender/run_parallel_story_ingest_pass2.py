#!/usr/bin/env python3
"""Run Blender prop ingestion in parallel across multiple worker processes for 2026-10-12 world story pass 2 batch."""

import os
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
BLENDER = '/snap/bin/blender'
SCRIPT = os.path.join(ROOT, 'scripts/blender/ingest_world_story_props_pass2.py')

ALL_PROPS = [
    'bay_c_pod_312_rupture',
    'carapace_sentry_chrysalis',
    'chen_sealed_confession_console',
    'corp_biometric_collar_chute',
    'crawler_signal_antenna_rig',
    'decon_exosuit_scrubber_station',
    'engineer_wave_relay_dynamo',
    'evac_four_seat_cockpit_module',
    'evac_manifest_allocation_terminal',
    'evac_preflight_fuel_umbilical',
    'queen_royal_brood_throne',
    'relay_false_beacon_spire',
    'royal_egg_clutch_caul',
    'scout_tracking_beacon_core',
    'sector_zero_bore_drillhead',
    'suture_mercy_cocoon_canopy',
    'tank_orbital_siege_cannon',
    'vass_acoustic_resonator_tank',
    'vass_hybrid_embryo_incubator',
]


def process_prop(name):
    dest = os.path.join(ROOT, 'public/3d/runtime/new3ds', f'{name}.glb')
    if os.path.exists(dest) and os.path.getsize(dest) < 15_000_000:
        print(f"[SKIP] {name} already exists ({os.path.getsize(dest) / 1e6:.2f} MB)")
        return True, name

    env = os.environ.copy()
    env['HB_PROPS'] = name
    cmd = [BLENDER, '-b', '-P', SCRIPT]
    res = subprocess.run(cmd, cwd=ROOT, env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    if res.returncode != 0:
        print(f"[FAIL] {name}:\n{res.stdout[-1000:]}")
        return False, name
    for line in res.stdout.splitlines():
        if '[world-story-pass2]' in line:
            print(line)
    print(f"[OK] {name} completed")
    return True, name


def main():
    concurrency = int(sys.argv[1]) if len(sys.argv) > 1 else 10
    print(f"Starting ingestion of {len(ALL_PROPS)} props with concurrency {concurrency}...")
    with ThreadPoolExecutor(max_workers=concurrency) as pool:
        futures = {pool.submit(process_prop, name): name for name in ALL_PROPS}
        successes = 0
        for f in as_completed(futures):
            ok, name = f.result()
            if ok:
                successes += 1
    print(f"Done: {successes}/{len(ALL_PROPS)} props successfully ingested.")


if __name__ == '__main__':
    main()
