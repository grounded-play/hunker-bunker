# Hunker Bunker Documentation

Start here instead of searching every Markdown file. The repository contains a
large historical record; only the documents in **Current truth** and **Current
planning** are expected to describe today without qualification.

Last reviewed: 2026-08-24 · Owner: repository maintainers

## Current truth

| Question | Canonical document |
| --- | --- |
| What works, and what is merely code-complete? | [Product State](../PRODUCT_STATE.md) |
| What are we doing now? | [Sprint 30 plan](planning/sprint-30.md) |
| What comes after this sprint? | [Repository roadmap](planning/repository-roadmap.md) |
| Who owns each runtime boundary? | [Runtime system map](architecture/system-map.md) |
| How are versions and releases handled? | [Versioning and release roadmap](versioning-and-release-roadmap.md) |
| What does a contributor need? | [Contributing](../CONTRIBUTING.md) |

## Maintained references

- [Design direction](design/README.md) — game pillars, narrative style, combat
  feel, and proof-run shape.
- [Steam documentation](steam-docs-master-index.md) — implementation,
  operations, claims, and release readiness.
- [Season Zero protocol](season-zero-protocol/README.md) — progression,
  economy, inventory, and asset production.
- [Steam and multiplayer integration](steam-and-multiplayer-live-integration/README.md)
  — architecture and operator runbooks.
- [QA manual testing kit](qa-manual-testing-kit.md) — repeatable human checks.
- [3D asset backlog](3d-asset-master-backlog-and-prompts.md) — model production
  inventory and prompts.
- [Release notes](releases/) — tagged release records.

## Historical material

Sprint plans, dated audits, diagnostic reports, agent handoffs, and superseded
implementation plans are point-in-time evidence. They can explain why a choice
was made, but they do not define current status. Older material belongs under
[the archive](archive/README.md); existing loose historical files remain in
place until a link-preserving archive pass moves them.

## Sprint 30 evidence inputs

- [Sprint 28–29 carry-forward audit](reports/sprint-28-29-carry-forward-audit-2026-08-24.md)
  reconciles original commitments with their highest honest evidence state.
- [Pre-Sprint-30 technical-debt audit](pre-sprint-30-technical-debt-audit-2026-08-24.md)
  measures branch residue, test gaps, stale feature gates, and root clutter.

## Documentation rules

[Documentation system](documentation-system.md) defines ownership, lifecycle,
filenames, sprint closeout, and the automated documentation check. In short:

1. Update `PRODUCT_STATE.md` when truth changes.
2. Keep only one active sprint plan.
3. Put durable design in a maintained reference, not a sprint transcript.
4. Archive superseded status documents; never silently rewrite history.
5. Run `npm run audit:docs` before merging documentation changes.
