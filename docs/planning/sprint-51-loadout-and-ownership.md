# Sprint 51 — Loadout you can read and change anywhere; earn everything

Status: **implementation complete; hardware acceptance and deferred perf work remain** | Branch: `dev/sprint-51` (local only until the owner says publish)

The owner, 2026-10-06:
- "Fix the Foundry that shows loadout. I want to see what the loadout does."
- "When I click an empty box we see what can go there, in the Foundry or on the hero select, just like in the Armory screen."
- "Scale and place items correctly: some are too small. Make it all fit each model."
- "Some are unlocked in a fresh load. If we reset a save they should have nothing and earn it all back."

## What exists today

| Area | Today |
|---|---|
| Foundry → LOADOUT tab | A static strip of five cards (weapon, charm, bay A, bay B, chassis) and a hint: "Change what each class carries in the Armory." No effects shown. Clicking does nothing. |
| Hero select strip | The same five cards, compact, art only. Clicking does nothing. |
| Armory | Per-slot tile picker (`armoryUi.js` `openPickerModal`, `armoryPicker.js`, `armoryOptions.buildEquipOptions`). This is the only place to change equipment. |
| What items do | Charms and mods have one-line effects in `src/data/equipmentDefinitions.js` (e.g. "+20% pickup magnet radius"). `getItemView` (what every card draws) carries no description or effect. |
| Fit on the model | `operatorEquipmentSockets.js`: seven bone sockets, a trim per class, a trim per item. There is **no per-chassis-model fit**: 30+ chassis bodies share their class's numbers, so an item sized for one suit floats on or sinks into another. |
| Fresh-save ownership | `itemOwnership.js` `DEFAULT_OWNED` gives every new save: **all 8 Rig Modules** (4160–4167, which are designed to be earned with shells, achievements, shards or depth, but nothing ever grants them), **all community chassis skins** (`isUnlockedDefault: true`), and voice packs 4148/4149. Reset clears every `hb_` key (dev grants, UNLOCK ALL, sandbox vault), so only `DEFAULT_OWNED` survives it. |

## Plan

### A. Show what the loadout does
- [x] `getItemView` gains `effect` (from `equipmentDefinitions` for charms and mods) and `kind`-based text for cosmetics ("Cosmetic — changes the look only").
- [x] Foundry LOADOUT tab: each slot card shows its effect line, and a **summary** totals the equipped modifiers ("+20% magnet radius · +1 pierce · −10% fire rate").
- [x] Hero select: hovering or focusing a card shows the same effect in its tooltip and label.

### B. Click any slot to change it, on every surface
- [x] Extract the Armory's slot definitions (the item ids per slot, current value, apply) into one module, `src/loadoutSlots.js`, used by the Armory and the new picker.
- [x] A shared slot picker (tiles from `buildPickerTiles` and `buildEquipOptions`, the same ownership gate and locked "???" tiles), each tile showing its effect.
- [x] Opened by clicking or pressing A on any slot card, filled or empty, in the Foundry LOADOUT tab and on hero select. Equipping updates the card, the 3D preview and the Armory alike.
- [x] Controller: the picker takes focus, B closes it, and focus returns to the slot (same focus-root rules as the Armory).

### C. Items sized and placed to fit every model
- [x] **Measure, don't guess:** a capture harness renders every mod on every chassis (and every charm on every weapon frame) into a contact sheet, so fit is checked by eye in one image.
- [x] **Per-model fit:** scale and offset by the model's own skeleton (e.g. shoulder span and torso depth relative to the class reference), so a broad Tank skin and a slim Scout skin both carry an item at the same visual size. Per-item trims stay for the outliers.
- [x] Fix the items the sheet shows too small or misplaced; re-render to confirm.

### D. A fresh or reset save owns nothing it hasn't earned
- [x] Remove the Rig Modules from `DEFAULT_OWNED`. Wire their designed unlocks:
  - 4160 and 4161: buy for 150 shells.
  - 4162: Queen killed.
  - 4163: Archivist lore achievement.
  - 4164 and 4165: Deep Core Shards (25 and 50).
  - 4166 and 4167: reach depth 4 and depth 6.

  Each unlock is persisted in the save, so a reset takes it away again.
- [x] Community chassis skins and voice packs: **owner decision** (see below).
- [x] Locked items show how to earn them in the picker (`unlockPath`, e.g. "REACH DEPTH 4").
- [x] Test: a fresh profile owns nothing beyond the class factory frames (plus whatever the decision keeps); a reset returns to that.

## Decisions (owner, 2026-10-06)

- **Community chassis skins: earned.** A class's skins unlock in order with runs as that class: after 1, 2, 3, 5, 7, 10, 13, 16, 20, 25 and 30 runs (`SKIN_RUN_THRESHOLDS`).
- **Voice packs 4148/4149: free** from the start.
- **Ruling:** the two Rig Modules designed to cost Deep Core Shards (4164, 4165) cost shells instead (250 and 400). Shards are Steam items, and spending them would need a server consume. The cost if wrong: a price change.

## Status log

- D (ownership) done, `src/progressionUnlocks.js`:
  - Achievement rewards, Rig Modules (achievements, depth, shell purchases) and community skins are derived from the saved achievement record and `hb_rig_purchases_v1`, both cleared by a reset.
  - Also fixes a Steam bug: achievement reward skins (5001–5012) were granted with `grantDev`, which is off on the Steam build, so Steam players lost them on reload.
  - The shell purchase button arrives with the slot picker (B).
- A and B done:
  - **Cards show what items do:** `src/itemEffects.js`, translated effect lines for every charm, Rig Module and Foundry profile.
  - **The Foundry LOADOUT tab** gains "What this loadout does".
  - **Every slot opens a picker:** filled or empty, in the Foundry and on hero select. It's the Armory's own picker in a picker-only mode (`#loadout-picker-modal`), so ownership, locked tiles and equipping follow one set of rules.
  - **Locked tiles say how to earn them;** shell-priced Rig Modules buy with two clicks.
  - Tests: `src/itemCard.test.js`, `tests/e2e/loadout-slot-picker.spec.js`.
- C done (`fitEquipmentToSurface` in `src/operatorEquipmentSockets.js`):
  - **Cause:** offsets were in each bone's own axes at a fixed distance. On the calibrated Tank, the shoulder, both forearm, helmet and one waist module were buried in its armor. Also, `findBone` matched the parent `RightArm` before `RightForeArm`, so forearm modules went on the upper arm.
  - **Fix:** each module now snaps to the chassis's own surface. A ray runs inward along the mount's direction, with a per-mount reach so a pauldron isn't mistaken for the helmet. The module faces outward and is sized by the body's thickness there (0.85–1.45×).
  - **Verified:** front contact sheets of all 51 bodies, 4 module pairs each (`scripts/capture-equipment-fit.mjs`).
  - **Outliers:** `skin_scout_mayor_tina` renders crouched (the model's pose), and the 4143 forearm cylinder protrudes; both to review by eye in the Armory.

## Second wave: Sprint 50 carry-overs (owner, 2026-10-07: "next work on")

Decisions (owner, 2026-10-07):
- **Earned key:** a boss kill grants the earned cache key 4154.
- **Reagents:** "Full loop". Deep Core Shards trade for reagents weekly, boss kills drop ingots, and ingots + matrices + ambergris assemble the overclock modules.
- **Co-op:** "if one player unlocks O2 both get it, if one player gets coins both get it in PvE / co-op. PvP it's just they don't share." PvP may get its own ships and map type later (design note below).

| Commit | What |
|---|---|
| `44f00b5f` | **Camps:** C / right-stick click cycles every camp action. TALK always works. Each camp's two workers are named residents you can talk to. A settled survivor stays as a resident. The companion no longer relocates into walls. |
| `8d5c4d06` | **Input hints:** keyboard key hints read as pad hints while a controller is active (`src/inputHints.js`). The tactical map's zoom and "find me" work from a pad. |
| `051a5334` | **Co-op:** the squad shares ship progress (O2 level, unlocks) and loot at full value (`src/squadProgress.js`); PvP keeps them private. PvP heals reach the relay, so health no longer drifts. |
| `0d2b599b` | **Earned key:** boss kills grant 4154; caches open with either key (the schema's 4002 exchange has two recipes). 4155 is store-hidden and not marketable. |
| `db05d7bc` | **Reagent loop:** the Quartermaster trades shards for ambergris (35, 3/week), matrices (50, 2/week) and the earned key (75, 1/week). Boss kills grant 5 ingots. The Assembly Bay builds 4140–4147. Both panels are on the Vault's Trade-up tab. |
| `3cd1219d` | **Co-op aggro:** the host's snapshot names each enemy's target, and the guest's copy bites and faces that player. Before, a snail chasing the guest never did damage. |
| `c51a02b8` | **Web perf:** the briefing, Vault, trade window and legacy dev console are built on first open (`src/deferredMarkup.js`). Boot DOM went from ~2,700 to ~2,200 elements. |
| `7f991a74` | **Duplicate-shard recovery:** a failed secondary shard grant retries from the completed cache journal on the same request or before the player's next exchange. The cache never rerolls, and Steam receives the same stable AddItem request ID. |
| `6ad75ec1` | **16:9 clipping guard:** the deferred co-op deployment briefing opens at 2560×1440 and every visible interactive control must remain inside the viewport and unobscured. |

Not done:
- **UI clipping on the owner's 16:9 PC:** still needs the original screenshot or screen name. The known deployment-briefing candidate now passes an automated 2560×1440 control-bounds check (`6ad75ec1`).
- **Web perf, next:**
  - Settings (210 elements) and the ship console (210) are the next deferral candidates. Both are read and written by boot-time settings sync throughout `main.js`, so they need their own pass.
  - LCP is still the title art painting late, and the owner rejected showing it in the loader.
- **Legacy dev console modal:** `#dev-console-modal` is never shown. Since `3246ccd5`, `openDevConsoleModal` opens the tilde console. Its markup is now deferred, not deleted (owner's call). `tests/e2e/dev-debug-commands.spec.js` still expects it to open.

### Design note: PvP ships and map type (future)

PvP no longer shares squad progress or world events (`PVP_PRIVATE_WORLD_EVENTS`), but both players still spawn around one crash site and one ship. The owner's idea: each player gets their own ship, on a map type built for two bases, e.g. mirrored halves with a contested middle ring. That needs:
- a route-layout variant (`ROUTE_LAYOUT_VERSION`; bump, never edit v1);
- per-player ship state in the relay;
- a win condition tied to the rival ship.

Not started.

## Owner steps before this ships

1. Done 2026-10-07 07:08 (4002 and 4155 at revision 3). **Upload the Steam inventory schema** (`steam/inventory_schema_hunker_bunker.json`): the 4002 two-key exchange, and 4155 store-hidden and not marketable. Until then, earned keys (4154) cannot open caches on Steam.
2. Done 2026-10-07 07:14, image `candidate-02710831`; rollback is `candidate-970f17af`. Until the Sprint 51 client ships, boss-kill keys (4154) are invisible in the live client's Vault. **Deploy the backend:** quartermaster and assemble routes, ingots and keys on boss kills, `quartermaster`/`assemble` capabilities. Deploy before the client, as with the season ledger.
3. Done with the backend; the relay runs in the same container. **Deploy the relay:** the PvP `playerHealed` budget, and enemy `targetId`/`mode` in snapshots. An old relay strips the new fields, so guests stay safe from snails until it is updated.
4. Bump the version (patch, keep `-beta`) when the PR is opened.
5. Run the two-account co-op route and the Deck controller route. Automated parity/input coverage is green, but it does not replace the hardware check.
