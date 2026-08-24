# Sprint 30 Plan — Truth, Triage, Acceptance, Then Expansion

**Status:** Active sprint plan  
**Start:** 2026-08-24  
**Branch:** `dev/sprint-30`  
**Working package version at sprint start:** `2.3.1-beta`  
**Version policy:** do not choose the next version number until Sprint 30 ship scope is locked.

## Sprint thesis

Sprint 30 is a convergence sprint.

The repository does not currently need another wave of disconnected plans. It needs one trusted current-state layer, one prioritized backlog, closure of acceptance work that survived previous sprint boundaries, and a repeatable mechanism that prevents "coded" work from silently becoming "done" work.

The sprint succeeds if Hunker Bunker ends with **less ambiguity than it started with** and a materially stronger path to a Steam-quality build.

## Current Sprint 30 supporting references

- [`../../PRODUCT_STATE.md`](../../PRODUCT_STATE.md) — what is true today.
- [`../repo-roadmap.md`](../repo-roadmap.md) — durable priority ordering beyond this sprint.
- [`../architecture/system-map.md`](../architecture/system-map.md) — runtime ownership/authority map.
- [`../architecture/deployment-topology.md`](../architecture/deployment-topology.md) — current vs legacy deployment paths.
- [`../reports/sprint-28-29-carry-forward-audit-2026-08-24.md`](../reports/sprint-28-29-carry-forward-audit-2026-08-24.md) — explicit disposition queue for promises that survived older sprint boundaries.
- [`../reports/steam-review-current-status-2026-08-24.md`](../reports/steam-review-current-status-2026-08-24.md) — current Valve-review/release-claim ledger.

These support the sprint plan; they are not parallel sprint plans.

## What Sprint 28 and 29 taught us

### Keep from Sprint 28

Sprint 28's strongest planning pattern was evidence-based review:

- reconstruct reality from code/git, not filenames;
- distinguish Designed/Coded/Connected/Tested/Live/Packaged/Accepted;
- favor finishing high-leverage systems over adding breadth;
- explicitly list product/technical risks;
- call out what cannot be verified automatically.

### Fix from Sprint 29

Sprint 29 exposed process drift:

- the five-lane master plan and later three-lane presentation plan describe materially different scopes under the same sprint number;
- the root `PR_OUTLINE.md` stayed as an unchecked work list after implementation had moved on;
- `README.md`, `PRODUCT_STATE.md`, and the release roadmap disagreed on current sprint/test/runtime facts;
- the cross-lane audit found real wiring gaps after lanes appeared complete;
- human visual acceptance was still open at closeout;
- original master-plan objectives such as real two-account Steam acceptance and KTX2/Basis evaluation still lack completion evidence;
- Wanderer quest definitions exist, but quest advancement has no non-test runtime call site.

Sprint 30 converts these lessons into repo policy rather than another retrospective paragraph.

## Scope

### Lane A — Documentation, repository truth & release claims

Deliverables:

- refresh public `README.md`;
- refresh `PRODUCT_STATE.md`;
- refresh release/version roadmap;
- refresh `CONTRIBUTING.md` for Node 22, evidence requirements and asset/AI provenance;
- establish `docs/README.md` lifecycle/index;
- establish `docs/repo-roadmap.md` as the single prioritized long-range queue;
- establish the runtime system/deployment maps under `docs/architecture/`;
- reconcile Sprint 28/29 carry-forward debt in one dated report;
- create one current Steam review/status ledger so older remediation plans no longer operate as current policy;
- make `ASSET_PROVENANCE.md` honest about current coverage and establish the required ledger fields;
- remove sprint-specific working docs from repository root;
- inventory loose `docs/*.md` files and migrate them in link-safe batches.

Acceptance:

- a new contributor can answer "what is true now?", "what are we doing now?", "what shipped?", "what is historical?", and "who owns this system?" from clearly linked entry points;
- no active sprint truth depends on reading a stale historical plan;
- old Steam/commercial plans are clearly prevented from masquerading as current launch policy;
- root working-planning clutter is reduced without breaking known links.

### Lane B — Sprint 29 acceptance closure

Carry-forward items:

1. Desktop 16:9 human visual route.
2. 1280×800 / Steam Deck visual route.
3. Lighting continuity while moving.
4. Reticle legibility in real scenes.
5. Five reward-preview open/close cycles with correct disposal/layering.
6. Representative weapon/charm framing checks.
7. Packaged Electron warning/audio/asset check.
8. Frame-pacing capture on physical hardware.

Acceptance:

- dated report in `docs/reports/` with build/commit, hardware, route, and pass/fail notes;
- failed items become named bugs/backlog entries, not prose buried in a closeout.

### Lane C — Steam multiplayer / Cloud certification

Carry-forward from Sprints 26–29:

- two real Steam accounts;
- packaged clients launched through Steam;
- production backend;
- invite/join/ready/deploy;
- synchronized combat and expedition progress;
- extraction/end-of-run;
- reconnect/host behavior where supported;
- stats/save/cloud observations recorded;
- public-browse/cross-region behavior explicitly separated from Friends/Invite acceptance;
- a real two-machine Steam Cloud round trip recorded.

Acceptance:

- one complete end-to-end co-op certification report;
- one Cloud round-trip result;
- exact failures isolated by layer: Steam lobby/native binding, relay, game state, save/stat, public discovery, or UX.

### Lane D — Finish disconnected high-leverage gameplay

Primary target: Wanderer quest progression.

Tasks:

- reconcile the current six archetype families with the older Sprint 29 naming/scope;
- map each quest objective to concrete gameplay events;
- connect runtime advancement;
- deliver completion rewards;
- persist through intended save/checkpoint boundaries;
- add runtime integration tests;
- live-verify at least one full quest loop before declaring the system connected.

Secondary targets only if the primary closes cleanly:

- use the carry-forward audit to select the next highest-value Designed/Coded-but-not-Connected gap;
- explicitly decide whether the Depth Contract's currently unconsumed `eliteSpawnChance` is needed, deferred, or cut rather than leaving it as silent design data.

### Lane E — Performance decision, not performance theater

Tasks:

- capture real packaged hardware evidence first;
- use existing CPU/GPU/frame/memory telemetry to identify the dominant problem;
- reproduce the wall-break/loading/chunk-transition stutters reported in packaged sessions;
- decide whether KTX2/Basis is justified by measured texture memory/frame behavior;
- if yes, build a narrow pipeline proof and compare before/after;
- if no, document why and pursue the measured bottleneck instead.

Acceptance:

- before/after measurements on the same route/hardware;
- no multi-second freeze treated as solved without attribution/reproduction evidence;
- no optimization considered complete solely because a tool or module was added.

### Lane F — Repo architecture risk reduction

Do not attempt a giant rewrite.

Use [`../architecture/system-map.md`](../architecture/system-map.md) as the ownership baseline for the large cross-lane surfaces:

- `main.js` (~582 KB at sprint start);
- `src/threeGame.js` (central 3D/game runtime and largest coupling surface);
- `style.css` (~512 KB);
- `index.html` (~156 KB).

Choose at most one low-risk extraction that:

- has a clear responsibility boundary;
- reduces cross-lane collision risk;
- establishes one state owner/producer/consumer path;
- preserves behavior;
- adds focused tests;
- removes or clearly retires the previous path;
- does not derail P0 acceptance work.

Also audit:

- E2E startup readiness instability;
- `tmp/` purpose/contents and source-master disposition;
- legacy/unused deployment configurations;
- the still-active Fly.io GitHub deploy workflow versus current self-hosted Docker/Caddy production truth.

The empty top-level `node` artifact and stale Sprint 29 root PR outline were removed/migrated during the initial Sprint 30 cleanup.

## Commercial / Steam decision gate

Sprint 30 must record one current answer—without relying on July/August historical product briefs—to the following release questions:

1. Is launch a premium solo/co-op game with optional/deferred economy, or does launch require real-money IAP/Cache Keys/Community Market?
2. Is PvP an experimental side mode or a co-equal store promise?
3. Is worldwide public matchmaking required, or are Steam Friends/Invite + party play sufficient for launch?
4. Which mature-content survey categories correspond to content intentionally shipping versus old remediation-only additions?

These are product-scope decisions, not implementation tasks to be inherited automatically from old documents.

## Explicit non-goals

Unless a P0 defect forces otherwise, Sprint 30 does **not** prioritize:

- new major game modes;
- new economy/marketplace breadth before the commercial decision gate;
- large new cosmetic families;
- broad narrative expansion;
- engine rewrite;
- wholesale CSS/HTML/`main.js`/`threeGame.js` rewrite;
- another parallel planning framework.

## Living evidence matrix

| Work item | Designed | Coded | Connected | Tested | Live | Packaged | Accepted |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| Documentation lifecycle | ✅ | ✅ | n/a | n/a | ✅ | n/a | ⬜ |
| Canonical product-state refresh | ✅ | ✅ | n/a | n/a | ✅ | n/a | ⬜ |
| Carry-forward + architecture maps | ✅ | ✅ | n/a | n/a | ✅ | n/a | ⬜ |
| Current Steam review ledger | ✅ | ✅ | n/a | n/a | ✅ | n/a | ⬜ |
| Sprint 29 visual acceptance | ✅ | ✅ | ✅ | ✅ | partial | ⬜ | ⬜ |
| Two-account Steam co-op certification | ✅ | ✅ | ✅ | partial | partial | ⬜ | ⬜ |
| Steam Cloud real round trip | ✅ | ✅ | ✅ | ✅ | partial | ⬜ | ⬜ |
| Wanderer quest definitions/state | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Depth Contract elite promotion | ✅ | ✅ data | ❌ | ✅ data | ❌ | ❌ | ❌ |
| KTX2/Basis texture pipeline | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| E2E deterministic startup | partial | partial | partial | partial | ⚠️ | ❌ | ❌ |
| Asset provenance coverage | ✅ policy | partial | n/a | partial audits | n/a | partial | ❌ |

Update this table as evidence changes. Do not replace a blank with a checkmark because a related module exists.

## Definition of done

Sprint 30 closes only when:

- canonical docs agree on current sprint, version state, test evidence, product hierarchy, and ship gates;
- a closeout document records what moved, what was accepted, what was deferred/cut, and what carries forward;
- Sprint 29 human presentation acceptance is either passed or converted into explicit defects;
- the two-account Steam route is either passed or has a precise blocking layer documented;
- Steam Cloud has a recorded real round-trip result or precise external blocker;
- Wanderer quest progression is runtime-connected or explicitly descoped with evidence;
- performance work is based on physical packaged measurements;
- the Steam/IAP/PvP/public-matchmaking/mature-content policy contradictions have an explicit current disposition;
- active versus legacy deployment topology is unambiguous;
- major retail asset families have a provenance status even if some remain `needs-review`;
- the next sprint can be planned from `docs/repo-roadmap.md` + Sprint 30 closeout without excavating old plans.

## Closeout format

Create `docs/sprints/sprint-30-closeout.md` with:

1. shipped changes;
2. evidence matrix final state;
3. accepted player routes;
4. failed acceptance routes;
5. known bugs;
6. deferred/cut work;
7. carry-forward items ranked P0/P1/P2;
8. docs moved/archived;
9. product/store policy decisions;
10. release/version decision;
11. exact recommended Sprint 31 scope.
