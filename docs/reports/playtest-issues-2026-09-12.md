# Playtest issues — 2026-09-12

**Status:** triage. Fix these before starting new features.
**Evidence:** two paired session logs from one co-op/PVP match, 2026-09-11T22:54 → 22:58.

| | Deck session | Windows session |
|---|---|---|
| file | `...T22-58-20-906Z-mtxk4w82-fg0g.json` | `...T22-58-28-427Z-mtxk514r-dvbg.json` |
| host | Linux, **deck=yes**, SteamDeckController | Windows, deck=no, **controllers=0** |
| stage | 1280x800, class **TANK** | 2304x1440, class **ENGINEER** |
| ended | `phase=gameover`, death/results=yes | `phase=gameplay` |
| entries | 1529 | 390 |

Both: `join=yes twoPlayerRoster=yes ready=yes deployed=yes remote3d=yes pvp=yes`.

---

## Progress

| ID | Status | Commit |
|---|---|---|
| P1-2 wheel edits settings values | **fixed** | `959d182` |
| (unreported) accessibility settings never ran | **fixed** | `8afac60` |
| P1-4 dropdowns unthemed | **fixed** | `7259c11` |
| P1-5 duplicate aim control on Deck | **fixed** | `7259c11` |
| P1-1 gear hit target | **fixed** (44px min) | `8fc84e7` |
| P1-1 ESC / controller Start | **already worked** — see below | — |
| P1-3 HUD vs settings layering | **fixed + Deck regression** | `012b942` |
| P0-1 PVP one-directional damage | **fixed; two-client rerun still required** | `df17049` |
| (plan) 3 of 4 mandatory ship goals had no authored room | **fixed** | `7f3d578` |
| P0-2 interaction cycling | **fixed** (keyboard + controller) | `facad1e`, `a20add1` |
| P0-2 movement trap / unstick | **fixed** (overlap + sustained pin recovery) | `79ef18d`, `c40263f` |
| P0-3 black box as secondary objective | **fixed** | `a20add1` |
| P1-6 terminal death pose | **fixed** | `c397156` |
| P2-5 base/field turret model, scale and timing | **fixed** | `10a7a81` |
| P2-4 one Relic Key per boss | **fixed; live Steam grant still needs acceptance** | `bdb590c` |
| P2-1 hero select layout | **not reproduced; intended delta needed** | browser evidence below |
| P2-3 inventory-backed loadout | **already wired; live Steam acceptance needed** | `itemOwnership` + `armoryUi` |
| P2-2, P2-6..P2-7 Daily Op, skill tree, start-raw | design contract required | — |

### Coordination note

This was the original coordination constraint during triage. The contended
changes subsequently landed in isolated commits: interaction cycling and
black-box priority first, then movement depenetration. The note remains here to
explain the commit sequence, not to describe an active blocker.

### P1-3 — resolution

The HUD was not above Settings: its stacking level is `7000`, while Settings is
`100010`. At 1280x800 the 16:10 `#game-viewport` also covers the full Deck stage.
The defect was visual bleed-through: `#settings-popup` uniquely weakened the
global modal backdrop to 72% black and disabled blur, leaving bright HUD text
readable through the panel gutters.

Settings now uses a 97–98% opaque tactical gradient plus blur/desaturation. A
Playwright regression at 1280x800 proves full-stage coverage, the correct HUD
stacking order and the opaque/blurred backdrop. The same check also covers the
themed desktop select and single controller-mode aim input from P1-4/P1-5.

## P0 — blockers

### P0-1 PVP damage is one-directional

**Evidence.** Same match, opposite results:

```
Deck    (TANK):     playerDamage=yes  pvpDamage=yes
Windows (ENGINEER): playerDamage=no   pvpDamage=no
```

The Deck client registered both dealing and taking PVP damage. The Windows client registered
neither — matching the report that shots passed through the other player. This is **not** "PVP is
broken": it worked one way. That asymmetry is the diagnostic.

**Where to look, in order.**
1. **Authority.** If hit resolution is host-authoritative and the Deck was host, the Windows
   client's shots would render locally and never resolve. Check which peer owns hit detection in the
   PVP path and whether the non-host's projectiles are replicated at all.
2. **Class.** Windows was ENGINEER, Deck was TANK — the one class whose damage is modified
   (`TANK=2`). Confirm the ENGINEER projectile path is not separately gated.
3. **Hitbox side.** `PLAYER_HITBOX_PADDING` is documented as "forgiving hitbox for player shots
   only" — confirm it applies to remote players, not just local-vs-enemy.

Reproduce with the roles swapped: if the Windows client then lands hits, it is authority (1); if it
still cannot, it is class or hitbox (2/3).

### P0-2 Objective softlock — no way to cycle overlapping interactables

Player became stuck between the terminal and the ship, and with several selectable things in range
there was no way to toggle between them. The black-box body stayed selected, so **the next
objective could never be reached.** Run-ending.

Two defects, both must be fixed:
- **No cycling.** Interaction picks one candidate with no way to change it. The existing prompt
  already builds a candidate list (`threeGame.js` ~8805 selects between turret/other by distance) —
  it needs a cycle input and a visible indicator when more than one candidate exists.
- **Geometry trap.** Stuck between terminal and ship. `resolveSafeSpawn`/`separateSpawns` exist in
  `src/safeSpawn.js` for spawn cases; this is a *movement* case and needs an unstick (depenetrate
  toward nearest walkable) rather than a spawn fix.

### P0-3 Black-box pickup overrides the objective instead of being secondary

The black box is optional but currently takes over the objective slot, compounding P0-2. It must be
a **secondary** objective that never replaces the primary and never blocks progression.

---

## P1 — settings and input

### P1-1 ESC and controller Start do not open settings

**Correction after investigation: both routes already exist and are wired.**

- **Escape** opens settings during gameplay — `main.js` ~11082, at the end of a
  long "close the topmost open surface first" chain, guarded by `isGameplayPhase()`.
- **Controller Start/pause** runs `triggerControllerPauseAction()` — bound at
  `main.js:1928` via `actions.pause`, and that function already toggles settings
  and closes whatever modal is on top.

So no new binding should be added; a second one would double-fire. If Escape felt
unresponsive in play, the cause is upstream in that chain: the handler bails on
`event.defaultPrevented`, and any earlier surface that is open consumes the key
first. Worth re-testing deliberately and reporting *what was on screen* at the time.

The genuinely unaddressed part was the pointer target.
**ESC should open settings**, and the Steam Deck / controller **Start (Menu)** button should do the
same. Note the existing trap recorded in `project_steam_input_action_set_trap`: an always-mounted
overlay without `.hidden` pins the Deck to the menu action set and kills native input — whatever
opens this must fully unmount or `.hidden` on close.

### P1-2 Mouse wheel scrolls the settings list while using WASD

Scrolling is captured too eagerly. Scope wheel handling to an explicitly hovered scroll container,
and do not let the wheel move focus/selection while a movement key is held.

### P1-3 HUD renders in front of the settings menu on Steam Deck

Z-order/stacking-context bug, Deck-only per the report — the Deck session ran at 1280x800, so check
layering at that viewport specifically. Likely a HUD layer with a higher effective stacking context
than the settings overlay.

### P1-4 Dropdowns are unthemed on desktop

Native `<select>` rendering instead of the game's styling.

### P1-5 "Turn aim speed" shows all options *plus* an empty dropdown on Deck

A duplicate/empty control is being rendered — probably both a custom list and a native `<select>`
mounted together, with the native one empty. Related to P1-4: fixing the dropdown component should
address both, but verify at 1280x800.

---

## P1 — death and feedback

### P1-6 Death still shows the default body, not a downed body for the black box

The Deck session reached `phase=gameover` with `death/results=yes`, so the death path ran — the
downed-body visual is what is missing, not the death flow.

---

## P2 — progression and loadout structure

### P2-1 Hero select button layout is wrong

Layout pass needed. Verify at **1280x800** (Deck) and 2304x1440 — both appear in these logs, and the
Deck bounds have already caused three prior layout defects.

**2026-09-12 browser rerun:** no mechanical layout failure reproduced at either
viewport. All three cards, selected-operator preview, loadout/stats, operations,
and return action remained visible; document width/height exactly matched the
viewport (no overflow), and controller focus remained on the selected Tank
card. A redesign needs the intended visual/order delta before implementation;
the generic report "layout is wrong" is not enough to choose one safely.

### P2-2 Move Daily Op into the loadout screen, after the armory

Daily Op should sit in the run-setup flow after the armory step, and should **list the daily goals
and challenges** there rather than being a separate destination.

### P2-3 Charms and loadout must reflect the player's real inventory

The new-run charm/loadout screen must map to actual owned inventory. Today the cosmetic/charm
catalog is largely inert (`project_cosmetics_loadout_system`), so this is the wiring that makes
ownership mean something.

**Source reconciliation:** this path is already implemented. `main.js` creates
one application-wide `itemOwnership` store and passes it to `armoryUi`;
`buildEquipOptions` renders ownership-gated choices, Steam Vault refresh calls
`loadout.reconcileOwnership(inventory)`, and that method clears charms, skins,
mods, decals and chassis not present in the supplied inventory. What remains is
a real-account Steam Inventory acceptance pass, not another catalog wiring
change.

### P2-4 Grant a case unlock key per boss

Every boss kill should grant a case unlock key so players accumulate real inventory. Ties P2-3 to a
source — without it, an inventory-backed loadout screen stays empty.

### P2-5 Engineer turret: wrong model, wrong size, wrong unlock timing

Three separate changes:
- The **dropped turret model is the one that should be used at base** — swap the base turret to it.
- It needs to be **smaller**.
- The **droppable** turret should move to a **much later unlock**.

Note the base turret already exists with 3 upgrade levels and HP (`bank.js` `BASE_TURRET_UPGRADES`,
placed at `threeGame.js:8800`), so this is a model/scale swap plus an unlock move, not new systems.

### P2-6 Skill trees should drive story and powers

Currently cosmetic-adjacent progression. Direction: skill choices should unlock narrative and
abilities, not just stat bumps. This is a design task, not a bug — needs its own pass.

### P2-7 "Start raw"

New runs should begin with minimal kit so progression is earned within the run. Interacts with P2-3
and P2-5 (a late turret unlock is part of starting raw). Confirm intended floor before implementing.

---

## Also visible in the logs, not reported

**Windows client performance is poor and the Deck's is fine.**

```
Windows: gpuAvg=9.87ms  gpuMax=70.42ms  dropped=20  memory=1048.8MiB  adaptive=yes
Deck:    gpuAvg=0.82ms  gpuMax=2.25ms   dropped=0   memory=296.1MiB   adaptive=no
```

A 70 ms GPU frame and a 2694 ms long task on the desktop machine, with adaptive scaling already
engaged, while the Deck sits at 0.82 ms. That is inverted from expectation and worth a look — the
2304x1440 stage is the obvious suspect, but 1 GiB of memory is high regardless. Zero errors logged
in either session.

---

## Suggested order

1. **P0-1** PVP damage — reproduce with roles swapped first; the answer changes the fix.
2. **P0-2 / P0-3** objective cycling, unstick, black box as secondary — one workstream, run-ending.
3. **P1-1 / P1-2** ESC + Start to open settings, scroll capture — cheap, high daily impact.
4. **P1-3 / P1-4 / P1-5** settings layering and the dropdown component — verify at 1280x800.
5. **P1-6** downed body.
6. **P2-5** turret swap — small and well-understood.
7. **P2-1 → P2-4** loadout/Daily Op/inventory restructure — one coherent pass.
8. **P2-6 / P2-7** skill tree and start-raw — design first, then build.

## Verification

Re-run a two-client PVP session and require `playerDamage=yes pvpDamage=yes` **on both clients**.
That single line in the analyzer output is the regression test for P0-1.
