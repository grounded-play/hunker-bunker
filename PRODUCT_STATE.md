# Product State

This is the canonical answer to “what is true today?” Detailed plans, audits,
and worklogs are evidence or history; they do not override this file. Update a
row when its implementation or acceptance state changes and link to evidence
instead of duplicating it here.

Last reconciled: 2026-09-28 · source baseline `release/v2.4.12-beta-invisible-essentials` `ffbd480e` (advancing milestone tickets #78, #80, #81, #82, #85; Sprint 47 / Invisible Essentials Phases 1–4; 2026-09-24 Deck + PC co-op remediation; CPU-driven quality restoration; HUD dock housings integration; and PR #93 cleanup).

Released in `v2.4.4-beta` and already on `mothership` (`e017b06`): the first deep localization sweep (7 languages, 0 unlocalized runtime strings), Alternate Radio Voice Banks (104 cue slots / 208 takes), all 10 rendered motion ending cinematics, Phase A AgX tone mapping & IBL reflections, and 52 playtest stability tickets (DP-01 through DP-52).

Delivered in `v2.4.12-beta` on `release/v2.4.12-beta-invisible-essentials` and **active in verification**:
- **The Invisible Essentials (Phases 1–4)**:
  - Phase 1 Solo Continuation: atomic mid-expedition suspend/resume (`src/expeditionSuspend.js`, claim store, `#title-continue-btn` becomes `RESUME EXPEDITION`).
  - Phase 2 Comfort & Pressure Controls: player-facing camera shake scale (0–1.0×), twin-stick controller aim assistance (magnetism/friction cone), and reduced pressure pacing toggle (`src/accessibilitySettings.js`).
  - Phase 3 Legible Death & Continuation: localized damage cause attribution (18 hostiles + hazards), build synergy highlight, field loss vs banked salvage accounting, and next actionable step (`src/deathReport.js`).
  - Phase 4 Navigation Friction & Return Network: pneumatic transit terminals at cleared boss arenas routing directly to Crashed Ship Sanctuary; candidate interaction cycling (`[TAB] / [D-PAD DOWN]`); tactical map floor breadcrumbs (`src/pneumaticTransit.js`).
- **Co-op Parity & Networking (2026-09-24 Deck + PC Session Fixes)**:
  - Spawn cliff guard: lethal edges within 24 tiles of spawn block movement instead of causing instant-death pit-falls (`7480bd9`).
  - Relayed deaths: every non-downed death broadcasts `player-died`; remote partner sees body down with owner-attributed Black Box marker; `TRY AGAIN` announces `player-redeployed` (`39a7375`).
  - Host-authoritative power-up drops (`loot-drop-spawned` / `loot-drop-collected`), prop destruction syncing (`prop-broken`), separate 40/s effect vs 20/s state network budgets (`39a7375`, `42c4bbc`).
  - Map & Story Persistence Rules: `TRY AGAIN` keeps run map with broken walls/props; `MAIN MENU` ends run and generates new map; `NEW CAMPAIGN` resets story/world changes; co-op/PvP play a fresh story (`caf5816`, `42c4bbc`, `de61860`, `d3ec634`, `fcce193`).
- **Performance & Quality Restoration**:
  - Full visual quality restored on all hardware: reverted the emergency cuts (post-processing bypass, frozen shadows, 3D→sprite enemies, halted 3D prop loads, 10 Hz player animation) and the Sprint 28 cuts (render budget back to 1.35× / 3.6 MP, suit-light shadows, 2048 sun shadow map); adaptive quality lowers resolution only when GPU-bound (`cfbfaff`, `3a22c64`). AgX tone mapping and PMREM reflections were never cut (Phase A render work).
  - Frame time won back purely on CPU: wall raycast spatial index for light/fog/projectiles, A* edge pre-check, single-pass flat decals eliminating ~60 program re-resolves per frame, menu 30 fps cap (headless logic 42.0ms → 13.3ms).
- **Steam Deck Controls & Camera**:
  - Single press gate (`src/controllerPressGate.js`): stops Chromium Gamepad API + native Steam Input double-presses, prevents `[B]` closing map from opening pause settings (`c0b5ab0`, `f1c6faa`).
  - Right-stick camera orbit inversion fixed (`0bbb438`).
- **Minimap & Tactical Terminal Presentation**:
  - Progressive radar scan wavefront reveal with 400ms quadratic fade-off tail, CRT fog-of-war grid, and minimap bezel mask (`05c4300`).
  - Live Bunker Tactical Terminal day-cycle clock, 'CYCLE HOLD — TERMINAL ACTIVE' header, 24h progress bar, and localized `ADVANCE DAY` card (`0a3caf6`).
- **HUD Lower Dock (Phase 1–2 Skeleton & Housings)**:
  - Nordic Cathedral Biomech art direction (Order, Decay, Synthesis).
  - Three-panel lower band (map left, health/status centre, gun/ammo right) behind the `hb_hud_layout` flag. The 2026-09-28 review found the live painted housings are 150 u tall with per-class windows and Deck text down to 7.2 px; readability recovery (R0–R2) is Sprint 48 work and `classic` stays the default (`docs/planning/hud-overlay-review-and-recovery-plan-2026-09-28.md`).
  - Painted suit dock housings and dark glass cutouts integrated in `public/ui/dock/` for Scout, Tank, Engineer behind `hb_hud_layout` debug flag (`manifest.json`, `hudDockHousings.css`, `fb538ce`, `65bb816`).

Status vocabulary:

- **Automated:** implemented and covered by a repeatable repository check.
- **Human-verified:** exercised in the stated real browser, package, service,
  account, or hardware environment.
- **Open acceptance:** implementation exists, but the named real-world proof is
  still required. This is not safe evidence for an unqualified store claim.

| Area | Current truth | Remaining acceptance or constraint |
| --- | --- | --- |
| Core expedition | Act 1 & 2 playable; seeded expedition system, multi-room camp/hive compounds, physical world transformations (canyon bridge, camp turrets, bio-conduits), 10 motion endings, faction state, and Depth Contract wired end to end. Map rule verified: TRY AGAIN keeps map and changes; MAIN MENU generates new map. | A recorded 35–45 minute new-player Proof Run remains open. Every ship goal (O₂, hull, radar, reactor) has three campaign-rolled optional packages routed through its own ring, with lasting consequences (`src/objectivePackages.js`). Crossings are proven walkable on the stamped grid across 12 seeds (`src/crossingNavigation.test.js`). |
| Depth Contract | Ring pressure, O₂ deltas, salvage multipliers, crossing ritual, and director aggression are implemented and tested. | Elite promotion is connected through `eliteEnemies.js`; loot distinguishes promoted elites from wounded enrage. Human comprehension, elite audio and balance remain open. |
| Relics & Synergies | All 8 transformative relics and initial foundational synergy chains (Cryo Shatter, Bio Predator) are runtime-wired and tested. | In-expedition build decisions (Field Recalibration Workbench, mod refactoring, Core Shard tuning; Phase 6), broader synergy chains, and playtest balance remain open. |
| Co-op | Two-account packaged session (Deck host + PC guest, 2026-09-24) proved lobby join, ready, deploy, 3D avatars, and redeploy. All QA networking gaps (relayed non-downed deaths, host-authoritative drops, prop destruction sync, spawn cliff guards, per-deploy map entropy) implemented and covered by unit/relay tests. | A two-real-account packaged **co-op PvE** verification confirming the new networked drops, death markers, and TRY AGAIN persistence on hardware remains open. Networked companions and converting Sprint 46/47 solo events to co-op remain open. |
| PvP | One physical Deck capture shows Steam lobby/ready/deploy, remote-avatar readiness, inbound `pvp-rival` damage, one death, and respawn. Current source aligns local, relay, and remote replica PvP vitals at 4 hearts, adds 3.0s spawn protection, blocks Black Box death exploitation, adds client skip/server validation rejection for PvP leaderboards, establishes debounced monotonic door sequencing, adds outgoing hit telemetry, and bypasses PvE missions/cards; `server/relayPvPAuthority.test.js` and the full automated suite pass. | Paired bidirectional hit/result/reconnect, deployed-backend, and physical Deck evidence remain open. |
| Localization | Complete across all 7 supported languages (English, German, Latin American Spanish, Japanese, Brazilian Portuguese, Russian, Simplified Chinese). **0 unannotated markup strings and 0 unlocalized runtime strings**; 1,898 keys per locale at exact parity; narrative catalog 100% translated; live in-session switching with `<html lang>` synced. Guarded by a per-screen and per-module coverage ratchet (`npm run i18n:audit`, `scripts/audit-i18n.test.js`) that fails when any count rises. | Human linguistic review by native speakers across non-English locales remains open — every non-English string is machine-authored. Two Steamworks item descriptions still carry developer notes in their English source (see the release notes). |
| Voice packs & comms | Soviet Sub-Commander (`4148`) and AURA (`4149`) registered with 52 cue slots each (104 slots / 208 takes); custom intro cutscene persona cards and opening crash dialogue wired. | Optional physical actor replacement pass remains open; current takes are production-mixed ElevenLabs Wave 2 assets. StarCraft-style 2D talking portraits in arched stone frames planned for HUD dock Phase 3. |
| Ending cinematics | All 10 endings rendered as full-motion video sequences with dedicated mixed audio beds. | Player telemetry on ending distribution and pacing acceptance remain open. |
| Steam lobbies | Create, browse, join, invite, Friends/Join Game, Rich Presence, and cold-start handling are code-complete. | Two-account acceptance is open; cross-region public discovery is constrained by the current native binding. |
| Steam backend | Production TLS service and Steam session path have been verified previously at `steam.tuesdaycinema.club`; trusted leaderboard/store/inventory paths are implemented. | Re-run production smoke tests before release; commerce remains disabled pending approval/configuration. |
| Steam Cloud and stats | Save bridge and all 8 stat definitions are wired and automated. | A real two-machine Cloud conflict/offline round-trip remains open. |
| Steam Deck and input | Twin-stick aiming and 7 Steam Input configurations are bundled. Controller press gate (`src/controllerPressGate.js`) resolves double-press/carry-over; inverted right-stick camera orbit fixed (`0bbb438`). | Controller-only hardware sign-off: active action-set transitions, in-game glyph consistency, suspend/resume mid-expedition, haptics, and HUD readability at 1280×800 remain open. |
| 3D runtime and Armory | Full-stage Armory layout with closer camera, 720p non-scrolling fit, 79 model previews, 3D chest patches with front-face culling, transparent decals, voice auditioning, independent weapon sheen, and HUD layout debug toggle. | The Unified Foundry Hub (merging Armory, in-game Fab Bay, hero screen, and Steam Vault into one 5-tab hub with one shared item catalog and 1:1 model icons) is planned for Sprint 48 to resolve QA item mismatches and smelter trade-up defects. |
| Wanderers & Companions | Six archetype families, companion following, buffs, and milestone gates are active with persistent contracts and completion-aware dialogue. Solo companion stripped from co-op start. | Bounded A* pathfinding around walls, stuck re-pathing and a steady basic shot landed in `05c4300` (`src/companionPath.js`); not yet seen on hardware. Escort-to-camp, an assist ability on its own cooldown, and networked companions in co-op remain open (Sprint 48). |
| Save recovery & Suspend | `src/expeditionSuspend.js` implements full solo expedition continuation (vitals, coordinates, killed enemies, resident enemies, items, claim store); `src/runCheckpoint.js` provides Black Box fallback. | Packaged crash/restart and Steam Deck hardware sleep/wake mid-expedition acceptance remain open. |
| Performance diagnostics | GPU queries reset cleanly; CPU frame time recovered via wall raycast index, A* edge pre-check, single-pass flat decals, and 30fps menu cap (logic 42ms → 13.3ms). Full visual quality restored without lowering render scale or disabling shadows/shaders. | Physical Steam Deck frame pacing re-benchmark on packaged build (median render time ≤ 16ms, no task ≥ 500ms) remains open to prove CPU wins on hardware. |
| Mayor Tina | Hostile lifecycle wired with warning hit, cup removal, grounded actor chase with attack cooldown, and clean reset. | Packaged visual sign-off and Hive Queen communion encounter (`GAP-ST-01`) remain open. |
| Retail asset budget | Budget raised to 2725 MiB in Sprint 40 to accommodate Wave 2 radio takes, persona art, and ending cinematics; presubmit check and CodeQL audits pass cleanly. | Web/source audit does not certify Steam packaging or clear external actor rights. |
| Presentation & HUD | Phase A visual overhaul active (AgX tone mapping, PMREM deep space reflections on 94 PBR materials, selective bloom, dynamic shadows, 3D tracers). Minimap radar scan wavefront reveal with 400ms fade-off tail active. HUD Lower Dock Phase 1–2 skeleton and painted suit housings landed behind `hb_hud_layout`. | HUD dock Phase 3 (living reactive wear layer, drying blood, frost, cracks, 2D talking portraits, promoting dock to default) and Phase B surface depth remain open. |
| Automated suite | `npm test` passes **4,285 tests across 483 files** as of 2026-09-28; Playwright E2E browser probes pass; lint (0 errors), presubmit, and production build pass cleanly. | Hardware-only behavior and a full expedition are not covered by this count. |

## Current milestone

v2.4.12-beta release hardening is complete on `release/v2.4.12-beta-invisible-essentials`, ready for merge to `mothership`. The upcoming sprint milestone is **Sprint 48: The Unified Foundry Hub, Companion AI, Co-op Tactical Pings, and Hardware Acceptance**.

Key executable planning documents:
- [Sprint 48 Plan](docs/planning/sprint-48-plan.md) (The active next sprint plan)
- [The Invisible Essentials](docs/planning/invisible-essentials-2026-09-24.md)
- [HUD Lower Dock Layout Plan](docs/planning/hud-lower-dock-plan-2026-09-25.md)
- [QA Deck + PC Session Game Plan](docs/planning/qa-2026-09-24-deck-pc-coop-game-plan.md)
- [Release PR Body v2.4.12-beta](docs/releases/pr-body-v2.4.12-beta.md)
- [Master Roadmap](docs/planning/repository-roadmap.md)
