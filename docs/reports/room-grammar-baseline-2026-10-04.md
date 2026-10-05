# Room grammar baseline — first measured slice

Command: `node scripts/room-layout-portfolio.js` (read-only JSON output).
240 architectural room-mode samples: seeds 1–16, all 15 nonempty entrance masks,
fixed opening offset 12, current 49-cell chunks. Normalization removes translation
and quarter-turns and treats door glyphs as walkable floor.

| Measurement | Result |
|---|---|
| Distinct room floor shapes | 18 / 240 |
| Walkable room area | 97–169 cells |
| Occupied width / height | 11–13 / 11–13 cells |

This controlled sample isolates interior repetition. It is not the frequency of
rooms in whole expeditions, a claim of disconnected entrances, or a performance
measurement. Corridors outside the room bounds intentionally do not add novelty.

Live routing inspected: `ThreeGame.buildChunk` first attempts authored reservations,
then hallway connectors when appropriate, then `buildMazeChunkStructure`. A legacy
branch still uses architectural generation directly. The measured producer is one
live fallback, not every room seen in play. Its WFC grid is discarded.

Persistence characterization: existing `campaignWorld.test.js` establishes that
terrain remains campaign-stable across deployments/resume while expedition streams
change. A new interior version must not assume a deployment means it may regenerate
persisted terrain. Room dressing currently seeds from room ID, so fixed architectural
IDs also repeat that stream. G2 must explicitly choose/persist interior versions.

Checks: room metrics, chunk structure and campaign-world suites: 38 tests passed.
No runtime behavior or save schema changed.

Remaining G0 evidence: full route-weighted portfolio, travel/clearance distributions,
authored/connector coverage, render budgets and matched visual captures. Next slice:
pure industrial planner with larger envelopes, fixed sockets and bounded motifs.

## G1 pilot implementation

Baseline commit: `73a96f20`. The script now also measures the pure pilot;
`node scripts/room-layout-portfolio.js --sweep` runs 5,000 pilot seeds with alternating
standard/major envelopes and cycling entrance masks. It is not distribution-matched
to the 240-case legacy sample, so the unique counts are not a comparative percentage.

- 209–641 walkable interior cells, excluding boundary doorway cells.
- 866 rotation/translation-normalized variants across three motifs. Small bounded
  setpiece shifts count here; this does not mean 866 distinct architectural concepts.
- Machine island: 1,673; service spine: 1,692; paired bays: 1,635.
- Zero fallback plans for this unconstrained portfolio. A separate forced-reservation
  test exercises the explicit fallback after at most seven candidates.
- 43 tests pass across grammar, metrics, chunk structure and campaign continuity;
  the grammar test includes 960 tier/seed/entrance combinations, independent
  three-cell-clearance traversal, offset entrances and malformed-input rejection.

![Generated industrial floor plans](assets/room-grammar-pilot.svg)

The diagram shows deterministic major-tier seeds with four entrances. Gray blocks
are wall/setpiece reservations, not instantiated art or destruction targets.
The planner is a bounded motif/offset constraint solver, not a general WFC engine.
It preserves a circulation loop and required anchor approaches; module semantics,
wall attachments, population and final visuals remain future integration work.

Next: G2 adapter must translate local room sockets to actual chunk portals, produce
metadata from the final grid, and persist version/identity choices before live use.
Campaign terrain currently persists between deployments; do not reroll it merely
because an expedition seed changes. No live defaults or save formats changed here.

## G2 live pilot — 2026-10-05

`dbf9c378` adds the chunk adapter. It preserves exactly declared edge portals,
routes outside the room shell to fixed doors, and emits translated anchors,
reservations, module bounds and actual wall/interior cells. Tests exercise 360
seed/mask combinations including extreme offsets and both room tiers.

The next slice connects it to `ThreeGame.buildChunk` after authored-site resolution.
Only optional, non-tutorial rooms in the authored-world path can select it. The
grid is protected from later legacy erosion. The normal live pilot uses the standard
tier; major rooms are tested at adapter level and await gameplay tuning.

`campaignWorldStore` now persists `interiorVersion` (missing = 0). Explicit version
1 is accepted at campaign creation or `beginNewRun({ interiorVersion: 1 })` only.
Existing campaigns ignore a changed creation option; retry/resume retain their
version and map seed. Future numeric versions are retained and rejected at the
unsupported live generator, rather than silently converted to legacy geography.

Developer QA activation: in a development build, using a disposable profile and
the authored-world path, import `campaignWorldStore` from `/src/campaignWorld.js`
and call `beginNewRun({ interiorVersion: 1 })` while at the title, then start a new
single-player run. This intentionally starts a fresh map; do not edit the field
on an active map. Return to version 0 through another new-map call. No profile was
changed during implementation. A public setting is not added in this slice.

Multiplayer and fixed worlds ignore the pilot until shared-version negotiation
exists. Camp, hive, queen, mission and authored-room reservations retain existing
generation. This is a live geometry pilot, not finished room art or a claim of
fully destructible setpieces. No release default is changed.

Checks: full Vitest suite 572 files / 5,067 tests passed; scoped ESLint passed.
The live chunk test confirms the larger room is selected and remains connected,
with un-eroded walls. Persistence tests cover version pinning and map identity.
No browser screenshot, installed-build, co-op or physical Deck acceptance claimed.

Next: G3 hit targets/removal for instanced dressing and module destruction, followed
by the key-art maintenance-hall visual slice. Keep broader G2 acceptance open for
cathedral selection, whole-world sweeps and co-op plan digest negotiation.
