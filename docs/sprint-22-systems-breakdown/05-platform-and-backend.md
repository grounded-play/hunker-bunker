# System Breakdown: Platform, Backend, & Steam Integration

## Overview
Hunker Bunker is not a traditional web game, despite being built on WebGL. It is packaged via Electron to act as a native desktop application, deeply integrated with Steamworks for platform features, and backed by a trusted Node.js relay server to prevent spoofing.

## The Architecture Stack

### 1. The Client Shell (Electron)
- The game runs inside an Electron shell (`electron/main.cjs`).
- The shell handles the initial boot, window management, and acts as the bridge between the sandboxed renderer (Three.js) and the native OS.

### 2. Steamworks IPC (`steamworks.js`)
The game uses `steamworks.js` for native Steam integrations:
- **Steam Cloud Saves:** Syncs the local persistence JSON across machines. 
- **Achievements & Stats:** Real-time hooks that unlock Steam achievements based on in-game milestones.
- **Steam Inventory/Vault:** Reads the player's Steam inventory (e.g., cosmetic drops or real-money Cache Keys) and applies them in-game.

### 3. Steam Input & The Controller Gap
- The game uses Steam Input action-sets (streaming controller states) for prompts, but currently relies on the browser Gamepad API for actual movement. 
- **Sprint 22 Blocker:** A Steam Deck player can boot the game but not play it because the Steam Input stream doesn't feed the movement/fire logic in `src/threeGame.js`. Sprint 22 must wire the streamed Steam Input directly into the renderer's control loop.

## The Trusted Backend

### Why a Backend?
To prevent players from spoofing leaderboard scores or granting themselves infinite premium inventory items via browser DevTools, the game relies on a trusted relay server.

### Infrastructure
- **Server:** Node.js/Express.
- **Deployment:** Docker Compose behind a Caddy reverse proxy at `steam.tuesdaycinema.club`.
- **Database:** Migrating from a local JSON store to SQLite-on-volume (`server/db.js`).

### Security & The Session Flow (Sprint 22)
Currently, every backend request burns a fresh Steam Auth Ticket (which triggers Valve's rate limits).
- **Sprint 22 Fix:** The backend will verify the Steam Auth Ticket exactly once at boot via `/steam/session`. It will issue a short-lived, HMAC-signed session token (`HB_SESSION_SECRET`). 
- All subsequent calls (like submitting a leaderboard score) will use `Authorization: Bearer <token>`, bypassing Valve's rate limits and drastically improving performance.

### P0 Security Blocker
The Publisher Web API key and the `HB_SESSION_SECRET` were previously exposed in documentation. These must be aggressively rotated in the Steamworks partner dashboard before the beta branch is opened to any public or external QA testing.
