# Sprint 49 Feature Backlog & Hanging Systems

**Status:** Active Sprint Backlog  
**Generated:** 2026-09-30  
**Baseline:** Post-Sprint 48 Milestone (Commit `f0676af3` / `v2.4.12-beta`)  
**Scope:** Actionable gameplay, multiplayer, world, and presentation features (excluding pure QA/verification playthroughs).

---

## 1. Co-op Multiplayer Authority & Networking

- [ ] **Companions in Co-op**: Network recruited companions so position, target acquisition, and fire abilities are host-authoritative and rendered on all peer screens; remove the temporary solo-only gate (`1dd8056`).
- [ ] **Host-Authoritative World Events**: Migrate solo-only Ring 1 events (False Distress Signal, Unstable Vault) to host authority with broadcast rolls and choices.
- [ ] **Host-Authoritative Combat Encounters**: Enforce host authority for the arrival fight, bounty targets, and reward cache split distribution.
- [ ] **Tactical Context Pings v1**: Implement tap-to-ping for enemies, floor spots, items, and environmental hazards with 6-second networked 3D markers.

---

## 2. Companion Systems (Solo & Co-op)

- [ ] **Escort-to-Camp**: Implement mechanic where leading a recruited companion to a safe camp settles them as a permanent base resident with ambient dialogue.
- [ ] **Companion Combat Assist Ability**: Add independent cooldown assist abilities for each companion archetype during combat and breaches.
- [ ] **Companion Pathing Journey Probe**: Build automated regression probe verifying companion follows through three procedural rooms without wall clipping or emergency relocation.

---

## 3. Gameplay, Combat & Narrative Mechanics

- [ ] **Actions Raise Infection Load**: Wire hive interactions, caustic/bio hits, spore fields, and carrying alien eggs to dynamically feed `infectionLoad`.
- [ ] **Formation Damage Multiplier Integration**: Wire the coordinated enemy formation damage multiplier directly into the live combat damage pipeline.
- [ ] **Hive Queen Communion (GAP-ST-01)**: Implement Mayor Tina Hive Queen communion narrative encounter.
- [ ] **Timeline Divergence Warnings (GAP-ST-02)**: Add HUD warnings when operative actions cause narrative branch divergence.
- [ ] **Expanded Expedition Debrief (`src/expeditionReport.js`)**: Surface newly unlocked blueprints, faction reputation shifts, and narrative leads upon extraction or death.

---

## 4. Foundry & Crafting Systems (Slice 2)

- [ ] **Native Hub Panels Restyling**: Restyle the Foundry Hub tabs (Stash, Loadout, Fabricate, Trade-up, Store) using native design tokens and class accents (Scout teal, Tank amber, Engineer brass) instead of legacy embedded frames.
- [ ] **Field Workbench (Invisible Essentials Phase 6)**: Add in-expedition field crafting and repair stations at safe camps.

---

## 5. HUD & Visual Presentation Polish

- [ ] **Tactical Map Radar Ring**: Move the active radar pulse and scan telemetry directly onto the map disc bezel.
- [ ] **Dedicated Dash / Melee Slot**: Style dedicated dock housing slots for dash stamina and melee smash cooldowns on the lower dock arms panel.
- [ ] **Talking Radio Portraits**: Wire animated/static character portraits for AURA, Commander, and Wanderer communications.
- [ ] **Event-Specific Housings**: Add bespoke HUD bezel treatments for boss encounters, critical quarantine breaches, and Queen's Ledger events.
- [ ] **Default HUD Promotion**: Flip `hb_hud_layout` default from `classic` to `dock` following the one-week opt-in hardware comparison.

---

## 6. 3D Art & Character Models (Master Backlog L3/L4)

- [ ] **Achievement 3D Cosmetics**: Model, texture, and wire the 5 missing achievement GLB assets (`chassis_scout_ghost_runner.glb`, `skin_scout_chrono_drifter.glb`, `skin_tank_bunker_bastion.glb`, `skin_engineer_archival_constructor.glb`, `skin_engineer_hive_weaver.glb`).
- [ ] **Key Enemy 3D Meshes**: Convert and wire unique enemy meshes (`sentinel.glb`, `alien_proto_crawler.glb`, `bio_charger.glb`, `boss_corrupted_scout.glb`, `boss_corrupted_tank.glb`, `boss_corrupted_engineer.glb`).

---

## 7. Engine Performance & Draw-Call Optimization

- [ ] **Chunk-Mount Spike Reduction**: Optimize `syncVisibleChunks` to eliminate frame spikes when streaming in complex bunker rooms.
- [ ] **Instanced Pickups and Props**: Batch scrap pickups, props, and ambient debris into `THREE.InstancedMesh` to cut 1,000–2,000 draw calls on PC and Steam Deck.
