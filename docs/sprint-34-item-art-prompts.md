# Sprint 34 Item Art — Generation Prompts

Companion to [the loadout design](planning/cosmetic-loadout-gameplay-design-2026-09-10.md).
Covers **8 new rig modules** and **42 cosmetic set pieces** (6 sets × 7 slots).
Format follows [the existing prompt catalog](complete-placeholder-asset-and-generation-prompt-catalog.md).

## Shared art direction

**H.R. Giger meets gothic film noir, in a biohybrid deep-space bunker.**

The through-line is *grown, not built* — machinery that looks gestated. Ribbed
conduit that reads as vertebrae, tubing that reads as tendon, chrome that
sweats. "Sensual" here means **tactile and organic**: long unbroken curves,
wet-latex sheen, the suggestion of breath under a surface. Never ornamental,
never cute, never sexualised — the eroticism in Giger is *material*, and that is
the register.

The noir half supplies restraint the biology would otherwise overwhelm:

- **Light is a single hard source** from a low angle, carving one bright edge
  and letting the rest fall into near-black. Venetian-blind and grate shadows
  where a surface can carry them.
- **Value over hue.** Palettes are near-monochrome — wet black, bone, gunmetal,
  tarnished silver — with exactly one saturated accent per set. That accent is
  the only colour allowed to glow.
- **Moisture everywhere.** Condensation, oil bloom, a film of damp. Nothing in
  this world is dry.
- **Age is decay, not dust.** Corrosion that looks like disease; scratches that
  read as scars.

Deliberately avoid: bright even lighting, primary colours, clean sci-fi
minimalism, cartoon proportions, glowing seams for their own sake.

## Shared technical spec

Every prompt below assumes, and should be suffixed with:

> Isolated on a neutral dark-grey background, single hard low-key key light,
> no text, no logos, no watermark, no character unless specified, no scenery,
> high-detail PBR materials, physically plausible construction, GLB-ready.

- **Static hero shot**, three-quarter view unless the entry says otherwise.
- **Weapons:** full side profile, muzzle pointing left (matches 4100–4111).
- **Operator skins:** full body, symmetrical T-pose, no weapon, no floating helmet.
- **Charms/modules:** isolated object, scale-neutral, mounting hardware visible.
- **Patches:** flat-on, square, as a physical embroidered or etched object.
- **FX plates** (sheen/tracer/HUD) are single reference frames, not meshes —
  they specify a look for a shader to match, exactly as noted for 4152/4153.

---

# Part 1 — Rig Modules (earned, never sold)

Physical hardware that bolts into the suit's rig. These should look **surgical**
— implants more than accessories. Visible mounting collars, sealed ports, the
implication that removing one would hurt.

#### Itemdef 4160 — Ballast Plating

> Static hero shot of a heavy counterweight suit plate, three-quarter view. Thick
> layered gunmetal slabs bolted through a ribbed black harness that reads like a
> spine section, dense tungsten core visible through a machined inspection slot,
> condensation beading in the seams, one hard rim light along the top edge and
> deep black beneath. Weight communicated through sag in the mounting straps.

#### Itemdef 4161 — Scrap Furnace

> Static hero shot of a compact back-mounted smelting unit, three-quarter view.
> Blackened iron crucible ringed by tarnished copper coils, a small grated
> aperture with dull orange interior heat, soot bloom fanning up the housing,
> greasy runoff staining the lower plates, ribbed exhaust tubing curling away
> like intestine. Heat kept low and contained, not flaring.

#### Itemdef 4162 — Queen's Bane

> Static hero shot of a barbed injector module grown from alien carapace and
> surgical steel, three-quarter view. Chitinous black shell with an iridescent
> oil-slick sheen, three tapered needles seated in a wet sphincter-like port,
> a sealed ampoule of pale luminous fluid, steel armature clamping the organic
> body like a restraint. Beautiful and clearly hostile.

#### Itemdef 4163 — Archivist Lens

> Static hero shot of a monocular scanning lens on an articulated arm,
> three-quarter view. Tarnished brass barrel, scratched sapphire optic with a
> faint amber inner reflection, engraved index rings worn smooth by use, a
> ribbed rubber eyecup perished with age, thin cabling braided like sinew.
> Antique instrument in a machine that should not have antiques.

#### Itemdef 4164 — Shard Conduit

> Static hero shot of a crystal routing module, three-quarter view. Black
> machined housing cradling three suspended shards of deep-violet mineral,
> hairline fractures lit from within, frost creeping outward across the metal
> from each mount, fine silver filament tracing between the shards like a
> nervous system. Cold, still, faintly humming.

#### Itemdef 4165 — Duplicate Refiner

> Static hero shot of a compact matter-reclamation drum, three-quarter view.
> Dull steel cylinder with a smeared observation window showing grey slurry
> mid-process, heavy clamp ring, corroded drainage spout with dried residue
> crust, ribbed feed hose entering the top like a throat. Industrial, unglamorous,
> faintly repulsive.

#### Itemdef 4166 — Pressure Seal

> Static hero shot of a chest-mounted rebreather seal, three-quarter view. Thick
> black rubber diaphragm ringed by a bone-white ceramic collar, brass valve
> stems weeping condensation, a pressure dial with a cracked glass face, ribbed
> hose stubs suggesting the shape of a ribcage. The diaphragm should look like
> it is mid-breath.

#### Itemdef 4167 — Deep Anchor

> Static hero shot of a heavy descent anchor module, three-quarter view. Pitted
> cast-iron body with a spooled black cable drum, four splayed gripping claws
> tipped in worn tungsten, barnacle-like mineral growth crusting the underside,
> a single dim green depth indicator recessed in the housing. Deep-sea salvage
> hardware that has been much deeper than it should have.

---

# Part 2 — Cosmetic Sets

Each set is one identity across seven slots. Accent colour is stated per set and
is the **only** saturated colour permitted in its pieces.

## Set 1 — Deep Frost · accent: pale cyan-white

#### 4200 — Deep Frost Operator Skin
> Full-body operator exosuit in symmetrical T-pose. Rime-crusted matte black
> plating with frost blooming outward from every joint, fogged visor showing no
> face, ribbed insulation tubing sheathed in ice, condensation running down the
> chestplate, pale cyan-white glow bleeding faintly through the frost seams.

#### 4201 — Deep Frost Weapon Skin
> Full side-profile weapon, muzzle left. Gunmetal receiver sheathed in a skin of
> clear ice, frost feathering across the barrel shroud, exposed cooling fins
> caked white, pale cyan vapour caught venting from the breech, grip wrapped in
> frozen leather cord gone stiff and cracked.

#### 4202 — Deep Frost Charm
> Isolated small hanging charm: a teardrop of clear glacial ice suspended in a
> tarnished silver claw mount, a single dark object frozen at its centre and
> unidentifiable, hairline fractures catching pale cyan light, meltwater beading
> at the tip. Fine chain visible at the mounting ring.

#### 4203 — Deep Frost Patch
> Flat-on square embroidered patch, physical object. Bone-white thread on
> black wool, stylised ice crown motif with a fractured centre, pale cyan
> metallic thread picking out the fracture lines, frayed edges, one corner
> stiff with old moisture damage.

#### 4204 — Deep Frost Sheen *(FX reference plate)*
> Single reference frame of a weapon surface treatment: wet ice over dark metal,
> specular highlight scattering into a soft cyan-white bloom, subsurface glitter
> in the frost layer, highlight travelling as a slow band rather than a hard
> glint.

#### 4205 — Deep Frost Tracer *(FX reference plate)*
> Single reference frame of a projectile trail: a thin pale cyan-white ribbon
> with a crystalline leading edge, shedding fine frost particulate that hangs
> and drifts, cold light with no warm falloff, dissipating into vapour.

#### 4206 — Deep Frost HUD *(FX reference plate)*
> Single reference frame of a HUD theme: pale cyan-white vector linework on
> near-black, frost creeping inward from the panel corners, readouts slightly
> fogged as if seen through cold glass, thin condensation streaks over the type.

## Set 2 — Rust & Bone · accent: dull ember orange

#### 4207 — Rust & Bone Operator Skin
> Full-body operator exosuit in symmetrical T-pose. Scavenged plate armour in
> mismatched corroded steel lashed with leather cord, carved bone reinforcement
> at the shoulders and shins, oxidised welds bleeding rust streaks, a dull ember
> glow from a cracked chest furnace port, layered rags stiff with grime.

#### 4208 — Rust & Bone Weapon Skin
> Full side-profile weapon, muzzle left. Pitted cast-iron receiver, carved
> ivory-bone stock with fine hairline age cracks, wrapped leather cord grip
> darkened with use, dull ember heat visible in the exposed chamber, rust
> blooming around every fastener.

#### 4209 — Rust & Bone Charm
> Isolated small hanging charm: a spent heavy-calibre casing, tarnished and
> dented, capped with a carved bone finial, bound with waxed cord gone black
> with handling, faint ember light caught inside the casing mouth.

#### 4210 — Rust & Bone Patch
> Flat-on square patch, physical object. Rough hessian backing, hand-stitched
> bone-white thread forming a crossed femur and wrench motif, dull ember thread
> underlining it, edges deliberately unfinished and fraying, an old dark stain
> across one corner.

#### 4211 — Rust & Bone Sheen *(FX reference plate)*
> Single reference frame of a weapon surface treatment: oxidised iron with an
> oily film, highlight breaking up into a mottled scatter rather than a clean
> line, dull ember warmth pooling in the pitting, no polish anywhere.

#### 4212 — Rust & Bone Tracer *(FX reference plate)*
> Single reference frame of a projectile trail: a short heavy dull-ember streak
> with visible sparks shedding downward, smoke curling in the wake, more
> ballistic than energetic, dying fast.

#### 4213 — Rust & Bone HUD *(FX reference plate)*
> Single reference frame of a HUD theme: dull ember monospaced type on
> near-black, panel borders drawn as riveted metal strips, faint scanline
> flicker, one corner readout partially corroded and illegible.

## Set 3 — Hive Chitin · accent: sickly bioluminescent green

#### 4214 — Hive Chitin Operator Skin
> Full-body operator exosuit in symmetrical T-pose. Living alien carapace fused
> over a human frame, wet black chitin with an oil-slick iridescence, ribbed
> segmentation following the ribcage and spine, sickly green bioluminescence
> pulsing in the seams between plates, faint translucent membrane at the joints.

#### 4215 — Hive Chitin Weapon Skin
> Full side-profile weapon, muzzle left. Firearm grown rather than machined —
> chitinous shell casing, a barrel that tapers like a stinger, ribbed organic
> foregrip, sickly green luminescence deep inside the chamber, a wet sheen
> across the whole surface, faint veining beneath the shell.

#### 4216 — Hive Chitin Charm
> Isolated small hanging charm: a single translucent alien egg no larger than a
> fist, amber-green inner glow, a dark curled embryo shadow visible within, wet
> membrane highlights, suspended in a cradle of black chitin hooks.

#### 4217 — Hive Chitin Patch
> Flat-on square patch, physical object. Not embroidered but grown — a plate of
> thin dried carapace, sickly green veining forming a stylised hive-queen
> silhouette, edges organic and irregular, a faint wet sheen still on the
> surface.

#### 4218 — Hive Chitin Sheen *(FX reference plate)*
> Single reference frame of a weapon surface treatment: wet chitin with heavy
> oil-slick iridescence, highlight smearing into greens and violets as the angle
> shifts, subsurface scatter suggesting depth beneath the shell.

#### 4219 — Hive Chitin Tracer *(FX reference plate)*
> Single reference frame of a projectile trail: a sickly green organic ribbon
> with a slight irregular waver rather than a straight line, shedding fine spore
> particulate that drifts and settles, faint afterglow that lingers too long.

#### 4220 — Hive Chitin HUD *(FX reference plate)*
> Single reference frame of a HUD theme: sickly green readouts on near-black,
> panel edges overgrown with fine organic veining, type slightly irregular as if
> the interface is alive, a slow pulse in the brightness like breathing.

## Set 4 — Horizon Corporate · accent: cold teal

#### 4221 — Horizon Corporate Operator Skin
> Full-body operator exosuit in symmetrical T-pose. Pristine white composite
> plating with cold teal trim, precise panel gaps, mirror-polished visor
> reflecting a hard light source, immaculate seals and gaskets, subtle corporate
> geometry moulded into the chest. Clinical and unsettlingly clean — the only
> dry object in the game.

#### 4222 — Horizon Corporate Weapon Skin
> Full side-profile weapon, muzzle left. White ceramic shell over brushed steel,
> cold teal indicator strip along the receiver, flawless machined tolerances,
> factory-fresh with a single hairline scuff, sterile precision rather than
> field wear.

#### 4223 — Horizon Corporate Charm
> Isolated small hanging charm: a machined white ceramic identification fob with
> a cold teal inlay, corporate serialisation etched in fine relief but
> unreadable, suspended on a precise steel ball chain, one edge chipped to reveal
> grey substrate beneath.

#### 4224 — Horizon Corporate Patch
> Flat-on square patch, physical object. Crisp white twill, cold teal machine
> embroidery forming a clean geometric horizon-line mark, laser-cut edges,
> immaculate stitching, deliberately impersonal.

#### 4225 — Horizon Corporate Sheen *(FX reference plate)*
> Single reference frame of a weapon surface treatment: polished white ceramic,
> a single tight specular highlight travelling cleanly across the surface, cold
> teal fresnel at grazing angles, no grit and no scatter.

#### 4226 — Horizon Corporate Tracer *(FX reference plate)*
> Single reference frame of a projectile trail: a precise cold teal line with
> hard clean edges, minimal particulate, a brief geometric flare at the muzzle
> end, disciplined and instrument-like.

#### 4227 — Horizon Corporate HUD *(FX reference plate)*
> Single reference frame of a HUD theme: cold teal on white-grey, generous
> spacing, precise thin rules and a clinical grid, corporate legibility taken to
> an uncomfortable extreme.

## Set 5 — Bunker 404 · accent: magenta signal-error

#### 4228 — Bunker 404 Operator Skin
> Full-body operator exosuit in symmetrical T-pose. Matte black suit whose
> surface glitches — bands of displaced texture, corrupted panel geometry,
> sections that read as missing data, magenta signal-error light bleeding from
> the fractures, visor showing static rather than reflection.

#### 4229 — Bunker 404 Weapon Skin
> Full side-profile weapon, muzzle left. Dark receiver with sections of the
> surface displaced sideways as if mid-corruption, magenta error banding across
> the barrel shroud, one component rendered as flat untextured geometry, wiring
> that terminates in nothing.

#### 4230 — Bunker 404 Charm
> Isolated small hanging charm: a corrupted memory card, casing cracked, contacts
> tarnished, its printed label glitched into unreadable banding, faint magenta
> light leaking from the fracture, hanging from a frayed ribbon cable.

#### 4231 — Bunker 404 Patch
> Flat-on square patch, physical object. Black twill with magenta thread forming
> a squad insignia that breaks apart into displaced blocks halfway across, half
> the stitching missing entirely, backing visible through the gap.

#### 4232 — Bunker 404 Sheen *(FX reference plate)*
> Single reference frame of a weapon surface treatment: dark metal with the
> specular highlight tearing into horizontal displaced bands, magenta chromatic
> fringing at the tear edges, the reflection failing to resolve.

#### 4233 — Bunker 404 Tracer *(FX reference plate)*
> Single reference frame of a projectile trail: a magenta line that stutters
> rather than flows, breaking into discrete displaced segments, brief chromatic
> ghosting alongside, terminating abruptly.

#### 4234 — Bunker 404 HUD *(FX reference plate)*
> Single reference frame of a HUD theme: magenta on near-black, elements
> occasionally displaced from their anchors, one panel showing an unresolved
> placeholder, intermittent horizontal tearing across the readouts.

## Set 6 — Grand Marshal · accent: warm amber gold

#### 4235 — Grand Marshal Operator Skin
> Full-body operator exosuit in symmetrical T-pose. Blackened meteorite-alloy
> plating chased with warm amber gold filigree, heavy ceremonial pauldrons,
> a gorget of laurel worked in tarnished gilt, deep engraving carrying centuries
> of soot in its recesses, restrained and funereal rather than triumphant.

#### 4236 — Grand Marshal Weapon Skin
> Full side-profile weapon, muzzle left. Dark meteorite-alloy receiver inlaid
> with amber gold scrollwork, an engraved laurel band around the barrel, aged
> ivory grip panels yellowed with handling, gilt worn thin at every contact
> point. A ceremonial object that has still been used.

#### 4237 — Grand Marshal Charm
> Isolated small hanging charm: a struck amber-gold medallion bearing a
> double-headed eagle in high relief, the gilt rubbed through to dark alloy on
> the raised surfaces, suspended from a short length of tarnished chain, one
> edge visibly nicked.

#### 4238 — Grand Marshal Patch
> Flat-on square patch, physical object. Deep black velvet backing, dense amber
> gold bullion embroidery forming a laurel-framed relic crest, raised padded
> stitching catching the light, the gold slightly tarnished and dulled with age.

#### 4239 — Grand Marshal Sheen *(FX reference plate)*
> Single reference frame of a weapon surface treatment: dark alloy with amber
> gold inlay, the highlight catching only the gilt and leaving the alloy near
> black, warm anisotropic streak along the engraving direction.

#### 4240 — Grand Marshal Tracer *(FX reference plate)*
> Single reference frame of a projectile trail: a warm amber gold streak with a
> soft heavy glow, slight downward sag suggesting mass, gilt-coloured embers
> shedding and fading slowly.

#### 4241 — Grand Marshal HUD *(FX reference plate)*
> Single reference frame of a HUD theme: warm amber gold on deep black,
> serif-inflected type, panel borders drawn as fine engraved rules with laurel
> corner motifs, ceremonial and archival rather than tactical.

---

## Production notes

- **ID range:** 4160–4167 (modules), 4200–4241 (sets). Existing catalog ends at
  4159, so nothing collides.
- **Rig modules must never enter the tradable catalog.** They are Track A; see
  the design doc. Cosmetics here are Track B and tradable.
- The 18 FX reference plates are **look targets for shaders**, not meshes —
  same handling already documented for 4152/4153.
- Follow the existing acceptance checklist in
  [the prompt catalog](complete-placeholder-asset-and-generation-prompt-catalog.md):
  silhouette at gameplay scale, mount alignment, emissive values, GLB budget,
  runtime map entry, and 2D icon consistent with the 3D material language.
