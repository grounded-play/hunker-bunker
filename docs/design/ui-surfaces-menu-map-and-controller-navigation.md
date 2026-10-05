# UI surfaces, menu map and controller navigation

Status: current as of 2026-10-05 (`dev/sprint-49`) | Owner: UI / input
Companions: [Steam Deck-first display and input spec](../steam-deck-first-display-and-input-spec.md)
(the layout rules), [menu input and reachability contract](../menu-input-navigation-contract.md)
(the focus rules), [Steam review fix plan](../planning/steam-review-build-25475189-fix-plan-2026-09-30.md).

This is the reference for every menu, sub-menu and tab in the game as it
stands today, how a player moves between them on a controller, keyboard or
mouse, what was wrong on 2026-10-05 and what was fixed, and the plan to
improve the UI without losing what already works.

**Keep it current:** `HB_PROBES=1 npx playwright test tests/e2e/probes/ui-surface-audit.spec.js`
walks every reachable surface and tab at the Deck stage and writes
`docs/reports/ui-surface-audit/` (screenshots plus a JSON record of spill,
clipping, truncation, every focusable control and its size). Set
`HB_UI_AUDIT_W` / `HB_UI_AUDIT_H` for other window sizes. A new menu must be
added to `MENU_FOCUS_ROOT_IDS` (`src/inputActions.js`) and to the map in §4.

---

## 1. The rules every screen follows today

| Rule | Where it lives | Value |
|---|---|---|
| One canonical stage | `main.js` `syncStageMetrics`, `style.css` `--vu` / `--stage-px` | 1280×800 logical, letterboxed to any window |
| Safe frame | `--hb-safe-hud`, `--hb-safe-text` | 32 px HUD / 48 px menu text from the stage edge |
| Text floor | `--hb-text-floor`, Settings → Controls → Minimum text floor | 18 logical px for body text |
| Corner slot | `.menu-corner-settings`, `.armory-corner-settings`, `.net-corner-settings`, `.hud-corner-settings` | Same stage pixel on every screen: **CHAT** (fixed `--corner-chat-width`, 72 px) then **⚙**, 44 px hit |
| Focus surfaces | `MENU_FOCUS_ROOT_IDS` | 61 surfaces, topmost-first; the first open one owns focus |
| Native controls | menu contract | Every action is a `button`/`input`/`select`/link, or has a role and `tabindex="0"` |
| Strings | `data-i18n` keys in `src/locales/*.json` | 7 languages; `npm run i18n:audit` ratchets coverage |

## 2. Input model: how controls move around

Three input paths drive the same menus. They share one focus system
(`moveSpatialControllerFocus`, `handleControllerTabNavigation`,
`activateControllerFocusedElement`, `dispatchControllerEscape` in `main.js`).

### 2.1 Menus (any open surface)

| Intent | Steam Deck / pad (official layout) | Browser gamepad fallback | Keyboard | Mouse |
|---|---|---|---|---|
| Move focus | D-pad, left stick | D-pad, left stick | WASD, arrows | hover (only after real movement) |
| Confirm | A, RT | A, RT | Enter, Space | click |
| Back / close | B (Esc on Deck) | B | Esc | ✕ / Back buttons |
| Previous / next tab | LB / RB, X / Y | LB / RB | **Q / E** (new 2026-10-05) | click the tab |
| Change a slider or dropdown | D-pad ◀ ▶ while focused | same | A / D or ◀ ▶ | drag / click |
| Open a dropdown's full list | A on the dropdown (select picker overlay) | same | Enter | click |
| Scroll a panel with nothing focusable (lore text, codex detail) | D-pad ▲ ▼ | same | W / S or ▲ ▼ | wheel |
| Enter text | A opens the Steam keyboard (in-game keyboard fallback) | in-game keyboard | type | type |
| Pointer fallback | right trackpad / stick cursor + A | — | — | — |
| Settings / pause | ☰ (Menu) | Start | Esc in gameplay | ⚙ |

On the operator menu, LB / RB (Q / E) cycle the class cards; in the Armory
Q / E cycle classes (its own handler). Focus wraps at the edges, opens on a
deterministic first target and returns to the opener when a surface closes.

### 2.2 Gameplay (no menu open)

| Action | Deck official layout | Keyboard / mouse |
|---|---|---|
| Move / aim | left stick / right stick or trackpad | WASD / mouse |
| Fire | RT | left click |
| Interact | A | E (or Enter) |
| Dodge | B | — |
| Reload | X, D-pad ◀ | R |
| Smash / ability | Y, D-pad ▶ | F |
| Scan | LB, D-pad ▼ | Q |
| Tactical map | RB, D-pad ▲, View | M or Tab |
| Sprint | left stick click | Shift |
| Melee | — | V |
| Pause / settings | ☰, Esc | Esc |
| Tactical ping | — | T |
| Trade (squadmate present) | — | T (also pings; see P4.4) |
| Chat | **no binding** — HUD CHAT (mouse) or Pause → Settings → Session → Room Chat | same |

The archive (point-and-click) action set maps A inspect, B back, X reveal
hotspots, Y inventory, with LB / RB as inventory / reveal.

## 3. Tabs

Tabbed surfaces and what LB / RB (and now Q / E) cycle:

| Surface | Tabs |
|---|---|
| Settings (`#settings-popup`) | Session · Audio · Controls · Camera & HUD · Accessibility · Profile & Saves |
| Archive (`#archive-modal`) | Lore Logs · Dossier · Story Endings · Achievements |
| Foundry hub (`#foundry-hub-modal`, default) | Stash · Loadout · Fabricate · Trade-Up (Fabricate and Trade-Up show a lock until earned) |
| Steam Vault (`#steam-vault-modal`, `hb_foundry_hub=0`) | Owned Inventory · Relic Store & Drop · Smelter & Dispensary |
| Tactical Dossier (`#season-pass-modal`) | Dossier · Directives · Fragment Workshop |
| Ship terminal (`#console-terminal-modal`) | Base System · Class Skills · Objective / Night Log |
| Operator menu (`#menu`) | the three class cards (Scout · Tank · Engineer) |
| Armory (`#armory-screen`) | Scout · Tank · Engineer (Q / E only) |

A tab is any `[role="tab"]`, `.tab-btn`, `.vault-tab-btn`, `.terminal-tab-btn`,
`.season-pass-tab-btn`, `.category-btn`, `.sub-tab-btn`, `.rgb-path-btn` or
`.class-tab`; active is `.active`, `.is-active`, `.selected` or
`aria-selected="true"`. New tab bars should use `role="tab"` and
`aria-selected`.

## 4. Menu map

Every surface a player can reach, top to bottom. `→` opens a surface; Back is
B / Esc unless noted. Focus counts are from the 1280×800 audit on a fresh save
(locked content is not focusable, so a played save shows more).

### 4.1 Boot and title

```
Boot (DoorIntro cinematic) ─▶ TITLE (#splash)
  ├─ CONTINUE ............ resumes a saved run (hidden without one)
  ├─ SWITCH CLASS ........ (hidden until relevant) → operator menu
  ├─ NEW RUN ............. → OPERATOR MENU (§4.2)
  ├─ MULTIPLAYER ......... → TACTICAL NET (§4.5)
  ├─ ACHIEVEMENTS ........ → Operative Citations (#achievements-modal): every card focusable, grid scrolls (save codes live in Settings → Profile & Saves → Save data)
  ├─ SETTINGS ............ → SETTINGS (§4.7)
  ├─ ABOUT ............... → Credits (#about-modal)
  ├─ QUIT GAME ........... → Quit confirm (#quit-confirm-modal)
  └─ Steam badge (top right) → Steam overlay profile
```

### 4.2 Operator menu / homebase (`#menu`)

```
OPERATOR MENU
  ├─ class cards: SCOUT · TANK · ENGINEER ..... LB/RB or Q/E cycle; A selects
  ├─ callsign field + ↻ randomize .............. A edits (Steam keyboard)
  ├─ SUIT POLISH .............................. → Operator Polish (#operator-polish-modal, 16 finishes)
  ├─ STEAM VAULT .............................. → Foundry hub at Stash (§4.6)
  ├─ FAB BAY .................................. → Foundry hub at Fabricate (§4.6)
  ├─ ARCHIVE .................................. → Archive (§4.6)
  ├─ CODEX .................................... → Field Codex (#codex-modal) → record (#codex-detail-modal)
  ├─ DOSSIER .................................. → Tactical Dossier (#season-pass-modal)
  ├─ ACHIEVEMENTS / ARCHIVE SIMS ............... (shown when unlocked) → #achievements-modal / #archive-sims-modal
  ├─ ← RETURN TO MAIN MENU .................... → title
  ├─ corner: CHAT · ⚙ ......................... → chat (#player-chat-modal) · Settings
  └─ ENTER ARMORY ............................. → ARMORY (§4.3)
```

### 4.3 Armory / loadout (`#armory-screen`)

```
ARMORY — Sector Zero Tactical Bench // Loadout
  ├─ header: class tabs SCOUT · TANK · ENGINEER (Q/E) · HUD layout toggle · [Q / E CYCLE] hint
  ├─ corner: CHAT · ⚙
  ├─ left: 3D operator + weapon preview; LIVE STAGE PREVIEW card; TACTICAL HUD THEME
  ├─ right: BALLISTIC BENCH & OVERCLOCKS — primary weapon, weapon sheen, tactical charm,
  │         projectile tracer, suit overclock bay A/B, active overclock status
  │         OPERATOR EXOSUIT RIG — chassis skin, operator sheen, shoulder patch, alt radio voice bank
  │         each slot → picker (#armory-picker-modal or the select picker overlay)
  ├─ ← RETURN TO MAIN MENU [Esc] · STEAM VAULT & FAB BAY [V]
  └─ CONTINUE TO DEPLOYMENT ▶ → TACTICAL NET (§4.5)
```

### 4.4 Gameplay HUD and in-run surfaces

```
GAMEPLAY (#ui HUD; not a focus surface — the pad drives the game)
  ├─ corner: CHAT (mouse only in play) · ⚙
  ├─ Esc / ☰ ......... → SETTINGS (§4.7) as the pause menu (Session tab: Resume, Abort, Exit, Room Chat)
  ├─ Tactical map .... → #tactical-map-modal
  ├─ Ship console (A / E at the console) → SHIP TERMINAL (#console-terminal-modal, §5)
  │     └─ O₂ generator detail → #o2-generator-modal
  ├─ Base turret ..... → #base-turret-modal
  ├─ Field workbench . → #field-workbench-modal
  ├─ Camps ........... → #camp-choice-modal · #leader-conversation-modal · #npc-dialogue-modal
  ├─ Mothership ...... → #mothership-dialogue
  ├─ Encounters ...... → #snail-encounter-modal · #wanderer-encounter-modal · #expedition-event-modal · #elevator-choice-modal
  ├─ Lore pickup ..... → #lore-modal
  ├─ Trade (T, only with a squadmate in the room) → #player-trade-modal
  └─ Run end ......... → #game-over-modal · #demo-end-modal
```

### 4.5 Tactical Net / deployment console (`#multiplayer-modal`)

```
TACTICAL NET // RELAY COMMAND
  ├─ mode cards: SOLO · CO-OP SQUAD · PVP DUEL · DAILY OPS (A selects)
  ├─ mission objective, career ledger, current campaign, black box, tracked objectives
  ├─ corner: CHAT · ⚙ · header ✕
  ├─ ← BACK TO ARMORY
  └─ DEPLOY SOLO / DEPLOY SQUAD ▶ → mission intro → gameplay
```

### 4.6 Hub surfaces

```
FOUNDRY HUB (#foundry-hub-modal)    tabs: STASH · LOADOUT · FABRICATE 🔒 · TRADE-UP 🔒
  currency strip (TECH · COIN · MED · SHELLS) · ✕
  (hb_foundry_hub=0: STEAM VAULT #steam-vault-modal — OWNED · RELIC STORE · SMELTER;
   FAB BAY #fabrication-modal; reveals → #vault-reveal-overlay, #progression-reward-overlay)
ARCHIVE (#archive-modal)            tabs: LORE LOGS · DOSSIER · STORY ENDINGS · ACHIEVEMENTS
  found log → #archive-log-detail-modal
FIELD CODEX (#codex-modal)          endings archive, then bestiary by category; record → #codex-detail-modal
TACTICAL DOSSIER (#season-pass-modal) tabs: DOSSIER · DIRECTIVES · FRAGMENT WORKSHOP; TRACK per reward
ARCHIVE SIMS (#archive-sims-modal)  RGB chapters → #rgb-root (archive action set)
```

### 4.7 Settings (`#settings-popup`, from title, menu, Armory, console or pause)

| Tab | Contents | Sub-surfaces |
|---|---|---|
| Session | Room Chat, Return to game / Resume, Night vision, Debug overlay, Abort mission, Exit application | chat, quit confirm |
| Audio | Audio mixer, Commentary mode, Developer commentary, Read All | `#audio-mixer-popup`, `#commentary-list-modal` |
| Controls | Language, UI scale, Minimum text floor, Text speed, Camera mode / distance / follow, Turn & aim speed, Invert Y, Crosshair color, Colorblind assist, Gore | `#language-select-popup`, `#crosshair-color-popup`, `#controls-popup`, select picker |
| Camera & HUD | camera and HUD layout options | — |
| Accessibility | Camera shake, Controller aim assist, Reduced pressure mode, **Content Guide** | `#mature-content-audit-modal` → `#mature-audit-scene-viewer` |
| Profile & Saves | Operator callsign, Operator ID, Steam Cloud sync, Save data, New game reset | `#save-data-popup`, `#reset-save-confirm-modal`, virtual keyboard |

### 4.8 Global overlays

Select picker (`#select-picker-overlay`), in-game keyboard
(`#virtual-keyboard-overlay`), confirm dialogs (`#confirm-modal`), reward and
reveal overlays, progression walkthrough and scene viewer, QA / debug
(`#qa-nexus-modal`, `#hb-debug-console`, `#dev-console-modal`, debug museum).

## 5. Ship terminal and "powerups", as they are today

The terminal (`#console-terminal-modal`) opens at the ship console. Header:
time of day, time survived, cycle hold, class badge, ✕. Footer: status ticker.

**Base System tab** (the shop), as reskinned in `70aa8095`:
- *Current run stats*: shells, bank total, hearts (3/3), O₂ (%), then the MED /
  TECH / COIN bank cells with stored vs carried amounts ("0/10 FOR ♥" under MED).
- *Current objective* card: only the next ship goal is shown, in order —
  O₂ generator → hull expansion matrix → radar node → reactor compressor
  (SYS-01..04). It carries a status badge (INSUFFICIENT / READY / INSTALLED),
  the goal's description, **per-currency cost chips coloured against the bank**
  (TECH 0/10 · MED 0/5 · COIN 0/5, red when short) and one action button
  (REPAIR GENERATOR, INSTALL …), then a "base priority" hint.
- *Field medkit* card: convert 10 MED → 1 heart, with a state badge (HP FULL,
  READY, SHORT) and its own button.
- *Optional field opportunity*: an event card with choices when one is active.
- Footer ticker: the current alert ("O₂ generator offline. Deposit 10 TECH…").

The four goals and what they give:

| Goal | Card | Gives | Cost | Unlocks after |
|---|---|---|---|---|
| 1 | SYS-01 O₂ Generator / Field Stabilizer 🫧 | O₂ sanctuary bubble, expedition safe zone | 10 TECH / 5 MED / 5 COIN, scaling | — |
| 2 | SYS-02 Hull Expansion Matrix ⛨ | +1 max heart (4 total), structural integrity | 50 TECH / 20 MED | O₂ generator |
| 3 | SYS-03 Communication Radar Node 📡 | compass supply tracker, cache cluster ping | 150 TECH / 30 COIN | hull matrix |
| 4 | SYS-04 Reactor Compressor | reactor upgrade | per card | radar node |

**Class Skills tab**: summary line (SKL 0/6 · SYS 0/4 · WPN 0/13 · shells),
then the class's skill tree: 20 node cards on a column/row graph with
connectors (`buildTreeNodeCard` in `threeGame.js`), each a focusable
`role="button"` in row-major order; arrow keys / D-pad walk the graph
(`handleSkillTreeNavKey`), A buys.

**Objective / Night Log tab**: day, phase, light, transition, route, advance
day; cycle progress; objectives grid and journal; base turret build card.

Controller: LB / RB (Q / E) switch the three tabs; ✕ / B close. On a fresh run
the only focusable controls on Base System are the tabs and ✕, because every
buy button is disabled until it is affordable.

What is still weak: a disabled buy button can't be focused, so a pad user
can't land on the goal card to read why it is blocked; the stat pills don't
show before → after values; the bank, goal and medkit are three different
card styles; and the next goals are invisible until the current one is done,
so there is no sense of the ladder.

## 6. Audit findings and fixes (2026-10-05)

From `ui-surface-audit` at 1280×800 (Deck), plus the existing browser suites.

| # | Finding | Evidence | Status |
|---|---|---|---|
| 1 | Deployment console CHAT was a full-size orange `start-btn` in the action row — louder than DEPLOY, and not where CHAT sits on any other screen | screenshot `06-deployment-console` | **Fixed**: CHAT moved into the console's corner slot, same size and place as the menu, Armory and HUD; the header ✕ shifts left to clear it |
| 2 | Armory header ran under the corner CHAT button (class tabs and `[Q / E CYCLE]` collided with it) | screenshot `05-armory` | **Fixed**: header padding reserves CHAT + gear (`--corner-chat-width`) |
| 3 | A stationary mouse stole keyboard focus when a popup closed (picking a dropdown value left focus on the tab under the pointer) | `controller-focus.spec.js` "commits the chosen option" failed | **Fixed**: hover only takes focus after the pointer really moves since the last key press |
| 4 | Dossier tabs could not be switched by LB / RB | `.season-pass-tab-btn` missing from the tab selector | **Fixed**, plus `role="tab"` / `aria-selected` |
| 5 | Q / E did not switch menu tabs (README promised it) | no keyboard path | **Fixed**: Q / E = previous / next tab on every tabbed surface; new `menu-tab-switching.spec.js` |
| 6 | Lore drop logs showed internal keys ("LOG-drop_horizon_badge") | screenshot `04-…LORE_LOGS` | **Fixed**: LOG-D01.., item title once found |
| 7 | The `(max-height: 820px)` anti-spill block also matches the Deck and shrank title buttons to 22 px with 12 px text | audit `smallTargets` on `01-title` | **Improved**: floor raised to 30 px / 14 px; the real fix is in plan P2 |
| 8 | Title-flow reachability test was stale (predates MULTIPLAYER) | `menu-reachability.spec.js` failed at ACHIEVEMENTS | **Fixed** test |
| 9 | Chat has no keyboard or controller binding in play; the HUD CHAT button is mouse-only during gameplay | input maps (§2.2) | Plan P4 (pad users reach it through Pause → Settings → Session → Room Chat) |
| 10 | Locked Codex entries and lore logs aren't focusable, so on a fresh save a pad user can't browse those grids (achievements already are) | audit focus counts: Codex 1, Lore Logs 6 | Plan P1 |
| 11 | Small targets (< 32 px) on the operator menu hub buttons, Foundry hub items, Armory slot buttons and Dossier TRACK buttons | audit `smallTargets` | Plan P2 |
| 12 | Archive / Codex grids extend past the stage | audit `offStage` | Not a defect: both scroll inside `.archive-console-body` / `#codex-grid` |
| 13 | Achievements reachable to the last card by pad (Steam review item 5) | `achievements-and-profile.spec.js`, audit (26 focusables) | Holds |
| 14 | T opened a barter window in **solo** play, with a made-up "SQUAD-OPERATIVE", on every tactical ping | browser probe: `player-trade-modal` visible after T | **Fixed**: trade only with a real squadmate; solo T is ping only |
| 15 | Terminal tabs and the 20 skill cards are reachable (Q / E, LB / RB, D-pad) | browser probe | Holds |
| 16 | After these fixes, no off-stage, clipped or truncated content on any of 44 surfaces / tabs at 1280×800, 1280×720 or 1920×1080 | `docs/reports/ui-surface-audit/<size>/audit-<size>.json`, key screenshots in `1280x800/` | **Wrong by eye** — see note below |

Note on #16: the audit compares element boxes with the stage and with their
scroll parents only. It cannot see paint order, a painted frame's alpha,
pseudo-element lines, wrapped one-line labels or 3D canvas content, so a
"clean" run still missed the cut-off Scout card, the bezel bracket around the
⚙ button and the HUD overlaps. These are catalogued, with causes, in
[UI overhaul plan](../planning/ui-overhaul-plan-2026-10-05.md), which
supersedes §7 P2.

## 7. Improvement plan (keeping what we have)

Principles: keep the 1280×800 stage, the safe-frame and text-floor tokens, the
corner slot, `MENU_FOCUS_ROOT_IDS`, every `data-i18n` key and element id (tests,
probes and saves depend on them). Change by adding and re-skinning, never by
removing a working path. Each item lands with an audit run and a browser test.

**P1 — Controller reach everywhere (highest priority; the Steam review theme)**
1. Every visible card is focusable, locked or not (Codex, lore logs, story
   endings, Foundry stash, terminal goal cards whose button is disabled), with
   an `aria-label` that says why it is locked or unaffordable.
   Accept: the audit reports, for every surface, focusables ≥ visible cards.
2. Extend `menu-reachability.spec.js` with a seeded "played" save so unlocked
   states are covered, and add the terminal and Tactical Net to the probe.
3. A tab contract test: every element matching the tab selector has
   `role="tab"` and toggles `aria-selected` (catches the Dossier class of bug).
4. In play, make the HUD corner reachable: Pause opens Settings on Session with
   Room Chat focused-first when chat has unread messages.

**P2 — Layout at the canonical stage**
1. Replace the `(max-height: 820px)` overrides with a layout that fits
   1280×800 by design (the Deck *is* the canonical size); keep a separate
   rule only for windows smaller than the stage.
2. Add a hit-target token (`--hb-hit-min`: 32 px menu, 44 px corner/primary)
   and apply it to the hub buttons, Foundry items, Armory slots and TRACK
   buttons. Accept: audit `smallTargets` empty on the main path.
3. Armory: dock the LIVE STAGE PREVIEW card under the operator (not over the
   model) and keep the right column scrolling inside its own panel.
4. Run the audit at 1280×800, 1280×720 and 1920×1080 in the release checklist.

**P3 — Terminal and powerups** (build on the `70aa8095` reskin)
1. Show the whole goal ladder: the current goal stays the large card; the
   other three sit beside it as compact cards with their state (Installed ✓,
   Next, Locked + prerequisite), so the player sees where the base is going.
2. Keep the per-currency cost chips; add before → after values to the stat
   pills ("♥ 3 → 4", "O₂ field 0 → 6u").
3. One focus order: tabs → bank → goal grid → event; A on a card buys; the
   ✕ and B close. Keep every existing id and `data-i18n` key.
4. Match the Foundry card visual language (same frame, rarity colours).

**P4 — Chat and in-run keys**
1. A Steam Input `open_chat` action in the gameplay set on View (short press),
   leaving the map on D-pad ▲ / RB; browser-pad fallback on Select; keyboard
   `Y`. Requires the action manifest and the official layout update on Steamworks.
2. Unread badge on every corner CHAT button; screen-reader label with the
   unread count.
3. Chat modal opens with the composer focused and the Steam keyboard on A.
4. Give trade its own key (T stays ping): in co-op, T still pings *and* opens
   barter with the nearest squadmate.

**P5 — Documentation and guardrails**
1. README "Controls" section reflects §2 exactly (updated 2026-10-05).
2. The audit JSON is attached to each release PR; a regression in spill,
   clipping or small targets on the main path blocks the release.

Order: P1 and the P2 target token first (review-facing), then P3, then P4
(needs Steamworks), with P5 maintained throughout.
