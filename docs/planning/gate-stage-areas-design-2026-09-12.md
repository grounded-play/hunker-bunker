# Gate Stage Areas — detailed level design

**Status:** design, not approved for implementation
**Date:** 2026-09-12
**Parent:** `docs/planning/authored-setpieces-crash-site-and-run-building-plan-2026-09-12.md`
**Sibling:** `docs/planning/setpiece-plan-addendum-2026-09-12.md` (locked decisions, wiring blockers)

Covers the four ring gates as authored, Blender-built stage areas: the shared design language, the
new geometry path they need, and the Ring 1→2 bridge specified to production depth. The other three
gates are sketched to one page each and inherit §3.

---

## 1. Locked metrics

Every dimension below is read from source, not chosen. Changing any of them corrupts world
generation — `tileCatalog.js` says so directly.

| Quantity | Value | Source |
|---|---|---|
| `ROOM_SIZE` | 7 cells | `tileCatalog.js:22` |
| `BAND_THICKNESS` | 5 cells | `tileCatalog.js:23` |
| `TILE_SIZE` | 17 cells | derived |
| `CHUNK_SIZE` | 49 cells | derived, `LATTICE 3` |
| **Cell → world** | **1 cell = 1 world unit ≈ 1 m** | `threeGame.js:16742` maps player position to cells by rounding |
| **Chunk footprint** | **49 × 49 m** | derived |
| Canyon bands, edge inward | pit 1 m, cliff 1 m, ledge 3 m | `BANDS_CANYON` |
| Causeway width | 3 m, centred | `CAUSEWAY_CELLS` |
| Camera | 3rd person, FOV 58°, distance 3.65 m, lift 1.55 m, focus height 1.18 m, look-ahead 4.2 m | `thirdPersonCamera.js` |
| **Camera far plane** | **160 m** | `threeGame.js:1681` |

### 1.1 Two consequences that decide the art

**A landmark past 160 m does not exist.** The perspective camera's far plane clips it. Every
"visible from far away" beat must sit inside 160 m of where the player is meant to see it from, and
should be placed at 90–140 m so it survives a little camera drift.

**Eye height is ~1.55 m, so landmarks must be tall to clear anything.** A gate landmark has to be
seen over a 5 m cliff band from ~90 m out. Working rule:

> **Gate landmark silhouette: 12–25 m tall.** Below 12 m it disappears behind terrain; above 25 m it
> exceeds the vertical the camera can frame at 3.65 m distance without the player losing the ground.

This is why the existing 24-piece Gothic kit cannot carry a gate: it is authored at 1.8–2.6 m. It is
dressing, not silhouette.

---

## 2. The new geometry path

Stage areas cannot use the existing model pipeline. `prepareWorld3dModel`
(`world3dOverlay.js:160`) normalizes every GLB to a prop height and recentres it on its own bounds:

```js
model.scale.multiplyScalar(config.height / Math.max(size.y, 1e-6));
model.position.set(-center.x, -scaled.min.y, -center.z);
```

A 49 m bridge span fed through this becomes a 2.6 m centred trinket. Per the locked decision, stage
areas are **layered**: authored *shells* carry the silhouette, the existing prop/arch kit carries the
detail.

### 2.1 `WORLD_3D_STRUCTURES` (new registry)

```js
export const WORLD_3D_STRUCTURES = Object.freeze({
    bridge_span_scaffolded: {
        url: '/3d/runtime/structures/bridge_span_scaffolded.glb',
        collision: '/3d/runtime/structures/bridge_span_scaffolded.collision.glb',
        footprint: { w: 49, d: 49 },   // cells; MUST equal the module footprint
        origin: 'module-nw-corner',    // never recentred
        yaw: 0,
        setpiece: 'crossing_valley_bridge_v1',
        module: 'bridge_span',
        stage: 'scaffolded'
    }
});
```

Rules, all of which differ from `WORLD_3D_MODELS`:

1. **No scale normalization.** Authored at true metric scale — 1 Blender unit = 1 m.
2. **No recentring.** Origin sits at the module's north-west cell corner; +X east, +Z south to match
   the grid. Blender origin at world zero, geometry in +X/+Z.
3. **Separate collision proxy.** A low-poly mesh, not the render mesh. The render shell is
   `castShadow`/`receiveShadow` only and is never queried for walkability.
4. **Must not exceed footprint horizontally.** Vertical is free; a 22 m mast is fine, 50 m of width
   inside a 49 m module is not.
5. **One shell per module per stage.** Stages swap the shell, not the module.
6. Shells are dressed afterwards by the ordinary theme/prop pass, so the same shell reads differently
   across biomes.

### 2.2 Blender authoring conventions

- Scene unit metric, scale 1.0. Grid floor 1 m so cells are visible while modelling.
- Model against a 49 × 49 m reference plane with the 3 m causeway marked at cells 23–25.
- Walkable surfaces flat within ±0.05 m; the runtime rounds position to cells.
- Ledge surfaces at y = 0. Pit floors at authored negative y.
- Export GLB, +Y up, −Z forward, apply all transforms.
- Collision proxy in the same file as a separate object named `<name>_collision`, or a sibling
  `.collision.glb`.
- Budget per shell: ≤ 40k triangles render, ≤ 2k collision, ≤ 4 materials.

---

## 3. Design language (all four gates inherit)

### 3.1 Lynch's five elements, mapped

The world already has four of the five. It has no landmarks, which is precisely why it cannot be
mentally mapped.

| Lynch element | Our implementation | Status |
|---|---|---|
| Paths | procedural halls and connectors | exists |
| Edges | canyon PIT/CLIFF bands | exists |
| Districts | authored set pieces | being built |
| Nodes | ring gates | being built |
| **Landmarks** | **nothing** | **the gap** |

**Every gate carries one landmark, and it is the gate's whole job to be seen before it is reached.**

### 3.2 The seven rules

1. **Show the lock before the key.** The gate landmark must be visible from the ring's *entry*
   chunk — the player sees the obstacle long before they can act on it.
2. **The key sees the lock.** Stand where the player solves the gate; the gate must be framed in
   view from there. For the bridge this is literal: the workbench looks straight down the span.
3. **One arrival.** A gate set piece has exactly one approach socket, so composition holds.
4. **Silhouette 12–25 m**, placed 90–140 m from its intended first sighting (§1.1).
5. **The far side is warmer.** The unreachable side is always lit brighter and warmer than the near
   side. Lighting is the attractor; the player wants to be over there before they know why.
6. **Every gate opens a shortcut.** On completion the gate yields a one-way return route, so
   backtracking is never the same traversal twice.
7. **A gate teaches one verb,** and no two gates teach the same one.

### 3.3 One verb per gate

Four lock-and-key doors with four fetch quests is the failure mode every level-design source warns
about. Instead:

| Gate | Verb | Teaches | Ties to |
|---|---|---|---|
| **R1 → R2** | **BUILD** | construction, salvage economy, plot placement | crash-site building |
| **R2 → R3** | **FIGHT** | combat mastery, boss phases, arena reading | `milestoneBossLifecycle` |
| **R3 → R4** | **NEGOTIATE** | faction consequence, irreversible choice | story linchpins, endings |
| **R4 → R5** | **SURVIVE** | resource management under pressure, O₂ | vitals, infection |

### 3.4 Gates serve three progressions at once

The ask was gate points for *story, leveling, and ring*. Every gate must land all three, or it is
just a door:

| | Story beat | Power beat | Access beat |
|---|---|---|---|
| R1→2 | you inherit a dead stranger's unfinished work | first buildable; salvage economy opens | ring 2 + winch shortcut |
| R2→3 | the thing that killed this sector has a name | milestone boss; weapon tier gate | ring 3 + service lift |
| R3→4 | you choose whose door this is, permanently | faction loadout/relic grant | ring 4 + faction-only passage |
| R4→5 | the way down is the way the crew went | O₂ capacity threshold | ring 5, no shortcut — one way |

R4→5 deliberately breaks rule 6. The final descent should not offer a way back.

---

## 4. Production detail — R1→R2, the valley bridge

Blueprint `crossing_valley_bridge_v1` (already in `src/data/setpieceBuilds.js`). Three modules on
the N–S axis, approach at `dy +1`, span at `dy 0`, far abutment at `dy −1`. **Total 49 × 147 m.**

Stages `ruined → surveyed → scaffolded → complete`, `initialStage: 'ruined'`.

### 4.1 Module A — APPROACH (`dy +1`, 49 × 49 m)

Entered from the south socket, 3 m causeway at cells 23–25.

**Terrain.** Ledge plateau at y = 0 for the southern 30 m, then a 2 m fall over the final 19 m to
the chasm lip at y = −2. The slope is the "ground composition" cue — it points north, at the gap.

**Hero geometry — the Dead Gantry.** A collapsed pre-war bridge head: a steel A-frame **14 m tall**,
leaning 18° west, one leg buckled, snapped suspension cables hanging into the pit. Sits at cells
(20–30, 28–40).

This is the landmark. From the ring-1 entry chunk ~110 m south it breaks the horizon, inside the
160 m far plane with margin (rule 4, rule 1).

**The stranger's failed attempt** — environmental storytelling, and the emotional reason the player
builds rather than fetches. Out over the lip at cells (23–25, 41–46): a **6 m half-built deck ending
in nothing.** Planks cantilevered, the last one splintered. On the approach side: a bedroll, a cold
cookfire, a tool roll laid out neatly, and their body still in the harness, cable still clipped.
Lore terminal at (18, 30) carries their log. The player finishes a dead person's work — which is the
whole game's thesis in one set piece.

**Anchors.**

| Anchor | Cell | Purpose |
|---|---|---|
| `bridge_workbench` | (24, 34) | the build interaction, in the gantry's lee |
| `lore_terminal` | (18, 30) | the stranger's log |
| `salvage_cache` | (34, 36) | guaranteed `structure` yield |

**The lock/key sightline (rule 2).** Standing at the workbench facing north, the far abutment's
beacon is framed **dead centre between the gantry's legs.** The gantry legs are placed to make this
frame — 10 m apart at eye height, centred on cell 24. The player cannot use the workbench without
looking at what it is for.

**Defensible pocket.** The gantry's fallen legs and a toppled 4 m counterweight enclose a **12 × 12 m
three-sided arena** at (18–30, 30–42), open to the south. This is the Stage-3 defense beat: scaffolded
construction attracts attention, and the player defends the workbench here. Authored, not incidental —
one open side, two firing angles, one piece of hard cover at (26, 36).

### 4.2 Module B — SPAN (`dy 0`, 49 × 49 m)

The chasm. **49 m across, pit floor at y = −18.**

The drop does the work. At the lip with a 1.55 m eye height and 58° FOV the player sees roughly
18 m down — enough that the fall reads as fatal without the camera losing the ground.

| Stage | Geometry | Walkable | `fall_hazard` |
|---|---|---|---|
| `ruined` | two stub piers at x = 8 and x = 41, rising 4 m from the pit floor; no deck; cables hanging | no | cells 6–43 full width |
| `surveyed` | survey stakes on both lips, a taut guide cable strung across at y = +1, chalk marks, a plumb line | no | unchanged |
| `scaffolded` | **1.5 m plank catwalk**, no rails, visible flex, lashed to the guide cable | yes, precarious | narrowed to flanks, cells 6–22 and 27–43 |
| `complete` | **4 m deck** with rails, deck lamps at 8 m spacing, load-tested | yes | removed |

The scaffolded stage is the design point: **walkable but dangerous, and enemies can knock you off.**
It is the only moment in the game where the player's own unfinished construction is the hazard. The
defense beat happens while this stage is live.

Audio: wind rises entering the module and drops on the far side. Footstep material changes plank →
steel between scaffolded and complete, so the upgrade is audible.

### 4.3 Module C — FAR ABUTMENT (`dy −1`, 49 × 49 m)

Ring 2's threshold. Exits north.

**Hero geometry — the Living Gantry.** The Dead Gantry's intact twin: **14 m, upright, powered,
lit.** Deliberately the same model, different stage — the player reads the wreck on the near side as
*this, broken*, without being told.

**The beacon — the weenie.** A sodium rotator at **16 m** on the gantry crown, slow sweep, warm
amber. This is what module A frames between the dead gantry's legs. It is the single brightest thing
in ring 1 and the far side is warmer than the near side (rule 5).

**Before completion.** Visible, lit, unreachable. The far lip carries the `canyon-impassable` band,
so there is no walk-around — the gate is honest.

**On completion — the shortcut (rule 6).** A cargo winch on the abutment descends to module A's
plateau: a one-way ride back that skips the span. Backtracking is never the same traversal twice.

**The next breadcrumb.** Ring-2 directional signage at (24, 12), still powered, pointing north:
`ST. ALMUS MEDICAL — 2.4 KM`. The gate that opens ring 2 plants ring 2's landmark before the player
has taken a step into it. Chained weenies are how the world stops feeling like a lobby.

### 4.4 Asset list

**New shells (Blender, `WORLD_3D_STRUCTURES`):**

| Shell | Size | Notes |
|---|---|---|
| `gantry_dead` | 14 m | leaning, buckled leg, snapped cables |
| `gantry_living` | 14 m + 2 m beacon | same base mesh, intact variant |
| `bridge_span_ruined` | 49 m | piers only |
| `bridge_span_surveyed` | 49 m | + stakes, guide cable |
| `bridge_span_scaffolded` | 49 m | 1.5 m catwalk |
| `bridge_span_complete` | 49 m | 4 m deck, rails, lamps |
| `abutment_platform` | 49 m | far-side ground + winch housing |
| `approach_plateau` | 49 m | sloped ground + lip |
| `failed_deck` | 6 m | the stranger's cantilever |

Nine shells, four of which are stage variants of one span — realistically **five models plus three
variants.** Collision proxy each.

**Reused dressing (exists, no new art):** `prop_engineering_bench`, `prop_conduit_hub`,
`prop_cyber_junction`, `prop_bunker_supplies`, `prop_ammo_crate_stack`, `lore_terminal`, storage
drums, cable and bolt scatter, `state_barricade_improvised_1/2`, `state_column_shattered`,
`decal_scorch_bloom`, `decal_rust_bleed_1/2`, `decal_worker_sleep_roll`,
`decal_barricade_last_stand`, `decal_abandoned_meal_tray`.

**Blocked on the wiring fixes** in the addendum §3: `arch_bulkhead_frame` and
`arch_pillar_buttress_*` would dress the abutment, and currently render nothing.

---

## 5. The other three gates

One page each; all inherit §3.

### 5.1 R2 → R3 — FIGHT — *The Bore Head*

Fiction: a collapsed transit bore, the tunnel-boring machine still wedged in its own hole, and the
thing that has been eating this sector nests in the cutting head.

Landmark: the **boring machine's cutter face, 20 m diameter, canted 30°** out of the rock — a
perfect disc silhouette unlike anything else in the world, readable at 130 m.

Verb: the milestone boss already modelled by `milestoneBossLifecycle` fights here. The arena is the
machine's excavated cavern — a 40 m bowl with three spoil-heap ramps giving high ground, and the
cutter face as a rotating hazard.

Gate logic: hard gate, no key. The bore is the only route; the boss is in it.
Shortcut: the machine's service lift, powered on the boss's death.
Blast bulkhead: per the parent plan's migration, the displaced `blast_bulkhead` re-sites here as the
bore's pressure door — a threshold, not a second lock.

### 5.2 R3 → R4 — NEGOTIATE — *The Membrane*

Fiction: a hive has grown across the only pass. It can be burned, or it can be asked.

Landmark: **a resin curtain 18 m tall** spanning a 30 m cleft, backlit from within — translucent,
slowly pulsing, the warmest thing in the ring. Rule 5 taken literally: the light is *inside the
obstacle*.

Verb: the gate resolves three ways, and the choice is **written once and never re-opened** — it uses
the existing `storyLinchpins` write-once machinery rather than a new mechanism.

| Resolution | How | Consequence |
|---|---|---|
| Burn it | combat + incendiary | hives hostile; camps warm; locks the hive-sympathetic endings |
| Ask it | a camp leader's introduction, requires their quest line | passage granted; camp faction angered |
| Cut a deal | carry hive biomass from ring 3's nest | both sides tolerate you; locks the purist endings |

This is the gate that makes the ending system legible: the player can *see* a permanent choice being
made, in a place, rather than in a dialogue box.

Shortcut: the membrane reseals behind you but recognises you — a one-way iris.

### 5.3 R4 → R5 — SURVIVE — *The Drowned Stair*

Fiction: the flooded service descent the crew took. The pumps are dead. It is the way down and there
is no way back.

Landmark: **a pump tower, 24 m** — the tallest silhouette in the game, listing, half-submerged, its
warning beacon still turning underwater and lighting the flood from below.

Verb: no boss, no puzzle. A **timed descent under O₂ pressure** through three flooded flights, with
air pockets as checkpoints. Resource management is the gate; the player's O₂ upgrades are the key,
which makes the whole vitals economy retroactively a progression track.

Gate logic: soft gate. The player can attempt it under-equipped and die.
**No shortcut** — deliberately breaks rule 6 (§3.4). The descent is one way.

---

## 6. Build order

| # | Work | Gate |
|---|---|---|
| 1 | `WORLD_3D_STRUCTURES` path + collision proxies + one test shell | — |
| 2 | Approach/span/abutment shells, 4 span stages | R1→2 |
| 3 | Workbench interaction, stage transitions, defense beat, winch shortcut | R1→2 |
| 4 | Bore Head cavern + boss arena | R2→3 |
| 5 | Membrane, three resolutions on the linchpin machinery | R3→4 |
| 6 | Drowned Stair, O₂ descent | R4→5 |

Item 1 is the only true engine work; everything after is content against a proven path.

## 7. Open

- Does the scaffolded span support knockback off the catwalk, or is falling player-error only?
- Should the Dead Gantry's stranger be a named character tied to an existing camp's missing-person
  lore, or anonymous? Named is stronger but couples this gate to camp content.
- Pit floor reachable at the bottom of the chasm (an optional risk/reward pocket at −18 m), or
  purely visual?

## 8. Status log

- 2026-09-12 — drafted. Metrics read from source. Level-design references: The Level Design Book
  (gates, wayfinding), Lynch's *The Image of the City* five elements.
