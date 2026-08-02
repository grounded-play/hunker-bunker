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
