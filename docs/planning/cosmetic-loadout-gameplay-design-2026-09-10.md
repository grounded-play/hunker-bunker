# Cosmetic Loadout as Gameplay — Chassis, Charms and Patches

Status: design proposal, **not implemented** · Date: 2026-09-10 · Branch: `dev/sprint-34`
Baseline: `v2.4.0-beta` · Owner: gameplay design

## 1. What this is for

Chassis, charms and patches are currently equippable and completely inert. This
turns all three into real build decisions with the same shape as the run-drop
overclocks: **something gets better and something gets worse.** No slot becomes
a flat upgrade, because a flat upgrade is not a decision.

This document is deliberately design-only. Nothing here is built yet, and no
effect below should be shipped until it has a named runtime consumer.

## 2. Current state, verified

| Slot | Exists in `loadout.js` | Gameplay effect today |
| --- | --- | --- |
| `archetypeId` (weapon family) | yes | selects allowed skins only |
| `skinId` (weapon skin) | yes | render only |
| `charmId` | yes | render only (`weaponMount.charmId`) |
| `suit.decalId` (patch) | yes | render only (`applyDecalSprite`) |
| `chassisSkinId` | yes | render only |
| `rigModule` (slots 1..n) | yes | **no consumer at all** |

Run-drop items are the exception and the model to copy: `SUIT_RELICS` (14) and
`WEAPON_OVERCLOCKS` (5) carry a `stats` bag read by named functions in
`src/runDrops.js` (`applyIncomingDamageModifiers`, `getScrapCyclerReloadEffect`,
and so on).

The reference trade, already shipped and working:

```js
{ id: 'split_shot', name: 'Split-Shot Core',
  stats: { extraBullets: 2, spreadAngle: 0.22, damageMult: 0.75 } }
```

Three bullets instead of one, each hitting for 75%. That is the template.

## 3. Design rules

These come directly from what has already gone wrong in this repo.

1. **Every effect key must have a runtime consumer before it ships.** Ten
   run-card effect keys were live in player-facing text with zero consumers
   (`docs/reports/gameplay-implementation-gap-audit-2026-09-10.md`). Items ship
   `implemented: false` and stay out of the reward pool until wired.
2. **Every item is a trade.** If an item has no downside it is a power creep
   tax on everyone who did not equip it.
3. **The three layers must not overlap.** Chassis is a strategy, charm is a
   tactic, patch is a condition. If two layers both grant "+damage", the build
   is arithmetic rather than a decision.
4. **Downsides must be legible in play**, not just on a stat sheet. "Reload is
   0.4s slower" is felt; "-3% armour scalar" is not.
5. **No stacking of the same knob past a stated cap**, so a three-layer stack
   cannot trivialise a fight.

## 4. The three layers

| Layer | Slot count | Decision horizon | Character |
| --- | --- | --- | --- |
| **Chassis** | 1 | whole run, chosen at deploy | Redefines the class's rhythm. Largest swing both ways. |
| **Charm** | 1 | whole run, chosen at deploy | One sharp knob up, one down. |
| **Patch** | 1 | whole run, earned identity | Conditional or triggered — pays out when you play a certain way. |

A build is therefore: *how I move* (chassis) × *what I lean on* (charm) ×
*how I earn it back* (patch).

## 5. Chassis — 8 items

Chassis is the biggest commitment: a movement/survivability identity that
changes how a class is played. Numbers are opening proposals for playtest.

| ID | Name | Upside | Downside |
| --- | --- | --- | --- |
| 4112 | Sub-Terran Drill Engineer | Destructible walls break in one hit; +25% salvage from destroyed props | −15% move speed |
| 4113 | Cryo-Vanguard Scout | +20% move speed; immune to cryo slow | −1 max HP (min 1) |
| 4114 | Trench Warden Heavy | +2 max HP; knockback taken halved | −20% move speed; reload +0.3s |
| 4115 | Void Commando Recon | Radar range +40%; enemies aggro 25% later | −25% clip size |
| 4116 | Bio-Synthesizer Harness | O₂ drains 25% slower | Healing received −40% |
| 4117 | Dreadnought Exo-Juggernaut | +3 max HP; contact damage taken −50% | −30% move speed; cannot sprint |
| 4118 | Cyber-Spectre Infiltrator | Sprint is silent, halves aggro radius while sprinting | −2 max HP; +30% damage taken while stationary |
| 4119 | Hive-Lord Symbiote Exosuit | Alien contact heals instead of harms; hive sites do not aggro | Human camps refuse trade; humanity drifts hostile |

4119 is deliberately a *story* trade, not a stat one — it hands the player the
alien path and closes the human one. It should be the rarest and the most
opinionated thing in the game.

## 6. Charms — 10 items

One knob up, one down, small enough to combine freely with any chassis.

| ID | Name | Upside | Downside |
| --- | --- | --- | --- |
| 4130 | Mini Cryo-Core | Shots apply a brief chill (10% slow) | −10% fire rate |
| 4131 | Spent 50-Cal Casing | +15% damage | −1 clip size |
| 4132 | Sporesnail Pearl | +1 relic drop chance tier | −10% max O₂ |
| 4133 | Trench Whistle | Nearby squadmates gain +10% reload speed | −10% own reload speed |
| 4134 | Glitched RAM Card | Reload cancels 0.3s earlier | 8% chance a reload jams (double time) |
| 4135 | Geodetic Compass | Reveals the next objective at all times | Compass corruption events last twice as long |
| 4136 | Miniaturized Drone Bobble | Auto-collects salvage within 4u | −15% salvage value |
| 4137 | Amber Bio-Flask | Heal 1 HP on ring crossing | O₂ cost of crossing +20% |
| 4138 | Dark Matter Micro-Singularity | Kills pull nearby drops to the player | Kills also pull nearby *enemies* 2u toward you |
| 4139 | Golden Sub-Bunker Key | Opens one locked cache per run | Opening it spawns an elite |

4133 is the only co-op-facing charm: it costs you to help the squad. Worth
having exactly one, so co-op has a reason to coordinate loadouts.

## 7. Patches — conditional identity

Patches are earned emblems, so they should pay out for *playing like the thing
you earned*. They are conditional rather than passive: no effect until a
condition holds, then a real one.

| ID | Name | Condition → effect |
| --- | --- | --- |
| 2000/2001/2002 | Class Victory Patches | While playing that class: first death per run leaves you at 1 HP instead of dying (once) |
| 2003 | Queen Slayer Emblem | +25% damage to bosses; −10% to everything else |
| 2004 | Archivist Emblem | Lore drops grant salvage; −1 starting clip |
| 4120 | Sub-Zero Pioneer | Immune to environmental cold; −15% fire resistance |
| 4121 | Radiation Trefoil | Hazard zones deal no damage; −1 max HP |
| 4122 | Sporesnail Hunter Crest | +30% damage to sporesnails; −15% to all others |
| 4123 | Bunker 404 Lost Squad | Revive a downed squadmate 50% faster; −20% own revive speed |
| 4126 | Queen Slayer Gold Seal | Boss kills restore 25% O₂; bosses gain +20% HP |
| 4127 | Void Horizon Sigil | Below 25% HP: +30% move speed | (no separate downside — the condition is the cost) |
| 4128 | Ancient Core Glyphs | Relics found are one rarity tier higher; −1 relic slot |
| 4129 | Grand Marshal Relic Crest | Start each run with one random relic; it is always `corrupted` rarity |

## 8. Mechanical contract

Reuse the existing shape rather than inventing a parallel one.

```js
// src/data/cosmeticEffects.js  (new)
export const CHASSIS_EFFECTS = Object.freeze({
    4113: { id: 'cryo_vanguard', implemented: false,
            stats: { moveSpeedMult: 1.20, cryoSlowImmune: true, maxHpDelta: -1 } }
});
```

- `implemented: false` until a named consumer exists, mirroring `runDrops.js`.
- Effects resolve through **one** aggregator, so caps and stacking live in a
  single place:

```js
// src/cosmeticLoadoutEffects.js  (new)
export function resolveEquippedEffects({ chassisId, charmId, patchId }) { … }
```

- `threeGame.js` reads the resolved bag once at run start, exactly as it already
  does for `runOverclocks`/`runRelics`.
- A whole-catalog test asserts every declared key appears in a documented
  consumer allowlist — the guard that now protects the run-card deck.

## 9. Skill/ability layer

Two of these want an *active* rather than a passive, which the game has no slot
for yet. Proposal: chassis may grant **one active ability** on a shared cooldown,
bound to the existing ability input.

| Chassis | Ability | Cooldown | Cost |
| --- | --- | --- | --- |
| 4117 Dreadnought | **Bulwark** — negate all damage for 2s, cannot move | 45s | 5% O₂ |
| 4118 Cyber-Spectre | **Phase** — pass through enemies for 3s | 40s | 5% O₂ |
| 4119 Hive-Lord | **Brood Call** — nearby aliens fight for you for 8s | 60s | 10% O₂ |

Everything else stays passive. Three actives is enough to make chassis feel
distinct without turning the game into a cooldown rotation.

## 10. Implementation order

1. **Contract first.** `cosmeticEffects.js` + `resolveEquippedEffects()` +
   the allowlist test, with every item `implemented: false`. Nothing changes
   in play; the seam exists and is proven.
2. **Charms.** Smallest, most isolated knobs; most reuse existing consumers
   (fire rate, clip size, damage) so few new seams are needed.
3. **Chassis passives.** Movement, HP and O₂ knobs.
4. **Patches.** Conditional effects need event hooks; do them once the passive
   path is proven.
5. **Chassis actives.** New input/cooldown surface — last, and only if 1–4 land
   cleanly.

Each phase flips `implemented: true` only for the items it actually wired.

## 11. Acceptance

- No item is player-visible as "active" while `implemented: false`.
- The catalog test fails on any effect key without a consumer.
- Three distinct viable builds demonstrated in play, not asserted in a unit test.
- No single knob exceeds its stated cap when chassis + charm + patch stack.
- Every downside is observable in a recorded run, not only in the stat bag.

## 12. Open questions for the owner

1. **Are these Steam Inventory items?** If chassis/charms are tradable and now
   affect gameplay, that is pay-to-win unless they are earned in-game. This is
   the single biggest decision here and it is a product call, not a design one.
2. **One patch slot or several?** The list above assumes one.
3. **Should chassis be class-locked?** 4112 reads Engineer, 4113 reads Scout.
   Locking them deepens class identity; leaving them open allows odd builds.
4. **Does 4119's faction lockout conflict with Act 2 endings?** It likely closes
   ending branches, which may be intended or may be a trap.
