#!/usr/bin/env python3
"""Run parallel ingestion of the interactive world expansion 3D models into public/3d/runtime/new3ds/."""

import os
import shutil
import subprocess
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
BLENDER = os.environ.get('BLENDER_BIN') or shutil.which('blender') or '/snap/bin/blender'
SCRIPT = os.path.join(ROOT, 'scripts/blender/ingest_expansion_60_glbs.py')
RAW_DIR = os.path.join(ROOT, 'art', 'raw')

ALL_60_PROPS = [
    'geo_steam_manifold_actuator', 'tallow_vaccine_alembic', 'hydro_mycelial_seed_vault',
    'tallow_irrigation_sluice_gate', 'tallow_apothecary_dryer_rack', 'geo_pressure_relief_siren',
    'meridian_optic_nerve_patchbay', 'substation_stepdown_transformer', 'meridian_servitor_recharge_cradle',
    'meridian_logic_core_drum', 'substation_breaker_interlock', 'meridian_soldering_hearth',
    'vesper_ordnance_disarm_table', 'vesper_trench_warning_klaxon', 'vesper_ballistic_chronograph',
    'vesper_mortar_loading_cradle', 'vesper_dogtag_retrieval_crypt', 'vesper_barricade_welding_rig',
    'corp_biometric_wall_safe', 'corp_quantum_ledger_podium', 'corp_compliance_choker_bench',
    'corp_asset_incinerator_chute', 'corp_cryo_transport_coffin', 'corp_executive_whisper_booth',
    'suture_flesh_mending_bath', 'suture_larval_nursery_urn', 'relay_harmonic_tuning_fork',
    'relay_acoustic_diaphragm', 'carapace_chitin_press', 'carapace_ossuary_anvil',
    'vass_translation_phonograph', 'vass_bio_centrifuge_rack', 'vass_neural_sync_helmet',
    'vass_hybrid_blood_synthesizer', 'vass_containment_bell_jar', 'vass_dissection_stereomicroscope',
    'tina_vocal_mimic_synthesizer', 'tina_pheromone_dispersal_vent', 'tina_cosmetic_skin_loom',
    'tina_forged_council_ballot_box', 'tina_shedding_cocoon_niche', 'tina_secret_distress_beacon',
    'chasm_seismic_geophone_station', 'chasm_cable_traversal_winch', 'chasm_abyss_sounding_mortar',
    'chasm_steam_whistle_buoy', 'chasm_hanging_cage_crane', 'chasm_geothermal_survey_transit',
    'scout_tachyon_radar_mast', 'scout_ejection_pod_chassis', 'tank_reactive_armor_forge',
    'tank_kinetic_ram_breech', 'engineer_magnetic_bottle_cell', 'engineer_robotic_welding_arm',
    'evac_avionics_gyro_gimbal', 'evac_cryo_hypergolic_manifold', 'evac_cabin_co2_scrubber',
    'evac_manual_abort_detonator', 'evac_cargo_ballast_scale', 'mothership_docking_umbilical_collar'
]

AVAILABLE_PROPS = [p for p in ALL_60_PROPS if os.path.exists(os.path.join(RAW_DIR, f'{p}.glb'))]

def process_item(name):
    t0 = time.time()
    env = os.environ.copy()
    env['HB_PROPS'] = name
    cmd = [BLENDER, '-b', '-P', SCRIPT]
    res = subprocess.run(cmd, cwd=ROOT, env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    elapsed = time.time() - t0
    if res.returncode != 0:
        print(f"[FAIL] {name} ({elapsed:.1f}s):\n{res.stdout[-1500:]}")
        return False, name
    for line in res.stdout.splitlines():
        if '[PROCESSED]' in line or '[SKIP]' in line:
            print(f"  {line} ({elapsed:.1f}s)")
    return True, name

def main():
    concurrency = max(1, int(sys.argv[1])) if len(sys.argv) > 1 else 8
    print(f"[IngestRunner] Processing {len(AVAILABLE_PROPS)} expansion models with {concurrency} parallel workers...")
    t_start = time.time()
    with ThreadPoolExecutor(max_workers=concurrency) as pool:
        futures = {pool.submit(process_item, p): p for p in AVAILABLE_PROPS}
        successes = 0
        for f in as_completed(futures):
            ok, name = f.result()
            if ok:
                successes += 1
    total_time = time.time() - t_start
    print(f"[IngestRunner] Complete: {successes}/{len(AVAILABLE_PROPS)} processed in {total_time:.1f}s.")

if __name__ == '__main__':
    main()
