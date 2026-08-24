# Hunker Bunker Versioning & Release Roadmap

**Status:** Canonical release/version policy  
**Last verified:** 2026-08-24  
**Current active sprint:** Sprint 30  
**Active development branch:** `dev/sprint-30`  
**Current package version:** `2.3.1-beta`  
**Latest promoted release:** `v2.3.0-beta`  
**Main branch:** `mothership`

Sprint 30 begins as a convergence/governance sprint. The next version number is intentionally **not** preselected: choose it when the sprint's actual ship scope is locked, rather than allowing a planned version label to imply a release has already earned promotion.

---

## Versioning convention

Hunker Bunker uses Semantic Versioning with prerelease labels:

`vMAJOR.MINOR.PATCH-PRERELEASE`

- **MAJOR** — landmark compatibility/architecture shifts.
- **MINOR** — substantial player-facing milestone releases.
- **PATCH** — fixes, polish, tuning, optimization, and smaller feature increments within the current product line.
- **`-beta`** — active public-development builds.
- **`-rc.N`** — scope-frozen release candidates under launch/depot acceptance.
- **no prerelease tag** — production release.

Version numbers describe accepted release scope, not sprint ambition.

---

## Release history

| Version | Sprint / branch | Date | Integration | Accepted headline |
|---|---|---|---|---|
| `v2.0.1-beta` | Sprint 16 | 2026-07-28 | tagged baseline | Survival loop and early UI/world baseline. |
| `v2.1.0-beta` | Sprint 20/21 era | 2026-07-27 to 2026-08-03 | PRs #22/#23 era | Large gameplay/content, Steam Deck, packaging, media, and runtime expansion. |
| `v2.2.0-beta` | Sprint 26 / `dev/sprint-26` | 2026-08-20 | PR #38 | Steam stats/cloud wiring, production backend work, Depth Contract integration, multiplayer durability. |
| `v2.3.0-beta` | Sprint 28 / `dev/sprint-28` | 2026-08-23 | PR #40 | 46 community/Season 0 3D models, Armory overhaul, Wanderers, Steam Deck controls, crash recovery, GPU diagnostics, all 8 transformative relics. |
| `2.3.1-beta` working tree | Sprint 29 → Sprint 30 carry-forward | not promoted as a release in this ledger | Sprint 29 implementation + closeout work | Additional 3D pipeline integration and presentation/telemetry/weapon/lighting polish; automated closeout green, human/Steam/hardware acceptance still open. |

See `docs/releases/` for release-note artifacts. Historical sprint plans may describe target versions that were never promoted; this ledger records release state, not planned state.

---

## Current Sprint 30 release decision

Sprint 30 starts from package version `2.3.1-beta` and asks a release question only after its P0 acceptance work is understood.

Possible outcomes:

- **Patch beta** if Sprint 30 mainly closes acceptance, fixes, and connected-system gaps.
- **Minor beta** only if the accepted player-facing scope materially warrants it.
- **`-rc.1`** only after scope freeze and the Steam/packaged/hardware gates in `docs/repo-roadmap.md` are actually passing.

Do not bump solely because a new sprint number exists.

---

## Release promotion workflow

### 1. Scope lock

Before version bumping:

1. Update the active sprint evidence matrix.
2. Identify exactly what is shipping and what is deferred.
3. Confirm required human, packaged, hardware, and Steam-account acceptance routes.
4. Choose the version based on the accepted scope.

### 2. Version update

Update together:

- `package.json`;
- in-game/system version surfaces such as `index.html` where applicable;
- `PRODUCT_STATE.md`;
- this ledger;
- active sprint plan/closeout.

### 3. Automated verification

Run the relevant full gates:

```bash
npm run lint
npm test
npm run presubmit
npm run audit:dependencies
npm run build
npm run coverage
```

Run targeted/complete Playwright E2E where applicable. A green automated suite does not replace package/hardware/Steam acceptance for features that depend on those environments.

### 4. Package and acceptance

For a Steam-target promotion, record:

- Electron package build result;
- packaged smoke route;
- desktop/Deck route as required;
- Steam auth/lobby/account route as required;
- performance evidence where release-critical;
- save/stat/cloud observations where touched.

Store dated evidence under `docs/reports/`.

### 5. PR integration

1. Integrate through a PR to `mothership`.
2. Verify CI on the PR/head commit.
3. Complete cross-lane audit and acceptance matrix.
4. Merge only when the PR description accurately distinguishes shipped, verified, and still-open work.

### 6. Release publication

After merge:

1. Create/update `docs/releases/vX.Y.Z-*.md` from accepted work.
2. Create the annotated git tag.
3. Publish the GitHub release.
4. Prepare/audit Steam depots.
5. Upload only through the explicitly authorized release path.
6. Update `PRODUCT_STATE.md` and this ledger to the promoted version.

---

## Release discipline introduced in Sprint 30

Every release claim should be traceable through the same progression used for sprint work:

**Designed → Coded → Connected → Tested → Live-verified → Packaged-verified → Accepted**

A release note should describe work at the evidence level it actually reached. This is the core correction intended to stop unfinished acceptance work from disappearing when sprint/version labels advance.
