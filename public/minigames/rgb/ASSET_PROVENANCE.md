# RGB Visual Asset Provenance

## Environment pass 01

Generated with the built-in OpenAI image-generation tool on 2026-07-24, then
normalized to the game-wide 1280×800 logical stage with an aspect-preserving
cover resize and centered crop.

Shared prompt direction:

> Production 2D narrative-adventure background for the Hunker Bunker
> dream/archive story RGB: Riverside Global ’Botics. Graphic realism with
> screen-printed grain; grounded adult workplace horror; almost entirely black,
> white, charcoal, and industrial gray; sharp red reserved for functional
> scanners and warnings; broad amber/orange appears only after the warehouse
> fire. Compose for a 16:10 Steam Deck stage with readable point-and-click
> hotspots and a quiet subtitle safe area. No logos, watermarks, HUD, mobile
> interface, baked subtitles, or recognizable brands.

| File | Manifest role | Production note |
| --- | --- | --- |
| `backgrounds/bg_sedan_interior.png` | BG-01 | Elias, bottle, phone, notebook, and drawing are composited into this establishing plate; later animation may require clean-plate separation. |
| `backgrounds/bg_rgb_parking_lot.png` | BG-02 | Exterior establishing plate with sedan, worker path, scanner, poster, and drone. |
| `backgrounds/bg_employee_intake.png` | BG-03 | Empty vestibule plate for layered characters and badge interaction. |
| `backgrounds/bg_warehouse_line_4a.png` | BG-04 | Establishing plate includes 4A; later animation requires a clean background plus separated machine states. |
| `backgrounds/bg_incident_review.png` | BG-05 | Empty two-character staging plate with evidence objects. |
| `backgrounds/bg_medi_kiosk.png` | BG-06 | Empty character staging plate with kiosk arm and medicine bag. |
| `backgrounds/bg_server_room.png` | BG-07 | Decision-room plate with trunk, cutters, terminal, batteries, extinguisher, and exit. |
| `backgrounds/bg_sector_four.png` | BG-08 | Fire/rescue establishing plate with empty Elias staging position. |
| `backgrounds/bg_desert_epilogue_ashes.png` | BG-09B | Ashes & Survival ending variant. |

These are first-pass production concepts. Files with animated subjects baked
into the plate must be separated or regenerated as clean plates before runtime
animation.

## Cinematic branch end frames 01

Fourteen choice-specific end frames were generated with the built-in OpenAI
image-generation tool and normalized to 1280×800. The chapter background was
used as the edit/composition reference. Where Elias appears,
`sprites/elias.png` was supplied as an identity and clothing reference.

The final prompts, start-frame assignments, durations, state changes, and
choice alignment live in
`docs/mini-games/rgb/cinematic-branch-prompts.md`.

```text
cinematics/c1/end_answer_lucia.png
cinematics/c1/end_enter_now.png
cinematics/c2/end_honest_log.png
cinematics/c2/end_clean_metric.png
cinematics/c3/end_document_review.png
cinematics/c3/end_comply_review.png
cinematics/c4/end_record_kiosk.png
cinematics/c4/end_call_lucia.png
cinematics/c4/end_lockout.png
cinematics/c5/end_preserve_profile.png
cinematics/c5/end_expose_profile.png
cinematics/c5/end_sever_trunk.png
cinematics/c6/end_rescue.png
cinematics/c6/end_crushed_retry.png
```

`rgb_cinematic_endframes_contact_sheet.png` is the review sheet.

### Review note

These are interpolation anchors, not automatically final shipped stills.
Environment-only edits preserve continuity most reliably. Frames with newly
composited people—especially C2 and C3—need an identity/style acceptance pass
before video generation. Reject any video that inherits invented signage,
changes room geometry, changes 4A’s design, or introduces extra limbs.

## On-rails cinematic anchors 01

Nine non-interactive destination frames were generated with the built-in OpenAI
image-generation tool and normalized to 1280×800:

```text
cinematics/rails/r1_badge_entry.png
cinematics/rails/r2_collision_aftermath.png
cinematics/rails/r3_coverage_discharge.png
cinematics/rails/r4_utility_map.png
cinematics/rails/r5_utility_return.png
cinematics/rails/r6_fire_propagation.png
cinematics/rails/r7_pinned_before_rescue.png
cinematics/rails/r8_system_loop.png
cinematics/rails/r9_open_hand.png
```

The source-frame assignments, exact video prompts, durations, and gameplay
handoffs are in `docs/mini-games/rgb/cinematic-rail-prompts.md`.
`rgb_rail_shots_contact_sheet.png` is the review sheet.

These shots communicate unavoidable events and transitions. They must not be
presented with choice controls. Character identity, exact clothing color, small
prop continuity, and Robot 4A geometry require final acceptance before video
interpolation.

## Placeholder inventory icons 01 — SUPERSEDED

`item_temp_badge.png`, `item_phone.png`, and `item_wire_cutters.png`
originally shipped as generated Pillow placeholders (see
`scripts/generate-rgb-item-placeholders.py`, still available for reuse).
All three have since been replaced with final halftone/graphic-novel
illustration art matching `item_calibration_notebook.png`'s treatment — see
the root-level `ASSET_PROVENANCE.md` for the current, authoritative status
of every RGB item icon. Nothing under `public/minigames/rgb/items/` is a
placeholder as of this entry.
