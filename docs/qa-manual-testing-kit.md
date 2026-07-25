# Hunker Bunker — QA Manual Testing Kit

**Target Environment**: Local `.env` / Pre-Prod Sandbox (`.env.sandbox`)  
**Database Backend**: Nonprod SQLite (`server/data/hunker-bunker-nonprod.sqlite`)  
**Target App ID**: `4957040`  
**Document Version**: 1.0 (v1 Full Steamworks & Economy Acceptance)

---

## 1. QA Prerequisites & Environment Setup

### 1.1 Local Server Startup (Nonprod Sandbox Mode)
To run the pre-prod sandbox backend with nonprod SQLite storage and activated economy systems:

```bash
# Backend only: nonprod SQLite storage + mock Steam economy (this is what
# package.json actually exposes; server:dev / dev:all do not exist)
npm run server:nonprod

# Client, in a second terminal
npm run dev
```

### 1.2 Verify Server Health & Database Storage
Run the following curl command in terminal:

```bash
curl http://localhost:3001/health
```

**Expected Response**:
```json
{
  "ok": true,
  "service": "hunker-bunker-relay",
  "steam": {
    "appId": 4957040,
    "authConfigured": false,
    "session": { "configured": true, "signingMode": "dev_fallback" }
  },
  "storage": {
    "storageBackend": "sqlite",
    "initialized": true
  }
}
```

`authConfigured` and (later, on the store catalog) `microtransactionsEnabled` are correctly `false` in this environment — both require a real `HB_STEAM_PUBLISHER_KEY`, which a local sandbox intentionally doesn't have. Session minting still works via `signingMode: "dev_fallback"`, and store purchases still work via `purchaseMode: "mock"`. Do not treat either flag as a failure.

---

## 2. Test Suite Execution Plan

### Test Suite 1: Steam Auth & Session Token Minting

* **Objective**: Verify client authenticates with backend and receives a signed bearer session token.
* **Steps**:
  1. Launch Electron desktop shell or browser build (`npm run dev:all`).
  2. Open DevTools console (`Ctrl+Shift+I` / `F12`).
  3. Observe network log on boot.
  4. Trigger session minting by checking `/steam/session` endpoint.
* **Pass Criteria**:
  * Response returns HTTP status `200 OK`.
  * Returns JSON containing `token` (HMAC bearer token) and `steamId64`.
  * Subsequent backend calls include `Authorization: Bearer <token>` header.

---

### Test Suite 2: Steam Leaderboard Submission & Display

* **Objective**: Verify run facts are sent to backend, recomputed into canonical scores, stored in SQLite nonprod DB, and rendered on the game-over screen.
* **Steps**:
  1. Complete or simulate a run in-game (or trigger game over).
  2. Inspect POST payload to `/steam/leaderboards/submit-run`.
  3. Verify payload includes run facts: `survivalTimeSeconds`, `enemiesKilled`, `salvageExtracted`, `depthScore`.
  4. Navigate to Game Over / Results screen.
  5. Check Leaderboards tab (`best_run_score`, `survival_time_seconds`, `deepest_depth_score`).
* **Pass Criteria**:
  * Response returns `200 OK` with validated score and rank.
  * Score appears accurately in top entries list.
  * Resubmitting exact same run payload produces idempotent `200 OK` without duplicate records.

---

### Test Suite 3: Steam Inventory Drops & Exchange

* **Objective**: Verify inventory items (Relic Fragments, Victory/Queen emblems, Deep Relic Caches) drop correctly, persist in SQLite nonprod DB, and allow craft/exchange.
* **Steps**:
  1. Trigger an extraction run completion.
  2. Open the **Steam Vault** from main menu.
  3. Verify inventory list renders owned items (`itemdefid` 1000: Common Relic Fragment, 1100: Rare Relic Fragment, 4000: Deep Relic Cache, 4001: Cache Key).
  4. Click **Craft / Exchange**, recipe `2100` (combine 5x Common Relic Fragment → 1x Carbon Fiber Decal, `itemdefid` 2100). Recipe `2200` (10x Common + 2x Rare → 1x Chrome Plated Sidearm, `itemdefid` 2200) is the other fixed recipe; there is no recipe that converts Common Relic Fragments into Rare ones.
* **Pass Criteria**:
  * Inventory updates immediately without reloading.
  * Common Relic Fragments decrease by exactly 5 (not just 1, regardless of how many stacks the client references); Carbon Fiber Decal increases by 1.
  * Resubmitting the same `requestId` is idempotent — no duplicate consumption or grant.
  * Server logs record atomic transaction in SQLite database.

---

### Test Suite 4: Steam Item Store & Microtransactions (`ISteamMicroTxn`)

* **Objective**: Verify Cache Key purchase flow, loot odds disclosure, and cache opening using nonprod sandbox microtransactions.
* **Steps**:
  1. In Steam Vault UI, click the **Store** tab.
  2. Verify Store displays the Cache Key SKUs from `GET /steam/store/catalog`:
     * `key_1`: 1x Cache Key ($0.99 USD)
     * `key_5`: 5x Cache Key ($3.99 USD)
     * `key_15`: 15x Cache Key ($9.99 USD)
     * Disclosed odds modal/button ("View Drop Rates").
  3. Click **View Drop Rates** and verify the Deep Relic Cache drop table (`deepRelicCacheOdds` in the catalog response) matches:
     * Common Relic Fragment x3: 55%
     * Rare Relic Fragment: 25%
     * Carbon Fiber Decal: 12%
     * Chrome Plated Sidearm: 8%
  4. Click **Buy Cache Key**.
  5. In Sandbox mode (`HB_STEAM_STORE_MOCK_PURCHASES=1`), approve mock purchase flow.
  6. Return to Vault Inventory, select **Deep Relic Cache**, and click **Open Cache (Consume 1 Key)**.
* **Pass Criteria**:
  * Store displays correct price & odds.
  * Microtransaction `InitTxn` and `FinalizeTxn` endpoints return `200 OK` with valid `orderId` / `transId`.
  * Cache Key is granted, then consumed on opening cache.
  * Exactly one reward item is granted and added to inventory.

---

### Test Suite 5: Steam Cloud Save Bridge

* **Objective**: Verify local game save (`save.json`) bridges into Steam Cloud format and syncs without data corruption.
* **Steps**:
  1. Play game, upgrade a node in the Bunker Tree, and complete 1 run.
  2. Quit application cleanly.
  3. Inspect save file location (`userData/save.json`).
  4. Relaunch application and verify Bunker Tree upgrades and run progress remain intact.
* **Pass Criteria**:
  * Save file contains valid JSON.
  * No loss of Bunker Tree level or salvage currency upon restart.

---

### Test Suite 6: Steam Deck & Controller Spatial UX

* **Objective**: Verify 100% of menus, skill trees, and gameplay can be navigated using controller D-pad / Left Stick without a mouse.
* **Steps**:
  1. Connect Xbox / PlayStation / Steam Deck controller.
  2. Launch game in 1280x800 resolution (Steam Deck 16:10 ratio).
  3. Navigate Main Menu → Operator Select → Bunker Tree → Play Run → Steam Vault using D-pad / A button / B button.
  4. In gameplay: Move (L-Stick), Aim (R-Stick), Fire (R2/RT), Ability (L1/LB), Reload (X/Square), Scan (Y/Triangle).
* **Pass Criteria**:
  * Focus indicators (highlight borders) are visible on all interactive UI elements.
  * Zero required actions rely on mouse cursor hover or click.
  * Steam Input button glyphs match connected controller.

---

### Test Suite 7: First-Hour Player Acceptance Gates

* **5-Minute Gate**: Player can launch, move, engage enemies with sidearm, monitor suit O₂ gauge, and navigate toward flare/camp using compass.
* **15-Minute Gate**: Player completes first extraction, receives salvage & Relic Fragment drop, buys Bunker Tree upgrade, and defeats tier-1 enemy.
* **60-Minute Gate**: Player completes camp bonding quest, encounters Cybersnail boss, recovers Black Box telemetry, opens Steam Vault, and observes narrative ending vector progress.

---

## 3. QA Reporting & Escalation Matrix

If a test suite fails during execution:

1. **Check Backend Log**: Inspect console or server output for `[hb-request]` or `[hb-db]` error messages.
2. **Database Reset (If Corrupted)**: Delete `server/data/hunker-bunker-nonprod.sqlite` and restart server to re-seed defaults.
3. **Escalate Issue**: File bug report with:
   * Test Suite ID & Step #
   * Expected Result vs Actual Result
   * Server Log snippet (`/health` output & HTTP status code)
   * Console log screenshot / video capture
