# Hunker Bunker: Game-Wide Review Questions and Proposals

This document synthesizes the three northstar docs:

- [expanded-universe-narrative-design.md](expanded-universe-narrative-design.md)
- [implementation_plan.md](implementation_plan.md)
- [hive-swarm-camps-and-humanity-system-design.md](hive-swarm-camps-and-humanity-system-design.md)

It treats the current codebase as the source of truth, not the older "planned"
language in those docs. The goal is to answer four questions:

1. What is already good?
2. What is missing or weak?
3. What are we overcommitting to without a strong delivery path?
4. What should we do next so this feels like a true roguelike instead of a
   branching narrative with random dressing?

## Executive Summary

The strongest part of Hunker Bunker is not the lore on its own. It is the
idea that every investment in a camp, hive, or relationship can later come
back as leverage, rescue, betrayal, or a final manifest problem. That gives
the game a rare identity: the world remembers what the player did.

The main risk is scope drift. The design now contains camps, hives, humanity,
infection, suspicion, queen obedience, bonds, quests, networks, manifest
limits, and many endings. That is exciting, but it can also become a pile of
states that the player cannot read, predict, or care about.

If we want this to become a true roguelike, the random layer must do more than
shuffle camp order. It should change pressure, route, encounters, and the
meaning of each choice. Randomness should create new decisions, not just new
numbers.

## Northstar Synthesis

| Northstar doc | What it is trying to be | What that means for the game |
| --- | --- | --- |
| `expanded-universe-narrative-design.md` | Wide, deep, faction-driven story with camps, branching endings, and strong fiction | We need memorable camps, readable faction identity, and endings that feel earned |
| `implementation_plan.md` | Concrete state machine, reducers, phase gates, and ending handoff | We need the systems to be deterministic, persistent, and testable |
| `hive-swarm-camps-and-humanity-system-design.md` | Dual-faction manifest puzzle with humanity, infection, suspicion, and networks | We need tension, deception, and a boarding decision that feels like a final puzzle |

## Current Reality Audit

| System | Current state in code | Review note |
| --- | --- | --- |
| Camp support and levels | Implemented | Good base loop; investment has real future consequences |
| Camp bonds and quest flags | Implemented | Useful, but still needs more unique quest identity per camp |
| Steal / cull / recruit / turn camp states | Implemented | Strong branching surface; now needs better legibility and consequences |
| Hive allies and hive status | Implemented | Good mirror system; needs more player-facing clarity and variety |
| Humanity, infection stage, cover integrity, suspicion | Implemented | Excellent tension layer, but many players may not understand it without better UI |
| Manifest calculation and seat limits | Implemented | This is one of the best ideas in the whole design |
| Multiple endings | Implemented | Strong ambition, but the asset and QA burden is high |
| Animated camp leaders and workers | Implemented | Makes camps feel alive, which is a real strength |
| Run director / procedural event deck | Missing or thin | This is the biggest roguelike gap |
| Dedicated boarding vessel object | Missing or thin | Boarding still feels attached to camp logic instead of becoming its own climax space |
| Strong run-to-run variety beyond state permutations | Missing or thin | This is the core replay problem we still need to solve |
| Manifest forecast / pre-launch readability | Missing or thin | Players need to understand why an ending happened before the launch, not after it |

## What Is Already Good

- The fiction is coherent. The ice bunker, corporate collapse, queen pressure,
  and survivor camps all fit together cleanly.
- The game has consequence memory. Building up a camp is not just a buff; it
  changes what that camp becomes later.
- The manifesto-style ending logic is strong. A final outcome derived from
  `queenObedience`, camp states, queen status, eggs status, infection, and the
  manifest is much more interesting than a simple binary win/lose.
- The camps feel like places, not menus. Animated leaders and workers give the
  player a sense that the world exists even when they are not interacting with
  it.
- The camp/hive duality is promising. Human camps and alien hives can mirror
  each other without being identical.
- The theme supports replay. The player can imagine different runs as different
  moral and tactical shapes, which is exactly what a roguelike wants.

## What Makes It Best Potential

If this game lands, it will be because of four things:

1. The player built the very things that later trapped them.
2. Every run has a different faction geometry, not just different loot.
3. Final boarding feels like solving a physical and moral manifest puzzle.
4. The player can explain the ending in one sentence because the systems were
   legible all along.

That combination is special. It is not just "survive the bunker." It is
"author the terms of your own escape."

## What Is Bad Or At Risk

- The game risks becoming a beautiful spreadsheet of state flags if the player
  cannot read what any of those flags mean in the moment.
- The game risks becoming a content production trap if every ending, boss
  variant, and faction branch demands bespoke art and video.
- The game risks feeling linear after the first few runs if the random layer
  only changes camp placement and not the actual decisions.
- The game risks overusing "special systems" that do not each create a distinct
  player question.
- The game risks becoming lore-first and play-second if the middle run is too
  much setup for the finale.
- The game risks losing the roguelike identity if death and reruns do not
  produce meaningfully different pressure.
- The game risks confusing new players if it asks them to learn too many nouns
  too quickly: queen, eggs, camps, hives, bonds, obedience, humanity, cover,
  suspicion, manifest, networks.
- The game risks making the player wait too long for payoff if the most
  interesting choices only happen at boarding.

## Questions A Review Team Should Ask

### Core Fantasy

1. What is the player really doing here: surviving, rescuing, manipulating,
   infiltrating, or building?
2. What is the one-sentence fantasy we want the player to feel after ten
   minutes of play?
3. What is the emotional difference between "helping" a camp and "using" a
   camp?
4. Is the Queen a constant pressure source, a final boss, a narrator, or all
   three?
5. What makes this game feel unlike every other survival or roguelike title?

### Roguelike Structure

1. What changes every run besides camp order and a seed?
2. Which decisions are made with incomplete information, and which are purely
   informed?
3. What is the player expected to lose in a bad run?
4. How often does a run surprise the player with a new problem instead of a new
   stat penalty?
5. Does each class produce a different route, or just a different starting
   bias?

### Story And Branching

1. Does each camp choice create a future state that the player can feel
   arriving later?
2. Do the hives add new story texture, or are they only a mirror of the human
   camps?
3. Are the endings readable as consequences, or do they feel like hidden
   script branches?
4. Can the player predict the likely ending family before launch?
5. Are we building a branching story or a replayable consequence engine?

### Systems And UI

1. Does `queenObedience` do enough, or is it just a cull counter with a fancy
   name?
2. Do `bond`, `humanity`, `coverIntegrity`, `suspicion`, and `infectionStage`
   each have a unique job?
3. Does the manifest limit change player behavior before launch?
4. Can the player tell when a camp became hostile, when it was robbed, and why
   that matters later?
5. Are we giving the player enough preview information before irreversible
   decisions?

### Production And Scope

1. Can we afford bespoke cinematics for every ending state the code can
   currently reach?
2. Which branches can be epilogues, overlays, or text cards instead of unique
   videos?
3. Which systems need UI work before they need more content?
4. Which feature adds the most replay value per unit of art and code?
5. What would we cut if we had to ship the fun version in half the time?

## How To Make It A True Roguelike

The main rule is simple:

**Randomize pressure and consequences. Do not randomize the emotional nouns.**

Keep the camp identities, queen mythology, and core manifest fantasy stable.
Randomize the way they collide.

### 1. Add A Run Director

Create a seeded run director that selects a small set of run modifiers at the
start of each run.

Examples:

- Relay blackout
- Ice collapse
- Spore bloom
- Patrol surge
- O2 scarcity
- Egg instability
- Camp paranoia

Each modifier should affect multiple systems at once: map hazards, trade
rates, camp behavior, hive extraction, or enemy spawns.

### 2. Randomize Routes, Not Just Values

Each run should shuffle more than placement.

Randomize:

- Camp discovery order within authored constraints
- Optional objective order
- Room hazard families
- Boss mutation packages
- Quest variants
- Loot identity and scarcity

Keep fixed:

- The three camp identities
- The core classes
- The Queen's pressure model
- The four-seat manifest rule

### 3. Turn Side Content Into Event Decks

Instead of one-off side quests that always happen the same way, build compact
event decks.

For example:

- A camp favor deck with 3-5 variants per camp
- A hive event deck with extraction, rescue, sabotage, and betrayal variants
- A travel event deck for sector hazards and encounters

That gives replay value without needing entirely new content every time.

### 4. Make The Finale Read The Run, Not Just The Flags

The ending should not be only a checklist of state flags.

It should also reflect:

- Which camp was most invested in
- Which faction was most damaged
- Whether the player was exposed or hidden
- Which run modifier dominated the route
- Which alliance was the least stable

This makes endings feel like stories about a specific run, not just a state
combination.

### 5. Add Mid-Run Pressure That Changes Choices

The best roguelike pressure is not "you have fewer resources."
It is "the world is reacting differently this run."

Examples:

- A camp may go into lockdown after a relay event.
- A hive may become wounded and easier to rescue, but harder to harvest.
- Patrols may move faster in one seed and slower in another.
- A run modifier may make stealth paths stronger than brute-force paths.

### 6. Make Failure Interesting

Failure should not only mean "try again."

Good failures:

- Lose a camp but keep the route alive
- Lose the Queen but gain a desperate alternative
- Fail a rescue and get a hostile faction response
- Miss a boss condition and open a harsher late-game variant

That keeps the player engaged even when a run goes sideways.

### 7. Surface The Seed

Let the player see and share the run seed.

That supports:

- Replay
- Debugging
- Social comparison
- Challenge runs

It also reinforces that this is a roguelike, not a linear campaign with some
random setup.

## What To Keep Fixed

These should probably stay authored and recognizable:

- Camp identities and leaders
- The Queen's voice and role
- The three-class fantasy
- The four-seat manifest constraint
- The bunker/ice/biotech aesthetic
- The idea that investment later becomes liability or leverage

If we randomize those too much, we lose the game's identity.

## What To Defer Or Compress

This is where we avoid overcommitting.

- Do not require a bespoke cinematic for every code path if the code already
  supports more paths than the art budget can reasonably cover.
- Do not ship new meters unless each meter changes a different kind of
  decision.
- Do not add another faction until the human/hive loop is already fun.
- Do not add more lore branches until the random run structure is strong.
- Do not treat every status as equally important. Some should be hidden
  implementation detail, not player-facing content.

## Recommended Delivery Plan

### Phase 1: Make The Core Loop Legible

Goal: the player should always know what they can do, what it costs, and what
it changes.

Deliverables:

- Manifest forecast UI before boarding
- Clear camp state summaries
- Clear ending preview language
- Better explanation of bond, obedience, suspicion, and humanity

### Phase 2: Make The Run Different Every Time

Goal: each new seed should feel like a different problem.

Deliverables:

- Run director and seed mutators
- Event decks for camps, hives, and travel
- Route variation beyond camp placement
- Boss mutator packages

### Phase 3: Add Depth Only Where It Changes Choice

Goal: every added system must create a new decision, not just another number.

Deliverables:

- More camp-specific quest variants
- More hive-specific dilemmas
- Better interaction between networks and suspicion
- More state-driven late-game pressure

### Phase 4: Expand Content After Fun Is Proven

Goal: spend art and animation on branches that are already clearly valuable.

Deliverables:

- Additional ending variants only after the base endings are distinct
- More leader portraits and boss art
- More cinematic polish for the strongest paths

## Suggested Acceptance Criteria

The game is in a healthier place when:

- Two runs with the same class still feel meaningfully different.
- The player can explain why they got a given ending after seeing the run
  summary.
- The manifest limit forces a real final decision.
- At least one run modifier changes the player's route, not just the numbers.
- Camp investment changes both Act 1 utility and Act 2 pressure.
- The player can read camp hostility, recruit status, and hive state without
  opening a debug mindset.
- The final boarding decision feels like the climax of the whole run, not just
  a menu choice.
- The team can ship the main endings without needing a unique cinematic for
  every minor branch.

## Bottom Line

Hunker Bunker is strongest when it feels like a consequence roguelike: a game
where the run is different every time, but the fiction still feels authored and
specific.

The current design already has the right soul. The next step is discipline:
make the random layer deeper, make the player-facing logic clearer, and stop
expanding content faster than the game can meaningfully use it.
