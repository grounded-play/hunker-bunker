# Homebase Console and Run-Flow Overhaul

**Date:** 2026-09-21  
**Status:** Implemented 2026-09-21  
**Scope:** Homebase consolidation, run-flow copy, responsive layout, generated background plate, and regression coverage

## Implementation Record

- Removed the blocking Roster modal and its Homebase command.
- Integrated callsign, randomizer, operator ID, and career telemetry into `#menu`.
- Preserved fabricated-output equipping in Fab Bay and pre-mission fitting in Armory.
- Updated the forward sequence to **ENTER ARMORY → CONTINUE TO DEPLOYMENT → DEPLOY**.
- Added and integrated `public/menu_bg_v3.webp`, rendered against the live bottom-right advance-slot geometry.
- Updated localization, controller/input registries, shared Playwright helpers, and roster-gate tests.

## Decision Summary

Replace the current pre-run path—Title → blocking Operator Roster modal → Hero Select → Armory → Tactical Net—with one coherent three-stage preparation flow:

1. **Homebase Command Console (`#menu`)** — identify the operative, review career history, select a frame, and access persistent base facilities.
2. **Pre-Mission Armory (`#armory-screen`)** — configure equipment and appearance in the existing full 3D fitting space.
3. **Deployment Console (`#multiplayer-modal`)** — choose the mission/network mode, verify readiness, and launch.

The standalone `#roster-modal` is retired after its responsibilities are redistributed. `NEW RUN` opens Homebase directly after the existing door transition. The primary Homebase action becomes **ENTER ARMORY**, occupying the shared bottom-right advance slot.

This consolidation is the architectural change. The new background is a supporting asset and must be rendered against the approved, measured layout—not used to determine the layout.

## Why This Change

The recent move of `#start-game` into `.hb-advance-slot` exposed two related problems:

- `menu_bg_v2.webp` and the three-column composition were authored for a different action location. The button now competes with the frame cards and floats over decorative structure.
- A new run opens `#menu` and immediately covers it with `#roster-modal`. The modal confirms an identity before revealing another preparation screen, although both belong to the same Homebase decision space.

The result is redundant confirmation, unclear hierarchy, and a background plate that no longer agrees with the interactive geometry.

## Target Player Flow

```text
TITLE
  NEW RUN
     ↓ existing door transition
HOMEBASE COMMAND CONSOLE
  Callsign + operator ID
  Career telemetry
  Frame selection + preview
  Persistent base facilities
  [ENTER ARMORY]
     ↓
PRE-MISSION ARMORY
  Weapon / attachment / finish
  Chassis polish / voice / HUD fitting
  [CONTINUE TO DEPLOYMENT]
     ↓
DEPLOYMENT CONSOLE
  Solo / Daily Ops / Co-op / PvP
  Contract, seed, squad and relay readiness
  [DEPLOY]
     ↓
INTRO / GAMEPLAY
```

`CONTINUE` remains a distinct title action. This change must not reset a saved run or force an active Act 2 continuation through new-run setup. Existing continuation and Armory-bypass rules remain authoritative unless separately redesigned.

## Responsibility Boundaries

### Stage 1 — Homebase Command Console

Homebase answers: **Who am I taking, and what persistent bunker services are available?**

- Operative callsign input, randomizer, and immutable operator ID.
- Career telemetry: deepest sector, total distance, hostile eliminations, and recoverable black-box state.
- Scout/Tank/Engineer selection and the live character preview.
- Frame abilities, S.O.U.L. stats, and a read-only field-loadout summary.
- Persistent services: Fab Bay, Steam Vault, Archive, Codex, Dossier, Archive Sims, and Achievements where unlocked.
- One forward action: **ENTER ARMORY**.

Remove the current `ROSTER` command. Its identity and telemetry content is already on Homebase, while its editable gear content belongs in the Armory. This prevents the retired modal from surviving as a second route to the same information.

### Stage 2 — Pre-Mission Armory

The Armory answers: **What am I wearing and carrying?**

- Weapon platform and attachment selection.
- Fabricated weapon equipment currently exposed by `#roster-weapon-grid`.
- Weapon finish, suit/chassis polish, decal/patch surfaces where supported, voice pack, and HUD fitting.
- A visible summary of the selected frame and callsign for continuity.
- Back returns to Homebase without discarding selections.
- Forward is renamed from **EMBARK TO BUNKER** to **CONTINUE TO DEPLOYMENT**.

If an item can only be acquired in Fab Bay or managed in Steam Vault, Armory shows its equipped state and links to that facility; it does not duplicate acquisition/store UI.

### Stage 3 — Deployment Console

The Deployment Console answers: **Where and with whom am I deploying?**

- Solo, Daily Ops, Co-op, and PvP mode selection.
- Contract/seed details, squad roster, relay status, and ready state as applicable.
- The only action that begins the run: **DEPLOY** (or a mode-specific localized equivalent).

This keeps multiplayer setup at the end of the shared preparation path, preserving the intent already documented in `startNewTacticalRunFlow()` and `src/multiplayerLobby.js`.

## Homebase Layout Contract

Use a three-bay grid inside the existing framed `#menu` stage. Percentages are starting targets, not asset coordinates; final measurements must come from the implemented 1280×800 reference layout.

| Bay | Target share | Contents | Reserved behavior |
| --- | ---: | --- | --- |
| Operations | 28% | Sector radar, compact career telemetry, two-column facility grid | May scroll internally only at constrained heights |
| Operative | 42% | Callsign/ID header, 3D preview, frame detail, S.O.U.L. summary | Preview retains the largest uninterrupted aperture |
| Frame selection | 30% | Three frame cards and Return to Main Menu | Bottom clearance is reserved for the global advance dock |

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ HOMEBASE COMMAND CONSOLE                                      SETTINGS  │
├──────────────────┬──────────────────────────┬────────────────────────────┤
│ SECTOR RADAR     │ CALLSIGN [________] [↻] │ SCOUT                      │
│                  │ ID: op-…                 │ TANK                       │
│ CAREER TELEMETRY │                          │ ENGINEER                   │
│                  │    3D OPERATIVE STAGE    │                            │
│ BASE FACILITIES  │                          │ RETURN TO MAIN MENU        │
│                  │ LOADOUT / S.O.U.L.       │        [ ENTER ARMORY → ]  │
└──────────────────┴──────────────────────────┴────────────────────────────┘
```

Layout requirements:

- Keep callsign and telemetry as normal DOM content inside their bays, not absolutely positioned over the art.
- Reserve the advance slot in grid geometry even though `#start-game` remains a sibling of `#menu` to avoid the documented transform/containment issue.
- Derive background apertures from CSS custom properties or a documented reference overlay so DOM and art share one geometry contract.
- No label, input, or button may depend on pixels in the background plate for legibility or affordance.
- At 1280×800, all frame cards, Back, and Enter Armory must be visible without page scrolling or overlap.
- At constrained sizes, reduce gaps/type and allow Operations to scroll before shrinking interactive targets below accessibility minimums.

## Roster Consolidation Map

| Current roster responsibility | New owner | Implementation note |
| --- | --- | --- |
| `#roster-callsign-input` | Homebase Operative bay | Preserve sanitization, 16-character limit, persistence, and random generation |
| `#roster-randomize-btn` | Homebase Operative bay | Bind once; retain audio and pulse feedback |
| `#roster-id` | Homebase Operative bay | Read-only profile identity |
| `#roster-run-telemetry` | Homebase Operations bay | Show career/current saved-run values; a fresh run must not erase career history merely to display zeroes |
| `#roster-weapon-grid` | Armory | Merge equip behavior into existing Armory slots/picker instead of cloning the grid |
| Patch/decal/finish summary | Armory, with Vault links | One equipment truth; Vault remains the ownership/store surface |
| `#roster-fab-count` | Fab Bay status on Homebase | Keep concise status under the facility command |
| `#roster-confirm-btn` | Removed | `#start-game` is the single Homebase forward action |
| `#roster-btn` | Removed | No modal reopen path after consolidation |

Before deleting roster markup, confirm feature parity for fabricated weapon equipping. `renderRosterModal()` currently owns this behavior as well as presentation; extract the equip logic into a reusable controller or move it into the Armory data flow first.

## Interaction and State Rules

- `NEW RUN` still clears run save data, black-box state, checkpoint state, and stale multiplayer session state at the existing transition boundary.
- Callsign/profile identity persists and is not cleared with run state.
- On first profile use, Homebase may generate a callsign once. Revisiting Homebase must not silently reroll it.
- Text entry owns keyboard input while focused. Controller focus initially lands on callsign only when a new/default identity requires attention; otherwise it lands on the selected frame or Enter Armory.
- Callsign edits persist through the existing `profile.setCallsign()` sanitization path. No extra confirmation is required.
- Escape/B from Homebase returns to Title; Back from Armory returns to Homebase; Back from Deployment returns to Armory.
- The three forward controls share position and visual language, but use stage-specific text and accessible names.
- Remove `#roster-modal` from focus-root/blocking-overlay registries when its DOM is deleted (`src/inputActions.js`, `src/threeGame.js`, and related tests).

## Background Plate Specification

### Deliverable

- Runtime asset: `public/menu_bg_v3.webp`.
- Baseline canvas: 1280×800, matching the current 16:10 reference stage.
- Retain a source/master render in the project asset workflow if available.
- Keep `menu_bg_v2.webp` during implementation for comparison and rollback; remove it later only if no references remain.

### Composition

- Biomechanical brutalist bunker console: matte dark metal, restrained amber status light, hydraulic and ribbed structural framing.
- Three quiet recessed bays aligned to measured DOM bounds.
- A visually dominant, uncluttered center aperture behind the operator projection.
- A purpose-built lower docking recess in the right bay aligned to the shared advance slot.
- Decorative highlights outside text and focus-ring zones.
- No baked-in text, icons, labels, fine scanlines, characters, weapons, or UI glows.

### Dock Geometry

The current shared-slot values are the starting contract:

```css
--advance-right: 8vu;
--advance-bottom: 4.5vu;
--advance-width: 36vu;
--advance-height: 5.6vu;
```

Do not send `vu` values directly to image generation as image coordinates. After the layout pass, capture the actual button rectangle relative to `#menu` at 1280×800, convert it to pixels and percentages, and use that measured safe rectangle in the render brief. Give the bezel internal tolerance so responsive shifts do not expose misalignment.

### Render Acceptance

- A DOM-overlay screenshot aligns all panels and the advance dock at 1280×800.
- The plate crops gracefully at 16:9 and ultrawide without placing critical hardware beneath content.
- Contrast remains sufficient with live panels at final opacity.
- WebP dimensions are exactly 1280×800 and compression is visually clean. Optimize size after visual approval rather than treating 40–75 KB as a hard target.
- A CSS-only fallback remains usable if the image fails to load.

## Implementation Sequence

### Phase 0 — Baseline and Geometry Lock

1. Capture Homebase screenshots and bounding rectangles at 1280×800, 1920×1080, a short viewport, and ultrawide.
2. Record bounds for `#menu`, all three bays, and `.hb-advance-slot`.
3. Confirm keyboard/controller focus order and the complete current new-run path.
4. Use these captures as regression evidence, not target design.

### Phase 1 — Separate Roster Behavior from Presentation

1. Split `renderRosterModal()` into reusable identity/telemetry refresh and equipment actions.
2. Move fabricated-weapon equip behavior into the Armory controller/UI.
3. Ensure cosmetic summaries use the ownership/equipped state already shared by Armory and Vault.
4. Add focused unit coverage for callsign initialization, sanitization, persistence, and no-reroll behavior.

This phase prevents modal deletion from silently deleting capabilities.

### Phase 2 — Consolidate Homebase DOM and Flow

1. Add the operator identity header to `.preview-box` and career telemetry to `.map-box` in `index.html`.
2. Remove `#roster-btn`, `#roster-modal`, `#roster-confirm-btn`, and roster-only markup after Phase 1 parity.
3. Refactor `startNewTacticalRunFlow()` in `main.js` to refresh Homebase data and stop opening a modal.
4. Rename/localize `#start-game` to **ENTER ARMORY**.
5. Update input/focus registries and back navigation.

### Phase 3 — Reflow and Responsive Hardening

1. Adjust `.module-row` toward 28/42/30 while preserving real minimum widths.
2. Remove the current `.map-box { width: 80% }` compensation and give each bay an explicit footprint.
3. Reserve right-bay dock clearance in layout rather than relying on visual coincidence.
4. Consolidate roster CSS into Homebase component styles; remove modal-only styles after references are gone.
5. Verify focus rings, pointer targets, localization expansion, and internal scrolling.

### Phase 4 — Render and Integrate `menu_bg_v3.webp`

1. Export a clean 1280×800 layout guide with measured bay and dock overlays.
2. Render candidate plates from the approved art brief and geometry guide.
3. Review candidates with the live DOM overlaid; select or correct the best plate.
4. Add the optimized WebP and switch the `#menu` reference in `style.css`.
5. Tune only shared inset variables and panel opacity here; do not distort DOM layout to rescue mismatched art.

### Phase 5 — Copy, Tests, and Cleanup

1. Update all supported locale keys for **ENTER ARMORY** and **CONTINUE TO DEPLOYMENT**; run the localization audit.
2. Update shared Playwright helpers so the canonical run path no longer searches for `#roster-confirm-btn`.
3. Update every test that conditionally closes/confirms `#roster-modal`, not only the two initially identified specs.
4. Remove stale selectors, registry entries, comments, and CSS only after a repository-wide search confirms no references.
5. Run targeted flow/layout checks, then full unit and end-to-end suites.

## Expected File Touchpoints

Primary:

- `index.html`
- `style.css`
- `main.js`
- `src/armoryUi.js`
- `src/inputActions.js`
- `src/threeGame.js`
- `src/locales/*.json`
- `public/menu_bg_v3.webp`

Known tests/helpers encoding the roster gate or Homebase focus behavior:

- `tests/e2e/helpers.js`
- `tests/e2e/boot-and-menu.spec.js`
- `tests/e2e/controller-focus.spec.js`
- `tests/e2e/intro-deployment-gate.spec.js`
- `tests/e2e/character-preview.spec.js`
- `tests/e2e/rgb-archive-sim.spec.js`
- `tests/e2e/sky-dome.spec.js`
- `tests/e2e/trailer/capture-decision-montage.spec.js`
- `src/inputActions.test.js`

Re-run repository-wide searches for `roster-modal`, `roster-confirm-btn`, `roster-btn`, and `renderRosterModal` during implementation; this is a starting inventory, not an exhaustive deletion checklist.

## Verification and Acceptance Criteria

### Flow

- NEW RUN completes its door transition and reveals Homebase with no roster modal.
- Callsign/randomize/ID work in Homebase and persist through Homebase → Armory → Back.
- ENTER ARMORY opens Armory; CONTINUE TO DEPLOYMENT opens Tactical Net; DEPLOY starts the selected mode.
- Back navigation is symmetrical and does not clear profile or equipment state.
- Continue, Daily Ops, solo, and multiplayer launch semantics remain intact.

### Functional parity

- Every fabricated weapon equipable from the roster remains equipable in Armory.
- Equipped patch, decal, finish, polish, voice, weapon, and frame reach gameplay correctly.
- Career telemetry shows correct persisted values and does not reset merely because NEW RUN was selected.
- No hidden roster overlay blocks pointer, keyboard, controller, or game input.

### Layout and accessibility

- At 1280×800, no bay or advance control overlaps, clips, or requires page scrolling.
- At 1920×1080, short viewport, and ultrawide, the composition is usable and the dock remains visually credible.
- Keyboard and controller reach callsign, facilities, frame cards, Back, and Enter Armory predictably.
- Callsign has a visible label; icon-only actions have localized accessible names; focus remains visible.
- Reduced-motion behavior remains valid for door and pulse transitions.

### Commands

```bash
npm test
npm run i18n:audit
npx playwright test tests/e2e/boot-and-menu.spec.js tests/e2e/controller-focus.spec.js tests/e2e/intro-deployment-gate.spec.js tests/e2e/character-preview.spec.js tests/e2e/rgb-archive-sim.spec.js tests/e2e/sky-dome.spec.js
```

Run the full Playwright suite after targeted checks pass because shared boot helpers and overlay registries affect gameplay specs beyond the visible menu.

## Risks and Mitigations

- **Roster deletion removes weapon equip functionality.** Extract and test behavior before deleting markup.
- **Background and DOM drift apart.** Lock geometry first, render from measured overlays, and retain bezel tolerance.
- **Career data is confused with run-reset state.** Separate profile/career and active-run sources and test NEW RUN reset behavior.
- **Text input harms controller navigation.** Define initial focus and directional neighbors; suppress gameplay hotkeys while editing.
- **Shared advance positioning breaks under transforms.** Preserve the current sibling placement of `#start-game` until a tested common stage shell replaces it.
- **Localization expansion breaks the dock.** Use responsive type and width checks; never bake English copy into art.

## Explicit Non-Goals

- Redesigning the gameplay HUD or in-world bunker.
- Changing weapon balance, frame stats, economy, or unlock rules.
- Replacing Fab Bay, Steam Vault, Archive, Codex, or Dossier flows.
- Rewriting the door-transition system.
- Generating the final background before layout approval.

## Review Gate Before Execution

Approve these decisions before implementation:

1. Retire the Roster modal and Roster command after capability migration.
2. Use **ENTER ARMORY → CONTINUE TO DEPLOYMENT → DEPLOY** as the forward labels.
3. Keep identity/profile data persistent across NEW RUN while resetting only run-scoped data.
4. Treat Armory as the sole equipment-editing surface and Vault/Fab Bay as ownership/acquisition surfaces.
5. Approve the DOM layout at reference sizes before commissioning `menu_bg_v3.webp`.
