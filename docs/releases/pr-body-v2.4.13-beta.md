# Release PR: v2.4.13-beta — Steam Review Remediation, Unified Foundry & Co-op Authority

**Target Branch:** `mothership` ← **Source Branch:** `dev/sprint-48`

---

## 🎯 Summary & Tickets Closed

Sprint 48 has two jobs: answer Steam build review **25475189**, and finish the systems
players touch.

- **Steam review:**
  - multiplayer is on the title menu;
  - developer commentary is visible and readable in full;
  - menus work end to end with a controller;
  - mature content has a reviewer route;
  - the Vault sells keys through the Steam Item Store and Microtransactions, reconciled
    with `GetReport`.
- **The unified Foundry:** one item catalog, the Foundry hub on by default, and
  server-authoritative trade-ups.
- **Co-op:** host-authoritative companions, Ring 1 events and pings.
- **World and HUD:** lit, dressed, cut-away bunker rooms; the dock HUD is the default.

Release notes: [`docs/releases/v2.4.13-beta.md`](v2.4.13-beta.md).

### 📋 Tickets

Closing keywords follow the repository's backlog plan
([remediation and clearance plan](../planning/sprint-backlog-remediation-and-clearance-plan-2026-09-29.md),
category A: code-complete with dedicated verification suites). **Merging closes them,
so run the QA below before merging.** Tickets gated on two real accounts or hardware
are referenced, not closed.

Closes #78
Closes #79
Closes #80
Closes #81
Closes #82
Closes #83
Closes #84
Closes #66

Refs #85, #77, #53, #51, #52, #45

| Ticket | Scope | In this PR | Evidence |
| :--- | :--- | :--- | :--- |
| **#78** | Save boundary: dossier, owned inventory, campaign / new-run semantics | Closes | `src/ticket78Persistence.verification.test.js`; QA §5 |
| **#79** | Archives: discoverability, responsive text, achievement linkage | Closes | `src/ticket79Archives.verification.test.js`; QA §4 (achievements by controller) |
| **#80** | Fab Bay: durable Foundry and resources, 13 recipes | Closes | One item catalog (`d6681ad5`), Foundry hub (`cd3a376a`, `e38f65db`), fair odds (`d548dc35`), trade-ups that stick (`9833cffc`, `6f7c03c3`); `src/ticket80FabBay.verification.test.js`, `src/data/itemCatalog.test.js`, probes `foundry-hub` 5/5 and `vault-trade-up` 3/3; QA §3 |
| **#81** | Hero selection: class-swap stalls, accurate stage copy | Closes | The hero screen's equipped strip from the shared catalog; loadout follows the played class (`e38f65db`); `src/ticket81HeroSelection.verification.test.js`; QA §4 |
| **#82** | Armory: copy, complete loadout, sockets, charm cords | Closes | Armory names, icons and rarity from the one catalog (`d6681ad5`); `src/ticket82Armory.verification.test.js`; QA §3 |
| **#83** | Deployment console: ledger, Black Box, objective previews | Closes | `src/ticket83Deployment.verification.test.js`; expanded debrief (`fbd5d46e`); QA §2 |
| **#84** | Deck controller-only menu flow | Closes | Focusable achievement and Vault cards, spatial D-pad, D-pad scrolling for text panels (`ddff1018`); `src/ticket84DeckController.verification.test.js`; probe `steam-review-2026-09` 4/4; **QA §4 on a Deck is the acceptance** |
| **#66** | PR #65 follow-ups: destruction, ending locks, props | Closes | `src/ticket66DestructionAndLocks.verification.test.js` |
| #85 | Two-account co-op expedition | Refs | Host-authoritative companions and Ring 1 events (`712d0f75`, `b77c74cd`), pings (`4a74abd1`); needs the two-account session (QA §2) |
| #77 | Sprint 43 playthrough umbrella | Refs | Closes when #85 is accepted |
| #53, #51, #52, #45 | Deck acceptance, PvP certification, GPU pacing, ship gates | Refs | Hardware and packaged-build gates in [Sprint 49](../planning/sprint-49.md) |

---

## 📜 Commit Ledger (Sprint 48)

A selection; `git log origin/mothership..dev/sprint-48` lists all commits.

| Commit | Category | Description |
| :--- | :--- | :--- |
| `a001b823` | feat(store) | Sell keys through the Steam Item Store; reconcile MicroTxn with `GetReport` |
| `20b7162e` | revert(steam) | Keep the key prices: in-app purchases are intended |
| `ddff1018` | fix(steam-review) | Make every reviewed feature reachable (build 25475189) |
| `6f7c03c3` | feat(vault) | Server-authoritative Steam trade-ups and redemptions |
| `d548dc35` | feat(foundry) | Fair roll odds, shown before the player spends |
| `e38f65db` | feat(foundry) | Hub on by default, hardened; Foundry guns read as gameplay |
| `cd3a376a` | feat(foundry) | Hub: Stash, Loadout, Fabricate, Trade-up, Store |
| `d6681ad5` | feat(items) | One item catalog for the Armory, Foundry, hero screen and Vault |
| `9833cffc` | fix(vault) | Trade-ups stick, log their result |
| `712d0f75` | feat(coop) | Networked companion state; host-authoritative co-op companions |
| `b77c74cd` | feat(coop) | Host-authoritative Ring 1 events and arrival incidents |
| `4a74abd1` | feat(input) | Tactical context pings with 3D markers and co-op relay |
| `4ae9a5f5` | feat(gameplay) | Companion camp settlement and formation combat bonus |
| `9a520382` | feat(combat) | Archetype companion assist abilities |
| `57e3d47b` | feat(gameplay) | Field workbench crafting and suit repair at safe camps |
| `f0676af3` | feat(combat) | Corrupted-operator milestone bosses in phases |
| `aab1440b` | feat(gameplay) | Hazards and spores feed Act 2 infection load |
| `971d8458` | feat(story) | Hive Queen communion and timeline-divergence warning |
| `fbd5d46e` | feat(ui) | Debrief surfaces unlocks, faction standing and story leads |
| `f6baf5a9` · `215ebb61` · `f5bce5bd` · `2b9bfdd0` · `52af3993` | feat(world) | Lit, role-identified, cut-away, dressed bunker rooms |
| `7d2bd377` | feat(ui) | Dock HUD layout is the default (classic toggle kept) |
| `515f42fe` · `32a82a9d` · `2684c771` · `f175065e` | feat(hud) | Objective drawer, alert queue, combat and gameplay states |
| `03d309f5` · `bed8ac81` | perf | Chunk-mount spikes removed; ambient debris instanced |
| `3482799b` | feat(assets) | Achievement 3D cosmetics and key enemy models |
| `cc12ac3f` | fix(deps) | `npm audit` 0 (ip-address, undici, joi) |
| `a5f154d7` | chore(assets) | Superseded `public/ui/suit/` removed (4.1 MB) |

---

## 🔬 System Ownership & Runtime Wiring

| System | Canonical owner | Runtime consumer | Persistence | Verification |
| :--- | :--- | :--- | :--- | :--- |
| **Item catalog** | `src/data/itemCatalog.js` (`getItemView`) | Armory, Foundry, hero strip, Vault | Static data | `src/data/itemCatalog.test.js` |
| **Foundry hub** | `src/foundryHub.js` | Menu Vault / Fab Bay, in-run Foundry, camp rest | Borrows the Vault and Fab Bay panels | `src/foundryHub.test.js`, probe `foundry-hub.spec.js` |
| **Trade-ups & Dispensary** | `server/steamTradeUp.js`; `LocalVaultLedger.exchange` | Vault Trade-up tab | Steam inventory / local ledger | `server/steamTradeUp.test.js`, `src/localVaultLedger.test.js`, probe `vault-trade-up.spec.js` |
| **Store** | `server/steamStore.js`; hosted Item Store links | Vault Store tab | Purchase records (SQLite) | `src/steamVaultUi.hostedStore.test.js` |
| **`GetReport` reconciliation** | `server/steamMicroTxnReport.js` | Server timer (6 h); `server/scripts/microtxn-report.js` | `server/data/microtxn-reports/` | `server/steamMicroTxnReport.test.js` |
| **Commentary** | `showDeveloperCommentary` (`main.js`) | HUD stack / menu stack; Settings → READ ALL | `hunker_commentary_enabled` | probe `steam-review-2026-09.spec.js` |
| **Content Guide** | `src/matureContentAudit.js` | Settings → Content Guide; F9 | — | `src/matureContentAudit.test.js`, probe |
| **Co-op companions & events** | Host `ThreeGame` + `server/relay.js` | Guests via snapshots | Relay session | Relay tests; QA §2 |

---

## 🏆 Evidence Reached & Automated Gates Passed

- [x] **Designed**: [Sprint 48 plan](../planning/sprint-48-plan.md),
  [Steam review plan](../planning/steam-review-build-25475189-fix-plan-2026-09-30.md),
  [economy master plan](../planning/economy-master-plan-2026-09-30.md),
  [concept vs build review](../planning/gameplay-vs-theory-comparison-and-plan.md).
- [x] **Coded and connected:** every system above is wired into the runtime.
- [x] **Tested:** 4,462 tests across 514 files; browser probes
  `steam-review-2026-09` 4/4, `foundry-hub` 5/5, `vault-trade-up` 3/3,
  `menu-reachability` 2/2, `steam-vault` 2/2.
- [x] **Live-verified:** local development build and `vite build`.
- **Packaged-verified:** pending. QA below, on the Steam `beta` branch build.
- **Accepted:** pending. The owner closes on QA; merging closes the tickets listed above.

### Automated Checks
- `npm run lint`: 0 errors.
- `npm test`: 4,462 passed (514 files).
- `npm run i18n:audit`: markup and runtime unchanged; orphans −1.
- `npm run audit:docs`: passing.
- `npm run presubmit:generated`: passing (retail payload 2,909 MB against a 2,780 MiB
  budget, raised for the new models; compression queued as S49-31).
- `npm run build`: ok.

---

## 🎮 QA Instructions (packaged build on the Steam `beta` branch)

Build from a clean worktree of `dev/sprint-48`:
`HB_STEAM_BACKEND_URL=https://steam.tuesdaycinema.club npm run steam:upload`.
Export the session log after each section.

### 1. Steam review routes (build 25475189)
1. Title menu shows **MULTIPLAYER** between NEW RUN and ACHIEVEMENTS. Select it →
   ENTER ARMORY → EMBARK: the deployment console opens with **CO-OP** focused and
   **PVP** beside it.
2. Settings → **COMMENTARY MODE** on: a "Developer Commentary" card appears at once.
   Settings → **DEVELOPER COMMENTARY → READ ALL** lists at least 12 entries above
   Settings; Esc / B closes the list and leaves Settings open. Start a run: the "Run
   Loop" card appears once you're in control.
3. Settings → **CONTENT GUIDE (MATURE THEMES) → OPEN**. The guide opens above Settings.
   Select **SISTER VAL**: a transcript with `[DEEPEN INTIMACY]` opens above the guide.
   No Bio-Incubation or Tallow-ledger entries appear.
4. Title → NEW RUN → **◈ STEAM VAULT** → **STORE** tab. It is present only with
   purchases enabled on the backend (off in production until Sprint 49, so expect it
   hidden). With `HB_STEAM_ITEM_STORE_ENABLED=1`, each key's button opens its own Steam
   Item Store page.

### 2. Two-account co-op and PvP (Refs #85, #51)
1. Deck hosts, PC joins through MULTIPLAYER → CO-OP → the public lobby list (or a Steam
   invite). Both READY; the host DEPLOYs.
2. Companions: both screens show the same companion positions and actions. Ring 1
   events and arrival incidents fire on both.
3. Pings: place a ping from the controller; the other player sees the 3D marker.
4. Repeat for PVP with one kill. Record both session logs.

### 3. Foundry, Armory and Vault (Closes #80, #82)
1. STEAM VAULT (or FAB BAY) opens the **Foundry** window. Tabs: Stash, Loadout,
   Fabricate (🔒 until the Foundry is activated), Trade-up. Resources show in the
   header on every tab.
2. The same item shows the same name, rarity and icon in the Armory, the hub, the hero
   strip and the Vault.
3. Fabricate shows odds under the roll button and stat chips on each gun; a fabricated
   gun changes firing in the next run for the class you play.
4. Trade-up on a QA-tools build: smelt 5 rares → 1 epic; counts stay after close and
   reopen.

### 4. Controller-only (Closes #84, #79, #81)
Keyboard unplugged, Deck and PC pad:
1. Achievements: D-pad down to the bottom row, then right to the last card; the list
   scrolls and the focused card stays on screen.
2. Vault / Foundry: LB/RB and Q/E switch tabs, and focus stays on the tab bar; Vault
   items can be selected.
3. Lore, logs and the commentary list scroll with D-pad up/down.
4. Hero screen: 30 class swaps; the equipped strip follows the class.

### 5. Saves (Closes #78)
Two deaths, a victory, NEW CAMPAIGN: career stats and permanent unlocks persist; no
duplicated ownership. Steam Cloud round trip between two machines.

### 6. World and HUD
Play 10 minutes. Rooms show light strips, role screens, door headers and drips;
camera-facing room walls are cut down; the dock HUD is readable at 1280×800 (Deck) and
1920×1080. Note the frame pacing in the session log.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
