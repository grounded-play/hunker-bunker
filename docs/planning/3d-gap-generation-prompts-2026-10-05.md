# 3D gap generation prompts (2026-10-05, rev 3)

Status: ready to generate | Gap list: `docs/reports/2d-to-3d-gap-audit-2026-10-05.md`,
`src/data/world3dCandidates.js`.

These are the props still drawn in 2D because no GLB depicts them, checked
against the full model registry and the debug museum's side-by-side review row.

**Rev 3** (2026-10-05): render prompts, not concept art. Every prompt is now a
single self-contained block in the house render style that produced the props
you passed ("3D game asset render ... empty neutral grey space ... photorealistic
PBR, octane render, studio lighting, zero background, 1:1"), with the Giger
register of `docs/design/missing-assets-and-2d-generation-prompts.md` §2 written
into each one, and a flat `#808080` background for clean image-to-3D cut-out.

The erotic charge stays inside the line the game declared to Steam
("non-explicit sexual content"; `docs/biomechanical-visual-remaster-rundown.md`
rule 5): anatomy transformed into machinery and architecture (sphincteric
vents, phallic nozzles, pelvic bone frames, glistening latex), never human
genitals, nudity or sex acts. That is also what the generators accept.

---

## How to use

1. Copy one block as the prompt. Put the **negative block** in the negative field.
2. Generate the image, then image-to-3D (Tripo3D / Meshy / Rodin / Hunyuan).
3. Drop the GLB in `art/raw/` (never `public/`). It gets optimized to
   `public/3d/runtime/new3ds/<file>` and registered in `WORLD_3D_MODELS`; the 2D
   type then renders in 3D with no other change.

### Negative block

```text
concept art, illustration, drawing, sketch, ink lines, cross-hatching, painterly, cel shading, cartoon, anime, low detail, blurry, flat lighting, harsh shadows, ground shadow, floor, horizon, scenery, background objects, gradient background, vignette, depth of field, lens flare, multiple objects, turnaround sheet, split panels, collage, people, human nudity, human genitals, text, logos, watermark, signature, clean sterile sci-fi, medieval fantasy, church, crosses, altars, runes, pastel colors
```

Palette rule (rundown rule 4): amber = human machinery, red = warning, cyan =
cryo, emerald = hive/fungal, violet = only the Queen. One emissive accent per prop.

Priority is by how often players see it (six-area runtime audit counts).

---

## Tier 1 — the cave and hive floor (seen hundreds of times a run)

### 1. Hatched egg casings — `prop_cave_eggs_hatched.glb`
Seen 45×. ~0.6 m tall, ~1.1 m across. 6k tris, < 900 KB. Accent: emerald.
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE clutch of four ruptured hive egg casings rooted into a slab of black basalt. Each casing is a 40 cm ovoid of thick glistening black latex hide stretched over a ribbed cage of ivory cartilage hoops, every rib ending in a small knuckled vertebra. The crown of each egg has split open in four heavy, swollen labial petals that peel back and droop outward, their inner faces raw plum-pink, slick and wet, threaded with fine red capillaries, strings of clear mucus still stretched between the parted lips. Inside each opened egg: an empty smooth cavity glazed with emerald (#10b981) bioluminescent amniotic film, the only emissive glow. A torn umbilical cord of ribbed grey tubing hangs from one rim. One casing has collapsed flat like a deflated bladder. At the base, the eggs are fused to the stone by knotted resin roots and a shallow glossy pool of amber-green amniotic fluid with a thin skin on its surface. Wet mucosal sheen on the hides against dry pitted rock; heavy weight and slack, spent membranes. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: glistening wet black latex, polished translucent chitin, ribbed cartilage, ivory bone, cold cast gunmetal and chrome, every surface slick, glossy and sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, subsurface scattering on membranes, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

### 2. Intact egg cluster — `prop_cave_eggs_intact.glb`
Seen 38×. ~0.7 m tall. 6k tris. Accent: emerald.
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE cluster of five unhatched hive eggs grown upright from a knot of black basalt. Each egg is a smooth, tumescent ovoid, taut black latex hide over a translucent olive inner membrane, ribbed lengthwise by raised cartilage seams that converge at the crown into a tightly closed four-lipped sphincteric seal, the lips pressed together and faintly swollen, a single bead of clear fluid at the seam. Thick blue-black veins wrap each egg and pulse with a dim emerald (#10b981) glow under the thinnest skin near the crown. The eggs lean against each other, hides creased where they press together. At the base, fibrous resin cords and a cradle of fused pelvic-bone struts hold them to the rock, glazed in dried amber resin. Glossy wet surfaces, heavy, dormant, waiting. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: glistening wet black latex, polished translucent chitin, ribbed cartilage, ivory bone, cold cast gunmetal and chrome, every surface slick, glossy and sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, subsurface scattering on membranes, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

### 3. Floor egg clutch — `scatter_hive_eggs.glb`
Low scatter version. ~0.3 m tall. 3k tris. No glow.
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE small floor clutch of three hive eggs, each the size of a fist, lying on their sides in a shallow smear of glistening resin. Black latex hides with olive translucency, ribbed cartilage seams, each crown a closed puckered sphincter. Strands of wet mucosal webbing bind the three together and stick them to the floor. Low and flat so it reads from above. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: glistening wet black latex, polished translucent chitin, ribbed cartilage, ivory bone, cold cast gunmetal and chrome, every surface slick, glossy and sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, subsurface scattering on membranes, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

### 4. Web canopy — `prop_cave_webs.glb`
Seen 38×. ~1.6 m tall, ~2 m wide. 8k tris. No emissive.
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE free-standing hive web canopy strung between two uprights: on the left a curved column of fused human-scale vertebrae and pelvic bone, on the right a bent length of corroded steel I-beam with stamped serial plates. Between them, thick ropes of grey-white secreted resin silk sag in heavy catenary swags, layered three deep, the strands glossy and wet like stretched saliva, swollen at the junctions into knotted glandular nodules that weep clear fluid. Two shrivelled insect husks and a crushed corporate hard hat are caught in the weave. Where the web meets each upright it widens into a ribbed, flared membrane cuff wrapped tightly around the bone and steel. Translucent where thin, opaque and milky where packed. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: glistening wet black latex, polished translucent chitin, ribbed cartilage, ivory bone, cold cast gunmetal and chrome, every surface slick, glossy and sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, subsurface scattering on membranes, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

### 5. Wounded hive wall — `prop_cave_hive_wounded.glb`
Seen 37×. ~1.1 m tall, flat back. 7k tris. Accent: none (black plasma).
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE free-standing slab of living hive wall, 1.1 m tall, flat back. The face is armoured in overlapping plates of dark wet chitin riveted to buried steel ribs. Through the centre runs a deep vertical breach, torn open like a wound: the edges curl back in thick, raw, swollen lips of plum-red flesh, glistening, ribbed on the inside with fine muscle striations, parted to show a dark wet cavity lined with pulsing ribbed tubing. Thick black bio-plasma oozes from the opening in slow glossy runs down the plates and collects in a pool at the base. Severed veins and a torn hydraulic hose hang from the upper edge of the tear, dripping. Contrast of hard dry chitin and soft wet exposed tissue. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: glistening wet black latex, polished translucent chitin, ribbed cartilage, ivory bone, cold cast gunmetal and chrome, every surface slick, glossy and sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, subsurface scattering on membranes, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

### 6. Spore pod emitter — `prop_cave_spores.glb` *(optional; review candidate is weak)*
Seen 39×. ~0.9 m tall. 6k tris. Accent: emerald.
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE bulbous fungal spore pod grown from cave rock: a swollen ivory bulb of bony, ridged shell with a smooth, pale, skin-like neck, crowned by three upright phallic chimney vents, each ribbed along its length and ending in an open, puckered, glistening aperture rimmed with emerald (#10b981) spore dust. Deep gill folds visible inside the apertures, wet and pink. Smaller sibling pods bud from the base like swollen knuckles, their vents still closed. Thin ribbed roots grip the stone. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: glistening wet black latex, polished translucent chitin, ribbed cartilage, ivory bone, cold cast gunmetal and chrome, every surface slick, glossy and sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, subsurface scattering on membranes, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

### 7. Spore colony — `prop_spore_colony.glb` *(optional)*
Seen 32×. ~0.8 m tall mound. 6k tris. Accent: emerald.
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE mound-shaped spore colony: forty to fifty glossy spherical fruiting bodies, from marble to grapefruit size, packed tightly together and pressing against each other, each with a wet translucent green skin and a tiny puckered pore at its tip. The youngest bulbs glow emerald (#10b981) from inside; the oldest are dull, wrinkled and split. Underneath, a pale web of fleshy root threads spreads across the ground plane, fused in places to a buried ribbed steel conduit. Slick, crowded, fertile. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: glistening wet black latex, polished translucent chitin, ribbed cartilage, ivory bone, cold cast gunmetal and chrome, every surface slick, glossy and sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, subsurface scattering on membranes, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

### 8. Cave lichen — `prop_cave_lichen.glb` *(optional)*
Seen 19×. ~0.3 m tall, flat. 4k tris. Accent: cyan.
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE low colony of bioluminescent cave lichen spreading over a jagged black stone slab: overlapping crusty rosettes with raised, frilled, fleshy margins that curl like small lips, in cold cyan (#00f0ff) and dull grey-green, the centre of each rosette a soft glistening cup. Hair-fine rhizoids creep from the edges into the cracks of the stone. Very low profile, reads as ground cover from above. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: glistening wet black latex, polished translucent chitin, ribbed cartilage, ivory bone, cold cast gunmetal and chrome, every surface slick, glossy and sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, subsurface scattering on membranes, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

---

## Tier 2 — hive and camp sites (current art is placeholder tiles)

Every camp and hive signature-prop image is a ~10 KB placeholder (dashed box with
initials); hives show them in game today. The review row offers existing models
for most. These are for the ones with no candidate, and for any you reject.

### 9. Hive carapace molt — `prop_hive_carapace_molt.glb`
No candidate. ~1.5 m tall, ~2.2 m long. 10k tris. Accent: amber ichor.
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE shed hive carapace molt lying on its side: a massive hollow exoskeleton of dark iridescent chitin, the long elegant body of a biomechanoid with an elongated cranial crest, split cleanly open along the whole dorsal spine so the two halves gape apart and show the smooth, wet, ribbed hollow inside. The shell keeps the creature's form: a corseted waist of interlocking vertebral plates, a wide pelvic girdle of ivory bone, long tapering limb sheaths left empty. Dry white sinew threads trail from the leg sockets; translucent amber (#ff9f1c) ichor has run out of the split and dried in glossy pools. Shed, empty, still sensual in outline. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: glistening wet black latex, polished translucent chitin, ribbed cartilage, ivory bone, cold cast gunmetal and chrome, every surface slick, glossy and sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, subsurface scattering on membranes, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

### 10. Meridian HAM radio — `prop_camp_meridian_radio.glb`
No candidate. ~1.4 m with mast. 8k tris. Accent: amber.
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE field-improvised long-range radio station built by clean-steel survivors: a stack of three militarized transceivers housed in weathered olive ammo cans with stamped corporate serial plates, rows of glowing amber (#ff9f1c) vacuum tubes behind wire guards, a small CRT monitor showing an oscillating waveform, toggle switches and bakelite dials. A tall telescoping mast antenna rises from the top, guyed with coiled copper grounding wire. The base sits on a hazard-striped steel pallet. One trace of the hive: a thin glossy black tendril has crept up the back of the stack and coiled once, tightly, around the mast. Utilitarian, meticulous, desperate. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: glistening wet black latex, polished translucent chitin, ribbed cartilage, ivory bone, cold cast gunmetal and chrome, every surface slick, glossy and sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, subsurface scattering on membranes, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

### 11. Fresh grave — `prop_camp_grave_fresh.glb`
~1.0 m tall with marker. 4k tris. No emissive.
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE fresh survivor grave: a low oblong mound of dark loose cave earth, still damp and unsettled, with a shovel's edge marks along its sides. At its head stands a straight marker post of welded scrap rebar topped with a cracked operator helmet; a pair of stamped steel dog tags hang from the post on a ball chain. A dented canteen and a stub of melted candle in a ration tin sit at the foot. No cross, no religious symbol. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: glistening wet black latex, polished translucent chitin, ribbed cartilage, ivory bone, cold cast gunmetal and chrome, every surface slick, glossy and sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, subsurface scattering on membranes, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

### 12. Old grave — `prop_camp_grave_old.glb`
~0.8 m tall. 4k tris. No emissive.
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE old grave: a weathered cairn of flat dark stones furred with faint grey cave lichen, a rusted miner's helmet resting on top, a leaning marker post of petrified timber worn smooth. Thin black hive veins have crept out of the ground and wrapped the lowest stones, glistening. Dry, settled, forgotten. No cross, no religious symbol. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: glistening wet black latex, polished translucent chitin, ribbed cartilage, ivory bone, cold cast gunmetal and chrome, every surface slick, glossy and sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, subsurface scattering on membranes, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

### 13. Laundry line — `prop_camp_laundry.glb`
~1.7 m tall, ~2.2 m wide. 6k tris. No emissive.
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE camp laundry line: a sagging steel wire strung between two upright lengths of scaffold pipe set in buckets of rubble. Hanging from it by wooden pegs: two patched grey thermal undersuits, form-fitting, ribbed at the spine and waist like the operators' suit liners, heavy and damp and hanging straight down; a stained canvas rag; a pair of work gloves. A drip tray underneath has caught a little grey water. Empty garments only, no person. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: glistening wet black latex, polished translucent chitin, ribbed cartilage, ivory bone, cold cast gunmetal and chrome, every surface slick, glossy and sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, subsurface scattering on membranes, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

### 14. Lockdown shutter — `prop_camp_shutter_lockdown.glb`
~2.0 m tall, ~1.8 m wide, flat back. 6k tris. Accent: red.
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE free-standing reinforced roll-down security shutter in a heavy riveted gunmetal frame, fully closed and locked into floor brackets with a heavy hasp and padlock. Corrugated steel slats with stamped corporate serial stencils, chipped yellow-black hazard stripes on the bottom rail, rust bloom along the frame welds, one slat dented inward by a blow from the other side. A small red (#ef4444) lockdown lamp in a cage at the top corner. Flat back. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: glistening wet black latex, polished translucent chitin, ribbed cartilage, ivory bone, cold cast gunmetal and chrome, every surface slick, glossy and sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, subsurface scattering on membranes, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

### 15. Warning placard — `prop_camp_warning_placard.glb`
~1.1 m tall. 3k tris. Accent: red paint only.
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE free-standing triangular sheet-metal warning placard on a welded tripod stand, painted with a large biohazard glyph and two emergency-retreat arrows in faded red (#ef4444) and white, paint flaking at the edges, a bullet dent near one corner, a smear of glossy black hive secretion across the bottom edge. No words. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: glistening wet black latex, polished translucent chitin, ribbed cartilage, ivory bone, cold cast gunmetal and chrome, every surface slick, glossy and sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, subsurface scattering on membranes, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

### 16. Bedrolls — `prop_camp_bedrolls.glb`
~0.4 m tall. 3k tris. No emissive.
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE pair of rolled insulated wool bedrolls bound with cracked leather utility straps, resting on a cut square of black rubber floor matting, a folded foil emergency blanket tucked under one strap, a ration tin and a dog-eared paperback beside them. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: glistening wet black latex, polished translucent chitin, ribbed cartilage, ivory bone, cold cast gunmetal and chrome, every surface slick, glossy and sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, subsurface scattering on membranes, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

### 17. Lit cookfire — `prop_camp_cookfire_lit.glb`
~0.9 m tall. 5k tris. Accent: amber (the only light). The current
`prop_camp_cookfire.glb` has no fire, so lit camps keep a 2D flame.
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE improvised camp brazier: a cut-down steel oil drum with punched air holes and stamped corporate serial stencils, filled with a deep bed of glowing orange coals and embers (#ff9f1c emissive, the only emissive glow), small licking flames, a steel grill grate across the top holding a blackened pot. Ration tins and a split log around the base. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: glistening wet black latex, polished translucent chitin, ribbed cartilage, ivory bone, cold cast gunmetal and chrome, every surface slick, glossy and sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, subsurface scattering on membranes, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

---

## Tier 3 — cryo, debris, doors and corpses

### 18. Ice stalagmites — `scatter_ice_stalagmite.glb`
~0.9 m tall. 4k tris. Accent: cyan.
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE jagged cluster of five translucent blue-white cave ice stalagmites rising from frozen black rock, the tallest twisted in a slow spiral, internal fracture planes catching cold cyan (#00f0ff) light, frost rime at the base. Frozen inside the tallest: a coiled ribbed hive tendril, glossy black, preserved mid-reach. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: glistening wet black latex, polished translucent chitin, ribbed cartilage, ivory bone, cold cast gunmetal and chrome, every surface slick, glossy and sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, subsurface scattering on membranes, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

### 19. Hanging icicles — `scatter_cryo_icicle.glb`
~0.8 m tall, hangs from a ledge. 3k tris. Accent: cyan.
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE row of long hanging icicles growing from a short rusted steel ledge with a stamped serial plate, varying lengths, cloudy at the root and glass-clear at the tips, a few fused into thick tapered columns, cyan (#00f0ff) highlights, a frozen drip of black coolant trapped in one. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: glistening wet black latex, polished translucent chitin, ribbed cartilage, ivory bone, cold cast gunmetal and chrome, every surface slick, glossy and sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, subsurface scattering on membranes, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

### 20. Cryo shards — `scatter_cryo_shards.glb`
~0.2 m tall, flat. 3k tris. Accent: cyan.
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE scatter of shattered cryogenic stasis glass on the floor: thick curved panes from a sleep pod broken into sharp shards, frozen condensation spikes growing from the broken edges, a thin frost bloom spreading underneath, one shard still bonded to a fragment of ribbed black seal gasket. Low and flat. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: glistening wet black latex, polished translucent chitin, ribbed cartilage, ivory bone, cold cast gunmetal and chrome, every surface slick, glossy and sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, subsurface scattering on membranes, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

### 21. Broken service drone — `scatter_broken_drone.glb`
~0.35 m tall. 4k tris. No emissive (dead).
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE small tracked inspection drone smashed in half on the floor: dented gunmetal chassis with stamped corporate serials split open, one rubber track thrown loose, torn wiring harnesses spilling out like entrails, a cracked dead optical eye, a dried oil stain underneath. A glossy black hive tendril has pushed in through the split and wound through the wiring. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: glistening wet black latex, polished translucent chitin, ribbed cartilage, ivory bone, cold cast gunmetal and chrome, every surface slick, glossy and sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, subsurface scattering on membranes, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

### 22. Biomechanical debris — `scatter_biomech_debris.glb`
~0.25 m tall, flat. 3k tris. No emissive.
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE low tangle of biomechanical debris: severed ribbed pneumatic tubing with wet open ends, fragments of vertebra fused onto lengths of rebar, a crushed steel plate, a torn flap of black latex membrane, all bound together by a dried glossy smear of black bio-fluid. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: glistening wet black latex, polished translucent chitin, ribbed cartilage, ivory bone, cold cast gunmetal and chrome, every surface slick, glossy and sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, subsurface scattering on membranes, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

### 23. Biomechanical door — `door_biomechanical.glb`
~2.6 m tall, flat back, sits in a wall. 10k tris. Accent: emerald.
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE biomechanical bulkhead door, front-on: a tall oval iris of overlapping dark wet chitin plates closed in a tight spiral like a sphincter, the plates' edges soft and slightly swollen where they meet in the centre. It is set in a heavy riveted gunmetal frame with stamped corporate serial plates, which is being overgrown by ribbed vertebral conduits, wet tendons and two arching pelvic-bone buttresses that cradle the opening. Hydraulic rams at the hinge points. At the very centre the plates have parted a finger-width, a faint emerald (#10b981) glow and a bead of mucus behind them. Flat back. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: glistening wet black latex, polished translucent chitin, ribbed cartilage, ivory bone, cold cast gunmetal and chrome, every surface slick, glossy and sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, subsurface scattering on membranes, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

### 24–28. Enemy corpses
`cybersnail_dead.glb` already ships and is wired. Flat ground contact for all five.

#### 24. `cryosnail_dead.glb`
~0.4 m tall, 8k tris, accent cyan.
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE slain biomechanical cryosnail lying slack on the ground in three-quarter view. Its shell, a heavy cast-iron compressor turbine fused with segmented bone armour, is cracked open and scorched, turbine blades shattered, smoke curling from split heat vents. The soft body beneath spills out limp: pale translucent flesh webbed with subcutaneous hydraulic cables, the head lolled sideways, the two long phallic optic stalks drooping and dark, the round sphincter mouth slack and parted, its concentric rings of titanium teeth still. Severed cables leak dark viscous oil and fluorescent ichor into a spreading pool. The shell is crusted with white frost and split by jagged glacial ice spikes; cyan (#00f0ff) coolant leaks instead of oil and freezes into glassy runs; the exposed flesh is grey-blue and rimed with ice crystals. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: glistening wet black latex, polished translucent chitin, ribbed cartilage, ivory bone, cold cast gunmetal and chrome, every surface slick, glossy and sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, subsurface scattering on membranes, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

#### 25. `sporesnail_dead.glb`
~0.4 m tall, 8k tris, accent emerald.
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE slain biomechanical sporesnail lying slack on the ground in three-quarter view. Its shell, a heavy cast-iron compressor turbine fused with segmented bone armour, is cracked open and scorched, turbine blades shattered, smoke curling from split heat vents. The soft body beneath spills out limp: pale translucent flesh webbed with subcutaneous hydraulic cables, the head lolled sideways, the two long phallic optic stalks drooping and dark, the round sphincter mouth slack and parted, its concentric rings of titanium teeth still. Severed cables leak dark viscous oil and fluorescent ichor into a spreading pool. The shell is overgrown with glossy fungal caps and burst spore pods with ribbed, puckered openings; emerald (#10b981) spore dust settles in a fine film over the slack body. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: glistening wet black latex, polished translucent chitin, ribbed cartilage, ivory bone, cold cast gunmetal and chrome, every surface slick, glossy and sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, subsurface scattering on membranes, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

#### 26. `boss_cybersnail_dead.glb`
~1.0 m tall, 12k tris, accent amber.
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE slain biomechanical boss cybersnail, twice normal size, lying slack on the ground in three-quarter view. Its shell, a heavy cast-iron compressor turbine fused with segmented bone armour, is cracked open and scorched, turbine blades shattered, smoke curling from split heat vents. The soft body beneath spills out limp: pale translucent flesh webbed with subcutaneous hydraulic cables, the head lolled sideways, the two long phallic optic stalks drooping and dark, the round sphincter mouth slack and parted, its concentric rings of titanium teeth still. Severed cables leak dark viscous oil and fluorescent ichor into a spreading pool. Heavy armour plates have sheared off and lie beside it; one huge turbine is shattered open; the body sprawls across a wide glossy pool of oil and amber (#ff9f1c) ichor. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: glistening wet black latex, polished translucent chitin, ribbed cartilage, ivory bone, cold cast gunmetal and chrome, every surface slick, glossy and sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, subsurface scattering on membranes, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

#### 27. `boss_cryosnail_dead.glb`
~1.0 m tall, 12k tris, accent cyan.
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE slain biomechanical boss cryosnail, twice normal size, lying slack on the ground in three-quarter view. Its shell, a heavy cast-iron compressor turbine fused with segmented bone armour, is cracked open and scorched, turbine blades shattered, smoke curling from split heat vents. The soft body beneath spills out limp: pale translucent flesh webbed with subcutaneous hydraulic cables, the head lolled sideways, the two long phallic optic stalks drooping and dark, the round sphincter mouth slack and parted, its concentric rings of titanium teeth still. Severed cables leak dark viscous oil and fluorescent ichor into a spreading pool. Armour plates sheared off, the giant shell split by a forest of glacial ice spikes, cyan (#00f0ff) coolant frozen in thick glassy sheets around the sprawled body. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: glistening wet black latex, polished translucent chitin, ribbed cartilage, ivory bone, cold cast gunmetal and chrome, every surface slick, glossy and sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, subsurface scattering on membranes, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

#### 28. `boss_sporesnail_dead.glb`
~1.0 m tall, 12k tris, accent emerald.
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE slain biomechanical boss sporesnail, twice normal size, lying slack on the ground in three-quarter view. Its shell, a heavy cast-iron compressor turbine fused with segmented bone armour, is cracked open and scorched, turbine blades shattered, smoke curling from split heat vents. The soft body beneath spills out limp: pale translucent flesh webbed with subcutaneous hydraulic cables, the head lolled sideways, the two long phallic optic stalks drooping and dark, the round sphincter mouth slack and parted, its concentric rings of titanium teeth still. Severed cables leak dark viscous oil and fluorescent ichor into a spreading pool. Armour plates sheared off, the giant shell erupting with fungal caps and ruptured spore chimneys, emerald (#10b981) spore dust drifting over the sprawled body. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: glistening wet black latex, polished translucent chitin, ribbed cartilage, ivory bone, cold cast gunmetal and chrome, every surface slick, glossy and sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, subsurface scattering on membranes, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

---

## Checklist

| # | File | Priority | Review candidate |
|---|---|---|---|
| 1 | prop_cave_eggs_hatched | Tier 1 | none |
| 2 | prop_cave_eggs_intact | Tier 1 | none |
| 3 | scatter_hive_eggs | Tier 1 | none |
| 4 | prop_cave_webs | Tier 1 | none |
| 5 | prop_cave_hive_wounded | Tier 1 | resin sac (weak) |
| 6 | prop_cave_spores | Tier 1, optional | spore dispenser (weak) |
| 7 | prop_spore_colony | Tier 1, optional | spore dispenser (weak) |
| 8 | prop_cave_lichen | Tier 1, optional | growth overrun (wrong shape) |
| 9 | prop_hive_carapace_molt | Tier 2 | none |
| 10 | prop_camp_meridian_radio | Tier 2 | none |
| 11–16 | camp graves, laundry, shutter, placard, bedrolls | Tier 2 | none |
| 17 | prop_camp_cookfire_lit | Tier 2 | none (GLB has no fire) |
| 18–22 | ice stalagmite, icicles, cryo shards, drone, biomech debris | Tier 3 | none |
| 23 | door_biomechanical | Tier 3 | none |
| 24–28 | 5 corpses | Tier 3 | none |
