---
name: Bug report
about: Report a reproducible Hunker Bunker defect
title: '[BUG] '
labels: bug
assignees: ''
---

## Player-visible problem

Describe what the player sees/feels. Avoid starting with a guessed root cause.

## Exact reproduction

1. 
2. 
3. 

**Repro rate:** e.g. 5/5, intermittent, once only

## Expected behavior

What should happen instead?

## Environment

- **Commit / package version:**
- **Build type:** Browser dev / packaged Electron / Steam-installed / other
- **Launch path:** Steam / direct executable / browser
- **OS:**
- **CPU:**
- **GPU + driver:**
- **RAM:**
- **Resolution / display scale:**
- **Input:** Keyboard+mouse / Xbox-style controller / Steam Deck / other
- **Mode:** Solo / Co-op / PvP
- **Backend:** none / local relay / production (`steam.tuesdaycinema.club`) / other
- **Steam account context:** one account / two-account test / N/A

## Evidence

Attach or link the most useful evidence available:

- [ ] screenshot/video
- [ ] exported Hunker session/performance log
- [ ] console/runtime error
- [ ] Steam/package log
- [ ] network/relay evidence
- [ ] save/checkpoint evidence
- [ ] related acceptance report under `docs/reports/`

## Suspected system boundary (optional)

Only if evidence supports it. See `docs/architecture/system-map.md`.

- State owner:
- Producer/event:
- Consumer/presentation:
- Persistence/network boundary:

## Regression information

- Last known good build/commit (if known):
- First known bad build/commit (if known):
- Related PR/sprint:

## Severity

- [ ] P0 — blocks launch/run/save/multiplayer or causes crash/data loss/multi-second gameplay freeze
- [ ] P1 — major player-facing defect with no reasonable workaround
- [ ] P2 — noticeable defect/polish/reliability issue
- [ ] P3 — minor/cosmetic

## Acceptance route for the fix

State what must be demonstrated before this issue closes. Tests alone are not sufficient when the defect is package-, hardware-, Steam-, multiplayer-, or human-visual-specific.

- 

## Additional context

