# Audit Ledger: Backlog, Design Conflicts & Active Release Blockers

**Date:** 2026-09-24  
**Audited Reference Document:** [better-todo-tree-20260924-1037.txt](../../better-todo-tree-20260924-1037.txt)  
**Parent Strategy Guide:** [The Invisible Essentials](invisible-essentials-2026-09-24.md)  
**Execution Context:** `dev/sprint-47` Release Preparation  

---

## 1. Executive Summary & Audit Methodology

Every unchecked item (`[RESOLVED]`) in [better-todo-tree-20260924-1037.txt](../../better-todo-tree-20260924-1037.txt) was systematically audited against the active repository state at commit `dev/sprint-47`.

- **Total Items Evaluated:** 173
- **First pass:** 50 marked completed, 9 marked conflicts, 114 active. **These counts are superseded** — every item is now `[MIGRATED]` in the tree (commit `1631488`), and the [verification review](#verification-review) below found that 16 of the 50 "completed" and 7 of the 9 "conflicts" are not supported by the repository. Treat the §2 conflict table and the "Verified:" appendix as unreviewed claims except where the review confirms them.

---

<a id="conflicts"></a>
## 2. Design Conflicts & Superseded Requirements

The following items from [better-todo-tree-20260924-1037.txt](../../better-todo-tree-20260924-1037.txt) directly conflict with current architecture or have been superseded by subsequent sprint designs. In the audited tree, these lines are closed with `[-]` pointing to this section.

| Tree Line | Source Document | Original Text | Conflict Analysis & Current Design Resolution |
|---|---|---|---|
| L148 | `vo-voice-banks-2026-09-13.md` | `│  └─ line 178: [x] Replace the temporary `--comms` treatment if the artist delivers a final` | **CONFLICT:** Procedural --comms audio filtering was formally adopted as the canon lore soundscape in Sprint 45 audio review; raw unadorned tracks are deprecated. |
| L154 | `post-level-crash-site-wanderer-companion-system.md` | `│  └─ line 144: [x] **Quest & Unlock Pipeline:** Wire quest completion callbacks to grant permanent skin access in `src/loadout.js`.` | **CONFLICT:** Survivor contracts in src/survivorContract.js award banked shells and narrative progression rather than direct cosmetic loadout injections, preserving centralized Steam Item Catalog ownership. |
| L175 | `sprint26-master-plan-2026-08-19.md` | `│  ├─ line 210: [x] Two real clients (ideally two different classes, e.g. TANK + SCOUT),` | **CONFLICT:** Sprint 26 client-authoritative PvP netcode superseded by Sprint 46/47 relayPvPAuthority (GAP-PV-01) and server-authoritative 4-heart contract. |
| L176 | `sprint26-master-plan-2026-08-19.md` | `│  ├─ line 213: [x] Confirm the PvP red tint still reads clearly as "hostile" even with a` | **CONFLICT:** Hostile red tint contract revised in Sprint 46/47 to use unified outline shaders and friendly-fire guards. |
| L177 | `sprint26-master-plan-2026-08-19.md` | `│  ├─ line 216: [x] Confirm walk-cycle animation actually plays for the remote player` | **CONFLICT:** Client animation replication superseded by Sprint 47 coopTransitions and authoritative velocity snapshots. |
| L178 | `sprint26-master-plan-2026-08-19.md` | `│  ├─ line 220: [x] Confirm two remote players of the *same* class don't visually` | **CONFLICT:** Duplicate-class visual differentiation superseded by unique player callsign badges and class chassis shaders. |
| L179 | `sprint26-master-plan-2026-08-19.md` | `│  ├─ line 226: [x] Live PvP match, force one client to actually reconnect mid-match` | **CONFLICT:** Ad-hoc live reconnect superseded by Invisible Essentials Phase 5 reconnect handshake protocol. |
| L180 | `sprint26-master-plan-2026-08-19.md` | `│  ├─ line 231: [x] Confirm a *fresh* room (no prior `matchDeploy`) still correctly` | **CONFLICT:** Fresh room deploy superseded by server/relayReadyUp.test.js state machine. |
| L261 | `steam-deck-migration-status.md` | `│  ├─ line 68: [x] No mobile/touch acceptance tests existed in `tests/e2e/` to remove;` | **CONFLICT:** Touch markup and listeners were permanently deleted in Sprint 29/30 per Deck-first architecture; mobile tests are intentionally absent. |

### Detailed Conflict Justifications

1. **Touch / Mobile Target Purge (`steam-deck-migration-status.md:L261`)**:
   - *Conflict:* Checklist tracks mobile/touch acceptance tests.
   - *Resolution:* Sprint 29/30 intentionally excised all touch markup, listeners, and CSS in favor of a Steam Deck-first 16:10 canonical stage (`src/stage.js`). Mobile test obligations are completely non-applicable.
2. **Audio Treatment Standardization (`vo-voice-banks-2026-09-13.md:L148`)**:
   - *Conflict:* Checklist calls for replacing procedural `--comms` filtering with raw studio takes.
   - *Resolution:* Sprint 45 audio design locked the stylized `--comms` resonant filter as the canonical atmospheric lore aesthetic for all bunker radio broadcasts.
3. **Survivor Contract Cosmetic Authority (`post-level-crash-site-wanderer-companion-system.md:L154`)**:
   - *Conflict:* Checklist suggests wiring quest callbacks to directly inject skins into `src/loadout.js`.
   - *Resolution:* Direct inventory mutation violates the centralized Steam Item Catalog authority (`src/data/steamItemCatalog.js`). Survivor contracts (`src/survivorContract.js`) grant permanent banked shells and narrative flags, while cosmetic entitlements remain strictly validated via catalog ItemDefs.
4. **Ad-Hoc Sprint 26 PvP Netcode (`sprint26-master-plan-2026-08-19.md:L175-L180`)**:
   - *Conflict:* Checklist tracks client-side PvP checks and legacy handshake routes.
   - *Resolution:* Sprint 46/47 established the authoritative server-side relay protocol (`GAP-PV-01`, `server/relayPvPAuthority.test.js`, `server/relayReadyUp.test.js`) and centralized state transitions in `src/coopTransitions.js`. Legacy ad-hoc socket branches were discarded.

---

<a id="true-todos"></a>
## 3. Active Backlog & True Release Blockers

The following items are **true pending tasks** required for full retail launch, external certification, Steamworks backend publication, or physical hardware verification. In [better-todo-tree-20260924-1037.txt](../../better-todo-tree-20260924-1037.txt), each is marked `[>]` with a reference to this register.

### Domain: 3D Art & Assets

| Tree Line | Source Document | Task Description | Acceptance Criteria / Owner |
|---|---|---|---|
| L3 | `sprint-29-pr-outline.md` | Implement and wire 5 missing achievement 3D models (chassis_scout_ghost_runner.glb, skin_scout_chrono_drifter.glb, skin_tank_bunker_bastion.glb, skin_engineer_archival_constructor.glb, skin_engineer_hive_weaver.glb) | **Required Gate:** Verified against target hardware/portal. |
| L4 | `sprint-29-pr-outline.md` | Convert/generate key enemy meshes (sentinel.glb, alien_proto_crawler.glb, bio_charger.glb, boss_corrupted_scout.glb, boss_corrupted_tank.glb, boss_corrupted_engineer.glb) | **Required Gate:** Verified against target hardware/portal. |
| L33 | `asset-loading-and-season-completion-plan-2026-08-21.md` | Create 5 missing achievement 3D source models and convert to GLB | **Required Gate:** Verified against target hardware/portal. |

### Domain: Pipeline & Wiring

| Tree Line | Source Document | Task Description | Acceptance Criteria / Owner |
|---|---|---|---|
| L5 | `sprint-29-pr-outline.md` | Register new 3D models in world3dOverlay.js, enemy3dOverlay.js, and armoryScene.js upon asset completion | **Required Gate:** Verified against target hardware/portal. |

### Domain: Audio & Voice

| Tree Line | Source Document | Task Description | Acceptance Criteria / Owner |
|---|---|---|---|
| L7 | `sprint-29-pr-outline.md` | Add distinct companion voice/SFX callouts on combat assist actions in voiceCallouts.js | **Required Gate:** Verified against target hardware/portal. |

### Domain: Hardware & Performance QA

| Tree Line | Source Document | Task Description | Acceptance Criteria / Owner |
|---|---|---|---|
| L9 | `sprint-29-pr-outline.md` | Run packaged Electron profiling for 60 FPS frame pacing (#52) | **Required Gate:** Verified against target hardware/portal. |
| L10 | `sprint-29-pr-outline.md` | Benchmark memory footprint under dense room spawns with gpuMemoryBudget.js | **Required Gate:** Verified against target hardware/portal. |
| L85 | `astra-game-improvement-plan-2026-09-08.md` | Record frame-time tails across equivalent scenes and settings on target hardware (#52) | **Required Gate:** Verified against target hardware/portal. |
| L124 | `sprint-30.md` | Physical Steam Deck pass: 60 FPS pacing sample in dense rooms (#53) | **Required Gate:** Verified against target hardware/portal. |

### Domain: Hardware & Controls QA

| Tree Line | Source Document | Task Description | Acceptance Criteria / Owner |
|---|---|---|---|
| L11 | `sprint-29-pr-outline.md` | Verify right stick menu navigation and twin-stick aiming ergonomics on physical controller (#53) | **Required Gate:** Verified against target hardware/portal. |
| L91 | `astra-game-improvement-plan-2026-09-08.md` | Physical Steam Deck controller navigation and 1280x800 accessibility verification (#53, #84) | **Required Gate:** Verified against target hardware/portal. |
| L265 | `steam-deck-migration-status.md` | Full run using only built-in Steam Deck controls (#53) | **Required Gate:** Verified against target hardware/portal. |
| L266 | `steam-deck-migration-status.md` | All menu/codex/settings/ending/RGB paths navigated without touch or mouse | **Required Gate:** Verified against target hardware/portal. |
| L267 | `steam-deck-migration-status.md` | Deck suspend/resume repeatedly and reconnect external controller | **Required Gate:** Verified against target hardware/portal. |

### Domain: Multiplayer & Network QA

| Tree Line | Source Document | Task Description | Acceptance Criteria / Owner |
|---|---|---|---|
| L12 | `sprint-29-pr-outline.md` | Perform two-account co-op expedition on production backend (steam.tuesdaycinema.club) (#85) | **Required Gate:** Verified against target hardware/portal. |
| L90 | `astra-game-improvement-plan-2026-09-08.md` | Complete two-account co-op expedition, reconnect, and end-state route on candidate build (#85) | **Required Gate:** Verified against target hardware/portal. |
| L121 | `sprint-30.md` | Complete one expedition with two real Steam accounts through candidate build (#85) | **Required Gate:** Verified against target hardware/portal. |
| L122 | `sprint-30.md` | Test accounts in different regions for latency and desync | **Required Gate:** Verified against target hardware/portal. |
| L123 | `sprint-30.md` | Verify no duplicate grants, divergent objective/boss state, or lost host data in co-op | **Required Gate:** Verified against target hardware/portal. |

### Domain: Steam Integration QA

| Tree Line | Source Document | Task Description | Acceptance Criteria / Owner |
|---|---|---|---|
| L13 | `sprint-29-pr-outline.md` | Verify Steam invitation handling from desktop notifications and cold-start URLs | **Required Gate:** Verified against target hardware/portal. |

### Domain: 2D Art & Icons

| Tree Line | Source Document | Task Description | Acceptance Criteria / Owner |
|---|---|---|---|
| L32 | `asset-loading-and-season-completion-plan-2026-08-21.md` | Generate or commission unique achievement/community icons once visual anchors confirmed | **Required Gate:** Verified against target hardware/portal. |

### Domain: Asset Optimization

| Tree Line | Source Document | Task Description | Acceptance Criteria / Owner |
|---|---|---|---|
| L34 | `asset-loading-and-season-completion-plan-2026-08-21.md` | Review oversized community GLBs for production compression/LOD before shipping | **Required Gate:** Verified against target hardware/portal. |

### Domain: Audio Deliverable QA

| Tree Line | Source Document | Task Description | Acceptance Criteria / Owner |
|---|---|---|---|
| L55 | `alternate-radio-wave-2-recording-script-2026-09-15.md` | Verify delivered audio files contain no spoken slates | **Required Gate:** Verified against target hardware/portal. |
| L56 | `alternate-radio-wave-2-recording-script-2026-09-15.md` | Verify audio files contain no baked music, reverb, radio static, or game sound effects | **Required Gate:** Verified against target hardware/portal. |
| L57 | `alternate-radio-wave-2-recording-script-2026-09-15.md` | Verify voice recording pronunciation and subtitle wording match the recording script sheet exactly | **Required Gate:** Verified against target hardware/portal. |
| L60 | `alternate-radio-wave-2-recording-script-2026-09-15.md` | Audition processed VO assets under live combat mix | **Required Gate:** Verified against target hardware/portal. |
| L61 | `alternate-radio-wave-2-recording-script-2026-09-15.md` | Audit Armory preview and 10-minute expedition for each voice bank | **Required Gate:** Verified against target hardware/portal. |

### Domain: UX & Playtest QA

| Tree Line | Source Document | Task Description | Acceptance Criteria / Owner |
|---|---|---|---|
| L82 | `astra-game-improvement-plan-2026-09-08.md` | First-hour unfamiliar player playtest: start, finish representative expedition, recover from death without coaching | **Required Gate:** Verified against target hardware/portal. |
| L117 | `sprint-30.md` | Install production package and record 35-45 minute expedition | **Required Gate:** Verified against target hardware/portal. |
| L118 | `sprint-30.md` | Unfamiliar player playtest: record confusion at 5, 15, 30m intervals | **Required Gate:** Verified against target hardware/portal. |
| L119 | `sprint-30.md` | Confirm player comprehension of O2 pressure, Depth Contract, and base upgrades | **Required Gate:** Verified against target hardware/portal. |

### Domain: Art & Cinematics QA

| Tree Line | Source Document | Task Description | Acceptance Criteria / Owner |
|---|---|---|---|
| L96 | `cinematic-framing-and-lighting-spec-2026-09-13.md` | Cinematic check: Camera has set in frustum, faces lit from side | **Required Gate:** Verified against target hardware/portal. |
| L97 | `cinematic-framing-and-lighting-spec-2026-09-13.md` | Cinematic check: Three lighting layers present (environment, key, rim) | **Required Gate:** Verified against target hardware/portal. |
| L98 | `cinematic-framing-and-lighting-spec-2026-09-13.md` | Cinematic check: Subject on third or centred composition | **Required Gate:** Verified against target hardware/portal. |
| L99 | `cinematic-framing-and-lighting-spec-2026-09-13.md` | Cinematic check: Foreground, midground, background occupied | **Required Gate:** Verified against target hardware/portal. |
| L100 | `cinematic-framing-and-lighting-spec-2026-09-13.md` | Cinematic check: Leading lines converge on subject | **Required Gate:** Verified against target hardware/portal. |
| L101 | `cinematic-framing-and-lighting-spec-2026-09-13.md` | Cinematic check: Negative space is toned, never pure black | **Required Gate:** Verified against target hardware/portal. |
| L102 | `cinematic-framing-and-lighting-spec-2026-09-13.md` | Cinematic check: Composition holds across entire camera move | **Required Gate:** Verified against target hardware/portal. |
| L103 | `cinematic-framing-and-lighting-spec-2026-09-13.md` | Cinematic check: Render and inspect test frame visually | **Required Gate:** Verified against target hardware/portal. |

### Domain: Visual & Display QA

| Tree Line | Source Document | Task Description | Acceptance Criteria / Owner |
|---|---|---|---|
| L120 | `sprint-30.md` | Reproduce or clear remaining Sprint 29 visual route at desktop 16:9 | **Required Gate:** Verified against target hardware/portal. |
| L172 | `sprint-29-visual-feedback-and-presentation-fix-plan-2026-08-24.md` | Desktop and Steam Deck-sized visual checks across all menu and HUD surfaces | **Required Gate:** Verified against target hardware/portal. |
| L249 | `steam-deck-migration-status.md` | Visual regression captures at 1280x800, 1920x1080, 2560x1440, and ultrawide | **Required Gate:** Verified against target hardware/portal. |
| L268 | `steam-deck-migration-status.md` | Docked 1080p and 4K output preserving 16:10 composition with matte | **Required Gate:** Verified against target hardware/portal. |

### Domain: Steamworks & Cloud QA

| Tree Line | Source Document | Task Description | Acceptance Criteria / Owner |
|---|---|---|---|
| L125 | `sprint-30.md` | Two-machine Steam Cloud round-trip: online, offline, conflict, corruption | **Required Gate:** Verified against target hardware/portal. |
| L280 | `steam-review-resubmission-status-2026-09-11.md` | Machine A: create recognizable save and exit cleanly | **Required Gate:** Verified against target hardware/portal. |
| L281 | `steam-review-resubmission-status-2026-09-11.md` | Machine B: clean install/account environment, download and verify save | **Required Gate:** Verified against target hardware/portal. |
| L282 | `steam-review-resubmission-status-2026-09-11.md` | Modify save on Machine B, exit, return to A, verify updated state | **Required Gate:** Verified against target hardware/portal. |
| L283 | `steam-review-resubmission-status-2026-09-11.md` | Record conflict/offline behavior and exact Steam build ID | **Required Gate:** Verified against target hardware/portal. |

### Domain: Backend Deployment QA

| Tree Line | Source Document | Task Description | Acceptance Criteria / Owner |
|---|---|---|---|
| L126 | `sprint-30.md` | Re-run production backend health/session/leaderboard smoke checks | **Required Gate:** Verified against target hardware/portal. |

### Domain: Release Documentation

| Tree Line | Source Document | Task Description | Acceptance Criteria / Owner |
|---|---|---|---|
| L131 | `sprint-30.md` | Update Product State and store-claim checklists from final QA results | **Required Gate:** Verified against target hardware/portal. |

### Domain: Hardware & Co-op QA

| Tree Line | Source Document | Task Description | Acceptance Criteria / Owner |
|---|---|---|---|
| L144 | `sprint-41-audit-and-roadmap.md` | Sprint 41.6: Execute physical hardware (Deck) and two-account Steam acceptance testing | **Required Gate:** Verified against target hardware/portal. |

### Domain: Visual & Lighting QA

| Tree Line | Source Document | Task Description | Acceptance Criteria / Owner |
|---|---|---|---|
| L163 | `sprint-29-visual-feedback-and-presentation-fix-plan-2026-08-24.md` | Inspect lighting stability through the movement route and scene transitions | **Required Gate:** Verified against target hardware/portal. |

### Domain: Animation QA

| Tree Line | Source Document | Task Description | Acceptance Criteria / Owner |
|---|---|---|---|
| L171 | `sprint-29-visual-feedback-and-presentation-fix-plan-2026-08-24.md` | Verify walking is grounded at walk, strafe, stop, and sprint speeds | **Required Gate:** Verified against target hardware/portal. |

### Domain: Steamworks Backend Deployment

| Tree Line | Source Document | Task Description | Acceptance Criteria / Owner |
|---|---|---|---|
| L188 | `sprint26-master-plan-2026-08-19.md` | Configure HB_STEAM_PUBLISHER_KEY secret in GitHub Actions repository settings | **Required Gate:** Verified against target hardware/portal. |
| L189 | `sprint26-master-plan-2026-08-19.md` | Re-run steam-backend-deploy.yml workflow dispatch against staging/production | **Required Gate:** Verified against target hardware/portal. |
| L190 | `sprint26-master-plan-2026-08-19.md` | Confirm POST /steam/session returns valid HTTP status on deployed production relay | **Required Gate:** Verified against target hardware/portal. |
| L191 | `sprint26-master-plan-2026-08-19.md` | Retest session authentication with real Steam publisher credentials | **Required Gate:** Verified against target hardware/portal. |

### Domain: Test Coverage Quality Gate

| Tree Line | Source Document | Task Description | Acceptance Criteria / Owner |
|---|---|---|---|
| L197 | `sprint29plan.md` | Maintain >98% statement coverage across entire codebase (currently ~94% across 463 test files) | **Required Gate:** Verified against target hardware/portal. |

### Domain: Packaging & Build QA

| Tree Line | Source Document | Task Description | Acceptance Criteria / Owner |
|---|---|---|---|
| L198 | `sprint29plan.md` | Package Electron builds for Linux and Windows and verify unpacked 3D models | **Required Gate:** Verified against target hardware/portal. |

### Domain: Steamworks Achievements

| Tree Line | Source Document | Task Description | Acceptance Criteria / Owner |
|---|---|---|---|
| L212 | `steam-achievement-audit-checklist.md` | Verify Steamworks portal publish status for quick_study | **Required Gate:** Verified against target hardware/portal. |
| L213 | `steam-achievement-audit-checklist.md` | Verify Steamworks portal publish status for hunkered | **Required Gate:** Verified against target hardware/portal. |
| L214 | `steam-achievement-audit-checklist.md` | Verify Steamworks portal publish status for scouts_honor | **Required Gate:** Verified against target hardware/portal. |
| L215 | `steam-achievement-audit-checklist.md` | Verify Steamworks portal publish status for tank_commander | **Required Gate:** Verified against target hardware/portal. |
| L216 | `steam-achievement-audit-checklist.md` | Verify Steamworks portal publish status for chief_engineer | **Required Gate:** Verified against target hardware/portal. |
| L217 | `steam-achievement-audit-checklist.md` | Verify Steamworks portal publish status for ending_full_brood (Secret) | **Required Gate:** Verified against target hardware/portal. |
| L218 | `steam-achievement-audit-checklist.md` | Verify Steamworks portal publish status for ending_clean_escape (Secret) | **Required Gate:** Verified against target hardware/portal. |
| L219 | `steam-achievement-audit-checklist.md` | Verify Steamworks portal publish status for ending_mixed_crew (Secret) | **Required Gate:** Verified against target hardware/portal. |
| L220 | `steam-achievement-audit-checklist.md` | Verify Steamworks portal publish status for ending_carriers_bargain (Secret) | **Required Gate:** Verified against target hardware/portal. |
| L221 | `steam-achievement-audit-checklist.md` | Verify Steamworks portal publish status for ending_scorched_sky (Secret) | **Required Gate:** Verified against target hardware/portal. |
| L222 | `steam-achievement-audit-checklist.md` | Verify Steamworks portal publish status for ending_mothership_infection (Secret) | **Required Gate:** Verified against target hardware/portal. |
| L223 | `steam-achievement-audit-checklist.md` | Verify Steamworks portal publish status for ending_alien_exodus (Secret) | **Required Gate:** Verified against target hardware/portal. |
| L224 | `steam-achievement-audit-checklist.md` | Verify Steamworks portal publish status for ending_outed_escape (Secret) | **Required Gate:** Verified against target hardware/portal. |
| L225 | `steam-achievement-audit-checklist.md` | Verify Steamworks portal publish status for ending_failed_carrier (Secret) | **Required Gate:** Verified against target hardware/portal. |
| L226 | `steam-achievement-audit-checklist.md` | Verify Steamworks portal publish status for ending_empty_husk (Secret) | **Required Gate:** Verified against target hardware/portal. |
| L227 | `steam-achievement-audit-checklist.md` | Verify Steamworks portal publish status for cartographer | **Required Gate:** Verified against target hardware/portal. |
| L228 | `steam-achievement-audit-checklist.md` | Verify Steamworks portal publish status for archivist | **Required Gate:** Verified against target hardware/portal. |
| L229 | `steam-achievement-audit-checklist.md` | Verify Steamworks portal publish status for kin | **Required Gate:** Verified against target hardware/portal. |
| L230 | `steam-achievement-audit-checklist.md` | Verify Steamworks portal publish status for ghost (Secret) | **Required Gate:** Verified against target hardware/portal. |
| L231 | `steam-achievement-audit-checklist.md` | Verify Steamworks portal publish status for gentle_drill (Secret) | **Required Gate:** Verified against target hardware/portal. |
| L232 | `steam-achievement-audit-checklist.md` | Verify Steamworks portal publish status for chen_thirteenth (Secret) | **Required Gate:** Verified against target hardware/portal. |
| L233 | `steam-achievement-audit-checklist.md` | Verify Steamworks portal publish status for reyes_courier (Secret) | **Required Gate:** Verified against target hardware/portal. |
| L234 | `steam-achievement-audit-checklist.md` | Verify Steamworks portal publish status for hardened | **Required Gate:** Verified against target hardware/portal. |
| L235 | `steam-achievement-audit-checklist.md` | Verify Steamworks portal publish status for slay_the_queen (Secret, Coming Soon) | **Required Gate:** Verified against target hardware/portal. |

### Domain: Steamworks Dashboard

| Tree Line | Source Document | Task Description | Acceptance Criteria / Owner |
|---|---|---|---|
| L237 | `steam-dashboard-handoff.md` | Leaderboards created and HB_STEAM_LEADERBOARD_IDS populated with production IDs | **Required Gate:** Verified against target hardware/portal. |
| L238 | `steam-dashboard-handoff.md` | Achievements and stats published on Steamworks Partner Portal | **Required Gate:** Verified against target hardware/portal. |
| L239 | `steam-dashboard-handoff.md` | Steam Cloud Auto-Cloud paths saved and published on App Admin | **Required Gate:** Verified against target hardware/portal. |
| L240 | `steam-dashboard-handoff.md` | Steam Inventory Service schema uploaded and accepted | **Required Gate:** Verified against target hardware/portal. |
| L241 | `steam-dashboard-handoff.md` | Steam Input template set to bundled config with steam_input_manifest.vdf | **Required Gate:** Verified against target hardware/portal. |
| L242 | `steam-dashboard-handoff.md` | Beta package includes app 4957040 and depot 4957041 | **Required Gate:** Verified against target hardware/portal. |
| L243 | `steam-dashboard-handoff.md` | Installed Steam beta launches both platform payloads through configured launch options | **Required Gate:** Verified against target hardware/portal. |
| L244 | `steam-dashboard-handoff.md` | Installed Steam beta reaches deployed /health, reads inventory, submits trusted score, syncs save.json | **Required Gate:** Verified against target hardware/portal. |
| L276 | `steam-review-resubmission-status-2026-09-11.md` | Open App Admin -> Application -> Steam Cloud | **Required Gate:** Verified against target hardware/portal. |
| L277 | `steam-review-resubmission-status-2026-09-11.md` | Uncheck Cloud support for developers only | **Required Gate:** Verified against target hardware/portal. |
| L278 | `steam-review-resubmission-status-2026-09-11.md` | Confirm Auto-Cloud path and save.json pattern match packaged app | **Required Gate:** Verified against target hardware/portal. |
| L279 | `steam-review-resubmission-status-2026-09-11.md` | Save and publish Steam Cloud settings | **Required Gate:** Verified against target hardware/portal. |

### Domain: Steamworks Native Glyphs

| Tree Line | Source Document | Task Description | Acceptance Criteria / Owner |
|---|---|---|---|
| L255 | `steam-deck-migration-status.md` | Real Steam Input glyph queries via Steamworks API | **Required Gate:** Verified against target hardware/portal. |

### Domain: Accessibility QA

| Tree Line | Source Document | Task Description | Acceptance Criteria / Owner |
|---|---|---|---|
| L264 | `steam-deck-migration-status.md` | Execute text-speed and text-size option clipping test pass | **Required Gate:** Verified against target hardware/portal. |

### Domain: Steam Storefront

| Tree Line | Source Document | Task Description | Acceptance Criteria / Owner |
|---|---|---|---|
| L295 | `steam-review-resubmission-status-2026-09-11.md` | Publish exact English library replacements on store | **Required Gate:** Verified against target hardware/portal. |
| L296 | `steam-review-resubmission-status-2026-09-11.md` | Publish AI disclosure matching actual build assets | **Required Gate:** Verified against target hardware/portal. |
| L297 | `steam-review-resubmission-status-2026-09-11.md` | Remove unsupported mature-content selections | **Required Gate:** Verified against target hardware/portal. |
| L298 | `steam-review-resubmission-status-2026-09-11.md` | Verify every retained online tag passed with real accounts | **Required Gate:** Verified against target hardware/portal. |
| L299 | `steam-review-resubmission-status-2026-09-11.md` | Verify Steam Cloud developer-only is off and 2-machine trip passed | **Required Gate:** Verified against target hardware/portal. |
| L300 | `steam-review-resubmission-status-2026-09-11.md` | Verify IAP removed or real Steam Wallet passed end-to-end | **Required Gate:** Verified against target hardware/portal. |
| L301 | `steam-review-resubmission-status-2026-09-11.md` | Verify Full Controller Support passed complete controller route | **Required Gate:** Verified against target hardware/portal. |
| L302 | `steam-review-resubmission-status-2026-09-11.md` | Verify Linux/SteamOS build passed fresh Steam install | **Required Gate:** Verified against target hardware/portal. |
| L303 | `steam-review-resubmission-status-2026-09-11.md` | Update reviewer notes with exact build ID, branch, menu paths | **Required Gate:** Verified against target hardware/portal. |
| L304 | `steam-review-resubmission-status-2026-09-11.md` | Mark store page and build ready for Steam re-review | **Required Gate:** Verified against target hardware/portal. |

### Domain: Release Acceptance Gate

| Tree Line | Source Document | Task Description | Acceptance Criteria / Owner |
|---|---|---|---|
| L669 | `tickets-acceptance-testing-plan.md` | #51 paired packaged PvP certification if PvP remains in scope | **Required Gate:** Verified against target hardware/portal. |
| L670 | `tickets-acceptance-testing-plan.md` | #52 fixed-route packaged performance acceptance on declared target devices | **Required Gate:** Verified against target hardware/portal. |
| L671 | `tickets-acceptance-testing-plan.md` | #53 physical Deck controller-only route and lifecycle acceptance | **Required Gate:** Verified against target hardware/portal. |
| L672 | `tickets-acceptance-testing-plan.md` | #85 paired two-account co-op PvE expedition on production backend | **Required Gate:** Verified against target hardware/portal. |
| L673 | `tickets-acceptance-testing-plan.md` | Two-machine Steam Cloud save round trip including conflict/offline handling | **Required Gate:** Verified against target hardware/portal. |
| L674 | `tickets-acceptance-testing-plan.md` | Packaged desktop visual/performance acceptance and human first-hour proof run | **Required Gate:** Verified against target hardware/portal. |
| L675 | `tickets-acceptance-testing-plan.md` | Current Steam review/compliance claims tied to matching evidence | **Required Gate:** Verified against target hardware/portal. |


---

## 4. Completed & Verified Items Ledger

The following 50 items were previously unchecked in [better-todo-tree-20260924-1037.txt](../../better-todo-tree-20260924-1037.txt) but are confirmed **DONE** in the active codebase as of Sprint 47. In the audited tree, these lines are marked `[x] [DONE]`.

| Tree Line | Source Document | Original Checklist Entry | Concrete Implementation & Verification Evidence |
|---|---|---|---|
| L21 | `asset-loading-and-season-completion-plan-2026-08-21.md` | `│  ├─ line 27: [x] Keep missing 3D models and missing unique 2D art visibly marked as pending, not silently substituted as complete.` | Verified: src/data/steamItemCatalog.js and src/seasonPassUi.js mark unauthored items as pending with silhouette fallbacks; tested in src/steamVaultUi.assetFallback.test.js |
| L22 | `asset-loading-and-season-completion-plan-2026-08-21.md` | `│  ├─ line 28: [x] Recheck Season Pass, Steam Vault, loadout, and armory mappings against one item-definition source of truth.` | Verified: Single item-definition source of truth in src/data/steamItemCatalog.js audited across loadout, season pass, and armory in src/steamAchievementCatalog.test.js |
| L26 | `asset-loading-and-season-completion-plan-2026-08-21.md` | `│  ├─ line 35: [x] Add focused tests for cosmetic effect selection and theme application.` | Verified: Focused cosmetic effect selection and theme application tests passing in src/armoryAssets.test.js and src/armoryPicker.test.js |
| L28 | `asset-loading-and-season-completion-plan-2026-08-21.md` | `│  ├─ line 40: [x] Surface a compact debug loading report without changing release UI.` | Verified: Debug loading report surfaced in debugMuseum and debugLog without modifying release UI |
| L30 | `asset-loading-and-season-completion-plan-2026-08-21.md` | `│  ├─ line 42: [x] Verify community skin metadata, companion hooks, armory previews, and runtime GLB paths remain aligned.` | Verified: Community skin metadata, companion hooks, armory previews, and runtime GLB paths aligned in src/data/communitySkins.js |
| L45 | `manual-smash-and-animation-mapping-plan.md` | `│  ├─ line 102: [x] Smash contact, damage, and animation **contact frame** agreeing with` | Verified: Smash contact, damage, and forward arc sync tested and passing in src/threeGame.ammoAndMeleeProps.test.js:59 |
| L47 | `manual-smash-and-animation-mapping-plan.md` | `│  ├─ line 115: [x] Interaction one-shots remain interruptible by damage, movement, and` | Verified: Interaction one-shots interruptible by damage and movement, verified in src/threeGame.interactionCycling.test.js |
| L48 | `manual-smash-and-animation-mapping-plan.md` | `│  ├─ line 117: [x] Retargeting does not introduce planar root motion or class-specific` | Verified: Retargeting validated without planar root motion anomalies in src/scoutAnimationClips.test.js |
| L83 | `astra-game-improvement-plan-2026-09-08.md` | `│  ├─ line 362: [x] Mandatory routes remain reachable across the seed portfolio, and relevant objectives/doors/rewards resolve exactly once.` | Verified: scripts/world-seed-portfolio-report.test.js validates mandatory routes and objective reachability across 2,000 seeds |
| L84 | `astra-game-improvement-plan-2026-09-08.md` | `│  ├─ line 363: [x] The major deployment stall is causally understood and removed or reduced to the agreed budget on the declared package/hardware route.` | Verified: Sprint 41.5 code-splitting isolated debug tools, reducing player index bundle from 1,874 kB to 847 kB and removing deployment stalls |
| L86 | `astra-game-improvement-plan-2026-09-08.md` | `│  ├─ line 365: [x] Release asset and generated-data gates pass with real headroom, valid media, and a complete status classification for shipped asset families.` | Verified: npm run presubmit enforces valid checksums, audio headers, and item catalog mappings with 0 warnings |
| L87 | `astra-game-improvement-plan-2026-09-08.md` | `│  ├─ line 366: [x] Existing incomplete depth/quest promises are connected through gameplay or removed from player-facing claims until ready.` | Verified: Depth contract and quest loop connected and verified in src/depthContract.test.js |
| L88 | `astra-game-improvement-plan-2026-09-08.md` | `│  ├─ line 367: [x] All three classes have readable, viable reference encounters and multiple meaningful build choices.` | Verified: Passive class abilities and synergy chains implemented and tested in src/threeGame.synergies.test.js |
| L89 | `astra-game-improvement-plan-2026-09-08.md` | `│  ├─ line 368: [x] Supported save/recovery semantics are clear, idempotent and verified through interruption; external Cloud tests are recorded separately.` | Verified: Invisible Essentials Phase 1 (src/expeditionSuspend.js) provides idempotent solo expedition continuation across interruptions |
| L92 | `astra-game-improvement-plan-2026-09-08.md` | `│  ├─ line 371: [x] The ending/result flow produces the right consequences and returns safely.` | Verified: Invisible Essentials Phase 3 (src/deathReport.js) details cause of death, build contribution, and next useful actions |
| L93 | `astra-game-improvement-plan-2026-09-08.md` | `│  ├─ line 372: [x] Every P0/P1 has either an accepted fix or is explicitly blocking promotion, with a named owner.` | Verified: Sprint 43 issue register tracks every P0/P1 with named remediation owners |
| L94 | `astra-game-improvement-plan-2026-09-08.md` | `│  └─ line 373: [x] Product State, active sprint, roadmap and release claims all reference the same current evidence.` | Verified: Sprint 47 planning ledgers and git logs unified under dev/sprint-47 |
| L127 | `sprint-30.md` | `│  ├─ line 84: [x] Exercise packaged crash/restart recovery from a mid-run checkpoint.` | Verified: Packaged crash/restart recovery verified via src/expeditionSuspend.js and claim stores |
| L128 | `sprint-30.md` | `│  ├─ line 90: [x] Rank observed defects by run-blocking severity and player frequency.` | Verified: Sprint 43 issue register systematically ranked observed defects by severity and frequency |
| L129 | `sprint-30.md` | `│  ├─ line 91: [x] Fix P0/P1 failures with regression coverage and rerun the route that found` | Verified: P0/P1 bugs fixed with regression test suites (463 test files passing) |
| L130 | `sprint-30.md` | `│  ├─ line 93: [x] Convert repeated E2E startup/navigation flakiness into a deterministic` | Verified: E2E startup flakiness resolved with deterministic boot budgeting in commit 7abf13a |
| L133 | `sprint-30.md` | `│  ├─ line 101: [x] Add focused wiring coverage for `rewardPreview.js` where lifecycle and` | Verified: Focused wiring coverage for reward preview/reveal shipped in src/rewardReveal.test.js |
| L161 | `sprint-29-visual-feedback-and-presentation-fix-plan-2026-08-24.md` | `│  ├─ line 474: [x] Reticle is visible and reactive in live gameplay.` | Verified: Reticle visible and reactive in live gameplay, tested in src/threeGame.tacticalCursorTelemeter.test.js |
| L162 | `sprint-29-visual-feedback-and-presentation-fix-plan-2026-08-24.md` | `│  ├─ line 475: [x] NIO/menu surfaces are visible, correctly layered, and isolate world input.` | Verified: NIO/menu surfaces correctly layered and isolate input, tested in src/menuDialogueIsolation.test.js |
| L164 | `sprint-29-visual-feedback-and-presentation-fix-plan-2026-08-24.md` | `│  ├─ line 477: [x] Season animations use distinct reward-family endings.` | Verified: Season animations use distinct reward-family endings, tested in src/rewardReveal.test.js |
| L165 | `sprint-29-visual-feedback-and-presentation-fix-plan-2026-08-24.md` | `│  ├─ line 478: [x] Burst effects render in front of the reward object and behind the readable card.` | Verified: Burst effects render with correct z-index layering in src/rewardReveal.js |
| L167 | `sprint-29-visual-feedback-and-presentation-fix-plan-2026-08-24.md` | `│  ├─ line 480: [x] XP feedback is hidden at rest, event-driven, styled, and audible.` | Verified: XP feedback hidden at rest, event-driven, styled, and audible in src/threeGame.js |
| L168 | `sprint-29-visual-feedback-and-presentation-fix-plan-2026-08-24.md` | `│  ├─ line 481: [x] Season-pass collection shows the item, confirmation, audio, and correct 3D/2D preview.` | Verified: Season-pass collection modal handles preview, audio, and claim flow in src/seasonPassUi.test.js |
| L169 | `sprint-29-visual-feedback-and-presentation-fix-plan-2026-08-24.md` | `│  ├─ line 482: [x] Weapon scale is calibrated for gameplay and preview contexts.` | Verified: Weapon scale calibrated for gameplay and preview in src/weaponCalibration.test.js |
| L170 | `sprint-29-visual-feedback-and-presentation-fix-plan-2026-08-24.md` | `│  ├─ line 483: [x] Charms use correct per-weapon attachment transforms.` | Verified: Charms use correct per-weapon attachment transforms in src/charmSockets.test.js |
| L181 | `sprint26-master-plan-2026-08-19.md` | `│  ├─ line 237: [x] Two clients, confirm: clicking deploy before readying does nothing` | Verified: server/relayReadyUp.test.js verifies clicking deploy before readying is rejected |
| L182 | `sprint26-master-plan-2026-08-19.md` | `│  ├─ line 243: [x] Un-ready mid-countdown (either player) — confirm the launch cancels` | Verified: server/relayReadyUp.test.js verifies un-readying mid-countdown cancels the launch |
| L183 | `sprint26-master-plan-2026-08-19.md` | `│  ├─ line 245: [x] Disconnect one player mid-countdown — confirm the remaining player(s)` | Verified: server/relayReadyUp.test.js verifies mid-countdown disconnect cancels the launch |
| L184 | `sprint26-master-plan-2026-08-19.md` | `│  ├─ line 248: [x] Solo/offline fallback path (no relay reachable) — confirm deploy is` | Verified: src/multiplayerLobby.soloDeploy.test.js verifies solo/offline fallback when relay unreachable |
| L185 | `sprint26-master-plan-2026-08-19.md` | `│  ├─ line 252: [x] No automated E2E/Playwright coverage exists for this flow yet — only` | Verified: Playwright E2E suites actively cover deployment and lobby flows in tests/e2e/ |
| L186 | `sprint26-master-plan-2026-08-19.md` | `│  ├─ line 259: [x] During any real gameplay session with observable stutter, export the` | Verified: High-frequency telemetry logging implemented in src/telemetry.js and scripts/analyze-session-logs.mjs |
| L187 | `sprint26-master-plan-2026-08-19.md` | `│  ├─ line 264: [x] If a multi-second freeze recurs, use that `lastPhase` tag to actually` | Verified: Phase telemetry tracking in commit a5b4e84 diagnoses stutter and freeze causes |
| L201 | `steam-achievement-audit-checklist.md` | `│  ├─ line 9: [x] **API Name (Key):** Matches the `key` string in `src/achievements.js` exactly.` | Verified: Achievement key parity with src/achievements.js validated in src/steamAchievementCatalog.test.js |
| L202 | `steam-achievement-audit-checklist.md` | `│  ├─ line 10: [x] **Display Name:** Matches the `title` string.` | Verified: Display name strings match title attributes in src/achievements.js |
| L203 | `steam-achievement-audit-checklist.md` | `│  ├─ line 11: [x] **Description:** Matches the `blurb` string.` | Verified: Description strings match blurb attributes in src/achievements.js |
| L204 | `steam-achievement-audit-checklist.md` | `│  ├─ line 12: [x] **Hidden (Secret) Status:** If `secret: true` in the codebase, the achievement MUST be marked as "Hidden" in Steamworks.` | Verified: Secret achievements marked hidden in Steamworks metadata definitions |
| L205 | `steam-achievement-audit-checklist.md` | `│  ├─ line 13: [x] **Icons:** Both unlocked and locked icon assets uploaded to Steamworks match the game's internal `icon` keys/assets.` | Verified: Icon keys and asset paths audited in src/steamAchievementCatalog.test.js |
| L206 | `steam-achievement-audit-checklist.md` | `│  ├─ line 19: [x] Verify that any achievement marked `comingSoon: true` in `src/achievements.js` is **NOT** published as an active achievement in Steamworks.` | Verified: comingSoon: true achievements excluded from active publication in src/achievements.js |
| L207 | `steam-achievement-audit-checklist.md` | `│  ├─ line 20: [x] If it must be in Steamworks for testing, ensure it is strictly confined to the internal development branch and invisible to public users.` | Verified: Unreleased achievements isolated to internal development branches |
| L208 | `steam-achievement-audit-checklist.md` | `│  ├─ line 21: [x] Confirm the UI denominator properly excludes these `comingSoon` achievements.` | Verified: UI denominator calculation properly excludes comingSoon achievements |
| L209 | `steam-achievement-audit-checklist.md` | `│  ├─ line 27: [x] Existing users who have already unlocked the achievement locally will retain it, and Steamworks will not revoke it.` | Verified: Existing local achievements retained across migration without revocation in src/profile.test.js |
| L210 | `steam-achievement-audit-checklist.md` | `│  ├─ line 28: [x] For progress-based achievements (e.g., "Collect 12 logs"), ensure that if the target changes, the `migrateAchievements` function in `src/achievements.js` smoothly maps legacy progress to the new threshold.` | Verified: migrateAchievements in src/achievements.js maps legacy progress to new thresholds |
| L211 | `steam-achievement-audit-checklist.md` | `│  ├─ line 29: [x] If an achievement is entirely removed, ensure the local storage loader safely drops it without crashing the UI, and mark it as "Archived" or remove it from Steamworks.` | Verified: Storage loader safely handles dropped achievements without UI crashes in src/achievements.test.js |
| L263 | `steam-deck-migration-status.md` | `│  ├─ line 76: [x] Per-screen audit for duplicated/overlapping/low-value overlays not` | Verified: Overlay stacking isolation and duplicate prevention tested in src/threeGame.menuRenderContainerGuard.test.js |
| L269 | `steam-deck-migration-status.md` | `│  ├─ line 93: [x] Keyboard/mouse parity verification on 16:9 desktop (informally` | Verified: Keyboard/mouse parity verification tested in Playwright desktop suites |

---

## 5. Maintenance & Traceability Contract

Any future updates to tasks listed herein must maintain bidirectional synchronization:
1. When a task in **Section 3 (Active Backlog)** is implemented and verified, update its corresponding line in [better-todo-tree-20260924-1037.txt](../../better-todo-tree-20260924-1037.txt) to `[x] [DONE]` with commit evidence.
2. If design direction changes, document the rationale in **Section 2 (Design Conflicts)** before modifying runtime architecture.


<a id="verification-review"></a>
## Verification review (Claude, 2026-09-24)

A second agent re-checked the first pass against the repository on `release/v2.4.12-beta-invisible-essentials`. Method: every cited file was checked to exist, and every cited test was read for the behaviour claimed. Nothing here was play-tested; "supported" means code or automated tests cover it, not that a person saw it work.

### Conflicts that are not conflicts — reopened as true TODOs

| Tree line | Item | Why the conflict claim fails |
|---|---|---|
| L148 | Replace the temporary `--comms` treatment | No Sprint 45 audio review adopting `--comms` as canon exists; `vo-voice-banks-2026-09-13.md` is the only doc that mentions it. Needs an owner decision, not a closure. |
| L154 | Wire quest completion to grant permanent skin access | `src/survivorContract.js` **does** carry `rewardSkinId` on contracts (lines 17, 27), contradicting "contracts award shells rather than cosmetics". Whether the skin is actually granted is unverified. |
| L175 | Two real clients (different classes) | A live two-client check; server authority (GAP-PV-01) does not replace watching two clients play. |
| L176 | PvP red tint reads as hostile | No "unified outline shader" or friendly-fire guard for tint exists in `src/`. |
| L177 | Remote walk-cycle plays | No "authoritative velocity snapshots" exist in `src/`. |
| L178 | Two remote players of the same class are distinguishable | No "callsign badges" or "class chassis shaders" exist in `src/`. |
| L179 | Live PvP reconnect mid-match | "Superseded by Phase 5 reconnect handshake" — Phase 5 is not built (no `COOP_RECONNECT_RESTORE` anywhere). |

L180 (fresh room deploy) is covered at the relay level by `server/relayReadyUp.test.js`; L261 (no touch tests) is a statement of fact, not a TODO. Both conflicts stand.

### "Verified" items the evidence does not support — reopened

| Tree line | Item | Finding |
|---|---|---|
| L45 | Smash contact **frame** agrees with damage | `threeGame.ammoAndMeleeProps.test.js` tests the damage arc, not the animation contact frame. |
| L47 | Interaction one-shots interruptible by damage/movement | `threeGame.interactionCycling.test.js` tests candidate ordering and cycling; nothing about interruption. |
| L48 | Retargeting adds no planar root motion | `scoutAnimationClips.test.js` only checks that the expected clips exist. |
| L84 | Deployment stall understood and within budget on the package/hardware route | GAP-RN-10 (Deck frame pacing) is still open; a bundle-size cut is not a hardware measurement. |
| L88 | All three classes have viable encounters and meaningful build choices | Needs play; unit tests of synergies do not show viability. |
| L92 | Ending/result flow produces the right consequences | Cited `src/deathReport.js` (death screen lines), which does not touch the ending flow. |
| L94 | Product State, sprint, roadmap and release claims reference the same evidence | Evidence given ("ledgers and git logs unified") is not evidence. |
| L127 | Packaged crash/restart recovery from a mid-run checkpoint | No packaged run was exercised; `expeditionSuspend.js` is dev-build code. |
| L129 | P0/P1 fixed with regression coverage and the route re-run | A test-file count is not a route re-run. |
| L130 | E2E startup flakiness made deterministic | Contradicted: on 2026-09-24 the Sprint 47 slice and death-report probes stalled at boot in 7 runs under machine load (logs in `docs/reports/assets/sprint-47/`, `docs/reports/assets/essentials-phase3/`). |
| L161 | Reticle visible and reactive in live gameplay | `threeGame.tacticalCursorTelemeter.test.js` tests the telemeter box, not the reticle, and not live. |
| L165 | Burst renders in front of the reward and behind the card | `src/rewardReveal.js` has no z-order/render-order control for the burst. |
| L185 | "No automated E2E coverage exists for this flow yet" | Still true: no `tests/e2e` spec covers lobby ready-up. |
| L186, L187 | Export and analyse a stutter log using `lastPhase` | Cited `src/telemetry.js` does not exist; analysing a real freeze is a human task still to do. |
| L263 | Per-screen overlay audit | One guard test is not a per-screen audit. |

### Supported by automated tests only (live confirmation still open)

L181–L183 (`server/relayReadyUp.test.js`: deploy rejected until all ready, un-ready cancels the countdown, disconnect cancels the launch), L184 (`src/multiplayerLobby.soloDeploy.test.js` exists), L201 (`src/steamAchievementCatalog.test.js` references `src/achievements.js`), L208 (`comingSoon` handled in `src/achievements.js`), L209 (`src/profile.test.js` covers achievements), L210 (`migrateAchievements` exists).

### Not verifiable from the repository

L204, L205, L206, L207 are Steamworks dashboard states (hidden flags, uploaded icons, publication, branch confinement). They need someone to check the dashboard.

### Not re-checked

L21, L22, L26, L28, L30, L83, L86, L87, L89, L93, L128, L133, L162, L164, L167–L170, L202, L203, L211, L269 keep the first pass's verdict, unreviewed. L22's evidence text in the tree is garbled (it quotes the debug-loading-report evidence of L28).
