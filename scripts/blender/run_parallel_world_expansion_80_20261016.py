#!/usr/bin/env python3
"""Run isolated Blender ingests for the World Expansion 80 cohort."""

import os
import re
import shutil
import subprocess
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
BLENDER = os.environ.get('BLENDER_BIN') or shutil.which('blender') or '/snap/bin/blender'
SCRIPT = os.path.join(ROOT, 'scripts/blender/ingest_world_expansion_80_20261016.py')
MANIFEST = os.path.join(ROOT, 'src/data/worldExpansion80.js')


def ids():
    text = open(MANIFEST, encoding='utf8').read()
    return re.search(r'WORLD_EXPANSION_80_IDS\s*=\s*Object\.freeze\(`(.*?)`\.trim', text, re.S).group(1).split()


def run_one(name):
    started = time.time()
    env = os.environ.copy()
    env['HB_PROPS'] = name
    result = subprocess.run([BLENDER, '-b', '-P', SCRIPT], cwd=ROOT, env=env,
                            stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    summary = next((line for line in reversed(result.stdout.splitlines()) if '[PROCESSED]' in line or '[SKIP]' in line), '')
    return name, result.returncode, time.time() - started, summary, result.stdout[-2000:]


def main():
    workers = int(sys.argv[1]) if len(sys.argv) > 1 else 4
    selected = ids()
    print(f'[world80-ingest] {len(selected)} models, {workers} workers')
    passed = 0
    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = [pool.submit(run_one, name) for name in selected]
        for future in as_completed(futures):
            name, code, elapsed, summary, tail = future.result()
            if code == 0 and summary.startswith('[PROCESSED]'):
                passed += 1
                print(f'  {summary} ({elapsed:.1f}s)')
            else:
                print(f'[FAIL] {name} ({elapsed:.1f}s)\n{tail}')
    print(f'[world80-ingest] complete {passed}/{len(selected)}')
    raise SystemExit(0 if passed == len(selected) else 1)


if __name__ == '__main__':
    main()
