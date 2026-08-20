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

Status: **not yet implemented.** No `salvageMultiplier`/`rewardMultiplier`
concept exists anywhere in `src/*.js` today (confirmed via repo search). This
is the first concrete build target — see the companion module this doc's
sibling commit adds (`src/depthContract.js`) for a first data-driven cut:
pure functions only (no rendering/HUD wiring yet), so it's low-risk to land
and testable in isolation. HUD/audio ritual presentation is a follow-up, not
included in this pass.

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
`stats` object rather than flavor text alone. One (`last_breath` — below 20%
O2, weapon damage doubles) is fully wired to a real runtime hook: a new pure
`applyLastBreathDamage` in `runDrops.js`, called from
`ThreeGame.spawnPlayerShot`, with unit tests. The other 7 are honest
catalog-only entries (roll into loot, appear in the manifest/UI, described
accurately) — wiring each into its own gameplay hook (reload economy,
enemy-aggro AI, faction-aware healing) is real per-relic engineering work
still to do, not attempted wholesale in one pass to avoid fabricating
half-tested mechanics across systems (reload, ammo, AI targeting, faction
state) this pass didn't otherwise touch.

## 3. Combat impact stack + enemy verbs + stagger/armor/weakpoint grammar

See `docs/design/combat-feel-and-juice-plan.md` — kept as its own doc since
it's a large, mostly presentation-layer (VFX/audio/animation) body of work
requiring asset iteration, distinct from the data-driven mechanics above.

## 4. The 10-step roadmap (the doc's own proposed sequencing)

1. Freeze scope — no new pillars/systems beyond what's below.
2. Build one perfect 35–45 minute "Proof Run" expedition.
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
