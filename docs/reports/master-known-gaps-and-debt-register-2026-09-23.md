# Master Known Gaps, Technical Debt, and Open Remediation Register
Status: evidence report — see §0 for remediation status | Owner: repository maintainers | Updated: 2026-09-23 | Review: sprint close

---

## 0. Remediation Status — Sprint 45.1 (`v2.4.11-beta`, 2026-09-23)

Checked against the code on `dev/sprint-45` after the register was written. Several entries described code that had already changed; they are marked **stale** rather than fixed again. "Resolved" means code plus automated coverage — every item still needs the QA session listed in the release PR before it counts as accepted on hardware.

| ID | Status | Where |
| :--- | :--- | :--- |
| GAP-RN-01 | **Resolved.** Damage-pip textures cached per label, rain-splash and impact/frost shockwave geometry shared (`userData.shared` is skipped by the disposer), transient list capped on register and per frame. The 64-effect cap already existed; the register's "uncapped" reading predates it. | `90e1211`, `7b7c514` |
| GAP-RN-02 | **Resolved.** Props: already fixed in `8bd955d` (a hidden source collides only while its GLB is mounted and visible). Crashed-ship modules now follow the same rule. | `8bd955d`, `7b7c514` |
| GAP-GP-01 | **Resolved (needs Deck).** Map is a menu focus root and requests the menu action set while open; toggles debounced; the opening press must be released before it can close the map. | `8bd955d`, `7b7c514` |
| GAP-GP-02 | **Partial.** Deck R4 binds `ability` (Smash) since `8bd955d`; no secondary fire on other controllers. | `8bd955d` |
| GAP-GP-04 | **Resolved.** Loop step and compass already pointed home (`8bd955d`); an extraction objective, airlock landmark and one radio line per run now follow a completed objective or the third milestone boss. | `7b7c514` |
| GAP-GP-05 | **Stale.** The chasm badge already reads `IMPASSABLE CANYON // ROUTE VIA CONNECTED BRIDGE`. | — |
| GAP-GP-07 | **Resolved.** Route topologies carry a reachability result from `mazeTiers`' disjoint-route search; `validateRadialMazeExpedition` rejects an unreachable Queen. Two disjoint routes are reported, not required: generation-2 gates are deliberately route cut points. | `7b7c514` |
| GAP-GP-09 | **Stale.** Every ship goal rolls one of three objective packages per campaign. | `de1df0e`, `08722c0` |
| GAP-MP-01 | **Implemented + automated; paired packaged acceptance open.** Boss phases, weakpoints and adds now use one authority with shared add keys; milestone defeats reach replica guests. | `8da53de`, `src/threeGame.coopTransitions.test.js` |
| GAP-TS-01 | **Stale / resolved.** The boot helper reaches gameplay; the failures were a per-test budget smaller than the helper's own deadline and a corpse test racing other corpses. `enemy-gibs` 3/3 and `gameplay-aim-cursor` 5/5 pass. | `59d0eeb` |
| GAP-TS-02 | **Resolved.** Report links are repo-relative; `scripts/audit-docs.js` passes. | `1c0d69e` |
| GAP-MP-02 | **Implemented + automated; paired packaged acceptance open.** Act 2 descent carries an absolute seed offset and index for replica clients. | `8da53de`, `src/threeGame.coopTransitions.test.js` |
| GAP-PV-01 | **Implemented + automated; paired packaged acceptance open.** Local, relay, and remote replica PvP vitals aligned at 4 hearts; `server/relayPvPAuthority.test.js` proves four hits required for kill. | `server/relay.js`, `src/threeGame.js`, `server/relayPvPAuthority.test.js` |

**2026-09-23 evening Deck PvP session** ([analysis](session-log-analysis-2026-09-23-deck-pvp-session.md)): one physical Deck capture sampled transient effects from 0–64 (final 13), but gameplay frame pacing remains unacceptable (p50 84.7 ms, max 4.6 s). It proves one local, incoming-damage PvP lifecycle only; paired PvP and co-op acceptance remain open. New gaps are in §9.

---

## 1. Executive Summary & Audit Methodology

This document establishes the comprehensive, forensic register of all known gaps, unfinished systems, unwired modules, code debt, documentation discrepancies, and hardware/service acceptance backlog in **Hunker Bunker** as of **Sprint 45 (`v2.4.10-beta`, 2026-09-23)**.

### Evidence Sources Audited
1. **Canonical Product State & Release Notes:** [PRODUCT_STATE.md](../../PRODUCT_STATE.md), [docs/releases/v2.4.10-beta.md](../releases/v2.4.10-beta.md), [docs/planning/repository-roadmap.md](../planning/repository-roadmap.md), and [docs/planning/sprint-41-audit-and-roadmap.md](../planning/sprint-41-audit-and-roadmap.md).
2. **Automated Forensic Scripts:**
   - `scripts/audit-unwired-code.mjs`: Unwired modules, dead exports, orphaned CustomEvents.
   - `scripts/audit-docs.js`: Broken links, non-portable workstation paths, version drift.
   - `scripts/audit-steam-backend-env.js`: Backend deployment secrets and leaderboard coverage.
   - `scripts/audit-armory-assets.js`: 3D model status, missing textures, factory blockouts.
3. **Session Telemetry & Physical Playtest Logs:**
   - `docs/reports/session-log-analysis-2026-09-23-steam-deck-playthrough.md` (34.5-minute Steam Deck run, log `2026-09-23T07-01-39-493Z`).
   - `docs/reports/playtest-issues-2026-09-12.md` and `docs/reports/session-log-analysis-2026-09-22-playthrough.md`.
4. **Historical & Subsystem Gap Registers:**
   - `docs/things-we-missed.md`, `docs/reports/gameplay-implementation-gap-audit-2026-09-10.md`, `docs/reports/pr65-known-gaps-2026-09-11.md`, and `docs/story-world-asset-gap-priorities-2026-09-11.md`.
5. **Codebase Inline Comments:** Full grep across `src/`, `main.js`, `server/`, `electron/`, and `tests/` for load-bearing `KNOWN GAP`, `TODO`, `WORKAROUND`, and architecture notes.

### Gap Summary by Domain

| Domain | Total Items Identified | High / P0 Risk | Primary Bottleneck |
| :--- | :---: | :---: | :--- |
| **1. Gameplay, Controls & Steam Deck** | 12 | 4 | Input set conflict, missing secondary attack, interactable cycling |
| **2. World Generation & Navigation** | 8 | 2 | Dead anti-softlock validator, spawn area repetition, chasm confusion |
| **3. Story, Quests & Narrative Payoff** | 9 | 1 | Unimplemented hive quest for Tina joined path, invisible ending locks |
| **4. 3D Assets, Rendering & Performance** | 14 | 3 | Transient effect heap leak, shockwave geometry reallocations, unrouted arch kit |
| **5. Architecture & Unwired Code** | 16 | 2 | 36.6k-line `threeGame.js`, 11 unwired modules, 43 dead CustomEvents |
| **6. Multiplayer, Steam & Backend** | 10 | 3 | Co-op boss sync missing, 2-account proof uncertified, missing backend secrets |
| **7. Testing & Documentation Hygiene** | 7 | 1 | E2E gameplay boot helper broken, 21 doc audit failures |
| **TOTAL** | **76** | **16** | |

---

## 2. Gameplay, Controls & Steam Deck Gaps

### GAP-GP-01: Steam Deck Tactical Map Dual-Polling Input Conflict
- **Status:** **Resolved in Sprint 45.1** (`main.js:toggleTacticalMapModal`, `syncSteamInputPhase`, `src/tacticalMapInput.test.js`).
- **Evidence:** `docs/reports/session-log-analysis-2026-09-23-steam-deck-playthrough.md` §2 Issue 2; over 100 `ui_error` audio triggers in session `mudr8s7p-bect`.
- **Finding:** `toggleTacticalMapModal()` starts an independent `requestAnimationFrame` loop (`pollTacticalMapGamepadInput()`) while the core loop (`pollGamepads()`) continues running. Without switching the Steam Input action set to `menu`, pressing Start or Map (RB/View/D-pad Up) triggers both opening and closing simultaneously, trapping the controller in a loop.
- **Remediation Applied:** Added 250ms debouncing timestamp guard `lastTacticalMapToggleTimestamp` in `main.js`. Enhanced `syncSteamInputPhase()` to detect `tactical-map-modal` open state and force `menu` action set when opened and restore `gameplay` on close. Gated `handleSteamGameplayInput`, `handleSteamMenuInput`, and `pollTacticalMapGamepadInput` against rapid toggle bounces within the debounce window. Verified by 3/3 tests in `src/tacticalMapInput.test.js`.

### GAP-GP-02: Missing Secondary Attack / Fire Mapping on Controller
- **Status:** Unimplemented.
- **Evidence:** `scripts/build-steam-input-configs.js` lines 201–227; session log analysis 2026-09-23.
- **Finding:** Steam Input manifest maps LT (`sprint`), RT (`fire`), Face Y (`ability`), LB (`scan`), RB (`toggle_map`). There is no `secondary_fire` or `secondary_attack` action defined in the manifest. On keyboard/mouse, right-click orbits the camera or fires secondary actions, but controller players have no secondary weapon attack.
- **Action Required:** Define `secondary_fire` in `steam_input_manifest.vdf`, bind to LT (moving sprint to Left Stick Click `L3`), or bind secondary utility to LB.

### GAP-GP-03: Interaction Cycling and Depenetration Traps
- **Status:** Mitigated in `facad1e` and `79ef18d`, but edge cases persist around multi-objective clusters.
- **Evidence:** `docs/reports/playtest-issues-2026-09-12.md` (P0-2); `src/safeSpawn.js`.
- **Finding:** When multiple interactable entities overlap within proximity radius (e.g. ship hull, black box corpse, lore terminal, base turret), interaction defaults to distance without an explicit cycle button prompt. If the player gets geometry-pinned between a console and a wall, standard walk collision rejects all directional inputs.
- **Action Required:** Ensure the candidate cycling UI badge is prominent on Steam Deck, and verify the continuous sustained pin recovery push-out vector in `src/threeGame.js:pinnedRecovery`.

### GAP-GP-04: Post-Boss Objective Guidance & Extraction Softlock Feel
- **Status:** **Resolved in Sprint 45.1** (`src/threeGame.js:activateExtractionGuidance`, `src/threeGame.extractionGuidance.test.js`).
- **Evidence:** `docs/reports/session-log-analysis-2026-09-23-steam-deck-playthrough.md` §2 Issue 3; `src/threeGame.js:27610`.
- **Finding:** When all 3 milestone bosses (`boss_cybersnail`, `boss_cryosnail`, `boss_sporesnail`) are slain, `killedBosses.size === 3`, but no extraction beacon, bunker evacuation route, or return prompt was displayed. The player was left wandering in bio-caves with no indication of what to do next.
- **Remediation Applied:** Added `activateExtractionGuidance(reason)` in `threeGame.js`. Registered `mission:extraction` tracking beacon pointing compass to ship airlock, dispatched `extraction-ready` event, registered `extraction_airlock` in explorationTracker, and broadcast mother-ship voice line `MOTHERSHIP TO SCOUT // PRIMARY THREAT PURGED // RETURN TO AIRLOCK FOR EXTRACTION`.

### GAP-GP-05: Chasm Pit-Falls vs Player Expectation of Bridge Building
- **Status:** Open.
- **Evidence:** `src/threeGame.js:11029`; session log analysis 2026-09-23.
- **Finding:** Chasms are inspected as `CHASM // GLACIAL CANYON CHASM EDGE // SUB-LEVEL VOID // FALL HAZARD`. Because players build turrets and camp fortifications at fabricators, players logically expect to build bridges across chasms. In reality, procedural chasms are impassable unless WFC generated a natural bridge tile.
- **Action Required:** Update inspection badges and tooltips to `IMPASSABLE CHASM // NATURAL CROSSING REQUIRED` to eliminate false expectations, or introduce an authored portable bridge deployment kit.

### GAP-GP-06: 9 of 19 Relics and Overclocks Inert in Runtime
- **Status:** Disclosed in code, unbuilt in gameplay.
- **Evidence:** `src/runDrops.js:115-180`; `docs/reports/gameplay-implementation-gap-audit-2026-09-10.md` §F6.
- **Finding:** 9 relics are marked `implemented: false` and excluded from reward tables: `split_shot`, `cryo_rime`, `plasma_bounce`, `caustic_payload`, `shatter_engine`, `bio_vampirism`, `tesla_thrusters`, `pheromone_aura`, `chitin_membrane`, `synapse_pulse`.
- **Action Required:** Either implement mechanical behaviors for the 9 inert overclocks across Sprints 46–48 or officially retire them from catalog metadata.

### GAP-GP-07: Anti-Softlock Route Guarantee Unwired (`src/mazeTiers.js`)
- **Status:** **Resolved in Sprint 45.1** (`src/mazeExpedition.js`, `src/threeGame.js`, `src/mazeExpedition.reachability.test.js`).
- **Evidence:** `src/mazeTiers.js` (274 lines); `scripts/audit-unwired-code.mjs`.
- **Finding:** `findDisjointRoutes()` and `hasTwoRoutesToQueen()` were designed to guarantee that players always have two independent routes to the Queen. However, `src/mazeTiers.js` has zero production importers. World generation does not validate route reachability at runtime.
- **Remediation Applied:** Imported `mazeTiers.js` functions into `src/mazeExpedition.js`. Implemented `validateExpeditionRouteReachability()` and wired it into `generateRegionalRouteTopology()` and `validateRadialMazeExpedition()`. Re-exported tier progression functions from `mazeExpedition.js` and wired `getExpeditionRouteToFinalTier()` and `getExpeditionMaxUnlockedTier()` into `ThreeGame`. `src/mazeTiers.js` is now an active production dependency verified by `audit-unwired-code.mjs`.

### GAP-GP-08: Hardcoded Crash Site & Tutorial Ring Layout Monotony
- **Status:** Open.
- **Evidence:** `src/threeGame.js:35221` (`clearSpawnArea`), `src/threeGame.js:34919` (`isInTutorialRing`).
- **Finding:** Chunk (0,0) is hardcoded to a fixed rectangle `{ left: 2, right: 16, top: 4, bottom: 17 }` with a single north door. All 8 surrounding chunks (`max(|x|, |y|) === 1`) force a restricted tutorial tile subset. The first 5 minutes of every single run feel identical.
- **Action Required:** Parameterize `clearSpawnArea` using the run seed to vary crash site orientation, door sockets, and initial perimeter layout.

### GAP-GP-09: Objective Packages Variety Missing
- **Status:** Open (carried into Sprint 46).
- **Evidence:** `PRODUCT_STATE.md:31`; `docs/releases/v2.4.10-beta.md:78`; `src/ringManifest.js`.
- **Finding:** `ringManifest.js` still builds the same primary / alternative-resource / fallback trio for each ship goal. Environmental conditions change how a route plays, but not *which* missions are assigned.
- **Action Required:** Implement dynamic objective deck sampling from `src/objectivePackages.js` (which currently has no production importer).

### GAP-GP-10: Generation-1 Route Gates Restricted by Ring Boundary, Not Doors
- **Status:** Open compatibility constraint.
- **Evidence:** `PRODUCT_STATE.md:31`; `docs/releases/v2.4.10-beta.md:79`.
- **Finding:** In Route Generation 1 (kept for legacy save compatibility), 208 of 240 gates are on non-cut-point spurs. Gates are locked by the radial ring boundary rather than the authored gate door.
- **Action Required:** Migrate legacy campaigns toward Generation 2 route topologies where all gates sit on cut-points.

### GAP-GP-11: Snail Diplomacy vs Universal Encounter Duplication
- **Status:** Tech debt / dead resolvers.
- **Evidence:** `src/snailEncounter.js` vs `src/universalEncounter.js`.
- **Finding:** Snail diplomacy was generalized to `src/universalEncounter.js`. However, `src/snailEncounter.js` remains tested and contains dead functions (`createEncounter`, `resolveFight`, `resolveTalk`, `resolveFlee`) because `threeGame.js` still imports constants from it.
- **Action Required:** Move `SNAIL_ENCOUNTER_CONSTANTS` to `src/universalEncounter.js` and delete dead resolvers in `src/snailEncounter.js`.

### GAP-GP-12: Steam On-Screen Virtual Keyboard
- **Status:** Code stub exists, physical Deck verification open.
- **Evidence:** `docs/steam-review-failures-and-action-plan.md` Item 5; `electron/main.js`.
- **Finding:** Text entry fields (callsign input, seed input, chat) require invoking Steamworks `ShowFloatingGamepadTextInput`.
- **Action Required:** Verify virtual keyboard invoking and layout at 1280×800 on physical SteamOS.

---

## 3. Story, Narrative & Quest Gaps

### GAP-ST-01: Alien Hive Quest to Trigger "Tina Joined" Path Unimplemented
- **Status:** Major narrative gap.
- **Evidence:** `docs/reports/pr65-known-gaps-2026-09-11.md` §3; `src/storyLinchpins.js`.
- **Finding:** The `joined` resolution for Mayor Tina applies `-30` humanity, drops every camp bond by 2, and closes `CLEAN_ESCAPE` and `SCORCHED_SKY`. However, no gameplay or hive interaction triggers this branch; it is only reachable via debug console.
- **Action Required:** Implement an interactive alien communion encounter at Hive Queen chamber allowing players to choose transformation / allegiance.

### GAP-ST-02: Irreversible Ending Locks Invisible During Run
- **Status:** Partially mitigated in Codex archive; invisible in gameplay.
- **Evidence:** `docs/reports/pr65-known-gaps-2026-09-11.md` §2; `docs/story-world-asset-gap-priorities-2026-09-11.md`.
- **Finding:** Killing Mayor Tina or sabotaging a camp leader permanently closes 3 ending paths. While the Field Codex archive reflects closed historical paths, in-run HUD notifications fail to communicate the consequence when the choice is made.
- **Action Required:** Display a somber radio or HUD prompt (`TIMELINE DIVERGENCE: ENDING PATHS ALTERED`) when linchpins resolve.

### GAP-ST-03: Missing Bespoke Frames for 5 Endings
- **Status:** Art production backlog.
- **Evidence:** `docs/story-world-asset-gap-priorities-2026-09-11.md` §Highest-value missing assets #2.
- **Finding:** Five endings (`mothership_infection`, `alien_exodus`, `outed_escape`, `failed_carrier`, `empty_husk`) are rendered using achievement icon stills rather than bespoke rendered cinematic stills.
- **Action Required:** Render bespoke still frames matching the aesthetic of the other 5 primary ending cinematics.

### GAP-ST-04: Missing Camp Leader Aftermath Portraits
- **Status:** Art production backlog.
- **Evidence:** `docs/story-world-asset-gap-priorities-2026-09-11.md` §Highest-value missing assets #1.
- **Finding:** The Codex currently crops leader walk sheets for `{briggs,martha,kaelen}_{pact,broken}.webp`. High-resolution 2-frame portraits are missing.
- **Action Required:** Author 6 dedicated portrait images (human pact and broken/corrupted state for Briggs, Martha, and Kaelen).

### GAP-ST-05: Missing Leader-Choice Voiced Audio Stingers
- **Status:** Audio production backlog.
- **Evidence:** `docs/story-world-asset-gap-priorities-2026-09-11.md` §Highest-value missing assets #4.
- **Finding:** Camp leader resolutions currently display text-only radio lines without voiced audio stingers or sound design cues.
- **Action Required:** Generate 6 short voiced aftermath lines (one human, one hostile per leader) using the ElevenLabs pipeline.

### GAP-ST-06: Escort / Rescue AI Cut Unacknowledged in Architecture
- **Status:** Cut design.
- **Evidence:** `docs/things-we-missed.md:321`.
- **Finding:** "Lost Cultist" quest operates as a single-click interaction rather than an escort/follow mechanic.
- **Action Required:** Update design documentation to formally register full escort AI as cut rather than deferred.

### GAP-ST-07: Camp State Visual Footprint Overlays Missing
- **Status:** Open.
- **Evidence:** `docs/story-world-asset-gap-priorities-2026-09-11.md` §Highest-value missing assets #3.
- **Finding:** Camp state changes remove props (stores vanish after robbery, beds vanish after turning), but lack decal footprint overlays (scorch marks, bio-slime decals, blood splatter) to ground the aftermath.
- **Action Required:** Add ground decal overlays for evacuated, robbed, and turned camp states.

### GAP-ST-08: Tina Joined / Killed Aftermath Stills Missing in Codex
- **Status:** Open.
- **Evidence:** `docs/story-world-asset-gap-priorities-2026-09-11.md` §Highest-value missing assets #5.
- **Finding:** Mayor Tina's encounter has a 3D model secret, but no post-resolution dossier art in the Codex.
- **Action Required:** Create aftermath stills for Mayor Tina joined and killed states.

### GAP-ST-09: Dedicated Final Camp Boss Climax
- **Status:** Open design goal.
- **Evidence:** `docs/things-we-missed.md:301`; `docs/camp3-boss-climax-design.md`.
- **Finding:** Camp 3 was promised to stage the player's inverted class reflected back as a climactic encounter. Currently it functions as a corrupted leader sprite with apex enemy behavior.
- **Action Required:** Design an authored arena layout for the Camp 3 encounter with class-specific combat phases.

---

## 4. 3D Assets, Rendering & Performance Gaps

### GAP-RN-01: Severe JS Main-Thread Freeze & Memory Leak from Transient Effects
- **Status:** **Resolved in Sprint 45.1** (`src/threeGame.js:SHARED_GROUND_SHOCKWAVE_GEOMETRY`, `registerTransientEffect`, `updateTransientEffects`, `src/threeGame.transientEffectsPerformance.test.js`).
- **Evidence:** `docs/reports/session-log-analysis-2026-09-23-steam-deck-playthrough.md` §2 Issue 5; session `mudr8s7p-bect`.
- **Finding:** In long sessions, `this.transientEffects` accumulates uncapped (reached **3,277 active effects**, **6,363 unique materials**, and **853 MiB heap**). Frame intervals degraded from 16.6ms to **113.8ms (~8.8 FPS)** with freeze spikes up to **7.44 seconds**, while GPU frame time remained low (<20ms).
- **Remediation Applied:** 
  1. Instantiated static `SHARED_GROUND_SHOCKWAVE_GEOMETRY` flagged `userData.shared = true` reused across projectile ground impacts and frost shockwaves, scaled via `ring.scale.set(s, s, s)`.
  2. Enforced 64-effect hard pool cap in `registerTransientEffect` and `updateTransientEffects` with FIFO oldest eviction.
  3. Implemented distance-based Fog-of-War culling skipping opacity matrix traversals for effects beyond 35 meters from player.
  4. Switched removals filter to O(N) `Set` containment. Verified by 5/5 tests in `src/threeGame.transientEffectsPerformance.test.js`.

### GAP-RN-02: Invisible Colliders Blocking Player Movement
- **Status:** **Resolved in Sprint 45.1** (`src/threeGame.js:canOccupyPosition`, `src/threeGame.propCollisionVisibility.test.js`).
- **Evidence:** `src/threeGame.js:32946` (`canOccupyPosition`); session log analysis 2026-09-23.
- **Finding:** In `canOccupyPosition`, if `prop.visible === false && !prop.userData.replacedBy3d`, collision is ignored. But if `replacedBy3d` is true, collision still blocks the player even when the 3D model failed to load, was culled, or has visibility turned off. The player bumps into invisible walls in empty rooms.
- **Remediation Applied:** In `canOccupyPosition`, verified that when `prop.visible === false`, the 3D model replacement proxy must have `root3d && root3d.parent && root3d.visible !== false` before registering solid collision. Applied equivalent `isModulePhysical` checks for ship modules (`o2Module3d`, `hullModule3d`, `radarModule3d`, `reactorModule3d`). Verified by 6/6 tests in `src/threeGame.propCollisionVisibility.test.js`.

### GAP-RN-03: Architecture Kit In-World Rendering Failure (24 GLBs)
- **Status:** High priority asset gap.
- **Evidence:** `docs/planning/sprint-41-audit-and-roadmap.md` §Track 1; `docs/planning/setpiece-asset-and-lore-inventory-2026-09-12.md`.
- **Finding:** 24 authored GLB models (`arch_*`, `state_*`, `fixture_*`) exist in `public/3d/runtime/new3ds/` and are registered in `WORLD_3D_MODELS`, but render nothing in-world because `createScatterSprite` in `src/threeGame.js` requires a `prop_` prefix and checks for a 2D sprite material.
- **Action Required:** Route 3D-only prefixes (`arch_`, `state_`, `fixture_`) directly to the 3D model loader without requiring a 2D billboard material fallback.

### GAP-RN-04: 21 Faction Props Isolated from Room Builders
- **Status:** Open.
- **Evidence:** `src/camp.js:1024` (`CAMP_DRESSING_MODELS`); `docs/planning/sprint-41-audit-and-roadmap.md`.
- **Finding:** 21 faction props (Meridian radio, Tallow still, Vesper turret, alien hive egg structures, graves, laundry) are hardcoded into `camp.js` and cannot be referenced or spawned by room definitions or authored setpieces.
- **Action Required:** Export faction dressing models into a unified prop registry addressable by `src/data/roomBuilds.js`.

### GAP-RN-05: Four Theme Matrix Holes
- **Status:** Open.
- **Evidence:** `docs/planning/sprint-41-audit-and-roadmap.md` §Track 1 #3.
- **Finding:** Four themes lack dedicated prop/tile matrices: `bio/medical`, `bio/security`, `bio/engineering`, and `active/storage`. The Ring 2 hospital falls back to generic bio-resin rather than reading as a clinical space.
- **Action Required:** Define dedicated prop sets and tile dressing for the 4 missing themes.

### GAP-RN-06: Visual Overhaul Phase B & D (Surface Relief & Grade)
- **Status:** Open backlog.
- **Evidence:** `docs/planning/sprint-41-audit-and-roadmap.md` §Track 2; `PRODUCT_STATE.md:49`.
- **Finding:** Phase A (AgX tone mapping and IBL reflections) is live. Phase B (derived normal maps from texture luminance, noise-driven roughness break-up, emissive vascular circuitry maps) and Phase D (analog film grade post-processing) remain open.
- **Action Required:** Implement Phase B procedural normal/roughness shader enhancement.

### GAP-RN-07: Armory — 4 Hidden Achievement Weapons
- **Status:** Open asset backlog.
- **Evidence:** `docs/reports/armory-asset-gaps.md` §7.
- **Finding:** Rewards `5002` (Chrono-Drifter Talon-C), `5006` (Bunker Bastion Siege-Breaker), `5009` (Archival Constructor Arc Driver), and `5010` (Hive-Weaver Bio-Plasma Emitter) are hidden from the picker because their custom 3D models have not been authored.
- **Action Required:** Model dedicated GLBs for items `5002`, `5006`, `5009`, `5010`.

### GAP-RN-08: Armory — Talon-C Carbine Model Needs Visual Replacement
- **Status:** Open asset backlog.
- **Evidence:** `docs/reports/armory-asset-gaps.md` §6.
- **Finding:** The shipped factory model for Talon-C Carbine (`frame:talon_c`) is an untextured blockout proxy.
- **Action Required:** Author a finished, textured carbine model preserving grip and charm socket calibration.

### GAP-RN-09: Operator Chassis Skins Render Only as 2D Billboard Planes
- **Status:** Open asset backlog.
- **Evidence:** `docs/game-audit-function-completeness-and-gaps-review.md` §2.C.
- **Finding:** Season 0 chassis armor skins (`4112–4119`) render as flat 2D icon planes rather than full custom 3D exosuit meshes.
- **Action Required:** Sculpt 3D operator chassis models for Season 1.

---

## 5. Architecture, Unwired Systems & Technical Debt

### GAP-AR-01: Monolithic Sprawl in `src/threeGame.js`
- **Status:** High architectural risk.
- **Evidence:** `src/threeGame.js` contains **36,609 lines** (1.7 MB).
- **Finding:** `threeGame.js` encapsulates input handling, WebGL rendering, audio dispatch, network sync, world generation, NPC dialog, quest state, enemy AI, boss phases, UI HUD updates, and save data. Any modification carries cross-cutting regression risk.
- **Action Required:** Incrementally extract bounded submodules (e.g. `tacticalCursor.js`, `campLifecycle.js`, `transientEffectsManager.js`, `enemyHitSync.js`) with colocated characterization tests.

### GAP-AR-02: 11 Unwired Modules with Zero Production Importers
- **Status:** Dead code debt.
- **Evidence:** Output of `scripts/audit-unwired-code.mjs`.
- **Finding:** The following 11 modules have zero production callers:
  1. `src/bountySystem.js` (382 lines) — bounties system.
  2. `src/mazeTiers.js` (274 lines) — tier progression and anti-softlock checks.
  3. `src/KeyedVideoSprite.js` (152 lines) — video sprite rendering (untested).
  4. `src/spriteAtlasContract.js` (142 lines) — atlas manifests.
  5. `src/objectivePackages.js` (130 lines) — package objective normalization.
  6. `src/hex.js` (129 lines) — axial hex grid library.
  7. `src/scene.js` (97 lines) — abandoned parallel renderer.
  8. `src/gifDuration.js` (86 lines) — GIF duration probes.
  9. `src/data/missions.js` (50 lines) — mission briefings data.
  10. `src/data/humans.js` (37 lines) — human archetype lookup.
  11. `src/minigames/rgb/index.js` (14 lines) — unused re-export barrel.
- **Action Required:** Triage each: delete dead prototypes (`scene.js`, `minigames/rgb/index.js`), connect required gameplay systems (`mazeTiers.js`, `objectivePackages.js`), or archive them.

### GAP-AR-03: 98 Exported Functions with Zero Production Callers
- **Status:** Dead API debt.
- **Evidence:** `scripts/audit-unwired-code.mjs` §Exported functions/classes with no production caller.
- **Key Examples:**
  - `campEconomy.js :: getCampTrades` (trading economy designed but uncalled).
  - `objectiveTargetResolver.js :: resolveObjectiveTargetPosition` (compass positioning).
  - `ringCrossings.js :: getRingCrossing`, `isRingCrossingOpen`, `getCrossingStatus`.
  - `steamLobbyClient.js :: checkLobbyProtocolCompatibility`.
  - `data/enemies.js :: rollAlienMutation`.
  - `data/codex.js :: getCodexEntriesByCategory`.
- **Action Required:** Remove uncalled functions or wire them to their intended UI and gameplay hooks.

### GAP-AR-04: 43 Orphaned CustomEvents Dispatched with Zero Listeners
- **Status:** Unheard event debt.
- **Evidence:** `scripts/audit-unwired-code.mjs` §CustomEvents dispatched with no other reference.
- **Key Examples:** `mission-complete`, `player-downed`, `snail-befriended`, `crawler-detected`, `base-turret-damaged`, `bunker-door-damaged`, `fungal-vent-erupted`, `scar-treated`, and 5 `rgb-*` minigame events.
- **Action Required:** Audit each event: bind to telemetry / audio / UI where intended, or delete the dispatch to avoid useless allocations.

### GAP-AR-05: 4 Permanent Feature Flags in `threeGame.js`
- **Status:** Dead branch debt.
- **Evidence:** `src/threeGame.js`: `FEATURE_WALL_DECALS`, `FEATURE_MULTISHOT`, `FEATURE_MILESTONE_BOSSES`, `FEATURE_WEATHER`.
- **Finding:** All four flags are hardcoded to `true`. Dead `else` branches clutter the engine loop.
- **Action Required:** Remove the flag constants and flatten the code paths to permanent features per repository policy.

### GAP-AR-06: Production Bundle Contaminated by 3,300 Lines of Debug Code
- **Status:** Bundle bloat.
- **Evidence:** `docs/planning/sprint-41-audit-and-roadmap.md` §Track 4.
- **Finding:** `debugConsole.js` (1,452 lines), `debugTileGrid.js` (616 lines), `debugShowroom.js` (606 lines), `debugMuseum.js` (449 lines), `debugBossArenas.js` (213 lines), and `debugCampSimulator.js` (199 lines) are included directly in the production client bundle.
- **Action Required:** Convert debug entry points in `main.js` to dynamic `await import('./debug...')` gated behind `isDevMode`.

---

## 6. Multiplayer, Steam & Backend Gaps

### GAP-MP-01: Co-op Boss Fight Damage and State Desync
- **Status:** **Implemented + automated; hardware acceptance open.**
- **Evidence:** `8da53de`; `src/threeGame.coopTransitions.test.js`.
- **Finding:** The former boss-authority gap is addressed in source: irreversible boss beats, weakpoints, adds, and milestone defeats have one authority and shared replica propagation.
- **Action Required:** Run a packaged host/guest co-op expedition with both logs uploaded. Confirm boss HP/phase/add/milestone agreement before marking accepted.

### GAP-MP-02: Act 2 Descent Multiplayer Global Seed Drift
- **Status:** **Implemented + automated; hardware acceptance open.**
- **Evidence:** `8da53de`; `src/threeGame.coopTransitions.test.js`.
- **Finding:** Act 2 descent now carries an absolute seed offset and expedition index to replica clients rather than relying on each client to mutate its own offset.
- **Action Required:** In the same paired packaged co-op run, record host and guest sector/seed state across Act 2 descent.

### GAP-MP-03: Two-Account Production Co-op Expedition Uncertified
- **Status:** Open acceptance blocker.
- **Evidence:** `PRODUCT_STATE.md:34`; `docs/planning/repository-roadmap.md` Horizon A #2.
- **Finding:** Code for host-authoritative enemy sync, loadout sync, reconnect, and failover exists, but a real test of two physical Steam accounts completing a full expedition on the live relay has not been conducted.
- **Action Required:** Execute and record a full 2-player run using Steam accounts `BUNKER-1` and `RAVEN-7`.

### GAP-MP-04: Steam Backend Production Environment Warnings
- **Status:** Infrastructure compliance risk.
- **Evidence:** Output of `scripts/audit-steam-backend-env.js`.
- **Finding:** Five environment warnings are emitted in non-strict mode:
  1. `missing_publisher_key`: `HB_STEAM_PUBLISHER_KEY` required for live auth/inventory writes.
  2. `missing_session_secret`: `HB_SESSION_SECRET` fallback risks token forgery.
  3. `missing_allowed_origins`: Production CORS currently permits any origin.
  4. `missing_db_storage_path`: Storage path not bound to persistent volume.
  5. `missing_leaderboard_ids`: Missing IDs for `best_run_score`, `daily_ops_score`, `fastest_extraction_ms`, `deepest_depth_score`, `survival_time_seconds`.
- **Action Required:** Populate production environment secrets on Fly.io / Docker Caddy deployment.

### GAP-MP-05: Steam Cloud Two-Machine Conflict Acceptance
- **Status:** Open acceptance blocker.
- **Evidence:** `PRODUCT_STATE.md:41`.
- **Finding:** Save bridge and stat definitions are automated. Physical Machine A &rarr; Machine B &rarr; Machine A round-trip with offline conflict resolution has not been verified.
- **Action Required:** Perform two-machine Cloud sync test in Steam client.

### GAP-MP-06: Cross-Region Public Lobby Discovery Constraint
- **Status:** Open constraint.
- **Evidence:** `PRODUCT_STATE.md:39`.
- **Finding:** Steamworks native binding restricts lobby search to the current download region unless backend relay discovery is enabled.
- **Action Required:** Upgrade native binding or route lobby discovery through `steam.tuesdaycinema.club`.

---

## 7. Testing, Tooling & Documentation Hygiene Gaps

### GAP-TS-01: Playwright E2E Gameplay Boot Helper Failure
- **Status:** High-impact testing blocker.
- **Evidence:** `tests/e2e/helpers.js:120`; `docs/reports/pr65-known-gaps-2026-09-11.md` §1.
- **Finding:** Automated browser gameplay tests (`tests/e2e/enemy-gibs.spec.js`, `tests/e2e/gameplay-aim-cursor.spec.js`) fail at line 120 with `"run-start flow did not reach gameplay"` before running assertions. The boot helper cannot reach gameplay in headless Chrome.
- **Action Required:** Repair `tests/e2e/helpers.js` to wait on the `#canvas-container` ready state and dismiss splash/intro modals reliably.

### GAP-TS-02: 21 Documentation Audit Failures
- **Status:** **Resolved in Sprint 45.1** (`docs/reports/session-log-analysis-2026-09-23-steam-deck-playthrough.md`, `docs/planning/sprint-30.md`, `scripts/audit-docs.js`).
- **Evidence:** Output of `node scripts/audit-docs.js`.
- **Finding:**
  - 19 failures in `docs/reports/session-log-analysis-2026-09-23-steam-deck-playthrough.md` due to non-portable `file:///home/caveman/...` absolute links.
  - `docs/planning/sprint-30.md` referenced outdated branch and version headers.
  - `scripts/audit-docs.js` expected branch was outdated.
- **Remediation Applied:** Converted all non-portable absolute links to relative paths in the session report, aligned sprint-30 planning header to `dev/sprint-45` / `2.4.10-beta`, and bumped expected branch in `scripts/audit-docs.js`. Verified 100% clean audit pass (0 errors).

### GAP-TS-03: 17 Untested Source Modules in `src/`
- **Status:** Unit test coverage gap.
- **Evidence:** `docs/pre-sprint-30-technical-debt-audit-2026-08-24.md` §2.
- **Finding:** While overall test volume is high (3,939 tests across 427 files), modules like `rewardPreview.js`, `enemy3dOverlay.js`, `wandererModal.js`, and `scoutHeroPreview.js` lack colocated test suites.
- **Action Required:** Add unit tests for untested DOM and preview modules.

---

## 8. Prioritized Remediation Action Matrix

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                             PRIORITIZED REMEDIATION ROADMAP                                 │
├───────┬────────────┬─────────────────────────────────────────────────┬──────────────────────┤
│ Pri   │ ID         │ Title / Description                             │ Target Milestone     │
├───────┼────────────┼─────────────────────────────────────────────────┼──────────────────────┤
│ **P0**│ GAP-RN-01  │ Transient effects leak & shockwave reallocations│ [RESOLVED] Sprint 45.1 │
│ **P0**│ GAP-RN-02  │ Invisible collider movement blocks on 3D props  │ [RESOLVED] Sprint 45.1 │
│ **P0**│ GAP-GP-01  │ Steam Deck map dual-polling input conflict      │ [RESOLVED] Sprint 45.1 │
│ **P0**│ GAP-GP-04  │ Post-boss evacuation guidance & return beacon   │ [RESOLVED] Sprint 45 │
│ **P0**│ GAP-GP-07  │ Wire anti-softlock reachability (mazeTiers.js)  │ [RESOLVED] Sprint 45 │
│ **P0**│ GAP-MP-01  │ Co-op boss fight hit & state synchronization    │ Sprint 45.2          │
│ **P0**│ GAP-TS-01  │ Repair Playwright E2E gameplay boot helper      │ Sprint 45.2          │
├───────┼────────────┼─────────────────────────────────────────────────┼──────────────────────┤
│ **P1**│ GAP-GP-02  │ Add secondary attack action set to Steam Input  │ Sprint 46            │
│ **P1**│ GAP-RN-03  │ Route 24 architecture kit GLB models in-world   │ Sprint 46            │
│ **P1**│ GAP-ST-01  │ Author alien hive quest for Tina joined branch  │ Sprint 46            │
│ **P1**│ GAP-ST-02  │ Surface timeline ending locks in run HUD        │ Sprint 46            │
│ **P1**│ GAP-MP-03  │ Two-account physical Steam co-op proof run      │ Sprint 46            │
│ **P1**│ GAP-MP-04  │ Configure Steam backend production env secrets  │ Sprint 46            │
│ **P1**│ GAP-GP-05  │ Clarify chasm pit-fall badges / natural crossing│ Sprint 46            │
├───────┼────────────┼─────────────────────────────────────────────────┼──────────────────────┤
│ **P2**│ GAP-RN-04  │ Expose 21 faction props to room builders        │ Sprint 47            │
│ **P2**│ GAP-RN-05  │ Close 4 theme matrix holes                      │ Sprint 47            │
│ **P2**│ GAP-RN-07  │ Author 4 pending achievement 3D weapon models   │ Sprint 47            │
│ **P2**│ GAP-RN-08  │ Author textured replacement for Talon-C carbine │ Sprint 47            │
│ **P2**│ GAP-GP-08  │ Seed-parameterized crash site spawn area        │ Sprint 47            │
│ **P2**│ GAP-GP-06  │ Implement or retire 9 inert relics              │ Sprint 47            │
│ **P2**│ GAP-AR-06  │ Dynamic import code-splitting for debug tools   │ Sprint 47            │
├───────┼────────────┼─────────────────────────────────────────────────┼──────────────────────┤
│ **P3**│ GAP-AR-01  │ Seam extraction on 36.6k-line threeGame.js      │ Sprint 48+           │
│ **P3**│ GAP-AR-02  │ Delete or connect 11 unwired modules            │ Sprint 48+           │
│ **P3**│ GAP-AR-04  │ Triage 43 orphaned CustomEvents                 │ Sprint 48+           │
│ **P3**│ GAP-AR-05  │ Retire 4 permanent feature flags in threeGame   │ Sprint 48+           │
│ **P3**│ GAP-TS-02  │ Fix 21 documentation audit link failures        │ [RESOLVED] Sprint 45 │
└───────┴────────────┴─────────────────────────────────────────────────┴──────────────────────┘
```

---

### 8.1 Session-derived release actions (added 2026-09-23)

These rows supplement the historical matrix above; their evidence, scope, and non-closure rules are in §9 and the linked session report.

| Pri | ID | Focus | Ticket / acceptance dependency |
| :---: | :--- | :--- | :--- |
| P0 | GAP-RN-10 | Deck frame-pacing trace and measured remediation | #52 |
| P0 | GAP-PV-01 | Align authoritative PvP heart contract (local / relay / replica) | #51 |
| P0 | GAP-PV-04 | Block PvP submissions to generic/PvE-run boards | #51 |
| P1 | GAP-RN-11 | Trace game-over / gameplay-profile transition cost | #52 |
| P1 | GAP-RN-12 | Define and verify a measured Deck quality tier | #52, #53 |
| P1 | GAP-PV-02 | Paired respawn protection/separation test | #51 |
| P1 | GAP-PV-03 | Decide and test PvP Black Box/XP behavior | #51 |
| P1 | GAP-PV-07 | Add paired hit-verdict/attribution telemetry | #51 |
| P1 | GAP-GP-13 | Controller action-set and input-provenance evidence | #53 |
| P2 | GAP-PV-05 | Decide whether PvE cards/missions belong in PvP | #51 |
| P2 | GAP-PV-06 | Reproduce door-event churn before changing protocol | #51 |
| P2 | GAP-TS-04 | Aggregate high-frequency session diagnostics | #86 intake unchanged; future evidence review |
| P3 | GAP-AU-01 | Supply or alias `terminal_deny` | future acceptance |

---

## 9. Findings from the 2026-09-23 Evening Steam Deck PvP Session

Source: [session-log-analysis-2026-09-23-deck-pvp-session.md](session-log-analysis-2026-09-23-deck-pvp-session.md) — packaged `v2.4.11-beta` (`aafe429`), Steam Deck, solo then Steam-lobby PvP. One client's log only. “Observed” below is limited to that client; “traced” cites source behavior; neither closes an acceptance ticket without its specified paired or hardware evidence.

| ID | Pri | Gap | Evidence | Action / ticket state |
| :--- | :---: | :--- | :--- | :--- |
| GAP-RN-10 | P0 | Deck frame pacing remains far below release acceptance; transition/program correlations need a causal trace. | 3,600 retained gameplay intervals: p50 84.7 ms, p95 223.6 ms, p99 519.5 ms, max 4.614 s; 428 PERF diagnostic windows. `shadowMap.enabled` is a shader key, but that is a hypothesis rather than the captured root cause. | Stable shadow-map-key/`autoUpdate` mitigation is implemented and unit-tested; world rendering is suspended during game-over. **#52 remains open pending matched package benchmark.** |
| GAP-RN-11 | P1 | Game-over/gameplay-profile transition has an unmeasured rendering/workload risk. | During game-over, `gameplay` profile and 28 chunks remain present for 11 816–1,679 ms diagnostic windows over ~34 s. | Render-suspension guard and direct show/hide calls are implemented; the real modal/package flow and frame improvement are unverified. **#52 open.** |
| GAP-RN-12 | P1 | Deck quality tier is not yet justified by a successful hardware route. | Adaptive quality reports pixel ratio 0.85, visible-chunk radius 1, shadows enabled, and post-processing enabled. | Set a measured Deck tier and reproduce the fixed route. **#52/#53 open.** |
| GAP-PV-01 | P0 | Local campaign fatigue reaches PvP health. | The captured package enters PvP at 2/2 after solo deaths. Relay, local client, and remote replicas now share four-heart authority (`PVP_DEFAULT_MAX_HP = 4`). | Shared 4-heart contract implemented across `server/relay.js`, `src/threeGame.js`, and unit/integration tests (`server/relayPvPAuthority.test.js`). **#51 partial (paired hardware verification open).** |
| GAP-PV-02 | P1 | Spawn/respawn fairness needs a paired test. | One incoming PvP death, respawn start at (9, 3), and relocation/depenetration occur locally. | A 3.0-second local spawn-invulnerability timer is implemented and unit-tested. Verify relay/peer behavior, collision, and timing in a package. **#51 partial.** |
| GAP-PV-03 | P1 | PvP death can trigger Black Box recovery and objective XP. | Local Black Box recovery occurs about 8 seconds after respawn, then +50 objective XP; `handleDeath` had no PvP guard in the captured build. | Source now skips Black Box recording/marker creation for PvP and has unit coverage for that branch. Verify no recovery/XP path in a package. **#51 partial.** |
| GAP-PV-04 | P0 | PvP submits through generic run leaderboard targets. | PvP score 400 and accepted payload are observed; client/server target builders lack a multiplayer-mode guard. | Excluded on client and rejected with `pvp_run_not_ranked` on server. Unit-tested. **#51 partial (deployed backend check open).** |
| GAP-PV-05 | P2 | PvE missions and run cards appear in PvP. | Mapping objective and `camp_paranoia` cards observed. | Source bypasses PvE missions and run-modifier draws in PvP and hides HUD cards; unit coverage exists. Verify mode entry and UI in a package. **#51 partial.** |
| GAP-PV-06 | P2 | Door-event churn needs reproduction. | Ten door-toggle events in 19 seconds, including repeated remote traffic. | Local sequence/debounce code is implemented and unit-tested; two clients must verify ordering before the protocol is considered fixed. **#51 partial.** |
| GAP-PV-07 | P1 | Outgoing PvP hit result is not observable from the current log. | 21 accepted PvP shots/projectiles; no recipient health, relay verdict, or kill event; `rivalKills` 0. | `pvp-hit-dealt` and `pvp-hit-confirmed` telemetry are implemented. Require a paired log to prove the complete intent → relay → recipient chain. **#51 partial.** |
| GAP-GP-13 | P1 | Deck input provenance cannot certify a controller-only route. | 607 total `fire-input` events use `pointer`; final `lastInputMode` is `keyboard`. A Deck controller is present, but Steam Input can synthesize these events. | Source adds controller/accepted-action provenance, action-set/mode logs, and capture diagnostics. Verify their output on a physical controller-only route. **#53 open.** |
| GAP-TS-04 | P2 | High-frequency diagnostics obscure long-run review. | WEAPON 1,321 + RETICLE 445 + AUDIO 882 = 2,648 / 3,726 entries (71.1%). | Implemented `sessionLogSampler.js` windowed event aggregation for WEAPON, RETICLE, and AUDIO telemetry in `DebugLogger`. Unit-tested. |
| GAP-AU-01 | P3 | `terminal_deny` cue is absent. | `audioMissing` occurs three times. | Aliased `terminal_deny` to `ui_error3` in `src/data/gameAudioAliases.js`. |
