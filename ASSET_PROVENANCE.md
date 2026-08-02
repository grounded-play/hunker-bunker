# Asset Provenance & License Tracking

This document logs asset origins, licensing, and placeholder status across Hunker Bunker.

## Status Categories

- `final`: Final production art assets.
- `placeholder-pending-final`: Functional vector/procedural placeholders active in code, easily greppable when final art drops land.

---

## Active Placeholders (`placeholder-pending-final`)

None. All 6 RGB story item icons are now high-resolution graphic novel halftone illustrations under `public/minigames/rgb/items/`.

## Production Art Assets (`final`)

| Item ID | Component | Location | Description / Format |
| --- | --- | --- | --- |
| `item_albuterol_bottle` | RGB Mini-Game | `public/minigames/rgb/items/item_albuterol_bottle.png` | Halftone comic illustration of inhaler bottle with dinosaur sticker |
| `item_lucia_drawing` | RGB Mini-Game | `public/minigames/rgb/items/item_lucia_drawing.png` | Crayon drawing of Robot 4A in sneakers |
| `item_calibration_notebook` | RGB Mini-Game | `public/minigames/rgb/items/item_calibration_notebook.png` | Grimy leather-bound calibration notebook |
| `item_temp_badge` | RGB Mini-Game | `public/minigames/rgb/items/item_temp_badge.png` | Worn ID badge with red TEMP CONTRACTOR header & lanyard clip |
| `item_phone` | RGB Mini-Game | `public/minigames/rgb/items/item_phone.png` | Cracked smartphone displaying "MISSED CALL LUCIA" notification |
| `item_wire_cutters` | RGB Mini-Game | `public/minigames/rgb/items/item_wire_cutters.png` | Heavy-duty insulated wire cutters with red rubberized handles |
| `drop_*` (14 lore collectibles) | World Lore Drops | `public/drop_*.png` | AI-generated stylized collectible sprites; built-in image generation, chroma-green source extraction, soft matte/despill, 512px alpha PNG finals |

---

## Asset Provenance Policy

1. All generated placeholders must use inline SVG Data URLs or clearly demarcated SVG/canvas routines.
2. When final PNG/WebP art is committed under `public/minigames/rgb/items/`, update the `icon` field in `content.js` and move the entry to `final` status in this document.
