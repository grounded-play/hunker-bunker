# Hunker Bunker economy: master plan

Status: proposal for owner review · Owner: publisher · Written: 2026-09-30 ·
Base: `dev/sprint-48`

**Owner's brief (2026-09-30):** free to play, **not pay to win**. Everything sold is
cosmetic. Players get items from drops and timed seasonal content, and a player
**market** is built around them. Sell through both the Steam Item Store (Wallet) and
Microtransactions. This document is the plan for doing that, and for scaling it into
revenue.

Numbers marked *illustrative* are planning assumptions, not measurements.

## 1. Principles

1. **Power is earned, never bought.** Nothing that changes combat, survival or
   progression is sold, sits in a paid cache, or can be traded or sold on the market.
2. **Cosmetics carry the economy.** They're what players buy, trade, collect and show
   off.
3. **Every paid random item has a fair, disclosed floor.** Odds are shown before
   purchase, duplicates are protected, and a cosmetic always comes out; never filler.
4. **Scarcity comes from time, not from gates.** Seasonal collections retire, so the
   market sets their value. Current content is always obtainable through play.
5. **Clear prices.** Real-money prices go through the Steam Wallet, with no invented
   premium currency hiding what things cost.
6. **Reconcile everything.** Every paid order is matched against Steam's settled
   transactions (`GetReport`) before it counts.

## 2. What exists today

| Layer | What's built | Where |
| :--- | :--- | :--- |
| Soft currencies (earned in runs) | Tech, Coin, Med, Shells | `src/bank.js` |
| Steam inventory | 125 itemdefs, about 95 marketable cosmetics across weapon skins (19), chassis (14), charms (16), decals and patches (22), FX (14), HUD themes (8) and audio (2) | `steam/inventory_schema_hunker_bunker.json` |
| Earned-only gear | 8 rig overclock modules (stats, not marketable), 8 earned rig modules, 13 Foundry recipes | `itemOwnership.js`, `fabricator.js` |
| Paid items (priced itemdefs) | Relic Decryption Key 4001 (`VLV100`), 5-key pack 4005 (`VLV400`), 15-key pack 4015 (`VLV1000`) | schema |
| Random container | Deep Relic Cache 4000 + key → roll from a disclosed table | `server/lootTables.js` |
| Free drops | Playtime generator 3000 (fragments 79%, rare fragment 15%, decal 4%, chrome skin 1%, cache 1%), boss-kill key grants | schema, `server/steamInventory.js` |
| Sinks | Fragment crafting (2100, 2200); 5→1 trade-up and shard Dispensary (server-authoritative since 2026-09-29); duplicate → Deep Core Shards | `server/steamTradeUp.js`, `craftingMatrix.js` |
| Seasons | "Deep Crust Protocol": 8 weeks, 30 ranks, weekly dispatches, free-beta rules (`commerceEnabled: false`) | `src/data/seasonOneConfig.js` |
| Sets | Six themed 7-piece sets (Deep Frost, Rust & Bone, Hive Chitin, Horizon Corporate, Bunker 404, Grand Marshal; 4200–4241) | schema |
| Free cosmetics | 30 community chassis skins, 12 achievement rewards | `communitySkins.js`, `achievementCosmetics.js` |
| Purchase plumbing | Microtransactions checkout (`InitTxn`/`FinalizeTxn`, idempotent, grant on finalize); Steam-hosted Item Store link per key; `GetReport` reconciliation every 6 h + CLI | `server/steamStore.js`, `server/steamMicroTxnReport.js` |
| Other products | Soundtrack DLC (app 4957680) | `steam/soundtrack_app_build.vdf` |

## 3. Problems to fix before money flows

| # | Problem | Why it matters | Fix |
| :--- | :--- | :--- | :--- |
| P1 | **Marketable charms carry combat stats.** Of the 16 marketable charms, 4130–4139 give pierce, fire rate, damage, healing and more (`src/data/equipmentDefinitions.js`). Stats are off in PvP and apply only once the charm's attunement rank is earned in play (`CHARM_ATTUNEMENT_RANKS`), which limits the exposure. But a bought or traded charm still becomes a stat item for anyone who has earned the rank. Reconcile with the existing earned-perk split first (S49-23). | It breaks "not pay to win" once charms drop from paid caches or sell on the market. | Split them: the tradeable charm is cosmetic only; the stat effect moves to earned charm *attunement* or Foundry perks. Or make charms non-marketable. Add a test: no marketable or cache-droppable item has modifiers. |
| P2 | **The paid cache mostly gives filler.** $1 key → 55% "3 common fragments", 25% one rare fragment, 12% decal, 8% chrome skin. | Players read this as a paid loot box that pays out junk. It's the fastest route to negative reviews. | Cache contents become a themed cosmetic collection: every opening gives a cosmetic, fragments come only as duplicate bonuses, a rare-or-better pity every 10 openings, and shards for duplicates. |
| P3 | **Two prices for one key.** The store catalog says $0.99 / $3.99 / $9.99 (`server/steamStore.js`); the schema's price categories are `VLV100` / `VLV400` / `VLV1000`. | The price shown in the Vault must equal what Steam charges, in every currency. | One source: the Item Store price categories are the truth, and the Vault shows Steam's localized price. Confirm the `VLV` mapping in Steamworks before launch. |
| P4 | **Paid loot boxes and the law.** Keys that open random items are regulated or banned in some regions (Belgium; parts of the Netherlands' guidance), need an "In-Game Purchases (Includes Random Items)" rating label (PEGI/ESRB), and invite scrutiny elsewhere. | Store removal or a fine in affected regions; ratings must match. | Always offer a **direct-purchase** route for each collection's items; region-disable key purchase where required; keep odds disclosure; declare random items in ratings. |
| P5 | **Refunds and chargebacks don't revoke anything.** | Refund-then-keep fraud. | `GetReport` already flags `reversedButGranted`; add a revoke step (consume the granted item, or mark the account) plus a manual review queue. |
| P6 | **No trade holds.** | New items (especially bought ones) can be flipped instantly: fraud and bots. | Set itemdef `market_tradable_restriction` / `market_marketable_restriction` (for example 7 days) on purchased and cache-granted items. |

## 4. Revenue streams, in order of trust and effort

| # | Stream | How | Why this order |
| :--- | :--- | :--- | :--- |
| R1 | **Direct cosmetic sales** | Priced itemdefs in the Steam Item Store and a rotating in-game shop (Microtransactions). Sets and singles; seasonal bundles. | No randomness, the highest trust, and the least regulatory exposure. The backbone. |
| R2 | **Season Pass premium track** | A free track for everyone (exists); a paid premium track of cosmetics only (*illustrative* $7.99 per 8-week season), unlocked with Microtransactions and granted by rank. | Predictable recurring revenue that rewards play, not spending. Needs `commerceEnabled` and a premium-grant path. |
| R3 | **Collection caches + keys** | One cache per season collection, cosmetic-only, disclosed odds, pity, duplicate shards (P2). Keys sold singly or in packs; also earned from bosses and weekly drops. | High ceiling and fuels the market, but only after P1–P4. |
| R4 | **Community Market fee** | Steam takes its 5%; the publisher fee is set in Steamworks (the usual default is 10%). Every player-to-player sale pays it. | Revenue that scales with the market, not with our shop. Retiring collections and trade-ups keep volume up. |
| R5 | **Supporter products** | Soundtrack DLC (exists), a digital art book, a supporter pack with an exclusive, non-tradeable cosmetic. | Low effort, and goodwill with the core audience. |
| R6 | **Creator program (later)** | Community skins (30 already exist) become a Workshop-style submission pipeline with a revenue share on sales. | Scales content production beyond the team; do it once R1–R4 are stable. |

Explicitly **not** doing:
- selling power or boosts;
- energy or timers you pay to skip;
- premium currencies that hide prices;
- paid rerolls of gameplay drops;
- selling items that were first promised as earnable.

## 5. Item lifecycle and the market

```text
design → drop in its season (cache, weekly drop, pass, shop) → season ends → retired
            (supply grows)                                        (supply fixed → market price)
                    ↘ trade-up 5→1 within the collection (sink) ↗
```

- **Seasons: 8 weeks** (the current config), each with one **themed collection** of
  about 20–30 items across all slots and rarities. The existing six sets are the
  template.
- **While live:** the collection drops from its cache, weekly playtime drops (a low
  rate), the pass, and the shop's direct rotation.
- **When retired:** it leaves the cache, the drop pool and the shop. It stays tradeable
  and marketable forever, and its trade-ups keep working inside it. The market decides
  its value.
- **Rarity bands** (cache odds, *illustrative*): uncommon 70%, rare 22%, epic 6.5%,
  legendary 1.5%, following the ladder shape standard in the genre. Always shown in
  the Vault.
- **Sinks** keep supply healthy:
  - trade-ups (5→1);
  - fragment crafting;
  - shard Dispensary;
  - consuming keys and caches;
  - cosmetic "recycling" into shards.
- **Weekly drops:** the playtime generator gets a weekly cap (`drop_interval`,
  `drop_max_per_window`) and includes the live collection at low rates, so free players
  feed the market too.
- **Market hygiene:** trade holds on new items (P6); no third-party cash-out (Steam
  Wallet funds only); no gambling integrations.

## 6. Pay-to-win guard (build rule)

A unit test and a presubmit check enforce:

- items with modifiers (`equipmentDefinitions.js`) are never marketable, never
  tradable, never in any paid or random table, and never in any store SKU;
- any stat-bearing effect a player owns was earned in play (Foundry, rig modules,
  attunement, achievements).

The original P1 finding for charms 4130–4139 is resolved by the cosmetic/earned
attunement split in S49-23 (`src/s49-23-earnedPowerFairness.test.js`). Keep this
guard for future catalog additions; the historical finding above is not an open task.

## 7. Compliance checklist

- [x] Odds shown before every random purchase (the Vault has an odds table; keep it
      current with every collection; served via /steam/store/catalog and rendered in #vault-store-odds-table).
- [H] Direct-purchase alternative for every collection item (R1). Product/catalog decision remains open.
- [x] Repository region handling and random-item disclosure implemented in
      server/steamStore.js, steamVaultUi.js, steamStoreCatalog.js and all 7 locales.
- [ ] **Publisher:** confirm submitted ratings and live store disclosures include random items.
- [x] Microtransactions: `GetReport` reconciliation, durable cursors, restart
      recovery and idempotent paid-grant retry implemented.
- [ ] **P5:** finish unattended recovery and audited item-level reversal dispositions,
      including consumed/traded items and ambiguous outcomes; preserve unresolved holds.
- [H] Steam store page: declaration, live Item Store, reviewer route, production flags,
      and real purchases require publisher authority/evidence.
- [H] No sales to accounts flagged as minors where platform rules require it (remains a
      publisher/platform policy gate; Steam handles account age; don't target children in store copy).
- [x] Terms: virtual items have no cash value; Steam's subscriber agreement governs
      Wallet and Market (disclosed in /steam/store/catalog and rendered in Vault store).

## 8. Metrics to run the economy

Instrument these before pricing experiments. Purchase logs exist (`STORE`, `VAULT`,
`FOUNDRY` lines); aggregate them server-side.

| Metric | Why |
| :--- | :--- |
| DAU / MAU, D1 / D7 / D30 retention | The audience size every revenue line depends on |
| Payer conversion (% of MAU who buy) | Health of R1–R3 |
| ARPPU and ARPDAU | Pricing and offer quality |
| Pass attach rate, and completion rate | Whether R2 is fair and valued |
| Cache opens per payer; pity triggers | Loot-box pressure (keep it modest) |
| Market volume and median price per rarity | R4 and collection health |
| Trade-up and shard sink volume | Supply control |
| Refunds and chargebacks per 1,000 orders | Fraud and satisfaction |

*Illustrative* planning scenario (not a forecast), per month: 20,000 MAU × 3% payer
conversion × $12 ARPPU ≈ **$7,200** direct. Add a pass attach of 8% × $7.99 ≈
**$1,000 per month** averaged over the season, and market fees on, for example, $15k of
player trades × 10% ≈ **$1,500**. Every figure scales with MAU, so retention work is
economy work.

## 9. Roadmap

| Phase | Goal | Work |
| :--- | :--- | :--- |
| **E0 — pass review (now)** | Steam approves purchases | Keys through the Item Store and Microtransactions; `GetReport` (done); production flags on; one real test purchase; `GetReport` output + test account in the resubmission |
| **E1 — fair launch economy** | Nothing that hurts trust at launch | P1 pay-to-win split; P2 cosmetic-only cache with pity; P3 one price source; P5 revoke on refund; P6 trade holds; the pay-to-win guard test |
| **E2 — season economy** | Recurring revenue | Season 2 collection; premium pass (R2); rotating direct shop (R1); weekly drop cap; publisher market fee set |
| **E3 — market depth** | The market sustains itself | Collection retirement at season end; trade-up and Dispensary tuned per collection; market-price surfacing in the Vault (read-only) |
| **E4 — scale** | Content beyond the team | Creator pipeline (R6); supporter products (R5); region pricing review |

## 10. Decisions for the owner

1. **Charms (P1), resolved:** cosmetic tradeable charms plus earned attunement;
   S49-23 guards the separation. No new owner choice is required for this split.
2. **Cache contents (P2):** approve cosmetic-only caches with pity every 10 openings?
3. **Prices:** confirm the `VLV` categories, and set the key, pack and pass prices.
4. **Market fee:** the publisher fee percentage (the default of 10% is common).
5. **Random items by region:** disable key purchase in Belgium, or remove keys there
   entirely?
6. **Season Pass price** and premium-track contents for Season 2.

## 11. Implementation evidence from the 2026-10-01 14:42 TODO tree

Follow the [iteration handoff](todo-tree-2026-10-01-handoff.md) and
[requested snapshot](../../public/3d/runtime/kits/modular-cave-kit/better-todo-tree-20261001-1442.txt).
The original proposal and owner decisions above are not production certification.

- [x] **Inventory evidence prerequisite for P5:** the live inventory loader now
  reads Steam's documented encoded item array and preserves exact item IDs and
  quantities; rejected/malformed responses remain failures, never an empty
  inventory or invented quantity. [Implementation](../../server/steamInventoryRead.js),
  [route tests](../../server/steamInventory.test.js).
  Four targeted suites / 80 tests and scoped ESLint passed.
- [ ] **P5 remains open:** build the explicit audited P5 resolution workflow for ambiguous,
  consumed, traded, refunded, and chargeback outcomes. Verified reads do not revoke items
  or resolve consumed, traded or refunded entitlements. Implement and test the exchange/reversal
  journal and explicit review dispositions before claiming refund recovery is complete.
- [H] **Publisher evidence remains separate:** live deployment, ratings, disclosures, pricing,
  and review evidence remain separate from repository implementation; prove live deployment,
  ratings/store disclosures, account restrictions, approved pricing and review purchases
  through the canonical Sprint 49 acceptance gates; repository checkbox changes alone are
  not evidence of Steamworks or regulatory completion.

### P5 supporting work — live crafting journal

- [x] Exact recipe consumption and reward evidence are now enforced by the
  [live exchange service](../../server/steamRecipeExchange.js). Durable account/
  request holds prevent repeat crafting after an uncertain response, including
  fresh-nonce retries; confirmed retries return the saved result.
- [ ] P5 is still open: build an explicit, audited resolution workflow for ambiguous,
  consumed, traded, refunded, and chargeback outcomes. Do not clear holds or automatically
  refund on missing response evidence. [Continuation and verification](todo-tree-2026-10-01-handoff.md#iteration-2--exact-live-crafting-and-durable-ambiguity-holds).
