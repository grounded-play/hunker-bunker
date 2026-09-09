# DEPTH-01 — Implementation Evidence

Status: implementation evidence | Owner: Claude (DEPTH-01 lane) | Updated: 2026-09-09
| Plan: [DEPTH-01 lane plan](../planning/depth-01-elite-and-relic-lane-2026-09-09.md)
| Parent: [Astra game improvement plan](../planning/astra-game-improvement-plan-2026-09-08.md) §14
| Branch: `fix/mayor-tina-and-astra-plan`, working tree (not committed — see §6)

## 1. What this batch did

The Depth Contract advertises five terms on every ring crossing. Four reached
runtime; `eliteSpawnChance` reached nothing. This batch connects it, separates the
elite *rank* from the unrelated wounded-enemy state that was standing in for it at
the loot boundary, and records the relic behavior matrix Astra §14 item 6 asks for.

Two live defects were found and fixed along the way. Both were pre-existing and
neither was introduced by this work.

## 2. Defects fixed

### F2 — ordinary enemies were rolling on the elite loot table

`threeGame.js` read `sprite.userData.enraged` to decide whether a kill used the
elite drop branch. But `enraged` is set by two unrelated mechanics, and the second
one fires constantly: `damageSnail` flips *any* non-boss non-crawler whose HP
passes through exactly 1 into a last stand, and it survives that hit. Every
ordinary enemy shot down through that value therefore died flagged elite.

| | Drop chance | Rarity table |
| --- | ---: | --- |
| Intended for ordinary enemies | 0.12 | 10% rare, else common |
| Actually applied | 0.65 | 20% mythic, 40% rare, else common |

**This fix reduces the live drop rate**, by roughly 5× for ordinary kills, and
removes mythic drops from trash entirely. That is a correction of an unintended
inflation, not a balance nerf, and no authored number was changed to achieve it.
Sentinels and bosses keep the rates they always had.

`isElite` is now a distinct spawn-time rank. `enraged` keeps its last-stand
meaning — speed, tint, audio — and no longer influences loot. Both can be true at
once: a promoted elite still makes its last stand.

### F1 — Punctured Lung's one-time cost was re-charged on every kill

Found while building the relic matrix. `maxO2PenaltyPercent` is a stat key shared
by two relics, and `applyParasiticMagazineKill` applied it on every kill for any
relic carrying it — including Punctured Lung, whose 40% penalty is a one-time
equip charge. It compounded:

| Kills with Punctured Lung equipped | max O₂ (from 60 post-equip) |
| ---: | ---: |
| 1 | 36.0 |
| 3 | 12.96 |
| 6 | 2.80 |

Six kills reduced a 100-capacity suit to 2.8. The penalty is now charged only by
the relic that also grants the ammo refund. Full analysis in
[the relic matrix](relic-behavior-matrix-2026-09-09.md) §3 F1.

## 3. Elite promotion

`rollElitePromotion` (`src/eliteEnemies.js`) is consulted once per scatter
placement in `createChunkScatterPlacements`, drawn from the chunk's existing
seeded generator. It replaces a hardcoded `depthTier >= 3` snail rule that
consulted no contract and scaled across no rings.

- **Ring I promotes nobody**, by contract value rather than by special case, so
  the opening ring and the tutorial route are unaffected by construction.
- **Excluded:** bosses, sentinels (already elite by identity at the loot
  boundary — promoting them would rank them twice), display models, and scripted
  room-encounter spawns, which are pushed on a separate path that never sets the
  flag. `templateCfg.forceEnragedSnails` (THE_NEST) still forces regardless.
- **Identity:** elites are 1.35× scale, 1.8× HP, 1.15× speed, and carry a tint
  that is deliberately not the enrage red. Silhouette is the primary cue, so the
  rank is readable before the enemy is wounded and without relying on colour
  (Astra §13 item 3).

### The eligibility list is load-bearing

The first eligibility list excluded `crawler`, by analogy with the last-stand
mechanic which excludes it. The live e2e sample rejected that: across 592 tier-3
chunks the generator produced 377 crawler and 404 sentinel placements against
**33 from every other eligible family combined**. Excluding crawlers left elite
promotion technically wired and practically unreachable — under one promotion per
twenty deep chunks. Crawlers are now eligible; sentinels remain excluded.

This was only visible because the browser test samples the whole deep band. The
first version sampled 40 chunks, which expects well under one elite and cannot
distinguish "works" from "wired to a family that never spawns."

### Multiplayer authority

Astra §14 item 3 requires the promotion decision to be made under the
authoritative host rather than rolled independently by each peer. That holds
through the mechanism the codebase already relies on for cross-client enemy
identity, not through a new message: `createChunkScatterPlacements` seeds one RNG
from `hashTile(chunkX, chunkY) XOR runEntropy` with no `Math.random()` in the
path, and `setupMultiplayerNetwork` pins `fixedRunEntropy` so every peer in a
match settles on the same constant. Kill and damage authority are unchanged and
still resolve through `handleEnemyHitReported` on the host. Pinned by
`src/eliteEnemies.determinism.test.js`.

### Seed-stream consequence

The promotion roll draws from the chunk generator's stream, so world layouts for a
given seed differ from the previous baseline. The roll is drawn for every
placement, eligible or not, so the stream advances by a fixed amount per placement
and remains reproducible. `npm run audit:world-seeds` passes: 5000 seeds, 0
validity failures, 0 determinism failures.

## 4. Findings reported, not fixed

Each is outside this lane's mandate — balance, world topology, or a design
decision — and is recorded rather than silently changed.

| # | Finding | Disposition |
| --- | --- | --- |
| F3 | ~~`glass_cannon_core` never applies `takenDamageMult`~~ | **Withdrawn — my error.** It is consumed by `applyIncomingDamageModifiers`, called from `takeDamage`. The consumer search had excluded `runDrops.js`, which is where several consumer helpers live. See the matrix. |
| F5 | 9 of 19 relics/overclocks are inert and were live reward-pool entries | **Fixed.** Marked `implemented: false` and skipped by the reward roll, per Astra §14 item 2 / §23 bullet 6 — connect the promise or remove it from player-facing claims until ready. They stay in the catalog for the Vault and museum. |
| F4 | `computeActiveSynergies` announces synergies nothing applies | Partly defused by F5 — the two items in the superconductor pairing no longer drop. Removing the panel itself is a content decision. |
| F6 | `runRelics`/`runOverclocks` are never cleared between runs and persist for the session | Whether run drops should be run-local is a design decision, and the reset path is in `main.js` where HUD/objective work is live |
| F7 | No un-equip, dedup or cap exists for any relic; duplicate pickups compound | Same |
| F8 | `getDepthTier` caps at 3, so the scatter path reaches ring IV only. Ring V (SECTOR ZERO) contract values are unreachable through enemy placement | Ring topology is WORLD-01. Changing the tier bands alters world generation for every existing seed, which is out of this lane by design. |

F8 means the contract still overstates itself in one place this lane did not
reach. It is not newly introduced.

## 5. Verification

| Check | Result |
| --- | --- |
| Baseline before any edit | 280 files, 2499 tests pass; lint clean |
| Full suite after | **287 files, 2582 tests pass** |
| New focused tests | 39 across `eliteEnemies`, determinism, boundary non-compounding, crossing summary, relic leak |
| `npm run lint` | Pass |
| `npm run presubmit` | Pass — Steam claims, 39 procedural WAVs, retail assets, item catalog, 43-track soundtrack, 72 chroma assets / 0 unapproved |
| `npm run build` | Pass, 50 required door/cinematic media assets |
| `npm run audit:docs` | Pass |
| `npm run audit:world-seeds` | Pass — 5000-seed sweep, 0 failures |
| `npm run audit:combat-encounters` | Pass |
| Browser (Playwright, live engine) | **3/3 pass** — `tests/e2e/elite-promotion.spec.js` |

The browser spec drives the real engine, not a fake: it calls
`createChunkScatterPlacements` and `createScatterInstance` on the live game after
a full boot → class select → deploy → gameplay route. It asserts ring I promotes
nobody, the deep band promotes at roughly the contract rate and never promotes a
boss or sentinel, the same chunk regenerates an identical elite set, and a
promoted placement mounts with a larger silhouette, higher HP and a tint that is
not the enrage red.

### Non-compounding (Astra §14 item 4)

Verified rather than fixed: every connected consumer reads `currentDepthTier` per
use instead of accumulating, and `resetVitalsForRun` recomputes O₂ capacity from
base 100. A 1→2→3→2→3→4→3→5 route lands on the same values as arriving at each
ring directly. `src/depthContractBoundaries.test.js` pins this so a future
consumer that accumulates into stored state fails here rather than quietly
doubling a player's salvage.

## 6. Not claimed

- **Not committed.** The working tree holds in-flight TRUTH-01/PERF-01/HUD-01/
  QUEST-01 work from the parallel lane in the same files (`main.js`,
  `src/threeGame.js`). Committing would sweep that in. Left in the tree, matching
  how the branch is being run.
- **No audio cue for elites.** No registered sound fits, and minting a procedural
  one regenerates `steam/referenced-assets.json` and `steam/retail-asset-report.json`,
  which the ASSET-01 work holds uncommitted. Open follow-up.
- **No playtest acceptance.** "Three distinct viable build strategies", elite
  fairness, and whether the reduced drop rate feels right are human results, per
  Astra §14. This batch makes the contract true, not tuned.
- **No two-client session.** Multiplayer agreement is argued from determinism and
  pinned by test, not exercised on two real clients.
