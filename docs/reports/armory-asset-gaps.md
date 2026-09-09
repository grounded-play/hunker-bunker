# Armory Asset Gaps

Status: generated | Updated: 2026-09-09
| Regenerate: `npm run audit:armory-assets`

Derived from the same catalogs the Armory renders from, so this cannot drift
from what the player sees on the bench.

| Check | Count |
| --- | ---: |
| Items offered | 102 |
| **No name** (renders as a bare itemdef id) | **0** |
| **No icon on disk** (tile falls back to initials) | **24** |
| No 3D model | 22 |
| **Icon looks like an un-keyed green screen** (≥35% green) | **4** |

## 1. Missing names — needs a catalog entry

_None._

## 2. Missing icons — needs art

| Group | Id | Name | Expected path |
| --- | --- | --- | --- |
| weapon frame | `frame:gg1` | — | `/economy/GG.1.png` |
| chassis | `5001` | GHOST Chassis | _no path resolved_ |
| chassis | `5002` | QUICK STUDY Chassis | _no path resolved_ |
| chassis | `5003` | CARTOGRAPHER Chassis | `/economy/chassis_scout_cartographer.png` |
| chassis | `5004` | REYES COURIER Chassis | `/economy/chassis_scout_pioneer_courier.png` |
| chassis | `5005` | HARDENED Chassis | `/economy/chassis_tank_old_iron.png` |
| chassis | `5006` | HUNKERED Chassis | _no path resolved_ |
| chassis | `5007` | FULL BROOD Chassis | `/economy/chassis_tank_colossus_hive.png` |
| chassis | `5008` | GENTLE DRILL Chassis | `/economy/chassis_tank_gentle_titan.png` |
| chassis | `5009` | ARCHIVIST Chassis | _no path resolved_ |
| chassis | `5010` | KIN Chassis | _no path resolved_ |
| chassis | `5011` | CHEN'S THIRTEENTH Chassis | `/economy/chassis_engineer_chen_undying.png` |
| chassis | `5012` | ALIEN EXODUS Chassis | `/economy/chassis_engineer_exodus_vanguard.png` |
| chassis | `comm_scount_sil` | Scout: Species Sil | _no path resolved_ |
| chassis | `comm_eng_toxic_apex_chrysalis` | Engineer: Toxic Apex Chrysalis | _no path resolved_ |
| chassis | `comm_eng_abg` | Engineer: Space ABG | _no path resolved_ |
| chassis | `comm_eng_sil` | Engineer: Species Sil | _no path resolved_ |
| chassis | `comm_eng_corpo_shadow_runner` | Engineer: Chief Architect | _no path resolved_ |
| chassis | `comm_eng_soft_manic_architect_gf` | Engineer: Soft Manic Architect GF | _no path resolved_ |
| chassis | `comm_eng_afro_crash` | Engineer: Afro Crash Survivor | _no path resolved_ |
| chassis | `comm_eng_swim` | Engineer: Zero-G Hydro-Rig | _no path resolved_ |
| chassis | `comm_eng_foxhole_shadow` | Engineer: Foxhole Shadow | _no path resolved_ |
| chassis | `comm_eng_neural_weaver` | Engineer: Neural Weaver | _no path resolved_ |
| chassis | `comm_eng_apex` | Engineer: Apex Chrysalis | _no path resolved_ |

## 3. Green-screen icons — needs re-keying

These still carry a chroma backdrop. Some are on the chroma allowlist, which
suppresses the presubmit failure but does **not** make them look right on a
tile — an allowlisted entry here still needs the background removed.

| Group | Id | Name | Icon | Green | Allowlisted |
| --- | --- | --- | --- | --- | --- |
| charm | `4138` | Dark Matter Singularity | `/economy/charm_dark_matter.png` | 72% | yes |
| overclock | `4142` | Bio-Hazard Filter Vent | `/economy/mod_bio_hazard_filter.png` | 53% | yes |
| overclock | `4143` | Kinetic Impact Bushing | `/economy/mod_kinetic_impact.png` | 55% | yes |
| overclock | `4144` | Thermal Heat Exchanger | `/economy/mod_thermal_heat_exchanger.png` | 61% | yes |

## 4. Missing 3D models

| Group | Id | Name |
| --- | --- | --- |
| weapon | `2200` | Chrome Plated Sidearm |
| chassis | `5001` | GHOST Chassis |
| chassis | `5002` | QUICK STUDY Chassis |
| chassis | `5006` | HUNKERED Chassis |
| chassis | `5009` | ARCHIVIST Chassis |
| chassis | `5010` | KIN Chassis |
| decal | `2000` | Scout Victory Patch |
| decal | `2001` | Tank Victory Patch |
| decal | `2002` | Engineer Victory Patch |
| decal | `2003` | Queen Slayer Emblem |
| decal | `2004` | Archivist Emblem |
| decal | `2100` | Carbon Fiber Decal |
| decal | `4120` | Sub-Zero Pioneer Patch |
| decal | `4121` | Radiation Trefoil |
| decal | `4122` | Sporesnail Hunter Crest |
| decal | `4123` | Bunker 404 Lost Squad Decal |
| decal | `4124` | Cyber-Skull Tactical Pin |
| decal | `4125` | Cryo-Phoenix Insignia |
| decal | `4126` | Queen Slayer Gold Seal |
| decal | `4127` | Void Horizon Sigil |
| decal | `4128` | Ancient Core Glyphs |
| decal | `4129` | Grand Marshal Relic Crest |
