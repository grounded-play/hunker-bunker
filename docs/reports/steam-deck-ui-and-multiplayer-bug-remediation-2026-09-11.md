# Steam Deck UI and Multiplayer Bug Remediation — 2026-09-11

Status: implemented and locally verified

## Evidence reviewed

The latest exported physical Steam Deck session was
`hunker-bunker-session-2026-09-11T22-58-20-906Z-mtxk4w82-fg0g.json`
(Linux, Steam Deck, build `2.4.1-beta`). It records the multiplayer guest at
`(47, 47)` dying from `pit-fall` at `22:57:34.415`, retrying, and dying from
`pit-fall` at the same coordinate again at `22:57:56.475`. This is a deterministic
unsafe-spawn loop, not ordinary player movement.

## Issues and fixes

### Settings submenus rendered behind Settings

- Root cause: `#settings-popup` used z-index `100010`, while language and
  crosshair dialogs inherited the generic modal z-index `13020`.
- Fix: Settings child dialogs now share a `settings-subpanel` role with z-index
  `100020`. Audio, controls, save-data, language, and crosshair panels all use
  the same stacking contract.
- Acceptance: opening Language or another Settings child places it above the
  Settings panel and transfers focus into the child.

### Armory content obscured Initialize/Embark

- Root cause: a late Armory override changed the already bounded sidebar from
  vertical scrolling to `overflow: visible`, allowing its content to extend
  into the footer row.
- Fix: the center grid row now uses `minmax(0, 1fr)`, the sidebar is vertically
  scrollable with a zero minimum height, and the footer is a non-shrinking
  foreground row.
- Acceptance: at 1280×800 the Initialize/Embark action remains visible and
  clickable while excess bench controls scroll within the sidebar.

### Populated Game Over screen exceeded Steam Deck bounds

- Root cause: compact Game Over rules only activated below 520px high; Steam
  Deck's 800px viewport received the desktop spacing even after score,
  leaderboard, bank notes, and Act 2 summary were added.
- Fix: a 900px-wide/850px-high landscape breakpoint compacts the complete
  debrief, caps it to the viewport, and keeps the action row sticky at its
  bottom edge for unusually long localized text.
- Acceptance: the modal and both actions remain within a 1280×800 viewport.

### Multiplayer spawn inside wreck / repeated fall death

- Root cause: fixed multiplayer offsets were terrain-blind. In PvP the second
  point was `(47, 47)`, outside the authored crash-site apron, and placement
  and respawn used it without floor or collision validation. The default
  `(9, 9)` point also coincides with the visible wreck center.
- Fix: initial positions are now cardinal points around the authored crash
  site, with four metres of co-op separation and six metres for PvP. Local,
  remote, and retry placement additionally search outward for the nearest
  point that passes both the live pit test and normal movement collision test
  (wrecks, modules, solid props, and walls).
- Acceptance: players begin separated, outside the wreck collision volume,
  and a rejected point cannot be reused unchanged on retry when nearby safe
  floor exists. Relocations emit `MULTIPLAYER/spawn-relocated` telemetry.

## Verification

- Unit coverage: deterministic multiplayer plans and safe-spawn search,
  including the reported `(47, 47)` void and overlapping-player cases.
- Browser coverage: Settings stacking plus Steam Deck viewport checks for the
  Armory footer and populated Game Over actions.
- Release follow-up: run one packaged two-account multiplayer session and
  confirm no `spawn-no-safe-tile` or immediate `pit-fall` event appears in the
  next exported host/guest logs.
