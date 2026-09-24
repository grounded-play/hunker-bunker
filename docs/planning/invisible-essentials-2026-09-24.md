# The Invisible Essentials

Status: prioritized implementation plan, grounded in the current `dev/sprint-47` repository. Automated evidence is recorded as automated evidence; physical Deck, packaged co-op, and unfamiliar-player findings remain open until actually observed.

## Product standard

A paying player should be able to start, understand, pause, resume, cooperate, fail, recover, and redeploy without fighting the interface or losing confidence in the game state. These are not additional content counts. They are the reliability and comprehension layer around the content already present.

## Priority order

1. **Respect the interrupted expedition.** Restore a solo expedition’s identity, location, vitals, inventory, build, objective, opened routes, killed enemies, and live enemy damage without duplicating rewards or advancing the campaign.
2. **Expose comfort and pressure controls.** Audit and present reduced pressure, aim assistance, HUD/text scale, subtitle treatment, shake intensity, and remapping as player-facing settings rather than debug affordances.
3. **Make death and continuation legible.** State the cause, strongest build contribution, permanent gains, losses, next useful action, and a direct redeploy route.
4. **Reduce navigation friction.** Clarify reachable objectives and interaction selection; make earned shortcuts a coherent return network with safe preparation points.
5. **Make two-player intent visible.** Add contextual pings, concise commands, shared-objective ownership, reward ownership rules, reconnect recovery, and packaged two-account acceptance.
6. **Put decisions inside expeditions.** Add bounded reroute opportunities—upgrade choice, transformation, or costly respec—that can rescue or redirect a build.
7. **Let the ship remember.** Use a small number of persistent trophies, repairs, companions, and conversations as physical campaign history.
8. **Reward mastery without compulsory grind.** Audit Daily Ops, Depth Contract, achievements, class mastery, hidden synergies, and alternate goals before adding another progression track.

---

## Phase 1 — Solo Expedition Continuation

The first slice is intentionally solo-only. Daily Ops and co-op require separate authority and anti-cheat rules.

### Current Implementation State (Sprint 47)
- **Module**: Built in [src/expeditionSuspend.js](../../src/expeditionSuspend.js) with storage keys `hb_expedition_suspend_v1` and `hb_expedition_resume_claim_v1`.
- **Runtime Hook**: Integrated into [src/threeGame.js](../../src/threeGame.js) (`createExpeditionSuspendSnapshot`, `saveExpeditionSuspend`, `restoreExpeditionSuspend`, and `applySuspendedEnemyState`) and [main.js](../../main.js) title continue button (`#title-continue-btn` label switches to `"RESUME EXPEDITION"` when an active suspend snapshot exists).
- **Test Coverage**: 7 unit/runtime tests passing in [src/expeditionSuspend.test.js](../../src/expeditionSuspend.test.js) and [src/threeGame.expeditionSuspend.test.js](../../src/threeGame.expeditionSuspend.test.js).
- **Automated Probe**: Browser probe in [tests/e2e/probes/expedition-resume.spec.js](../../tests/e2e/probes/expedition-resume.spec.js) proves exact vitals, position, inventory, killed keys, damaged resident enemy state, and non-advancement of campaign generation across page reload.

### Snapshot Contract
- **Identity**: Campaign seed, expedition seed, and expedition index captured without incrementing the deployment.
- **Player State**: Class type, world position `(x, z)`, facing yaw, vitals (`hp`, `maxHp`, `o2`, `maxO2`), weapon clip ammo, weapon clip size, and carried inventory (`health`, `ammo`, `weapon`, `coin`).
- **Run State**: Run start timestamp, elapsed milliseconds, mission state (`type`, `status`, `killCount`, `targetKills`), active modifier, equipped overclock IDs, equipped relic IDs, shard count, deposited resources, kill count, max depth tier reached, current depth tier, and total distance travelled.
- **World State**: Procedural maze persistence state (doors, access, world changes), killed enemy scatter keys set, depleted gear pile keys set, killed milestone bosses set, visited chunk keys set, and living resident enemy array with coordinates, remaining HP, max HP, elite status, speed, and active status effect snapshots.

### Safety Contract
- **Atomic Claim**: Active snapshot is moved from `hb_expedition_suspend_v1` to `hb_expedition_resume_claim_v1` before restoration begins.
- **Crash Immunity**: If restoration crashes mid-flight, the claim remains in storage so the player does not lose their run on launch failure, but only one active copy can ever be claimed (preventing duplication exploits).
- **Generation Monotonicity**: Upon successful restoration, the state is immediately re-persisted as generation `N + 1`.
- **Destruction Invariants**: Stored snapshots and claims are purged upon player death (`handleDeath`), successful extraction (`triggerExtractionSequence`), or explicit New Campaign start.
- **Rejection Criteria**: Malformed payloads, mismatched campaign seeds, co-op sessions (`isMultiplayer`), and fixed-entropy Daily Ops runs are rejected.
- **Black Box Fallback**: The legacy Black Box crash checkpoint (`runCheckpointStore`) is retained only if no full continuation snapshot exists.

---

## Phase 2 — Comfort and Pressure Controls

Accessibility and comfort settings must be first-class, player-facing options in settings menus rather than hidden debug toggles or store-listing promises.

### Current State & Code Audit
- [src/accessibilitySettings.js](../../src/accessibilitySettings.js) provides:
  - Subtitle scale: `small` (0.85×), `medium` (1.0×), `large` (1.25×), `xlarge` (1.55×).
  - Subtitle backdrop: `off`, `dim`, `solid`.
  - Contrast levels: `normal`, `high`, `max` (applied via body classes `.contrast-high`, `.contrast-max`).
- **Gaps Identified**:
  - **Camera Shake**: [src/threeGame.js:26141](../../src/threeGame.js#L26141) triggers unscaled camera shake (`intensity` 0.18, `duration` 0.35). Players prone to motion sickness or vestibular discomfort cannot reduce or disable shake.
  - **Aim Assistance**: Twin-stick controller firing (`main.js`) has no target adhesion or magnet friction. Mouse aiming is 1:1, but controller sticks struggle to track mobile enemies (crawlers and flankers) at 60 fps.
  - **Pressure Mitigation**: No option to reduce atmospheric O₂ depletion rate or telegraph pressure for players with motor or cognitive limitations.
  - **Input Remapping**: Controller bindings in `scripts/build-steam-input-configs.js` are fixed; keyboard/mouse controls in `main.js` lack an in-game remapping modal (`GAP-GP-02`).

### Technical Specification & Architecture
1. **Camera Shake Intensity Control**:
   - Add setting `cameraShakeScale`: `0.0` (Off), `0.25` (Low), `0.5` (Reduced), `1.0` (Normal, Default).
   - In `threeGame.js:triggerCameraShake(intensity, duration)`:
     ```javascript
     const scale = this.settings?.cameraShakeScale ?? 1.0;
     const scaledIntensity = intensity * scale;
     if (scaledIntensity > 0.01) {
         this._cameraShakeIntensity = Math.max(this._cameraShakeIntensity, scaledIntensity);
         this._cameraShakeTimer = Math.max(this._cameraShakeTimer, duration);
         this.traumaManager?.addTrauma(Math.min(1.0, scaledIntensity * 2.2));
     }
     ```
2. **Controller Aim Assistance (Magnetism & Friction)**:
   - Soft-snap cone (±15° arc towards nearest valid hostile within 9.0m).
   - Sticky sensitivity reduction (35% slowdown when crosshair sweeps across an enemy hit-box on controller).
   - Toggle in settings: `aimAssist`: `off`, `low`, `standard`.
3. **Pacing / Reduced Pressure Option**:
   - Setting: `reducedPressure`: `true` / `false`.
   - When enabled: O₂ consumption rate scaled by 0.80×; hostile attack telegraphs lengthened by +20% (`windupMs` scaled in `playTelegraph`).
   - Leaderboard tagging: runs with reduced pressure flag telemetry (`assisted: true`) and post to a separate assisted leaderboard to preserve competitive integrity.

### Acceptance Evidence
- Pure unit tests in `src/accessibilitySettings.test.js` validating schema, storage persistence, and CSS token application.
- Runtime tests in `src/threeGame.accessibility.test.js` asserting camera shake scaling, aim-assist cone math, and telegraph windup adjustments.
- Browser E2E probe verifying settings modal controls and live DOM updates.

---

## Phase 3 — Legible Death and Continuation

Death in a roguelike must teach, orient, and motivate the next attempt instead of displaying arbitrary numbers and dropping the player into disorientation.

### Current State & Code Audit
- On player death, [src/threeGame.js:21196](../../src/threeGame.js#L21196) (`handleDeath`) sets `isPlayerDead = true`, arms the Black Box marker, and records death telemetry.
- Results screen (`#game-over-modal` in [index.html:1409](../../index.html#L1409) and [main.js:5480](../../main.js#L5480)) renders:
  - Header: `"EXOSUIT FAILURE"`.
  - Expedition Report (`#go-expedition-report` from Sprint 46).
  - Stat bars: distance covered, items recovered, generator status, threats eliminated, time elapsed.
- **Gaps Identified**:
  - The lethal damage source (`reason`: e.g. `crawler`, `boss_cybersnail:mortar_volley`, `pit-fall`, `o2-suffocation`) is logged to Black Box but omitted from the death screen.
  - No build attribution: the player is not informed which relic/overclock provided the highest value (e.g. `"Cryo Shatter triggered 3 times, dealing 300 damage"`).
  - Ambiguous asset loss: players cannot distinguish banked resources from dropped salvage awaiting Black Box recovery.
  - No direct redeploy button: requires clicking through results, returning to operator menu, and re-initiating the expedition loop.

### Technical Specification & Architecture
1. **Lethal Cause Presentation**:
   - Extract `deathReason` and map to localized string (`ui.death.cause.*`):
     - Enemy attack: `"Killed by Cybersnail Mortar Volley in Ring 1"`
     - Environmental: `"Life support failure: O₂ Depleted in Sector 2"`
     - Fall: `"Fatal drop: Canyon Pit Fall in Sector 0"`
2. **Build Contribution Highlight**:
   - Runtime tracks `runBuildTelemetry`:
     - Top damage contributor: `{ dropId, totalDamageDealt, activations }`.
     - Defensive contribution: `{ dropId, damageMitigated, vitalsRestored }`.
   - Formatted as: `"BUILD HIGHLIGHT: Cryo Shatter dealt 325 damage across 14 enemies"`.
3. **Clear Resource Accounting**:
   - Distinct columns:
     - **SECURED & BANKED**: Resources committed to the ship's permanent bank before death.
     - **LOST IN FIELD**: Resources dropped at the death site, accompanied by exact map coordinates for Black Box retrieval (`"Black Box beacon armed at [X: 14, Z: -9]"`).
4. **Actionable Next Steps & Instant Redeploy**:
   - Contextual recommendation:
     - If Black Box is active: `"NEXT ACTION: Recover Black Box salvage in Ring 1"`.
     - If ship goal is affordable: `"NEXT ACTION: Ship Hull Expansion ready to build"`.
   - Add `#game-over-redeploy-btn`: One-click button that resets run state and immediately deploys the operator into deployment `N + 1` with the same loadout.

### Acceptance Evidence
- Unit tests in `src/expeditionReport.test.js` validating lethal attribution string extraction and resource partitioning.
- Integration tests in `src/threeGame.deathReport.test.js` verifying build highlight calculations.
- Playwright probe asserting `#game-over-redeploy-btn` skips menu re-entry and reaches active gameplay within 3 seconds.

---

## Phase 4 — Navigation Friction and Return Network

Backtracking through empty cleared corridors creates boredom, while ambiguous world interactions cause fatal input errors under pressure.

### Current State & Code Audit
- Radial compass and loop guidance point towards home or active milestones (`threeGame.js:35328`).
- **Gaps Identified**:
  - **Interactable Cycling Conflict (`GAP-GP-03`)**: When multiple entities (blast door, dropped weapon, salvage terminal, camp console) are within interact reach, the game picks whichever sprite index appeared first, without a cycling prompt.
  - **Backtracking Fatigue (`GAP-GP-04`)**: Once a milestone boss or Ring crossing is cleared, returning to the ship or traveling between biomes requires running through long, empty, desolated corridors while suit O₂ drains continuously.
  - **Chasm Ambiguity (`GAP-GP-05`)**: Impassable canyons were visual dead ends until Lane 3's traversal affordances (Scout vault, Engineer nanite bridge) resolved crossing mechanics; transit connectivity still needs explicit map pathing.

### Technical Specification & Architecture
1. **Interaction Candidate Cycling & Priority**:
   - When candidate count > 1 within `INTERACTION_RADIUS` (1.8m):
     - Display candidate badge: `"INTERACT [F] (1 of 2: Terminal) — [TAB / D-PAD DOWN] Next"`.
     - Default priority order: `Quest/Goal Console > Revive Squadmate > Nanite Bridge > Door > Salvage/Pickup`.
2. **Coherent Return Network (Transit Waypoints)**:
   - Defeating a milestone boss unlocks a **Pneumatic Transit Terminal** at the boss arena.
   - Transit terminals allow instant, safe one-way fast travel directly back to the Crashed Ship Sanctuary, eliminating tedious empty backtracking.
   - Transit is disabled while hostiles are engaged (`hunt` mode within 12m).
3. **Tactical Map Reachability & Breadcrumbs**:
   - Update `src/tacticalMap.js`:
     - Highlight active path to selected objective with subtle floor waypoints.
     - Display nanite bridges, cleared milestone gates, and fast-travel terminals as distinct icons.

### Acceptance Evidence
- Unit tests in `src/interactionCycling.test.js` proving deterministic candidate ordering and input cycling.
- Runtime routing tests verifying fast-travel terminal availability only post-boss defeat and out of combat.
- Browser probe measuring player transit time from Ring 1 outer edge back to ship before vs after transit terminal activation.

---

## Phase 5 — Two-Player Intent and Co-op Reconnect

Co-op play must support non-verbal tactical coordination, fair reward distribution, and fault-tolerant network recovery.

### Current State & Code Audit
- Relay server (`server/relay.js`) coordinates 2-player sessions with host-authoritative boss phases (`src/coopTransitions.js`) and PvP health authority (`server/relayPvPAuthority.test.js`, `GAP-PV-01`).
- **Gaps Identified**:
  - **Non-Verbal Pings**: Players have no way to mark enemies, request help, point out salvage, or coordinate focus fire without voice chat.
  - **Reward Contention**: Pickup meshes (`pickupMeshes`) are consumed by whichever player touches them first, leading to resource hoarding or accidental starvation of squadmates.
  - **Mid-Session Disconnects**: If a guest experiences a transient network drop (Wi-Fi blip, Steam Deck sleep/wake), the connection drops permanently, abandoning the host or crashing the session.

### Technical Specification & Architecture
1. **Contextual Tactical Ping Protocol**:
   - Input: Middle Mouse Click / Controller Left Bumper (tap = context ping, hold = ping wheel).
   - Context detection:
     - Enemy targeted: `PING_TARGET` (red reticle + audio chime, marked for 6s).
     - Floor targeted: `PING_MOVE` (cyan waypoint icon).
     - Resource targeted: `PING_ITEM` (gold diamond).
     - Chasm/Door targeted: `PING_INTERACT` (yellow hazard).
   - Replicated via `COOP_TRANSITION_EVENTS.TACTICAL_PING` through `src/coopTransitions.js`.
2. **Co-op Resource Equity**:
   - Salvage pickups (Tech, Med, Coin) grant +100% value to the collecting player and +50% shared bonus to the squadmate.
   - In-run weapon drops and relics spawn as distinct instanced choices for each player, preventing ninja-looting.
3. **Session Reconnect Handshake**:
   - Host stores rolling session journal (`coopSessionState`: host sequence, guest loadout, current sector, alive/downed status).
   - When a dropped client reconnects with valid `roomCode` and matching `steamId64`:
     - Relay validates credentials and pauses world hostile simulation for up to 15 seconds.
     - Host transmits catch-up snapshot (`COOP_RECONNECT_RESTORE`).
     - Guest reconstructs local scene without terminating the run.

### Acceptance Evidence
- Multi-client virtual relay tests in `server/relayPing.test.js` validating ping latency and replication.
- Shared loot distribution tests confirming equitable resource credit.
- Automated drop-and-reconnect test simulating 5-second socket disconnection and successful continuation.

---

## Phase 6 — In-Expedition Build Decisions

Expeditions must offer meaningful mid-run adaptation choices rather than locking players into rigid pre-run loadouts that may become obsolete against rolled conditions.

### Current State & Code Audit
- Loadouts (`runOverclocks`, `runRelics`) are equipped at run start.
- Reward caches (Sprint 47 Lane 3) provide high-stakes additions, but players cannot swap out conflicting items or fix build misalignments.
- If a player enters a Cold condition with weapon mods tailored for pure Bio corrosion, they have no in-run mechanism to adapt.

### Technical Specification & Architecture
1. **Field Recalibration Workbench**:
   - Friendly camps in Ring 1 feature a **Field Recalibration Station**.
   - Interaction choice:
     - **Refactor Mod**: Pay 5 Tech Salvage to exchange one equipped overclock for an alternative choice from the same tier.
     - **Overclock Tune**: Pay 3 Core Shards to boost an equipped overclock's primary stat by +20% for the remainder of the run.
2. **Emergency Purge & Respec**:
   - At high crisis (vitals critical, low O₂), the player can trigger an **Emergency Venting**:
     - Purges all active debuffs and overclock penalties for 45 seconds at the permanent cost of 1 heart container max HP.
3. **Synergy Component Discovery**:
   - Terminal journals hint at active synergies (`SYNERGY_DEFINITIONS`) when the player carries 1 of 2 required components, providing clear build goals.

### Acceptance Evidence
- Pure state transition tests in `src/runDrops.test.js` verifying mod swapping and salvage deductions.
- Invariant tests ensuring total equipped drop counts never exceed inventory limits during refactoring.

---

## Phase 7 — Physical Ship Memory & Campaign Artifacts

The crashed ship sanctuary must visibly evolve with campaign accomplishments, transforming from a barren wreck into a living headquarters.

### Current State & Code Audit
- The ship interior (`mesh_ship_interior`) mounts functional modules (O₂ bubble, radar, compressor, hull expansion) when built through the terminal.
- Quests and encounters (e.g. scientist befriended snail, rescued survivors from `false_distress`) alter game flags but leave no visible presence in the sanctuary.

### Technical Specification & Architecture
1. **Physical Boss Trophies**:
   - Three dedicated display pedestals in the ship engineering bay:
     - **Queen Stinger**: Mounted upon Queen defeat in Sector Zero.
     - **Cybersnail Armored Carapace**: Mounted upon Cybersnail milestone clear.
     - **Cryosnail Frost Core**: Mounted upon Cryosnail milestone clear (radiates subtle cold vapor particles).
2. **Rescued Survivor & Companion Quarters**:
   - Befriended snails (`snail_befriended`) wander a small, fenced bioactive pen in the ship medical bay with interactive pet/inspect animations.
   - Rescued human operators from `false_distress` events appear resting in bunks, offering unique dialogue lines between deployments.
3. **Campaign Memorial & Expedition Logbook**:
   - Physical terminal near the airlock displays the chronological campaign log:
     - Date/time, operator class, condition survived, bounty met, cause of death (if lost), and salvage retrieved.

### Acceptance Evidence
- Mesh attachment tests in `src/threeGame.shipInterior.test.js` verifying trophy and NPC visibility conditioned on campaign world state.
- Serialization tests proving trophy flags survive save/load cycles without state corruption.

---

## Phase 8 — Mastery Without Compulsory Grind

High-level mastery must celebrate skill, depth, and creative execution rather than demanding mindless repetitive grinding.

### Current State & Code Audit
- Daily Ops exists with calendar-based seeding, but lacks transparent modifier schedules and scoring telemetry.
- Depth Contract (`src/depthContract.js`) tracks depth tiers, but progression rewards are predominantly raw shell payouts.
- Steam achievements (`src/data/steamItemCatalog.js`, `src/steamAchievements.js`) cover 34 milestones, but several lack visible in-game progression meters.

### Technical Specification & Architecture
1. **Daily Ops Deterministic Schedule**:
   - 7-day rolling rotation with authored modifier pairs (e.g. `Blackout + Spore Bloom`, `Subzero + Fast Hostiles`).
   - Standardized scoring formula: `Score = (Depth × 1000) + (Enemies Killed × 50) + (Salvage Banked × 20) - (Damage Taken × 10) - (Elapsed Seconds × 2)`.
   - Score breakdown presented legibly upon extraction or death.
2. **Class Mastery Badges & Visual Accolades**:
   - Author 3 distinct mastery ranks per class (Scout, Tank, Engineer):
     - **Rank I**: Clear Ring 1 with zero downs.
     - **Rank II**: Defeat a milestone boss using only class melee and synergy explosions.
     - **Rank III**: Complete a full expedition under a severe condition without taking health damage.
   - Rewards: Exclusive cosmetic suit tint palettes and title banners; zero stat inflation.
3. **Achievement Tracking HUD Integration**:
   - Unlocked achievements display real-time progress bars in the pause menu (e.g., `"Snail Whisperer: 2/3 Species Befriended"`).

### Acceptance Evidence
- Deterministic calendar rotation unit tests ensuring identical seeds produce identical modifier schedules across all timezones.
- Score formula validation tests ensuring deterministic score outputs.
- Achievement catalog audit verifying 100% parity between Steam backend defs and in-game tracking triggers.

---

## Acceptance Standards & Evidence Ledger

Every phase must satisfy three strict tiers of evidence before it is considered production-ready:

1. **Automated Unit & State Invariant Tests**: Pure modules must have 100% branch coverage on state transitions, corruption handling, and arithmetic boundaries.
2. **Deterministic Scripted Probes**: Headless browser probes must simulate the full interaction lifecycle (before, action, after) and capture raw telemetry and screenshots.
3. **Physical Hardware & Human Observation Gates**:
   - **Steam Deck**: Verified at 60 fps / 15W TDP with readable HUD at 1280×800.
   - **Packaged Co-op**: Two separate Steam accounts playing across real network sockets without desync.
   - **Unfamiliar Player Playtests**: Human playtest observation tracking time-to-comprehension, backtrack friction, and voluntary redeploy rates. *Automated tests must never be substituted for human observation.*
