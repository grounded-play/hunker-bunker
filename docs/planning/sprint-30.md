# Sprint 30 — Acceptance, Coherence, and Repository Control

Status: active plan · Owner: repository maintainers · Updated: 2026-08-24 ·
Branch: `dev/sprint-30` · Working baseline: `v2.3.1-beta` · Release target:
decide at scope lock

## Thesis

Make one complete Hunker Bunker expedition trustworthy before expanding the
surface area again. Sprint 30 converts repeatedly deferred acceptance work into
evidence, repairs the first-hour/product-coherence gaps that players actually
feel, and establishes one controlled documentation/backlog path.

## Starting evidence

- Sprint 29 merged presentation, audio/telemetry, model integration,
  weapon/charm calibration, reward feedback, and locomotion fixes.
- `npm test` passes 2,152 tests across 256 files on 2026-08-24.
- Sprints 24, 26, 28, and 29 all left some combination of packaged-build,
  real-hardware, two-account, Cloud, and first-hour acceptance open.
- Sprint 29's original Wanderer, balance, Deck optimization, and Steam
  certification lanes did not receive equivalent completion evidence.
- `main.js`, `src/threeGame.js`, and `style.css` are 13.7k, 30.2k, and 20.1k
  lines respectively; architectural extraction is necessary, but not a reason
  to derail this acceptance sprint.
- The technical-debt audit found 17 of 144 `src/` modules without colocated
  tests. `seasonPassUi.js` and `rewardPreview.js` are the highest-risk Sprint 29
  gaps because their DOM/Three.js wiring sits beyond well-tested pure helpers.
- Four of five feature flags are permanently enabled. The Armory flag's comment
  contradicts live behavior, and authored-world flag evaluation is redundant.
- No marker debt was found: zero TODO/FIXME/HACK markers, lint suppressions, or
  skipped tests. Sprint 30 should remove stale gates, not invent a cleanup quota.

## Committed outcomes

### 1. Establish current truth and planning control

- [x] Add a documentation map and lifecycle/ownership system.
- [x] Reconcile README, Product State, branch, version, and release roadmap for
  Sprint 30.
- [x] Record every major carryover from Sprints 24–29 in an ordered roadmap.
- [x] Add a repeatable canonical-document audit.

### 2. Prove the single-player Proof Run

- [ ] Install a production package and record one 35–45 minute expedition on
  real GPU hardware from class selection through extraction or an understood
  ending.
- [ ] Use a player who has not read the design docs; capture confusion at 5,
  15, and 45 minutes using `docs/first-hour-acceptance-plan.md`.
- [ ] Confirm the player understands O₂ pressure, the Depth Contract choice,
  at least three build-changing relics, current objective, death/recovery, and
  extraction without coaching.
- [ ] Reproduce or clear the remaining Sprint 29 visual route at desktop 16:9
  and 1280×800: lighting, reticle, menus, reward reveals, weapons/charms, and
  foot slide.

Evidence: `docs/reports/sprint-30-proof-run-2026-08-XX.md` plus recording/logs.

### 3. Prove the production co-op path

- [ ] Complete one expedition with two real Steam accounts through the
  production relay: invite/cold start, roster/loadout, ready/deploy, combat,
  reconnect, host change, and extraction.
- [ ] Test accounts in different regions. If public discovery remains blocked,
  document the binding limitation and prove the supported invite/relay path.
- [ ] Verify no duplicate grants, divergent objective/boss state, or lost host
  authority after reconnect.

Evidence: `docs/reports/sprint-30-steam-coop-2026-08-XX.md` plus server/client logs.

### 4. Close platform acceptance, not platform scope

- [ ] Physical Steam Deck pass: 60 FPS pacing sample in dense rooms, controller
  navigation, twin-stick aiming, glyphs, haptics, suspend/resume, and 1280×800.
- [ ] Two-machine Steam Cloud round-trip: online, offline, conflict, corruption
  recovery, and checkpoint interaction.
- [ ] Re-run production backend health/session/leaderboard smoke checks and
  record which Steam dashboard items remain operator-owned.
- [ ] Exercise packaged crash/restart recovery from a mid-run checkpoint.

Evidence: one platform acceptance report with machine/build identifiers.

### 5. Fix only failures exposed by the acceptance routes

- [ ] Rank observed defects by run-blocking severity and player frequency.
- [ ] Fix P0/P1 failures with regression coverage and rerun the route that found
  each failure.
- [ ] Convert repeated E2E startup/navigation flakiness into a deterministic
  readiness contract if it blocks acceptance evidence.
- [ ] Update Product State and store-claim checklists from results.

### 6. Retire measured repository debt

- [x] Cover the Season Pass claim → reveal → dismiss DOM lifecycle using the
  existing mock-element testing pattern.
- [ ] Add focused wiring coverage for `rewardPreview.js` where lifecycle and
  Three.js disposal behavior are not already proven through extracted helpers.
- [x] Remove the four permanently enabled feature flags and simplify their live
  call sites without deleting the still-reachable Act 2 fallback.
- [x] Keep tests colocated with their modules. Do not move 193 test files into
  `tests/`; Vitest and current parallel ownership both benefit from colocation.
- [x] Remove the verified duplicate root favicon and zero-byte `node` artifact;
  retain `public/favicon.png` as the served source.
- [x] Retire fully merged/duplicate local sprint branches after verifying ancestry. Remote
  branch deletion remains a deliberate repository-maintainer action.

## Stretch outcomes

These may begin only after Outcomes 2–4 have evidence:

- Complete one bounded Wanderer multi-stage quest slice with persistence and
  distinctive companion feedback, then use it as the pattern for all six.
- Address the measured top packaged-build performance hotspot.
- Produce a seam map and first extraction proposal for `main.js`,
  `src/threeGame.js`, and `style.css`; no speculative rewrite.

## Non-goals

- New game modes, currencies, factions, or broad content categories.
- Another multiplayer/lobby architecture rewrite without a reproduced failure.
- Bulk asset generation before existing assets pass in-game visual review.
- Marking hardware, Cloud, dashboard, or human comprehension boxes complete
  using unit tests alone.
- Moving hundreds of historical documents in the same change as truth cleanup.

## Definition of done

Sprint 30 closes only when:

1. The single-player, two-account co-op, Deck, Cloud, and packaged recovery
   reports exist, or each unrun check names a concrete external owner/date and
   is honestly marked open.
2. Every P0/P1 found on those routes is fixed and rerun, or explicitly blocks
   release in Product State.
3. `npm test`, `npm run lint`, `npm run presubmit`, `npm run build`, and
   `npm run audit:docs` pass.
4. The sprint closeout classifies every item as delivered and accepted,
   carried with reason, blocked with owner, or cut with rationale.
5. The Season Pass DOM lifecycle is regression-tested and stale permanent
   feature gates no longer misdescribe runtime behavior.
