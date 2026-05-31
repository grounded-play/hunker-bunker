# Hunker Bunker — Weekly Sprint Plan

**Week of:** Monday 2026-06-01 → Sunday 2026-06-07
**Branch:** `dev10sprint` (Sprint 10 — Combat Systems)
**Author cadence:** solo dev, day-by-day
**Status:** DRAFT v1 (to be iterated)

---

## 0. Context Snapshot

Hunker Bunker is a top-down isometric survival/roguelike built on **Three.js for the 3D
scene + DOM for UI**. The player crash-lands, ventures out from a Mothership/O2 generator
hub across biomes (ACTIVE → CRYO → BIO), fights enemies, collects loot, banks resources,
and unlocks upgrades through a console terminal.

### Recently shipped (last ~2 weeks of commits)
- `feat(atmosphere)` Day/night cycle + weather system (Notes 8 & 9)
- `fix(atmosphere/ui)` Gentler day-night transitions, gated scanner arrow, terminal clock
- `fix(lighting)` Centered the player glow pool on the sprite (not its feet)
- 8-direction character sprites + night-visibility tuning
- Archive modal layout / header control refinements
- Puddle + wet-footprint polish, menu music start hook (current working tree)

### In-flight / known issues entering the week
1. **Fog-of-war is wrong (HIGH).** Visibility uses `THREE.Fog`, which fades by *camera
   depth*. Under the angled orthographic camera this bands the screen (bottom/near clear,
   top/far dark) instead of forming a circle around the player. Sprites created with
   `fog: false` (most enemies/loot) ignore fog entirely and visibly "sit on top" of it.
   - A radial DOM darkness overlay (`updatePlayerDarkness`) was started but **only
     partially applied**: the method + its call landed, but the overlay *element creation*
     edit failed, so `this.darknessOverlay` is undefined and the method is currently a
     safe no-op. The fog-range taming edit's state is unverified. **File compiles
     (`node --check` OK).** This must be finished and verified first thing Monday.
2. Working tree has uncommitted changes in `main.js`, `src/audio.js`, `src/threeGame.js`
   (puddles/footprints/menu-music + the partial fog work) — needs sorting into clean commits.

### The four standing design pillars (from the work archive)
- **Sprint 10 Combat Systems** — weapon skill tree ("COMBAT MATRIX"), per-class damage
  (TANK = 2), forgiving hitboxes, wall decals, physics debris, feature flags.
- **Roguelike Vitals & Banking** — health hearts, O2 drain, banking system, goal-gated
  unlocks (O2 Bubble unlocks first), console terminal redesign.
- **Cutscene + Tutorial** — crash cutscene → Mothership dialogue → skip/tutorial choice.
- **Atmosphere** — day/night + weather (largely shipped; now in the polish/tune phase).

---

## 1. North-Star Goal for the Week

> **"A readable, atmospheric combat loop."**
> By Sunday, a fresh run should: spawn with correct fog-of-war visibility, present the
> COMBAT MATRIX weapon tree through the terminal, let the player feel meaningful per-class
> damage with forgiving hitboxes, and survive on the hearts + O2 vitals loop with banking
> driving at least one unlock (O2 Bubble). Atmosphere (day/night/weather) should read as
> mood, never as a visibility bug.

**Definition of "week done":**
- [ ] Fog-of-war is a circle centered on the player; enemies/loot are covered uniformly.
- [ ] COMBAT MATRIX weapon tree is navigable and at least 2 weapon upgrade paths apply in-game.
- [ ] Per-class damage + forgiving hitboxes verified across all classes.
- [ ] Vitals (hearts + O2 drain) + banking loop playable; O2 Bubble unlock purchasable and effective.
- [ ] No regressions in day/night, weather, lighting, sprites.
- [ ] Clean commit history on `dev10sprint`; no stray dead code.

---

## 2. Day-by-Day Sprint

### 🟦 Monday 2026-06-01 — Atmosphere debt & clean base
**Theme:** Land the fog-of-war fix; clean the working tree so the week starts green.

**Tasks**
1. **Finish the radial fog-of-war overlay** in `src/threeGame.js`:
   - Re-apply the failed edit: create the `darknessOverlay` DOM element in scene setup
     (after `this.container.replaceChildren(...)`), set container `position: relative`,
     init `this._darknessCenter = new THREE.Vector3()`, and append the overlay above the
     canvas (`replaceChildren(renderer.domElement, darknessOverlay)`).
   - Confirm `updatePlayerDarkness(alpha)` projects the player anchor to screen px and
     paints a `radial-gradient(circle … at cx cy, transparent 0–30%, fog-color α 100%)`.
   - Confirm the fog-range taming (`baseFogRange.near * 1.4–1.7`, `far * 1.9–2.3`) landed
     so `THREE.Fog` no longer bands the screen.
2. Verify intensity is driven by day/night (`dayBlend`) + weather (`fogFarMult`).
3. **Sort the working tree** into focused commits: (a) puddle/footprint polish,
   (b) audio/menu-music, (c) fog-of-war overlay. No mixed commits, no dead no-ops.

**Acceptance criteria**
- Standing still at night, darkness is a soft circle centered on the sprite; edges dark,
  center clear. Moving the player keeps the circle centered (project, don't hardcode center).
- An enemy/loot sprite at screen edge is darkened by the overlay (no "on top of fog" pop).
- Daytime: overlay near-invisible; weather (fog_gust/rainstorm) visibly tightens the circle.
- `git status` clean except intended commits; `node --check src/threeGame.js` passes.

**Files:** `src/threeGame.js` (scene setup ~L660, `updateDayNightCycle`/`updatePlayerDarkness`).
**Risk:** Orthographic projection center drift during camera lerp — project every frame.

---

### 🟦 Tuesday 2026-06-02 — COMBAT MATRIX: data & terminal UI
**Theme:** Stand up the weapon skill tree's data model and terminal presentation.

**Tasks**
1. Define/confirm the COMBAT MATRIX data: weapons, upgrade nodes, costs, prerequisites,
   and which stat each node modifies (damage, fire rate, spread, projectile count, pierce).
2. Render the matrix in the console terminal (reuse the existing terminal section pattern
   used by tier2/weapons sections — `terminal-weapon-*` ids).
3. Wire purchase buttons → banked-resource spend → persisted weapon levels.
4. Gate nodes behind prerequisites + affordability; show locked/owned/affordable states.

**Acceptance criteria**
- Opening the terminal shows the COMBAT MATRIX with each node's level, cost, description.
- Buying a node deducts banked resources and visibly updates the node state.
- Prereqs enforced (can't buy a downstream node before its parent).

**Files:** `src/threeGame.js` (terminal render/update methods), terminal HTML/CSS, any
weapons/skill config module.
**Risk:** Scope creep on tree size — cap at 2–3 weapons × 3 nodes for this sprint.

---

### 🟦 Wednesday 2026-06-03 — COMBAT MATRIX: in-game effects
**Theme:** Make purchased upgrades actually change the shooting feel.

**Tasks**
1. Apply weapon-level stats to `spawnProjectile` / firing logic (damage, fire rate,
   spread, count, pierce).
2. Implement **per-class damage** (TANK = 2 baseline; confirm other classes) feeding into
   the same damage pipeline so upgrades multiply class base.
3. Add **forgiving hitboxes** (slightly enlarged player-friendly hit tests; slightly
   generous enemy hurtboxes) behind a feature flag.

**Acceptance criteria**
- Two weapon paths produce visibly different firing behavior after purchase.
- TANK deals 2× the reference class on the same target; numbers reconcile with upgrades.
- Near-miss shots that "should" connect now register (manual feel test) with the flag on;
  flag off restores strict hitboxes.

**Files:** `src/threeGame.js` (projectile/combat, class ability init, feature flags).
**Risk:** Damage double-counting — centralize the damage formula in one helper.

---

### 🟦 Thursday 2026-06-04 — Vitals & banking loop
**Theme:** Close the survival loop: hearts, O2 drain, banking, first unlock.

**Tasks**
1. Verify **health hearts** + **O2 drain** (biome-scaled drain multipliers already exist).
2. Verify **banking**: collected resources bank at the hub; spendable in terminal.
3. Implement/verify **O2 Bubble** as the first goal-gated unlock; confirm it changes O2
   behavior (slower drain / safe bubble) when owned.
4. Ensure death/extraction interacts cleanly with vitals + banked progress.

**Acceptance criteria**
- O2 visibly drains away from generator, faster in CRYO/BIO; refills near hub.
- Hearts deplete on damage, run ends at zero.
- Banking → buy O2 Bubble → measurable O2 benefit in the next foray.

**Files:** `src/threeGame.js` (vitals/O2, banking, mission/extraction, terminal unlocks).
**Risk:** Balancing drain vs. fun — expose tunables; don't hardcode magic numbers deep.

---

### 🟦 Friday 2026-06-05 — Combat juice & atmosphere polish
**Theme:** Wall decals, physics debris, and making the new systems feel good.

**Tasks**
1. **Wall decals** on projectile/enemy impacts (behind feature flag; pool + cap them).
2. **Physics debris** on enemy death / destructibles (capped, performance-safe).
3. Polish day/night + weather interplay with the new fog-of-war overlay (no double-darkening
   that hides combat).
4. Performance pass: confirm decals/debris/overlay don't tank frame rate on the gameplay
   pixel-ratio profile.

**Acceptance criteria**
- Impacts leave decals that fade; counts are capped (no unbounded growth).
- Debris spawns, settles, and is cleaned up; stable FPS during a heavy fight.
- Combat remains readable in heavy weather at night.

**Files:** `src/threeGame.js` (decals, debris, weather, overlay), feature flags.
**Risk:** GC churn — reuse geometries/materials, pool objects.

---

### 🟦 Saturday 2026-06-06 — Cutscene + tutorial on-ramp (buffer day)
**Theme:** First-run experience; absorb any overflow from Mon–Fri.

**Tasks**
1. Crash cutscene → Mothership dialogue → **skip / tutorial** choice (per archive plan).
2. Tutorial path surfaces: movement, shooting, O2/hearts, banking, terminal/COMBAT MATRIX.
3. Skip path drops straight into a run with sane defaults.
4. **Overflow buffer:** finish anything slipped from earlier in the week first.

**Acceptance criteria**
- New player sees crash → dialogue → choice; tutorial teaches the 5 core systems; skip works.

**Files:** new cutscene/tutorial module(s), `main.js` wiring, `src/threeGame.js` hooks.
**Risk:** This is the most likely day to compress — protect it as buffer, not new scope.

---

### 🟦 Sunday 2026-06-07 — Stabilize, test, retro, plan next
**Theme:** Make it solid and write the trail for next week.

**Tasks**
1. Full **playtest pass** of the loop: spawn → fight → bank → unlock → die/extract → repeat.
2. Regression check: day/night, weather, lighting, 8-dir sprites, fog-of-war, archive modal.
3. Fix top 3 bugs found; file the rest.
4. Tidy commits; ensure `node --check` clean and no dead code/no-ops shipped.
5. **Retro** (below) + draft next week's sprint goal.

**Acceptance criteria**
- A 10-minute play session has no blocking bugs; "week done" checklist re-verified.
- Memory archive updated with anything non-obvious learned this week.

**Files:** repo-wide; `docs/sprints/` next-week stub; memory archive.

---

## 3. Testing Checklist (run before each EOD commit)
- [ ] `node --check src/threeGame.js` passes.
- [ ] App boots to menu; starting a run works.
- [ ] Fog-of-war: circle centered, enemies/loot covered, day vs night vs weather differ.
- [ ] Terminal opens; COMBAT MATRIX renders; a purchase applies in-game.
- [ ] O2 drains/refills correctly; hearts deplete; death/extraction work.
- [ ] No console errors; frame rate stable in a heavy fight.

## 4. Stretch Goals (only if ahead)
- Minimap / scanner improvements building on the gated scanner arrow.
- A second biome-specific weather variant.
- Sound design pass for combat + unlock stingers.

## 5. Risks & Mitigations
| Risk | Mitigation |
|---|---|
| Combat tree scope creep | Cap at 2–3 weapons × 3 nodes this sprint |
| Damage formula duplication | One centralized damage helper |
| Perf from decals/debris/overlay | Pool + cap everything; test on gameplay pixel-ratio |
| Tool/channel flakiness in dev env | Route results through files; verify via `node --check` + playtest |
| Buffer day eaten by overflow | Saturday is buffer, not new scope |

## 6. Retro (fill Sunday)
- **What shipped:**
- **What slipped (and why):**
- **Surprises / learnings (→ memory archive):**
- **Next week's north-star:**

---

*Iteration log:*
- *v1 (2026-05-31): Initial draft from repo history + work archive. To refine with full
  archive detail (vitals/banking specifics, combat-matrix node list) once available.*
