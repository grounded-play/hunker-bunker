# Season 0: Asset Production & Prompt Manifest

## 1. Art Direction & Visual Aesthetics Guide
Season 0 assets reflect the **Deep Crust Protocol** thematic identity:
- **Primary Color Palette**: Cryo Cyan (`#00e5ff`), Frost White (`#f0fdfa`), Tectonic Slate (`#1e293b`), Magma Amber (`#f59e0b`), Void Violet (`#a855f7`).
- **Surface Treatments**: Frosted metal, riveted industrial bulkheads, biomechanical chitin fibers, Damascus etched steel, and holographic CRT telemetry scans.
- **Form Language**: Chunky, utilitarian, retro-futuristic arcade silhouettes engineered for subterranean combat.

---

## 2. 3D Model Technical Specifications

### Weapon Charms (`public/models/charms/*.glb`)
- **Polygon Budget**: `800 – 1,500 Triangles`.
- **Texture Map**: Single `512x512` PBR atlas (Albedo, Metallic/Roughness packed, Normal, Emissive).
- **Origin / Pivot**: Positioned exactly at the attachment ring apex `(0, 0, 0)`.
- **LODs**: LOD0 only (micro-trinket scale renders cheaply in forward rendering).

### Rig Modules & Chips (`public/models/mods/*.glb`)
- **Polygon Budget**: `500 – 1,000 Triangles`.
- **Dimensions**: Standard 60mm × 40mm × 8mm modular cartridge with glowing connector pins.

---

## 3. Generated 2D Master References (Ready for 2D-to-3D Pipeline)

The following master 2D key art assets have been generated and deployed to `public/economy/`, ready for image-to-3D (`.glb`) mesh reconstruction and direct in-game icon display:

| Itemdef | Asset Name | File Path | Type / Category | Visual Key Highlights |
| :--- | :--- | :--- | :--- | :--- |
| `4130` | **Mini Cryo-Core Charm** | [`public/economy/charm_mini_cryo_core.png`](file:///home/caveman/Desktop/icecave/hunker-bunker/public/economy/charm_mini_cryo_core.png) | Tactical Charm | Frosted reactor cube, cyan cooling coils, carabiner chain |
| `4131` | **Spent 50-Cal Casing Charm** | [`public/economy/charm_spent_50cal.png`](file:///home/caveman/Desktop/icecave/hunker-bunker/public/economy/charm_spent_50cal.png) | Tactical Charm | Engraved brass shell, hazard stripes, military ball chain |
| `4132` | **Sporesnail Pearl Charm** | [`public/economy/charm_sporesnail_pearl.png`](file:///home/caveman/Desktop/icecave/hunker-bunker/public/economy/charm_sporesnail_pearl.png) | Tactical Charm | Bioluminescent green pearl, 4-prong titanium mechanical claw |
| `4133` | **Trench Whistle Charm** | [`public/economy/charm_trench_whistle.png`](file:///home/caveman/Desktop/icecave/hunker-bunker/public/economy/charm_trench_whistle.png) | Tactical Charm | Weathered steel military whistle, engraved serial, ball chain |
| `4134` | **Glitched RAM Card Charm** | [`public/economy/charm_glitched_ram.png`](file:///home/caveman/Desktop/icecave/hunker-bunker/public/economy/charm_glitched_ram.png) | Tactical Charm | Green PCB memory stick, flickering micro LEDs, lanyard clip |
| `4135` | **Geodetic Compass Charm** | [`public/economy/charm_geodetic_compass.png`](file:///home/caveman/Desktop/icecave/hunker-bunker/public/economy/charm_geodetic_compass.png) | Tactical Charm | Vintage brass bunker compass, phosphorescent cyan dial |
| `4136` | **Mini Drone Bobble Charm** | [`public/economy/charm_mini_drone_bobble.png`](file:///home/caveman/Desktop/icecave/hunker-bunker/public/economy/charm_mini_drone_bobble.png) | Tactical Charm | Chibi sentry turret, orange/white livery, cyan LED eye |
| `4139` | **Golden Sub-Bunker Key** | [`public/economy/charm_golden_sub_bunker_key.png`](file:///home/caveman/Desktop/icecave/hunker-bunker/public/economy/charm_golden_sub_bunker_key.png) | Tactical Charm (Legendary) | Solid gold antique bunker skeleton key, radiant god-rays |
| `4140` | **Cryo-Capacitor Overclock** | [`public/economy/mod_cryo_capacitor.png`](file:///home/caveman/Desktop/icecave/hunker-bunker/public/economy/mod_cryo_capacitor.png) | Rig Overclock Module | Frosted heatsink fins, cyan conduits, gold connector pins |
| `4141` | **Magnetic Scavenger Module**| [`public/economy/mod_magnetic_scavenger.png`](file:///home/caveman/Desktop/icecave/hunker-bunker/public/economy/mod_magnetic_scavenger.png) | Rig Overclock Module | Yellow hazard chassis, copper induction coils, toggle switch |
| `4147` | **Zero-Point Flux Overdrive** | [`public/economy/mod_zero_point_flux.png`](file:///home/caveman/Desktop/icecave/hunker-bunker/public/economy/mod_zero_point_flux.png) | Rig Overclock (Legendary) | Obsidian casing, glass sphere with cosmic purple singularity |
| `4109` | **Void-Walker Beam Cannon** | [`public/economy/skin_void_walker_beam.png`](file:///home/caveman/Desktop/icecave/hunker-bunker/public/economy/skin_void_walker_beam.png) | Weapon Skin (Epic) | Obsidian frame, violet event horizon emitter, neon coils |
| `4110` | **Queen's Carapace Carbine** | [`public/economy/skin_queen_carapace_carbine.png`](file:///home/caveman/Desktop/icecave/hunker-bunker/public/economy/skin_queen_carapace_carbine.png) | Weapon Skin (Legendary) | Living insectoid chitin, pulsing orange heat vents, sinew |

---

## 4. Asset Generation Prompts Manifest

### A. Tactical Weapon Charms (Image & 3D Prompts)
```markdown
1. Mini Cryo-Core Charm (4130)
Prompt: "A miniature tactical weapon charm, tiny glowing cryogenic reactor cube venting faint blue frost vapor, attached to a heavy steel keyring and carabiner chain, industrial sci-fi aesthetic, dark background, 8k resolution, octane render, unreal engine 5, clean PBR textures."

2. Spent 50-Cal Casing Charm (4131)
Prompt: "A heavy brass 50-caliber spent bullet casing weapon charm, laser-engraved with retro bunker coordinates and hazard stripes, dangling from a weathered dog-tag chain, metallic luster, photorealistic, micro-detail."

3. Sporesnail Pearl Charm (4132)
Prompt: "An iridescent bio-luminescent alien pearl charm, held in a delicate four-pronged titanium claw setting, emitting a faint green bioluminescent glow, sci-fi subterranean artifact, high fidelity."

4. Miniaturized Drone Bobble (4136)
Prompt: "A cute, stylized chibi sentry turret drone weapon charm, white and orange chassis with an active cyan optical sensor, hanging from a braided paracord strap, crisp edges, premium 3D game asset."

5. Golden Sub-Bunker Key Charm (4139)
Prompt: "An ornate solid gold antique bunker skeleton key weapon charm, detailed geometric engravings, emitting radiant golden god-rays and amber particle sparkles, luxury legendary game cosmetic, 8k."
```

### B. Weapon Skins (Albedo & Texture Prompts)
```markdown
1. Sub-Zero Frostbite Sidearm (4100)
Prompt: "Weapon skin texture map for a futuristic tactical pistol, frosted white polymer frame with creeping ice crystal frost patterns, glowing cyan cooling lines, cryogenic aesthetic, clean flat game texture layout."

2. Queen's Carapace Carbine (4110)
Prompt: "Legendary weapon skin for a tactical assault rifle, crafted from living alien insectoid chitin and black biomechanical muscle fibers, glowing orange bio-vents pulsing along the receiver, organic alien weapon, hyper-detailed."

3. Solar Flare Antimatter Rifle (4111)
Prompt: "Legendary railgun sniper rifle skin, pure polished gold and obsidian carbon fiber construction, glowing corona of solar plasma swirling along the barrel rails, celestial antimatter weapon, radiant visual design."
```

### C. Audio Callout & SFX Prompts
```markdown
1. Soviet Sub-Commander Radio (4148)
Prompt: "Heavy radio static burst followed by a deep, authoritative military commander voice speaking through a tactical throat microphone in English: 'Sector breached! Reloading heavy ordnance, hold the corridor!'"

2. Synthesized AI Unit 'AURA' (4149)
Prompt: "Clean, synthesized female tactical combat AI voice with light harmonic reverb: 'Warning: Cryo-core capacity at maximum. Subterranean entity neutralized. Proceed to next checkpoint.'"
```
