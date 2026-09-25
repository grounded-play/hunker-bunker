# HUD Lower Dock — Layout Plan (expanded)

> Expands the Gemini draft `ui_redesign_layout_plan.md` (2026-09-25, Antigravity brain
> `6b5e702e…`). The owner likes the **lower dock** direction
> (`ui_concept_lower_dock_1790353433507.jpg`) and asked for **templates that are not as
> big**, laid out on the **real gameplay**. This version:
> - checks every element against the live DOM;
> - fixes the draft's errors;
> - sizes every zone from one rule that works on Deck, 1080p and the owner's PC;
> - lists the engineering traps this repo has already hit;
> - turns each phase into testable acceptance;
> - adds the **living suit console** (§4A): cockpit-style frames that crack, frost,
>   fog and age, and a DOOM-style operator face that reacts.

---

## 0. Goals, non-goals, success measures

**Goals**
1. Put the numbers you read in a fight (hearts, O₂, ammo, ability readiness) in one low
   band near the operator. Today they sit in three different screen edges.
2. Keep the upper and centre screen clear for corridors, enemies and lighting, which
   the restored post-processing and suit-light shadows now show off.
3. Show things only when they matter: boss bar, hazards, prompts, notifications and
   run chips appear on demand instead of holding space permanently.
4. Work equally on **Steam Deck 1280×800 handheld**, **1080p**, and the **owner's
   2304×1440 @125%** PC, with controller glyphs on Deck and rebindable keys on PC.

**Non-goals (this plan)**
- Menus, Armory, Foundry, terminal modal and the full-screen tactical map `[M]` are out
  of scope. The unified Foundry hub is its own plan.
- No new gameplay information, except a co-op teammate chip, which is an open decision
  in §9.

**Success measures** (all checked by the Phase 0 layout spec, §7)

| Measure | Today (measured) | Target |
| :--- | ---: | ---: |
| Screen covered by always-on HUD, Deck 1280×800 | **24.3 %** (11 boxes, from the Deck capture) | **≤ 10 %** |
| Same, 1080p | ~17 % (estimated) | **≤ 8 %** |
| HUD inside the player keep-out (centre 30 % × 34 %) | 0 | 0 |
| Overlapping HUD boxes at any supported resolution | several on Deck (objective stack vs prompt card) | 0 |
| Smallest HUD text on Deck | 9 px (bounty chip) | ≥ 11 px |
| Per-frame layout (style/layout) cost added by the HUD | — | ≤ 0.3 ms on Deck; no `backdrop-filter` over the canvas |

---

## 1. Corrections to the draft

| Draft said | Reality in the code | Consequence |
| :--- | :--- | :--- |
| Class ability is `[SPACE]` | Ability is **F**; **Space is dash** (`DEFAULT_KEY_BINDINGS`, `main.js` / `threeGame.js`). All keys are **rebindable** (`hunker_key_bindings`). | Tiles must render the live binding, and on Deck the controller glyph (`getControllerGlyphLabel`, `src/inputGlyphs.js`). No hard-coded key text. |
| Objectives live in `#camp-quests-hud` | No such element. Objectives are split across `#objective-tracker`, `#mission-progress-hud`, `#camp-quest-hud` and `#loop-step-hud`, plus PRESS-E prompts, all in `.hud-mission-stack`. | The drawer must merge four sources, not move one element. |
| "Auto-collapses during combat" | `this.inCombat` is read in `threeGame.js` but **never assigned**. There is no combat signal. | Phase 6 defines one (§4, zone C). |
| Frosted-glass dock (`backdrop-filter`) | `backdrop-filter` over the WebGL canvas costs GPU every frame on Deck. It also **re-anchors `position: fixed` descendants** (see the "one slot, every screen" block in `style.css`). | Use gradient or solid glass panels. `backdrop-filter` is banned on the dock container. |
| Bottom-centre console at 430×86 | `#loop-step-hud` ("▶ REPAIR O2 AT THE SHIP") already occupies bottom-centre. | A new **Prompt Lane (H)** above the console takes it. |
| HUD elements listed: ~10 | The gameplay HUD has **~30** parts: hazard banner, Queen's Ledger chip, boss bar, 12 `*-hud-prompt`s, radio and tutorial cards, telemeter box, run cards, bounty/event chips, fatigue and cover rows, visor brackets, crosshair, damage vignette. | Full matrix in §5. Nothing is left without a home. |
| Headings numbered "6" twice; Decision 1 names concepts A/B that no longer match the slim/cockpit/split carousel | — | Decisions restated in §9. |

---

## 2. Layout system

### 2.1 One unit, every resolution

All sizes are in **HUD units**:

```css
:root {
  /* 1u = 1px at 1920×1080. Floor 0.8 keeps Deck text legible (plain scaling
     would give 0.67); cap 1.3 stops the HUD ballooning on 1440p+/4K. */
  --hud-u: clamp(0.8px, min(100vw / 1920, 100vh / 1080), 1.3px);
  --hud-scale: 1;             /* user setting, §6.3 */
  --u: calc(var(--hud-u) * var(--hud-scale));
  --hud-margin: calc(20 * var(--u));
}
```

| Screen | u | Notes |
| :--- | ---: | :--- |
| Steam Deck 1280×800 | 0.80 | floor applies |
| 1920×1080 | 1.00 | reference |
| Owner's PC 2304×1440 CSS px (@125 %) | 1.20 | |
| 2560×1440 | 1.30 | cap |
| 3440×1440 ultrawide | 1.30 | the dock stays centred; wings pin to the safe edges |

### 2.2 Zones (computed, not hand-placed)

Every box below comes from one spec script, `docs/planning/assets/hud-lower-dock/hud_zones.py` (kept with the plan
assets). It renders the overlays in §3 from real captures, so the numbers and
pictures cannot drift apart.

| Zone | Name | Size (u) | Anchor | Kind | Deck px (u = 0.8) | 1080p px |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **A** | Sector tag | 360 × 40 | top-left | always on | 288×32 @ 16,16 | 360×40 @ 20,20 |
| **A2** | Run chips (run cards, bounty, event) | 360 × 26 | under A | when present | 288×21 @ 16,53 | 360×26 @ 20,66 |
| **B** | Alert lane (boss, hazard, Queen's Ledger) | 560 × 52 | top-centre | only when relevant | 448×42 @ 416,16 | 560×52 @ 680,20 |
| **C** | Objective drawer (collapsed) | 380 × 56 | top-right, left of gear | always on, 1 line | 304×45 @ 914,16 | 380×56 @ 1462,20 |
| **N** | Notification deck (radio, tutorial) | 380 × ≤300 | under C | only when relevant | 304×240 @ 960,74 | 380×300 @ 1520,92 |
| **S** | Settings gear | 48 × 48 | fixed corner slot | unchanged | 38×38 @ 1226,16 | 48×48 @ 1852,20 |
| **D** | Radar + map info | 268 × 132 | bottom-left | always on | 214×106 @ 16,678 | 268×132 @ 20,928 |
| **E** | Suit console (hearts, O₂, hull, fatigue/cover) | 440 × 84 | bottom-centre | always on | 352×67 @ 464,717 | 440×84 @ 740,976 |
| **F** | Loot chips (MED · TECH · COIN · SHELL) | 300 × 30 | above E | always on (dim when idle) | 240×24 @ 520,686 | 300×30 @ 810,938 |
| **H** | Prompt lane (loop step, PRESS-E, world prompts) | 520 × 44 | above F | only when relevant | 416×35 @ 432,642 | 520×44 @ 700,882 |
| **G** | Arsenal + abilities | 420 × 96 | bottom-right | always on | 336×77 @ 928,707 | 420×96 @ 1480,964 |
| **I** | Target readout (telemeter) | 360 × 84 | above G | on hover/aim | 288×67 @ 976,630 | 360×84 @ 1540,868 |
| **P** | Player keep-out | 30 % × 34 % of screen | centre, y = 52 % | **no HUD ever** | 384×272 @ 448,280 | 576×367 @ 672,378 |

Always-on coverage: **10.0 %** (Deck), **7.7 %** (1080p). No zone overlaps another
or the keep-out at either resolution.

### 2.3 Why these positions (not only "Hades does it")

- **The camera frames the operator near screen centre.** So the lower band is
  the shortest eye trip from the character. The top band holds only things you read
  rarely (sector, objective) or that interrupt you on purpose (alerts).
- **Tilt-shift/DOF blurs the top and bottom bands.** HUD over blurred,
  low-detail pixels reads cleanly, and the sharp middle stays the play space.
- **Left wing is navigation, right wing is action.** On Deck, the left stick and
  D-pad sit under the left thumb (moving, map on D-pad up); the face buttons and
  triggers are on the right (fire, reload, ability, dash). Each wing mirrors the
  hand that uses it.
- **The console grows upward, never sideways.** Prompts, then loot, then vitals stack
  up the centre column. The wings stay short, so the lower corners of corridors stay
  visible.

### 2.4 Benchmarks (from the draft)

| Game archetype | Layout paradigm | What makes it work |
| :--- | :--- | :--- |
| **Hades / Hades II** | Lower dual corners | Health and boons bottom-left, weapons and calls bottom-right; the top ~85 % stays clear for combat. |
| **StarCraft / C&C / Frostpunk** | Unified command dock | One grounded console consolidates minimap, telemetry, actions and resources; eye scanning follows one horizontal line. |
| **Dead Space / Alien: Isolation** | Diegetic suit telemetry | Readings feel built into the suit or visor, not floating web cards. This is why the dock reuses the visor brackets. |
| **Helldivers 2 / Risk of Rain 2** | Minimal floating ribbons | Combat info sits low or near the reticle; meta info collapses into one-line breadcrumbs, as zones A and C do here. |

---

## 3. The layout on the real game

Overlays are drawn on the Gemini captures at native size. Solid = always on;
dashed amber = only when relevant; dashed green = player keep-out.

![Steam Deck 1280×800 — proposed zones](assets/hud-lower-dock/proposed-zones-deck-1280x800.png)

![Desktop 1920×1080 — proposed zones](assets/hud-lower-dock/proposed-zones-1920x1080.png)

Concept references (look only, not layout authority):
- Slim ribbon: `ui_concept_slim_dock_1790353835137.jpg`. This is the direction to
  build: thin frames, open centre.
- Cockpit console: `ui_concept_lower_dock_1790353433507.jpg`. The owner's favourite
  look. Borrow its **visual language** at slim size: the bracketed tech frame,
  cyan hearts, curved O₂ arc, orange arsenal accent, and the ammo-over-reload-arc
  treatment. Drop the armoured bezel height.
- Split wings: `ui_concept_split_wings_1790353615005.jpg`.

**Recommended look: "slim cockpit".** Zone sizes as in §2.2. Each panel has a
2u cyan hairline frame with 8u corner brackets, echoing the existing
`.hud-visor-bracket` corners, so the new dock matches the diegetic visor. There is
no armoured casing. The suit console carries the cockpit concept's hearts row and
curved O₂ arc. The arsenal carries its orange weapon silhouette, large tabular ammo
and reload arc.

**Template comparison (from the draft, sizes updated to the computed spec)**

| Design parameter | Cockpit console (owner's favourite look) | Slim cockpit (recommended) |
| :--- | :--- | :--- |
| Bottom band height at 1080p | ~180 px (16.6 %) | **84–132 u (7.8–12 % at the wings; 7.7 % total always-on coverage)** |
| Bezel | Heavy armoured casing | **Hairline frame + visor corner brackets, gradient glass (no `backdrop-filter`)** |
| Centre | Console bulk over the floor | **Suit console 440 u wide; prompt lane only when needed** |
| Steam Deck 1280×800 | Tight vertical fit | **10 % always-on coverage; 0.8 u floor keeps text ≥ 11 px** |
| Feel | Simulation / immersion | **Action-roguelike readability, cockpit styling kept** |

---

## 4. Zone specifications

States used below: **Idle** (exploring), **Engaged** (combat signal on, see C),
**Critical** (heart ≤ 1, O₂ ≤ 25 %, hull ≤ 25 %, or hazard active).

**A — Sector tag.** One line: `SECTOR 09 · DAY 1 · 06:21 · DAY`, built from
`.level-indicator`: level, `#biome-label`, `#campaign-day-indicator`, and the
cycle track as a 2u underline. The biome name crossfades on change. The
`EXOSUIT // MARK-IV` visor telemetry moves here as a hover tooltip; its current
spot collides with G.

**A2 — Run chips.** `#hud-run-cards`, `#hud-bounty-chip` and `#hud-event-chip` in
one horizontal row that wraps to 2 lines at most. When there are no chips there is
no row, and A2 takes no space.

**B — Alert lane.** One banner at a time, by priority:
1. Boss: `#boss-status-panel`, name and HP bar.
2. Hazard: `#hazard-status-panel`, with its countdown.
3. Queen's Ledger: `#queens-ledger-hud`, Act 2 and later only.

A lower-priority item waits and shows when the higher one clears. Entry is a 180 ms
slide-down (transform only); exit is a fade. Critical hazards pulse the border
only, not the text.

**C — Objective drawer.**
- Collapsed: the single primary objective, with a small counter showing more
  (`+2`).
- Sources, in priority order: the `#objective-tracker` primary, then
  `#mission-progress-hud`, then `#camp-quest-hud`.
- Expanded: up to 3 rows. Expand with a PC click, or with the **tactical map open**
  on Deck (the map already has focus; no new binding). The drawer never becomes a
  focus root (§6.2).
- Auto-collapse when Engaged. The **combat signal**, new in Phase 6, is on when any
  of these happened in the last 4 s:
  - an enemy targeted the player (`canEnemyTargetPlayer` true while aggroed);
  - the player took damage;
  - the player fired at a hostile.

  It clears after 4 s quiet. Assign it to `this.inCombat`, which existing callers
  already read and currently always get `false`.

**N — Notification deck.** The existing `.hud-notification-stack` card deck
(`updateHudNotificationDeck`, priority sort, `--deck-index`) keeps its logic, anchored
under C. The `.hud-mission-stack` it pushes down (`is-below-notifications`) goes away
as a right-side column; its children move to C and H.

**S — Settings gear.** It keeps its fixed corner slot (`--corner-settings-*`). The
dock must never contain it (§6.1).

**D — Radar + map.** `#desktop-compass` with `#hud-blueprint-canvas`, base
distance, radar row and the `[M]` / D-pad-up glyph. `#hud-map-info` (sector name,
coordinates, integrity) moves to a hover/expanded state; its 3 lines are the main
reason today's map panel is 300 px tall on Deck.

**E — Suit console.**
- Row 1: hearts (`#vitals-hearts`). These vary by class and PvP (4-heart
  contract), so the layout must hold 1–6 hearts without resizing the panel.
- Row 2: the O₂ arc (`#vitals-o2-bar`, `#vitals-o2-pct`).
- Row 3: hull (`#ship-status-panel`) as a thin line.
- Fatigue (`#vitals-fatigue-row`) and cover (`#vitals-cover-row`) show only when
  non-nominal, as a small tag on the right of row 2.
- Critical: the affected meter pulses (opacity), and `#damage-vignette-layer` stays
  the screen-level cue.

**F — Loot chips.** Horizontal `✚ MED · ⬢ TECH · ◎ COIN · ✪ SHELL`, reusing the
existing counters (`#pickup-count-*`, `renderShellCounter`). The chips stay visible
at **60 % opacity when idle** and go to 100 % with a 300 ms pulse on gain
(recommended answer to the draft's Decision 2; see §9). The TOTAL line is dropped;
it duplicates the sum.

**H — Prompt lane.** One line at a time, by priority:
1. Interaction prompt: `PRESS E / Ⓐ ACCESS TANK BASE SHOP`, from the 12
   `*-hud-prompt` elements (biome, lore, console, O₂ generator, turret, foundry,
   scientist, Mayor Tina, black box, hole, mouse-look, telemeter action).
2. Loop-step guidance: `#loop-step-hud`, "▶ REPAIR O2 AT THE SHIP".
3. Tutorial prompt: `#tutorial-prompt`, when not carded into N.

It sits straight under the player's feet, the shortest trip from the character.

**G — Arsenal + abilities.**
- Weapon silhouette and name, big tabular `06 / 18`, with the cache underneath.
- Reload arc: `#weapon-reload-bar` restyled as an arc.
- Two ability tiles, each with its live key/glyph:
  - Class ability (`#class-ability-panel`, F / Deck glyph).
  - Radar scan (`#radar-scan-panel`, Q / Deck glyph).
- Tiles show a cooldown sweep (conic-gradient on a pseudo-element, transform-free).

**I — Target readout.** `#tactical-telemeter-box` (name, type tag, integrity,
coordinates), anchored above G. It shows only while aiming at something and hides
in 150 ms.

**Unchanged:**
- `#gameplay-crosshair`, `#damage-vignette-layer`.
- In-world nameplates (co-op/PvP), killstreak/XP popups (near the operator,
  outside the keep-out).
- The full-screen tactical map `[M]`.

---

## 4A. The living suit console (the "DOOM face" layer)

Owner, 2026-09-25: panels **in the cockpit-concept style**
(`ui_concept_lower_dock_1790353433507.jpg`) with **custom backgrounds that change
over time**, like DOOM's face: the suit shows the damage, the cold and the grime,
and the operator's face reacts. The dock stays slim (§2.2); this is what fills it.

### Three layers per panel

1. **Frame**: the cockpit concept's bracketed tech bezel, redrawn slim.
   - One 9-slice WebP per zone (D, E, G, plus a small A/C tag frame), so it
     stretches to any `u` without blurring.
   - One set per class, tinted like the Armory backgrounds (`public/ui/armory_bg_*.jpg`):
     SCOUT cyan, TANK amber, ENGINEER green.
2. **Condition overlays**: transparent WebP layers stacked on the frame, each
   driven by one game signal (table below). They **accumulate and heal**, so the
   suit visibly carries the run.
3. **Operator portrait** (zone E, left of the hearts, ~72 × 72 u): a visor window.
   The operator's face behind the glass reacts to what is happening, as DOOM's
   does.

### Signal → frame → face

| Game signal (already in the code) | Frame / overlay change | Portrait (face behind visor) | Priority |
| :--- | :--- | :--- | :--- |
| Hearts lost (`player-damaged`: `hp` / `maxHp`) | Glass cracks in 3 tiers (≤ 75 %, ≤ 50 %, ≤ 25 %); a spark flicker at the last heart. **Persist** until healed; heals play a 400 ms "seal". | Hurt 1 → 2 → 3 (bruised, bloodied, gritted); flinch frame on each hit | 2 |
| Hit direction (**new**: add `sourceX/sourceZ` to `player-damaged`) | — | Eyes glance toward the hit, screen-relative, for 600 ms. This is the DOOM signature. | 1 while active |
| Cold (`body.player-cold-exposed`, freeze stacks from `statusEffects.js`) | Frost creeps in from the frame corners. Coverage follows exposure time or freeze stacks (0–100). Thaws when warm. | Shivering, breath puffs, frost on the visor rim | 3 |
| Low O₂ (`vitals-critical` < 25 %, `distress-mode`) | Condensation fogs the glass; the O₂ arc turns red and pulses | Gasping, visor fogged from inside | 2 |
| Toxin / caustic / bio (`player-poisoned`, `STATUS_IDS.CAUSTIC/BIO`) | Green-yellow stains spread and drip | Sickly tint, squint | 3 |
| Corrosion (`STATUS_IDS.CORROSION`) | Pitting and rust bloom on the metal bezel | — | 4 |
| Relay blackout / grid flicker run cards (`#hud-run-cards`) | Scan-line static on the frame (CSS, no art) | Visor feed glitches | 5 |
| Fatigue stage (`fatigue.js`: RESTED → … → EXHAUSTED) | Grime and scuffs build up across expeditions, reset by rest. The suit ages over the campaign, not just the run. | Eyes heavier per stage | background |
| Boss fight (`#boss-status-panel` visible) | Frame accent goes red-alert | Focused and determined | 3 |
| Kill streak (`killstreakFeedback`) | Brief amber rim pulse | DOOM grin (the "evil grin") for 1 s | 4 |
| Night (`campaign-day-indicator` phase) | Accents dim to night-cyan; the panel glass darkens slightly | — | background |
| Idle > 3 s with nothing happening | — | Looks left and right (idle loop) | lowest |
| Dead | Frame goes dark; the cracks max out | Dead face, visor shattered | final |

The **face has one state at a time**, chosen by priority: hit glance, then low O₂ or
hurt tier, then cold, toxin or boss, then kill grin, then idle. **Overlays stack**
freely: cold and cracked and grimy at once is the point.

### Art list (per class unless noted)

| Asset | Count | Format / size | Notes |
| :--- | ---: | :--- | :--- |
| Frame 9-slice (D, E, G, tag) | 4 × 3 classes | WebP, ≤ 512 px long edge | from the cockpit concept, slimmed |
| Crack tiers | 3 (shared) | WebP with alpha | seal animation is CSS (mask + opacity) |
| Frost, condensation, toxin, corrosion, grime | 5 (shared) | WebP alpha, tileable edges | coverage by CSS mask position, not new art per level |
| Portrait faces | ~12 expressions × 3 classes = 36 | WebP 144 × 144 (2× for 72 u), one atlas per class | calm, glance L/R, hurt 1–3, gasp, shiver, sick, focused, grin, dead |
| Visor glass overlays | 4 (shared) | WebP alpha | fog, frost rim, crack, shatter; the face stays per class and the glass is shared |

Budget: **≤ 3 MB total**, one atlas request per class, preloaded with the HUD.

**Consistency risk.** Generated 2D character art has not held a consistent identity
in this repo before (the player sprite work, v2–v5). Two ways to manage it:
- **Recommended:** render the 36 faces **from the existing 3D operator heads** in
  Blender. Same helmet, same lighting, posed or shape-keyed expressions, then baked to
  the atlas. Identity stays locked to the in-game model and any cosmetics/polish tint.
- Alternative: one approved base face per class, with expressions painted as edits of
  that base. Faster, but it drifts.

A live 3D visor-cam (the head rendered into a small render target each frame) is
possible. It would cost an extra render pass on a game that is already CPU-bound
(§6.5), so it isn't recommended for now.

### How it runs (no per-frame cost)

- Every overlay is an absolutely positioned layer inside its panel. Its intensity
  is a CSS custom property (`--frost: 0..1`, `--cracks: 0..3`, `--grime: 0..5`),
  written **only when the underlying value changes** and at most **4 Hz** for
  continuous values such as freeze stacks.
- Transitions use `opacity` and `mask-position` only. Nothing touches layout. There
  is no `filter` or `backdrop-filter` on panel roots (§6.1, §6.5).
- The face is one `background-position` change into the class atlas on each state
  change. There is no video and no per-frame JS.
- `reduced motion` / contrast `max`: overlays drop to at most 40 % opacity and never
  cover a number. Hearts, O₂ % and ammo always stay readable above every overlay.
- A small `suitCondition` module (pure: signals in → `{ overlays, face }` out, with
  unit tests) owns the priority rules. `main.js` applies classes and properties.

---

## 5. Complete migration matrix

| Current element(s) | Today | New zone | Change |
| :--- | :--- | :--- | :--- |
| `.level-indicator` (`#level-num`, `#biome-label`, `#campaign-day-indicator`, cycle track) | top-left box, ~160 px tall on Deck | **A** | one line |
| `#hud-run-cards`, `#hud-bounty-chip`, `#hud-event-chip` | inside the top-left box | **A2** | own row, collapses to 0 |
| `#pickup-counter-panel` (+ `#pickup-count-*`) | left, 5-line box | **F** | chips, idle-dim |
| `#desktop-compass` (+ canvas, arrows, distances) | bottom-left, 300 px tall on Deck | **D** | 132u; map info on expand |
| `#hud-map-info` | inside the map panel | **D** (expanded) | hidden by default |
| `#weapon-status-panel` (clip, cache, reload) | top-centre pill | **G** | big ammo, reload arc |
| `#class-ability-panel`, `#radar-scan-panel` | top-right pills | **G** | tiles with live glyphs |
| `#vitals-panel` (hearts, O₂, fatigue, cover) | top-right pill | **E** | rows; fatigue/cover conditional |
| `#ship-status-panel` | top-centre pill | **E** | thin hull line |
| `#hazard-status-panel` | inside the top pill row | **B** | priority 2 |
| `#queens-ledger-hud` | inside the top pill row | **B** | priority 3 |
| `#boss-status-panel` | floating top | **B** | priority 1 |
| `#objective-tracker`, `#mission-progress-hud`, `#camp-quest-hud` | right column, up to 4 cards | **C** | one line + drawer |
| `#loop-step-hud` | bottom-centre pill | **H** | priority 2 |
| 12 × `*-hud-prompt`, `#telemeter-action-prompt` | right mission stack | **H** | priority 1 |
| `#tutorial-prompt`, `#radio-transmission-prompt` (cloned cards) | right notification deck | **N** | unchanged logic |
| `#tactical-telemeter-box` | varies | **I** | anchored above G |
| `.hud-corner-settings` | fixed top-right slot | **S** | unchanged |
| `.hud-visor-bracket` ×4, `.hud-visor-telemetry` | screen corners | brackets stay; telemetry → A tooltip | frees G's corner |
| `#npc-story-tracker` | story overlay | unchanged | out of scope |
| `#gameplay-crosshair`, `#damage-vignette-layer` | — | unchanged | — |
| co-op teammate status | none (nameplates only) | **E** side tab (optional) | decision §9 |

---

## 6. Engineering constraints (traps this repo has already hit)

### 6.1 Fixed-position anchoring
`position: fixed` resolves against the nearest ancestor with `transform`, `filter`,
`backdrop-filter`, `contain: layout/paint` or `container-type`, not the viewport.
The gear slot and advance slot drifted this way before (the "one slot, every screen" block in `style.css`).

**Rules:**
- The dock root has none of those properties.
- Animations use `transform` on the **leaf** panel only.
- The gear and any fixed element stay outside the dock.

### 6.2 Steam Input action set
`syncSteamInputPhase()` pins the Deck to the **menu** action set whenever a
`MENU_FOCUS_ROOT_IDS` surface looks open. An always-mounted element that hides with
CSS instead of `.hidden` kills all native Deck input
(fixed 2026-08-27; guarded by `tests/e2e/steam-input-action-set.spec.js`).

**Rule:** nothing in the dock is ever added to `MENU_FOCUS_ROOT_IDS`. The objective
drawer's expanded state is display-only. Run `tests/e2e/steam-input-action-set.spec.js`
after every phase.

### 6.3 Accessibility
- Honour the existing `hb_contrast` levels (`normal`, `high`, `max`). At high and max,
  panel fills go opaque and hairlines double.
- Honour subtitle size for prompt text in H.
- Add a **HUD Scale** setting (`hb_hud_scale`: 0.85 / 1 / 1.15 / 1.3) feeding
  `--hud-scale`. Deck players on a 7" screen will want 1.15.
- Keep `aria-live` on the elements that have it today: vitals, abilities, hazard
  (`assertive`), bounty.
- Reduced motion: no pulses or slides, only opacity steps. Hook this to the
  existing reduced-pressure/camera-shake family or `prefers-reduced-motion`.

### 6.4 Localisation
Every new or moved label uses `data-i18n` keys in all **7 locales**. Run
`npm run i18n:audit` as a ratchet: it must stay at 0 unlocalised
(the i18n audit ratchet). Short-form labels ("HULL", "O₂") need their own keys,
not truncated long ones. German and Russian run ~35 % longer, so size text boxes
with `min-width`, not fixed width, and test them.

### 6.5 Performance (after the 2026-09-25 quality restore)
- **No `backdrop-filter`** over the WebGL canvas. Use a gradient fill such as
  `linear-gradient(rgba(6,12,18,.78), rgba(6,12,18,.62))`.
- Animate only `transform` and `opacity`. Never animate `width` on bars; use
  `transform: scaleX()`, which the reload bar already can.
- Write text only when the value changes (compare before assigning `textContent`),
  and at most once per frame for per-frame values such as O₂ %. The HUD must not add
  style or layout work to frames that are already CPU-bound
  ([perf report](../reports/perf-quality-restore-2026-09-25.md)).
- Budget: HUD style + layout ≤ 0.3 ms per frame on Deck. Measure with the
  `gameplay-cpu` probe (`tests/e2e/probes/gameplay-cpu.spec.js`).

### 6.6 Controller glyphs and bindings
Key hints come from `state.settings.keyBindings`, and on Deck from
`getControllerGlyphLabel(action, primaryControllerType)`. Refresh them when the
input mode changes (`refreshInteractivePromptKeys` already exists).

---

## 7. Phasing (each phase shippable, behind one flag)

Ship behind `hb_hud_layout = 'dock' | 'classic'` (default `classic` until Phase 5
passes). One-click comparison, instant rollback.

| Phase | Scope | Files | Acceptance |
| :--- | :--- | :--- | :--- |
| **0. Measure first** | Playwright layout spec: boot to gameplay at 1280×800, 1920×1080, 2304×1440, 3440×1440. Collect every HUD element's rect. Assert inside the safe margin, no overlaps, nothing in the keep-out, coverage ≤ budget. Save screenshots. Baseline today's numbers in the report. | `tests/e2e/hud-layout.spec.js` (new), `scripts/hud_zones.py` (moved from assets) | Runs green in `classic` mode with `expectedFailures` for today's overlaps; numbers recorded. |
| **1. Tokens + skeleton** | `--hud-u` / `--u` / `--hud-margin` tokens. Empty `.hud-dock` with left/centre/right wings and a top band, behind the flag. | `src/styles/expeditionHud.css`, `index.html`, `main.js` (flag) | Dock zones match §2.2 within ±2 px at all 4 sizes; gear slot unchanged (existing gear e2e green). |
| **2. E + G** | Move vitals, ship, weapon and both ability tiles; live glyphs; reload arc. | `index.html`, `expeditionHud.css`, `main.js` (render functions keep their IDs) | All existing vitals/weapon/ability tests green; no JS logic changes beyond container lookups; Deck glyph test. |
| **3. D** | Compass into the left wing; map info to expanded state. | same | `[M]` / D-pad-up / click opens the map as today; minimap radar reveal unchanged. |
| **4. F + H** | Loot chips; prompt lane with the priority queue (interaction > loop step > tutorial). | `main.js` (small `hudPromptLane` module), css | Every `*-hud-prompt` shows in H; only one at a time; `verify_hud_shells` still passes. |
| **5. Top band** | A, A2, B (priority queue), C drawer, N under C. Retire `.hud-mission-stack` as a column. | `main.js`, css | Boss+hazard at once shows boss, then hazard; drawer expands on map-open (Deck) and click (PC); `steam-input-action-set.spec` green. **Flip default to `dock`.** |
| **6. Behaviour** | Combat signal (`this.inCombat`); drawer auto-collapse; loot idle-dim; critical pulses; reduced motion. | `threeGame.js` (signal), `main.js` | Unit tests for the signal (4 s window); visual states captured in the layout spec. |
| **6A. Living console** | Frame 9-slices per class; overlays (cracks, frost, fog, toxin, corrosion, grime, static); `suitCondition` module; `player-damaged` gains `sourceX/sourceZ`; portrait atlas (placeholder art first, then the Blender-rendered faces). | `src/suitCondition.js` (+ tests), `main.js`, css, `public/ui/suit/*` | Unit tests: every signal → overlay/face; priority order; heal clears cracks. Layout spec captures Idle/Cold/Toxic/Critical/Dead. HUD style/layout still ≤ 0.3 ms per frame. Owner art sign-off per class. |
| **7. Deck, a11y, i18n** | HUD Scale setting; contrast high/max; 7-locale pass with the longest strings; Deck hardware check. | settings UI, locales | `i18n:audit` 0; layout spec green in `de` and `ru`; owner Deck sign-off. |
| **8. Remove classic** | Delete the old layout CSS and the flag after owner sign-off. | css, `main.js` | No dead selectors (grep); bundle CSS smaller. |

---

## 8. Test and review plan

- **Automated each phase:**
  - `npm test`, `npm run lint`, `npm run i18n:audit`;
  - the new `hud-layout.spec.js`;
  - `steam-input-action-set.spec.js`, `controller-focus.spec.js`;
  - the gear/advance-slot specs.
- **Screenshots** for each phase at 4 sizes × 3 states (Idle, Engaged, Critical),
  plus boss, hazard and notification cases, attached to the PR.
- **Performance:** the `gameplay-cpu` probe before/after Phase 2 and Phase 5; the
  HUD's style/layout share must stay ≤ 0.3 ms per frame.
- **Owner hardware pass (Deck + PC):**
  - readability at arm's length on the Deck;
  - hearts, O₂ and ammo readable without looking away from the operator;
  - prompts never hidden;
  - controller glyphs correct;
  - drawer usable on Deck.

---

## 9. Decisions for the owner

1. **Look:** "slim cockpit" (slim-ribbon sizes, with the cockpit concept's frame,
   hearts, O₂ arc and arsenal styling) — **recommended** — or the thinner plain
   ribbon?
2. **Loot chips:** always visible, dimmed when idle and bright on pickup
   (**recommended**), or hidden until a pickup?
3. **Objective drawer on Deck:** expand automatically while the tactical map is open
   (**recommended**, no new button), or give it a button (the View button is free
   in gameplay)?
4. **Co-op teammate chip:** add a small teammate hearts/O₂ tab on the suit console's
   right edge in co-op? Today teammates have only in-world nameplates.
5. **Visor frame:** keep the four corner brackets as the dock's visual language
   (**recommended**) or retire them?
6. **Living console:** faces rendered from the in-game 3D heads (**recommended**:
   consistent with the model and cosmetics) or painted 2D faces? And is 12
   expressions per class the right set, or do you want more (e.g. a DOOM-style "ouch"
   face on big hits)?
7. **Rollout:** ship Phases 1–5 behind the flag for a week of your play before
   making it the default?

---

## 10. Risks

| Risk | Mitigation |
| :--- | :--- |
| Moving elements breaks JS lookups (`#menu .open-settings-btn` happened before) | IDs are kept; only containers change. Phase 2 greps every `getElementById` / `querySelector` for moved IDs. |
| Deck input dies from a focus-root mistake | §6.2 rule + `steam-input-action-set.spec` every phase. |
| Longer locales overflow slim panels | `min-width` sizing; the layout spec runs `de` and `ru`. |
| HUD adds frame time to a CPU-bound game | §6.5 budget, measured by the probe. |
| Several agents edit `main.js` / `expeditionHud.css` at once | Claim phases in the lane table before starting; `git status` first (several agents work this branch). |
