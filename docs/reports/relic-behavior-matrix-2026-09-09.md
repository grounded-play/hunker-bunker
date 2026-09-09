# Relic and Overclock Behavior Matrix

Status: evidence | Owner: Claude (DEPTH-01 lane) | Updated: 2026-09-09
| Parent: [DEPTH-01 lane plan](../planning/depth-01-elite-and-relic-lane-2026-09-09.md) D6
| Source of truth: `src/runDrops.js` (`WEAPON_OVERCLOCKS`, `SUIT_RELICS`) at `69f31eb` + working tree

Astra plan §14 item 6 asks for a matrix covering every existing relic: triggering
event, affected statistic, stacking, cap, conflict, removal, persistence and
multiplayer authority. This is that record, built by reading each item's actual
runtime consumer rather than its description text.

Nineteen items exist: 6 overclocks and 13 relics.

## 1. Summary

| Class | Count | Items |
| --- | ---: | --- |
| Fully connected — every declared stat has a live consumer | 10 | split_shot, glass_cannon_core, vesper_doctrine, last_breath, punctured_lung, parasitic_magazine, false_telemetry, cryo_breach, scrap_cycler, queens_milk |
| Inert — declared stat keys read by nothing | 3 | cryo_rime, plasma_bounce, caustic_payload |
| Inert — no `stats` object at all, description only | 6 | shatter_engine, bio_vampirism, tesla_thrusters, pheromone_aura, chitin_membrane, synapse_pulse |

**Nine of nineteen items do nothing at all in play.** They are now marked
`implemented: false` and excluded from the reward roll — see F2.

## 2. Matrix

Consumers verified by call-site grep; every helper named below is imported and
called from `src/threeGame.js`.

### Connected

| Item | Trigger | Affects | Consumer | Stacking | Cap | MP authority |
| --- | --- | --- | --- | --- | --- | --- |
| `split_shot` (OC, common) | Every shot | `extraBullets +2`, `spreadAngle 0.22`, `damageMult 0.75` | inline loop in `spawnPlayerShot` (`threeGame.js:19968`) | extraBullets **sums**; spreadAngle **last-wins**; damageMult **multiplies** | none | Local — shots are client-side; damage resolves host-side |
| `vesper_doctrine` (OC, rare) | Reload while clip empty | 20 dmg / 3 m explosion | `getVesperDoctrineReloadEffect` | **first match wins** | none | Local effect, host-validated damage |
| `last_breath` (relic, mythic) | Every shot while O₂ < 20 | ×2 damage | `applyLastBreathDamage` | **multiplies** per copy | none | Local |
| `punctured_lung` (relic, corrupted) | **Equip** (one-time) + every kill | −40% max O₂ once; +8 O₂ per kill | `applyPuncturedLungCapacity` (equip + `resetVitalsForRun`), `applyPuncturedLungKillO2` | capacity **multiplies** per copy; restore **sums** | O₂ clamped to max | Local vitals |
| `parasitic_magazine` (relic, corrupted) | Every kill | +1 clip round, −5% max O₂ **compounding** | `applyParasiticMagazineKill` | both **apply per copy** | clip ≤ clipSize; O₂ floor 1 | Local vitals |
| `false_telemetry` (relic, rare) | Taking damage at ≤15% HP | 40% chance, 2.5 s aggro drop | `applyFalseTelemetryAggroDrop` | **first match wins** | none | Local — aggro is client AI |
| `cryo_breach` (relic, rare) | Killing a frozen enemy | 3 m chain freeze | `getCryoBreachChainFreezeRadius` | **max wins**, does not sum | none | Local |
| `scrap_cycler` (relic, rare) | Reload | −3 salvage, 15 dmg / 3 m blast | `getScrapCyclerReloadEffect` | **first match wins** | spend must succeed first | Local; salvage is banked state |
| `queens_milk` (relic, mythic) | Alien **contact** damage / any human heal | +5 heal / heal→damage ×0.5 | `getQueensMilkAlienContactHeal`, `getQueensMilkHumanHealPenalty` | **first match wins** | reason allow-list of 3 | Local |
| `glass_cannon_core` (OC, corrupted) | Every shot / every hit taken | `damageMult 2`, `takenDamageMult 1.5` | inline loop in `spawnPlayerShot`; `applyIncomingDamageModifiers` in `takeDamage` | both **multiply** per copy | none | Local |

### Inert

| Item | Declared stats | Why nothing happens |
| --- | --- | --- |
| `cryo_rime` (OC, rare) | `slowDuration 2.5`, `slowMult 0.5` | Neither key is read anywhere in `src/`, `main.js` or `server/`. |
| `plasma_bounce` (OC, rare) | `maxBounces 2` | Key read nowhere. No projectile bounce system exists. |
| `caustic_payload` (OC, mythic) | `poisonDuration 3`, `tickDamage 2` | Keys read nowhere. No damage-over-time system exists. |
| `shatter_engine` (relic, rare) | *(none)* | No `stats` object at all; only `element: 'cryo'`. |
| `bio_vampirism` (relic, mythic) | *(none)* | Same. |
| `tesla_thrusters` (relic, rare) | *(none)* | Same. |
| `pheromone_aura` (relic, mythic) | *(none)* | Same. |
| `chitin_membrane` (relic, rare) | *(none)* | Same. |
| `synapse_pulse` (relic, rare) | *(none)* | Same. |

The `element` field on the inert items is not entirely unused: it feeds
`computeActiveSynergies`. See F3.

## 3. Findings

### F1 — Punctured Lung's one-time cost was re-charged on every kill (P1, **fixed**)

`maxO2PenaltyPercent` is a shared stat key. `applyParasiticMagazineKill` looped
every equipped relic and applied that key independently of the ammo refund, so
Punctured Lung's 40% capacity cost — a one-time equip charge — was re-applied on
each kill and compounded:

| Kills with Punctured Lung equipped | max O₂ (from 60 post-equip) |
| ---: | ---: |
| 1 | 36.0 |
| 2 | 21.6 |
| 3 | 12.96 |
| 4 | 7.78 |
| 5 | 4.67 |
| 6 | 2.80 |

Six kills reduced a 100-capacity suit to 2.8. This is run-ending, and it fired for
any player who picked up a corrupted relic the game describes as a survivable
tradeoff.

**Fix applied:** the penalty is now charged only by the relic that also grants
`killAmmoRefund`, so it belongs to Parasitic Magazine alone. Punctured Lung's cost
stays where it was designed to be — `applyPuncturedLungCapacity` at equip, and
recomputed from base 100 in `resetVitalsForRun`. Regression tests added in
`src/runDrops.test.js`. No numbers were retuned.

### ~~Corrupted Overcharge skips its downside~~ (WITHDRAWN — this was my error)

An earlier revision of this document claimed `glass_cannon_core` applied its
`damageMult: 2` but never its `takenDamageMult: 1.5`, making a corrupted-rarity
item a costless +100% damage.

**That was wrong.** `takenDamageMult` is consumed by
`applyIncomingDamageModifiers` (`runDrops.js:437`), called from
`ThreeGame.takeDamage` (`threeGame.js:16710`). The item works as described.

The mistake: the consumer search excluded `runDrops.js` — correct when hunting
for *catalog definitions*, wrong when hunting for *consumers*, because several
consumer helpers live in that same file. Every other row in this matrix was
verified by confirming its helper is imported and called from `threeGame.js`, so
the error was specific to the one stat checked by raw key grep rather than by
call site. The searches were redone without that exclusion; the three remaining
unread stat keys (`slowMult`/`slowDuration`, `maxBounces`,
`poisonDuration`/`tickDamage`) are confirmed to have no consumer anywhere.

### F2 — nine inert items were being handed out as rewards (P2, **fixed**)

Three overclocks declare stat keys nothing reads (`cryo_rime`, `plasma_bounce`,
`caustic_payload`) and six relics carry no `stats` object at all
(`shatter_engine`, `bio_vampirism`, `tesla_thrusters`, `pheromone_aura`,
`chitin_membrane`, `synapse_pulse`). All nine were live entries in
`rollEnemyLootDrop`'s pool, so a large share of reward drops handed the player an
item that does literally nothing.

Implementing them means building nine absent systems — projectile bounce, damage
over time, a slow status, an ice nova, lifesteal, dash trails, enemy pacification,
terrain-conditional armor and a dash stun. That is the speculative expansion the
parent plan forbids, so the plan's own stated fallback applies (§14 item 2, §23
bullet 6): connect the promise through gameplay, or remove it from player-facing
claims until ready.

They are now marked `implemented: false` and skipped by the reward roll. They stay
in the catalog, so the Steam Vault and the debug museum still display them. Ten
live rewards remain, covering every rarity the roll can produce. Restoring one is
a one-line change once its effect exists.

### F3 — Synergies are announced but never applied (P2, reported)

`computeActiveSynergies` reads the `element` field and produces named synergies
("Superconductor Arc — Shock damage shatters frozen targets for 2× damage",
"Frost Spore Cloud"). It is called on equip and its output is dispatched on the
`in-run-drop-equipped` event and returned by `getRunDropsInfo`. Nothing consumes it
beyond display.

The promise is worse than inert: "Shock damage shatters frozen targets for 2×
damage" describes an interaction between two items (`plasma_bounce`,
`cryo_rime`) that are themselves inert. The player is told a combo fired when
neither half of it exists.

Partly defused by F2: both items are now excluded from the reward roll, so that
pairing can no longer arise from normal play. The synergy display itself is left
alone — removing a player-facing panel is a content decision rather than a defect
fix, and it is worth keeping once the effects exist.

### F4 — Run drops are never cleared between runs (P2, reported)

`this.runOverclocks` and `this.runRelics` are assigned `[]` in the constructor at
`threeGame.js:1417-1418` and nowhere else. `resetRunToStartingState` (`main.js:4679`)
does not touch them, and `ThreeGame` is constructed once per session
(`main.js:13630`), not once per run. Relics therefore persist across deaths and
new expeditions for the life of the browser session, and are lost entirely on
reload — the opposite of both plausible designs.

Capacity does not compound across runs (`resetVitalsForRun` recomputes from base
100), so this is an unearned-power issue rather than a corruption issue. Duplicate
pickups of the same relic within a run *do* compound, since no dedup or cap exists
anywhere in `equipRunDrop`.

Not fixed here: whether run drops should be cleared per run, per death, or
persisted deliberately is a design decision, and the reset path is in `main.js`
where the in-flight HUD/objective work is live.

### F5 — Removal is unimplemented across the board (P3, reported)

There is no un-equip, drop, or replace path for any relic or overclock.
`equipRunDrop` only pushes. The "removal" column of the requested matrix is empty
for all nineteen items because the operation does not exist.

## 4. What this does not establish

- No claim that the connected effects are *balanced*, or that three viable build
  strategies exist. That is a playtest result, per parent plan §14.
- No claim about relic behavior under multiplayer beyond the authority column:
  effects were traced as local-vs-host by call site, not exercised in a two-client
  session.
- The stacking column describes what the code does with duplicates. Whether
  duplicates *should* be obtainable is untested and undesigned.
