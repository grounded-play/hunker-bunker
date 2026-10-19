# Release PR: v2.4.18-beta — Definitive First Expedition, Camp Cinematics, Enemy Grammar & Sprint 53 Closeout

> [!IMPORTANT]
> **Local validation draft. Do not open/merge this PR yet.** The packaged build under test was produced from `7add8c30`. Keep this file and subsequent QA evidence local until the PvE/PvP, Deck and performance routes pass.

**Target Branch:** `mothership` ← **Source Branch:** `dev/sprint-53`  
**Baseline:** `v2.4.17-beta` (`d3d8d391`)  
**Candidate:** `7add8c30` · 88 commits · 1,217 changed files at the baseline comparison  
**Intended Release:** `v2.4.18-beta` (runtime package version is still `2.4.17-beta` during validation)

Release notes: [`docs/releases/v2.4.18-beta.md`](v2.4.18-beta.md)  
Canonical QA: [`docs/planning/sprint-53-master-verification-and-execution-plan-2026-10-17.md`](../planning/sprint-53-master-verification-and-execution-plan-2026-10-17.md)

## Summary

Sprint 53 establishes a coherent first expedition and makes the systems encountered immediately afterward read as one authored game:

- fresh solo profiles enter a five-phase Sector 0 and continue into Ring 1;
- safe camps offer deterministic Field Recalibration and elemental fusion;
- Chitin Scuttlers, Spore Mortars and Mycelium Stalkers form a readable combat triangle;
- camp dialogue is earned, non-repeating and presented through one grammar;
- all 32 song cards and side-story beats are mapped through a door-bookended cinematic director;
- real interaction sequences walk the operator to real props and return to dialogue;
- physical props, items and enemy snapshots synchronize through multiplayer;
- world emitters, pools and transferred hazards share bounded runtime systems;
- renderer/scene work addresses the long freezes and CPU cost observed in live logs;
- mobile Lighthouse clears its gate at 93/93.

## Ticket disposition

Do not add `Closes` keywords until packaged evidence is attached. This PR currently references hardware/operations-gated work:

Refs #106, #85, #77, #51, #53, #52, #45

| Ticket | Code state in this PR | Required before closure |
| :--- | :--- | :--- |
| #106 Mobile Lighthouse | Implementation complete; two local runs scored 93, LCP ~3.25 s, TBT 0 ms | candidate CI Lighthouse result |
| #85 Two-account PvE | Prop movement/interaction, item and enemy snapshot parity; join errors surfaced | paired packaged logs plus video |
| #77 Playthrough umbrella | dependent engineering complete | #85 accepted |
| #51 PvP certification | authority, spawn protection, damage/vitals and result paths covered | paired packaged PvP logs |
| #53 Deck acceptance | input provenance, touch dropdowns, settings telemetry and controller routes | physical Deck controller-only log/video |
| #52 Performance | shader churn fixed; mounting, streaming, scatter/camp/day-night work reduced | fixed-route Deck and RTX reports |
| #45 Ship gate | consolidated candidate and runbook | every P0 QA and publisher gate complete |

## Scope delivered

### 1. Rendering, scene weight and web boot

- Removed the shader-program churn responsible for 30–40 second freezes.
- Added container-size caching, animated-mixer culling, scene-weight probes and first-draw/streaming prewarm work.
- Corrected exterior natural ground instead of extending the metal floor grid.
- Cleared mobile Lighthouse through active-locale loading, a boot graph without Three.js, non-blocking fonts, critical CSS and deferred sprites.

Key commits: `ef925e83`, `d6b07238`, `2ba474a7`, `6b0b8a1b`, `5926e68b`, `1e4ae274`.

### 2. World interaction, emitters and hazards

- Added contextual physical vignettes for terminals, safes, cases, cots and the docking gantry.
- Added deterministic emitters, directional outlets, telegraphed fungal vents, coolant/decon payloads, bounded liquid pools and transferred destroyed-prop hazards.
- Calibrated contact planes across 89 wall models and placed spriteless story models/room machines.
- Integrated the 80-asset expansion set, its surfaces and decals.

Key commits: `41ca6fe8`, `79b4601c`, `87eb18c6`, `155d2ece`, `bb94c106`, `5f0e1da4`–`93639f28`, `b12f0f89`, `b4bedd83`.

### 3. Multiplayer parity

- Host synchronizes prop movement, interactions and enemy snapshots in PvE/PvP.
- Multi-client simulation probes and relay-facing tests pin replication and enemy rotation.
- Version/build join failures now explain the mismatch rather than failing silently.

Key commits: `36dbe55d`, `86b00d2a`, `5836d305`, `e7dacd39`.

### 4. Camps, dialogue and cinematics

- Trust/story gates replace first-contact intimacy; choice memory and first-visit rewards prevent repetition/farming.
- Each camp owns its leader; Stranger/Trusted tiers provide non-intimate progression and power perks.
- Sentence-case lines, one person-facing window and structured DIALOGUE telemetry establish one grammar.
- Door bookends, a single queued director and explicit triggers map all 32 song cards.
- Side-story nodes play their own still/music fallback and resume the dialogue behind the doors.
- Interaction sequences persist and run at real anchors for Meridian first contact, Grid Covenant and first cot/night.

Key commits: `b4bedd83`–`c18e17b3`, `2699c189`–`6e7ee8fa`, `fe664c2e`.

### 5. Combat, audio and enemy roles

- One hit-stop owner and camera punch improve impact without stacked freeze windows.
- Chitin Scuttler swarms and Spore Mortar artillery are wired through spawn, behavior, damage, presentation and tests.
- Mycelium Stalker uses sight/cover-aware flanking, flashlight/gunfire retreat, a 650 ms hiss/glow telegraph, 9.8 m/s pounce and toxic retreat payoff.
- SFX pitch spread, O₂ filtering/heartbeat and material-driven layered footsteps improve action readability.

Key commits: `ec8a94b4`, `25c86111`, `6b2e9a92`, `3174f509`, `7f62cfcc`, `c08e78f9`, `d85c5daa`, `7add8c30`.

### 6. Definitive First Expedition and buildcraft

- Fresh-profile routing, legacy-save migration, Sector 0 persistence and explicit skip.
- Five playable phases ending in a continuous Ring 1 transition.
- Field Recalibration: deterministic three-card draft, reroll, before/after stats, one use per camp, squad broadcast and suspend-safe state.
- Sub-Zero Necrosis and other overclocks alter real combat and debrief reporting.
- Bubble-exit and 50% O₂ warnings protect the first minutes without removing survival pressure.

Key commits: `4b052801`, `3174f509`, `76980af2`, `7bdd35c1`, `2a753f4a`.

### 7. Arcade and achievements

- The cabinet owns input and pauses the world.
- Fixed-step simulation makes arcade behavior independent of render rate.
- High scores, blackjack rewards/economy and two published Steam achievements are complete.

Key commits: `21d28fd6`, `882574a6`, `a3e2cd6d`, `35e99055`, `17fa7d7c`.

### 8. UI and controls

- Armory class-switch race fixed and covered across all six permutations.
- DEF-01–DEF-06 resolve Settings, menu audio, Mothership uplink, operator preview/back button and text floors.
- Controller pointer-intent no longer flips a Deck run to keyboard; touch opens native dropdowns; settings changes are logged.

Key commits: `c2a7b4e5`, `15253474`, `05515049`, `1959b52c`.

### 9. Planning, audits and closeout

- Live-play logs were re-read before claims were promoted.
- The camp/cinematics audit records observed evidence, shipped status, first/last/action movie prompts and the next interaction sequences.
- Seventy-seven stale checkboxes were consolidated into one active master plan with ticket-linked evidence gates.

Key commits: `39101c19`, `f10c83f9`, `11bc785a`, `63610473`, `c787b72e`, `03d1fba6`, `7a03d0ab`, `29bde7eb`, `d85c5daa`.

### 10. Local visual-finish follow-up under validation

- Prevented the procedural checker placeholder from being packed into the permanent blended floor arrays.
- Removed raised square floor plates from intact maze/field rooms and bounded them in damaged exterior landforms.
- Capped repeated perimeter GLBs per room without perturbing the seeded composition plan.
- Applied registered wall-mount elevations to GLB-only fixtures and synchronized elevated props/decals with camera cutaways.

## Fresh visual evidence

| Trailer-harness world frame | Live gameplay / current HUD |
| :---: | :---: |
| ![Sprint 53 deterministic wide capture](../reports/assets/sprint-53/wreck-dawn-wide-7add8c30.jpg) | ![Sprint 53 combat capture after local visual-finish corrections](../reports/assets/sprint-53/welcome-committee-working-tree-2026-10-18.jpg) |

The wide frame is from `7add8c30`; the combat frame is from the local validation working tree after the floor, prop repetition, and wall-fixture corrections. These prove repository-native presentation, not packaged acceptance.

## Evidence reached

- [x] Designed
- [x] Coded and connected
- [x] Unit/integration tested
- [x] Deterministic browser/trailer capture
- [x] Mobile Lighthouse local clearance
- [ ] Packaged Electron smoke test
- [ ] Steam-launched installed build
- [ ] Two-account PvE certification
- [ ] Two-account PvP certification
- [ ] Physical Deck controller-only acceptance
- [ ] Deck/PC fixed-route frame pacing
- [ ] Human first-expedition comprehension run
- [ ] Steam Cloud two-machine round trip
- [ ] Production commerce/publisher acceptance

**Highest honest evidence state:** tested and locally captured. The owner-built package from `7add8c30` is now under validation.

## Automated verification recorded

- [x] `npm test`: 6,503/6,503 tests across 764 files.
- [x] Focused Stalker/audio tests: 24/24.
- [x] Changed-file ESLint: 0 errors.
- [x] `git diff --check`: clean.
- [x] Mobile Lighthouse: 93/93; LCP 3.25/3.24 s; TBT 0/0 ms.
- [x] Local visual-finish verification: 6,511/6,511 tests across 766 files; changed-file ESLint clean; deterministic `welcome-committee` capture passed.
- [ ] Re-run full `npm run lint` on the final documentation candidate.
- [ ] `npm run i18n:audit`.
- [ ] `npm run audit:docs`.
- [ ] `npm run presubmit`.
- [ ] `npm run build` from the final clean candidate.
- [ ] Selected Playwright layout/camp probes.

## Packaged QA checklist

Use the exact routes and evidence filenames in the [master verification plan](../planning/sprint-53-master-verification-and-execution-plan-2026-10-17.md). Minimum PR evidence:

1. **BUILD-01:** About/log reports the tested SHA; Deck and PC match.
2. **PVE-01:** paired Deck/PC logs, host reversal, combat/props/recalibration/death/redeploy/extraction.
3. **PVP-01:** paired logs, spawn protection, damage, healing, result agreement and rematch/return.
4. **FIRST-01:** fresh profile Sector 0 through first safe-camp recalibration.
5. **DECK-01:** controller-only 1280×800 plus suspend/resume.
6. **PERF-01/02:** Deck 25-minute and RTX 10-minute fixed routes.
7. **VIS-01:** resolution matrix screenshots and trailer-frame review.
8. **CLOUD-01:** Machine A save → cloud → Machine B restore.
9. **OPS-01:** publisher/store flags, one purchase/cancel/delivery/refund and settlement report when authorized.

## Reviewer focus

1. `src/sectorZeroTutorial.js`, `src/profile.js`, and the deploy/skip wiring: no legacy profile should be forced into onboarding; no fresh profile should bypass it accidentally.
2. `src/fieldRecalibration.js`, `src/fieldWorkbenchUi.js`, and `recalibrateFieldWeapon`: payment, one-per-camp state, fusion choice and squad broadcast must remain atomic.
3. `src/cinematicBeats.js`, `src/interactionSequenceRunner.js`, `src/songInterstitials.js`: a beat plays once, never stacks, and skip applies the same end state.
4. `updateMyceliumStalkerBehavior`: flashlight cone, wall occlusion, contact compatibility and pounce collision.
5. Multiplayer shared-world events: guest state must reconcile without a forced camera or duplicate reward.
6. Performance changes must be judged from presented frame times on the packaged hardware, not renderer-only averages.

## Known gaps / non-goals

- No runtime version bump, tag, Steam upload, backend deploy or PR publication is part of this local documentation pass.
- S-17 (a short visible Field Recalibration install sequence) is planned follow-up polish.
- Vey/Rhun covenant trees and final motion for still-backed side stories remain content work.
- Commercial activation and purchase/refund drills require explicit publisher authority.
