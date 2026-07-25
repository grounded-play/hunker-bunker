# Unlock and Hunker Bunker Integration

## Fictional bridge

The player recovers a corrupted industrial training archive from a terminal
associated with copied human behavior. The record is labeled:

> RGB / SORT_ARM_4A / HUMAN CALIBRATION SOURCE: E. MORALES

Opening it reconstructs a simulation from security footage, payroll records,
terminal logs, and a child’s voice message. Some intimate scenes are explicitly
marked as inferred by the archive. This avoids claiming that Hunker Bunker’s
present-day protagonist literally witnessed Elias’s life.

## Unlock rule

Recommended canonical gate:

- Recover the Chen confession log.
- Recover the cave stasis-box record.
- Open the resulting unified Specimen 0047 codex entry.

On the next return to the title screen, show an unlock toast:

> ARCHIVE SIMULATION RECOVERED  
> RGB: RIVERSIDE GLOBAL ’BOTICS

This uses an existing lore-completion moment, gives the reward thematic weight,
and avoids requiring a specific ending or difficulty.

Optional later tuning: also permit unlock after any completed ending so players
who miss the two records are not permanently excluded.

## Menu behavior

- Add `ARCHIVE SIMS` to the title menu only after the first simulation unlock.
- The submenu shows RGB’s completion state and discovered endings.
- Starting RGB warns if an active field run exists, but does not delete or
  mutate it.
- Exiting RGB returns to its own chapter checkpoint or the title screen.
- Completion never grants field-run power. A cosmetic archive patch or codex
  card is an appropriate reward.

## Save contract

Use a separate local record under the repo’s existing `hb_*` convention:

```js
const RGB_SAVE_KEY = 'hb_minigame_rgb_v1';
```

Suggested shape:

```js
{
  version: 1,
  unlocked: true,
  checkpoint: 'parking_lot',
  endingsSeen: [],
  gameOversSeen: [],
  settings: { hints: 'standard' },
  run: {
    timeBand: 0,
    pain: 'stable',
    evidence: [],
    inventory: [],
    flags: {}
  }
}
```

The Electron save bridge already mirrors `hb_*` local-storage keys, so this
record can participate in the existing save-file path without inventing a
second persistence system.

## Runtime architecture

Hunker Bunker currently runs Three.js in `src/threeGame.js` inside the Vite and
Electron application. Phaser 3 is not currently listed as a dependency.

Recommended implementation:

- `src/minigames/rgb/` owns pure state, content data, save migration, and the
  optional Phaser scene runtime.
- `main.js` owns title-menu routing and creates/destroys the RGB runtime.
- `index.html` provides one mount container inside the canonical 1280×800
  Hunker Bunker stage.
- `public/minigames/rgb/` owns production assets.
- Electron remains the wrapper; RGB must not create a second window.

Phaser is reasonable for scene composition, hotspots, tweens, and controller
focus. Add it only when implementation begins. A DOM/canvas implementation is
also viable; the state and content modules should not depend on Phaser so the
choice remains reversible.

## Proposed code layout

```text
src/minigames/rgb/
  index.js
  content.js
  state.js
  state.test.js
  save.js
  save.test.js
  input.js
  runtime.js
  scenes/
    ParkingLotScene.js
    WarehouseScene.js
    IncidentReviewScene.js
    MediKioskScene.js
    ServerRoomScene.js
    SectorFourScene.js

public/minigames/rgb/
  backgrounds/
  characters/
  objects/
  presentation/
  audio/
```

## Events

Keep the mini-game loosely coupled through window events:

- `rgb-started`
- `rgb-checkpoint { checkpoint }`
- `rgb-ending-reached { endingId }`
- `rgb-completed { endingId, evidenceCount }`

The last event can update the archive menu and an optional achievement. Do not
forward fictional in-game resource totals into Hunker Bunker’s main economy.

## Acceptance criteria

- Unlock is deterministic and persists after reload.
- RGB launches and exits without losing an active field-run save.
- Steam Deck controls and keyboard/mouse can each complete every required
  action; touch and mobile layouts are out of scope.
- A production Electron build loads all RGB assets without network access.
- RGB respects global text speed, reduced flashing, shake, audio, and bindings.
- RGB preserves Hunker Bunker’s 16:10 composition at every host aspect ratio.
- Each ending and game over has a unit-tested state predicate.
- Save version migration and corrupt-save recovery are tested.
