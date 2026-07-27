# Asset Manifest

All names are proposed. Compose every scene natively for Hunker Bunker’s
1280×800 logical stage. Higher-resolution masters must preserve that 16:10
framing rather than crop a 16:9 image down for Steam Deck.

## Art direction

- Graphic, high-contrast 2D realism with screen-printed texture.
- Characters use limited animation and strong silhouettes.
- Red is functional and hostile; it never conveys state by color alone.
- Avoid recognizable real-world company, pharmacy, or device branding.
- Keep essential composition, subtitles, and controller prompts inside the
  shared game-wide safe frame.

## Backgrounds

| ID | Asset | Variants / notes |
| --- | --- | --- |
| BG-01 | `bg_sedan_interior` | Phone glow, empty cupholder states |
| BG-02 | `bg_rgb_parking_lot` | Late afternoon and night/fire |
| BG-03 | `bg_employee_intake` | Scanner red states |
| BG-04 | `bg_warehouse_line_4a` | Normal, jammed, post-collision |
| BG-05 | `bg_incident_review` | Laptop open/closed, glass-wall activity |
| BG-06 | `bg_medi_kiosk` | Bag in holding/slot/returned |
| BG-07 | `bg_server_room` | Normal, arc, ignition |
| BG-08 | `bg_sector_four` | Clear, smoke, collapse, rescue |
| BG-09 | `bg_desert_epilogue` | System Loop, fire, Open Hand grades |

## Characters

| ID | Asset | Required states |
| --- | --- | --- |
| CH-01 | `elias` | idle, inspect, reach, limp, injured, pinned, seated |
| CH-02 | `marisol` | idle, scanner work, phone, witness hesitation |
| CH-03 | `hr_rep` | idle, type, slide item, close laptop |
| CH-04 | `robot_4a` | scan, overgrip, release, sort, strike, lift, failure |
| CH-05 | `kiosk_arm` | retrieve, present, hold, return |
| CH-06 | `lucia` | no literal sprite required; drawing and voice only |

Keep 4A industrial and fixed-base. Do not give it a human face or expressive
eyes; recognition is conveyed by timing, path deviation, and sensor movement.

## Inventory and inspect objects

| ID | Asset | States |
| --- | --- | --- |
| IT-01 | `item_albuterol_bottle` | intact label, peeling sticker |
| IT-02 | `item_lucia_drawing` | clean, folded, scorched |
| IT-03 | `item_calibration_notebook` | closed, joint diagram, utility map |
| IT-04 | `item_temp_badge` | front/back |
| IT-05 | `item_phone` | cracked screen plus authored screen overlays |
| IT-06 | `item_wire_cutters` | inventory and in-scene |
| IT-07 | `item_hard_hat` | intact and split |
| IT-08 | `item_swab_reader` | waiting, inconclusive |
| IT-09 | `item_medicine_bag` | holding, pickup slot |
| IT-10 | `item_battery_pallet` | normal, sparking, ignition |

## Scene presentation

RGB does not ship a separate responsive UI skin. Dialogue, inventory,
terminals, phone screens, choices, focus marks, and ending cards are composed
inside the scene using Hunker Bunker’s shared type, focus, subtitle, and input
glyph systems.

RGB-specific art is limited to diegetic surfaces:

| ID | Asset | Purpose |
| --- | --- | --- |
| PR-01 | `surface_rgb_terminal` | Corporate terminal glass and scan texture |
| PR-02 | `surface_elias_phone` | Cracked device and authored screen states |
| PR-03 | `surface_calibration_notebook` | Diagram and utility-map spreads |
| PR-04 | `mark_archive_hotspot` | Archive-specific focus treatment |
| PR-05 | `card_rgb_ending` | Art plate behind shared ending text |

Text, button labels, controller glyphs, inventory slots, and modal structure
must not be baked into these assets.

## Effects

- Heat shimmer over the parking lot
- Cardboard dust and conveyor vibration
- Red scanner sweep
- Phone-glass bloom
- Electrical arc and battery ignition
- Smoke layers at three densities
- Reduced-flash-compatible klaxon treatment
- Amber fire grade and muted-violet Open Hand grade

## Audio

| ID | Asset | Notes |
| --- | --- | --- |
| AU-01 | `amb_parking_lot` | Trucks, heat, distant warehouse hum |
| AU-02 | `amb_warehouse` | Belts, gates, scanners; loop layers |
| AU-03 | `amb_review_room` | Fluorescent buzz and muted floor |
| AU-04 | `amb_kiosk_night` | HVAC, distant traffic, dispenser |
| AU-05 | `amb_server_room` | Fans, electrical load, warning relay |
| AU-06 | `amb_sector_fire` | Alarm, smoke, structural groans |
| AU-07 | `sfx_4a_set` | Servo, grip, release, recenter, failure |
| AU-08 | `sfx_ui_set` | Scanner, denied, approved, timeout |
| AU-09 | `voice_lucia_message` | Optional VO; retain subtitle-only fallback |
| AU-10 | `music_epilogues` | Three restrained ending cues |

## First asset pass

For a playable gray-box, create BG-01 through BG-08, Elias’s core poses, 4A’s
five mechanical states, IT-01 through IT-06, PR-01 through PR-04, and the six
ambient loops. Epilogue variants and optional animation polish can follow.

### Production status

Environment pass 01 now supplies BG-01 through BG-08 plus the Ashes ending
variant under `public/minigames/rgb/backgrounds/`. See
`public/minigames/rgb/ASSET_PROVENANCE.md` for prompt direction, dimensions,
and separation notes. Character, object, and diegetic-presentation passes
remain open.

Cinematic pass 01 supplies fourteen branch end frames under
`public/minigames/rgb/cinematics/`. Their exact start-to-end video prompts and
state effects are defined in `cinematic-branch-prompts.md`.

On-rails pass 01 supplies nine connective and epilogue anchors under
`public/minigames/rgb/cinematics/rails/`. Their prompts and handoff rules are
defined in `cinematic-rail-prompts.md`.
