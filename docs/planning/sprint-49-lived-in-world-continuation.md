# Sprint 49 lived-in world continuation

Status: active implementation journal | Branch: `dev/sprint-49` | Updated: 2026-10-04

This file is the continuation point for the prop, prefab, destruction, and room-life
work requested after reviewing the Sprint 49 plan. Keep it current before each
commit so another contributor can resume without reconstructing the audit.

The ordered execution contract now lives in the
[Sprint 49 Lived-In World Master Implementation Plan](sprint-49-lived-in-world-master-plan.md).
Use this journal for commit-by-commit evidence and next-step handoffs; use the master
plan for milestone scope, dependencies, verification gates, and definition of done.

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

### `e3aa3b05` — authored-room modular gateway landmarks

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

Verification completed: 55 focused tests, 562 full-suite files / 4,944 tests, and
a 500-seed sweep all passed.

## Final key-art read

A contact-sheet review of the actual shipped key art confirmed the repeated visual
language rather than relying on filenames alone:

- one large, readable functional anchor per composition (slab, hatch, gantry,
  oxygen rack, exchanger, shrine);
- infrastructure packed around the perimeter (pipe forests, bundled cables,
  ribbed wall panels and suspended fixtures), leaving the working floor readable;
- evidence of use and failure at floor level (tools, containers, coolant pools,
  drainage, caution markings and residue);
- restrained practical light concentrated on the object, usually amber, green or
  cyan, instead of uniform room brightness.

The implementation follows that hierarchy: signature/large anchors remain first,
small and ambient layers stay at room edges, rare shrines/landmarks are occasional,
and the cap prevents the surrounding detail from swallowing navigation or the Deck
frame budget. No key-art files were modified.

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

---

## Lived-In World Improvement Goals & Master Roadmap

### Strategic Overview & Design North Star

Based on the Thursday Deck session telemetry (`logs/hunker-bunker-session-2026-10-02T01-37-00-805Z-muqam0sq-bhvr.json`) and the 23 key art reference compositions (`public/keyart/`), the environment must advance from isolated prop clusters to fully realized, high-atmosphere **Giger-Corpospace Biomechanical Necro-Cathedrals** and **Frozen Industrial Extraction Facilities**. Every room must tell an immediate visual story of human corporate worship, biomechanical infection, and sudden catastrophic evacuation, while strictly maintaining the Deck 60 FPS (16.5 ms GPU / 76.5 ms gameplay p95) frame budget.

---

### Goal 1: Gateway Alignment & Doorway Apron Precision

- **Visual Target**: Seamless transition between corridor threshold and room entrance. The modular `gate.glb` frame must sit flush against door apertures without double-framing procedural doors, clipping through ceiling bulkheads, or floating off-axis.
- **Technical Implementation**:
  - Audit `roomGatewayKitPlacement(room, grid, biome)` in [`src/kitGrammar.js`](../../src/kitGrammar.js):
    - Verify cardinal rotation steps (0, 1, 2, 3) against all 4 door facing vectors (North, South, East, West).
    - Align the threshold center with the interior side of the doorway apron (`dx`, `dz` offset of $0.5$ units into the room) so the exterior corridor door slider glides cleanly through the gate archway.
  - Guardrail: Maintain non-colliding `isSolidProp: false`, `groupType: 'architecture'` so procedural door collision and door states in `proceduralDoors.js` remain authoritative.
- **Verification**:
  - Add parameterized unit tests in [`src/kitGrammar.test.js`](../../src/kitGrammar.test.js) validating offsets for all four cardinal door directions.
  - Visual verification in showroom / live run.

---

### Goal 2: Modular Architecture Shell Replacement (Replacing Generic Box Walls)

- **Visual Target**: Transform rectangular, monolithic box walls into sinuous Art Nouveau / Giger biomech ribbing, recessed wall niches, and cathedral buttresses (`arch_pillar_buttress_01-04`, `arch_rib_ceiling_vault_01-03`, `kit_space_template_wall`, `kit_cave_template_wall`).
- **Technical Implementation**:
  - Rather than layering 3D meshes on top of existing wall tiles (which creates geometry z-fighting and double-draw calls), introduce a **Pure Wall Shell Substitution Grammar** in [`src/kitGrammar.js`](../../src/kitGrammar.js):
    - Identify unbroken wall runs of length $\ge 3$ facing chamber floors.
    - Suppress the generic procedural block wall render at those specific tile coordinates and instantiate socketed modular wall components (`kit_space_template_wall` or `arch_rib_ceiling_vault`).
    - Keep kit piece scale at $1.0$ (never normalize kit piece heights or squish UVs).
  - Treat all modular shell pieces as structural (`groupType: 'architecture'`, infinite HP, non-destructible), preserving seed layout determinism and pathfinding colliders.
- **Verification**:
  - 500-seed sweep confirming zero walkable-cell occlusion or navigation reachability regression.
  - Draw-call audit verifying frustum culling handles instanced/batched modular pieces efficiently.

---

### Goal 3: Key-Art Practical Lighting & Atmospheric Contrast Pass

- **Visual Target**: Replace flat, uniform ambient room illumination with high-contrast, moody practical lighting drawn directly from the key art:
  - Piercing cryogenic cyan accents (`prop_oxygen_bottle_cascade_rack`, `prop_coolant_drum_leaking_pool`).
  - Warm liturgical amber CRT glow (`prop_liturgical_terminal_lectern`, `prop_votive_candle_shrine`).
  - Sickly bioluminescent green fluid veins (`prop_biomech_sphincter_hatch_vent`, `prop_biomech_tracheal_wall_pipe`, `spore_colony`).
- **Technical Implementation**:
  - Leverage the emissive channels of PBR textures with bloom rather than adding costly dynamic point lights everywhere.
  - Maximum **one** localized dynamic light source per chamber, tied directly to the signature anchor prop.
  - Implement distance-attenuated light fading outside the active room bounding box to ensure zero off-screen lighting cost on the Deck GPU.
- **Verification**:
  - Benchmark in `src/gpuMemoryBudget.test.js` and `src/threeGame.envLightBudget.test.js` ensuring active point light limits are enforced.

---

### Goal 4: Floor-Level Grounding Infrastructure (Conduits, Sumps & Fluid Trails)

- **Visual Target**: Eliminate "floating prop" syndrome by visually tethering every anchor prop to the facility floor with industrial conduits, drainage troughs, and fluid weeping:
  - `prop_floor_conduit_bridge` spanning between wall conduits and central terminals.
  - `prop_floor_drainage_sump_trough` collecting dripping run-off under cooling racks and dissection slabs.
  - Floor decals (`decal_rust_bleed`, `decal_water_stain`, slime pools) procedurally stamped at prop footprints.
- **Technical Implementation**:
  - In [`src/roomPopulation.js`](../../src/roomPopulation.js), create an automatic **Grounding Association Pass**:
    - When placing a signature anchor prop, automatically evaluate adjacent floor cells for low-profile ground dressing (`isFloorOverlayType` with $y=0.035$ elevation).
    - Grounding layers consume the non-blocking ambient budget, ensuring zero collision obstruction on player movement routes.
- **Verification**:
  - Automated placement tests in [`src/roomPopulation.test.js`](../../src/roomPopulation.test.js) confirming grounding overlays never spawn in doorway aprons or center movement lanes.

---

### Goal 5: Dynamic Room Density Scaling & Deck Frame Budgeting

- **Visual Target**: Naturally tailored density based on room volume:
  - Cramped alcoves ($4 \times 4$ to $5 \times 5$): 2 to 3 objects max (focused functional purpose).
  - Standard chambers ($6 \times 6$ to $8 \times 8$): 4 to 5 objects max (current baseline).
  - Grand Cathedrals & Extraction Vaults ($10 \times 10$ and up): 6 to 8 objects (signature anchor, corner infrastructure, floor drainage, wall shrines).
- **Technical Implementation**:
  - Replace the static `const roomObjectLimit = 5` in [`src/roomPopulation.js`](../../src/roomPopulation.js) with a calculated budget based on walkable cell count:
    $$\text{limit} = \text{clamp}\left(\lfloor \text{floorCells} / 12 \rfloor + 2,\, 3,\, 8\right)$$
  - Strict priority order preserved: Pickups $\rightarrow$ Signature Anchor $\rightarrow$ Wall Infrastructure $\rightarrow$ Floor Grounding $\rightarrow$ Edge Decals.
  - Debris fracture cache ([`src/threeGame.js`](../../src/threeGame.js)): ensure all 20 new props have pre-calculated Voronoi cell caches so destruction spikes remain under $16.5$ ms.
- **Verification**:
  - Performance regression test measuring frame time during multi-prop chain-reaction destructions.
  - Verification across 1,000 generated rooms to ensure draw call count per room never exceeds 60.

---

### Goal 6: Living Biomechanical Attacker Ecosystem & Environmental Synergy

- **Visual Target**: Biomechanical chambers feel dynamically dangerous, alive, and reactive.
- **Technical Implementation**:
  - Expand `UmbilicalAttacker` integration:
    - Procedurally position umbilical attackers on ceiling anchors or wall breaches in `bio` and `giger-cathedral` chambers.
    - Audio cues: spatial organic breathing and tension soundscapes (`ambient_steam_hiss`, `flesh_squish`) when entering detection radius ($7.0$m).
  - Environmental Prop Synergies:
    - Rupturing a `prop_oxygen_bottle_cascade_rack` cryo-stuns nearby living umbilicals for 4.0 seconds.
    - Breaching a `prop_biomech_sphincter_hatch_vent` corrosive bile spray damages and weakens surrounding enemy chitin armor.
- **Verification**:
  - Unit tests in [`src/umbilicalAttacker.test.js`](../../src/umbilicalAttacker.test.js) and [`src/propInteractions.test.js`](../../src/propInteractions.test.js) for synergy callbacks and state transitions.

---

### Milestone Implementation Roadmap

| Milestone | Target Horizon | Core Focus | Primary Deliverables | Key Metric / Gate |
|---|---|---|---|---|
| **M1: Threshold & Gateway Precision** | Sprint 49.1 | Doorway framing & cardinal alignment | `kitGrammar.js` rotation tuning, zero doorway apron clipping | 500-seed sweep, 0 navigation conflicts |
| **M2: Floor Grounding & Decal Tethering** | Sprint 49.2 | Eliminating floating props, industrial floor clutter | `roomPopulation.js` grounding associations, drainage sumps | Non-blocking edge placement verified |
| **M3: Dynamic Room Density Scaling** | Sprint 49.3 | Area-based density budgeting (3–8 props) | Adaptive `roomObjectLimit` by room area, draw-call cap | Deck p95 GPU $\le 16.5$ ms |
| **M4: Practical Emissive Lighting Pass** | Sprint 49.4 | High-contrast key art atmospheric lighting | Signature prop emissives, amber/cyan/green palettes | Max 1 dynamic light/room, zero unlit wash |
| **M5: Modular Wall Shell Substitution** | Sprint 50.0 | Replacing primitive box walls with cathedral arches | Wall run replacement grammar, structural kit piece reuse | Zero z-fighting, 100% pathing determinism |
| **M6: Reactive Environmental Synergies** | Sprint 50.1 | Living hazards, chain reactions, cryo/bile synergies | Umbilical stun from cryo vents, corrosive acid cascades | Full combat & interaction test pass |
