# 3D Asset Generation Prompts — 2026-10-12

**Target Pipeline:** Text-to-Image / Image-to-3D (Tripo3D, Meshy, Rodin, Hunyuan)  
**Output Location:** `art/raw/` $\rightarrow$ optimized to `public/3d/runtime/new3ds/<file>`  
**Scope:** 20 critical gameplay and architecture assets from the Master Plan (`environment-layout-field-weapons-and-base-rebuild-master-plan-2026-10-12.md`).

---

## Technical GLB Requirements & Ingestion Contracts

All generated models imported into Hunker Bunker must satisfy these production contracts before runtime registration:

1. **Origin & Orientation:**
   - Grounded props: Origin at bottom center `[0, 0, 0]` with contact surface resting precisely at `Y = 0` (or `Z = 0` raw master, rotated to vertical runtime axis).
   - Symmetrical pieces (cores, canisters, cases, cores): Centered horizontally on X and Z axes.
   - Doors and slabs: Pivot placed along the active hinge or guide track.
2. **Scale & Polygon Budget:**
   - Real-world 1:1 metric scale (e.g. cot = 2.1 m length, flamethrower = 1.2 m, door opening = 2.4 m).
   - Hard polygon budget:
     - Hero architectural kits & ship modules: $\le 25,000$ triangles.
     - Weapons, machinery, and furniture: $\le 10,000$ triangles.
     - Ammunition, canisters, and pickups: $\le 4,000$ triangles.
3. **Collision & Placement Safety:**
   - Structural walls and doors: Declared bounding box collision proxies.
   - Archways and door frames: Zero collision across the central opening envelope (player controller clearance: width $\ge 1.8$ m, height $\ge 2.15$ m).
   - Pickups and weapons: Non-colliding physics triggers with 1.8 m unobstructed interaction radius.
4. **Named Anchors & Sockets:**
   - `FX_LIGHT_00..02`: Coordinates for practical point/spot light sources.
   - `FX_GLOW_00..02`: Center of emissive lens, dial, or core.
   - `FX_FLAME_00`: Flamethrower pilot flame and muzzle emission anchor.
   - `INTERACTION_00`: Standard player interaction prompt anchor.
   - Conduit sockets (`power_in`, `coolant_in`, `tray_in`, `tray_out`) conforming to `PROP_SOCKET_REGISTRY`.
5. **Materials & Textures:**
   - Standard metallic-roughness PBR (baseColor, metallicRoughness, normal, emissive, occlusion).
   - Palettes: amber = human machinery, red = warning/latches, cyan = cryo/life-support, emerald = bio/hive.
6. **Ingestion & Registry:**
   - Place raw generation exports in `art/raw/`.
   - Run optimization and decimation through `scripts/blender/tighten_new3d_prop_budget.py` and output runtime GLB to `public/3d/runtime/new3ds/`.
   - Register entries in `WORLD_3D_MODELS` (`src/world3dOverlay.js`) and `DRESSING_TRIANGLES` (`src/data/dressingTriangles.js`).

---

## Standard Negative Block

Use this exact negative block in all generation tools:

```text
concept art, illustration, drawing, sketch, ink lines, cross-hatching, painterly, cel shading, cartoon, anime, low detail, blurry, flat lighting, harsh shadows, ground shadow, floor, horizon, scenery, background objects, gradient background, vignette, depth of field, lens flare, multiple objects, turnaround sheet, split panels, collage, people, human nudity, human genitals, text, logos, watermark, signature, clean sterile sci-fi, medieval fantasy, church, crosses, altars, runes, pastel colors
```

---

## 1. Weapons & Combat (Workstream E & F)

### 1. M-70 Industrial Flamethrower — `weapon_flamethrower_m70.glb`
- **Role:** Rare physical field-dropped heavy weapon. Swept cone incendiary fire.
- **Budget:** ~12k tris, 1.2 m length, 0.4 m height.
- **Accent:** Amber indicator lamp, scorched gunmetal barrel.
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE military-grade heavy industrial flamethrower weapon lying isolated in empty space. Long extruded stamped gunmetal receiver with heavy heat-shield perforations, knurled forward barrel jacket with visible soot and heat-discolored blue and purple rainbow temper marks near the twin-pronged muzzle igniter assembly. Dual underbarrel high-pressure fuel intake tubes with brass compression fittings and braided steel wire sleeving connecting to a compact cylindrical pilot fuel reservoir. Ergonomic dual-grip chainsaw-style rear carry handle and forward ribbed rubber horizontal foregrip with safety toggle. Analog pressure gauge with a small brass bezel on the side showing an amber dial. Solid milled steel receiver, matte olive drab and gunmetal finishes, chipped paint and raw silver metal scuffs along the wear edges, cold stamped steel, subtle machine grease, heavy industrial weight. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: cold cast gunmetal and chrome, machined tungsten, every surface sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy metallic specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter side profile view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

### 2. High-Pressure Fuel Canister — `weapon_fuel_canister_heavy.glb`
- **Role:** Flamethrower ammunition drop and fuel cell.
- **Budget:** ~4k tris, 0.35 m diameter, 0.6 m height.
- **Accent:** Amber pressure dial, yellow hazard banding.
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE heavy pressurized fuel tank canister. Thick cylindrical canister body of stamped olive-drab steel with two raised circumferential reinforcing ribs and worn industrial stencil yellow hazard stripes. Heavy cast-iron top protective collar housing a recessed brass quick-disconnect fuel coupling valve, a knurled emergency shutoff petcock, and a small round pressure gauge with an amber (#f59e0b) dial. Dual recessed bottom mounting feet and a heavy forged steel top carry bail handle. Paint chipped to bare rusted steel on the bottom rim, faint condensation gloss, industrial warning aesthetic. Brutal deep-space corporate industrial horror: heavy cast gunmetal, machined brass fittings, weathered enamel paint, razor-sharp mechanical micro detail. Photorealistic PBR materials, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter perspective view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

### 3. Flamethrower Field Transit Case — `weapon_flamethrower_case.glb`
- **Role:** World pickup prop telegraphing the rare flamethrower spawn.
- **Budget:** ~6k tris, 1.4 m length, 0.5 m width, 0.35 m height.
- **Accent:** Red latch accents, scorched corner decals.
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE heavy military hardline weapon case resting closed in empty space. Oblong rectangular case of high-impact ballistic composite resin in matte graphite dark grey, ribbed with deep molded structural shock ribs across the lid and sides. Four heavy zinc-alloy cam latches along the front rim with red (#ef4444) anodized release toggles, reinforced steel ball corners riveted to each edge. Two recessed folding rubberized spring-loaded carry handles on the ends and one heavy central handle. Worn yellow hazard chevron stencils along the lid seam and charred soot scorch marks across one corner showing survived blast damage. Cold industrial weight, realistic latch mechanisms, sealed gasket rim. Brutal deep-space corporate industrial horror: ruggedized utilitarian hardware, scratched impact resin, weathered hardware. Photorealistic PBR materials, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter angled top view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

---

## 2. Meltable Ice Barriers & Gates (Workstream F3)

### 4. Solid Frozen Ice Barrier (Stage 0) — `barrier_ice_intact.glb`
- **Role:** Intact meltable ice gate blocking progress.
- **Budget:** ~8k tris, 2.5 m width, 3.0 m height, 0.8 m thickness.
- **Accent:** Cyan sub-surface glacial blue glow.
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE solid monolithic glacial ice barrier plugging a doorway opening. Dense, frozen sub-zero crystalline ice slab with jagged chiseled front facets, internal frozen air bubble fissures, and deep frost veins that scatter faint cyan (#06b6d4) glacial light from within. Twisted pieces of rusted iron rebar and bent industrial mesh trapped inside the transparent and translucent frozen depths. Top and sides encrusted with sharp hanging frost rime and hoarfrost needles; heavy icy foundation rooted to frozen stone. Dry brittle frozen surface with glistening glassy core, deep volumetric refraction. Brutal sub-zero arctic sci-fi horror: dense translucent ice, frozen industrial debris, realistic volumetric depth. Photorealistic PBR materials, refractive glass-like ice specular highlights, subsurface scattering, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, front three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

### 5. Thawing Slush Ice Barrier (Stage 1) — `barrier_ice_melting.glb`
- **Role:** Stage 1 melting transition under fire damage.
- **Budget:** ~9k tris, 2.4 m width, 2.8 m height.
- **Accent:** Wet refractive water sheen, cyan core.
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE partially melted glacial ice barrier thawing under intense heat. The jagged ice facets have rounded off into wet, dripping curves with dozens of glossy vertical meltwater rivulets carving deep troughs down the front face. The ice has turned semi-translucent and slushy along the edges, revealing the embedded rusted rebar grid inside. Melting icicle nubs hanging from the softened upper crown, and clear water droplets bead across the wet glassy surface. Dim cyan (#06b6d4) refracted glow deep inside the slush core. Wet mucosal water sheen, thawing thermal transition. Brutal sub-zero arctic sci-fi horror: wet melting ice, slush textures, dripping rivulets, exposed industrial steel framing. Photorealistic PBR materials, wet specular highlights, subsurface scattering, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, front three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

### 6. Fractured Breached Ice Barrier (Stage 2) — `barrier_ice_fractured.glb`
- **Role:** Stage 2 severely weakened ice barrier on the verge of opening.
- **Budget:** ~10k tris, 2.4 m width, 2.7 m height.
- **Accent:** High-contrast internal fractures, melting core.
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE heavily fractured and collapsing glacial ice barrier. A large irregular jagged breach has opened through the center, showing the surrounding ice riddled with thousands of white stress fractures and spiderweb cracks. Large chunks of shattered ice have split away, leaving razor-sharp fractured crystalline pillars and warped rusted rebar strands bridging the opening. Heavy water glaze, thawing slush, and broken ice shards clinging precariously to the doorway frame. Faint dying cyan (#06b6d4) glow within the remaining thick ice pillars. Severe thermal shock damage, compromised structural integrity. Brutal sub-zero arctic sci-fi horror: broken shattered ice, jagged crystalline cleavage planes, dripping water, mangled steel rebars. Photorealistic PBR materials, wet and dry ice specular contrast, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, front three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

---

## 3. Base Rebuild & First-Night Carry Loop (Workstream G)

### 7. Folded Expedition Cot (Carry Model) — `carry_field_cot_folded.glb`
- **Role:** Two-handed carry cargo recovered from camp/wreck.
- **Budget:** ~5k tris, 1.1 m length, 0.4 m width, 0.3 m height.
- **Accent:** Yellow transport straps, gunmetal frame.
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE heavy military expedition cot folded flat for two-handed transport. Welded tubular gunmetal alloy frame hinged in the middle, clamped shut by two heavy woven yellow (#eab308) nylon webbing ratchet straps with stamped steel buckles. A folded thick quilted insulated thermal mattress pad in faded olive-drab canvas is compressed between the folded scissor legs. Two rubberized central grab handles bolted to the central steel frame for two-handed carrying. Worn scuffed powder coat on the frame, stamped military lot numbers, realistic mechanical hinge pins. Utilitarian survival hardware: cold steel, canvas weave, industrial ratchet straps, chipped paint. Photorealistic PBR materials, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter angled view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

### 8. Deployed Recovery Cot (Installed Bed) — `base_cot_installed.glb`
- **Role:** Installed base bed required to advance the night / rest.
- **Budget:** ~6k tris, 2.1 m length, 1.0 m width, 0.6 m height.
- **Accent:** Amber status beacon on headboard node.
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE deployed military survival recovery bed snapped into floor locking brackets. Heavy welded gunmetal tubular scissor frame locked open with diagonal cross-braces bolted to four floor mounting shoe plates. A thick, firm insulated mattress pad in dark olive-drab and grey ripstop fabric with contoured head rest and integrated survival sleeping bag envelope half unzipped. A small compact vital-monitoring console box attached to the headboard frame with a faint amber (#f59e0b) LED heartbeat status pulse display. Utilitarian, functional, sturdy survival shelter furniture. Brutal deep-space corporate industrial horror: heavy functional framing, durable technical fabric, realistic clamp hardware. Photorealistic PBR materials, fabric weave texture, metal specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter perspective view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

### 9. Atmospheric Oxygen Regulator — `base_o2_atmospheric_regulator.glb`
- **Role:** Core life-support machine required to fill sealed rooms with O2.
- **Budget:** ~8k tris, 0.8 m width, 1.6 m height, 0.6 m depth.
- **Accent:** Cyan/amber dual pressure gauges, brass pipe manifolds.
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE industrial wall-mounted oxygen atmospheric regulator unit. Heavy rectangular enclosure of stamped gunmetal steel with rounded corners, bolted to a reinforced backplate with four corner vibration isolators. Dual vertical cylindrical scrubber canisters with brass threaded collar rings mounted on the front face. A large center dial gauge with an illuminated cyan (#06b6d4) pressure zone and an analog sweep needle. Two braided steel high-pressure hoses with brass manifold fittings looping into the top intake port, and a heavy rubberized ventilation outlet grille at the bottom. Small amber (#f59e0b) power toggle switch and indicator lamp on the side maintenance panel. Industrial life support machinery: stamped steel, machined brass, rubber gaskets, functional valves. Photorealistic PBR materials, metallic and matte contrast, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter front view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

### 10. Modular Base Power Breaker Junction — `base_power_junction_box.glb`
- **Role:** Electrical connection hub routing generator power to rooms.
- **Budget:** ~5k tris, 0.5 m width, 0.7 m height, 0.25 m depth.
- **Accent:** Amber LED bus bar indicators.
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE wall-mounted biomechanical power junction breaker box. A heavy rectangular enclosure sculpted from fused ivory pelvic bone and brushed gunmetal, bolted to a backplate of ribbed cartilage. Top and bottom penetrations feature four tight, puckered sphincteric grommets of glistening black latex that grip thick, throbbing umbilical power cables with raised subcutaneous copper veins. On the right flank, an elongated phallic brass knife-switch lever with contoured ribbed rubber grip is locked upright in the UP position. The front face features a vertical cleft framed by swollen, parted labial bone lips, revealing an inner chamber lined with glistening pink mucosal tissue and segmented spinal copper bus-bars. A row of five amber (#f59e0b) bioluminescent ganglion nodes pulses with warm electric light behind a clear, weeping amniotic film. Fine beads of clear viscous secretion gather along the lower rim. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: glistening wet black latex, polished translucent chitin, ribbed cartilage, ivory bone, cold cast gunmetal and chrome, every surface slick, glossy and sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, subsurface scattering on membranes, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

### 11. Pressurization Air Duct Module — `base_o2_overhead_duct.glb`
- **Role:** Overhead modular duct run connecting O2 regulators across rooms.
- **Budget:** ~3k tris, 1.0 m length, 0.35 m width, 0.35 m height.
- **Accent:** Steel flange collars, rubber gasket seams.
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE 1-meter straight section of overhead biomechanical air pressurization duct. The cylindrical duct body is structured like an exposed tracheal airway, formed from segmented rings of polished ivory cartilage wrapped in taut, glistening black latex membrane with wet, glistening troughs between each rib. The center section swells into an engorged, labial expansion cuff of corrugated wet rubber and fleshy plum-tinted membrane secured by polished chrome tension bands. Both ends terminate in heavy circular gunmetal flanges studded with interlocking bone teeth and glistening black compression gaskets weeping beads of clear mucosal lubricant. Overhead trapeze hangers sculpted like skeletal pelvic wishbones clasp the duct from above with threaded steel rods. On the side flank, a tight puckered sphincteric pressure valve releases a faint wisp of cyan (#06b6d4) oxygenated vapor. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: glistening wet black latex, polished translucent chitin, ribbed cartilage, ivory bone, cold cast gunmetal and chrome, every surface slick, glossy and sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, subsurface scattering on membranes, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, side three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

---

## 4. Architecture & Doorway Kits (Workstream A & B)

### 12. Arch Guillotine Doorway Frame — `door_arch_guillotine_frame.glb`
- **Role:** Monumental threshold frame supporting vertical guillotine closure.
- **Budget:** ~10k tris, 2.4 m width opening, 4.2 m total height, 0.8 m depth.
- **Accent:** Red status guide lights on door jambs.
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE monumental biomechanical arch-guillotine door portal frame. Towering 4.2-meter architectural gateway structured as an imposing pelvic bone vault supported by dual vertical jambs of fused, knuckled spinal vertebrae and dark brutalist gunmetal columns. The jambs flare outward at the base into wide skeletal pelvic footings bolted to the foundation with heavy industrial flange rings. Deep, glistening vertical guide channels run along the inner jamb faces, lined with wet ribbed black latex runners and exposed chrome hydraulic pistons. Towering above the arch crown is a heavy chitinous hood housing the hoist mechanism, flanked by two phallic hydraulic cylinder rams and coiled steel cable drums. Embedded vertically along both inner door jambs are sunken vertical slits of swollen fleshy tissue emitting an intense crimson red (#ef4444) warning glow, weeping slow droplets of glistening viscous fluid down the tracks. Monumental, sensual, terrifying architectural threshold. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: glistening wet black latex, polished translucent chitin, ribbed cartilage, ivory bone, cold cast gunmetal and chrome, every surface slick, glossy and sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, subsurface scattering on membranes, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, front three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

### 13. Arch Guillotine Sliding Slab — `door_arch_guillotine_slab.glb`
- **Role:** Heavy downward-closing blast slab that slides inside frame rails.
- **Budget:** ~6k tris, 2.2 m width, 3.0 m height, 0.25 m thickness.
- **Accent:** Yellow hazard chevron teeth along bottom edge.
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE massive biomechanical sliding guillotine door slab. The massive slab is sculpted as an articulated chitinous carapace and ballistic armor plate, resembling a towering corseted torso. A central dorsal spine of knuckled ivory vertebrae runs down the face, flanked by sweeping horizontal abdominal ribs of wet dark gunmetal cushioned by taut, glistening black latex intercostal membranes. The top edge terminates in two massive pierced bone vertebrae serving as heavy lifting lugs, hitched to forged steel hoist chain links. The bottom shearing wedge is beveled into a row of interlocking predatory bone teeth set into a swollen, rubberized mucosal seal lip marked with chipped, distressed yellow-black (#eab308) diagonal hazard striping. Strings of clear, viscous lubricant stretch across the bottom teeth. Both vertical sliding edges feature polished bronze and chrome guide shoes slick with glistening black industrial grease. Heavy, lethal, biomechanoid blast guillotine. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: glistening wet black latex, polished translucent chitin, ribbed cartilage, ivory bone, cold cast gunmetal and chrome, every surface slick, glossy and sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, subsurface scattering on membranes, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, front three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

### 14. Bunker Macro Wall Module (4-Cell Straight) — `wall_macro_straight_4.glb`
- **Role:** Semantic straight wall run spanning 4 tiles to break repeating cell seams.
- **Budget:** ~8k tris, 4.0 m length, 2.8 m height, 0.4 m thickness.
- **Accent:** Recessed conduit chase, ambient wall light fixture.
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE 4-meter wide prefabricated bunker interior macro wall section. A monolithic biomechanical barrier marrying brutalist dark precast concrete with an organic thoracic skeleton. The wall face is structured by four vertical spinal pilasters of articulated gunmetal vertebrae, from which gracefully curved ivory rib struts arc outward and clasp the surface. Running horizontally at waist height is a deep anatomical furrow carrying a bundle of thick, glistening black latex umbilical cables intertwined like copulating serpents, passing through tight, puckered sphincteric rubber bulkhead collars. One bay features an inset utility alcove framed by soft, parted labial cartilage rims, sheltering a flush gunmetal access panel with a polished bone turn-latch. Along the upper rim, a recessed bone-cowl fixture casts a soft, warm amber (#f59e0b) wash of light across the slick wet membranes and dark textured concrete. Foundation base plate anchored with heavy industrial bolts. Monolithic, visceral, architectural fortification. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: glistening wet black latex, polished translucent chitin, ribbed cartilage, ivory bone, cold cast gunmetal and chrome, every surface slick, glossy and sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, subsurface scattering on membranes, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, front three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

### 15. Bunker Macro Wall Module (3-Cell Buttress) — `wall_macro_buttress_3.glb`
- **Role:** 3-cell architectural wall featuring projecting structural buttresses.
- **Budget:** ~8k tris, 3.0 m length, 2.8 m height, 0.7 m depth at buttress.
- **Accent:** Angled kicker gusset plates, gunmetal hardware.
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE 3-meter wide reinforced bunker wall section featuring two projecting biomechanical buttresses. The back wall of textured dark bunker concrete is braced by two massive, sweeping structural buttress pillars sculpted like elongated femoral bones fused with gleaming hydraulic piston shafts. Each buttress projects 0.6 meters forward, its polished ivory bone column wrapped in taut, glistening black latex muscle sheaths with fine wet muscle striations, terminating in heavy cast-gunmetal knuckle shoes bolted into the deck. Between the two sensual buttress pillars is a deep recessed alcove lined with glistening plum-tinted mucosal folds and ribbed cartilage rings, cradling a wall-mounted emergency life-support canister plugged into twin braided umbilical hoses. The upper wall crown is capped with interlocking vertebral gunmetal coping plates. Massive seismic reinforcement infused with sensual skeletal anatomy. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: glistening wet black latex, polished translucent chitin, ribbed cartilage, ivory bone, cold cast gunmetal and chrome, every surface slick, glossy and sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, subsurface scattering on membranes, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, front three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

### 16. Hermetic Sealable Door with Latch Wheel — `base_door_sealable_bulkhead.glb`
- **Role:** Player-built airtight door sealing base rooms for O2.
- **Budget:** ~8k tris, 1.2 m width, 2.4 m height, 0.35 m thickness.
- **Accent:** Central rotating six-spoke locking wheel, amber seal status light.
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE heavy hermetic bulkhead door set in an integral biomechanical portal frame. An imposing oval doorway constructed of dark cast gunmetal braced by curving ivory pelvic bone struts, mounted on three massive grease-fitted forged steel barrel hinges. The door slab features an organic-mechanical locking mechanism: an interlocking iris of overlapping wet chitin plates converging at the center into a tightly closed, puckered sphincteric seal. A central six-spoke cast-bronze dogging wheel with spokes sculpted like curved polished bone fingers rotates to drive six glistening chrome tendon pushrods outward, engaging heavy locking bolts into the jamb. Above the wheel, a thick circular observation porthole framed in concentric rings of ribbed cartilage looks into a chamber of dark fluid, illuminated by an interior amber (#f59e0b) pressure indicator halo. The outer sealing lip is lined with a thick, swollen black silicone-latex gasket weeping beads of clear mucosal sealant. Sensual naval decompression architecture meets visceral body horror. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: glistening wet black latex, polished translucent chitin, ribbed cartilage, ivory bone, cold cast gunmetal and chrome, every surface slick, glossy and sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, subsurface scattering on membranes, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter front view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

---

## 5. Recovered Ship Modules (Workstream G6)

### 17. Stellar Navigation Core Module — `ship_module_navigation_core.glb`
- **Role:** Physical recovered ship part for campaign progression.
- **Budget:** ~9k tris, 1.0 m width, 1.4 m height, 1.0 m depth.
- **Accent:** Cyan navigational gimbal ring lights, polished brass bus ribbons.
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE salvaged spacecraft navigation core module resting in a heavy steel transit cradle. The heart of the module is a 0.6-meter ovoid sensory sphere of polished dark titanium and glistening black chitin, suspended within dual concentric gimbal rings sculpted from polished ivory bone and machined brass. The sphere features three circular sensory apertures resembling dilated, wet ocular pupils that project an ethereal cyan (#06b6d4) celestial alignment laser grid into the air. The gimbal rings are articulated by fine phallic chrome hydraulic actuators with ribbed latex sleeves. From the posterior base of the sphere emerges a thick, glistening neural spinal bundle of braided gold fiber ribbons, black latex hoses, and translucent fluid tubes weeping clear synthetic amniotic fluid. The lower base features an armored cylindrical memory housing clamped by heavy brass locking lugs with multi-pin umbilical bus plugs. Cybernetic aerospace navigation fused with biomechanoid sensory organs. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: glistening wet black latex, polished translucent chitin, ribbed cartilage, ivory bone, cold cast gunmetal and chrome, every surface slick, glossy and sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, subsurface scattering on membranes, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter perspective view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

### 18. Ship Life Support Scrubber Core — `ship_module_life_support_core.glb`
- **Role:** Major recovered ship component restoring primary base O2 capacity.
- **Budget:** ~10k tris, 1.2 m width, 1.8 m height, 1.1 m depth.
- **Accent:** Cyan frost pipes, twin CO2 scrubber cannisters.
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE heavy spacecraft life-support atmospheric regeneration core module. The module is engineered as an exposed biomechanical pulmonary apparatus, featuring twin monumental vertical scrubber cylinders cradled in external rib cages of polished ivory cartilage. Inside the thick glass cylinders, glistening black latex accordion lung-bellows expand and contract, their wet surfaces glistening under internal light. Spiraling around each cylinder are translucent vitrified veins carrying an oxygen-rich cyan (#06b6d4) bioluminescent fluid, with frost rime and frozen condensation clinging to the copper intake collars. A central bronchial manifold sculpted from polished chrome and glistening plum-tinted mucosal tissue splits into four flared duct intake ports, each rimmed with a tight, puckered sphincteric silicone seal. Front control console features dual analog pressure gauges and a digital pulse readout glowing in soft cyan. Mounted on a heavy welded gunmetal transport skid with forklift pockets, weeping pools of clear condensation at the drain valves. Sensual, colossal life-support respiration organ. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: glistening wet black latex, polished translucent chitin, ribbed cartilage, ivory bone, cold cast gunmetal and chrome, every surface slick, glossy and sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, subsurface scattering on membranes, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter front view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

### 19. Ship Thrust Manifold Injector — `ship_module_engine_manifold.glb`
- **Role:** High-tier ship propulsion recovery component.
- **Budget:** ~11k tris, 1.5 m length, 1.0 m width, 1.1 m height.
- **Accent:** Heat-tinted titanium rocket bell, polished chrome fuel rails.
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE recovered spacecraft rocket engine injector manifold assembly. The assembly marries extreme propulsion engineering with visceral biomechanoid anatomy: a truncated bell nozzle of brushed titanium displaying iridescent peacock-blue, violet, and deep bronze heat-temper blooms across its throat. The nozzle feeds into a massive, muscular toroidal propellant manifold wrapped in taut, glistening black latex muscle fibers and segmented chitin armor plates. Radiating from the central injector dome are sixteen elongated phallic chrome injector nozzles penetrating the manifold through lubricated brass gland sleeves, fed by braided stainless steel and black rubberized bio-fuel arteries. The engine throat is cradled by four heavy high-pressure hydraulic gimbal cylinders with ribbed rubber boots and chrome piston shafts. Underneath, heavy forged gunmetal salvage transport skids cradle the throbbing engine organ. Brutal aerospace rocketry fused with sensual biomechanical muscle. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: glistening wet black latex, polished translucent chitin, ribbed cartilage, ivory bone, cold cast gunmetal and chrome, every surface slick, glossy and sculpted with razor-sharp micro detail. Photorealistic PBR materials, iridescent metallic heat bloom, glossy wet specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter angled view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

### 20. Sub-Ether Comms Transceiver Array — `ship_module_comms_transceiver.glb`
- **Role:** Recovered long-range ship communications module.
- **Budget:** ~8k tris, 0.9 m width, 2.0 m height, 0.9 m depth.
- **Accent:** Gold-plated phased array feed horn, amber status LEDs.
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE recovered long-range ship communications transceiver module. The module features a sensuous biomechanical sensory reflector: a 1.2-meter parabolic dish composed of six curved, overlapping petals of glossy black carbon-chitin, partially furled like an exotic predatory blossom. At the center of the petals protrudes an elongated phallic feed horn of polished gold, embraced by a spiraling ivory bone cochlear waveguide that glistens with a thin clear lacquer sheen. The dish assembly rests on a flexible two-axis gimbal neck sheathed in ribbed, glistening black latex muscle striations with twin chrome linear actuator pistons. The lower base consists of a ruggedized gunmetal electronics tower with ribbed heat sink fins, featuring an array of glowing amber (#f59e0b) signal telemetry diodes and heavy braided umbilical coaxial cables that plug into puckered rubberized gland sockets. Exotic cybernetic sensory organ meets aerospace deep-space transceiver. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: glistening wet black latex, polished translucent chitin, ribbed cartilage, ivory bone, cold cast gunmetal and chrome, every surface slick, glossy and sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, subsurface scattering on membranes, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```
