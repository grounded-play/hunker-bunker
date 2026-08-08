# Sprint 22 Systems Breakdown and PM Syllabus

This directory is the new PM's map of Hunker Bunker after the Sprint 21 tile-band merge. It is a synthesis layer, not a replacement for code, tests, the live feature matrix, or operator-only Steamworks evidence.

## Read This First

The original version of this syllabus was generated from plans that predated several completed implementations. This revision was checked against the current branch, recent commit history, runtime call sites, and the full automated suite. It uses four distinct status words:

- **Implemented:** production code exists.
- **Connected:** the shipped runtime invokes it.
- **Automated:** tests or build gates exercise it.
- **Accepted:** a human has proved it in the actual environment that matters, such as an installed Steam build or physical Steam Deck.

Do not turn “implemented” into a store claim when “accepted” is still open. The canonical cross-feature claim matrix remains [Current Feature Status](../current-feature-status.md).

## Current Baseline

As reviewed for this update:

- Branch: `dev/sprint-21`, carrying the merged `feat/tile-bands-v2` history.
- Automated baseline: 1,044 passing Vitest tests.

> **Update (2026-08-02, end of Sprint 21):** 58 more commits landed after this
> syllabus was first written, bringing the branch to 184 commits ahead of
> `mothership` and the automated baseline to **1,101 passing Vitest tests**
> (143 files). Two shipped systems from that window have no coverage
> elsewhere in this directory — see [Run Director and Events](13-systems-run-director-and-events.md)
> for the LineDirector ambient-commentary arbiter, and the new
> [Rendering and Performance](14-engineering-rendering-and-performance.md)
> for the wall/door draw-call fix. Nothing else in this syllabus was found
> to describe already-shipped work as hypothetical — the remaining content
> below still reflects the state as of the original write-up.

> **Update (2026-08-04, dev/sprint-22):** automated baseline is now
> **1,215 passing Vitest tests** (155 files). First real human-observed
> playtest evidence for Sprint 22 priorities 2-4 (world tuning, first-hour
> observation, combat comparison) landed — see
> [Playtest Evidence: Log1 Findings and Improvement Plan](15-playtest-log1-findings-and-plan.md),
> which also confirms two code-level bugs (a `foundry-discovered` event
> dedup gap, and a bunker-door/boss-AoE safety mismatch that caused the
> logged run's death) against current `src/threeGame.js`.
- World baseline: 49×49 canyon-band chunks, authoritative radial topology, deterministic ring gates, merged multi-cell rooms/halls, and a Ring 2 bridge traversal unlock are implemented.
- Platform baseline: native Steam Input plus browser fallback, Linux/Windows Electron packaging, session-token backend auth, Cloud save bridge, achievements/stats forwarding, leaderboards, and Inventory/Vault paths exist in code.
- Narrative baseline: Act 2 schema version 3, manifest validation, ten ending families, explanation text, the 0047/Queen canon weld, class wreckage logs, and death-reactive dialogue are implemented.
- Audio baseline: 43 OST files and Steam metadata are packaged; five core exploration/combat cues and authored song interstitials are connected. A universal 43-track dynamic spatial score is not.
- Release baseline: automated checks are strong; installed-Steam, live-dashboard, two-machine Cloud, and physical Deck acceptance remain human gates.

## Reading Order

### 1. Product and release orientation

1. [Master PM Onboarding](00-master-pm-onboarding.md)
2. [Platform, Backend, and Steam](05-platform-and-backend.md)
3. [UX and First Hour](12-ux-first-hour-and-presentation.md)

These establish what the game is, what is safe to claim, and which risks require human evidence.

### 2. World and moment-to-moment play

1. [World Generation and WFC](01-world-generation-and-wfc.md)
2. [WFC Chunk Math](06-engineering-wfc-chunk-math.md)
3. [Combat, Movement, and Classes](02-combat-and-classes.md)
4. [Combat and Boss Phases](07-engineering-combat-boss-phases.md)
5. [Run Director and Events](13-systems-run-director-and-events.md)
6. [Rendering and Performance](14-engineering-rendering-and-performance.md)
7. [Playtest Evidence: Log1 Findings and Improvement Plan](15-playtest-log1-findings-and-plan.md)

### 3. Consequence and narrative

1. [Factions, Camps, and Hives](03-factions-and-hives.md)
2. [Act 2 State Schema](08-engineering-act2-state-schema.md)
3. [Narrative and Manifest](04-narrative-and-manifest.md)
4. [Secret Sauce and Lore](11-narrative-secret-sauce-and-lore.md)
5. [Audio and Soundtrack](10-engineering-audio-and-soundtrack.md)

### 4. Platform implementation detail

1. [Steam Backend Authentication](09-engineering-steam-backend-auth.md)
2. [Steam Build Pipeline](../steam-build-pipeline.md)
3. [Backend/Steam Connection Audit](../backend-steam-and-game-connection-audit-2026-07-28.md)
4. [Master Implementation Plan](../master-implementation-plan-2026-07-28.md)

## Evidence Hierarchy

When sources disagree, use this order:

1. Current code and tests.
2. [Current Feature Status](../current-feature-status.md).
3. Current build/depot/backend audits.
4. This Sprint 22 syllabus.
5. Dated master plans and reviews.
6. Archived sprint proposals and agent walkthroughs.

Reviews remain valuable for product diagnosis even after their implementation claims become stale. For example, the first-hour teardown still expresses real quality risks, but several items it described as absent—settings, skip flow, director, boss phases, and lore welds—now have code.

## PM Operating Cadence

- Every sprint item needs an owner, evidence path, acceptance environment, and explicit non-goals.
- Update the feature matrix when implementation or acceptance changes.
- Require a human observation note for first-hour, combat feel, world readability, and physical hardware claims.
- Keep Steam store copy behind `npm run steam:claims:check`.
- Keep storefront/source art under `steam/store/`; build and depot audits reject it from customer payloads.
- Do not place credentials, session tokens, auth tickets, or production environment values in documentation.

## Sprint 22 Outcome

Sprint 22 should not rebuild systems that already exist. Its job is to turn the implemented vertical slice into accepted product evidence:

1. Run first-hour and long-run observation passes.
2. Tune merged 49×49 spaces and ring landmarks from play, not diagrams.
3. Extend the Queen-quality phase framework to remaining bosses only if playtests justify it.
4. Make faction and ending consequences legible without exposing every variable.
5. Finish installed-Steam, backend, Cloud, controller, and physical-Deck acceptance.
6. Decide which of the 43 soundtrack cues deserve stateful runtime placement rather than playing all tracks indiscriminately.
