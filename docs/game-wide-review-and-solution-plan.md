# Hunker Bunker: Game-Wide Review and Solution Plan

This is a design and implementation review of the current codebase as it stands
today, with the three northstar docs as the intended direction:

- [expanded-universe-narrative-design.md](expanded-universe-narrative-design.md)
- [implementation_plan.md](implementation_plan.md)
- [hive-swarm-camps-and-humanity-system-design.md](hive-swarm-camps-and-humanity-system-design.md)

This document is not trying to be polite about scope. It is trying to answer a
harder question:

**How do we keep Hunker Bunker from becoming a clever but unknowable
spreadsheet, and turn it into a game people actually want to play again?**

The short answer is:

- Keep the fiction authored.
- Make the run structure variable.
- Collapse the player-facing state into a few legible pressures.
- Make every meter change a decision.
- Use AI art for the density layer, not as a substitute for fun.

## Executive Summary

The codebase already has the shape of a real game, not just a prototype.
There is a strong consequence engine here:

- camps remember investment
- hives remember extraction and rescue
- the manifest decides the ending
- the world changes between runs
- the art language is coherent

That is the good news.

The bad news is also clear: the game is accumulating systems faster than it is
accumulating legibility. If the player cannot quickly answer "what do I want,
what changed, and why should I care," then the design will start to feel like a
beautiful management spreadsheet with combat attached.

The biggest risks are:

- too many player-facing counters
- too many branch states that feel hidden instead of earned
- not enough run-to-run variation in routes and pressure
- too much content burden from bespoke endings and branching art
- too much setup and not enough mid-run payoff

## What Is Already Strong

The current codebase has several genuinely strong pillars:

- The world remembers what the player did.
- The camp/hive mirror is thematically sharp.
- The four-seat manifest is a great final puzzle.
- The act structure gives the run a clear arc.
- The public asset language is already cohesive.
- Small props and dressing are becoming a real strength, not just decoration.
- The class fantasy is readable and distinct enough to support replay.

In other words: the game already has identity. It does not need to invent a
better premise. It needs to make the premise playable, reactive, and readable.

## What Is Weak Or At Risk

The current design can become overloaded in four ways:

1. Too many meters.
2. Too many hidden states.
3. Too much branching content for the budget.
4. Not enough actual roguelike variation.

If we keep adding more story states without changing the run structure, the
game will feel authored but not replayable.
If we keep adding more systems without simplifying the UI, the game will feel
smart but exhausting.

## The Core Question

Every review of this game should keep coming back to one thing:

**What decision is the player making right now?**

If the answer is not obvious, then the system needs one of these fixes:

- a stronger prompt
- a clearer summary
- fewer visible meters
- better feedback
- or removal from the player-facing layer

## What The Codebase Appears To Be Doing Well

### 1. Consequence Memory

The camp and hive systems do not reset to zero every time. That is excellent.
It means the run can accumulate meaning.

Recommendation:

- keep persistent state
- keep state transitions deterministic
- keep the final outcome readable from those transitions

### 2. Faction Duality

The camp/hive pairing is one of the best ideas in the project.

- camps represent human survival, bargaining, and moral compromise
- hives represent alien intimacy, extraction, and infection

Recommendation:

- keep the two systems parallel but not identical
- let each faction have its own verbs and its own risk model
- do not collapse them into the same generic resource game

### 3. Clear Act Spine

The act ladder gives the run a shape:

- establish the carrier
- silence the uplink
- grow the dish
- resolve the camps
- launch

Recommendation:

- preserve that spine
- do not replace it with a freeform sandbox
- add variation inside the spine, not by removing it

### 4. World Dressing

The newer prop work is important because it turns systems into places.
This is not cosmetic. This is legibility.

Recommendation:

- keep adding small, stateful props
- reuse prop families with state variants
- prefer density over giant one-off hero art

## What Would Make It Best

If this game lands, it will be because it achieves four things at once:

1. The player can explain the run in one sentence.
2. Every run feels different because the route and pressure changed.
3. The final decision feels like the culmination of all prior choices.
4. The world looks and sounds like it remembers the player.

That is the target.

## What Would Make It Fail

The game fails if it becomes:

- a state machine the player cannot read
- a branching story where the branching is mostly hidden
- a roguelike where only the numbers randomize
- a content treadmill where every extra branch requires bespoke art and video
- a "systems demo" instead of a fun loop

## The Spreadsheet Smell Test

If the player has to mentally track all of these at once, the game is drifting
toward spreadsheet territory:

- bond
- suspicion
- humanity / cover
- queen obedience
- infection stage
- camp level
- camp status
- hive status
- manifest seats
- queen status
- eggs status

That many variables can exist internally. They should not all be equally visible
all the time.

### Rule

**Internal complexity is fine. Visible complexity is expensive.**

The player should see summaries, not raw state soup.

## How To Keep It Fun Instead Of A Spreadsheet

### 1. Surface Fewer Player-Facing Meters

The player should usually only need to read three things:

- survival pressure
- social pressure
- launch pressure

Everything else can exist behind the scenes or be folded into one of those
layers.

Suggested collapse:

- O2 and health remain immediate survival pressures
- humanity / suspicion / cover become one readable "cover pressure" story
- bond / obedience / trust can be shown as faction standing, not separate math
- manifest and seat constraints become the launch pressure

### 2. Give Every Meter A Decision

If a meter does not change what the player can do in the next minute, it should
probably not be displayed as a live bar.

Every visible system should answer:

- what can I do with this?
- what happens if it changes?
- what breaks if I ignore it?

### 3. Use One-Line State Summaries

Instead of dumping five flags, the game should prefer one sentence like:

- `CAMP MERIDIAN: TRUSTED / FORTIFIED / WATCHING YOU`
- `SUTURE HIVE: WOUNDED / RESONANT / BOND 3`
- `VESPER CAMP: HOSTILE / ROBBED / DEFENSES ACTIVE`

That keeps the game legible while preserving the underlying state machine.

### 4. Make The UI Answer "Why"

When a player is denied interaction, the game should say why in plain language.

Examples:

- `COME BACK LATER`
- `GO AWAY`
- `NOT ENOUGH SHELLS`
- `BOND TOO LOW`
- `MANIFEST FULL`

The player can tolerate complexity if the reason is readable.

### 5. Limit The Number Of Simultaneous Choices

At any one moment, the player should usually be deciding between:

- one tactical choice
- one story choice
- one travel choice

If the game asks for more than that, it starts to feel like administration.

## What Makes This A True Roguelike

Randomness should not just shuffle locations.
It should change route, pressure, and payoff.

### Required Roguelike Ingredients

1. Seeded run modifiers that change the route.
2. Event decks that change what each camp or hive asks for.
3. Mid-run pressure that alters the safest route.
4. Replayable failure states that still produce a story.
5. Visible seeds for debugging and social sharing.

### What Should Stay Fixed

Keep these authored and recognizable:

- camp identities
- queen voice and role
- class fantasy
- four-seat manifest rule
- core biome language
- the "investment becomes leverage or liability" premise

### What Should Randomize

These are the best things to vary:

- camp discovery order within authored constraints
- side objective order
- hazard families
- travel encounters
- faction demands
- loot scarcity and bias
- run modifiers
- boss mutators

## System Review And Solutions

### Camp System

What is good:

- camps feel persistent
- camps can be invested in
- camps can become hostile
- camps are visually alive

What is missing:

- more unique camp identities
- stronger local event variety
- better "why now?" readability for phases

Proposals:

- give each camp a distinct event deck
- add camp-specific visual dressing and state variants
- make early-phase interactions explicitly refuse the player until the phase is right
- make the final camp decision feel like a manifested consequence, not a menu

### Hive System

What is good:

- the alien mirror is thematically strong
- hives can carry state
- hives can feel like living sites rather than enemy markers

What is missing:

- more readable hive states
- more explicit payoff for rescue / extraction
- more local ambient behavior and little props

Proposals:

- add hive-specific props and growth states
- make each hive state visually obvious
- let rescue, mining, and bonding change the local environment in a visible way

### Manifest / Ending System

What is good:

- the four-seat manifest is excellent
- the ending logic is consequential
- the final choice reads like a real puzzle

What is missing:

- better forecast UI
- better pre-launch explanation
- fewer endings that require unique expensive cinematic treatment

Proposals:

- add a launch forecast card before boarding
- summarize the ending family in plain language
- use text cards, overlays, or compact cutscenes for low-budget branches
- reserve bespoke animation for the strongest or most visible endings

### Humanity / Cover / Suspicion

What is good:

- this is the right kind of tension for a hidden-alien game
- it creates pressure without needing combat all the time

What is missing:

- player comprehension
- a clean visual model
- a clear idea of which systems are redundant

Proposals:

- fold confusing overlap into one player-facing cover model
- keep the underlying state machine if it matters for endings
- show the player the social risk as a single readable pressure bar or warning state

### Run Variety

What is good:

- the code already supports persistence and branching

What is missing:

- actual run-to-run variation in route and demand
- a seeded run director
- event decks

Proposals:

- introduce a run director with 4 to 6 modifiers per seed
- make those modifiers alter route, loot, and pressure
- add small objective variants instead of more static objectives

### UI / Readability

What is good:

- the UI language is already strong and thematic
- prompts have a real identity

What is missing:

- less clutter
- more "why" messaging
- fewer simultaneous surfaces

Proposals:

- collapse optional info into summaries
- keep prompts crisp and phase-aware
- make refusals explicit and friendly
- keep the game from asking the player to decode the state machine

### Production / Scope

What is good:

- AI-assisted art can absolutely support the density layer

What is missing:

- a production policy for what gets bespoke treatment

Proposals:

- use AI art for props, remains, small sprite families, and state variants
- do not spend bespoke art budget on branches that are not fun yet
- cut or compress low-value endings before cutting core systems

## Questions A Review Team Should Keep Asking

### Core Fantasy

1. What is the player actually doing in this moment?
2. Is this decision about survival, social leverage, or launch?
3. Does this feel like a roguelike choice or just a story prompt?
4. What is the player supposed to fear here?
5. Can the player explain the fantasy back to us after one run?

### State And Legibility

1. Can the player read why a camp or hive changed state?
2. Do we have too many player-facing meters?
3. Is this state changing a decision, or just recording history?
4. Is the game explaining itself in plain language?
5. Would a new player understand this without a spreadsheet mindset?

### Roguelike Structure

1. What changes between seeds besides placement?
2. What changes the route?
3. What changes the final choice?
4. What changes the pressure?
5. What changes the story the player tells about the run?

### Production And Art

1. Is this branch worth bespoke art?
2. Can this be handled with a prop family or a variant?
3. Can this become a summary card instead of a cinematic?
4. Is the art supporting the decision, or hiding the absence of one?
5. Are we spending on the fun, or on the feeling of completeness?

## Recommended Roadmap

### Phase 1: Legibility First

Goal: the player always knows what is happening and why.

Deliverables:

- manifest forecast UI
- clearer camp and hive summaries
- explicit denial messaging
- reduced meter clutter
- cleaner phase prompts

### Phase 2: Run Director

Goal: each seed should feel like a different problem.

Deliverables:

- seeded run modifiers
- route mutators
- camp and hive event decks
- pressure changes that alter route choice

### Phase 3: Content That Serves The Loop

Goal: add only what changes the player decision space.

Deliverables:

- camp-specific event variants
- hive-specific event variants
- a few strong new ending branches
- asset variants for aftermath and state changes

### Phase 4: Polish The Best Paths

Goal: spend the expensive polish where the fun already exists.

Deliverables:

- bespoke art for the strongest endings
- better cinematics for the most important outcomes
- extra ambient dressing for the most repeated spaces

## What To Defer Or Cut

If the schedule tightens, cut or defer:

- any new meter that does not create a new decision
- any ending that exists only to cover a branch edge case
- any cinematic that could be a text card or compact overlay
- any faction addition before the camp/hive loop is already fun
- any content branch that is not replay-relevant

## Definition Of A Good Run

A good run is one where:

- the player understands the core pressure
- the route changes something meaningful
- the camps feel different from each other
- the hives feel like actual living places
- the final boarding choice feels earned
- the ending makes narrative sense

## Definition Of A Bad Run

A bad run is one where:

- the player is tracking too many states too early
- the route feels the same every time
- the choices are technically many but emotionally thin
- the ending is hard to explain
- the game feels authored but not replayable

## Final Judgment

Hunker Bunker is already past the "interesting prototype" stage.
It has the soul of a real game.

The next step is discipline:

- keep the fiction strong
- keep the UI readable
- keep the run structure variable
- keep the state machine hidden unless it matters
- keep using AI art to densify the world, not to postpone design decisions

If we do that, the game can become something rare:

**a consequence roguelike that feels authored, surprising, and actually fun.**

## Credits And Acknowledgements

- Project world, tone, and design direction: the project author
- Review synthesis and implementation framing: Codex, OpenAI
- Asset strategy and world-dressing recommendations: AI-assisted, curated by the project direction
- Core reference material: the three northstar docs listed at the top of this file


---

# Appendix A — Code-Level Audit and Direct Answers (Second Reviewer)

The body of this document reviews the design. This appendix reviews the
**code as it actually stands** (post-`348931a` plus the seamless-infection and
turret work landed the same day), answers the questions doc point-by-point,
and proposes the concrete mechanisms that turn the recommendations above into
work items. Art production is assumed solved by AI generation throughout.

## A.1 Ground-truth inventory

| Layer | Where | State | Honest assessment |
| --- | --- | --- | --- |
| Act 1 survival loop | `threeGame.js` (~14k lines), `bank.js`, `foundry.js`, `director.js` | Shipped, playable | The strongest minute-to-minute game: O2 pressure, extraction-risk banking, chunked world, classes, bosses. Already fun. |
| Hidden arc / reveal | `arcState.js`, `caveReveal.js` | Shipped | Best authored beat in the game. The reveal now continues the run seamlessly — you become infected and walk back out of the cave with the uplink objective live. |
| Act 2 faction state | `act2.js` v3 (pure, ~1k lines) | Shipped, 47+ dedicated unit tests | Camps, hives, humanity/infection/cover, suspicion, networks, manifest solver, 10-ending picker. Deterministic and persistent. The machine is done. |
| Act 2 world layer | `camp.js` (leaders, workers, barricades, turrets), `hiveSite.js` (alien walkers), defenders, mining | Shipped | Camps and hives are places with people. Turrets make camp investment physical in both acts: they shock slugs for you in Act 1 and hunt you in Act 2 until spoofed (Vey bond) or smashed (raises suspicion 20). |
| Choice surface | camp/hive modal, warn/latent/steal/cull/recruit/turn, 4 boarding variants, manifest gate | Shipped | Every reducer reachable through play; illegal manifests blocked with reasons. |
| Cover pressure | humanity decay (~1/12s), per-camp suspicion, outing propagation over the relay, COVER HUD bar | Shipped | Runs, but tuning is guesswork until playtested. |
| Endings | 10 families with lines, titles, cutscene basenames | Shipped as text cards + queen/system copy | Correct call: videos are an AI-art pass, not a code dependency. |
| Verification | 202 unit tests (28 files), 4 headless smoke suites (full ladder, camps, hives/manifest, fresh boot) | Shipped | The game regression-plays itself end to end. Protect this asset. |
| Run director / event decks | `director.js`, `runModifiers.js` | **Thin** | Modifiers mostly scale numbers. Biggest roguelike gap — matches Phase 2 above. |
| Manifest forecast UI | — | **Missing** | Player meets the seat math at the launch button. |
| Run summary / ending explanation | — | **Missing** | Nothing tells the player *why* they got their ending. |
| Dedicated vessel object | boarding overloaded on the command camp | **Missing** | The climax happens at a tent. |
| Queen boss fight | — | **Missing** | The single biggest unbuilt promise of the defiance paths. |

### The structural insight

The codebase has quietly split into two games: **(1)** the minute-to-minute
survival game, which is fun and verified, and **(2)** the consequence engine,
which is complete, correct, and almost entirely invisible until the end.
Every risk in the questions doc — spreadsheet, lore-first, late payoff — is
the same gap stated differently: *game #2 doesn't yet express itself through
game #1.* Everything in this appendix is about closing that gap.

## A.2 Direct answers to the review questions

**Core fantasy.** The player's verb is *carrying* — salvage in Act 1; a
queen, secrets, and finally a manifest of lives in Act 2. Ten-minute fantasy
sentence: *"Everything I build will still be here when I'm the monster."*
Helping vs. using a camp should differ in the player's head, not in a karma
meter — do not add an ethics stat. The Queen is pressure-source and narrator
until the player chooses defiance; then she must become a fight.

**Roguelike structure.** What changes per run today: seed, placement,
missions, thin modifiers, class camp-order. Not enough (see A.3). The
suspicion system is the right kind of hidden information but needs *tells*
(leader behavior, barter prices) instead of an invisible number. Death should
bend the arc cheaply — e.g., dying inside a camp while symptomatic costs
suspicion. Classes need one Act 2 *verb* each, not just stat bias:
Scout slips turret sensor cones; Tank shrugs the first zap of any grid;
Engineer can reprogram a spoofed turret to fight *for* him.

**Story and branching.** Consequence-engine, not branching-story: commit.
Hives currently mirror camps ~70%; the three rites (Host Mercy / False
Clearance / Guard Oath) are the differentiators — deepen them before adding
anything new. Endings don't need simplifying; they need the forecast (A.3.1)
so a player who can predict the ending family and *chooses it anyway* is
having the intended experience.

**Systems and UI.** `queenObedience` is almost a cull counter — give it
teeth: at high obedience the queen helps (marked loot, slowed humanity
decay); at negative she interferes (compass lies, vitals static, hive
ambushes). Meter jobs are distinct except `coverIntegrity`, which overlaps
humanity — fold it in until a masking-item system needs it. **One meter
should die rather than two meters half-live.**

**Production.** With AI art assumed, the remaining scope discipline is
systems scope. Crunch-cut order: networks bridge/jam UI (keep state), latent
infect path (keep reducer), mothership-infection gameplay (keep picker),
tail-end ending videos (text cards carry them).

## A.3 Concrete mechanisms (work items for the roadmap phases)

### A.3.1 Legibility (Phase 1) — the state machine must speak in-world

1. **Consequence lines on every modal option** (~1 day): each option shows
   *what changes now / what it means at launch*. Data already exists in
   `getEndingVector()` and `buildAct2Manifest()`.
2. **The Queen's Ledger** (~2 days): one post-reveal HUD chip —
   `♛ obedience −1 · seats 3/4 · vector: OUTED ESCAPE` — updating live as
   choices land. This single element converts the hidden picker into a dial
   the player watches themselves turn. The moment a player says "if I warn
   Tallow my vector flips" the spreadsheet has become a game.
3. **Manifest Forecast at the vessel** (~2 days): four-slot seat diagram
   (queen two seats wide), eligibility with reasons, per-variant ending
   preview. Reuses `buildAct2Manifest` verbatim.
4. **Tells over numbers** (ongoing): suspicion as behavior — leaders stop
   approaching, barter prices tick up, workers stare. Leader sprites already
   animate; this is state-driven animation, not new systems.
5. **Run summary card** at death/launch (~1 day): what you built, what you
   broke, what it cost — doubles as the ending explanation.

### A.3.2 Run Director (Phase 2) — pressure cards

Draw 2–3 visible cards per run (max one faction card + one world card); every
card must create a **route decision**, never just a stat tax:

| Card | World effect | Faction effect | Decision it creates |
| --- | --- | --- | --- |
| RELAY BLACKOUT | radar degraded | outing cannot propagate | the safest run to be sloppy in |
| SPORE BLOOM | bio biome spreads | Tallow pays double for meds; Nahl starts wounded | herbalist run vs. avoidance run |
| PATROL SURGE | faster, denser snails | Vesper sells ammo cheap; camps lock down at night | fight-through vs. daylight routing |
| ICE COLLAPSE | corridors sealed per-seed | one camp unreachable until dug out | route around vs. rescue dig |
| CAMP PARANOIA | — | suspicion ×2, bond quests pay ×2 | high-risk high-trust run |
| EGG INSTABILITY | — | egg seat requires Nahl even with the queen | reshapes the whole boarding calculus |

Implementation: extend `runModifiers.js` data + hooks already present in
`director.js` and the camp/hive economy paths. Surface the seed on the HUD
and the run summary.

### A.3.3 Physical payoff (Phase 3) — started this session

- ✅ Seamless infection: no menu reset at the reveal; you wake as the carrier
  and walk out of the cave into a world you must now deceive.
- ✅ Turrets: investment physically defends you, then physically hunts you;
  spoof (Vey bond ≥ 1), smash (loud, +20 suspicion), or stay clear.
- Next: queen interference/gifts keyed to obedience; camp lockdowns at
  suspicion 50 (gates, refused barter, warning strobes — suspicion becomes a
  *place*); the queen fight in the cave you crawled out of, reusing the boss
  framework and the corrupted-leader boss sprites already in the repo.

### A.3.4 Acceptance addition

To the criteria above, add one: **every surviving meter must be visible as
behavior somewhere in the world.** Any meter that can't earn that either goes
internal or dies.

## A.4 Bottom line (second reviewer)

The engine half of this game is finished and tested; the felt half is ~40%
built. Nothing needs cutting — but the build order must be legibility →
variability → physicality → content, and the discipline is refusing new
systems until the existing thirty flags each have a face, a sound, or a
turret. The spreadsheet becomes a game the day the player watches themselves
turning its dials.
