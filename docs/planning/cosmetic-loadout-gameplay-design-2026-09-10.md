# Free-to-Play Loadout Design — Earned Function, Paid Cosmetics

Status: design proposal, **not implemented** · Date: 2026-09-10 · Branch: `dev/sprint-34`
Baseline: `v2.4.0-beta` · Owner: gameplay design + product

## 1. The constraint that shapes everything

Hunker Bunker is free-to-play, and **anything purchasable must be cosmetic
only.** That single rule decides where every effect in this document is allowed
to live, and it inverts the obvious approach: the functional layer cannot ride
on the Steam Inventory catalog, because **all 71 catalog items are `tradable`
and 64 are `marketable`.**

## 2. Finding: there is a live pay-to-win exposure today

Items **4140–4147** are `tradable: true, marketable: true` — buyable for real
money on the Steam Market — and their published store descriptions promise
explicit mechanical advantage:

| ID | Name | Published promise |
| --- | --- | --- |
| 4140 | Cryo-Capacitor Overclock | +8% Cryo Freeze Duration on elemental attacks |
| 4141 | Magnetic Scavenger Coil | +20% Scrap & Salvage Magnet Pull Radius |
| 4142 | Bio-Hazard Filter Vent | −12% Damage from Spore & Acid Gas Clouds |
| 4143 | Kinetic Impact Bushing | +1 Piercing Penetration on kinetic rounds |
| 4144 | Thermal Heat Exchanger | +10% Faster Shield Recharge Rate |
| 4145 | Echo-Location Transceiver | Pings hidden rooms & chests within 15m |
| 4146 | Symbiotic Adrenaline Pump | +15% Move Speed for 4s below 25% HP |
| 4147 | Zero-Point Flux Overdrive | 5 kills in 3s refunds a Dash/Sprint charge |

The charms, chassis and patches are the opposite: their descriptions are purely
visual ("Tiny frosted core venting microscopic cold vapor"). **The charms were
never the problem. The Overdrives are.**

None of these effects are currently wired, so nothing is unbalanced in play
today — but the *store copy* already sells the advantage, which is the part
Valve reads and which `npm run steam:claims:check` exists to police.

**Decision (owner, 2026-09-10): make 4140–4147 earned-only.** Strip
`tradable`/`marketable`, keep the promised effects, move them to the earned
track below. Requires a Steam inventory schema change and re-upload.

## 3. The two-track model

| | **Track A — Earned** | **Track B — Paid** |
| --- | --- | --- |
| Contains | every gameplay effect | every visual |
| Slots | `mod1Id`, `mod2Id` (rig modules) | `chassisSkinId`, `skinId`, `charmId`, `decalId`, `sheen`, `hud` |
| Tradable | **never** | yes |
| Obtained | shells · achievements · Deep Core Shards · depth | keys, shards, bundles |

The clean fit: **`loadout.js` already has two rig-module slots — `mod1Id` and
`mod2Id` — read by nothing at all.** They are the natural, already-designed home
for earned function, and using them means charms/patches/chassis stay exactly
what their art and descriptions already say they are: cosmetics.

So the answer to "charms should work like the overdrives" is to invert it: the
**Overdrives become the functional slot**, earned rather than sold, and charms
stay cosmetic.

## 4. Track A — Rig Modules (earned, never sold)

Two equipped slots. Every module is a trade, on the shape overclocks already
use (`split_shot`: +2 bullets, ×0.75 damage).

### 4a. The eight existing Overdrives, re-homed

Effects as published, with a downside added so each is a decision:

| ID | Name | Upside (as published) | Added cost |
| --- | --- | --- | --- |
| 4140 | Cryo-Capacitor | +8% cryo freeze duration | −10% fire rate |
| 4141 | Magnetic Scavenger | +20% pickup radius | −15% salvage value |
| 4142 | Bio-Hazard Filter | −12% gas damage | −1 max HP |
| 4143 | Kinetic Impact Bushing | +1 pierce | −20% clip size |
| 4144 | Thermal Heat Exchanger | +10% shield recharge | recharge delay +0.5s |
| 4145 | Echo-Location | pings caches within 15m | ping also aggros within 15m |
| 4146 | Adrenaline Pump | +15% speed below 25% HP | −1 max HP |
| 4147 | Zero-Point Flux | 5 kills in 3s refunds a dash | dash cost +25% otherwise |

### 4b. Eight new modules, one per unlock path

Since all four unlock paths are in scope, each should have modules that can
*only* come from it — that is what makes a path worth engaging with.

| Name | Effect | Cost | Unlock path |
| --- | --- | --- | --- |
| Ballast Plating | +2 max HP | −15% move speed | Shells |
| Scrap Furnace | Destroyed props drop salvage | −10% fire rate | Shells |
| Queen's Bane | +25% boss damage | −10% to all else | **Achievement:** kill the Queen |
| Archivist Lens | Lore drops grant salvage | −1 starting clip | **Achievement:** 10 lore drops |
| Shard Conduit | +1 relic rarity tier | −10% max O₂ | Deep Core Shards |
| Duplicate Refiner | Duplicate relics become shards | −15% salvage | Deep Core Shards |
| Pressure Seal | O₂ drains 25% slower | healing −40% | **Depth:** reach ring 4 |
| Deep Anchor | Ring crossings cost no O₂ | crossings spawn an elite | **Depth:** reach ring 6 |

Sixteen modules across two slots gives real build variety without a
combinatorial explosion.

## 5. Track B — Cosmetics, and the new sets

Current cosmetic inventory: 13 weapon skins, 8 chassis skins, 30 community
player skins, 16 patches/decals, 10 charms, 6 themes/HUD/tracers/muzzles. Once
the Overdrives leave for Track A, **every remaining catalog item is cosmetic**,
which is exactly where the F2P rule wants them.

### 5a. Sets, not loose items

The gap is not raw count — it is that cosmetics do not currently *coordinate*.
A **Set** is one visual identity spanning every slot, which is what makes a
bundle worth buying and a drop worth chasing:

> operator skin + weapon skin + charm + patch + weapon sheen + tracer + HUD theme

Seven pieces per set. Six proposed sets, 42 new cosmetics:

| Set | Identity | Reads from |
| --- | --- | --- |
| **Deep Frost** | Blue-white rime, fogged visor, frost tracers | Cryo biome |
| **Rust & Bone** | Scavenged plate, bone charms, dull orange tracers | Trench survivors |
| **Hive Chitin** | Living carapace, spore muzzle bloom, green HUD | Alien faction |
| **Horizon Corporate** | Clean white/teal, corporate seal, pristine HUD | Horizon backstory |
| **Bunker 404** | Glitched textures, corrupted HUD, static tracers | Lost squad lore |
| **Grand Marshal** | Gold and meteorite alloy, laurel patch, amber CRT | Prestige / endgame |

Each set already has an anchor item in the catalog (4120 Sub-Zero Pioneer, 4104
Rust & Bone Carbine, 4119 Hive-Lord, 4127 Void Horizon, 4123 Bunker 404, 4129
Grand Marshal Crest), so the sets are extensions of established identities
rather than inventions.

### 5b. Player skins on the free currency

Per the brief, player skins must be obtainable **without** paying:

- **Deep Core Shards** (4159) already exist as the free duplicate token —
  "100 shards = any item". Extend the dispensary so shards buy **set pieces
  directly**, not only cache keys. A free player grinding shards reaches any
  cosmetic; a paying player gets there faster.
- **Set bundles** (paid): all 7 pieces at a discount versus loose purchase.
- **Partial-set drops** from caches, so shards accumulate toward completion.

This keeps the paid proposition honest — *speed and convenience, never power* —
which is the only version of F2P monetisation compatible with the rule in §1.

## 6. Design rules carried forward

1. **Every effect key ships `implemented: false` until it has a named runtime
   consumer.** Ten run-card keys were previously live in player-facing text
   with nothing reading them
   (`docs/reports/gameplay-implementation-gap-audit-2026-09-10.md`).
2. **Every module is a trade.** No flat upgrades.
3. **Cosmetics never carry stats. Modules never carry visuals.** The moment a
   set piece grants an effect, the F2P rule is broken again.
4. Downsides must be **felt in play**, not just present in a stat bag.
5. No knob stacks past a stated cap across the two module slots.

## 7. Implementation order

1. **Schema correction first.** Strip `tradable`/`marketable` from 4140–4147,
   regenerate `steam/inventory_schema_hunker_bunker.json`, re-upload. Until this
   lands, the store sells advantage. Nothing else here is urgent by comparison.
2. **Contract.** `src/data/rigModules.js` + `resolveEquippedModules()` +
   the allowlist test, everything `implemented: false`. No behaviour change.
3. **Unlock ledger.** Persist which modules a profile has earned, across the
   four paths, in the existing save contract.
4. **Wire modules** in effect-family order: weapon knobs → survivability →
   economy → conditional.
5. **Cosmetic sets** — art production, independent of 1–4 and parallelisable.
6. **Shard dispensary extension** so set pieces are shard-purchasable.

## 8. Acceptance

- No `tradable` item grants any gameplay effect. A test asserts this over the
  whole catalog, so it cannot regress.
- No module is player-visible as active while `implemented: false`.
- Every module effect key resolves to a named consumer.
- A free-only account can reach any cosmetic through shards; demonstrated, not
  assumed.
- Three distinct viable module builds demonstrated in play.

## 9. Still open

- **Do the eight re-homed Overdrives keep their names?** They read as purchases
  ("Overclock", "Overdrive"); earned items may want earned-sounding names.
- **Are already-granted 4140–4147 entitlements honoured** for players who own
  them, or refunded? A real question if any were distributed.
- Per-set pricing and shard cost per piece.
- Whether `mod2Id` unlocks immediately or is itself a progression reward.
