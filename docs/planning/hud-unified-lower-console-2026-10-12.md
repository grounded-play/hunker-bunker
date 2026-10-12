# Unified Lower Console HUD Plan (2026-10-12)

**Status:** Approved direction; implementation not started  
**Branch:** `dev/sprint-52`  
**Supersedes:** the three separated dock housings and the temporary lower-left/lower-right side rails  
**Keeps:** the persisted `hb_hud_layout=dock` value so existing settings and saves do not need migration

## 1. Outcome

Gameplay UI becomes one readable lower console, not three detached panels and not a collection of cards around four screen edges. The console contains the map, current room, vitals, resources, weapon state, abilities, objective, and utility controls. Temporary information attaches to the console as styled overlays that rise from its upper edge and disappear when resolved.

The implementation must solve four playtest findings together:

1. The HUD is visually fragmented and requires excessive eye travel.
2. The compact map is only a 56-unit circle even though navigation is important.
3. Important labels are too small; full-map room names are currently only 8–9 px and compact-map names are intentionally suppressed.
4. Chat controls appear during solo play even though player chat only has meaning inside a live multiplayer session.

## 2. Layout decision

The console is a single chassis with internal dividers. Dividers organize information but do not create separate floating panels, borders, shadows, or gaps.

```text
                         ATTACHED OVERLAY RAIL
          [room discovery] [interaction] [warning/transmission]
       ┌──────────────────────────────────────────────────────────┐
       │ MAP + PLACE       │ SUIT + INVENTORY │ MISSION + ACTION │
       │ CURRENT ROOM      │ HP  O₂  HULL     │ NEXT OBJECTIVE   │
       │ ┌──────────────┐  │ AMMO / RELOAD    │ ABILITIES        │
       │ │ named map    │  │ MED TECH COIN    │ SETTINGS [CHAT*] │
       │ └──────────────┘  │ SHELL / STATUS   │ * multiplayer    │
       └──────────────────────────────────────────────────────────┘
                        ONE STYLED HOUSING
```

The world-space crosshair, damage direction, interaction target marker, and full-screen modals remain outside the console because they are spatial feedback rather than dashboard information.

### Reference geometry

All values use the existing HUD unit `--u`.

| Property | Reference | Steam Deck behavior |
|---|---:|---:|
| Console width | `min(1560u, stage width - 2 × hud margin)` | fills available safe width, approximately 1086 px in the letterboxed 1280×800 stage |
| Console height | `136u` | approximately 109 px at the 0.8 Deck floor |
| Bottom inset | `hud margin` | at least 32 physical px from the Deck stage edge |
| Inner padding | `12u 16u` | remains at least 10×13 px |
| Column split | 30% map / 38% suit / 32% mission | same order at every supported aspect ratio |
| Overlay rise limit | `min(180u, 22vh)` | overlays queue instead of covering the operator |

The panel may widen on ultrawide displays but its inner content does not spread beyond readable line lengths. At 4K, the existing proportional `--hud-u: 2px` scaling keeps the console physically equivalent to 1080p.

## 3. Information hierarchy and type sizes

The console has three type tiers. No live gameplay label may fall below the Deck floor.

| Tier | Examples | Reference size | Deck floor |
|---|---|---:|---:|
| Primary | current room, objective, ammo, critical warning | `18u`, weight 800–900 | 14 px |
| Secondary | O₂/Hull values, weapon name, ability state, named map rooms | `15u`, weight 700–800 | 12 px |
| Utility | resources, day/time, distance, control glyphs | `13u`, weight 700 | 11 px |

Primary values must use tabular numerals where appropriate. Uppercase tracking is reduced on long room and objective names because letter spacing currently consumes width without improving handheld reading.

Information that is not actionable now becomes progressive disclosure:

- Run modifiers and bounty collapse into one status ticker on the console's upper-left rim.
- Only the next objective is persistent. Expanding it opens the tactical map sidebar rather than growing the gameplay console.
- Only active statuses appear; inactive status slots do not reserve visible boxes.
- Radio, tutorial, room discovery, and pickup confirmation use the overlay rail and queue by priority.
- Settings becomes a small console utility control. Chat occupies the adjacent slot only in multiplayer.

## 4. Larger map and room names

### Current implementation to reuse

The world already provides the needed data:

- `src/locationNames.js` deterministically names rooms and hallways and supplies localized designators.
- `ThreeGame.getTacticalMapState()` returns scan-gated `detailedChunks[].labels`.
- `drawTacticalMapOverlay()` already renders those labels on the full tactical map.
- `player-location-changed` already updates the current scanned location.

The presentation failures are explicit in current code:

- `#hud-blueprint-canvas` is rendered as a 56u circle in dock mode.
- `drawTacticalMapOverlay(..., compact=true)` suppresses all room labels.
- Full-map labels use hard-coded 8 px and 9 px fonts.
- The canvas backing store remains `300×180` regardless of its displayed size or device pixel ratio.

### New map contract

Replace the boolean `compact` argument with a rendering mode:

```javascript
drawTacticalMapOverlay(canvasId, { mode: 'hud' | 'full', pixelRatio, labelBudget })
```

The HUD map is a wide rectangular blueprint, not a cropped circle. Its displayed area fills the map column beneath a persistent current-room heading.

HUD-map label policy:

1. Always show the current scanned room/hall name in the heading above the map.
2. Draw the current room name on the map near the player marker when it can clear the marker.
3. Draw up to three nearby scanned **room/site** labels inside the map viewport.
4. Do not draw ordinary hallway labels unless the hallway is the current location.
5. Prefer objective, crash site, camp/hive, foundry, and current-room labels over generic rooms.
6. Reject labels whose padded text rectangles overlap; retain the higher-priority or nearer label.
7. Clamp labels to the canvas safe inset and abbreviate only the designator suffix as a last resort. Never scale text below the floor.

Full-map label policy:

- Raise generic labels from 8 px to a responsive 12–14 px equivalent.
- Raise highlighted rooms/sites from 9 px to 14–16 px equivalent.
- Use the same collision resolver with a larger label budget instead of drawing every label on top of every other label.
- Keep unscanned locations unnamed; discovery remains tied to radar progression.

Canvas sizing:

- A `ResizeObserver` updates each canvas backing store to `CSS size × min(devicePixelRatio, 2)`.
- Drawing coordinates remain in CSS pixels by applying the pixel-ratio transform once per frame.
- Cache measured label widths by `(locale, font, text)` and clear that cache on `locale-changed`.
- The HUD map must remain within a 0.4 ms median CPU budget on Steam Deck; label selection runs only when map state, locale, zoom, or canvas size changes.

## 5. One housing with stylized overlays

The visual stack is one console with five ordered layers:

| Layer | Purpose | Rule |
|---|---|---|
| 0 | shadow/grounding | narrow gradient only; no full-screen vignette |
| 1 | opaque console glass | solid/gradient background; no `backdrop-filter` over WebGL |
| 2 | live content | map, bars, text, icons, controls |
| 3 | frame overlay | transparent class/theme frame; `pointer-events:none` |
| 4 | state overlay | cracks, frost, infection, blood, warning pulses; never crosses text safe zones |

The three current `.dock-housing--map/status/arms` assets cannot simply be stretched together; their seams and independent frames are the visual fragmentation being removed. Create one nine-slice console overlay per class at a shared aspect ratio and a neutral CSS fallback so functionality never depends on art readiness.

Overlay art contract:

- transparent WebP, reference canvas `1560×136`, plus source PNG/PSD where available;
- identical transparent content windows and divider coordinates for Scout, Tank, and Engineer;
- frame alpha inside text/map safe zones ≤ 24/255;
- no baked text, numbers, icons, portraits, map imagery, or control glyphs;
- reactive wear is a separate overlay so damage state does not require swapping the base housing;
- generated placement remains script-owned, but the generator emits one console rectangle instead of three housing rectangles.

## 6. Overlay rail behavior

All transient cards attach to the console's top edge. They do not create permanent side rails.

Priority order:

1. fatal/critical state and boss phase;
2. interaction prompt;
3. objective completion or failure;
4. room discovery / expedition briefing;
5. radio/tutorial transmission;
6. pickup and minor status confirmation.

Rules:

- Show at most one center overlay and one edge overlay simultaneously.
- A higher-priority overlay queues or collapses lower-priority content; it never overlaps it.
- Interaction prompts remain centered over the console because they are the immediate action.
- Transmissions dock over the mission column and may include a portrait, but their text column must be at least 260u wide.
- Boss/hazard information spans the console's upper rim rather than returning to the top of the screen.
- Room discovery uses a short two-line overlay: room name plus role/subtitle. It auto-dismisses but remains readable on the map.
- Reduced-motion mode removes slides and pulses while retaining opacity/state changes.

## 7. Multiplayer-only chat

Every `[data-player-chat-open]` trigger—title/menu, Armory, multiplayer screen, settings, and gameplay—must follow one availability authority. CSS phase checks alone are insufficient because stale multiplayer globals have caused previous solo-state leaks.

Add a small chat-availability controller driven by multiplayer lifecycle events:

```text
multiplayer room created/joined -> available
relay reconnecting in same room -> available but composer disabled
multiplayer run deployed       -> available
leave/disconnect/solo start    -> unavailable
```

When unavailable:

- every chat trigger is `hidden`, `inert`, and `aria-hidden=true`;
- the chat modal closes immediately and returns no focus to a now-hidden trigger;
- the transient player-chat feed is emptied and cannot display new lines;
- unread badges reset with the detached chat transport;
- no empty space remains in the console utility row.

Use an explicit document state such as `data-multiplayer-active="true"` set by the multiplayer/session controller. `playerChat.ready` controls whether sending is enabled, but must not be the visibility authority because reconnecting players are still in multiplayer while the socket is temporarily unready.

Required transitions and tests:

- fresh boot and solo run: no chat trigger anywhere;
- connected co-op and PvP lobby: chat visible;
- deployed co-op and PvP run: console chat slot visible;
- reconnect: trigger remains visible, disconnected status shown;
- leave room, return to title, start solo after multiplayer, and Daily Ops: chat hidden and closed;
- controller focus graph never lands on a hidden chat slot.

## 8. DOM and code migration

### Target DOM

Create one static wrapper under `#ui` and move existing live nodes rather than cloning them:

```html
<section id="hud-console" class="hud-console">
  <div class="hud-console__glass"></div>
  <div class="hud-console__map-slot">…existing compass/canvas/location…</div>
  <div class="hud-console__suit-slot">…existing vitals/ship/loot/weapon…</div>
  <div class="hud-console__mission-slot">…existing objective/abilities/utilities…</div>
  <div class="hud-console__frame"></div>
  <div class="hud-console__wear"></div>
</section>
<div class="hud-console-overlays">…prompt and notification lanes…</div>
```

IDs and update ownership stay unchanged, minimizing gameplay-code risk. `HudInformationArchitectureController` may still move the objective drawer into the full tactical map while that modal is open, then return it to the mission slot.

### Files expected to change

| Area | Files |
|---|---|
| Markup and runtime layout | `index.html`, `main.js`, `src/hudInformationArchitecture.js` |
| Console geometry and presentation | `src/styles/expeditionHud.css`, `src/styles/hudInformationArchitecture.css`, generated housing CSS/script |
| Map sizing and labels | `main.js`, preferably extracted into `src/tacticalMapRenderer.js`, plus `src/threeGame.js` only if label metadata needs priority/extent |
| Chat availability | `src/playerChatUi.js`, `src/playerChat.css`, `src/gameController.js`, `src/multiplayerLobby.js` |
| Art | `public/ui/console/`, `art/source/hud-console/`, generation/validation script |
| Tests | HUD layout/readability/information architecture, map labels, player chat, controller focus, UI layout contract |

## 9. Implementation phases

### Phase 0 — Baseline and contracts

- Capture Deck 1280×800, 1920×1080, owner PC 3840×2160, and 3440×1440 gameplay with objective, prompt, transmission, hazard, and long localized strings.
- Add geometry probes for one console, text floors, player keep-out, and overlay limits.
- Record current map draw time and canvas resolution.

### Phase 1 — One functional console

- Add the wrapper and three internal slots.
- Reparent existing elements without changing their update IDs.
- Replace the three housing rectangles and side rails with one CSS fallback chassis.
- Move settings into the mission utility row.
- Keep the old `dock` preference value and remove obsolete placement overrides once parity tests pass.

### Phase 2 — Readability pass

- Apply the three typography tiers.
- Recompose vitals, ammo, resources, abilities, and objective around reading priority.
- Validate 100%, 115%, 130%, and 150% HUD scale without clipping.
- Validate all supported locales, especially German, Russian, Japanese, and Chinese.

### Phase 3 — Map enlargement and naming

- Convert the compact boolean to named render modes.
- Resize the HUD map and backing store responsively.
- Implement current-room heading and compact label selection/collision.
- Raise full-map name sizes and share the label resolver.
- Add pixel and semantic tests for scan gating and label priority.

### Phase 4 — Overlay rail and chat gate

- Move prompt, alert, discovery, briefing, and notification flows into the attached overlay rail.
- Enforce queue/priority limits through the existing HUD information controller.
- Add explicit multiplayer availability state and gate every chat trigger/feed/modal.
- Re-run controller focus and modal-boundary tests.

### Phase 5 — Final stylized housing

- Produce one validated overlay per class and shared state overlays.
- Run frame-alpha/text-safe-zone tests.
- Verify no `backdrop-filter`, texture thrashing, or per-frame DOM measurement reaches Deck.
- Delete the three legacy housing assets only after the unified art passes installed-build acceptance.

## 10. Acceptance gates

### Geometry and readability

- Exactly one persistent gameplay HUD housing is visible.
- The console and its overlays remain in the lower 34% of the stage during ordinary play.
- No persistent UI intersects the central 30% × 34% player/reticle keep-out.
- No gameplay text is smaller than 11 px on Deck; primary values are at least 14 px.
- At 100% scale, no text clips at Deck, 1080p, owner 4K, or ultrawide targets.
- At 150% scale, the console may simplify utility labels but cannot hide vitals, ammo, current objective, current room, or map/player marker.

### Map

- The HUD map is visibly larger than the current 56u disc and uses at least 24% of console width.
- The current scanned room is readable without opening the full map.
- Up to three nearby scanned rooms can be named without label overlap.
- Unscanned rooms never leak names.
- Full-map room labels meet the secondary text tier and avoid collisions.
- HUD-map rendering remains within a 0.4 ms median Deck CPU budget outside scan animation.

### Overlays and chat

- Prompts, alerts, discoveries, and transmissions visually attach to the console and never cover each other.
- Boss/hazard information remains readable without occupying the top third.
- Chat is absent from every solo surface and present throughout a live multiplayer session, including reconnect state.
- Leaving multiplayer closes chat, clears feed/badges, removes it from controller focus, and does not leave a blank console slot.

### Installed acceptance

- One 20-minute Steam Deck run and one 10-minute 4K PC run confirm couch/handheld readability.
- Captures include quiet exploration, combat, interaction prompt, room discovery, objective update, transmission, low O₂, boss/hazard, and multiplayer chat.
- The player can identify current room, route, health/O₂, ammo, next objective, and ready ability in one glance without scanning another screen edge.

## 11. Explicit removals after acceptance

- Three independent `.dock-housing--map/status/arms` and `.dock-glass--*` layouts.
- Lower-left sector card and lower-right objective/radio side stacks.
- Compact circular-map crop and its 56u geometry.
- Hard-coded 8/9 px tactical-map labels.
- Solo CHAT buttons in menu, Armory, settings, and gameplay.
- Legacy runtime column pinning used only to keep detached HUD cards from overlapping.

