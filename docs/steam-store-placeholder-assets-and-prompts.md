# Steam Store Placeholder Assets — Audit + Regeneration Prompts

Date: 2026-07-16.

## The actual problem, stated plainly

All five required Steam store capsules currently in `steam/store/` were
cropped from a single source image, `public/title_key_art.png` (added
2026-07-11) — and that source image is a **leftover from a different,
generic placeholder generation**. It has the wrong game title baked
directly into the pixels:

```
VOID_WALKER
DEEP OPERATIVE
...
PRESS [START] BUTTON
©2077 SYNTH-WORKS DIGITAL
ARCADE TACTICAL EDITION
```

None of that is this game. The real title is **HUNKER BUNKER**, the real
developer is the **Tuesday Cinema Club** (see `README.md`), there is no
"2077" or "SYNTH-WORKS DIGITAL" anywhere else in the project, and Steam
capsule art should not carry a fake in-universe copyright line or arcade
"press start" chrome at all — that's title-screen decoration, not store
art. Someone (or some prior pass) papered over the top ~15% of each crop
with a "HUNKER BUNKER / DESCEND. BANK. SURVIVE." banner, but the
original wrong text is still visible/cut off at the edges on the taller
crops (`steam_vertical_capsule_en.png`, `steam_library_capsule_en.png`
both show `VOID_WA[L]KER` bleeding in under the banner).

**The good news:** the underlying *composition* — a silhouetted operator
standing in a glowing amber cave/tunnel mouth, framed by a grimy
industrial bunker corridor of pipes and conduits — is genuinely on-brand
and sellable. It matches the game's real Act 1 "cave reveal" beat and the
amber/cyan palette used throughout the actual UI (see
`public/hunker_bunker_select.png`, the real class-select screen). The
prompts below intentionally keep that composition and fix everything
that's wrong with it, rather than starting from zero.

## Current placeholder inventory

| File | Size | Real problem | Disposition |
|---|---|---|---|
| `public/title_key_art.png` | 1024x1024 | Source image itself has `VOID_WALKER`/`DEEP OPERATIVE`/`PRESS [START] BUTTON`/fake `©2077` baked in | Regenerate from scratch (Prompt 0 below), then re-derive all capsules from the clean version |
| `steam/store/steam_header_capsule_en.png` | 920x430 | Cropped from the above; banner covers most but not all of the leftover text | Regenerate (Prompt 1) |
| `steam/store/steam_small_capsule_en.png` | 462x174 | Same source; logo is currently a small banner strip, not sized for this frame | Regenerate (Prompt 2) |
| `steam/store/steam_main_capsule_en.png` | 1232x706 | Same source | Regenerate (Prompt 3) |
| `steam/store/steam_vertical_capsule_en.png` | 748x896 | Same source; `VOID_WA[L]KER` and `PRESS [START] BUTTON`/copyright line visibly bleed through at top and bottom | Regenerate (Prompt 4) |
| `steam/store/steam_library_capsule_en.png` | 600x900 | Same defect as vertical capsule | Regenerate (Prompt 5) |

Everything below this line in the existing `docs/steam-store-asset-checklist.md`
is still accurate and not duplicated here: the required-screenshot list
(capture from the real build, never generate), the trailer beat sheet in
`docs/steam-store-assets-plan.md`, and the store/portal copy in
`docs/steam-portal-copy.md`. This doc only covers the **image assets**
that are placeholder or still missing, with prompts detailed enough to
hand to an image model or an artist as a brief.

## Shared style block (prepend to every prompt below)

Keeping one consistent style paragraph across every generation is what
makes five separate images read as one capsule family instead of five
random pieces of concept art. Use this verbatim as the opening of every
prompt:

> Retro-futuristic tactical sci-fi illustration, bold vector-clean line
> art with heavy black outlines and cel-shaded flat color blocking (not
> painterly, not photoreal). Limited palette: deep black shadow, warm
> amber/orange (#e8952a-ish) as the dominant light and metal-rust color,
> a single desaturated teal-cyan (#3ad6d1-ish) used only as a small
> accent (status lights, screen glow, UI glyphs), no other hues. Grimy
> industrial bunker architecture: riveted metal plating, thick conduit
> pipes, worn hazard stripes, rust streaks, exposed cabling. Strong
> single-source rim lighting from a glowing point deep in the frame.
> High contrast, poster-composition, no photobash, no text unless
> specified.

## Logo lockup reference

Do not regenerate the wordmark from scratch inside the illustration —
composite it in afterward (Figma/Photoshop, per the existing checklist's
own "best practice" note), matching the real in-game treatment already
established in `public/hunker_bunker_select.png`:

- **HUNKER BUNKER** — bold, slightly condensed geometric sans-serif, all
  caps, warm amber/orange fill with a subtle darker-orange or black
  outline/bevel.
- Optional subtitle beneath, smaller, either **TACTICAL COMMAND** (matches
  the in-game title screen) or the marketing tagline **DESCEND. BANK.
  SURVIVE.** (matches the existing capsule banners and actually describes
  the core loot-and-extract loop — keep this one for store-facing capsule
  art, save "TACTICAL COMMAND" for library/client assets that echo the
  in-game chrome more directly).
- No dev-studio name, no copyright line, no version number, no "press
  start" text anywhere in store-facing art. If a credit line is ever
  wanted, it is "TUESDAY CINEMA CLUB" — nothing else.

## Regeneration prompts

### Prompt 0 — `public/title_key_art.png` replacement (1024x1024, master source)

> [style block] Wide-angle view straight down a derelict bunker access
> tunnel toward a jagged, roughly circular opening torn into rock at the
> far end, glowing intense amber-orange like something is burning or
> molten just out of sight beyond it. A single armored operator stands
> centered in silhouette in the tunnel mouth, facing away from camera
> toward the glow — bulky exosuit with a rounded sealed helmet, layered
> shoulder plating, and a utility belt, fully black silhouette rimmed in
> amber backlight (no visible face, no visible logos on the suit).
> Corridor walls on both sides are riveted gunmetal panels with thick
> pipes, conduit bundles, small warning-light clusters (one or two tiny
> teal-cyan accent lights only), and rust/grime streaking downward.
> Rocky, organic cave-rock breach frames the glowing opening itself,
> contrasting with the industrial corridor around it — this is a bunker
> wall that something has broken through. No text, no logos, no UI
> chrome, no readable signage anywhere in the image. Square 1:1
> composition with the glowing opening as the clear focal point roughly
> centered, leaving clean negative space near the top third for a title
> lockup to be added afterward.

### Prompt 1 — Header Capsule (920x430)

> [style block] Same scene and operator-silhouette-in-glowing-tunnel
> composition as the master key art, recomposed for a wide 920x430
> letterbox crop: the tunnel opening and operator sit slightly
> right-of-center, corridor pipework fills the left third, generous flat
> darker area in the upper-left quarter reserved for the HUNKER BUNKER
> logo lockup to be composited afterward. No text baked into the
> illustration itself.

### Prompt 2 — Small Capsule (462x174)

> [style block] Tight horizontal crop, same tunnel/operator motif
> simplified for small-size legibility: fewer background details (drop
> the small background pipes/props, keep only the glowing tunnel mouth
> and the operator silhouette), bolder simpler shapes throughout since
> this renders very small in Steam listings. Leave the left third as flat
> dark negative space for a compact logo lockup (title only, no
> subtitle/tagline fits at this size).

### Prompt 3 — Main Capsule (1232x706)

> [style block] The full wide establishing version of the tunnel/operator
> scene, most detailed of the set: visible background props deeper in
> the glow (a distant broken support strut, scattered rubble, faint
> hanging cable), operator silhouette centered-low in the frame so there
> is open sky/glow above for the logo lockup and tagline. This is the
> featured/recommendation carousel image — it should read as the single
> best "this is the game" poster of the set.

### Prompt 4 — Vertical Capsule (748x896)

> [style block] Tall poster crop: camera positioned lower and closer to
> the operator so the tunnel opening arcs dramatically overhead, corridor
> pipes running the full height of both side edges. Reserve the top
> quarter as flat darker sky/rock for the logo lockup, and the bottom
> eighth as a darker floor area — plain enough that a tagline can sit
> there legibly. No text baked in.

### Prompt 5 — Library Capsule (600x900)

> [style block] Same tall composition as the Vertical Capsule (they can
> reasonably share one generation, cropped/re-composited to their two
> slightly different aspect ratios) — tunnel arching overhead, operator
> lower-center, clean flat space top and bottom for the logo lockup only.
> No extra text, no subtitle needed at this size once the logo is placed.

## Still missing (not placeholder, genuinely absent — checklist already flags these, prompts added here)

### Page Background (1438x810)

> [style block] Same tunnel corridor environment but treated as pure
> ambient background: no operator figure, camera further back and
> slightly off-axis so the glowing opening sits asymmetrically rather
> than centered, overall contrast and saturation pulled down ~30% from
> the capsule art so store-page text overlays it cleanly. No focal
> subject, no text.

### Library Hero (3840x1240)

> [style block] Extreme wide banner version of the same corridor,
> operator silhouette placed well off-center (left or right third) so
> Steam's UI chrome never overlaps it, glowing tunnel opening visible but
> not centered. Absolutely no text anywhere in this asset — Steam
> overlays its own UI on top of Library Hero images.

### Library Header (920x430)

> Reuse Prompt 1's output directly (Steam's Library Header and store
> Header Capsule share the same 920x430 spec) rather than generating a
> second, subtly-different version.

### Library Logo (transparent, ~1280 wide)

> Not a generation task — vector/typography work only. Recreate the
> HUNKER BUNKER wordmark from the Logo Lockup Reference section above as
> a clean transparent-background PNG/SVG, hand-finished in Figma or
> Illustrator, not AI-generated (small crisp text is the one thing image
> models in this style consistently get wrong, per the existing
> checklist's own guidance).

### Shortcut Icon (256x256) / App Icon (184x184)

> `public/icon-512.png` (the pixel-art amber radar/vent icon) is already
> on-brand, clean, and has no text defect — no regeneration needed. Just
> resize/re-export it at 256x256 and 184x184 rather than generating a new
> icon from scratch.

## Explicit exclusion list (paste into any negative-prompt field)

```
VOID_WALKER, DEEP OPERATIVE, PRESS START, arcade cabinet chrome,
copyright text, ©2077, SYNTH-WORKS, year stamps, fake studio names,
readable UI text, watermarks, signatures, photorealistic rendering,
painterly/oil-paint texture, extra color hues outside amber/black/teal,
blurry or illegible small text
```

## Workflow note (unchanged from `docs/steam-store-asset-checklist.md`)

Generate the illustration/atmosphere with an image model using the
prompts above, then composite the logo lockup and any tagline text in
Figma/Photoshop afterward so the type stays crisp — do not ask an image
model to render the final title text into any of these six assets.
