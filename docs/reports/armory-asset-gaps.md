# Armory Asset Gaps

Status: generated | Updated: 2026-09-22
| Regenerate: `npm run audit:armory-assets`

Uses the same item lists and preview resolver as the Armory. Model paths are
checked on disk. Transparent model renders replace the previous shared chassis
pictures and green-backed icons; source artwork is retained unchanged.

| Check | Count |
| --- | ---: |
| Items offered | 133 |
| **No name** (renders as a bare itemdef id) | **0** |
| **No icon on disk** (tile falls back to initials) | **0** |
| Missing required 3D model | 6 |
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

| Group | Id | Name |
| --- | --- | --- |
| weapon | `2200` | Chrome Plated Sidearm |
| weapon | `5002` | QUICK STUDY Carbine |
| weapon | `5006` | HUNKERED Autocannon |
| weapon | `5009` | ARCHIVIST Arc Driver |
| weapon | `5010` | KIN Arc Driver |
| chassis | `5001` | GHOST Chassis |

## 5. Existing models that need replacement

| Item | Current limitation | Next asset task |
| --- | --- | --- |
| Talon-C Carbine (`frame:talon_c`) | The shipped factory model is a blockout with simple untextured parts. The new preview accurately shows this proxy. | Author a finished, textured carbine model, preserve its grip and charm socket calibration, then regenerate its preview. |

This is a visual-review finding, separate from missing-file checks. The four
previous green-backed charm/module icons now use transparent model renders;
original source artwork is retained and may still be used by other screens.
