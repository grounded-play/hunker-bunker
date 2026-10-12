#!/usr/bin/env python3
"""Run Blender prop ingestion in parallel across multiple worker processes for 2026-10-12 world story batch."""

import os
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
BLENDER = '/snap/bin/blender'
SCRIPT = os.path.join(ROOT, 'scripts/blender/ingest_world_story_props_20261012.py')

ALL_PROPS = [
    'corp_interrogation_chair',
    'corp_debt_severing_kiosk',
    'corp_dissection_gurney',
    'corp_executive_sarcophagus',
    'corp_incinerator_hopper',
    'corp_suppression_barrier',
    'meridian_cyber_graft_bench',
    'meridian_mainframe_altar',
    'meridian_capacitor_bomb',
    'meridian_servitor_dock',
    'tallow_compost_fermenter',
    'tallow_spore_cradle',
    'tallow_flesh_trellis',
    'tallow_sacrificial_altar',
    'vesper_amputation_rig',
    'vesper_autocannon_bipod',
    'vesper_hanging_cage',
    'vesper_reloading_station',
    'tina_molted_carapace',
    'tina_covert_nursery_chest',
    'tina_mimic_vanity',
    'tina_trophy_trove',
    'hive_visceral_ovipositor',
    'hive_vivisected_engineer',
    'hive_gestation_sac',
    'hive_pulmonary_bellows',
    'hive_amniotic_feeder_trough',
    'hive_sphincter_iris',
    'cryo_ruptured_pod',
    'cryo_cannibal_butchery_table',
    'cryo_ice_core_specimen',
    'cryo_thawing_trough',
    'cryo_frozen_shelter_pod',
    'chasm_hanging_elevator',
    'chasm_suicide_ledge_cross',
    'chasm_dredge_hook_crane',
    'ind_biomass_grinder',
    'ind_hydraulic_manifold',
    'ind_fuel_rod_cask',
    'crash_cockpit_canopy',
]


def process_prop(name):
    dest = os.path.join(ROOT, 'public/3d/runtime/new3ds', f'{name}.glb')
    # If already built and small, skip if desired, or re-run
    if os.path.exists(dest) and os.path.getsize(dest) < 15_000_000:
        # Check if already processed
        print(f"[SKIP] {name} already exists ({os.path.getsize(dest) / 1e6:.2f} MB)")
        return True, name

    env = os.environ.copy()
    env['HB_PROPS'] = name
    cmd = [BLENDER, '-b', '-P', SCRIPT]
    res = subprocess.run(cmd, cwd=ROOT, env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    if res.returncode != 0:
        print(f"[FAIL] {name}:\n{res.stdout[-1000:]}")
        return False, name
    # Print the summary line from stdout if available
    for line in res.stdout.splitlines():
        if '[world-story]' in line:
            print(line)
    print(f"[OK] {name} completed")
    return True, name


def main():
    concurrency = int(sys.argv[1]) if len(sys.argv) > 1 else 8
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
