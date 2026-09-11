# Sprint 34: Outstanding Items, Real Tree State, and Sprint Handoff

> **Verified Tree State:** Audited on 2026-09-11 against branch `dev/sprint-34` (PR #62) targeting `mothership`.  
> Suite baseline: 322 test files, 2,854 tests passing (100% green). Lint: 0 errors.

---

## 1. Critical Finding: Steamworks Inventory Schema Upload File

Your Steamworks schema upload artifact had fallen out of sync with the git-tracked schema source:

* `steam/inventory_schema_hunker_bunker.json` was updated at 23:07 by commit `aed6b99`.
* `dist/steam/inventory_schema_hunker_bunker.UPLOAD.json` was generated earlier and lacked those updates.

### What the stale upload would have broken if published:

| Item Def ID | Stale Upload Artifact State | Authoritative Schema State (`aed6b99`) | Consequence if Uploaded |
| :--- | :--- | :--- | :--- |
| **`4001`** | `Cache Key` | `Relic Decryption Key` + F2P-compliant description | Reverts critical F2P anti-lootbox rename |
| **`4105`** | `Obsidian Shard Revolver` | `Obsidian Shard Sidearm` | Reverts weapon categorization fix |
| **`4107`** | `class:engineer` | `class:tank` | Reverts operator class tag fix |

### Resolution & Verification
The upload artifact has been regenerated at `dist/steam/inventory_schema_hunker_bunker.UPLOAD.json`:
- **123 item definitions** &middot; **89.5 KB** &middot; verified byte-in-sync (`in sync: True`).

```bash
# Verify schema sync before uploading to Steamworks:
python3 -c "
import json
a=json.load(open('steam/inventory_schema_hunker_bunker.json'))
b=json.load(open('dist/steam/inventory_schema_hunker_bunker.UPLOAD.json'))
print('in sync:', a==b, '| defs:', len(a['items']))"
```

---

## 2. Closed This Sprint (`dev/sprint-34`)

All items below have been implemented, verified with unit/integration tests, committed, and pushed to `origin/dev/sprint-34` under PR #62:

1. **Sprint 33 Findings Register (G01–G10):** All 10 finding packages are closed and verified.
2. **Sprint 34 Deliverables:**
   - 3D runtime GLB assets placed in `public/3d/runtime/new3ds/`.
   - Enemy variant meshes generated (`build_enemy_variant_meshes.py`).
   - Weapon finish material pipeline wired (`src/weaponFinishMaterial.js`).
   - Beta Season 1 Deep Crust Protocol planning document created & technical plan appended (`docs/hunker-bunker-beta-season-1-plan.md`).
3. **CI/CD & Security Fixes:**
   - **CodeQL Alert #49** (`js/unneeded-defensive-code`) resolved in `main.js:12597` (commit `c9773d6`).
   - **CI Presubmit Dependency Fix:** Resolved `ModuleNotFoundError: No module named 'numpy'` in `scripts/fix-chroma-economy-icons.py` by implementing a pure stdlib (`struct` + `zlib`) PNG border decoder for `--check` mode (commit `7307742`).
   - **10 GitHub Code Quality Bot Warnings:** Replaced bare `open()` calls with context managers, and removed unused imports/variables across 6 python scripts (commit `9ed333c`).
4. **Session Log Export & Upload Pipeline:**
   - Wired `exportlogs` (and console **EXPORT** button) to attempt direct upload to `https://steam.tuesdaycinema.club/logs/session` first, with seamless fallback to local disk/dev sink/downloads on failure (`src/sessionLogSink.js`, `src/debugConsole.js`).
   - Added `/logs/session` proxy to `vite.config.js` and updated CORS headers in `server/index.js` (commits `77a1a2a`, `2f9e13b`).
5. **Root Directory Tidy:**
   - Reduced root entries from 40 &rarr; 32.
   - Moved `tmp/` (29 MB of source masters) &rarr; `art/lore-drop-chroma/`.
   - Moved `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md` &rarr; `.github/`.
   - Moved `ASSET_PROVENANCE.md` &rarr; `docs/`.
   - Moved deployment infra (`Caddyfile`, `Dockerfile`, `docker-compose.yml`, `fly.toml`) &rarr; `deploy/`.
   - Pinned `name: hunker-bunker` in `deploy/docker-compose.yml` to preserve named Docker volumes and SSL certificates.
6. **README Imagery & Broken Class GIFs:**
   - Replaced deleted Sprint 31 GIFs (`Scout.Intro.gif`, `Tank.Intro.gif`, `Eng.Intro.gif`) with high-resolution class intro posters.
   - Swapped stale teaser images for authentic recent gameplay captures.

---

## 3. Open — Requires Human / User Action

These items cannot be executed autonomously by agents and require your direct access to external accounts or physical devices:

1. **Upload Inventory Schema to Steamworks:**
   - In Steamworks Partner backend &rarr; *Community & Economy* &rarr; *Item Inventory*:
   - Upload `dist/steam/inventory_schema_hunker_bunker.UPLOAD.json`.
2. **Item Tag Localization Completion:**
   - 29 tag localization rows + 2 format strings exist in [steam-item-tag-localization.md](steam-item-tag-localization.md); 25 tags still require English localization entries in the Steamworks dashboard.
3. **Netlify Production Deployment:**
   - Trigger a build/deploy on Netlify to publish the newly keyed transparent decals, economy icons, and audio.
4. **Steam Depot Dispatch:**
   - Run `npm run steam:upload` when ready to stage the candidate build to the Steam private testing branch.
5. **Physical Steam Deck Testing ([Issue #53](https://github.com/grounded-play/hunker-bunker/issues/53)):**
   - Execute the 1280×800 controller-only route on physical Deck hardware in Gaming Mode (protocol detailed in [tickets-acceptance-testing-plan.md](tickets-acceptance-testing-plan.md)).
6. **Two-Account Steam PvP Certification ([Issue #51](https://github.com/grounded-play/hunker-bunker/issues/51)):**
   - Launch with accounts `BUNKER-1` and `RAVEN-7` to certify anti-one-shot PvP damage scaling and remote chassis synchronization.

---

## 4. Open — Written but Not Built (Code Gaps & Backlog)

| Item / Document | Status | Description & Real Code Gap |
| :--- | :--- | :--- |
| **[`planning/o2-cinematic-doors-and-boss-destruction-plan-2026-09-10.md`](planning/o2-cinematic-doors-and-boss-destruction-plan-2026-09-10.md)** | **GENUINE CODE GAP** (Priority #1) | Only `src/o2CinematicDoors.test.js` exists; **`src/o2CinematicDoors.js` has not been implemented**. The door and video cutscene choreography runtime module is missing. |
| **[`planning/cosmetic-loadout-gameplay-design-2026-09-10.md`](planning/cosmetic-loadout-gameplay-design-2026-09-10.md)** | Design Proposal | Marked *design proposal, not implemented*. Covers charm/chassis/patch playstyle passives reshaped around F2P fairness. |
| **[`hunker-bunker-beta-season-1-plan.md`](hunker-bunker-beta-season-1-plan.md)** | Approved Design Draft | 16-section plan for Beta Season 1 (Deep Crust Protocol). 6 implementation packages (A–F) deliberately deferred to next sprint. |
| **[`planning/astra-game-improvement-plan-2026-09-08.md`](planning/astra-game-improvement-plan-2026-09-08.md)** | Acceptance Backlog | 13 unchecked items in §23. Primarily human-facing validation (uncoached playtests, seed-portfolio reachability, co-op verification). |
| **[`planning/sprint-30.md`](planning/sprint-30.md)** | Active / Stale Plan | 16 open checkboxes pointing at older branch `dev/sprint-33`. Needs a scope decision to either close or officially carry forward into next sprint. |

---

## 5. Standing Constraints & Operational Rules

1. **Retail Payload Headroom:**
   - Headroom is currently **~2.7 MB** before exceeding store budget limits. No raw or uncompressed assets may be added to `public/` without an equivalent offset or compression pass.
2. **Production Docker Invocation:**
   - With the infra files moved to `deploy/`, use the pinned command:
     ```bash
     docker compose -f deploy/docker-compose.yml up -d --build
     ```
3. **Documentation Portability (`scripts/audit-docs.js`):**
   - No `file://` links in non-archive docs.
   - All relative links must point to existing files on disk.

---

## 6. Recommended Next Development Priority

The immediate code task to pick up next is:
> **Implement `src/o2CinematicDoors.js`** to satisfy the existing contract in `src/o2CinematicDoors.test.js`.  
> It is the only item in the repository that currently has a comprehensive plan and test harness waiting for the runtime implementation.
