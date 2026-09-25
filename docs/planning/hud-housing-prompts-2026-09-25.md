# HUD housing prompts: the three panels on chroma key (for the Gemini image agent)

Source of truth: `docs/planning/hud-lower-dock-plan-2026-09-25.md` §3A (slot map)
and §4D, plus `docs/design/art-style-bible.md` (Nordic Cathedral Biomech).
Renders go to `public/ui/suit/<class>/<panel>[_<state>].png`. Then run
`python3 scripts/chroma_key.py <file-or-folder>` to get transparent WebP.

---

## Rules for every render (read first)

1. **Background: flat pure chroma green `#00FF00`**, edge to edge. No gradient, no
   floor, no shadow, no vignette, no glow spilling onto it, no reflections of it.
2. **No green anywhere in the panel.** No green lights, no green patina, no green
   glass. (Teal #71cddf is fine: it keys cleanly.)
   - **Exception, biology layers:** anything with alien/bio growth (bio green
     #4eec86, sickly #cdcf8f) uses **magenta `#FF00FF`** as the background instead,
     with no magenta or pink in the art.
3. **One panel per image, flat-on orthographic**, centred. The panel spans the full
   image width (leave ~3 % margin each side). The chroma colour fills above and below.
   Aspect: generate at **16:9**. The panel's own proportions are fixed below; don't
   stretch it to fill the frame.
4. **Glass windows are EMPTY:** flat near-black `#070808`, one faint diagonal
   reflection streak, **no text, numbers, icons, maps, bars or UI of any kind**. The
   live game draws into them.
5. **Crisp silhouette:** a dark ink contour around the whole panel so the key edge is
   clean. No soft feathered edges, no smoke or particles leaving the silhouette.
6. **Same panel, every state:** for state variants, give the model the clean render
   as the input image (img2img / edit) and change only what the state adds.
   Composition, lighting and silhouette must not move.
7. **Size:** as large as the tool allows (≥ 2048 px wide). We downscale.

## Shared style block (paste at the start of every prompt)

```
"Nordic Cathedral Biomech" style for the game "Hunker Bunker": the hard-line beauty of
Nordic Jugendstil / National Romantic architecture — monumental stepped granite
massing, deep round arches with heavy keystones, blackened-iron strap bindings and ring
clasps, carved bone and stone relief, abstract serpentine interlace carving (no runes),
frost-etched leaded glass, restrained taut curves — transposed into the bunkers of a
dead megacorporation. 2D illustration: heavy black contours, woodcut/etching hatching
on stone and iron, soft cel shading with painted texture. Mostly dark; amber lantern
light, pale cold light on stone faces. No text.
```

## Negative / avoid (paste into every negative field)

```
text, letters, numbers, runes, symbols, logos, watermark, UI, icons, bars, graphs, maps,
radar content, characters, faces, gameplay scene, background environment, perspective,
3D render look, photorealism, lens flare, depth of field, gradient background, drop
shadow, glow outside the panel, green (except the chroma background), gold-leaf
opulence, French Art Nouveau florals, Viking clichés
```

---

## The three panels (identical geometry for every class)

| Panel | Proportion (w:h) | Glass windows to leave empty (left → right) |
| :--- | :--- | :--- |
| **LEFT: map** | 220 : 64 (≈ 3.4 : 1) | one **circle** at the left (≈ 88 % of the panel height), then one **rectangle** filling the rest (readouts) |
| **CENTRE: health & status** | 520 : 64 (≈ 8.1 : 1) | one **wide rectangle** over the left ⅔ (hearts, status icons, O₂ and hull bars); one **narrow vertical slot** (infection vial); one **rectangle** over the right third (loot); plus a **crest of 5 unlit lamps** rising slightly above the top edge, centred |
| **RIGHT: gun & ammo** | 380 : 64 (≈ 5.9 : 1) | one **rectangle** at the left (weapon window, ≈ ⅓ width); one **rectangle** (ammo); two **square tile sockets** at the right end |

Shared rules for all three:
- shallow arched top edge with a small keystone;
- blackened-iron strap bindings wrapping the ends;
- the panel is thin: the frame around the glass is about 10–14 % of the panel height.

---

## Prompts: 9 clean panels (3 classes × 3 panels)

Each prompt = shared style block, then the text below, then the negative block.

### SCOUT: "frost lantern" (light and cold; teal accent)

**SCOUT / LEFT: map**
```
Game HUD hardware panel, flat-on orthographic, isolated on a flat pure chroma green
#00FF00 background. A slim horizontal panel with proportions 3.4:1 spanning the image
width: the MAP wing of the SCOUT class console. Slender blackened-iron frame with a
shallow arched top and small keystone; small frost-etched leaded panes set into the
frame; thin carved bone ribs; a carved bone finial like an antler tine rising from the
top-left corner holding a tiny unlit lantern. Glass windows: one perfect circle at the
left end, then one rectangle filling the rest — both completely empty, flat near-black,
one faint reflection streak. Cold teal light (#71cddf) glowing softly from the seams,
contained inside the panel. Light, precise, cold. Crisp dark ink outline around the
whole panel. No green in the panel.
```

**SCOUT / CENTRE: health & status**
```
[same opening, "the HEALTH & STATUS centre panel of the SCOUT class console",
proportions 8.1:1]. Slender blackened-iron frame, frost-etched leaded panes along the
borders, thin bone ribs. Glass: one wide rectangle over the left two thirds, one narrow
vertical slot, one rectangle over the right third — all empty, flat near-black. A small
crest rises from the top centre holding five tiny unlit frost-glass lanterns in a row.
Cold teal seam light inside the panel. Crisp dark ink outline. No green in the panel.
```

**SCOUT / RIGHT: gun & ammo**
```
[same opening, "the GUN & AMMO wing of the SCOUT class console", proportions 5.9:1].
Slender blackened-iron frame, frost-etched leaded panes, bone ribs. Glass: a rectangle
at the left (about one third of the width), a second rectangle beside it, and two
square sockets at the right end — all empty, flat near-black. Cold teal seam light
inside the panel. Crisp dark ink outline. No green in the panel.
```

### TANK: "granite bastion" (massive; amber accent)

**TANK / LEFT: map**
```
Game HUD hardware panel, flat-on orthographic, isolated on a flat pure chroma green
#00FF00 background. A slim horizontal panel with proportions 3.4:1 spanning the image
width: the MAP wing of the TANK class console. Massive stepped granite blocks bound in
heavy blackened-iron straps with big round bolts; a deep keystone arch over the top;
hazard chevrons re-cut as carved banding along the bottom lip; rust bleeding from the
bindings. Glass windows: one perfect circle at the left end, set in a heavy iron ring,
then one rectangle filling the rest — both completely empty, flat near-black, one faint
reflection streak. Warm amber lantern light (#f99415) glowing from the seams, contained
inside the panel. Heavy, monumental. Crisp dark ink outline. No green in the panel.
```

**TANK / CENTRE: health & status**
```
[same opening, "the HEALTH & STATUS centre panel of the TANK class console",
proportions 8.1:1]. Stepped granite blocks bound in heavy iron straps and bolts,
carved-chevron banding, rust bleed. Glass: one wide rectangle over the left two
thirds, one narrow vertical slot, one rectangle over the right third — all empty, flat
near-black. A small crest rises from the top centre holding five caged iron lanterns
(unlit) and two chunky toggle switches. Warm amber seam light inside the panel. Crisp
dark ink outline. No green in the panel.
```

**TANK / RIGHT: gun & ammo**
```
[same opening, "the GUN & AMMO wing of the TANK class console", proportions 5.9:1].
Granite blocks, heavy iron straps and bolts, a deep arched niche framing the left
glass. Glass: a rectangle at the left (about one third of the width) inside the arched
niche, a second rectangle beside it, and two square sockets at the right end — all
empty, flat near-black. Warm amber seam light. Crisp dark ink outline. No green in the
panel.
```

### ENGINEER: "forge altar" (bronze and iron; orange accent)

**ENGINEER / LEFT: map**
```
Game HUD hardware panel, flat-on orthographic, isolated on a flat pure chroma green
#00FF00 background. A slim horizontal panel with proportions 3.4:1 spanning the image
width: the MAP wing of the ENGINEER class console. Bronze and blackened-iron forge-altar
construction: short stacked bronze pipes rising behind the top edge like organ pipes, a
heat-fin crown, conduits carved with abstract interlace, an iron-bound tool rail along
the bottom. Aged bronze with brown and rust patina (NOT green verdigris). Glass windows:
one perfect circle at the left end in a bronze ring, then one rectangle filling the rest
— both completely empty, flat near-black. Orange forge light (#f2780c) glowing from the
seams, contained inside the panel. Crisp dark ink outline. No green in the panel.
```

**ENGINEER / CENTRE: health & status**
```
[same opening, "the HEALTH & STATUS centre panel of the ENGINEER class console",
proportions 8.1:1]. Bronze and iron forge-altar construction, bronze pipes behind the
top edge, interlace-carved conduits, brown/rust patina (no green). Glass: one wide
rectangle over the left two thirds, one narrow vertical slot, one rectangle over the
right third — all empty, flat near-black. A small crest at the top centre holds five
bronze lamp-cups with teal glass caps (unlit). Orange seam light. Crisp dark ink
outline. No green in the panel.
```

**ENGINEER / RIGHT: gun & ammo**
```
[same opening, "the GUN & AMMO wing of the ENGINEER class console", proportions 5.9:1].
Bronze and iron, pipes and heat fins, an iron-bound tool rail, brown/rust patina (no
green). Glass: a rectangle at the left (about one third of the width), a second
rectangle beside it, and two square sockets at the right end — all empty, flat
near-black. Orange seam light. Crisp dark ink outline. No green in the panel.
```

---

## State variants (img2img on each clean panel; same background rules)

Give the clean render as the input image. Prompt:
*"Same panel, identical composition, lighting and silhouette. Only add: …"*

| State file suffix | Background | "Only add: …" | Wear tier |
| :--- | :--- | :--- | :--- |
| `_blood` | green | "fresh dark-red blood spatter and a few drips on the frame and glass edges, never covering the glass centres" | wipes off |
| `_blood_dry` | green | "dried, darkened brown-red blood, flaking, on the frame and glass edges" | wipes off |
| `_scuffs` | green | "fine scratches and paint scuffs on the metal and stone edges only" | this life |
| `_damage1` / `_damage2` / `_damage3` | green | SCOUT: "a crack along the leaded glass from one impact" / "two impacts, cracks following the lead lines" / "one pane shattered, shards missing". TANK: "a gouge in the granite" / "a cracked block and a bent iron strap" / "a split block, a strap torn loose". ENGINEER: "a scorched conduit" / "sparks from a burnt joint" / "a dead blackened lamp-cup and a split pipe". | repairable |
| `_frost` | green | "white-blue frost creeping from the corners along the leaded panes and iron straps, small icicles hanging from bolts and the finial" | while cold |
| `_grime` | green | "soot, grease smears, strips of tape repair" | fatigue |
| `_alarm` | green | "the crest lamps lit signal red, a red glow inside the frame only" | moment / boss |
| `_bio1` / `_bio2` / `_bio3` | **magenta #FF00FF** | "glossy wet Giger-like biology growing from the joints and iron bindings: thin veins" / "ribbed growths following the carved interlace" / "vertebrae following the arch, membranes filling the frame gaps, faint bioluminescent green, glass left clear" | infection squish (fades) |
| `_scars` | green | "burn-etched vein tracks and pitted stone where growth was removed, no living growth" | this campaign |

**Deliver:** 9 clean panels first (SCOUT → TANK → ENGINEER). Stop for review, then
the state variants, starting with `_blood`, `_frost` and `_damage1` for one class.

## Checklist before handing back

- [ ] background is flat #00FF00 (or #FF00FF for `_bio*`), with nothing else in that colour
- [ ] glass windows empty and near-black, in the §3A positions
- [ ] panel proportions 3.4 : 1 / 8.1 : 1 / 5.9 : 1, silhouette unchanged across states
- [ ] no text, runes or numbers anywhere
- [ ] ran `python3 scripts/chroma_key.py public/ui/suit/` and checked the WebP edges on
      a dark and a light background
