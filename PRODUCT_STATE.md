# Product State

The one place that answers "what is true today" without reconciling
contradictions across `docs/`. Everything else in `docs/` (reviews, sprint
plans, worklogs, teardowns, narrative bibles) stays historical — point-in-
time records of investigation and decisions. This file does not replace
them; it exists because several of them have already needed their own
"this statement is stale" corrections, which is a normal symptom of a
fast-moving project, not a writing failure. See
`docs/design/aaa-polish-and-studio-strategy.md` for the reasoning.

**Update this file whenever a row's truth changes. Keep entries to one
line — link to the relevant doc for detail, don't inline the detail here.**

Last updated: 2026-08-23 (Sprint 29 initialization, v2.3.1-beta).

| Category | Current truth |
|---|---|
| Core loop | Playable |
| Act 1 | Content complete, ongoing polish |
| Act 2 | Wired end-to-end (queen fight, endings, faction verbs, Depth Contract) |
| Co-op | Functional, host-authoritative for enemy sync, ready-up gate shipped, loadout sync on roster |
| PvP | Functional, server-authoritative damage — experimental |
| Steam Lobby (Friends/Invite/Join Game) | Code-complete for create/browse/join/invite, roster/ready/host sync, single-instance invite locks. Production backend verified at `steam.tuesdaycinema.club`. |
| 3D Runtime Models & Armory | **46 new 3D models integrated** (30 community chassis skins + 16 Season 0 assets) with dynamic class backgrounds, animation mixers, and mouse-orbit previews in the Armory. Aesthetic constitution defined in `docs/3d-asset-master-backlog-and-prompts.md`. |
| Crash-Site Wanderers | **6 Archetype families active** with unique lore dialogues, companion follow AI, and passive/active combat buffs. Gated by bunker O2 generator and milestone boss defeats. |
| Steam Deck & Controls | Twin-stick right joystick independent aiming preset shipped as default. 7 bundled Steam Input configurations with right stick menu pointer control. |
| Depth Contract / One More Ring | Deeper O₂ pressure, crossing ritual deltas, salvage multipliers, and director aggression wired and tested. |
| Transformative Relics | **All 8 relics runtime-wired** (`last_breath`, `punctured_lung`, `parasitic_magazine`, `false_telemetry`, `cryo_breach`, `scrap_cycler`, `vesper_doctrine`, `queens_milk`). |
| Mid-Run Crash Recovery | `runCheckpoint.js` provides automatic expedition checkpointing across process restarts. |
| Hardware Diagnostics & Perf | `gpuFrameTimer.js` and `gpuMemoryBudget.js` active with real-time GPU frame profiling, memory tier gating, and telemetry. |
| Steam Stats / Cloud | All 8 dashboard stats synced (`src/steamStats.js`); Steam Cloud save bridge wired (`src/steamCloudSaveBridge.js`). |
| Test Suite | **2,031 passing tests across 246 files** (98.57% statement coverage). |
| Current Milestone | **Sprint 29 (`v2.3.1-beta`)**: Biomechanical horror 3D generation follow-through, Wanderer quest line expansion, Steam Deck performance tuning, and 2-account Steam certification. |
| Versioning & Release Tracking | Governed by `docs/versioning-and-release-roadmap.md` and `docs/releases/`. |
