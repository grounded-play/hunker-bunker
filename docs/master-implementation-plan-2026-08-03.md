# Hunker Bunker Master Implementation Plan

Date: 2026-07-28  
Branch baseline: `dev/sprint-21`  
Status: Proposed execution plan  
Source audits:

- `docs/backend-steam-and-game-connection-audit-2026-07-28.md`
- `docs/steam-launch-readiness-master-plan.md`
- `docs/steam-store-feature-claim-checklist.md`
- `docs/steam-deck-migration-status.md`
- `docs/things-we-missed.md`
- Current code, tests, packaged outputs, and the active `~/server`
  Docker/Caddy deployment.

## 1. Purpose

This is the single dependency-ordered plan for closing the remaining gaps
between the current game and a credible public Steam beta.

It replaces the stale assumption that the trusted backend still needs to be
deployed. The backend is already:

- running under Docker Compose;
- healthy locally and through Caddy;
- publicly reachable at `https://steam.tuesdaycinema.club`;
- configured for Steam authentication and explicit backend sessions;
- configured with all five leaderboard IDs;
- using durable SQLite storage.

Backend work is therefore operational hardening and live Steam acceptance, not
greenfield implementation.

## 2. Definitions of Done

Every feature uses the following maturity ladder:

1. **Designed** — behavior and constraints are documented.
2. **Implemented** — code and assets exist.
3. **Connected** — the real player/runtime path invokes it.
4. **Automated** — unit/integration/E2E coverage exists.
5. **Accepted** — tested manually in the target packaged environment.
6. **Claimable** — safe to advertise in Steamworks/store copy.

No Steam-facing feature is claimable merely because a bridge or API wrapper
exists.

## 3. Release Gates

### Gate A — Secure backend

- Exposed credentials rotated.
- Only HTTPS production origins allowed.
- Strict backend environment audit passes.
- Backup and restore drill succeeds.
- No secrets exist in tracked files or depot output.

### Gate B — Steam-installed vertical slice

- Real Steam identity.
- Auth ticket exchanged for a backend session.
- Achievement and stat reach Steamworks.
- All five leaderboards write and read.
- One non-marketable Inventory item is granted and displayed.
- Overlay opens successfully.

### Gate C — Save and input acceptance

- Two-machine Steam Cloud synchronization passes.
- Offline/conflict recovery passes.
- Complete controller-only run passes.
- Physical Steam Deck pass completes.

### Gate D — Gameplay beta acceptance

- First-hour script passes with new players.
- Radial maze progression cannot bypass required blockers.
- Objectives remain legible through death/reset/Act transitions.
- Endings explain their causes.
- No critical asset-load failures.

### Gate E — Commerce decision

- Either commerce remains disabled for launch, or Valve/legal/live operational
  approval is complete.
- No public beta is blocked on paid Cache Keys.

## 4. Phase 0 — Security and Operational Correctness

Priority: P0  
Blocks: every live Steam test

### 0.1 Rotate exposed credentials

The Publisher Web API key and `HB_SESSION_SECRET` appeared in historical
tracked documentation.

Work:

1. Rotate the Publisher Web API key in Steamworks.
2. Generate a new high-entropy session secret.
3. Update only `~/server/backend.env`.
4. Recreate the backend container.
5. Verify local and public `/health`.
6. Exchange one real auth ticket.
7. Scan tracked/untracked release inputs for literal secrets.

Acceptance:

- Old Publisher key no longer authenticates.
- Existing backend sessions signed with the old secret are rejected.
- New Steam ticket/session succeeds.
- No value is printed into logs or documentation.

### 0.2 Make strict environment audit pass

Current failure: `non_https_origin`.

Work:

- Remove the remaining `http://` entry from `HB_ALLOWED_ORIGINS`.
- Retain only required HTTPS browser QA origins.
- Recreate the backend.
- Rerun strict audit against `~/server/backend.env`.
- Repeat trusted/untrusted Origin header probes.

Files:

- External: `~/server/backend.env`
- `scripts/audit-steam-backend-env.js`
- `docs/steam-backend-deploy-docker-caddy.md`

Acceptance:

- Strict audit returns `ok: true`.
- Untrusted Origin receives no allow-origin header.
- Approved HTTPS Origin receives the exact matching header.

### 0.3 Resolve audit/runtime-image mismatch

The production image includes `server/` but not `scripts/`, although
`package.json` exposes `steam:audit-backend:strict`.

Recommended implementation:

- Move reusable validation into `server/backendEnvAudit.js`.
- Keep the CLI wrapper in `scripts/`.
- Add a minimal runtime command or health diagnostic that uses the shared
  validator without revealing values.
- Run validation during container startup and fail fast in production.

Tests:

- Missing key.
- HTTP origin.
- partial leaderboard mapping;
- mock purchase flag in production;
- valid production environment.

Acceptance:

- Invalid production configuration prevents backend startup.
- Container image can execute the safe audit.

### 0.4 Backup and recovery

Work:

- Add a versioned backup script for `hunker-bunker-data`.
- Add integrity verification for the SQLite archive.
- Document restore into a temporary volume.
- Perform a restore drill.
- Define retention and off-device backup policy.

Acceptance:

- Restored backend retains idempotency, purchase, inventory, and leaderboard
  records.
- Restore instructions do not require exposing secrets.

## 5. Phase 1 — Steamworks Dashboard Truth

Priority: P0  
Blocks: live achievement, leaderboard, Inventory, Cloud, and Input acceptance

### 1.1 Create a published dashboard evidence packet

Extend `steam-dashboard-handoff.md` into a signed-off evidence matrix.

For every item record:

- configured value;
- Steamworks page/section;
- published-change date;
- tester;
- beta branch/build ID;
- evidence screenshot or exported metadata;
- pass/fail status.

Required sections:

- App/depot IDs.
- Windows/Linux launch options.
- Achievement API names and hidden flags.
- Stat API names/types.
- Five leaderboard IDs, sort methods, and display methods.
- Inventory schema version.
- Steam Input manifest association.
- Auto-Cloud path.
- Item Store state.
- package/store feature checkboxes.

Acceptance:

- Every configured code identifier has a dashboard counterpart.
- Every dashboard change is published, not merely saved.

### 1.2 Achievement and stat parity

Files:

- `src/achievements.js`
- `electron/main.cjs`
- `docs/steam-achievement-audit-checklist.md`

Work:

- Generate achievement dashboard data directly from `ACHIEVEMENT_DEFS`.
- Exclude `comingSoon` definitions automatically.
- Validate icons exist for locked and unlocked states.
- Centralize Steam stat definitions rather than forwarding ad hoc names.
- Add beta-only achievement reset instructions.

Acceptance:

- One normal, one secret, and one progress-based achievement unlock live.
- `slay_the_queen` remains unpublished until its gameplay gate closes.
- `total_deaths` and `longest_run_seconds` persist in Steam.

### 1.3 Leaderboard parity

Work:

- Confirm all five IDs against Steamworks.
- Confirm score direction:
  - descending for score/depth/survival;
  - ascending for fastest extraction.
- Confirm display units.
- Add a production smoke script using a real session token but no publisher
  key in the client.

Acceptance:

- Each board accepts a score.
- Global and around-user reads return the submitting account.
- A worse score cannot overwrite a better score where policy forbids it.
- Duplicate run submission remains idempotent.

## 6. Phase 2 — Installed Steam Vertical Slice

Priority: P0

### 2.1 Build provenance

Work:

- Produce a clean beta build through `steam-release.js`.
- Require a clean Git tree.
- Embed commit, branch, version, and Steam build ID.
- Confirm `steam_appid.txt`, environment files, and server DB files are absent.
- Test Windows and Linux payloads independently.

Acceptance:

- About/debug diagnostics show the expected commit/build.
- Depot audit passes against the exact uploaded payload.

### 2.2 Auth and session acceptance

Test sequence:

1. Launch through Steam.
2. Read persona and Steam ID.
3. Request an auth ticket for `hunker-bunker-backend`.
4. Exchange it at the public backend.
5. Use the returned bearer token for subsequent requests.
6. Cancel the ticket.
7. Confirm session expiry and renewal.

Add safe diagnostics:

- Steam active/inactive.
- auth ticket available;
- session established;
- backend reachable;
- reason codes without ticket/token values.

Acceptance:

- No request trusts a client-supplied Steam ID.
- Publisher key never enters Electron or renderer.

### 2.3 Inventory vertical slice

Use a non-marketable beta item first.

Work:

- Upload/publish schema.
- Grant one milestone item.
- Refresh Inventory.
- Reconcile owned/equipped cosmetics.
- Restart and confirm ownership remains.
- Test offline Vault behavior.

Acceptance:

- Grant is idempotent.
- Unowned equipped cosmetics are removed.
- Offline state is clear and does not fabricate ownership.

### 2.4 Overlay acceptance

Work:

- Open Community Market URL.
- Open hosted Item Store URL only when enabled.
- Verify fallback external browser behavior outside Steam.

Acceptance:

- Overlay never traps input or leaves the game paused incorrectly.

## 7. Phase 3 — Economy Assets and Commerce Containment

Priority: P0 for art reliability; P2 for real purchases

### 3.1 Self-contained Inventory art

Problem: Vault/schema icons point to remote Netlify URLs with no bundled
fallback.

Work:

- Produce normal and large icons for every item definition.
- Publish them on a permanent HTTPS asset host.
- Add local fallback icons under `public/economy/`.
- Add `scripts/audit-steam-inventory-assets.js`.
- Validate dimensions, MIME type, status code, and checksum.
- Make Vault image errors swap to the local asset.

Files:

- `src/steamVaultUi.js`
- `steam/inventory_schema_hunker_bunker.json`
- `steam/store/item_icons/`
- new `public/economy/`

Acceptance:

- Every Vault item renders online and offline.
- CI detects dead or mismatched schema URLs.

### 3.2 Remove catalog duplication

Currently item metadata exists in multiple client/server/schema locations.

Work:

- Establish one canonical item catalog.
- Generate the Steam schema and renderer-safe catalog from it.
- Keep server-only grant/recipe information out of renderer output.
- Validate odds disclosure against `server/lootTables.js`.

Acceptance:

- Item names, IDs, rarity, marketability, and icons cannot drift.

### 3.3 Commerce go/no-go

Default recommendation: beta ships with purchases disabled.

Before enabling:

- Valve MicroTxn approval.
- legal/regional review;
- rating/disclosure review;
- live sandbox purchase;
- finalization retry;
- refund;
- chargeback/reversal;
- grant reconciliation;
- incident and support workflow.

Acceptance:

- `HB_STEAM_MICROTXN_ENABLED` and `HB_STEAM_STORE_ENABLED` stay off until a
  signed release decision.

## 8. Phase 4 — Steam Cloud and Save Integrity

Priority: P0

### 4.1 Canonical save contract

Work:

- Document every `hb_*` key mirrored into `save.json`.
- Add schema version and migration log.
- Use atomic write/rename and backup copy.
- Validate malformed values before applying them to localStorage.
- Define profile/save boundaries.

Files:

- `electron/main.cjs`
- `electron/preload.cjs`
- `src/profile.js`
- RGB save modules

### 4.2 Auto-Cloud setup

Work:

- Publish the correct platform path for Electron `userData/save.json`.
- Verify Windows and Linux paths.
- Define whether logs/settings are excluded.

### 4.3 Acceptance matrix

Test:

- machine A save → machine B;
- machine B progression → machine A;
- offline changes;
- simultaneous conflict;
- Cloud disabled;
- stale cloud save;
- corrupt local save;
- browser-to-Electron migration;
- older schema migration.

Acceptance:

- No silent progression loss.
- Conflict behavior is documented and player-readable.

## 9. Phase 5 — Input, Controller, and Steam Deck

Priority: P0

### 5.1 Complete semantic action routing

Work:

- Route main gameplay through `src/inputActions.js`.
- Switch action sets automatically:
  - menu;
  - gameplay;
  - archive/RGB.
- Remove remaining direct/raw controller reads where semantic actions exist.
- Add glyph lookup abstraction with fallback labels.

Screens requiring coverage:

- title/profile/continue;
- class selection;
- settings and remapping;
- field gameplay;
- tactical map;
- Bunker Tree;
- terminal;
- camp/hive choices;
- Vault/store;
- codex;
- RGB;
- pause/game over/endings.

### 5.2 Text entry and focus

Work:

- Use Steam on-screen keyboard for every editable field.
- Add deterministic initial focus and focus restoration.
- Prevent focus from escaping modal boundaries.

### 5.3 Physical Deck acceptance

Test:

- complete run with built-in controls only;
- 1280×800 readability;
- suspend/resume;
- reconnect controller;
- docked 1080p/4K;
- performance and battery sample;
- no touchscreen/mouse emulation;
- offline launch and Vault state.

Acceptance:

- Only after this pass may Full Controller Support/Deck claims be reconsidered.

## 10. Phase 6 — Authoritative Radial WFC World

Priority: P0 gameplay

### 6.1 Make the macro plan authoritative

Current problem: radial nodes/clusters influence chunk generation but do not
guarantee the physical world graph.

Work:

- Generate a world-scale route graph before individual chunks.
- Define ring bands at authoritative radii.
- Plan spiral trunks, ring loops, branches, and room-cluster footprints.
- Project route reservations into each affected chunk.
- Require WFC to satisfy reserved border sockets and internal route lanes.

Files:

- `src/mazeExpedition.js`
- `src/worldRoutePlanner.js`
- `src/wfcGenerator.js`
- `src/threeGame.js`

### 6.2 Continuous barriers and controlled crossings

Work:

- Generate canyon/ridge barriers between successive rings.
- Enumerate every crossing.
- Assign mission blockers to all crossings into a locked ring.
- Permit synchronized multi-gate crossings only when explicitly planned.
- Prevent destructible walls, loops, vertical bridges, or chunk portals from
  bypassing a progression gate.

Tests:

- Remove locked crossing edges and prove the outer region is unreachable.
- Unlock them and prove it is reachable.
- Stress at least 2,000 seeds.

### 6.3 Physical room clusters

Work:

- Convert planned clusters into reserved multi-room chunk regions.
- Guarantee large room, support rooms, junction, and approach halls.
- Place camps/hives in the cluster interior, not a random nearby floor cell.
- Maintain three-wide doors and long variable hallways.

### 6.4 Distance validation

Work:

- Calculate actual shortest walk distance from ship to each landmark.
- Enforce increasing minimum distances by ring.
- Reject/regenerate plans that violate distance bands.
- Record route metrics in debug snapshot.

Acceptance:

- Camps: rings 1/2/3.
- Hives: rings 2/3/4.
- Mother Hive: ring 5.
- No ring bypass.
- Actual walks become longer outward.
- Canyons visibly separate rooms/halls and ring regions.

### 6.5 Vertical traversal acceptance

Test ramps, bridges, ladders, and pits for:

- player height;
- collision;
- camera readability;
- enemy navigation;
- door overlap;
- return routes;
- fall recovery;
- save/reload.

## 11. Phase 7 — Unified Objectives and Player Guidance

Priority: P0 gameplay

### 7.1 One objective authority

Migrate all objective producers into `ObjectiveRegistry`:

- tutorial;
- main mission;
- generator;
- extraction;
- black box;
- camps;
- hives;
- cave/reveal;
- bosses;
- ring blockers;
- optional lore;
- RGB/archive when surfaced in the main game.

### 7.2 Parent/child objective model

Add:

- parent objective;
- ordered/unordered steps;
- active/completed/failed/blocked;
- compass target;
- persistence policy;
- priority;
- explanation/reason;
- source system.

### 7.3 HUD and history

Work:

- Show one primary objective plus expandable steps.
- Add objective history to pause/map.
- Explain blocked gates and missing prerequisites.
- Restore objectives correctly after death/reset/load.
- Resolve notification priority conflicts.

Acceptance:

- Player can always answer:
  - what am I doing;
  - where is it;
  - what blocks it;
  - what changed;
  - what persists after death.

## 12. Phase 8 — Faction Gameplay and Human AI

Priority: P1

### 8.1 Faction verb matrix

Implement repeated mechanical identity:

- Meridian: radar, credentials, route intelligence, system repair.
- Tallow: healing, infection management, cure/humanity tradeoffs.
- Vesper: ammunition, fortification, turret control, force.
- Hives: bond-sensitive passage, rescue, wound/cull choices, enemy response.

Each verb requires cost, benefit, cooldown, failure/exploit rules, visual state,
audio feedback, and ending consequence.

### 8.2 Ambient human AI decision

Choose explicitly:

- activate and finish `humanAI.js`; or
- remove/retire the disabled promise.

If activated:

- station-to-station movement;
- idle/work actions;
- hostility/lockdown behavior;
- reactions to robbery, infection, and camp state;
- path recovery;
- streaming/save behavior.

Escort AI remains a separate scoped feature and should not be implied by
ambient movement.

### 8.3 Visible aftermath

Add physical changes for:

- allied/hostile/culled camps;
- wounded/consumed hives;
- completed blockers;
- robbed supplies;
- dead bosses;
- ending-vector decisions.

Acceptance:

- Major state changes are visible without reopening dialogue.

## 13. Phase 9 — Consequence, Manifest, and Ending Clarity

Priority: P1

### 9.1 Run summary

Display:

- run outcome;
- major choices;
- faction changes;
- losses/survivors;
- resources retained/lost;
- objective completion;
- ending vector;
- Steam submission/grants status.

### 9.2 Manifest forecast

At the vessel:

- show seat/eligibility slots;
- explain why each character/faction qualifies or does not;
- preview irreversible consequences without revealing secret endings.

### 9.3 Ending explanation

For every ending:

- concise causal summary;
- text and narration;
- correct video/fallback;
- no mismatched ending asset;
- clean transition to next chapter/restart;
- achievement event exactly once.

Acceptance:

- A player can explain why the ending occurred.

## 14. Phase 10 — First-Hour and Combat Acceptance

Priority: P1

### 10.1 Human first-hour script

Create formal checkpoints:

First 5 minutes:

- profile/class selection;
- intro;
- crash-room door;
- first objective;
- movement/combat/interact understanding.

First 15 minutes:

- generator/banking;
- first camp/hive signal;
- first upgrade;
- death/reset explanation.

First 60 minutes:

- faction choice;
- black box/cave progression;
- run loop comprehension;
- Act transition.

Record:

- player confusion;
- time-to-objective;
- deaths;
- skipped dialogue;
- controller problems;
- UI overlaps;
- asset failures.

### 10.2 Combat economy

Validate:

- boss HP versus weapon DPS;
- ammunition availability;
- class-specific counters;
- non-combat build survival;
- anti-softlock drops;
- Queen and corrupted-operator fights.

Close `slay_the_queen` only after a repeatable combat acceptance pass.

## 15. Phase 11 — Retail Asset and Build Reduction

Priority: P1

### 11.1 Referenced asset manifest

Build a script that extracts runtime asset URLs from:

- JS modules;
- HTML/CSS;
- JSON manifests;
- cinematic/RGB content;
- Steam-safe bundled fallbacks.

Classify files:

- runtime required;
- optional DLC/soundtrack;
- source/reference;
- generated intermediate;
- unknown.

### 11.2 Remove production-source assets from `public`

Move out:

- keyed sources;
- contact sheets;
- concepts;
- previews;
- old sprite generations;
- production references;
- unused alternates.

Keep source material under a non-public art/source directory or external
archive.

### 11.3 CI budgets

Add:

- unreachable-public-file audit;
- total web payload budget;
- `app.asar` budget;
- duplicate checksum report;
- media codec/dimension audit.

Acceptance:

- No referenced asset is missing.
- Package size decreases materially.
- Patch size is measured.

## 16. Phase 12 — Documentation and Dependency Hygiene

Priority: P1

### 12.1 One live truth matrix

Create `docs/current-feature-status.md` with columns:

- feature;
- design;
- implementation;
- connection;
- automated tests;
- live/hardware acceptance;
- claim status;
- owner/evidence.

### 12.2 Archive stale planning

Move superseded sprint and historical audit documents into `docs/archive/`.
Keep redirects/index entries so links remain understandable.

### 12.3 Dependency cleanup

- Remove `socket.io-client` unless multiplayer is formally approved.
- Document why server-side Socket.IO remains.
- Remove default Vite assets if unused.
- Add dependency usage audit to CI.

### 12.4 Claims control

Generate a Steam claim report that fails when store copy claims:

- multiplayer;
- Timeline;
- Deck Verified;
- Full Audio;
- Cloud;
- achievements;
- purchases;

without corresponding accepted evidence.

## 17. Deferred Tracks

These are not beta blockers unless separately approved:

### Multiplayer

Requires a product/design plan for authority, lobbies, matchmaking, progression,
disconnects, anti-cheat, shared objectives, and hosted operations. Existing
relay code is insufficient.

### Steam Timeline

Defer until the native binding exposes a verified Timeline API.

### Paid random rewards

Defer until Valve, legal, ratings, regional, refund, and operational acceptance
is complete.

### Full escort AI

Treat as a new feature, not an implied extension of ambient camp AI.

## 18. Automated Test Expansion

Required new suites:

- backend production-env startup test;
- live-beta Steam smoke harness;
- Inventory asset URL/fallback audit;
- Cloud save migration/conflict fixtures;
- controller focus/action-set E2E;
- radial gate non-bypass stress test;
- shortest-distance/ring progression stress test;
- objective persistence E2E;
- ending causality/event-once tests;
- referenced retail asset audit.

Maintain existing gates:

- `npm test`;
- `npm run lint`;
- `npm run build`;
- `npm run steam:audit-depot`;
- focused Steam backend tests;
- Playwright first-hour and controller suites.

## 19. Recommended Work Order

1. Credential rotation.
2. HTTPS-only CORS and strict audit.
3. Dashboard evidence packet.
4. Steam-installed auth/achievement/stat/leaderboard slice.
5. Self-contained Inventory art and one live beta grant.
6. Cloud acceptance.
7. Semantic input migration and Deck acceptance.
8. Authoritative radial route/barrier/gate generation.
9. Objective registry migration and sub-objective HUD.
10. First-hour acceptance.
11. Faction verbs, human AI decision, and aftermath.
12. Run/manifest/ending explanation.
13. Asset/package reduction.
14. Documentation/dependency cleanup.
15. Commerce go/no-go.

## 20. Completion Standard

The master plan is complete when:

- Gates A through D pass;
- every Steam store claim has evidence;
- the backend is secure, recoverable, and live-tested;
- the full game is controllable without mouse/keyboard;
- saves survive Cloud conflict scenarios;
- the WFC world physically enforces radial progression;
- objectives and endings explain themselves;
- retail assets are self-contained and size-controlled;
- disabled/deferred systems are not advertised as finished.

