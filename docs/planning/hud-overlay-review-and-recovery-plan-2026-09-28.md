# HUD overlay review and recovery plan

**Date:** 2026-09-28  
**Scope:** Live gameplay HUD only; comparison of the default `classic` layout and the experimental `dock` layout.  
**Review build:** `2.4.12-beta`, Tank operator, idle bunker gameplay.

## Decision

Keep the lower-dock direction, but do **not** make it the default yet. The dock has a
better game-specific silhouette and clears more of the upper playfield than the classic
HUD. Its current implementation does not match the plan closely enough to continue into
damage overlays, animated portraits, or other decorative work.

The next milestone should be a **readability and information-architecture recovery
pass**. The main problems are not missing ornament. They are:

1. The generated housings are 150 u tall rather than the planned 64 u.
2. Each class has different panel geometry even though the plan requires identical
   geometry and stable instrument positions.
3. Critical instruments have been squeezed into tiny art windows. In the Tank capture,
   the weapon panel is 26.1 px wide at 1080p and 20.9 px wide on Deck.
4. Deck text reaches 7.2 px, below the plan's 11 px minimum.
5. The old 340 px-wide mission/notification column is unchanged. On Deck it is about
   268 px tall, or one third of the screen height, and remains the dominant HUD mass.
6. The tests prove containment and non-overlap, but not legibility, clipping, visual
   hierarchy, equivalent class geometry, state priority, or total HUD coverage.

## Captures

| Layout | 1920×1080 | Steam Deck 1280×800 |
| :--- | :--- | :--- |
| Classic | [Screenshot](assets/hud-review-2026-09-28/classic-desktop-1920x1080.png) | [Screenshot](assets/hud-review-2026-09-28/classic-deck-1280x800.png) |
| Dock | [Screenshot](assets/hud-review-2026-09-28/dock-desktop-1920x1080.png) | [Screenshot](assets/hud-review-2026-09-28/dock-deck-1280x800.png) |

Raw element rectangles and measured minimum font sizes are in
[`metrics.json`](assets/hud-review-2026-09-28/metrics.json).

## What works

- The dock reads as part of the game's world; the Tank stone-and-iron housing has far
  more identity than the classic collection of generic rectangular cards.
- Navigation, condition, and weapons occupy predictable left/centre/right regions.
- The central combat view is free of permanent UI.
- The one-line sector header is faster to scan than the classic tall sector card.
- The layout flag, HUD-unit scaling, stage containment, panel non-overlap, player
  keep-out, prompt clearance, and gear slot all pass the current Playwright suite.
- At 1080p the three housing rectangles cover about 5.6% of the 16:10 stage; at Deck
  size they cover about 6.6%. The opaque-box coverage target is therefore plausible,
  even though the band's excessive height still blocks more useful vertical space.

## What is weak or incomplete

### 1. The live art contradicts the slim-dock specification

The plan calls for panels sized 220×64, 520×64, and 380×64 u. The live Tank housings
are approximately 209×150, 283×150, and 207×150 u. Instead of a thin connected command
band, the result is three small, tall islands with large gaps between them.

That changes more than appearance: it leaves too little horizontal room for readable
ammo, status, loot, and ability labels while consuming 13.9% of the 1080p stage height
and 15% of the Deck screen height.

### 2. Decoration wins over combat readability

The visual hierarchy should be `hearts/O2 → ammo/reload → active ability → prompt →
objective`. In the live dock, the frames are clearer than the information inside them.
Ammo is readable only as a small `6/6`; weapon identity, cache, ability names, and loot
meaning are hidden or reduced to tiny marks. The dock removes useful redundancy before
the replacement icon language is mature.

### 3. The old right-side stack defeats the new composition

The right-side interaction prompt, loop objective, primary objective, and secondary
objective remain separate cards. This makes the dock feel like a skin swap on the
lower HUD rather than a redesigned HUD system. It also creates two simultaneous
guidance systems: a bottom-centre loop prompt and a large top-right task column.

### 4. Class consistency is not enforced

The generated stylesheet gives Scout, Tank, and Engineer different panel widths,
window sizes, and internal positions. That violates the plan's muscle-memory goal.
Class identity should come from material, silhouette details, accent, and reactive
damage layers—not from moving the player's health and ammo between differently sized
windows.

### 5. The current acceptance suite can pass an unreadable HUD

`tests/e2e/hud-layout.spec.js` currently checks only HUD-unit calculation, default and
stored flags, housing containment/non-overlap at 1080p, player keep-out, prompt
clearance, and gear position. All four tests pass. A 7.2 px label, clipped localized
text, an empty weapon socket, or a 268 px mission column can all pass those assertions.

## Recovery plan

### R0 — Make the review harness authoritative

**Goal:** turn visual quality claims into repeatable checks before changing more art.

- Capture all three classes at 1280×800, 1920×1080, 2304×1440, and 3440×1440.
- Capture Idle, Engaged, Critical, boss+hazard, reload, ability cooldown, interaction
  prompt, notification, and three-objective states.
- Add German and Russian captures and controller-glyph captures.
- Assert minimum computed text size of 11 px on Deck for information players must read.
- Assert no visible text clips or ellipsizes unless the component explicitly allows it.
- Assert minimum critical icon/touch-target dimensions and contrast against both a dark
  cave and a bright snow scene.
- Assert identical D/E/G content rectangles across classes; allow only decorative art
  bounds to differ.
- Measure both opaque HUD area and maximum occupied vertical bands. Keep the existing
  ≤7% Deck / ≤6% 1080p opaque-area target and add a lower-band height target of 64 u,
  excluding temporary prompts.

**Exit:** the harness fails on today's dock for the known reasons and produces a named
screenshot matrix as test artifacts.

### R1 — Rebuild the three-panel geometry before adding features

**Goal:** restore the slim command-dock proportions and one-glance readability.

- Replace the generated per-class coordinate maps with one semantic slot grid shared
  by all classes: map 220×64 u, status 520×64 u, arms 380×64 u.
- Convert housing art to 9-slice/cap-and-stretch assets so texture does not dictate
  component geometry. Regenerate only if the current assets cannot survive slicing.
- Keep class differences to frame material, small ornaments, accent color, and state
  overlays. Do not vary content window positions.
- Restore a genuinely wide centre module and arms module. Give ammo the largest type in
  the lower band; keep hearts/O2 second; never hide weapon identity or reload state.
- Put radar scan on the map ring as planned, freeing the arms panel for weapon, ammo,
  reload, class ability, and dash/melee state.
- Use short, explicit icon+number pairs for loot and include accessible labels/tooltips;
  do not rely on unlabeled glyphs.

**Exit:** all three classes pass the same geometry snapshot; Deck critical text is at
least 11 px; the full core combat state is understandable with frame art temporarily
disabled.

### R2 — Finish the information architecture above the dock

**Goal:** make the screen operate as one system rather than dock plus legacy cards.

- Build one prompt-lane controller with strict priority: interaction > urgent tutorial
  > loop guidance. Move every `PRESS E` surface into it and show only one at a time.
- Replace the right mission column with a one-line primary-objective drawer. Show a
  `+n` count for secondary items; expand on click or while the tactical map is open.
- Merge mission progress, camp quests, and objective tracker data behind one renderer.
- Make the top-centre alert lane exclusive: boss > hazard > Queen's Ledger. Queue lower
  priority alerts rather than stacking them down the screen.
- Anchor notifications below the objective drawer and cap their height/count.
- Remove duplicate instructions once the consolidated prompt/objective surfaces are
  proven.

**Exit:** no permanent right-side column during normal play; interaction and objective
guidance never compete; the three-objective Deck state remains within its budget.

### R3 — Implement gameplay states, then add restrained juice

**Goal:** make the HUD communicate changes before making the housing more elaborate.

- Add the four-second combat signal and use it to collapse objectives and quiet loot.
- Define Idle, Engaged, Critical, Reloading, Ability Ready, Frozen, Toxic, Boss, and
  Dead visual states in a small pure state resolver.
- Give damage, low O2, reload completion, ability readiness, and pickups distinct
  transform/opacity/audio feedback. Respect reduced motion.
- Only after those states pass readability tests, add housing cracks, frost, blood,
  grime, and class-specific lamps. Keep effects behind instrument text and cap opacity.
- Defer talking portraits and event/Act 2 housing transformations until the core dock
  has passed owner playtests on Deck and desktop.

**Exit:** players can identify health danger, low O2, reload, ready ability, active
hazard, and current prompt in a one-second glance in every class.

### R4 — Accessibility, performance, and rollout

- Add HUD scale presets (0.85/1/1.15/1.3), with 1.15 readily available on Deck.
- Verify high/max contrast, reduced motion, live controller glyph changes, and all seven
  locales.
- Measure HUD style/layout cost on Deck; keep it ≤0.3 ms/frame and avoid
  `backdrop-filter` over WebGL.
- Run a focused playtest: 20 minutes per class on Deck and desktop, logging missed
  reloads, missed prompts, unreadable values, and eye-travel complaints.
- Keep `classic` as default until R0–R4 pass. Then run a one-week opt-in comparison
  before flipping the default; remove classic only after the rollback window.

## Recommended work order

1. R0 test matrix and failure baseline.
2. R1 shared geometry and typography, using temporary plain frames if necessary.
3. R2 prompt/objective/alert consolidation.
4. R3 functional state feedback.
5. R4 Deck/a11y/performance sign-off.
6. Decorative living-housing layers and portraits afterward.

This order deliberately protects the strongest part of the concept—the tactile,
class-flavoured lower dock—while preventing more art from becoming coupled to the
wrong dimensions.
