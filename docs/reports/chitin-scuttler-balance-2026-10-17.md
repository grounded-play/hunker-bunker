# Chitin Scuttler Balance Probe — 2026-10-17

## Outcome

The close-range three-member pack could previously land all three hits within a 60 ms window: first damage at 0.47 seconds and lethal damage at 0.53 seconds against a three-heart operator. That was an unreadable alpha strike rather than useful pressure.

Pack members now retain the lead Scuttler's 0.28-second windup but add a deterministic 0.22-second telegraph stagger per follower. The same close stationary probe now reaches lethal damage at 1.00 seconds. Continuous base-cadence return fire after a conservative 350 ms response delay clears all three before damage. A perpendicular dodge improves survival time for every chassis, though Tank and Engineer still need to shoot rather than rely on movement alone at close range.

## Reproduction

Run:

```bash
npm run audit:scuttler-balance
HB_PROBES=1 HB_PROBE_OUT=/tmp/hb-scuttler-probe xvfb-run -a \
  npx playwright test tests/e2e/probes/chitin-scuttler-live.spec.js --headed --workers=1 --retries=0
```

The probe executes the real `ThreeGame.updateCrawlerBehavior` state machine at 60 Hz with deterministic windup jitter. It covers close and room-edge formations, a stationary control, each base chassis's sidestep speed, and continuous return fire at the shipped base cadence.

The headed browser probe also passed against the production boot, spawn, sprite, and AI paths. It verified a live three-member pack at 1 HP each, the reduced Scuttler silhouette, and ordered `alert` → `charging` transitions at the shipped 0.28/0.50/0.72-second windups. The shared Xvfb/SwiftShader environment still produces the known white-world capture, so that probe is runtime evidence rather than a substitute for judging animation, tint, and sound on a real GPU.

## Regression contract

- The first possible hit retains at least the authored 0.28-second telegraph.
- Followers receive deterministic, ordered telegraph delays.
- Sidestepping must improve survival relative to standing still for every base chassis.
- Continuous return fire after 350 ms must clear the three-member pack before a three-heart operator dies.
- The probe is modeled regression evidence, not a replacement for a headed human playtest.

## Real-GPU tuning follow-up

At the next hands-on balance session, compare narrow corridors with chambers and confirm that 1 HP remains satisfying with upgraded weapons. This is a subjective tuning follow-up; the timing, survivability, live spawn, and runtime-transition acceptance gates above now have executable coverage.
