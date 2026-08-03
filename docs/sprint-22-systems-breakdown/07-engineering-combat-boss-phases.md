# Engineering Deep Dive: Combat and Boss Phases

## Implemented Framework

`src/bossPhases.js` is production code, not a proposed Sprint 22 filename. Its pure API includes:

- `createBossFight(def)`;
- `currentPhase(fight)`;
- `isWeakpointOpen(fight)`;
- `applyBossDamage(fight, amount)`;
- `tickBossFight(fight, delta, context)`;
- `QUEEN_FIGHT_DEF` and phase dialogue.

The Queen definition uses three phases and stateful events. Runtime integration in `src/threeGame.js` routes damage and encounter updates through this model.

## What Automation Proves

- Phase transitions and add gates occur.
- Armor chips damage rather than reducing small hits to zero.
- Weak-point windows modify effective damage.
- Every class can complete an idealized constant-fire Queen simulation.
- Queen-specific runtime routing has focused tests.

It does not prove 60–90 second human fight duration, attack telegraph quality, movement challenge, or recovery feel.

## Extending the Framework

Do not copy the Queen definition wholesale. A boss definition should specify:

- phase entry threshold and readable transition event;
- attack/pattern change;
- add policy and cap;
- weak-point condition and duration;
- failure recovery and ammo support;
- audio/visual telegraph;
- dialogue ownership;
- deterministic test scenario.

The runtime should consume phase events; it should not duplicate threshold logic in rendering code.

## Known Boundary

The enemy catalog and non-Queen boss behaviors are not automatically phase-driven just because `bossPhases.js` exists. Audit each encounter before labeling the full boss roster “phase complete.”

## Sprint 22 Engineering Deliverables

1. Produce a measured encounter table from real builds.
2. Select the worst one or two boss experiences.
3. Decide between economy tuning and phase conversion.
4. Add pure phase tests and one runtime integration test per converted boss.
5. Run mouse, controller, and Deck-class performance acceptance.

## Regression Risks

- phase events firing twice across frame boundaries;
- adds blocking weak points forever;
- armor making low-damage classes ineffective;
- boss state continuing while gameplay input is paused;
- audiovisual effects obscuring hazards;
- ammo support only spawning after the kill, too late to prevent a softlock.
