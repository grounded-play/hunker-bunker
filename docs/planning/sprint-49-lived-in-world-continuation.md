# Sprint 49 lived-in world continuation

Status: active implementation journal | Branch: `dev/sprint-49` | Updated: 2026-10-04

This file is the continuation point for the prop, prefab, destruction, and room-life
work requested after reviewing the Sprint 49 plan. Keep it current before each
commit so another contributor can resume without reconstructing the audit.

## Evidence carried into implementation

- The Thursday Deck session
  `logs/hunker-bunker-session-2026-10-02T01-37-00-805Z-muqam0sq-bhvr.json`
  recorded average GPU time of 16.51 ms, but presented gameplay p95 of 76.5 ms.
  Its worst retained window was p95 152 ms at
  `event:destructible-prop-broken`. New room life must therefore remain bounded,
  reuse caches, and avoid unbounded particle/light/draw-call growth.
- The key art in `public/keyart/keyart_prop_*.jpg` consistently layers a strong
  functional silhouette with wall/ceiling infrastructure, floor traces, hanging
  cables, leaking fluids, shrines, and signs of prior inhabitants. The game already
  owns those layers in `ROOM_THEME_CATALOG`; `planRoomPopulation` simply ignored
  its `smallProps`, `ambientProps`, and `rareProps` pools.
- All 71 `public/3d/runtime/new3ds/prop_*.glb` files are registered. Sixty-seven
  participate in room themes or semantic variant groups. The defense turret,
  biomech arch, camp cookfire, and cave throne intentionally remain bespoke set
  pieces so their gameplay meaning is not diluted by random room substitution.
- All 80 current cave/space modular-kit GLBs are registered and exhibited by the
  museum audit. Their normal-play placement gap is separate: the Thursday handoff
  found 0 `hallway-connector` chunks in a 67-chunk run, so adding a dedicated,
  socket-safe placement space remains the next prefab task. Do not import the 408
  rejected Kenney nature/building pieces without an art-direction decision.

## Commit record

### `b3767e8a` — GLB-only props join the destruction contract

- `prop_` placements without billboard fallbacks now receive HP, projectile/melee
  targeting, co-op break synchronization, drops, custom destruction behavior, and
  removal through the existing scatter-prop path.
- Architecture, aftermath states, modular navigation kits, and objective-critical
  objects remain protected to avoid progression and navigation breakage.
- Destroying the living umbilical removes and disposes its attacker controller so
  it cannot continue ticking after the visible prop is gone.
- Verification: 30 focused tests passed.

### `5997431e` — bounded room life and cached destruction

- Spend the existing small/ambient/rare theme pools at room edges without blocking
  doors, reserved fixtures, room centers, pickups, or combat lanes.
- Cap the full population plan at five objects; gameplay anchors and pickups are
  allocated before decorative layers.
- Cache fractured debris by prop model type instead of unique placement key, so
  subsequent props of the same model do not repeat the ~100 ms fracture step.
- Pin registration, gameplay reachability, and behavior coverage for the full
  runtime prop library with an automated audit.
- Verify focused world/destruction suites plus the configured seed sweep. Then run
  the full unit suite before taking the prefab-placement continuation.

Verification completed: 75 focused tests, 562 full-suite files / 4,941 tests, and
a 500-seed sweep all passed.

### Next commit — authored-room modular gateway landmarks

- Add a pure `roomGatewayKitPlacement` grammar helper that centres the open
  `gate.glb` frame for the room biome on a real three-cell threshold.
- Mount at most one gateway per authored room. Keep it non-colliding, structural,
  socket-scaled, and cardinally rotated; procedural doors and the tile grid remain
  the only collision/lock authority.
- This gives the cave/space prefab kits a normal-play placement path even when the
  generator produces no `hallway-connector` chunks, without layering a full room
  shell over existing geometry.
- Verification before commit: kit grammar, room set-piece, 3D overlay, prop
  collision and destructibility suites; 500-seed sweep; then the full unit suite.

## Safe continuation after the gateway commit

1. Visually verify the gateway frame against north/south and east/west authored
   thresholds in a real run; adjust only the pure grammar rotation if the asset's
   authored forward differs from the measured corridor convention.
2. Expand from gateways to room pieces only after a dedicated authored interior can
   replace, rather than overlap, existing walls. Preserve kit
   uniform scale and topology rotations from `kitGrammar.js`; never height-normalize
   individual kit pieces.
3. Treat modular shells as structural rather than destructible. Interior props are
   destructible; breaking navigation geometry would invalidate the seed guarantees.
4. Measure draw calls and a destruction burst on Deck before raising the five-object
   room cap or adding dynamic lights.
