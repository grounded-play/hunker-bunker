# Armory, Vault, Loot Reveal, and Progression Audit

**Status:** Audit complete; implementation brief ready for markup  
**Date:** 2026-08-23  
**Scope:** Armory dropdowns, Steam Vault/cache opening, dev economy, ownership persistence, reset behavior, XP/tier presentation, and reward reveal UX.

## Executive finding

The current systems are not one connected ownership/reward loop yet. The Armory renders large portions of the catalog directly from hard-coded ID arrays, while the Vault has a separate in-memory sandbox inventory and the Steam path has a server-backed inventory. The cache reveal animation exists, but the reward data and persistence handoff are unreliable. Season Pass XP exists, but the requested “XP bar fills, level bursts, reward claim, repeat until current position” presentation does not.

## Audit findings

### 1. Armory dropdowns

`src/armoryUi.js` renders equipment from catalog arrays and class/archetype compatibility lists. The following are visible as selectable options even when the player does not own them:

- chassis skins from `CLASS_CHASSIS_SKINS`;
- weapon skins from `ARCHETYPE_SKINS`;
- all listed decals, charms, and overclocks.

The selection handlers call `LoadoutManager` directly. `LoadoutManager` persists the equipped IDs, but the Armory UI does not perform a single ownership gate before rendering or equipping. `steamVaultUi.js` has `reconcileCosmeticsOwnership`, but that only removes already-equipped items that are no longer owned; it does not provide the Armory with an authoritative filtered catalog.

**Required correction:** derive every selectable cosmetic from one ownership-aware catalog query. Locked items should remain visible as disabled entries, clearly marked `LOCKED`, with an acquisition hint. Dev mode may expose an explicit `UNLOCK ALL` test switch, but that must not silently make production items owned.

### 2. Cache opening appears to do nothing or repeats the same result

There are two open paths:

- Browser fallback (`src/steamVaultUi.js`): consumes one cache and one key, then rolls from `[2000, 2001, 2002, 2003, 2004, 2100, 2200]`.
- Electron/server path: calls `openSteamCache`, which posts recipe `4100` to `/steam/inventory/exchange`; dev mode rolls from `server/lootTables.js`; live Steam mode asks Steam Inventory Service to resolve hidden output item `4002`.

Problems found:

- The browser fallback list does not contain the current publishable catalog range `4100–4159`, so store cosmetics cannot appear from local cache opening.
- `playCacheRevealAnimation` can render a generic “cache exchange complete” result when Steam returns no `granted` item.
- The live path expects Steam’s hidden generator/resolver configuration to be correct, but the repository cannot verify the Steamworks-side setup. A successful exchange that returns an empty grant therefore looks like the same result or an inert opening.
- The reveal animation currently presents one reward only. It does not reveal a three-part bundle of cosmetic, power-up, and currency.
- `grantVaultItem` changes the module-level `vaultItems` array but does not itself persist a browser sandbox inventory to local storage. Reopening or refreshing can therefore restore fallback contents instead of the earned contents.
- `loadVaultData` only replaces local data with the server result when that result is non-empty, which can mask an empty or stale dev inventory.

**Required correction:** make the client receive a typed, authoritative opening result such as `{ openingId, consumed, rewards: [...] }`; never infer the reward from a hidden resolver ID or from an empty array. The same resolver should be used by browser dev mode, server dev mode, and the reveal UI. Persist the dev inventory after every mutation and refresh it deterministically.

### 3. Store items are not reaching the Armory

The store currently sells cache keys. The fallback purchase path adds keys and a cache, but it does not grant the 4100–4159 store catalog directly. The cache fallback then rolls legacy IDs, so the Armory’s newer skins, charms, mods, decals, HUD/VFX/audio items, and reagents cannot reliably arrive through the intended test loop.

The Steam Vault can display catalog entries from `STEAM_ITEM_CATALOG`, `CATALOG_ITEMS`, community skins, and achievement cosmetics, but those sources are not yet unified into an ownership service consumed by the Armory.

**Required correction:** define the source-of-truth item registry and make every reward ID resolve through it. A reward is not complete until it is visible in the Vault, persists after reload, updates ownership, and appears in the compatible Armory control.

### 4. XP and level-up presentation

The project has a Season Pass system (`src/seasonPass.js` and `src/seasonPassUi.js`) with XP awards, tiers, reward descriptors, claim state, and queued XP/tier toasts. It does not currently implement the requested sequential level-up ceremony:

1. XP bar animates to the next threshold.
2. A level-up burst and particles play.
3. New level and reward are revealed.
4. A visible `CLAIM` button accepts the reward.
5. If one XP award crosses multiple tiers, the sequence repeats until the current tier is reached.

Existing `fx_levelup`/`fx_level_up` calls are feedback sounds for unrelated skill, revive, or multiplayer events, not a complete progression presentation.

**Required correction:** separate progression math from presentation. `SeasonPassManager.addXp` should return a complete transition queue (including multi-tier crossings), and a UI state machine should own animation, claim, persistence, and controller/keyboard input.

## Proposed dev-mode contract

Dev mode should make testing fast without changing the production economy:

- Infinite cache keys: opening a cache does not reduce the dev key count.
- Infinite caches: opening a cache does not reduce the dev cache count, or an explicit `INFINITE CHESTS` switch keeps the supply topped up.
- All catalog content remains locked until a reward is actually granted, unless `UNLOCK ALL` is explicitly enabled.
- Every opening grants exactly three reward lanes:
  - **Cosmetic:** weapon skin, chassis skin, decal, charm, audio/HUD/VFX item, or equivalent cosmetic.
  - **Power-up:** a usable or equipable upgrade/mod/reagent with a defined gameplay effect.
  - **Currency/material:** scrap, shards, tech, coins, or key currency.
- Each lane rolls its own rarity using a disclosed, deterministic test table. The UI shows all three results and the total rarity of each.
- A duplicate cosmetic remains a valid result and converts to a defined currency/shard payout; it must not look like an empty opening.
- A dev “reset inventory” action wipes Vault items, ownership, equipped cosmetic IDs, dev currency, cache/key counters, and pending reveal state. It must not wipe controls/audio settings unless the user explicitly chooses a full save reset.
- The reset must be deterministic and visibly confirm completion.

Suggested dev flags:

```text
HB_DEV_INFINITE_CACHE_KEYS=1
HB_DEV_INFINITE_CACHES=1
HB_DEV_UNLOCK_ALL=0
HB_DEV_REWARD_SEED=<optional integer>
```

The browser-only fallback should expose equivalent flags through the existing developer console rather than relying on production environment variables being present in a browser build.

## Proposed opening flow

```text
OPEN CHEST
  -> validate chest/key (or dev infinite supply)
  -> create idempotent opening record
  -> consume materials only after validation
  -> resolve cosmetic + power-up + currency
  -> persist all three rewards
  -> show chest burst / lid / particles
  -> reveal primary cosmetic
  -> reveal power-up
  -> reveal currency
  -> CLAIM BUNDLE
  -> refresh Vault, ownership, Armory dropdowns, currency HUD
```

The claim button should be the final commit point for the presentation, but the opening record must be persisted before the animation begins so closing the UI or restarting cannot duplicate or erase rewards. A pending opening should be recoverable and claimable exactly once.

## Armory behavior after the change

- Owned items are normal selectable options.
- Unowned items remain visible but disabled, with rarity and unlock source.
- Newly claimed items receive a short `NEW` marker in the Vault and Armory.
- Equipping immediately persists through `LoadoutManager`.
- Switching class or weapon archetype filters the compatible owned and locked options without losing the selected state.
- A reset removes ownership and automatically unequips invalid selections.
- The 3D preview must update only after an ownership-valid selection is accepted.

## Progression ceremony requirements

The new level-up UI should expose stable selectors for automated testing:

```text
#progression-reward-overlay
#progression-xp-bar
#progression-level-value
#progression-reward-primary
#progression-reward-secondary
#progression-reward-currency
#progression-claim-btn
```

Acceptance behavior:

- one-tier XP award: one fill animation, one claim;
- multi-tier XP award: one claimable reward screen per crossed tier, in order;
- claim with mouse, keyboard Enter/Space, Steam Deck A, or trigger;
- B/Escape closes only when the reward is safely persisted, or explicitly asks for confirmation;
- reload after claim shows the reward owned and the XP/tier state unchanged;
- reset removes claimed rewards and returns progression to its baseline.

## Test matrix

### Armory/catalog

- every catalog item has a resolvable definition, rarity, icon fallback, and ownership source;
- locked options cannot be selected by pointer, keyboard, or Steam Deck;
- owned rewards become selectable without restarting the app;
- class/archetype compatibility is enforced;
- equipping persists across reload;
- reset removes ownership and clears equipped cosmetics.

### Cache opening

- browser dev open produces three non-empty rewards;
- server dev open produces the same result schema;
- two consecutive openings differ when seeded differently;
- a forced seed reproduces the same three rewards;
- infinite supply leaves key/chest counts available;
- normal mode consumes exactly one cache and one key;
- duplicate cosmetics produce the documented shard/currency conversion;
- failed/open-empty responses show an error and do not consume materials;
- retrying the same request ID is idempotent;
- reload after opening preserves all rewards.

### Progression

- XP below threshold does not open the reward ceremony;
- XP crossing one tier animates and claims once;
- XP crossing multiple tiers queues each reward in order;
- unclaimed rewards survive reload;
- A/trigger, Enter/Space, mouse click, and B/Escape behavior are tested;
- reset clears pending and claimed progression rewards.

## Open questions for markup before implementation

1. Should “power-up” mean a permanent Armory mod/reagent, a run-only consumable, or both? The implementation should not mix temporary run state with permanent Vault ownership.
2. Should the three rewards always be guaranteed, or can a lane produce a duplicate that converts to currency? Recommended: always three visible lanes; duplicates convert visibly.
3. Should “currency” use the existing bank resources (`tech`, `coin`, `med`, `ammo`), Vault shards, a new scrap currency, or a mapped combination? Recommended: use existing bank resources for gameplay purchases and Deep Core Shards for cosmetic duplicates.
4. Should reset inventory clear Season Pass XP/claims too, or only Vault ownership/equipment/economy? Recommended default: inventory reset clears Vault/equipment/dev economy only; a separate full progression reset clears Season Pass state.
5. Should paid/live Steam cache openings use the same three-lane bundle as dev mode? This changes the disclosed odds and Steamworks item-definition design. Recommended: finish and verify the dev loop first, then update the live schema and odds disclosure together.
6. Should the “claim” button merely acknowledge an already-persisted opening, or should rewards remain pending until claim? Recommended: persist a pending opening before animation, finalize claim once, and recover pending openings on restart.

## Refined implementation prompt

> Audit and rebuild the Armory/Vault/progression loop as one ownership-aware system. Start by reading this brief and marking each requirement `[accepted]`, `[changed]`, or `[blocked]` with a short note. Then implement the smallest coherent vertical slice.
>
> Make the Armory dropdowns ownership-aware: show all catalog entries, but disable and label unowned items; allow only owned items or an explicit dev `UNLOCK ALL` flag to equip. Unify catalog lookup, ownership reconciliation, Vault rendering, and Armory filtering. Ensure newly granted items appear without restart and persist through reload.
>
> Repair cache opening so browser dev, server dev, and Steam paths return the same typed opening result. In dev mode provide infinite chests and keys behind explicit flags, while keeping all rewards locked until earned. Every opening must grant and visibly reveal three ranked results: one cosmetic, one power-up, and one currency/material. Support duplicate conversion, deterministic seeded tests, idempotent requests, persistence, and a reset-inventory control that clears Vault ownership, equipment, dev economy, and pending openings without silently clearing settings.
>
> Add a sequential XP/tier ceremony. When XP crosses one or more thresholds, animate the XP bar to each threshold, play a level burst and particles, reveal that tier’s reward, provide a claim button, persist the claim, then continue until the current tier is reached. Support mouse, keyboard, Steam Deck A/trigger, and safe B/Escape behavior. Add stable DOM selectors and tests for one-tier, multi-tier, reload, duplicate, reset, and controller flows.
>
> Update the relevant unit and end-to-end tests, keep production economy behavior separate from dev flags, and document any Steamworks-side configuration that cannot be verified locally. Do not mark the work complete until a reward can be opened, claimed, equipped in the Armory, observed in the 3D preview, persisted across reload, and removed by the intended reset action.

## Markup log

Use this section during review:

| Area | Decision / markup | Owner | Status |
|---|---|---|---|
| Armory ownership filtering |  |  | `[ ]` |
| Three-lane reward definition |  |  | `[ ]` |
| Dev infinite chest/key flags |  |  | `[ ]` |
| Duplicate conversion |  |  | `[ ]` |
| Inventory reset scope |  |  | `[ ]` |
| XP/tier claim ceremony |  |  | `[ ]` |
| Steam live odds/schema impact |  |  | `[ ]` |
