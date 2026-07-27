# Steam Deck-First Migration Status

Tracks progress against `docs/steam-deck-first-display-and-input-spec.md`.
Updated 2026-07-24 on `dev/sprint-20`.

## Phase 1: Establish the stage — shipped

- [x] `src/stage.js`: pure `computeStageTransform`/`toStagePoint`/
      `isInsideSafeFrame` for the canonical 1280×800 (16:10) logical stage.
- [x] `#game-viewport` contain box converted from 177:100 to 160:100
      (16:10); `syncStageMetrics()` in `main.js` publishes the transform as
      `window.hbStage` and `--stage-scale`/`--stage-x`/`--stage-y`/
      `--stage-w`/`--stage-h`/`--stage-px` CSS custom properties.
- [x] Three.js sizing already reads `this.container.clientWidth/Height`
      (`src/threeGame.js` `resize()`), and pointer math already goes through
      `getBoundingClientRect()`, so both now inherit the fixed 1.6 aspect
      once `#game-container` is laid out to the stage rect — no threeGame
      changes were required.
- [ ] Visual regression captures at 1280×800, 1920×1080, 2560×1440, and an
      ultrawide size are not automated yet. Manually verified via Playwright
      screenshots during implementation (all three matte correctly with no
      stretch); a checked-in regression harness is future work.

## Phase 2: Make Steam Input semantic — shipped

- [x] `steam/steam_input_manifest.vdf`: added the `archive` action set
      (`archive_focus`, `archive_confirm`, `archive_inventory`,
      `archive_back`, `archive_reveal`, shared `pause`), `gameplay.sprint`,
      and `menu` tab/page actions.
- [x] `src/inputActions.js`: `createActionRouter()` derives semantic
      per-set actions (menu / gameplay / archive) from a browser-gamepad
      snapshot, with edge-triggering for discrete presses.
- [ ] Native Steam Input runtime bridge (Electron/Steamworks side action-set
      switching, glyph queries against the real overlay) is not wired —
      today's implementation covers the manifest contract and the browser
      Gamepad API fallback described in the spec ("The browser Gamepad API
      remains a non-Steam fallback, mapped onto the same semantic
      actions"). Wiring the native bridge is deferred to a sprint with Deck
      hardware access.
- [ ] Automatic action-set switching for menus/field/archive is implemented
      for RGB's own runtime (Task 11) but not yet retrofitted onto the main
      field-play HUD, which still reads raw mapped-pad fields directly.

## Phase 3: Remove mobile support — shipped

- [x] Touch markup removed from `index.html`: virtual movement joystick,
      touch sprint/ability/scan buttons, touch-controls setting row,
      portrait orientation-lock overlay.
- [x] Touch state, listeners, settings, prompts, and persistence removed
      from `main.js` (`isTouchDevice`, `setTouchDeviceMode`,
      `syncTouchSettingsVisibility`, `clearTouchInputState`,
      `installTouchMoveControl`, `installOrientationInputLock`, the
      `hunker_touch_controls_enabled` localStorage key, and all touch
      event listeners on the tactical cursor).
- [x] Touch/portrait CSS and mobile-only breakpoints removed from
      `style.css` (`.touch-move-control*`, `.touch-ability-btn*`,
      `#touch-scan-btn*`, `#orientation-lock`,
      `@media (orientation: portrait)`).
- [x] Compass behavior migrated: `#desktop-compass` was already a complete,
      independent implementation of the same readout, so nothing needed
      porting — the touch compass was deleted outright and the extraction
      progress ring (its only unique child) was moved into the desktop
      compass ring.
- [x] `src/dialogue.js` tutorial sequence: dropped the touch-branch prompt
      copy (`tutorialStepMovement`/`tutorialStepConsole`/
      `tutorialStepConsoleAccess`), always showing the keyboard copy.
- [ ] No mobile/touch acceptance tests existed in `tests/e2e/` to remove;
      the suite was already keyboard/mouse-only.

## Phase 4: Consolidate presentation — partial

- [x] Safe-frame and type-floor tokens added to `style.css` `:root`:
      `--hb-safe-hud` (32px), `--hb-safe-text` (48px), `--hb-text-floor`
      (18px), expressed in logical stage pixels via `--stage-px`.
- [ ] Per-screen audit for duplicated/overlapping/low-value overlays not
      done. The existing `--vu`-based HUD grid already keeps comfortable
      margins (e.g. `.hud-header` sits at `4vu` from the left, well past
      the 32px floor at every tested size), so nothing is visibly broken,
      but no screen has been rebuilt to explicitly consume the new safe-
      frame tokens.
- [ ] Text-speed/text-size option clipping test pass not done.

## Phase 5: Hardware acceptance — not started

Requires physical Steam Deck hardware:

- [ ] Full run using only built-in Deck controls.
- [ ] All menu/codex/settings/ending/RGB paths without touchscreen or mouse
      emulation.
- [ ] Suspend/resume repeatedly, reconnect an external controller.
- [ ] Docked 1080p and 4K output preserving 16:10 composition.
- [ ] Keyboard/mouse parity verification on 16:9 desktop (informally
      verified via Playwright at 1920×1080 during this pass; needs a real
      pass with a human).

## RGB and other unlockable stories

RGB's gray-box runtime (see separate RGB implementation tasks) is built to
mount inside this same stage and consume the `archive` action set from
`src/inputActions.js`; it does not introduce a second platform shell.
