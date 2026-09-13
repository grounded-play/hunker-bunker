# Addendum to the authored set-piece plan — locked decisions and verified blockers

**Status:** subordinate to
`docs/planning/authored-setpieces-crash-site-and-run-building-plan-2026-09-12.md`, which is **the**
central plan. This document adds only two things that plan does not carry: the owner's locked
product decisions, and three verified wiring defects that invalidate parts of its asset plan.

Nothing here proposes a different architecture. Where this and the central plan differ, §2 says so
explicitly.

---

## 1. Locked decisions

Decided by the project owner on 2026-09-12. Recorded here because the central plan and the two
audits each leave some of these open.

| # | Question | Locked choice |
|---|---|---|
| **D1** | Crash-site persistence | **Hybrid** — constructed base resets with the run; the *blueprint/project pool* persists as account knowledge |
| **D2** | Set-piece scale | **Both** — keep the single-chunk `roomBuilds` format, add versioned multi-chunk place sets |
| **D3** | Build economy | **Run-local materials from the start**, separate from `tech`/`med`/`coin` |
| **D4** | Run variance | seeded project draft **+** set-piece draw **+** run-altering relics |

D1 and D2 match the central plan as written. D4 matches, with one caveat in §3.

### D3 diverges from the central plan

The central plan's persistence boundary says:

> *"Use TECH/MED/COIN first. Add only two run-local material tags if playtesting proves their
> physical readability is worth the complexity."*

**Overridden.** `structure` and `biomass` are run-local from the start, not deferred behind
playtesting. Rationale: `tech`/`med`/`coin` are the meta currency for the four ship goals and the
armory. If construction draws from that same pool, every wall the player builds is a ship upgrade
they delayed, and the two loops cannibalise each other before either can be evaluated. Splitting
later means re-tuning both economies after content exists. The split is cheap now and expensive
later.

The material *names* `structure` and `biomass` are adopted from the central plan unchanged.

### Source for the new materials

Every prop in the game now breaks apart via `spawnPropDebris` (`src/enemyGibs.js`) since the
destructibility pass. Hanging material yield on that existing call site feeds construction from a
system that already ships and is already visible, rather than adding a separate pickup class.

---

## 2. Where the central plan is better than the earlier draft

Recorded so the superseded reasoning is not reintroduced.

The Ring 1→2 bridge migration: an earlier draft proposed simply swapping the first two entries of
`RING_BLOCKER_FEATURES`. **That is wrong and the central plan is right.** Saved games store
crossing state keyed by id; swapping array entries silently reinterprets the meaning of existing
saved data. The central plan's approach — preserve stable crossing IDs through an explicit
versioned migration, gated on a save-migration test — is the correct one. Its supporting decision
to re-site the blast bulkhead as a threshold rather than leave it as a hidden extra lock is also
right.

The one-line swap should not resurface.

---

## 3. Three verified blockers against the asset plan

Each was verified directly in source for this document, not taken on report. Each invalidates part
of the central plan's "Reuse now" list, and each is small. **All three should land in Phase 0**,
because authoring content against them produces sets that draw nothing.

### 3.1 The 24-piece architecture kit renders nothing in-world

The central plan's reuse list opens with *"Gothic architecture: bulkhead frames, grand archways,
rib vaults, buttress pillars, stained windows, shrine niches."* None of these currently draw.

All 24 `arch_*` / `state_*` / `fixture_*` GLBs exist and are registered in `WORLD_3D_MODELS`, and
`roomThemes.js` references them in 26 places across 11 of 15 themes. But none has a
`scatterTextures` entry (`threeGame.js:2259`), and `createScatterSprite` bails before the 3D swap:

```js
const spriteMaterial = this.scatterMaterials[placement.type];
if (!spriteMaterial) return null;      // threeGame.js:25425 and :25771
```

A 3D-only registration therefore produces nothing. `debugMuseum.coverage.test.js` is green because
it asserts showroom reachability, not in-world placement — which is why this has stayed invisible.

**Fix: ~24 lines** (a `scatterTextures` entry per piece). **Impact if skipped:** the hospital,
cathedral, and every Gothic-dressed set piece in the portfolio is authored against a vocabulary
that does not render.

### 3.2 Twenty-one faction props are unaddressable from authored rooms

The reuse list names camp and hive dressing — cots, barricades, the Meridian radio, the Tallow
still, the Vesper turret, hive incubators, resin basins, graves, laundry.

These load from `CAMP_DRESSING_MODELS` (`camp.js:41`), a table keyed by **camp id** and consumed
only by `Camp` at `camp.js:1024` via `CAMP_DRESSING_MODELS[this.id]`. The equivalent applies in
`hiveSite.js`. They are reachable if you *are* that camp — not as a `prop_*` placement type a room
build or place-set module can request.

This is the entire faction-identity vocabulary, and the central plan's "camps and hives as place
sets" phase depends on exactly these props being placeable from authored modules.

**Fix: ~21 lines** (register them as addressable placement types). **Impact if skipped:** Phase 5
cannot dress camps or hives from place-set data.

### 3.3 Four biome×role theme holes on the critical path

The theme matrix has 10 uncovered biome×role combinations. Four sit directly under planned content:
**bio/medical, bio/security, bio/engineering, active/storage.**

The central plan's Phase 4 places the first authored hospital at Ring 2. A medical set placed in
the bio ring currently falls through to the generic `bio-resin` theme and loses its medical
vocabulary entirely — the set piece still builds, it just stops reading as a hospital.

**Fix:** four theme entries. **Impact if skipped:** the flagship Phase 4 set piece is dressed as
generic resin.

### 3.4 Related, lower priority

- `PRESENTATION_STATE_MODIFIERS.propPrefix` is read by nothing, so `stateVariants` currently change
  one decal and nothing else. The central plan's Layer 4 "deterministic state overlays" assumes
  richer state dressing than exists.
- `runDrops.js` holds 13 `SUIT_RELICS` and 8 `TRANSFORMATIVE_RELIC_IDS`; the file states that most
  are catalog-only — they roll into loot and appear in the UI, but their described effects are never
  enforced. D4's relic layer should wire the 8 transformative ids before any relic is added.

---

## 4. What is not a problem

Worth stating, because it redirects effort. **Art is not the bottleneck.** 227 GLBs in
`public/3d/runtime`, 256 addressable placement types, and **zero orphans** — every registered URL
resolves to a real file. Of a 14-set-piece shortlist, **11 are buildable today with no new art**
once §3.1 and §3.2 land.

The bottleneck is authored rooms. `ROOM_BUILD_CATALOG` holds 8 entries against 22 room families
`ringManifest.js` reserves; 3 of 4 `MANDATORY_SHIP_GOALS` and 10 of 13 `objectiveAnchorId`s have no
authored room. That is why runs read as procedural, and it is why the central plan's content phase
is the real budget.

## 5. Status log

- 2026-09-12 — created. Supersedes and replaces an earlier duplicate central plan
  (`setpieces-crafting-and-ring-gating-2026-09-12.md`, deleted) now that the authored-set-piece plan
  is the single central document. Blockers in §3 verified directly in source.
