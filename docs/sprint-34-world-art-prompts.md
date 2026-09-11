# Sprint 34 World Art — Dark Deco · Jugendstil · Giger

Companion to [the item prompts](sprint-34-item-art-prompts.md). Where that
document dresses the player, this one builds the place they are standing in.

## Why these three styles actually fuse

They are not three looks stapled together — each governs a different layer, and
they are historically adjacent enough to sit in one frame.

| Style | Governs | Contributes |
| --- | --- | --- |
| **Dark Deco** | **Structure** | Symmetry, stepped ziggurat massing, strong verticals, chevron and sunburst geometry, monumentality. The bones. |
| **Jugendstil** | **Ornament** | Whiplash curves, iron tendrils, vines that ignore the grid, asymmetric flow over symmetric structure. The line. |
| **Giger** | **Material** | Biomechanical fusion, ribbing as anatomy, wet chitin, tubing as tendon. The skin, and the unease. |

The working rule, in order:

> **Deco decides the shape. Jugendstil decides the line across it. Giger decides
> what it is made of.**

A doorway is a stepped Deco arch; a Jugendstil vine of wrought iron runs up its
jamb; both are grown from wet ribbed chitin rather than cut from stone. That
sequence keeps the fusion legible instead of muddy — and it means an artist can
check any asset by asking which layer they got wrong.

**The tension that makes it work:** Deco is confident and man-made, Giger is
inevitable and biological. The bunker was built by people who believed in
order, and something else has been finishing their work.

## Shared direction

- **Palette:** near-monochrome — black lacquer, tarnished brass, bone, wet
  gunmetal. One accent per room theme, and it is the only thing that glows.
- **Light:** single hard low-key source. Grates, fretwork and vine ironwork
  exist to throw patterned shadow; that is half their job.
- **Symmetry, then violation.** Compose symmetrically, then let the organic
  layer break it in exactly one place. The break is where the eye goes.
- **Everything is damp.** Condensation in the recesses, oil bloom on brass.
- **No readable text or signage** anywhere.

Deliberately avoid: clean sci-fi panelling, exposed RGB strip lighting, bright
even fill, rectilinear repetition without ornament, cheerful colour.

## Shared technical spec

Suffix every prompt with:

> Isolated on a neutral dark-grey background, single hard low-key key light,
> no text, no logos, no watermark, no characters, high-detail PBR materials,
> physically plausible construction, GLB-ready.

Modular kit pieces additionally: **flat-on orthographic front view, seams at tile
boundaries, designed to tile with its neighbours.**

---

# Part 1 — Architecture kit

The single largest gap. The world currently has wall and floor *textures* but no
architectural *vocabulary* — nothing that says a person designed this room.
These are modular and should tile.

#### `arch_deco_doorway`
> Modular doorway arch, flat-on orthographic. Stepped ziggurat crown in black
> lacquered metal, brass fluting running the full height of both jambs, a
> Jugendstil wrought-iron vine curling asymmetrically up the left jamb only,
> the whole frame seated in wet ribbed chitin that swallows its base. Threshold
> worn hollow by traffic.

#### `arch_deco_archway_grand`
> Wide ceremonial archway, flat-on orthographic. Three receding stepped orders
> in blackened brass, a fan-motif keystone, iron tendrils spilling from the
> apex and running down both spandrels, chitinous ribbing visible where the
> plaster has failed. Monumental, funereal, slightly too large for people.

#### `arch_rib_ceiling_vault`
> Ceiling vault section, viewed from below. Paired structural ribs meeting at a
> spine, Deco chevron coffering between them, the ribs themselves anatomically
> segmented like a thorax, brass boss at each junction, condensation hanging in
> the recesses. Symmetrical, with one rib visibly fused and swollen.

#### `arch_column_fluted`
> Freestanding structural column, three-quarter view. Fluted black lacquer shaft
> on a stepped brass base, a Jugendstil capital of iron leaves that have grown
> rather than been cast, the upper third sheathed in wet chitin that has crept
> down from the ceiling. Load-bearing and clearly diseased.

#### `arch_wall_panel_relief`
> Modular wall panel, flat-on orthographic. Low-relief Deco sunburst radiating
> from a central boss, brass inlay tarnished to green in the recesses, a fine
> iron vine tracing across the rays at an angle that ignores their symmetry,
> hairline fractures leaking dark moisture.

#### `arch_wall_panel_grille`
> Modular ventilation wall panel, flat-on orthographic. Deco fretwork grille in
> blackened brass over a dark void, chevron pattern, Jugendstil curves softening
> two corners, wet chitinous growth pushing through from behind in one cell of
> the grid. Designed to throw a hard patterned shadow.

#### `arch_stair_flight`
> Short stair flight, three-quarter view. Stepped black stone treads with brass
> nosing worn bright by feet, a Jugendstil ironwork balustrade of curling stems,
> the underside of the flight ribbed and organic as if the stair were a spine
> seen from beneath.

#### `arch_floor_medallion`
> Circular floor medallion, viewed from directly above. Radiating Deco inlay in
> brass and black terrazzo, concentric bands, a Jugendstil whiplash motif
> breaking the radial symmetry on one side, the centre swollen and cracked where
> something has grown up through it. Standing water in the low points.

#### `arch_pillar_buttress`
> Wall buttress, three-quarter view. Stepped Deco massing in dark stone, brass
> banding at each set-back, the whole form sheathed in taut biomechanical
> tendon that pulls between the steps like ligament under strain.

#### `arch_bulkhead_frame`
> Heavy bulkhead frame, flat-on orthographic. Riveted blackened steel with Deco
> stepped corners, brass locking wheel at centre, iron vine ornament along the
> upper edge, chitinous gasket material seated in the seal — wet, and looking
> more grown than fitted.

#### `arch_window_stained`
> Interior window, flat-on orthographic. Deco geometric leading in blackened
> brass, stained glass in bone, amber and deep green, the Jugendstil panel at the
> centre depicting an abstract vine, one pane replaced by a stretched translucent
> membrane with veining visible through it. Backlit.

#### `arch_niche_shrine`
> Recessed wall niche, flat-on. Stepped Deco surround in brass, a small empty
> plinth, iron tendrils framing the opening, the back of the niche entirely
> overtaken by wet ribbed growth. Something was venerated here and is not any more.

---

# Part 2 — Fixtures and ornament

Objects that establish the world had designers with taste before it had a
problem.

#### `fixture_sconce_vine`
> Wall sconce, three-quarter view. Brass Jugendstil stem curling out of the wall
> ending in a frosted glass bud, Deco stepped backplate, the stem visibly
> continuing *into* the wall as tendon rather than terminating in a fixing.
> Warm dim light contained in the bud.

#### `fixture_chandelier_ribbed`
> Hanging light fixture, three-quarter view. Tiered Deco brass frame in
> descending stepped rings, frosted glass rods hanging like ribs, Jugendstil
> ironwork spider at the ceiling rose, one tier fused and drooping where organic
> growth has taken the frame.

#### `fixture_pipe_organ_conduit`
> Wall-mounted conduit cluster, three-quarter view. Ranked brass pipes of graded
> length in Deco arrangement, joined by curling iron collars, the whole assembly
> breathing — pipes swollen at irregular intervals like a throat, condensation
> running down the ranks.

#### `fixture_clock_dead`
> Wall clock, flat-on. Deco sunburst surround in tarnished brass, bone-white
> face, no numerals, elegant hands stopped, Jugendstil vine growing across the
> glass from a crack at four o'clock, faint organic pulse visible behind the
> face.

#### `fixture_railing_run`
> Modular railing section, flat-on orthographic. Jugendstil wrought-iron stems
> and buds between Deco stepped brass posts, the ironwork asymmetric along its
> length, one section fused into a single organic mass. Designed to tile.

#### `fixture_floor_grate`
> Floor grate, viewed from directly above. Deco chevron fretwork in blackened
> brass, dark void beneath, faint movement implied below, wet chitinous growth
> pushing up through two cells, standing water pooled at one edge reflecting the
> key light.

#### `fixture_mirror_tarnished`
> Wall mirror, flat-on. Stepped Deco brass frame, Jugendstil floral corner
> motifs, the silvering almost entirely failed into black blooms so the mirror
> reflects nothing, a hairline organic vein tracking across the surface from the
> lower corner.

#### `fixture_vent_hood`
> Extraction hood, three-quarter view. Deco stepped brass cowl over a dark
> aperture, iron vine ornament along the leading edge, the inner throat lined
> with wet ribbed tissue, grease and dark residue running from the mouth.

---

# Part 3 — Lived-in surface decals

Currently only **four** exist (`LIVED_IN_DECALS` in `roomThemes.js`). Surface
storytelling is the cheapest density the world can get. All are flat-on,
square, transparent-background overlays.

#### `decal_scorch_bloom`
> Flat-on square decal, transparent background. Radial scorch bloom on painted
> metal, paint blistered and curled at the centre, brass showing through where
> the heat was worst, soot feathering asymmetrically outward. No object, decal only.

#### `decal_hand_smears`
> Flat-on square decal, transparent background. Repeated dark handprints and
> drag smears at grab height, layered over each other at different ages, the
> newest wettest. Desperate rather than decorative.

#### `decal_growth_creep`
> Flat-on square decal, transparent background. Wet chitinous growth creeping
> across a flat surface from one corner, fine veining at the leading edge,
> semi-translucent where thin, following the surface rather than sitting on it.

#### `decal_water_stain`
> Flat-on square decal, transparent background. Long vertical water staining with
> mineral crusting at the lower edge, tide-marks recording several different
> flood heights, paint failed in the wettest band.

#### `decal_rust_bleed`
> Flat-on square decal, transparent background. Rust bleeding downward from a
> fastener line, orange-brown streaking over black lacquer, the metal beneath
> visibly thinned and pitted at the source.

#### `decal_vine_iron_shadow`
> Flat-on square decal, transparent background. The hard cast shadow of
> Jugendstil vine ironwork, cleanly patterned, as thrown by a single low light —
> for laying over walls to imply a fixture off-frame.

#### `decal_graffiti_tally`
> Flat-on square decal, transparent background. Scratched tally marks in groups
> of five, hundreds of them, cut into painted metal with something improvised,
> the count trailing off partway across. No letters, no numerals.

#### `decal_grease_pool`
> Flat-on square decal, transparent background. Dark oil pooled and spread on a
> floor, iridescent film catching light at the thin edges, one boot-print
> tracking out of it and fading over three steps.

#### `decal_frost_bloom`
> Flat-on square decal, transparent background. Feathered frost crystals blooming
> outward from a seam, denser at the source and fading to fine needles, faint
> pale cyan cast in the thickest ice.

#### `decal_spore_dust`
> Flat-on square decal, transparent background. Fine settled spore dust drifted
> into a corner and along a ledge, sickly green, slightly clumped where damp,
> faint luminescence in the deepest accumulation.

---

# Part 4 — Aftermath and damage states

The world audit flagged that the bunker never visibly records what happened in
it. These are state variants, not new objects.

#### `state_wall_breached`
> Blown-through wall section, three-quarter view. Deco panelling torn open, brass
> fluting bent outward, rebar and structural rib exposed and splayed, wet
> chitinous tissue visible in the cavity behind, debris cone on the floor.

#### `state_column_shattered`
> Failed structural column, three-quarter view. Fluted shaft snapped mid-height,
> upper section hanging from exposed anatomical ribbing, brass base buckled,
> rubble and dust settled around the foot.

#### `state_fixture_torn`
> Torn-out wall fixture, three-quarter view. Empty Deco backplate with the sconce
> ripped away, severed brass stem weeping fluid, exposed tendon retracted into
> the wall cavity, scorch radiating from the wound.

#### `state_floor_collapsed`
> Collapsed floor section, viewed from above at a slight angle. Terrazzo medallion
> broken inward around a dark void, brass inlay bent down into the hole, ribbed
> organic structure visible in the shaft below catching a little light.

#### `state_barricade_improvised`
> Improvised barricade, three-quarter view. Deco furniture and torn wall panels
> stacked and lashed with cable, brass ornament still visible on the wreckage,
> firing gap left at one side, scorching on the outward face only.

#### `state_growth_overrun`
> Fully overrun room corner, three-quarter view. Deco architecture almost entirely
> consumed by wet ribbed growth, only a brass capital and a fragment of fluting
> still legible, tendon strung across the corner, the original geometry readable
> only as a ghost beneath.

---

# Part 5 — Placeholder replacements

Nine flat vector placeholders are still live in `public/`. These replace them in
the fused style; see
[the remaster audit](placeholder-asset-remaster-audit.md).

#### `prop_camp_cot` *(replaces `prop_camp_cot.svg`)*
> Field cot, three-quarter view. Blackened iron frame with Jugendstil curved
> head-rail, stretched canvas gone grey and stained, a folded blanket, Deco
> stepped feet, one leg splinted with cable. Slept in recently.

#### `prop_camp_crate` *(replaces `prop_camp_crate.svg`)*
> Supply crate, three-quarter view. Dark timber banded with tarnished brass
> corners in Deco stepped profile, stencil-free, lid slightly ajar, damp swelling
> the boards, a faint organic bloom starting along one seam.

#### `prop_hive_resin_sac` *(replaces `prop_hive_resin_sac.svg`)*
> Hanging resin sac, three-quarter view. Translucent amber-green membrane
> stretched over a dark mass, wet surface highlights, ribbed attachment throat
> fused to the ceiling, fluid pooling at the low point and about to drip.

#### `scatter_bolts` *(replaces `scatter_bolts.svg`)*
> Small scatter pile of hardware, viewed from above. Brass and blackened steel
> bolts, washers and fixings, tarnished unevenly, a few showing Deco knurling,
> scattered with one or two half-buried in dust.

#### `scatter_cable_coil` *(replaces `scatter_cable_coil.svg`)*
> Coiled cable, viewed from above. Heavy braided cable in dark rubber, brass
> ferrules at the visible ends, the coil relaxed and untidy, one length of it
> visibly organic — sheathing given way to bare tendon.

#### `fx_spark_burst` *(replaces `fx_spark_burst.svg`)*
> Single reference frame of an electrical spark burst: hot white core, brass-warm
> mid-tones, sparks shedding in an irregular fan and dying fast, brief
> illumination on nearby damp surfaces. Transparent background.

#### `fx_steam_puff` *(replaces `fx_steam_puff.svg`)*
> Single reference frame of a steam release: dense white-grey vapour venting
> under pressure then billowing and thinning, lit hard from one side leaving the
> far half in shadow, condensation implied. Transparent background.

#### `body_empty_exosuit` *(replaces `body_empty_exosuit.svg`)*
> Empty exosuit slumped against a wall, three-quarter view. Deco stepped chest
> plating in tarnished brass and black lacquer, visor dark and open, the suit
> collapsed as if the occupant were removed rather than killed, fine organic
> threading growing out of the neck seal.

#### `body_human_frozen` *(replaces `body_human_frozen_suit.svg`)*
> Frozen figure, three-quarter view. Seated against a wall, rimed over entirely,
> features obscured by ice, Deco suit detailing just legible beneath the frost,
> pale cyan cast in the thickest ice, posture composed rather than agonised.

---

## Production notes

- **45 assets:** 12 architecture, 8 fixtures, 10 decals, 6 aftermath states,
  9 placeholder replacements (two of which are FX reference plates, not meshes).
- Architecture and railing pieces are **modular and must tile**; everything else
  is a standalone hero object.
- Decals extend `LIVED_IN_DECALS` in `src/roomThemes.js`, which currently holds
  only four entries — wire new ones there or they will not appear.
- New 3D props must be added to `WORLD_3D_MODELS` in `src/world3dOverlay.js`
  before they are considered complete; the map is the source of truth and an
  unregistered GLB is invisible.
- Follow the acceptance checklist in
  [the prompt catalog](complete-placeholder-asset-and-generation-prompt-catalog.md):
  silhouette at gameplay scale, alignment, emissive values, GLB budget, runtime
  map entry, 2D/3D material consistency.
- Retail payload has ~37 MB headroom against the 2,700 MiB gate. Budget these
  accordingly and re-run `npm run audit:retail-assets` before committing art.
