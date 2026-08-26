# Menu Input and Reachability Contract

Status: implemented and regression-tested on Sprint 31 (`dev/sprint-31`).

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
| Move focus | WASD or arrow keys | D-pad or left stick menu actions |
| Activate | Enter or Space | A / Confirm |
| Back or close | Escape | B / Back |
| Change a slider/select | A/D or Left/Right while focused | Left/Right |
| Change tabs | Focus tabs normally; Q/E where surfaced | LB/RB tab actions |
| Pointer fallback | Mouse | Right stick virtual pointer + A |
| Enter text | Activate the focused field | Steam keyboard, with in-game keyboard fallback |

Focus wraps instead of becoming lost. Opening a surface assigns a deterministic
initial target. Closing it restores the invoking control when that control still
exists. Hidden, disabled, inert, and `aria-hidden` controls are excluded from the
focus route. A modal traps Tab and directional navigation inside its own surface.

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
