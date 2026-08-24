# Hunker Bunker Documentation Index

**Status:** Canonical documentation policy  
**Introduced:** Sprint 30 — 2026-08-24

The repository has accumulated strong design work, audits, sprint plans, prompts, implementation briefs, and closeout reports. The problem is not lack of documentation; it is that point-in-time documents have often remained beside current documents without a clear lifecycle.

Sprint 30 introduces a simple rule:

> **Every document is either current truth, active work, reference material, generated evidence, or history.**

A file being present in `docs/` does not by itself make its claims current.

## Canonical current-truth documents

These should stay small and be updated when reality changes:

- [`../README.md`](../README.md) — public project entry point, setup, current high-level status.
- [`../PRODUCT_STATE.md`](../PRODUCT_STATE.md) — concise current-truth ledger.
- [`versioning-and-release-roadmap.md`](versioning-and-release-roadmap.md) — version/release policy and release history.
- [`repo-roadmap.md`](repo-roadmap.md) — prioritized product/repository roadmap toward a Steam-quality game.
- [`../CONTRIBUTING.md`](../CONTRIBUTING.md) — contributor workflow and verification expectations.

These files should not become sprint diaries.

## Active sprint documents

New sprint planning belongs under `docs/sprints/`.

Each sprint should have, at minimum:

1. `sprint-N-plan.md` — goal, scope, exclusions, lanes, risks, and acceptance criteria.
2. A living evidence table inside that plan using the states below.
3. `sprint-N-closeout.md` — what shipped, what was accepted, what failed, and what carries forward.

Do not create a second "master plan" for the same sprint without explicitly superseding the first one.

### Required evidence states

Use these terms consistently:

| State | Meaning |
|---|---|
| Designed | A specification or decision exists. |
| Coded | Implementation exists. |
| Connected | Live runtime calls the implementation. |
| Tested | Automated assertions cover the behavior. |
| Live-verified | Observed in a running development build. |
| Packaged-verified | Observed in a real packaged Electron/Steam-target build. |
| Accepted | The intended player/hardware/account acceptance route has passed. |

**"Coded" is not a synonym for "done."** A sprint item closes only at the evidence level promised by its acceptance criteria.

## Documentation categories

The repository already contains several useful category directories. Sprint 30 will migrate loose files into these categories gradually rather than breaking links in one destructive rename pass.

- `docs/design/` — enduring game/design pillars and product specifications.
- `docs/sprints/` — active sprint plans and closeouts.
- `docs/reports/` — audits, measurements, integration reports, and QA evidence.
- `docs/releases/` — shipped release notes.
- `docs/prompts/` — agent/asset-generation prompts; never treated as product truth.
- `docs/archive/` — superseded plans, transcripts, and historical records.
- `docs/superpowers/` — tool/workflow-generated planning material; reference only unless promoted into canonical docs.

During Sprint 30, older loose files may remain in `docs/` until their inbound links are checked.

## Document header convention

New or materially refreshed Markdown files should begin with a compact header such as:

```text
Status: Canonical | Active | Reference | Generated | Historical
Last verified: YYYY-MM-DD
Supersedes: <path> (when applicable)
Superseded by: <path> (when applicable)
```

Historical files should normally be preserved, not rewritten to pretend they were always correct.

## Sprint lifecycle

### 1. Scope lock

Before implementation begins:

- choose one sprint plan;
- define explicit non-goals;
- copy unresolved acceptance work from the previous closeout;
- assign every lane an observable acceptance criterion;
- identify which checks require a human, packaged build, physical hardware, or multiple Steam accounts.

### 2. Implementation

Agents may split into lanes, but each lane must record producer/consumer wiring, runtime call sites, tests, and dependencies on other lanes.

### 3. Integration audit

Before calling the sprint complete:

- orphan-module check;
- producer/consumer check;
- declared telemetry/event emission check;
- cross-lane integration pass;
- lint/test/build/presubmit;
- targeted E2E where applicable.

Sprint 29 proved why this phase matters: its cross-lane audit found multiple gaps only after the individual lanes looked complete.

### 4. Acceptance

Run every promised human/hardware/account route. If it cannot be run, the item is **carry-forward**, not complete.

### 5. Closeout

A closeout must contain:

- shipped/accepted matrix;
- unresolved bugs;
- unresolved acceptance work;
- deferred scope;
- documentation updates required;
- exact carry-forward items for the next sprint.

Then update `PRODUCT_STATE.md`, the release roadmap, release notes if a release was cut, and the public `README.md` where its claims changed.

## Repository-root policy

Keep the root for files that help someone understand, build, govern, or package the project immediately. Working sprint notes and one-off PR plans should not live at the root.

Preferred root Markdown set:

- `README.md`
- `PRODUCT_STATE.md`
- `CONTRIBUTING.md`
- `CODE_OF_CONDUCT.md`
- `ASSET_PROVENANCE.md`
- `LICENSE` (non-Markdown but canonical)

Sprint-specific PR outlines, audits, and worklogs belong under `docs/`.

## Sprint 30 cleanup phases

1. **Canonical refresh** — README, product state, release roadmap, contributor workflow.
2. **Index first** — this file and the new roadmap become the navigation spine.
3. **Carry-forward audit** — reconcile Sprint 28/29 promises against runtime and acceptance evidence.
4. **Safe migration** — move loose historical docs in batches only after checking references.
5. **Enforcement** — add lightweight documentation checks/templates once the target structure has settled.
