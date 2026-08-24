# Product State

This is the canonical answer to “what is true today?” Detailed plans, audits,
and worklogs are evidence or history; they do not override this file. Update a
row when its implementation or acceptance state changes and link to evidence
instead of duplicating it here.

Last verified: 2026-08-24 · Sprint 30 · `dev/sprint-30` · `v2.3.2-beta`

Status vocabulary:

- **Automated:** implemented and covered by a repeatable repository check.
- **Human-verified:** exercised in the stated real browser, package, service,
  account, or hardware environment.
- **Open acceptance:** implementation exists, but the named real-world proof is
  still required. This is not safe evidence for an unqualified store claim.

| Area | Current truth | Remaining acceptance or constraint |
| --- | --- | --- |
| Core expedition | Act 1 is playable; Act 2, queen fight, endings, faction state, and Depth Contract are wired end to end. | A recorded 35–45 minute new-player Proof Run remains open. |
| Depth Contract | Ring pressure, O₂ deltas, salvage multipliers, crossing ritual, and director aggression are implemented and tested. | Human comprehension and balance across repeated runs remain open. |
| Relics | All 8 transformative relics are runtime-wired and tested. | Build diversity and exploit/balance playtesting remain open. |
| Co-op | Host-authoritative enemy sync, roster/loadout sync, ready-up, reconnect, and host failover are code-backed. | Two real Steam accounts completing one production expedition remains open. |
| PvP | Server-authoritative player damage is functional and experimental. | Not a launch-ready mode; real-network balance and abuse testing remain open. |
| Steam lobbies | Create, browse, join, invite, Friends/Join Game, Rich Presence, and cold-start handling are code-complete. | Two-account acceptance is open; cross-region public discovery is constrained by the current native binding. |
| Steam backend | Production TLS service and Steam session path have been verified previously at `steam.tuesdaycinema.club`; trusted leaderboard/store/inventory paths are implemented. | Re-run production smoke tests before release; commerce remains disabled pending approval/configuration. |
| Steam Cloud and stats | Save bridge and all 8 stat definitions are wired and automated. | A real two-machine Cloud conflict/offline round-trip remains open. |
| Steam Deck and input | Twin-stick aiming and 7 Steam Input configurations are bundled. | Physical Deck frame pacing, navigation, glyph, suspend/resume, and haptics sign-off remains open. |
| 3D runtime and Armory | Sprint 28 integrated 46 models; Sprint 29 added 11 optimized enemy/NPC/prop models plus preview, weapon, charm, lighting, and locomotion fixes. | Per-asset visual review, remaining cosmetic meshes, and broader environment backlog remain open. |
| Wanderers | Six archetype families, companion following, buffs, and milestone gates are active. | Multi-stage quest expansion, distinct assist feedback, persistence, and balancing carried out of Sprint 29. |
| Save recovery | Mid-run checkpoint recovery is implemented through `src/runCheckpoint.js`. | Packaged crash/restart and Steam Cloud interaction tests remain open. |
| Performance diagnostics | GPU timer, memory budgets, long-task attribution, lighting reports, and presentation telemetry are implemented. | Real-GPU packaged comparison and a stable 60 FPS Deck evidence run remain open. |
| Presentation | Sprint 29 closed reticle, menu isolation telemetry, XP/reward feedback, lighting reporting, weapon/charm calibration, audio diagnostics, and walk cadence gaps. | Desktop 16:9 and 1280×800 human visual sign-off remains open. |
| Automated suite | `npm test` passes **2,151 tests across 255 files** as of 2026-08-24. | E2E startup/navigation instability and hardware-only behavior are not covered by this count. |

## Current milestone

Sprint 30 is an **acceptance and product-coherence sprint**. Its purpose is to
turn code-backed claims into witnessed evidence, close the oldest player-facing
gaps, and stop opening new systems until one complete expedition is trustworthy.
The executable plan is [docs/planning/sprint-30.md](docs/planning/sprint-30.md);
the wider sequence and carried work are in
[docs/planning/repository-roadmap.md](docs/planning/repository-roadmap.md).
