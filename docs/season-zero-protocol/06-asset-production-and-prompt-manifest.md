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

## 3. Deployed Runtime 3D Models (`public/3d/runtime/new3ds/*.glb`)

The following 13 3D models have been compressed for real-time WebGL rendering (1024x1024 WebP PBR textures, optimized vertex buffers, ~1.5–2.2MB per charm/mod, decimated weapon meshes) and deployed to the runtime assets folder. Original high-poly 4K source assets are preserved in the non-build directory [`art/source/new3d/`](file:///home/caveman/Desktop/icecave/hunker-bunker/art/source/new3d/):

| Itemdef | 3D Asset Name | Runtime File Path | Compressed Size | Category / Slot |
| :--- | :--- | :--- | :--- | :--- |
| `4130` | **Mini Cryo-Core Charm** | [`public/3d/runtime/new3ds/charm_mini_cryo_core.glb`](file:///home/caveman/Desktop/icecave/hunker-bunker/public/3d/runtime/new3ds/charm_mini_cryo_core.glb) | `1.90 MB` | Weapon Charm |
| `4131` | **Spent 50-Cal Casing Charm** | [`public/3d/runtime/new3ds/charm_spent_50cal.glb`](file:///home/caveman/Desktop/icecave/hunker-bunker/public/3d/runtime/new3ds/charm_spent_50cal.glb) | `1.56 MB` | Weapon Charm |
| `4132` | **Sporesnail Pearl Charm** | [`public/3d/runtime/new3ds/charm_sporesnail_pearl.glb`](file:///home/caveman/Desktop/icecave/hunker-bunker/public/3d/runtime/new3ds/charm_sporesnail_pearl.glb) | `1.63 MB` | Weapon Charm |
| `4133` | **Trench Whistle Charm** | [`public/3d/runtime/new3ds/charm_trench_whistle.glb`](file:///home/caveman/Desktop/icecave/hunker-bunker/public/3d/runtime/new3ds/charm_trench_whistle.glb) | `1.61 MB` | Weapon Charm |
| `4134` | **Glitched RAM Card Charm** | [`public/3d/runtime/new3ds/charm_glitched_ram.glb`](file:///home/caveman/Desktop/icecave/hunker-bunker/public/3d/runtime/new3ds/charm_glitched_ram.glb) | `1.79 MB` | Weapon Charm |
| `4135` | **Geodetic Compass Charm** | [`public/3d/runtime/new3ds/charm_geodetic_compass.glb`](file:///home/caveman/Desktop/icecave/hunker-bunker/public/3d/runtime/new3ds/charm_geodetic_compass.glb) | `1.64 MB` | Weapon Charm |
| `4136` | **Mini Drone Bobble Charm** | [`public/3d/runtime/new3ds/charm_mini_drone_bobble.glb`](file:///home/caveman/Desktop/icecave/hunker-bunker/public/3d/runtime/new3ds/charm_mini_drone_bobble.glb) | `1.81 MB` | Weapon Charm (Epic) |
| `4139` | **Golden Sub-Bunker Key** | [`public/3d/runtime/new3ds/charm_golden_sub_bunker_key.glb`](file:///home/caveman/Desktop/icecave/hunker-bunker/public/3d/runtime/new3ds/charm_golden_sub_bunker_key.glb) | `2.10 MB` | Weapon Charm (Legendary) |
| `4140` | **Cryo-Capacitor Overclock** | [`public/3d/runtime/new3ds/mod_cryo_capacitor.glb`](file:///home/caveman/Desktop/icecave/hunker-bunker/public/3d/runtime/new3ds/mod_cryo_capacitor.glb) | `1.88 MB` | Rig Overclock Module |
| `4141` | **Magnetic Scavenger Module**| [`public/3d/runtime/new3ds/mod_magnetic_scavenger.glb`](file:///home/caveman/Desktop/icecave/hunker-bunker/public/3d/runtime/new3ds/mod_magnetic_scavenger.glb) | `2.03 MB` | Rig Overclock Module |
| `4147` | **Zero-Point Flux Overdrive** | [`public/3d/runtime/new3ds/mod_zero_point_flux.glb`](file:///home/caveman/Desktop/icecave/hunker-bunker/public/3d/runtime/new3ds/mod_zero_point_flux.glb) | `2.00 MB` | Rig Overclock (Legendary) |
| `4109` | **Void-Walker Beam Cannon** | [`public/3d/runtime/new3ds/skin_void_walker_beam.glb`](file:///home/caveman/Desktop/icecave/hunker-bunker/public/3d/runtime/new3ds/skin_void_walker_beam.glb) | `14.06 MB` | Weapon Frame (Epic) |
| `4110` | **Queen's Carapace Carbine** | [`public/3d/runtime/new3ds/skin_queen_carapace_carbine.glb`](file:///home/caveman/Desktop/icecave/hunker-bunker/public/3d/runtime/new3ds/skin_queen_carapace_carbine.glb) | `11.97 MB` | Weapon Frame (Legendary) |

---

## 4. Master 2D Key Art References (`public/economy/*.png`)

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

## 5. Master 2D-to-3D Image Generation Prompts (Pure Isolated Space & T-Pose)

All generation prompts below are engineered specifically for the 2D-to-3D photogrammetry and mesh reconstruction pipeline:
- **Zero background interference**: Objects float cleanly in empty neutral dark space with zero ground, clutter, or scenery.
- **T-Pose for characters**: Symmetrical T-pose with arms extended horizontally and feet shoulder-width apart.
- **PBR lighting**: Studio three-point lighting highlighting metalness, roughness, and emissive conduits.

### A. Class Base Weapons (Floating in Space)

1. **Scout Base Gun: *Vector-9 Talon SMG***
   - **Prompt**: `"Full side-profile 3D game asset render of a sci-fi tactical submachine gun floating in empty neutral dark grey space. Lightweight skeletonized magnesium receiver, top Picatinny accessory rail, forward charm loop eyelet, ergonomic pistol grip, tactical flash-hider muzzle, clear polymer magazine with visible blue ammunition. Clean sharp silhouette, studio three-point lighting, photorealistic PBR materials, octane render, zero background elements, pure isolated asset, 1:1 aspect ratio."`
   - **Target 3D Mesh**: `public/3d/runtime/new3ds/gun_scout_vector9_talon.glb`

2. **Tank Base Gun: *Siege-Breaker 50 Autocannon***
   - **Prompt**: `"Full side-profile 3D game asset render of a heavy micro-missile rotary autocannon floating in empty neutral dark grey space. Thick reinforced dark industrial steel barrel shroud with yellow hazard caution stripes, overhead carrying handle with rear charm mounting eyelet, dual pneumatic recoil damper pistons, heavy cylindrical drum magazine. Clean sharp silhouette, studio lighting, PBR textures, clean metallic luster, zero background elements, pure isolated asset, 1:1 aspect ratio."`
   - **Target 3D Mesh**: `public/3d/runtime/new3ds/gun_tank_siege_breaker50.glb`

3. **Engineer Base Gun: *Tesla-Lock MK-IV Arc Driver***
   - **Prompt**: `"Full side-profile 3D game asset render of a directed electromagnetic arc emitter and structural field welder floating in empty neutral dark grey space. Heavy copper induction coils, insulated black rubber grip, central glass vacuum amplifier tube with glowing cyan electric plasma, side battery-bay latch with charm ring. Clean sharp silhouette, studio lighting, PBR textures, glowing emissive glass, zero background elements, pure isolated asset, 1:1 aspect ratio."`
   - **Target 3D Mesh**: `public/3d/runtime/new3ds/gun_engineer_tesla_lock.glb`

---

### B. Class Weapon Skins (Floating in Space)

4. **Scout Skin: *Sub-Zero Frostbite Talon SMG* (`Itemdef 4100`)**
   - **Prompt**: `"Full side-profile 3D game asset render of a sub-zero weapon skin for a tactical submachine gun floating in empty neutral dark grey space. Frosted matte-white polymer chassis, creeping crystalline blue ice patterns, glowing cyan conduit lines, subtle frost condensation on metal barrel. Clean sharp silhouette, studio lighting, PBR textures, zero background elements, pure isolated asset, 1:1 aspect ratio."`
   - **Target 3D Mesh**: `public/3d/runtime/new3ds/skin_scout_frostbite.glb`

5. **Tank Skin: *Deep Core Melter Autocannon* (`Itemdef 4107`)**
   - **Prompt**: `"Full side-profile 3D game asset render of a thermal volcanic weapon skin for a heavy autocannon floating in empty neutral dark grey space. Scorched black basalt receiver, glowing molten orange magma channels, heat-venting cooling flutes along the rotary barrel shroud. Clean sharp silhouette, studio lighting, emissive orange glow, zero background elements, pure isolated asset, 1:1 aspect ratio."`
   - **Target 3D Mesh**: `public/3d/runtime/new3ds/skin_tank_deep_core_melter.glb`

6. **Engineer Skin: *Cryo-Plasma Arc Driver* (`Itemdef 4103`)**
   - **Prompt**: `"Full side-profile 3D game asset render of an advanced high-tech weapon skin for an arc welder floating in empty neutral dark grey space. Polished titanium and cobalt-blue chassis, neon-blue superconducting magnetic rails, crystalline vacuum chamber with lightning arcs. Clean sharp silhouette, studio lighting, PBR textures, zero background elements, pure isolated asset, 1:1 aspect ratio."`
   - **Target 3D Mesh**: `public/3d/runtime/new3ds/skin_engineer_cryo_plasma.glb`

---

### C. Tactical Attachables & Charms (Floating in Space)

7. **Tactical Charm: *Amber Bio-Flask Specimen* (`Itemdef 4137`)**
   - **Prompt**: `"3D game asset prop render of an armored tactical weapon charm floating in empty neutral dark grey space. Reinforced thick glass cylindrical specimen ampoule containing glowing amber liquid and a tiny suspended alien embryo organism, sealed with heavy titanium endcaps and a steel hanging clip. Centered, studio lighting, clean PBR textures, zero background elements, pure isolated asset, 1:1 aspect ratio."`
   - **Target 3D Mesh**: `public/3d/runtime/new3ds/charm_amber_bio_flask.glb`

---

### D. Class Exosuit Characters (Clean T-Pose in Space)

8. **Scout Exosuit Operator (T-Pose)**
   - **Prompt**: `"Full body 3D character asset render of a futuristic subterranean Scout operator standing in a perfect symmetrical T-pose with arms extended horizontally and feet shoulder-width apart, floating in empty neutral dark space. Lightweight pressurized thermal white and cyan stealth exosuit, sleek tactical helmet with cyan visor optic strip, utility pouches, magnetic boot seals. Clean outline, studio character turnaround lighting, PBR materials, zero background interference, 1:1 aspect ratio."`
   - **Target 3D Mesh**: `public/3d/runtime/new3ds/char_scout_exosuit.glb`

9. **Tank Exosuit Operator (T-Pose)**
   - **Prompt**: `"Full body 3D character asset render of a heavy armored Tank operator standing in a perfect symmetrical T-pose with arms extended horizontally and feet shoulder-width apart, floating in empty neutral dark space. Heavy hydraulic blast-shield plate armor, industrial dark steel and hazard yellow plating, heavy reinforced chest respirator with twin air filters, heavy armored gauntlets. Clean outline, studio character lighting, PBR textures, zero background interference, 1:1 aspect ratio."`
   - **Target 3D Mesh**: `public/3d/runtime/new3ds/char_tank_exosuit.glb`

10. **Engineer Exosuit Operator (T-Pose)**
    - **Prompt**: `"Full body 3D character asset render of an Engineer technician operator standing in a perfect symmetrical T-pose with arms extended horizontally and feet shoulder-width apart, floating in empty neutral dark space. Reinforced hazard exosuit with copper wiring conduits, tool harness, welding visor helmet with glowing amber scanning lens, auxiliary power battery pack on back. Clean outline, studio character lighting, PBR textures, zero background interference, 1:1 aspect ratio."`
    - **Target 3D Mesh**: `public/3d/runtime/new3ds/char_engineer_exosuit.glb`


---

## 6. Synthesized Audio Assets Matrix (`public/audio/generated/*.wav`)

The following 9 original, lossless 44.1kHz WAV SFX and announcer audio assets have been procedurally synthesized and deployed to support the Armory, tactical attachables, smelting economy, and announcer callouts:

| Sound Key / Filename | Category | Description / Acoustic Characteristics |
| :--- | :--- | :--- |
| `sfx_charm_clink_light.wav` | Tactical Charm | High-pitched titanium keyring clink when moving/sprinting. |
| `sfx_charm_clink_heavy.wav` | Tactical Charm | Deep brass casing resonance and receiver impact during weapon fire. |
| `sfx_overclock_socket.wav` | Armory Bench | Crisp hydraulic pneumatic latch and magnetic snap when slotting a Rig Overclock. |
| `sfx_overclock_hum_cryo.wav` | Rig Overclock | Sub-zero cryogenic capacitor frequency pulse and frost hiss. |
| `sfx_overclock_hum_magnetic.wav`| Rig Overclock | Heavy electromagnetic copper induction coil surge and electrical arc. |
| `sfx_smelt_forge_burst.wav` | Economy / Forge | High-temperature thermal forge blast for 5:1 trade-up smelting contracts. |
| `sfx_trade_shard_dispense.wav` | Economy / Token | Deep Core Shard crystalline dispensary chime sequence (C6–E6–G6–C7). |
| `voice_commander_breached.wav` | Voice Callout | Heavy squelch burst with gruff military commander throat-mic tactical callout. |
| `voice_aura_target_down.wav` | Voice Callout | Clean synthesized female AI multi-tone harmonic announcer chime. |

