# O2 Boss, Survivor Arrival, and Breach Repair Loop

## Player-facing sequence

1. Recover and install the camp O2 core in the impact-cradle room.
2. Complete the O2 startup reveal. The level-one oxygen field covers the camp bed and unlocks sleep.
3. The first Cybersnail boss attacks immediately after startup. It enters through a fixed two-cell breach in the north camp wall rather than appearing in an arbitrary room.
4. Defeat the boss. The fabrication-foundry signal is revealed and the first eligible survivor begins an authored approach from the north service hall.
5. The survivor walks to the visible departure-airlock threshold at `(9, 3.6)` and waits there for the player. It does not choose a random ship corner.
6. Reach and activate the fabrication foundry. This represents recovering the fabrication capability and makes terminal construction available.
7. Build the **Field Bulkhead Welder** at the Fabrication terminal for `12 TECH / 4 COIN`.
8. Stand beside a boss-breached wall or damaged installed camp module and interact. Wall reconstruction costs `6 SHELLS`; installed-module repair retains its damage-scaled shell cost.

## Authored spatial anchors

- Camp / wreck center: `(9, 9)`
- O2 generator socket: `(12.5, 9.5)`
- First-boss entry breach: `(15, 4)` and `(16, 4)`
- First-boss spawn just inside breach: `(15, 5)`
- Survivor approach spawn: `(9, -8)`
- Survivor wait point: `(9, 3.6)`, at the north airlock

These points live in `CRASH_SITE_BUILD`; runtime behavior consumes the same data so layout and progression cannot drift apart.

## State and save rules

- `unlocks.wallRepairTool` is a persistent bank unlock (schema 9).
- Existing saves migrate with the tool locked; no resources are removed.
- Foundry activation is a hard prerequisite for building the tool.
- Destroyed maze-wall keys remain persisted until the player reconstructs them. Reconstruction removes the key, restores the cached wall tile, remounts the loaded chunk, and saves campaign world state.
- Repair is rejected before tool ownership and gives a direct terminal instruction instead of silently consuming input.

## Acceptance checks

- O2 level one stages exactly one introductory boss.
- The first boss creates a readable, two-tile breach even if the authored camp wall is protected from ordinary player damage.
- The survivor route ends at the authored airlock, not a random corner offset from the ship.
- The Field Bulkhead Welder is absent before foundry activation and persists after construction/reload.
- Neither installed modules nor destroyed maze walls can be repaired without the tool.
- A rebuilt wall becomes solid/rendered again and is removed from destroyed-wall persistence.
