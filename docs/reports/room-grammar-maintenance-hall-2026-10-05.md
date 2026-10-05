# G3 Finished Key-Art Maintenance-Hall Presentation and Showroom Breach View

Implements the maintenance-hall presentation and showroom breach view slice of the [room grammar plan](../planning/sprint-49-room-grammar-and-run-variety.md).
Pairs industrial room grammar with key-art dressing assets, mounts high wall/ceiling infrastructure, handles module wall breaches in the showroom fixture, and verifies co-op HP tracking against real placement identities.

## Behavior

- **Key-art asset integration**:
  - `src/data/dressingTriangles.js` registers exact GLB triangle counts (18,000 each) for the key-art models:
    `prop_pipe_organ_heat_exchanger`, `prop_ceiling_crane_hoist`, `prop_floor_drainage_sump_trough`,
    `prop_exosuit_docking_gantry`, `prop_floor_conduit_bridge`, and `prop_oxygen_bottle_cascade_rack`.
  - `src/roomDressingKits.js` configures wall mount heights (`prop_wall_cable_tray_swag`: 1.25, `prop_exhaust_blower_fan_hood`: 1.85, `prop_ceiling_crane_hoist`: 2.15).
  - Populates `ROLE_DRESSING.engineering` and `ROLE_DRESSING.workshop` with key-art wall props, floor clutter, corner equipment, and decals.
  - Adds cohesive `ROLE_VIGNETTES` for engineering and workshop featuring heat exchangers, service carts, drainage sumps, and coolant canisters.
- **Room grammar integration**:
  - `src/roomGrammarChunk.js` defaults industrial room grammar chunks to the `engineering` role and `bunker-utility` theme while preserving explicit caller overrides.
- **Showroom breach visualization**:
  - `tests/e2e/fixtures/furnished-room-showroom.html` supports query flags `?build=maintenance_hall` (or `?grammar=1`) and `?view=breached` (or `?breach=1`).
  - In breached mode, interior module wall cells convert to floor paths, and `hideRoomDressingSupport` removes wall-attached fixtures while preserving unaffected floor dressing.
- **Co-op damage verification**:
  - Confirms relay-authoritative HP damage tracking and event ordering against versioned v2 placement IDs in maintenance-hall environments.

## Verification

- `src/maintenanceHallPresentation.test.js`:
  - Verifies industrial grammar room generation with engineering role and key-art dressing props.
  - Verifies interior module wall breach dismantles attached wall dressing via `hideRoomDressingSupport` while retaining floor clutter.
  - Verifies relay dressing authority manages HP damage and triggers remote destruction events for maintenance hall prop IDs.
- `src/roomDressing.test.js`: verifies triangle registry completeness and dressing rules.
- `src/roomGrammarChunk.test.js`: verifies edge portal preservation and closed seams.
- ESLint: zero warnings or errors across all modified and new source files.

## Remaining work

- [ ] Critical-service recovery behavior for functional setpieces.
- [ ] Cryo/medical ward and biomech nave grammar profiles.
- [ ] Steam Deck and art review gates.
