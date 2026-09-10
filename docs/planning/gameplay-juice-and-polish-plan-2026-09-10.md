# Gameplay Juice, Sensory Feedback, and Tactile Polish Plan

Status: proposed implementation plan · Owner: Codex + Antigravity · Date: 2026-09-10  
Branch: `dev/sprint-33` · Baseline: `v2.3.2-beta` · Target: Arcade-Quality Game Feel & Sensory Immersion

---

## 1. Executive Summary & Intent

Following the successful implementation of 3D physical chest patches, atmospheric directional lighting, tilt-shift diorama bokeh, and companion contract progression, this plan focuses on **Juice** — the non-functional, high-impact sensory feedback that elevates moment-to-moment survival into a visceral, tactile, and deeply satisfying experience.

Every action in Hunker Bunker should feel punchy, responsive, and alive:
1. **Combat Feel & Weapon Juice**: Trauma-based camera shake and rotational roll, camera-facing 3D muzzle blasts at barrel height, shell ejection puffs, directional enemy squash-and-stretch hit reactions, and bouncing golden critical hit pips.
2. **Loot Vacuum & Dopamine Magnetism**: Smooth magnetic levitation and curved acceleration of nearby drops toward the player, rising-pitch musical pickup combos, and diegetic floating resource pips (`+25 TECH`, `+1 O₂ CELL`).
3. **Living World Diorama Atmosphere**: Zero-light ambient particulate drift per biome (swirling snow flurries, chilled diamond-dust ice crystals, drifting bioluminescent spores, conduit spark drips) and dynamic footstep dust puffs.
4. **High-Tension Survival Pacing**: Low-oxygen / near-death audio suffocation (low-pass filter muffling world audio, heartbeat thumping, suit wheezing), dramatic Depth Tier penetration ceremonies, and glowing interactive run modifier badges.

---

## 2. Core Pillars & Specifications

### Pillar 1: Visceral Combat Feel & Weapon Kick
- **Camera Trauma System**:
  - Replace naive linear Cartesian jitter with a rotational trauma model: `trauma = min(1.0, trauma + impulse)`.
  - Trauma decays exponentially over time (`trauma = max(0, trauma - dt * 2.2)`).
  - Effective camera displacement uses squared trauma (`trauma * trauma`) for a punchy feel where light hits feel subtle and heavy impacts/titan attacks feel bone-shattering.
  - Adds rotational roll (`camera.rotation.z += (random() - 0.5) * trauma * 0.04`) and pitch kick.
  - Weapon-specific trauma impulses: Pistols (0.08), Rifles (0.12), Shotguns (0.32), Railguns/Heavy (0.50), Explosions (0.70).
- **Camera-Facing 3D Muzzle Blasts & Brass Ejection**:
  - Fix the horizontal ground-decal bug (Finding G05): orient muzzle flashes in 3D camera space at barrel height (`y ≈ 0.55m`).
  - Add micro-particle brass casings or thermal venting plumes arcing out from the firing port.
- **Directional Enemy Hit Reactions & Crits**:
  - Apply instantaneous squash-and-stretch impulse along the incoming bullet heading (e.g. `scale.x *= 1.25`, `scale.z *= 0.85` with snappy elastic return).
  - Golden/Amber bouncing critical hit pips (`CRIT 36`) with directional spark fountains and metallic ping audio.
  - Tactile 45ms hitstop on player heavy hits and enemy lethal blows.

### Pillar 2: Loot Vacuum & Dopamine Magnetism
- **Magnetic Attraction Lerp**:
  - Dropped items (medical packs, tech cubes, oxygen canisters, scrap shells) within 3.5m smoothly levitate upward and accelerate in a gentle Bezier curve toward the player's core.
- **Musical Rising-Pitch Pickup Combos**:
  - When collecting items in rapid succession (<1.2s between pickups), increase the playback rate of the collection chime by semitone intervals (`1.0x → 1.06x → 1.12x → 1.19x → ... → 2.0x`), accompanied by a sparkling starburst effect.
- **Diegetic Floating Resource Badges**:
  - Render crisp floating resource numbers (`+25 TECH`, `+1 O₂ CELL`, `+50 CR`) drifting upward and fading out smoothly above the player.
- **Salvage Chest Eruptions**:
  - Opening bunker salvage containers pops the lid with a vertical light shaft, spewing bouncy loot pieces in a mini-fountain.

### Pillar 3: Living World Diorama Atmosphere
- **Biome Ambient Particulate Systems (Zero Dynamic PointLights)**:
  - *Surface / Periphery*: Cold drifting wind streaks and snow dust.
  - *Cryo Depths*: Chilled diamond-dust ice flecks slowly oscillating in cold drafts.
  - *Bio / Hive Biome*: Floating bioluminescent fungal spores drifting on subterranean convection currents.
  - *Bunker Ruins*: Intermittent electrical spark drips from damaged ceiling conduits and warm steam pipe leaks.
- **Locomotion Dust & Surface-Aware Audio**:
  - Footstep dust puffs when sprinting, turning sharply, or landing.
  - Audio variation based on walking surface (crunchy ice/snow, echoing hollow steel grates, squishy organic moss).

### Pillar 4: High-Tension Survival & Roguelike Presentation
- **Sensory Suffocation on Low O₂ / Critical HP**:
  - When O₂ drops below 20% or HP < 25%:
    - WebAudio biquad low-pass filter gently clamps higher frequencies, muffling external sound.
    - Deep rhythmic heartbeat audio pulses accompanied by suit respirator wheezing.
    - Rhythmic red/cyan chromatic vignette pulsing on the viewport borders.
- **Depth Tier Penetration Ceremony**:
  - Sub-bass drone sting, environmental camera shudder, steam eruptions, and animated depth banner in the HUD when crossing depth boundaries.
- **Interactive Run Modifier Badges**:
  - Polish the newly added `#hud-run-cards` chips with glowing borders reflecting card type (world: cyan `#7fd4ff`, faction: amber `#ffc46b`, threat: coral `#ff8b7a`), animated slide-in entry, and interactive tooltips detailing active mechanics.

---

## 3. Implementation Files & Architecture

| Component | Target Files | Key Functions & Responsibilities |
| --- | --- | --- |
| **Combat Juice & Trauma** | `src/threeGame.js`, `src/combatJuice.js` [NEW] | Trauma model, rotational camera kick, 3D muzzle blast, enemy squash/stretch |
| **Loot Magnetism & Combos** | `src/threeGame.js`, `src/lootJuice.js` [NEW] | Magnetic acceleration, semitone audio combo, floating pickup pips |
| **Atmospheric Drift & Dust** | `src/threeGame.js`, `src/ambientDrift.js` [NEW] | Biome ambient particle pools, footstep dust puffs (unlit additive instancing) |
| **Survival Tension & Audio** | `src/audio.js`, `src/threeGame.js`, `style.css` | Low-pass audio filter, heartbeat pulse, chromatic low-O2 vignette |
| **Run Card HUD Presentation** | `src/runCardHud.js`, `style.css`, `main.js` | Glowing chip borders, slide-in entry, interactive tooltips |

---

## 4. Verification & Non-Regressional Guarantees

1. **Automated Unit Tests**:
   - `src/combatJuice.test.js` [NEW]: Camera trauma decay, rotational roll, 3D muzzle blast orientation, crit damage pip formatting.
   - `src/lootJuice.test.js` [NEW]: Magnetic attraction curves, pickup combo semitone escalation.
   - `src/ambientDrift.test.js` [NEW]: Biome particle life cycle, zero dynamic PointLights constraint.
   - `src/survivalTension.test.js` [NEW]: Low-pass filter engagement and chromatic vignette state machine.
2. **Performance Integrity**:
   - Maintain 60 FPS on Steam Deck.
   - Strictly prohibit creating dynamic `THREE.PointLight` instances during combat or particle effects (preserving WebGL shader cache stability per `log5`).
3. **Full Suite Validation**:
   - 100% green Vitest suite (>298 files, >2,647 tests).
   - Zero ESLint errors.
   - Clean doc audit (`npm run audit:docs`).
   - Clean generated presubmits (`npm run presubmit:generated`).
   - Clean production build (`npm run build`).
