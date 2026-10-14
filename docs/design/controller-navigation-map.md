# Controller navigation map

Status: **measured 2026-10-14, fixes landed the same day (§6)** (`dev/sprint-52`, v2.4.16-beta, fresh save, 1280×800) | Owner: UI / input
Plan: [controller navigation remap plan](../planning/controller-navigation-remap-plan-2026-10-14.md) (this doc is its Phase A + B).
Raw data: [`docs/reports/controller-nav-map/`](../reports/controller-nav-map/) — `summary.md` (ranked table and every open / back / tab transition), `nav-map.json` (full graphs), and two PNGs per screen.
Supersedes the movement parts of [UI surfaces, menu map and controller navigation](ui-surfaces-menu-map-and-controller-navigation.md) §2–§4. That doc's surface inventory and layout audit still stand.

This doc records how the D-pad, A, B and the bumpers *actually* behave on every
menu a pad player can reach today, screen by screen. It ends with the intended
map each screen should follow. Earlier audits proved that every control is
reachable *eventually*. This one measures whether each press goes where the
player is looking.

## 1. How it was measured

`tests/e2e/probes/controller-nav-map.spec.js` walks the game the way a pad player
does: focus the opener, press **A** on a browser gamepad, read the surface,
press **B**. On every surface and tab it focuses each control in turn, fires
the real `gamepad-menu-nav` event for ▲ ▼ ◀ ▶, and records where focus lands.
That gives a directed graph per screen, scored by `tests/e2e/probes/navMapAnalysis.js`:

| Flag | Meaning |
|---|---|
| **off-axis** | moved 45–110° away from the pressed direction (▶ stepping *down* a list) |
| **backwards** | moved the opposite way |
| **wrap** | jumped to the far edge of the screen |
| **jump** | moved more than half the stage |
| **dead** | press did nothing while something lay that way |
| **non-recip** | the opposite press does not come back (▼ then ▲ lands somewhere new) |
| **unreach** | controls the entry target cannot reach by D-pad at all |
| **weak focus** | less than 4% of the control's box visibly changes when focused (pixel diff of a focused vs unfocused crop) |

Each screen has `NN-name.png` (entry target focused, as a player first sees it)
and `NN-name--map.png`. The map image shows a numbered badge on every control,
a green box on the entry target, a dashed orange box where focus is weak, and
red arrows labelled `12▼` for every flagged move.

Re-run (about 25 minutes), on a no-HMR dev server:

```bash
# scratch config re-exporting vite.config.js with hmr:false and a watch.ignored
# list (art|public|scratch|docs|tests|dist|...), see the dev-server memory recipe
npx vite --config <scratch>/vite.navmap.config.mjs --port 5211 --strictPort &
# scratch playwright config = playwright.config.js with baseURL :5211, no webServer
HB_PROBES=1 npx playwright test --config <scratch>/pw.navmap.config.mjs tests/e2e/probes/controller-nav-map.spec.js
node tests/e2e/probes/navMapAnalysis.js   # re-score / rewrite summary.md without a browser
```

**Probe limits:**
- The browser gamepad only. The Deck's native Steam Input path shares the
  focus code, but its press timing and action sets need a Deck check.
- A fresh save, so locked content stays locked.
- Spatial-screen tabs are measured as they are, except that a capture
  dated 2026-10-14 treated every `role="tab"` as select-on-focus (only
  Settings is). Edges *from an unselected* Foundry, Archive or Dossier tab in
  that capture are measured with the tab selected, and the "unreach" column for
  those screens is not reliable. Fixed in the probe; the next run is exact.
- Moves come from the event path. A and B go through the polled pad, held
  until the screen reacts. At under 5 fps a short tap can be missed, and an
  earlier version of the probe read that as "B does not close".

## 2. Headline findings

Ranked by how badly they hurt a pad player. Each one was reproduced outside the
probe before it went into this table.

| # | Sev | Finding | Evidence |
|---|---|---|---|
| F1 | **P0** | **Start does not open pause during play** (browser pad). Keyboard Esc does; D-pad ▲ (map) and B (close map) work on the same pad, held up to 700 ms. **Regression:** the 10-01 journey probe "In run: pause, settings, abort, results" now fails at the same step. | `controller-journey.spec.js:316` fails at line 323; nav map: Start → no surface |
| F2 | **P0** | **Confirm dialogs open on the destructive button.** CONFIRM QUIT (title and Settings) and RESET SAVE take focus, so A-mashing quits or wipes the save. If focus drifts outside a dialog, the next A refocuses the dialog's preferred (first) button and activates it in the same press. An early version of this probe wiped its own test save that way. | transitions `quit-confirm`, `settings--reset-save`; `getPreferredControllerFocusTarget` falls back to `focusables[0]` |
| F3 | P1 | **43 of 59 surfaces move in HTML order.** ◀ ▶ step up and down lists, ▼ at the bottom wraps to the top, and two-column layouts zig-zag. Biggest: Commentary list (88 off-axis moves, 22 presses to reach the end), Controls remap (48), title (14 of 28 moves), every confirm dialog and popup. | summary.md off-axis column |
| F4 | P1 | **Operator menu is a maze.** 38 of 80 moves don't come back with the opposite press. ▼ from *every* left-column hub button jumps to ENTER ARMORY in the far corner. ◀ on the left column does nothing (9 dead ends). **← RETURN TO MAIN MENU can't be reached by D-pad at all** (B still works). | `22-operator-menu--map.png` |
| F5 | P1 | **Tactical Net opens with focus on CHAT** (top-right corner), not on the mode cards or DEPLOY. ▲ from any mode card goes to the header ✕. ▲ from DEPLOY goes to BACK. | `40-tactical-net*.png` |
| F6 | P1 | **Armory ignores LB / RB.** Every other tabbed surface cycles tabs on the bumpers; the Armory only switches class on keyboard Q / E. 31 of 80 moves don't come back. The corner CHAT / ⚙ wrap ▲ to the footer. EMPTY BAY B isn't reachable from the entry target. | transition `armory RB: no change`; `38-armory--map.png` |
| F7 | P1 | **Entry focus lands on ✕ or on a tab instead of the content.** The audio mixer, Commentary list, Controls remap, Content Guide, Codex, Credits and tactical map all open on ✕, so A closes them. Foundry, Archive and the terminal open on their tab bar. | `entry` column |
| F8 | P1 | **B doesn't return focus to the opener** in 10 places: Commentary → audio mixer OPEN, Content Guide → language OPEN, Controls → a "50%" button, Save data / Reset → callsign field, Settings quit → night vision, title quit → NEW RUN, Settings (from title) → NEW RUN, Operator Polish / Codex → class card. | transitions marked **not the opener** |
| F9 | P1 | **Locked content isn't focusable** (10-05 plan P1.1, still open). Operator Polish: 2 of 16 finishes reachable. Codex: only ✕ on a fresh save. Foundry TRADE-UP: 23 locked controls. A pad player can't even read why something is locked. | `Locked` column |
| F10 | P2 | **Text fields:** A on the callsign field opens nothing in the browser build. On the Deck it should open the Steam keyboard; needs a Deck check. The in-game keyboard's grid handler only runs when the root is `menu` (code read), so on its own root it moves in HTML order. | transition `settings--operator-callsign` |
| F11 | P2 | **Weak focus highlight** on Achievements (6 of 22 cards), the Controls remap list (4 of 25), Credits (2 of 4) and the terminal skill tree. Elsewhere focus is clearly visible, so the plan's hypothesis that the ring disappears broadly was **wrong**. In-run surfaces (terminal, map) don't match `:focus-visible` after mouse input; their rings rely on `.controller-mode` rules. | weak-focus column, `focusVisible` in JSON |
| F12 | P1 | **The spatial scorer picks diagonals over neighbours** on the 12 spatial screens. `spatialFocusIndex` counts anything more than 0.5 px lower as "below", so ▼ from the STASH tab picks the LOADOUT tab beside it. Distance in the pressed direction outweighs alignment, so ▶ from the Foundry search box picks the 🔒 FABRICATE tab up-right over the filter beside it, and ▼ from any filter goes to ✕. Hence the high non-reciprocal counts: Archive Achievements 54 of 120, Dossier 25 of 52, Foundry 20 of 40. | `24-foundry-hub-from-vault--map.png`; `src/inputActions.js` `spatialFocusIndex` |
| F13 | P2 | **Wrap is inconsistent.** Lists wrap ▼ at the bottom to the top, spatial screens wrap across panels, the Settings tab bar wraps both ways, and the Armory doesn't wrap at all. | wrap column |

**What already works and must be kept:** NEW RUN is the entry on the title; the
Armory opens on CONTINUE TO DEPLOYMENT; the select picker opens on the current
value and B returns to the dropdown; the Armory tile picker opens on the
equipped tile and B returns to the slot; Foundry, Archive, Dossier and Settings
cycle tabs on RB and wrap at the end; A and B open and close every
Settings popup; B from the hub screens returns to their hub button.

## 3. Flow map (pad)

`A ▸` opens a surface from the focused control, `B ◂` is where focus lands on
the way back (✓ = the opener, ✗ = somewhere else). `entry` is where focus
starts.

```
TITLE (#splash)                       entry NEW RUN ✓
├─ A ▸ SETTINGS (#settings-popup)     entry Night Vision toggle (Session tab)     B ◂ NEW RUN ✗
│    LB/RB: Session · Audio · Controls · Camera & HUD · Graphics · Accessibility · Profile & Saves (wraps)
│    ├─ A ▸ Audio mixer               entry ✕ ✗          B ◂ OPEN ✓
│    ├─ A ▸ Commentary list (45)      entry ✕ ✗          B ◂ audio mixer OPEN ✗
│    ├─ A ▸ Language                  entry English ✓    B ◂ OPEN ✓
│    ├─ A ▸ Crosshair colour          entry Orange ✓     B ◂ OPEN ✓
│    ├─ A ▸ Content Guide             entry ✕ ✗          B ◂ language OPEN ✗
│    ├─ A ▸ Controls remap (25)       entry ✕ ✗          B ◂ "50%" ✗
│    ├─ A ▸ Save data                 entry code field   B ◂ callsign ✗
│    ├─ A ▸ Reset save confirm        entry RESET SAVE ✗✗ B ◂ callsign ✗
│    ├─ A ▸ Quit confirm              entry CONFIRM QUIT ✗✗ B ◂ night vision ✗
│    ├─ A ▸ dropdown → select picker  entry current value ✓ B ◂ dropdown ✓
│    └─ A on callsign field           nothing (browser) — Steam keyboard on Deck?
├─ A ▸ ACHIEVEMENTS                   entry first card ✓  B ◂ ACHIEVEMENTS ✓
├─ A ▸ ABOUT (credits)                entry ✕ ✗           B ◂ ABOUT ✓
├─ A ▸ QUIT confirm                   entry CONFIRM QUIT ✗✗ B ◂ NEW RUN ✗
└─ A on NEW RUN ▸ OPERATOR MENU (#menu)  entry selected class card ✓
     ├─ A ▸ SUIT POLISH (2 of 16 focusable)  entry current finish ✓  B ◂ class card ✗
     ├─ A ▸ STEAM VAULT → Foundry hub @ STASH   entry STASH tab   B ◂ STEAM VAULT ✓
     │      RB: STASH · LOADOUT · 🔒FABRICATE · 🔒TRADE-UP (wraps)
     ├─ A ▸ FAB BAY → Foundry hub @ FABRICATE   entry tab         B ◂ FAB BAY ✓
     ├─ A ▸ ARCHIVE   entry LORE LOGS tab   RB: Lore · Dossier · Endings · Achievements · Records   B ◂ ARCHIVE ✓
     ├─ A ▸ CODEX     entry ✕ (only control on a fresh save)                               B ◂ class card ✗
     ├─ A ▸ DOSSIER   entry current rank's TRACK ✓   RB: Dossier · Directives · Workshop       B ◂ DOSSIER ✓
     ├─ (ACHIEVEMENTS, ARCHIVE SIMS, CHAT hidden on a fresh web save — not captured)
     └─ A on ENTER ARMORY ▸ ARMORY (#armory-screen)   entry CONTINUE TO DEPLOYMENT ✓
          ├─ LB/RB: nothing (Q/E only) ✗
          ├─ A on a slot ▸ tile picker   entry equipped tile ✓   B ◂ slot ✓
          └─ A on CONTINUE ▸ TACTICAL NET (#multiplayer-modal)   entry CHAT ✗
               └─ DEPLOY ▸ run
IN RUN
├─ console ▸ SHIP TERMINAL   entry BASE SYSTEM tab (buy buttons disabled on a fresh run)
│     RB: Base · Class Skills · Objective / Night Log      B ◂ gameplay ✓
├─ D-pad ▲ ▸ TACTICAL MAP    entry ✕ ✗                     B ◂ gameplay ✓
└─ Start ▸ pause … NOTHING (F1) — abort / game over not reachable by pad in this run
```

## 4. Screens

Each subsection lists the measured problems and then the **intended map**. That
map is the spec for Phase C (`src/controllerNav.js` zones), written as zones in
reading order, the moves inside them, and the edges between them.

### 4.1 Title (`01-title`)
7 controls: a vertical list of six plus the Steam / web-agent badge top-right.
- ◀ ▶ step the list (14 of 28 moves off-axis). ▲ from NEW RUN goes to the corner badge; ▼ from QUIT wraps to it.
- **Intended:** zone `list` (vertical; ◀ ▶ do nothing) with the badge as its own `corner` zone, reached only by ▶ from the list. No wrap.

### 4.2 Settings (`02`–`08`, `18`)
Tab bar plus a two-column panel per tab.
- Opens on the Night Vision toggle, below the tab bar and in the left column, rather than on the first row.
- ▼ from the SESSION tab lands on RESUME in the right column. The panel walks in HTML order, so ◀ ▶ zig-zag between rows (Accessibility: 34 off-axis, 14 wraps).
- Clear focus on every control.
- **Intended:** zones `tabs` (◀ ▶ select, LB / RB anywhere) → `panel` (spatial two-column grid; ◀ ▶ adjust sliders and dropdowns *only* when focused on one) → `corner` (✕). ▼ from tabs goes to the first row of the left column. Entry is the panel's first row. Remember the last row per tab.

### 4.3 Settings popups (`09`–`17`)
All linear.
- The audio mixer, Commentary list (45 rows, 22 presses deep), Controls remap (25) and Content Guide open on ✕.
- **Intended:** entry on the first row / current value. A list is one vertical zone, and long lists page with LB / RB or the triggers. ✕ is a `corner` zone; B is the way out.

### 4.4 Confirm dialogs — quit, reset save, abort (`15`–`17`, `21`)
- Focus starts on the destructive button (F2).
- **Intended:** entry on **CANCEL**. The destructive button needs an explicit move: a ◀ / ▶ pair, no wrap. Optionally a hold-A for RESET SAVE. B cancels. A press made while focus is outside the top surface must never activate anything; it only re-homes focus.

### 4.5 Achievements (`19`)
25 cards in a bespoke grid.
- Entry is the first card (good).
- 16 wraps at the row ends. 5 dead ends.
- Weak focus on 6 locked cards.
- **Intended:** spatial grid, no wrap at the edges, a stronger ring on locked cards.

### 4.6 Operator menu (`22`)
20 controls in three columns, with ENTER ARMORY bottom-right and ⚙ top-right.
- See F4. ▼ from any hub button → ENTER ARMORY. ◀ on the left column is dead. RECORDS ▶ → SUIT POLISH. The loadout chips are linear. RETURN TO MAIN MENU is unreachable.
- **Intended:**
  - `hub` (left column, 2×3 grid plus RECORDS above, RETURN below)
  - `operator` (callsign, randomize, loadout chips, SUIT POLISH; centre)
  - `classes` (3 cards, vertical; right)
  - `advance` (ENTER ARMORY)
  - `corner` (⚙)
  - Edges: hub ▶ operator ▶ classes. Classes ▼ advance. Advance ▲ to the last class. Corner only from classes ▲.
  - Entry: the selected class card. LB / RB cycle classes from anywhere.

### 4.7 Operator Polish (`23`)
Only 2 of 16 finishes can be focused on a fresh save (15 locked). See F9.
- **Intended:** all 16 focusable in a spatial grid. Locked tiles say how to unlock them.

### 4.8 Foundry hub (`24`–`28`)
Opens on its tab.
- STASH: ▼ from the STASH tab goes sideways to LOADOUT. ▼ from every filter goes to ✕. ◀ ▶ from the search box climb to the tab bar. 20 of 40 moves don't come back (F12).
- **Intended:** `tabs` → `filters` (row) → `grid` (spatial) → `detail`. ✕ is a corner reached only from the tabs' ▶ end. Entry: the first grid item, or the filters when the grid is empty.

### 4.9 Archive, Codex, Dossier (`29`–`37`)
Archive opens on LORE LOGS (the tab).
- Achievements tab: 54 of 120 moves don't come back. Records: 13 of 32. Lore Logs: 9 of 28 (F12).
- Codex on a fresh save has nothing but ✕ (the locked entries can't be focused).
- Dossier opens on the current rank's TRACK (good), but 25 of 52 moves don't come back.
- **Intended:** tabs → content grid → detail, as the Foundry. Locked codex and lore entries are focusable and show their unlock hint.

### 4.10 Armory (`38`, `39`)
Opens on CONTINUE TO DEPLOYMENT (good); B from the tile picker returns to the slot (good). See F6.
- **Intended:**
  - `classes` (tab row; LB / RB)
  - `preview` (HUD theme)
  - `bench` (2-column slot grid, spatial)
  - `rig` (2-column slot grid)
  - `footer` (BACK · VAULT · CONTINUE)
  - `corner` (CHAT · ⚙)
  - Edges: bench ▼ rig ▼ footer. Footer ▲ goes to the last slot used (keep `moveArmoryAdvanceFocus`). Corner only from the class row's ▶ end.

### 4.11 Tactical Net (`40`)
See F5.
- **Intended:** entry **DEPLOY** (or SOLO on first open). `modes` (4 cards, a row) ▼ `info` (RECORDS) ▼ `footer` (BACK · DEPLOY). Corner (CHAT · ⚙ · ✕) is reached only by ▲ from the modes' right end.

### 4.12 Ship terminal (`41`–`43`)
- On a fresh run Base System has only the tabs and ✕ focusable; every buy button is disabled (known, 10-05 §5). Entry is the BASE SYSTEM tab.
- Class Skills: 24 nodes, 53 non-reciprocal moves, weak focus on 2. The tree's own `handleSkillTreeNavKey` handles arrow *keys* only; pad moves go through the generic spatial path.
- **Intended:** goal cards focusable even when unaffordable (with the reason). The skill tree routes pad moves through its graph walker. Entry is the current objective's card.

### 4.13 Tactical map (`44`)
- Opens on ✕. The zoom / centre buttons are a linear list.
- **Intended:** entry on the objective drawer. The stick pans and the triggers zoom (already true). The buttons form one vertical zone.

## 5. Not captured, and why

| Surface | Why | Next step |
|---|---|---|
| Pause (Settings in run), abort confirm, game over | F1: Start doesn't open pause | fix F1, re-run |
| Operator-menu CHAT, ACHIEVEMENTS, ARCHIVE SIMS buttons | hidden on a fresh web save | seeded played save (plan Phase A acceptance) |
| Codex detail, lore log detail | no unlocked entries on a fresh save | seeded save |
| On-screen keyboard | A on a text field opens nothing in the browser | Deck check; or open it via its API in the probe |
| Camp, NPC, Mothership, encounter, elevator, expedition-event, lore, workbench, turret, O₂ detail, trade dialogs | need specific run states | drive with debug commands in a second probe pass |
| Vault reveal, rewards, RGB archive, debug / QA | event-driven or developer-only | plan §7 batch 5 |

## 6. Fixes (2026-10-14, second pass)

The owner asked for "the most obvious human-friendly choices", which settled
the plan's three open decisions:
- edges stop (lists may opt into wrapping)
- debug screens are in scope
- the button-legend bar is deferred

The rules now live in the [menu input contract](../menu-input-navigation-contract.md).

| # | Status | What changed |
|---|---|---|
| F1 | **Fixed** | `triggerControllerPauseAction` uses `isFocusRootOpen`. Start pauses mid-run and opens Settings on the Session tab with RESUME focused; the journey probe's in-run test drives pause → ABORT by explicit presses. |
| F2 | **Fixed** | Confirm dialogs open on CANCEL. An A press that only re-homes focus onto a dialog doesn't click (poll path and `activateControllerFocusedElement`). |
| F3 | **Fixed** | Every surface is spatial through one `navigateMenu()`. The linear DOM-order fallback and the bespoke operator-menu, hero-panel, polish-grid and achievements handlers are deleted. Arrows, WASD, browser pad, Steam Input and `gamepad-menu-nav` share the path. |
| F4 | **Fixed** | Operator menu: ▼ walks the class stack to ENTER ARMORY, the command grid is a 2-column grid, and ▼ from DOSSIER reaches RETURN TO MAIN MENU. `controller-focus.spec.js` pins it. |
| F5 | **Fixed** | Tactical Net opens on DEPLOY. |
| F6 | **Fixed** (verified) | RB / LB change the Armory class (the generic tab handler clicks `.class-tab`). |
| F7 | **Fixed** | Generic entry = first real content control (Commentary opens on its first entry; the audio mixer on its first slider; the tactical map on its first button). Credits keeps ✕, because its only other control is an external link. |
| F8 | **Fixed** | Openers are tracked through `focusin`; B restores the opener even when closing code parked focus elsewhere; a screen opened fresh starts at its entry, not stale memory. |
| F9 | **Mostly fixed** | Suit Polish (all 16 finishes), Codex (uncatalogued cards) and lore logs (undiscovered) are focusable and show how to unlock. The Foundry's locked TRADE-UP / FABRICATE controls are still disabled buttons. |
| F10 | Partly | The on-screen keyboard grid runs on any root and lets ▲ ▼ leave the grid (its ✕ was unreachable). Opening it in the browser build is unchanged; needs a Deck check. |
| F11 | Open | Weak focus on Achievements / Controls remap / Credits / skill tree. |
| F12 | **Fixed** | `spatialFocusIndex` rewritten: beam first, fully-past diagonals only, CSS-spatnav scoring, stop at edges (unit tests in `src/inputActions.test.js`). Dropdowns in toolbars no longer trap ◀ ▶ (the Vault search box and debug selectors were unreachable). Nested controls step in / out. |
| F13 | **Fixed** | No wrap anywhere by default. |
| — | **New** | The left stick no longer also drives the virtual cursor in menus (one push used to move focus twice). Holding a direction repeats (380 ms delay, then every 110 ms). |

**Still open:**
- F11 (weak focus) and F10 (keyboard in the browser build).
- Foundry locked tabs.
- A nav-map run once registered the tactical map as the focus owner on the
  game-over screen. It didn't reproduce by hand; watch for it.
- The Armory slot-picker e2e test (`controller-focus.spec.js` "re-renders the
  bench") fails on the pre-change commit too: no unlocked chassis tile on a
  fresh save. It's unrelated.
- Nothing here is verified on a Deck yet.

## 7. Keeping this current

Re-run the probe after any change to a menu surface. Then update §2 and the
affected §4 entry, and commit `docs/reports/controller-nav-map/` with it. The
plan's Phase D turns the summary columns into budgets for the main path:
zero wrong-direction, wrap or dead moves, zero escapes, zero weak focus, and
reciprocity of at least 95%.
