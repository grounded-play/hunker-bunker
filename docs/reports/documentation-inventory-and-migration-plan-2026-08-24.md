# Documentation Inventory & Migration Plan

**Status:** Active Sprint 30 cleanup report  
**Last verified:** 2026-08-24  
**Policy source:** `docs/README.md`

## Objective

Hunker Bunker's documentation problem is not lack of writing. It is **authority ambiguity**: historical sprint plans, audits, prompts, product briefs and current instructions often sit next to one another with similar names and no status signal.

Sprint 30 should make the repo navigable without destroying useful history.

The migration principle is:

> **Classify first, move second, delete only when the file is truly disposable.**

Do not bulk-rename hundreds of files in one commit. Git preserves history, but internal GitHub links, scripts, prompts and human bookmarks can still break.

---

## Target categories

### Canonical / current truth

Keep small and actively maintained:

- root `README.md`
- root `PRODUCT_STATE.md`
- root `CONTRIBUTING.md`
- root `ASSET_PROVENANCE.md`
- `docs/README.md`
- `docs/repo-roadmap.md`
- `docs/architecture/system-map.md`
- `docs/architecture/deployment-topology.md`
- `docs/versioning-and-release-roadmap.md`

### Active sprint

- `docs/sprints/sprint-30-plan.md`
- later: `docs/sprints/sprint-30-closeout.md`

There should be one active sprint plan, not competing master plans.

### Reports / evidence

Place dated facts, audits and acceptance results under `docs/reports/`:

- package/hardware acceptance;
- performance traces and conclusions;
- multiplayer/Steam acceptance;
- carry-forward audits;
- current Steam review status;
- integration audits;
- asset/package audits.

A report can become stale without becoming wrong: it says what was observed on a date/build.

### Design / enduring specs

`docs/design/` should hold design intent that remains useful independent of sprint number:

- One More Ring pillars;
- combat-feel principles;
- camp/narrative style guide;
- enduring UX/accessibility/visual rules when still current.

Design docs should explicitly distinguish target behavior from accepted runtime behavior.

### Architecture

`docs/architecture/` holds current responsibility/authority/deployment boundaries. Architecture files should be refreshed when ownership changes rather than copied into every sprint.

### Prompts / generated work instructions

`docs/prompts/` is for generation/agent instructions and content prompts. Prompt existence is never implementation evidence.

### Archive / history

`docs/archive/` is for:

- closed sprint plans/check-ins;
- superseded product briefs;
- transcripts;
- old remediation master plans;
- abandoned implementation proposals;
- historical PR outlines/worklogs where the result is no longer active guidance.

Historical docs should keep their point-in-time wording. Add a short status/superseded header or archive wrapper instead of rewriting them as if they were always correct.

---

## Cleanup already completed in Sprint 30

- public README refreshed from Sprint 26/27-era status to Sprint 30 truth;
- Product State refreshed;
- Contributor workflow refreshed;
- asset provenance policy made explicit about incomplete coverage;
- version/release roadmap aligned to Sprint 30;
- documentation lifecycle/index added;
- repo/Steam roadmap added;
- system ownership map added;
- deployment topology added;
- Sprint 28/29 carry-forward audit added;
- current Steam review status ledger added;
- stale root `PR_OUTLINE.md` migrated to `docs/archive/sprint-29-pr-outline.md`;
- empty root `node` artifact removed;
- PR/bug/feature templates upgraded to carry evidence/acceptance/ownership fields.

---

## Migration Batch 1 — high-risk stale authority

These files are dangerous primarily because a reasonable contributor could mistake them for current instructions.

### `docs/steam-v1-product-brief.md`

**Current problem:** July "Approved Product Brief" says:

- co-op is out of scope;
- real-money Cache Keys / Community Market / live Steam economy are mandatory;
- Fly.io deployment is assumed.

The current game/repo has materially diverged.

**Disposition:** Historical. Move under `docs/archive/steam/` after inbound-link audit, or add a prominent superseded header until migration is safe.

**Current replacement:** `PRODUCT_STATE.md`, `docs/repo-roadmap.md`, `docs/reports/steam-review-current-status-2026-08-24.md`.

### `docs/steam-review-failures-and-action-plan.md`

**Current problem:** original remediation plan includes unbuilt/superseded content and a "retain every claimed feature" strategy.

**Disposition:** Historical.

### `docs/steam-review-remediation-master-guide.md`

**Current problem:** useful implementation history but still carries old LAN/IAP/full-feature-retention assumptions and review-content choices.

**Disposition:** Historical/Reference, superseded for current status by the Sprint 30 Steam review ledger.

### `docs/sprint28plan.md`

**Current problem:** valuable evidence-based plan, but Sprint 28 has closed and actual merged scope diverged from some objectives.

**Disposition:** Archive under Sprint 28 history after links are checked. Keep its analysis intact.

### `docs/sprint29plan.md` and other Sprint 29 master/visual plans

**Current problem:** multiple materially different scopes share Sprint 29 naming; PR #43 shipped only part of the original plan while later cross-lane work closed a separate presentation contract.

**Disposition:** Archive together under a Sprint 29 directory with one short index explaining chronology: initial plan → changed scope → integration audit → closeout.

### `docs/sprint25.checkin.md`

**Current problem:** large design/check-in source can be mistaken for current backlog/truth.

**Disposition:** Archive/transcript. Promote only enduring decisions into `docs/design/` / roadmap.

---

## Migration Batch 2 — reports currently living as plans

Move only after checking references.

Likely candidates:

- August performance investigations (chunk mounts, frame pacing, packaged logs) → `docs/reports/performance/`;
- multiplayer-flow/lobby bug investigations → `docs/reports/multiplayer/`;
- Steam/backend audits → `docs/reports/steam/`;
- cross-lane completion audits → `docs/reports/integration/`;
- historical acceptance findings → the appropriate reports subfolder.

Keep plans/specs separate from measured reports. A document that says "we observed 201ms chunk mount on build X" is evidence; a document that says "we should introduce a scheduler" is a plan.

---

## Migration Batch 3 — asset docs and prompts

Current loose 3D/asset files mix at least three different jobs:

1. current runtime coverage;
2. backlog/catalog;
3. generation prompts/reference bibles/worklogs.

Recommended split:

- current asset coverage / package evidence → `docs/reports/assets/`;
- enduring art/model specifications → `docs/design/assets/` or `docs/architecture/assets/` where appropriate;
- generation prompts → `docs/prompts/assets/`;
- completed worklogs → `docs/archive/assets/`;
- provenance/rights status → root `ASSET_PROVENANCE.md` plus a future structured ledger.

`docs/3d-asset-master-backlog-and-prompts.md` is especially likely to benefit from separation: a living backlog and a prompt library should not be one authority document.

---

## Migration Batch 4 — compliance / player policy

Files such as:

- `docs/PRIVACY.md`
- `docs/HEALTH_WARNING.md`
- mature-content review material;
- AI/store-review copy;

should have explicit status and ownership because they may become customer/store-facing compliance surfaces.

Do not archive current privacy/health text simply because it is old; first determine whether it is still the text presented or required by the current build/store.

---

## Migration Batch 5 — generated logs and bulky evidence

Raw logs are useful, but should not dominate human navigation.

Preferred structure:

- small human-readable conclusion under `docs/reports/...`;
- raw session logs/traces either under a bounded evidence directory or external build artifact retention when size/frequency grows;
- report links to exact build/commit and raw evidence location.

Avoid committing every diagnostic output forever if GitHub Actions/artifact storage is a better fit.

---

## Root cleanup ledger

### Keep at root

- `.github/`, configuration needed by tools, source/runtime directories;
- `README.md`;
- `PRODUCT_STATE.md`;
- `CONTRIBUTING.md`;
- `CODE_OF_CONDUCT.md`;
- `ASSET_PROVENANCE.md`;
- `LICENSE`;
- real build/deployment/package configs that are still supported.

### Completed

- stale Sprint 29 `PR_OUTLINE.md` moved to archive;
- empty `node` file removed.

### Pending decision

#### `tmp/lore-drop-chroma/`

Contains large working source/derivative PNGs. Do not delete until compared with final `public/drop_*.png` assets and provenance needs.

Target disposition: retained masters → `art/source/...`; redundant reproducible temp outputs → remove.

#### `fly.toml` + `.github/workflows/steam-backend-deploy.yml`

Current docs identify Docker/Caddy self-hosting as production while the GitHub workflow still deploys Fly.io.

Target disposition depends on explicit environment decision: supported staging/failover, restored production, or removed legacy path. See `docs/architecture/deployment-topology.md`.

---

## Link-safe migration procedure

For each batch:

1. identify candidate source file;
2. search repo for inbound references by exact path/name;
3. choose target category/path;
4. update internal links in the same change;
5. preserve history rather than rewriting content;
6. add `Status` / `Superseded by` metadata where useful;
7. run docs/link/current-state audits once enforcement exists;
8. merge the batch independently so broken references are easy to isolate.

For heavily linked files, a temporary one-sprint redirect/stub at the old path can be preferable to a sudden hard delete.

---

## Enforcement to add after the structure settles

Do not create an elaborate documentation framework. A small `audit:docs` should eventually enforce only high-value invariants:

- canonical files exist;
- one active sprint plan exists under `docs/sprints/`;
- forbidden sprint-specific root planning files do not reappear;
- package version/current sprint claims in canonical docs do not obviously conflict;
- current public/store-copy files are included in the existing Steam claims discipline where appropriate;
- internal Markdown links resolve;
- new docs use an allowed lifecycle/status category.

Avoid making old historical documents fail CI merely because they contain historical claims. Classification is how history becomes safe.

---

## Definition of documentation cleanup done

Sprint 30 does **not** need a cosmetically perfect docs tree. It needs a trustworthy one.

Done means:

- current truth has one obvious home;
- active work has one obvious home;
- runtime ownership has one obvious reference;
- release/Steam claim status has one current ledger;
- historical plans cannot be mistaken for current policy;
- every high-risk loose doc has a category/disposition even if physical migration is deferred;
- root no longer accumulates sprint scratchpads;
- the migration process is safe enough to continue in future sprints without another cleanup initiative.