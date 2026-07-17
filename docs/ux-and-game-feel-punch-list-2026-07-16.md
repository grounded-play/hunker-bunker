# UX and Game-Feel Punch List — 2026-07-16

A consolidated, code-grounded punch list from a live playtest review. Each
item lists the concrete root cause (file:line, current numbers — not
guesses) and a proposed fix. **This is a plan, not a changelog** — nothing
here has been implemented yet; it's the basis for deciding what to act on
next.

## Section 1: Notification & dialogue system

Reviewed in full (see conversation for the complete catalog of all ~23
distinct notification/dialogue/overlay mechanisms). Ranked findings:

1. **`showTacticalOverlay` reuses the full-screen loading-screen element**
   (`main.js:4525`, DOM `#loading-screen`) for mid-combat alerts
   (`hunter-pair-spawned`, `lander-deployed`) — the enemies are already
   spawned (`src/threeGame.js:15303`, `:15333`) before the screen blurs
   for 3.8-4.8s, denying the player visibility of the battlefield exactly
   when a new threat arrives. The same element also does real loading
   (`showRunLoadingScreen`) and a third "briefing" mode with a speaker
   portrait — one element, three jobs, inconsistent z-index between modes
   (10000 vs 15250).
   - **Fix**: move `hunter-pair-spawned`/`lander-deployed` off the
     full-screen overlay onto a corner HUD card (reuse the existing
     `.hud-notification-stack` idiom), never blurring the play area.
2. **Four unrelated accent colors occupy the same top-right corner slot**
   with no unifying visual language: radio/biome = cyan, achievement/Steam
   toast = green, tutorial = orange, mission-progress = amber. Steam item
   drops (real economic value) are visually identical to routine
   achievement pops.
3. **Priority inversion during onboarding**: achievement/Steam toasts
   (`dataset.notificationPriority = '5'`) always outrank tutorial prompts
   (`'15'`) in the shared deck — a new player mid-tutorial who unlocks
   something gets the achievement card shown before the tutorial guidance
   they actually need next.
4. **Steam item-drop toast has no CSS identity of its own** — it borrows
   `.achievement-toast` wholesale (`main.js:8322`), so it can't be styled
   distinctly and any future achievement-toast restyle unintentionally
   reskins real Steam grants.
5. Lower priority: elevator-choice-modal (z-index 13000, default) vs.
   camp-choice-modal (16200) for similarly "must-choose-now" moments;
   `#foundry-hud-prompt` reused across three unrelated proximity prompts
   (foundry/cave/camp); one-shot class-intro overlay uses z-index `80`
   while everything else uses 4-5 digits.

**Recommended order**: #1 first (concrete gameplay-clarity cost), then
#2+#3+#4 together as one visual-language pass (fixing one without the
others just moves the inconsistency around).

## Section 2: World generation — camps, hives, maze

### 2a. "I never find the camps"

Three compounding root causes, not one:

- **Placement**: `chooseCampPosition` (`threeGame.js:7444-7475`) places
  camps 70-120u from spawn/ship (`lerp(70, 120, random())`), fanned
  around 3 base angles ±31°.
- **The discovery flare is fogged out for half of every day/night cycle.**
  The flare (`src/camp.js:134,304-322`) is an 11-unit additive column
  meant to read over the 2.8u walls — but its material has no
  `fog: false` set (unlike other emissive sprites in the same file), so
  scene fog affects it. Fog-far cycles from ~35u ("day") to ~336u
  ("night") on a 150-second loop (`threeGame.js:747-748, 10661-10662`).
  Camps sit 70-120u out — **for the entire "day" half of every cycle,
  the flare is fogged into invisibility long before the player is close
  enough to see it.** Only the "night" half gives it a real chance.
- **The one navigational aid that exists is invisible to keyboard/mouse
  players.** `getAct1SideSignalTarget()`/`getRadarCompassState()`
  (`threeGame.js:7737-7777, 9037-9174`) already compute a live
  bearing/distance to the nearest undiscovered camp or hive throughout
  Act 1 — but the only place this renders is the touch/mobile move
  control's compass arrow (`index.html:749-755`), which carries `hidden`
  by default and is only shown for touch pointers
  (`threeGame.js:4423-4425`). **Desktop players get zero directional
  hint at all**, despite the targeting math already existing and running.

**Fix options** (pick one or combine):
- Set `fog: false` on the signal-flare material so it's visible at its
  full geometric range regardless of time-of-day (cheapest, most direct
  fix for root cause #2).
- Surface `getRadarCompassState()` in a real HUD element for
  keyboard/mouse, not just the touch control (fixes root cause #3 —
  this is the one that means desktop players have *no* aid at all today).
- Optionally tighten placement distance or discovery radius if the above
  two aren't enough on their own.

### 2b. "The alien hives are too close"

Concrete and numeric: hives place at 45-90u (`chooseHiveSitePosition`,
`threeGame.js:7081-7103`, median ~67.5u) on a band that **overlaps** and
sits closer than camps' 70-120u (median ~95u), and hives are deliberately
fanned *between* the camp bearings. A player walking toward any camp
direction crosses a hive's radius first almost every time — hives read as
"in the way" rather than a distinct, farther-out threat.

**Fix**: widen the gap — push hive median distance down and/or camp
median distance up so the bands stop overlapping, or move hives off the
camp-bisector angles so they're not sitting directly on every path
outward.

### 2c. "The maze isn't really diverse"

The diamond/cross/ellipse plaza-shape work from earlier this session
(`src/landforms.js` `openMazeTerrain`) is real and does execute (40%
ellipse / 30% diamond / 30% cross) — but it's diluted by two things:

- **Maze is the rarest archetype to begin with** (14-18% weight per
  biome, `LANDFORM_WEIGHTS`), so most chunks a player sees aren't maze at
  all.
- **A shape-agnostic density-fill pass erases the shaped silhouettes.**
  After the shaped plazas carve, `openMazeTerrain` runs a probabilistic
  soften pass then a **shape-blind fill-to-`floorTarget`** loop (0.80-0.82
  target) that keeps opening random wall cells with no knowledge of the
  diamond/cross/ellipse shapes it just carved — on top of 24 Markov
  erosion iterations before the carve and up to 3 more full-grid widening
  passes after it. By the time a maze chunk renders, it's been through so
  much shape-agnostic opening that it reads closer to the `field`
  archetype (near-100% floor) than to a maze with distinct room shapes.
  Only `ruins` and `canyon` keep strong silhouettes because they don't get
  the same aggressive fill/widen treatment.

**Fix**: make the density-fill/widen passes shape-aware (stop opening
cells that are inside an already-carved plaza's silhouette boundary), or
lower `floorTarget` for maze specifically so the shape carve isn't
immediately buried under a much larger blind-fill step.

(Hex-grid/true multi-level generation remains explicitly out of scope —
this is purely about the existing pipeline undoing its own shape work,
not about the deferred bigger rewrite.)

## Section 3: Objectives, lore, sub-objectives

### 3a. "There isn't a way to clearly pick up lore"

Two incompatible pickup grammars exist for the same concept, plus a real
progress-counter bug:

- **Lore terminals** (`src/threeGame.js:13572-13812`) require a
  deliberate E-press, but the sprite reuses the exact same texture as an
  ordinary "rare loot pile" (`/bunker_junk_rare.png`, only the tint
  differs) — nothing marks a terminal as special until you're standing
  next to it. Worse: its interact prompt (`#lore-hud-prompt`,
  `index.html:812-815`) lives *outside* `.hud-mission-stack` and never
  gets the emphasized treatment every other prompt gets (float animation,
  `z-index: 9999`, badge styling) — it's the least visually prominent
  prompt in the game (small, static, bottom-center, `z-index: 150`).
- **Physical lore drops** (`src/loreDrops.js`, 14 collectibles) are the
  opposite: **zero player agency** — `updateLoreDrops()`
  (`threeGame.js:7648-7674`) auto-collects the instant the player gets
  within 1.25 units, no prompt at all. A player who's learned "lore
  needs E" from terminals can walk through a drop without ever
  consciously picking it up.
- **No compass/radar hint for lore at all.** `getRadarCompassState()`
  has dedicated priority branches for black box, cave finale, foundry,
  and camps/hives — nothing for lore terminals or drops. Every other
  interactable in the game points you toward it; lore doesn't.
- **No in-run progress counter** — "X/Y LOGS" only appears on the
  game-over screen and in the main-menu archive status, never during
  play.
- **A genuine counting bug**: collecting one physical lore drop writes
  **two** entries into the shared `logsFound` ledger — once via
  `markLoreDropFound(entry.drop.key)`, and again via the
  `lore-terminal-read` event using the drop's *title* as a second,
  different key (`threeGame.js:7676-7690`). Neither matches the
  hardcoded 28-entry `ALL_LORE_KEYS` list the game-over/menu counters use
  as their denominator (`main.js:3016-3019`), so collecting all 14 drops
  plus every terminal log produces a nonsensical readout like "56/28
  LOGS." (The `archivist` achievement is unaffected — it uses its own,
  correct `loreDropIds` tracking.)

**Fix**: give terminals a distinct sprite/glow so they read as special at
a glance, move `#lore-hud-prompt` into `.hud-mission-stack` for the same
visual weight as other prompts, add a lore branch to
`getRadarCompassState()`, add a live in-run counter, and fix the
double-write bug in `collectLoreDrop()`/the `lore-terminal-read` handler
so drops and terminal logs land in one consistent, correctly-denominated
ledger.

### 3b. Objective tracking and the black box

The good news: `#loop-step-hud` (`threeGame.js:4005-4068`) is genuinely
well-built — it's re-derived from live state every single frame and
dispatches a change event only when the resolved objective actually
changes, so **it can't go stale**, and it does correctly show "RECOVER
BLACK BOX" while a black box is active. `#mission-progress-hud` by
contrast is *not* frame-derived — it only updates via explicit push
calls scattered across several event handlers, which is structurally
more fragile even though no live staleness bug was found in current call
sites.

The real black-box-specific gap: **the guard boss isn't actually
enforced.** `interactWithBlackBox()` (`threeGame.js:4348-4373`) checks
only proximity to the box, not whether the "corrupted operator" guard
spawned alongside it is still alive — a player can kite past the guard
and recover the box anyway. The one-time toast explaining a guard is even
there (`'CORRUPTED {classType} OPERATOR GUARDING BLACK BOX...'`) fires
once at spawn and is never shown again, so a player who misses it loses
that context entirely.

**Fix**: gate `interactWithBlackBox()` on the guard's defeat if "defeat
the guard, then recover" is the intended design, and/or re-surface the
guard warning as a persistent HUD line (not a one-shot toast) while the
guard is alive.

### 3c. Sub-objectives — what exists to build on, what's missing

No true checklist/multi-step objective display exists anywhere. The
closest reusable patterns: `dialogueStage` (an ordered integer stage per
NPC, `src/data/campDialogue.js`), `ACT2_INFECTION_STAGES` (a named-stage
array), and `CAMP_QUESTS`/`questFlags` (atomic per-camp/hive quests,
`src/data/campQuests.js`) — all good precedent for the *data* side. But
**every existing objective HUD element (`loop-step-hud`,
`mission-progress-hud`, the black-box prompt) is built to show exactly
one line of text at a time** — there's no multi-line checklist component
to extend. Even `CAMP_QUESTS`, the closest thing to a real quest system,
has zero HUD/compass surfacing while active — the same "no live tracking"
gap the player is flagging for the black box.

**Fix**: this is real new work, not a small patch — a sub-objective
system needs (a) a data shape for parent objectives with child steps
(reusing the flag-dict pattern from `questFlags` is a reasonable start),
and (b) a genuinely new HUD component (a small checklist list, not
another single-line prompt) since nothing like that exists today.

## Section 4: Boss difficulty, ammo economy, skill tree UI

### 4a. "Bosses are tricky"

Player baseline: 3 hearts, clip 6 (+2/4/6 per `ammoCapacity` tier), 1 damage
per shot (2 for TANK), 0.14s fire cooldown, 1.25s reload — base sustained
DPS ≈2.87, fully shell-tree-upgraded ≈37 (a 13x swing gated entirely
behind the separate COMBAT MATRIX currency).

Biome boss HP/TTK at **base** damage: `boss_cybersnail` 20hp (~7s kill,
1-2 attack volleys), `boss_cryosnail` 40hp (~14s kill, 2-3 shockwave hits
each costing a full heart + a 3s slow), `boss_sporesnail` 75hp (~26s kill,
during which it spawns uncapped-looking waves of 2 add minions every
6.5s — fighting the boss *and* a growing swarm at once).

**Root cause**: boss spawn gating is tied to O2-generator/story progress
(`src/threeGame.js:13493-13535`), completely independent of the
shell-funded weapon-upgrade tree. A player can reach the Cryo/Bio bosses
having never touched `shotDamage`/`shotAmount`/`ammoCapacity` — the
fights are balanced assuming upgrade investment the story doesn't require
first. The Act 2 `boss_corrupted_tank` hunter's slam is also worth a
second look on its own: 2 damage = 67% of a base 3-heart pool in one hit,
telegraphed only by a camera shake.

The Queen fight (`src/bossPhases.js`) is separately fine as designed —
120 HP armored to 25% outside weakpoint windows (32-57% duty cycle by
phase) is an intentional "wait for the window" pattern, not a balance
bug — but it compounds the same base-kit problem if a player arrives
undergeared.

**Fix options**: either soft-gate biome boss encounters behind a minimum
weapon-upgrade tier (so the story can't outpace the player's kit), or
retune early boss HP/attack frequency down to be base-kit-feasible and
let upgrades make them *easier* rather than *possible*.

### 4b. "Ammo is too minimal"

This has real, concrete math behind it, not just a feeling. Two-tier
ammo: clip (6 base) + reserve pool (capped 24/30/21 by class). **A fresh
run starts at 18 reserve + 6 clip = 24 rounds — already at the class
cap.** Passive trickle refills the clip at ~1 round/10s at base (doesn't
touch the reserve), and there's no melee fallback at all — hit zero ammo
and you're down to that slow trickle.

At base 1-damage-per-shot: `boss_cybersnail` (20hp) costs 20 shots — 83%
of an entire starting loadout for one boss. `boss_cryosnail` (40hp) costs
40 shots — **more than the entire starting ammo pool outright**,
mathematically unwinnable without ammo collected in advance or weapon
upgrades. `boss_sporesnail` (75hp) costs 75 shots, over 3x the cap. Boss
kills only drop bonus ammo *on death* (too late to help), and world
pickups give +1 reserve round each at ~35-52% pickup-type weight — nowhere
near enough to offset a 40-75 shot boss fight from a starting pool of 24.

**Root cause**: the ammo economy (clip+reserve sizing) was clearly tuned
for trash-mob attrition (2-4 HP basic enemies, where it roughly
breaks even), not for biome bosses (20-75 HP) at base weapon damage.

**Fix options**: raise base starting reserve and/or class caps, make boss
encounters drop ammo mid-fight (not just on death) when the player is
critically low, or lower early boss HP to match what a base loadout can
actually sustain.

### 4c. "The skill tree UI is flunky"

Four confirmed issues, verified against current code (not just prior
doc notes):

1. **No keyboard/controller spatial navigation.** Tab order follows DOM
   insertion order (class branch → combat branch → ship branch,
   `src/skillTree.js:212-234`), not the visual row/column grid layout the
   player actually sees — tabbing jumps non-spatially around the tree.
2. **False click affordance on already-purchased nodes** — likely the
   main source of "flunky." `.skill-node-card`'s base CSS sets
   `cursor: pointer` and only the `locked` state overrides it; the
   `unlocked` (fully-purchased) state keeps the pointer cursor *and* the
   hover glow, but `buildTreeNodeCard` only attaches a click handler when
   a node is actually `available` to purchase (`threeGame.js:6026`) — so
   clicking a node you already own visually invites a click and silently
   does nothing.
3. **No visual "what to unlock next" preview** — only plain blocker text
   (`REQUIRES: HULL MATRIX + AMMO CONDENSER`), no highlighted path on the
   connector graph toward it.
4. **Cross-branch gating isn't balance-tuned yet** — e.g. `radarNode`
   requires both a ship-goal prereq *and* the `weapon_ammoRefill` combat
   node, locking ship progression behind weapon-tree investment and vice
   versa, with no sign of a balance pass on these specific combinations.

**Not the problem**: purchase feedback itself (distinct success/error
audio, immediate re-render, pulsing border on genuinely `available`
nodes) is solid. The "flunky" feel is much more likely #1 and #2 above
than a lack of feedback.

**Fix**: #2 is the cheapest, highest-value fix (either remove the
pointer cursor/hover glow from purchased nodes, or give them a real
no-op-but-honest click state); #1 needs a real `tabindex`/arrow-key
navigation pass matching the visual grid; #3 and #4 are bigger,
lower-urgency design passes.

---

## Summary: recommended action order

Given everything above, roughly in order of (impact vs. effort):

1. **Cheap, high-value fixes**: signal-flare `fog: false` (camps), skill
   tree false-click-affordance removal, tactical-overlay-off-full-screen
   for combat alerts, the lore double-write counting bug.
2. **Numeric rebalancing** (no new systems, just tuning existing
   numbers): hive/camp distance separation, ammo economy (starting pool
   and/or boss HP), maze `floorTarget`/shape-aware fill.
3. **Missing-surface fixes** (wiring existing logic to a UI it doesn't
   reach today): desktop compass/radar HUD (world-gen), lore compass
   branch, black-box guard enforcement.
4. **Real new work** (needs new UI components, not just tuning): the
   notification visual-language pass (colors/priority), a genuine
   sub-objective/checklist HUD component.
