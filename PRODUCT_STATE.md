# Product State

**Status:** Canonical current-truth ledger  
**Last verified:** 2026-08-24  
**Update rule:** change this file whenever a row's truth changes; point to detailed evidence instead of duplicating it here.

This is the one repository document intended to answer **"what is true today?"** without reconciling every point-in-time plan, audit, worklog, or design note under `docs/`.

Historical documents remain valuable evidence. They are not automatically current just because they are still in the repository. See [`docs/README.md`](docs/README.md) for the documentation lifecycle introduced with Sprint 30.

| Category | Current truth |
|---|---|
| Core loop | Playable. |
| Act 1 | Content complete; ongoing polish and acceptance work. |
| Act 2 | Wired end-to-end: queen fight, endings, faction verbs, and Depth Contract. |
| Co-op | Functional and host-authoritative for enemy sync; ready-up and loadout roster flows are implemented. **Two-real-Steam-account end-to-end acceptance remains open in repository evidence.** |
| PvP | Functional, server-authoritative damage; experimental. |
| Steam Lobby | Create/browse/join/invite, roster/ready/host sync, and invite locking are implemented. Production backend health has been verified at `steam.tuesdaycinema.club`; full two-account packaged-build certification remains an acceptance gate. |
| Steam Stats / Cloud | All 8 dashboard stats are synced in code; Steam Cloud save bridge is wired. Real installed-build/cloud round-trip acceptance should remain explicit in release checklists. |
| 3D Runtime / Armory | Sprint 28 integrated 46 community/Season 0 models. Sprint 29 additionally optimized and integrated 11 uploaded runtime assets, including Sentinel/Crawler variants and environmental/NPC models. The asset backlog is still a living catalog, not a completion certificate. |
| Wanderers / Companions | Six current archetype families exist with encounter dialogue, companion data, buffs, assist abilities, and quest definitions. `advanceQuest()` currently has no non-test runtime call site, so quest-objective progression is **defined but not yet runtime-connected**. |
| Depth Contract / One More Ring | O2 pressure, crossing deltas, salvage multipliers, and director aggression are wired and tested. |
| Transformative Relics | All 8 relics are runtime-wired. |
| Mid-Run Crash Recovery | `runCheckpoint.js` provides automatic expedition checkpointing across process restarts. |
| Steam Deck / Controls | Twin-stick independent aiming and right-stick menu pointer support are implemented. Packaged desktop/Deck visual and frame-pacing sign-off remains human/hardware acceptance work. |
| Performance | GPU frame timing and memory-budget diagnostics are implemented. KTX2/Basis texture compression was a Sprint 29 objective but remains plan/research work rather than a verified shipped pipeline. |
| Sprint 29 Presentation Integration | Automated gates passed at closeout: 255 Vitest files / 2,150 tests, ESLint, production build/media audit, presubmit, and chroma-green audit. Human visual sign-off remains open for lighting continuity, reward-preview cycles, weapon/charm framing, and desktop/1280x800 packaged presentation. |
| E2E Harness | Aim-cursor behavior has passing coverage; Sprint 29 closeout also recorded startup/dev-server navigation instability in two runs before gameplay became ready. Treat harness stability separately from feature assertions. |
| Accessibility | Reduced-motion support exists partially. Colorblind support has had multiple wiring fixes and still needs explicit acceptance coverage. Subtitle/caption and text-scaling work are not established as complete. |
| Localization | No project-wide i18n/string-externalization system is established. |
| Test Suite | Latest Sprint 29 closeout evidence: **2,150 passing tests across 255 files**. |
| Working Version | `2.3.1-beta` in `package.json`. Sprint 30 begins as a convergence/governance sprint; do not bump again until its ship scope is locked. |
| Current Milestone | **Sprint 30** — repository/documentation normalization, carry-forward acceptance closure, Steam-release readiness, and a single prioritized product roadmap. |
| Release Tracking | [`docs/versioning-and-release-roadmap.md`](docs/versioning-and-release-roadmap.md) plus [`docs/releases/`](docs/releases/). |

## Current acceptance gates

These are not necessarily code bugs; they are claims that should not be marked "done" until their evidence exists:

1. Two real Steam accounts complete an end-to-end packaged co-op expedition against production services.
2. Desktop 16:9 and 1280×800/Deck presentation pass the Sprint 29 human visual route.
3. Wanderer quest objectives are connected to real gameplay events and persist correctly across the intended save/checkpoint boundaries.
4. Performance targets are measured on packaged hardware; planned texture compression is either implemented and measured or explicitly deferred.
5. Sprint 30 produces one active roadmap and one closeout ledger so unfinished work cannot disappear when a new sprint number is created.
