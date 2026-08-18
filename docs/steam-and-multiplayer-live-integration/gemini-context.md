# Gemini & Agent Pair Programming Context: Steam, Relay & Economy

This file contains repository-specific agent rules and quick reference models for **Google Antigravity (Gemini)** and collaborating AI agents.

---

## 1. Ground Rules & Invariants

1. **Steamworks Isolation**:
   - `steamworks.js` is only loaded in the Electron main process ([`electron/main.cjs`](file:///home/caveman/Desktop/icecave/hunker-bunker/electron/main.cjs)).
   - The renderer MUST NEVER import `steamworks.js` or Node built-ins directly. All communication happens through `window.electronAPI`.
   - Every `window.electronAPI` call MUST have an offline / mock fallback path (e.g. sandbox inventory in `steamVaultUi.js`, local storage save bridge).

2. **Socket.IO Relay Protocol**:
   - Relay server: [`server/relay.js`](file:///home/caveman/Desktop/icecave/hunker-bunker/server/relay.js).
   - Client lobby: [`src/multiplayerLobby.js`](file:///home/caveman/Desktop/icecave/hunker-bunker/src/multiplayerLobby.js).
   - URL resolution: Use `resolveRelayUrl()` which prioritizes `window.HB_RELAY_URL` $\rightarrow$ `http://localhost:3001` on local dev $\rightarrow$ `https://steam.tuesdaycinema.club` on production/Electron.
   - All inbound coordinates and inputs must be sanitized using `sanitizeCoord()` and rate-limited.

3. **Steam Inventory Economy**:
   - Schema source of truth: [`steam/inventory_schema_hunker_bunker.json`](file:///home/caveman/Desktop/icecave/hunker-bunker/steam/inventory_schema_hunker_bunker.json).
   - Catalog runtime: [`src/data/steamItemCatalog.js`](file:///home/caveman/Desktop/icecave/hunker-bunker/src/data/steamItemCatalog.js).
   - Asset validation pipeline: Each itemdef requires exactly 4 compliant files (`256px local`, `512px large`, `1254px master`, `1254px chroma`) validated by `node scripts/audit-steam-inventory-assets.js`.

4. **Testing Protocol**:
   - Always run `npx vitest run` before committing.
   - Mock all network requests and GLTF loaders in unit tests to prevent node environment timeouts.
