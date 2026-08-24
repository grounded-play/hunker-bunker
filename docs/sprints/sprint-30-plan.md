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

### Lane A — Documentation and repository truth

Deliverables:

- refresh public `README.md`;
- refresh `PRODUCT_STATE.md`;
- refresh release/version roadmap;
- refresh `CONTRIBUTING.md` for Node 22 and current verification flow;
- establish `docs/README.md` lifecycle/index;
- establish `docs/repo-roadmap.md` as the single prioritized long-range queue;
- remove sprint-specific working docs from repository root;
- inventory loose `docs/*.md` files and migrate them in link-safe batches.

Acceptance:

- a new contributor can answer "what is true now?", "what are we doing now?", "what shipped?", and "what is historical?" from four clearly linked entry points;
- no active sprint truth depends on reading a stale historical plan;
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

### Lane C — Steam multiplayer certification

Carry-forward from Sprints 26–29:

- two real Steam accounts;
- packaged clients;
- production backend;
- invite/join/ready/deploy;
- synchronized combat and expedition progress;
- extraction/end-of-run;
- reconnect/host behavior where supported;
- stats/save/cloud observations recorded.

Acceptance:

- one complete end-to-end co-op certification report;
- exact failures isolated by layer: Steam lobby, native binding, relay, game state, save/stat, or UX.

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

Secondary target only if Lane D completes cleanly:

- identify the next highest-value Designed/Coded-but-not-Accepted gameplay system from `docs/repo-roadmap.md`.

### Lane E — Performance decision, not performance theater

Tasks:

- capture real packaged hardware evidence first;
- use existing GPU timer/memory telemetry to identify the dominant problem;
- decide whether KTX2/Basis is justified by measured texture memory/frame behavior;
- if yes, build a narrow pipeline proof and compare before/after;
- if no, document why and pursue the measured bottleneck instead.

Acceptance:

- before/after measurements on the same route/hardware;
- no optimization considered complete solely because a tool or module was added.

### Lane F — Repo architecture risk reduction

Do not attempt a giant rewrite.

Start with an ownership map for the three large root files:

- `main.js` (~582 KB at sprint start);
- `style.css` (~512 KB);
- `index.html` (~156 KB).

Choose at most one low-risk extraction that:

- has a clear responsibility boundary;
- reduces cross-lane collision risk;
- preserves behavior;
- adds focused tests;
- does not derail P0 acceptance work.

Also audit:

- E2E startup readiness instability;
- empty top-level `node` file;
- `tmp/` purpose/contents;
- legacy/unused deployment configurations.

## Explicit non-goals

Unless a P0 defect forces otherwise, Sprint 30 does **not** prioritize:

- new major game modes;
- new economy/marketplace breadth;
- large new cosmetic families;
- broad narrative expansion;
- engine rewrite;
- wholesale CSS/HTML/`main.js` rewrite;
- another parallel planning framework.

## Living evidence matrix

| Work item | Designed | Coded | Connected | Tested | Live | Packaged | Accepted |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| Documentation lifecycle | ✅ | ✅ | n/a | n/a | ✅ | n/a | ⬜ |
| Canonical product-state refresh | ✅ | ✅ | n/a | n/a | ✅ | n/a | ⬜ |
| Sprint 29 visual acceptance | ✅ | ✅ | ✅ | ✅ | partial | ⬜ | ⬜ |
| Two-account Steam co-op certification | ✅ | ✅ | ✅ | partial | partial | ⬜ | ⬜ |
| Wanderer quest definitions/state | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| KTX2/Basis texture pipeline | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| E2E deterministic startup | partial | partial | partial | partial | ⚠️ | ❌ | ❌ |

Update this table as evidence changes. Do not replace a blank with a checkmark because a related module exists.

## Definition of done

Sprint 30 closes only when:

- canonical docs agree on current sprint, version state, test evidence, and ship gates;
- a closeout document records what moved, what was accepted, and what carries forward;
- Sprint 29 human presentation acceptance is either passed or converted into explicit defects;
- the two-account Steam route is either passed or has a precise blocking layer documented;
- Wanderer quest progression is runtime-connected or explicitly descoped with evidence;
- performance work is based on physical packaged measurements;
- the next sprint can be planned from `docs/repo-roadmap.md` + Sprint 30 closeout without excavating old plans.

## Closeout format

Create `docs/sprints/sprint-30-closeout.md` with:

1. shipped changes;
2. evidence matrix final state;
3. accepted player routes;
4. failed acceptance routes;
5. known bugs;
6. deferred work;
7. carry-forward items ranked P0/P1/P2;
8. docs moved/archived;
9. release/version decision;
10. exact recommended Sprint 31 scope.
