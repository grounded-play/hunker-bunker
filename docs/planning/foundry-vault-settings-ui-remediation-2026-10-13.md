# Foundry, Steam Vault, and Settings UI remediation plan — 2026-10-13

## Decision summary

The next UI pass should start with the Steam Vault inventory model, not cosmetic CSS. The current
view renders every Steam inventory response row as a separate card, so repeated item definitions
become repeated cards unless Steam has already combined them into one row. At the same time, the
Steam Deck height rule caps the grid at 220 px inside a 611 px Foundry panel. Those two behaviors
create the apparent overflow seen in the Foundry capture.

After stacking is fixed, add a real filter/sort toolbar and make the inventory grid the only scroll
owner. Then harden the cache reveal as a modal state machine and make Settings use one category bar.
Do not change the underlying Steam instance ledger or exchange inputs: stacking is a presentation
projection, while Steam item instance IDs remain authoritative for consumption and trading.

## Implementation progress — 2026-10-13

Implemented in the current working tree:

- **Phases 1–2:** `src/vaultInventoryView.js` now builds a presentation-only inventory projection
  with stable stack keys, summed quantities, search, catalog-backed group and rarity filters, sort,
  diagnostics, and selection reconciliation. `src/steamVaultUi.js` renders that projection while
  leaving the raw Steam rows and instance IDs intact for exchanges. The Stash now exposes localized
  search/filter/sort/clear controls and live visible/total counts.
- **Phase 3:** the 220 px Deck grid cap is removed. The Foundry Stash gives the inventory the
  available height, keeps one bounded scroll owner, limits the detail rail to roughly one third of
  the panel, and collapses to a single-column inventory/details flow at the narrow breakpoint.
- **Phase 5:** all seven Settings categories now remain in one non-wrapping bar, with horizontal
  overflow at narrow widths. Tabs and panels have explicit ARIA relationships; Left/Right,
  Home/End, Q/E, and bumper navigation retain the existing behavior and scroll the active tab into
  view.
- **Regression coverage:** projection unit tests cover duplicate Steam rows and filters; the new
  Foundry E2E test proves duplicate stacking, discovery controls, and a grid taller than the old
  220 px cap; the Settings E2E contract now covers all seven pages in one row. The localization
  audit reports zero unannotated markup and zero unlocalized runtime strings.
- **Phase 4:** cache opening now follows the guarded
  `idle → submitting → spinning → revealed → settling → idle` lifecycle. The committed receipt is
  rendered before inventory refresh, the Open action is disabled during the transaction, timers are
  token-guarded and cancelled with the host, and Claim restores the originating focus and grid
  scroll. The reveal is an ARIA modal with trapped keyboard focus, a localized Reveal Now action,
  a reduced-motion fast path, and a localized Retry Sync action if the post-commit inventory read
  fails. State transitions log the run ID and Foundry/Vault host without Steam identity data.
- **Phase 4 regression coverage:** the Foundry browser contract verifies one exchange request,
  Skip/Claim focus handoff, focus containment, refresh failure and retry, reduced motion, and
  close/reopen timer cancellation. `src/cacheOpening.test.js` rejects illegal state transitions.
- **Layout matrix:** the Stash contract now checks its single scroll owner, toolbar clipping, grid
  height, and detail-rail ratio at 1280×800, 1920×1080, 2560×1440, and the supported 150% UI scale.
  Settings checks the same desktop sizes, 150% UI scale, and a 760 px horizontal-overflow case,
  including automatic scrolling of the keyboard-selected tab.

Still open:

- Run the packaged Steam manual checks for real Steam overlay/input behavior; the repeatable browser
  layout, reduced-motion, transaction, and recovery contracts are now automated.

## Evidence reviewed

- The newest files currently present in `logs/` are October 12 sessions built from commit
  `920f240647e4`. They show Steam identity/backend success and ordinary menu snapshots, but no
  cache-open/uncase interaction or UI exception.
- The latest useful Foundry navigation trace is
  `logs/hunker-bunker-session-2026-10-06T18-56-25-273Z-mux1i1p9-ggb6.json`. It records Steam Vault →
  Foundry Stash, an inventory-card click, then Loadout, Fabricate, Trade-up, and Store. It confirms
  the affected route but does not serialize layout geometry.
- Current code already documents and fixes one older October 6 failure: the reveal used to remain
  inside the hidden standalone Vault while the Foundry Store was open. `mountRevealOverlay()` now
  reparents it into the visible Foundry modal. The remaining problems are presentation and state
  ownership, not that original hidden-overlay defect.
- A controlled current-branch capture at 1280×800 used 73 inventory response rows. The DOM rendered
  73 cards. The grid measured 648×220 with `scrollHeight=267`, while its Foundry panel measured
  1105×611. This reproduces the density/overflow complaint.
- Settings currently contains seven tabs, but the desktop rule declares six columns. Measured tab
  tops were 111 and 163 px, proving it wraps to two rows at 1280×800. The focused Playwright check
  also fails because it still expects six pages and omits the newer Graphics page.

## Current screenshots

- [Foundry Stash with unstacked duplicate instances](../reports/assets/ui-vault-settings-audit-2026-10-13/foundry-stash-duplicates-1280x800.png)
- [Cache reveal while spinning](../reports/assets/ui-vault-settings-audit-2026-10-13/foundry-uncase-spinning-1280x800.png)
- [Cache reveal result](../reports/assets/ui-vault-settings-audit-2026-10-13/foundry-uncase-revealed-1280x800.png)
- [Settings category wrap](../reports/assets/ui-vault-settings-audit-2026-10-13/settings-tabs-1280x800.png)

The screenshots are diagnostic fixtures with a mocked Steam identity and inventory; they exercise
the production DOM, CSS, Foundry host, and reveal renderer without granting or consuming live items.

## Findings

### P0 — inventory rows are treated as display stacks

`loadVaultData()` assigns `result.inventory` directly to `vaultItems`, and
`renderInventoryGrid()` loops that raw array. A quantity badge appears only if a single response row
already has `quantity > 1`. Separate Steam instances with the same `itemdefid` remain separate
cards. Selection is also keyed by `itemId`, so a refresh can leave the detail panel pointing at an
instance no longer present in the refreshed array.

Impact:

- duplicate cards crowd the Stash and make ownership hard to scan;
- the same cosmetic appears repeatedly instead of one card with a total;
- selecting, filtering, and restoring scroll will be fragile across a post-uncase refresh;
- presentation pressure grows linearly with instance count even when the number of unique items is
  small.

### P0 — the Deck layout intentionally constrains the wrong element

The `max-height: 850px` landscape rule sets `.vault-grid { max-height: 220px !important; }`.
The Foundry shell already has a bounded flex panel and the grid already supports `min-height: 0`
and scrolling. The extra cap leaves a large empty lower region while compressing dozens of cards
into a short strip. The parent Foundry panel also scrolls, creating two potential scroll owners.

The detail panel is disproportionately dominant. Its name uses the global large font token and its
market action inherits the global `.start-btn` rules, including very wide padding and medium display
font. In the capture, the detail name and market button are more visually prominent than the
inventory itself.

### P1 — no inventory discovery controls

The inventory markup contains only a title, verification badge, grid, and empty state. There is no
search, type filter, rarity filter, ownership-state filter, sort, result count, or clear action.
The shared item catalog already supplies the item kind/type required for this through
`src/data/itemCatalog.js` / `src/itemOwnership.js`; this does not require inventing categories from
item names.

### P1 — cache reveal owns pixels but not a complete modal lifecycle

The reveal is visually full-panel but semantically remains a nested `div` with `aria-hidden`; it has
no dialog role, focus handoff, progress/skip action, or restoration of the originating tab, focus,
filter, and scroll state. Fixed timers at 2.95 and 3.2 seconds control completion. On a successful
Steam exchange, `loadVaultData()` runs before the animation starts, so the underlying inventory can
rerender before the player has seen or claimed the result.

The current spinning treatment is a small reel centered in a nearly empty full-panel mask. The
result card is readable, but its compact content floats inside the same large blank region. This is
why the flow feels detached from the Store/Foundry rather than like a coherent operation within it.

### P1 — Settings is not one bar and its automated contract is stale

`index.html` defines seven categories. `style.css` uses `repeat(6, ...)`, so Profile & Saves wraps
onto a second line. The 761–1180 px rule changes that to three columns, producing three rows on
narrow PC windows. The existing controller test is named “six settings pages,” asserts six tabs,
and does not exercise Graphics. It currently fails with expected 6 / received 7 before reaching its
layout checks.

## Implementation plan

### Phase 1 — add a derived, stack-safe inventory view

Files:

- `src/steamVaultUi.js`
- new focused helper such as `src/vaultInventoryView.js`
- `src/steamVaultUi.test.js` or a new `src/vaultInventoryView.test.js`

Work:

1. Keep `vaultItems` as the raw authoritative ledger used by exchanges, cache/key selection,
   ownership reconciliation, and Steam instance IDs.
2. Add a pure projection that groups rows by normalized `itemdefid` and returns
   `{ key, itemdefid, quantity, instances, catalog }`. Sum quantities but retain every source row in
   `instances` so a future trade/equip action can resolve exact instance IDs.
3. Render cards from the projected stacks. Key selection by stable stack key, not one transient
   `itemId`. Reconcile selection after every refresh: keep the same item definition if it still
   exists, otherwise select the first visible stack or clear details.
4. Show a quantity badge for every stack above one and expose the same count in the accessible name
   and detail panel.
5. Never combine entries whose visible/actionable state differs if Steam later supplies such state;
   extend the grouping key with that state instead of discarding it.

Acceptance:

- five one-quantity rows for item 4100 render as one `x5` card;
- a quantity-three row plus two quantity-one rows render as `x5`;
- raw instance IDs and raw quantities remain unchanged and available to exchange code;
- refresh preserves selection by item definition and never paints stale details;
- unknown catalog entries are counted for diagnostics and do not break rendering.

### Phase 2 — add search, filters, sorting, and a useful count

Files:

- `index.html` near `#vault-item-grid`
- `src/steamVaultUi.js` / `src/vaultInventoryView.js`
- `style.css`
- locale files under `src/locales/`

Work:

1. Add one compact toolbar above the grid: text search, kind filter, rarity filter, sort, and Clear.
2. Use item catalog kinds to group filters into readable player concepts: All, Cosmetics/Gear,
   Mods, Materials/Reagents/Shards, and Caches/Keys. Offer rarity as a separate filter so category
   and rarity compose.
3. Sort options: newest/raw service order, name, rarity high-to-low, and quantity high-to-low.
4. Show `N item types · M total items`; when filtered, show `N of T` and a distinct no-results state.
5. Preserve the toolbar state and grid scroll while moving among Foundry tabs and while completing
   an uncase. Reset it only when the player uses Clear or the Steam account changes.
6. Make every control keyboard/controller reachable with concise localized labels. Use a select or
   segmented control that does not consume a second screen row at 1280×800.

Acceptance:

- search matches localized display name and item definition ID;
- every visible card satisfies all active filters;
- filters operate on stacks, not raw rows;
- controller traversal goes toolbar → grid → details without a focus trap;
- German, Russian, Japanese, and 200% text-scale layouts remain usable.

### Phase 3 — repair Foundry/Stash proportions and scroll ownership

Files:

- `style.css` Vault section and Steam Deck media rule
- `src/styles/foundryHub.css`

Work:

1. Remove the 220 px grid cap. Let the inventory layout fill the Foundry panel and make the grid the
   only vertical scroll owner on Stash. The outer panel should stay fixed for Stash, with tab-specific
   scrolling only where Fabricate/Trade-up genuinely need it.
2. Use a bounded detail rail (`clamp()`/`minmax()`, approximately 260–340 px at Deck size) and give
   the grid the remaining width. Collapse details into a drawer below the grid only below the
   supported narrow breakpoint.
3. Scope item title, art, metadata, and market button typography inside Foundry/Vault. Do not let
   global `.start-btn` padding make the market action a hero CTA.
4. Use a stable 72–96 px card minimum with `auto-fill`; preserve readable art and a corner quantity
   badge without stacking cards visually on top of one another.
5. Keep the Foundry header and tabs fixed. Add subtle top/bottom scroll affordances to the grid.

Acceptance at 1280×800:

- inventory uses the available panel height instead of stopping at 220 px;
- no nested vertical scrollbars;
- details consume no more than roughly one third of content width;
- all card rows align, badges remain inside cards, and no control is clipped;
- the current 73-row mock becomes the unique stack count and remains navigable at 200% UI scale.

### Phase 4 — make uncase a transactional modal state machine

Files:

- `src/steamVaultUi.js`
- `index.html` reveal markup
- `style.css` reveal section
- `src/cacheOpening.test.js` plus a new Foundry reveal E2E spec

Work:

1. Replace independent timeouts/boolean busy state with explicit states:
   `idle → submitting → spinning → revealed → settling → idle`.
2. Capture the origin before submission: active Foundry tab, focused element, filters, selected stack,
   and grid scroll. Disable the Open button immediately and expose a live status while the backend
   request is pending.
3. On success, show the reveal from the committed response first. Refresh/merge the inventory during
   settling or on Claim, then restore the Store or Stash state deliberately. A refresh failure must
   keep the committed reward receipt visible and offer Retry Sync.
4. Give the overlay `role="dialog"`, `aria-modal="true"`, a labelled title/status, a deterministic
   focus target, focus containment while visible, and focus restoration on Claim.
5. Add Skip/Reveal Now after the backend result exists. Reduced-motion mode should bypass the reel
   but still show the result and duplicate conversion clearly.
6. Cancel or token-guard animation timers when the host closes, the account changes, or another
   open attempt supersedes the current one. Prevent double claim and repeated result bundles.
7. Recompose the visuals to use more of the Foundry plate: larger reel/result region, persistent
   cache/key transaction summary, and a clear “duplicate → shards” line rather than a small label in
   a compact bundle.
8. Log state transitions and render context (`host=foundry|vault`, opening ID, reward count, duplicate
   conversion, refresh outcome) without logging private Steam identifiers.

Acceptance:

- an Open click causes exactly one exchange request;
- underlying Foundry controls cannot receive input during the reveal;
- duplicate reward, shard conversion, and final stack count are all visible;
- Claim returns focus and preserves filter/scroll state;
- closing/reopening cannot reveal a stale reward or leave `cacheOpeningBusy` stuck;
- success with a failed inventory refresh still presents the committed result and recovery action.

### Phase 5 — make Settings one category bar

Files:

- `style.css` settings rules
- `index.html` tab/panel ARIA wiring
- `main.js` settings keyboard handling
- `tests/e2e/controller-focus.spec.js`
- `tests/e2e/menu-tab-switching.spec.js`
- `tests/e2e/ui-layout-contract.spec.js`

Work:

1. Render all seven categories in one horizontal bar at desktop and Steam Deck sizes. Use seven equal
   columns where they fit, with tighter gap/type at 1280×800.
2. Below that width, preserve one bar with horizontal overflow, snap points, edge fades, and automatic
   scroll-to-active instead of wrapping into two or three rows.
3. Add panel IDs and `aria-controls`/`aria-labelledby`; support Left/Right, Home/End, Q/E, and bumper
   cycling without changing the current content behavior.
4. Keep only the active panel scrollable. Header and category bar remain fixed; no page-level or
   accidental modal scroll.
5. Update the stale six-page test to seven pages and include Graphics in every fit, pointer-sweep,
   keyboard, and controller pass.

Acceptance:

- the seven tab top coordinates are identical at 1280×800 and 1920×1080;
- at narrow widths there is one horizontally scrollable row, never a wrapped row;
- active tab always remains visible after keyboard/controller cycling;
- every category, including Graphics, passes the no-unintended-scroll contract;
- localized labels remain readable or scrollable without overlapping adjacent tabs.

## Verification matrix

Automated:

- unit tests for grouping, quantity totals, stable keys, filters, sort, and selection reconciliation;
- E2E with 70+ raw instances and repeated definitions at 1280×800;
- E2E cache open from Foundry Store through spinning, revealed, Claim, refresh failure, and retry;
- E2E Settings seven-tab single-row geometry and full controller traversal;
- layout snapshots at 1280×800, 1920×1080, 2560×1440, 200% UI scale, reduced motion, and long
  locales;
- console/page-error capture during every route.

Manual on packaged Steam build:

- real account with separate duplicate instances;
- open from Foundry Store, including a duplicate cosmetic conversion;
- Steam Deck touch, mouse, and controller passes;
- account/offline transition while the Vault is open;
- close/reopen and app restart to confirm no duplicated grant or stale reveal.

## Recommended order and completion boundary

1. Stack projection and selection reconciliation.
2. Grid height/scroll fix and scoped detail styles.
3. Filter/sort toolbar.
4. Uncase state machine and focus lifecycle.
5. Single-bar Settings and stale test repair.
6. Full viewport/localization/controller verification, then packaged Steam validation.

This phase is complete only when duplicates are represented by one display stack, a crowded Vault is
filterable without nested overflow, the uncase transaction returns to a stable Foundry state, and all
seven Settings categories occupy one bar on the 1280×800 target.
