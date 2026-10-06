# UI overhaul plan: menus and game HUD

**Date:** 2026-10-05 · **Branch:** `dev/sprint-49` · **Status:** plan, nothing built
**Builds on:** [UI surfaces, menu map and controller navigation](../design/ui-surfaces-menu-map-and-controller-navigation.md) (§7 P1–P5),
[HUD overlay review and recovery plan](hud-overlay-review-and-recovery-plan-2026-09-28.md) (R0–R4),
[HUD lower dock plan](hud-lower-dock-plan-2026-09-25.md),
[Steam Deck-first display spec](../steam-deck-first-display-and-input-spec.md).

## Decision

The cut-off and overlapping UI comes from four structural causes (plus an
audit that cannot see them), not from two dozen separate bugs. Fix the causes first, then rebuild each screen and the HUD
on top of them. Patching each overlap where it shows would add more overrides to
a stylesheet that is already the main source of the problem.

Order: **0** make the audit see what players see → **1** one true 1280×800 stage →
**2** a contract for decorative layers → **3** fit content to the painted art →
**4** screen-by-screen rebuild → **5** game HUD overhaul → **6** CSS
consolidation, done inside each PR from phase 4 on.

The 2026-10-05 audit reported "no off-stage, clipped or truncated content" on 44
surfaces (finding #16). That was true by its own checks and wrong by eye: it
compares boxes with the stage and with scroll parents only. It cannot see paint
order, a painted frame's alpha, pseudo-element lines, wrapped one-line labels
or anything at sizes it did not run.

## Status (2026-10-05, evening)

Guarded by `tests/e2e/ui-layout-contract.spec.js` (paint-order occlusion,
painted-frame alpha, card overlap, corner-slot bracket, dock tiles in their
housings, text inside the housing frame and its panel, vitals rows, HUD safe
frame, visor brackets, pause row gap). Passes at 1280×800, 1920×1080 and
1280×720 (`HB_CONTRACT_SIZE=WxH`); `hud-readability.spec.js` passes again.

| Item | State |
| --- | --- |
| C1 bezel bracket on ⚙ | Fixed: `#cabinet-bezel::after` removed |
| M1, M2 class cards | Fixed: stack padded 3 vu clear of the frame chamfers, no scale on hover/focus/select, focus ring inset, 1 vu gap |
| H1, H2 corner slot in play | Fixed: right rail starts below the corner slot; class ability back in the dock |
| H3 dash / melee / radar tiles | Fixed: `--dock-bottom` defined; dash and melee taken out of flow and stacked in the arms housing; arms slots rebalanced inside the frame |
| H4 vitals | Fixed: hearts, O₂ and hull in three 16 u rows inside the frame; 11 px floor restored |
| H5 arms text | Fixed: clip and cache share a row; weapon name inside the frame |
| H6 visor brackets | Fixed: bottom brackets hidden in the dock layout |
| H7 safe frame | Fixed: `--hud-margin` ≥ 4 vu (32 stage px) |
| P1 pause row | Fixed: 1.5 vu gap in `.setting-item` |
| K3 | Not a defect (see table) |
| Open | Second radio card clipped by the rail's max-height; hearts glyph 11 px (target 16); A1–A4, N1–N2, K1–K2, P2, T1, M3–M4, H8; Phases 1, 3, 6 |

## What is wrong today

Captured 2026-10-05 with a temporary probe (`tests/e2e/probes/zz-ui-overlap-tmp.spec.js`)
at 1280×800, 1280×720, 1366×768, 1920×1080 and 2560×1440. Coordinates are at 1280×800.
Screenshots: [`docs/reports/ui-overhaul-2026-10-05/`](../reports/ui-overhaul-2026-10-05/)
(close-ups such as `menu-class-cards.webp`, `corner-bracket-gear.webp`,
`hud-vitals.webp`; full screens as `full-<screen>-<size>.webp`).

### Operator menu (hero select)

| # | Problem | Cause |
| --- | --- | --- |
| M1 | Scout card's top-left corner is under the metal frame: "RECON FRAME" reads "ECON FRAME". Tank's "B" and Engineer's bottom "BEST" line are also cut. | The frame art is `div.homebase-plate-overlay`, a full-stage layer at z 8002 painted *over* the cards. `#menu .main-layout` and its 32 / 58.5 / 32 vu columns are hand-placed against it; its window has rounded corners (~2.5 vu radius) and the card stack (`.char-selection`, 910,176 256×470) is a plain rectangle starting in that corner. |
| M2 | Class cards overlap each other: the selected Tank card and the Engineer card cover the line above them ("◆ BEST: 0000 PTS"). | Three fixed-height cards in a 58.75 vu column with `overflow: hidden`; the selected state's border and glow grow outward. |
| M3 | "← RETURN TO MAIN MENU [ESC]" is ~10 px text; the hub info line wraps at 1280×720. | px font floors under vu layout (see cause 1). |
| M4 | Five empty square slots under CHASSIS SPECIFICATION carry no meaning on a fresh save. | Placeholder never filled. |

### Corner slot on every screen (CHAT · ⚙)

| # | Problem | Cause |
| --- | --- | --- |
| C1 | An orange line runs along the top of the ⚙ button and down its right side ("goes around the top corner and cuts through settings and chat"). A second faint line (the stage outline) runs between the corner buttons and the stage edge. | `#cabinet-bezel::after` draws a 4.5×1.2 vu corner bracket at `top: 0.8vu; right: 0.9vu`, and `#cabinet-bezel` has `outline-offset: -0.65vu`. The bezel is `z-index: 9999`, above every screen, and the gear sits at `top/right: 1vu` — the bracket hugs it. `::before` does the same at top-left. |

### Armory

| # | Problem | Cause |
| --- | --- | --- |
| A1 | `[Q / E CYCLE]` wraps to two lines at 1280×720; the header bar then crowds CHAT. | px chip text and padding under a vu-sized bar (cause 1). |
| A2 | "SHOULDER PATCH & INSIGNIA" wraps, so its slot sits lower than "DEFAULT COMMS" beside it; the primary weapon name wraps to two lines. | Labels have no one-line rule; the two-column grid rows are not aligned. |
| A3 | LIVE STAGE PREVIEW sits over the operator's legs and repeats the ten values already listed on the right. | Floating card placed over the 3D scene. |
| A4 | Orange connector lines run from the class-tab bar down into the scene (x≈855). | Edges of `header.armory-header` (31,18 1219×90) and `.armory-stage-column` (31,119 835×589) drawn as decoration across the scene. |

### Tactical Net (deployment console)

| # | Problem | Cause |
| --- | --- | --- |
| N1 | The ✕ floats on its own between the header and CHAT. | It was shifted left to clear the corner slot on 2026-10-05; nothing anchors it to the panel header. |
| N2 | About 40% of the panel is empty below TRACKED OBJECTIVES; ledger labels (RUNS, DEATHS…) are ~9 px. | Fixed-height sections; px floors. |

### Ship terminal

| # | Problem | Cause |
| --- | --- | --- |
| K1 | Header pills wrap ("08:43 · / DAY", "TANK BASE STATUS [ACTIVE / EXOSUIT]", "CYCLE HOLD — TERMINAL / ACTIVE"); class-skills counter is ~8 px. | Long labels in fixed-width pills. |
| K2 | The bottom quarter of Base System is empty while the goal ladder is hidden (doc §5). | Layout sized for one card. |
| ~~K3~~ | ~~Inside the terminal, the corner CHAT and ⚙ are covered by the header.~~ Not a defect: the opaque terminal modal covers the whole slot by design (as Settings does) and has its own ✕. The probe's forced hit-test reported it. | — |

### Pause (Settings → Session)

| # | Problem | Cause |
| --- | --- | --- |
| P1 | "ABORT CURRENT MISSION" runs into the red ABORT MISSION button; there is no gap. | Row uses `space-between` with no min gap. |
| P2 | Pause is the Settings window; RESUME is the 4th control, not the first. | No pause screen of its own. |

### Title

| # | Problem | Cause |
| --- | --- | --- |
| T1 | At 1280×720, QUIT GAME sits ~12 px from the stage bottom (safe frame is 48 px). | The `(max-height: 820px)` block also shrinks spacing. |

### Game HUD (dock layout, default since `7d2bd377`)

| # | Problem | Cause |
| --- | --- | --- |
| H1 | The radio transmission card (portrait, "TANK OPERATOR … ONLINE", mission text) covers the CHAT button; its text is cut mid-line. When no transmission shows, the objective drawer toggle covers CHAT instead. | `.hud-right-rail` (883,16 336×37, z 16900) holds both and spans x 883–1219, over the corner slot (x 1150–1272); fixed height with hidden overflow. |
| H2 | "BULWARK" class label butts against CHAT. | Same corner, no reserved zone. |
| H3 | RADAR SCAN (cyan) and MELEE (orange) tiles render at the stage's top-left corner, under the sector header. | `#melee-cooldown-panel` (0,51 52×51) and the class-ability panel (key at 18,20) belong in the dock housings (`d2abaa35`, `5c20d4ea`) but fall back to stage origin — an absolute position whose anchor is missing. |
| H4 | Vitals housing: O₂ and SHIP INTEGRITY rows overlap; "97%" sits on top of "100%"; hearts are ~8 px. | Two bars and two readouts squeezed into one 64 u row. |
| H5 | Arms housing: "SIDEARM" label is clipped by the housing's top edge; the same frames overlap the compass, hearts, ship integrity and ammo text. | `.dock-housing` (z 3) is painted *above* its own contents (`#weapon-status-panel`, `#vitals-panel` at z 2), and the text windows are not matched to the art windows. |
| H6 | Orange corner brackets at both bottom corners cross the map and arms housings. | `span.hud-visor-bracket--bl/--br` in `div.hud-visor-frame` (z 100), above the housings. |
| H7 | Map and arms housings sit 16 px from the stage edge; the safe frame is 32 px. | Housing coordinates ignore `--hb-safe-hud`. |
| H8 | The objective drawer shows an empty icon box ("◆" in a blank frame). | Icon slot without art. |

## Root causes

1. **The stage is fluid, not fixed.** The Deck spec says "scale the complete
   stage uniformly". In practice `--vu` scales with the window, but style.css
   also has 3,511 px literals, px font floors (`--font-xs: max(1.8vu, 12px)`),
   a fixed `--corner-chat-width: 72px`, and 56 `@media` rules keyed to the
   *window* (including `(max-height: 820px)`, which matches the Deck itself).
   Every window size is therefore a slightly different layout, and the audit
   only ran three of them.
2. **Decoration is painted above controls.** `#cabinet-bezel` (z 9999, with
   corner brackets), full-stage `.terminal-scanline` layers and HUD corner
   brackets all sit over UI. Nothing reserves space for them. z-index values
   run from 0 to 250,000 with no scale.
3. **Layouts are hand-fitted to painted art.** The operator menu and the HUD
   housings place DOM boxes with magic vu numbers against PNG frames. Nothing
   ties a box to the window it must sit inside, so any change to the art or the
   unit breaks the fit.
4. **The stylesheet is layered overrides.** style.css is 24,953 lines;
   `.char-selection` is defined 5 times, `.mission-progress-hud` 9,
   `.ship-status-panel` 9, `.weapon-status-panel` 7; 82 selectors are defined
   3+ times. There are 1,240 `!important` in style.css and 520 in
   `expeditionHud.css`. Each fix lands as one more override, which is how
   these regressions keep coming back.
5. **The audit cannot see any of this** (see Decision).

## Phase 0 — Make the audit see what players see

Goal: a failing report that lists every item above before any fix lands.

1. **Occlusion check.** For every visible text node and control, sample five
   points with `elementsFromPoint`, ignoring declared full-stage decoration,
   and report any element from another subtree on top.
2. **Decoration diff.** Screenshot each control's box with and without
   `[data-hb-decor]` layers (`visibility: hidden`); a pixel difference over a
   threshold means decoration crosses it. This catches the bezel bracket,
   painted frame alpha (M1) and housing edges (H5), which hit-tests cannot.
3. **Sibling overlap.** Within a surface, any two text/control boxes that
   intersect by more than 2 px, neither containing the other.
4. **One-line rule.** Chips, pills, tab labels and button labels carry
   `data-hb-oneline`; flag any whose height exceeds 1.3× its line height.
5. **Reserved zones.** Nothing but the corner buttons may intersect the
   corner-slot rect (+8 px); nothing but the advance button the advance slot;
   HUD panels must stay inside `--hb-safe-hud`.
6. **Matrix.** 1280×800 (gate), 1280×720, 1920×1080, 2560×1440, 3440×1440;
   UI scale 1.0 / 1.3; locales en, de, ru; Scout / Tank / Engineer for the
   menu and HUD; HUD states Idle, Engaged, Critical, reload, prompt,
   transmission, three objectives.
7. Fold this into `tests/e2e/probes/ui-surface-audit.spec.js`; delete the temp probe.

**Exit:** the report flags M1, M2, C1, A1, A2, A4, K1, P1, T1, H1–H7. Commit the
failing baseline under `docs/reports/ui-surface-audit/`.

## Phase 1 — One true 1280×800 stage

Goal: one layout, rendered at any size, so a fix at 1280×800 holds everywhere.

1. Put all DOM UI in a layer laid out at exactly 1280×800 CSS px and scale it
   with CSS `zoom: var(--stage-scale)`. Electron 44 ships a Chromium with
   standardized `zoom`, which keeps text crisp and keeps
   `getBoundingClientRect` and pointer events in host pixels. The Three.js
   canvas stays outside the zoomed layer at host resolution.
2. Inside the layer set `--vu: 8px` (constant). Every existing
   `calc(var(--vu) * n)` keeps working unchanged; px literals become stage px,
   which is what their authors meant on the Deck.
3. Remove window-keyed `@media` width/height rules that rearrange the stage
   (keep `prefers-reduced-motion`). `(max-height: 820px)` goes first.
4. Accessibility UI scale (`--ui-scale-multiplier`) applies to text tokens
   only; verified at 1.3 by the Phase 0 matrix.
5. Re-check every place that maps between DOM and world: `window.hbStage`,
   pointer → raycast, world-anchored markers and damage numbers, the tactical
   cursor, the archive sims (RGB) pointer mapping, and the `position: fixed`
   slot anchors (`#armory-screen` `contain: layout`, modal `backdrop-filter`,
   the "one slot, every screen" block in style.css).

**Fallback** if `zoom` breaks something we cannot work around:
`transform: scale()` on the same layer (more fixed-position traps).

**Exit:** screenshots at every matrix size, scaled to 1280×800, match the
1280×800 capture (SSIM ≥ 0.99 over the UI, canvas masked); T1 and A1 are gone
with no per-screen change.

## Phase 2 — Decoration contract

1. One z scale as tokens, replacing ad-hoc values:
   `--z-scene < --z-decor < --z-ui < --z-hud-alert < --z-modal < --z-overlay < --z-toast < --z-system`.
2. Every decorative layer gets `data-hb-decor` and `--z-decor`, below
   controls. That includes `#cabinet-bezel`, `.terminal-scanline`, the HUD
   corner brackets (`.hud-visor-bracket`), `.module-scanline`,
   `#fatigue-strain-overlay` and the Armory header/stage-column edges.
   Painted frames that must sit over content (`.homebase-plate-overlay`,
   `.dock-housing`) keep their z, but content is laid out inside their
   windows (Phase 3) so nothing readable sits under the paint.
3. Remove the bezel's corner brackets from the corner-slot zone (fixes C1 on
   every screen at once); move the stage outline outside the slot.
4. Reserved zones as tokens: `--slot-corner-*`, `--slot-advance-*`,
   `--lane-prompt-*`, `--lane-alert-*`. Panels lay out around them.

**Exit:** the decoration diff is clean on every surface.

## Phase 3 — Fit content to the painted art

1. A script reads each frame PNG (menu bezel, HUD housings) and writes the
   window openings — rect plus corner radius — to JSON and to CSS custom
   properties (`--frame-win-left-*`, `--frame-win-centre-*`, `--frame-win-right-*`).
   Re-run it whenever the art changes.
2. Lay out panels inside those windows with padding ≥ the corner radius. The
   hand-tuned numbers in `#menu .main-layout` and `#menu .module-row` go.
3. Operator menu: class cards sized to (column − 2 gaps) / 3; selected state
   drawn inward (`outline-offset` negative, no scale) so it never covers a
   neighbour (M1, M2).
4. HUD housings: text windows from the same JSON (H5).

**Exit:** no decoration-diff hits on the menu or HUD at any size or class.

## Phase 4 — Screen-by-screen rebuild

Keep every element id, `data-i18n` key and `MENU_FOCUS_ROOT_IDS` entry. Each
screen moves into its own stylesheet (Phase 6) as it is rebuilt. Each lands
with an audit run and a browser test.

| Screen | Changes | Accept |
| --- | --- | --- |
| Title | Menu column inside the 48 px safe frame; buttons ≥ 44 px; Steam badge out of the bezel bracket. | Audit clean at all sizes. |
| Operator menu | Phase 3 fit; left command column as a 2×3 grid of 44 px buttons with status underneath; RETURN as a real 32 px+ button; chassis slots show the loadout's icons or are removed. | M1–M4 gone. |
| Armory | Header in one row: title · class tabs · `[Q/E]` hint, ending before the corner slot. Right column scrolls inside its own panel. Slot grid with one-line labels and aligned rows. LIVE STAGE PREVIEW becomes a compact strip under the platform, or goes (open question 3). Weapon render stays below the header line. | A1–A4 gone; right column fits at 1280×800 with ~0 px to spare (existing assert). |
| Tactical Net | ✕ inside the panel header, right of the status pill; sections fill the height; ledger text ≥ 14 px; DEPLOY in the advance slot. | N1–N2 gone. |
| Terminal | Two-row header (title + close; then time · survived · status pills, one line each). Goal ladder in the free space (doc §7 P3). Counter text ≥ 12 px. | K1–K2 gone. |
| Pause | A real pause screen: RESUME (focused first), Settings, Room Chat, Abort, Quit. Settings opens from it. Rows get a min gap. | P1–P2 gone; Esc / ☰ lands on RESUME. |
| Settings, Foundry, Archive, Codex, Dossier, Achievements | Fix whatever the Phase 0 matrix flags; hit-target token `--hb-hit-min` (32 px menu, 44 px primary/corner). | `smallTargets` empty on the main path. |

## Phase 5 — Game HUD overhaul

Continues the 09-28 recovery plan. Shipped since then: class-invariant dock
(`eff4b899`), objective drawer and prompt lane (`515f42fe`), alert queue and
bounded notifications (`32a82a9d`), combat states (`2684c771`), dock as default
(`7d2bd377`), radar on the map bezel (`d2abaa35`), dash/melee housing slots
(`5c20d4ea`). What is still wrong is H1–H8.

Target zones at 1280×800:

```
┌────────────────────────────────────────────────────────────────┐ 32 px safe frame
│ [SECTOR · DAY · TIME · bounty]     [ALERT LANE]   [CLASS][CHAT][⚙] │
│                                                  [TRANSMISSION] │  under the corner slot,
│                                                  [OBJECTIVE ▸+n] │  never over it
│                                                                │
│                    ( player keep-out 30% × 34% )               │
│                                                                │
│                         [PROMPT LANE]                          │
│ [MAP ◐ radar] [♥♥♥  O₂ ███ 97%  · loot ×4 ] [WEAPON 6/6 · ABILITY · DASH · MELEE] │
└────────────────────────────────────────────────────────────────┘
```

1. **Corner zone (H1, H2).** The corner slot is reserved. The transmission
   card anchors below it (`top: corner bottom + 8 px`), max width 340 px, three
   lines with a fade and a "more" affordance; the class label moves into the
   sector strip.
2. **Cooldown tiles (H3).** RADAR SCAN sits on the map bezel; DASH and MELEE
   sit in the arms housing slots. Anchor each to its housing element, never
   to the stage; add a test that each tile's box is inside its housing.
3. **Vitals housing (H4).** Row 1: hearts at ≥ 16 px. Row 2: O₂ label · bar ·
   value in a fixed three-column grid with tabular numerals. Ship integrity
   leaves this housing (open question 4). Loot counters keep icon + number
   pairs with accessible labels.
4. **Arms housing (H5).** Weapon name inside the art window; ammo the largest
   type in the band; reload and ability state never hidden.
5. **Decoration (H6).** Bottom corner brackets drop to `--z-decor` and clear
   the housings, or are removed.
6. **Safe frame (H7).** Housings start at `--hb-safe-hud` (32 px).
7. **Empty icons (H8).** Objective icon from the objective type, or no box.
8. **Text floor.** Critical HUD text ≥ 14 px on Deck (the 09-28 plan said
   11; the menu floor is 18 and 11 proved too small on hardware captures).
9. **R4 leftovers.** HUD scale presets (0.85 / 1 / 1.15 / 1.3), contrast on
   bright snow and dark cave, all seven locales, ≤ 0.3 ms/frame HUD cost.

**Exit:** Phase 0 matrix clean for all classes and HUD states; always-on HUD
≤ 7% of the Deck stage; a 20-minute Deck playtest per class with no missed
reload, prompt or low-O₂ warning.

## Phase 6 — CSS consolidation (inside each PR from Phase 4)

1. `src/styles/screens/<screen>.css` and `src/styles/hud/*.css` with
   `@layer base, components, screens, hud, overrides;` so later rules win by
   layer, not by `!important`.
2. A screen's rules move out of style.css when that screen is rebuilt; the
   duplicate definitions go with them.
3. Ratchet script (`npm run lint:css`, run in presubmit): the count of
   `!important`, selectors defined more than once, raw z-index values and
   window `@media` rules may only go down.

## Work order and lanes

| Step | Work | Depends on | Size |
| --- | --- | --- | --- |
| 1 | Phase 0 audit v2 + failing baseline | — | 1–2 days |
| 2 | Phase 1 fixed stage (`zoom`) | 1 | 2–3 days |
| 3 | Phase 2 decoration contract + z tokens | 1 | 1 day |
| 4 | Phase 3 frame-window JSON + menu fit | 2, 3 | 1–2 days |
| 5 | Phase 4 screens: Armory, Operator menu, Tactical Net, Terminal, Pause, Title, then hubs | 2–4 | 1 day each |
| 6 | Phase 5 HUD H1–H8, then R4 leftovers | 2–4 | 3–4 days |
| 7 | Phase 6 ratchet | 1 | ½ day, then ongoing |

Steps 5 and 6 can run in parallel lanes once 2–4 land: menus in one, HUD in
the other. Each PR bumps the patch version and attaches the audit report.

## Risks

- **`zoom` side effects.** Code that reads `getBoundingClientRect` to place
  world-space or canvas things may double-scale. Mitigation: grep every
  consumer in Phase 1 and cover pointer → raycast with a browser test.
- **Concurrent agents** edit style.css on this branch. Phase 6 moves rules
  screen by screen to keep merges small; check `git status` before each step.
- **Art fit.** If a frame's window is too small for readable content, the
  answer is new art or a plain frame, not smaller text.

## Open questions

1. OK to move the UI to a fixed 1280×800 layer scaled with `zoom` (Phase 1)?
   It touches every screen once, and it is the change that stops these bugs
   coming back.
2. Keep the painted metal bezel on the operator menu, or move to the cleaner
   panel frames the Armory and Tactical Net use?
3. Armory LIVE STAGE PREVIEW: keep it as a compact strip, or remove it since
   the right column already lists the same values?
4. HUD: should ship integrity move out of the vitals housing (to the map
   housing or the terminal only)?
5. Pause: a dedicated pause screen (recommended), or keep Settings as pause
   with RESUME first?

## Appendix — element traces

Element stacks at a point (`elementsFromPoint`, pointer events forced on),
1280×800, from the temp probe. Full-stage layers on every screen, top first:
`#cabinet-bezel` (z 9999), `#fatigue-strain-overlay` (z 9350), then
`.homebase-plate-overlay` (z 8002, menu) or `.terminal-scanline` (z 100,
Armory / Tactical Net).

| Where | Point | Topmost real element |
| --- | --- | --- |
| Menu, Scout kicker | 925,190 | `span.char-kicker` under `.homebase-plate-overlay` (frame art over the card) |
| Menu, Engineer best | 925,630 | `#char-best-ENGINEER` under `.homebase-plate-overlay` |
| Menu, left column | — | every telemetry label and `#hero-select-back-btn` under `div.module-scanline` |
| Armory line, top | 855,80 | `header.armory-header` (31,18 1219×90) |
| Armory line, side | 855,350 | `.armory-stage-column` (31,119 835×589) |
| HUD top-left | 25,25 | `.hud-visor-bracket--tl` over `.class-ability-panel__key` (18,20) |
| HUD top-left | 25,75 | `#melee-bar` / `#melee-cooldown-panel` (0,51 52×51) |
| HUD bottom corners | 15,770 · 1255,770 | `.hud-visor-bracket--bl` / `--br` (z 100 via `.hud-visor-frame`) |
| HUD top-right | 1130,30 · 1180,30 | `#objective-drawer` in `.hud-right-rail` (883,16 336×37, z 16900) over CHAT |
| HUD arms | 1030,740 | `.dock-housing--arms` (z 3) over `.weapon-status-panel__title` |
| HUD vitals | 450,770 · 690,765 | `.dock-housing--status` over `#vitals-o2-label`, `#vitals-o2-pct` |
| Terminal corner | CHAT, ⚙ | `.terminal-header`, `#terminal-class-badge` |
