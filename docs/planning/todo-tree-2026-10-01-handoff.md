# TODO tree iteration handoff — 2026-10-01 14:42

Status: active worklog | Owner: repository maintainers | Updated: 2026-10-01

## Scope and continuation rules

The owner requested implementation, incremental commits and updated source TODOs
for [this exact snapshot](../../public/3d/runtime/kits/modular-cave-kit/better-todo-tree-20261001-1442.txt).
Its location is inside a cave-kit asset directory, but its entries actually index
the [economy plan](economy-master-plan-2026-09-30.md) and [Sprint 49](sprint-49.md).
All their open work remains in scope; do not replace it with a cave-kit-only task.
Use ticket IDs/headings rather than the snapshot's stale line numbers.

Branch: `dev/sprint-49`; starting HEAD `7f4a881c`, package `2.4.14-beta`.
Read the [earlier implementation log](sprint-49-implementation-handoff.md) and
[parallel contributor log](sprint-49-claude-lane-handoff.md) before shared edits.
The snapshot is normally ignored; it is intentionally force-added for this explicit
owner request. Preserve its original entries and add verified iteration notes.

## Shared worktree boundary

At entry, other contributors had uncommitted edits to the store server/tests,
Vault, catalog, seven locales, runtime/camera, styling, chroma report and both source
plans. Further kit grammar, hallway and world-overlay edits arrived during work.
Do not stage these wholesale. This lane owns only the inventory reader/route
changes, relevant inventory/trade-up fixtures, this log, the requested snapshot,
and its appended evidence sections in the two existing plans. Stage only those
appendices in the already-dirty plans; preserve the other contributor's edits.

## Iteration 1 — live inventory evidence

Commit: `473794a1`.

- [x] Reproduced 11 failing regression cases: GetInventory was decoding `item_list`
  instead of `item_json`, reporting bad evidence as an empty inventory, and
  returning transport exception strings that could contain the publisher key.
- [x] Added [reader](../../server/steamInventoryRead.js), connected to
  [inventory routes](../../server/steamInventory.js) and exchange planning.
  Exact uint64 item strings, safe integer counts, duplicate-ID rejection,
  zero/removed-item handling, stable compact-UTC acquisition dates, explicit
  response rejection, 15-second timeout and sanitized failure responses.
- [x] Added authenticated route and decoder/request regressions; migrated live
  trade-up GetInventory fixtures to Steam's documented shape and numeric item IDs.
- [x] `npx vitest run server/steamInventoryRead.test.js server/steamInventory.test.js
  server/steamTradeUp.test.js server/steamGrant.test.js`: **4 files / 80 passed**.
  Scoped ESLint passed. `npx vitest run server`: **34 files / 306 tests passed**.
  Documentation audit: **516 documents / 417 enforced Markdown files**, no current
  errors and 407 preserved archive warnings; inventory regenerated. `git diff --check`
  passed. These counts include concurrently developed, passing backend tests.
- [ ] No live-account, installed-candidate, full-game or hardware acceptance is
  claimed. This fixes a prerequisite; it does not close the large sprint tickets.

API reference: [Steam GetInventory](https://partner.steamgames.com/doc/webapi/IInventoryService#GetInventory).

## Iteration 2 — exact live crafting and durable ambiguity holds

- [x] [Recipe exchange service](../../server/steamRecipeExchange.js) validates
  server-fetched ownership, unique material IDs, known recipes and sufficient
  stack quantities. Chrome consumes 10 common + 2 rare, decal 5 common, cache
  opening 1 cache + 1 key, regardless of stack sizes. Only newly produced items
  are rewards; leftover material rows never appear as grants.
- [x] Real [inventory route](../../server/steamInventory.js) uses the service and
  the same per-player lock as trade-up/redemption. Request identity is scoped to
  app/account and bound to its recipe/material signature. Hash-based journal keys
  work with both SQLite and JSON (JSON rejects colon-delimited keys).
- [x] Persist a private immutable plan and account-level pending marker before
  ExchangeItem. No documented Steam request-ID support exists for that call, so
  missing/invalid/failed outcome evidence stays in manual review, never automatic
  replay or refund. A fresh nonce cannot bypass an unresolved account hold.
  Completed retries return their saved result without calling Steam again.
- [x] Journal metadata lives inside the existing DB's persisted response body,
  but is stripped from player responses. HTTP 200 alone and empty/wrong output
  arrays are not proof of successful crafting. Requests time out after 15 seconds.
- [x] [Service cases](../../server/steamRecipeExchange.test.js) cover exact counts,
  lost responses, malformed/wrong/empty rewards, failed preflight/completion writes,
  nonce/account isolation and concurrent requests. Actual authenticated route
  tests inspect stored metadata and reject new-nonce bypasses on SQLite and JSON.

Verification: backend suite **35 files / 326 tests passed** before the final
removed-material response regression; targeted route/service run **49 tests passed**.
Actual JSON-backed route run **31 tests passed**; scoped ESLint passed.
Documentation audit: **516 documents / 417 enforced Markdown files**, no current
errors; 407 preserved archive warnings. Final reader/route/recipe/trade-up
regression rerun: **4 files / 77 tests passed**, including removed-material rows.
No live inventory was consumed/granted and no backend was deployed.

Operator caution: journal records are in the existing `idempotency` storage with
no TTL. Look up an attempt using exported `recipeExchangeJournalKey` or its
account marker `recipe-exchange-active.APPID.STEAMID`; inspect private
`body.exchangeJournal`. Do not delete/reset an uncertain marker or rerun the
mutation without resolving actual Steam inventory outcome. A staffed resolution
workflow, audit trail and safe explicit disposition command are still TODOs.
The hold applies to this fixed/cache recipe route, not a claim that trade-up,
redemption or all inventory mutation paths have been journaled.

API reference: [Steam ExchangeItem](https://partner.steamgames.com/doc/webapi/IInventoryService#ExchangeItem).

## Next implementation order

1. **S49-08/32, economy P5:** correct remaining inventory mutation contracts in
   `server/steamTradeUp.js` and `server/steamInventory.js`. ConsumeItem currently
   trusts HTTP 200; textual request IDs are not uint64; TriggerItemDrop still reads
   `item_list`. Fixed/cache ExchangeItem is corrected above. Add failure fixtures
   first. A lost response is
   ambiguous, not proof that nothing was consumed/granted: never blindly refund
   or reroll it. Persist an immutable exchange plan and outcome journal.
2. **S49-08:** extract paid fulfillment into a shared service with the existing
   durable request identity and canonical order lock, then let the report worker
   recover known, identity-matched settled orders. Keep unknown orders and legacy
   grant holds explicit; preserve item-level reversal/review evidence. Coordinate
   store edits with the current pricing/region lane before touching that file.
3. **S49-32/03:** durable chat-report retention/access and operational fault drills.
4. Continue the full source backlog by ticket ID: multiplayer/controller/reviewer
   evidence; gameplay, presentation, save and performance acceptance; then P2
   expansion. Product decisions (prices, paid randomness, season pass) and actual
   deployments, charges, revocations or Steam submission need explicit authority.

Do not check a full ticket merely because one fixture suite passes. Checked items
in the imported snapshot were not independently recertified by this iteration.

## Iteration 3 — Deck PvP reconnect and door follow-up

2026-10-04, source capture `hunker-bunker-session-2026-10-02T01-37-00-805Z-muqam0sq-bhvr.json`,
build `e8b92f83ac9b`, host only. Evidence: 13 relay joins, final roster with one
player but two remote avatars, 44 hit reports / four confirmations, blast-door
sequence 552, retained gameplay average 58.51 ms. No guest-side acceptance inferred.

- [x] Reconcile gameplay avatars against reconnect `currentPlayers`, remove stale
  peers, exclude self, refresh local socket ID and host authority.
- [x] Own gameplay callback references and remove only those on teardown; lobby
  disconnect/host listeners remain attached to their shared socket.
- [x] Only host runs automatic blast-door proximity decisions. Guests still apply
  replicated state and manual interactions are unchanged. Remote state application
  emits its DOM event once, not twice.
- [x] Full regression checkpoint: 548 suites / 4,848 tests passed; scoped/new
  regressions and lint passed before the final full run.
- [ ] Diagnose why connections churn using both clients and relay disconnect logs.
- [ ] Add hit rejection diagnostics and authoritative health/resume tests.
- [ ] Decide duel versus survival-skirmish rules before altering ship/environment
  deaths; synchronize round completion and rematch instead of unilateral retry.
- [ ] Measure after fixes: CPU/frame profiling, door effects, shadows and resources.
  GPU timing is not presented FPS; no 30/60 FPS or hardware acceptance claimed.
- [ ] Test host migration and simultaneous manual door actions; this increment
  stops competing automatic decisions, not a full server-authoritative door protocol.

Next safe observability increment: make the session analyzer report repeated joins,
roster/avatar mismatch and presented frame pacing, and distinguish poison from PvP
damage. Remaining economy order above is unchanged; no financial policy changes.

## Iteration 4 — actionable one-sided session diagnostics

- [x] `scripts/session-log-findings.mjs` with regression fixtures powers the analyzer:
  repeated joins, possible stale avatars, hit reports/confirmations and damage reasons.
  Missing evidence remains unknown, and confirmations are not called packet loss.
- [x] Presented frame average/p95 and approximate FPS are separate from GPU timing.
  The source capture now reports 13 joins, roster 1 / remote avatars 2, 44/4 hit
  reports/confirmations, poison 4 / PvP 1 damage events, and approximately 17.1 FPS.
- [x] Lobby connection diagnostics include old/new connection IDs and allowlisted
  disconnect reasons, never serialized transport errors or authentication payloads.
- [x] Targeted analyzer/lobby/reconnect run: 3 suites / 58 tests passed.
- [ ] Two-client fault drill and relay-side rejected-hit reasons still needed.

Iteration 3 commit: `cd43420d`. No PvP rules, prices, inventory mutations, deployments
or Steam submissions changed. Keep the source tickets open pending full acceptance.

Verification: build/media audit and generated presubmit passed; retail reports
were refreshed after editing the public TODO snapshot. Lint and documentation
audit passed. A later shared-worktree full run had 549 passing suites / 4,856 passing
tests and two failures in `server/steamTradeUp.test.js` refund cases while another
contributor edited economy code/tests. Those changes are not part of iterations
3–4; do not treat this as a green whole-branch/CI certification. Commentary
extraction work in `main.js` is also owned by the concurrent contributor.

## Iteration 7 — remove campaign defenses from PvP rival damage

Work begins from `d796194e`; concurrent Fabrication Bay extraction is excluded.
The game-development state guidance keeps campaign and PvP mitigation separate.

- [x] A relay-accepted rival hit no longer rolls Tank/NPC block/evasion or applies
  campaign overclock/relic multipliers, NPC armor, equipment shields or carapace.
- [x] Regression cases cover all three classes with stacked campaign defenses;
  one rival hit still removes one heart. Co-op shield absorption is unchanged.
- [x] Targeted damage/passive/relic/gameplay suite: 5 files / 72 tests; lint passed.
- [x] Full shared-worktree run: 551 suites / 4,876 tests passed. Documentation
  audit and generated presubmit passed; retail reports regenerated. The concurrent
  `82bdb506` commit included this iteration's Sprint 49/public TODO text while
  landing Fabrication Bay work; the combat implementation is committed separately.
- [ ] Full authoritative local health is NOT complete: `takeDamage` still has
  lifecycle, i-frame and spawn guards, while relay `weaponHit` has no matching
  spawn-protection deadline. Move protection into the relay with deployment-ready
  timing and round IDs before bypassing local protection on accepted hits.
- [ ] Environmental damage/healing and unilateral TRY AGAIN remain separate
  synchronization gaps. Do not overwrite local HP with a higher server value:
  the relay currently does not know those environmental losses.
- [ ] Next commit should define the shared deployment-ready/protected/alive/dead
  contract and test loading delays, reconnects, environmental deaths and rematches.

## Iteration 6 — explain rejected PvP hits and repair remote health

Starting checkpoint: clean worktree at `d916a212`; the commentary and inventory
contributors committed their work after iteration 4. This iteration owns only
PvP relay/client diagnostics, tests, and the linked TODO documentation.

- [x] Relay emits `weaponHitRejected` to the reporting socket only, at most five
  times per second, with fixed reason codes and no raw request/auth data. Missing
  and cross-room participants share one reason to avoid exposing room membership.
- [x] Legacy victim-reported hits reject dead attackers as well as dead reporters
  and targets. Damage, cadence, range and impact validation remain relay-owned.
- [x] Accepted hits include `remainingHp`; remote avatar health uses this snapshot
  instead of accumulating permanent drift after a missed event. Old relay delta
  responses remain supported. This does not reconcile local environmental damage.
- [x] Client captures `pvp-hit-rejected`; analyzer breaks down captured reasons.
  Rate-limited rejection counts are explicitly not exhaustive or packet-loss rates.
- [x] Targeted relay/vitals/teardown run: 3 suites / 17 tests passed, including
  real Socket.IO invalid-impact/missing-target/range/dead-attacker and flood cases.
- [ ] Next: authoritative local health/death/redeploy contract, shared round ID,
  reason-tagged disconnect drill and paired Deck captures. Do not claim the
  44 reports / four confirmations in the old log are fully explained by this fix.

Verification: lint, docs audit and generated presubmit passed; retail reports
refreshed. Full run: 550 suites / 4,863 tests passed, with one additional concurrent
untracked `src/fabricationBay.test.js` failing import because its implementation
was not present yet. No live relay deployment or whole-branch CI claim is made.

## Iteration 5 — mutation API contracts and ambiguous review safeguards

2026-10-04. Scope: `server/steamTradeUp.js`, `server/steamInventory.js`, and their test suites.

- [x] Corrected `ConsumeItem`: parses and decodes `item_json` from Steam instead of trusting HTTP 200 alone; verifies `response.success !== false` and rejects invalid payloads.
- [x] Textual request IDs replaced with derived deterministic uint64 numeric request IDs (`deriveNumericRequestId`) for `ConsumeItem`, `AddItem` (grants), and `AddItem` (refunds), matching Steam IInventoryService Web API schema requirements.
- [x] Ambiguous transport failures (e.g. network timeout / abort during consume or grant) no longer trigger blind refunds or double-grants; they return status 502 with `exchange_outcome_requires_review` and preserve state for manual review.
- [x] Corrected `TriggerItemDrop`: live route parses `item_json` using `decodeSteamInventory` with a 15-second timeout and key redaction; supports backward-compatible `item_list` arrays and rejects Steam failures explicitly (`steam_inventory_rejected`).
- [x] Full backend test suite checkpoint: **35 files / 329 tests passed** (including resolved `server/steamTradeUp.test.js` cases). Scoped ESLint passed with 0 errors.
