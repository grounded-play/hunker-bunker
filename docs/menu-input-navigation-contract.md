# Menu Input and Reachability Contract

Status: implemented on Sprint 31; navigation model rewritten 2026-10-14
(`dev/sprint-52`, [controller navigation map](design/controller-navigation-map.md)).

## Product requirement

Hunker Bunker must be fully operable through every menu without a mouse. This
includes the title screen, operator briefing, settings and nested settings,
pre-deployment screens, gameplay modals, reward/reveal surfaces, archive
experiences, developer menus, and dynamically created dialogue or QA overlays.
Steam Deck right-stick pointer control remains supported, but it is an optional
second path and must never be the only way to reach or activate a control.

## Required input behavior

| Intent | Keyboard | Steam Deck / controller |
| --- | --- | --- |
| Move focus | WASD or arrow keys | D-pad or left stick (hold to repeat) |
| Activate | Enter or Space | A or RT / Confirm |
| Back or close | Escape | B / Back |
| Change a slider, or a dropdown in a settings row | A/D or Left/Right while focused | Left / right while focused; A opens a dropdown's full list |
| Change tabs | Q / E | LB / RB |
| Pause | Escape in play | Start / ☰ |
| Pointer fallback | Mouse | Right stick or trackpad virtual pointer + A |
| Enter text | Activate the focused field | Steam keyboard, with in-game keyboard fallback |

### How focus moves (one model, every screen)

Every menu, for every device, goes through `navigateMenu()` in `main.js`.
Arrow keys, WASD, the browser gamepad, native Steam Input and the
`gamepad-menu-nav` event all take that path.

1. **Spatial.** A press moves to the nearest control in that direction
   (`spatialFocusIndex` in `src/inputActions.js`). A control in the same row
   (◀ ▶) or column (▲ ▼) always beats a diagonal one. A diagonal control must lie
   fully past the current one, and sideways drift is weighted heavily (30× on
   ◀ ▶), as in the CSS spatial-navigation spec.
2. **Stop at the edge.** With nothing in that direction, focus stays put. It
   never wraps across the screen. A long list can opt into wrapping with
   `data-nav-wrap` on its container.
3. **Semantic rules first**, in this order:
   - the on-screen keyboard grid
   - ◀ ▶ adjusting sliders, and dropdowns inside `.setting-item` / `.armory-row` /
     `[data-nav-adjust]` (a toolbar dropdown is an ordinary stop)
   - Settings tabs (◀ ▶ select, ▼ enters the panel)
   - ◀ ▶ on a `role="tab"`
   - ▲ ▼ scrolling a focus-less text region
   - the Armory's ▼ → CONTINUE edge
   - an explicit `data-nav-up/down/left/right="<selector>"` override
4. **Tab bars:** moving into a tab bar from outside lands on the selected tab.
5. **Nested controls** (an entry with a PLAY button inside it): ▶ steps in, ◀
   at the inner edge steps back out. A control never moves to its own
   container or child.
6. **Holding a direction** on a pad repeats after 380 ms, every 110 ms. The
   keyboard uses the OS key repeat.
7. The **left stick** is the D-pad in menus. It does not drive the virtual
   cursor; that is the right stick or trackpad.

### Where focus starts and returns

- **Opening a screen** focuses its entry target:
  - a confirm dialog: its **cancel** button (`#quit-cancel-btn`,
    `#reset-save-cancel`, `#confirm-no`, `[data-confirm-cancel]`)
  - paused Settings: **RESUME** on the Session tab
  - Tactical Net: **DEPLOY**
  - otherwise: the first real content control. Not ✕, not a corner CHAT /
    settings shortcut, not the tab bar, not an external link.
  - Screens with their own rule in `getPreferredControllerFocusTarget` keep it.
- **A screen opened fresh** starts at its entry target. Remembered focus is
  only used when returning from a sub-screen.
- **B** closes exactly one layer and returns focus to the control that opened
  it. The opener is remembered as focus moves, via `focusin`.
- **An A press that only brings focus back onto a dialog doesn't click.**
  This guards against a stray A on RESET SAVE / CONFIRM QUIT.
- **Locked items** (Suit Polish finishes, uncatalogued Codex entries,
  undiscovered lore logs) are focusable and say how to unlock them. They do
  nothing on A. A locked `aria-disabled` control opts in with
  `data-controller-focusable`.

Hidden, disabled, inert, and `aria-hidden` controls are excluded from the
focus route. A modal traps Tab and directional navigation inside its own
surface. Any "is this surface open?" check over `MENU_FOCUS_ROOT_IDS` must use
`isFocusRootOpen()`, never the `hidden` class alone. `#hb-debug-console` is
always mounted, and a class-only check made Start send Escape to it instead of
pausing.
Touch input hides the tactical mouse icon immediately and suppresses Chromium's
post-tap compatibility mouse events; a later real mouse move restores it.

## Surface registry

`MENU_FOCUS_ROOT_IDS` in `src/inputActions.js` is the canonical ordered list of
menu surfaces. Transient child overlays must appear before their parent modal so
the topmost visible interaction owns focus. New menus or generated overlays must
be added to that registry in the same change that introduces them.

Every interactive UI action should use a native `button`, `input`, `select`,
`textarea`, or link. A non-native action must declare an appropriate role and
`tabindex="0"`. Every dismissible modal must expose an explicit close, cancel,
or back control; controller Back and keyboard Escape route to that control when
the surface has no specialized handler.

## Regression acceptance

The automated contract has three layers:

1. `src/inputActions.test.js` verifies the canonical registry, ordering of child
   reveals, key mappings, wrapping, Steam action routing, and edge triggering.
2. `tests/e2e/menu-reachability.spec.js` boots the real DOM at Steam Deck size,
   inventories every rendered registered menu surface, explores its directional
   focus graph, fails if any enabled control is unreachable, and verifies Enter
   activation. It also executes a real mixed WASD/arrow title flow plus Steam
   Confirm and Back.
3. Existing focused E2E suites continue to cover spatial operator selection,
   polish grids, settings focus traps, controller value changes, text entry,
   nested controls, gameplay input, browser-gamepad fallback, Armory, Vault,
   RGB, and deployment flows.

Release acceptance is: unit tests pass, the menu-reachability and existing
controller-focus browser suites pass at 1280×800, the production build succeeds,
and the browser has no framework overlay or console errors during the verified
flow.
