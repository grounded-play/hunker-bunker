# Sprint 29 Master Plan & Work Lanes

**Sprint Version Target:** `v2.3.1-beta`  
**Active Development Branch:** `dev/sprint-29`  
**Base Release:** `v2.3.0-beta` (Commit `030a8f9` on `mothership`)  
**Sprint Focus:** 3D Biomechanical Generation Pipeline, Wanderer Quest Progression, Combat Juice & Stagger Tuning, Deck Performance, Multi-Account Steam Verification

---

## 1. Executive Summary & Starting Baseline

Sprint 29 builds upon the major milestone delivered in Sprint 28 (`v2.3.0-beta`), where 46 runtime 3D models, dynamic Armory class backgrounds, the Wanderer companion system, Steam Deck twin-stick aiming, and mid-run crash recovery were merged to `mothership`.

The baseline starting into Sprint 29:
- **Test Suite:** 2,031 passing tests across 246 files (98.57% statement coverage).
- **Public Assets:** 2,690 MB retail payload verified within the 2,700 MiB budget.
- **Steam Backend:** Self-hosted production auth and relay active at `steam.tuesdaycinema.club`.
- **System Version:** `v2.3.1-beta` initialized in `package.json` and `index.html`.

---

## 2. Work Lanes & Deliverables

### 🧱 Lane A: 3D Asset Production & Catalog Integration
- **Aesthetic Constitution:** Enforce Dark H.R. Giger × Event Horizon styling established in [docs/3d-asset-master-backlog-and-prompts.md](file:///home/caveman/Desktop/icecave/hunker-bunker/docs/3d-asset-master-backlog-and-prompts.md).
- **Missing Achievement 3D Assets:** Generate/convert and wire the remaining 5 achievement cosmetics:
  1. `chassis_scout_ghost_runner.glb` (Itemdef 5001)
  2. `skin_scout_chrono_drifter.glb` (Itemdef 5002)
  3. `skin_tank_bunker_bastion.glb` (Itemdef 5006)
  4. `skin_engineer_archival_constructor.glb` (Itemdef 5009)
  5. `skin_engineer_hive_weaver.glb` (Itemdef 5010)
- **Enemy & Boss Variants:** Generate key missing combatant meshes (`sentinel.glb`, `alien_proto_crawler.glb`, `bio_charger.glb`, `boss_corrupted_scout.glb`, `boss_corrupted_tank.glb`, `boss_corrupted_engineer.glb`).

### 🧭 Lane B: Wanderer Companion System Expansion
- **Quest Progression Loops:** Expand interactive quest tracking for all 6 archetype families (`scout_cartographer`, `scout_courier`, `tank_old_iron`, `tank_gentle_titan`, `engineer_chen`, `engineer_exodus`).
- **Companion AI Behavior:** Polish follower positioning, combat assist cadence, and audio-visual cues when companion abilities trigger.
- **Save State Durability:** Verify companion loyalty and quest progress across mid-run checkpoints and sector transitions.

### ⚔️ Lane C: Combat Feel, Stagger & Depth Escalation
- **Enemy Stagger Feedback:** Refine stagger animation states, hit-stop frames, and audio callouts on heavy weapon impacts.
- **Depth Contract Tuning:** Balance salvage yield multipliers against increased director spawn aggression in Rings 3+.
- **Relic Synergy Validation:** Verify edge cases across the 8 transformative relics (e.g. `Queen's Milk` + `Last Breath` low-O2 builds).

### 🎮 Lane D: Steam Deck Pacing & GPU Optimization
- **Frame Pacing Audit:** Profile packaged Linux/Deck builds using `frameProfiler.js` and `gpuFrameTimer.js` targeting rock-solid 60 FPS in dense rooms.
- **Texture Memory Tiering:** Evaluate KTX2 / Basis compression for large texture sets to keep VRAM footprints well within budget.
- **Controller Feedback:** Fine-tune stick sensitivity, deadzones, and haptic triggers for the twin-stick aiming profile.

### 🌐 Lane E: Multiplayer & Production Steam Certification
- **Two-Account Acceptance:** Complete an end-to-end co-op run with two physical Steam accounts across the production relay.
- **Lobby Resiliency:** Verify invitation handling from desktop notifications, cold-starts (`+connect_lobby`), and graceful host migration during boss phases.

---

## 3. Sprint 29 Verification Checklist

- [ ] `npm run lint` passes with 0 errors / 0 warnings.
- [ ] `npm run presubmit` validates all asset checksums, audio files, and catalog ItemDefs.
- [ ] `npm run audit:dependencies` reports 0 unused or unmapped dependencies.
- [ ] `npm run build` succeeds and confirms clean asset bundling.
- [ ] `npm run coverage` maintains >98% statement coverage.
- [ ] Packaged Electron builds for Linux and Windows succeed with unpacked 3D models.
- [ ] Versioning documented and updated across all release tracking ledgers.
