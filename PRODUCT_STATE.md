# Product State

This is the canonical answer to “what is true today?” Detailed plans, audits,
and worklogs are evidence or history; they do not override this file. Update a
row when its implementation or acceptance state changes and link to evidence
instead of duplicating it here.

Last verified: 2026-08-24 · Sprint 30 · `dev/sprint-30` · `v2.3.1-beta`

Partial re-verification: 2026-09-08 · `fix/mayor-tina-and-astra-plan` from `69f31eb` · `v2.3.1-beta`. The encounter, diagnostics, payload, save/quest/depth caveats, and automated-suite rows below were reviewed in [the September 8 audit](docs/reports/astra-game-review-2026-09-08.md) and [first implementation report](docs/reports/astra-first-implementation-2026-09-08.md). Other acceptance rows retain their earlier scope and date.

Status vocabulary:

- **Automated:** implemented and covered by a repeatable repository check.
- **Human-verified:** exercised in the stated real browser, package, service,
  account, or hardware environment.
- **Open acceptance:** implementation exists, but the named real-world proof is
  still required. This is not safe evidence for an unqualified store claim.

| Area | Current truth | Remaining acceptance or constraint |
| --- | --- | --- |
| Core expedition | Act 1 is playable; Act 2, queen fight, endings, faction state, and Depth Contract are wired end to end. | A recorded 35–45 minute new-player Proof Run remains open. |
| Depth Contract | Ring pressure, O₂ deltas, salvage multipliers, crossing ritual, and director aggression are implemented and tested. | `rollsElite()` has no non-test runtime consumer; displayed elite-chance threat must be connected or corrected. Human comprehension and balance remain open. |
| Relics | All 8 transformative relics are runtime-wired and tested. | Build diversity and exploit/balance playtesting remain open. |
| Co-op | Host-authoritative enemy sync, roster/loadout sync, ready-up, reconnect, and host failover are code-backed. | Two real Steam accounts completing one production expedition remains open. |
| PvP | Server-authoritative player damage is functional and experimental. | Not a launch-ready mode; real-network balance and abuse testing remain open. |
| Steam lobbies | Create, browse, join, invite, Friends/Join Game, Rich Presence, and cold-start handling are code-complete. | Two-account acceptance is open; cross-region public discovery is constrained by the current native binding. |
| Steam backend | Production TLS service and Steam session path have been verified previously at `steam.tuesdaycinema.club`; trusted leaderboard/store/inventory paths are implemented. | Re-run production smoke tests before release; commerce remains disabled pending approval/configuration. |
| Steam Cloud and stats | Save bridge and all 8 stat definitions are wired and automated. | A real two-machine Cloud conflict/offline round-trip remains open. |
| Steam Deck and input | Twin-stick aiming and 7 Steam Input configurations are bundled. | Physical Deck frame pacing, navigation, glyph, suspend/resume, and haptics sign-off remains open. |
| 3D runtime and Armory | Sprint 28 integrated 46 models; Sprint 29 added 11 optimized enemy/NPC/prop models plus preview, weapon, charm, lighting, and locomotion fixes. | Per-asset visual review, remaining cosmetic meshes, and broader environment backlog remain open. |
| Wanderers | Six archetype families, companion following, buffs, and milestone gates are active. | `advanceQuest()` has no non-test runtime caller. Quest completion, feedback, persistence, and balance remain open. |
| Save recovery | `src/runCheckpoint.js` supports interrupted-run salvage recovery, not restoration of the full expedition world. | Packaged crash/restart and Steam Cloud interaction tests remain open. |
| Performance diagnostics | GPU queries now reset across menu/gameplay transitions; EMA is labeled; world-model load latency and synchronous clone/prepare spans are recorded separately. | Log 19's 346 MB / 2.03 ms final values describe a menu snapshot, not proven gameplay improvement. The 8.574 s deployment stall still needs a packaged causal trace; Deck acceptance remains open. |
| Mayor Tina | Seeded encounter moved to X 9, Z -14 through -20; cup and Tina turn 180° about Y. Browser approach, transformation, and transformed movement verified; sampled generation probe passed 100 seeds. | Full natural approach and packaged visual sign-off remain open. |
| Retail asset budget | Two texture-only derivatives preserve geometry and reduce public payload to 2,793,737,892 bytes; the unchanged 2,700 MiB gate and generated presubmit checks pass. | 37,417,308 bytes of headroom remain. This web/source audit does not certify a Steam package or clear asset rights. |
| Presentation | Sprint 29 closed reticle, menu isolation telemetry, XP/reward feedback, lighting reporting, weapon/charm calibration, audio diagnostics, and walk cadence gaps. | Desktop 16:9 and 1280×800 human visual sign-off remains open. |
| Automated suite | `npm test` passes **2,484 tests across 277 files** as of 2026-09-08; lint, presubmit, and production web/media build pass. | Hardware-only behavior and a full expedition are not covered by this count. |

## Current milestone

Sprint 30 is an **acceptance and product-coherence sprint**. Its purpose is to
turn code-backed claims into witnessed evidence, close the oldest player-facing
gaps, and stop opening new systems until one complete expedition is trustworthy.
The executable plan is [docs/planning/sprint-30.md](docs/planning/sprint-30.md);
the wider sequence and carried work are in
[docs/planning/repository-roadmap.md](docs/planning/repository-roadmap.md).
