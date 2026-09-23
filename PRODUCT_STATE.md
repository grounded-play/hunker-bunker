# Product State

This is the canonical answer to “what is true today?” Detailed plans, audits,
and worklogs are evidence or history; they do not override this file. Update a
row when its implementation or acceptance state changes and link to evidence
instead of duplicating it here.

Last verified: 2026-09-23 · Sprint 45 · `dev/sprint-45` · `v2.4.10-beta` (repository automation and headless-browser checks only; see [release notes](docs/releases/v2.4.10-beta.md) for evidence scope)

Released in `v2.4.4-beta` and already on `mothership` (`e017b06`): the first deep localization sweep (7 languages, 0 unlocalized runtime strings), Alternate Radio Voice Banks (104 cue slots / 208 takes), all 10 rendered motion ending cinematics, Phase A AgX tone mapping & IBL reflections, and 52 playtest stability tickets (DP-01 through DP-52).

Staged on `dev/sprint-45` and **active in verification**:
- **Seeded Expedition System**: 5 distinct environmental conditions (`glacial_gale`, `spore_bloom`, `bio_resin_surge`, `geothermal_arc`, `subzero_stillness`) altering lighting, fog, ambient audio, sprint vapor, and kill signatures; tactical briefing cards with dynamic obstacles and combat bounties.
- **Multi-Room Compounds**: 12 distinct authored room layouts across Survivor Camps and Alien Hives (6 rooms each) with localized location entry title banners across all 7 languages.
- **Physical World Transformations**: Ring 2 canyon bridge construction with traversable 3D steel deck; camp perimeter fortification with automated defense turrets; hive choice consequences (communion bio-conduit shortcut to crash site vs radical harvest exotic weapon overclock payout).
- **Radar & Tactical Map**: Room-reach-bounded radar pulse sweep with animated reveal and textured fog-of-war.
- **Inter-Campaign Deterministic Variety**: Procedural campaign layouts vary deterministically between seeds while maintaining save-file spatial stability (versioned route generation; pre-existing saves keep generation 1).
- **Per-Campaign Gate Challenges**: fixed gate landmarks, with each campaign dealing elite warden / collapsed approach / infested approach / blackout across the four gates.
- **HUD & presentation**: loot and prompt columns pinned below their growing neighbours, reticle hidden over HUD panels, pointers hidden in cinematics and door transitions, Deck title-screen frost without `backdrop-filter`.

Status vocabulary:

- **Automated:** implemented and covered by a repeatable repository check.
- **Human-verified:** exercised in the stated real browser, package, service,
  account, or hardware environment.
- **Open acceptance:** implementation exists, but the named real-world proof is
  still required. This is not safe evidence for an unqualified store claim.

| Area | Current truth | Remaining acceptance or constraint |
| --- | --- | --- |
| Core expedition | Act 1 & 2 playable; seeded expedition system, multi-room camp/hive compounds, physical world transformations (canyon bridge, camp turrets, bio-conduits), 10 motion endings, faction state, and Depth Contract wired end to end. | A recorded 35–45 minute new-player Proof Run remains open. Objective packages per ship goal are still the same primary/alternative/fallback trio (`ringManifest.js`); hive creep and camp condition are visual only (no movement, damage, spawn, price or service effect); the valley-bridge setpiece is ring-1-eligible while the canonical collapsed bridge is ring 2; defeated-boss goal keys are not milestone IDs (the lifecycle state carries the usable defeat signal). |
| Depth Contract | Ring pressure, O₂ deltas, salvage multipliers, crossing ritual, and director aggression are implemented and tested. | Elite promotion is connected through `eliteEnemies.js`; loot distinguishes promoted elites from wounded enrage. Human comprehension, elite audio and balance remain open. |
| Relics | All 8 transformative relics are runtime-wired and tested. | Build diversity and exploit/balance playtesting remain open. |
| Co-op | Host-authoritative enemy sync, roster/loadout sync, ready-up, reconnect, and host failover are code-backed. | Two real Steam accounts completing one production expedition remains open. |
| PvP | Server-authoritative player damage is functional and experimental. | Not a launch-ready mode; real-network balance and abuse testing remain open. |
| Localization | Complete across all 7 supported languages (English, German, Latin American Spanish, Japanese, Brazilian Portuguese, Russian, Simplified Chinese). **0 unannotated markup strings and 0 unlocalized runtime strings**; 1,898 keys per locale at exact parity; narrative catalog 100% translated; live in-session switching with `<html lang>` synced. Guarded by a per-screen and per-module coverage ratchet (`npm run i18n:audit`, `scripts/audit-i18n.test.js`) that fails when any count rises. | Human linguistic review by native speakers across non-English locales remains open — every non-English string is machine-authored. Two Steamworks item descriptions still carry developer notes in their English source (see the release notes). |
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
| Automated suite | `npm test` passes **3,915 tests across 424 files** as of 2026-09-23; 9/9 Playwright E2E browser tests pass; lint (0 errors), presubmit, and production web/media build pass cleanly. | Hardware-only behavior and a full expedition are not covered by this count. |

## Current milestone

Sprint 45 is active on `dev/sprint-45` (`v2.4.10-beta`). Its focus is seeded expedition variety, compound multi-room structures, meaningful choices & physical world transformations, and progression consistency across Steam playthroughs.
The executable plan and 10-sprint retrospective audit are in [docs/planning/sprint-41-audit-and-roadmap.md](docs/planning/sprint-41-audit-and-roadmap.md); the wider sequence is in [docs/planning/repository-roadmap.md](docs/planning/repository-roadmap.md).

