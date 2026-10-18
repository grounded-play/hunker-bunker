# Sprint 53 Master Verification & Execution Plan (2026-10-17)

**Document Status:** Canonical active sprint master plan  
**Target Release:** `v2.4.18-beta` / Sprint 53 Closeout  
**Branch:** `dev/sprint-52` (head `4faf9b31`)  
**Parent Roadmap Anchor:** [Product State](../../PRODUCT_STATE.md) · [Sprint 53 Core Plan](sprint-53-plan-2026-10-15.md)  
**Supersedes & Consolidates:** Sprawl from 18 prior documents audited in [better-todo-tree-20261017-1938.txt](../../scripts/better-todo-tree-20261017-1938.txt)

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
  - [ ] **Step 4 (Non-blocking Web Fonts):** Load Google Fonts stylesheet asynchronously with `media="print" onload="this.media='all'"` and preconnect to fonts.gstatic.com, or self-host Outfit and Space Mono. Prevents render-blocking on the loading screen.
  - [ ] **Step 5 (Critical CSS):** Inline critical styles for the `#loading` screen in `index.html` so initial paint completes before `index-*.css` (102 KB) finishes downloading.
  - [ ] **Step 6 (2D Character Sprites Deferral):** Defer loading large character sheets (`Tank.walk_v4.webp`, ~1.3 MB) until Armory opening or deployment, as 3D mode draws GLB models.
  - [ ] **Step 7 (Mobile Profile Measurement & CI Gate):** Add `lighthouserc.mobile.json` and record 2 consecutive runs meeting Performance ≥ 80.
- **Verification Command:**
  ```bash
  npm run build
  npx vite preview --port 4179 &
  npx lighthouse@9.6.8 http://localhost:4179/ --only-categories=performance,pwa \
    --chrome-flags="--headless=new" --output=json --output-path=lh-mobile.json
  ```
- **Acceptance Criterion:** 2 consecutive mobile runs report Performance ≥ 80, LCP < 4.0s, TBT < 200ms.

---

### 2.2 Issue #85 & #77: `[Sprint 43][S43-08][P0] Two-Account Packaged Co-op Expedition`
- **Issue References:** [GitHub #85](https://github.com/grounded-play/hunker-bunker/issues/85) · [GitHub #77](https://github.com/grounded-play/hunker-bunker/issues/77)
- **Goal:** Prove end-to-end co-op PvE gameplay with two real Steam accounts on an installed packaged candidate build (`v2.4.17-beta`+).
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

## 6. Execution & Verification Runbook

When verifying code and building release candidates for this sprint, execute the following sequence:

```bash
# 1. Verify code formatting and linting
npm run lint

# 2. Execute full automated test suite (all 724+ test files)
npm test

# 3. Audit internationalization and text externalization
npm run i18n:audit

# 4. Audit documentation links and integrity
npm run audit:docs

# 5. Execute presubmit and asset audits
npm run presubmit

# 6. Verify production build bundle
npm run build

# 7. Run E2E layout and probe checks (headed / GPU where available)
npx playwright test tests/e2e/hud-layout.spec.js tests/e2e/deferred-screens.spec.js
```

---

## 7. Sprint Closeout & Archive Protocol

A task in this plan may only be marked complete `[x]` when its verified outcome (test run, screenshot, or dated session log) is committed to the repository. Once all P0 items in Section 2 and Section 3 reach verification, `PRODUCT_STATE.md` will be updated to reflect `v2.4.18-beta`, closing Sprint 53.
