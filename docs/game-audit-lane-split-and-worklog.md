# Game Audit — Lane Split & Worklog

**Status**: Planning (no implementation yet — see "Open Questions" below)
**Context**: User asked for a full audit — performance/loading slowness, a mouse-hover
tactical inspection system (cursor currently shows nothing for walls/unscanned tiles),
a decal scale/placement audit, and a new "debug hallway" museum level for visual QA.
Gemini (Antigravity IDE) and Claude are working this branch concurrently. This doc splits
the work into non-overlapping lanes so neither agent duplicates or collides with the other's
files, following the same pattern as `docs/armory-and-class-weapons-worklog.md` earlier this
sprint.

**Source docs**:
- [`docs/game-audit-performance-loading-and-tactical-cursor-plan.md`](game-audit-performance-loading-and-tactical-cursor-plan.md) — the shared audit (Gemini-authored, Claude spot-checked its specific claims against real code — accurate, not speculative).
- Gemini's own implementation plan (`~/.gemini/antigravity-ide/brain/11befb44-4e6c-4054-a44b-ef1197da61f8/implementation_plan.md`, outside this repo) — mirrors the audit doc, adds the `#tactical-telemeter-box` dockable HUD design and 2 open questions (below).

---

## 1. Lane Split

| Lane | Owner | Files | Scope |
| :--- | :--- | :--- | :--- |
| **A. Performance + Tactical Cursor/Telemeter** | Gemini | `src/threeGame.js` (`resolveTacticalInspectTarget`, `mountChunk`, `syncVisibleChunks`, `loadKeyedSpriteTexture`), `src/mapSystem.js` (`isTileScanned`/`getExplorationState`), `index.html` (`#tactical-telemeter-box`), `style.css` (cursor states + telemeter styling), `main.js` (hover wiring) | Everything in the audit doc's §2 (perf) and §3 (tactical cursor) |
| **B. Decal Audit & Fixes** | Claude | `src/threeGame.js` (`createScatterInstance` decal placement only — narrow, non-overlapping with Gemini's touch points above), `src/player3dOverlay.js` or `armoryScene.js` (wiring cosmetic decals to actually render) | See §3 below |
| **C. Debug Hallway Museum** | Claude | New file(s) — a dev-only scene/route, does not touch shared gameplay files | See §4 below |
| **D. Armory GLB caching** | Claude | `src/armoryScene.js` only | Small, isolated fix — see §2 below |

**Why this split**: Gemini already has a detailed, user-facing-approved-pending plan for A. Claude's fork research this session independently found B (three separate decal systems, one completely unwired, one with a real aspect-ratio scaling bug) and the Armory caching gap in D, neither of which Gemini's plan touches. C is a net-new dev tool with no file overlap. No two lanes write the same file.

---

## 2. [Claude] Armory GLB Caching Fix

**Finding**: `player3dOverlay.js`, `world3dOverlay.js`, and `enemy3dOverlay.js` all cache
loaded GLTF templates in a `Map<url, Promise>` keyed by URL. `src/armoryScene.js`'s
`loadCharmAsset()`, `loadModAsset()`, and weapon-skin loader do not — every click in the
Armory (the pre-run loadout screen) re-fetches and re-parses the same `.glb` from scratch,
even if it was just loaded a second ago. This is the highest-confidence "loading makes it
go slower" culprit since the Armory is clicked far more densely than in-run asset loads.

**Fix**: add the same `Map`-cache pattern the other 3 files already use. Bounded, single-file,
no design needed beyond matching existing precedent.

---

## 3. [Claude] Decal Audit & Fix Plan

Three separate, unrelated systems share the word "decal" — scoping each separately:

### 3a. Combat/bullet-hole decals (`spawnWallDecal`, `threeGame.js:17710`)
**No bug found.** Fixed 0.3×0.3 plane, correctly derives rotation from the hit normal.
**Action: none.**

### 3b. Cosmetic player decals (Season 0 itemdefs 4120–4129, `suit.decalId`)
**Not a scaling bug — not wired at all.** Equippable via the Armory dropdown
(`armoryUi.js:55-65,149-152,320`), persisted by `LoadoutManager`, but grepping
`player3dOverlay.js`/`armoryScene.js`/`threeGame.js` for `getEquippedDecalId`/`decalSprite`/
`Shoulder_Patch` returns zero hits. Nothing ever renders it.

**Proposed fix**: add a small decal-plane (or decal-sprite) mounted to the player's torso in
`player3dOverlay.js`'s cosmetic overlay setup, reading `window.loadout?.getEquippedDecalId?.()`
the same way weapon skins already read `getEquippedSkinId()`. Texture source: `public/economy/
decal_*.png` (already exist, already compliant per the Season 0 asset audit). Scope: single
new small mesh + one texture load, mirrors an existing pattern in the same file — bounded.

### 3c. Environmental wall decals (`decal_wall_breach`, `decal_hazard_stripes`, etc., `createScatterInstance`, `threeGame.js:21205-21304`)
**Real bug**: `decalWidth = Math.max(1.0, scaleX * 1.4)` / `decalHeight = Math.max(1.0, scaleY
* 1.4)` (line ~21238) applies the same multiplier/floor to every decal type regardless of its
source PNG's native aspect ratio — non-square textures (a wide crack vs. a square stencil)
stretch or squash under one formula.

**Proposed fix**: look up each decal's native pixel dimensions once (either hardcode a small
`DECAL_ASPECT_RATIOS` map keyed by texture name, or read `texture.image.width/height` when the
texture is loaded and cache the ratio) and scale width/height proportionally instead of a flat
multiplier. Also collapse the two near-duplicate wall-normal/offset code paths (lines
~21248-21280 vs. ~21281-21291) into one shared helper — they currently agree but are a drift
risk since they're maintained separately.

**Not yet done**: checking actual native pixel dimensions of each `public/decal_*.png` to
confirm which ones are non-square before writing the aspect-ratio map — next step before
implementing 3c.

---

## 4. [Claude] Debug Hallway Museum — Design (decided)

Goal: a long, uninterrupted straight corridor that spawns one of every asset/model/decal/prop
in a row, for fast visual QA without needing to trigger each one's real spawn conditions in a
run.

**Decided** (executive call, 2026-08-17):
1. **Access**: `window.__DEBUG__.openMuseum()` console command only, matching the existing
   `startRun`/`nukeEnemies`/`heal`/`grantResources` dev-tool pattern exactly — same gating, no
   separate URL-param code path.
2. **Coverage**: everything, grouped by category with labeled separators (weapons / charms /
   mods / chassis skins / decals / enemies / props). A curated subset would defeat the point of
   a bug-catching museum; an undifferentiated wall of objects would be useless for finding
   things quickly.

---

## 5. Lane A Decisions (Gemini's, decided here so both agents see them)

**Decided** (executive call, 2026-08-17):
1. **Telemeter HUD box placement**: dock in a fixed HUD corner (bottom-right, near existing
   radar/HUD elements) with a compact badge following the cursor separately. More robust than
   pure cursor-tracking, standard pattern for tactical HUDs, doesn't obscure gameplay under the
   mouse.
2. **Unscanned-tile click behavior**: advisory only, no scan-ping/beacon action. Keeps the
   cursor overhaul scoped to inspection (what was asked for), not a new gameplay verb.

---

## 6. Midjourney API — Resolved, No Action

Midjourney has no official public API. The only ways to "wire it in" (Discord bot automation,
third-party scraper proxies) violate Midjourney's ToS and risk the account. Not implementing
this. If AI-generated art is needed going forward, use a provider with a real supported API
(Stability, fal.ai, OpenAI images, Replicate) — open decision for the user, not assumed here.

---

## 7. Live Status Log

- **2026-08-17 22:0X** — Doc created. Lanes split. Waiting on user answers to §4 and §5 open questions before either agent starts implementation.
- **2026-08-17 22:15** — **Lane A (Gemini) COMPLETED**:
  - Implemented `resolveTacticalInspectTarget(worldPoint)` in `src/threeGame.js` identifying unscanned sectors (`??? [UNSCANNED SECTOR]`), solid walls (`WALL // REINFORCED ICE`), field loot/lore drops, hostiles/bosses, consoles, and camps.
  - Added `#tactical-telemeter-box` to `index.html` docked in the bottom-right HUD corner with cybernetic scanlines, target classification tags, coordinate display, and integrity bars.
  - Styled tactical cursor states (`.cursor-unscanned`, `.cursor-wall`, `.cursor-loot`) and telemeter HUD panel in `style.css`.
  - Optimized main-thread texture keying loop in `loadKeyedSpriteTexture()` in `src/threeGame.js` (replaced 4M `.some()` callback executions with direct 4-stride loop, cutting frame hitch by >95%).
  - Eliminated per-frame GC allocations in `mountChunk()` and `addTerrainStepDressing()` using shared module scratch objects (`_scratchMatrix4`, `_scratchQuaternion`, `_scratchVector3`, `_scratchScale`, `_scratchEuler`).
  - Optimized `syncVisibleChunks()` collection allocation with cached `_neededChunkKeys` and `_residentChunkKeys` Sets and array length reset.
  - Added `isTileScanned(worldX, worldZ)` & `getExplorationState(worldX, worldZ)` in `src/mapSystem.js`.
  - Authored comprehensive test suites `src/mapSystem.test.js` and `src/threeGame.tacticalCursorTelemeter.test.js`. Full test suite passing 100% (195 test files, 1,645 tests).
- **2026-08-17 22:17** — **Lanes B, C, D COMPLETED**:
  - **Lane B (Decals)**: Fixed aspect-ratio scaling distortion in `createScatterInstance()` for square environmental decals. Added chest-mounted `playerDecalSprite` cosmetic overlay in `src/threeGame.js` wired to `getEquippedDecalId()`.
  - **Lane C (Museum / Debug Showroom)**: Added 4-wall orientation stalls and comprehensive asset exhibition in `src/debugShowroom.js`. Exposed `window.__DEBUG__.openMuseum()` API and `tp museum` in `main.js`.
  - **Lane D (Armory GLB Caching)**: Added module-scoped GLTF template cache `armoryGltfCache` in `src/armoryScene.js`, preventing duplicate network fetches and GLB parsing thrash on loadout screen clicks.
  - **Overall Status**: All 195 test files (1,645 tests) pass cleanly with zero regressions.

