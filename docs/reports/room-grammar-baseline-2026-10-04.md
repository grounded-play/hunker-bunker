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
