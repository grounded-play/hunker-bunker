# 3D Asset Master Backlog & Production Generation Prompts
**Style Specification:** Dark H.R. Giger Biomechanical Horror × Event Horizon Industrial Sci-Fi  
**Target Output Directory:** `public/3d/runtime/new3ds/`  
**Runtime Integration Maps:** `src/world3dOverlay.js`, `src/enemy3dOverlay.js`, `src/player3dOverlay.js`, `src/armoryScene.js`  

---

## 1. Aesthetic Constitution: Giger × Event Horizon

All 3D assets in this catalog must adhere strictly to the following aesthetic rules:

1. **Biomechanical Fusion:** Seamless integration of industrial military technology with grotesque biological anatomy. Heavy cast iron, corrugated titanium conduits, and hydraulic pistons fuse directly into ribbed spinal columns, translucent chitin plates, weeping vascular bundles, and calcified bone struts.
2. **Event Horizon Occult Tech Horror:** Brutal gothic-industrial machinery. Heavily riveted charcoal gunmetal, oxidized rusted iron, hazard warnings obscured under dried grime, claustrophobic airlocks, and archaic vacuum-tube instruments combined with cosmic, extradimensional biological corruption.
3. **Restrained Functional Palette:**
   - **Base Tones:** Matte gunmetal, obsidian black, tarnished tungsten, calcified bone ivory, bruised flesh plum, and wet chitin.
   - **Emissive Accents (Low Intensity):** 
     - *Industrial/Human Tech:* Smoldering warning amber (`#ff9f1c`) and incandescent vacuum filament orange.
     - *Cryogenic Systems:* Sub-zero electric cyan (`#00f0ff`).
     - *Hive/Fungal Infestation:* Bioluminescent emerald (`#10b981`) and sickly spore amber.
     - *Security/Hazards:* Ominous laser ruby (`#ef4444`).
     - *Cosmic/Queen Corruption:* Occult ultraviolet / deep void violet (`#a855f7`).
4. **Surface Language:** PBR material contrast—matte pitted metal vs. glossy wet mucosal secretions, cold dry bone vs. oily insulated hydraulic lines.
5. **Model Specifications:** Single isolated subject, centered, watertight geometry, clean underside/ground contact plane, neutral dark studio environment for 3D capture, GLB-ready with optimized polygon budgets (Props: 5k–15k tris; Characters/Bosses: 20k–40k tris).

---

## 2. Combatants, Bosses & Enemies

### 2.1 Sentinel
- **Target File:** `public/3d/runtime/new3ds/sentinel.glb`
- **Scale:** ~2.1m height
- **Prompt:**
> Full 3D game asset of a floating subterranean Sentinel drone. Spherical core of matte gunmetal armor fused with a calcified human-alien skull plate, surrounded by three articulating, ribbed mechanical claw limbs made of titanium vertebrae and exposed hydraulic rams. A single glowing crimson laser aperture serves as its cyclopean ocular sensor, surrounded by weeping oily fluid ports and thin copper antenna filaments. Dark H.R. Giger biomechanical horror meets Event Horizon industrial dread, heavy weld seams, worn black metal, isolated on neutral dark grey background, PBR materials, watertight geometry, GLB-ready.

### 2.2 Alien Proto-Crawler
- **Target File:** `public/3d/runtime/new3ds/alien_proto_crawler.glb`
- **Scale:** ~0.9m height, 1.4m length
- **Prompt:**
> Full 3D game asset of an Alien Proto-Crawler creature in neutral pose. Low-slung quadrupedal predator with a segmented obsidian-chitin carapace, exposed biomechanical spine with ribbed pneumatic conduits running between vertebrae, four multijointed scythe legs tipped with blackened steel-like spurs, and a blind, eyeless skull with a split mandible exposing concentric rows of needle teeth and dripping emerald digestive bile. Dark biomechanical sci-fi horror, matte dark chitin, wet fleshy joints, isolated neutral background, riggable T/neutral pose, GLB-ready.

### 2.3 Alien Proto-Spitter
- **Target File:** `public/3d/runtime/new3ds/alien_proto_spitter.glb`
- **Scale:** ~1.3m height
- **Prompt:**
> Full 3D game asset of an Alien Proto-Spitter creature in neutral pose. Tripodal biomechanical organism with an elongated ribbed dorsal sac glowing with pressurized acid-green bio-plasma, supported by hydraulic bone-and-iron legs. The head features a massive fleshy sphincter cannon reinforced by circular cast-metal ring clamps and weeping organic mucus ducts. Heavy Gigeresque aesthetic, dark charcoal and sickly olive tones, high-detail wet and metallic PBR surfaces, isolated neutral studio background, GLB-ready.

### 2.4 Bio Charger
- **Target File:** `public/3d/runtime/new3ds/bio_charger.glb`
- **Scale:** ~1.8m height, 2.2m length
- **Prompt:**
> Full 3D game asset of a heavy Bio Charger beast. Massive, muscular quadrupedal juggernaut encrusted in thick, overlapping ivory bone plates and reinforced with rusty iron rebar naturally grown into its flesh. Its head is a solid battering crest of petrified chitin with pneumatic exhaust vents pulsating along its shoulders, venting pale steam. Dark cosmic horror sci-fi, immense physical weight, brutal silhouette, isolated neutral background, rig-ready, GLB-ready.

### 2.5 Corrupted Scout Boss
- **Target File:** `public/3d/runtime/new3ds/boss_corrupted_scout.glb`
- **Scale:** ~2.0m height
- **Prompt:**
> Full 3D character asset of the Corrupted Scout Boss in a symmetrical T-pose. Sleek high-tech Scout exosuit horribly warped by alien biomechanical growth: the matte black nano-carbon suit is torn open along the spine, where a glistening segmented alien vertebrae column and chitinous tendrils have grown through the armor. The cracked cyan helmet visor reveals a pulsating mass of green bioluminescent tissue and multiple twitching insectoid eyes. Ripped wire harnesses, organic muscle sinews fused with thruster jets, isolated neutral background, riggable GLB-ready character.

### 2.6 Corrupted Tank Boss
- **Target File:** `public/3d/runtime/new3ds/boss_corrupted_tank.glb`
- **Scale:** ~2.4m height, 1.8m width
- **Prompt:**
> Full 3D character asset of the Corrupted Tank Boss in a symmetrical T-pose. Massive heavy-duty tungsten industrial exosuit fused with living hive chitin: the right shoulder and siege cannon have mutated into an overgrown, pulsating bio-ballistic arm with weeping resin glands and bone barrels. Heavy steel chest armor is held together by organic black sinew and barbed wire, with smoldering amber reactor vents bleeding toxic green fumes. Dark Event Horizon horror, immense intimidating silhouette, PBR textures, GLB-ready.

### 2.7 Corrupted Engineer Boss
- **Target File:** `public/3d/runtime/new3ds/boss_corrupted_engineer.glb`
- **Scale:** ~2.1m height
- **Prompt:**
> Full 3D character asset of the Corrupted Engineer Boss in a symmetrical T-pose. High-voltage engineer rig overtaken by parasitic biomechanical tendrils: four articulated robotic servo-arms extending from the backpack have fused into chitinous mantis claws wrapped in copper wiring and sparking with erratic purple arc energy. The chest terminal displays scrambled glitched waveforms surrounded by swollen fleshy tumors and ribbed air tubes. Dark biomechanical sci-fi horror, isolated neutral studio background, GLB-ready.

### 2.8 Boss Decoy Scout
- **Target File:** `public/3d/runtime/new3ds/boss_decoy_scout.glb`
- **Scale:** ~1.9m height
- **Prompt:**
> Full 3D character asset of a holographic/biomechanical Decoy Scout phantom in neutral pose. Translucent, shimmering crystalline Scout silhouette intersected by glitching scanlines, fractured volumetric geometry, and thin dark alien tendrils suspending the mirage in mid-air. Eerie violet and cyan refractive edge shimmer, hollow helmet interior with a faint floating neural core, isolated neutral background, GLB-ready.

### 2.9 Dead Enemy & Boss Corpses
- **Target Files:** `cybersnail_dead.glb`, `cryosnail_dead.glb`, `sporesnail_dead.glb`, `boss_cybersnail_dead.glb`, `boss_cryosnail_dead.glb`, `boss_sporesnail_dead.glb`
- **Scale:** ~0.4m–1.2m height (flat ground contact)
- **Prompt:**
> Full 3D game prop of a slain biomechanical snail creature corpse lying crumpled on the ground. Cracked and scorched steel-bone shell with severed hydraulic cables leaking dark viscous oil and fluorescent ichor, limp organic tentacles curled inward, exposed shattered mechanical turbines and smoking heat vents. Dark Gigeresque decay, grounded contact geometry, burnt metal, bone, and drying biological fluids, isolated neutral background, GLB-ready.

---

## 3. NPCs, Survivors & Characters

### 3.1 Civilian Miner
- **Target File:** `public/3d/runtime/new3ds/npc_civilian_miner.glb`
- **Scale:** ~1.85m height
- **Prompt:**
> Full 3D character asset of a rugged subterranean Civilian Miner in symmetrical T-pose. Bulky padded hazard jumpsuit in dark oil-stained canvas, reinforced with welded steel chest brackets, knee braces, and heavy rubberized boots. Chest-mounted analog oxygen regulator with dangling brass pressure dials and ribbed rubber breathing hoses leading to a dented miner helmet with twin amber halogen lamps. Exhausted, survivor-grit aesthetic, Event Horizon deep-space salvage vibe, PBR materials, riggable GLB-ready.

### 3.2 Civilian Researcher
- **Target File:** `public/3d/runtime/new3ds/npc_civilian_researcher.glb`
- **Scale:** ~1.8m height
- **Prompt:**
> Full 3D character asset of a desperate subterranean Field Researcher in symmetrical T-pose. Heavy hooded insulated thermal smock over a lightweight carbon utility harness, adorned with diagnostic sensor holsters, specimen vial pouches glowing with faint cyan liquid, and a wrist-mounted CRT telemetry terminal. Filtered gas mask with twin copper canister filters, cracked protective goggles, and taped field-repair seams. Dark sci-fi survival horror, isolated neutral background, riggable GLB-ready.

### 3.3 Alien Ally: Rhun (Hunter Envoy)
- **Target File:** `public/3d/runtime/new3ds/npc_alien_rhun.glb`
- **Scale:** ~2.1m height
- **Prompt:**
> Full 3D character asset of the alien envoy Rhun in symmetrical T-pose. Tall, lean humanoid alien with a pale ribbed ivory exoskeleton, long slender four-fingered hands tipped with obsidian claws, and a smooth elongated cranial dome without eyes. Wearing a scavenged human industrial harness composed of dark leather straps, bolted titanium armor shards, and copper conduit necklaces. Elegant, intimidating, otherworldly biomechanical ally, subtle emerald subsurface vascular glow, PBR materials, GLB-ready.

### 3.4 Alien Ally: Vey (Chitin Weaver)
- **Target File:** `public/3d/runtime/new3ds/npc_alien_vey.glb`
- **Scale:** ~1.75m height
- **Prompt:**
> Full 3D character asset of the alien envoy Vey in symmetrical T-pose. Compact, multi-limbed biomechanical creature with four slender torso arms holding organic bone weaving styluses. The carapace is a mosaic of polished dark beetle chitin and iridescent membranous skin, draped in a tattered survivor poncho woven from copper wire and dried spore moss. Subdued amber emissive sensory pits along jawline, isolated neutral dark studio background, GLB-ready.

### 3.5 Empty Exosuit Body (Environmental Storytelling)
- **Target File:** `public/3d/runtime/new3ds/prop_body_empty_exosuit.glb`
- **Scale:** ~0.6m height (slumped seated/lying pose)
- **Prompt:**
> Full 3D environment prop of a breached, hollow military exosuit slumped against an invisible wall. The chest armor is violently torn open from the inside out with bent steel plates and severed pneumatic hoses, completely empty inside with dried dark stains coating the internal harness. Charred gunmetal, chipped warning yellow hazard decals, severed wire bundles, and calcified bone-like structural struts. Dark Event Horizon forensic horror, grounded contact base, GLB-ready.

### 3.6 Frozen Human Corpse
- **Target File:** `public/3d/runtime/new3ds/prop_body_human_frozen.glb`
- **Scale:** ~0.5m height, 1.8m length
- **Prompt:**
> Full 3D environment prop of a frozen human worker corpse encased in dark sub-zero ice rime. Worn arctic survival suit with cracked faceplate frosted over, frostbitten thermal gloves clutching a frozen emergency beacon, crystalline ice spikes protruding through seams in the fabric, and a layer of hoarfrost over weathered charcoal cloth. Tragic deep-space disaster detail, grounded geometry, PBR ice and fabric shaders, GLB-ready.

---

## 4. Bunker, Room Architecture & Milestone Props

### 4.1 Base Defense Turret
- **Target File:** `public/3d/runtime/new3ds/prop_base_defense_turret.glb`
- **Scale:** ~1.6m height, 1.2m base diameter
- **Prompt:**
> Full 3D game prop of an automated Bunker Defense Turret. Heavy bolted hexagonal base of cast charcoal iron, supporting an articulating dual-barrel 30mm rotary autocannon. The gun housing features cooling fins, exposed ammo feed belts loaded with brass shells in an armored hopper, pneumatic traverse actuators, and a cylindrical armored sensor optics pod with an amber targeting reticle. Dark brutalist industrial design, scuffed metal, grease stains, isolated neutral background, GLB-ready.

### 4.2 Bunker Blast Bulkhead & Iris Air-Door
- **Target File:** `public/3d/runtime/new3ds/prop_bunker_blast_door.glb`
- **Scale:** ~2.6m height, 2.4m width, 0.6m depth
- **Prompt:**
> Full 3D architectural game prop of a heavy subterranean Bunker Blast Door set within an arched structural frame. The frame features massive hydraulic locking pistons, exposed high-voltage conduit runs, and oxidized steel reinforcement ribs. The door consists of interleaved spiral iris blades made of dark hardened tungsten, with hazard yellow diagonal chevrons along the outer rim, a central biometric handprint scanner, and an amber status lamp. Dark Giger-meets-Event-Horizon industrial bulkheads, GLB-ready.

### 4.3 Engineering Bench
- **Target File:** `public/3d/runtime/new3ds/prop_engineering_bench.glb`
- **Scale:** ~1.2m height, 2.0m width, 1.0m depth
- **Prompt:**
> Full 3D game prop of a rugged Bunker Engineering Workbench. Heavy welded steel table with an integrated vise, an articulated magnifying lamp with warm tungsten bulb, scrap bins overflowing with microchips and copper pipe fittings, a soldering iron station resting on a firebrick, and an analog oscilloscope with glowing green sine waveforms mounted on the upper tool rack. Dark utilitarian survival sci-fi, detailed metallic wear, grounded base, GLB-ready.

### 4.4 Cryo Sleep Pod
- **Target File:** `public/3d/runtime/new3ds/prop_cryo_sleep_pod.glb`
- **Scale:** ~2.2m length, 1.1m height, 1.0m width (horizontal/canted)
- **Prompt:**
> Full 3D game prop of an industrial Cryogenic Stasis Pod. Heavy horizontal coffin-shaped pressure vessel constructed of matte titanium and ribbed cast-iron framing. Features an oval frosted-glass viewing window thick with internal ice crystals, thick frost-covered coolant manifolds pumping boiling liquid nitrogen, digital pressure dials glowing pale cyan, and emergency pneumatic manual release levers. Dark biomechanical stasis technology, PBR metal and ice, GLB-ready.

### 4.5 Ruptured Coolant Pump
- **Target File:** `public/3d/runtime/new3ds/prop_ruptured_coolant_pump.glb`
- **Scale:** ~1.4m height, 1.2m width
- **Prompt:**
> Full 3D game prop of a damaged, ruptured Industrial Cryo Coolant Pump. Bulky cylindrical compressor with blown flange seals, fractured cast-iron piping surrounded by sharp frozen icicle formations, dangling sheared bolts, and a leaking valve dripping vaporous blue coolant onto the base. Heavy frosted metal, rust, and glowing cyan fluid trails, dark Event Horizon disaster aesthetic, GLB-ready.

### 4.6 Cyber Junction
- **Target File:** `public/3d/runtime/new3ds/prop_cyber_junction.glb`
- **Scale:** ~1.5m height, 0.8m width, 0.4m depth
- **Prompt:**
> Full 3D game prop of a wall-mounted subterranean Cybernetic Junction Box. Armored electrical enclosure with its outer steel hatch pried open, revealing a dense, claustrophobic nest of colorful wires, glowing amber vacuum relay tubes, copper bus bars, and black alien mycorrhizal fungus veins creeping between the circuit boards. Tiny flickering LED indicators, heavy grounding cables bolting into the floor, GLB-ready.

### 4.7 Alloy Footlocker (Reward Cache)
- **Target File:** `public/3d/runtime/new3ds/prop_alloy_footlocker.glb`
- **Scale:** ~0.65m height, 1.2m width, 0.7m depth
- **Prompt:**
> Full 3D game prop of a high-value Military Alloy Footlocker cache chest. Reinforced titanium supply container with chamfered angular armor plates, heavy dual steel latch clasps, hazard yellow stripes, and an integrated cyan LED status bar across the lid seam indicating locked state. Worn military stencil markings, scuffed powder-coat charcoal paint, grounded contact base, GLB-ready.

### 4.8 Hydraulic Piston Actuator (Ring Crossing Landmark)
- **Target File:** `public/3d/runtime/new3ds/prop_hydraulic_piston_actuator.glb`
- **Scale:** ~2.8m height, 1.6m width
- **Prompt:**
> Full 3D monumental game prop of a massive industrial Hydraulic Piston Actuator column. Towering chrome piston ram encased in a massive steel superstructure with structural vertebrae ribs, high-pressure braided hydraulic fluid hoses, grease-covered collar seals, and hazard warning placards. Smoldering amber maintenance lamps illuminate the mechanical linkages. Monumental brutalist engineering, GLB-ready.

### 4.9 Biomechanical Pillars (Left & Right Arch Columns)
- **Target Files:** `prop_biomech_pillar_left.glb`, `prop_biomech_pillar_right.glb`
- **Scale:** ~2.8m height, 0.8m diameter
- **Prompt:**
> Full 3D architectural game prop of a towering Biomechanical Column. A load-bearing structural I-beam fused seamlessly with calcified spinal vertebrae, wrapped in glistening tendon conduits and dark translucent chitin plates. Weeping resin cavities and small bioluminescent emerald capillary nodes run up the length of the column into a flared skeletal arch capital. Dark H.R. Giger aesthetic, PBR bone, metal, and wet organic shaders, GLB-ready.

---

## 5. Faction Camp Dressing & Infrastructure

### 5.1 Camp Meridian (Tech Survivors)

#### Improvised HAM Radio Station
- **Target File:** `public/3d/runtime/new3ds/prop_camp_meridian_radio.glb`
- **Scale:** ~1.8m height, 1.2m width
- **Prompt:**
> Full 3D prop of a field-improvised long-range HAM radio station. Stack of militarized transceivers housed in weathered ammo cans, glowing amber vacuum tubes, an active CRT monitor displaying an oscillating audio waveform, a tangle of insulated copper wires, and a tall telescoping mast antenna with coiled grounding wire. Utilitarian, desperate tech salvage, GLB-ready.

#### Meridian Battery Bank
- **Target File:** `public/3d/runtime/new3ds/prop_camp_meridian_battery_bank.glb`
- **Scale:** ~1.0m height, 1.5m length
- **Prompt:**
> Full 3D prop of a heavy improvised battery bank. Array of six scarred industrial lead-acid truck batteries wired in series with thick copper jumper cables, glowing analog voltmeter needles resting in the green zone, corroded acid-stained terminals, and an inverter housing with humming cooling fan grilles. Dark workshop realism, GLB-ready.

#### Meridian Repair Rig
- **Target File:** `public/3d/runtime/new3ds/prop_camp_meridian_repair_rig.glb`
- **Scale:** ~1.4m height, 1.8m width
- **Prompt:**
> Full 3D prop of an electronics repair rig workbench. Welded pipe frame table with an overhead articulated magnifying ring light, microchip scrap bins, digital multimeter probes resting on a circuit board, and a clamp stand holding an exposed exosuit sensor node. Precision scrap craftsmanship, GLB-ready.

### 5.2 Camp Tallow (Bio Cultivators & Spore Harvesters)

#### Spore Distillation Retort (Still)
- **Target File:** `public/3d/runtime/new3ds/prop_camp_tallow_still.glb`
- **Scale:** ~1.7m height, 1.1m diameter
- **Prompt:**
> Full 3D prop of a crude fungal distillation still. Spherical copper boiling chamber resting over a low-flame burner, connected by serpentine glass tubing to a condensation flask bubbling with glowing bioluminescent emerald spore liquor. Wrapped in burlap insulation and copper wire straps, dripping condensation onto a stained stone base. Dark bio-alchemical aesthetic, GLB-ready.

#### Tiered Spore Trays
- **Target File:** `public/3d/runtime/new3ds/prop_camp_tallow_spore_trays.glb`
- **Scale:** ~1.9m height, 1.4m width
- **Prompt:**
> Full 3D prop of a tiered wooden-and-iron cultivation rack. Three shelves holding shallow terracotta trays packed with rich dark subterranean soil, flourishing with clusters of glowing green and amber bioluminescent cave fungi, with dried root bundles and harvesting sickles hanging from the side pegs. Natural bio-farming in deep darkness, GLB-ready.

#### Antiseptic Resin Urn
- **Target File:** `public/3d/runtime/new3ds/prop_camp_tallow_resin_urn.glb`
- **Scale:** ~1.1m height, 0.7m diameter
- **Prompt:**
> Full 3D prop of a bulbous ceramic medical resin urn. Heavy clay vessel sealed with dark beeswax and iron bands, featuring a brass spigot at the bottom dripping golden-amber antiseptic tree-hive sap into an earthenware bowl. Ancient ritual meets survival medicine, GLB-ready.

### 5.3 Camp Vesper (Militarized Iron Guild)

#### Vesper Sentry Turret
- **Target File:** `public/3d/runtime/new3ds/prop_camp_vesper_turret.glb`
- **Scale:** ~1.8m height, 1.4m footprint
- **Prompt:**
> Full 3D prop of a fortified sentry auto-turret mounted behind a semicircular sandbag revetment. Dual heavy machine gun barrels with perforated flash suppressors, an angled armored steel gun shield painted with an Iron Guild insignia, a green optics tracking lens, and deep mounds of spent brass shell casings surrounding the base. Rugged military fortification, GLB-ready.

#### Munitions Ammo Press
- **Target File:** `public/3d/runtime/new3ds/prop_camp_vesper_ammo_press.glb`
- **Scale:** ~1.5m height, 0.9m width
- **Prompt:**
> Full 3D prop of a manual cast-iron bullet reloading press. Heavy workbench mounted with a manual lever arm press, gunpowder hopper, trays of polished copper bullet heads, rows of primed brass cases in wooden staging blocks, and a calibrated powder scale. Brutal industrial ordnance craft, GLB-ready.

#### Riot Shield & Armor Rack
- **Target File:** `public/3d/runtime/new3ds/prop_camp_vesper_shield_rack.glb`
- **Scale:** ~1.8m height, 1.5m width
- **Prompt:**
> Full 3D prop of a welded angle-iron armor rack. Holding three heavy polycarbonate-and-steel riot barricade shields covered in deep alien claw gouges, alongside two dented ballistic chest plates and spare ceramic armor inserts hanging from steel hooks. Field-ready combat outfitting, GLB-ready.

### 5.4 General Camp Refit Props

| Prop Asset | Suggested GLB | Prompt Concept |
|---|---|---|
| **Camp Cot** | `prop_camp_cot.glb` | Folding canvas military cot with an olive-drab thermal sleeping bag, emergency foil blanket, and boots tucked underneath. |
| **Lit Cookfire** | `prop_camp_cookfire_lit.glb` | Improvised brazier made from a cut steel oil drum filled with glowing orange coals and small embers, venting thin smoke. |
| **Doused Cookfire** | `prop_camp_cookfire_doused.glb` | Cold charred brazier drum with blackened ash, charcoal lumps, and discarded ration tins around the base. |
| **Bedrolls** | `prop_camp_bedrolls.glb` | Pair of rolled insulated wool bedrolls bound with leather utility straps resting on a dry rubber floor mat. |
| **Camp Crates Stack** | `prop_camp_crates.glb` | Stack of three weathered wooden-and-iron supply crates stamped with survival cargo codes. |
| **Chained Crate Stack** | `prop_camp_crates_chained.glb` | Stack of armored security crates bound tightly with heavy iron chains and a heavy brass padlock. |
| **Fresh Grave** | `prop_camp_grave_fresh.glb` | Low mound of fresh dark cave earth marked by a crude cross made of lashed scrap rebar, with dogtags draped over the arm. |
| **Old Grave** | `prop_camp_grave_old.glb` | Weathered stone mound covered in faint cave lichen with a rusted miner helmet resting on a petrified wood marker. |
| **Laundry Line** | `prop_camp_laundry.glb` | Wire stringer tied between two metal pipes, hanging patched thermal undersuits and drying canvas rags. |
| **Lockdown Shutter** | `prop_camp_shutter_lockdown.glb` | Reinforced corrugated steel roll-down security shutter, locked into floor brackets with hazard stripe warning paint. |
| **Warning Placard** | `prop_camp_warning_placard.glb` | Free-standing triangular sheet-metal safety placard painted with biohazard glyphs and emergency retreat arrows. |
| **Sandbag Barricade** | `prop_camp_sandbags.glb` | Semicircular stack of reinforced canvas sandbags reinforced with corrugated steel backing and iron stakes. |

---

## 6. Cave, Hive & Biomechanical Organisms

### 6.1 Hive Suture Organ
- **Target File:** `public/3d/runtime/new3ds/prop_hive_suture_organ.glb`
- **Scale:** ~2.4m height, 1.8m width
- **Prompt:**
> Full 3D environmental prop of a Hive Suture Organ. A massive, pulsating vertical biological wall lesion made of glistening muscle tissue and dark chitin, stitched together with heavy industrial barbed wire and rusty iron staples. Black antiseptic resin oozes from the suture seams into small floor pools. Gigeresque body-horror repair site, wet gloss PBR materials, GLB-ready.

### 6.2 Hive Wound Cauterizer
- **Target File:** `public/3d/runtime/new3ds/prop_hive_wound_cauterizer.glb`
- **Scale:** ~1.6m height, 1.2m width
- **Prompt:**
> Full 3D game prop of a Hive Wound Cauterizer organ. Fleshy, calcified organic gland growing from a rock seam, featuring an open sphincter nozzle that discharges viscous amber sealant foam with faint steam rising from the contact point. Wet chitin and organic vascular textures, GLB-ready.

### 6.3 Hive Relay Antenna
- **Target File:** `public/3d/runtime/new3ds/prop_hive_relay_antenna.glb`
- **Scale:** ~2.6m height, 1.0m width
- **Prompt:**
> Full 3D game prop of a Hive Relay Antenna spire. Towering segmented chitinous spinal column tapering upward, entwined with salvaged copper antenna wires and pulsating emerald bioluminescent neural nodes. Small crystalline bio-transceivers vibrate at the crest, emitting faint green atmospheric spores. Dark bio-telepathic broadcast tower, GLB-ready.

### 6.4 Hive Synaptic Web
- **Target File:** `public/3d/runtime/new3ds/prop_hive_synaptic_web.glb`
- **Scale:** ~2.0m footprint, 0.3m elevation
- **Prompt:**
> Full 3D ground prop of an interconnected Hive Synaptic Web. Thick fleshy network of glistening neural tendrils and translucent conduits spreading across the floor plane between small bulbous bio-electrical nodes that pulse with electric blue and emerald light. Flat grounded contact base, GLB-ready.

### 6.5 Hive Chitin Hatchery
- **Target File:** `public/3d/runtime/new3ds/prop_hive_chitin_hatchery.glb`
- **Scale:** ~1.8m height, 1.6m width
- **Prompt:**
> Full 3D game prop of an armored Hive Hatchery cluster. Cluster of six large, translucent dark-amber chitin eggs nestled in a bed of wet organic moss. Undulating silhouette of embryo larvae visible through the egg membranes under a soft interior green glow, surrounded by sharp defensive chitin spikes. Terrifying alien nursery, GLB-ready.

### 6.6 Hive Carapace Molt
- **Target File:** `public/3d/runtime/new3ds/prop_hive_carapace_molt.glb`
- **Scale:** ~1.5m height, 2.2m length
- **Prompt:**
> Full 3D environment prop of a shed Hive Carapace Molt. Massive hollow insectoid exoskeleton split cleanly down the dorsal spine, made of dark iridescent chitin with dry white sinew remnants around the leg sockets and drying pools of translucent amber ichor. Grounded specimen prop, GLB-ready.

### 6.7 Cave Lichen & Spore Organisms
- **Cave Lichen (`prop_cave_lichen.glb`):** Flat spreading colony of bioluminescent cyan-blue cave lichen climbing over jagged stone base.
- **Intact Egg Cluster (`prop_cave_eggs_intact.glb`):** Dense cluster of rubbery pale-green alien eggs with prominent vascular veins.
- **Hatched Egg Shells (`prop_cave_eggs_hatched.glb`):** Broken, ruptured leathery egg shells with sticky fluid pools.
- **Spore Pod Emitter (`prop_cave_spores.glb`):** Bulbous fungal puffball pod with open chimney vents ready to burst spore clouds.
- **Organic Web Canopy (`prop_cave_webs.glb`):** Thick, layered sticky spider-hive webbing spanning across bone and iron struts.
- **Wounded Hive Wall (`prop_cave_hive_wounded.glb`):** Deep torn fleshy wall breach oozing black bio-plasma.
- **Hive Resin Sac (`prop_hive_resin_sac.glb`):** Hanging teardrop organic sac of golden translucent harvestable resin.
- **Alien Feeding Basin (`prop_alien_feeding_basin.glb`):** Hollowed-out stone basin filled with dark bubbling enzymatic digestion fluid.

---

## 7. Starship Objectives & Crash Site Props

### 7.1 Ship Reactor Core (Containment Milestone)
- **Target File:** `public/3d/runtime/new3ds/prop_ship_reactor_core.glb`
- **Scale:** ~2.2m height, 1.8m diameter
- **Prompt:**
> Full 3D milestone game prop of an exposed Starship Fusion Reactor Core. Heavy magnetic containment torus made of dark titanium and ribbed cryo conduits, surrounding an inner magnetic sphere glowing with superheated cyan-white plasma coils. Pressure gauges, bleeding nitrogen frost lines, and heavy structural tie-downs anchoring the core to cracked starship deck plates. Event Horizon core drive aesthetic, monumental technological power, GLB-ready.

### 7.2 Ship Flight Recorder (Black Box)
- **Target File:** `public/3d/runtime/new3ds/prop_ship_flight_recorder.glb`
- **Scale:** ~0.45m height, 0.6m length
- **Prompt:**
> Full 3D narrative objective prop of an armored Starship Flight Recorder (Black Box). Heavy impact-resistant rectangular chassis painted in high-visibility scorched safety orange, with charred scorch marks, exposed gold data bus pins, dual magnetic tape reels visible through a reinforced quartz viewport, and a pulsing ruby emergency location beacon on top. High-detail military avionics salvage, GLB-ready.

### 7.3 Ship Wreckage Debris & Survivor Vessel
- **Target Files:** `ship_wreckage.glb`, `survivor_vessel.glb`
- **Scale:** ~2.5m–4.0m length
- **Prompt:**
> Full 3D environment prop of a severed Starship Hull Section / Wreckage. Jagged torn titanium hull plating with exposed corrugated insulation, severed hydraulic pipe bundles, scorched electrical harnesses, and emergency thruster nozzles embedded into frozen rock. Heavy impact deformation, atmospheric re-entry scorching, PBR metallic shaders, GLB-ready.

### 7.4 Healed Starships (Scout, Tank, Engineer)
- **Target Files:** `scout_ship_healed.glb`, `tank_ship_healed.glb`, `engineer_ship_healed.glb`
- **Scale:** ~2.5m height, 4.5m length, 3.5m wingspan
- **Prompt:**
> Full 3D starship prop of a fully repaired, flight-ready expedition craft. Sleek dark gunmetal hull with all breaches sealed by glossy carbon plating and subtle biomechanical chitin reinforcements, glowing cyan ion thruster nozzles, powered navigation lights, and a pristine pressurized canopy cockpit. Pristine sci-fi resurrection aesthetic, GLB-ready.

---

## 8. Missing Achievement Cosmetic 3D Meshes

These 5 achievement rewards have catalog and logic entries but lack source 3D GLBs (see [latest-asset-loading-and-season-audit-2026-08-21.md](file:///home/caveman/Desktop/icecave/hunker-bunker/docs/latest-asset-loading-and-season-audit-2026-08-21.md)):

### 8.1 Itemdef 5001 — Ghost Runner Exosuit
- **Achievement:** `ghost` (Flawless extraction without alarms)
- **Class:** Scout Chassis
- **Target File:** `public/3d/runtime/new3ds/chassis_scout_ghost_runner.glb`
- **Prompt:**
> Full-body Scout stealth chassis in symmetrical T-pose. Pitch-black matte carbon-weave armor plates with refractive edge panels, sound-dampening ribbed rubber undergarment, narrow ultraviolet optical sensor strip on helmet, ultra-compact spinal power cell with faint violet conduits, lightweight articulated boots with vibration-absorbing soles. Clean, lethal infiltrator silhouette, no weapon, GLB-ready.

### 8.2 Itemdef 5002 — Chrono-Drifter Carbine
- **Achievement:** `quick_study` (Complete secondary milestones before 5 minutes)
- **Archetype:** Scout `talon_c`
- **Target File:** `public/3d/runtime/new3ds/skin_scout_chrono_drifter.glb`
- **Prompt:**
> Side-profile 3D weapon asset of the Chrono-Drifter Carbine, muzzle pointing left. Precision scout carbine constructed of brushed titanium and dark ceramic, featuring an integrated miniaturized vacuum tachyon chamber glowing electric cyan along the upper receiver, digital round-counter display, skeletonized stock, and tactical grip. Clean sci-fi chronometry weapon, GLB-ready.

### 8.3 Itemdef 5006 — Bunker Bastion Siege Gun
- **Achievement:** `hunkered` (Survive max-intensity defense wave)
- **Archetype:** Tank `siege_breaker50`
- **Target File:** `public/3d/runtime/new3ds/skin_tank_bunker_bastion.glb`
- **Prompt:**
> Side-profile 3D weapon asset of the Bunker Bastion Heavy Cannon, muzzle pointing left. Massive .50 cal anti-materiel cannon encased in bolted fortress-grade steel plates, heavy slotted muzzle brake, dual recoil dampener cylinders with hydraulic fluid lines, hazard stripe barrel shroud, and folding titanium bipod. Brutal industrial firepower, GLB-ready.

### 8.4 Itemdef 5009 — Archival Constructor Tesla Driver
- **Achievement:** `archivist` (Recover all 10 Horizon lore files)
- **Archetype:** Engineer `tesla_lock`
- **Target File:** `public/3d/runtime/new3ds/skin_engineer_archival_constructor.glb`
- **Prompt:**
> Side-profile 3D weapon asset of the Archival Constructor arc weapon, muzzle pointing left. Heavy precision arc-projector made of polished brass and blackened iron, featuring twin rotating induction coils with visible copper windings, miniature CRT telemetry readout along the stock, and ceramic insulators along the emitter fork. Retro-industrial engineering masterpiece, GLB-ready.

### 8.5 Itemdef 5010 — Hive-Weaver Arc Rifle
- **Achievement:** `kin` (Reach maximum bond with all 3 alien envoys)
- **Archetype:** Engineer `tesla_lock`
- **Target File:** `public/3d/runtime/new3ds/skin_engineer_hive_weaver.glb`
- **Prompt:**
> Side-profile 3D weapon asset of the Hive-Weaver Symbiotic Arc Rifle, muzzle pointing left. High-tech Tesla weapon frame fully integrated with living alien anatomy: dark polished chitin stock, bone barrel struts, a pulsating emerald bio-plasma core held in an organic muscular cradle, and tendon cables wrapped around the power rails. True human-alien symbiotic weapon, GLB-ready.

---

## 9. Ground Scatter, Narrative Artifacts & Debris

### 9.1 Environmental Scatter Items (Mesh Props / Shallow Decals)
- **Broken Service Drone (`scatter_broken_drone.glb`):** Small tracked inspection robot smashed in half, exposed wires and dead optical eye.
- **Biomechanical Debris (`scatter_biomech_debris.glb`):** Tangle of severed pneumatic tubing, bone rebar fragments, and crushed steel plate.
- **Cable Coil (`scatter_cable_coil.glb`):** Heavy industrial rubber cable wound in a messy loose coil on the deck.
- **Metal Bolts (`scatter_bolts.glb`):** Cluster of four heavy sheared titanium flange bolts with stripped threads.
- **Ice Stalagmite (`scatter_ice_stalagmite.glb`):** Jagged cluster of translucent blue-white cave ice stalagmites rising from frozen rock.
- **Cryo Icicles / Shards (`scatter_cryo_shards.glb`):** Shattered shards of cryogenic stasis glass and frozen condensation spikes.
- **Camp Supplies Scatter (`scatter_camp_supplies.glb`):** Open canvas satchel with spilled ration tins, flares, and thermal bandages.
- **Hive Eggs Scatter (`scatter_hive_eggs.glb`):** Small floor clutch of three sticky organic eggs bound by mucosal webbing.
- **Blood / Ichor Trail (`prop_blood_trail.glb` / Decal):** Directional smear of dark bio-mechanical fluid with footstep disturbances.
- **Coolant & Slime Puddles (`scatter_coolant_puddle.glb`, `scatter_slime_puddle.glb`):** Shallow, high-specular floor decals with baked contact occlusion.

### 9.2 Narrative Drops & Physical Lore Artifacts (3D Collectibles)
- **Iron Guild Dogtags (`drop_dogtags.glb`):** Pair of stamped heavy steel tags on a ball chain with etched miner identification codes.
- **Black Flask (`drop_black_flask.glb`):** Heavy matte-black insulated flask with knurled cap containing dark spore extract.
- **Child's Drawing (`drop_child_drawing.glb`):** Creased paper map fragment pinned to a flat carbon backing plate.
- **Dig Manifest (`drop_dig_manifest.glb`):** Rugged aluminum clipboard holding bloodstained excavation tally sheets.
- **First Bore Tag (`drop_first_bore_tag.glb`):** Heavy engraved brass circular tool token on an iron wire loop.
- **Frozen Letter (`drop_frozen_letter.glb`):** Sealed plastic courier envelope stiff with frost crystals.
- **Meteor Core (`drop_meteor_core.glb`):** Pitted iridescent extraterrestrial ore fragment glowing with faint internal heat.
- **Moult Shard (`drop_moult_shard.glb`):** Sharp curved blade of shed obsidian queen chitin.
- **Prayer Stone (`drop_prayer_stone.glb`):** Smooth river rock engraved with intricate hive cult spirals.
- **Ration Ledger (`drop_ration_ledger.glb`):** Waterlogged leather notebook filled with tight desperate pencil logs.
- **Resin Locket (`drop_resin_locket.glb`):** Carved bone locket containing a drop of golden preserved amber resin.
- **Security Log (`drop_security_log.glb`):** Heavily encrypted military data cartridge with glowing amber read-pins.
- **Survey Probe (`drop_survey_probe.glb`):** Dart-shaped titanium geological sensor needle with optical sensor tip.

---

## 10. Technical Production & Conversion Pipeline

1. **Generation:** Render candidate 3D meshes or clean multi-angle turnarounds conforming to the prompts above.
2. **Post-Processing & Optimization:**
   - Run through Blender/glTF-Transform pipeline: merge meshes, bake PBR textures (BaseColor, Metallic-Roughness, Normal, Emissive), calculate bounding box.
   - Apply `EXT_meshopt_compression` and Draco geometry compression to keep prop GLBs under **2 MB** and character GLBs under **6 MB**.
3. **Target Placement:** Save finalized models into `public/3d/runtime/new3ds/<asset_name>.glb`.
4. **Registration:**
   - World Props: Add entry to `WORLD_3D_MODELS` in [world3dOverlay.js](file:///home/caveman/Desktop/icecave/hunker-bunker/src/world3dOverlay.js).
   - Enemies: Add entry to `MODEL_CONFIG` in [enemy3dOverlay.js](file:///home/caveman/Desktop/icecave/hunker-bunker/src/enemy3dOverlay.js).
   - Cosmetics/Weapons: Register in `CHASSIS_SKIN_GLB_MAP` / `WEAPON_SKIN_MESHES` in [player3dOverlay.js](file:///home/caveman/Desktop/icecave/hunker-bunker/src/player3dOverlay.js) and [armoryScene.js](file:///home/caveman/Desktop/icecave/hunker-bunker/src/armoryScene.js).
5. **Validation:** Run `node scripts/audit-build-media.js` and verify rendering across 3D runtime stages.
