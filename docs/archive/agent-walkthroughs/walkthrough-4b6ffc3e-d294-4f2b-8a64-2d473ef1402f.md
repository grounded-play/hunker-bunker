# Walkthrough - Active Goal Purchase & Terminal UI Cleanups

We have successfully implemented the active base building goal feature inside the "CURRENT OBJECTIVE" box of the Bunker Tactical Terminal, and cleaned up the "BANK BALANCE" panel to look more clean, focused, and professional.

## Changes Made

### 1. Terminal Console Layout (`index.html`)
- Renamed the header title `BANK BALANCE` to `CURRENT RUN STATS`.
- Replaced the confusing `0 -> [stored]` carried-to-banked resource grid with clean cells that display only the current stored/banked values (`MED`, `TECH`, `COIN`), hiding the redundant `carried` and `arrow` elements.
- Inserted `#terminal-objective-purchase-zone` (with `#terminal-objective-cost-outline` and `#terminal-objective-buy-btn`) inside `#terminal-current-objective`.

### 2. Styling Enhancements (`style.css`)
- Styled `.terminal-bank-grid` to display resources side-by-side using a 3-column layout (`grid-template-columns: repeat(3, minmax(0, 1fr))`).
- Added styled cost chips (`.objective-cost-chip`) inside the objective box, showing green highlights when costs are met (`.cost-met`) and red warnings when they are missing (`.cost-missing`).
- Styled the dynamic purchase button (`#terminal-objective-buy-btn`) inside the objective box to occupy full-width and fit comfortably in the header layout.

### 3. Game & UI Logic (`src/threeGame.js`)
- Added `getActiveBaseGoal(bankState)` to helper-check which of the 4 main base building goals (`o2Bubble` / Generator, `hullExpansion` / Goal 2, `radarNode` / Goal 3, `reactorCompressor` / Goal 4) is currently active.
- Integrated active goal rendering into `renderConsoleBanking(ship)`:
  - Dynamically updates Current Objective's title and description to match the active base goal when docked.
  - Dynamically renders resource requirement chips showing `[Have]/[Need]` for each resource.
  - Controls the enable/disabled state of the purchase button, and attaches appropriate purchase handlers (`attemptO2GeneratorUpgrade` or `attemptGoalUnlock`).
  - Hides the active goal's section card below, showing only future base goals.
  - Automatically hides unlocked/already online goal cards below to ensure the layout remains extremely clean and focused.

## Verification & Testing

### Automated Checks
- **Linter**: Ran `npm run lint` which completed successfully with zero errors.
- **Unit Tests**: Ran `npm run test` which completed successfully with 115 passing tests across 17 test files.
