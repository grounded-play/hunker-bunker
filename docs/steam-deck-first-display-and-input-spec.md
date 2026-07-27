# Steam Deck-First Display and Input Specification

## Decision

Hunker Bunker is a **Steam Deck-first desktop game**.

The canonical experience is designed, composed, and accepted at **1280×800
(16:10)** using physical controls. Larger desktop windows scale that same
composition without rearranging gameplay surfaces. Keyboard and mouse remain a
first-class desktop input path. Mobile browsers, portrait layouts, virtual
joysticks, and touch-only interaction are no longer product targets.

This policy applies to the entire game: title flow, field runs, bunker menus,
cutscenes, settings, codex, achievements, and unlockable sequences such as RGB.

## Product asks

### One canonical display

- Author every screen against a 1280×800 logical stage.
- Preserve the 16:10 composition at all window and monitor sizes.
- Scale the complete stage uniformly; do not independently reflow the HUD,
  world, menus, or dialogue at desktop breakpoints.
- Center the stage and use intentional black or art-directed matte space when
  the host aspect ratio differs.
- Never stretch the world to fill 16:9, 21:9, 32:9, or a resizable window.
- Keep critical action, text, prompts, and subtitles inside a shared safe frame.
- Render the 3D scene at the host’s appropriate resolution while positioning
  gameplay and presentation against the same logical 16:10 coordinates.

The desired behavior is **aspect-preserving contain**, not responsive web
reflow:

```text
host window
┌──────────────────────────────────────────────────────┐
│ matte                                                │
│     ┌──────── canonical 16:10 game stage ───────┐    │
│     │ world + HUD + dialogue + menus            │    │
│     │ keep the same relationships at every size │    │
│     └────────────────────────────────────────────┘    │
│                                                matte │
└──────────────────────────────────────────────────────┘
```

### Legibility is part of the composition

- The smallest acceptance target is the physical Steam Deck display at
  1280×800, viewed at normal handheld distance.
- Default body text must remain comfortably readable there without browser
  zoom. Use 18 logical pixels as a working floor; reserve smaller text for
  nonessential metadata and verify it on hardware.
- Important prompts use plain labels plus input glyphs. Do not encode meaning
  with color alone.
- Menus have predictable focus order and a persistent selected state.
- Subtitles use a stable lower safe area and never compete with button prompts.
- User-facing text may scale through an in-game setting, but text scaling must
  remain within the 16:10 stage rather than triggering mobile reflow.
- Extremely small desktop windows may show a minimum-size warning or allow the
  stage to scale down; they are not a separate compact layout.

## Screen model

Use three coordinate spaces deliberately:

1. **Host pixels:** The Electron/browser window and device pixel ratio.
2. **Logical stage:** Fixed 1280×800 coordinates used for composition, focus,
   hit targets, HUD anchors, dialogue, and menus.
3. **World space:** Three.js camera and scene coordinates rendered into the
   logical stage’s viewport.

At resize:

```js
scale = Math.min(hostWidth / 1280, hostHeight / 800);
stageWidth = 1280 * scale;
stageHeight = 800 * scale;
offsetX = (hostWidth - stageWidth) / 2;
offsetY = (hostHeight - stageHeight) / 2;
```

Pointer coordinates must be transformed back through `offsetX`, `offsetY`, and
`scale` before raycasting or hit testing. Input focus and gameplay movement do
not depend on host pixels.

## Safe frame

At 1280×800:

- Keep essential HUD and prompts at least 32 logical pixels from the stage
  edge.
- Keep subtitles and interactive menu text at least 48 logical pixels from the
  edge.
- Do not put essential information beneath Steam notifications or the Deck
  quick-access overlays where avoidable.
- Treat decorative bleed outside the safe frame as expendable.

The safe frame is not a mobile safe area and must not respond to device notches
or portrait orientation.

## Input policy

### Steam Deck and controller

Steam Input actions—not raw Xbox button numbers—are the canonical controller
contract. The game asks for semantic actions, and the active Steam layout
decides their physical placement.

Required action sets:

- **Menu:** navigate, confirm, back, tab left/right, page left/right, pause
- **Field:** move, aim, fire, interact, reload, ability, scan, sprint, pause
- **Archive/point-and-click:** move focus, inspect/confirm, inventory,
  reveal hotspots, back, pause

Required behavior:

- Left stick and D-pad both navigate menus.
- Focus never disappears when the last-used device becomes a controller.
- Every screen is completable without mouse emulation or the touchscreen.
- The game swaps glyphs when the active action set or input device changes.
- Simultaneous stick and trigger input works during field gameplay.
- Analog dead zones, response curves, and camera sensitivity are configurable.
- Text entry uses the Steam gamepad keyboard bridge where text is genuinely
  necessary; avoid mandatory typing in ordinary play.
- The browser Gamepad API remains a non-Steam fallback, mapped onto the same
  semantic actions.

The existing Steam manifest has only `menu` and `gameplay` sets. The
implementation pass must either add an `archive` action set or formally map
archive actions onto semantic menu/gameplay actions. Raw hard-coded button
checks are not acceptance-ready Steam Input support.

### Keyboard and mouse

Keyboard and mouse are equal desktop controls, not a fallback:

- WASD moves; mouse aims and selects.
- Every game action remains rebindable.
- Menus support arrows/WASD, confirm, back, and pointer selection.
- Keyboard focus is visible and follows the same navigation graph as controller
  focus.
- Glyphs switch immediately to the most recently used input family without
  flickering when devices report idle noise.

### Removed target: touch/mobile

The target architecture removes:

- virtual movement joystick;
- touch sprint, scan, and ability buttons;
- touch-device and mobile-user-agent detection;
- touch-specific cursor behavior and prompts;
- touch-control settings and saved preference;
- portrait-orientation layout;
- mobile breakpoint layouts whose only purpose is touch or narrow phones;
- mobile-specific viewport height workarounds.

Ordinary pointer events may continue to power mouse and trackpad input.
Incidental touchscreen clicks do not need to be blocked, but no feature,
layout, test, or release claim depends on them.

## Presentation policy

“Remove the mobile UI” does not mean remove all game information. It means
replace the accumulated web/mobile overlays with one restrained game
presentation designed into the canonical stage.

- Keep only information needed for the current decision.
- Prefer in-world terminals, diegetic suit readouts, and contextual prompts.
- Consolidate duplicated desktop/touch controls into one HUD.
- Do not create separate phone, tablet, desktop, and Deck component trees.
- Full-screen menus, modals, codex pages, and dream/archive sequences all occupy
  the same logical stage and use the same focus/input shell.

## RGB and other unlockable stories

RGB is a buried dream/archive story inside Hunker Bunker. It may use a distinct
black-and-white art language and point-and-click interaction, but it does not
create a second platform shell.

It inherits:

- the 1280×800 logical stage;
- aspect-preserving scaling and matte behavior;
- global text, subtitle, audio, reduced-flash, and shake settings;
- Steam Input action routing and glyph service;
- pause, save, focus, and exit conventions.

Its scene art is composed for 16:10. Inventory and dialogue are scene
presentation, not a responsive mobile UI.

## Migration plan

### Phase 1: Establish the stage

- Introduce a single 1280×800 stage wrapper and resize transform.
- Route Three.js sizing and pointer-coordinate conversion through it.
- Define one safe-frame token set and one logical type scale.
- Add visual regression captures at 1280×800, 1920×1080, 2560×1440, and an
  ultrawide size.

### Phase 2: Make Steam Input semantic

- Audit every raw controller check.
- Finalize action sets and update `steam/steam_input_manifest.vdf`.
- Route native Steam Input and browser gamepads into one action-state layer.
- Add automatic action-set switching for menus, field play, and archives.
- Validate glyph changes, focus retention, dead zones, and remapping on Deck.

### Phase 3: Remove mobile support

- Remove touch markup from `index.html`.
- Remove touch state, listeners, settings, prompts, persistence, and detection
  from `main.js`.
- Remove touch and portrait CSS plus mobile-only viewport workarounds.
- Migrate any useful compass behavior into the single controller/desktop HUD
  before deleting its touch-owned implementation.
- Remove mobile/touch acceptance tests and claims.

### Phase 4: Consolidate presentation

- Audit each screen for duplicated, overlapping, or low-value overlays.
- Rebuild priority screens inside the canonical safe frame.
- Replace responsive breakpoint reflow with uniform stage scaling.
- Test all text-speed and text-size options without clipping.

### Phase 5: Hardware acceptance

- Complete a full run using only built-in Steam Deck controls.
- Complete all menu, codex, settings, ending, and RGB paths without touchscreen
  or mouse emulation.
- Suspend/resume repeatedly and reconnect an external controller.
- Test docked 1080p and 4K output while preserving 16:10 composition.
- Verify keyboard/mouse parity on 16:9 desktop.

## Definition of done

- Steam Deck is the reference capture and acceptance device.
- The game has one 16:10 composition at every supported display size.
- No gameplay or menu requires touch, mouse emulation, or browser zoom.
- No virtual joystick or touch-only control remains in the shipped interface.
- Steam Input uses semantic actions with correct action-set transitions.
- Keyboard/mouse and controller expose the same capabilities.
- All essential text passes a real-hardware legibility review.
- RGB and future unlockable stories use the same stage and input shell.

