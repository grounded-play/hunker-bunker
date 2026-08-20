# Design Pillars — "One More Ring"

Source: distilled from `docs/sprint25.checkin.md` (a long, unstructured design
conversation transcript). This doc extracts the actionable game-design thesis
and ties it to files that already exist in this repo, so it reads as a plan
against real code rather than abstract brainstorming.

## The thesis (three sentences, memorize these)

- **Mechanical hook:** "One more ring." Depth = more reward AND more danger,
  explicitly, every single crossing.
- **Narrative hook:** "Who owns this body?" Every faction (Horizon, the
  Mothership, the camps, the Queen, the hives, the suit itself) wants custody
  of the player's changing body.
- **Emotional hook:** "The world remembers what you did." Consequence memory
  (already the repo's strongest existing pillar per
  `project_secret_sauce_review` in memory) turns choices into scenery, not
  stat deltas.

Every system change should be checked against: *does this create
anticipation, decision, payoff, mastery, surprise, or story?* If not, it's not
a priority for this era.

The concrete player-facing version of this thesis is now maintained in
`docs/design/game-outline-and-proof-run.md`. Use that document when turning
these pillars into onboarding, room pacing, relic choices, extraction, and
acceptance checks; this file remains the source of the strategic design
principles.

## What already exists to build on

- `src/ringManifest.js`, `src/ringCrossings.js`, `src/mazeTiers.js` —
  real ring/tier progression and content-budget infrastructure already
  tracks `RING_UNLOCK_GOAL_ORDER` / `RING_BLOCKER_FEATURES`. There is **no**
  existing reward/danger multiplier concept attached to ring depth — this is
  a real gap, not a duplicate of something already built.
- `src/act2.js`, `src/arcState.js` — run director / narrative-state
  infrastructure the doc's "procedural dramaturgy" ask (safety → curiosity →
  danger → reward → quiet → escalation) should hook into rather than
  replace.
- `src/npcDialogueTrees.js`, `src/sideStorySystem.js`, `src/camp.js` — real
  camp dialogue infrastructure. See `docs/design/camp-narrative-style-guide.md`
  for the narrative-side plan built on these files.
- `src/bossPhases.js` — the Queen's armor/phase/weakpoint framework already
  matches the "stagger/armor/weakpoint grammar" the doc asks to spread to
  ordinary elites; extending it is cheaper than inventing a new system.

## 1. The Depth Contract (highest leverage single mechanic)

Make crossing into a deeper ring an explicit, legible bet, not a silent
difficulty slider. Concretely: a `DEPTH_CONTRACT` table keyed by ring index,
each entry declaring what goes up and what gets harder — salvage multiplier,
elite/rare-relic spawn-pool unlocks, O2 efficiency penalty, director
aggression bump, extraction distance. Surfaced as a short ritual at the
crossing itself (brief HUD/audio beat), not just an invisible number.

Status: **wired into the runtime, 2026-08-20 (Sprint 28, docs/sprint28plan.md
Lane A).** `src/depthContract.js` shipped first as pure data + pure functions
only (see below); the independent review at `docs/sprint28plan.md` found it
sitting fully coded and tested with zero call sites anywhere else in the
codebase, and it's the single item that review named as the highest-leverage
build target in the entire game. All five of the table's fields are now
connected:

- **salvageMultiplier** — `ThreeGame.collectSnailShell` (`src/threeGame.js`)
  scales shell value by ring on collection. Deliberately NOT layered onto
  `getDepthLootConfig()`'s existing `pickupMultiplier`/`legendaryBoost` (chunk
  pickup-item density and legendary odds on placement) — traced both systems
  first and confirmed shell-value-on-collection is a genuinely separate axis,
  so there's no double-scaling of the same reward.
- **eliteSpawnChance / rareRelicChance** — `rollsRareRelic` biases
  `rollEnemyLootDrop` (`src/runDrops.js`) toward the relic half of the
  rarity-filtered drop pool at deeper rings, rather than only raising the
  rarity floor. `eliteSpawnChance` remains unwired — the codebase has no
  existing "promote this spawn to elite" mechanism to hook into (the current
  `isElite` flag is derived from specific enemy states like `enraged`/
  `isSentinel`, not a probability roll at spawn time); flagged here rather
  than fabricated.
- **o2EfficiencyPenalty** — `ThreeGame.updateVitals`'s O2 drain-rate
  calculation, extending the game's already-strongest, already-felt pressure
  system directly.
- **directorAggressionBonus** — this doc's own header comment (below) claimed
  a matching aggression score already existed in `src/act2.js`/
  `src/arcState.js`. That was checked, not assumed, while wiring this: it's
  false (both files are narrative-state/camp management, zero grep hits for
  "aggression"). The real, already-live equivalent is `src/director.js`'s
  `chooseDirectorAction` — its existing `escalation` signal (0-1, driving
  patrol probability) now takes the bonus as an additional term.
- **Crossing ritual** — `ThreeGame.emitDepthTierChanged` attaches
  `describeCrossing()`'s real before/after delta to a genuine new-depth
  crossing (never a `forceEmit` re-announce), surfaced through an
  already-existing depth-announcement listener in `main.js` that previously
  said only "› DEPTH: ABYSS" with a sound cue.

One live nuance found while wiring: this table's own ring numbering (1-5,
matching `RING_CONTENT_BUDGETS` in `ringManifest.js`) isn't actually tracked
live anywhere during gameplay — only a coarser 0-3 `depthTier` signal
(`SURFACE`/`SHALLOW`/`DEEP`/`ABYSS`) is. Every wiring above maps
`ring = depthTier + 1`, so ring 5 (`SECTOR ZERO`) is never reached at today's
depth ceiling — not a bug, just headroom this table already had before the
runtime could use all of it.

## 2. Transformative run-build relics (12–20, not 100 stat sticks)

Relics that change *rules*, not numbers — e.g. "below 20% O2, weapon damage
doubles" or "kills refill the magazine but permanently reduce max O2."

**Status update:** further along than "not started." Investigating this
found `src/runDrops.js` already has exactly this shape of catalog
(`SUIT_RELICS`/`WEAPON_OVERCLOCKS`, rolled by `rollEnemyLootDrop`) — most
existing entries there were catalog-only (never read anywhere outside their
own data file except through a couple of generic stat keys `spawnPlayerShot`
already applies). Added 8 named transformative relics from this doc's own
examples (`last_breath`, `punctured_lung`, `scrap_cycler`,
`parasitic_magazine`, `false_telemetry`, `vesper_doctrine`, `cryo_breach`,
`queens_milk`, tracked via `TRANSFORMATIVE_RELIC_IDS`), each with a real
`stats` object rather than flavor text alone.

**Update, 2026-08-20:** 7 of 8 are now wired to real runtime hooks, each with
its own `wired: true` catalog flag and unit tests:
- `last_breath` — below 20% O2, weapon damage doubles. Pure
  `applyLastBreathDamage` in `runDrops.js`, called from
  `ThreeGame.spawnPlayerShot`.
- `punctured_lung` — max O2 capacity permanently reduced, kills restore O2.
  `applyPuncturedLungCapacity`/`applyPuncturedLungKillO2`.
- `parasitic_magazine` — kills refund ammo, permanently shrink max O2.
  `applyParasiticMagazineKill`.
- `false_telemetry` — at critical HP, chance to drop enemy aggro.
  `applyFalseTelemetryAggroDrop`.
- `cryo_breach` — frozen kills chain-freeze nearby enemies.
  `getCryoBreachChainFreezeRadius`, read at the existing freeze-kill site.
- `scrap_cycler` — reloading spends 3 salvage for a radial shrapnel blast.
  `getScrapCyclerReloadEffect`, called from the new
  `ThreeGame.triggerReloadRelicEffects`, itself called from `startReload()`.
- `vesper_doctrine` — an EMPTY reload (not a partial one) ejects the mag as
  an explosive. `getVesperDoctrineReloadEffect`, same call site as Scrap
  Cycler. Data quirk carried forward, not silently "fixed": despite
  `type: DROP_TYPES.OVERCLOCK`, this entry is physically stored in the
  `SUIT_RELICS` array — `equipRunDrop` sorts by the `type` field at equip
  time, not by source array, so runtime behavior is unaffected; only test
  fixtures need to know to look in `SUIT_RELICS` for it.

Scrap Cycler and Vesper Doctrine share a new `ThreeGame.applyRadialEnemyDamage`
helper (distance-check against `scatterSprites`, same pattern Cryo Breach's
chain-freeze already established, just dealing real damage via `damageSnail`
instead of a status effect) — see `src/threeGame.reloadRelicEffects.test.js`.

Only `queens_milk` ("Alien enemies may heal you on contact. Human healing
hurts instead.") remains an honest catalog-only entry — it needs both the
alien-contact-damage path and the human-healing-item-use path found and
hooked, which is a two-system change, not a single call site like the rest,
and was deprioritized to land the other 7 first ("quality over count" per the
original Lane B brief).

## 3. Combat impact stack + enemy verbs + stagger/armor/weakpoint grammar

See `docs/design/combat-feel-and-juice-plan.md` — kept as its own doc since
it's a large, mostly presentation-layer (VFX/audio/animation) body of work
requiring asset iteration, distinct from the data-driven mechanics above.

## 4. The 10-step roadmap (the doc's own proposed sequencing)

1. Freeze scope — no new pillars/systems beyond what's below.
2. Build one perfect 35–45 minute "Proof Run" expedition, following the
   player-facing outline in `docs/design/game-outline-and-proof-run.md`.
3. Combat Feel Pass (see combat-feel-and-juice-plan.md).
4. One More Ring economy — the Depth Contract above.
5. 12–20 transformative relics.
6. Tallow + Nahl vertical slice (see camp-narrative-style-guide.md).
7. Transformation presentation (body/sound/HUD/NPC reactions to infection
   state, replacing/augmenting the bare `INFECTION: 63%` style readout).
8. One signature persistent Hunter enemy (ties into the existing Director's
   named apex-threat framework — extend, don't replace).
9. Extraction ritual — door-slam/silence/O2-refill/manifest-tally beat, an
   audio/UI presentation pass on the existing extraction flow.
10. Performance gate — see Sprint 26's own perf item; the two efforts share
    a root cause investigation (`docs/sprint26-master-plan-2026-08-19.md`'s
    open item on the 6s freeze / chunk-mount stutter).

This is a multi-milestone body of work, most of it presentation/content/
creative iteration that isn't safely fabricated wholesale by an engineering
pass — it needs the user's creative judgment at each step (which relics,
which Hunter, what the crossing ritual actually looks/sounds like). This doc
exists so that judgment has a concrete backlog to work against instead of a
6000-line conversation transcript.

## Explicitly deprioritized this era (the doc's own scope-cut list)

Marketplace expansion, season-pass breadth, more currencies, huge cosmetic
catalogs, Workshop, additional minor factions, more endings for
completeness, large lore-log volumes, new modes that don't exploit the core
loop, additional minigames, more ordinary enemy reskins. None of these are
bad in isolation — they compete with the work above for the same limited
attention, and the source doc's own framing is that shipping fewer, deeper
systems beats shipping more shallow ones for this kind of game.
