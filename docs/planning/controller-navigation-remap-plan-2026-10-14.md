# Controller navigation remap — plan

Status: **Phases A–C done 2026-10-14** — capture + map ([controller navigation map](../design/controller-navigation-map.md)); bugs F1/F2 fixed; one spatial model for every screen (map doc §6, contract in [menu input contract](../menu-input-navigation-contract.md)). Phase C shipped as a fixed scorer + `navigateMenu()` + `data-nav-*` overrides rather than full declarative zones; zones remain available if a screen needs them. Phase D (budget gate) not started. | Owner: UI / input
Builds on: [UI surfaces, menu map and controller navigation](../design/ui-surfaces-menu-map-and-controller-navigation.md)
(the 2026-10-05 surface inventory), [menu input contract](../menu-input-navigation-contract.md),
[UI overhaul plan](ui-overhaul-plan-2026-10-05.md).

## 1. Why we keep missing the mark

The 10-05 work measured the wrong things. It proved that every control can be
reached *eventually* (`menu-reachability.spec.js`) and that boxes stay inside
the stage (`ui-surface-audit`). Neither test checks what a player feels: press
▶ and does focus go right? Can they see where it is? Does ▲ undo ▼? Does B put
them back where they were?

The code explains most of the feel problems. Focus movement is decided per
surface, through a chain of special cases in `moveControllerDirectional`
(`main.js:1388`):

| Model | Surfaces | What the D-pad does |
|---|---|---|
| **Linear (DOM order)** | **43 of 59**, incl. title (`splash`), select picker, Operator Polish (16-tile grid), loadout picker, game over, tactical map, chat, every confirm dialog, every camp / NPC / encounter dialog, terminal's O₂ detail, RGB | ▲ and ◀ both mean *previous in the HTML*, ▼ and ▶ both mean *next*. On a grid or a two-column layout, ▶ can go down and ▲ can jump across the screen. |
| Spatial (`spatialFocusIndex`) | 12: Archive, Codex, Foundry hub, Fab Bay, Dossier, Vault, Tactical Net, Armory picker, Workbench, Camp services, Terminal, Content Guide | Nearest control in that direction; wraps to the far edge when nothing is there. |
| Bespoke handler | Operator menu (`moveMenuDirectionalFocus` + hero panel + command grid), Settings (tab rules, then linear), Achievements (own grid), Armory (spatial + footer → EMBARK) | Each one hand-coded and behaves differently. |

Other causes found in the code. The capture's verdict on each is in
*italics*; the full findings (F1–F13) are in the map doc §2.

1. **The on-screen keyboard's grid handler is unreachable.**
   `moveVirtualKeyboardGridFocus` only runs from `moveMenuDirectionalFocus`,
   which only runs when the root is `menu`. Once the keyboard opens, its own
   root (`virtual-keyboard-overlay`) takes focus, so the keys fall back to
   linear order.
2. **Two input paths behave differently.** The Steam Input poll adjusts a
   focused slider or dropdown on ◀ / ▶ before it moves focus. The
   `gamepad-menu-nav` event path (`main.js:2514`) skips that step, so the same
   press can change a value on one path and move focus on the other. *Not
   measured yet.*
3. **No shared focus ring.** `style.css` has 83 separate `:focus-visible`
   rules. Focus set by the pad comes from `element.focus()` in script, and
   Chromium decides heuristically whether to draw `:focus-visible` for that.
   After any mouse click the ring can disappear for pad users. *Hypothesis:
   this is a big part of "I can't tell where I am".* *Mostly wrong: a pixel
   diff shows clear focus on almost every menu control. The weak spots are
   Achievements, the Controls remap list, Credits and the terminal skill tree.*
4. **Wrapping by geometry.** Spatial roots wrap to the opposite edge when
   nothing lies in that direction. On wide layouts ▶ off the last card can land
   in a different panel, far from the player's eye. *Confirmed (F13).*
5. **Locked or unaffordable cards can't be focused** (10-05 finding #10, plan
   P1.1, still open). Pad users skip the very cards that explain what is
   blocked. *Confirmed (F9).*
6. **Entry and restore are ad hoc.** `getPreferredControllerFocusTarget` has
   per-root special cases. Every other surface opens on its first DOM
   focusable, which is often ✕. *Confirmed, and worse than expected: confirm
   dialogs open on the destructive button (F2).*

## 2. The approach

1. **Capture first.** Screenshot every surface and tab, and record the D-pad
   map *as it behaves today*, from the real input path, not from reading code.
2. **Document** each screen's measured map next to its intended map, and flag
   the differences.
3. **Replace the 43 linear surfaces and the special cases with one model**:
   zones plus spatial movement, declared in markup.
4. **Make the capture a gate**, so navigation can't quietly regress again.

## 3. Phase A — capture (probe, read-only)

New probe `tests/e2e/probes/controller-nav-map.spec.js` (`HB_PROBES=1`, no-HMR
dev server, 1280×800). It reuses the surface walk from `ui-surface-audit.spec.js`
and the reachability spec's open/close helpers, and adds the in-run surfaces
from `controller-journey.spec.js`.

For every surface × tab, it records:

| Record | How |
|---|---|
| Clean screenshot | as today |
| **Annotated screenshot** | an injected SVG overlay before capture: numbered badge on every focusable, an arrow per D-pad edge, red arrows for flagged edges, a ring on the entry target |
| Focusables | id / label / rect / role / disabled or locked state |
| **Directional graph** | for each focusable × ▲▼◀▶: focus it, dispatch `gamepad-menu-nav` (the real handler), record where focus lands. Run once through the Steam-poll path too, to diff the two paths. |
| Entry target | focus right after the surface opens |
| B / back | which surface closes and where focus lands afterwards |
| LB / RB | tab order and whether focus follows the tab |
| Focus visible | compare the computed outline / box-shadow / border on the focused vs unfocused state, after a mouse click and after a pad press |

Flags computed from the graph:

- **Wrong direction**: the target's centre is outside a 45° cone of the
  pressed direction.
- **Non-reciprocal**: ▼ then ▲ does not return to the start, unless the start
  is the edge of a zone.
- **Long jump**: the move crosses more than half the stage, or goes to another
  panel.
- **Dead end**: the press does nothing while a control lies in that
  direction.
- **Unreachable by direction**: reached only through wrap or linear fallback.
- **Off-screen focus**: the focused control is clipped or outside its
  scroller.
- **Invisible focus**: no visual difference when the control is focused.
- **Presses to primary**: shortest path from the entry target to the screen's
  primary action (DEPLOY, EMBARK, CONFIRM...).

Output goes to `docs/reports/controller-nav-map/`: PNGs (clean and annotated),
`nav-map.json`, and a generated `summary.md` that ranks surfaces by flag count.

**Acceptance:** every registered surface that can be reached from a seeded
save is captured, or listed with the reason it was skipped. The surfaces on
the main path (title → operator → Armory → Tactical Net → pause / settings →
terminal) are captured in both a fresh and a played save.

## 4. Phase B — document

New `docs/design/controller-navigation-map.md` replaces §2–§4 of the 10-05
doc, which then links to it. One section per surface:

- the annotated screenshot
- **zones** (header / tabs, content, detail, footer actions, corner), the
  entry target, and the primary action
- the **intended** map in one small table ("from zone X: ▼ → Y, ◀ / ▶ within
  the zone, B → opener")
- the measured deltas from Phase A, each one a numbered issue

A top-level flow diagram shows how surfaces open each other, with the button
that opens each one and the button that closes it.

The user reviews this doc before Phase C. It is the spec that Phase C
implements.

## 5. Phase C — one navigation model

The model follows console focus engines (Xbox, PlayStation, Android TV): the
screen is split into zones, and movement is spatial inside each zone. Movement
between zones follows explicit edges, not geometry.

1. **Declarative zones.** Markup carries `data-nav-zone="tabs|content|footer|corner|…"`
   and optional `data-nav-exit-down="footer"` style edges, plus
   `data-nav-entry` and `data-nav-primary`. One resolver in a new leaf module
   `src/controllerNav.js` (pure functions, unit-tested) does the following:
   - Spatial movement inside a zone (the existing `spatialFocusIndex`, cone-limited).
   - At a zone's edge, follow the declared exit. With no exit, **stop** with a
     soft bump sound. No wrap across the screen. Lists may opt into wrapping
     with `data-nav-wrap`.
   - Remember the last focus per zone, so ▲ from the footer returns to the
     card you came from. This generalises the Armory and hero-panel special
     cases.
2. **Spatial is the default for every root.** Linear stays only as the
   fallback for a surface with no geometry. The bespoke handlers (menu, hero
   panel, Settings, achievements, Armory advance, virtual keyboard) are
   rewritten as zone declarations, one surface per commit, each with its
   existing e2e test kept green.
3. **Fix the spatial scorer** (`spatialFocusIndex`, map doc F12). A candidate
   must lie beyond the current box's edge in the pressed direction, not merely
   0.5 px past its centre. Candidates that overlap the current box on the other
   axis (the "beam", as browsers' spatial navigation does) win over diagonal
   ones. Only then compare distance. This change alone fixes most non-reciprocal
   moves on the 12 spatial screens. Unit tests go in `src/inputActions.test.js`.
4. **One input path.** Steam poll and `gamepad-menu-nav` call the same
   `navigate(direction)` function, including ◀ / ▶ value adjustment on
   sliders and dropdowns.
5. **One focus ring.** A `--hb-focus-ring` token, and
   `body.input-controller :focus` draws it unconditionally (no reliance on
   `:focus-visible` heuristics). The 83 local rules then only add colour
   variants.
6. **Entry and restore rules.** A surface opens on `data-nav-entry`, else on
   its last focus, else on its primary action, never on ✕. B always closes
   exactly one layer and restores the opener (already true for most surfaces;
   becomes a rule the probe checks).
7. **Locked items are focusable.** They show the reason in the hint bar
   (closes 10-05 P1.1).
8. **Button grammar and hint bar.** A confirm, B back, LB / RB tabs, X / Y
   contextual. Every surface shows the same footer legend with glyphs from
   `src/inputGlyphs.js`. The right stick scrolls long text.

All of this lives in `src/controllerNav.js` plus markup attributes. Changes to
`main.js` shrink to calls into the module, which keeps edits to the shared
file small (see the concurrent-agent rule).

## 6. Phase D — guardrails

- The nav-map probe becomes `tests/e2e/controller-nav-contract.spec.js` with
  budgets on the main path: zero wrong-direction edges, zero dead ends, zero
  invisible focus, reciprocity ≥ 95%, presses-to-primary ≤ the number recorded
  in the doc.
- A unit contract: every root in `MENU_FOCUS_ROOT_IDS` declares at least one
  zone and an entry target.
- `controller-journey.spec.js`, `menu-reachability.spec.js`,
  `controller-focus.spec.js` and `steam-input-action-set.spec.js` stay green
  throughout.
- Deck hardware pass by the owner at the end of each rollout batch. The
  browser can't prove Steam Input; see the action-set trap.

## 7. Rollout order (player path first)

1. Title → Operator menu → Armory → Tactical Net (first impression; Steam review theme)
2. Pause / Settings and every Settings popup, select picker, on-screen keyboard
3. Ship terminal (tabs, goal cards, skill tree) and the in-run dialogs (camp, NPC, encounter, game over)
4. Foundry hub, Archive, Codex, Dossier, Operator Polish, loadout picker
5. Debug / QA surfaces last (`qa-nexus`, `dev-console`, `hb-debug-console`)

Each batch: capture, fix, re-capture, update the map doc, bump the patch
version, then a Deck check.

## 8. Decisions (settled 2026-10-14: "most obvious human-friendly choices")

Edges stop (lists may opt into `data-nav-wrap`); debug screens in scope; hint bar deferred.

Original questions:

Fix first, before Phase C (no design decision needed): **F1** (Start no longer
pauses during play, a regression since 10-01) and **F2** (confirm dialogs open on
QUIT / RESET SAVE, and a stray A can activate them).


1. **Edge behaviour:** stop at the edge with a bump (console convention,
   recommended), or keep wrap-around?
2. **Scope:** include the debug / QA surfaces in the contract, or exempt them?
3. **Hint bar:** add a footer button legend on every surface (recommended), or
   only where X / Y do something?
