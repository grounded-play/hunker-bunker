# Hunker Bunker Versioning Strategy & Release Roadmap

**Current Active Sprint:** Sprint 30

**Active Development Branch:** `dev/sprint-30`

**Current Working Version:** `v2.3.2-beta` (`2.3.2-beta` in `package.json`)

**Base Stable Release:** [`v2.3.0-beta`](https://github.com/grounded-play/hunker-bunker/releases/tag/v2.3.0-beta)

**Main Branch:** `mothership`

---

## 1. Versioning Architecture & SemVer Standard

Hunker Bunker follows a structured Semantic Versioning convention:

$$\textbf{v[MAJOR].[MINOR].[PATCH]-[PRE-RELEASE]}$$

- **MAJOR (vX.0.0):** Landmark architectural leaps (e.g. initial public release, massive multiplayer network migrations, engine overhauls).
- **MINOR (v2.X.0):** Major Sprint feature deliverables (e.g. Act 2 story expansion, 3D model conversion & Armory overhaul in v2.3.0-beta).
- **PATCH (v2.3.X):** Iterative feature polish, bug fixes, balancing, optimization, and cosmetic additions within an active sprint lane.
- **PRE-RELEASE TAGS:**
  - `-beta`: Public development and feature sprint builds deployed for testing and verification.
  - `-rc.N`: Release candidates locked for pre-launch validation and Steam depot certification.
  - *(no tag)*: Final production builds published to Steam default branch.

---

## 2. Release & Sprint History Ledger

| Version | Sprint / Branch | Release Date | PR / Base Commit | Key Deliverables & Milestones |
| :--- | :--- | :--- | :--- | :--- |
| **v2.0.1-beta** | Sprint 16 | 2026-07-28 | `v2.0.1-beta` | Baseline survival loop, basic room generation, initial UI framework. |
| **v2.1.0-beta** | Sprint 21 | 2026-08-03 | `v2.1.0-beta` | Multiplayer runtime prototype, co-op damage sync, network seed dispatch. |
| **v2.2.0-beta** | Sprint 26 (`dev/sprint-26`) | 2026-08-20 | [PR #38](https://github.com/grounded-play/hunker-bunker/pull/38) | Steamworks stats (8/8 synced), Steam Cloud save bridge, self-hosted TLS auth backend (`steam.tuesdaycinema.club`), Depth Contract initial wiring, host failover. |
| **v2.3.0-beta** | Sprint 28 (`dev/sprint-28`) | 2026-08-23 | [PR #40](https://github.com/grounded-play/hunker-bunker/pull/40) (`030a8f9`) | **46 new 3D models** (30 community chassis skins + 16 Season 0 assets), redesigned 3-column Armory with class backgrounds, Wanderer companion system, Steam Deck twin-stick aiming preset, mid-run crash recovery (`runCheckpoint.js`), GPU frame profiler, all 8 transformative relics. |
| **v2.3.1-beta** *(merged, not tagged)* | Sprint 29 (`dev/sprint-29`) | 2026-08-24 | `959239c` on `mothership` | Presentation telemetry and fixes, 11 optimized runtime models, reward/XP feedback, lighting reports, weapon/charm calibration, locomotion cadence, and chroma-green auditing. |
| **v2.3.2-beta** *(active working version)* | Sprint 30 (`dev/sprint-30`) | *In progress* | Branch from `959239c` | Acceptance, first-hour/product coherence, real packaged/Deck/Cloud evidence, production two-account co-op, and repository control. |

---

## 3. Sprint 30 Roadmap & Iteration Objectives (`v2.3.2-beta`)

Sprint 30 deliberately narrows the work to acceptance and the defects that its
end-to-end routes expose. The executable plan is
[`planning/sprint-30.md`](planning/sprint-30.md).

```mermaid
graph TD
    A["Sprint 30: v2.3.2-beta"] --> B["1. Single-player Proof Run"]
    A --> C["2. Production two-account co-op"]
    A --> D["3. Deck, Cloud, package acceptance"]
    A --> E["4. Fix measured P0/P1 failures"]
    A --> F["5. Documentation and claim control"]
```

---

## 4. Release Promotion & Verification Workflow

When promoting changes or releasing a version, follow this standard release checklist:

### Step 1: Version Bumping
1. Update `package.json` and `package-lock.json` with the target version.
2. Update `index.html` system tag.
3. Update `PRODUCT_STATE.md` and this ledger.

### Step 2: Full Local Presubmit & Test Gate
Run all audit and test suites to ensure 100% green status:
```bash
npm run lint                  # 0 errors / 0 warnings
npm run presubmit             # Claims, SFX, retail assets, item catalog, soundtrack
npm run audit:dependencies    # Production dependencies mapped
npm run build                 # Vite bundle + audit:build-media
npm run coverage              # Vitest suite (current baseline: 2,151 tests)
```

### Step 3: Branch Pull Request & Review
1. Commit all changes to the active sprint branch.
2. Push that branch to the remote.
3. Open/update PR into `mothership` on GitHub.
4. Verify automated CI/CD checks pass on GitHub Actions.

### Step 4: Merge & Release Publication
1. Merge PR into `mothership`.
2. Generate/update release notes in `docs/releases/vX.Y.Z-beta.md`.
3. Create annotated git tag: `git tag -a vX.Y.Z-beta -m "Hunker Bunker vX.Y.Z-Beta — Sprint Name"`.
4. Push tag: `git push origin vX.Y.Z-beta`.
5. Create GitHub release: `gh release create vX.Y.Z-beta --title "..." --notes-file docs/releases/vX.Y.Z-beta.md`.
6. Dispatch Steam depot release: `HB_STEAM_BACKEND_URL=https://steam.tuesdaycinema.club npm run steam:upload`.
