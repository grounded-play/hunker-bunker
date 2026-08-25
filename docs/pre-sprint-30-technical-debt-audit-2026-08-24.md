# Pre-Sprint-30 Technical Debt Audit

**Date:** 2026-08-24 · **Branch:** `dev/sprint-30` · **Scope:** orphaned branches, deferred coverage, temporary fixes

Every claim below was measured, not estimated. Commands are given so each can be re-run.

## 1. Orphaned branches

`git rev-list --count mothership..<branch>` across every local and remote branch:

| Branch | Unmerged commits | Disposition |
|---|---:|---|
| `dev/sprint-29`, `-28`, `-27`, `-26`, `dev/sprint23`, `dev/sprit-24`, `dev/sprit-25`, `release/v2.2.0-beta` | 0 | Fully merged — safe to delete |
| `dev/sprint-24` | 1 | **Already applied by another path** — see below |
| `origin/trip-site-hosting` | 1 | Unrelated side project, not sprint work |
| `origin/dependabot/npm_and_yarn/npm-minor-and-patch-ce8534719c` | 1 | Open dependency PR |
| `origin/dev/sprint-30` | 5 | Current sprint, in progress |

**No sprint feature was started and lost.** The one apparent orphan, `4e79ead` on `dev/sprint-24` ("skip showroom GLB loads outside a real browser"), turns out to be a duplicate: the identical guard is already live at `src/debugShowroom.js:175`. The branch can be deleted without losing anything.

Two branches are misspellings that were nonetheless merged and released from: **`dev/sprit-24`** and **`dev/sprit-25`** (missing the `n`), the latter via PR #37. `dev/sprint-24` also exists separately. Worth deleting all three to stop the ambiguity recurring.

## 2. Deferred coverage

144 modules in `src/`, **17 without a colocated test** — 88% by module count. Ranked by size:

| Module | Lines | Note |
|---|---:|---|
| `seasonPassUi.js` | 675 | **Sprint 29's own reward-reveal wiring** |
| `debugShowroom.js` | 482 | Debug-only surface |
| `cutscene.js` | 376 | |
| `rewardPreview.js` | 268 | **Sprint 29's own 3D preview** |
| `enemy3dOverlay.js` | 207 | |
| `wandererModal.js` | 195 | |
| `scoutHeroPreview.js` | 173 | |

The two largest gaps are the files Sprint 29 just shipped. Both are mitigated but not covered: their testable logic was deliberately extracted into `rewardReveal.js` (21 tests) and `weaponCalibration.js`/`charmSockets.js`, leaving DOM and three.js wiring behind. That is a reasonable split, but it means **no test would catch a regression in the claim→reveal DOM sequence itself** — the exact path that was silently broken before this sprint.

Recommended for Sprint 30: cover `seasonPassUi.js`'s claim/dismiss lifecycle using the repo's existing hand-rolled mock-element pattern (`armoryUi.test.js`).

## 3. Temporary fixes

This is the unexpected result. Scans across all tracked `*.js`, `*.css`, `*.html` outside `node_modules`/`dist`:

| Signal | Count |
|---|---:|
| `TODO` / `FIXME` / `HACK` / `XXX` | **0** |
| `eslint-disable` | **0** |
| `.skip(` / `.todo(` / `.only(` in tests | **0** |
| "for now" / "temporary" / "workaround" / "stop-gap" / "hardcoded" in `src/` + `main.js` | **0** |

The only `HACK` matches are `universalEncounter.js`'s in-game verb label for hacking drones — a false positive.

There is no marker debt. What exists instead is **stale gating**:

- `src/featureFlags.js` holds five flags, four permanently `true` (`ARC_PRELUDE_ENABLED`, `AUTHORED_WORLD_TILES_ENABLED`, `PLAYER_3D_COSMETIC_OVERLAY_ENABLED`, `ARMORY_SCREEN_ENABLED`) and one build switch (`DEMO_BUILD`). A flag that can never be false is not a flag.
- **`ARMORY_SCREEN_ENABLED`'s comment is factually wrong.** It reads "Off until the screen shell (task 5 …) lands — flip on once EMBARK correctly routes", but the value is `true` and EMBARK has routed for several sprints. A reader trusting the comment would draw the opposite conclusion about the state of the game.
- `src/threeGame.js:28930` evaluates `this.authoredWorldTiles || AUTHORED_WORLD_TILES_ENABLED`, but `this.authoredWorldTiles` is assigned from that same flag at line 1480 — the `||` can never change the result.
- `main.js:7322`'s `if (!ARMORY_SCREEN_ENABLED || isAct2RunActive())` reduces to `if (isAct2RunActive())`. The legacy branch is still reachable via Act 2, so it is *not* dead code — only the flag half is.

## 4. Root directory

29 tracked files at root, nearly all tooling that must live there (`package.json`, the four config files, Docker/Netlify/Fly manifests, `LICENSE`). Three items were genuine clutter and have been removed in this commit:

- **`favicon.png`** — 443KB, byte-identical to `public/favicon.png` (same MD5). Vite serves `/favicon.png` from `public/`, so the root copy was never served or built. Verified by rebuilding: `dist/favicon.png` is still produced.
- **`node`** — a 0-byte tracked file, an accidental shell-redirect artifact.
- **`vault-check.png`** — a 75KB untracked debug screenshot.

Untracked build output (`dist/`, `coverage/`, `test-results/`, `playwright-report/`, `steam_build_output/`, …) is already correctly gitignored. `tmp/` is **not** ignored and holds 14 tracked chroma-key PNGs — those are source art in a directory named like scratch space, which is worth renaming.

## Note on scope

Sections 1 and 2 of the cleanup brief (docs hierarchy, documentation system) were **already in progress by another agent** when this audit began — `docs/README.md`, `docs/documentation-system.md`, `docs/planning/`, and `docs/design/README.md` were being written to disk during the survey. Duplicating that work would have produced two conflicting structures, so this audit deliberately covers only section 3 plus the root-file cleanup nobody else was touching.

## Recommended Sprint 30 actions

1. Delete the eight fully-merged branches, including the three `sprit`/`sprint` near-duplicates.
2. Cover `seasonPassUi.js`'s claim→reveal→dismiss lifecycle.
3. Retire the four always-true feature flags and correct `ARMORY_SCREEN_ENABLED`'s comment; keep the Act 2 branch it guards.
4. Tag `v2.3.1-beta` — `package.json` declares it but no tag exists.

## Sprint 30 disposition

Resolved locally on 2026-08-24:

- added Season Pass reveal/dismiss DOM lifecycle coverage;
- retired the four permanently enabled feature flags while preserving the Act 2
  Armory bypass and authored-world rollback behavior;
- removed the duplicate root favicon and zero-byte `node` artifact;
- created local annotated tag `v2.3.1-beta` at `959239c`;
- explicitly retained colocated tests instead of moving 193 files into `tests/`.
- deleted eight ancestry-merged local branches plus duplicate-only
  `dev/sprint-24`; remote refs were left untouched.

Still open: focused `rewardPreview.js` lifecycle coverage, remaining untested
modules ranked by risk, and remote branch deletion by a repository maintainer.
