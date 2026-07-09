# Camps, Choices & Endings — Design (target: Sprints 19+)

The dramatic spine: **everything you build in Act 1 is leverage, hostage, or
weapon in Act 2.** This doc captures the full vision; the "shipped" markers
show what already works in the current build.

## Act 1 — relationships with the camps (human prelude)

Three survivor camps (Meridian, Tallow, Vesper) exist in the world from the
start, discoverable while playing the normal loop.

- **Grow** ✅ shipped — SUPPORT spends shells (5/10/20) to raise a camp to
  level 1–3. Visible barricades + brighter beacon; leveled camps are O₂ havens
  (stand inside to refill). Levels persist in `hb_act2_v1`.
- **Barter** — planned: trade surplus (med ↔ tech ↔ coin ↔ shells) at camp
  rates that improve with level/bond. Gives camps an economy role, not just a
  sink.
- **Bond** — planned: each camp offers optional quests (fetch, escort, defend
  against a wave, recover a lost survivor). Completing them raises a per-camp
  `bond` value and unlocks camp-specific story beats. Bond is the axis that
  opens story paths — it is what makes sparing them in Act 2 *possible*.

## Act 2 — what you do to the camps you knew

Per-camp choice instead of the current forced cull ladder:

- **Steal** — planned: rob their stockpile (loot scaled by level, no kill);
  the camp survives but turns hostile and won't board.
- **Destroy** ✅ shipped (as "cull") — leveled camps resist with a defense
  wave (level × 2 guards) before falling; cull loot scales with level
  (pickups + level × 5 shells). The guns you funded answer to them.
- **Spare / recruit** — planned, gated by Act 1 bond: high-bond camps can be
  persuaded — either smuggled aboard alive, or (dark path) offered to the
  queen and **turned** — alien passengers loyal to you.

Requires relaxing `deriveAct2Phase`: launch unlocks when the vessel is
complete, not when every camp is destroyed. Boarding becomes the decision
point that reads the world-state vector.

## Endings matrix

Computed at boarding from: `queenObedience` (how fully you served the ladder),
per-camp state (alive / robbed / culled / turned), queen aboard/rejected,
eggs aboard/destroyed.

| Ending | Conditions | Difficulty |
| --- | --- | --- |
| **FULL BROOD** — obedient queen-slave; ship carries queen + eggs alone | all camps culled, total obedience | hardest path A ✅ (current ending) |
| **CLEAN ESCAPE** — reject the alien entirely; expel/kill the queen, all camps alive and aboard | max bond with all camps, defy every cull order, survive the queen's reprisal | hardest path B |
| **MIXED CREW** — some camps alive, some turned alien, queen aboard | partial obedience | mid |
| **CARRIER'S BARGAIN** — survivors + eggs but no queen (you carry the brood yourself) | betray the queen late, keep eggs | mid |
| **SCORCHED SKY** — leave alone; everyone dead, queen rejected, eggs destroyed | nihilist sweep | mid |

Both extremes are deliberately the hardest: full obedience means fighting every
defense grid you funded; full rejection means surviving the queen actively
working against you (vitals sabotage, hive ambushes) while keeping three camps
alive.

## State groundwork

- `hb_act2_v1` camps: `{ x, z, level ✅, aided ✅, destroyed ✅, bond, robbed, turned }`
- New: `queenObedience` counter (± per ladder compliance/defiance)
- Boarding handler switches on the vector → ending cutscene id
- Ending cutscenes: generate via `scratch/generate_cave_scenes.js` pipeline,
  one per row above (`ending-fullbrood.webm`, `ending-cleanescape.webm`, …)
