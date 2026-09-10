# Product State

This is the canonical answer to “what is true today?” Detailed plans, audits,
and worklogs are evidence or history; they do not override this file. Update a
row when its implementation or acceptance state changes and link to evidence
instead of duplicating it here.

Last verified: 2026-09-10 · Sprint 33 · `dev/sprint-33` · `v2.4.0-beta`

Partial re-verification: 2026-09-09 · `fix/mayor-tina-and-astra-plan` from `69f31eb` · `v2.3.2-beta`. The encounter, diagnostics, payload, save/quest/depth caveats, 3D operator chest patches, startup UI scaling, and automated-suite rows below were reviewed in [the September 8 audit](docs/reports/astra-game-review-2026-09-08.md), [first implementation report](docs/reports/astra-first-implementation-2026-09-08.md), and [September 9 report](docs/reports/operator-patches-and-ui-scale-2026-09-09.md). Other acceptance rows retain their earlier scope and date.

Status vocabulary:

- **Automated:** implemented and covered by a repeatable repository check.
- **Human-verified:** exercised in the stated real browser, package, service,
  account, or hardware environment.
- **Open acceptance:** implementation exists, but the named real-world proof is
  still required. This is not safe evidence for an unqualified store claim.

| Area | Current truth | Remaining acceptance or constraint |
| --- | --- | --- |
| Core expedition | Act 1 is playable; Act 2, queen fight, endings, faction state, and Depth Contract are wired end to end. | A recorded 35–45 minute new-player Proof Run remains open. |
| Depth Contract | Ring pressure, O₂ deltas, salvage multipliers, crossing ritual, and director aggression are implemented and tested. | Elite promotion is now connected through `eliteEnemies.js`; loot distinguishes promoted elites from wounded enrage. Human comprehension, elite audio and balance remain open. |
| Relics | All 8 transformative relics are runtime-wired and tested. | Build diversity and exploit/balance playtesting remain open. |
| Co-op | Host-authoritative enemy sync, roster/loadout sync, ready-up, reconnect, and host failover are code-backed. | Two real Steam accounts completing one production expedition remains open. |
| PvP | Server-authoritative player damage is functional and experimental. | Not a launch-ready mode; real-network balance and abuse testing remain open. |
| Steam lobbies | Create, browse, join, invite, Friends/Join Game, Rich Presence, and cold-start handling are code-complete. | Two-account acceptance is open; cross-region public discovery is constrained by the current native binding. |
| Steam backend | Production TLS service and Steam session path have been verified previously at `steam.tuesdaycinema.club`; trusted leaderboard/store/inventory paths are implemented. | Re-run production smoke tests before release; commerce remains disabled pending approval/configuration. |
| Steam Cloud and stats | Save bridge and all 8 stat definitions are wired and automated. | A real two-machine Cloud conflict/offline round-trip remains open. |
| Steam Deck and input | Twin-stick aiming and 7 Steam Input configurations are bundled. | Physical Deck frame pacing, navigation, glyph, suspend/resume, and haptics sign-off remains open. |
| 3D runtime and Armory | The September 9 [Armory continuation](docs/reports/armory-implementation-2026-09-09.md) and [operator patch update](docs/reports/operator-patches-and-ui-scale-2026-09-09.md) add 79 transparent model previews, no-scroll item dialogs, 3D chest-mounted patches snug on breastplate (`mixamorig1Spine2`) with front-side culling and depth occlusion, high-detail transparent RGBA decals (4120, 4121, 4122, 4124, 4125), and independent weapon sheen plus fitted charms in deployment. All 84 tested class/picker/viewport combinations fit. | Five reward models and a finished Talon-C model remain in the asset inventory; broader environment and hardware acceptance remain open. |
| Wanderers | Six archetype families, companion following, buffs, and milestone gates are active. | All six families now have live contracts with persistent progress, per-contract replay receipts and banked rewards. September 10 adds Corpo, Crash Queen and Tripper stages, progress preservation on companion switches and completion-aware reunion dialogue. Human pacing, balance and the full expedition acceptance remain open; see [continuation evidence](docs/reports/companion-contract-continuation-2026-09-10.md). |
| Save recovery | `src/runCheckpoint.js` supports interrupted-run salvage recovery, not restoration of the full expedition world. | Packaged crash/restart and Steam Cloud interaction tests remain open. |
| Performance diagnostics | GPU queries now reset across menu/gameplay transitions; EMA is labeled; world-model load latency and synchronous clone/prepare spans are recorded separately. | Log 19's 346 MB / 2.03 ms final values describe a menu snapshot, not proven gameplay improvement. The 8.574 s deployment stall still needs a packaged causal trace; Deck acceptance remains open. |
| Mayor Tina | Seeded encounter moved to X 9, Z -14 through -20; cup and Tina turn 180° about Y. Browser approach, transformation, and transformed movement verified; sampled generation probe passed 100 seeds. | Full natural approach and packaged visual sign-off remain open. |
| Retail asset budget | Two texture-only derivatives preserve geometry and reduce public payload to 2,793,737,892 bytes; the unchanged 2,700 MiB gate and generated presubmit checks pass. | 37,417,308 bytes of headroom remain. This web/source audit does not certify a Steam package or clear asset rights. |
| Presentation | Sprint 29 closed reticle, menu isolation telemetry, XP/reward feedback, lighting reporting, weapon/charm calibration, audio diagnostics, and walk cadence gaps. September 9 resolved startup scaling. September 10 added upgraded tilt-shift diorama bokeh (quadratic falloff, chromatic dispersion, 7-sample Gaussian filter, 4.5px backdrop blur), dynamic directional shadow tracking following player position, 3.2:1 contrast lighting, 3D ballistic tracers, multi-stage biomechanical enemy death bursts, quadratic camera trauma shake, 3D additive muzzle flash, and tactical killstreak accolades. | Desktop 16:9 and 1280×800 human visual sign-off remains open. |
| Automated suite | `npm test` passes **2,734 tests across 308 files** as of 2026-09-10; lint (0 errors), doc audit (12 canonical files, 289 non-archive markdown files), presubmit, and production web/media build pass cleanly. | Hardware-only behavior and a full expedition are not covered by this count. |

## Current milestone

Sprint 30 is an **acceptance and product-coherence sprint**. Its purpose is to
turn code-backed claims into witnessed evidence, close the oldest player-facing
gaps, and stop opening new systems until one complete expedition is trustworthy.
The executable plan is [docs/planning/sprint-30.md](docs/planning/sprint-30.md);
the wider sequence and carried work are in
[docs/planning/repository-roadmap.md](docs/planning/repository-roadmap.md).

## September 9 expedition coherence verification

On `dev/sprint-33`, the [execution supplement](docs/planning/expedition-coherence-plan-2026-09-09.md) closes reset-order/pending-loot/duplicate reward defects, connects oxygen reserve to director relief, adds crossing/debrief guidance, conserves tilt-shift lighting and replaces flat gear/impact effects with procedural 3D visuals. [Evidence and limits](docs/reports/expedition-coherence-2026-09-09.md): 2,645 tests across 297 files pass; real-browser capacity/reset and two-pass color preservation pass. Concurrent presentation edits and the full human/platform acceptance gates remain separately scoped.

## September 10 diorama VFX, lighting & gameplay polish verification

On `dev/sprint-33`, [the VFX, lighting and gameplay plan](docs/planning/roguelike-vfx-lighting-and-gameplay-plan-2026-09-09.md) and [gap audit](docs/reports/gameplay-implementation-gap-audit-2026-09-10.md) closed presentation and tactile gaps across 4 pillars:
1. **Atmospheric Lighting & Dynamic Shadows**: Directional shadow frustum actively tracks player position without dropout; lighting contrast rebalanced from washed-out 1.9 ambient to crisp 0.85 base ambient and 2.5 directional key light.
2. **Tilt-Shift Diorama Bokeh**: WebGL `TiltShiftPassShader` upgraded with quadratic distance falloff, chromatic dispersion, and 7-sample Gaussian weights; CSS backdrop blur enhanced to 4.5px with aim reticle tracking.
3. **High-Impact Combat VFX & Placeholder Removal**: Directional elongated needle projectiles replace static spheres; multi-stage enemy death bursts spawn 3D physical chitin shards, floor shockwave rings, and cryo puffs; 3D additive volumetric muzzle flash replaces flat circle decals; non-linear camera trauma manager (`CameraTraumaManager`) provides quadratic translational and rotational camera kick.
4. **Tactile Killstreak Feedback & Roguelike Flow**: Dynamic killstreak accolades (`KillstreakFeedbackSystem`) reward rapid eliminations with animated banners and audio stingers; depth crossing ceremony features intense environmental feedback.
**Evidence**: 2,734 tests across 308 files pass (100% green); 0 ESLint errors; `npm run presubmit:generated` passed; `npm run audit:docs` passed; production build passed.

