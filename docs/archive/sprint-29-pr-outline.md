# Sprint 29 PR Outline

**Status:** Historical — archived during Sprint 30 cleanup on 2026-08-24  
**Original location:** `/PR_OUTLINE.md`  
**Branch context at creation:** `dev/sprint-29`  
**Target version at creation:** `v2.3.1-beta`  
**Base release:** `v2.3.0-beta` (`030a8f9` on `mothership`)

> This file is preserved as a point-in-time Sprint 29 planning artifact. Its unchecked boxes are not current product truth. Use `PRODUCT_STATE.md`, `docs/repo-roadmap.md`, and the active sprint plan instead.

---

## 1. Overview & Objectives

Sprint 29 advances Hunker Bunker on the `dev/sprint-29` branch, delivering `v2.3.1-beta` feature iterations, performance tuning, asset pipeline follow-through, and multi-account Steam certification.

### Key Focus Areas
1. **3D Biomechanical Model Pipeline:** Generating and integrating missing enemy, boss, and cosmetic meshes from `docs/3d-asset-master-backlog-and-prompts.md`.
2. **Wanderer Companion Questlines:** Expanding dialogue trees, quest triggers, and reward loops for the 6 crash-site Wanderer archetypes.
3. **Combat Feel & Depth Contract Tuning:** Polishing stagger feedback, hit reactions, salvage reward curves, and outer sector director aggression.
4. **Steam Deck Pacing & GPU Optimization:** Profiling frame pacing on packaged builds and testing texture memory compression.
5. **Steam Lobby Multi-Account Acceptance:** Executing full 2-account co-op certification on production backend services.

---

## 2. Sprint 29 Living Work Checklist

### 3D Assets & Catalog Integration
- [ ] Implement and wire the 5 missing achievement 3D models (`chassis_scout_ghost_runner.glb`, `skin_scout_chrono_drifter.glb`, `skin_tank_bunker_bastion.glb`, `skin_engineer_archival_constructor.glb`, `skin_engineer_hive_weaver.glb`).
- [ ] Convert/generate key enemy meshes (`sentinel.glb`, `alien_proto_crawler.glb`, `bio_charger.glb`, `boss_corrupted_scout.glb`, `boss_corrupted_tank.glb`, `boss_corrupted_engineer.glb`).
- [ ] Register new models in `world3dOverlay.js`, `enemy3dOverlay.js`, and `armoryScene.js`.

### Wanderers & Companions
- [ ] Expand quest objectives for all 6 Wanderer archetypes in `src/wandererSystem.js`.
- [ ] Add distinct companion voice/SFX callouts on combat assist actions.
- [ ] Unit tests for multi-stage companion progression.

### Steam Deck & Performance
- [ ] Run packaged Electron profiling for 60 FPS frame pacing.
- [ ] Benchmark memory footprint under dense room spawns with `gpuMemoryBudget.js`.
- [ ] Verify right stick menu navigation and twin-stick aiming ergonomics.

### Multiplayer & Steam Certification
- [ ] Perform two-account co-op expedition on production backend (`steam.tuesdaycinema.club`).
- [ ] Verify invitation handling from desktop notifications and cold-start URLs.

---

## 3. Reference Documents
- **Versioning Strategy & History:** `docs/versioning-and-release-roadmap.md`
- **Sprint 29 Master Plan:** `docs/sprint29plan.md`
- **3D Asset Backlog & Prompt Bible:** `docs/3d-asset-master-backlog-and-prompts.md`
- **Product Truth Table:** `PRODUCT_STATE.md`
