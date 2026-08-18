# System Breakdown: Combat, Movement, and Classes

## Current Truth

Combat is an isometric shooter under oxygen, ammo, positioning, and route pressure. For the complete mathematical specification of the decoupled movement, aim, and camera model, see [`docs/gameplay-movement-and-controls-standard.md`](../gameplay-movement-and-controls-standard.md). Universal sprint is implemented for every class. Class passives are implemented and tested. The Queen uses a multi-phase boss framework. The remaining product problem is comparative feel across ordinary enemies and the other bosses—not the absence of all mobility or phase code.

## Class Identity

- **Scout — EVASIVE:** faster/recon-oriented, with slow resistance and reload advantages.
- **Tank — BULWARK:** durability-oriented, with block chance and passive regeneration.
- **Engineer — AUTO-TURRET:** systems-oriented, with deployable turret behavior and skill-tree scaling.

The skill tree strengthens these identities. Universal sprint adds shared route control and consumes additional oxygen. Proposed class-specific dash/slam/slide verbs are design options, not current commitments.

## Combat Economy

The meaningful loop is damage throughput versus ammo, oxygen, enemy pressure, and safe repositioning. `src/combatEconomy.test.js` checks floor-case feasibility across classes. `src/queenFightAcceptance.test.js` simulates the real Queen phase state machine and class fire rates. These tests protect against mathematical softlocks; they do not establish fun, readability, or target encounter duration.

## Queen Versus Other Bosses

The Queen has armor reduction, add-control gates, phase transitions, and weak-point windows through `src/bossPhases.js`. Other boss/enemy definitions still largely originate in `src/data/enemies.js` and runtime behavior. Sprint 22 should run a side-by-side encounter audit before deciding whether to extend the framework, lower HP, change ammo drops, or shorten encounters.

## Sprint 22 Acceptance Matrix

For each class and representative encounter, record:

- time to kill and shots/ammo consumed;
- oxygen spent reaching and fighting;
- number of tactically distinct decisions;
- damage readability and hit confirmation;
- whether backing away while firing dominates;
- recovery after an error;
- controller and mouse parity.

Separate math failures from feel failures. A fight can be beatable and still monotonous.

## Presentation Work

Impact sound, damage feedback, camera shake, class cues, and combat music already have runtime surfaces. Any added hitstop must be tested against input buffering, low frame rate, accessibility settings, and multiplayer-free deterministic expectations. Prefer brief presentation emphasis over freezing simulation blindly.

## PM Decisions

- Target durations for ordinary, elite, biome-boss, and Queen encounters.
- Whether each boss needs phases or simply a shorter, sharper economy.
- Whether class-specific mobility is worth added input/tutorial complexity.
- Which accessibility controls are mandatory for shake, flashes, and rapid audio.
