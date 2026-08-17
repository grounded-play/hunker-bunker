# Season 0: The Armory — Pre-Run Weapon Bench & Class Gun System

## 0. Why This Document Exists

Season 0's economy (docs 02–06) defines 60 sellable/craftable items — but investigation of the
live codebase (2026-08-17) found two gaps that block all of it from actually mattering in
gameplay:

1. **No weapon is ever rendered.** Combat is stats-only glowing projectile spheres fired from an
   invisible player collider (`src/threeGame.js` `spawnProjectile()`); the player is a flat 2D
   class sprite. "Weapon Skins" and "Weapon Charms" have nothing physical to attach to.
2. **Cosmetic equip is split across two disconnected systems.** `LoadoutManager`
   (`src/loadout.js`, key `hb_loadout_v1`) defines `equipCharm`/`equipDecal`/`equipSkin`/
   `equipRigModule` setters, but no UI calls them. The Steam Vault modal (`src/steamVaultUi.js`)
   actually equips cosmetics through **separate raw `localStorage` keys**
   (`hb_equipped_patch`, `hb_equipped_decal`, `hb_equipped_weapon_finish`) that `LoadoutManager`
   never sees.

**The Armory is the fix for both.** It's a new mandatory pre-run screen where the player gears up
a physical, rendered, class-unique gun, and the single UI surface that reads/writes one unified
loadout record. This document is planning-only — it defines the flow, the data model, the
class/gun/skin mapping, and the new asset list. No code is written yet; implementation follows in
a future sprint plan once this is approved.

**A note on scope:** rendering an actual held weapon requires the chassis pixel-snap pipeline from
[`docs/superpowers/specs/2026-07-26-player-chassis-3d-vertical-slice-design.md`](file:///home/caveman/Desktop/icecave/hunker-bunker/docs/superpowers/specs/2026-07-26-player-chassis-3d-vertical-slice-design.md)
and the weapon-render extension in
[`docs/superpowers/specs/2026-07-26-cosmetics-and-loadout-system-design.md`](file:///home/caveman/Desktop/icecave/hunker-bunker/docs/superpowers/specs/2026-07-26-cosmetics-and-loadout-system-design.md) —
both spec'd, neither built as of this writing. The Armory *screen* (UI, data model, bench layout)
can be built and playtested against a static gun render before the live in-run held-weapon
rendering lands; the two workstreams are sequenced in §7.

---

## 1. Roster Correction (Read This First)

Doc 03's data contract and doc 02's catalog were written against a **4-class roster**
(`scout | heavy | assault | engineer`) that was never fully shipped. The live class-select screen
(`index.html`, `.char-card[data-type]`) only offers **three** classes:

| Shipped classId | Card label |
| :--- | :--- |
| `SCOUT` | Scout |
| `TANK` | Tank |
| `ENGINEER` | Engineer |

This document locks Season 0's weapon/class system to the shipped 3-class roster. Every
`assault`-flavored catalog reference (mostly "Assault Carbine" weapon skins) is reassigned below
rather than left dangling. No new class is being added by this doc — if a 4th class ships later,
it gets its own gun archetype and its own skin allocation pass, not a retrofit of this mapping.

---

## 2. Where the Armory Sits in the Run-Start Flow

Confirmed current flow (`main.js`): `title/splash → appPhase='menu'` (the "Briefing Console" —
class-select cards + hub buttons, all one screen) `→` clicking **INITIALIZE** or **DAILY OPS**
jumps straight to `appPhase='gameplay'` and fires the cinematic chain
(`runMissionIntroSequence`: class intro → cutscene → Mothership dialogue → tutorial → gameplay).

**The Armory becomes a new `appPhase='armory'` screen inserted between them:**

```
title/splash → menu (class select, unchanged)
            → [INITIALIZE or DAILY OPS] → appPhase='armory'  (NEW)
            → [EMBARK] → appPhase='gameplay' → existing runMissionIntroSequence chain (unchanged)
```

- **INITIALIZE and DAILY OPS both route through the Armory gate.** A run always starts with a
  loadout check — that's the point of the step.
- **Act 2 continuation** (`isAct2RunActive()`) bypasses the Armory exactly as it already bypasses
  the Mothership dialogue handshake today (`main.js:6591-6594`) — you don't re-gear mid-campaign
  for a boss-continuation run.
- **First-time profiles**: the Roster modal's existing `mode:'new_game'` auto-open
  (`main.js:11803`) is superseded by an Armory first-visit callout ("Bench is empty — equipping
  your starting Vector-9 Talon") rather than a separate modal layered on top.
- This is a **full new screen** (`#armory-screen`, sibling to `#menu`), not a modal over the
  Briefing Console — matching the "new step in the process" framing rather than a hub button
  players can ignore.

---

## 3. Armory Screen Layout

Three zones on one bench view, built around a live-rendered class gun as the visual centerpiece:

```
+---------------------------------------------------------------------------------------+
|  HUNKER BUNKER // ARMORY [SECTOR ZERO]                            OPERATOR: AGENT-07   |
+---------------------------------------------------------------------------------------+
|                                           |                                           |
|  [SUIT BENCH]                             |  [WEAPON BENCH]                           |
|                                           |                                           |
|  +-------------------------------------+  |  +-------------------------------------+  |
|  |     3D OPERATOR EXOSUIT MODEL       |  |  |    3D CLASS GUN MODEL (live)        |  |
|  |      (Full 360 Turntable View)      |  |  |    (Pivot on Receiver & Rail)       |  |
|  +-------------------------------------+  |  +-------------------------------------+  |
|                                           |                                           |
|  CHASSIS SKIN:  [Cryo-Vanguard Mk-II]     |  ARCHETYPE:    [Talon SMG / Sidearm]     |
|  SHOULDER PATCH:[Sub-Zero Pioneer]        |  WEAPON SKIN:  [Hazard Stripe v2]        |
|                                           |  CHARM:        [Mini Cryo-Core 3D]       |
|                                           |  MOD A / MOD B:[Scavenger / Cryo-Cap]    |
|                                           |                                           |
|  ACTIVE SUIT FX:                          |  ACTIVE MODS:                             |
|  • Cosmetic only (skin/patch)             |  • +20% Scrap Magnet Pull Radius          |
|                                           |  • +8% Cryo Freeze Duration                |
|                                           |  • Charm spring physics active             |
+---------------------------------------------------------------------------------------+
|  [< SWITCH CLASS]            [QUARTERMASTER / CRAFTING]              [EMBARK >>]      |
+---------------------------------------------------------------------------------------+
```

```mermaid
graph TD
    A["Armory Screen (appPhase='armory')"] --> B["Weapon Bench (center/left)"]
    A --> C["Suit Bench (right)"]
    A --> D["Owned Items Carousel (bottom)"]
    A --> E["EMBARK button"]

    B --> B1["Class Gun Render (live, class-specific mesh)"]
    B --> B2["Weapon Skin slot"]
    B --> B3["Charm socket (1x, accessory rail, physics dangle)"]
    B --> B4["Mod Slot A / Mod Slot B (Rig Overclocks, gameplay-affecting)"]

    C --> C1["Chassis Skin slot"]
    C --> C2["Shoulder Patch / Decal slot"]

    D --> D1["Filtered by slot type of whatever's selected above"]
```

**Interpretation note on "suit stuff... to the gun":** mods (Rig Overclocks) and charms are
reframed here as clipping to the *weapon's* accessory rail — narratively and visually part of the
gun, not the chassis — which is what "apply mods and charms to the gun" means in this design.
Chassis skins and shoulder patches stay suit-scoped in their own bench zone, since they render on
the body, not the weapon. If that split doesn't match intent, it's the one thing in this doc worth
correcting before build.

**Per-class loadouts, not one global loadout.** Switching the class card on the Briefing Console
and re-entering the Armory shows *that class's own* saved bench — a Tank's mods shouldn't silently
reappear on a Scout's sidearm. See §5 for the data shape.

---

## 4. Class Gun Archetypes & Skin Reassignment

Each class gets one named base gun archetype (a real `.glb`, see §6). Scout additionally unlocks a
second archetype mid-pass, which is how the 4 orphaned "Assault Carbine" skins get a home without
inventing a 4th class:

| Class | Base Archetype | Secondary (tier-unlocked) | Skins Assigned (Itemdef) |
| :--- | :--- | :--- | :--- |
| **Scout** | **Vector-9 Talon** SMG/Sidearm — skeletonized magnesium receiver, top rail, collapsible wire stock; 840 RPM, low recoil, 1.2s reload | **Talon-C Carbine** *(unlocks Tier ~11, same weapon family, extended barrel/stock)* | Talon: `4100`, `4105` · Talon-C: `4101`, `4104`, `4108`, `4110` |
| **Tank** | **Siege-Breaker 50** Autocannon — reinforced dark-steel barrel shroud, hazard placards, dual pneumatic recoil dampers; heavy kinetic impact, high armor stagger, wide cone | — | `4102`, `4106` |
| **Engineer** | **Tesla-Lock MK-IV** Arc Driver — copper induction rings, glass vacuum amplifier tube, rear battery pack; continuous arc beam links between close-range targets | — | `4103`, `4107`, `4109`, `4111` |

Charm socket placement is archetype-specific (matches the physical geometry): Talon/Talon-C mount
on the forward Picatinny rail, Siege-Breaker on the carrying-handle rear eyelet, Tesla-Lock on the
battery-bay locking latch. All three still resolve to the same `WeaponSocket_Charm` bone contract
(§6) so charm meshes are archetype-agnostic — only the anchor transform differs per `.glb`.

Notes:
- This reassigns the Tier 50 dual-legendary capstones from doc 04: `4110` (Queen's Carapace
  Carbine, free track) becomes Scout's Carbine legendary; `4111` (Solar Flare Antimatter Rifle,
  premium track) becomes Engineer's Arc legendary. No tier numbers or reward gating changes — only
  which gun mesh each skin textures.
  - Doc 04's Tier 50 row should be read with this mapping going forward; not re-editing that table
    here to avoid duplicating numbers that can drift out of sync.
- Skin counts land 6/2/4 across Scout/Tank/Engineer. That's intentional, not an error: Tank and
  Engineer each have one fixed silhouette all season, while Scout's two-archetype kit gives that
  class more season-long skin chase content. If that asymmetry is unwanted, the fix is moving 2 of
  Scout's Carbine skins to Tank — flag it and it's a one-line table edit, not a re-architecture.
- Weapon skins remain a pure texture/material swap on the class's fixed mesh (per doc 06's
  existing PBR spec) — they do not change hitbox, fire rate, or any stat. No pay-to-win exposure
  is introduced.

---

## 5. Data Model: Unifying `LoadoutManager`

Replace the two divergent persistence paths with one. `LoadoutManager` (`src/loadout.js`,
`hb_loadout_v1`) becomes the single source of truth; `steamVaultUi.js`'s raw
`hb_equipped_patch` / `hb_equipped_decal` / `hb_equipped_weapon_finish` keys are retired and
migrated in on first load.

```javascript
// src/loadout.js — extended state shape
export interface PlayerLoadoutState {
  version: 2,
  perClass: {
    scout:    ClassLoadout,
    tank:     ClassLoadout,
    engineer: ClassLoadout,
  },
  // suit slots are NOT per-class — a patch/skin earned on your exosuit
  // follows the operator, not the gun
  suit: {
    chassisSkinId: string | null,   // e.g. "4113" (Cryo-Vanguard Scout)
    decalId: string | null,         // e.g. "4124" (Cyber-Skull Tactical Pin)
  },
  hudThemeId: string | null,        // now actually wired (was dead field pre-Armory)
  voicePackId: string | null,       // now actually wired (was dead field pre-Armory)
}

interface ClassLoadout {
  archetypeId: string;              // 'talon' | 'talon_c' | 'siege_breaker' | 'tesla_lock' (§6)
  weaponSkinId: string | null;      // must match archetypeId's assigned itemdefs (§4)
  charmId: string | null;
  mod1Id: string | null;            // Rig Overclock, itemdefs 4140-4147
  mod2Id: string | null;
}
```

Migration on load: if `hb_loadout_v1` (old shape) or the legacy `hb_equipped_*` keys are present,
one-time transform them into `hb_loadout_v2` under the player's currently-saved class, then delete
the old keys. `getActiveModifiers()` (`src/loadout.js:117-162`) already aggregates `mod1/mod2` into
gameplay multipliers for `threeGame.js` — that function's contract doesn't change, it just reads
from `perClass[currentClass]` instead of flat top-level fields.

**Validation rule the Armory UI must enforce:** `weaponSkinId` can only be set to an itemdef whose
`Applicable Weapon` matches the class's current `archetypeId` (§4's table). Prevents a Tank skin
from being equippable on a Scout Sidearm.

---

## 6. New Assets Required

Extends doc 06's asset manifest — same polygon/texture budgets, new entries:

### Class Gun Meshes (`public/models/weapons/*.glb`)
| `archetypeId` (§5) | Display Name (§4) | File | Notes |
| :--- | :--- | :--- | :--- |
| `talon` | Vector-9 Talon | `scout_talon.glb` | Base Scout loadout — skeletonized SMG/sidearm |
| `talon_c` | Talon-C Carbine | `scout_talon_c.glb` | Tier ~11 unlock, same family, extended barrel/stock |
| `siege_breaker` | Siege-Breaker 50 | `tank_siege_breaker.glb` | Base Tank loadout — autocannon |
| `tesla_lock` | Tesla-Lock MK-IV | `engineer_tesla_lock.glb` | Base Engineer loadout — arc driver |

- Polygon budget: `2,500 – 4,000 triangles` (higher than charms/mods since these render
  full-screen in the Armory bench view and, once the held-weapon pipeline lands, in third-person).
- Must expose a `WeaponSocket_Charm` accessory-rail bone (already specified in doc 03 §3) and two
  generic mod-chip mount points, so existing charm/mod assets attach without per-archetype rework.
- Rendering path: same offscreen `WebGLRenderTarget` + `NearestFilter` pixel-snap approach as the
  chassis vertical-slice spec, so the Armory bench preview visually matches the in-run look once
  weapons render in-game.

### Bench Environment (new, Armory-specific)
- `public/models/armory/workbench.glb` — the physical bench/table dressing behind the gun render.
  Budget: `1,500 – 2,500 triangles`, single texture atlas, matches the game's riveted-industrial
  art direction (doc 06 §1 palette).

No changes to charm (`public/models/charms/*.glb`) or mod (`public/models/mods/*.glb`) specs —
those attach to the new gun meshes' existing socket contract unchanged.

### Bone/Socket Hierarchy

Standardized rig contract every class gun and chassis conforms to, so charm/mod/patch assets stay
archetype-agnostic:

```
[Character_Rig_Root]
  └── [Spine_Chest]
        ├── [Bone_LeftShoulder]  -> [ChassisSocket_Patch_L]
        ├── [Bone_RightShoulder] -> [ChassisSocket_Patch_R]
        ├── [Bone_Backpack_Rig]
        │     ├── [RigModule_Socket1]   (Mod Slot A)
        │     └── [RigModule_Socket2]   (Mod Slot B)
        └── [Bone_RightHand]
              └── [Weapon_Root]                     (per-archetype .glb, §6)
                    ├── [Weapon_Mesh]                (class-specific geometry & skin shader)
                    └── [WeaponSocket_Charm]         (anchor transform varies per archetype, §4)
                          └── [Physics_Spring_Anchor]
                                └── [Charm_Mesh]      (Verlet spring sway, doc 03 §3)
```

Charm sway uses the damped-spring model from doc 03 §3: on fire/run/turn, the charm's node
computes `a = -(k/m)(x - x0) - c·v + a_recoil`, letting it swing naturally on its chain without
clipping into the weapon body — unchanged from doc 03, just now anchored to a real weapon mesh
instead of a socket with nothing attached to it.

---

## 7. Build Sequencing

1. **Data model migration** (`src/loadout.js` v1→v2, retire `steamVaultUi.js` raw keys) — no
   visual dependency, can land first and be verified against the current (gun-less) game.
2. **Armory screen shell** (`appPhase='armory'`, bench layout, slot UI, EMBARK routing into the
   existing `launchStandardRun`/cinematic chain) — can ship against a *static* class gun image or
   placeholder mesh, unblocked by the full chassis pipeline.
3. **Class gun meshes** (§6) — art/pipeline task, parallelizable with #1 and #2.
4. **Held-weapon in-run rendering** — depends on the chassis vertical-slice's independent
   torso/aim-yaw work (flagged as a prerequisite in the cosmetics-loadout-system spec, not yet
   started). This is what makes the Armory's choices visible *during combat*, not just on the
   bench — sequence it last, but the Armory itself doesn't block on it.

Steps 1–3 deliver a fully functional Armory (gear up, see your gun, mods affect gameplay via
`getActiveModifiers()`) even before step 4 ships.
