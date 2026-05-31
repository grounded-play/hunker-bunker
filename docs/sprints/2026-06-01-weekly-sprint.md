# Hunker Bunker — Sprint 12 Weekly Plan

> **Theme: "Foundations & finish — Hex Terrain + atmosphere debt + stabilization."**
> The roadmap's Phases 1–3 are essentially shipped. The one marquee feature still
> unstarted is the **Hex Terrain system** (Agent 1 + Agent 2 plan). This week lays its
> foundation, finishes the half-applied fog-of-war fix, and stabilizes the large body of
> recently shipped systems.

**Week of:** Monday 2026-06-01 → Sunday 2026-06-07 (verified: 2026-06-01 is a Monday)
**Branch:** `dev10sprint` → cut `dev12sprint` Monday
**Cadence:** solo dev, day-by-day
**Status:** v4 — **fully reconciled against the live code** (see correction note)

---

## 0. Reality check (verified against the live code, not just the archive)

The `.claude-work/archive-2026-05-30/` docs (roadmap, gaps, vision) are a snapshot from
2026-05-29/30. The project has since sprinted past almost the entire roadmap. Verified
**already implemented** in code:

- **Win/loop:** extraction + mission state, run score + grade, death report, Daily Ops.
- **Classes:** all three active abilities — SCOUT `sprint`, TANK `fortify`, ENGINEER
  `overclock` (`CLASS_STATS`, `triggerClassAbility`/`updateClassAbility`, `KeyF`) — **plus**
  the full UX layer: `#class-ability-panel` + `#ability-bar` cooldown HUD, `#touch-ability-btn`
  mobile button, `class-ability-activated/ended` event wiring.
- **Enemies:** Snail + **Crawler** (`CRAWLER_MAX_HP/DETECT_RADIUS/WINDUP_DURATION`) +
  **Sentinel** (`SENTINEL_MAX_HP=3`, `SENTINEL_FIRE_COOLDOWN=2.5`, `spawnEnemyProjectile`,
  `sentinel-fired` warning flash, `forceSentinel` rooms) + biome bosses.
- **World/content:** authored room templates (ARMORY, THE NEST, wreckage, …), 27-ish lore
  logs + Bunker Archive ledger, reactive Mothership lines.
- **Combat feel:** class damage (TANK 2), forgiving hitbox, wall decals, physics debris,
  multishot, COMBAT MATRIX weapon tree.
- **Atmosphere:** day/night + weather (incl. rainstorm), distress/O2-low vignettes.

**Genuinely still OPEN (this week's targets):**
- [ ] **Hex Terrain system** — NOT started (grep confirms no hex/axial/cube-coord code).
      Plans ready: `.claude-work/archive-2026-05-30/agent1-main-hex-terrain.md` +
      `agent2-secondary-hex-terrain-tests.md` (roadmap 4.4; a 1–2 week lift — this week = foundation).
- [ ] **Fog-of-war fix** — HALF-APPLIED in the working tree (details below); finish + verify.
- [ ] **Working tree is dirty** — uncommitted puddle/footprint + audio/menu-music + partial
      fog work in `main.js`, `src/audio.js`, `src/threeGame.js`; sort into clean commits.
- [ ] **Stabilization** — many systems shipped fast via overnight autonomous builds; only
      2 test files (`bank.test.js`, `generator.test.js`); needs a cohesion/balance/perf pass.

### ⚠️ Carry-over bug — the fog-of-war fix (finish Monday)
`THREE.Fog` fades by **camera depth** → under the angled ortho camera it bands the screen
(near/bottom clear, far/top dark) instead of a circle around the player, and `fog:false`
sprites (enemies/loot) "sit on top" of it. Working-tree state:
- ✅ `updatePlayerDarkness(alpha)` + its call in `updateDayNightCycle` landed (~L4825/L4830).
- ✅ Fog-range taming landed (`baseFogRange.near * 1.4–1.7`, `far * 1.9–2.3`, ~L4811).
- ❌ Overlay **element creation never applied** → `this.darknessOverlay` is undefined, method
  is a safe no-op; `replaceChildren` at ~L667 is still single-arg. Compiles; no crash.

---

## 1. North-Star Goal for the Week

> **By Sunday:** the fog-of-war reads as a clean circle in all day/night/weather states;
> the working tree is committed clean with green tests; and the Hex Terrain system has a
> working **foundation** — coordinate math (tested pure functions), a hex grid that renders,
> and a clear integration path to replace/augment the current chunk terrain in Sprint 13.

**"Week done" checklist**
- [ ] Fog-of-war: player-centered circle; enemies/loot covered; day/night/weather modulate it.
- [ ] Clean commits on `dev12sprint`; `node --check` clean; `npm test` green; no dead code.
- [ ] Hex coordinate module with unit tests (axial/cube, neighbors, distance, pixel<->hex).
- [ ] A hex grid renders in the Three.js scene behind a feature flag (no regression to current terrain).
- [ ] Stabilization: top bugs from a full playtest fixed; perf stable on gameplay pixel-ratio.

---

## 2. Day-by-Day Sprint

### 🟦 Monday 2026-06-01 — Finish atmosphere debt + clean base
1. **Finish the radial fog-of-war overlay** (`src/threeGame.js`): re-apply the failed edit —
   set container `position: relative`, create the `darknessOverlay` div (absolute, inset 0,
   `pointer-events:none`, above canvas), init `this._darknessCenter = new THREE.Vector3()`,
   mount via `replaceChildren(renderer.domElement, darknessOverlay)`; verify
   `updatePlayerDarkness()` projects the player each frame and the fog band is gone.
2. **Sort the working tree** into focused commits: (a) puddle/footprint, (b) audio/menu-music,
   (c) fog-of-war. Run `npm test` + `node --check`.
3. Cut `dev12sprint`.

**Acceptance:** night = centered soft circle that tracks the player; day overlay near-invisible;
weather tightens it; `git status` clean except intended commits; tests green.

---

### 🟦 Tuesday 2026-06-02 — Hex foundation: coordinate math (pure + tested)
1. New `src/pure/hex.js` (or `src/hex.js`): axial + cube coords, `hexToPixel`/`pixelToHex`,
   `hexRound`, `neighbors`, `hexDistance`, `hexRing`/`spiral`.
2. `src/hex.test.js` (vitest) — mirror the rigor in `generator.test.js`; cover round-trips
   and edge cases. Follow `agent2-secondary-hex-terrain-tests.md`.

**Acceptance:** all hex math is pure + fully unit-tested; `npm test` green.

---

### 🟦 Wednesday 2026-06-03 — Hex foundation: render a grid (flagged)
1. Behind `FEATURE_HEX_TERRAIN` (default off), build a hex tile mesh layer in the Three.js
   scene using the coordinate module; instanced/merged geometry for perf.
2. Map a small region to hexes and render it without touching the existing chunk terrain.

**Acceptance:** with the flag on, a hex grid renders correctly aligned to world space; with it
off, the current terrain is byte-for-byte unchanged.

---

### 🟦 Thursday 2026-06-04 — Hex foundation: integration path
1. Spike how hex tiles map to the existing chunk/room/scatter/collision systems
   (per `agent1-main-hex-terrain.md`): tile→walkable, neighbor adjacency for carving.
2. Write the integration notes + a Sprint-13 migration plan; do NOT rip out chunk terrain.

**Acceptance:** a written, reviewed integration plan + a working flagged demo of hex tiles
co-existing with current systems.

---

### 🟦 Friday 2026-06-05 — Stabilization & perf
1. Full playtest per class; log bugs across the recently-shipped systems (abilities,
   Sentinel, weather, fog-of-war, COMBAT MATRIX, room templates).
2. Fix the top issues; perf pass on the gameplay pixel-ratio profile (hex layer off path
   must not regress).

**Acceptance:** no blocking bugs in a 10-min session; stable FPS in a heavy fight.

---

### 🟦 Saturday 2026-06-06 — Buffer + balance
1. **Overflow buffer:** finish any slipped hex/fog/stabilization work first.
2. Balance pass: Sentinel cadence, ability cooldowns, enemy spawn weighting, fog intensity.

**Acceptance:** Saturday protects the week; cadence/feel verified in playtest.

---

### 🟦 Sunday 2026-06-07 — Stabilize, test, retro, queue Sprint 13
1. Regression sweep across all listed systems; `npm test` + `node --check` clean.
2. Tidy commits; no dead code. **Retro** (below) + draft **Sprint 13: Hex Terrain migration**.
3. Update the memory archive (the live state now diverges from `.claude-work/`).

**Acceptance:** "week done" checklist re-verified; Sprint-13 stub written.

---

## 3. Testing Checklist (before each EOD commit)
- [ ] `node --check src/threeGame.js` passes; `npm test` green.
- [ ] Boots to menu; a run starts for each class.
- [ ] Fog-of-war: centered circle; enemies/loot covered; day/night/weather differ.
- [ ] `FEATURE_HEX_TERRAIN` off = current terrain unchanged; on = grid renders correctly.
- [ ] No console errors; stable FPS in a heavy fight.

## 4. Risks & Mitigations
| Risk | Mitigation |
|---|---|
| Hex terrain is a 1–2 week lift | This week = foundation only (math + flagged render + plan), not migration |
| Regressing current terrain | Everything hex is behind `FEATURE_HEX_TERRAIN`, default off |
| Thin test coverage overall | Add `hex.test.js`; run full suite each EOD |
| Dirty working tree → lost work | Commit cleanly Monday before anything new |
| Dev-env tool flakiness | Route results through files; verify via `node --check` + `npm test` + playtest |

## 5. Retro (fill Sunday)
- **Shipped:**  ·  **Slipped (why):**  ·  **Learnings (→ memory):**  ·  **Sprint 13 north-star:** Hex terrain migration.

---

## Appendix — Source traceability
- Hex plans: `.claude-work/archive-2026-05-30/agent1-main-hex-terrain.md`,
  `agent2-secondary-hex-terrain-tests.md`; roadmap 4.4 in `master-roadmap.md`.
- Live-code verification (this is why v1–v3 were corrected): abilities + ability UX
  (`CLASS_STATS` L54, `#class-ability-panel`/`#touch-ability-btn` in index.html, handlers in
  main.js ~L1115–1505), Sentinel (`SENTINEL_*` consts ~L234, `spawnEnemyProjectile` ~L8472),
  Crawler (`CRAWLER_*` consts ~L445), room templates (`ROOM_TEMPLATE_CONFIGS` L454).

*Iteration log:*
- *v1: drafted from the memory index (generic).*
- *v2: grounded in the `.claude-work` roadmap + sprint-10 log.*
- *v3: corrected — class-ability **logic** found in code; pivoted to ability-UX + Sentinel.*
- *v4: corrected again — ability-UX **and** Sentinel are also already shipped; the archive
  is a stale snapshot. Re-themed to the genuinely-open work: Hex Terrain foundation +
  fog-of-war finish + stabilization. (All four versions dated 2026-05-31.)*
