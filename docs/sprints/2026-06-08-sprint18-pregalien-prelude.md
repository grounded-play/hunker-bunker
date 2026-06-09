# Sprint 18 — Prelude Bridge

Sprint 18 adds the hidden bridge that can turn an ordinary Hunker Bunker run into the first cave-signal reveal while keeping the visible game, menu, and normal human loop intact.

## Built in this sprint

- Hidden `hb_arc_v1` progression state with monotonic readiness counters.
- Cave-signal radio breadcrumbs that reuse the existing radio card stack instead of adding HUD chrome.
- Class-to-strain inheritance data for the post-blackout tease and future hive systems.
- Static human/host data and pure Human AI transition rules, disabled for Sprint 18 gameplay.
- A one-shot cave reveal controller that locks cinematics, plays suggestive procedural audio, records inheritance, and ends at the queen-protection tease.

## Explicitly deferred

Sprints 19–22 own the actual hive loop: queen vitals, biomass/chitin economy, living humans, crash sites, world launch, mutation trees, story-choice meters, and endings. Sprint 18 intentionally stops after `hive_awakened_tease`.

## Acceptance notes

- New saves without `hb_arc_v1` normalize to `human_prelude`.
- Portable save export/import already sweeps `hb_*` keys, and tests now cover `hb_arc_v1`.
- The secret title is not exposed through the player-facing menu or game name.
