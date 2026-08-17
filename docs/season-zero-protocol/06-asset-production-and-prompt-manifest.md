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

## 3. Asset Generation Prompts Manifest

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
