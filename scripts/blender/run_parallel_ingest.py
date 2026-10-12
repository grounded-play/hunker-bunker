#!/usr/bin/env python3
"""Run Blender prop ingestion in parallel across multiple worker processes."""

import os
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
BLENDER = '/snap/bin/blender'
SCRIPT = os.path.join(ROOT, 'scripts/blender/ingest_world_completion_props_20261011.py')

ALL_PROPS = [
    'camp_canvas_tent',
    'camp_water_barrel',
    'chasm_beacon_post',
    'chasm_broken_catwalk',
    'chasm_gondola',
    'chasm_rappel_anchor',
    'crash_drag_chute',
    'crash_engine_nacelle',
    'crash_hull_panels',
    'cryo_frozen_cascade',
    'cryo_heater_station',
    'cryo_ice_blocks',
    'cryo_ice_crawler',
    'cryo_snowbound_crates',
    'hive_assimilated_generator',
    'hive_brood_dome',
    'hive_cocooned_crew',
    'hive_pheromone_node',
    'hive_resin_pillar',
    'hive_tendril_arch',
    'life_algae_tank',
    'life_arcade_cabinet',
    'life_cistern_tank',
    'life_conveyor_section',
    'life_filing_cabinets',
    'life_fire_station',
    'life_forklift',
    'life_laundry_machines',
    'life_overseer_desk',
    'life_pallet_racking',
    'life_planning_board',
    'life_scaffold_tower',
    'life_server_racks',
    'life_shower_stall',
    'life_sink_row',
    'life_surgical_lamp',
    'life_transformer_bank',
    'life_weight_bench',
    'salvage_tagged_heap',
]


def process_prop(name):
    env = os.environ.copy()
    env['HB_PROPS'] = name
    cmd = [BLENDER, '-b', '-P', SCRIPT]
    res = subprocess.run(cmd, cwd=ROOT, env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    if res.returncode != 0:
        print(f"[FAIL] {name}:\n{res.stdout[-1000:]}")
        return False, name
    print(f"[OK] {name} completed")
    return True, name


def main():
    concurrency = int(sys.argv[1]) if len(sys.argv) > 1 else 6
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
