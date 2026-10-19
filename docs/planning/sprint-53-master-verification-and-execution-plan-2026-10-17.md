# Sprint 53 Master Verification & Execution Plan (2026-10-17)

| Candidate field | Value |
|---|---|
| Document status | Canonical active sprint master plan |
| Target release | `v2.4.18-beta` / Sprint 53 Closeout |
| Branch | `dev/sprint-53` |
| Packaged candidate source | `7add8c30` |
| Package-reported version | `v2.4.17-beta` until promotion |
| Validation state (2026-10-18) | Local PvE/PvP build validation in progress; do not publish, merge, tag, or close hardware tickets yet |
| Parent roadmap | [Product State](../../PRODUCT_STATE.md) · [Sprint 53 Core Plan](sprint-53-plan-2026-10-15.md) |
| Supersedes and consolidates | Sprawl from 18 prior documents audited in [better-todo-tree-20261017-1938.txt](../../scripts/better-todo-tree-20261017-1938.txt) |

> **Baseline rule:** every tester must record the exact source SHA shown by the build. Matching `v2.4.17-beta` labels alone is insufficient. The release notes, PR draft, README refresh, and captured documentation images created after `7add8c30` describe the candidate but are not included in the installed build currently under test.

---

## 1. Executive Summary & Purpose

Over previous sprints (Sprint 49 through Sprint 52), substantial core code was delivered—including the unified Foundry, 7-language localized chat with filtering, developer commentary with speech audio, PBR cathedral room blueprints, destructible instanced props, KTX2 Basis UASTC texture compression, and PC UI defect fixes (DEF-01 through DEF-06).

However, historical planning documents accumulated **77 dangling `[ ]` checkboxes**, the vast majority of which were:
1. Tasks already implemented in source and covered by unit/regression tests, but left unchecked or duplicated in older specs;
2. Repeat requests for physical hardware verification (Steam Deck, Windows RTX 2070, two-machine Steam accounts);
3. Uncoordinated test criteria directly tied to **7 open GitHub issues** (#106, #85, #77, #53, #52, #51, #45).

This document establishes a **single, unified, actionable master document** for Sprint 53. All sprawling references in previous documents have been updated to point here. Every remaining task has a defined owner, exact verification route, reproduction command, and objective acceptance criterion.

---

## 2. GitHub Issues Consolidation & Clearance Pack

### 2.1 Issue #106: `perf(web): mobile Lighthouse 38 — boot downloads ~1 MB gz of JS`
- **Issue Reference:** [GitHub #106](https://github.com/grounded-play/hunker-bunker/issues/106)
- **Goal:** Elevate mobile Lighthouse Performance score from 38 (Netlify) / 45 (local) to **80+** without degrading desktop or Steam packaging.
- **Current Status:**
  - [x] **Step 1 (Active locale only):** `src/boot.js` now bundles `en` and asynchronously loads only the active locale via dynamic `import()`. Reduced boot bundle by ~330 KB gzipped.
  - [x] **Step 2 (Three.js out of boot graph):** Removed static `three` imports from boot-time screens (Armory preview, Vault preview, hero preview, reward preview). Model URL tables relocated to `src/data/operatorModelUrls.js`. Saved ~180 KB gzipped / 570 KB raw.
  - [x] **Step 3 (Chunk configuration):** Rolldown manual chunks cleaned up; `debug-tools` no longer bundles Three.js or all locales.
  - [x] **PWA & Asset Preload Fixes (PR #105):** Removed 5.5 MB of unneeded door art; lazy-loaded hidden-screen PNGs; replaced 442 KB PNG favicon with 9.5 KB SVG.
- **Remaining Implementation Steps for Clearance:**
  - [x] **Step 4 (Non-blocking Web Fonts):** Google Fonts use print-media deferral and fonts.gstatic.com preconnect; regression coverage lives in `src/bootPayload.test.js`.
  - [x] **Step 5 (Critical CSS):** Loading and title-screen first-paint styles are inlined in `index.html`; full application styles load asynchronously without exposing unstyled menus.
  - [x] **Step 6 (2D Character Sprites Deferral):** Full walk sheets are absent from the boot manifest. The selected class is requested after `ThreeGame` deployment initialization; Armory continues to load its own preview only on entry.
  - [x] **Step 7 (Mobile Profile Measurement & CI Gate):** `lighthouserc.mobile.json` runs twice with pessimistic assertions and is included in the CI matrix. Both local clearance runs scored 93 with LCP 3.25s/3.24s and TBT 0ms. Evidence: [mobile Lighthouse clearance report](../reports/sprint-53-mobile-lighthouse-clearance-2026-10-17.md).
- **Verification Command:**
  ```bash
  npm run build
  npx vite preview --port 4179 &
  npx lighthouse@9.6.8 http://localhost:4179/ --only-categories=performance,pwa \
    --chrome-flags="--headless=new" --output=json --output-path=lh-mobile.json
  ```
- **Acceptance Criterion:** 2 consecutive mobile runs report Performance ≥ 80, LCP < 4.0s, TBT < 200ms.
- **Clearance Result (2026-10-17):** **PASSED** — consecutive scores 93/93; LCP 3.25s/3.24s; TBT 0ms/0ms.

---

### 2.2 Issue #85 & #77: `[Sprint 43][S43-08][P0] Two-Account Packaged Co-op Expedition`
- **Issue References:** [GitHub #85](https://github.com/grounded-play/hunker-bunker/issues/85) · [GitHub #77](https://github.com/grounded-play/hunker-bunker/issues/77)
- **Goal:** Prove end-to-end co-op PvE gameplay with two real Steam accounts on the installed candidate sourced from `7add8c30` (currently displayed as `v2.4.17-beta`).
- **Parent Issue #77 Status:** Sub-tasks #86, #78, #84, #79, #80, #81, #82, #83 are all closed (`[x]`). #85 is the sole blocker to closing #77.
- **Current Status in Source:**
  - [x] Lobby join, invite, auth token verification, and ready gate operational.
  - [x] Remote 3D chassis, skin, polish, and walk locomotion synchronized (`src/threeGame.coopSync.test.js`).
  - [x] Host-authoritative power-up drops (`loot-drop-spawned`), prop destruction (`prop-broken`), and remote enemy bite targeting (`updateRemoteEnemyReplica`) implemented.
  - [x] Relayed deaths (`player-died`), Black Box marker attribution, and redeploy synchronization (`player-redeployed`) implemented.
  - [x] Reconnect roster reconciliation and 5-minute empty-room chat grace active (`src/threeGame.reconnectRoster.test.js`).
- **Required Hardware Verification Route:**
  1. Package candidate build and deploy to Steam `beta` branch.
  2. Launch build on Steam Deck (Host) and Windows PC (Guest) using two distinct real Steam accounts.
  3. Host creates lobby; Guest accepts Steam invite or joins from lobby browser.
  4. Both players ready up with distinct classes/loadouts and deploy.
  5. Confirm both players spawn safely without falling through spawn cliffs.
  6. Engage enemies: confirm host and guest see identical enemy facing, attack bites, and synchronized damage.
  7. Break an instanced prop: confirm destruction replicates to peer.
  8. Down guest player: confirm host sees down state and Black Box marker; guest redeploys and rejoins combat.
  9. Reach extraction terminal or sanctuary gate and complete session.
- **Acceptance Criterion:** Paired host and guest session logs committed under `docs/reports/` demonstrating complete run, consistent end-of-run stats, 0 repeated pit-falls, and 0 stale avatar desyncs.

---

### 2.3 Issue #51: `Certify Sprint 31 PvP fixes with two packaged Steam accounts`
- **Issue Reference:** [GitHub #51](https://github.com/grounded-play/hunker-bunker/issues/51)
- **Goal:** Certify competitive PvP damage scaling, vitals reconciliation, and remote visual presentation with two real Steam accounts.
- **Current Status in Source:**
  - [x] Server damage scaling fixed: 10 server points converted to 1 local heart (`takeDamage` normalized).
  - [x] 3.0s spawn protection and round ID lifecycle enforced (`server/relayPvPAuthority.test.js`).
  - [x] Debounced monotonic blast-door sequencing prevents race conditions.
  - [x] Healing synchronization in PvP active (`051a5334`, `playerHealed`, `playerHealthSync`).
  - [x] Local vitals aligned at 4 hearts, remote replica vitals tracking snapshot health.
- **Required Hardware Route:**
  1. Launch packaged build on two real Steam accounts.
  2. Join the same PvP match from Title → MULTIPLAYER.
  3. Verify remote 3D chassis, weapon, polish, and locomotion synchronization.
  4. Land standard shots: confirm 10-point server hit removes exactly 1 heart, eliminating legacy one-shot deaths.
  5. Verify round win/down attribution, debrief results, and rematch / return to lobby.
- **Acceptance Criterion:** Dated report committed under `docs/reports/` with paired logs proving non-one-shot PvP damage, accurate kill attribution, and clean match resolution.

---

### 2.4 Issue #53: `Complete physical Steam Deck controller-only acceptance for Sprint 31`
- **Issue Reference:** [GitHub #53](https://github.com/grounded-play/hunker-bunker/issues/53)
- **Goal:** Complete a full controller-only acceptance journey on physical Steam Deck hardware at 1280×800 without keyboard or mouse intervention.
- **Current Status in Source:**
  - [x] Steam Input manifest revision 11 with 7 configurations bundled (`steam/steam_input_manifest.vdf`).
  - [x] Controller single-press gate (`src/controllerPressGate.js`) active.
  - [x] Inverted right-stick camera orbit fixed (`0bbb438`).
  - [x] Mouse jitter filter (`createPointerIntentTracker` in `src/inputActions.js`) stops spurious mouse switches; `input-mode-changed` carries detailed `cause` telemetry.
  - [x] Touch press no longer forces keyboard mode.
- **Required Hardware Verification Route:**
  1. Boot game on Steam Deck at native 1280×800.
  2. Navigate Title Menu → Operator Select → Armory → Foundry → Settings → Content Guide using Gamepad / D-Pad only.
  3. Deploy into expedition. Verify `deploy-input-provenance` is logged as `controller`.
  4. Verify in-game actions: twin-stick movement & aim, fire, dash, interaction cycling, pneumatic transit, tactical pings (D-pad), squad radial, minimap pan.
  5. Perform mid-expedition Steam Deck sleep (suspend) for 30 seconds; wake (resume) and verify game resumes with 0 state corruption.
  6. Die or extract: verify Game Over / Debrief screen navigation and retry loop.
- **Acceptance Criterion:** Physical Deck session log confirming `deploy-input-provenance: controller`, 0 focus traps, 0 keyboard prompts in HUD, and successful suspend/resume.

---

### 2.5 Issue #52: `Profile and remediate packaged GPU and frame-pacing regression`
- **Issue Reference:** [GitHub #52](https://github.com/grounded-play/hunker-bunker/issues/52)
- **Target Metrics:**
  - Steam Deck: presented p95 ≤ 33.3 ms (stable 30 FPS).
  - Windows PC (RTX 2070 SUPER): presented p95 ≤ 16.7 ms (stable 60 FPS).
  - Tail stalls: no gameplay frame stall > 250 ms.
- **Completed Improvements:**
  - [x] Fixed light pool explosion (`registerEnvLight`): keeps 24 constant lights, eliminating repeated runtime shader recompilations.
  - [x] Removed unused shadowless warm-up pass in `threeGame.js`.
  - [x] Instanced batching for cliff secret-path glows: ~1,200 fewer scene nodes per chunk.
  - [x] ResizeObserver container size caching eliminates per-frame layout thrashing.
  - [x] Animated prop mixer culling (`src/mixerCulling.js`): off-screen props bank time, cutting CPU mixer updates.
  - [x] KTX2 Basis UASTC texture compression: GPU texture memory reduced from 3,737 MiB to 1,560 MiB.
- **Remaining Measurements for Closure:**
  - [ ] Execute 25-minute fixed-route benchmark on Steam Deck; capture frame-time log.
  - [ ] Execute 10-minute RTX 2070 SUPER benchmark on Windows PC; verify 0 shader stalls > 250 ms.
- **Acceptance Criterion:** Dated performance report under `docs/reports/` with before/after frame-pacing curves meeting p95 targets.

---

### 2.6 Issue #45: `Ship gates: acceptance backlog for premium Steam release`
- **Issue Reference:** [GitHub #45](https://github.com/grounded-play/hunker-bunker/issues/45)
- **Role:** Overarching release acceptance gate.
- **Mapping of Sprint 53 Deliverables to #45 Gates:**
  | #45 Gate Item | Sprint 53 Driving Deliverable | Target Evidence |
  |---|---|---|
  | **Two-real-Steam-account co-op certification** | Issue #85 route | Paired session logs under `docs/reports/` |
  | **Packaged 1280×800 / Steam Deck acceptance** | Issue #53 route | Controller-only log (`mode: controller`) |
  | **No unexplained gameplay stalls** | Issue #52 & S53-01 | Re-measured log with 0 stalls > 250 ms |
  | **Human Proof Run / first-hour acceptance** | S53-05 & First-hour plan | 35–45 min recorded new player run |
  | **Packaged desktop 16:9 visual acceptance** | PC UI Audit §5 | 1080p, 1440p, 4K screenshots |
  | **Real Steam Cloud round trip** | S49-30 platform contract | Machine A → Cloud → Machine B sync log |
  | **Steam review truth & disclosures** | Section 5 (Publisher checklist) | Live Item Store confirmation |

---

## 3. Active Sprint 53 Engineering Backlog

| Task ID | Component | Status | Description & Remaining Action |
|---|---|---|---|
| **S53-01** | Rendering / Shaders | `IN PROGRESS` | **Shader Compilation Freezes:** Fixed light pool and warm-up pass in GPU dev build. Windows packaged re-measure required to confirm 0 stalls > 250 ms. |
| **S53-02** | Engine / Scene Weight | `IN PROGRESS` | **Scene Weight & CPU Framerate:** Cliff batching, container size caching, and mixer culling completed. Remaining: batch per-cell wall/door trim and profile on Windows hardware. |
| **S53-03** | Armory UI | `COMPLETED` | **Class Switching Presentation:** Fixed stale `requestedClass` load race. 6/6 switch permutations pass in `tests/e2e/probes/class-swap.spec.js`. |
| **S53-04** | Input / Telemetry | `IN PROGRESS` | **Deck Controls Logged as Keyboard:** Pointer intent tracker (`createPointerIntentTracker`) implemented in `src/inputActions.js`. Physical Deck run needed to verify `deploy-input-provenance: controller`. |
| **S53-05** | Gameplay / Tutorial | `COMPLETED` | **O2 Early Onboarding Protection:** Implemented bubble exit toast notification (`SUIT TELEMETRY: EXITED LIFE SUPPORT BUBBLE — O₂ RESERVES ACTIVE`) and 50% O₂ caution warning (`SUIT TELEMETRY: O₂ AT 50% — RETURN TO BUBBLE OR SECURE OXYGEN REFILL`) in `src/threeGame.js`. Automated regression tests verified in `src/threeGame.gameplayRegression.test.js`. |
| **S53-06..11**| PC UI Defects | `COMPLETED` | **DEF-01 through DEF-06:** Camera select clamp, dedicated menu audio loop, Mothership uplink responsive scaling, square Armory preview, 38px back button, and 11px/12px font floors landed and verified. |
| **ASSET-80** | 3D Asset Pipeline | `EXTERNAL GATE` | **Prop 80 (Hull Shard):** Pending raw asset delivery from art team; register in `WORLD_3D_MODELS` upon delivery. |
| **SPRITE-KTX2**| Asset Optimization | `BACKLOG` | **Remaining 2D Sprite Canvases:** Pre-bake scatter sprites (~43 MiB) and enemy animation atlases to KTX2 UASTC to complete total VRAM reduction. |

---

## 4. Hardware, Display & PC UI Visual Verification Matrix

The following visual tests from the [PC UI Defects Audit](pc-ui-defects-and-feedback-audit-2026-10-15.md) and [Playtest Remediation Plan](playtest-remediation-steam-deck-and-pc-2026-10-12.md) are consolidated for execution during candidate validation:

| Test ID | Resolution | Target Screen | Verification Steps | Expected Outcome |
|---|---|---|---|---|
| **V-01** | 1920×1080 & 2560×1440 | Settings → Camera & HUD | Open modal; cycle camera to `THIRD-PERSON — SHOULDER`. | Text fits cleanly without overflowing into `CAMERA DISTANCE` column. |
| **V-02** | Desktop (any) | Main Menu | Boot build, wait 3 minutes, navigate in/out of submenus. | Audio stays on `mainbg_music` playlist; never rotates to `safe_ship` exploration tracks. |
| **V-03** | 1920×1080 & 2560×1440 | Campaign Intro | Trigger Mothership uplink transmission. | Panel scales responsively (`min(92vw, 1580px)`); no giant black void; header badges wrap cleanly. |
| **V-04** | 1920×1080 | Operator Select | Select class; observe left-column preview and back button. | Game preview container is 1:1 square; `RETURN TO MAIN MENU` button is ≥38px tall with crisp ≥12px font. |
| **V-05** | 3840×2160 (4K) | In-Game HUD | Deploy into Sector 0 at 4K display resolution. | HUD unit scales to 2.0×; text elements respect `--font-floor-min: 11px`; lower-third rails clear center corridor. |
| **V-06** | 1280×800 (Steam Deck) | In-Game HUD & Menus | Launch installed Steam Deck build at 100% HUD scale. | Minimum 0.8px text floor; all vitals, ammo, prompts, and radar legible from comfortable handheld distance. |
| **V-07** | 1920×1080 | Authored room floor | Enter the cathedral and one camp room after a cold boot; rotate the camera through all quadrants. | Final industrial/PBR floor is visible—never the temporary checker grid; no repeated raised square plates appear in intact rooms. |
| **V-08** | 1920×1080 | Room perimeter dressing | Inspect wall fixtures, decals and repeated prop families before and after camera rotation. | Hanging fixtures contact their wall at the registered elevation; elevated dressing hides/restores with cutaway walls; no perimeter model exceeds its room repetition cap. |

---

## 5. Publisher & Operations Checklist

The following commercial and platform operations require publisher coordination prior to public release:

- [ ] **Item Store SKUs Enabled:** Confirm Valve Steamworks Item Store is enabled with key SKUs published:
  - SKU 4001: 1 Key (`VLV100`, $1.00 USD)
  - SKU 4005: 5 Keys (`VLV400`, $4.00 USD)
  - SKU 4015: 15 Keys (`VLV1000`, $10.00 USD)
- [ ] **Microtransactions Web API:** Verify production backend has access to `ISteamMicroTxn` API and `GetReport` endpoint.
- [ ] **Production Flags Deployment:** On go-ahead, configure `server/backend.env` on production host:
  ```bash
  HB_STEAM_STORE_ENABLED=1
  HB_STEAM_MICROTXN_ENABLED=1
  HB_STEAM_ITEM_STORE_ENABLED=1
  ```
- [ ] **Live Purchase & Settlement Drill:** Execute 1 real-account purchase through hosted Item Store and 1 through MicroTxn route; execute `microtxn-report.js` to confirm idempotent settlement:
  ```bash
  docker exec hunker-bunker-backend node server/scripts/microtxn-report.js --since 2026-10-17T00:00:00Z
  ```
- [ ] **Ratings & Disclosures:** Verify store page discloses random cosmetic items and odds in compliance with applicable regional guidelines (including Belgium restrictions: key purchase block active).

---

## 6. Candidate QA, Evidence & Ticket-Clearance Plan

This section is the live session sheet for the locally installed build sourced from `7add8c30`. Check a route only after its acceptance criteria and evidence fields are complete. Use `PASS`, `FAIL`, `BLOCKED`, or `NOT RUN`; never infer a pass from automated coverage alone.

### 6.1 Session Header & Preflight

Copy this block into the dated QA report before play begins:

| Field | Required value |
|---|---|
| Session date/time and timezone | `YYYY-MM-DD HH:MM TZ` |
| Candidate source SHA | Must equal `7add8c30` on every machine |
| Displayed version | Expected `v2.4.17-beta`; record any mismatch |
| Server/environment | Hostname, region, relay/backend revision |
| Host machine/account | Hardware, OS, Steam account alias only |
| Guest machine/account | Hardware, OS, distinct Steam account alias only |
| Display/input | Resolution, refresh rate, keyboard/mouse or controller |
| Settings | Quality preset, HUD scale, accessibility modifiers |
| Run seed/profile state | Fresh/returning profile, expedition seed, class/loadout |
| Evidence root | Dated folder or report path under `docs/reports/` |

Preflight requirements:

- [ ] Both installations report source SHA `7add8c30`; screenshots show the build identity where available.
- [ ] Host and guest use distinct real Steam accounts, the same candidate depot, and the same server environment.
- [ ] Tester clocks are synchronized so paired logs can be correlated by timestamp.
- [ ] Old logs are moved out of the active capture folder; no credentials, auth tickets, email addresses, or account IDs will be committed.
- [ ] The intended resolution, input device, quality preset, and telemetry capture are set before deployment.
- [ ] A 60-second smoke run proves the title, audio, lobby connection, deployment, and log capture work before the long routes begin.

### 6.2 Required Route Matrix

| Route | Owner / tester | Status | Required environment | Primary clearance target | Minimum evidence |
|---|---|---|---|---|---|
| **BUILD-01** Candidate identity | ______ | `NOT RUN` | Every test machine | Prevent mixed-build results | SHA/version screenshots and machine table |
| **PVE-01** Deck host / PC guest | ______ | `NOT RUN` | Two accounts, packaged build | #85, #77 | Paired logs, lobby/deploy/extraction video, debrief screenshots |
| **PVE-02** PC host / Deck guest | ______ | `NOT RUN` | Host roles reversed | #85, #77 | Paired logs and replication comparison |
| **PVP-01** Full competitive match | ______ | `NOT RUN` | Two accounts, packaged build | #51 | Paired logs, damage/kill/round evidence |
| **FIRST-01** Fresh profile first hour | ______ | `NOT RUN` | Clean profile | #45 / first-hour proof | Uncut 35–45 minute recording and event timeline |
| **CAMP-01** Camp interaction chain | ______ | `NOT RUN` | Returning and fresh states | Sprint 53 narrative acceptance | Video, dialogue telemetry, persistence check |
| **ENEMY-01** Combat grammar | ______ | `NOT RUN` | Stalker/scuttler/mortar route | Sprint 53 gameplay acceptance | Clips and combat/death telemetry |
| **DECK-01** Controller-only | ______ | `NOT RUN` | Physical Steam Deck, 1280×800 | #53 | Controller provenance log and suspend/resume video |
| **PERF-01** Steam Deck soak | ______ | `NOT RUN` | Physical Deck | #52 | 25-minute frame-time capture |
| **PERF-02** Windows GPU soak | ______ | `NOT RUN` | RTX 2070 SUPER target | #52 | 10-minute frame-time and shader-stall capture |
| **VIS-01** Display matrix | ______ | `NOT RUN` | 1080p, 1440p, 4K, 1280×800 | #45 | Labeled screenshots for V-01 through V-08 |
| **CLOUD-01** Steam Cloud round trip | ______ | `NOT RUN` | Machine A and Machine B | #45 | Before/after save-state log |
| **OPS-01** Store/settlement drill | ______ | `NOT RUN` | Authorized production/sandbox environment | #45 | Redacted transaction and reconciliation report |

### 6.3 PvE Co-op Routes (`PVE-01`, `PVE-02`)

Run the route once with each machine acting as host. Record timestamps for every numbered checkpoint so host and guest logs can be compared directly.

1. Create the lobby, join via invite or browser, change to distinct classes/loadouts, ready, unready, then ready and deploy.
2. Confirm both players spawn on walkable terrain, see the correct remote chassis/skin/polish/weapon, and animate movement without stale or duplicate avatars.
3. Ping a world location and an enemy; verify the peer receives the marker and its location remains stable.
4. Fight one shared group. Compare enemy target, facing, health, bite/pounce event, player damage, and death state on both clients.
5. Move or break a synchronized prop and collect a synchronized item/drop. Confirm exactly-once removal and matching ownership/state.
6. At a safe camp, apply one Field Recalibration. Verify the chosen card, drawback, one-per-camp lock, and `field-recalibration-applied` state appear correctly for the squad.
7. Down the guest. Verify death attribution, Black Box marker, host view, redeploy, and the returning avatar/loadout.
8. Interrupt connectivity once, if the candidate environment permits it. Verify roster reconciliation and no immortal, stale, or duplicated player replica.
9. Reach sanctuary/extraction and finish the session. Compare end-of-run statistics, rewards, progression, and lobby return.

Pass only if both directions complete with zero repeat pit-falls, zero stale avatars, zero divergent enemy or prop state, and matching material end-state. A reconnect failure may be filed separately only if the uninterrupted critical route still completes and the release owner explicitly de-scopes reconnect from this candidate.

### 6.4 PvP Route (`PVP-01`)

1. Join the same match with two real accounts and confirm remote appearance, weapon, locomotion, and aim presentation.
2. On spawn, attack during the 3.0-second protection window and prove damage is rejected.
3. After protection expires, land isolated standard hits. Record health before/after and prove 10 server damage points remove exactly one local heart.
4. Heal once and verify local, remote, and server health reconcile without rollback or duplication.
5. Trade lethal hits in separate rounds. Verify killer/victim attribution, round ID, score, debrief, and match winner.
6. Exercise rematch, then return to lobby. Confirm no prior-round protection, health, score, or avatar state leaks forward.

Pass only with no one-shot regression, correct kill attribution, consistent results on both clients, and a clean rematch/lobby lifecycle.

### 6.5 First Expedition, Camps & Cinematics (`FIRST-01`, `CAMP-01`)

Use a genuinely clean profile for the first pass, then the same profile for persistence and skip checks.

- [ ] DEPLOY routes a fresh profile directly to Sector 0 and records `expeditionCount: 0` / incomplete Sector Zero state before completion.
- [ ] Phases 1–5 introduce movement, O₂ bubble exit, 50% O₂ warning, salvage, combat, and the blast gate without a dead end.
- [ ] Phase 5 moves camera, player, and audio continuously across the threshold into Ring 1; no menu or random-maze discontinuity appears.
- [ ] The first safe-camp route opens the expected doors and stages the Stranger/NPC at the correct anchor.
- [ ] Each authored interaction follows: **trigger item/event → walk to location → player/NPC stage positions → interaction/action → first frame → motion/action beat → last frame → gameplay consequence**.
- [ ] Dialogue choices appear only when their prerequisites are true; intimacy-gated lines remain hidden otherwise.
- [ ] Completed choices and cinematics do not replay after leaving, returning, saving, or restarting.
- [ ] Missing optional staging assets use their documented fallback without blocking control or progression.
- [ ] Field Recalibration offers three deterministic cards, charges 10 scrap per reroll, applies one choice, enforces the camp limit, and persists for the run.
- [ ] A returning player sees `[SKIP ONBOARDING (TRANSITION TO SECTOR 1)]`; using it opens the route and grants the documented sidearm plus 25 scrap/tech.

For every cinematic defect, log the trigger, expected first frame, observed first frame, action beat, expected last frame, observed last frame, control-return point, and resulting state. This prevents a visually correct cutscene from masking a broken event consequence.

### 6.6 Enemy & Combat Grammar (`ENEMY-01`)

- [ ] **Mycelium Stalker:** observe occluded flanking, the 650 ms pre-pounce coil, cyan/green mandible telegraph and hiss, pounce damage/spore puddle/camera response, then retreat.
- [ ] **Light response:** hold the suit flashlight cone on a Stalker and verify visible flinch, immediate retreat toward darkness, and pounce lockout.
- [ ] **Damage response:** interrupt it with gunfire and verify the same readable retreat without frozen AI or instant re-pounce.
- [ ] **Scuttler / Spore Mortar:** capture their intended range, tell, action, impact, recovery, and player counterplay; record any overlapping tells that become unreadable in a mixed encounter.
- [ ] **Sub-Zero Necrosis:** freeze a bio-corroded target, detonate the fusion, and verify the nova radius/damage/freeze/lingering corrosion plus death/debrief attribution.
- [ ] Confirm solo and networked encounters produce the same material result, with authority owned by the host during co-op.

### 6.7 Deck, Performance, Visual & Cloud Acceptance

**Steam Deck (`DECK-01`):** complete Title → Operator → Armory → Foundry → Settings → Content Guide → deploy → combat → camp → death/extraction using controller only. Record `deploy-input-provenance: controller`, verify no focus traps or keyboard-only prompts, suspend for 30 seconds, resume, and finish the route.

**Performance (`PERF-01`, `PERF-02`):** use the same fixed route and quality preset for repeatability. The Deck capture must run 25 minutes with presented p95 ≤ 33.3 ms; RTX 2070 SUPER must run 10 minutes with presented p95 ≤ 16.7 ms. Neither may contain a gameplay stall > 250 ms. Record warm/cold start, resolution, driver, power mode, renderer, percentile summary, worst stalls, and the location/action at every spike.

**Visual (`VIS-01`):** execute V-01 through V-08 in Section 4. Name each capture with test ID, resolution, route, and timestamp. Inspect legibility, overlap, clipping, focus, prompts, cinematic framing, first/last-frame continuity, floor finish, prop repetition, wall contact/cutaway behavior, and the lower-console HUD—not only whether the screen rendered.

**Cloud (`CLOUD-01`):** on Machine A, change one unmistakable profile fact, exit cleanly, wait for Steam sync, then launch on Machine B and verify it. Reverse the change from B to A. Preserve timestamps and screenshots without exposing account identifiers.

### 6.8 Evidence Format, Defects & Stop-Ship Rules

Create `docs/reports/sprint-53-qa-2026-10-18.md` when the first session is recorded. Keep large raw captures/logs in the ignored evidence location during validation; commit only the redacted report and intentionally selected media after acceptance. Each route entry must include:

- route ID, tester, build SHA, machines/accounts by non-sensitive alias, start/end time, result;
- numbered checkpoint results with expected versus observed behavior;
- log and media filenames with timestamps that correlate across machines;
- performance/stat summaries where relevant;
- defect IDs, reproduction rate, severity, workaround, and retest result;
- final tester and release-owner sign-off.

Severity and candidate handling:

- **P0 / stop ship:** crash, save loss, security/payment issue, cannot deploy/finish, systemic desync, or wrong-build contamination. Stop the route and reject the candidate.
- **P1 / release blocker:** repeatable major gameplay, controller, performance, cinematic progression, or multiplayer correctness failure. File and fix before promotion.
- **P2 / follow-up candidate:** contained presentation defect with no progression/data/cert impact. File with evidence; release owner must explicitly accept or schedule it.

Do not silently patch the installed candidate. Any code change creates a new SHA, invalidates `BUILD-01`, and requires all directly affected routes plus a smoke pass of PvE, PvP, first expedition, and Deck to be repeated.

### 6.9 Ticket Closure Ledger

| Ticket / task | May close only when | Current state |
|---|---|---|
| **#106** Mobile boot performance | Existing 93/93 report remains reproducible and build/presubmit stays green | Automated clearance recorded; closure-ready |
| **#85 / #77** Packaged co-op | `PVE-01` and `PVE-02` pass with paired logs and matching debrief state | Awaiting local hardware evidence |
| **#51** Packaged PvP | `PVP-01` passes with health, attribution, result and lifecycle proof | Awaiting two-account evidence |
| **#53** Deck controller acceptance | `DECK-01` passes, including provenance and suspend/resume | Awaiting physical Deck evidence |
| **#52 / S53-01** GPU/frame pacing | `PERF-01` and `PERF-02` meet p95 and tail-stall targets | Awaiting both hardware captures |
| **S53-02** Scene weight | Performance evidence passes or remaining wall/trim batching is explicitly rescheduled | Implementation landed; measurement open |
| **S53-04** Input telemetry | `DECK-01` records controller provenance with no mode regression | Implementation landed; hardware check open |
| **#45** Premium release gate | All dependent routes and publisher items pass; no unaccepted P0/P1 remains | Umbrella gate open |
| **ASSET-80** Hull shard | Raw art is delivered, integrated, audited, and visually accepted—or formally deferred | External gate |
| **SPRITE-KTX2** Remaining atlases | Optimization lands and is measured—or is assigned to a named later milestone | Backlog decision required |

Publisher and operations items in Section 5 require authorized coordination and cannot be cleared by local playtests. Do not enable production flags or perform a live transaction merely to complete this sprint sheet without the release owner's go-ahead.

---

## 7. Execution & Verification Runbook

For a newly cut candidate, execute the following sequence before hardware testing:

```bash
# 1. Verify code formatting and linting
npm run lint

# 2. Execute the complete unit and integration suite
npm test

# 3. Audit internationalization and text externalization
npm run i18n:audit

# 4. Audit documentation links and integrity
npm run audit:docs

# 5. Execute presubmit and asset audits
npm run presubmit

# 6. Verify the production build bundle
npm run build

# 7. Run E2E layout and deferred-screen probes (headed/GPU where available)
npx playwright test tests/e2e/hud-layout.spec.js tests/e2e/deferred-screens.spec.js
```

Record the command, SHA, start/end time, exit status, and summary in the candidate report. The current `7add8c30` baseline already has a recorded 6,503/6,503 test pass across 764 files and mobile Lighthouse 93/93 evidence; hardware and packaged routes remain open.

---

## 8. Sprint Closeout & Archive Protocol

A task in this plan may only be marked complete `[x]` when its objective outcome is recorded in the dated QA report and the selected redacted evidence is committed. When all P0/P1 routes and required publisher gates pass:

1. Resolve or explicitly defer every row in Section 6.9 with an owner and target milestone.
2. Re-run the documentation audit after final evidence links are added.
3. Update `PRODUCT_STATE.md` and the runtime package version to `v2.4.18-beta`.
4. Replace draft language in the release notes and PR description with final results.
5. Commit the accepted evidence and documentation, open/update the PR, and only then tag or promote the release.
