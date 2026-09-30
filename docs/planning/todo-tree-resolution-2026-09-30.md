# Todo Tree Resolution — 2026-09-30

## Source and scope

Audited `scripts/better-todo-tree-20260930-1208.txt`, which reported 15 lines
from three sources. The scan mixed active external gates, historical plan
snippets, and roadmap notes from an archived walkthrough. This document records
their canonical disposition so the same text does not become duplicate work.

## Disposition

| Source | Reported items | Classification | Resolution |
|---|---:|---|---|
| Archived Phase 1 layout walkthrough | 4 | One complete; three superseded | Live HUD bindings close Stage 2. The Steam Deck-first product decision retires the mobile action zone, portrait reflow, and low-end-mobile FX requests. |
| Wall/door instancing implementation plan | 3 | Historical example text | Reworded the temporary Task 3 snippet as an explicit Task 4 hand-off. The plan already marks Task 4 complete and the production implementation contains no such placeholder. |
| Steam dashboard handoff generator | 8 | Duplicate external gates | Removed the duplicated unchecked list from the generator. The Steamworks portal and installed-build gates remain open exactly once in `docs/planning/todo-audit-backlog-and-conflicts-2026-09-24.md`. |

## Evidence and acceptance

### HUD binding is complete

`main.js` owns live render paths for weapon clip/reserve/reload, ship integrity,
bunker level, and biome status. `src/vitals.js` owns the live vitals panel.
Runtime events update the relevant fields rather than leaving static scaffold
values in the markup.

### Mobile roadmap notes are superseded

`docs/steam-deck-first-display-and-input-spec.md` defines the supported product
as a canonical 1280×800 Steam Deck-first desktop experience. It explicitly
removes virtual controls, portrait layouts, and mobile-only breakpoints. The
current boot path also clears the obsolete touch-control preference.

This is a scope change, not a claim that the abandoned mobile features were
implemented.

### Steamworks work remains externally gated

The handoff now includes the assigned leaderboard IDs in the generated backend
environment value. Portal publication and installed-beta verification still
require Steamworks access and target hardware, and remain tracked in the master
todo audit. The generated packet links there instead of cloning the checklist.

## Verification performed

- `npx vitest run scripts/steam-dashboard-handoff.test.js`
- `node --check scripts/steam-dashboard-handoff.js`
- `git diff --check`
- Todo-pattern rescan of the three reported source files
