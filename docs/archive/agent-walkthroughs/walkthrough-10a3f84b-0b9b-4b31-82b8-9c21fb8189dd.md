# Phase 1 Layout Overhaul & Responsive Stability Walkthrough

This walkthrough outlines the successful completion of **Phase 1: Retro-Arcade Viewport Expansion & Responsive Safe Area Zoning** for *Hunker Bunker*. 

---

## 🚀 Key Visual & Structural Enhancements

1. **Bezel & Decorative Dominance Reduction (~25%)**
   - The `#cabinet-bezel` border thickness has been scaled down from a bulky initial sizing to `1.5vu`.
   - The inner box-shadow intensity was softened to `rgba(0, 0, 0, 0.8)` with a spread of `110px`, shifting focus and visual dominance to the actual gameplay canvas.

2. **Expanded Gameplay Viewport**
   - The fullscreen gameplay area (`#game-container.fullscreen-mode`) was expanded to maximize vertical space:
     - **Width**: scaled from `min(90%, calc(78dvh * 1.6))` to `min(96%, calc(86dvh * 1.6))`.
     - **Max Height**: increased from `78%` to `86%`.
     - **Vertical Anchor**: shifted upward to `top: 52%` for balanced centering.
   - The standard `16:10` canvas aspect ratio remains strictly preserved.

3. **Explicit Runtime HUD & Safe-Area Zones**
   - Introduced dynamic safe-area CSS custom properties globally (`--safe-top`, `--safe-right`, `--safe-bottom`, `--safe-left`).
   - Restructured `#ui` in `index.html` into four distinct structural zones placed using safe area properties to guarantee notch/island safety on mobile:
     - **Top HUD Zone** (`.hud-zone-top`): Hosts the bunker level.
     - **Top-Right Utility Zone** (`.hud-zone-top-right-utility`): Holds settings and calibration toggles.
     - **Bottom-Left Move Zone** (`.hud-zone-bottom-left-move`): Anchors the touch movement joystick safely.
     - **Bottom-Right Action Zone** (`.hud-zone-bottom-right-action`): Dynamic structural placeholder for Stage 4 actions.

4. **Soft Portrait advisory lock**
   - Converted the rigid portrait orientation block overlay to a soft, dismissible advisory.
   - Appended a stylish `DISMISS ADVISORY` button so responsive verification and gameplay testing can proceed seamlessly.

5. **Consolidated Refresh Architecture**
   - Centralized layout state management under `applyRuntimeLayoutState()` in `main.js`, triggering layout updates seamlessly on mission initialization, fullscreen changes, touch toggle, and window resize or orientation shifts.

---

## 📸 Captured Verification Checkpoints

The layout has been meticulously captured across multiple viewports and orientations to verify safe-area protection, aspect ratio scaling, and visual hierarchy.

````carousel
### Baseline (Desktop 16:9)
![Phase 0 Baseline Desktop 16:9](/home/caveman/.gemini/antigravity-ide/brain/10a3f84b-0b9b-4b31-82b8-9c21fb8189dd/phase0-baseline-desktop-16x9.png)
<!-- slide -->
### Phase 1 Desktop (16:9)
![Phase 1 Desktop 16:9](/home/caveman/.gemini/antigravity-ide/brain/10a3f84b-0b9b-4b31-82b8-9c21fb8189dd/phase1-desktop-16x9.png)
<!-- slide -->
### Phase 1 iPhone Landscape
![Phase 1 iPhone Landscape](/home/caveman/.gemini/antigravity-ide/brain/10a3f84b-0b9b-4b31-82b8-9c21fb8189dd/phase1-iphone-landscape.png)
<!-- slide -->
### Phase 1 iPhone Portrait (Advisory)
![Phase 1 iPhone Portrait](/home/caveman/.gemini/antigravity-ide/brain/10a3f84b-0b9b-4b31-82b8-9c21fb8189dd/phase1-iphone-portrait.png)
<!-- slide -->
### Phase 1 Android Landscape
![Phase 1 Android Landscape](/home/caveman/.gemini/antigravity-ide/brain/10a3f84b-0b9b-4b31-82b8-9c21fb8189dd/phase1-android-landscape.png)
````

---

## Later roadmap disposition (audited 2026-09-30)

This archived Phase 1 walkthrough originally listed four future-stage notes. They
are no longer open work:

* **Stage 2 HUD binding — complete.** The current HUD binds bunker level and
  biome, weapon clip/reserve/reload state, ship integrity, vitals, pickups, and
  other run telemetry to live runtime state in `main.js` and `src/vitals.js`.
  Event-driven coverage includes `weapon-clip-updated` and
  `ship-health-changed`.
* **Stage 4 mobile action zone — retired by product decision.** The later
  Steam Deck-first display/input specification removed virtual joysticks,
  touch action buttons, and touch-only interaction from the supported product.
  Contextual interaction remains available through semantic keyboard,
  controller, and Steam Input actions.
* **Stage 13 portrait layout — retired by product decision.** Portrait and
  mobile reflow are no longer targets. The supported layout is one canonical
  1280×800 (16:10) stage, uniformly contained and letterboxed when host aspect
  ratios differ.
* **Stage 14 low-end-mobile FX mode — retired by product decision.** Low-end
  mobile is no longer a release target. The accessibility intent survives in
  the supported desktop/Deck experience through reduced camera shake, reduced
  pressure, and `prefers-reduced-motion` presentation fallbacks.

The current policy and acceptance contract live in
`docs/steam-deck-first-display-and-input-spec.md`; the dated audit and todo-tree
classification live in
`docs/planning/todo-tree-resolution-2026-09-30.md`.
