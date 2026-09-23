# Armory Asset Gaps

Status: generated | Updated: 2026-09-23
| Regenerate: `npm run audit:armory-assets`

Uses the same item lists and preview resolver as the Armory. Model paths are
checked on disk. Transparent model renders replace the previous shared chassis
pictures and green-backed icons; source artwork is retained unchanged.

| Check | Count |
| --- | ---: |
| Items offered | 123 |
| **No name** (renders as a bare itemdef id) | **0** |
| **No icon on disk** (tile falls back to initials) | **0** |
| Missing required 3D model | 0 |
| **Offered chassis without a valid skin binding** | **0** |
| Pending achievement weapons hidden from picker | 4 |
| Existing model needs visual replacement | 1 |
| **Icon looks like an un-keyed green screen** (≥35% green) | **0** |

## 1. Missing names — needs a catalog entry

_None._

## 2. Missing icons — needs art

_None._

## 3. Green-screen icons — needs re-keying

These still carry a chroma backdrop. Some are on the chroma allowlist, which
suppresses the presubmit failure but does **not** make them look right on a
tile — an allowlisted entry here still needs the background removed.

_None._

## 4. Missing required 3D models

These rewards use the factory model until a unique model is authored. Their
previews are existing achievement emblems, not pictures of invented equipment.
Decals are intentionally 2D and do not need a model.

_None._

## 5. Chassis rig readiness

Only chassis with a GLTF skin and at least eight bound joints may be exposed by
the Armory picker. Animation clips may be embedded or supplied by the shared
operator animation pack.

_None._

## 6. Existing models that need replacement

| Item | Current limitation | Next asset task |
| --- | --- | --- |
| Talon-C Carbine (`frame:talon_c`) | The shipped factory model is a blockout with simple untextured parts. The new preview accurately shows this proxy. | Author a finished, textured carbine model, preserve its grip and charm socket calibration, then regenerate its preview. |

## 7. Pending achievement weapons hidden from the picker

These ownership records remain intact, but the rewards are not exposed as
factory-gun substitutes. Add a dedicated GLB and change the achievement asset
manifest to `ready` before restoring them to `ARCHETYPE_SKINS`.

| Id | Reward | Status |
| --- | --- | --- |
| `5002` | Chrono-Drifter Talon-C | pending |
| `5006` | Bunker Bastion Siege-Breaker | pending |
| `5009` | Archival Constructor Arc Driver | pending |
| `5010` | Hive-Weaver Bio-Plasma Emitter | pending |


This is a visual-review finding, separate from missing-file checks. The four
previous green-backed charm/module icons now use transparent model renders;
original source artwork is retained and may still be used by other screens.
