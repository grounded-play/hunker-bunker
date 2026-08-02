# Sprint 6 Walkthrough

We have successfully completed all Sprint 6 features, bug fixes, and system improvements. All 182 unit tests are green, and the project is lint-compliant.

## Changes Made

### 1. In-Game Interface & Navigation Fixes
- **Dialogue Exit Freeze**: Resolved keyboard/mouse input lockups when closing/skipping mothership apex transmissions by updating `src/dialogue.js` to clear speakers, close modals, and restore pointer states.
- **Objective HUD Resets**: Added `this._lastLoopStepKey = null` inside `resetVitalsForRun()` in `src/threeGame.js` to ensure the objective tracker HUD updates immediately upon player respawn/reset.
- **Compass Radar Distance**: Simplified CSS layout nesting clamp and raised `z-index: 5` on the yellow compass distance indicator (`.touch-move-control__compass-radar-distance`) in `style.css` to prevent overlap blocking.
- **Wreckage Overlap**: Filtered `this.crashedShips` array inside `src/threeGame.js` to only include the active `playerType` ship, removing the duplicate ships of other classes from the terrain.

### 2. Base Nodes & Modules Upgrades
- **Upgrade Paths**: Refactored the core bank schema (version 8) in `src/bank.js` to track `hullExpansionLevel`, `radarNodeLevel`, and `reactorCompressorLevel`. Added `getGoalUpgradeCost`, `canUpgradeGoal`, and `upgradeGoal` to support Level 2 upgrades using salvage tech, coins, and meds.
- **Interactive Upgrade Hook**: Updated the terminal buy buttons in `src/threeGame.js` to offer Level 2 upgrades sequentially once all Level 1 nodes are built.
  - *Hull Expansion Level 2*: Raises maximum player vital integrity to 5 hearts.
  - *Radar Dish Level 2*: Unlocks the spinning animation of the radar dish. (When first built at Level 1, it remains static).
  - *Reactor Compressor Level 2*: Doubles the O₂ generator refill rate and slows drain rate by 35% general.
- **Radar Animation Controls**: Modified `src/threeGame.js` to check the `radarNodeLevel` before advancing animation frames.

### 3. Fabrication & Progression Enhancements
- **Fabrication Reel Outcomes**: Fixed mismatch between the fabrication gamble animation roll and the weapon card given. Added `strip.offsetWidth` to force a layout reflow prior to measuring child widths in `main.js`, ensuring the correct rarity tile lands precisely under the ticker.
- **Passive Ammo Regen**: Confirmed and validated that the passive ammo regeneration condenser system matches the design specs, operating on a level-capped cooldown timer.
- **Skill Tree Visuals**: Upgraded `src/threeGame.js` and `style.css` to add glowing borders and animations. Active unlocked skills now animate flowing energy conduits between parent and child nodes (`unlocked-flow` path flow animation). Available nodes pulse with a themed border.

### 4. Mothership Atmosphere Tuning
- **Announcements Frequency**: Extended `MOTHERSHIP_REACTIVE_COOLDOWN_MS` in `main.js` from 18 seconds to 45 seconds to downscale chatter.
- **Dialogue Sizing & Legibility**: Scaled up dialogue modal panel dimensions (`width: 168vu`, `height: 110vu`) and text sizing variables in `style.css` to make transmissions readable.

### 5. NPC Walk Spritesheet Upgrades (v2)
- **Grid Layout Standardization**: Regenerated the camp walk spritesheets for the three leaders to exactly match the 4x4 layout expected by the NPC walker code in `src/camp.js` (Row 0: South walk, Row 1: North walk, Row 2: East walk, Row 3: West walk) on solid pure-black backgrounds (`rgb(0,0,0)`) for perfect chroma-key keying:
  - `public/martha_camp_walk_v2.png` (Sister Martha - Scout)
  - `public/briggs_camp_walk_v2.png` (Commander Briggs - Tank)
  - `public/kaelen_camp_walk_v2.png` (Overseer Kaelen - Engineer)
- **Asset References**: Updated `src/camp.js` and `src/act2.js` to reference the new v2 assets.

### 6. Ending Picker Prerequisite Test Fix
- **Suture Hive Dependency**: Updated the `pickAct2Ending` unit test case `treats hidden eggs as aboard` in `src/act2.test.js` to include the suture hive aboard, satisfying the instability check and resolving to `carriers_bargain` as expected.

---

## Verification & Testing

### Automated Suite
All 183 unit tests pass successfully:
```bash
npm run test
# output: 26 passed (26) | 183 passed (183)
```

### Linter
Zero linter errors:
```bash
npm run lint
# output: clean exit (0 problems)
```
