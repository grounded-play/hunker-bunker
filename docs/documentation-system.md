# Documentation System

Status: maintained reference · Owner: repository maintainers · Reviewed:
2026-08-24 · Review trigger: every sprint close

## Purpose

The docs should answer three different questions without mixing them:

- **Truth:** what exists and what has been accepted now?
- **Intent:** what are we doing next, and why?
- **History:** what did we believe, try, or observe at a point in time?

Confusion came from treating all three as equally current. This system gives
each document one lifecycle and one authority.

## Authority order

When documents disagree, use this order:

1. Runtime code and repeatable evidence.
2. [`PRODUCT_STATE.md`](../PRODUCT_STATE.md).
3. The active sprint plan in [`docs/planning/`](planning/README.md).
4. Maintained domain references linked by [`docs/README.md`](README.md).
5. Dated audits, old plans, worklogs, transcripts, and archive material.

A plan proves intent, not completion. A unit test proves its contract, not a
human, hardware, service, or store-dashboard acceptance claim.

## Document lifecycles

| Lifecycle | Meaning | Required treatment |
| --- | --- | --- |
| Canonical | Current cross-repository truth or process | Owner and review trigger; update in the same change as the truth |
| Maintained reference | Durable design or operations guidance | Owner or subsystem; review when touched or at a release gate |
| Active plan | Time-bounded work with measurable exit criteria | Exactly one active sprint; check off only with linked evidence |
| Historical | Accurate record of a past investigation or sprint | Add a historical/superseded banner if it could be mistaken for current truth |
| Generated | Machine-produced report | Name the generator; regenerate rather than hand-edit |

## Placement and naming

- Repository root: only project entry points, community/legal files, build and
  deployment configuration, and the canonical `PRODUCT_STATE.md`.
- `docs/planning/`: the active sprint, roadmap, and planning process.
- `docs/design/`: durable game/product principles.
- `docs/<subsystem>/`: maintained subsystem references and runbooks.
- `docs/reports/`: generated or dated evidence.
- `docs/archive/`: superseded plans, transcripts, and agent walkthroughs.
- New dated files use `kebab-case-YYYY-MM-DD.md`; durable references use
  `kebab-case.md`. Do not add `plan2`, `latest`, `final-final`, or embedded
  absolute workstation paths.

Existing historical files are not renamed merely for style. Move them only in
a dedicated link-preserving archive change.

## Required header for new planning/reference docs

After the title, include one compact line containing:

```text
Status: active plan | Owner: <role/name> | Updated: YYYY-MM-DD | Review: <trigger>
```

Plans must also name their source baseline, non-goals, exit criteria, and
evidence location. If an item cannot be completed in the current environment,
name the external owner or required environment instead of leaving a bare box.

## Sprint lifecycle

### Open

1. Read the prior sprint plan, completion report, git history, and Product State.
2. Put every unfinished item into one of: **commit**, **roadmap**, **blocked with
   owner**, or **cut with rationale**.
3. Create the active sprint plan and update version/branch references.
4. Limit committed outcomes to the work that can actually be accepted.

### During

1. Keep completion state in the active plan; use reports for detailed evidence.
2. Do not create a second master plan for the same sprint.
3. Update Product State only when the truth changes, not when work starts.
4. Link every checked exit criterion to a command result, report, recording, or
   named human/hardware verification.

### Close

1. Write a short outcome table: planned, delivered, accepted, carried, cut.
2. Update Product State, release ledger, README status, and release notes/tag if
   a release is actually published.
3. Move the closed plan and lane artifacts into an archive sprint directory in
   a dedicated link-preserving change.
4. Open the next sprint from the carryover register, not from memory.

## Enforcement

`npm run audit:docs` checks the canonical documentation surface for missing
files, broken relative links, absolute `file://` links, current sprint/version
drift, and more than one active sprint plan. Historical archives are preserved
but excluded from current-truth assertions.

