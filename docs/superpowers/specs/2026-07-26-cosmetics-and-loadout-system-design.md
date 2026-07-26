# Cosmetics & Loadout System — Design

**Date:** 2026-07-26
**Status:** Approved for implementation
**Builds on:** `docs/superpowers/specs/2026-07-26-player-chassis-3d-vertical-slice-design.md`
(the "chassis doc") — read that first. This doc extends its contracts; it
does not repeat its reasoning about why 3D-rendered-as-pixel-snapped-sprite
was chosen.

## Problem

`src/steamVaultUi.js`'s `STEAM_ITEM_CATALOG` already lists 8 cosmetic
items — three class Victory Patches, a Carbon Fiber Decal, a Chrome Plated
Sidearm, and two boss-kill emblems — and every one of their descriptions
ends with the words "Cosmetic equip." None of them can be equipped. There
is no code path, client or server, connecting an owned cosmetic to
anything a player sees in a run. `src/loadout.js` only tracks one
functional fabricated weapon (damage/fire-rate stats); it has no concept
of a cosmetic at all. Separately, the game currently renders no visible
weapon whatsoever — combat is projectiles spawned from the player
position, stats only, no held object — so "weapon skin" currently has
nothing to skin.

**What already works and is explicitly not touched by this program:** the
lootbox (`server/lootTables.js`, Valve-compliant disclosed odds), the
store (`server/steamStore.js`, sells Cache Keys), crafting/fusion
(`server/steamInventory.js`), and Steam trading/marketability flags. This
program consumes ownership state from that system; it does not modify it.

## The four sub-projects, and how they depend on each other

```
1. Cosmetic data model + loadout state   (foundation, blocks 2/3/4's data needs)
2. Player skin rendering                  (needs 1 + the chassis doc's pipeline)
3. Weapon: real render + skin             (needs 1 + a chassis-doc extension;
                                            also *requires* pulling the chassis
                                            doc's deferred independent-torso-yaw
                                            back into scope — see below)
4. Loadout UI                             (needs 1; presents 2 and 3's results
                                            once they exist, but its own
                                            equip/unequip plumbing only needs 1)
```

1 is small and should land first. 2 and 3 can then proceed in parallel — they
touch different files (player chassis vs. weapon model) and only share the
data model from step 1. 4 can start as soon as 1 exists, using placeholder
"owned" state for its own testing, and gets wired to real render results
last.

## Sub-project 1: Cosmetic data model + loadout state

### The catalog needs a semantic layer, not just display metadata

`STEAM_ITEM_CATALOG` today has `name`/`rarity`/`desc`/`tradable`/`marketable`
— purely display fields. It needs an `equip` descriptor saying what
happens when the item is equipped. Reading the actual flavor text closely,
the 6 player-facing cosmetics are not all the same *kind* of cosmetic:

- **Carbon Fiber Decal**: "finish for your exosuit" — a full base-texture
  replacement.
- **Victory Patches / Queen Slayer / Archivist emblems**: "patch,"
  "emblem" — small badges, not full re-finishes. Compositing these as a
  full texture swap would silently discard whichever finish the player
  actually owns and prefers; that's a real design bug hiding in the
  existing copy, not a detail I'm free to gloss over.

**Decision:** cosmetics are layered, not single-slot:

- `playerSkin` (0 or 1 equipped) — replaces the chassis's base texture
  entirely. Carbon Fiber Decal, and any future full re-skin.
- `playerDecal` (0 or 1 equipped in this version) — composited onto a
  small reserved UV region on top of whatever skin is equipped. The three
  Victory Patches and two emblems are all `playerDecal`s — mutually
  exclusive with each other in v1 (equipping one un-equips any other;
  multi-decal display is a natural follow-up, not required now).
- `weaponSkin` (0 or 1 equipped) — replaces the weapon's base texture.
  Chrome Plated Sidearm.

Catalog extension (`src/steamVaultUi.js`):

```js
2100: { ...existing fields..., equip: { slot: 'playerSkin', appliesTo: ['SCOUT','TANK','ENGINEER'], assetId: 'carbon_fiber' } },
2200: { ...existing fields..., equip: { slot: 'weaponSkin', appliesTo: ['SIDEARM'], assetId: 'chrome' } },
2000: { ...existing fields..., equip: { slot: 'playerDecal', appliesTo: ['SCOUT'], assetId: 'scout_victory_patch' } },
2001: { ...existing fields..., equip: { slot: 'playerDecal', appliesTo: ['TANK'], assetId: 'tank_victory_patch' } },
2002: { ...existing fields..., equip: { slot: 'playerDecal', appliesTo: ['ENGINEER'], assetId: 'engineer_victory_patch' } },
2003: { ...existing fields..., equip: { slot: 'playerDecal', appliesTo: ['SCOUT','TANK','ENGINEER'], assetId: 'queen_slayer' } },
2004: { ...existing fields..., equip: { slot: 'playerDecal', appliesTo: ['SCOUT','TANK','ENGINEER'], assetId: 'archivist' } }
```

`appliesTo` gates which class(es) a cosmetic is valid for (a class-specific
Victory Patch isn't equippable on the wrong class); items with no `equip`
field (the two relic fragments, the cache, the key) are not equippable —
existing behavior, unchanged.

### Loadout state extension

`src/loadout.js`'s `LoadoutManager` gains three fields alongside the
existing `equippedWeaponId`:

```js
{
  equippedWeaponId: string|null,      // existing, unchanged
  equippedPlayerSkinId: string|null,  // new
  equippedPlayerDecalId: string|null, // new
  equippedWeaponSkinId: string|null   // new
}
```

New methods mirror the existing `equip()`'s shape and refusal behavior
exactly (refuse and return `false` rather than throwing, same as the
existing weapon-fabrication check):

```js
equipCosmetic(itemdefid, { ownsItem, currentClass })
// Looks up STEAM_ITEM_CATALOG[itemdefid].equip. Refuses if: no equip
// descriptor, ownsItem(itemdefid) is false, or currentClass is not in
// appliesTo. On success, writes to the matching slot field and persists.
```

**Ownership must be checked the same way the existing code already checks
fabrication** — `ownsItem` is injected (a real inventory-ownership lookup
against synced Steam inventory state, the same trust boundary
`server/steamInventory.js` already establishes), never trusted from
client-only state. This is the same pattern the existing `equip()` already
uses via the injected `fabricator` parameter — extended, not invented.

**Primary files:** `src/steamVaultUi.js` (catalog extension), `src/loadout.js`
(state + `equipCosmetic`), `src/loadout.test.js` (already exists, 8 tests
covering the functional-weapon path — extend it with the same style for
each new cosmetic slot; the existing tests must stay green unmodified).

## Sub-project 2: Player skin rendering

The chassis doc's `createChassisSpriteSource({ classId, glbUrl })` did not
parameterize texture — correct at the time, since skins weren't yet
in scope for that vertical slice. **Contract amendment:**

```js
export function createChassisSpriteSource({
  classId,
  glbUrl,
  skinTextureUrl = null,   // new: overrides the chassis's baked-in texture
  decalTextureUrl = null   // new: composited at the UV template's reserved decal region
})
```

When `skinTextureUrl` is null, behavior is identical to the chassis doc's
original spec (baked texture from the front-projected wrap). When set,
`material.map` uses the alternate texture instead — this is the whole
mechanism; no new rendering pipeline, just a parameter threaded through
what the chassis doc already built.

**This requires Codex's chassis build script to reserve a fixed, documented
UV region for decals** (a shoulder patch area is the natural choice given
the flavor text), output as part of the same UV-template image already
planned. One rectangle, one convention, reused by every decal asset.

**Primary files:** `src/playerChassisRenderer.js` (amend the contract),
`src/threeGame.js` (read `loadout.getEquippedPlayerSkinId()` /
`getEquippedPlayerDecalId()` when constructing the chassis sprite source).

## Sub-project 3: Weapon — real render + skin

### The coupling this surfaces

A rendered weapon has to point at the aim reticle, not the movement
direction — that's the entire point of a visible weapon in a
twin-stick-style shooter. The chassis doc deferred independent torso/aim
yaw as explicitly out of scope, but reserved a separate chest bone
specifically so it wouldn't be blocked later ("this slice does not
implement independent torso yaw... the rig does not block it later"). That
deferral ends here: **this sub-project requires implementing chest-bone
yaw driven by aim angle**, reusing the exact two-angle input the 2D system
already computes today (`axisX/axisZ` for movement, `aimDirX/aimDirZ` for
aim, both already live in `updatePlayerSpriteAnimation`,
`src/threeGame.js:13053`). This was always going to be needed eventually;
it's simply no longer optional once a weapon exists to aim.

### Weapon rig and socket contract

Because arms descend from chest in the chassis rig (`chest → shoulder →
upper arm → forearm → hand`), rotating chest yaw reorients the whole arm
*and anything parented to the hand* toward the aim direction for free — no
separate weapon-rotation logic needed.

**New named bone, added to the chassis rig:** `WeaponSocket_R`, a child of
the right hand bone, positioned at the grip point, oriented so a weapon
authored facing local +X sits correctly when parented at identity
transform. (Extends the chassis rig — the chest bone's provision above is
what makes this cheap now rather than a re-rig later.)

**Weapon glTF contract** (new, sibling to the chassis contract):
- Exactly one mesh (a skeleton is optional — see below).
- Grip origin at local (0,0,0); barrel/muzzle end points toward local +X.
- Optionally, exactly one animation clip named `"Fire"` (a small recoil
  kick) — a static mesh with no clip is an acceptable v1; recoil is a
  stretch goal within this sub-project, not a blocker.
- No baked cameras/lights.

**No base image to wrap.** Unlike Scout, there is no existing weapon
art anywhere in the repo (confirmed: only weapon *audio* exists). The
weapon is built the same way as the chassis — scripted primitives, not
hand-modeled or generated — but textured with flat materials matching the
established visual language (cream/dark-grey body, orange/cyan accent,
per the Scout identity master) rather than a photo projection, since
there's no photo. The Chrome Plated Sidearm skin is then a second,
alternate flat-material texture on the same UVs — genuinely simpler than
the player-skin case, since there's no front/back asymmetry problem when
the base texture was never a photo to begin with.

**Runtime:** the weapon glb loads once, is parented under `WeaponSocket_R`
on the player's chassis instance, and rides along in the same offscreen
render pass — it is not a second render target or a second sprite. This
is the direct payoff of building it as a socket attachment on the existing
rig rather than a separate object: weapon rendering, rotation, and
animation are inherited, not re-implemented.

**Primary files:** new `scripts/blender/build_weapon_sidearm.py` (mirrors
`build_player_chassis.py`'s structure), new
`public/models/weapons/sidearm/Sidearm.glb` +
`Sidearm.uv-template.png`, amendments to
`src/playerChassisRenderer.js` (accept an optional `weaponGlbUrl`/
`weaponSkinUrl`), amendments to `build_player_chassis.py` (add
`WeaponSocket_R`), and the aim-yaw addition in `src/threeGame.js`.

## Sub-project 4: Loadout UI

A screen to equip owned cosmetics — most naturally an extension of the
existing Roster/Loadout modal (`main.js:7696` onward,
`#roster-modal`) rather than a new surface, since that's already the
"pick your equipped weapon" screen and cosmetics are conceptually the same
kind of choice.

**Scope for v1:** list owned cosmetics (from the same inventory-ownership
source sub-project 1's `ownsItem` uses), grouped by slot
(`playerSkin`/`playerDecal`/`weaponSkin`), with equip/unequip per slot and
the current class's `appliesTo` filter already applied so invalid
cosmetics for the active class aren't offered. Reuses
`STEAM_ITEM_CATALOG`'s existing `name`/`rarity`/`img` for display — no new
display data needed.

**Explicitly deferred:** a live 3D preview inside the loadout screen
itself. Showing the equipped result requires the same rendering pipeline
sub-projects 2/3 build; wiring a preview into the modal is a natural
follow-up once those exist, not a v1 requirement — the modal can display
static catalog icons in the meantime, same as it does today for the
existing weapon-fabrication list.

**Primary files:** `main.js` (roster modal rendering, additive to the
existing weapon-list rendering, not a rewrite), possibly new CSS in
`style.css` for the slot-grouped layout.

## Explicit non-goals (all sub-projects)

- No changes to lootbox odds, the store, crafting, or trading — that
  system is complete and untouched.
- No live 3D loadout preview in this pass (named above).
- No Tank/Engineer chassis (still pending from the chassis doc itself).
- No multi-decal display (one decal slot only, in this pass).
- No new cosmetic items added to the catalog — this program makes the
  existing 8 functional, it doesn't grow the catalog.

## Verification plan

- `src/loadout.test.js`: extend with ownership-gating refusals (wrong
  class, not owned, no equip descriptor), successful equip/unequip per
  slot, and persistence round-trip for the three new fields — matching
  the existing suite's own style (fake injected dependencies, no real
  storage/network), the same way `equip()`'s existing 8 tests already do
  for the functional-weapon path.
- Extend the chassis doc's headless glTF-contract checker
  (`scripts/verify-player-chassis-asset.mjs` from the lane-split doc) to
  also validate the weapon glb contract and the socket-bone's presence in
  the chassis glb — one generalized checker, not two separate ones.
- Visual: with a skin/decal/weapon equipped, screenshot the player at a
  few facings and confirm — skin replaces the base texture, decal appears
  at the reserved region, weapon renders at the hand and visibly points at
  the aim reticle (not the movement direction) while strafing sideways.
  That last check is the one that actually proves the aim-yaw coupling
  landed correctly, not just that a gun-shaped mesh appears somewhere.
