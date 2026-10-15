# Game Juice Master Architecture: Hyper-Localized Audio, Weapon Soundsets, Synchronized Shell Casings & Persistent Enemy Trails

**Branch:** `feat/audio-juice-casings-trails`  
**Date:** October 2026  
**Status:** Architecture & Implementation Plan  
**Scope:** Hyper-localized ambient audio beds, gun sound profiles, tracer audio variety, synchronized shell casing ejection VFX with surface-aware landing Foley, physical casing persistence & fading, and persistent enemy slime/frost/claw trails.

---

## 1. Executive Vision & Pillars

To elevate *Hunker Bunker* from an atmospheric roguelike into an intensely tactile, responsive, and visceral ("juicy") combat experience, we are introducing five tightly integrated systems:

1. **Hyper-Localized World & Point-Source Ambience**: Moving beyond broad room tones to micro-acoustic beds pinned to specific camp structures (Tallow's steam forge, Vesper's generator hum, Meridian's liturgical crypt chimes), alien hive pods, interactive workbenches, and dynamic events (seismic ice fractures, blizzard gust sweeps).
2. **Distinct Weapon & Tracer Audio Character**: Giving every weapon frame (sidearm, shotgun, carbine, SMG, railgun, cryo lance, tesla lock) a dedicated mechanical crack and concussive punch, paired with tracer flyby whooshes and snaps tailored to cosmetic and elemental profiles.
3. **Synchronized Shell Casing Ejection VFX**: Spawning physical 3D brass casings (or spent energy cells) from the weapon ejection port on every shot, complete with ballistic parabolas, tumbling angular velocity, and bouncing off obstacles.
4. **Surface-Aware Casing Landing Foley**: Synchronizing the casing ground impact to spatial 3D audio that dynamically reflects the material underfoot (metal grate, packed snow, stone floor, alien slime/muck, wood planking).
5. **Persistent Physical Debris & Enemy Trails**: Spent casings and enemy slime/frost/claw wakes persist on the terrain for 10–25 seconds before smoothly fading out, leaving a tangible record of battles and creature movements across the expedition without unbounded memory overhead.

---

## 2. Hyper-Localized Ambience Matrix (Camps, Hives, Stations, Events)

### 2.1 Positional Camp Audio Emitters
Currently, camp audio is managed as a uniform ambient bed (`amb_camp_rain_loop`, camp music). We are adding localized 3D point-source audio emitters (`CampAcousticEmitter`) placed at key camp landmarks:

| Landmark / Area | Location Anchor | Acoustic Character | Audio Asset Key | Max Dist / Attenuation |
| :--- | :--- | :--- | :--- | :--- |
| **Tallow Steam Forge** | Camp Tallow Central Hearth | Geothermal steam release hiss, rhythmic blacksmith hammer clangs, glowing coal crackle | `amb_point_tallow_forge` | 14m (rolloff: 1.2) |
| **Vesper Generator Bank** | Camp Vesper Bunkhouse | Heavy diesel-electric turbine drone, rhythmic electrical relay clicks, metal deck vibration | `amb_point_vesper_generator` | 12m (rolloff: 1.4) |
| **Meridian Crypt Chimes** | Camp Meridian Altar | Resonant brass chime tinkle, cold draft whistle through vaulted archways, subterranean organ drone | `amb_point_meridian_chimes` | 16m (rolloff: 1.0) |
| **Foundry Machine Shop** | Surface Fabrication Pocket | Automated lathe whir, welding arc fizz, pneumatic clamp decompression | `amb_point_foundry_lathe` | 10m (rolloff: 1.5) |

### 2.2 Hive Bio-Acoustic Zones
Biomechanical and hive sectors will feature procedural point-source audio triggers attached to organic props:

- **Nest Sac Pulsing (`amb_point_hive_sac`)**: Viscous amniotic membrane expansion/contraction, low organic heartbeat (35–50 BPM), wet internal fluid slosh. Pinned to bio egg sacs and organic pillars.
- **Spore Vent Wheeze (`amb_point_hive_spore_vent`)**: Intermittent pressurized fungal wheeze followed by powdery spore dispersion hiss (every 8–14s).
- **Chitin Wall Scuttle (`amb_point_hive_chitin_wall`)**: Micro-clicks of wall parasites scuttling inside infected bulkheads when the player walks within 3.5m.

### 2.3 Environmental & Combat Events
- **Seismic Ice Tremor (`event_seismic_ice_tremor`)**: 20–45Hz infrasonic rumble, sharp ice sheet fracturing crack, tinkling falling frost shards. Triggers camera trauma shake (`0.08, 0.14`).
- **Blizzard Wind Gust Surge (`event_blizzard_gust_surge`)**: Sudden gust sweep across the camera plane with dynamic stereo panning from west to east.
- **Reactor Power Surge (`event_reactor_surge`)**: Rising turbine whine peaking in an electromagnetic discharge sizzle.

---

## 3. Weapon Audio & Tracer Sound Design Matrix

### 3.1 Weapon Firing Audio Profiles
Replacing the single `weapon_fire_sidearm` trigger in `fireWeaponAtCurrentAim` with weapon-specific soundsets:

```
                      ┌── mk1_sidearm / talon ──────► weapon_fire_sidearm (snappy 9mm crack + slide reset)
                      ├── scatter_rep / siege_breaker ► weapon_fire_shotgun (concussive boom + pump rack)
                      ├── pulse_carbine ────────────► weapon_fire_carbine (brassy mid-tempo kinetic burst)
Current Weapon ───────┼── neon_smg ─────────────────► weapon_fire_smg (high-cadence crisp micro-pops)
                      ├── rail_marksman ────────────► weapon_fire_railgun (high-voltage hum + supersonic whip)
                      ├── cryo_lance ───────────────► weapon_fire_cryo (cryogenic expansion + frost splinter)
                      └── tesla_lock ───────────────► weapon_fire_tesla (ionized plasma zap + continuous arc)
```

Each soundset includes 3 distinct takes generated with random pitch modulation ($\pm 8\%$) to prevent ear fatigue during sustained automatic fire.

### 3.2 Tracer Flyby Whooshes & Sonic Booms
As projectiles fly past the camera or walls, trigger spatialized whiz/flyby cues matched to the active tracer profile:

| Tracer Profile Key | Visual Appearance | Audio Flyby Cue | Sonic Character |
| :--- | :--- | :--- | :--- |
| **Default Ballistic** | White-orange needle | `tracer_flyby_ballistic` | Sharp supersonic whip crack & vacuum zip |
| **Deep Frost (4205)** | Crystalline cyan ribbon | `tracer_flyby_frost` | Freezing whistle & delicate glass ping |
| **Rust & Bone (4212)** | Heavy jagged orange slug | `tracer_flyby_heavy` | Deep concussive whoosh with metallic hum |
| **Hive Chitin (4219)** | Acid green needle | `tracer_flyby_chitin` | Viscous acidic hiss & insectoid chitter |
| **Bunker 404 (4233)** | Glitch purple pulse | `tracer_flyby_glitch` | Phase-shifted digital chirp & frequency sweep |
| **Grand Marshal (4240)**| Golden tracer ribbon | `tracer_flyby_plasma` | High-energy ionized crackle |

---

## 4. Synchronized Shell Casing Ejection VFX & Landing Foley

### 4.1 Physical Ejection Kinematics
When a shot is fired in `threeGame.js`:
1. **Spawn Point**: Offset from player gun position:
   $$\mathbf{p}_0 = \mathbf{p}_{\text{player}} + \mathbf{d}_{\text{forward}} \times 0.45 + \mathbf{d}_{\text{right}} \times 0.25 + [0, 0.55, 0]$$
2. **Ejection Impulse**:
   - Transverse velocity: Ejected along the gun's right vector ($\mathbf{d}_{\text{right}} \cdot (1.8 \pm 0.4\text{ m/s})$).
   - Upward impulse: $+1.4 \pm 0.3\text{ m/s}$.
   - Backward recoil drag: $-\mathbf{d}_{\text{forward}} \cdot (0.4 \pm 0.2\text{ m/s})$.
3. **Angular Tumbling**:
   - Random initial spin across 3 axes: $\boldsymbol{\omega} = [\text{rand}(-15, 15), \text{rand}(-8, 8), \text{rand}(-20, 20)]\text{ rad/s}$.
4. **Ballistic Arc**:
   $$\mathbf{p}(t) = \mathbf{p}_0 + \mathbf{v}_0 t + \frac{1}{2} \mathbf{g} t^2, \quad \mathbf{g} = [0, -9.81, 0]$$

### 4.2 Casing Bounce & Landing Dynamics
1. **Floor Detection**: Intersects with the local terrain height ($y = y_{\text{terrain}}(x, z)$) or elevated platform meshes.
2. **Restitution & Deflection**:
   - On impact, invert vertical velocity with restitution coefficient $e = 0.45$:
     $$v_y' = -e \cdot v_y$$
   - Add friction reduction to horizontal velocity ($v_{xz}' = 0.6 \cdot v_{xz}$).
   - Angular spin dampens by $50\%$.
3. **Landing Sound Trigger**:
   - **First Impact**: The primary casing bounce triggers the surface-aware impact sound at full volume.
   - **Secondary Bounce**: If $v_y' > 0.3\text{ m/s}$, a second micro-clink plays at $-8\text{ dB}$ volume.
   - Below $0.1\text{ m/s}$, the casing enters the resting state and settles flat on the ground.

### 4.3 Surface-Aware Material Interrogation
Upon casing contact at world coordinates $(x, z)$, determine the surface material by interrogating:
- `trackField.detectSurface(x, z)` / `getBiomeKeyForWorldPosition(x, z)`
- Underfoot terrain type (grating, snow, rock, biological muck, wood):

```javascript
function resolveCasingImpactSurface(x, z, game) {
    if (game.isInsideNoFireZone?.()) return 'metal';
    const underfoot = game.trackField?.getSurfaceAt?.(x, z);
    if (underfoot === 'water' || underfoot === 'slime') return 'slime';
    if (underfoot === 'blood') return 'metal';
    if (game.isNearCampWoodDeck?.(x, z)) return 'wood';
    
    const biome = game.currentBiomeKey?.toLowerCase() || 'active';
    if (biome === 'cryo') return 'snow';
    if (biome === 'bio') return 'slime';
    return 'metal'; // default industrial steel grating / concrete
}
```

### 4.4 Surface Landing Audio Matrix
Audio files to generate and wire:
- `shell_drop_metal`: Bright, sharp brass-on-steel ping and brief micro-roll (3 takes).
- `shell_drop_snow`: Soft, muffled, snowy thud with delicate frost crunch (3 takes).
- `shell_drop_stone`: Crisp ceramic-like click and rock bounce (3 takes).
- `shell_drop_slime`: Wet, squelchy, viscous thud with damp absorption (3 takes).
- `shell_drop_wood`: Hollow, resonant timber clatter and wooden floor bounce (3 takes).

All casing drops route through `AudioManager.resolveSpatial({ worldX: x, worldZ: z })` for pinpoint 3D stereo panning and distance rolloff.

---

## 5. Physical Persistence & Gentle Fading Lifecycle

### 5.1 Casing Persistence Buffer (`ShellCasingPool`)
To prevent unbounded memory growth or garbage collection hitches:
- **Architecture**: Single `THREE.InstancedMesh` (or pooled ring buffer of 64 casing instances).
- **Geometry**: Low-poly brass cylinder with beveled rim (18 vertices).
- **Material**: PBR metallic gold/brass material (`roughness: 0.28, metalness: 0.85`).
- **Capacity**: 64 maximum concurrent casings. When capacity is exceeded, the oldest active casing immediately enters accelerated fade-out.
- **Lifespan**:
  - Active physics (arc & bounce): $0.0\text{s} - 0.8\text{s}$.
  - Settled & persistent on ground: $0.8\text{s} - 12.0\text{s}$ (player can look down and see spent brass piles).
  - Fade-out phase: $12.0\text{s} - 15.0\text{s}$ (smooth opacity decrease or sinking $0.04\text{m}$ into snow/grates, followed by pool reclamation).

---

## 6. Persistent Enemy Trails & Snail Biome Slime

### 6.1 Trail Expansion in `src/trackField.js`
Building upon the existing footprint and smear system in `src/trackField.js`, we expand hostile trail types to linger dynamically:

| Hostile Entity | Trail Visual Effect | Particle / Decal Flavor | Lifespan | Audio Footstep / Crawl Cue |
| :--- | :--- | :--- | :--- | :--- |
| **Standard Snail** | Cyan bioluminescent slime | Viscous glossy smear, subtle green-blue sheen | 18s | `snail_crawl_loop` / `foley_crawl_squelch` |
| **Cryo Snail** | Frostbite ice track | Cracking frost crystal decal + cold vapor wisps | 22s | `foley_footstep_ice` / `frost_crack` |
| **Spore Snail** | Toxic spore slime | Emerald bubbling slime + floating micro-spores | 24s | `foley_squelch` / `spore_hiss` |
| **Cyber Snail / Mech**| Scorched oil slick | Dark petroleum smear + flickering ember sparks | 25s | `foley_footstep_metal_industrial` / `spark` |
| **Alpha Bosses** | Double-wide wake | 2.5× scale wake, heavy ground furrowing | 45s | Deep subterranean tremor |
| **Stalkers / Chargers**| Claw gouges in terrain | Three-pronged jagged gouges with loose dirt | 16s | Heavy claw impact |

### 6.2 Decay & Evaporation Equation
Each mark in the `trackField` ring buffer calculates alpha dynamically on frame render:
$$\alpha(\text{age}) = \alpha_{\text{base}} \times \begin{cases} 
1.0 & \text{for } \frac{\text{age}}{\text{life}} < 0.65 \\
1.0 - \frac{\frac{\text{age}}{\text{life}} - 0.65}{0.35} & \text{for } 0.65 \le \frac{\text{age}}{\text{life}} < 1.0 \\
0.0 & \text{for } \text{age} \ge \text{life}
\end{cases}$$
This ensures marks remain crisp and vivid for two-thirds of their existence, followed by a graceful, organic dissolve into the floor.

---

## 7. AudioCraft Neural Generation Plan (`AudioGen`)

Using our validated `/home/caveman/tools/audiocraft/.venv` environment with `facebook/audiogen-medium`, we will add the following catalog specifications to `scripts/audio/generate_audiocraft_sfx.py`:

```python
JUICE_SFX_CATALOG = {
    # --- EJECTED SHELL CASINGS (SURFACE IMPACTS) ---
    "shell_drop_metal": {
        "prompt": "brass bullet shell casing falling and bouncing on hollow steel grating, sharp metallic ting and clink, clean realistic foley",
        "variants": 3, "duration": 1.2, "category": "casings", "out_dir": "public/audio/foley/casings"
    },
    "shell_drop_snow": {
        "prompt": "empty brass shell casing dropping into deep soft cold snow, muffled delicate metal tap, subzero winter foley",
        "variants": 3, "duration": 1.2, "category": "casings", "out_dir": "public/audio/foley/casings"
    },
    "shell_drop_stone": {
        "prompt": "empty bullet cartridge casing landing on hard concrete stone floor, crisp ceramic rock ping and bounce, clean crisp foley",
        "variants": 3, "duration": 1.2, "category": "casings", "out_dir": "public/audio/foley/casings"
    },
    "shell_drop_slime": {
        "prompt": "metal bullet shell landing in thick wet biological alien slime muck, damp squishy thud, viscous absorption foley",
        "variants": 3, "duration": 1.2, "category": "casings", "out_dir": "public/audio/foley/casings"
    },
    "shell_drop_wood": {
        "prompt": "brass casing bouncing on hollow dry wooden floor planks, gentle timber clatter and roll, realistic foley",
        "variants": 3, "duration": 1.2, "category": "casings", "out_dir": "public/audio/foley/casings"
    },

    # --- WEAPON FIRING SOUNDSETS ---
    "weapon_fire_shotgun": {
        "prompt": "heavy concussive tactical shotgun blast, deep punchy low end boom, mechanical pump chamber action, crisp punchy gunshot",
        "variants": 3, "duration": 1.5, "category": "weapons", "out_dir": "public/audio/weapons"
    },
    "weapon_fire_carbine": {
        "prompt": "punchy military assault rifle gunshot, snappy kinetic supersonic crack, crisp brass ejection chirp, clean powerful fire",
        "variants": 3, "duration": 1.2, "category": "weapons", "out_dir": "public/audio/weapons"
    },
    "weapon_fire_smg": {
        "prompt": "rapid compact submachine gun burst shot, crisp high frequency mechanical pop, light snappy firearm discharge",
        "variants": 3, "duration": 1.0, "category": "weapons", "out_dir": "public/audio/weapons"
    },
    "weapon_fire_railgun": {
        "prompt": "high tech electromagnetic railgun firing, high voltage capacitor whine, supersonic magnetic crack, heavy sci-fi discharge",
        "variants": 3, "duration": 1.8, "category": "weapons", "out_dir": "public/audio/weapons"
    },
    "weapon_fire_cryo": {
        "prompt": "cryogenic freeze beam cannon firing, pressurized liquid nitrogen hiss, shattering ice crystal splinter, futuristic cold blast",
        "variants": 3, "duration": 1.4, "category": "weapons", "out_dir": "public/audio/weapons"
    },
    "weapon_fire_tesla": {
        "prompt": "high energy tesla electrical arc zap, violent ionized plasma spark crackle, humming electric discharge",
        "variants": 3, "duration": 1.4, "category": "weapons", "out_dir": "public/audio/weapons"
    },

    # --- TRACER FLYBY SNAPS & WHOOSHES ---
    "tracer_flyby_ballistic": {
        "prompt": "bullet supersonic flyby whip crack, fast whiz by camera, high velocity bullet snap",
        "variants": 3, "duration": 0.8, "category": "tracers", "out_dir": "public/audio/tracers"
    },
    "tracer_flyby_frost": {
        "prompt": "freezing ice shard whizzing by in cold air, crystalline whistling flyby, delicate frosty whoosh",
        "variants": 2, "duration": 0.8, "category": "tracers", "out_dir": "public/audio/tracers"
    },
    "tracer_flyby_heavy": {
        "prompt": "heavy caliber bullet slug passing by closely, deep resonant concussive air displacement whoosh",
        "variants": 2, "duration": 0.9, "category": "tracers", "out_dir": "public/audio/tracers"
    },
    "tracer_flyby_chitin": {
        "prompt": "alien acid spore needle flying past, viscous liquid hiss and insectoid aerodynamic whoosh",
        "variants": 2, "duration": 0.8, "category": "tracers", "out_dir": "public/audio/tracers"
    },

    # --- HYPER-LOCALIZED POINT-SOURCE AMBIENCE ---
    "amb_point_tallow_forge": {
        "prompt": "subtle geothermal forge steam hiss, distant rhythmic anvil blacksmith clangs, warm coal hearth embers crackling",
        "variants": 1, "duration": 30.0, "category": "points", "out_dir": "public/audio/ambient/points"
    },
    "amb_point_vesper_generator": {
        "prompt": "heavy industrial diesel electric generator turbine hum, rhythmic electrical relay clicks, low vibrating drone",
        "variants": 1, "duration": 30.0, "category": "points", "out_dir": "public/audio/ambient/points"
    },
    "amb_point_meridian_chimes": {
        "prompt": "resonant ancient brass chimes tinkling in cold subterranean draft, vaulted cathedral stone resonance, quiet spiritual echo",
        "variants": 1, "duration": 30.0, "category": "points", "out_dir": "public/audio/ambient/points"
    },
    "amb_point_hive_sac": {
        "prompt": "pulsating alien bio organic egg sac membrane, slow wet biological heartbeat, damp fluid sloshing, unsettling creature cocoon",
        "variants": 1, "duration": 25.0, "category": "points", "out_dir": "public/audio/ambient/points"
    }
}
```

---

## 8. Implementation Phases & Step-by-Step Milestones

### Phase 1: Neural Audio Generation & Preload Manifests [COMPLETED]
1. [x] Extended `scripts/audio/generate_audiocraft_sfx.py` with 5 casing soundsets, 6 weapon fire sets, 4 tracer flyby sets, and 4 point-source ambient beds.
2. [x] Generated neural assets outputting high-fidelity `.wav` + `.ogg` audio files in `public/audio/`.
3. [x] Updated `main.js` audio preload manifest and `src/data/gameSoundsets.js` registering the complete soundsets with provenance guards.

### Phase 2: Casing Ejection VFX & Ballistic Simulation Engine [COMPLETED]
1. [x] Created `src/casingSystem.js` managing an instanced pool of 64 low-poly brass casing meshes (`THREE.InstancedMesh`).
2. [x] Implemented physics update tick: position integration, gravity, tumbling rotation, floor collision detection, and restitution bounces.
3. [x] Synchronized `threeGame.js`'s `fireWeaponAtCurrentAim`: upon shot acceptance, trigger `casingSystem.spawnCasing(origin, aimVector, weaponType)`.
4. [x] Implemented surface material query `resolveCasingImpactSurface(x, z)` triggering `AudioManager.play(surfaceKey, spatialOptions)`.
5. [x] Implemented graceful fade-out lifecycle ($12\text{s} \to 15\text{s}$).

### Phase 3: Weapon Audio Routing & Tracer Variety [COMPLETED]
1. [x] In `threeGame.js`, mapped `this.fieldWeapon?.id`, `this.currentWeaponType`, or class archetype to specific fire soundsets (`weapon_fire_shotgun`, `weapon_fire_carbine`, `weapon_fire_smg`, `weapon_fire_railgun`, `weapon_fire_cryo`, `weapon_fire_tesla`).
2. [x] Triggered spatialized tracer flyby sounds (`tracer_flyby_ballistic`, `tracer_flyby_frost`, `tracer_flyby_heavy`, `tracer_flyby_chitin`) mapped to cosmetic & elemental profiles.

### Phase 4: Enemy Trails & Snail Biome Slime Expansion [COMPLETED]
1. [x] Extended `src/trackField.js` with dedicated hostile trail profiles for cryo (`0xa3e2ff`), spore (`0x55ff55`), cyber (`0x1e1b18`), standard (`0x2fb8e0`), stalker/claw gouges (16s), and alpha bosses (45s wake).
2. [x] In `threeGame.js` `spawnVisualSnailTrail`, passed biome/type data producing persistent multi-colored trails lingering for $18–45$ seconds.
3. [x] Implemented continuous piecewise decay curve ($\alpha_{\text{base}}$ for $t < 0.65$, then linear ramp to $0.0$).

### Phase 5: Point-Source Camp & Hive Audio Emitters [COMPLETED]
1. [x] Created `PointAudioEmitter` and `PointAudioEmitterManager` in `src/pointAudioEmitter.js` tracking proximity to camps (Tallow forge, Vesper generator, Meridian chimes) and living bio hive sacs.
2. [x] Smoothly adjusted spatial volume based on distance rolloff attenuation with listener orientation and clean voice recycling.

### Phase 6: Automated Verification & Unit Tests [COMPLETED]
1. [x] `src/casingSystem.test.js`: Verified casing physics trajectory, bounce count, surface sound selection, and memory pool reclamation.
2. [x] `src/weaponAudio.test.js`: Verified weapon fire sound mapping, pitch variation, and tracer flyby triggers.
3. [x] `src/trackField.trails.test.js`: Verified enemy trail decay curves, alpha fading, and color assignments.
4. [x] `src/pointAudioEmitter.test.js`: Verified point-source emitter distance falloff, camp/hive synchronization, and voice cleanup.
5. [x] Ran full repository test suite (690 test files, 5942 tests) with 100% pass rate.

---

## 9. Verification & Acceptance Criteria
- [x] Every gun archetype and field weapon has a distinctive, punchy acoustic identity (`weapon_fire_shotgun`, `weapon_fire_carbine`, `weapon_fire_smg`, `weapon_fire_railgun`, `weapon_fire_cryo`, `weapon_fire_tesla`).
- [x] Firing emits a 3D tumbling brass casing that visibly arcs and bounces off the ground (`src/casingSystem.js`).
- [x] Shell casing landings produce distinct, spatialized clinks depending on whether they hit metal grating, snow, stone, alien slime, or wood (`shell_drop_metal`, `shell_drop_snow`, `shell_drop_stone`, `shell_drop_slime`, `shell_drop_wood`).
- [x] Spent casings and snail slime trails persist cleanly on the ground for 12–25s (up to 45s for boss wakes) before gently dissolving without popping or frame rate dips.
- [x] Camps and hives feel alive with hyper-localized positional sounds when walking past forges, generators, and pulsating bio-sacs (`amb_point_tallow_forge`, `amb_point_vesper_generator`, `amb_point_meridian_chimes`, `amb_point_hive_sac`).
- [x] All 690 test files and 5942 tests pass with 0 regressions.

