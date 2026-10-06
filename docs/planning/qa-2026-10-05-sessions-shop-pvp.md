# QA 2026-10-05 — solo, co-op, PvP and the shop, against Steam's needs

**Captures:** seven session logs from 2026-10-05, all on the Steam build
2.4.14-beta (`cf9f4967` for 20:08–21:25, `89b5c81a` for 21:38–21:40), Steam
Deck and a Windows PC. Both machines in each pair ran the same build, so
nothing below is version skew. Logs: `logs/hunker-bunker-session-2026-10-05*`
(the last two pulled from the server drop box).

## Verdict

The **shop could not complete a cache open for anyone**: the Steam item
schema made every live exchange fail, and the server then locked the account
against further attempts. Both halves are fixed in code, but **two steps are
yours** before players can open caches on Steam (below). PvP left the winner
with no result screen (fixed). Solo and co-op ran clean.

## What you need to do

1. **Upload `steam/inventory_schema_hunker_bunker.json` to Steamworks**
   (Inventory Service → item definitions), then publish. It changes 4002 and
   adds 4003; see "Shop" below.
2. **Deploy the backend** from a clean worktree at or after `05fe96da`
   (the clean-worktree candidate flow, `~/server/deploy-backend.sh`). Accounts
   already locked release automatically on their next cache open, two
   minutes after the stuck attempt, as long as their cache and key are still
   in their inventory.
3. Ship a client build with `8c1d7fc5` (PvP result) and `7d4ff7f8` (store
   logging) to the Steam `beta` branch.

## Sessions

| Time (UTC) | Mode | Machines | Result |
| --- | --- | --- | --- |
| 20:08–20:16 | Co-op (PvE) | Windows guest (Tank) + Deck host (Engineer) | Relay, roster, ready, 3D avatars, door sync, death and redeploy broadcasts all worked. Guest aborted at 20:14 and redeployed; host died to cybersnails at 20:15. Banks stayed at 0 (17 pickups, nothing deposited), so the base shop had nothing to sell |
| 20:20–20:38 | Solo | Deck (Engineer) | Two runs. Base shop worked: generator to level 3, hearts 3→4→5. 11 Foundry prints completed and applied. The bank (~2 million of each resource) is a test save, not earned |
| 21:21–21:25 | PvP duel | Deck host (Tank) + Windows guest (Engineer) | Hits were server-validated (4 × "pvp-rival" in 3 s). Guest died and reached Game Over; **the host got nothing** (below) |
| 21:38–21:40 | Solo menus | Deck | Foundry → STORE → open cache: **409 four times** (below) |

No runtime errors in any capture other than the store. Recurring warnings
worth a look later: `PLAYER depenetrated` bursts (wall push-outs), long tasks
of 0.5–2 s around world-model cloning, and `spawn-relocated` at the start of
every PvP round (both players were spawned on overlapping tiles).

## Shop: cache opening (fixed in code, needs 1 and 2 above)

Every **Foundry → STORE** cache open answered `409
exchange_outcome_requires_review` from `POST /steam/inventory/exchange`.

- **Cause 1, the item schema.** Opening a cache asks Steam's `ExchangeItem`
  to grant item **4002**. 4002 was a `playtimegenerator` with a
  comma-separated list and no `exchange` recipe. Valve's schema rules: an
  exchange target may be a `generator` that declares the recipe; `bundle` is
  written `defid x weight` joined by `;`; a generator grants one item, so a
  multi-item reward needs a bundle. Steam therefore rejected every open.
  Now: 4002 is a `generator`, `exchange: "4000x1,4001x1"` (cache + key),
  `bundle: "4003x55;1100x25;2100x12;2200x8"`, and new hidden bundle **4003**
  (`1000x3`) grants the three Common Relic Fragments. The odds check
  (`validateResolverOdds`) now parses Steam syntax, so disclosed odds still
  equal the server's drop table.
- **Cause 2, the server lock.** Before calling Steam the server records the
  attempt as "outcome unknown" so a crash can never re-roll or double-spend.
  A rejected call left that record forever, so every later open or craft
  for the account was refused. Now, after a 2-minute settle window, the
  server re-reads the inventory; if every material is still there at its
  pre-exchange quantity the attempt provably never happened and the new
  request runs. Anything consumed keeps the hold for review.
- **Key purchases** (MicroTxn) were not attempted in these logs; the
  backend reports purchases live and **0 purchase records**, so the first
  real purchase is still untested end to end.
- **Logging:** store successes were invisible in session logs; purchases
  and cache opens now log under `STORE`.

## PvP: no result for the winner (fixed)

The relay ended the duel with `pvpRoundCompleted`; the client turned it into
a `pvp-round-completed` event that nothing listened to. The winner saw no
result and could not vote for the rematch, so a rematch could never start.
Now the winner gets a **RIVAL ELIMINATED** victory screen with the rematch
button, the result is logged, and a rival's death in PvP no longer says
"SQUADMATE LOST". Covered by `tests/e2e/pvp-round-result.spec.js`.

## Against Steam's needs

| Area | Steam expects | State |
| --- | --- | --- |
| In-game purchases (MicroTxn) | InitTxn → overlay → FinalizeTxn; refunds and chargebacks handled | Backend live and reporting; **first real purchase not yet exercised**; reversal handling shipped in `62097fcc` |
| Steam Inventory | Valid item schema; exchanges through `ExchangeItem` | **Fixed schema needs uploading**; server lock fixed |
| Paid random items | Odds disclosed in game and on the store page; "In-Game Purchases (Includes Random Items)" | Odds shown in the Vault and returned by the catalog; legal terms returned; regional (BE/NL) decision still open in `docs/steam-lootbox-odds-disclosure.md` |
| Trade/market holds | Hold periods on marketable items | 7-day holds set (`473bca9f`) |
| Multiplayer | Lobbies work across Deck and PC; clear results | Co-op solid; PvP result fixed; spawn overlap at round start remains |
| Steam Deck | Controller-only, readable text, no mouse needed | Recent fixes (tabs, HUD floors); the store's purchase flow opens the Steam overlay, which works on Deck |
| Support evidence | Enough record to answer a purchase dispute | Session logs now include store outcomes; server keeps purchase and exchange journals |

## Follow-ups (not done)

- Exercise one real key purchase on the `beta` branch after the deploy, and
  one cache open, and attach both session logs here.
- PvP round-start spawn overlap (`spawn-relocated` on every round).
- Depenetration bursts and 2 s long tasks during world-model cloning.
