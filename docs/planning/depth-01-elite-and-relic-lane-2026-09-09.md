# DEPTH-01 — Elite Promotion and Depth Contract Truthfulness

Status: implemented, pending human/playtest acceptance | Owner: Claude (this lane) | Updated: 2026-09-09
| Parent: [Astra game improvement plan](astra-game-improvement-plan-2026-09-08.md) §14
| Branch: `fix/mayor-tina-and-astra-plan` (dev branch only — no merge to `mothership` in this lane)

## 1. Why this lane

Codex is currently in flight on TRUTH-01, PERF-01, ASSET-01, HUD-01, QUEST-01 and
PRESENT-01. Its uncommitted working set as of 2026-09-09 08:41 is `main.js`,
`index.html`, `src/threeGame.js` (hunks at old-file lines 7–20916 and
25699–30928), `src/objectiveRegistry.js`, `src/bank.js`, `src/wanderer*.js`,
`src/perfPhases.js`, `src/gpuFrameTimer.js`, `src/world3dOverlay.js`,
`src/gameplayPresentation.js`, `src/survivorContract.js`, `src/styles/`.

DEPTH-01 is an unclaimed P1/P2 package in the parent plan. Its primary code seams
sit in `src/depthContract.js` (untouched by Codex), `src/runDrops.js` (untouched),
and the `src/threeGame.js` band between lines **24080–25640**, which falls in the
gap between Codex's hunks. This lane can proceed in parallel with low merge risk.

### Coordination rules for this lane

- Touch `src/threeGame.js` only inside the 24080–25700 band and only at the seams
  named in §4. Do not reformat, reorder or extract in that file.
- `main.js` gets at most one added line inside `formatDepthCrossingDelta`
  (line ~3913), well clear of every Codex hunk.
- No edits to `objectiveRegistry.js`, `bank.js`, `wanderer*.js`, `world3dOverlay.js`,
  `perfPhases.js`, `gpuFrameTimer.js`, `index.html`, or `src/styles/`.
- Rebase/inspect before each commit; if Codex lands a hunk inside the band, stop
  and re-scope rather than resolving by hand in a 30k-line file.

## 2. Verified current state

Traced every field of `DEPTH_CONTRACT` to a runtime consumer:

| Field | Live consumer | Status |
| --- | --- | --- |
| `salvageMultiplier` | `threeGame.js:25851` via `applySalvageMultiplier` | Connected |
| `o2EfficiencyPenalty` | `threeGame.js:17876` via `applyO2EfficiencyPenalty` | Connected |
| `directorAggressionBonus` | `threeGame.js:7624` → `src/director.js` | Connected |
| `rareRelicChance` | `runDrops.js:242` via `rollsRareRelic` | Connected |
| `eliteSpawnChance` | **none** | **Disconnected** |

`rollsElite()` is exported from `src/depthContract.js:86` and has **zero callers
outside its own test file**. This is the exact defect the parent plan names in
§14 item 2.

### F1 — `eliteSpawnChance` is a promise with no consumer (P2)

`describeCrossing()` publishes `eliteSpawnChanceDelta` on every ring crossing and
the design comment at the top of `depthContract.js` states elite spawn chance is
part of the declared bet. Nothing rolls it. Ring V advertises a 30% elite rate
that the world never produces.

**Correction to the above, made during implementation.** The HUD *was* claiming
it. The committed baseline announced `HOSTILE THREAT +8%` on every crossing; the
in-flight TRUTH-01 pass removed that line this morning (working-tree change to
`main.js:3919`) precisely because nothing rolled it, replacing it with the
`DIRECTOR PRESSURE` term that had been missing. That removal was the right call
for a field with no consumer. D3 restores the elite term — now that a consumer
exists — and keeps the `DIRECTOR PRESSURE` addition.

### F2 — "elite" and "enraged" are conflated at the loot boundary (P1)

`threeGame.js:25625`:

```js
const isElite = Boolean(sprite.userData.enraged || sprite.userData.isSentinel);
```

But `enraged` is set by two unrelated mechanics:

1. **Spawn-time**, `threeGame.js:24145` — a hardcoded `depthTierForScatter >= 3`
   rule for snails, with no ring roll.
2. **Wounded last stand**, `threeGame.js:25538` — *any* non-boss non-crawler
   enemy whose HP passes through exactly 1 is flipped to `enraged` and survives
   that hit.

Consequence: an ordinary snail shot down through HP 1 dies flagged `enraged`, so
`rollEnemyLootDrop` uses the elite branch — **0.65 drop chance instead of 0.12**,
plus the elite rarity table (20% mythic / 40% rare). Ordinary trash mobs are
dropping at roughly 5× the intended rate with elite rarity weighting. This is a
live economy defect independent of the elite feature itself.

### F3 — the spawn-time enrage rule ignores the ring contract (P2)

`depthTierForScatter >= 3` is a binary cliff on snails only. It does not consult
`eliteSpawnChance`, does not scale across rings II–V, and does not apply to any
other enemy family.

### F4 — no elite serialization or host authority (P1 if F1 ships)

Elite state is derived locally at chunk-mount time. Parent plan §14 item 3
requires the promotion decision to be made by the authoritative host and
serialized. `resolveNetworkEnemySprite` (`threeGame.js:4889`) is the existing
identity seam; the seeded chunk `random()` at the placement generator is the
existing determinism seam. Both must be confirmed before F1 lands, or peers will
independently roll enemy strength.

### F5 — relic behavior matrix does not exist (P2, documentation)

Parent plan §14 item 6 asks for a per-relic matrix (trigger, affected stat,
stacking, cap, conflict, removal, persistence, MP authority). `WEAPON_OVERCLOCKS`
and `SUIT_RELICS` in `runDrops.js` have no such record.

## 3. Non-goals

- No balance retune of the ring numbers themselves. They stay as authored until
  playtest evidence exists; this lane makes them *true*, not *tuned*.
- No new enemy types, no new relics, no director rework.
- No `threeGame.js` extraction or refactor (parent plan §19 ARCH-01 is not this lane).
- No claim of build-diversity or playtest acceptance — those are human results.

## 4. Work items

Executed in order. Each is TDD: failing focused test first, then implementation.

### D0 — separate `isElite` from `enraged` (fixes F2)

Introduce `sprite.userData.isElite` as a distinct spawn-time flag. Change the loot
call site to read it:

```js
const isElite = Boolean(sprite.userData.isElite || sprite.userData.isSentinel);
```

`enraged` keeps its wounded-last-stand meaning (speed, tint, audio) and stops
influencing loot. Sentinels stay elite-for-loot as they are today.

**Tests:** an ordinary snail killed through HP 1 uses the 0.12 branch; a sentinel
still uses 0.65; a spawn-time elite uses 0.65; a boss still uses 1.0.
**Risk:** this *reduces* the live drop rate substantially. Call it out explicitly
in the report as an intentional correction of an unintended inflation, not a nerf.

### D1 — connect `rollsElite` at the placement generator (fixes F1, F3)

At `threeGame.js:24145`, replace the binary depth-3 rule with a seeded contract roll:

- Roll `rollsElite(depthTierForScatter + 1, random())` per eligible placement,
  using the chunk's existing seeded `random()` so the decision is reproducible
  from the seed.
- **Eligibility exclusions:** bosses, crawlers, display models
  (`isDisplayModel`), `sentinel` (already elite by identity), any placement from
  `wfcMeta.roomInstances` scripted encounters, tutorial-ring content, and any
  mandatory scripted actor. Ring I stays at 0 by contract, so the tutorial ring is
  unaffected by construction.
- Preserve `templateCfg.forceEnragedSnails` (THE_NEST) as an explicit override
  that bypasses the roll.
- Set both `spawnedElite` on the placement and `isElite` on the sprite userData.

**Tests:** ring I produces zero elites; ring V produces elites at the contract
rate over a fixed seed; the same seed produces the identical elite set twice;
excluded families never promote; `forceEnragedSnails` still forces.

### D2 — elite identity distinct from enrage (parent §14 item 2: "a visual/audio identity")

Elites need to be legible *before* they are wounded. Enrage already owns
`SNAIL_ENRAGED_TINT` (`0xff4a4a`) and the metal-stress sting. Elites get a
separate, non-color-only cue per parent plan §13 item 3 (shape/motion/sound, not
color alone): a scale bump plus a distinct spawn/idle audio cue, with tint as a
secondary channel only. Elites also carry a modest HP/speed premium so the
promised danger is real — sized against the existing `getDepthThreatScale`
output rather than invented as a new multiplier stack.

**Tests:** an elite sprite carries the identity fields at mount; a wounded elite
shows the enrage state without losing elite identity; a wounded non-elite is
never mistaken for an elite.

### D3 — announce the elite delta (closes the display/consumer loop)

Add the elite line to `formatDepthCrossingDelta` in `main.js` (~line 3913),
matching the existing `pct()` formatting. Only after D1 lands — the parent plan is
explicit that the game must "show only deltas the game actually applies."

**Test:** the formatter includes an elite clause when the delta is nonzero and
omits it at ring I→I.

### D4 — boundary and re-entry non-compounding (parent §14 item 4)

Verify that repeated ring crossings, backtracking to a shallower ring, and
reload/reconnect do not apply modifiers twice. `currentDepthTier` is a single
assignment at `threeGame.js:19558` and all four connected consumers read it
per-use rather than accumulating — this looks correct by construction and needs a
regression test to keep it that way, not a fix.

**Tests:** cross 1→2→3→2→3 and assert salvage, O2 drain and aggression match the
direct ring-3 values; assert elite promotion is not re-rolled for already-mounted
chunks on re-entry.

### D5 — multiplayer authority and serialization (fixes F4)

Confirm how scatter placements reach peers today, then ensure the elite bit
travels with the enemy's identity rather than being re-derived per client.
If the existing seed sync already guarantees identical placement generation on
both peers, document that as the mechanism and add a test pinning it; if it does
not, serialize `isElite` through the existing `resolveNetworkEnemySprite` path.
Do not redesign networking — parent plan §11 item 1 forbids it.

**Tests:** host and peer agree on the elite set for a fixed seed; a late-joining
peer resolves an already-promoted enemy as elite.

### D6 — relic behavior matrix (F5, documentation)

Produce `docs/reports/relic-behavior-matrix-2026-09-09.md` covering every entry in
`WEAPON_OVERCLOCKS` and `SUIT_RELICS`: trigger event, affected statistic, stacking,
cap, conflict, removal, persistence across death/reload, and multiplayer authority.
Derived by reading the actual consumers, not the item copy. Any relic whose
described effect has no runtime consumer is reported as a finding, not silently fixed.

## 5. Verification

Per parent plan §22, before this lane is called done:

| Layer | Command / route | Applies to |
| --- | --- | --- |
| Focused regression | `npx vitest run src/depthContract.test.js src/runDrops.test.js src/threeGame.depthContract*.test.js src/threeGame.eliteSpawn.test.js` | D0–D5 |
| Full automated | `npm test`, `npm run lint` | all |
| Generated/artifact | `npm run presubmit`, `npm run audit:docs`, `npm run build` | all |
| Seeded world | `npm run audit:world-seeds` | D1, D4 |
| Combat encounters | `npm run audit:combat-encounters` | D2 |
| Browser | live run to ring II–III, observe an elite spawn and its cue, kill it, observe the drop | D1–D3 |

Baseline to record before the first edit: current `npm test` count and current
`npm run lint` result, so a preserved pre-existing failure is never attributed to
this lane. Existing known blockers stay named, not hidden.

## 5a. Outcome

Implemented. Evidence: [DEPTH-01 implementation report](../reports/depth-01-implementation-2026-09-09.md)
and [relic behavior matrix](../reports/relic-behavior-matrix-2026-09-09.md).

Two things the plan did not anticipate:

1. **A second compounding defect.** Building the relic matrix (D6) surfaced a
   shared-stat-key collision that re-charged Punctured Lung's one-time 40% O₂
   capacity cost on every kill, compounding a 100-capacity suit down to 2.8 within
   six kills. Fixed with tests. It is the same class of defect D4 was written to
   guard against, so it was fixed rather than only reported.
2. **The eligibility list decided whether the feature existed at all.** The first
   list excluded crawlers; the live sample showed crawlers and sentinels are
   essentially the entire deep-ring enemy population, so promotion was wired to
   families that barely spawn. Caught only because the browser test samples the
   whole deep band rather than a handful of chunks.

## 6. Acceptance

- [x] Every field of `DEPTH_CONTRACT` has a tested live consumer, or is removed
      from the contract and from `describeCrossing`.
- [x] Ordinary wounded enemies no longer roll on the elite loot table; the drop-rate
      correction is stated explicitly with before/after numbers (0.65 → 0.12).
- [x] A fixed seed reproduces the identical elite set across two runs.
- [x] Ring I and tutorial/scripted content produce no promoted elites.
- [x] Repeated ring boundary crossings do not compound any modifier.
- [x] Host and peer agree on elite status for a fixed seed, by a documented mechanism
      (shared determinism, not a new message).
- [x] The relic matrix exists and names every relic without a runtime consumer
      (9 of 19 inert; those 9 are now excluded from the reward roll).

Still open, and deliberately so: the elite audio cue, and every human/playtest
item named in §6's deferral paragraph below.

Deferred to human/playtest and explicitly **not** claimed by this lane: "three
distinct viable build strategies", elite fairness, and ring-number balance. Those
require repeatable play sessions, per parent plan §14.

## 7. Order and gates

D0 → D1 → D2 → D3, with D4 and D5 as gates before D3 is announced to the player.
D6 runs independently and can land at any point. Commit per work item on
`fix/mayor-tina-and-astra-plan` only. Stop and report if a Codex hunk lands inside
the 24080–25700 band of `src/threeGame.js`.
