# Roguelike Loop, Cinematic Lighting, Tilt-Shift & Combat VFX Plan

Status: proposed implementation plan · Owner: Codex + Antigravity · Date: 2026-09-09  
Branch: `dev/sprint-33` · Baseline: `v2.3.2-beta` · Target: Roguelike Polish & Sensory Coherence

---

## 1. Executive Summary & Intent

With cosmetic patches and initial Armory models integrated and live on Steam, this plan tackles the core sensory and gameplay experience:
1. **Cinematic Atmospheric Lighting & Dynamic Shadows**: Fix shadow tracking so shadows dynamically follow the player across the infinite world instead of disappearing outside spawn, lower milky ambient light to restore deep contrast, and tune suit flashlights.
2. **Tilt-Shift Miniature Diorama Aesthetic**: Enhance WebGL `TiltShiftPassShader` and CSS `.gameplay-tilt-shift` overlay with progressive Gaussian bokeh, subtle chromatic aberration, and dynamic aim-point focus tracking.
3. **High-Impact Combat VFX & Placeholder Removal**: Replace static marble-like bullet spheres with elongated directional ballistic tracers; replace enemy 0.22s fadeouts with juicy biomechanical death bursts (chitin shards, ground shockwaves, vapor puffs); add directional impact ricochets.
4. **Roguelike Flow & Story Integration**: Amplify Depth Contract ring descent ceremonies with atmospheric banner telemetry, upgrade death screens into insightful tactical casualty debriefs with black-box coordinates, and make Wanderer companion synergies visible in real-time combat.

---

## 2. Pillar 1: Atmospheric Lighting & Dynamic Shadow Tracking

### The Problem
- In `src/threeGame.js`, `directionalLight.position` is set in world space without player tracking, and `directionalLight.target` remains at `(0, 0, 0)`.
- The shadow camera frustum is a fixed box (`[-14, 14]` along X and Z) centered at the origin.
- As soon as the player walks >14 meters away from spawn, the player, weapon, and enemies walk completely outside the shadow camera frustum, resulting in zero cast shadows for 95% of gameplay!
- Additionally, base ambient light (`ambientLight.intensity = 1.9`) is overly bright, washing out the shadows that do exist and making the snowy cavern floors look flat and milky.

### Implementation
1. **Player-Relative Shadow Camera Tracking**:
   - In `src/threeGame.js`: Make `directionalLight.target.position` track `this.player.position`.
   - Update `directionalLight.position` relative to the player's position based on sun elevation and azimuth (`player.position + sunOffset`).
   - Tighten the shadow frustum (`left: -15, right: 15, top: 15, bottom: -15`, `near: 1, far: 45`).
   - Set `directionalLight.shadow.bias = -0.0004` and `directionalLight.shadow.normalBias = 0.02` to eliminate shadow acne.
2. **Contrast & Ambient Balancing**:
   - Lower base ambient light intensity from `1.9` to `0.85`, preserving biome tinting in `updateBiomeLighting`.
   - Retain key directional light at `2.3`–`2.5` and hemisphere fill at `0.75`.
   - This increases shadow contrast from 1.2:1 to ~3.2:1, making crevices, ice boulders, and character feet pop with crisp, grounding contact shadows.
3. **Suit Flashlight & Volumetric Atmosphere**:
   - Tune `playerForwardSpotLight`: smooth out penumbra (`0.85`) and angle (`0.72`) for a cinematic flashlight cone piercing through the cavern darkness.

---

## 3. Pillar 2: Tilt-Shift & Miniature Diorama Camera Depth

### The Problem
- The current tilt-shift shader (`TiltShiftPassShader`) applies a simple 1D linear step across Y with a very small blur radius (`0.0035`), making the effect barely perceptible.
- The CSS backdrop overlay (`.gameplay-tilt-shift::after`) uses a subtle `2.5px` blur that doesn't convey the tactile miniature tabletop aesthetic promised by the isometric camera.

### Implementation
1. **Enhanced WebGL TiltShiftPassShader**:
   - Upgrade shader to quadratic distance falloff: pixels close to the focal band remain razor-sharp, while foreground and background progressively blur into silky bokeh.
   - Introduce subtle chromatic dispersion (lens fringe) on blurred periphery: split R and B channels slightly along the blur vector.
   - Increase sample distribution to 7 Gaussian-weighted samples per pass.
2. **Enhanced Screen-Space Miniature Overlay**:
   - Increase CSS `backdrop-filter` blur to `4.5px`.
   - Refine mask gradient: crisp clear central ellipse centered at `--focus-x, --focus-y` (tracking player aim direction), softly vignetting outward with deep atmospheric framing.
   - Provides an immediate "tactile diorama" feel in isometric mode.

---

## 4. Pillar 3: High-Impact Combat VFX & Placeholder Removal

### The Problem
- Projectiles currently render as small static spheres (`SphereGeometry(radius, 8, 8)`), looking like slow-floating marbles rather than high-velocity ballistic rounds.
- Enemies on death simply trigger a 0.22s sine-scale and opacity fade (`burstTriggered`), lacking physical impact, juice, or visceral feedback.
- Projectile impacts use 4 flat 5-segment circles.

### Implementation
1. **Directional Ballistic Projectile Tracers**:
   - Replace static spheres with directional ballistic tracer geometry:
     - Elongated needle mesh oriented along velocity vector (`-Math.atan2(vz, vx)`).
     - Bright white-hot core with class-colored plasma sheath (Gold for Scout, Emerald for Tank, Cyan for Engineer).
     - Motion-streak trail ribbon with fading opacity.
2. **Visceral Biomechanical Death Bursts**:
   - On enemy death in `damageSnail`:
     - **Chitin & Ice Shards**: Flings 8–14 physical debris fragments outwards with gravity, drag, and tumbling angular velocity.
     - **Shockwave Ground Ring**: Spawns an expanding luminous ring on the floor that quickly expands and dissipates.
     - **Vapor / Spore Burst**: Spawns a localized cloud of cryo mist or bioluminescent toxic spore puff using `spawnTextureBurstEffect`.
     - **Hitstop**: 45ms micro-freeze on killing blow for crunchy tactile confirmation.
3. **Directional Impact Sparks & Ricochets**:
   - In `spawnProjectileImpactEffect`: replace flat circles with high-velocity directional sparks that streak outward from the impact point with gravity.
   - Add a momentary scorch/frost decal on surface hit.

---

## 5. Pillar 4: Roguelike Loop & Story Flow

### The Problem
- Entering deeper rings (Depth Contract) happens quietly without dramatic tension.
- When dying, players are returned to the menu without an immediate tactical casualty debrief explaining *why* they died or what black box progress awaits recovery.
- Wanderer companion buffs happen silently in background numbers without combat readability.

### Implementation
1. **Depth Contract Ring Crossing Ritual**:
   - When crossing into a new depth ring, trigger a dramatic environmental event: screen pulse, audio sub-bass hum, and a brief tactical contract HUD banner displaying updated ring parameters (e.g. `RING II BREACH // O2 DECAY x1.30 // SALVAGE +35%`).
2. **Tactical Casualty Debrief (Death Screen Polish)**:
   - On player defeat, present an informative post-mission debrief:
     - Explicit Cause of Death (e.g., `HYPOXIA: SUFFOCATED IN DEEP CRYO CHASM`, `TRAUMA: OVERWHELMED BY APEX STALKER`).
     - Black Box Salvage Recovery coordinate and sector name for the next run.
     - Relics acquired and distance descended.
3. **Wanderer Companion Combat Telegraphing**:
   - When a companion triggers their signature assist (e.g. Foxhole armor buff, Hacker EMP ping), emit a distinctive floating combat prompt and localized energy pulse.

---

## 6. Verification & Test Plan

1. **Automated Unit Tests**:
   - Author `src/lightingShadowTracking.test.js`: Verify directional light target follows player position, shadow frustum stays centered, and ambient light intensities match balanced bounds.
   - Author `src/combatVfx.test.js`: Verify projectile directional orientation, death burst particle spawning, and impact effect lifecycles.
   - Author `src/tiltShiftDiorama.test.js`: Verify tilt-shift shader uniform calculations, focus tracking, and quadratic bokeh falloff.
2. **Full Regression Suite**:
   - Run Vitest suite: ensure all 293+ files and >2,623 tests pass.
   - Run ESLint: verify 0 errors, 0 warnings.
   - Run Presubmits: `npm run presubmit:generated` clean.
   - Run Build: `npm run build` clean.
   - Run Doc Audit: `npm run audit:docs` clean.
3. **Browser Smoke Review**:
   - Test in live browser at 1280×800 and 1920×1080:
     - Walk 50m north and verify shadows remain sharp and attached to player feet.
     - Fire all 3 weapon archetypes and verify directional ballistic tracers.
     - Kill enemies and verify satisfying biomechanical shard/vapor death bursts.
     - Check isometric tilt-shift bokeh focusing along the aim reticle.
