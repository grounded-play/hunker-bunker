# Product State

This is the canonical answer to “what is true today?” Detailed plans, audits,
and worklogs are evidence or history; they do not override this file. Update a
row when its implementation or acceptance state changes and link to evidence
instead of duplicating it here.

Last verified: 2026-09-16 · Sprint 40 · `dev/sprint-40` · `v2.4.4-beta`

Partial re-verification: 2026-09-16 · `dev/sprint-40` from `e017b06` · `v2.4.4-beta`. Deep localization sweep (7 languages, 0 unlocalized DOM sinks), Alternate Radio Voice Banks (104 cue slots / 208 takes), all 10 rendered motion ending cinematics, Phase A AgX tone mapping & IBL reflections, and 52 playtest stability tickets (DP-01 through DP-52) were merged into `mothership` and released.

Status vocabulary:

- **Automated:** implemented and covered by a repeatable repository check.
- **Human-verified:** exercised in the stated real browser, package, service,
  account, or hardware environment.
- **Open acceptance:** implementation exists, but the named real-world proof is
  still required. This is not safe evidence for an unqualified store claim.

| Area | Current truth | Remaining acceptance or constraint |
| --- | --- | --- |
| Core expedition | Act 1 is playable; Act 2, queen fight, all 10 rendered motion endings, faction state, and Depth Contract are wired end to end. | A recorded 35–45 minute new-player Proof Run remains open. |
| Depth Contract | Ring pressure, O₂ deltas, salvage multipliers, crossing ritual, and director aggression are implemented and tested. | Elite promotion is connected through `eliteEnemies.js`; loot distinguishes promoted elites from wounded enrage. Human comprehension, elite audio and balance remain open. |
| Relics | All 8 transformative relics are runtime-wired and tested. | Build diversity and exploit/balance playtesting remain open. |
| Co-op | Host-authoritative enemy sync, roster/loadout sync, ready-up, reconnect, and host failover are code-backed. | Two real Steam accounts completing one production expedition remains open. |
| PvP | Server-authoritative player damage is functional and experimental. | Not a launch-ready mode; real-network balance and abuse testing remain open. |
| Localization | Deep localization complete across all 7 supported languages (English, German, Latin American Spanish, Japanese, Brazilian Portuguese, Russian, Simplified Chinese); 0 unlocalized DOM sinks in runtime UI; live in-session switching. | Human linguistic review by native speakers across non-English locales remains open. |
| Voice packs & comms | Soviet Sub-Commander (`4148`) and AURA (`4149`) registered with 52 cue slots each (104 slots / 208 takes); custom intro cutscene persona cards and opening crash dialogue wired. | Optional physical actor replacement pass remains open; current takes are production-mixed ElevenLabs Wave 2 assets. |
| Ending cinematics | All 10 endings rendered as full-motion video sequences with dedicated mixed audio beds. | Player telemetry on ending distribution and pacing acceptance remain open. |
| Steam lobbies | Create, browse, join, invite, Friends/Join Game, Rich Presence, and cold-start handling are code-complete. | Two-account acceptance is open; cross-region public discovery is constrained by the current native binding. |
| Steam backend | Production TLS service and Steam session path have been verified previously at `steam.tuesdaycinema.club`; trusted leaderboard/store/inventory paths are implemented. | Re-run production smoke tests before release; commerce remains disabled pending approval/configuration. |
| Steam Cloud and stats | Save bridge and all 8 stat definitions are wired and automated. | A real two-machine Cloud conflict/offline round-trip remains open. |
| Steam Deck and input | Twin-stick aiming and 7 Steam Input configurations are bundled. | Physical Deck frame pacing, navigation, glyph, suspend/resume, and haptics sign-off remains open. |
| 3D runtime and Armory | Full-stage Armory layout with closer camera, 720p non-scrolling fit, 79 model previews, 3D chest patches with front-face culling, transparent decals, voice auditioning, and independent weapon sheen. | Broader environment and hardware acceptance remain open; 24 architecture kit GLBs need 3D routing fix. |
| Wanderers | Six archetype families, companion following, buffs, and milestone gates are active with persistent contracts and completion-aware dialogue. | Human pacing, balance and full expedition acceptance remain open. |
| Save recovery | `src/runCheckpoint.js` supports interrupted-run salvage recovery, not restoration of the full expedition world. | Packaged crash/restart and Steam Cloud interaction tests remain open. |
| Performance diagnostics | GPU queries reset cleanly across transitions; frame pacing percentiles captured; world-model load latency recorded; session logger exports Deck-safe diagnostic context. | Packaged causal trace for asset load stalls; physical Deck sign-off remains open. |
| Mayor Tina | Hostile lifecycle wired with warning hit, cup removal, grounded actor chase with attack cooldown, and clean reset. | Packaged visual sign-off remains open. |
| Retail asset budget | Budget raised from 2705 MiB to 2725 MiB in Sprint 40 to accommodate Wave 2 radio takes, persona art, and ending cinematics; presubmit check passes cleanly. | Web/source audit does not certify Steam packaging or clear external actor rights. |
| Presentation | Phase A visual overhaul landed: AgX tone mapping, PMREM deep space reflections on 94 PBR materials, and selective bloom. Upgraded tilt-shift bokeh, dynamic shadows, 3D tracers, death bursts, and camera trauma shake. | Phase B surface depth (derived normal/roughness maps) and hardware visual sign-off remain open. |
| Automated suite | `npm test` passes **3,548 tests across 392 files** as of 2026-09-16; 9/9 Playwright E2E browser tests pass; lint (0 errors), presubmit, and production web/media build pass cleanly. | Hardware-only behavior and a full expedition are not covered by this count. |

## Current milestone

Sprint 41 is active on `dev/sprint-41`, developing from the `v2.4.5-beta` baseline toward `v2.4.6-beta`. Its focus is architecture kit GLB in-world routing, faction prop placement, theme matrix hole closures, Visual Overhaul Phase B (derived normal/roughness maps), multi-chunk setpiece allocator integration, and debug module code splitting.
The executable plan and 10-sprint retrospective audit are in [docs/planning/sprint-41-audit-and-roadmap.md](docs/planning/sprint-41-audit-and-roadmap.md); the wider sequence is in [docs/planning/repository-roadmap.md](docs/planning/repository-roadmap.md).

