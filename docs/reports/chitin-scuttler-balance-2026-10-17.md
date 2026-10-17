# Chitin Scuttler Balance Probe — 2026-10-17

## Outcome

The close-range three-member pack could previously land all three hits within a 60 ms window: first damage at 0.47 seconds and lethal damage at 0.53 seconds against a three-heart operator. That was an unreadable alpha strike rather than useful pressure.

Pack members now retain the lead Scuttler's 0.28-second windup but add a deterministic 0.22-second telegraph stagger per follower. The same close stationary probe now reaches lethal damage at 1.00 seconds. Continuous base-cadence return fire after a conservative 350 ms response delay clears all three before damage. A perpendicular dodge improves survival time for every chassis, though Tank and Engineer still need to shoot rather than rely on movement alone at close range.

## Reproduction

Run:

```bash
npm run audit:scuttler-balance
```

The probe executes the real `ThreeGame.updateCrawlerBehavior` state machine at 60 Hz with deterministic windup jitter. It covers close and room-edge formations, a stationary control, each base chassis's sidestep speed, and continuous return fire at the shipped base cadence.

## Regression contract

- The first possible hit retains at least the authored 0.28-second telegraph.
- Followers receive deterministic, ordered telegraph delays.
- Sidestepping must improve survival relative to standing still for every base chassis.
- Continuous return fire after 350 ms must clear the three-member pack before a three-heart operator dies.
- The probe is modeled regression evidence, not a replacement for a headed human playtest.

## Remaining manual acceptance

Confirm in a headed GPU session that the stagger is perceptible through animation, tint, and sound; test packs in narrow corridors as well as chambers; and verify the 1 HP enemies remain satisfying rather than trivial with upgraded weapons.

