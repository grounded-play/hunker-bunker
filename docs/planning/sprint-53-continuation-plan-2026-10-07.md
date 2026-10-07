# Sprint 53 continuation — after names, placement, night, walls and vents

Status: **active**. Branch: `dev/sprint-51`.

This is the handoff plan after auditing the 2026-10-07 commits and the live tree. It supplements the full brief in `sprint-53-world-variety-night-and-sleep-2026-10-07.md`; it does not replace its art prompts or design decisions.

## What already landed

| Work | Commit | Evidence still owed |
|---|---|---|
| N1–N4: first-entry room/hall cards, scan reveal, seeded crash-site name, seven-language copy | `bb73e1ee` | 1280x800 room, hallway, scan-in-place and crash-site captures |
| V1–V2: six-tile duplicate spacing and placement-aware facing | `c12631f6` | before/after room capture and one seeded hallway capture |
| L1: ~20% ambient night, cold moonlight, warm/wider suit light | `f2a4ca24` | active/cryo/bio night captures plus brightness-floor check |
| W1–W4: ring materials, place overrides, wall tops/trims, geothermal and hive-resin sets | `ef1b40d3` | override matrix captures and long-walk GPU comparison |
| L2–L3: pooled steam/cryo/spore/geyser vents, pulse light and floor fog | `d7e51ee9` | visible-chunk cap, night capture and long-walk comparison |

Focused regression run on 2026-10-07: 3 files and 17 tests passed for biome walls, real night and ambient vents/fog. That is unit coverage, not visual or performance sign-off.

## Texture replacement checkpoint

The first geothermal and hive-resin maps were procedural stand-ins. They have now been replaced by generated material masters:

- `art/raw/textures/sprint53/geothermal_wall_color_source.png`
- `art/raw/textures/sprint53/hive_resin_wall_color_source.png`

`python3 scripts/build_sprint53_generated_wall_maps.py` makes the runtime 1024px color, normal, roughness and emissive WebP maps. The 1024px runtime size matches the original budget; the source masters remain available for later rebakes. The builder feathers opposite edges, validates the compressed outputs, and keeps emission restricted to molten amber or emerald veins.

Generation prompts used with the built-in image generator:

### Geothermal wall master

```text
Perfectly seamless square tileable orthographic PBR base-color wall texture: interlocking irregular dark gunmetal plates bolted into rough black basalt; restrained sulphur-yellow and chalk-white mineral crust in seams; sparse hairline molten amber cracks; rust, soot, heat discoloration, rivets and conduit clamps. Flat diffuse neutral lighting, dark but readable, medium-scale details evenly distributed, all edge features continue across opposite edges. Avoid a rigid grid, central focal object, perspective, directional shadows, text, logos, watermark, vignette, bloom and clean sterile sci-fi.
```

### Hive-resin wall master

```text
Perfectly seamless square tileable orthographic PBR base-color wall texture: glossy amber-black alien hive resin in thick vertical drips and branching ribbed cartilage ridges; sparse ivory ring structures; bolts, cable segments and scratched gunmetal plate edges half engulfed; restrained emerald bioluminescent veins beneath translucent areas. Flat diffuse neutral lighting, wet and dark, medium-scale forms evenly distributed, all edge features continue across opposite edges. Avoid a neon web, repeating loops, regular grid, gore, creatures, perspective, directional shadows, text, logos, watermark, vignette and bloom.
```

## Remaining implementation order

### 1. Close the acceptance gap for work already landed

- Capture the N, V, L and W screenshot matrix at 1280x800 with deterministic seeds recorded beside each capture.
- Run the long-walk benchmark against the parent of `ef1b40d3`, current HEAD, and a vents-disabled control. Record Deck GPU time, frame time, visible vent count and texture memory.
- Fix only failures found by those gates before adding more world population.

### 2. V3–V5: authored compositions and cheap filler

- Add data-defined room vignettes: one anchor plus two or three satellites, with a footprint, allowed wall/corner slots and deliberate cluster exemptions.
- Start with models already registered in `WORLD_3D_MODELS`; missing A1 art uses a named proxy mapping, never a silent generic prop.
- Add the non-blocking filler pass after navigation and large props. It must use the same recent-model ledger as V1 and instance by model/material.
- Acceptance: four seeded rooms per ring, no blocked route, no accidental duplicate within six tiles, and one draw-call count comparison.

### 3. V6: mystery boxes as authoritative interactions

- Define the six roll outcomes and biome/depth tables in a pure module with deterministic seeded tests.
- Persist `unopened/opening/opened` state in the host-authoritative shared-world snapshot. Roll once on completion of hold-E, then broadcast the result.
- Implement common courier and quarantine behavior with existing models first; black-site keycard gating follows the same interaction path.
- Acceptance: exact distribution tests, engineer timing test, open-once co-op test, reconnect test, and no double grant on repeated input.

### 4. V7–V8: quest silhouettes and model swaps

- Replace the generic quest node through a quest-id-to-prop registry. Missing A3 models keep an explicit proxy and the objective beacon.
- Register A1–A5 assets as they arrive, set behavior/facing/footprint metadata, optimize them into runtime GLBs, and run the museum walk before enabling placement.
- Acceptance: every active quest has a distinct world silhouette or documented proxy; all new models pass scale, collision and missing-texture checks.

### 5. S1–S3: sleep presentation and atomic dawn reset

- Treat rest as `confirmed -> presenting sleep -> committing dawn -> morning card -> expedition`, so skip and video failure converge on the same commit path.
- Resolve the style from the existing rest context, then call the shared cutscene player. Until WebM/MP4 assets arrive, use a timed fade-to-black through the same promise boundary.
- Move day advance, fatigue recovery, overnight simulation, O2/camp restock and dawn lighting behind one idempotent commit. Never mutate the day before presentation starts.
- Show `DAY N · 06:00`, crash-site name and current objective after the commit; only then restore input.
- Acceptance: play-to-end, skip, missing-video, decode-failure, double-confirm, co-op guest and reconnect tests all advance exactly once and wake at dawn.

### 6. Final integration gate

- Full unit suite, production build, museum walk, named-place walk, night/vent capture, sleep matrix and long-walk benchmark.
- Update the original Sprint 53 checklist only from captured/tested evidence; keep generated-art provenance and proxy mappings in the handoff.

## Commit checkpoints

1. Generated wall masters, derived PBR maps and reproducible builder.
2. Status audit and continuation plan.
3. V3–V5 composition/filler.
4. V6 mystery boxes.
5. V7–V8 quest/model integration.
6. S1–S3 sleep presentation and dawn commit.
7. Visual/performance evidence and Sprint 53 closeout.
