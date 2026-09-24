# Sprint 46 — Player Experience Report: One More Run

Status: evidence report · Updated: 2026-09-24 · Branch: `dev/sprint-46` · Baseline build: `59564d1`

## Evidence scope and sample size

| Source | Size | What it can show | What it cannot |
| --- | --- | --- | --- |
| Scripted journey probe (Playwright, headless Chrome + SwiftShader, Linux) | **Before:** 3 fresh campaigns × 3 consecutive deployments = 9. **After:** 3 × 3 = 9 (+3 from a concurrent run) | What a deployment presents: objectives on screen, hostiles near the player, bounty visibility, the results screen | Feel, fun, confusion, desire to replay |
| Scripted build probe (3 classes, auto-aim and fire at the arrival pack) | 3 classes × 2 deployments | Time to clear, shots, hearts lost per class | Whether a class *feels* different to play |
| Code inspection | — | Whether a promise is wired to a reward | — |
| **Human playtests** | **0 players** | — | No observation about enjoyment, confusion, memorable moments or unprompted replay exists yet. Nothing below is player feedback. |
| **Physical Steam Deck** | **0 sessions on this build** | — | Deck acceptance stays open. |

Headless-Chrome frame rates are far below real hardware and game time advances at most 0.05 s per frame, so timings in §4–5 are relative (before vs after on the same machine), not absolute.

## 1. The journey through the first three deployments — findings

**Confirmed** = observed in the probe or proven in code. **Hypothesis** = plausible, not demonstrated.

| # | Finding | State | Evidence |
| --- | --- | --- | --- |
| F1 | **The first minutes of every deployment have no fight.** At deploy and 24 s later, 0 hostiles within 25 units in 9/9 deployments; the nearest was 66–88 units away (or none loaded). Enemies and Sprint 45's per-deployment rubble are both excluded from the crash-site chunk and the tutorial ring, so the first ~70 units are identical and empty every time. | Confirmed | before probe; `applyExpeditionObstacles` / tutorial-ring exclusions in `src/threeGame.js` |
| F2 | **Expedition bounties were a promise never kept.** Every deployment rolled a bounty ("Eliminate a mutated sector stalker", `rewardBonus: 80`) and the briefing card showed it; nothing tracked, completed or paid it — `rewardBonus` had no reader. One target ("120+ scrap") was unreachable at the game's scale (a 12-minute Deck session collected 3 pickups). | Confirmed | code trace (`EXPEDITION_BOUNTIES` → only the briefing card read it); bounty absent from the tracker in 9/9 before-deployments |
| F3 | **Returning to the ship did not say what the run achieved or what is next.** The results screen reports distance, pickups, kills, time, bank and score — nothing about the condition, the bounty, objectives completed, or the next ship goal and what it still costs. | Confirmed | results screen markup; 0/9 before-deployments showed any of it |
| F4 | Consecutive deployments vary less than their modifiers suggest: the same condition rolled twice in a row in 2 of 3 campaigns, and one bounty (`clearing_breach`) was 5 of 9. | Confirmed (small sample) | before probe |
| F5 | The crash-site chunk is fixed geometry (single north door, fixed rectangle). | Confirmed | `clearSpawnArea`; register GAP-GP-08 |
| F6 | 24 architecture-kit GLBs are registered but not routed in-world (GAP-RN-03). | Hypothesis here (register claim, not re-verified this sprint) | master gaps register |
| F7 | Class identity rests on stats and passives; whether the three classes demand different tactics against the same threat is unmeasured. | Hypothesis | build probe (§5) measures outcomes only |
| F8 | Optional camp quests, Archives and permanent unlocks exist and are wired (e2e specs cover camp quests and the archive); their reward clarity to a new player is unassessed without playtests. | Hypothesis | — |

## 2. The three improvements

Chosen because each fixes a confirmed problem using places, enemies and systems the game already has; none adds a new system to the feature list.

### I1 — The arrival incident (F1, F5)
Shortly after landing, a small pack closes on the wreck. **Who** comes is the deployment's condition (the gale brings cryosnails, a spore bloom brings sporesnails riding the cloud, stillness brings one elite mycelium stalker), **from where** is rolled from the expedition seed, and a radio line calls it in. It is tracked as a CONTACT objective with a compass bearing; clearing it drops a salvage cache at the last body. A campaign's first deployment gets a smaller, never-elite pack. Crash-site geometry is untouched, so saves and campaign geography are preserved; solo only (co-op would need the host authority from `src/coopTransitions.js`).
Files: `src/arrivalIncident.js`, `ThreeGame.armArrivalIncident / updateArrivalIncident / spawnArrivalIncident`; 7-locale radio lines.

### I2 — Bounties that are tracked and paid (F2)
Each bounty now has an achievable target at the game's scale (8 salvage caches; 1 elite; 3 rooms of one compound; 6 walls), progress on the objective tracker **and** a chip in the expedition panel (the tracker's two cards are usually taken), and a real payout: the full `rewardBonus` in shells, secured by a successful extraction through a receipt-backed bank grant (so a death forfeits it and nothing pays twice). Built jointly with a concurrent agent: the tracking, targets and chip here; the extraction-secured, receipt-backed settlement in `src/bank.js` / `settleExpeditionBountyOnExtraction`.
Files: `src/expeditionBounties.js`, `ThreeGame.syncExpeditionBountyTracker / recordExpeditionBountyEvent`, four event hooks (salvage pickup, elite kill, compound room, player-smashed wall).

### I3 — The expedition report on the results screen (F3)
The first section of the results screen now reads: the deployment's condition; the bounty met (with shells) or missed (with progress); the objectives completed *this* deployment (from the objective registry's history); and the next ship goal — "affordable, build it at the console" or exactly what it still needs.
Files: `src/expeditionReport.js`, `ThreeGame.getExpeditionReportData`, `#go-expedition-report`.

### Gap follow-up (2026-09-24)
- **GAP-GP-08 — crash-site monotony: mitigated.** Beyond the arrival pack, each deployment now leaves three pieces of seeded, destructible wreckage in the crash room (bunker junk, supply lockers — existing props that drop salvage), placed only on floor tiles clear of the wreck, the operator and the north door lane (`planCrashSiteDebris`, `ThreeGame.placeCrashSiteDebris`). Browser-checked across two consecutive deployments: 3 pieces, all on floor, layout changed (`bunker_junk@12.5,16.5 · supplies@14.5,15.5 · junk@3.5,15.5` → `junk@3.5,15.5 · supplies@14.5,15.5 · junk@14.5,10.5`). Room walls and doors are unchanged on purpose. Whether players notice or break the wreckage is unobserved.
- **GAP-GP-02 — controller secondary attack: resolved on evidence.** Keyboard and mouse attack with Fire and Smash (V); right-click only orbits the camera. Every controller layout binds Fire and Smash; a contract test now locks that parity.
- **GAP-GP-14 — slow headless boots: open.** A test-only warmup bypass measured no gain (bypass 97 s / 81 s vs production 78 s / 95 s to gameplay) and was removed.

## 3. Regression tests
`src/arrivalIncident.test.js` (incl. crash-debris plan), `src/threeGame.arrivalIncident.test.js` (incl. debris placement), `scripts/build-steam-input-configs.test.js` (controller attack parity), `src/expeditionBounties.test.js`, `src/threeGame.expeditionBounty.test.js`, `src/threeGame.bountyChip.test.js`, `src/expeditionReport.test.js`. `npm test`: 4,041 tests across 449 files passing; `npx eslint .` clean; `npm run i18n:audit` unchanged (all new text in 7 locales).

## 4. Before / after — journey probe

Same probe, same machine. **Before** = `59564d1` (no improvements); **after** = working tree with I1–I3. Each campaign is a fresh New Run (random seed), then three consecutive deployments via death → TRY AGAIN.

**Probe adjustment (after only):** this machine renders at under 1 fps under SwiftShader and game time advances at most 0.05 s per frame, so the arrival incident's 20 s delay took ~10 min of wall time. After recording the at-deploy snapshot, the probe shortens *only that delay* (`_arrivalIncident.timer`). Spawn, composition, tracking, radio and results screen are the real runtime.

| Measure | Before (3 campaigns, 9 deployments) | After (3 campaigns, 9 deployments) |
| --- | --- | --- |
| Hostiles within 25 units after landing | **0 / 9** (nearest 66–88 units, or none loaded) | **9 / 9** — 1–3 closing in at 16–19 units |
| First fight announced | never | 9 / 9 (condition radio line, e.g. *"TOO QUIET. ONE CONTACT, BIG, AND IT KNOWS WHERE YOU ARE."*) |
| First fight on the tracker | never | 9 / 9, top card ("CONTACT — CLEAR THE 3 HOSTILES CLOSING IN") |
| Arrival varies by deployment | — | first deployment of every campaign: 2 non-elite; later: condition pack (3 cryosnails / 3 crawlers / 3 cybersnails) or 1 elite mycelium stalker |
| Bounty visible during play | 0 / 9 | expedition-panel chip + tracker entry (the tracker's two cards are usually taken, so the chip is what stays visible) |
| Results screen says what the run achieved and what is next | **0 / 9** | **9 / 9** — condition, bounty met/missed with progress, completions, next ship goal and exact shortfall |

After campaigns (seeds): 1464051754, 2518743434, 2941328483. Example report (seed 2518743434, deployment 2): *Condition: BIO-RESIN SURGE / Bounty missed — Map 3 rooms of one outlying compound (0/3) / No objectives completed this deployment / Next: O₂ GENERATOR MODULE needs 10 TECH · 5 MED · 5 COIN more.*
A concurrent run of the same probe (seed 1552818935, recorded by another agent) matched: arrival active at 15–18 units in 3/3, report shown 3/3.

**Observed, not yet explained:** consecutive deployments repeat conditions (Sub-Zero Stillness twice in a row, Bio-Resin Surge twice in two campaigns) — F4 persists; I1 makes the repeat *felt* more strongly because the same pack returns.

## 5. Build comparison

Scripted fight: each class meets its arrival pack standing at the landing point, aiming at the nearest pack member and firing every 150 ms (no movement, no melee, no abilities). World drawing is suspended during the fight so the simulation runs at speed; outcomes, not visuals, are measured. 3 classes × 2 deployments.

| Class | Deployment 1 (intro pack) | Deployment 2 (full pack) |
| --- | --- | --- |
| SCOUT | 2 cryosnails — **not cleared in 90 s** (154 shots) | 3 cybersnails — cleared in 30.0 s, 64 shots, 0 hearts lost |
| TANK | 2 cybersnails — cleared in 26.4 s, 56 shots, 0 hearts lost | 3 crawlers — cleared in 23.2 s, 47 shots, 0 hearts lost |
| ENGINEER | 2 cybersnails (Geothermal Arc) — **died**, 33 shots | 3 cryosnails — cleared in 54.1 s, 91 shots, 0 hearts lost |

What this does and does not show:
- The pack reaches and engages a stationary player in 5/6 fights; a player who never moves can still stall (SCOUT, deployment 1: shots likely striking the bunker walls while the pack held outside). **Hypothesis:** real players walk out to meet it; to confirm in playtest.
- ENGINEER died in a Geothermal Arc deployment with no heart loss recorded by the probe; the arc condition's kill signature discharges on the player when a kill happens close by. **Hypothesis for the cause**; not verified.
- Time-to-clear differs by class (TANK fastest, ENGINEER slowest against cryosnails), but a stationary auto-aimer does not use what distinguishes the classes (movement, melee, abilities). Whether each class *plays* differently is unmeasured here.

Design context (from code, not measured): a concurrent change gives each class its own melee profile — SCOUT *Slipstream Strike* (fast, speed burst on hit), TANK *Seismic Slam* (heavy cleave, knockback, breaches walls), ENGINEER *Overcharge Pulse* (stun cone, pulls salvage) — covered by `src/threeGame.classCombat.test.js`.

## Evidence files
`docs/reports/assets/sprint-46/`: `journey-before.jsonl`, `journey-after.jsonl`, `builds.jsonl` (raw probe output), and screenshots — landing in gameplay and the results screen, before (`before-deploy-gameplay.png`, `before-results.png`) and after (`after-deploy-gameplay.png`: CONTACT tracked, bounty chip in the expedition panel; `after-results.png`: the expedition report as the first section).

## Reproduce

```bash
npm test                                  # unit + runtime regression tests
# Probes need a dev server; without one, Playwright starts `npm run dev`.
HB_PROBES=1 HB_PROBE_LABEL=after HB_PROBE_OUT=/tmp/probe \
  npx playwright test tests/e2e/probes/journey.spec.js --repeat-each 3   # 3 fresh campaigns × 3 deployments
HB_PROBES=1 HB_PROBE_OUT=/tmp/probe npx playwright test tests/e2e/probes/builds.spec.js
```
Each run prints `JOURNEY {…}` / `BUILD {…}` JSON lines and writes gameplay and results screenshots to `HB_PROBE_OUT`. For the "before" numbers, run the journey probe on `59564d1` (the probe's arrival-delay shortcut is a no-op there).

## 6. Still open
- **Human playtests** (0 so far): confusion, enjoyment, perceived variety, memorable moments and unprompted replay are unmeasured. The first session should watch whether players notice the arrival radio line, understand the bounty chip, and read the expedition report before pressing TRY AGAIN.
- Physical Steam Deck, packaged co-op and Steam Cloud acceptance: unchanged, open.
- F4 (condition/bounty repetition across consecutive deployments), F6 (unrouted architecture kit) and F7 (class tactics) are candidates for the next sprint.
