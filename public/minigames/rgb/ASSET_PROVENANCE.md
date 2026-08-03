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

## Incident-review interaction plate 02

`backgrounds/bg_incident_review_v2.png` was created on 2026-07-26 with the
built-in OpenAI image-generation tool as a non-destructive edit of
`bg_incident_review.png`, then normalized to the required 1280×800 stage.

Edit direction: preserve the original room, framing, HR representative, Elias,
laptop, warehouse activity, halftone treatment, and monochrome fluorescent
palette; add four clearly separated interactive story elements—a tabletop swab
reader, Elias's calibration notebook, his cracked phone, and Marisol waiting
beyond the glass. No new foreground characters or camera changes.

The v2 plate exists specifically so the review gameplay can target visible
objects instead of placing abstract buttons over empty table space. The
original BG-05 remains in the repository as the untouched source plate.

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

## Dedicated Interstitials Pass 02

15 dedicated story beat and object inspect interstitial assets were generated on
2026-07-27 with OpenAI's built-in image generation workflow, then center-cropped
and normalized to 1280×800 (16:10). The prompt set consistently requested
high-contrast graphic realism, screen-printed grain, charcoal/gray industrial
materials, restrained functional red accents, and no logos or watermarks. These
replace the earlier diagrammatic placeholders and resolve visual repetition
across hotspots in Chapters 1–6:

- `interstitials/c1/img_c1_marisol_intake.png` — Marisol workplace entrance
- `interstitials/c1/img_c1_badge_turnstile.png` — Turnstile badge scan granted
- `interstitials/c2/img_c2_notebook_diagram.png` — Notebook Joint 3 diagram spread
- `interstitials/c2/img_c2_joint_focus.png` — Robot 4A Joint 3 macro focus
- `interstitials/c2/img_c2_terminal_metric_wipe.png` — Terminal metric cleared record
- `interstitials/c3/img_c3_collision_impact.png` — Unprogrammed strike impact
- `interstitials/c3/img_c3_swab_reader.png` — Compulsory swab reader inconclusive
- `interstitials/c3/img_c3_phone_snap_evidence.png` — Evidence photo capture POV
- `interstitials/c3/img_c3_hr_hand_reach.png` — HR retention reach across desk
- `interstitials/c4/img_c4_paycheck_stub.png` — Itemized paycheck deduction stub
- `interstitials/c4/img_c4_medicine_bag_3inch.png` — Prescription bag 3-inch gap
- `interstitials/c4/img_c4_utility_map_spread.png` — Utility conduit map spread
- `interstitials/c5/img_c5_wire_cutter_trunk.png` — Insulated cutters on data trunk
- `interstitials/c5/img_c5_battery_pallet.png` — Staged lithium battery pallet
- `interstitials/c6/img_c6_fire_alarm_pull.png` — Manual fire alarm pull station

## Narrative Restoration Interstitials

Four additional story interstitials were generated on 2026-07-27 with
OpenAI's built-in image-generation workflow and normalized to 1280×800:

- `interstitials/c2/img_c2_sensor_sweep.png` — 4A records Elias's gentle calibration source
- `interstitials/c4/img_c4_partial_pay_denied.png` — Kiosk rejects Elias's entire $14.00 paycheck
- `interstitials/c5/img_c5_expired_extinguisher.png` — Failed suppression equipment establishes negligence
- `interstitials/c6/img_c6_4a_destruction.png` — 4A holds the rack until Elias escapes

Prompt direction continued the established high-contrast graphic realism,
screen-printed grain, charcoal industrial palette, and functional red light.
The fire and destruction frame permits the route's authored ugly amber.
