# Steam Backend Admin Runbook

Last updated: 2026-10-01

This runbook covers the trusted backend rail for Hunker Bunker's Steam
leaderboards, inventory grants, and Store purchases. It is for operators and
release engineers, not client gameplay/UI work.

## Safety rules

- Never put `HB_STEAM_PUBLISHER_KEY`, `STEAM_PUBLISHER_KEY`, or
  `STEAM_WEB_API_KEY` in the client, the depot, screenshots, logs, or docs
  intended for players.
- Never trust a client-supplied Steam ID. Every `/steam/*` route derives the
  account from a verified ticket or server-signed session token.
- Never enable live purchases without a durable `HB_DB_STORAGE_PATH` volume and
  a real backup plan.
- Never grant paid items because a client says a purchase completed. The server
  must see `Approved`/`Succeeded` from `ISteamMicroTxn` and only grants after a
  successful `FinalizeTxn` or a known already-committed transaction.
- Treat refunds, partial refunds, chargebacks, suspected fraud refunds, and
  friendly fraud refunds as entitlement-reversal events that need manual or
  automated clawback work before public commerce.

## Required production environment

Minimum:

```bash
NODE_ENV=production
PORT=3001
HB_ALLOWED_ORIGINS=https://your-game-origin.example
HB_STEAM_BACKEND_URL=https://your-backend.example
HB_STEAM_APPID=4957040
HB_STEAM_PUBLISHER_KEY=<steamworks publisher key>
HB_SESSION_SECRET=<long random secret>
HB_DB_STORAGE_PATH=/app/server/data/db_storage.json
```

SQLite-on-volume beta storage:

```bash
HB_DB_BACKEND=sqlite
HB_DB_SQLITE_PATH=/app/server/data/hunker-bunker.sqlite
```

If `HB_DB_BACKEND=sqlite` is set and `HB_DB_SQLITE_PATH` is omitted, the
backend stores SQLite data beside `HB_DB_STORAGE_PATH` when that path exists,
or at `server/data/hunker-bunker.sqlite` by default. Runtimes with `node:sqlite`
available select SQLite by default; use `HB_DB_BACKEND=json` explicitly for the
legacy JSON store. Check `getDbStatus()` before choosing which file to back up.

Live Store additions:

```bash
HB_STEAM_STORE_ENABLED=1
HB_STEAM_MICROTXN_ENABLED=1
HB_STEAM_STORE_MOCK_PURCHASES=0
# Choose a UTC time before the application's first possible real purchase.
# Required only to initialize a missing reconciliation stream checkpoint.
HB_STEAM_REPORT_START_TIME=<RFC3339 UTC first-sale boundary>
```

Optional:

```bash
HB_STEAM_MICROTXN_SANDBOX=1
HB_STORE_IDEMPOTENCY_TTL_SECONDS=86400
HB_STEAM_DROP_COOLDOWN_SECONDS=60
```

Use `HB_STEAM_MICROTXN_SANDBOX=1` for sandbox testing. Remove it before real
commerce.

## Health checks

1. Hit the backend:

   ```bash
   curl -s https://your-backend.example/steam/auth/config | jq
   curl -s https://your-backend.example/steam/store/catalog | jq
   ```

2. Confirm `steam/auth/config` reports:

   - `configured: true`
   - correct `appId`
   - session signing configured from an explicit secret or publisher key

3. Confirm `steam/store/catalog` reports one of:

   - `purchaseMode: "disabled"` for public builds before commerce approval.
   - `purchaseMode: "live"` only after the Steamworks Microtransactions setup,
     publisher key, durable DB path, and release policy are all ready.

4. Confirm DB status from health output or logs:

   - `storageBackend: "json"` means the legacy atomic JSON file is active.
   - `storageBackend: "sqlite"` means SQLite-on-volume is active.
   - `durable: true` means the path is explicitly configured or SQLite is in
     use on the mounted volume.

5. Check runtime logs for structured request entries:

   ```text
   [hb-request] {"method":"POST","path":"/store/purchase/init","status":200,...}
   ```

   Logs intentionally include only method, route path, status, duration,
   request ID, and booleans for ticket/session presence. They must not include
   raw auth tickets, bearer tokens, publisher keys, or full request bodies.

### Production leaderboard smoke

The smoke client reads all five canonical boards globally and around the
authenticated player. It accepts only a short-lived backend session token and
never accepts or sends a Publisher key. Put the token in a mode-0600 temporary
file so it does not enter shell history:

```bash
chmod 600 /secure/path/session-token.txt
npm run steam:smoke-leaderboards -- \
  --backend-url https://your-backend.example \
  --session-token-file /secure/path/session-token.txt \
  --steam-id 7656119XXXXXXXXXX
```

Omit `--steam-id` for a connectivity-only read. Providing it additionally
requires every around-user response to contain that account. The command
rejects HTTP and mock backend responses.

An explicit score-write acceptance pass requires a canonical run payload file:

```bash
npm run steam:smoke-leaderboards -- \
  --backend-url https://your-backend.example \
  --session-token-file /secure/path/session-token.txt \
  --steam-id 7656119XXXXXXXXXX \
  --submit-payload /secure/path/canonical-run-payload.json
```

Submission happens before the reads. The server recomputes scores and selects
the leaderboard targets; the script does not accept arbitrary board names or
scores. A victory Daily Ops payload is needed to exercise all five targets.
Delete the session-token file when the acceptance record is complete.

## Purchase lifecycle

The purchase ledger is canonical, not append-only. Each record is keyed by
`transId`/`orderId` and includes an `events` trail.

Storage locations:

- JSON backend: `db_storage.json` under `purchases`.
- SQLite backend: `purchases` plus `purchase_events` tables.

Common ledger statuses:

- `pending_confirmation`: Steam order exists, user has not completed approval.
- `approved`: Steam reports the user approved the order; backend should
  finalize.
- `payment_succeeded`: QueryTxn confirms payment, but inventory is not yet delivered.
- `finalized_pending_grant`: Steam capture succeeded; inventory grant is next.
- `completed`: item grant completed. Repeated finalization returns
  `alreadyGranted`.
- `mock_completed`: dev-only purchase grant completed in mock mode.
- `failed`: Steam reported a failed order.
- `reversed`: Steam reported a refund, chargeback, or fraud reversal state.
- `query_failed`: backend could not query Steam; retry is safe.
- `finalize_failed`: backend could not finalize; retry is safe unless Steam
  later reports a terminal status.
- `grant_failed`: delivery did not return usable evidence; retry the same purchase
  only with its saved `grantIntent` (see recovery below).
- `grant_review_required`: ambiguous legacy attempt or inconsistent grant/payment
  evidence; no automatic delivery retry. Inspect `reason` and retained receipts.

Client-facing response hooks:

- `purchaseStatus: "pending"` with `nextAction: "open_overlay"` means show the
  Steam confirmation flow.
- `purchaseStatus: "pending"` with `nextAction: "retry_finalize"` means keep the
  purchase visible as pending and retry finalization.
- `purchaseStatus: "completed"` with `nextAction: "refresh_inventory"` means
  refresh the Vault/inventory.
- `purchaseStatus: "failed"` or `"reversed"` with `nextAction: "show_error"`
  means do not grant and show a recoverable error state.
- `purchaseStatus: "disabled"` means hide or disable purchase controls.

## Durable GetReport reconciliation

The [worker](../server/steamMicroTxnReport.js) runs at startup and every six hours
when MicroTxn and a publisher key are configured. It is **read-only against
Steam entitlements**: it does not charge, grant, refund or revoke. Do not interpret
its presence as completion of paid-grant recovery or reversal processing.

Before first deployment, set `HB_STEAM_REPORT_START_TIME` to a known UTC boundary
before the first possible purchase (for example, the application commerce testing
start). An absent checkpoint without that setting reports
`initial_report_time_required`; it never silently limits history to 48 hours.
After initialization, restarts use the saved cursor, even after a multi-day outage.
Changing the environment boundary does **not** rewind an existing checkpoint.

Storage is part of the same backed-up purchase database:

- JSON: `microTxnCheckpoints` in `HB_DB_STORAGE_PATH`.
- SQLite: `microtxn_checkpoints(scope, revision, body_json)`.
- Scope is `<appid>.<live|sandbox>.<report type>`. Sandbox evidence never advances
  a production cursor. A compare-and-swap revision rejects stale writers.
- Each successful batch persists its cursor **with** accumulated latest-order
  evidence before the next request. Earlier unresolved orders remain in subsequent
  comparisons even after newer transactions move the cursor forward.
- Complete local-ledger pages are read synchronously; both database adapters
  support stable 1,000-row pages. Continue using one backend writer per database.

Enumeration follows update timestamps through short pages and overlap duplicates;
only an empty page finishes a scan. It does not increment a stuck timestamp to
skip ahead. This follows the [GetReport contract](https://partner.steamgames.com/doc/webapi/ISteamMicroTxn#GetReport).
Contradictory same-time statuses require review, rather than choosing a clean sale.

The default scan budget is 100 API pages per run. `report_page_limit` is unhealthy,
but already-persisted batches allow the next run to resume. A repeated unchanged
boundary reports `report_cursor_stalled`; preserve evidence and investigate the API
response before changing any cursor. Each request has a 15-second timeout.

The beta ledger has an explicit 100,000-order evidence/local-read safety limit;
it fails unhealthy at that limit and never discards old unsettled orders. Plan a
streamed per-order database/archival migration before approaching that volume.
Raw evidence includes account and purchase data: restrict database and backup
access. There is no public endpoint exposing the ledger or publisher key.

Trusted operator commands (run only with the intended backend environment):

```bash
# Independent report window: does not alter the worker checkpoint.
node server/scripts/microtxn-report.js --since 2026-09-30T00:00:00Z

# Resume the worker stream; initialize from the configured boundary if absent.
node server/scripts/microtxn-report.js --resume
```

Stop/coordinate the background worker before running `--resume` from another
process, especially with JSON storage. The CLI saves every request descriptor
(without the key) and raw response under `server/data/microtxn-reports/`, with
new evidence files mode 0600. Output `ok` and exit status cover both enumeration
and reconciliation; a successful API fetch alone cannot produce a healthy result.
The final raw response is usually the empty terminator; use `pages` for the actual
transaction evidence. Share reviewer evidence privately, never in a public issue.

Investigate `[microtxn-report] UNHEALTHY` and checkpoint `health`:

- `paidNotGranted`: settled payment without confirmed inventory delivery.
- `notInReport`: local grant absent from this report history; investigate, do not
  assume nonpayment or automatically revoke.
- `reversedButGranted`: refund/chargeback with current or historical grant evidence.
- `needsReview`: ownership/identifier conflict, unknown status, contradictory
  report evidence, or inventory granted without a settled payment.
- Fetch, persistence, malformed-page and scan-limit failures remain unhealthy.

### Paid-grant recovery and review holds

Authenticated `/steam/store/purchase/finalize` retries persist `grantIntent`
before issuing AddItem: immutable uint64 request ID plus account, order,
transaction, SKU, app, sandbox/live, itemdef and quantity. Both DB adapters retain
it across restarts; do not clear it, change its payload, or invent a new request
ID to retry a purchase. Keep the existing one-backend-instance deployment rule.
An in-process order lock prevents overlapping finalize calls; Steam's saved
request ID handles ambiguous grant responses and crash-before-completion writes.

Each unfinished retry rechecks QueryTxn and account/order/transaction identity.
A refund blocks a new grant. HTTP failures and uncertain delivery stay pending;
`completed` is reserved for a validated delivery/replay. Paid AddItem requests set
`trade_restriction=1`. See the [Steam Inventory contract](https://partner.steamgames.com/doc/webapi/IInventoryService#AddItem).

Steam replay describes **current** affected items, not original delivery amounts.
`grantIntent.quantity` is the purchased amount; `granted` is returned item evidence;
`grantReplayed` indicates a retry recognized by Steam; `grantDelivered` preserves
delivery evidence even after consumption and bounded event-history expiry. Zero
remaining items on a valid replay do not authorize replacement keys.

`grant_review_required` must not be cleared by a routine retry. Reasons include
`legacy_grant_requires_review` (older attempts with no saved idempotency identity),
`steam_inventory_grant_requires_review` (wrong initial receipt), and
`grant_without_settled_payment`. Preserve evidence, investigate Steam's order and
inventory records, and obtain an explicit publisher disposition. Do not assume
missing local receipts mean no grant occurred. These holds keep reconciliation
unhealthy even when the report has no matching row.

GetReport currently **does not invoke delivery**: player/session retries are
implemented, unattended recovery and item-level reversal dispositions are the
next S49-08 slice. Do not advertise automatic recovery/clawback yet.

## Market eligibility and hosted Item Store links

`GET /steam/market/eligibility` returns a top-level `allowed` boolean derived
from Steam's `IEconMarketService/GetMarketEligibility` response. The Vault UI
uses that normalized flag as the only signal that a hosted Steam Item Store
overlay link may be opened.

Expected client behavior:

- `allowed: true`: show and enable the hosted Steam Item Store CTA when the
  catalog also exposes `hostedItemStore.enabled`.
- `allowed: false` or route failure: keep the CTA disabled and label the state
  as market eligibility unconfirmed. Do not fall back to a raw browser link in
  public Steam builds.
- Dev mode may return `allowed: true` with `reason: "dev_mock"` so local UI
  smoke tests can exercise the path without a live Steam account.

## Steam MicroTxn statuses and errors

Steam status handling follows Valve's Microtransactions docs:

- `Init`: order created, not authorized.
- `Approved`: user approved; backend may call `FinalizeTxn`.
- `Succeeded`: order processed; backend can grant if it has not already done so.
- `Failed`: terminal failure; do not grant.
- `Refunded`, `PartialRefund`, `Chargedback`,
  `RefundedSuspectedFraud`, `RefundedFriendlyFraud`: reversal states; revoke or
  investigate entitlement.

Steam error codes are mapped to stable backend reasons such as
`steam_purchase_not_approved`, `steam_purchase_denied`,
`steam_insufficient_funds`, `steam_restricted_country`,
`steam_fraud_blocked`, and `steam_purchase_already_committed`.

References:

- Steamworks `ISteamMicroTxn` Web API:
  https://partner.steamgames.com/doc/webapi/isteammicrotxn
- Steamworks Microtransactions implementation guide:
  https://partner.steamgames.com/doc/features/microtransactions/implementation

## Investigating a purchase

1. Find the transaction by `transId`, `orderId`, or `requestId` in the active
   storage backend: JSON `db_storage.json`, or SQLite `purchases` plus
   `purchase_events`.
2. Confirm `steamId64` matches the player account under investigation.
3. Read `status`, `reason`, `steamState`, `steamErrorCode`, and `events`.
4. If the status is `pending_confirmation`, ask the player to retry or restart
   the Steam overlay flow.
5. For `approved`, `payment_succeeded`, `query_failed`, `finalize_failed`, or a
   pending/failed grant **with a saved `grantIntent`**, retry the same transaction
   after confirming backend health. A legacy attempt without that intent is
   quarantined for review; never mint a replacement ID to bypass the hold.
6. If the status is `failed`, do not manually grant. Check the Steam error code.
7. If the status is `reversed`, start entitlement review/clawback.
8. If the status is `completed`, do not grant again. Repeated finalize requests
   should return `alreadyGranted`.
9. For `grant_review_required`, follow the evidence/review procedure above;
   ordinary retries return the hold without changing inventory.

To refresh Steam state for a locally completed purchase, call
`/steam/store/purchase/finalize` with `reconcile: true`. This forces a
`QueryTxn` call and can move the ledger to `reversed` if Steam later reports a
refund or chargeback. A completed purchase still reporting `Succeeded` remains
completed without another grant; one reporting only `Approved` requires review
because approval is not settled payment.

## Idempotency cleanup

Permanent milestone and achievement idempotency records are intentionally
non-expiring unless the caller saves them with a TTL.

Store purchase init responses use a TTL so repeated network retries are cached
for a bounded time while the canonical purchase ledger remains durable. The
default TTL is 24 hours and can be overridden:

```bash
HB_STORE_IDEMPOTENCY_TTL_SECONDS=86400
```

Expired records are pruned during DB initialization and when looked up. The
server also exports `cleanupExpiredIdempotency()` for future admin tasks, but
there is no CLI wrapper yet.

## Backup and recovery

### JSON backend

For JSON-on-volume beta:

1. Stop the backend or put it into maintenance mode.
2. Copy `HB_DB_STORAGE_PATH` and its latest backup.
3. Validate the JSON:

   ```bash
   node -e "JSON.parse(require('fs').readFileSync(process.env.HB_DB_STORAGE_PATH, 'utf8')); console.log('ok')"
   ```

4. Confirm it has `inventories`, `leaderboards`, `idempotency`, `receipts`, and
   `purchases`, and (after the worker initializes) `microTxnCheckpoints`.
5. Restart one backend instance only.

Do not run multiple writers against the same JSON file. Atomic file replacement
prevents torn writes, but it is not a multi-process database.

### SQLite backend

For SQLite-on-volume beta:

1. Use one backend instance per SQLite database file.
2. Set:

   ```bash
   HB_DB_BACKEND=sqlite
   HB_DB_SQLITE_PATH=/app/server/data/hunker-bunker.sqlite
   ```

3. Back up all SQLite files from the volume:

   ```text
   hunker-bunker.sqlite
   hunker-bunker.sqlite-wal
   hunker-bunker.sqlite-shm
   ```

4. Prefer stopping the backend before copying the DB files. If online backups
   are needed, add a dedicated SQLite backup command before public commerce.
5. Confirm `getDbStatus()` / health output reports `storageBackend: "sqlite"`.

SQLite uses WAL mode and schema tables for inventories, leaderboard mirrors,
idempotency, run receipts, purchase state/events, and reconciliation checkpoints. It is a better
single-machine beta store than JSON, but it is still not a multi-region or
multi-writer production database.

### Versioned Docker-volume backup and restore drill

Run these commands from a repository checkout containing the same backend
version as the deployment. A filesystem-level SQLite backup requires the
backend to be stopped:

```bash
cd ~/server
docker compose stop hunker-bunker-backend
cd /path/to/hunker-bunker
npm run steam:backend-volume -- backup \
  --archive "$HOME/server/backups/hunker-bunker-data-YYYYMMDD-HHMMSS.tar.gz"
cd ~/server
docker compose start hunker-bunker-backend
```

The command refuses to continue while a running container mounts the source
volume, refuses to overwrite an archive, verifies the tar, and writes a
mode-0600 `.sha256` sidecar. Verify a copied archive independently:

```bash
npm run steam:backend-volume -- verify \
  --archive "$HOME/server/backups/hunker-bunker-data-YYYYMMDD-HHMMSS.tar.gz"
```

Perform recovery rehearsal only into a new temporary volume:

```bash
npm run steam:backend-volume -- restore-drill \
  --archive "$HOME/server/backups/hunker-bunker-data-YYYYMMDD-HHMMSS.tar.gz" \
  --target-volume hunker-bunker-restore-YYYYMMDD
```

The drill rejects the live `hunker-bunker-data` name and any existing target,
extracts into the newly created volume, and runs SQLite
`PRAGMA integrity_check` against `db_storage.sqlite`. Use
`--sqlite-file <name>.sqlite` if the deployment uses another simple filename.
It deliberately retains the temporary volume for inspection and never
attaches it to the production service. After recording evidence and inspecting
the recovered tables, an operator may remove that exact temporary volume.

Retention policy: retain seven daily, four weekly, and twelve monthly backup
archives plus their checksum sidecars. Copy at least the weekly and monthly
sets to encrypted off-device storage. Test one retained archive monthly.
Backups contain player and commerce records; restrict access and retention
accordingly. Never include `backend.env` or Publisher/session secrets in the
archive.

## SQLite migration path

JSON-on-volume is acceptable for local development. SQLite-on-volume is now
implemented behind `HB_DB_BACKEND=sqlite` and is the next beta storage step, but
it is not the final high-scale production economy store. Remaining migration
work:

1. Deploy SQLite on a durable volume with one backend instance.
2. Add an offline migration script that reads existing JSON once and writes
   SQLite in a transaction.
3. Add a backup command or runbook step that uses SQLite's backup API rather
   than raw file copies.
4. Use tables already created by `server/db-sqlite.js`:
   - `inventories(steam_id64, item_id, itemdefid, quantity, acquired_at, properties_json)`
   - `leaderboard_entries(board_name, steam_id64, score, persona, timestamp)`
   - `idempotency(request_id primary key, status, body_json, timestamp, expires_at)`
   - `run_receipts(id primary key, steam_id64, run_id, body_json, timestamp)`
   - `purchases(trans_id primary key, order_id, request_id, steam_id64, sku, status, price_usd_cents, reason, steam_state, updated_at, created_at, body_json)`
   - `purchase_events(id primary key, trans_id, status, reason, steam_state, timestamp)`
5. Deploy with a fresh backup and one backend instance.
6. Only after a successful beta soak, consider multiple backend instances with a
   server database such as Postgres.

## Resetting achievements for a QA/beta tester

`ISteamUserStats::ResetAllStats` only ever resets the Steam account that is
*currently logged into the running game*. There is no server-side or
remote way to reset a different Steam user's achievements — the tester (or
someone at their machine, logged in as them) has to trigger it themselves,
while the game is running under their account.

The game exposes this as a debug-console command, gated so it does not
exist in a normal player's build:

1. Launch the build with `HB_QA_TOOLS_ENABLED=1` set in the environment —
   the cleanest way is a Steam beta branch's own launch options, so only
   testers opted into that branch ever have the capability. The public
   default branch should never set this.
2. In the running game, open the debug console (`~`) and run:

   ```text
   resetachievements confirm
   ```

3. This calls `steamClient.stats.resetAll(true)` in the Electron main
   process and re-stores stats. It requires the `confirm` argument because,
   unlike this console's other cheats, it's a real, immediate action against
   the tester's real Steam profile, not local run state.

If `HB_QA_TOOLS_ENABLED` is not set, the IPC handler backing this command is
never registered at all — the console reports it as disabled rather than
silently doing nothing.

## Pre-release acceptance

- `npm run steam:audit-backend:strict` passes with production env.
- `npm run steam:audit-depot` passes before upload.
- `server/db_storage.json` is absent from depots and git.
- Installed build reaches deployed `/steam/store/catalog`.
- Auth ticket session creation works from an installed Steam build.
- A test purchase goes `pending_confirmation` -> `approved` -> `completed`.
- A canceled/failed purchase grants nothing.
- A repeated finalize on a completed purchase returns `alreadyGranted`.
- A forced inventory grant failure leaves `grant_failed` and can be retried.
- A real account can read inventory and leaderboard state after restart.
