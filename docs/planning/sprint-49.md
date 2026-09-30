# Sprint 49 — Finish the Features, Improve the Expedition, Prove the Build

Status: active plan | Owner: repository maintainers | Updated: 2026-09-30 | Review: every completed ticket and release candidate

Baseline branch: `dev/sprint-48`
Baseline version: `2.4.13-beta`
Source commit: `379f87e1`. Sprint 49 planning is recorded on the existing branch;
this document does not imply that a new branch, release, or Steam upload exists.

## Product direction

Deliver the features the owner wants: online co-op and PvP, discoverable developer
commentary, Steam Wallet purchases, full controller operation, accessible mature
story content, and **real filtered player text chat**. The response to build
25475189 is to finish and demonstrate them. Hold resubmission until the required
features pass; removing chat or downgrading the desired feature set is not this
sprint's solution.

Make the expedition better at the same time: complete usable camp crafting,
make cooperative communication work from a controller, improve combat choices
and navigation, and make the world, HUD, sound, and consequences readable.
Feature count is useful only when a player can discover and use those features.

## Evidence and how to use this TODO

- Documentation and Steam review audit (`docs/reports/documentation-audit-2026-09-30.md`, not yet committed)
  records the seven failures, contradictions, and review boundaries.
- Full documentation inventory (`docs/reports/documentation-audit-inventory-2026-09-30.json`, not yet committed)
  records every scanned document, its lifecycle classification, markers, and links.
- [Product State](../../PRODUCT_STATE.md) records implementation truth.
- [Previous review remediation](steam-review-build-25475189-fix-plan-2026-09-30.md)
  contains the earlier access fixes; its removal-only chat direction is superseded.
- [Economy proposal](economy-master-plan-2026-09-30.md) supplies design input;
  prices, pity rates, regional policy, premium passes, and revenue estimates in it
  are proposals, not approved/live behavior.

Each unchecked ticket requires work or fresh acceptance. Existing tests and files
are starting points, not a statement that this audit reran every test. Paths marked
**new** are proposed outputs and are deliberately not broken Markdown links.
Preserve these IDs when splitting tickets into issues. Close a ticket only with
commit, command/result, build ID where relevant, and evidence link. Roles below are
ownership slots, not assignments to unavailable people. Size S/M/L is relative
scope, not a delivery estimate.

The previous [completed feature list](sprint-49-feature-backlog-and-todo.md) and
[implementation sketch](sprint-49-game-plan.md) are historical inputs. Their checked
boxes do not override the integration gaps or acceptance gates here.

## Execution order and capacity

1. **P0 — review features and release blockers:** S49-01 through S49-12.
   Chat is implementation work; several other features need repairs plus installed
   build evidence. These outcomes gate resubmission.
2. **P1 — finish and improve the game:** S49-13 through S49-33. Start the camp
   workbench, controller pings, and co-op consistency next; then first-hour,
   readability, combat, saves, and performance. Failures that lose saves/items,
   block controls, or break the expedition immediately become P0.
3. **P2 — expansion queue:** S49-34 through S49-38. Defined next work, not a promise
   to fit all expansion into one sprint. Carry unstarted items forward by ID.

Parallel ownership: client/UI owns chat and controls; backend/platform owns chat
validation, purchases and reconciliation; gameplay owns expedition integrations;
art/audio owns readability and mix; QA/publisher owns paired accounts, physical
hardware and Steamworks evidence. Serialize edits to `main.js`, `threeGame.js`,
locale files and the inventory schema.

Dependency spine: S49-02 → 03 → 04; S49-07 → 08 → 09; S49-04/05/06/09/10/11 → 12.
S49-13/14/15 unblock meaningful cooperative first-hour testing (17). S49-23 is a
commerce readiness gate; proposed random-reward changes (24) need product approval.

## P0 — complete the Steam review features

### S49-01 — one current backlog and reliable documentation checks

- [ ] **Owner: maintainers · Size: M · Type: documentation/tooling.** Reconcile the
  stale Sprint 30/45/48 indexes, label the old Sprint 49 plans historical, inventory
  all documentation, repair current portable links, and remove hard-coded sprint
  assertions from the documentation checker.
  **Files:** [audit-docs.js](../../scripts/audit-docs.js), [docs index](../README.md),
  [planning index](README.md), [documentation system](../documentation-system.md).
  **Accept:** `npm run audit:docs` passes; exactly one active sprint exists;
  inventory separates historical warnings from current errors; every task here
  has source links and a verifiable outcome.

### S49-02 — real lobby and in-game text chat

- [ ] **Owner: backend + client · Size: L · Type: missing feature.** Implement an
  authenticated, room-scoped chat channel through the existing relay. Server assigns
  sender identity and message IDs; enforce room membership, bounded Unicode text,
  rate limits, deduplication and disconnect/room-change cleanup. Support both co-op
  and PvP; specify lobby versus match visibility explicitly. System messages and
  tactical pings remain distinct from player-authored messages.
  **Files:** [relay.js](../../server/relay.js), [multiplayer lobby](../../src/multiplayerLobby.js),
  [client entry](../../main.js), [game runtime](../../src/threeGame.js).
  **New:** `src/playerChat.js`, `server/chatPolicy.js`, paired chat relay tests.
  **Accept:** two clients exchange messages in lobby and in a deployed match;
  a third room receives none; forged senders, oversized/spam payloads, duplicate
  reconnect delivery and HTML/script strings cannot impersonate or execute.

### S49-03 — multilingual filtering with explicit failure handling

- [ ] **Owner: platform + localization + backend · Size: L · Depends: 02.** Define
  and implement filtering for English, German, Latin American Spanish, Japanese,
  Brazilian Portuguese, Russian and Simplified Chinese. Cover curse words,
  swearing and sexual terms as described in the review. Audit native-binding
  feasibility before promising Steam filtering; the installed binding exposes no
  matching filter surface. A maintained baseline filter and recipient display
  filtering must account for language switching, Unicode normalization, mixed
  scripts, false positives, player names, and unavailable dictionaries.
  **Files:** [Electron main](../../electron/main.cjs), [preload](../../electron/preload.cjs),
  [locale contract](../../src/i18n.js); new policy from 02.
  **Accept:** reviewed per-language fixtures cover benign text and prohibited terms;
  user filter preferences cannot silently bypass the mandatory baseline; unavailable
  filtering fails visibly and safely instead of silently displaying unfiltered text.
  Document limitations rather than claiming perfect moderation.

Steam's initialization can fail and its filter can pass text through; preferences
also influence filtering. Treat native filtering as one layer, not proof that the
survey's promise is met. [Steam text-filter API](https://partner.steamgames.com/doc/api/ISteamUtils#InitFilterText).

### S49-04 — usable chat, mute/report and controller text entry

- [ ] **Owner: UI + platform + localization · Size: L · Depends: 02–03.** Add a
  visible chat control in the lobby and field, unread indication, bounded scrollback,
  timestamps/sender labels, send/cancel, mute/block/report, and notification settings.
  Use plain text rendering and avoid storing raw conversations in routine telemetry.
  Specify moderation ownership and report retention. Controller opens the composer,
  enters text using Steam keyboard or the existing fallback, scrolls, sends, and
  restores focus. IME composition/Enter must not send early or fire gameplay actions.
  **Files:** [markup](../../index.html), [main](../../main.js),
  [input actions](../../src/inputActions.js), [styles](../../style.css),
  [controller focus tests](../../tests/e2e/controller-focus.spec.js).
  **Accept:** all seven locales, Deck and PC controller, keyboard, reconnect, mute,
  report and room changes pass; text remains legible and does not obscure urgent
  combat information. Preset quick messages complement free text.

### S49-05 — demonstrable online co-op and PvP

- [ ] **Owner: networking + QA/publisher · Size: L · Type: integration/acceptance.**
  Keep the new MULTIPLAYER entry; give hosting/joining, ready state, connection
  failure, reconnect and mode rules clear feedback. Run both modes with two actual
  Steam accounts against the candidate backend/build, including host/guest role
  reversal, invites, lobby listing, combat, death, redeploy and match completion.
  **Files:** [multiplayer lobby](../../src/multiplayerLobby.js),
  [Steam lobby bridge](../../electron/steam-lobby.cjs), [relay](../../server/relay.js),
  [PvP authority tests](../../server/relayPvPAuthority.test.js),
  [review entrypoint probe](../../tests/e2e/probes/steam-review-2026-09.spec.js).
  **Accept:** paired logs and recording show both players in each mode with consistent
  objectives/results; no stalled host transition or duplicate rewards. Describe
  support as **Online**, not LAN. Document cross-region discovery limitations.

### S49-06 — developer commentary that is discoverable and worth reading

- [ ] **Owner: narrative + UI + QA · Size: M · Type: existing feature acceptance.**
  Verify instant feedback when enabling commentary, menu/run context cards and
  READ ALL in the installed build. Edit the existing entries for concrete development
  insight; ensure controller scrolling, text scaling, locale treatment and saved
  toggle behavior. Distinguish developer commentary from AURA/radio fiction.
  **Files:** [commentary implementation](../../main.js),
  [review browser probe](../../tests/e2e/probes/steam-review-2026-09.spec.js).
  **Accept:** reviewer reaches a real commentary entry from Settings within one
  minute, reads every entry, and triggers an in-run example. No recorded-audio
  promise unless commentary audio is actually produced and connected.

### S49-07 — consistent products, quantities and Steam Wallet prices

- [ ] **Owner: economy + backend + UI · Size: M · Type: confirmed integration gap.**
  Make SKU data authoritative across server, Vault, schema and fallback. Reconcile
  server `keyCount` with UI `keys`, the stale 10-key fallback with the 15-key catalog,
  price/odds strings, and currency handling. The current MicroTxn path uses USD;
  implement a supported account-currency quote path and handle unsupported quotes
  explicitly. Do not invent localized prices or change prices during this audit.
  **Files:** [store server](../../server/steamStore.js),
  [Vault UI](../../src/steamVaultUi.js), [item schema](../../steam/inventory_schema_hunker_bunker.json),
  [hosted-store tests](../../src/steamVaultUi.hostedStore.test.js).
  **Accept:** 1/5/15-key labels and granted counts agree; displayed total/currency
  equals authorized checkout; stale/offline catalog cannot initiate a misleading
  purchase; hosted Item Store and MicroTxn paths are each exercised.

### S49-08 — settlement reconciliation that recovers and accounts for every order

- [ ] **Owner: backend · Size: L · Type: correctness gap.** Finish the current
  GetReport worker: durable cursor/checkpoints, time-boundary deduplication, all
  report batches, restart/outage recovery, pending-grant retry, unmatched-order
  alerts and actionable reversal handling. Distinguish finalized payment from
  delivered inventory; do not treat `finalized_pending_grant` as fulfilled.
  **Files:** [report worker](../../server/steamMicroTxnReport.js),
  [report CLI](../../server/scripts/microtxn-report.js),
  [store](../../server/steamStore.js), [backend bootstrap](../../server/index.js).
  **Accept:** fixtures cover more than one page, same-time boundaries, outage longer
  than 48 hours, duplicate reports, ungranted paid orders, refunds and chargebacks;
  retries cannot double-grant and unresolved orders make the report visibly unhealthy.

The current official API describes timestamp-based enumeration and warns that a
short response can still have more results. Reconciliation must follow that
contract. [GetReport reference](https://partner.steamgames.com/doc/webapi/ISteamMicroTxn#GetReport).

### S49-09 — real purchase, cancel, delivery and reversal evidence

- [ ] **Owner: publisher + backend QA · Size: M · Depends: 07–08, 23.** Confirm
  production configuration and schema publication on the candidate. A publisher
  performs the specifically requested non-sandbox MicroTxn test and a hosted-store
  purchase; record authorized test account, transaction IDs, grant outcome and
  GetReport response. Exercise cancellation, delayed authorization, retry and
  reversal recovery safely. Keep sensitive account/transaction evidence in a
  private submission attachment; repository records reference the evidence.
  **Files:** [review runbook](steam-review-build-25475189-fix-plan-2026-09-30.md),
  [report CLI](../../server/scripts/microtxn-report.js),
  [backend environment audit](../../server/backendEnvAudit.js).
  **Accept:** Valve-ready response and test-account evidence exist; both checkout
  routes deliver exactly once and cancellation does not grant. This planning task
  does not authorize a purchase, deployment, or production flag change.

### S49-10 — full controller journey including new features

- [ ] **Owner: platform + QA · Size: L · Depends: 04.** Extend the achievements
  scrolling fix into a complete focus/scroll/text-entry journey: title, character,
  Armory, Foundry, Vault purchases, settings, achievements, commentary, Content
  Guide, multiplayer, chat, gameplay, pause, results and quit. Test overlay return,
  action-set changes, cancellation and fallback keyboard without double presses.
  **Files:** [input actions](../../src/inputActions.js),
  [press gate](../../src/controllerPressGate.js), [main](../../main.js),
  [controller focus suite](../../tests/e2e/controller-focus.spec.js),
  [Steam manifest](../../steam/steam_input_manifest.vdf).
  **Accept:** no mouse/keyboard required on physical Deck, Xbox pad and PlayStation
  pad through Steam; last achievement is reachable and visible; chat/checkout
  cannot strand focus. Record tested hardware/build and remaining failures.

### S49-11 — mature story content and accurate reviewer access

- [ ] **Owner: narrative + publisher QA · Size: M · Type: existing feature acceptance.**
  Prove the Content Guide reader and natural Camp Tallow/Sister Val route show the
  same non-explicit sexual narrative; check other intimacy branches and relevant
  self-sacrifice endings/logs. Provide a reproducible save/authorized reviewer route
  where progression takes too long. Keep survey wording grounded in actual content.
  **Files:** [NPC dialogue](../../src/npcDialogueTrees.js),
  [content audit](../../src/matureContentAudit.js),
  [narrative guide](../narrative-endings-and-mature-content-guide.md),
  [review probe](../../tests/e2e/probes/steam-review-2026-09.spec.js).
  **Accept:** keyboard/controller can inspect the scenes and reach their in-game
  sources without mutating progression from the reader. Preserve the mature
  narrative; depicted nudity is not present and is not a new feature requirement.

### S49-12 — one reproducible Steam resubmission packet

- [ ] **Owner: publisher + QA · Size: M · Depends: 04–06, 09–11.** Assemble access
  instructions and proof for all seven review failures on one candidate BuildID.
  Include online variants, commentary route, both purchase paths/GetReport attachment,
  controller achievements route, mature-content route and filtered-chat instructions
  for two accounts and seven languages. Reconcile the packet with store claims,
  Content Survey, schema and the installed depot; rebuild/retest if code changes.
  **Files:** [review plan](steam-review-build-25475189-fix-plan-2026-09-30.md),
  [claim evidence](../../steam/claim-evidence.json),
  [claim checklist](../steam-store-feature-claim-checklist.md),
  [dashboard handoff](../steam-dashboard-handoff.md).
  **Accept:** every category has an exact route and evidence on the same BuildID;
  all P0 failures are closed before publisher resubmission. No guessed build IDs,
  fabricated purchase responses or browser-only hardware sign-off.

## P1 — make the whole game better

### S49-13 — finish the playable field workbench

- [ ] **Owner: gameplay + UI · Size: L · Type: partial feature.** Connect
  `open-field-workbench` to an actual camp crafting panel. Audit recipe affordability,
  spend semantics, real bank currencies, live ammo/health/shield fields, co-op
  authority and save behavior. Existing tests only prove an event/fake-object path.
  **Files:** [runtime](../../src/threeGame.js), [bank](../../src/bank.js),
  [Foundry hub](../../src/foundryHub.js),
  [current workbench tests](../../src/threeGame.fieldWorkbench.test.js), [main](../../main.js).
  **Accept:** walk to a real camp, open with controller, craft all supported recipes,
  observe correct resource debit and live effect, cancel and resume; failed/repeated
  requests cannot grant for free or spend twice. Include paired co-op proof.

### S49-14 — controller-accessible pings and cooperative quick commands

- [ ] **Owner: input + networking + UI · Size: M.** Finish semantic input/remapping
  for existing tactical pings and add localized quick commands (help, wait, follow,
  regroup, thanks). Use target context and recipient-localized keys rather than
  treating an English label as the network contract. Align commands with chat.
  **Files:** [ping runtime/tests](../../src/threeGame.tacticalPing.test.js),
  [input actions](../../src/inputActions.js), [main](../../main.js),
  [Steam manifest](../../steam/steam_input_manifest.vdf).
  **Accept:** keyboard/native Steam Input/browser controller all trigger one ping;
  partner sees correct target/type/expiry, locale and attribution; menus/chat typing
  do not trigger pings; burst spam cannot flood audio/HUD.

### S49-15 — co-op parity for events, companions and rewards

- [ ] **Owner: networking + gameplay · Size: L.** Exercise the recently added host
  authority through complete journeys, including Ring 1 choices, arrival/bounty
  encounters, recruited companions, camps, drops, death/redeploy and host loss.
  **Files:** [co-op companion tests](../../src/threeGame.coopCompanionSync.test.js),
  [world event tests](../../src/threeGame.coopWorldEventSync.test.js),
  [shared-world tests](../../src/threeGame.coopSharedWorld.test.js),
  [relay](../../server/relay.js), [transitions](../../src/coopTransitions.js).
  **Accept:** both peers see one resolved outcome, consistent companion/reward state
  and an explicit host-loss/rejoin result; replaying messages cannot double-award.
  Do not reimplement these systems solely because an older plan calls them absent.

### S49-16 — companions whose roles and settlement matter

- [ ] **Owner: gameplay + narrative · Size: M.** Validate distinct assist behavior,
  readable cooldown/target feedback, pathing across three real rooms and escort
  settlement. Retain recruited identity/dialogue after returning to camp and after
  save/load; explain what settlement gives the player.
  **Files:** [wanderers](../../src/wandererSystem.js),
  [assist tests](../../src/threeGame.companionAssist.test.js),
  [pathing probe](../../src/companionPathingProbe.test.js),
  [camp](../../src/camp.js).
  **Accept:** six archetypes have documented reachable behavior; no wall clipping,
  unexplained teleports, lost residents or double assists in a paired run.

### S49-17 — a coherent first hour and a satisfying second run

- [ ] **Owner: design + gameplay + independent playtesters · Size: L.** Tune the
  first crash, movement/combat teaching, banking, camp discovery, first upgrade,
  danger explanation and return loop using observed play. Keep tutorial skipping
  from deleting essential objective state; explain losses and next actions on death.
  **Files:** [first-hour script](../first-hour-acceptance-plan.md),
  [dialogue](../../src/dialogue.js), [objectives](../../src/objectiveRegistry.js),
  [death report](../../src/deathReport.js), [proof-run design](../design/game-outline-and-proof-run.md).
  **Accept:** three fresh players complete a recorded 35–45 minute route; at least
  two can explain objective, banking and lost/kept resources without coaching.
  Record interventions and fix every progression block, then repeat affected steps.

### S49-18 — combat with readable threats and distinct builds

- [ ] **Owner: combat design + gameplay · Size: L.** Tune enemy formation pressure,
  all five boss phase controllers, ammo availability, melee/dash tells and class
  strengths across the actual early/mid/late routes. Preserve counterplay and clear
  telegraphs; use telemetry to catch unavoidable overlap and damage spikes.
  **Files:** [boss phases](../../src/bossPhases.js),
  [encounter report](../../scripts/combat-encounter-report.js),
  [ammo economy](../../src/data/ammoEconomy.js), [game-feel design](../design/combat-feel-and-juice-plan.md).
  **Accept:** each boss has a demonstrated tell/response loop; Scout/Tank/Engineer
  produce distinct viable runs; seeded encounter reports and human captures agree
  on damage/counterplay; no unavoidable early ammo softlock.

### S49-19 — finish or clearly label the remaining inert drop effects

- [ ] **Owner: gameplay + content · Size: M.** Implement and connect
  `tesla_thrusters`, `pheromone_aura`, and `synapse_pulse`, or keep them outside
  earnable/claimable pools until connected. Audit each effect's description,
  actual consumer, upgrade stacking and multiplayer behavior.
  **Files:** [drop catalog](../../src/runDrops.js), [runtime](../../src/threeGame.js),
  [relic matrix](../reports/relic-behavior-matrix-2026-09-09.md).
  **Accept:** every obtainable effect has an observable gameplay delta and tests
  using real state fields; all three named gaps have an explicit disposition.

### S49-20 — world variety that preserves navigation and purpose

- [ ] **Owner: world design + gameplay · Size: L.** Use the existing seed portfolio
  to tune room scale, corridor rhythm, camp/hive identity, reward placement and
  pressure/relief. Check progression reachability after world transformations,
  destroyed walls and save/load; maintain reliable return paths.
  **Files:** [world seed audit](../../scripts/world-seed-portfolio-report.js),
  [navigation audit](../../scripts/playtest-navigation-report.js),
  [objective packages](../../src/objectivePackages.js),
  [set-piece plan](authored-setpieces-crash-site-and-run-building-plan-2026-09-12.md).
  **Accept:** run the existing configured sweep, archive failing seeds, fix all
  unreachable mandatory objectives, and play at least three visibly different
  routes with distinguishable landmarks and meaningful choices.

### S49-21 — legible narrative consequences and useful debriefs

- [ ] **Owner: narrative + gameplay + UI · Size: M.** Verify communion, infection
  causes, faction/ending locks and timeline warnings in real play. Connect the
  expanded expedition report to unlocked blueprints, reputation and next leads;
  record before/after state instead of vague success prose.
  **Files:** [story linchpins](../../src/storyLinchpins.js),
  [Act 2](../../src/act2.js), [expedition report](../../src/expeditionReport.js),
  [infection tests](../../src/threeGame.infectionDamage.test.js),
  [ending design](../design/arching-storyline-and-endings.md).
  **Accept:** one human, hive and mixed consequence route explains why choices
  changed an ending; debrief matches actual state, survives reload and appears to
  both peers where the story is shared.

### S49-22 — one understandable Foundry and inventory journey

- [ ] **Owner: UI + economy · Size: M.** Refine the existing Stash/Loadout/Fabricate/
  Trade-up/Store flow with consistent item cards, ownership/equipped/locked states,
  cost previews, disabled reasons, empty/error states and focus restoration. Preserve
  the distinction between banked salvage, carried loot and Steam-owned cosmetics.
  **Files:** [Foundry hub](../../src/foundryHub.js), [Armory](../../src/armoryUi.js),
  [Vault](../../src/steamVaultUi.js), [ownership](../../src/itemOwnership.js).
  **Accept:** a player can acquire, inspect, equip, see the deployed cosmetic, trade
  up and return to play using a controller without losing selection or confusing
  earned power with purchases.

### S49-23 — enforce earned power and trusted ownership

- [ ] **Owner: economy + backend · Size: M · Commerce readiness gate.** Trace every
  priced, marketable and paid-cache item to active modifiers, earned attunement and
  ownership validation. Reconcile the economy proposal's blanket charm warning
  against the existing earned-perk split before prescribing another redesign.
  **Files:** [equipment definitions](../../src/data/equipmentDefinitions.js),
  [ownership](../../src/itemOwnership.js), [loot tables](../../server/lootTables.js),
  [equipment policy](equipment-effects-and-visual-sockets-plan-2026-09-21.md).
  **Accept:** buying/transferring a cosmetic alone never grants an unearned combat
  advantage in solo, co-op or PvP; tests trace the real grant/equip pipeline and
  forged/local inventory cannot unlock backend-owned value.

### S49-24 — a trustworthy, understandable reward economy

- [ ] **Owner: product + economy · Size: L · Design decision required.** Measure free
  earning cadence, duplicate value and cache outcomes; propose cosmetic guarantees,
  direct-purchase alternatives, pity and seasonal timing with explicit tradeoffs.
  Publish one current odds source across UI/server/schema. Validate applicable
  platform/region requirements with the publisher before changing paid randomness.
  **Files:** [economy proposal](economy-master-plan-2026-09-30.md),
  [loot tables](../../server/lootTables.js), [odds disclosure](../steam-lootbox-odds-disclosure.md),
  [season config](../../src/data/seasonOneConfig.js).
  **Accept:** approved design and measurable free-player progression, matching odds
  at every purchase/opening surface, explicit duplicate treatment and no silent
  conversion of free-beta rewards into paid entitlements.

### S49-25 — readable HUD and calm information priorities

- [ ] **Owner: UI + art + accessibility QA · Size: M.** Audit the actual default
  dock at 1280×800; correct cramped labels, contrast, overlaps and interruptions.
  Verify health/O₂/ammo, objective, chat, pings, subtitles and danger priority together.
  Retain useful wear/portraits only where they preserve essential readability.
  **Files:** [HUD recovery plan](hud-overlay-review-and-recovery-plan-2026-09-28.md),
  [HUD information architecture](../../src/hudInformationArchitecture.js),
  [dock styles](../../src/styles/expeditionHud.css), [layout tests](../../tests/e2e/hud-layout.spec.js).
  **Accept:** physical Deck and desktop captures at all offered text/HUD scales
  show no essential clipping/overlap, visible controller focus and readable live
  values; state the real default (`dock`) consistently in documentation.

### S49-26 — camera and lighting that reveal the world

- [ ] **Owner: rendering + art · Size: L.** Address the measured concept/build gap:
  camera framing, wall occlusion, excessive foreground blur, dark landmarks, practical
  light sources and surface readability. Tune coherent presets using the same scene
  and viewpoint rather than treating every screenshot as a new art direction.
  **Files:** [visual comparison](gameplay-vs-theory-comparison-and-plan.md),
  [renderer/game](../../src/threeGame.js), [art bible](../design/art-style-bible.md).
  **Accept:** matched before/after captures on Deck and desktop reveal navigation,
  threats and environmental storytelling; silhouette/colorblind readability and
  performance budgets survive the changes.

### S49-27 — audio clarity, character presence and subtitle parity

- [ ] **Owner: audio + narrative + UI · Size: M.** Mix weapons, hazards, footsteps,
  machinery, music and radio so vital signals remain audible. Review repetition,
  interruption/ducking, companion lines and speaker portraits. Keep subtitles tied
  to actual voice playback, skip and pause behavior.
  **Files:** [audio runtime](../../src/audio.js), [line director](../../src/lineDirector.js),
  [voice plan](../voice-cast-prompts-and-game-integration-2026-08-25.md),
  [SFX manifest](../sfx-design-manifest.md).
  **Accept:** combat-plus-radio stress capture has no buried warning, duplicated
  line or stale caption; separate buses and voice-off remain usable; captions
  identify speakers and critical non-speech cues where supported.

### S49-28 — accessible comfort and difficulty choices

- [ ] **Owner: accessibility + gameplay · Size: M.** Validate existing shake,
  pressure, assist, contrast, colorblind, text and subtitle settings end to end.
  Audit flashing/motion-heavy surfaces for a consistent reduced-effects option;
  assess hold/toggle and controller deadzones using player tests. Keep assist
  settings visible and explain ranked-run implications.
  **Files:** [accessibility settings](../../src/accessibilitySettings.js),
  [accessibility tests](../../src/threeGame.accessibility.test.js),
  [settings audit](../settings-menu-audit-2026-08-27.md), [markup](../../index.html).
  **Accept:** changes apply immediately and persist; no color-only critical signal,
  forced shake at zero, unreadable subtitle or control trapped by an accessibility
  setting. Desktop/Deck are targets; mobile support is not reintroduced.

### S49-29 — seven languages that work beyond key parity

- [ ] **Owner: localization + UI + native-language reviewers · Size: L.** Re-audit
  recent dynamic strings, controller prompts, chat, store quantities/currencies,
  companions and debriefs. Use human review for meaning and filter false positives;
  verify font coverage, wrapping, IME and locale switching during a run.
  **Files:** [locales](../../src/locales/), [i18n audit](../../scripts/audit-i18n.js),
  [catalog](../../src/i18nCatalog.js).
  **Accept:** `npm run i18n:audit` does not regress, all seven locale routes remain
  readable, no untranslated critical action remains, and native-review gaps are
  explicitly recorded rather than equating translated keys with language quality.

### S49-30 — saves, Steam Cloud and suspend that players can trust

- [ ] **Owner: persistence + platform QA · Size: L.** Exercise corruption recovery,
  atomic suspend, restore after crash, Deck sleep/wake, offline continuation and
  two-machine Cloud conflicts. Include new companion/crafting states and preserve
  co-op versus solo ownership rules.
  **Files:** [suspend](../../src/expeditionSuspend.js),
  [Electron save contract](../../electron/save-contract.cjs),
  [Cloud bridge](../../src/steamCloudSaveBridge.js), [Cloud contract](../steam-cloud-save-contract.md).
  **Accept:** packaged two-machine captures show recovery and clear conflict choices
  with no lost banked progression, duplicated rewards or overwriting solo progress
  from a multiplayer session.

### S49-31 — measured frame pacing, loading and memory

- [ ] **Owner: engine + performance QA · Size: L.** Measure the queued chunk mount
  path, instanced pools, combat, camp transitions, video playback and repeated
  deploy/retry on real Deck and a stated desktop baseline. Capture CPU/GPU frame
  time, p95/p99, longest stalls, memory/GPU growth and load duration.
  **Files:** [runtime](../../src/threeGame.js),
  [quality-restoration report](../reports/perf-quality-restore-2026-09-25.md),
  [media audit](../../scripts/audit-build-media.js), [retail audit](../../scripts/audit-retail-assets.js).
  **Accept:** commit a reproducible scene/device/settings baseline and agreed target
  before tuning; proposed Deck target is stable 30 fps (33.3 ms frame budget),
  desktop 60 fps on named hardware, no ≥500 ms gameplay stall and no monotonic
  resource leak over ten deploy/retry cycles. Preserve visual quality and report
  measured tradeoffs, not just a headless logic-time improvement.

### S49-32 — reliable services and player-facing failure recovery

- [ ] **Owner: backend + operations · Size: M.** Exercise auth expiry, relay outage,
  inventory timeout, database backup/restore and worker restart. Add actionable
  health/settlement alerts and localized retry states; review spoofing/replay at
  room, purchase and reward boundaries. Specify chat/report retention and redact
  credentials and message content from ordinary logs.
  **Files:** [server entry](../../server/index.js), [relay](../../server/relay.js),
  [backend admin runbook](../steam-backend-admin-runbook.md),
  [deployment topology](../architecture/deployment-topology.md).
  **Accept:** repeatable fault drill restores service and inventory without granting
  twice or losing progress; status explains what the player can safely retry;
  operational ownership and rollback steps are documented.

### S49-33 — test actual player journeys and packaged outputs

- [ ] **Owner: QA + maintainers · Size: M.** Add integration coverage at the seams
  found here: workbench event → panel → debit → effect, ping input → peer marker,
  chat input → filter → recipient, purchase → grant → reconciliation. Maintain a
  clean/no-HMR browser route and package smoke for both supported platforms.
  **Files:** [E2E helpers](../../tests/e2e/helpers.js),
  [Playwright config](../../playwright.config.js), [package scripts](../../package.json),
  [Steam depot audit](../../scripts/audit-steam-depot.js).
  **Accept:** tests fail when a consumer is disconnected, not only when a mock event
  changes; CI artifacts show build/version, locale, seed and failures; a passing
  unit count is never substituted for full player or hardware acceptance.

## P2 — feature expansion after the foundations work

### S49-34 — deeper expedition choices and replayable contracts

- [ ] **Owner: game design + gameplay · Size: L.** Expand the existing event/relic/
  contract framework with meaningful alternative routes, mixed-risk rewards,
  synergistic build choices and repeat suppression. Start with a small authored
  set and tune it before increasing the catalog.
  **Files:** [objective packages](../../src/objectivePackages.js),
  [drop catalog](../../src/runDrops.js), [design pillars](../design/one-more-ring-design-pillars.md).
  **Accept:** three successive seeded runs produce distinct decisions and viable
  builds, with no progression softlock and understandable reward consequences.

### S49-35 — a stronger social loop

- [ ] **Owner: multiplayer product + UI · Size: L · Depends: 02–05, 14–15.** Design
  party continuity, ready/rejoin clarity, shared contract selection and post-run
  regroup/rematch around the existing lobbies. Evaluate friend presence and recent
  teammates without inventing a second identity system. Voice chat is a separately
  scoped future proposal; filtered text chat is the current review requirement.
  **Files:** [multiplayer lobby](../../src/multiplayerLobby.js),
  [Steam lobby](../../electron/steam-lobby.cjs), [game outline](../design/game-outline-and-proof-run.md).
  **Accept:** the same two people finish two consecutive sessions without manually
  rebuilding the party; failure/rejoin expectations and controller paths are clear.

### S49-36 — fair seasonal progression and direct cosmetic collections

- [ ] **Owner: product + economy · Size: L · Depends: 07–09, 23–24.** Propose the next
  season's earnable collection, free progression and direct-purchase cosmetics.
  Keep premium-track pricing/retirement an explicit product decision; verify
  ownership, entitlements, restore and time-zone/season rollover behavior first.
  **Files:** [season config](../../src/data/seasonOneConfig.js),
  [season pass](../../src/seasonPass.js), [economy plan](economy-master-plan-2026-09-30.md).
  **Accept:** documented reward sources and rollover rules, no paid power, no loss of
  previously promised rewards, and predictable progress for a non-paying player.

### S49-37 — art and content completeness through in-game inspection

- [ ] **Owner: art + narrative + audio · Size: L.** Review new achievement cosmetics,
  enemy meshes, rigged operators, room dressing and ending sequences in their actual
  gameplay contexts. Prioritize missing identity/readability over another bulk asset
  batch. Check animation, sockets, scale, camera framing and loading budgets.
  **Files:** [3D asset backlog](../3d-asset-master-backlog-and-prompts.md),
  [armory gap report](../reports/armory-asset-gaps.md),
  [asset provenance](../ASSET_PROVENANCE.md), [retail audit](../../scripts/audit-retail-assets.js).
  **Accept:** every selected asset has an in-game capture, correct equipped/remote
  appearance and budget/provenance evidence; placeholder/fallback status is visible
  in the catalog rather than inferred from a file existing.

### S49-38 — reduce integration debt at the seams being changed

- [ ] **Owner: maintainers · Size: L.** Extract chat, commentary, field crafting and
  purchase presentation into bounded modules with explicit lifecycle ownership;
  prevent new additions from further entangling the large entry/runtime/style files.
  Retire stale flags only after their off-path and recovery behavior are understood.
  **Files:** [main](../../main.js), [game](../../src/threeGame.js), [styles](../../style.css),
  [system map](../architecture/system-map.md), [documentation system](../documentation-system.md).
  **Accept:** characterized behavior and journey tests pass; listeners/resources
  clean up on teardown; current subsystem docs point to actual owners/modules.

## Owner asks carried from Sprint 48 (Claude, 2026-09-30)

The owner deferred these to Sprint 49 on 2026-09-30. Each points at the ticket that
carries it; none is done until that ticket's acceptance is met.

**In-app purchases (owner: in-app purchases stay, through both the Steam Item Store and
Microtransactions).**

- [ ] **Publisher, Steamworks:** confirm the Item Store is enabled with 4001 / 4005 /
  4015 published, and that the app is enabled for the Microtransactions API. →
  S49-07, S49-09.
- [ ] **Owner go-ahead, then deploy:** set `HB_STEAM_STORE_ENABLED=1`,
  `HB_STEAM_MICROTXN_ENABLED=1` and `HB_STEAM_ITEM_STORE_ENABLED=1` in
  `~/server/backend.env`, then redeploy the backend. Real money moves after this, so it
  waits for an explicit go. → S49-09.
- [ ] **Publisher:** one real-account key purchase through each route, then
  `docker exec hunker-bunker-backend node server/scripts/microtxn-report.js --since <time>`.
  Send Valve the output plus the test account name (privately). → S49-08, S49-09.

**Economy decisions ([economy master plan](economy-master-plan-2026-09-30.md) §10).**

- [ ] Charms 4130–4139 carry combat stats and are marketable: split into a tradeable
  cosmetic plus an earned perk, or make them non-marketable (plan P1). → S49-23.
- [ ] The $1 cache yields 55% common fragments: approve cosmetic-only caches with pity
  every 10 openings (P2). → S49-24.
- [ ] One price per key. The Vault says $0.99 / $3.99 / $9.99; the schema says
  `VLV100` / `VLV400` / `VLV1000` (P3). → S49-07.
- [ ] Revoke on refund or chargeback (P5) and trade holds on new items (P6). →
  S49-08, S49-23.
- [ ] Set the market publisher fee, the key, pack and Season Pass prices, and the
  random-item policy for Belgium. → S49-24, S49-36.

**Visuals ([concept vs build review](gameplay-vs-theory-comparison-and-plan.md#2026-09-30-review-what-still-separates-the-build-from-the-concept)).**

- [ ] Decision 12: make isometric the default gameplay camera (third-person stays in
  settings). → S49-26.
- [ ] No tilt-shift blur in gameplay; world-space darkness in place of the
  screen-space vignette; character rim light. → S49-26.

**Hardware and review.**

- [ ] Two real accounts on the uploaded candidate: co-op and PvP, via Title →
  MULTIPLAYER. → S49-05.
- [ ] Controller-only pass on the Deck and a PC pad with the keyboard unplugged,
  including Achievements scrolling and Settings → Content Guide. → S49-10, S49-11.
- [ ] Commentary checked on the uploaded candidate (Settings → Commentary Mode, and
  READ ALL). → S49-06.
- [x] The retail-asset report is regenerated. The payload budget was raised to
  2,780 MiB for the 2026-09-30 models (`3482799b`, ~54 MiB).
- [ ] Compress `3d/runtime/new3ds/bio_charger.glb` (18.4 MiB) and the new boss GLBs
  (mesh compression, no visual change), then lower the budget back. → S49-31.

## Acceptance record and sprint close

For each delivered ticket attach: commit; scenario/seed; platform, input and locale;
command/result; candidate BuildID/backend revision when applicable; evidence path;
remaining limitation; reviewer/owner. New artifacts belong under `docs/reports/`
with a dated name. Keep personal purchase/report records in the private review
submission and link their evidence identifier rather than committing raw data.

Run `npm run audit:docs` and `git diff --check` for documentation changes. For
implementation run the affected unit/integration tests, lint and relevant E2E
journey; for the candidate also run build, presubmit, media/depot checks and the
manual account/hardware matrix. Existing scripts live in [package.json](../../package.json).

Sprint exit: all P0 tasks have actual acceptance evidence; remaining P1/P2 tasks
are carried by ID with their current implementation state and owner. A feature
does not disappear from the roadmap because an environment or reviewer gate is
still open. No game feature, purchase, hardware result or Steam acceptance is
claimed complete by the creation of this plan.
