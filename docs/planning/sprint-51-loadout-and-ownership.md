# Sprint 51 — Loadout you can read and change anywhere; earn everything

Status: planning | Branch: `dev/sprint-51` (local only until the owner says publish)

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
- [ ] `getItemView` gains `effect` (from `equipmentDefinitions` for charms and mods) and `kind`-based text for cosmetics ("Cosmetic — changes the look only").
- [ ] Foundry LOADOUT tab: each slot card shows its effect line, and a **summary** totals the equipped modifiers ("+20% magnet radius · +1 pierce · −10% fire rate").
- [ ] Hero select: hovering or focusing a card shows the same effect in its tooltip and label.

### B. Click any slot to change it, on every surface
- [ ] Extract the Armory's slot definitions (the item ids per slot, current value, apply) into one module, `src/loadoutSlots.js`, used by the Armory and the new picker.
- [ ] A shared slot picker (tiles from `buildPickerTiles` and `buildEquipOptions`, the same ownership gate and locked "???" tiles), each tile showing its effect.
- [ ] Opened by clicking or pressing A on any slot card, filled or empty, in the Foundry LOADOUT tab and on hero select. Equipping updates the card, the 3D preview and the Armory alike.
- [ ] Controller: the picker takes focus, B closes it, and focus returns to the slot (same focus-root rules as the Armory).

### C. Items sized and placed to fit every model
- [ ] **Measure, don't guess:** a capture harness renders every mod on every chassis (and every charm on every weapon frame) into a contact sheet, so fit is checked by eye in one image.
- [ ] **Per-model fit:** scale and offset by the model's own skeleton (e.g. shoulder span and torso depth relative to the class reference), so a broad Tank skin and a slim Scout skin both carry an item at the same visual size. Per-item trims stay for the outliers.
- [ ] Fix the items the sheet shows too small or misplaced; re-render to confirm.

### D. A fresh or reset save owns nothing it hasn't earned
- [ ] Remove the Rig Modules from `DEFAULT_OWNED`. Wire their designed unlocks:
  - 4160 and 4161: buy for 150 shells.
  - 4162: Queen killed.
  - 4163: Archivist lore achievement.
  - 4164 and 4165: Deep Core Shards (25 and 50).
  - 4166 and 4167: reach depth 4 and depth 6.

  Each unlock is persisted in the save, so a reset takes it away again.
- [ ] Community chassis skins and voice packs: **owner decision** (see below).
- [ ] Locked items show how to earn them in the picker (`unlockPath`, e.g. "REACH DEPTH 4").
- [ ] Test: a fresh profile owns nothing beyond the class factory frames (plus whatever the decision keeps); a reset returns to that.

## Decisions (owner, 2026-10-06)

- **Community chassis skins: earned.** A class's skins unlock in order with runs as that class: after 1, 2, 3, 5, 7, 10, 13, 16, 20, 25 and 30 runs (`SKIN_RUN_THRESHOLDS`).
- **Voice packs 4148/4149: free** from the start.
- **Ruling:** the two Rig Modules designed to cost Deep Core Shards (4164, 4165) cost shells instead (250 and 400). Shards are Steam items, and spending them would need a server consume. The cost if wrong: a price change.

## Status log

- D (ownership) done, `src/progressionUnlocks.js`:
  - Achievement rewards, Rig Modules (achievements, depth, shell purchases) and community skins are derived from the saved achievement record and `hb_rig_purchases_v1`, both cleared by a reset.
  - Also fixes a Steam bug: achievement reward skins (5001–5012) were granted with `grantDev`, which is off on the Steam build, so Steam players lost them on reload.
  - The shell purchase button arrives with the slot picker (B).
