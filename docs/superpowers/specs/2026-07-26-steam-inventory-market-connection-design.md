# Steam Inventory Grant + Market Link Connection — Design

**Date:** 2026-07-26
**Status:** Implemented (2026-07-27)

## Problem

`server/steamInventory.js` already implements six real, tested Steam
Inventory/Market routes (`GET /steam/inventory`, `trigger-drop`,
`grant-promo`, `exchange`, `grant-milestone`, `market/eligibility`), all
idempotent, rate-limited, and dev-mode mocked. Most of them are already
wired to real gameplay:

- Achievement unlocks (`slay_the_queen`, `archivist`) → `grant-milestone`
- Boss/Queen kill → guaranteed Deep Relic Cache via `grant-milestone`
- Salvage-cache opens (15% roll) → `trigger-drop`
- Crafting/fusion recipes and cache-opening → `exchange`
- The Steam Vault UI (`src/steamVaultUi.js`) reads real inventory, shows
  live Market Eligibility, and can open Steam's overlay for the hosted
  item store

Two real gaps remain, both small:

1. **`POST /steam/inventory/grant-promo`** — grants a class Victory Patch
   (Scout/Tank/Engineer) on a successful extraction — is fully implemented
   and tested server-side but has no client wiring at all: no
   `preload.cjs` bridge method, and no call at the run-victory site.
2. The Vault UI's per-item "MARKETABLE" tag is read-only display copy
   ("Market actions are handled externally through Steam.") with no actual
   link to Steam's Market or Inventory for the player to act on it.

This program closes both gaps. It does not touch the lootbox, store,
crafting, or trading systems, which are complete and out of scope — this
is grant-side plumbing and a UI link only.

## Non-goals

- No per-item Steam Market deep link. That requires the item's exact
  `market_hash_name`, which is configured per Item Definition on the
  Steamworks Partner dashboard and is not available to this code. Guessing
  a string here risks a dead or wrong link; the design below uses a link
  that is correct regardless of dashboard-side naming.
- No dashboard changes. Whether Marketable is actually enabled per Item
  Definition, and whether Community Market is enabled for the app, is
  operator-owned work on partner.steamgames.com — the same category of
  external dependency as the leaderboard/stat IDs configured earlier this
  sprint. Code in this program is correct and ready regardless of when
  that dashboard work lands.
- No change to when/how often a Victory Patch can be earned beyond what
  `grant-promo`'s existing `mode: 'once'` semantics already provide (see
  below).

## Piece 1: Wire `grant-promo` to run-victory

### Client bridge

`electron/preload.cjs`, alongside the existing `triggerSteamPlaytimeDrop` /
`requestSteamMilestoneGrant` / `exchangeSteamInventory` entries in the
`electronAPI` object:

```js
requestSteamPromoGrant: (classType, requestId = `promo-${Date.now()}-${Math.random().toString(36).slice(2)}`) => (
    withSteamSession('/steam/inventory/grant-promo', { classType, outcome: 'victory', requestId })
),
```

This follows the exact default-`requestId` convention already established
by `purchaseSteamKeys` and `openSteamCache` in the same file.

### Call site

`main.js`'s `runAct2DepartureSequence` (~line 7816) already computes both
`classType` and `outcome: 'victory'` for the `recordAchievementRunEnd`
call right above where the new code goes. Add, in the same
`if (window.electronAPI) { ... }` gated block style as the existing
achievement-unlock and boss-kill handlers (~main.js:9545-9584):

```js
if (window.electronAPI?.requestSteamPromoGrant) {
    window.electronAPI.requestSteamPromoGrant(game?.playerType ?? getSelectedHeroType())
        .then((result) => {
            (result?.granted ?? []).forEach((item) => showSteamDropToast(item.itemdefid, item.quantity));
        })
        .catch((err) => {
            console.log(`[steam] victory promo grant skipped: ${err?.message ?? err}`);
        });
}
```

Placed inside `runAct2DepartureSequence`, right after the existing
`recordAchievementRunEnd(...)` call, so it fires exactly once per
successful extraction, using the same `classType` value already computed
there.

### Why no new tracking is needed

`server/steamGrant.js`'s `grantItemToPlayer` already treats `mode: 'once'`
(what `grant-promo` uses) as ownership-gated: if the player already owns
that class's patch, the call is a safe no-op (`granted: []`,
`info: 'already_granted'`) in dev mode, and in real mode Steam's own
`AddItem/v1` is deduplicated via the per-call `requestId`. A player who
extracts with Scout five times only ever receives one Scout Victory Patch,
with no client-side "have I already granted this" bookkeeping required —
identical in shape to how the existing achievement-item grants behave
today.

## Piece 2: Generic Steam Market/Inventory link in the Vault UI

### Markup

`index.html`, inside `.vault-details-actions` (~line 565), alongside the
existing `#vault-equip-status` span:

```html
<button class="start-btn vault-btn-view-market hidden" id="vault-btn-view-market">VIEW IN STEAM MARKET</button>
```

Starts hidden; `updateDetailsPanel` toggles it per selected item.

### Behavior

`src/steamVaultUi.js`'s `updateDetailsPanel` (~line 388), alongside the
existing `marketableEl` handling:

```js
const btnViewMarket = document.getElementById('vault-btn-view-market');
if (btnViewMarket) {
    const canView = Boolean(catalog.marketable) && canOpenMarketOverlay();
    btnViewMarket.classList.toggle('hidden', !canView);
}
```

Click handler, registered once (alongside the existing
`vault-store-hosted-btn` listener at ~line 262):

```js
document.getElementById('vault-btn-view-market')?.addEventListener('click', () => {
    if (!window.electronAPI?.openSteamOverlayToUrl) return;
    window.electronAPI.openSteamOverlayToUrl('https://steamcommunity.com/market/search?appid=4957040');
});
```

This reuses the exact `openSteamOverlayToUrl` bridge already used for the
hosted item store CTA and the purchase-confirm flow — no new IPC channel,
no new main-process handler.

The link targets the app's Market search page, not a specific item
listing. This is deliberately generic (see Non-goals) — it is always a
valid, correct URL regardless of what `market_hash_name` the operator
eventually assigns to each Item Definition, and gets the player to the
right place (Steam's own Market, filtered to this game) to find and act
on any marketable item they own.

## Verification plan

- Extend `server/steamInventory.test.js`'s existing `grant-promo` coverage
  is not needed (unchanged, already passing) — this program only adds
  client-side code, no server changes.
- New unit coverage for the `requestSteamPromoGrant` preload bridge
  method is not practical to unit test in isolation (preload.cjs has no
  existing test file; the pattern of `purchaseSteamKeys`/`openSteamCache`
  it mirrors is likewise untested at that layer) — verified instead by
  code review against the existing bridge methods' exact shape.
- Manual/live verification (deferred to whenever the shared machine's
  load allows a live Electron/browser session, per this session's
  established practice): trigger a run victory in dev mode and confirm
  a Victory Patch toast appears exactly once per class; open the Vault,
  select a marketable item, confirm the "VIEW IN STEAM MARKET" button
  appears only for marketable+eligible items and opens the Market search
  URL.
- `npx vitest run`, `npx eslint .`, `npx vite build` must stay green —
  the existing static-verification gate for every change this sprint.

## Implementation verification

Implemented on 2026-07-27. Static verification passed:

- `npx vitest run` — 83 files, 677 tests
- `npx eslint .`
- `npm run build`, including the required-media audit
- `git diff --check`

Live Steam overlay and successful-extraction verification remains dependent
on running the packaged Electron build with an authenticated Steam client.
