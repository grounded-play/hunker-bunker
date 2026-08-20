# Hunker Bunker — Game Outline & Proof Run Contract

This is the player-facing outline for the current milestone. It turns the
"One More Ring" pillars into a concrete run structure that design, gameplay,
UI, narrative, and acceptance work can all evaluate against.

## The promise

Hunker Bunker is a co-op extraction roguelite about deciding how deep into a
hostile bunker to go before oxygen, enemies, and the bunker itself force the
team back out.

The signature decision is not “can we survive this room?” It is:

> We can leave with what we have. Do we spend more oxygen to cross one more
> ring for a better build and a more dangerous return trip?

Every major system should make that decision clearer, more consequential, or
more memorable. Systems that do not support it belong behind the current
milestone rather than beside it.

## The player loop

```text
Prepare → Descend → Read the threat → Fight / bypass / exploit →
Choose reward or safety → Cross a deeper ring → Decide whether to extract →
Return with consequences → Improve the next attempt
```

### Prepare

Choose a class, weapon, and starting loadout in the Armory. In co-op, the
briefing must make the squad's classes, loadouts, host, and readiness obvious
before deployment. The player should understand the first objective and the
cost of failure before control begins.

### Descend

Move through rooms, collect salvage, read environmental clues, and spend O2
as the expedition clock. The first ring teaches movement and shooting; later
rings teach that staying longer is an intentional bet.

### Read and solve

Enemies must ask different tactical questions—control distance, break line of
sight, protect O2, expose weakpoints, or prioritize support targets. Rooms
should alternate pressure with reward, choice, story, faction, or breathing
space so the run has an arc rather than a corridor of identical fights.

### Build

Weapons provide the reliable baseline. Relics provide the run's rule changes:
they should alter when the player reloads, risks low O2, attracts enemies,
heals, spends ammunition, or chooses a target. A player should be able to
explain their current build as a strategy, not a list of percentages.

### Cross a ring

The crossing is a short, legible ritual: show what improves, show what gets
worse, give the player a sound/visual confirmation, and let the player feel
that the decision was theirs. The Depth Contract is the mechanical source of
truth; the HUD, audio, and narrative presentation are its player-facing
surface.

### Extract or press on

Extraction is a decision beat, not a menu button. The game should make the
current haul, O2 state, injuries, relic build, and return risk visible. Going
deeper should be attractive because it creates a better run, not mandatory
because shallow rewards feel irrelevant.

### Return and remember

The run resolves into salvage, unlocked knowledge, faction consequences, and
the next meaningful choice. Death should communicate what was lost, what was
kept, and what the player learned. The world should visibly or narratively
remember consequential actions where the existing story systems support it.

## The 35–45 minute Proof Run

The milestone run is deliberately small and repeatable:

1. **Briefing (0–3 min):** select class/loadout; in co-op, confirm squad and
   host state; state the first objective.
2. **Orientation (3–8 min):** teach movement, shooting, interaction, and O2
   through play, not a text wall.
3. **First commitment (8–15 min):** present the first meaningful route,
   fight, or salvage choice; award a build-relevant item.
4. **First crossing (15–22 min):** show the Depth Contract delta and make the
   reward/danger trade visible.
5. **Build expression (22–32 min):** combine enemy verbs, room pacing, and at
   least one transformative relic so the player's strategy changes.
6. **Escalation (32–40 min):** pressure O2 and the build with a stronger
   encounter, set-piece, faction beat, or boss grammar.
7. **Extraction (40–45 min):** offer a clear leave/continue decision, resolve
   the haul and consequences, and return cleanly to the next-run state.

This is a target shape, not a forced timer. A successful run may end earlier
because the player extracts or later because they take the risk. The sequence
exists to guarantee that the game demonstrates its promise during one session.

## What must be true for the outline to work

| Player question | Required evidence |
|---|---|
| What am I doing? | First objective is visible and actionable within the first minute. |
| Why go deeper? | Crossing shows a concrete reward and danger change. |
| How is my build different? | At least three relic effects change decisions, not only stats. |
| What does this enemy require? | At least three enemy types use distinct readable verbs. |
| Can we trust co-op? | Two players see the same host, roster, readiness, combat, and extraction result. |
| What did failure mean? | Death/reconnect/retry communicates retained and lost progress. |
| Can everyone read the game? | Critical states use shape, icon, motion, or text in addition to color. |

## Scope rule for this milestone

Prioritize the smallest complete expedition over additional content breadth:
Depth Contract presentation, a proven core relic set, readable combat verbs,
clear extraction, first-hour teaching, accessibility floor, and real co-op
acceptance. Defer new currencies, cosmetic breadth, modes, factions, and
large narrative expansion until this outline survives a packaged human run.

See `docs/sprint28plan.md` for implementation lanes and
`docs/sprint28-acceptance-log.md` for the evidence record.
