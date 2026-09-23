# Campaign Day Cycle, Fatigue System, Safe Hub / Bed Flow, and Multi-Goal World Simulation

**Date:** 2026-09-22
**Status:** Revised after code review — pure-module work implemented
**Scope:** Level & world layout, ring-gate stage goals, camp & hive integration, day/night cycles, fatigue ladder mechanics, and physical bed/hub transitions.

---

## 1. Executive Summary & Design Vision

Hunker Bunker already has the underlying systems — `dayCycle.js`, `camp.js`, `hiveSite.js`, `ringManifest.js`, `skyState.js`. The gap is not that they are missing but that they are **disconnected**: the campaign day only moves when the player sleeps, sleeping is nearly unreachable, and the sky knows nothing about the day counter.

This design connects them into one **Expeditionary Campaign Loop**:

```text
+---------------------------------------------------------------------------------+
|                                 DAY N EXPEDITION                                |
|  - Surface exploration through Sector 0 and outer Rings (R1 -> R2 -> R3 -> R4)  |
|  - Ring goal progression (ringManifest MANDATORY_SHIP_GOALS, one per ring)      |
|  - Faction secondary goals (Camp survival assistance vs. Alien Hive parley)     |
|  - Environmental pressure: fatigue ladder keyed to expeditions since sleep      |
+---------------------------------------------------------------------------------+
                                         |
                                         v
+---------------------------------------------------------------------------------+
|                            THE BED / SLEEP TRANSITION                           |
|  - Physical interaction with a Bunker Cot or Forward Camp Bedroll               |
|  - Day wrap-up: haul secured, story linchpins ticked, fatigue cleared           |
|  - Overnight world simulation: hives creep, undefended camps degrade            |
+---------------------------------------------------------------------------------+
                                         |
                                         v
+---------------------------------------------------------------------------------+
|                             SAFE HUB / MORNING PHASE                            |
|  - Wake in the Foundry interior pocket-plane; sky pinned to dawn                |
|  - Overnight ledger, then deploy to Day N+1                                     |
+---------------------------------------------------------------------------------+
```

---

## 1A. Reconciliation With Shipped Work (read this before touching the flow)

An earlier draft of this plan proposed rerouting the run boundary away from `#menu` and keeping `#menu` "strictly for initial title boot, settings, and multiplayer lobbies". That **conflicts with work already shipped**.

`docs/planning/homebase-console-and-run-flow-overhaul-2026-09-21.md` is marked **Implemented 2026-09-21**. It makes `#menu` the **Homebase Command Console**: callsign and operator ID, career telemetry, frame selection, persistent base facilities, and the forward sequence **ENTER ARMORY → CONTINUE TO DEPLOYMENT → DEPLOY**. Stranding that behind a new in-world hub would discard a shipped consolidation and leave two screens owning the same decision.

**Decision: the console stays; the bed only advances the day.**

| Concern | Owner | Why |
|---|---|---|
| Identity, career telemetry, frame selection, armory, deployment | `#menu` Homebase Command Console (shipped) | Already built, already localised, already covered by Playwright specs |
| Ending a day, overnight ledger, waking into the world | In-world bed + Foundry interior | Needs to be diegetic; this is the part the campaign was missing |

Consequences, binding on every phase below:

- No step may strand or duplicate **ENTER ARMORY → CONTINUE TO DEPLOYMENT → DEPLOY**.
- The bed does **not** grow an armory, fabricator or map table UI. Those belong to the console. The bed's job is: confirm, advance the day, run the overnight sim, show the ledger, wake the player.
- **The Foundry interior becomes the hub. It is not retired.** `beginCampRest()` already enters it (`enterFoundryInterior()`, emitting `day-rest-open` with `safeSpace: 'foundry-interior'`) and `finishCampRest()` already reopens the south airlock. That is the morning space; we dress it, we do not replace it.
- A second 3D hub in Sector 0 is explicitly **out of scope** until the Foundry version has shipped and been played.

---

## 2. The Fatigue Ladder — Implemented (`src/fatigue.js`)

### 2.1 What it is keyed to

**Expeditions since sleep — not seconds elapsed, sprint duration or damage taken.**

An earlier draft proposed a 0–100% meter draining inside a single run. That is a stamina bar: it resets every run, so "never slept" can never happen, and it says nothing about the choice this campaign is actually built around. The clock here only moves when the player chooses to sleep, so fatigue has to be the counterweight on the same axis: **resting costs a day, and days are what story deadlines are made of; not resting costs the body.**

### 2.2 The ladder

Every stage past baseline pays for its penalty with an upside, so pushing on is a gamble rather than self-harm — one more lever in the run strategy, not the only one.

| Stage | Reached at | Cost | Compensation |
|---|---|---|---|
| **RESTED** | just slept | — | healing +25%, O₂ drain −10% |
| **ALERT** | 1 expedition | — | — (baseline) |
| **STRAINED** | 2 | healing −15%, sway +15% | salvage value +10% |
| **RAGGED** | 3 | healing −25%, move −8%, O₂ +12%, sway +30% | relic rarity +1 tier, scrap magnet +1 |
| **THE LONG DARK** | 4+ | healing −40%, move −12%, O₂ +20%, −1 max heart, sway +50% | relic rarity +2, salvage +25%, hidden-room detection +3 |

Five states, not the six first proposed: `BREAKING` and `LONG DARK` were one distinction too many and are merged.

### 2.3 Scars — the part that does not fully heal

Sleeping clears the ladder. Sleeping **from RAGGED or worse** leaves a scar that lasts the playthrough.

| Scar | Effect | Treatment |
|---|---|---|
| **TREMOR** | sway +12% per severity | medic: one tier, floor of 1 |
| **HYPERVIGILANCE** | healing −10%, detection +2 per severity | medic: one tier, floor of 1 |
| **NIGHT TERRORS** | healing −6% per severity | medic: one tier, floor of 1 |
| **BLUNTED** | healing −12%, O₂ +5% per severity | **untreatable** |

Two rules make a degrading campaign legible rather than a hidden counter:
- Each collapse leaves a **new** mark; severity only deepens once all four are held.
- **BLUNTED is acquired last**, so the untreatable end state reads as a campaign run into the ground, not bad luck on night one.

Treatment lowers severity by one tier and **floors at 1**: a treated scar is quieter, never absent.

### 2.4 Presentation: no agency may be removed, by any route

The earlier draft correctly refused to drop inputs — then specified 0.4–0.8s eyelid-blur pulses and high-inertia aim damping. In a lethal permadeath game, being blinded for most of a second, or having aim damped, **removes control just as effectively as dropping input**, and players read it the same way: a bug.

Binding rules:
- **No dropped or discarded inputs**, ever.
- **Blur is capped below the threshold where a threat becomes invisible, and never reaches full black.** It reads as strain, not as a cutscene.
- **Aim response stays linear.** No inertia curve, no damping, no drift.
- **Sprint is never disabled.** At high fatigue sprint becomes *expensive* — faster drain and longer recovery — because deleting a core verb for most of a run is a worse answer than pricing it.
- Cost belongs in **legible stats** (healing, O₂, sway, max health) that the player can read on the HUD, not in the camera.

### 2.5 Module boundaries

`src/fatigue.js` is **pure** — no DOM, no Three.js, no storage — matching `dayCycle.js`. It persists under its own key `hb_fatigue`.

`src/vitals.js` stays what it is: a **HUD renderer** (`VitalsHUD`, listening for `player-o2-changed`, drawing hearts and the O₂ bar). It reads fatigue; it does not own it. Putting a simulation meter inside a view class was the earlier draft's layering error.

Fatigue emits its modifiers under **the same keys the loadout bus already composes** (`healingMultiplier`, `oxygenDrainMultiplier`, `moveSpeedMultiplier`, `salvageValueMultiplier`, `relicRarityTierBonus`, `scrapMagnetRadiusBonus`, `hiddenRoomDetectionRange`, `maxHealthBonus`), so fatigue stacks with equipment through one code path instead of a special case.

---

## 3. The Bed: Ending a Day

The bed does not replace the Homebase console (§1A). It ends the day and wakes the player in the world.

### 3.1 Where rest is possible — one rule, every bed

Rest now asks a single predicate, `canRestNow(dayState, context)` in `src/dayCycle.js`, used by the camp verb and by any future bed (bunker cot, outpost pod):

| Condition | Rule |
|---|---|
| Safe space | caller asserts it (camp interior, cot, pod) |
| Day phase | must be `EXPEDITION` — sleeping twice would advance two days |
| Site status | must be `alive`; a robbed or destroyed site is not a bed |
| Active contract at this site | blocks rest, so a live beat cannot be slept through |
| Hostiles nearby | blocks rest; camps pass `false` since a camp interior is already guarded |

**What changed and why it mattered:** `SLEEP UNTIL DAY N` previously carried its own inline gate that *also* demanded an Act 2 camp in `dormant` phase, alive, questless — and it was offered only after talk / bond / active-verb were exhausted. In ordinary play the verb almost never appeared, which is the single biggest reason the day cycle read as unimplemented. Rest is still offered last in the verb order, so urgent camp story is never skipped by accident, but whether rest is *possible* is now one shared rule.

### 3.2 The sleep sequence

1. **Confirmation & warning.** If sleeping tonight permanently closes an unresolved deadline (`deadlinesClosingTonight`), the existing `day-rest-warning` modal presents SLEEP ANYWAY / STAY AWAKE.
2. **Fade to night.** Camera retreat, lights down to amber auxiliary, fade to black.
3. **Overnight ledger.** The morning report is built from `simulateOvernight()`'s `ledger` array — one line per real change, no invented telemetry.
4. **Morning.** Fade up inside the Foundry interior. **The sky is pinned to dawn** (§5.1), so a new day looks like one.

---

## 4. Level & World Topology: Ring Goals, Camps, and Hives

Concentric rings around the crash epicentre. **Identifiers below are the ones in the code** — an earlier draft invented gate names (Causeway Bridge, Chitin Ridge Blast Wall, Synaptic Chasm Overpass) that exist nowhere, which would have created a second vocabulary for the same objects.

```text
[ SECTOR 0: BUNKER EPICENTER ]
              |
        (ring crossing — ringCrossings.js owns the plan and state)
              |
[ RING 1 ]  goal: o2Bubble            camp_meridian (Overseer Kaelen)   hive_suture (nahl)
              |
[ RING 2 ]  goal: hullExpansion       camp_tallow (Sister Martha)       hive_carapace (rhun)
              |
[ RING 3 ]  goal: radarNode           camp_vesper (Commander Briggs)    hive_relay (vey)
              |
[ RING 4 ]  goal: reactorCompressor   final_shelter -> queen_chamber
```

### 4.1 Multi-goal stage architecture

**Primary goal per ring** is already authored in `ringManifest.js` `MANDATORY_SHIP_GOALS`, each with a `roomFamily` and an `objectiveAnchorId`:

| Ring | goalKey | roomFamily | anchor |
|---|---|---|---|
| 1 | `o2Bubble` | o2 | `o2_control` |
| 2 | `hullExpansion` | engineering | `hull_fabrication_console` |
| 3 | `radarNode` | security | `radar_alignment_console` |
| 4 | `reactorCompressor` | engineering | `compressor_control` |

**Crossings** between rings are `ringCrossings.js`: `buildRingCrossingPlan()`, `RING_CROSSING_STATES`, `reconcileRingCrossingState()`, `getOpenRingCrossingIds()`, `getRingCrossingTraversalUnlocks()`. Multi-stage crossing work attaches to those states; it does not introduce parallel gate objects.

**Secondary faction goals** use the authored hive beat order in `ringManifest.js` `HIVE_TERRITORY_BEATS`: `warning → approach → outer_nest → choice_chamber → consequence → escape`. Aiding a camp or parleying with a hive resolves the `choice_chamber` beat and sets the `consequence`.

---

## 5. Between-Day World Simulation — Implemented (`src/overnightSim.js`)

Pure, **deterministic**, no RNG. A player must be able to look at a camp before resting and know what the night will cost; a dice roll makes losing a camp feel arbitrary, a threshold makes it a decision. `src/worldProgression.js` stays a frozen layout table — it is 50 lines of landmark slots and `getDepthThreatScale`, not a mutable world.

### 5.1 The clocks are now connected

`timeOfDay` is a short visual sky loop (`dayCycleSeconds`, 150s) and `dayState.day` is the campaign day. They had no relationship: sleeping advanced the counter and left the sky wherever it happened to be. Completing a rest now pins `timeOfDay` to dawn and recomputes `updateSky(0)` and `updateDayNightCycle(0)` immediately, so the morning is on screen as the overlay lifts.

### 5.2 Hive creep

- Creep spreads **at most one ring per sleep**, capped at 3. Capping it keeps the world readable and stops a single skipped night from erasing a route.
- A hive that is `purged`, `bonded` or `parleyed` is inert and never creeps.
- Mutation tier tracks creep rings.

### 5.3 Camp nights — degrade in visible stages

Camps walk one step at a time along `secure → strained → breached → overrun → abandoned`:

- Holding requires fortification ≥ the night's threat, which rises with the campaign day.
- A failed night moves the camp **exactly one step**, never two, so loss is always telegraphed.
- **Abandonment only after repeated neglect**: a camp must be `overrun` and fail `ABANDONMENT_NEGLECT_NIGHTS` (3) consecutive nights. It is the only two-step drop, and it is earned.
- A resupplied camp **recovers one step per held night**, so a bad week is not a death sentence.

### 5.4 Story deadlines

Unchanged and already implemented in `src/dayCycle.js` `STORY_DEADLINES`: Meridian first contact (day 4), Tallow infection choice (day 7), Suture hive parley (day 9), Vesper last shelter (day 11). `src/storyLinchpins.js` holds the linchpin wiring.

---

## 5A. Decisions (these were open questions; they are now answered)

**What death costs.** Dying ends the expedition and **advances the fatigue ladder** (death is not rest) but does **not** advance the campaign day, does not run the overnight simulation, and does not expire deadlines. Time moves only when the player chooses to sleep — that is the whole premise of a voluntary clock. Death's cost stays material and is already modelled: the black box and its recoverable salvage. The consequence of a bad run is therefore that you are *more tired*, and the only cure costs a day.

**How sleep works in co-op.** The campaign day is **single-player state**. `server/relay.js` synchronises no day state today and `dayCycle.js` has no multiplayer awareness, so co-op cannot silently advance anyone's day — and this plan keeps it that way. Co-op expeditions are visitor runs: they never advance a day, never run the overnight simulation, and never expire a deadline for host or guest. Fatigue likewise stays local to each player's own campaign. Any future shared campaign is a separate design with its own consent rule for "we all sleep now".

**Hive creep pace.** Capped at one ring per sleep (§5.2).

**Camp raid consequence.** Staged degradation with abandonment only after repeated neglect (§5.3).

---

## 6. Implementation Status & Roadmap

### Done

| Item | Where | Notes |
|---|---|---|
| Fatigue ladder, scars, partial treatment | `src/fatigue.js` (+tests) | Pure, `hb_fatigue` |
| Overnight simulation | `src/overnightSim.js` (+tests) | Pure, deterministic |
| One rest rule for every bed | `canRestNow()` / `canRestAt()` | Replaced the inline Act 2 gate |
| Clocks connected | `setTimeOfDayToMorning()` | Pins dawn, recomputes sky + lighting |
| Console reconciliation | §1A | Console keeps identity/armory/deploy; bed ends the day |
| Real identifiers | §4 | `MANDATORY_SHIP_GOALS`, `ringCrossings`, `HIVE_TERRITORY_BEATS` |
| Open questions answered | §5A | Death, co-op, creep pace, camp raids |
| **A — fatigue runtime** | `threeGame` | `recordExpeditionEnded()` on death AND extraction; `restoreOnSleep()` on sleep; composed into `loadoutMods`; heart penalty applied separately and floored at 1 |
| **B — fatigue presentation** | `src/vitals.js`, `style.css` | HUD stage row (hidden at RESTED/ALERT), `#fatigue-strain-overlay` within §2.4 limits, `sprintPricing()`, Homebase CONDITION line |
| **C — bed interactables** | `threeGame` | Bunker cot rest point + prop, prompt, routed through `canRestAt()` and the shared `beginCampRest()` sequence |
| **D — overnight wiring** | `src/overnightBridge.js` (+tests) | Live act2 camps/hives → sim → `hb_overnight_v1`; ledger rendered in the morning debrief |
| **E — ring crossing stages** | `src/ringCrossingStages.js` (+tests) | Ordered stage checklist joined to the goal anchors; terminal route readout |

### Remaining

- **Creep and camp condition have no world presence yet.** `hb_overnight_v1`
  records that a hive spread a ring or a camp fell to `breached`, and the ledger
  reports it, but nothing stamps creep tiles or changes a camp's dressing. That
  is the next visible step.
- **Scar treatment has no vendor.** `treatScar()` exists and is tested; no camp
  medic calls it yet.
- **Strain audio.** §2.4 allows muffling; only the visual treatment shipped.
- **Ring stage requirements are read-only.** The checklist describes the four
  conditions; it does not yet author sub-steps (girder hauls, power couplings)
  underneath them.

### Verification

```bash
npx vitest run     # full suite
npx eslint .
```

Manual: rest at a camp or the bunker cot, confirm the deadline warning when one
closes tonight, confirm the day advances, confirm **the sky is dawn on waking**,
confirm the ledger lists only real changes, and confirm no input is ever dropped
and no strain effect hides a threat.
