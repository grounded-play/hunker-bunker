# Sprint 43 — Playthrough Remediation and Steam Demo Acceptance

**Date:** 2026-09-22  
**Planning status:** Committed scope, not implemented or accepted  
**Reviewed baseline:** `mothership` @ [`48b144b`](https://github.com/grounded-play/hunker-bunker/commit/48b144bdfec1e4f9492f5cf6884abaa2f345b925), Sprint 41 integration / `v2.4.8-beta`.  
**Parent:** [#77](https://github.com/grounded-play/hunker-bunker/issues/77) · **Release gates:** [#45](https://github.com/grounded-play/hunker-bunker/issues/45)  
**Agent handoff:** [Sprint 43 expanded implementation prompt](../prompts/sprint-43-agent-handoff-2026-09-22.md).

## Evidence boundary

These are observations from the 2026-09-22 player playthrough and the provided Armory screenshot, cross-referenced with current source and the existing Sprint 41 documentation. The newly uploaded session log (`hunker-bunker-session-2026-09-22T22-38-41-679Z-mud99ymc-c2sm.json`) has been retrieved via `npm run logs:fetch` and analyzed with `scripts/analyze-session-logs.mjs`. Sprint 43 issue [#86](https://github.com/grounded-play/hunker-bunker/issues/86) tracks the correlated evidence. Automated tests do not constitute human/physical Steam Deck or two-Steam-account acceptance.

## Playthrough issue register

| ID | Priority | Player-visible problem or requested change | Focused issue | Expected completion |
| --- | --- | --- | --- | --- |
| S43-01 | P0 | Dossier does not reliably update/persist; owned inventory must survive NEW GAME; distinction between story reset and run/career continuity is unclear. | [#78](https://github.com/grounded-play/hunker-bunker/issues/78) | Versioned persistence boundary, safe migrations, repeat death→win→new-campaign test. |
| S43-02 | P1 | Archives are hard to find in-game, heavily nested/scrolled and have running text/overlays; progression feels isolated from achievements and unlocks. | [#79](https://github.com/grounded-play/hunker-bunker/issues/79) | One discoverable Records surface with linked lore, dossier, ending, achievement and reward views; no inaccessible text. |
| S43-03 | P1 | Fab Bay needs debug/demo-season unlock and Foundry activation, print queue and resources must survive run save/reload. Verify advertised recipe count. | [#80](https://github.com/grounded-play/hunker-bunker/issues/80) | QA-only unlock; durable state/economy and all **13** defined recipes verified in UI and output. |
| S43-04 | P1 | Scout/Tank/Engineer switching sometimes stalls or leaves awkward/unfinished character movement; Homebase hero stage refers to armament not visibly displayed there. | [#81](https://github.com/grounded-play/hunker-bunker/issues/81) | Smooth, timed class previews; stage copy describes frame/class, reserving detailed weapon fitting for Armory. |
| S43-05 | P1 | Overclock cards clip/truncate, loadout information is scattered, Operator Polish is in the wrong area, wearable gear hides behind rigs, and gun charms miss their mounts. | [#82](https://github.com/grounded-play/hunker-bunker/issues/82) | Clear comprehensive stage readout; Operator Polish under Exosuit Rig; individually calibrated suit items and per-weapon hanging charm loops. |
| S43-06 | P1 | Solo deploy omits ongoing days/runs/deaths/story/black-box history; active operation and seasonal targets are not coherently presented across modes; Black Box loss behavior needs end-to-end verification. | [#83](https://github.com/grounded-play/hunker-bunker/issues/83) | Lifetime/campaign/current-run ledger, mode-appropriate tracked goals and only one recoverable active Black Box. |
| S43-07 | P0 | Steam Deck arrows/D-pad/focus flow is unreliable, particularly Homebase class selection, Armory and nested surfaces. | [#84](https://github.com/grounded-play/hunker-bunker/issues/84) | Full physical Deck controller-only route with reliable A/B/LB/RB, no pointer requirement, safe 1280×800 layout. |
| S43-08 | P0 | Co-op may be broken; the current report does not isolate which stage fails. | [#85](https://github.com/grounded-play/hunker-bunker/issues/85) | Reproduced failure if present, fix plus paired packaged two-account completion evidence. |
| S43-09 | P0 | Newly recorded log must be ingested and checked against every report above. | [#86](https://github.com/grounded-play/hunker-bunker/issues/86) | Dated evidence report, precise timestamps and reproducible follow-up for each supported symptom. |

## Persistence contract: three different clocks

The words **account/career**, **campaign/new game**, and **individual run** must correspond to different save boundaries; a new attempt is not a wipe.

| Domain | Lifetime profile / account | One campaign, potentially several deaths until first victory | One deployed attempt | New campaign behavior |
| --- | --- | --- | --- | --- |
| Identity, callsign, total runs/deaths, deepest achieved depth and earned achievements | Authoritative | Read-only projection | Increment on valid outcomes | Retain |
| Owned Steam inventory, earned local rewards, cosmetic unlocks and selected loadouts | Authoritative, with Steam entitlements from Steam service | Read-only/equipped projection | Snapshot chosen loadout at deploy | Retain; never synthesize purchasable items |
| Dossier knowledge and collected Archives | Permanent discovered facts and read history | Current narrative view filters by campaign context | Earn once on validated discoveries | Retain earned knowledge |
| Story points, linchpins, faction choices, Act progress and victory trajectory | History of completed endings only, when earned | Authoritative active story | Mutates and checkpoints as events fire | Reset current story; retain completed historical record |
| Campaign attempts, deaths/lives lost, elapsed days, recovered and forfeited boxes | Aggregate totals | Track until victory; remain visible in campaign recap | Increment/commit once per outcome | Start at zero for next campaign, retain career total |
| Foundry activation, base upgrades, fabrication print orders and Tech/Coin/Med | Deliberate permanent recipe/output entitlement only if design grants it | Durable base/economy state | Working run copy commits at valid save points | Reset/retain **must be decided explicitly**; do not accidentally reset on RETRY or Continue |
| Current Black Box, run-local loot, active objective, transient session/relay | Death history totals only | At most one recoverable box at a time | Runtime state | Clear when starting an actual new campaign; never duplicate salvage |

**Current defect risk:** `main.js:startNewTacticalRunFlow()` calls `clearSaveData()`, which removes **every** `hb_*` key in `src/profile.js`, including profile, local achievements, fabricator, bank and local ownership-related records. Keeping a JavaScript object in memory does not make that account data durable after the next restart. Split targeted `startNewCampaign()` / `startNewAttempt()` / `resetAllSaveData()` operations, support migrations, and test the full process-restart flow; retain the existing full-wipe functionality only behind explicit destructive confirmation. Do not conflate `CONTINUE`'s interrupted-run salvage with full restoration of the expedition world.

**Campaign rule proposed from playthrough:** one campaign tracks failed attempts, losses and elapsed days until a victory; death/retry alone does not erase ongoing story. A player-selected NEW GAME starts fresh campaign story points and attempt counters, while career, discoveries and earned inventory persist. Verify edge cases around victory, cloud conflicts, seeded Daily Ops and multiple profile identities before implementing any migration.

## Archives, achievements and unlocks

Build on the existing `main.js:buildArchiveModal()`, `openArchiveLogDetail()`, `src/storyArchive.js`, and `src/achievements.js` instead of inventing duplicate progression stores. A coherent **Records** entry from Homebase and relevant in-game navigation should expose Lore/Archives, Dossier, Endings and Achievements/Unlocks (tabs or meaningful contextual links). The player should be able to view discovery progress, requirements, source, actual earned state and granted equipment; an undiscovered entry can use a spoiler-safe locked card. Make the detail pane and list scroll independently **only where necessary**, retain focus on return, and eliminate overlapping/clipped text at 1280×800, desktop and all seven locales. Opening a view must not silently grant an achievement.

## Fab Bay: verified catalog and save correctness

`src/fabricator.js:FAB_RECIPES` at this baseline defines **13 recipe IDs: six weapons, two charms and five modules**. That is a verified source count, **not** proof all 13 can be earned, printed, owned, equipped and rendered in the player's current mode. Check every card against its output, catalog type, Steam/earned entitlement and sprite/GLB. The Foundry flag and bank values already reside in `src/bank.js`, while prints/fabricated entries reside in `hb_fabricator_v1`; the gap is coherent lifecycle, not merely calling `save()` again. Supply a QA-only demo/season toggle and resource grant that are disabled in a retail build and cannot mint real Steam inventory. Reopen the game mid-print and after death, verify exact resource balance and no second issuance. Decide separately whether NEW GAME keeps foundry activation/recipe progress, since the report explicitly requires **between-run and save** persistence but does not settle all new-campaign resets.

## Hero selection, Armory and 3D calibration

**Homebase/hero selection:** keep the prior valid model or a deliberate loading state until the new rig plus idle animation is ready; stale asynchronous generations cannot overwrite a newer class. Use `src/scoutHeroPreview.js` and `src/armoryScene.js:loadOperatorModel()` as investigation starts, record cold/warm asset load times and memory, and respect the real-rig gate in `docs/planning/armory-character-rig-readiness-2026-09-22.md`. Homebase presents **class/frame and abilities**. Weapons, overclocks, finishes and operator cosmetics belong in the Armory.

**Armory layout:** the provided screenshot has visibly compressed overclock deployment-status text. Instead of shrinking every label to fit, show a readable full effect/benefit/cost and expand the Live Stage Preview to one coherent readout of class, weapon, attachment/finish, charm, two wearable overclocks, operator polish, chassis, patch, HUD and voice as appropriate. Operator Polish selection belongs in the **Operator Exosuit Rig** right-hand controls, not the Live Stage Preview. Preserve a separately actionable deploy control and a reachable back action.

**Attachments:** `src/charmSockets.js` already defines per-archetype mounts, and `src/operatorEquipmentSockets.js` mounts body items to bones, but code-backed placement does not disprove the player's reported occlusions. Calibrate per-rig/per-item offsets, rotation, scale and tested idle poses; do not alter hitboxes. For each weapon archetype make a designed hanging cord/loop from a safe visible gun anchor, with charm attached to its free end, consistent spring/idle movement and item-specific size/orientation; avoid sights, barrel, hand, player body and HUD. Include Scout, Tank, Engineer, weapon finish variants, local gameplay and remote co-op appearance.

## Deployment and Black Box

Solo briefing should answer: *Which campaign is this, how many attempts/deaths/days so far, what story decision or next mission matters, what do I own/carry, what Black Box is active, and what am I currently tracking?* Distinguish career counters from campaign counters and mode-limited leaderboards. Display tracked Daily Ops and Seasonal objectives for Solo and Co-op where applicable, but explicitly mark personal vs squad progress and eligibility. `src/multiplayerLobby.js` already has a Daily Ops card, six-row goals rendering and solo launch path—expand rather than replace.

`src/blackBox.js:recordDeath()` **already implements one active record at a time**: a second death overwrites active salvage while retaining a historical archive, and the unit test asserts that behavior. Treat the request as an **integration/visual regression**: remove the old marker in-world before spawning the new box; the old location must not remain interactable and its salvage must be irretrievable, even across checkpoint recovery, crashes or rapid deaths. A historical record must never count as active recoverable currency.

## Steam Deck and co-op release acceptance

`docs/menu-input-navigation-contract.md` already specifies arrows/WASD/D-pad/left-stick focus, Enter/A confirmation, Esc/B back and LB/RB tabs, and `src/inputActions.js` has a focus-root registry. The reported bug means the real route needs new E2E focus-graph probes and **physical Deck controller-only verification**, including Archive/Fab Bay/Armory/Deployment and text input. Automated focus success alone is not store certification. Cross-reference [#53](https://github.com/grounded-play/hunker-bunker/issues/53) and [#45](https://github.com/grounded-play/hunker-bunker/issues/45).

Co-op has code paths for lobby, ready-up, relay deploy, remote appearance and reconnect; older logs partially proved a two-client co-op session on older builds but did not complete the current release route. Do not state a root cause from “Co-op is broken?” alone. Use matched current **packaged host and guest** captures: Steam login → create/join → ready/deploy → shared spawn/combat/objective → reconnect or host migration if supported → extraction/results → clean second session. Reproduce whether the problem is authentication, relay, room discovery, deploy, world sync, spawn, input, stale session or results before implementing changes.

## Sprint 43 implementation order and gates

1. **Evidence intake immediately:** obtain fresh capture(s), screenshot/build metadata and route notes; run `npm run logs:analyze -- <file1> <file2>`, deduplicate uploads from the same session, distinguish missing instrumentation from an absent user-visible event, and note owner/guest roles. No token, private session data or 40–70 MB raw log blobs in Git.
2. **Stabilize P0 saves and packaged critical paths:** targeted persistence migrations, controller reachability and diagnosed co-op block. Hold `PRODUCT_STATE.md` and public Steam feature claims to observed evidence.
3. **Integrate Fab Bay, Archives and UI correctness:** retain existing ownership and achievement owners; keep visual and gameplay equipment sources aligned; repair Hero/Armory layout and transitions; polish mode-appropriate deployment ledger and Black Box marker behavior.
4. **Automated tests:** `npm test`, `npm run lint`, `npm run presubmit`, `npm run i18n:audit`; focused Vitest tests for persistence/migration/Black Box/recipe catalog/charm calibration/lobby; Playwright `menu-reachability`, Armory and deployment cases at 1280×800 and 1920×1080. Record counts from actual runs rather than borrowing Sprint 41 totals.
5. **Human/demo sign-off:** captured 30+ rapid class swaps, every listed cosmetic mount in motion, legible seven-locale focus path, genuine physical Deck controller-only completion, and a paired real-Steam-account full expedition. Save/Cloud A→B→A conflict requires independent proof. Keep #45 gates open until matching reports exist.

## Implementation and verification status (2026-09-22)

- **S43-01 (Persistence contract):** Implemented `startNewCampaign(storage)` in `src/profile.js` and wired it into `main.js:startNewTacticalRunFlow()`. New Game clears campaign narrative linchpins, story checkpoints, and active run state while strictly preserving lifetime career profile, Dossier progress, inventory ownership, unlocked achievements, and bank salvage. Full destructive reset is preserved exclusively in Settings behind explicit confirmation.
- **S43-03 (Fab Bay catalog & Foundry activation):** Verified exactly 13 recipes in `src/fabricator.js:FAB_RECIPES` (6 weapons, 2 charms, 5 modules). Added `setFoundryActivated()` and `grantDebugSalvage()` to `src/bank.js`, and wired them into Armory QA debug controls.
- **S43-04 (Hero Select UI & class switching):**
  - Eliminated dead space in `#menu` Hero Select: enlarged 3D pedestal to `min(88cqw, 88cqh, 28vu)` and expanded `#char-preview-3d` to 480×480.
  - Enriched character cards with `.char-header-row`, `.char-role-badge` (`INFILTRATOR`, `BREACHER`, `LOGISTICS`), `.char-desc-tag` (`ACTIVE:`, `PASSIVE:`), and `.char-spec-pills` (`MOBILITY: MAX`, `ARMOR: LIGHT`, `DEFENSE: MAX`, etc.).
  - Replaced field armament description with chassis specification: `CHASSIS SPECIFICATION // <FRAME_NAME> · <ARMOR_SPEC>`.
  - Refactored `syncHeroPreview()` to hot-swap 3D models seamlessly without flashing the 2D fallback sprite when 3D is active.
- **S43-05 (Armory UI & socket calibration):**
  - Expanded Live Stage Preview into a comprehensive fitted loadout summary (Weapon, Finish/Sheen, Charm, Bay A, Bay B, Chassis).
  - Relocated Operator Polish selection out of the stage preview and into the `OPERATOR EXOSUIT RIG` right-hand controls.
  - Calibrated equipment socket positions and scales in `src/operatorEquipmentSockets.js` and `src/charmSockets.js`.
  - Authored a dynamic tactile cord loop mesh (`charmTactileCord`) attaching gun charms physically to weapon anchors.
- **S43-06 (Black Box loss behavior):**
  - Added `this.clearBlackBoxMarker?.()` immediately prior to `recordDeath()` in `src/threeGame.js`, ensuring prior in-world corpse markers and interaction prompts despawn cleanly when dying with an unrecovered box.
- **Localization coverage:**
  - Added all required translations (`chassis_spec`, roles, tags, spec pills) across all 7 locales (`en`, `es-419`, `de`, `ja`, `pt-BR`, `ru`, `zh-CN`).
  - Passed `npm run i18n:audit`: 0 unannotated markup, 0 unlocalized runtime strings reaching DOM, 0 orphan key regressions.
- **Test suite verification:**
  - `npm run lint`: 0 errors, 0 warnings.
  - `npm test`: 403 test files passed (3660 tests passed).

