# Sprint 30 PR Outline

Branch: `dev/sprint-30` · Target: `v2.3.2-beta` · Base: `959239c` on
`mothership` · Plan: [`docs/planning/sprint-30.md`](docs/planning/sprint-30.md)

## Outcome

Sprint 30 makes current repository truth navigable and turns the oldest
acceptance gaps into explicit release evidence. Product scope remains frozen
except for P0/P1 failures reproduced by the committed end-to-end routes.

## Expected change groups

- Documentation map, lifecycle rules, canonical Product State, version ledger,
  Sprint 30 plan, and repository roadmap.
- Repeatable documentation audit and sprint/version synchronization.
- Single-player Proof Run and first-hour evidence, with fixes for observed
  blockers.
- Production two-account Steam co-op evidence, with supported cross-region
  behavior documented.
- Steam Deck, real-GPU packaged build, Cloud, backend, and crash-recovery
  acceptance evidence.
- Product/store claim updates based on results.

## Verification checklist

- [ ] `npm run audit:docs`
- [ ] `npm test`
- [ ] `npm run lint`
- [ ] `npm run presubmit`
- [ ] `npm run build`
- [ ] Single-player Proof Run report linked
- [ ] Two-account co-op report linked
- [ ] Platform acceptance report linked
- [ ] Product State and release ledger reconciled
- [ ] Every unfinished item classified as carried, blocked with owner, or cut

Do not check a hardware, account, service, or human-comprehension item from
automated evidence alone.
