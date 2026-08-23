# Armory / Vault / Progression — Audit and Requirement Disposition

Date: 2026-08-23. Brief: rebuild the Armory/Vault/progression loop as one
ownership-aware system.

Every requirement below is marked `[accepted]`, `[changed]`, or `[blocked]`
against **what the code actually does today**, verified by reading it rather
than assuming. Findings first, dispositions second.

## Findings

**F1 — The Armory has no concept of ownership at all.**
`src/armoryUi.js` renders every dropdown from static allow-lists
(`CLASS_CHASSIS_SKINS[cls]`, `ARCHETYPE_SKINS[archetype]`, and for insignia a
literal array `['4120'...'4129']` hardcoded inline at `src/armoryUi.js:184`).
No option consults an inventory. Anything listed is equippable.

**F2 — Ownership logic exists, but only reactively, and in two copies.**
`reconcileCosmeticsOwnership()` (`src/steamVaultUi.js:511`) strips unowned ids
out of three `localStorage` keys, then calls `window.loadout.reconcileOwnership()`
(`src/loadout.js:414`) which repeats the same "is it in the owned set" logic
against a different state shape. Both *remove* invalid equips after the fact.
Neither exposes a "do I own this?" query, which is exactly what the Armory
would need to grey an option out.

**F3 — Ownership does not persist.** `vaultItems` is a module-local array in
`src/steamVaultUi.js`. `grantVaultItem()` pushes into it; nothing writes it to
storage. On reload it is rebuilt from `refreshSteamInventory()`, or falls back
to a hardcoded 5-item sandbox list. So a dev/sandbox grant is gone on refresh.

**F4 — The three cache-opening paths return three different shapes.**
- Browser/dev (`!window.electronAPI?.openSteamCache`): grants **one** random id
  from a hardcoded pool `[2000, 2001, 2002, 2003, 2004, 2100, 2200]`, plus
  bonus shards on a duplicate. Returns nothing.
- Steam: `window.electronAPI.openSteamCache()` → reads `result.granted[0]`.
- There is no server-dev path distinct from browser-dev.

That dev pool is 7 ids out of a 71-item catalog, and excludes the entire
4100–4159 range — every weapon finish, chassis skin, insignia, charm, mod and
material is **unobtainable in dev**. Nothing anywhere grants the required
"three ranked results".

**F5 — No dev economy flags, no reset control.** `unlock_all` exists but is
achievements/codex only (`main.js:7940`). There is no cosmetic UNLOCK ALL, no
infinite chest/key flag, and no reset-inventory action.

**F6 — Season pass has tiers and claims, but no ceremony.**
`src/seasonPass.js` has `XP_PER_TIER`, `TOTAL_TIERS`, `TIER_REWARDS`,
`isClaimed`/`canClaim`/`claim`. `src/seasonPassUi.js` renders a static grid
with per-tier CLAIM buttons. There is no XP-bar animation, no burst/particles,
and no sequential walk through multiple crossed thresholds.

**F7 — The item space is three namespaces, not one.** Found while wiring A1:
`CLASS_CHASSIS_SKINS` (`src/loadout.js:28`) mixes Steam itemdefids with two
other kinds of id that appear in no catalog at all —

- `5001`–`5012`, the achievement reward cosmetics in
  `ACHIEVEMENT_COSMETIC_REWARDS` (`src/achievements.js:19`);
- 30 community chassis skins with opaque string ids (`comm_scout_abg` …),
  every one shipping `isUnlockedDefault: true`.

A catalog-only ownership check would have silently deleted all 42 from the
Armory. They are now registered into the unified catalog, with community skins
marked default-owned and achievement rewards owned via an external-source hook.
This also means id normalisation cannot just be `Number()` — that turns every
`comm_*` id into `NaN`.

**F8 — Achievement reward cosmetics never had names.** `5001`–`5012` were
absent from both catalogs, so `CATALOG_ITEMS[id]?.name || id` rendered them as
the literal string `"5001"` in the chassis dropdown. They now take their name
from the granting achievement's `title`.

## Requirement disposition

### A. Ownership-aware Armory

| # | Requirement | Status |
|---|---|---|
| A1 | Show all catalog entries; disable + label unowned | `[accepted]` |
| A2 | Equip only owned, or dev `UNLOCK ALL` flag | `[accepted]` |
| A3 | Unify catalog lookup, reconciliation, Vault render, Armory filter | `[accepted]` |
| A4 | Newly granted items appear without restart | `[accepted]` |
| A5 | Persist through reload | `[changed]` |

**A1 note:** currently impossible — see F1. Requires an ownership query first.

**A5 note — `[changed]`:** the brief reads as though persistence exists and is
flaky. It does not exist (F3). Delivering this means *introducing* a persisted
ownership store, not repairing one. Scoping it as: dev/sandbox ownership
persists to `localStorage`; real Steam ownership stays authoritative from the
inventory service and is never written to local storage (that would let a local
edit fake entitlements). Local persistence is therefore dev-tier only, by
design, and the two are merged at read time.

### B. Cache opening

| # | Requirement | Status |
|---|---|---|
| B1 | Browser dev / server dev / Steam return one typed result | `[changed]` |
| B2 | Dev infinite chests + keys behind explicit flags | `[accepted]` |
| B3 | Rewards locked until earned | `[accepted]` |
| B4 | Three ranked results: cosmetic + power-up + currency/material | `[changed]` |
| B5 | Duplicate conversion | `[accepted]` |
| B6 | Deterministic seeded tests | `[accepted]` |
| B7 | Idempotent requests | `[accepted]` |
| B8 | Persistence | `[accepted]` |
| B9 | Reset control clears ownership/equipment/dev economy/pending, not settings | `[accepted]` |

**B1 note — `[changed]`:** "server dev" has no implementation to repair (F4);
there are two paths, not three. Reading this as: define one result type, have
the dev path produce it locally and the Steam path adapt its response into it,
with the seam placed so a future server path implements the same contract.

**B4 note — `[changed]`:** the catalog has no "power-up" category. The closest
real categories are overclock mods (4140–4147) and consumable/utility items.
Mapping "power-up" to the overclock-mod class and "currency/material" to
relics/shards/ingots (1000, 1100, 4156–4159). Flagging because this is an
interpretation of the brief against an existing catalog, not a free choice —
if "power-up" was meant to be a new item class, that is a catalog change and a
Steamworks schema change, which is a different and larger task.

**B5 note:** `resolveDuplicateGrant()` already exists and is used by the dev
path. Extending rather than replacing it.

### C. XP / tier ceremony

| # | Requirement | Status |
|---|---|---|
| C1 | Animate XP bar to each crossed threshold in sequence | `[accepted]` |
| C2 | Level burst + particles | `[accepted]` |
| C3 | Reveal reward, claim button, persist claim, continue to current tier | `[accepted]` |
| C4 | Mouse, keyboard, Steam Deck A/trigger, safe B/Escape | `[accepted]` |
| C5 | Stable selectors + tests: 1-tier, multi-tier, reload, duplicate, reset, controller | `[accepted]` |

Builds on the existing `seasonPass.js` state model (F6); the ceremony is new
presentation over it, not a replacement for claim persistence.

### D. Cross-cutting

| # | Requirement | Status |
|---|---|---|
| D1 | Update unit and e2e tests | `[changed]` |
| D2 | Keep production economy separate from dev flags | `[accepted]` |
| D3 | Document unverifiable Steamworks config | `[accepted]` |

**D1 note — `[changed]`:** unit tests, yes. **e2e is currently blocked** — see
below.

### Blocked

| # | Item | Why |
|---|---|---|
| E1 | e2e verification of any of this | `[blocked]` |
| E2 | Steam-path cache opening behaviour | `[blocked]` |
| E3 | "Observed in the 3D preview" acceptance | `[blocked]` |

**E1:** the Playwright run-start flow cannot currently reach gameplay or the
Armory reliably. Three consecutive runs during the preceding perf task
stranded at three different points (Pre-Mission Armory; the Tactical Net relay
modal stuck at "CONNECTING..." with no relay server; the title screen after
dismissing it). `helpers.js`'s `startRunAndSkipIntro()` also never clicks
`#armory-btn-embark`, which is what actually calls
`closeArmoryScreen({embark: true})`. That flow is being reshaped by concurrent
multiplayer work on this branch. Unit-level coverage is unaffected and is
where this work will be verified.

**E2:** requires a real Steamworks session with a live Inventory Service; not
reproducible locally. The adapter that maps a Steam response into the shared
result type will be unit-tested against recorded/synthetic shapes, and the
Steamworks-side configuration documented per D3, but the live path cannot be
proven here.

**E3:** "observed in the 3D preview" is a human visual check. It can be
supported (equip → preview refresh) and asserted structurally, but not
verified as *looking correct* without a person.

## Note on the completion clause

The brief says not to mark the work complete until a reward can be opened,
claimed, equipped, observed in the 3D preview, persisted, and reset. E1–E3
mean parts of that chain are not locally verifiable. Those steps will be built
and unit-verified; the live-Steam and visual-confirmation links stay open and
are called out as such rather than being quietly claimed.

## Implementation order

Smallest coherent vertical slice first, because everything else depends on it:

1. ✅ **`src/itemOwnership.js`** — unified catalog (Steam + achievement +
   community, 113 entries), merged owned-set, `canEquip()` with the dev unlock
   override, external-source hook, change subscription (A2, A3, A4).
2. ✅ **Persisted dev grants** (A5) under `hb_dev_item_grants_v1`. Steam
   entitlements and external-source unlocks are deliberately *not* persisted —
   writing entitlement to local storage would make it forgeable.
3. ✅ **Armory consumes it** (`src/armoryOptions.js` + `src/armoryUi.js`) — all
   candidates rendered, unowned `disabled` and labelled `🔒 LOCKED`, dev-unlocked
   labelled `🔓 DEV UNLOCK`, with an `equipGuard()` behind the attribute so a
   tampered DOM still cannot equip. Six hardcoded id arrays deleted.
4. ✅ **Wiring** — one app-wide store in `main.js` (`window.itemOwnership`),
   real Steam inventory pushed in from `steamVaultUi`, achievement cosmetic
   unlocks now also persisted, dev commands `cosmetics_all` and
   `reset_inventory` (partial B9 — economy keys only, settings untouched).
5. ✅ **B** — cache opening contract, three ranked dev rewards, dev economy
   flags, duplicate conversion, persistence, and reset integration. Live
   Steam behavior remains blocked by E2.
6. ✅ **C** — sequential XP/tier ceremony and claim controls. End-to-end
   controller verification remains blocked by E1.

### Slice status

Delivered and unit-covered: A1, A2, A3, A4, A5, and the settings-safe half of
B9. Suite: 245 files / 2025 tests green, of which 59 are new
(`itemOwnership.test.js` 32, `armoryOptions.test.js` 10, `armoryUi.test.js` +11,
plus updates threading the new dependency through existing specs).

Not started: the blocked live/e2e/visual verification links E1–E3.

## Follow-up implementation update

The next vertical slice is now in the working tree and locally verified:

- `src/cacheOpening.js` defines a typed opening result with deterministic seeded
  cosmetic, power-up/overclock, and currency/material lanes. Duplicate
  cosmetics visibly convert to Deep Core Shards. Steam responses are adapted
  without treating an empty `granted` array as a reward.
- `src/steamVaultUi.js` now persists dev/QA Vault inventory, applies the shared
  opening result, supports infinite dev cache/key supply, and renders all three
  reward lanes before a single claim action. `reset_inventory` clears the dev
  Vault state in addition to the ownership override/grants.
- `src/seasonPass.js` returns every tier crossed by one XP award. The Season
  Pass UI now queues each eligible track reward, animates an XP bar, emits a
  particle burst, focuses a stable `#progression-claim-btn`, and requires a
  claim before advancing to the next crossed tier. Escape/B cannot discard an
  earned reward during the ceremony.
- New stable selectors include `#progression-reward-overlay`,
  `#progression-xp-bar`, `#progression-level-value`,
  `#progression-reward-primary`, `#progression-reward-secondary`,
  `#progression-reward-currency`, and `#progression-claim-btn`.

The implementation intentionally keeps the following open:

- live Steam Inventory Service generator behavior still needs a real
  Steamworks session and configuration verification;
- the concurrent multiplayer/title flow still blocks reliable Playwright
  boot-to-Armory/gameplay verification;
- the 3D preview still needs a human visual check for every newly supported
  chassis/finish combination.

Validation after this slice: `npm test` — **246 files / 2,031 tests green**;
`npm run build` and the build-media audit also pass. The implementation is not
marked fully complete until the blocked live/e2e/visual links are exercised.
