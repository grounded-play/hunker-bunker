# Steam Deck-First Stage/Input + RGB Archive Sim Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the executable asks of `docs/steam-deck-first-display-and-input-spec.md` (canonical 1280×800 stage, semantic Steam Input incl. `archive` action set, touch/mobile removal) and then the RGB mini-game per `docs/mini-games/rgb/` (state prototype + gray-box runtime + unlock/menu integration).

**Architecture:** A pure `src/stage.js` module owns the 16:10 contain transform; `#game-container` and a new `#stage-root` overlay wrapper are laid out to that rect so Three.js sizing and raycasting (both derived from container box/`getBoundingClientRect`) inherit correct behavior. A pure `src/inputActions.js` module maps browser-gamepad snapshots onto semantic action sets (`menu`, `gameplay`, `archive`). Touch/mobile code paths are deleted (desktop compass already exists at `#desktop-compass`, so the touch compass carries no unique behavior). RGB lives in `src/minigames/rgb/` as Phaser-free pure state + content + save modules with a DOM gray-box runtime mounted from the title menu.

**Tech Stack:** Vite, Three.js, vanilla DOM, Vitest, Playwright, Electron wrapper; Steam Input manifest VDF.

## Global Constraints

- Logical stage is exactly **1280×800 (16:10)**; scale uniformly (`scale = min(hostW/1280, hostH/800)`), center, matte the remainder. Never stretch.
- Safe frame: essential HUD/prompts ≥ **32** logical px from stage edge; subtitles/menu text ≥ **48** logical px.
- Body-text working floor: **18 logical px**.
- Steam Input is semantic; raw hard-coded button checks are not acceptance-ready. Manifest lives at `steam/steam_input_manifest.vdf`.
- Touch/mobile is a removed target: no virtual joystick, touch buttons, touch detection, touch settings, portrait layout, or mobile viewport workarounds. Ordinary pointer events stay.
- RGB save key: `hb_minigame_rgb_v1` (the Electron bridge mirrors all `hb_*` keys).
- RGB must not create a second window/platform shell; it mounts inside the canonical stage.
- RGB expose ending requires `training_profile` + any 3 other evidence records; Marisol witness substitutes for one record only if `noticedMarisolPressure` was true when asked.
- Endings are never ranked good/bad; poverty is never scored as player failure.
- Quality gates for every task: `npm run lint`, `npm test`, `npm run build` clean.

---

## Part I — Steam Deck-first display & input

### Task 1: Stage transform module

**Files:**
- Create: `src/stage.js`
- Test: `src/stage.test.js`

**Interfaces (Produces):**
- `STAGE_WIDTH = 1280`, `STAGE_HEIGHT = 800`, `SAFE_FRAME_HUD = 32`, `SAFE_FRAME_TEXT = 48`, `TEXT_FLOOR_PX = 18`
- `computeStageTransform(hostWidth, hostHeight) -> { scale, stageWidth, stageHeight, offsetX, offsetY }` (spec formula; guards non-finite/≤0 hosts by returning scale 1 identity at 1280×800)
- `toStagePoint(hostX, hostY, transform) -> { x, y, inside }` (logical stage coords; `inside` = within 0..1280/0..800)
- `isInsideSafeFrame(x, y, margin)` -> boolean

- [ ] Write failing tests: 16:10 host maps scale exactly; 16:9 host (1920×1080) letterboxes horizontally with `offsetX = (1920 - 1080/800*1280)/2`; ultrawide mattes sides; pointer round-trip; degenerate host returns identity.
- [ ] Run `npx vitest run src/stage.test.js` — expect FAIL (module missing).
- [ ] Implement `src/stage.js` (pure functions, no DOM).
- [ ] `npx vitest run src/stage.test.js` — PASS.
- [ ] Commit `feat: add 1280x800 logical stage transform module`.

### Task 2: Stage integration (world + overlay wrapper)

**Files:**
- Modify: `index.html` (wrap gameplay overlay UI in `<div id="stage-root">`; leave `<div id="game-container">` as world mount)
- Modify: `main.js` `refreshGameLayout()` (~line 4720): compute transform via `computeStageTransform(window.innerWidth, window.innerHeight)`, write `--stage-scale/--stage-x/--stage-y/--stage-w/--stage-h` CSS vars on `document.documentElement`, expose `window.hbStage = transform`, then call `window.game?.resize?.()`.
- Modify: `style.css`: `#game-container { position: fixed; left/top/width/height from stage vars; }` matte black `body` background; `#stage-root { position: fixed; width:1280px; height:800px; transform-origin: top left; transform: translate(var(--stage-x), var(--stage-y)) scale(var(--stage-scale)); }`

**Interfaces:**
- Consumes: `computeStageTransform` from Task 1.
- Produces: `window.hbStage` transform snapshot for any code needing host↔stage mapping; CSS stage vars for layout.

Key detail: `ThreeGame.resize()` (`src/threeGame.js:3658`) already sizes camera + renderer from `this.container.clientWidth/Height`, and canvas pointer math uses `getBoundingClientRect()` (`src/threeGame.js:2830`), so once `#game-container` is laid out to the stage rect, world aspect is fixed at 1.6 and raycasting stays correct with no threeGame changes.

- [ ] Add the wrapper + CSS + refreshGameLayout wiring.
- [ ] Verify: `npm run build` clean; boot dev server, screenshot at 1280×800, 1920×1080, ultrawide — 16:10 composition centered with matte, HUD scaled uniformly (Playwright viewport captures).
- [ ] Run existing e2e smoke (`npx playwright test tests/e2e/bunker-tree*` or fastest suite) to confirm no boot regression.
- [ ] Commit `feat: route world and overlay UI through canonical 16:10 stage`.

### Task 3: Steam Input manifest — archive action set + missing actions

**Files:**
- Modify: `steam/steam_input_manifest.vdf`

Add to `gameplay`: `sprint`. Add `menu` actions: `menu_tab_left`, `menu_tab_right`, `menu_page_left`, `menu_page_right`, `menu_pause`. Add new `archive` set:

```text
"archive"
{
    "title" "#ActionSetArchive"
    "StickPadGyro" { "archive_focus" "#ActionArchiveFocus" }
    "Button"
    {
        "archive_confirm"   "#ActionArchiveConfirm"
        "archive_inventory" "#ActionArchiveInventory"
        "archive_back"      "#ActionArchiveBack"
        "archive_reveal"    "#ActionArchiveReveal"
        "pause"             "#ActionPause"
    }
}
```

Plus matching `localization.english` entries.

- [ ] Edit manifest; validate VDF braces by eye + any existing steam audit script (`npm run steam:audit-depot` if applicable).
- [ ] Commit `feat: add archive action set and missing semantic actions to Steam Input manifest`.

### Task 4: Semantic action layer

**Files:**
- Create: `src/inputActions.js`
- Test: `src/inputActions.test.js`
- Modify: `main.js` (route archive/menu handling through it where RGB consumes it; field play keeps existing mapped snapshot which is already semantic via `mapBrowserGamepad`)

**Interfaces:**
- Consumes: mapped pad snapshot from `mapBrowserGamepad` (`src/browserGamepad.js`).
- Produces: `ACTION_SETS = { MENU:'menu', GAMEPLAY:'gameplay', ARCHIVE:'archive' }`; `createActionRouter()` with `setActionSet(name)`, `getActionSet()`, `deriveActions(padSnapshot) -> { set, actions }` where archive set yields `{ focus:{x,y}, confirm, inventory, back, reveal, pause }` edge-triggered booleans (`justPressed` semantics via internal previous-frame state); menu set yields navigate/confirm/back/tabLeft/tabRight/pause.
- [ ] Failing tests: set switching; archive mapping (confirm=A/`interact`, back=B/`menuBack`, inventory=Y/`ability`, reveal=X/`reload` hold, focus from move stick + dpad); edge triggering (held button fires once).
- [ ] Implement; tests PASS; lint clean.
- [ ] Commit `feat: add semantic action router with archive action set`.

### Task 5: Remove touch/mobile support

**Files:**
- Modify: `index.html` — delete `#touch-move-control`, `#touch-sprint-btn`, `#touch-ability-btn`, `#touch-scan-btn`, `#touch-controls-setting` markup, orientation-lock element if touch-only.
- Modify: `main.js` — delete touch element refs (lines ~46–61), `isTouchDevice()` (~4413) and all call sites (glyph prompts fall back to keyboard/controller branches), touch pointer state (`activeTouchPointerId`, `clearTouchInputState`, `clearTouchMoveInputState`, touch listeners ~1030), `updateTouch*ButtonState` functions (~4001–4112) and call sites, `state.settings.touchControls` + persistence, orientation lock sync (~967–1041), `setTouchDeviceMode`, `MobileTouch: 'TAP'` glyph path, touch skip hints (`'TAP TO SKIP'` → key/controller text).
- Modify: `style.css` — delete `.touch-move-control*`, `.touch-ability-btn*` blocks, `#orientation-lock` + `@media (orientation: portrait)` block, and `(pointer: coarse)` mobile-gate media queries (4390, 4663, 4711, 9386) after confirming each gated block is touch-only; keep desktop compass styles.
- Modify: any tests asserting touch behavior (grep `tests/ -e touch -e joystick`).

Desktop compass at `#desktop-compass` already carries compass behavior — nothing to migrate, only verify it still updates (main.js ~4543–4623).

- [ ] Delete in the order index.html → main.js → style.css, keeping the app booting between edits (`npm run build` after each file).
- [ ] Grep for stragglers: `grep -rn "touch\|Touch" main.js index.html | grep -v pointerType` and review each survivor (allowed: ordinary pointer-event plumbing).
- [ ] `npm run lint && npm test && npm run build`; boot + screenshot to confirm HUD intact and compass alive.
- [ ] Commit `feat!: remove touch/mobile input targets per Steam Deck-first spec`.

### Task 6: Safe-frame & type tokens

**Files:**
- Modify: `style.css` (`:root` tokens: `--hb-safe-hud: 32px; --hb-safe-text: 48px; --hb-text-floor: 18px;`)
- Modify: `docs/steam-deck-first-display-and-input-spec.md` — no edit; instead create `docs/steam-deck-migration-status.md` recording what shipped (Phases 1–3 + partial 4) and the remaining manual work (Phase 4 per-screen audit, Phase 5 hardware acceptance) as checklists.

- [ ] Add tokens; point stage-root padding of HUD anchors at them where trivially applicable (HUD top/bottom bars).
- [ ] Write status doc.
- [ ] Commit `docs: record steam-deck migration status; add safe-frame/type tokens`.

---

## Part II — RGB: Riverside Global 'Botics

### Task 7: RGB content data

**Files:**
- Create: `src/minigames/rgb/content.js`

**Produces:** `CHAPTERS` ordered array (`parking_lot`, `warehouse`, `incident_review`, `medi_kiosk`, `server_room`, `sector_four`); per-chapter `{ id, title, goal, hotspots: [{ id, label, x, y, w, h, lines, grants?, evidence?, flags?, requires?, timeCost?, once? }], choices, requiredBeats, hints: [h1,h2,h3] }`; `ITEMS` (albuterol bottle, drawing, notebook, badge, phone, wire cutters); `EVIDENCE_IDS = ['camera_discrepancy','swab_photo','payroll_record','kiosk_record','training_profile']`; ending/game-over card text (System Loop, Ashes & Survival, Open Hand, Crushed, Lockout); content warning text. Hotspot coordinates are authored in 1280×800 stage space.

- [ ] Author data from `scene-flow.md`/`narrative-script.md` (beats, optional choices, carry-forward flags exactly as specced).
- [ ] Commit with Task 8 (content is exercised by state tests).

### Task 8: RGB state machine + ending predicates

**Files:**
- Create: `src/minigames/rgb/state.js`
- Test: `src/minigames/rgb/state.test.js`

**Produces:**
- `createRunState()` → the minimal run state from `state-and-endings.md` (checkpoint, timeBand 0–3, pain `stable|injured|severe`, inventory, evidence, flags, calibrationQuality 0–2, trust4A, finalChoice).
- Pure transitions: `advanceTime(state, bands)`, `addEvidence(state, id)` (distinct-only), `setPain`, `applyChoice(state, choiceId)` per chapter (incl. Marisol release rule, honest error log, notebook keep/surrender, kiosk attempts), `completeCalibration(state, quality, honest)`, `chooseFinal(state, 'preserve'|'expose'|'sever')`, `attemptRescue(state, { success })`.
- Predicates: `canExpose(state)` (training_profile + 3 others; `marisol_witness` counts only if `noticedMarisolPressure`), `resolveOutcome(state)` → `'system_loop'|'open_hand'|'ashes_survival'|null`, `gameOver(state)` → `'crushed'|'lockout'|null`.
- Guarantees under test: timeBand may close optional routes but every ending stays reachable; kiosk medicine never times out without explicit attempts; failure returns to sequence start (checkpoint unchanged on game over).

- [ ] Failing tests covering: each ending trigger, both game overs, expose evidence math incl. Marisol substitution both ways, timeBand gating (band 3 blocks billing agent but not endings), rescue assist by calibration tier.
- [ ] Implement minimal `state.js`; tests PASS.
- [ ] Commit `feat: add RGB archive-sim pure state machine with tested ending predicates`.

### Task 9: RGB save schema + migration

**Files:**
- Create: `src/minigames/rgb/save.js`
- Test: `src/minigames/rgb/save.test.js`

**Produces:** `RGB_SAVE_KEY = 'hb_minigame_rgb_v1'`; `loadRgbSave(storage)` → validated `{ version:1, unlocked, checkpoint, endingsSeen, gameOversSeen, settings:{hints}, run }` with corrupt-JSON/wrong-shape recovery to fresh default; `saveRgbSave(storage, save)`; `markUnlocked`, `recordEnding`, `recordGameOver`, `saveCheckpoint`; `migrateRgbSave(raw)` (v1 passthrough scaffold with unknown-version reset).

- [ ] Failing tests: fresh default; round-trip; corrupt string recovery; unknown version reset preserving nothing; endings dedupe.
- [ ] Implement; PASS; commit `feat: add RGB save record with migration and corrupt-save recovery`.

### Task 10: Unlock gate + title toast

**Files:**
- Modify: `main.js` — where `recordSpecimen0047OriginIfFound` succeeds (grep call site), also `markUnlocked` the RGB save and queue a title-screen toast `ARCHIVE SIMULATION RECOVERED / RGB: RIVERSIDE GLOBAL 'BOTICS` on next title return; dispatch `rgb-unlocked`.
- Test: extend `src/minigames/rgb/save.test.js` or add small unit around the pure unlock helper `shouldUnlockRgb({ specimen0047Recorded })`.

- [ ] Wire + test; unlock persists across reload (storage-backed).
- [ ] Commit `feat: unlock RGB archive sim from Specimen 0047 codex completion`.

### Task 11: Gray-box runtime

**Files:**
- Create: `src/minigames/rgb/runtime.js`, `src/minigames/rgb/index.js`
- Modify: `index.html` (one mount `<div id="rgb-root" class="hidden">` inside `#stage-root`)
- Modify: `style.css` (monochrome gray-box styles; red accents; 48px text safe margins; 18px floor)

**Interfaces:**
- `mountRgb({ root, save, onExit })` → creates DOM scene from `content.js` chapter for `save.run.checkpoint`; returns `{ destroy() }`.
- Input: keyboard (arrows/WASD focus, E/Enter confirm, Tab inventory, Esc back/pause, hold Q reveal) + `createActionRouter` archive set; pointer click parity.
- Behavior: hotspot focus ring w/ predictable order; hold-reveal shows all hotspots; inventory strip; dialogue/recap panel; choice lists; chapter transitions via state module; ending + game-over cards with `RETRY RESCUE / LOAD CHAPTER / EXIT SIMULATION`; timers pause in menus (gray-box has no real-time timers — timeBand only); events `rgb-started`, `rgb-checkpoint`, `rgb-ending-reached`, `rgb-completed`.

- [ ] Build runtime chapter-generic (data-driven), not six bespoke scenes.
- [ ] Verify keyboard-only full path to each ending manually via dev server.
- [ ] `npm run lint && npm test && npm run build`.
- [ ] Commit `feat: add RGB gray-box DOM runtime on the shared 16:10 stage`.

### Task 12: Title menu integration

**Files:**
- Modify: `index.html` — `ARCHIVE SIMS` button after `#title-achievements-btn` (hidden until unlocked) + submenu panel showing RGB completion/endings.
- Modify: `main.js` — routing: show button when save.unlocked; open submenu; warn (non-destructively) if an active field run exists; launch via `mountRgb`; exit returns to title; never mutate run save.

- [ ] Wire; verify active-run save untouched after enter/exit (compare `hb_profile_v1`/run keys before/after).
- [ ] Commit `feat: add ARCHIVE SIMS title menu with RGB launch routing`.

### Task 13: E2E smoke

**Files:**
- Create: `tests/e2e/rgb-archive-sim.spec.js`

- [ ] Playwright: seed localStorage with unlocked RGB save → boot title → ARCHIVE SIMS visible → launch → keyboard-drive chapter 1 required beats → assert checkpoint advances and persists.
- [ ] Full gates: `npm run lint && npm test && npm run build && npx playwright test tests/e2e/rgb-archive-sim.spec.js`.
- [ ] Commit `test: add RGB unlock/launch/chapter-1 e2e smoke`.

---

## Out of scope this pass (recorded in `docs/steam-deck-migration-status.md`)

- Phase 4 per-screen presentation audit beyond tokens (needs design review per screen).
- Phase 5 hardware acceptance (requires physical Steam Deck).
- Native Steam Input runtime bridge for the archive set (Electron/Steamworks side); browser Gamepad fallback ships now via the action router.
- RGB Phases 3–5 (final art/audio assets, VO decision, hardware acceptance); gray-box uses placeholder shapes per production plan Phase 2.

## Self-review notes

- Spec coverage: Phase 1→Tasks 1–2; Phase 2→Tasks 3–4; Phase 3→Task 5; Phase 4 partial→Task 6; RGB Phase 1→Tasks 7–9; RGB Phase 2→Tasks 10–12 (+13). Gaps are declared out-of-scope, not silent.
- Type consistency: `computeStageTransform` consumed by Task 2; `mapBrowserGamepad` snapshot consumed by Task 4; `createActionRouter` consumed by Task 11; save API consumed by Tasks 10–12.
