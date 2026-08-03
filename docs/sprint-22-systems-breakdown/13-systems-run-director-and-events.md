# System Breakdown: Run Director and Roguelike Events

## Current Status

`src/director.js` is implemented, tested, instantiated by `ThreeGame`, and updated during gameplay. It selects patrol, lights-out, corruption, mercy, and taunt actions from pressure snapshots. It also defines named apex threats: a Vesper hunter pair and a Mothership exterminator lander, triggered by suspicion/outing conditions.

The original statement “the game has no active event deck” is therefore stale. The open question is whether the connected actions create perceptible, fair route-changing pressure in a real run.

## Inputs and Cadence

The director reasons about safety, health, depth, elapsed time, threat gaps, faction state, and already spawned apex events. Safe-field and mercy behavior prevent relentless pressure. Runtime integration should pause or suppress actions when gameplay simulation is not active.

## Product Goals

- break the dominant backpedal-and-fire rhythm;
- change route safety without invalidating authored objectives;
- make faction suspicion physically consequential;
- create memorable run stories;
- preserve recovery windows and player attribution.

## Sprint 22 Acceptance

For representative seeds and difficulty levels, log:

- event/action timeline;
- time between threats;
- player health/oxygen/depth when selected;
- whether the player understood the cause;
- whether objectives or gates became impossible;
- whether apex threats spawned once and persisted correctly;
- whether safe zones and pause states suppressed escalation.

## Content Expansion Rule

Add a card only if it changes a decision. Each new action needs eligibility, telegraph, duration, cancellation, stacking rules, recovery, and a deterministic selector test. Cosmetic-only ambience belongs in the audio/room system, not the pressure deck.

## Faction Demand Variation

Variable camp demand/pricing remains a product option. Before implementing it, verify that the current camp economies and active verbs are understood; random prices can create adaptation, but can also obscure faction identity and make progression feel arbitrary.

## Risks

- invisible director cheating;
- event stacking during boss/story encounters;
- stalkers crossing locked topology or safe fields;
- mercy becoming exploitable;
- actions continuing through pause/cutscene;
- too much variation preventing players from learning cause and effect.

## LineDirector — ambient commentary arbiter (added end of Sprint 21)

Landed after the rest of this file was written: `src/lineDirector.js` is a
context-scored arbiter (design: `docs/superpowers/specs/2026-08-02-line-director-overhaul-design.md`)
that replaced `Math.random()` selection for the bunker's ambient taunts and
the Mothership's reactive event lines. It fixed a real player-reported bug —
depth-flavored lines (e.g. "you've gone too deep") could previously fire
regardless of the player's actual depth, and the Director's ambient system
and the Mothership's reactive system had no shared cooldown, so they could
talk over each other seconds apart.

- Lines are tagged pools (`src/data/lineDirectorPools.js`) scored against a
  live context snapshot (real depth tier, danger, narrative register,
  current objective) instead of picked blind.
- A single shared `LineDirector` instance serves both trigger sources
  (`this.lineDirector` in `src/threeGame.js`, `window.lineDirector` for
  `main.js`), with an opt-in `globalMinGapSeconds` cross-pool cooldown so
  the two sources can no longer fire back-to-back.
- "No eligible line" resolves to firing nothing — never a random fallback.
  This was itself a fix during final review: the `patrol` action's fallback
  string bypassed the arbiter and could print the wrong tonal register.

This is a separate system from the pressure-action director
(`src/director.js`, described above) — it owns *what gets said*, not
*what happens*. No further Sprint 22 acceptance items beyond what's already
covered by its own test suite (`src/lineDirector.test.js`,
`src/data/lineDirectorPools.test.js`) — it doesn't add new player-facing
mechanics for a PM to schedule observation passes against, unlike the
pressure-action director above.
