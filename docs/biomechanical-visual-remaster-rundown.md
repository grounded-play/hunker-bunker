# Hunker Bunker Biomechanical Visual Remaster

## Goal

Bring the main Hunker Bunker presentation into the same grounded cinematic
world as the new RGB stills, then push it toward an adult biomechanical-horror
identity: elegant, intimate, oppressive, and physically believable.

The target is mature sensual tension through silhouette, compression, anatomy,
materials, breath, and machinery. It is not explicit sexual imagery. Human
figures remain clothed or suited; anatomy is suggested through engineered
forms rather than exposed genitals, sexual acts, or fetish UI.

## Current audit

The repository contains roughly 429 visual and video assets across `public/`
and `steam/store/`. Several families intentionally duplicate PNG/JPG or
locked/unlocked variants, so this is not 429 unique compositions.

### What already works

- The new death/event posters establish high-contrast industrial realism,
  restrained red, readable wide staging, and screen-printed grain.
- The splash composition has a strong lone-operator silhouette.
- The bunker texture families already separate metal, frost, biological
  growth, spores, veins, damage, and grime.
- Door transitions have real mechanical timing, sound, smoke, and separate
  class/win/loss states.
- Gameplay characters and props generally read at Steam Deck scale.

### What currently fights the identity

- The splash, briefing menu, gameplay, doors, achievements, and RGB sequences
  look like different games.
- `title_key_art.png` and `menu_bg.webp` are square 1024 assets stretched or
  cropped into a 1280x800 stage.
- The base/class/win/loss doors do not share one underlying construction.
- The bright orange tactical UI and generic square sci-fi panels overpower the
  colder horror material.
- Several achievement families duplicate art across JPG/PNG and locked
  variants, multiplying remaster work.
- Store screenshots show the real interface but also expose the visual
  inconsistency between empty space, conventional terminals, and the organic
  story material.

## Visual constitution

Every remastered asset should obey these rules:

1. **One engineered anatomy.** Doors, consoles, walls, suits, and the ship all
   look manufactured by related tools and later altered by the bunker.
2. **Bone under metal.** Load-bearing ribs, vertebral cable runs, tendon-like
   seals, sternum latches, and jointed pressure membranes inform the shapes.
3. **Dry before wet.** Most surfaces are matte, abraded, dusty, frozen, or
   oxidized. Gloss and moisture are reserved for living contamination.
4. **Functional color only.** Charcoal, iron, bone, and dirty ice dominate.
   Amber means human machinery; red means warning/recording; cyan means
   cryogenic function; violet appears only when the Queen is exerting control.
5. **Adult, not explicit.** Sensuality comes from symmetry, tension, enclosure,
   curved load paths, breathing membranes, and close mechanical contact.
6. **Steam Deck readability.** Every key silhouette must read at 1280x800 and
   every interactive state must survive grayscale.
7. **No baked UI text.** Art provides frames, surfaces, and negative space.
   HTML/CSS owns labels and localization.
8. **No ornamental noise at interaction points.** Buttons, doors, pickups,
   enemies, and exits keep clean recognition zones.

## Tier 0 — identity anchors

These assets should be remade first because they color the player's impression
of everything that follows.

| Surface | Current consumer | Current asset | Remaster direction | Deliverable |
| --- | --- | --- | --- | --- |
| Splash | `#splash` | `public/title_key_art.png` | Lone suited operator facing a bunker aperture built like a pressure sternum; machinery converges around the figure without engulfing the title-safe center | `title_key_art_v2.png`, 1280x800 |
| Briefing menu | `#menu` | `public/menu_bg.webp` | Same aperture seen from inside: ribbed frame, recessed breathing seals, restrained amber service light, broad quiet center for live UI | `menu_bg_v2.webp`, 1280x800 |
| Social/README hero | metadata and README | `public/hunker_bunker_hero.png` | Wide gameplay promise image using the same material language; show operator, bunker anatomy, threat, and usable negative space | `hunker_bunker_hero_v2.png`, 1920x1080 |
| Class selection frame | briefing menu | `public/hunker_bunker_select.png` | Tactical fitting cradle rather than a flat terminal: suit held by articulated supports like a mechanical rib cage | `hunker_bunker_select_v2.png`, 1280x800 |
| Transition gear | CSS mask | inline generic gear SVG | Replace the generic cog silhouette with a three-lobed locking iris/cam that belongs to the new doors | Code-native SVG/CSS mask |

Do not replace the current filenames until the new group has been reviewed
together. Versioned files make side-by-side acceptance possible.

## Tier 1 — the complete door family

Current routing in `main.js`:

| Runtime state | Current file | New narrative read |
| --- | --- | --- |
| Base | `door.webp` | Dormant bunker sphincter-lock: armored, dry, symmetrical, human-made |
| Scout | `door_bio.png` | Lighter flexible ribs, narrow iris, sensor tendons, faint toxic green function light |
| Tank | `door_nuclear.png` | Thick sternum plates, compression pistons, reinforced sacrificial locks, amber heat |
| Engineer | `door_cryo.png` | Serviceable modular ribs, exposed diagnostic capillaries, cyan coolant rime |
| Victory | `door_alien.png` | The same door opened from within by Queen geometry; violet only in living seams |
| Defeat | `door_rust.png` | The same door starved, oxidized, scarred, and unable to seal cleanly |

All six must be generated from one approved base-door composition. Preserve:

- exact square canvas and central cross seam;
- identical outer frame, hinge positions, and lock center;
- clean top/bottom and left/right slicing for the existing transition;
- no text, hazard labels, logos, or perspective change;
- a readable closed silhouette at 25% size;
- safe central lock geometry that can align with the CSS cam/iris.

Recommended source size is 1600x1600, exported to optimized 1024x1024 WebP/PNG
runtime derivatives.

## Tier 2 — menu and shell UI

The UI should feel mounted into the bunker rather than floating above it.

### Keep in CSS/code

- text, settings, bindings, numbers, progress, focus rings, and localization;
- stage-safe layout and accessibility scaling;
- reduced-motion and high-contrast states.

### Restyle

- Replace orange rounded rectangles with thin bone-metal frames and inset
  pressure seals.
- Use amber as a small active filament, not a full-panel fill.
- Give selected controls a slow mechanical clamp/iris response rather than a
  glossy glow.
- Turn modal borders into interrupted rib segments with a clear text-safe
  center.
- Keep focus highly visible: bright ivory outline plus the functional accent,
  never texture alone.
- Reduce gratuitous scan grids behind dialogue; use them only for instrumentation.

### Do not rasterize

Buttons, settings panels, dialogue frames, HUD gauges, and skill-tree nodes
should remain CSS/SVG so they scale and localize correctly.

## Tier 3 — world material pass

Existing families:

- `bunker_*`: base metal, wall metal, normals, rust, scratches, grime;
- `cryo_*` and `ice_*`: frost, rime, conduits, glacier wall;
- `bio_*`: growth, veins, spores, normal maps;
- `hex_decal_*`: cracks and infestation.

Remaster these as a coordinated PBR-like set rather than independent images:

1. base bunker metal with shallow ribbing;
2. matching normal map;
3. dry wear/grime overlay;
4. frost invasion overlay;
5. biological membrane/vein overlay;
6. Queen-control emissive accents;
7. damage/scar decals.

The biological pass should appear to exploit joints, seals, drains, and cable
routes. Avoid random tentacles pasted over flat walls.

## Tier 4 — characters, enemies, and bosses

### Player classes

- Keep Scout, Tank, and Engineer silhouettes immediately distinct.
- Remake suit interfaces as intimate mechanical support systems: harness ribs,
  spinal utilities, breathing collar, and class-specific load paths.
- Keep faces/identity readable where portraits require them.
- Avoid nudity; the adult quality comes from vulnerability inside machinery.

### Enemies

- Snail/crawler silhouettes remain readable from the existing camera.
- Corruption should reuse bunker materials: stolen insulation, cable tendons,
  frost-burned carapace, and embedded recorder lights.
- Bosses get one dominant anatomical idea each; do not cover every surface
  with equal detail.
- Queen assets define the highest level of living biomechanical integration
  and therefore come after the base material language is approved.

## Tier 5 — props, modules, pickups, and structures

The current `prop_*`, `module_*`, `hive_*`, camp, fabrication, loot, and ship
families should be grouped by gameplay function before repainting:

- survival: oxygen, medicine, cryo, heat, food;
- power: reactor, compressor, battery, cable, relay;
- information: terminal, black box, archive, scanner;
- extraction: ship, boarding hardware, launch systems;
- infestation: eggs, throne, spores, webs, suture/relay sites;
- economy: salvage, junk rarity, fabrication.

Each group gets a repeated connector language so players can infer function
from silhouette, not just labels or color.

## Tier 6 — cinematics, achievements, and endings

### Cinematics

Use the new death/event `poster-art/` set as the tonal benchmark. Future frames
should share:

- wide locked composition;
- grounded high-contrast realism;
- screen-printed grain;
- restrained functional color;
- no text or HUD in the image;
- explicit first/end-frame continuity when converted to video.

### Achievements

There are about 98 `ach_*` files because unlocked/locked and PNG/JPG versions
coexist. Before generating:

1. decide one master format and runtime derivative policy;
2. map each achievement to a single master composition;
3. derive locked states mechanically in a build script where possible;
4. reserve hand-authored locked art only for secret/reveal achievements.

Achievement art should resemble recovered specimen plates or black-box
evidence, not unrelated trading cards.

### Endings

The five current `ending_*` stills and expanded achievement-ending family
should be reframed as intimate consequences inside the same ship anatomy.
Different endings alter occupants, contamination, lighting, and damage—not the
underlying cockpit/cabin design.

## Tier 7 — Steam and public-facing assets

Do this only after Tier 0–3 are stable. Store capsules and screenshots must
represent the actual shipped visual language.

- Keep the five real 1920x1080 screenshots as implementation evidence.
- Recapture them after menu/door/HUD acceptance.
- Build capsule art from the remastered hero master, but compose each capsule
  for its actual aspect ratio rather than cropping one square source.
- Keep title/logo treatment separate from the painted master.

## Production order

### Pass A — approve the language

1. Base door.
2. Splash.
3. Briefing menu background.
4. One modal frame in CSS/SVG.
5. One bunker wall material sample.

### Pass B — prove variation

1. Scout/Tank/Engineer doors derived from the approved base.
2. Victory/defeat doors derived from the same base.
3. One player-class suit repaint.
4. One corrupted enemy repaint.
5. One prop/function family.

### Pass C — propagate

1. Remaining environment materials.
2. Players/enemies/bosses.
3. Props/modules/ship/camp.
4. Achievements and endings.
5. Store capsules and final screenshots.

## Acceptance checklist

- Side-by-side contact sheet reads as one game.
- Splash, menu, and first door share unmistakable construction language.
- All six doors align perfectly during both transition directions.
- No baked text, logos, or fake UI appears in generated art.
- Important controls remain legible at 1280x800 and 100% UI scale.
- Focus, danger, lock, and success remain distinguishable without color.
- Reduced-motion mode removes pulsing/breathing effects without losing state.
- Mature tone is present without explicit sexual imagery.
- Gameplay screenshots honestly match the store presentation.

## First generation prompt block

Use this shared block for the first splash/menu/door concepts:

> Grounded adult biomechanical industrial horror for Hunker Bunker. A coherent
> engineered anatomy built from matte iron, abraded bone-colored composite,
> pressure membranes, ribbed load paths, tendon-like seals, spinal cable runs,
> and precise mechanical joints. Elegant, intimate, oppressive, and physically
> credible. Dry surfaces dominate; moisture appears only at living infection.
> Charcoal, iron, dirty ivory, and cold gray; functional amber and red only.
> High-contrast graphic realism with restrained screen-printed grain. No text,
> captions, HUD, logos, watermark, random tentacles, glossy generic sci-fi,
> explicit nudity, genital forms, sexual acts, gore, or malformed machinery.

Every asset-specific prompt must add its exact framing, safe area, seam,
runtime state, and output dimensions.
