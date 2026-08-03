# Walkthrough: Steam v1 Scope Lock & Production Engineering

Completed the high-level Steam v1 scope alignment, single-grammar objective framework, production SQLite backend defaulting, and Windows Steam DRM wrapper automation.

## 1. Steam v1 Scope Lock & Product Brief
- Created [docs/steam-v1-product-brief.md](file:///home/caveman/Desktop/icecave/hunker-bunker/docs/steam-v1-product-brief.md) locking the commercial release contract:
  - **Release Strategy**: Private Steam Playtest → Free Steam Demo → 1.0 Release.
  - **Monetization**: Single-Player Premium Purchase ($14.99–$19.99 baseline target). Real-money crate keys, microtransactions, and Community Market trading are **explicitly deferred/disabled** at launch.
  - **Platform Feature Claims Policy**: Proof requirements for Deck Playable, Full Controller Support, Steam Cloud, and trusted Leaderboards.

## 2. Unified Objective Framework
- **[objectiveRegistry.js](file:///home/caveman/Desktop/icecave/hunker-bunker/src/objectiveRegistry.js)**: Built ESM `ObjectiveRegistry` module for objective tracking, priority ordering (Story: 10, Boss: 20, Missions: 30, Camp Quests: 40, Lore: 50), and step checklists.
- **[index.html](file:///home/caveman/Desktop/icecave/hunker-bunker/index.html) & [style.css](file:///home/caveman/Desktop/icecave/hunker-bunker/style.css)**: Added `#objective-tracker` container with amber CRT styling.
- **[main.js](file:///home/caveman/Desktop/icecave/hunker-bunker/main.js) & [threeGame.js](file:///home/caveman/Desktop/icecave/hunker-bunker/src/threeGame.js)**: Wired live UI updates, event adapters (camp quests, missions, black box, death), and delegated compass target selection in `getRadarCompassState()`.

## 3. SQLite Production Storage Defaulting
- **[server/db.js](file:///home/caveman/Desktop/icecave/hunker-bunker/server/db.js) & [server/db-sqlite.js](file:///home/caveman/Desktop/icecave/hunker-bunker/server/db-sqlite.js)**: Updated server storage configuration to default to SQLite-on-volume whenever native `node:sqlite` is available. Added `inventory_accounts` schema tracking to prevent empty inventories from re-seeding default items.

## 4. Steam DRM Wrapper Automation
- **[scripts/steam-drm-wrap.js](file:///home/caveman/Desktop/icecave/hunker-bunker/scripts/steam-drm-wrap.js)**: Created CLI tool (`npm run steam:drm-wrap`) that automates Valve `drmwrap.exe` execution against packaged binaries (`dist_electron/win-unpacked/Hunker Bunker.exe`).
- **[docs/steam-drm-wrap-procedure.md](file:///home/caveman/Desktop/icecave/hunker-bunker/docs/steam-drm-wrap-procedure.md)**: Procedure guide documenting automated and manual DRM wrapping.

---

## Verification Results

- **Automated Unit Tests**: `npm test` — **535 passed across 68 test files** (including `objectiveRegistry.test.js`, `db-sqlite.test.js`, and `steam-drm-wrap.test.js`).
- **Linter**: `npm run lint` — **Passed cleanly with 0 errors**.
