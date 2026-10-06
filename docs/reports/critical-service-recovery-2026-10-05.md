# G3 Critical-Service Recovery and Accessible Wreck Lifecycle

Implements the critical-service recovery behavior specified in the [room grammar plan](../planning/sprint-49-room-grammar-and-run-variety.md).
Ensures that critical service housings, camp services, quest items, and functional setpieces can break under fire, while their required gameplay interactions survive as accessible, traversable wrecks rather than deleting progression or essential services.

## Behavior

- **Critical-Service Detection (`isCriticalService`)**:
  - Recognizes critical functional objects through explicit metadata (`userData.isCriticalService`, `userData.criticalService`), camp service flags, quest criticality, or registered critical service types:
    `camp_salvage_console`, `camp_cookfire`, `lore_terminal`, `power_conduit`, `objective_beacon`, `extraction_uplink`, and `quarantine_seal`.
- **Accessible Wreck Spawning (`createCriticalServiceWreck`)**:
  - When destroyed via `ThreeGame.prototype.breakScatterProp`, the prop's housing collapses with standard debris and effects, but leaves an accessible, non-blocking wreck (`isSolidProp: false`) at the same position.
  - The wreck receives a stable, derived identity (`${originalScatterKey}:wreck`) preventing key collisions or desync.
  - Retains the critical interaction function and prompt (e.g. `[E] SALVAGE DAMAGED TELEMETRY`), allowing continued gameplay interaction.
- **Dynamic Interaction Spec Integration**:
  - `findNearestInteractableProp` and `interactWithCustomProp` in `src/propInteractions.js` support `sprite.userData?.interactionSpec`, seamlessly exposing dynamically spawned wrecks and custom setpieces to player proximity and interaction checks.
- **Persistence & Co-op Synchronization**:
  - `serializeCriticalServiceWrecks` and `restoreCriticalServiceWrecks` enable persistent storage in maze snapshots, ensuring surviving wrecks endure across chunk unload/reload and expedition save cycles.

## Verification

- `src/criticalServiceRecovery.test.js`:
  - Verifies critical service classification across flags and type registries.
  - Verifies accessible wreck creation with non-blocking collision, stable derived ID, and preserved interaction.
  - Verifies proximity detection in `findNearestInteractableProp` and successful interaction in `interactWithCustomProp`.
  - Verifies full integration with `ThreeGame.prototype.breakScatterProp`.
  - Verifies serialization and restoration across chunk/save cycles.
- `src/propInteractions.test.js` & `src/threeGame.destructibleProps.test.js`: all existing interaction and destructibility tests pass without regressions.
- ESLint: zero warnings or errors across all modified files.
