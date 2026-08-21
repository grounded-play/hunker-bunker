# Asset, Season, Loading, and Presentation Completion Plan

Date: 2026-08-21  
Scope: Season 0 rewards, runtime 3D assets, 2D decals/icons, shaders, HUD themes, debug showroom, and loading behavior.

## Objectives

- Keep authoring files out of the shipped media tree while preserving repeatable conversion workflows.
- Ensure every Season 0 reward has a catalog record, unlock path, and honest 2D/3D readiness status.
- Make the two unique cosmetic effects materially different in-game: tracer behavior, muzzle FX, and HUD presentation.
- Add enough loading telemetry to identify cache hits, slow assets, and failed asset groups in development.
- Preserve decals as 2D content and make the debug showroom a deliberate, debug-only inspection surface.

## Work plan

### 1. Release-boundary cleanup

- [x] Move FBX authoring sources out of `public/3d/`.
- [x] Update Blender conversion scripts and documentation to use the authoring directory.
- [x] Rebuild and confirm no FBX reaches `dist/`.
- [x] Keep all runtime GLBs referenced by the game and flag only genuinely unused files.

### 2. Catalog and unlock reconciliation

- [x] Add metadata for all achievement cosmetics, including the five still missing source GLBs.
- [x] Make achievement cosmetics discoverable in the local catalog fallback and grant them when the achievement unlock event fires.
- [ ] Keep missing 3D models and missing unique 2D art visibly marked as pending, not silently substituted as complete.
- [ ] Recheck Season Pass, Steam Vault, loadout, and armory mappings against one item-definition source of truth.

### 3. Shader, FX, and HUD differentiation

- [x] Add a shader-driven emerald tracer ribbon for the Echo-Location Transceiver.
- [x] Add a readable cryogenic muzzle shockwave/shard treatment for the Symbiotic Adrenaline Pump.
- [x] Expand amber CRT and emerald radar HUD themes beyond one color variable, including panel, border, grid, and warning treatments.
- [ ] Add focused tests for cosmetic effect selection and theme application.

### 4. Loading and presentation diagnostics

- [x] Add development asset-load telemetry for cache hits, durations, failures, and asset groups.
- [ ] Surface a compact debug loading report without changing release UI.
- [x] Verify the debug showroom remains explicit-only and enters through the existing door transition.
- [ ] Verify community skin metadata, companion hooks, armory previews, and runtime GLB paths remain aligned.

### 5. Art and asset follow-up

- [x] Preserve decals as 2D and keep their debug wall layout/alignment coverage.
- [ ] Generate or commission unique achievement/community icons only after the visual anchor is confirmed.
- [ ] Create the five missing achievement 3D source models and convert them to GLB.
- [ ] Review oversized community GLBs for production compression/LOD before shipping them broadly.

## Acceptance checks

- `npm test -- --run`
- `npm run steam:audit-inventory-assets`
- `npm run build`
- `npm run lint` (existing unrelated lint failures must be recorded separately)
- `rg --files public dist | rg '\\.fbx$'` returns no release-boundary files.
- Final audit records completed items and remaining source-art blockers.

## Current known blockers

- Achievement itemdefs 5001, 5002, 5006, 5009, and 5010 still need source 3D models.
- Achievement and community entries still need bespoke 2D presentation art rather than class-base fallback icons.
- Community runtime GLBs are large and need an intentional compression/LOD pass before broad preload.
