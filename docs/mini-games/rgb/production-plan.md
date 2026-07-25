# Production Plan

## Phase 0: Narrative lock

- Confirm the archive-simulation framing and unlock gate.
- Sensitivity-read the healthcare, workplace injury, and labor material.
- Lock the three endings and the exact limits of player agency.
- Decide whether Lucia has voice acting or text/audio-wave presentation only.

**Exit:** No unresolved story decision changes required scenes or assets.

## Phase 1: State prototype

- Implement pure state transitions and ending predicates.
- Add save schema, migration, and corrupt-save recovery.
- Build text-only scene fixtures and unit tests.
- Verify the unlock event against the codex completion gate.

**Exit:** Every route completes in tests without rendering.

## Phase 2: Gray-box runtime

- Add the title-menu route and isolated mount lifecycle.
- Implement hotspot focus, inventory, dialogue, recap, and choices inside the
  shared 1280×800 presentation stage.
- Gray-box all six chapters.
- Complete Steam Deck-only and keyboard/mouse-only paths.

**Exit:** A player can reach all outcomes with placeholder shapes.

## Phase 3: Asset pass

Suggested parallel lanes after the asset manifest is approved:

- **Environment lane:** backgrounds, lighting states, effects plates
- **Character/object lane:** Elias, Marisol, HR, 4A, kiosk arm, inventory
- **Presentation/audio lane:** diegetic surfaces, ambience, SFX, optional VO;
  reuse shared type, focus, subtitle, and glyph systems

Each asset should be reviewed in a 1280×800 capture before final export.

**Exit:** All required asset IDs resolve locally in an offline Electron build.

## Phase 4: Narrative and accessibility pass

- Load final dialogue/content data.
- Tune hint ladder and authored time bands.
- Add subtitle, reduced-flash, non-timed, and screen-shake behaviors.
- Test color-independent warnings and minimum readable type on Steam Deck.

**Exit:** Accessibility checklist passes on browser and packaged builds.

## Phase 5: Acceptance

- Test fresh unlock, migrated save, and corrupt save.
- Test suspend/resume and repeated launch/exit on Steam Deck hardware.
- Complete every RGB interaction without touchscreen or mouse emulation.
- Verify docked and desktop output preserve the same 16:10 composition.
- Verify an active Hunker Bunker run survives entering RGB.
- Test every ending and retry checkpoint.
- Confirm no runtime CDN or network dependency.
- Capture final screenshots and verify content warning placement.

## Content warning

Before launch, present a brief skippable notice:

> Depicts workplace injury, medical-access stress, child illness discussed
> off-screen, fire, and possible character death.

## Explicitly deferred

- Additional archive simulations
- Full voice cast
- Localization beyond externalized-string readiness
- Steam achievement or store-page claims
- Leaderboards, scores, and gameplay rewards
