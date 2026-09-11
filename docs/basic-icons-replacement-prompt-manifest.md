# Basic & Procedural Icons Replacement Prompt Manifest

**Document ID:** `DOC-ICON-REPLACE-2026-09-10`  
**Status:** Production Replacement Queue  
**Style Standard:** Deep Crust Protocol / Octane Render 3D Game Asset / Studio Lighting  
**Target Output Resolutions per Item:**
- `public/economy/<slug>.png` ($256 \times 256$ RGBA PNG)
- `public/economy/<slug>_large.png` ($512 \times 512$ RGBA PNG)
- `steam/store/item_icons/<slug>_master.png` ($1254 \times 1254$ RGBA PNG)
- `steam/store/item_icons/chroma/<slug>_chroma.png` ($1254 \times 1254$ Monochrome Silhouette)

---

## 1. Overview & Audit

When Season 0 was initially populated, 24 item definitions were generated using flat 2D procedural vector SVG templates (`scripts/generate-season-procedural-assets.py`). Items like **Emerald Radar Phosphor HUD (4151)** currently use primitive geometry (concentric SVG circles and raw text) rather than high-fidelity 3D renders.

This manifest documents all **31 total legacy/basic icons** that need upgrading to match the visual fidelity of the Sprint 34 collection, along with copy-paste production prompts for each item.

---

## 2. Priority Master Catalog

### Category A: Audio, HUD Themes & Weapon FX Mutators (Priority 1)

| Itemdef | Item Name | File Slug | Rarity | Current Vector Asset |
| :--- | :--- | :--- | :--- | :--- |
| **`4151`** | **Emerald Radar Phosphor HUD** | `hudtheme_emerald_radar` | Rare | Flat green SVG circles with crosshairs & "SONAR RADAR" text |
| **`4150`** | **Amber CRT Monitor Theme** | `hudtheme_amber_crt` | Rare | Flat brown box with orange oscilloscope line & terminal text |
| **`4152`** | **Emerald Void Tracer Rounds** | `fx_emerald_void_tracer` | Epic | Flat green polygon with horizontal line & "EMERALD TRACER" text |
| **`4153`** | **Cryo Shockwave Muzzle Flare** | `fx_cryo_shockwave_muzzle` | Epic | Flat blue circle with polygon diamond spikes |
| **`4148`** | **Soviet Sub-Commander Radio** | `voicepack_soviet_commander` | Rare | Flat grey circle with cartoon headset and red star |
| **`4149`** | **Synthesized AI Unit 'AURA'** | `voicepack_aura` | Rare | Flat blue circle with 2 bezier curves |

### Category B: Rig Overclock Cartridges (Priority 2)

| Itemdef | Item Name | File Slug | Rarity | Current Vector Asset |
| :--- | :--- | :--- | :--- | :--- |
| **`4146`** | **Symbiotic Adrenaline Pump** | `mod_symbiotic_adrenaline_pump` | Epic | Flat pill shape with "BPM: 185" text |

### Category C: Tactical Decals, Badges & Insignia (Priority 3)

| Itemdef | Item Name | File Slug | Rarity | Current Vector Asset |
| :--- | :--- | :--- | :--- | :--- |
| **`4120`** | **Sub-Zero Pioneer Patch** | `decal_subzero_pioneer` | Uncommon | Flat shield with stick ice axes |
| **`4121`** | **Radiation Trefoil Emblem** | `decal_radiation_trefoil` | Uncommon | Flat yellow octagon with black trefoil |
| **`4122`** | **Sporesnail Hunter Crest** | `decal_sporesnail_hunter_crest` | Uncommon | Flat green circle with spiral line |
| **`4123`** | **Bunker 404 Lost Squad Decal** | `decal_bunker404_lost_squad` | Rare | Flat dark hexagon with "404" text |
| **`4124`** | **Cyber-Skull Tactical Pin** | `decal_cyber_skull_tactical_pin` | Rare | Flat silhouette skull with cyan circles for eyes |
| **`4125`** | **Cryo-Phoenix Insignia** | `decal_cryo_phoenix` | Rare | Flat blue circle with geometric bird shape |
| **`4127`** | **Void Horizon Sigil** | `decal_void_horizon_sigil` | Epic | Flat dark circle with purple ring ellipse |
| **`4128`** | **Ancient Core Glyphs** | `decal_ancient_core_glyphs` | Epic | Flat stone rectangle with stick glyphs |
| **`4129`** | **Grand Marshal Relic Crest** | `decal_grand_marshal_relic_crest` | Legendary | Flat shield with geometric yellow eagle |

### Category D: Operative Chassis Outfits (Priority 4)

| Itemdef | Item Name | File Slug | Class | Current Vector Asset |
| :--- | :--- | :--- | :--- | :--- |
| **`4112`** | **Sub-Terran Drill Engineer** | `chassis_subterran_drill_engineer` | Engineer | Flat yellow armor 2D silhouette |
| **`4113`** | **Cryo-Vanguard Scout** | `chassis_cryo_vanguard_scout` | Scout | Flat white/cyan armor 2D silhouette |
| **`4114`** | **Trench Warden Heavy** | `chassis_trench_warden_heavy` | Tank | Flat steel cuirass 2D silhouette |
| **`4115`** | **Void Commando Recon** | `chassis_void_commando_recon` | Scout | Flat black nano-weave 2D silhouette |
| **`4116`** | **Bio-Synthesizer Harness** | `chassis_bio_synthesizer_medic` | All | Flat green armor with white cross silhouette |
| **`4117`** | **Dreadnought Exo-Juggernaut** | `chassis_dreadnought_exo_juggernaut` | Tank | Flat dark silhouette with orange furnace lines |
| **`4118`** | **Cyber-Spectre Infiltrator** | `chassis_cyber_spectre_infiltrator` | Scout | Flat dark silhouette with blue hexagons |
| **`4119`** | **Hive-Lord Symbiote Exosuit** | `chassis_hive_lord_symbiote` | All | Flat purple chitin 2D silhouette |

### Category E: Season 0 Weapon Finishes (Priority 5)

| Itemdef | Item Name | File Slug | Archetype | Current Status |
| :--- | :--- | :--- | :--- | :--- |
| **`4101`** | **Hazard Stripe SMG** | `skin_hazard_stripe_smg` | Scout | Flat 2D vector graphic |
| **`4102`** | **Tectonic Driller Shotgun** | `skin_tectonic_driller` | Tank | Flat 2D vector graphic |
| **`4104`** | **Rust & Bone Trench Carbine** | `skin_rust_bone_trench` | Scout | Flat 2D vector graphic |
| **`4105`** | **Obsidian Shard Revolver** | `skin_obsidian_shard` | Scout | Flat 2D vector graphic |
| **`4106`** | **Biolume Spore Sprayer** | `skin_biolume_spore_sprayer` | Tank | Flat 2D vector graphic |
| **`4108`** | **Glitched Circuit Bolter** | `skin_glitched_circuit_bolter` | Scout | Flat 2D vector graphic |
| **`4111`** | **Solar Flare Antimatter Rifle** | `skin_solar_flare_antimatter` | Engineer | Flat 2D vector graphic |

### Category F: Base Game Victory Patches

| Itemdef | Item Name | File Slug | Current Status |
| :--- | :--- | :--- | :--- |
| **`2000`** | **Scout Victory Patch** | `patch_scout` | Legacy 2D flat embroidered patch |
| **`2001`** | **Tank Victory Patch** | `patch_tank` | Legacy 2D flat embroidered patch |
| **`2002`** | **Engineer Victory Patch** | `patch_engineer` | Legacy 2D flat embroidered patch |

---

## 3. Production Image Generation Prompts

### Category A: HUD Themes, Tracers, Muzzle VFX & Audio (Items 4148–4153)

#### `4151` — Emerald Radar Phosphor HUD
```text
3D game asset render of a round military tactical night-vision radar scope terminal floating in empty dark space. Heavy scratched cast-iron and dark-green military casing, thick convex glass screen glowing with vibrant emerald-green radar sweep line, concentric distance grid rings, glowing enemy blip pings, subtle glowing green tritium dial markers on the outer bezel. Realistic glass reflections, volumetric phosphor glow, studio lighting, octane render, clean isolated asset, no text, 1:1 aspect ratio.
```

#### `4150` — Amber CRT Monitor Theme
```text
3D game asset render of a retro-futuristic 1980s subterranean bunker CRT monitor terminal floating in empty dark space. Heavy weathered dark composite polymer casing, curved amber glass screen displaying glowing warm amber-gold scanlines, an active oscilloscope pulse wave, mechanical rotary dials and toggle switches along the side bezel. High-detail phosphor bloom, studio lighting, octane render, clean isolated asset, no text, 1:1 aspect ratio.
```

#### `4152` — Emerald Void Tracer Rounds
```text
3D game asset render of a high-tech sci-fi ballistic projectile cartridge floating diagonally in empty dark space. Polished dark titanium casing, translucent emerald-green crystalline tip radiating intense glowing green energy, trailing volumetric green plasma ionization wisps and micro spark particles, bullet pointing up and to the left. Studio three-point lighting, octane render, clean isolated asset, no text, 1:1 aspect ratio.
```

#### `4153` — Cryo Shockwave Muzzle Flare
```text
3D game asset render of a heavy tactical weapon muzzle brake triggering a cryogenic flash in empty dark space. Deep blue and frosted titanium muzzle device surrounded by an explosive freeze-frame burst of jagged cyan ice crystals, sub-zero frost shockwave rings, and drifting frozen snow particles. High-detail PBR glass and frost, octane render, clean isolated asset, no text, 1:1 aspect ratio.
```

#### `4148` — Soviet Sub-Commander Radio
```text
3D game asset render of a rugged Cold War military field communications radio and throat-mic headset floating in empty dark space. Heavy olive-drab steel casing with chipped paint, illuminated warm vacuum amplifier tubes, analog frequency tuning dial, coiled heavy rubber cables, brass toggle switches and a weathered red enamel star emblem badge. Studio lighting, octane render, clean isolated asset, no text, 1:1 aspect ratio.
```

#### `4149` — Synthesized AI Unit 'AURA'
```text
3D game asset render of an advanced tactical artificial intelligence core floating in empty dark space. Spherical multifaceted crystalline core orb with glowing cyan and electric-blue neural light conduits inside, surrounded by floating thin metallic orbital rings and holographic acoustic soundwave arcs. Clean sci-fi aesthetic, octane render, clean isolated asset, no text, 1:1 aspect ratio.
```

---

### Category B: Rig Overclock Cartridge (Item 4146)

#### `4146` — Symbiotic Adrenaline Pump
```text
3D game asset render of a modular sci-fi cybernetic rig overclock cartridge, approximately 60x40x8mm, floating in empty dark space. Brushed dark titanium housing, gold-plated docking connector pins, a reinforced central cylindrical glass ampoule filled with bubbling glowing crimson adrenaline fluid, wrapped with synthetic biomechanical alien muscle sinew and micro hydraulic pistons. Studio lighting, octane render, clean isolated asset, no text, 1:1 aspect ratio.
```

---

### Category C: Tactical Decals, Badges & Insignia (Items 4120–4129)

#### `4120` — Sub-Zero Pioneer Patch
```text
High-detail 3D game asset render of an embroidered tactical military velcro morale patch floating in empty dark space. Thick stitched navy-blue and slate fabric border, finely stitched silver and cyan mountain peak with two crossed climbing ice axes, realistic fabric weave texture, tactile embroidery thread luster. Studio lighting, octane render, clean isolated asset, no text, 1:1 aspect ratio.
```

#### `4121` — Radiation Trefoil Emblem
```text
High-detail 3D game asset render of a weathered cast-metal hazard badge floating in empty dark space. Chipped yellow industrial hazard paint over heavy pitted cast iron, deep embossed black radiation trefoil emblem, industrial rivet fasteners in the corners, subtle rust along the edges. Studio lighting, octane render, clean isolated asset, no text, 1:1 aspect ratio.
```

#### `4122` — Sporesnail Hunter Crest
```text
High-detail 3D game asset render of a hunting veteran crest pin floating in empty dark space. Iridescent polished alien snail shell with glowing emerald and pearl swirls, mounted on a dark gunmetal mechanical claw badge with tiny bioluminescent spore nodes. Studio lighting, octane render, clean isolated asset, no text, 1:1 aspect ratio.
```

#### `4123` — Bunker 404 Lost Squad Decal
```text
High-detail 3D game asset render of a subterranean military squad memorial medallion floating in empty dark space. Matte-black carbon shield, engraved red hazard warning stripes, a carved industrial drill bit insignia in worn titanium, battle damage scratches and scorched edges. Studio lighting, octane render, clean isolated asset, no text, 1:1 aspect ratio.
```

#### `4124` — Cyber-Skull Tactical Pin
```text
High-detail 3D game asset render of an aggressive cybernetic skull badge floating in empty dark space. Polished dark chrome skull with faceted carbon-fiber cheekplates, glowing cyan optical sensor lenses with a subtle digital targeting reticle over the left eye, gold connection pins. Studio lighting, octane render, clean isolated asset, no text, 1:1 aspect ratio.
```

#### `4125` — Cryo-Phoenix Insignia
```text
High-detail 3D game asset render of an ornate ice phoenix emblem floating in empty dark space. Carved translucent glacial blue ice and polished white gold, stylized rising wings with crystalline ice flares and frost vapor wisps. Studio lighting, octane render, clean isolated asset, no text, 1:1 aspect ratio.
```

#### `4127` — Void Horizon Sigil
```text
High-detail 3D game asset render of an alien cosmic sigil floating in empty dark space. Deep obsidian black core ring with an orbiting distorted violet gravitational accretion disk, pulsing purple energy runes engraved into dark metal. Studio lighting, octane render, clean isolated asset, no text, 1:1 aspect ratio.
```

#### `4128` — Ancient Core Glyphs
```text
High-detail 3D game asset render of an ancient subterranean alien stone relic tablet floating in empty dark space. Weathered dark basalt slab with deeply carved alien geometric hieroglyphs glowing with pulsing electric-cyan energy from within the stone fissures. Studio lighting, octane render, clean isolated asset, no text, 1:1 aspect ratio.
```

#### `4129` — Grand Marshal Relic Crest
```text
High-detail 3D game asset render of an imperial military crest floating in empty dark space. Solid antique gold and meteorite iron double-headed eagle emblem, adorned with a regal crown, holding an orbital scepter and power sphere, intricate filigree and polished luster. Studio lighting, octane render, clean isolated asset, no text, 1:1 aspect ratio.
```

---

### Category D: Operative Chassis Outfits (Items 4112–4119)

#### `4112` — Sub-Terran Drill Engineer
```text
Full-body 3D game character asset render of a heavy industrial subterranean Engineer exosuit floating in empty dark space. Thick hazard-yellow and dark-steel hydraulic blast armor, reinforced chest cage, helmet with an ultra-bright halogen searchlight visor, copper cabling conduits. Studio three-quarter character lighting, octane render, clean isolated asset, no text, 1:1 aspect ratio.
```

#### `4113` — Cryo-Vanguard Scout
```text
Full-body 3D game character asset render of a sleek arctic stealth Scout exosuit floating in empty dark space. Pressurized thermal matte-white and ice-blue armored plating, slim aerodynamic silhouette, narrow glowing cyan optical visor slit, utility pouches and magnetic boots. Studio lighting, octane render, clean isolated asset, no text, 1:1 aspect ratio.
```

#### `4114` — Trench Warden Heavy
```text
Full-body 3D game character asset render of a brutal frontline Tank exosuit floating in empty dark space. Riveted ballistic steel cuirass, heavy twin-canister gas respirator mask, reinforced crimson chest blast shield, heavy hydraulic gauntlets. Studio lighting, octane render, clean isolated asset, no text, 1:1 aspect ratio.
```

#### `4115` — Void Commando Recon
```text
Full-body 3D game character asset render of a black-ops subterranean recon exosuit floating in empty dark space. Matte-black nano-carbon weave armor with acoustic dampening plates, faceted multi-lens purple night-vision optic cluster on helmet, compact stealth thruster pack. Studio lighting, octane render, clean isolated asset, no text, 1:1 aspect ratio.
```

#### `4116` — Bio-Synthesizer Harness
```text
Full-body 3D game character asset render of a tactical combat medic support exosuit floating in empty dark space. Worn bone-white ceramic plating, integrated bio-injector harness with glowing emerald and amber medicine vials, flexible rubber tubes feeding into spine injectors. Studio lighting, octane render, clean isolated asset, no text, 1:1 aspect ratio.
```

#### `4117` — Dreadnought Exo-Juggernaut
```text
Full-body 3D game character asset render of an immense heavy Tank power-armor suit floating in empty dark space. Massive industrial dark-slate armor plates with heavy hydraulic pistons, glowing fiery-orange thermal furnace grate in the chest plate venting heat. Studio lighting, octane render, clean isolated asset, no text, 1:1 aspect ratio.
```

#### `4118` — Cyber-Spectre Infiltrator
```text
Full-body 3D game character asset render of a cybernetic stealth operative chassis floating in empty dark space. Segmented graphite armor with subtle hexagonal active-camouflage mesh patterns, sleek mirrored cyan cyber-visor, glowing blue circuit traces. Studio lighting, octane render, clean isolated asset, no text, 1:1 aspect ratio.
```

#### `4119` — Hive-Lord Symbiote Exosuit
```text
Full-body 3D game character asset render of an alien-human hybrid symbiotic power armor floating in empty dark space. Organic iridescent violet chitin plates fused with forged dark steel framing, horned bio-carapace helmet with glowing green multifaceted eyes, pulsing organic vascular conduits. Studio lighting, octane render, clean isolated asset, no text, 1:1 aspect ratio.
```

---

### Category E: Weapon Finishes (Items 4101–4111)

#### `4101` — Hazard Stripe SMG
```text
Full side-profile 3D game asset render of a tactical submachine gun weapon finish floating in empty dark space, muzzle pointing left. High-visibility matte-yellow receiver with sharp diagonal black hazard caution stripes, worn metal edges, Picatinny top rail, tactical grip. Studio lighting, octane render, clean isolated asset, no text, 1:1 aspect ratio.
```

#### `4102` — Tectonic Driller Shotgun
```text
Full side-profile 3D game asset render of a heavy combat shotgun weapon finish floating in empty dark space, muzzle pointing left. Heavy ribbed tungsten heat shroud, heat-scorched fluted barrel, industrial hydraulic pump slide, tactical iron sights. Studio lighting, octane render, clean isolated asset, no text, 1:1 aspect ratio.
```

#### `4104` — Rust & Bone Trench Carbine
```text
Full side-profile 3D game asset render of a subterranean trench carbine weapon finish floating in empty dark space, muzzle pointing left. Heavily pitted rusted cast-iron receiver, polished ivory alien bone stock and foregrip with subtle green bioluminescent mineral veins, worn leather cord wrapping. Studio lighting, octane render, clean isolated asset, no text, 1:1 aspect ratio.
```

#### `4105` — Obsidian Shard Revolver
```text
Full side-profile 3D game asset render of a heavy magnum revolver weapon finish floating in empty dark space, muzzle pointing left. Polished volcanic obsidian glass frame with razor-sharp beveled edges, folded Damascus steel cylinder, glowing purple micro-fracture veins. Studio lighting, octane render, clean isolated asset, no text, 1:1 aspect ratio.
```

#### `4106` — Biolume Spore Sprayer
```text
Full side-profile 3D game asset render of a heavy biomechanical chemical sprayer weapon finish floating in empty dark space, muzzle pointing left. Dark corrosion-resistant industrial receiver, twin translucent glass canisters glowing with volatile bubbling emerald spore fluid, ribbed rubber delivery hoses. Studio lighting, octane render, clean isolated asset, no text, 1:1 aspect ratio.
```

#### `4108` — Glitched Circuit Bolter
```text
Full side-profile 3D game asset render of a high-tech combat rifle weapon finish floating in empty dark space, muzzle pointing left. Translucent smoky polymer receiver revealing glowing green exposed circuit boards with flickering holographic error glitches and digital diagnostic readouts. Studio lighting, octane render, clean isolated asset, no text, 1:1 aspect ratio.
```

#### `4111` — Solar Flare Antimatter Rifle
```text
Full side-profile 3D game asset render of an ultra-legendary antimatter precision rifle floating in empty dark space, muzzle pointing left. Polished white ceramic and solid gold filigree frame, exposed central magnetic containment chamber containing a miniature blazing yellow-white sun plasma core with corona flares. Studio lighting, octane render, clean isolated asset, no text, 1:1 aspect ratio.
```

---

## 4. Substitution Workflow

When you have generated replacement artwork:

1. **Drop Raw Files**: Place the new image files (PNG or JPEG) into `public/` or `art/source/raw/`.
2. **Batch Scaling**: We execute the automated image processor to produce the 4 required production files per item:
   ```bash
   python3 scripts/process-season-assets.py <input_image_path> <file_slug>
   ```
3. **Automated Audit**: Run presubmit checks to verify zero unapproved chroma pixels and that all catalog tests pass:
   ```bash
   npm run presubmit
   ```
4. **Live Result**: The game client, Armory UI, and Steam Vault will immediately render the high-fidelity 3D artwork in place of the old procedural vectors.
