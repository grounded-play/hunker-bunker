# Room dressing destruction — persistence slice

G3 follow-up to the [room grammar plan](../planning/sprint-49-room-grammar-and-run-variety.md).

This slice adds map-local broken-object records to the existing maze snapshot.
`worldChanges.brokenRoomDressing` contains sorted, unique dressing IDs only.
Malformed IDs, ordinary scatter keys and decal IDs are excluded. Missing fields in
older saves restore an empty set; restoring replaces rather than merges state.
New-map story carry and the game reset clear the records, while retry/resume can
restore them through the existing maze persistence path.

Remote dressing breaks resolve strictly by ID. If a chunk is not loaded, retain
the broken ID for its future mount. Never choose a nearby unrelated prop when a
dressing ID is supplied. Repeated events do not repeat removal or drops for a
loaded target. Existing ordinary-prop remote behavior is unchanged.

Scope boundary: the shared worktree has a separate in-progress hit-target and
instanced-renderer implementation. Those edits are not owned or committed by this
slice. The saved set is the integration contract that its mount path consults.
The persistence change can land independently; it does not claim finished damage
rendering, instanced hit geometry, breach collision updates or full co-op authority.

Verification: five focused tests cover ID sanitation, JSON snapshot round-trip,
legacy restore, new-map reset, unloaded remote delivery, replay and exact loaded
target removal with supplied drop plans. Additional campaign and dressing suites
were run against the shared working tree.
Full shared-tree verification: 576 files / 5,093 tests passed. Scoped ESLint and
documentation audit passed. This includes concurrent renderer work; it is not a
claim that those uncommitted edits belong to this slice.

Remaining G3 work:

- [ ] Integrate/review the renderer lane's late model-load and chunk-unload behavior.
- [ ] Verify stable IDs across content changes; the current dressing lane uses
  room/layer/placement-index IDs, which require a frozen/versioned plan for old saves.
- [ ] Define partial-HP persistence and host-authoritative damage reconciliation.
- [ ] Verify late-join restoration and unloaded-chunk drop delivery; remembering a
  broken ID does not itself reconstruct pickups from an unloaded remote break.
- [ ] Connect interior-module breaches to collision/navigation and required-service
  recovery, then complete the maintenance-hall art and physical performance checks.

No new map was started, and no user profile was edited during verification.
