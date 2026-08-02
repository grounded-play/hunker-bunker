# Dialogue Trigger Alignment & S.O.U.L. Stats Grid Layout

This document summarizes the changes made to unify the text-typing dialogue triggers for all milestone boss fights, as well as fixing the character selection stats layout on mobile landscape view.

## Changes Made

### Hero Stats Alignment (S.O.U.L)

#### [style.css](file:///home/caveman/Desktop/icecave/hunker-bunker/style.css)
- Refactored the `.hero-stat-compact-row` layout on both desktop and mobile landscape views to use a consistent three-column grid:
  - **Column 1 (Labels)**: Scaled width of `calc(var(--vu) * 9.5)` to fit label text (e.g. `SPEED`, `O₂ USE`, `LOOT`) cleanly without wrapping.
  - **Column 2 (Pips)**: Flex-based `1fr` width. The level pips/balls inside the flex container are centered perfectly. Since the columns are identical for all rows, the level balls vertically align across all three stats.
  - **Column 3 (Values)**: Scaled width of `calc(var(--vu) * 8)` to align stat text values (e.g. `SLOW`, `HIGH`, `SHORT`) in their own column on the right without spilling or overlapping.

---

### Dialogue Manager & Milestone Triggers

#### [dialogue.js](file:///home/caveman/Desktop/icecave/hunker-bunker/src/dialogue.js)
- Added class-specific dialogue lines for **Hull Expansion** (`HULL_MILESTONE_LINES`), **Radar Node** (`RADAR_MILESTONE_LINES`), and **Reactor Compressor** (`REACTOR_MILESTONE_LINES`).
- Updated `openO2MilestoneDialogue` to accept `goalKey` (defaulting to `'o2Bubble'`), loading dialog lines dynamically.

#### [threeGame.js](file:///home/caveman/Desktop/icecave/hunker-bunker/src/threeGame.js)
- Refactored `_onGoalUnlocked` to be `async`.
- Gated the boss spawning behind the dialogue modal. When a milestone goal is completed, it disables input, closes the terminal, displays the dialogue warning, and spawns the boss only after the user clicks the "Continue" or "Acknowledge" button.

#### [main.js](file:///home/caveman/Desktop/icecave/hunker-bunker/main.js)
- De-duplicated alerts by suppressing minor/non-blocking HUD messages during major milestone dialogues.

## Verification Results

### Automated Tests
- Ran the test suite via `npm run test` using `vitest`.
- **Result**: All 112 tests across 17 test files passed.
