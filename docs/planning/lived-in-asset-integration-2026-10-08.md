# Lived-in asset integration — 2026-10-08

Source plan: `docs/planning/cutscene-and-lived-in-asset-prompts-2026-10-08.md`.

## Delivered

- `sleep-bunker` is installed as MP4, VP9/Opus WebM, and poster art under `public/cutscenes/`; bunker rests now select the film instead of the night-card fallback.
- All 40 `life_*.glb` uploads are retained as ignored authoring masters in `art/source/3d/raw-masters-2026-10-08/`.
- `scripts/blender/ingest_lived_in_props_20261008.py` produces the 40 runtime GLBs in `public/3d/runtime/new3ds/` at their prompt-sheet 3k–8k triangle budgets and 1024px texture cap.
- The runtime batch is 32 MB total, reduced from 1.8 GB of source exports.
- Every prop is registered in `WORLD_3D_MODELS`. Props with two authored dimensions use independent vertical and horizontal fitting so both their stated height and footprint hold in world metres.
- Room dressing distributes the props across bunker, cryo, bio, camp, cathedral, medical, security, armory, storage, and engineering contexts. The three survivor camps receive their faction-specific sets plus the shared daily-life layer.
- Lived-in props are destructible dressing. Navigation-validated vignette anchors are solid; perimeter dressing stays nonblocking to preserve room reachability.
- Eligible heaters, lamps, censers, stills, and hearths feed at most one practical per room into the existing environment-light pool.
- All 40 props are included in the debug showroom catalog.

## Verification

- Parsed all 40 runtime GLBs and confirmed 226,998 total triangles against the requested per-model budgets.
- Browser-loaded all 40 through `createWorld3dModel` with no GLTF or console errors.
- Captured a 40-model contact sheet at runtime-normalized dimensions and visually checked grounding, textures, silhouettes, and relative scale.
- Passed 61 focused Vitest checks covering catalog paths, dimensions, room budgets/reachability, camp dressing, practical lights, and prop behavior.
- Passed ESLint and `git diff --check` on the integration files.

## Commits

- `caf6aeaa` — bunker sleep film and fallbacks.
- `f062c2fb` — optimized lived-in runtime asset batch and reproducible ingest pipeline.
