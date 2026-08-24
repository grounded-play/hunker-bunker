# Hunker Bunker Repository & Steam Roadmap

**Status:** Canonical prioritized roadmap  
**Last verified:** 2026-08-24  
**Purpose:** one durable ordering of what the repository and game need next; sprint plans should select from this roadmap rather than inventing parallel priority systems.

## North star

Hunker Bunker should progress toward a Steam build that can be handed to a new player on desktop or Steam Deck and survive a full run without developer intervention: understandable first hour, satisfying combat/buildcraft, stable packaged performance, durable save/recovery, reliable Steam multiplayer, and release evidence that is stronger than "the code exists."

## P0 — Close the ship gates already in flight

### 1. Real Steam multiplayer acceptance

**Why now:** this has carried across multiple sprint plans and remains the clearest difference between code-complete networking and Steam-ready networking.

Required proof:

- two real Steam accounts;
- packaged builds, not only browser/dev server;
- production backend services;
- create/invite/join/ready/deploy;
- synchronized gameplay through meaningful combat;
- disconnect/reconnect or host-loss behavior exercised where supported;
- expedition completion/extraction;
- results/stat/save behavior checked after the run.

Output: a dated acceptance report under `docs/reports/` with pass/fail evidence and exact build/commit.

### 2. Packaged desktop + Steam Deck presentation/performance acceptance

Sprint 29 automated presentation work is green, but its closeout explicitly leaves the human-eye route open.

Required proof:

- desktop 16:9 route;
- 1280×800/Steam Deck route;
- movement lighting continuity;
- reticle legibility against real scenes;
- reward reveal layering and five open/close cycles;
- weapon/charm framing across representative combinations;
- no packaged asset/audio/shadow warnings;
- frame pacing captured on real hardware in dense rooms and transitions.

Texture compression (KTX2/Basis) should be implemented only if measurement shows it is the next meaningful memory/performance win; otherwise record the deferral.

### 3. One complete Proof Run

The strongest Sprint 28 recommendation was convergence around one excellent 35–45 minute expedition rather than more breadth. Sprint 30 should preserve that direction.

Acceptance route:

`title → class → armory → deployment → descent → O2 pressure → build expression → depth gamble → escalation → boss/major objective → extraction/death → progression reward → next-run readiness`

Every step should be understandable without a developer console or prior explanation.

## P1 — Finish systems that are designed/coded but not fully connected or accepted

### Wanderer quest progression

Current code defines six archetype families, quest metadata, persisted state, and `advanceQuest()`, but `advanceQuest()` has no non-test runtime call site at the current head. That makes the quest layer a prime example of **Designed/Coded/Tested without Connected**.

Needed:

- map each quest objective to actual gameplay events;
- objective-specific progress rules instead of a context-free counter where needed;
- completion reward delivery;
- UI feedback;
- checkpoint/save persistence;
- automated runtime integration tests;
- live verification through at least one complete quest family.

### Combat feel and One More Ring readability

Depth Contract is now connected, but the product still needs player-facing proof that deeper descent feels like a deliberate bet rather than an invisible difficulty scalar.

Needed:

- visible risk/reward communication;
- boss/enemy stagger readability;
- dry-fire/refusal feedback maintained;
- build/relic synergy readability;
- human combat-feel pass using representative Scout/Tank/Engineer builds.

### Accessibility and first-hour comprehension

Current documentation still identifies incomplete accessibility/localization work and incomplete first-hour acceptance.

Prioritize:

- verify colorblind behavior against real live selectors and scenes;
- complete/review reduced-motion coverage;
- captions/subtitles strategy for gameplay-significant audio;
- text scaling/readability on Deck;
- first-hour comprehension playtest with a player who has not read the docs;
- decide localization architecture before strings become harder to externalize.

## P1 — Stabilize engineering ownership boundaries

### Decompose the three root monoliths gradually

At the current root, `main.js` is roughly 582 KB, `style.css` roughly 512 KB, and `index.html` roughly 156 KB. These are now large enough that unrelated sprint lanes can collide in the same files and integration regressions become easier to hide.

Do **not** rewrite them wholesale. Extract by stable ownership boundary:

- app phase / navigation orchestration;
- menu and overlay controllers;
- progression/reward presentation;
- input/controller routing;
- telemetry/dev tools;
- CSS by surface or feature domain;
- HTML templates/components where extraction materially improves testability.

Each extraction should preserve behavior and add focused tests before deleting the old path.

### Make E2E startup deterministic

Sprint 29 closeout recorded aim-cursor feature assertions passing while other runs failed before gameplay readiness because of startup/navigation instability.

Treat harness reliability as its own engineering item:

- one authoritative app-ready signal;
- deterministic seed/profile/bootstrap fixtures;
- no timing-only readiness assumptions;
- packaged-smoke subset where feasible.

## P2 — Repository and release hygiene

### Documentation normalization

Follow `docs/README.md`:

- one canonical truth ledger;
- one active sprint plan;
- one closeout per sprint;
- migrate loose docs in link-safe batches;
- clearly label historical/transcript/prompt material.

### Branch / PR discipline

Sprint 28 closed through an integration PR; substantial Sprint 29 work later appeared as direct commits and post-hoc cross-lane repair commits.

Target workflow:

- sprint branch or narrowly scoped feature branches;
- PR to `mothership` for integration;
- automated gates plus explicit human/package/account gates;
- no release promotion from an undocumented working tree state.

### Root cleanup

Audit top-level artifacts that do not clearly belong at root, including:

- sprint-specific planning files;
- the empty `node` file;
- committed `tmp/` contents/purpose;
- legacy deployment paths such as `fly.toml` if self-hosted Docker/Caddy is the actual production path;
- generated reports that belong under `docs/reports/` or build output.

Delete/move only after checking inbound references and release tooling.

### Deployment truth

There are multiple deployment configurations in the root. The repository should explicitly identify:

- browser hosting path;
- production Steam backend path;
- unused/legacy deployment configs;
- secrets/config restoration procedure;
- smoke check for each supported deployment.

## P2 — Asset pipeline sustainability

The retail payload is already measured in gigabytes and the 3D catalog is expanding quickly.

Keep asset growth governed by:

- provenance;
- runtime-vs-source separation;
- triangle/texture budgets;
- duplicate/checksum audits;
- packaged-path checks;
- compression decisions based on hardware measurements;
- explicit "integrated" versus "requested/generated" status in asset catalogs.

## P3 — Release-candidate readiness

Once P0/P1 gates are consistently passing, move from perpetual beta sprinting toward a release-candidate discipline:

- scope freeze;
- known-issues ledger;
- reproducible package/depot build;
- Steam dashboard configuration audit;
- save migration check;
- clean-install / upgrade / uninstall-reinstall smoke routes;
- controller/Deck verification;
- accessibility review;
- store media and version metadata matched to the build;
- release notes generated from accepted work, not planned work.

## Priority rule for future sprints

A new feature should not outrank an older acceptance gate merely because it is more interesting to build.

When choosing Sprint N+1 work, rank candidates in this order:

1. player-blocking defects;
2. unaccepted claims needed for Steam shipment;
3. systems already mostly built but not connected;
4. performance/reliability risks proven by measurement;
5. high-leverage player-facing polish;
6. new breadth/content.

That ordering is the main process correction carried forward from Sprints 28–29.
