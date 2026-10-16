# World Expansion 80 runtime audit — 2026-10-16

Status: **PASS**

## Delivered

- 80/80 GLBs registered and present (180.1 MiB total runtime payload).
- 2,100,675 total indexed triangles; every source mesh is within its 25k/35k ingest ceiling (large pieces remain below 36k including their added actuator).
- 80/80 contain a named articulated `HB_*` rig node targeted by an embedded `idle` animation, plus interaction/light/glow anchors.
- 80/80 have complete base-color, normal, and metallic/roughness material assignments with no orphan textures or images.
- 80/80 use embedded WebP textures and `EXT_meshopt_compression`.
- 80/80 have interaction, experience, FX, room-placement, support-surface and support-decal coverage.
- 8 hazard-network assets have typed runtime conduit sockets.
- 64 seamless surface layers (16 families × 4 variants) are registered in the height-aware floor PBR array.
- 24 alpha-keyed decal families have runtime PNG plus compressed albedo/detail PBR layers.

## Animation scope

The source uploads contained no animation clips and exposed each model as one monolithic mesh. The ingest therefore preserves the authored mesh, adds a small identified actuator with an embedded restrained idle motion, and publishes `HB_*`, `INTERACTION_00`, and `FX_*` nodes. It does not guess-cut the source geometry into doors or rotors. Future authored articulation can replace the actuator while keeping the same runtime contract.

## Placement and material behavior

Placement is derived from the shared manifest and restricted to each asset's exact room theme: wall/ceiling pieces use mount profiles; tabletop pieces enter clutter; floor, recess, threshold and carry-install pieces enter corner/story placements; eligible pieces also form two-item vignettes. Every prop carries a paired local surface and decal. Surfaces participate in the existing multi-layer height/blend shader, while decals use the shared compressed sticker arrays rather than per-object draw calls.

The exact per-asset evidence is in [the runtime inventory](./world-expansion-80-runtime-inventory-2026-10-16.tsv).
