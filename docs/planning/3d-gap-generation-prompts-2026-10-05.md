# 3D gap generation prompts (2026-10-05)

Status: ready to generate | Source of truth for the gap list:
`docs/reports/2d-to-3d-gap-audit-2026-10-05.md` and `src/data/world3dCandidates.js`.

These are the props still drawn in 2D because no GLB depicts them. Each one has
been checked against the full model registry and the side-by-side review row in
the debug museum; nothing here is a renaming job.

Prompts follow the house style that produced the props you already passed:
the aesthetic constitution in `docs/3d-asset-master-backlog-and-prompts.md` §1
(Giger × Event Horizon, restrained palette, one emissive accent) and the
technical suffix from `docs/sprint-34-world-art-prompts.md`. Where the master
backlog already had a one-line concept, the prompt below expands it, and the
section is cited.

**Add this suffix to every prompt:**

> Isolated on a neutral dark-grey background, single hard low-key key light,
> no text, no logos, no watermark, no characters, high-detail PBR materials,
> physically plausible construction, clean flat ground-contact underside,
> GLB-ready, 5k–15k triangles.

**Delivery:** drop each GLB in `art/raw/` (not `public/`). The pipeline
optimizes it into `public/3d/runtime/new3ds/<file>`, registers it in
`WORLD_3D_MODELS`, and the type turns 3D with no other change.

Priority is by how often players see it (counts from the six-area runtime audit).

---

## Tier 1 — the cave and hive floor (seen hundreds of times a run)

### 1. Hatched egg shells — `prop_cave_eggs_hatched.glb`
Seen: 45 in the audit. Height ~0.6 m. Backlog §6.7 concept.
> Full 3D environment prop of a clutch of four ruptured alien egg casings on cave
> rock. Leathery pale-olive shells split open from the inside in petal-like flaps,
> torn membranes hanging, thin translucent vascular veins across the hide, a
> shallow pool of glossy amber-green amniotic fluid gathered between them, one
> casing collapsed flat. Wet mucosal sheen against dry pitted stone. Faint
> bioluminescent emerald (#10b981) residue inside the empty shells only.

### 2. Intact egg cluster — `prop_cave_eggs_intact.glb`
Seen: 38. Height ~0.7 m. Backlog §6.7 concept.
> Full 3D environment prop of a dense cluster of five unhatched alien eggs rooted
> to cave rock by fibrous resin cords. Rubbery pale-green ovoid hides with
> prominent raised vascular veins, the tops creased in a four-way seam that has
> not yet opened, a faint emerald (#10b981) glow pulsing through the thinnest
> membrane. Glossy wet surface, dried resin crust at the base. Organic, heavy,
> dormant.

### 3. Floor egg clutch — `scatter_hive_eggs.glb`
Small scatter version, height ~0.3 m. Backlog §9.1 concept.
> Full 3D scatter prop of a small floor clutch of three sticky alien eggs bound
> together by strands of glistening mucosal webbing on a thin smear of resin.
> Pale olive hides with dark veins, no glow, low and flat so it reads from above.

### 4. Web canopy — `prop_cave_webs.glb`
Seen: 38. Height ~1.6 m, ~2 m wide. Backlog §6.7 concept.
> Full 3D environment prop of thick layered hive webbing strung between two
> broken struts, one of calcified bone and one of rusted rebar. Ropes of grey-white
> silk-resin sag in heavy catenary curves with dew-like droplets of fluid, a few
> desiccated husks caught in the weave, the web anchored with knotted resin
> nodules where it meets the struts. Translucent where thin, opaque where packed.

### 5. Wounded hive wall — `prop_cave_hive_wounded.glb`
Seen: 37. Height ~1.1 m. Backlog §6.7 concept. (The current sprite is not usable.)
> Full 3D environment prop of a section of living hive wall torn open: a ragged
> fleshy breach in ribbed chitin plating, the wound edges curled back and raw
> plum-red, oozing thick black bio-plasma down the face into a pool at the base,
> severed tubular veins hanging from the tear. Dark wet chitin outside, glossy raw
> tissue inside. Free-standing slab with a flat back.

### 6. Spore pod emitter — `prop_cave_spores.glb` *(optional)*
Seen: 39. Height ~0.9 m. Backlog §6.7. Review candidate `prop_fungal_spore_dispenser`
is a weak match (framed pod, not a puffball); generate this if you reject it.
> Full 3D environment prop of a bulbous fungal puffball spore pod growing from cave
> rock. Bony, ridged ivory outer shell with three open chimney vents at the crown,
> emerald (#10b981) bioluminescent spore dust collected at each vent lip, ribbed
> gill folds visible inside the vents, smaller sibling pods budding at the base.

### 7. Spore colony — `prop_spore_colony.glb` *(optional)*
Seen: 32. Height ~0.8 m. Same review candidate as above.
> Full 3D environment prop of a mound-shaped spore colony: dozens of small glossy
> green spherical fruiting bodies packed tightly together over a web of pale root
> threads, the tallest at the centre, emerald (#10b981) glow inside the youngest
> bulbs only, root threads spreading out across the ground plane.

### 8. Cave lichen — `prop_cave_lichen.glb` *(optional)*
Seen: 19. Height ~0.3 m, flat spread. Backlog §6.7. Review candidates are wall slabs, not ground growth.
> Full 3D environment prop of a low, flat colony of bioluminescent cave lichen
> spreading over a jagged stone slab. Overlapping crusty rosettes in cold
> cyan-blue (#00f0ff) and dull grey-green, raised frilled edges catching light,
> thin hair-like rhizoids at the margins. Very low profile, reads as ground cover.

---

## Tier 2 — hive and camp sites (the current art is placeholder tiles)

Every camp and hive signature-prop image is a ~10 KB placeholder (dashed box with
initials). Hives show them in game today. The review row offers existing models
for most of them; these prompts are for the ones with no candidate, and for any
candidate you reject (master backlog §5 and §6 have the full prompts for the rest:
suture organ, wound cauterizer, relay antenna, synaptic web, chitin hatchery,
radio, battery bank, repair rig, still, spore trays, resin urn, ammo press,
shield rack).

### 9. Hive carapace molt — `prop_hive_carapace_molt.glb`
No candidate. Height ~1.5 m, ~2.2 m long. Backlog §6.6 (full prompt, reproduced).
> Full 3D environment prop of a shed hive carapace molt. Massive hollow insectoid
> exoskeleton split cleanly down the dorsal spine, made of dark iridescent chitin
> with dry white sinew remnants around the leg sockets and drying pools of
> translucent amber ichor. Grounded specimen prop.

### 10. Meridian HAM radio — `prop_camp_meridian_radio.glb`
No candidate. Height ~1.4 m with mast. Backlog §5.1 (full prompt, reproduced).
> Full 3D prop of a field-improvised long-range HAM radio station. Stack of
> militarized transceivers housed in weathered ammo cans, glowing amber vacuum
> tubes, an active CRT monitor displaying an oscillating audio waveform, a tangle
> of insulated copper wires, and a tall telescoping mast antenna with coiled
> grounding wire. Utilitarian, desperate tech salvage.

### 11. Fresh grave — `prop_camp_grave_fresh.glb`
Height ~1.0 m with marker. Backlog §5.4 concept.
> Full 3D environment prop of a fresh grave in a survivor camp: a low oblong mound
> of dark loose cave earth, still damp and unsettled, marked at the head by a
> crude cross of two lengths of scrap rebar lashed with wire, a pair of stamped
> steel dog tags hanging from one arm on a ball chain. A dented canteen at the foot.

### 12. Old grave — `prop_camp_grave_old.glb`
Height ~0.8 m. Backlog §5.4 concept.
> Full 3D environment prop of an old grave: a weathered cairn of flat stones
> furred with faint grey cave lichen, a rusted miner's helmet resting on top, and
> a leaning marker of petrified timber worn smooth. Dry, settled, forgotten.

### 13. Laundry line — `prop_camp_laundry.glb`
Height ~1.7 m, ~2.2 m wide. Backlog §5.4 concept.
> Full 3D environment prop of a camp laundry line: a sagging steel wire strung
> between two upright lengths of scaffold pipe set in buckets of rubble, hung with
> patched grey thermal undersuits, two canvas rags and a pair of work gloves held
> by wooden clothes pegs. Fabric heavy and damp, hanging straight down.

### 14. Lockdown shutter — `prop_camp_shutter_lockdown.glb`
Height ~2.0 m, ~1.8 m wide. Backlog §5.4 concept.
> Full 3D environment prop of a free-standing reinforced roll-down security
> shutter in a steel frame, fully closed and locked into floor brackets with a
> heavy hasp and padlock. Corrugated gunmetal slats, chipped yellow-black hazard
> stripes along the bottom rail, rust bloom along the frame welds, one slat dented
> inward. Flat back.

### 15. Warning placard — `prop_camp_warning_placard.glb`
Height ~1.1 m. Backlog §5.4 concept.
> Full 3D environment prop of a free-standing triangular sheet-metal warning
> placard on a welded tripod stand, painted with a large biohazard glyph and two
> emergency-retreat arrows in faded red (#ef4444) and white, paint flaking at the
> edges, bullet dent near one corner. No words.

### 16. Bedrolls — `prop_camp_bedrolls.glb`
Height ~0.4 m. Backlog §5.4 concept.
> Full 3D environment prop of two rolled insulated wool bedrolls bound with
> leather utility straps, resting on a cut square of black rubber floor matting,
> a folded foil emergency blanket tucked under one strap.

### 17. Lit cookfire — `prop_camp_cookfire_lit.glb`
Height ~0.9 m. Backlog §5.4 concept. The current `prop_camp_cookfire.glb` has no
flames, so lit camps keep a 2D fire. Model the coals glowing; flames can stay as
particles on top.
> Full 3D environment prop of an improvised camp brazier: a cut-down steel oil
> drum with punched air holes, filled with a deep bed of glowing orange coals and
> embers (#ff9f1c emissive, the only light source), a steel grill grate across
> the top holding a blackened pot, ration tins around the base.

---

## Tier 3 — cryo, debris, doors and corpses

### 18. Ice stalagmites — `scatter_ice_stalagmite.glb`
Height ~0.9 m. Backlog §9.1 concept.
> Full 3D scatter prop of a jagged cluster of five translucent blue-white cave ice
> stalagmites rising from frozen dark rock, the tallest twisted, internal fracture
> planes catching cold cyan (#00f0ff) light, frost rime at the base.

### 19. Hanging icicles — `scatter_cryo_icicle.glb`
Height ~0.8 m (hangs from a ledge). New prompt.
> Full 3D scatter prop of a row of long hanging icicles growing from a short
> rusted steel ledge fragment, varying lengths, cloudy at the root and glass-clear
> at the tips, a few fused together, cold cyan (#00f0ff) highlights.

### 20. Cryo shards — `scatter_cryo_shards.glb`
Height ~0.2 m, flat. Backlog §9.1 concept.
> Full 3D scatter prop of shattered cryogenic stasis glass on the floor: curved
> thick panes broken into sharp shards, frozen condensation spikes growing from
> the broken edges, a thin frost bloom spreading underneath. Low and flat.

### 21. Broken service drone — `scatter_broken_drone.glb`
Height ~0.35 m. Backlog §9.1 concept.
> Full 3D scatter prop of a small tracked inspection drone smashed in half on the
> floor: dented gunmetal chassis split open, one rubber track thrown loose, torn
> wiring and a cracked dead optical eye, a dried oil stain underneath.

### 22. Biomechanical debris — `scatter_biomech_debris.glb`
Height ~0.25 m, flat. Backlog §9.1 concept.
> Full 3D scatter prop of a low tangle of biomechanical debris: severed ribbed
> pneumatic tubing, fragments of bone rebar, a crushed steel plate, and a dried
> smear of black bio-fluid binding them together.

### 23. Biomechanical door — `door_biomechanical.glb`
Height ~2.6 m. New prompt (the 2D sprite is a door face; this replaces it).
> Full 3D environment asset of a biomechanical bulkhead door, front-on: an oval
> iris of overlapping dark chitin plates closed in a spiral, set in a heavy
> riveted gunmetal frame that is being overgrown by ribbed vertebral conduits
> and wet tendons, hydraulic rams at the hinges. One plate slightly parted with a
> faint emerald (#10b981) glow behind it. Flat back, designed to sit in a wall.

### 24–28. Enemy corpses
`cryosnail_dead.glb`, `sporesnail_dead.glb`, `boss_cybersnail_dead.glb`,
`boss_cryosnail_dead.glb`, `boss_sporesnail_dead.glb`. Height ~0.4 m (boss ~1.0 m).
`cybersnail_dead.glb` already ships and is now wired. Backlog §2.9 prompt, with
the variant line swapped in:
> Full 3D game prop of a slain biomechanical snail creature corpse lying crumpled
> on the ground. Cracked and scorched steel-bone shell with severed hydraulic
> cables leaking dark viscous oil and fluorescent ichor, limp organic tentacles
> curled inward, exposed shattered mechanical turbines and smoking heat vents.
> Dark Gigeresque decay, grounded contact geometry, burnt metal, bone, and drying
> biological fluids. **[variant]**

Variants:
- **cryosnail:** shell frosted white-blue with ice crusted in the cracks, cyan (#00f0ff) coolant leaking instead of oil.
- **sporesnail:** shell overgrown with fungal caps, emerald (#10b981) spore dust settling from burst pods.
- **boss_*:** same as the variant, twice the mass, armour plates sheared off, one huge shattered turbine.

---

## Checklist

| # | File | Priority | Has review candidate |
|---|---|---|---|
| 1 | prop_cave_eggs_hatched | Tier 1 | no |
| 2 | prop_cave_eggs_intact | Tier 1 | no |
| 3 | scatter_hive_eggs | Tier 1 | no |
| 4 | prop_cave_webs | Tier 1 | no |
| 5 | prop_cave_hive_wounded | Tier 1 | resin sac (weak) |
| 6 | prop_cave_spores | Tier 1, optional | spore dispenser (weak) |
| 7 | prop_spore_colony | Tier 1, optional | spore dispenser (weak) |
| 8 | prop_cave_lichen | Tier 1, optional | growth overrun (wrong shape) |
| 9 | prop_hive_carapace_molt | Tier 2 | no |
| 10 | prop_camp_meridian_radio | Tier 2 | no |
| 11–16 | camp graves, laundry, shutter, placard, bedrolls | Tier 2 | no |
| 17 | prop_camp_cookfire_lit | Tier 2 | no (GLB has no flames) |
| 18–22 | ice stalagmite, icicles, cryo shards, drone, biomech debris | Tier 3 | no |
| 23 | door_biomechanical | Tier 3 | no |
| 24–28 | 5 corpses | Tier 3 | no |
