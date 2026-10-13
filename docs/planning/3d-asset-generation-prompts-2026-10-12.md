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
Hyper-detailed photorealistic 3D game asset render of a SINGLE heavy wall-mounted electrical power junction breaker box. Cast aluminum industrial enclosure with a hinged front door secured by two heavy latch clamps. Top and bottom walls feature four threaded conduit entry collars with short lengths of ribbed conduit hose protruding. An exterior knife-switch safety handle on the right side with a yellow rubberized grip in the UP/ON position. Front door features a recessed indicator window with a vertical row of five amber (#f59e0b) LED load lamps and an embossed high-voltage lightning bolt icon. Chipped industrial grey enamel paint, grease smudges around the handle, stamped manufacturer plate. Brutal deep-space corporate industrial horror: cast metal, electrical conduit hardware, realistic safety switches. Photorealistic PBR materials, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

### 11. Pressurization Air Duct Module — `base_o2_overhead_duct.glb`
- **Role:** Overhead modular duct run connecting O2 regulators across rooms.
- **Budget:** ~3k tris, 1.0 m length, 0.35 m width, 0.35 m height.
- **Accent:** Steel flange collars, rubber gasket seams.
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE 1-meter straight section of heavy industrial air pressurization duct. Rounded rectangular duct profile made of riveted sheet gunmetal with stamped diagonal stiffening creases across each face. Both ends terminate in thick four-bolt square mounting flanges with exposed black neoprene rubber sealing gaskets. A flexible corrugated rubber vibration sleeve collar around the center section, secured by two stainless steel worm-gear hose clamps. Two top overhead trapeze hanger rods with unistrut channel brackets for ceiling mounting. Functional HVAC life support ductwork: industrial sheet metal, neoprene rubber, galvanized bolts. Photorealistic PBR materials, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, side three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

---

## 4. Architecture & Doorway Kits (Workstream A & B)

### 12. Arch Guillotine Doorway Frame — `door_arch_guillotine_frame.glb`
- **Role:** Monumental threshold frame supporting vertical guillotine closure.
- **Budget:** ~10k tris, 2.4 m width opening, 4.2 m total height, 0.8 m depth.
- **Accent:** Red status guide lights on door jambs.
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE monumental arch-guillotine door portal frame. Heavy architectural archway constructed from brutalist prefabricated dark grey precast concrete piers and bolted cast-gunmetal reinforcing plates. The arch crown features a tall protruding vertical housing box containing the retracted door hoist assembly, with exposed heavy chains, cable drums, and counterweight guide rails. Both side posts feature deep vertical machined steel track channels for the door slab, flanked by inset red (#ef4444) vertical LED status light strips. Base posts flare into heavy angled floor shoes bolted into foundation slabs. Towering, fortified, monumental threshold architecture. H.R. Giger biomechanical and brutalist industrial architecture: dark pitted concrete, machined steel tracks, mechanical hoist housing. Photorealistic PBR materials, concrete roughness and cold steel contrast, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, front three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

### 13. Arch Guillotine Sliding Slab — `door_arch_guillotine_slab.glb`
- **Role:** Heavy downward-closing blast slab that slides inside frame rails.
- **Budget:** ~6k tris, 2.2 m width, 3.0 m height, 0.25 m thickness.
- **Accent:** Yellow hazard chevron teeth along bottom edge.
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE heavy sliding guillotine door slab. Massive solid armor-plate steel slab reinforced with an exterior grid of horizontal structural box beams and heavy industrial rivets. Two forged steel top lifting eyelet lugs connected to short segments of heavy link chain. The bottom edge is beveled into a heavy wedge with interlocking mechanical seal teeth and worn diagonal yellow and black (#eab308) safety chevron hazard striping. Both vertical edges have precision-machined guide rollers and bronze wear plates that ride in frame tracks. Scratched ballistic gunmetal finish with vertical abrasion scrapes along the edges from sliding cycles. Massive, imposing, fortified blast barrier. Brutal deep-space industrial horror: heavy armor plate, industrial rivets, hazard striping, worn mechanical edges. Photorealistic PBR materials, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, front three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

### 14. Bunker Macro Wall Module (4-Cell Straight) — `wall_macro_straight_4.glb`
- **Role:** Semantic straight wall run spanning 4 tiles to break repeating cell seams.
- **Budget:** ~8k tris, 4.0 m length, 2.8 m height, 0.4 m thickness.
- **Accent:** Recessed conduit chase, ambient wall light fixture.
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE 4-meter wide prefabricated bunker interior macro wall section. Continuous reinforced precast dark concrete panel with three vertical structural steel pilasters dividing the frontage into subtle rhythm bays. A horizontal recessed conduit tray channel runs across the panel at 1.8 meters height, carrying a bundle of heavy black electrical cables behind steel safety retainers. One bay features a flush-mounted cast-iron utility hatch with a recessed T-handle. A ruggedized caged fluorescent fixture mounted near the upper rim emits a soft warm white glow. Foundation base plate with anchor bolts and top ceiling locking channel. Monolithic, seamless, utilitarian bunker fortification. Brutal industrial sci-fi architecture: textured concrete, structural steel pilasters, recessed cable chases. Photorealistic PBR materials, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, front three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

### 15. Bunker Macro Wall Module (3-Cell Buttress) — `wall_macro_buttress_3.glb`
- **Role:** 3-cell architectural wall featuring projecting structural buttresses.
- **Budget:** ~8k tris, 3.0 m length, 2.8 m height, 0.7 m depth at buttress.
- **Accent:** Angled kicker gusset plates, gunmetal hardware.
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE 3-meter wide reinforced bunker wall section with two projecting diagonal structural buttresses. Heavy concrete back wall reinforced by two massive sloped triangular steel buttress columns projecting 0.6 meters outward from the wall face, anchored to the floor with heavy trapezoidal base shoes. Between the buttress piers: an inset equipment alcove housing a wall-mounted fire suppression bottle and piped electrical risers. Upper crown capped with heavy riveted steel coping plates. Heavy seismic reinforcement aesthetic, fortified bunker design. Brutal deep-space industrial horror: angled steel buttresses, raw concrete, heavy foundation anchor plates. Photorealistic PBR materials, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, front three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

### 16. Hermetic Sealable Door with Latch Wheel — `base_door_sealable_bulkhead.glb`
- **Role:** Player-built airtight door sealing base rooms for O2.
- **Budget:** ~8k tris, 1.2 m width, 2.4 m height, 0.35 m thickness.
- **Accent:** Central rotating six-spoke locking wheel, amber seal status light.
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE submarine-style heavy hermetic bulkhead door set in an integral steel frame. Heavy cast gunmetal door slab with radiused corners, mounted on three massive forged steel grease-fitted barrel hinges. Central heavy six-spoke rotating dogging wheel mechanism in cast iron with internal linkage rods extending outward to engage six perimeter locking pins into the jamb. Small thick circular triple-pane wire-reinforced observation porthole in the upper half. Inset amber (#f59e0b) pressure indicator light above the latch wheel. Thick black silicone rubber compression gasket running along the entire door sealing flange. Fortified airtight naval-style decompression door. Brutal deep-space industrial horror: heavy forged steel hinges, mechanical dogging wheel, airtight pressure gaskets. Photorealistic PBR materials, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter front view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

---

## 5. Recovered Ship Modules (Workstream G6)

### 17. Stellar Navigation Core Module — `ship_module_navigation_core.glb`
- **Role:** Physical recovered ship part for campaign progression.
- **Budget:** ~9k tris, 1.0 m width, 1.4 m height, 1.0 m depth.
- **Accent:** Cyan navigational gimbal ring lights, polished brass bus ribbons.
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE salvaged spacecraft navigation core module mounted in a temporary steel transit cradle. A central 0.6-meter spherical inertial measurement gyroscope housing of polished dark titanium, suspended inside dual gimbal rings with exposed micro-actuators and fine brass ribbon cables. The sphere features three circular optical sensor apertures that emit a faint cyan (#06b6d4) celestial alignment grid glow. The lower base contains an armored cylindrical memory core with four quick-release locking handles and heavy gold-plated multi-pin bus connectors along the rear interface plate. Precision aerospace instrumentation housed in ruggedized salvage hardware. High-tech space navigation meets brutal industrial salvage: polished titanium sphere, machined brass gimbal rings, gold connectors, rugged transit frame. Photorealistic PBR materials, metallic reflections, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter perspective view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

### 18. Ship Life Support Scrubber Core — `ship_module_life_support_core.glb`
- **Role:** Major recovered ship component restoring primary base O2 capacity.
- **Budget:** ~10k tris, 1.2 m width, 1.8 m height, 1.1 m depth.
- **Accent:** Cyan frost pipes, twin CO2 scrubber cannisters.
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE heavy spacecraft life-support atmospheric regeneration core module. Massive dual vertical carbon-dioxide scrubber cylinders wrapped in thermal multi-layer insulation foil blankets with exposed cryogenic copper coolant lines encrusted in frost rime. A center centrifugal air circulation turbine assembly with an exposed inspection window showing internal fan blades. Top manifold features four quick-connect duct ports with spring-loaded silicone sealing flaps. An analog digital hybrid telemetry readout on the front panel with glowing cyan (#06b6d4) status gauges. Heavy structural base frame with forklift pockets and hoist lifting rings. Complex spacecraft environmental control machinery: insulated foil, frosted copper pipes, turbine housing, structural mounting frame. Photorealistic PBR materials, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter front view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

### 19. Ship Thrust Manifold Injector — `ship_module_engine_manifold.glb`
- **Role:** High-tier ship propulsion recovery component.
- **Budget:** ~11k tris, 1.5 m length, 1.0 m width, 1.1 m height.
- **Accent:** Heat-tinted titanium rocket bell, polished chrome fuel rails.
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE recovered spacecraft rocket engine injector manifold assembly. Truncated titanium alloy bell nozzle terminating in a complex toroidal propellant manifold with dozens of radially arranged braided stainless steel fuel feed lines converging onto a central injector dome. Polished chrome and brushed titanium construction with vivid heat-discolored blue, bronze, and purple rainbow oxidation temper blooms across the nozzle throat. Heavy mounting gimbal ring with four high-pressure hydraulic actuator cylinders attached. Heavy forged steel field transport skids bolted underneath for salvage hauling. Extreme high-performance propulsion engineering: discolored titanium, braided fuel lines, hydraulic gimbal cylinders, rugged transport skids. Photorealistic PBR materials, iridescent metallic heat bloom, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter angled view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

### 20. Sub-Ether Comms Transceiver Array — `ship_module_comms_transceiver.glb`
- **Role:** Recovered long-range ship communications module.
- **Budget:** ~8k tris, 0.9 m width, 2.0 m height, 0.9 m depth.
- **Accent:** Gold-plated phased array feed horn, amber status LEDs.
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE recovered long-range ship communications transceiver module. A collapsible faceted hexagonal parabolic antenna dish constructed from matte carbon-composite petals folded halfway in transit position, revealing a central gold-plated phased-array feed horn and beryllium copper helical waveguide coil. The dish is mounted on a two-axis motorized elevation-azimuth gimbal head atop an armored electronics rack housing signal amplifiers and cryo-cooled receiver low-noise amplifiers. Front panel features an array of tiny amber (#f59e0b) signal channel LEDs and heavy mil-spec threaded coaxial cable connectors. Advanced deep-space communications hardware: carbon composite petals, gold-plated waveguides, heavy electronics housing. Photorealistic PBR materials, metallic and carbon fiber textures, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```
