# World Expansion 80 — Source Audit and Game-Ready Ingest Plan — 2026-10-16

**Document ID:** `HB-PLAN-2026-10-16-WORLD80-INGEST-R1`
**Status:** Implemented and verified; see the [runtime audit](./world-expansion-80-runtime-audit-2026-10-16.md)
**Source:** `art/raw/`, uploaded 2026-10-16 around 14:54 local time
**Related gap audit:** [whole-game-glb-census-and-new-80-gap-brief-2026-10-15.md](./whole-game-glb-census-and-new-80-gap-brief-2026-10-15.md)
**Related prompt sheet:** [interactive-world-expansion-80-glbs-prompts-2026-10-15.tsv](./interactive-world-expansion-80-glbs-prompts-2026-10-15.tsv)

## 1. Owner request captured

Process the newly uploaded cohort into production assets:

1. remove the neutral-grey background from decals;
2. make environmental texture sources genuinely seamless;
3. derive PBR data for decals and environmental surfaces;
4. optimize, articulate/animate, register, place, and wire every GLB;
5. use the existing layered floor/sticker systems instead of adding one material or draw call per asset;
6. audit the completed cohort with the same evidence standard as prior world-asset passes;
7. document the evidence and plan before changing runtime assets.

This document is the requested documentation-first gate.

Implementation completed after this gate: all 80 GLBs, 64 surface layers, and 32 decal images were processed and wired. The exact results and per-model evidence are recorded in the linked runtime audit and inventory.

## 2. Intake evidence

| Source class | Count | Source size / shape | Current readiness |
|---|---:|---|---|
| GLB props | 80 | 7.01 GiB total; about 79–101 MiB each | Raw image-to-3D exports only |
| Environmental texture JPEGs | 64 | 16 families × 4 variants; all 1024² RGB | Not seamless or PBR-packed yet |
| Decal JPEGs | 32 | 24 families; 19 single, 3 double, 1 triple, 1 quadruple; all 1024² RGB | Grey-backed; no alpha or PBR detail maps |
| **Total files** | **176** | No byte-identical duplicates | No basename collisions in `public/` |

### 2.1 GLB source condition

Every one of the 80 GLBs currently has the same broad export shape:

- one mesh;
- one node;
- one material;
- three embedded images and three used texture bindings;
- `KHR_materials_specular`;
- zero animation clips;
- no authored `HB_*`, `FX_*`, `INTERACTION_*`, or socket nodes.

The source files therefore are **not game-ready yet**. “Animate all GLBs” cannot mean pretending a monolithic mesh already has meaningful moving parts. The ingest pass will add a conservative behavior recipe per asset, cut a moving region only where the silhouette supports it, and otherwise use a named ambient articulation parent. Any destructive split must pass a render/contact check.

### 2.2 Surface sources

The 16 four-variant surface families are:

`tex_camp_private_worn_felt`, `tex_camp_robbed_contact_dust`, `tex_ceiling_service_condensate`, `tex_covenant_two_hand_ivory`, `tex_evac_coldchain_frost_deck`, `tex_evac_queue_burnished_deck`, `tex_flood_tide_mineral`, `tex_hazard_routed_conduit_wall`, `tex_meridian_covenant_bus_floor`, `tex_moving_floor_recess_grease`, `tex_recruited_packdown_canvas_floor`, `tex_refusal_cautery_scale`, `tex_secret_memory_membrane`, `tex_tallow_red_mold_filter_floor`, `tex_turned_resin_ingress`, and `tex_vesper_oiled_tally_deck`.

All are source color images, not pre-authored PBR channel maps. The four files in each family are visual variants and must remain four runtime layers; they must not be misread as albedo/normal/roughness/metalness inputs.

### 2.3 Decal sources

The 24 decal families are:

`decal_coring_chain_cut`, `decal_cryogen_header_fallout`, `decal_egg_harness_condensate`, `decal_escort_tether_drag`, `decal_evac_muster_positions`, `decal_flood_baffle_tide`, `decal_grid_covenant_witness_arc`, `decal_iron_ledger_chalk_ring`, `decal_lift_recess_rim`, `decal_memory_skin_pressure`, `decal_nahl_covenant_loop`, `decal_packdown_drag_route`, `decal_probe_capture_skid`, `decal_queen_restraint_sweep`, `decal_red_mold_quarantine_edge`, `decal_refusal_cautery_fan`, `decal_restored_grid_halo`, `decal_rhun_weight_set`, `decal_stolen_weapon_ghosts`, `decal_stripped_copper_scatter`, `decal_turned_resin_veins_fan`, `decal_vey_resonance_nodes`, `decal_vote_turnstile_wear`, and `decal_warm_pipe_body_polish`.

The border audit shows mostly neutral backgrounds around RGB 116–126, but several images have contaminated or nonuniform borders. The alpha pass must therefore estimate background robustly from low-variance border samples and flood-fill connected background, not apply one fixed RGB threshold to the whole image.

## 3. Production architecture

```text
art/raw
  ├─ 80 source GLBs
  │    └─ Blender ingest → decimate → resize/re-encode maps → anchors/articulation
  │         └─ public/3d/runtime/new3ds/*.glb
  ├─ 16 × 4 surface JPEGs
  │    └─ toroidal seam blend → albedo/normal/ORM/emissive → KTX2 floor layers
  │         └─ floorSplat texture arrays and theme palettes
  └─ 24 decal families / 32 JPEGs
       └─ adaptive grey key → alpha cleanup → normal/roughness/metalness detail
            └─ legacy decal PBR KTX2 arrays and deterministic placements
```

The existing shared systems remain authoritative:

- `src/floorSplat.js` owns layered floor selection and multi-surface junction blending.
- `src/stickerDecals.js` owns alpha, normal, roughness, and metalness decal arrays in one instanced material.
- `src/world3dOverlay.js` owns normalized GLB loading and animation mixers.
- `src/propArticulation.js` owns interaction-driven `HB_*` motion.
- `src/roomThemes.js`, `src/roomDressingKits.js`, and authored room builds own placement.

No asset receives a bespoke material loader or permanent extra draw call when an array/layer path already exists.

## 4. Phased implementation

### Phase A — reproducible manifests and processors

- Add a checked-in 80-row intake manifest: identity, suite, expected placement, scale target, triangle budget, animation recipe, FX anchors, sockets, interaction verb, state family, support surface, support decal, destination room, and audit result.
- Add one Blender cohort script with an optional asset filter and isolated temp output.
- Add one raster processor for both surfaces and decals; never overwrite `art/raw`.

### Phase B — decals

- Estimate neutral background from the image border using robust median/MAD sampling.
- Flood-fill only border-connected near-background pixels.
- Feather the matte, remove grey spill, and preserve internal grey detail.
- Write transparent PNG compatibility assets plus PBR albedo/detail layers.
- Bake the existing legacy decal arrays so runtime uses instanced PBR decals.
- Register real-world scales and place each mark only beside its associated prop/state.

Acceptance: transparent corners, no grey halo on black and white test cards, no erased internal metal, valid alpha bounds, all source variants represented.

### Phase C — seamless environmental PBR surfaces

- Preserve all four variants per family.
- Apply toroidal edge blending in linear color, then validate opposite-edge error.
- Derive tangent-space normal, AO, roughness, metalness, and restrained emissive masks using family-specific material parameters.
- Export source WebP suites and BC7 KTX2 floor-array layers.
- Add the new families to `FLOOR_SURFACES` and restricted `ROOM_THEME_SURFACES` palettes.
- Use `floorSplat` for height-aware junction blending; use decals/stickers for local contact evidence rather than baking props into tileable color.

Acceptance: four-way tile preview has no hard seam, maps have matching dimensions/mips, ORM channels are in the expected order, no lighting baked into albedo, theme palettes do not turn unique evidence into wallpaper.

### Phase D — GLB ingest and animation

- Import one source at a time in a clean Blender process.
- Normalize origin/orientation, preserve aspect, resize embedded maps to at most 2048, and decimate by silhouette class.
- Target 10k–25k triangles for ordinary props and at most 35k for room-scale/traversal pieces.
- Add `INTERACTION_00`, relevant `FX_*`, and explicit input/output sockets.
- Apply one reviewed recipe: hinge, slide, spin, piston, flutter/breathe, or state-swap. Use an ambient node only when cutting a part would damage the model.
- Export to a temporary GLB, validate it, then atomically promote it to `public/3d/runtime/new3ds/`.
- Compress with the repo’s established glTF pipeline; retain no 80–101 MiB raw model in the retail path.

Acceptance per GLB: loads, finite bounds, grounded contact plane, budget-compliant triangles/textures, visible material, named interaction anchor, at least one valid animation/articulation behavior, no missing texture, no duplicate runtime key.

### Phase E — runtime wiring and authored placement

- Register all 80 in `WORLD_3D_MODELS` with measured target height, yaw, wall/ceiling/recess profile, and span.
- Add explicit interaction, experience, FX, and socket records; persistence keys must be stable.
- Put every asset in at least one named room, story state, quest destination, traversal beat, ending scene, or tightly limited vignette.
- For source/controller/beneficiary machinery, author all three endpoints and their conduit route.
- Reserve swept volume for gates, lift drums, turnstiles, braces, catwalks, and restraint arcs.
- Keep redundant first-13 concepts out of broad random pools; use them only in their specific evidence scene.

Acceptance: 80/80 registered; 80/80 URLs resolve; 80/80 have a placement owner; interactive assets have prompts/outcomes/persistence; navigation remains connected in every state.

### Phase F — verification and final audit

- Unit tests for manifest coverage, URLs, PBR arrays, decal alpha, articulation metadata, interactions, sockets, placements, and authored-room validity.
- Run focused tests, full Vitest, production build, retail asset audit, model-presentation audit, and a deterministic room/seed sweep.
- Capture a final cohort census with source/output size, triangle count, texture count/resolution, animation/anchors, runtime registries, room placements, and test evidence.

## 5. Placement suites

| Suite | Assets | Runtime destination |
|---|---:|---|
| Chen / toxic sump source art | 13 | Specific corporate evidence and sump-control scenes; never broad filler |
| Camp people, quests, and outcomes | 25 | Meridian, Tallow, and Vesper camp states plus Kaelen/Martha/Briggs beats |
| Alien covenant states | 12 | Nahl, Vey, and Rhun offer/accept/refuse/shared-work scenes |
| Evacuation endings | 10 | Boarding, roster, Queen, egg, mixed-crew, and sacrifice configurations |
| Traversal mechanisms | 8 | Multi-cell gates, lift, catwalk, flood, ice, and breach routes |
| Network hazards | 8 | Explicit source/controller/beneficiary chains |
| Ceiling and secret grammar | 4 | True ceiling network and wall/floor substitution reveals |
| **Total** | **80** | |

## 6. Known naming reconciliation

The upload is authoritative where names differ from earlier draft prompts. Examples include `meridian_reactor_vent_load_selector`, `tallow_cultist_escort_tether_reel`, `rhun_gift_load_bearing_yoke`, `vey_covenant_twin_listening_cowl`, `evac_turned_passenger_jettison_seat`, `hazard_beneficiary_steam_rotary_airlock`, `traversal_ballast_tilt_floor`, and `traversal_catwalk_swing_span`. Runtime keys will follow uploaded filenames. Documentation and prompt records will be reconciled to those keys rather than silently renaming files.

## 7. Stop conditions

Do not promote an individual asset if it has invalid bounds, failed import, missing embedded maps, destructive articulation separation, unresolved collision/swept volume, an unowned placement, or an untested state transition. A failed asset stays in `art/raw`; the rest of the cohort may continue.
