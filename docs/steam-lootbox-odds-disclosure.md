# Steam Loot Box Odds Disclosure & Policy Notes

Date: 2026-07-13.

Hunker Bunker ships free-to-play with a real-money cosmetic economy. This
doc records the compliance shape of that decision and exactly what still
needs sign-off before it goes live with real money attached. It supersedes
the "lootboxes deferred" stance in earlier planning docs — see the updated
Decision Log in `docs/steam-implementation-status-and-roadmap.md`.

## The model: crate + key, not a paid gacha pull

This mirrors Valve's own long-shipped pattern (CS:GO-style cases), not a
new mechanic:

- **Deep Relic Cache** (itemdefid `4000`) — drops for free during play (a 1%
  slice of the existing playtime-drop roll in
  `server/steamInventory.js`, and the schema's `bundle` field on the
  hidden playtime generator). Tradable/marketable, but worthless without a
  key.
- **Cache Key** (itemdefid `4001`) — the *only* item sold for real money.
  Buying a key does not itself guarantee you own a Cache.
- Opening a Cache consumes one Cache + one Key (exchange recipe `4100` in
  `server/steamInventory.js`) and rolls a reward from
  `server/lootTables.js`.

Buying a key is a fixed-price, guaranteed-delivery purchase (you get a
key). The randomness is entirely in what a *free* Cache contains when
opened — this is the distinction several regulators and Valve's own policy
care about, and it's why this shape was chosen over a direct "pay for a
random item" SKU.

## Disclosed odds must equal actual odds

`server/lootTables.js` is the single source of truth. Both the public
`GET /steam/store/catalog` response (`deepRelicCacheOdds`) and the actual
server-side roll (`rollDeepRelicCache()`) read from the same
`DEEP_RELIC_CACHE_DROP_TABLE` constant — there is no second copy of the odds
anywhere to drift out of sync. The client renders this table in the Vault
STORE tab before any purchase button is shown (`main.js`
`renderOddsTable()`).

Current published odds:

| Reward | Odds |
| --- | --- |
| Common Relic Fragment x3 | 55% |
| Rare Relic Fragment | 25% |
| Carbon Fiber Decal | 12% |
| Chrome Plated Sidearm | 8% |

If these weights change, they change in exactly one place
(`DEEP_RELIC_CACHE_DROP_TABLE`), and the store page odds update automatically
on next fetch — there is no separate marketing copy to remember to update.

## What's still gated off, and why

`HB_STEAM_MICROTXN_ENABLED` defaults to unset/off. With it off,
`server/steamStore.js` always fulfills `purchase/init` through the mock
path — it grants keys immediately without charging anything, so
Playtest/dev builds work end-to-end today. Turning on real charges
requires:

1. Valve enabling **Microtransactions** for this Steam app in Steamworks —
   a separate partner agreement and tax/banking setup beyond the base Web
   API publisher key. Nothing in this codebase can do that step; it's an
   account-level action only the Steamworks partner admin can take.
2. Verifying the `ISteamMicroTxn` `InitTxn` → overlay confirmation →
   `QueryTxn` → `FinalizeTxn` flow in `server/steamStore.js` against a
   real Steamworks sandbox — this repo could not test that path live and
   flags it in code comments (`server/steamStore.js`,
   `server/steamInventory.js`'s recipe-4100 real-mode branch).
3. Confirming the itemdefid `4002` hidden resolver (the Steamworks-side
   item the real `ExchangeItem` call targets so Valve rolls the reward
   server-side) is configured correctly in Steamworks Inventory admin —
   see the comment on that item in
   `steam/inventory_schema_hunker_bunker.json`.

## Regulatory notes (not yet acted on — flagging for a legal/business call)

- **Belgium and the Netherlands** have historically treated paid loot
  boxes containing randomized in-game items as gambling, in some cases
  requiring a gambling license or banning the mechanic outright depending
  on current enforcement posture. This changes over time and by
  jurisdiction — get current legal advice before launch, don't rely on
  this doc's snapshot. Nothing in this codebase currently geo-gates the
  STORE tab or offers a direct-purchase (non-random) fallback for those
  regions; that's an open decision, not a shipped mitigation.
- **China** requires published drop-rate odds for any paid item involving
  randomness. The disclosed-odds table above satisfies the letter of that
  today, but full China compliance (additional filings, review) is broader
  than this doc covers.
- **Minors / age-rating bodies** (PEGI, ESRB) increasingly require
  disclosure of "in-game purchases include random items" on the store
  page and packaging. `docs/steam-portal-copy.md` / the store description
  in `docs/steam-store-assets-plan.md` should be updated to include that
  language before submitting for rating — not yet done as of this doc.

None of the above blocks shipping the mock/dev-mode economy (no real money
moves today), but all of it should be resolved — with actual legal
sign-off, not an agent's best-effort reading of public policy — before
`HB_STEAM_MICROTXN_ENABLED=1` goes live anywhere real players can pay.
