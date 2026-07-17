# Things We Missed: Underplanned, Unexplored, and Dropped Work

Date: 2026-07-16.

This audit looks across the repo documentation and current branch shape to answer one question: **what areas are underplanned, unexplored, or only partially considered in the design and deployment of Hunker Bunker?**

It intentionally separates:

- **Still missing**: promised in docs, not visibly covered by current code or current plans.
- **Now partly landed**: older docs call it missing, but the current branch has code in motion.
- **Underplanned**: technically mentioned, but not specified enough to be safely built, tested, marketed, or operated.

Core sources: [implementation_plan.md](implementation_plan.md), [expanded-universe-narrative-design.md](expanded-universe-narrative-design.md), [hive-swarm-camps-and-humanity-system-design.md](hive-swarm-camps-and-humanity-system-design.md), [game-wide-review-and-solution-plan.md](game-wide-review-and-solution-plan.md), [lore-coherence-and-secret-sauce-review.md](lore-coherence-and-secret-sauce-review.md), [ux-and-game-feel-punch-list-2026-07-16.md](ux-and-game-feel-punch-list-2026-07-16.md), [steam-launch-readiness-master-plan.md](steam-launch-readiness-master-plan.md), and [sprint-19-wave5-steam-connection-lane-split.md](sprint-19-wave5-steam-connection-lane-split.md).

## Quick Answer

The most underplanned areas are:

1. **Player acceptance and first-hour feel**: the docs know what hurts, but there is no hard acceptance pass for the first 5, 15, and 60 minutes.
2. **Narrative payoff as gameplay**: the story state machine is rich, but too many emotional beats still resolve as flags, cards, or short choices instead of embodied play.
3. **Faction identity**: camps and hives have strong writing, but unique verbs, economies, risks, and failure modes are still uneven.
4. **Run variety**: the run director exists, but it is still more modifier layer than true encounter/event deck.
5. **Objective and sub-objective language**: camp quests are landing, but the general-purpose checklist/objective grammar is still thin.
6. **Steam deployment proof**: a lot is code-backed, but real Steamworks dashboard setup, live backend, Cloud sync, DRM wrap, Deck hardware acceptance, and microtransaction approval are not proven.
7. **Compliance and product claims**: store copy and feature lists are ahead of verified evidence in several places, especially Deck, Cloud, paid keys, Timeline, commentary, and multiplayer.
8. **Operational data durability**: SQLite scaffolding exists, JSON remains the default, and there is no Postgres/high-scale production plan.
9. **Art density and state aftermath**: big assets exist, but the world still needs more physical consequences, clutter, corpses, damage states, and prop variants.
10. **Testing strategy for giant interactive systems**: unit coverage is decent, but end-to-end and hardware acceptance lag behind the size of `main.js` and `threeGame.js`.

## What Changed Since The Old Missed List

Some older "missing" items are no longer cleanly missing. They should not be chased blindly:

| Area | Old assumption | Current branch reality | Remaining concern |
| --- | --- | --- | --- |
| Camp bonding quests | Not implemented | `src/threeGame.js` now has six named camp quests, quest props/enemies, reward checks, progress events, and tests in `src/threeGame.campQuests.test.js` / `tests/e2e/camp-quests.spec.js`. | Needs play acceptance, balancing, visual polish, and a reusable objective framework beyond camp quests. |
| Desktop compass | Mobile-only | `main.js` now references `#desktop-compass` and updates desktop camp/radar arrows. | Needs in-browser/Deck acceptance and lore/objective target expansion. |
| Black box guard bypass | Recoverable without killing guard | `interactWithBlackBox()` now blocks while a corrupted operator exists. | Needs persistent HUD clarity and E2E coverage. |
| Production persistence | JSON only | `server/db.js` now supports `HB_DB_BACKEND=sqlite` / `HB_DB_SQLITE_PATH`. | JSON is still default; SQLite-on-volume is beta scale, not high-scale production. |
| Inverted class bosses | Entirely absent | Boss sprites, enemy definitions, camp leader boss visuals, and apex threat attacks exist. | The final camp still needs a designed, staged climax instead of only enemy behavior and state dressing. |

## Design Areas Underplanned

### 1. The First Hour

[player-teardown-and-next-level-plan.md](player-teardown-and-next-level-plan.md) names the first-ten-second black screen, the opening gauntlet, modal takeovers, combat sponge feel, lack of pause/options, and death teaching little. These are identified, but not fully converted into acceptance gates.

What is underplanned:

- A first 5-minute script: menu -> class intro -> crash -> first objective -> first extraction.
- A first 15-minute script: first camp, first boss/major threat, first upgrade, first meaningful death.
- A first 60-minute script: cave signal, black box recovery, run loop understanding, first faction consequence.
- Pass/fail criteria for "the player knows what to do without reading docs."
- A real "death teaches something" structure beyond black box recovery and inheritance.

Why it matters: this is the area reviewers will feel before they ever appreciate the deeper state machine.

### 2. Faction Verbs And Economies

The docs repeatedly say camps should not feel identical. The lore review is blunt: Meridian, Tallow, and Vesper have strong identities but similar verbs. Current branch work adds camp quests and reward hooks, which helps, but the broader camp economy is still under-specified.

What is underplanned:

- Meridian's unique tech/radar/compass economy.
- Tallow's infection, humanity, cure, and med economy.
- Vesper's ammo, turret, defense, and force economy.
- Per-camp costs, failure states, cooldowns, and exploit limits.
- How these verbs change after Act 2 corruption, recruitment, robbery, or culling.

The highest-value unresolved question: **does each faction change how the player plays, or only what text they receive?**

### 3. Hive Sites As Play Spaces

[hive-swarm-camps-and-humanity-system-design.md](hive-swarm-camps-and-humanity-system-design.md) is deep, but much of it remains design mass rather than acceptance-ready tasks. The hives have names, bonds, extraction wounds, rescue/cull paths, and ending consequences, but their minute-to-minute verbs need sharper constraints.

What is underplanned:

- Hive-specific traversal, threat, and reward patterns.
- How mining visibly damages future hive communication.
- How alien bond changes nearby enemy behavior in a way players can read.
- What "mothership infection attempt" means in playable steps.
- How uninfecting the player feels mechanically, not just as a late state change.
- Failure conditions for alien allies, egg fragility, and queen-consumed states.

### 4. Run Director And Pressure Cards

The game-wide review calls the run director the biggest roguelike gap. Sprint 19 added run modifiers and apex threats, but the director is still underplanned as a full encounter engine.

What is underplanned:

- Event deck composition by act, biome, class, and prior choices.
- Repeat prevention and escalation pacing.
- Positive events, not only pressure events.
- Cards that alter geometry in ways players can identify.
- Per-card UI language, audio tells, and post-run explanation.
- A test matrix for "this run actually felt different."

Good target: each run should have 2-3 memorable pressure stories, not only different numbers.

### 5. Combat Identity

The docs call out "one verb against sponges." Current code has enemy variety, boss attacks, queen phases, class abilities, and camp-quest encounters, but fight design still needs a more explicit plan.

What is underplanned:

- Class-specific combat rhythms beyond ability buttons.
- Enemy readable silhouettes and counterplay rules.
- Ammo economy by boss HP and weapon upgrade stage.
- Anti-softlock guarantees before boss-gated objectives.
- Distinct miniboss/final boss patterns for corrupted Scout, Tank, and Engineer.
- How non-combat builds survive high-pressure runs.

The Queen fight is better scoped than the rest. The underplanned area is everything players fight before and around it.

### 6. Objective And Sub-Objective Language

Camp quests now have a HUD path, but the design still lacks a general-purpose objective grammar. [ux-and-game-feel-punch-list-2026-07-16.md](ux-and-game-feel-punch-list-2026-07-16.md) correctly flags the absence of a true checklist/multi-step objective display.

What is underplanned:

- Parent objective with child steps.
- Active/inactive/completed/failed states.
- Compass targeting rules for each objective type.
- Persistence across death, reset, Act transition, and save/load.
- Priority rules when black box, camp quest, mission objective, boss warning, and tutorial all compete.
- A single source of truth instead of multiple HUD-specific event handlers.

This matters because the game is becoming objective-rich faster than the UI language is becoming objective-literate.

### 7. Lore Discovery As Play

The lore is strong. The interaction model is less settled.

What is underplanned:

- Unified pickup rules for terminals vs physical lore drops.
- Lore compass/radar hints.
- Preventing duplicate accounting between lore drops and terminal-read events.
- Whether class-keyed wreck logs grant mechanical perks or only codex text.
- Date/timeline presentation to reconcile Horizon's collapse, Chen's operation, camps, and 0047.
- Quiet/intimate presentation modes so every lore beat is not shouted in all-caps radio voice.

### 8. Consequence Visibility

The state machine knows a lot: bond, suspicion, humanity, cover, queen obedience, hive status, camp status, manifest, eggs, queen, endings. The docs repeatedly warn about "spreadsheet smell."

What is underplanned:

- Which state values are player-facing meters vs hidden fiction.
- One-line "why this happened" explanations after major outcomes.
- Run summary that explains choices, costs, and ending derivation.
- Physical world changes for each state change.
- The minimum set of state indicators that teaches without overwhelming.

The game can already calculate consequences. The gap is helping the player understand and remember them.

### 9. World Generation Meaning

Landforms, chunk generation, camp flares, hives, and maze passes exist, but reviews still flag that maze diversity can get washed out.

What is underplanned:

- Shape-aware fill/widen rules with visual acceptance screenshots.
- Camp/hive distance bands that make "lost" and "too close" both less likely.
- Named sectors and landmarks that tie map reading to lore.
- More encounter meaning for crater, canyon, field, ruin, and hive spaces.
- A "landform changed my plan" acceptance criterion.

### 10. Art Density And Aftermath

[public-world-dressing-plan.md](public-world-dressing-plan.md) identifies the exact visual gap: not hero art, but density. Some assets have landed or are referenced, but the full stateful world-dressing pass is still underplanned as production work.

What is underplanned:

- Corpse/remains variants for humans, enemies, and bosses.
- Camp-specific clutter sets.
- Hive organic clutter and wounded/consumed variants.
- Door, console, module, camp, hive, and ship state variants.
- Damage decals and small repeatable scatter.
- Rules for when aftermath appears and when it despawns.

This is not only art polish. It is consequence readability.

## Deployment Areas Underplanned

### 1. Steamworks Dashboard Reality

[steam-launch-readiness-master-plan.md](steam-launch-readiness-master-plan.md) and [steam-dashboard-handoff.md](steam-dashboard-handoff.md) are strong, but dashboard work is still owner-driven and externally unproven.

Underplanned or unproven:

- Steamworks achievements/stats creation and association.
- Leaderboards created with correct sort/display methods.
- Inventory schema uploaded and accepted.
- Item Store page configured and linked.
- Steam Cloud Auto-Cloud paths published.
- Steam Input manifest uploaded and selected.
- Store page feature claims matched to accepted evidence.

### 2. Live Backend And Secrets

The backend is increasingly real, but not yet proven as a deployed service.

Underplanned or unproven:

- Fly.io app creation and real secret setup.
- Packaged Electron pointing at production backend URL.
- End-to-end Steam auth ticket verification against the real app.
- Backup/restore drills.
- Log retention and incident workflow.
- Rate limit tuning under real traffic.
- Migration from JSON default to SQLite beta storage or Postgres production storage.

### 3. Paid Random Rewards And Legal Scope

The crate/key model is documented in [steam-lootbox-odds-disclosure.md](steam-lootbox-odds-disclosure.md), but the product/legal decision is still not fully closed.

Underplanned or unproven:

- Whether paid Cache Keys are in first public release.
- Valve Microtransactions approval.
- Regional restrictions or direct-purchase alternatives.
- Refund/reversal reconciliation in live operations.
- Rating-board disclosures.
- Store copy and in-game wording for paid random rewards.

Recommendation: do not let this be a late marketing decision. It changes backend, UI, policy, ratings, and trust.

### 4. Steam Deck And Controller Claims

The code now has Steam Input polling, browser gamepad fallback, glyph switching, and controller routing. That is not the same as Deck acceptance.

Underplanned or unproven:

- Five-minute and one-hour physical Steam Deck play passes.
- Text entry using Steam on-screen keyboard.
- Settings, modals, skill tree, inventory, store, and codex navigation by controller.
- 1280x800 layout screenshots.
- Battery/performance target evidence.
- Whether the public claim is "Playable," "Deck support in progress," or "Verified-style support."

Important copy risk: [steam-deck-compatibility-announcement.md](steam-deck-compatibility-announcement.md) reads more confident than [steam-portal-copy.md](steam-portal-copy.md), which correctly says not to claim Verified yet.

### 5. Steam Cloud

Electron mirrors localStorage to `save.json`, and the handoff docs list Auto-Cloud paths. The missing part is live proof.

Underplanned or unproven:

- Cloud dashboard setup.
- Two-machine sync test.
- Conflict behavior.
- Save migration between browser/localStorage and Electron/save.json.
- What happens if Cloud is off, unavailable, or stale.

### 6. DRM

[steam-drm-wrap-procedure.md](steam-drm-wrap-procedure.md) gives a path and helper script, but DRM remains externally gated.

Underplanned or unproven:

- Actual Windows executable wrapping through Steamworks tooling.
- Steam beta launch of wrapped build.
- CI guard ensuring depots do not ship `steam_appid.txt`.
- Linux/Steam Deck packaging policy if Windows DRM wrapping is the only DRM path.

### 7. Multiplayer Feature Claims

The old Steam feature claim work mentions PvP/co-op as unclaimable. This remains a product risk if store metadata drifts.

Underplanned:

- No real multiplayer design.
- No progression sync model.
- No matchmaking/lobby plan.
- No authority/anti-cheat plan.
- No acceptance criteria for co-op or PvP.

Recommendation: keep all multiplayer claims off the store page until there is an actual multiplayer plan.

### 8. Steam Timeline And Commentary

Timeline-style events and developer commentary hooks exist, but their product meaning needs stricter definition.

Underplanned or unproven:

- Whether current Steamworks bindings expose real Timeline APIs.
- Which events deserve Timeline entries.
- Acceptance from a Steam-installed build.
- Commentary mode content standards and coverage.
- Whether "Commentary available" means a real feature or scattered dev cards.

## Dropped Or Still Thin Promises

### Dedicated Final Camp Boss Climax

The class boss assets and behaviors exist, but the original promise was stronger: Camp 3 should be the player's inverted class reflected back as a climactic encounter. Current implementation appears closer to corrupted leader visuals plus apex enemy behavior.

Missing design:

- Arena setup.
- Intro/outro beats.
- Class-specific mechanics.
- Win/loss consequences.
- How the camp choice follows the fight.

### Ambient NPC Pathfinding

The design called for leaders walking between camp stations, reacting to robbery/turning, and performing idle actions. Current camp code has sprites and state visual changes, but not a full ambient node behavior system.

This is lower priority than objective clarity and first-hour feel, but it remains a dropped immersion promise.

### Full Escort / Rescue AI

At least one current quest note explicitly scopes "Lost Cultist" as single-interaction rescue rather than escort AI. That is a reasonable cut, but the design should acknowledge it as a cut.

Unplanned if revived:

- Follow behavior.
- Getting attacked.
- Fail/retry states.
- Camp arrival handoff.
- Save/load persistence.

### Ending Videos For Every Branch

The current reviews wisely treat text cards as valid first implementation. Still, older docs planned many ending visuals.

Underplanned:

- Which endings deserve video.
- Which remain text/cards permanently.
- Asset budget and generation prompts for the rest.
- Fallback behavior if videos are absent.

## Highest-Risk Planning Gaps

| Risk | Why it matters | Suggested next artifact |
| --- | --- | --- |
| First-hour acceptance is not formalized | Reviewers judge the game before deep systems land | `docs/first-hour-acceptance-plan.md` |
| Steam claims can outrun proof | Store metadata errors create trust and review risk | Claim/evidence matrix tied to dashboard and test results |
| Objective systems are multiplying | Players will get lost in overlapping HUD events | General objective/sub-objective design spec |
| Faction identity still leans on text | Strong writing may not become memorable play | Camp/hive verb matrix with costs, risks, rewards |
| Paid keys touch legal/backend/UI | Late decision can blow up release scope | Commerce go/no-go memo |
| Deck support is code-backed, not accepted | Hardware failure is visible and expensive | Deck acceptance checklist with screenshots/video |
| Persistence backend is transitional | Economy features need durable operations | Storage migration plan: JSON -> SQLite beta -> Postgres if needed |
| World consequences need art rules | State changes can feel invisible | State aftermath and dressing implementation plan |

## Recommended Next Planning Order

1. **First-hour acceptance plan**: five-minute, fifteen-minute, and one-hour pass/fail scripts.
2. **Claim/evidence matrix**: every Steam feature claim mapped to code, dashboard, and live-test proof.
3. **Objective system spec**: one data model for mission, black box, camp quest, lore, boss, and tutorial goals.
4. **Faction verb matrix**: one page for each camp/hive with unique actions, costs, failures, and visible consequences.
5. **Deck and controller acceptance runbook**: real hardware tasks, screenshots, text entry, modals, and performance.
6. **Commerce decision memo**: decide whether paid Cache Keys ship now, later, or never.
7. **State aftermath art pass**: small assets and spawn rules for consequences, not more hero art.
8. **Production storage plan**: document when SQLite is enough and what would trigger Postgres.

## Short Version

The project is not short on ideas. It is short on **acceptance-ready connective tissue**.

The design has rich state, strong writing, and ambitious Steam scaffolding. The underplanned work is mostly the stuff that turns those into a shippable player experience: first-hour proof, objective clarity, faction-specific play, run variety, consequence visibility, real Steam dashboard acceptance, hardware validation, durable production storage, and careful feature-claim discipline.
