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

## Next implementation order

1. **S49-08/32, economy P5:** correct remaining inventory mutation contracts in
   `server/steamTradeUp.js` and `server/steamInventory.js`. ConsumeItem currently
   trusts HTTP 200; textual request IDs are not uint64; some ExchangeItem/drop
   paths still read `item_list`. Add failure fixtures first. A lost response is
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
