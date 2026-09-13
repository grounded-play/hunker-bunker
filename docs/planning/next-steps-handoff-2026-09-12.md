# Handoff — what to do next, in order

**Date:** 2026-09-12
**Context:** written at the end of a long session, deliberately naming what was *not* started and why.
**Reads with:** `authored-setpieces-crash-site-and-run-building-plan-2026-09-12.md` (central),
`gate-stage-areas-design-2026-09-12.md`, `setpiece-plan-addendum-2026-09-12.md`.

**Implementation update:** the §1 routing/theme work, pure reservation-footprint
foundation, and first metric structure-shell loader are now landed (`f51f904`,
`b8bddcd`, `b80d2cd`). Six QA worlds are lazy-loaded (`76ef3c7`); the always-on
session logger remains intentionally separate from that change because it is
production diagnostics, not only debug UI. The bundle warning threshold now
matches the deliberate boot graph (`c35bde3`). Remaining gates are allocator
integration into the world plan, one in-world metric shell proof, and visual
acceptance before bulk content authoring.

---

## 0. The bundle warning is not a bug

```
dist/assets/vendor-three--uOmmsVz.js    661 kB
dist/assets/threeGame-DjyNJuJK.js       994 kB
dist/assets/index-pa9sOkgn.js         1,515 kB   <-- warns
```

`vite.config.js` already splits `vendor-three` and `threeGame`, and already sets
`chunkSizeWarningLimit: 1200`. The chunk that warns is `index` — the other ~400 modules in `src/`.

**This is close to irrelevant for the Steam build**, which loads from `file://` with no network
fetch, and near-irrelevant for the web build too: it is a single-page game that needs essentially
all of its code at boot. Code-splitting a game's main bundle buys much less than it does for a
website. Raising `chunkSizeWarningLimit` to silence it is a legitimate response.

**There is one real win inside it, though, and it is a correctness point rather than a size point:**
roughly 3,300 lines of debug-only code ship to players.

| Module | Lines | Statically imported by |
|---|---:|---|
| `debugConsole.js` | 1452 | `threeGame.js`, `vitals.js`, `presentationTelemetry.js` |
| `debugTileGrid.js` | 616 | `threeGame.js`, `debugQaNexus.js` |
| `debugShowroom.js` | 606 | `threeGame.js`, `debugMuseum.js` |
| `debugMuseum.js` | 449 | `debugQaNexus.js` |
| `debugQaNexus.js` | 301 | — |
| `debugBossArenas.js` | 213 | — |
| `debugCampSimulator.js` | 199 | — |

Converting these to `await import()` behind the existing debug gate removes them from the shipped
bundle entirely. **Do not start this casually** — they are imported at several sites and some may be
called synchronously during init, so each call site needs checking. It is a contained, testable
change, but it touches `threeGame.js`, which everyone touches. Land it alone, not alongside feature
work.

---

## 1. Start here — the two wiring fixes

Highest value per line in the whole plan. Both are verified in source (addendum §3), both are
small, and **content authoring is blocked on them** — every hour spent authoring a set piece before
these land is an hour spent against a vocabulary that draws nothing.

### 1a. The architecture kit renders nothing (~24 lines)

All 24 `arch_*` / `state_*` / `fixture_*` GLBs exist, are registered in `WORLD_3D_MODELS`, and are
referenced by `roomThemes.js` in 26 places across 11 of 15 themes. None renders.

**The cause is not missing textures — it is the type prefix.** `createScatterSprite`
(`threeGame.js:25425`) gates on:

```js
if (placement.type.startsWith('prop_')) {
    const spriteMaterial = this.scatterMaterials[placement.type];
    if (!spriteMaterial) return null;
```

`arch_*` does not start with `prop_`, so it falls through to the second branch
(`threeGame.js:25771`), which *also* requires a sprite material and returns `null`.

So the fix is **routing, not assets**: these types are 3D-only and must reach the 3D path without
passing a sprite check. Adding 24 placeholder sprite textures would also work and is the wrong fix —
it invents art to satisfy a branch that should not apply.

Suggested shape: recognise the 3D-only prefixes explicitly and construct the world model directly,
rather than widening the sprite branch. Verify by placing one `arch_bulkhead_frame` from a room
build and seeing it in-world — **not** by the showroom, which is why this stayed hidden:
`debugMuseum.coverage.test.js` asserts showroom reachability, not in-world placement. Add a test
that asserts the latter.

### 1b. 21 faction props are unaddressable (~21 lines)

`CAMP_DRESSING_MODELS` (`camp.js:41`) is keyed by camp id and consumed only at `camp.js:1024` via
`CAMP_DRESSING_MODELS[this.id]`. The Meridian radio, Tallow still, Vesper turret, six hive props,
graves and laundry are reachable only if you *are* that camp — not as a placement type a room build
or set-piece module can request. Same for `hiveSite.js`.

This is the entire faction-identity vocabulary, and the central plan's "camps and hives as place
sets" phase depends on it.

### 1c. Four theme-matrix holes

`bio/medical`, `bio/security`, `bio/engineering`, `active/storage`. The first one matters
immediately: the Ring 2 hospital falls back to generic `bio-resin` and stops reading as a hospital.
Four theme entries.

---

## 2. Then — the setpiece allocator

`src/setpieceBuilds.js`, `src/data/setpieceBuilds.js` and their tests already exist (committed in
`5e45e1a`), with `crossing_valley_bridge_v1` as the first blueprint. The next step is the one the
level-generation audit recommends as the first ticket, and it is still the right one:

> a data-only three-module fixture, a pure allocator for one injected crossing reservation, and a
> resolver returning existing `ChunkStructureResult` records — tested before any art or UI.

This proves multi-chunk deterministic insertion, the only real architectural risk, while the visible
game stays unchanged.

Extensions needed in `ringManifest.js`: `footprint` on reservations (default `1x1` so existing
reservations are untouched), rectangle overlap in `findWorldPlanReservationConflicts` (line 807),
and degrade-to-pivot-module in `proveStructuralFallbackViability` (line 408). **A set piece must
never be able to make a run unplannable.**

---

## 3. Then — `WORLD_3D_STRUCTURES`

The new placement path from `gate-stage-areas-design` §2. Existing models cannot carry stage
geometry: `prepareWorld3dModel` (`world3dOverlay.js:160`) normalizes every GLB to a prop height and
recentres it on its own bounds, so a 49 m bridge span becomes a 2.6 m trinket.

True metric scale, origin at the module's north-west cell corner, never recentred, separate low-poly
collision proxy, one shell per module per stage. Prove it with one shell before authoring nine.

---

## 4. Sequencing rationale

1 before 2 before 3 because each unblocks the next's *verification*, not just its code. Without 1
you cannot see whether a stamped set piece dressed correctly. Without 2 you have nowhere to put a
shell. Without 3 the gates cannot be built at all.

The content phase — rooms 8 → ~40, set pieces 0 → 8 — is the bulk of the work and the thing that
actually fixes "every run feels random". It fans out across agents cleanly once 1–3 are done, and
poorly before.

## 5. Deliberately not started

- **Debug-module code splitting** (§0) — real, but multi-site surgery in a contended file.
- **The `arch_*` routing fix** (§1a) — diagnosed to the exact line and prefix, not implemented, for
  the same reason: `threeGame.js` had two other agents in it this session.
- Five bespoke ending cutscene videos remain unproduced.
- `clean_escape` is reachable in 2/512 playthroughs; still a design decision, not a bug.
