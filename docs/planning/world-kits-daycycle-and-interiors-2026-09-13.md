# Modular kits, the day cycle, and interior sub-levels

**Date:** 2026-09-13 · Branch `dev/sprint-39`
**Status:** design + phased implementation. Living document.

Covers three connected asks: fold six CC0 kits into the world without them
looking like asset-pack filler, add a rest/day cycle between runs, and let the
player enter buildings and drop to sub-levels.

They are one problem. The kits supply the vocabulary, the sub-levels are what
that vocabulary is *for*, and the day cycle is the frame that makes exploring
them matter.

---

## 1. What the kits actually are

Downloaded to `art/source/kits/`, all **CC0**, verified by reading each pack's
own `License.txt` rather than trusting the source page.

| Kit | Pieces | Format |
|---|---:|---|
| modular-space-kit | 40 | GLB/OBJ/FBX |
| modular-cave-kit | 40 | GLB/OBJ/FBX |
| building-kit | 79 | GLB/OBJ/FBX |
| nature-kit | 329 | GLB/OBJ/FBX |
| animated-characters-survivors | 4 FBX (mesh + idle/run/jump) | FBX |
| planets | PNG sprites | 2D |

### 1.1 The finding that shapes everything

**The cave kit and the space kit share their corridor and room grammar.**
Measured after registering both: **36 of 40 piece names are identical** —
`corridor`, `corridor-corner`, `corridor-wide-junction`, `room-large`, `stairs`,
`template-floor-layer-hole` and the rest of the structural set.

The four that differ are all flavour, not structure:

| Cave only | Space only |
|---|---|
| `gate_metal_bars`, `gate_overhang`, `gate_rock` | `gate_door`, `gate_door_window`, `gate_lasers` |
| `ladder` | `cables` |

So the gates differ in what a door is made of, and the cave gets a ladder where
space gets cable runs. An initial read called the two kits identical; they are
not, and the distinction matters — a generator can share its corridor logic
across both skins, but the gate table has to be per-skin.

That is not a coincidence to work around; it is the design. One connector
grammar serves both, so the existing random-hallway system can keep its logic
and swap its skin per biome. A bunker corridor and a cave corridor become the
same socket contract with different materials, which is exactly the
"fixed set pieces joined by procedural halls" model the setpiece plan already
describes.

### 1.2 Pieces that unlock the other two asks

- `stairs`, `stairs-wide`, `ladder` — vertical connection.
- `template-floor-layer-hole`, `template-floor-layer-raised` — a floor with a
  hole in it is a sub-level entrance that needs no special case.
- `gate`, `gate-door`, `gate-door-window`, `gate-metal-bars`, `gate-rock` — the
  door that closes behind you.
- building-kit `barricade-doorway-*`, `border-high-*` — exterior structures the
  player can enter.

---

## 2. Art direction — making it ours, not "kiddish"

Kenney kits are deliberately clean, bright, low-detail and untextured-by-design.
Dropped in raw they read as placeholder. Four rules, applied as an automated
Blender pass so it is repeatable rather than hand-tweaked per asset:

1. **Strip the palette, keep the silhouette.** The kits' value is their geometry
   and socket alignment. Their flat pastel vertex colours are the thing that
   reads as a toy. Re-material to the game's own palette — the same
   `ROOM_THEME_CATALOG` families the authored rooms already use.
2. **Add wear at the seams.** Uniform surfaces are the second tell. The
   roughness break-up already written for imported game materials
   (`enhance_imported_materials`) applies here unchanged.
3. **Light it like the game, not like a showroom.** These sets are near-black
   with saturated emissive practicals. A kit piece lit that way stops looking
   like a kit piece almost immediately — the MI-03 collar shot is the proof.
4. **Break the grid.** Modular kits repeat at a fixed interval and the eye finds
   it fast. Rotate, mirror, and swap `-variation` pieces per instance, and let
   the existing decal/dressing pass scatter over the seams.

**Non-goal:** re-modelling. If a piece needs new geometry to fit, it is the
wrong piece — there are 488 of them.

---

## 3. Day cycle — rest, spend, advance

A between-run safe space entered by sleeping at camp.

```
RUN (expedition)  ->  camp reached  ->  SLEEP  ->  REST PHASE  ->  next RUN
                                                   day += 1
                                                   difficulty += tier
                                                   spend / level / repair
```

- **Day counter** drives difficulty scaling and gates content. It is the clock
  the story runs on.
- **Rest phase** is a real location, not a menu: the camp dressed for night,
  where the player levels, buys, repairs and talks. `camp.js` already has
  dressing, leaders and quests — this is a lighting and state change over
  existing geometry, not a new scene.
- **Story locks on a timer.** Beats that are not reached by a given day close
  permanently. This reuses the write-once `storyLinchpins` machinery rather than
  inventing a second irreversible-choice system, and turns the day counter into
  narrative pressure rather than just a difficulty multiplier.

Persistence sits on the existing hybrid boundary: the day counter and unlocks
are meta, the run is not.

---

## 4. Interiors and sub-levels

### 4.1 The model

A structure or hole is a **portal to a bounded sub-area**, not a seamless part
of the open map. Entering swaps the active play plane; leaving swaps back.

That is deliberate. Seamless interiors need occlusion culling, portal
rendering, and a camera that solves for every doorway. A swapped plane needs a
door, a fade and a stack — and it is the model the game already uses for the
cave/mothership transitions, so it extends something proven.

```
SURFACE  --enter structure-->  INTERIOR PLANE   (own chunk grid, own lighting)
INTERIOR --drop through hole-->  SUB-LEVEL PLANE  (deeper, darker, no exit but up)
```

### 4.2 Camera

Two behaviours, both needed:

- **Ceiling fade.** Inside a structure, geometry between the camera and the
  player fades out rather than being culled — a hard cull pops, a fade reads as
  a cutaway. The existing `world3dOverlay` material path can drive alpha per
  object, so this is a per-frame test against the camera-to-player segment, not
  a new render pass.
- **Tighter framing below.** Sub-levels get a closer camera and a shorter far
  plane, which does double duty: it sells confinement and it means a sub-level
  costs less to render than the surface it hangs off.

### 4.3 Why `template-floor-layer-hole` matters

A floor piece with a hole in it is a sub-level entrance that needs no bespoke
geometry and no special-case authoring. Place it, and the descent exists.

---

## 5. Phases

| # | Work | Exit |
|---|---|---|
| **0** | Kit intake: convert to GLB, register placement types, record provenance | Every kit piece is addressable from a room build |
| **1** | Restyle pass: palette, wear, variation in Blender | A kit corridor is indistinguishable from an authored one at a glance |
| **2** | Corridor grammar: swap the random hallway skin per biome using one socket contract | **runtime connected** — topology-aware markers now place the registered cave/space GLBs |
| **3** | Day cycle: sleep trigger, day counter, rest phase, difficulty and story gates | **core done** — `src/dayCycle.js`, 18 tests |
| **4** | Portals: enter structure, drop to sub-level, return stack | **core done** — `src/portalPlanes.js`, 15 tests |
| **5** | Camera: ceiling fade, sub-level framing | **core done** — same module |

Phases 0–2 are asset and generation work. 3 is systems. 4–5 are runtime and
camera. They are independent enough to land separately.

## 6. Status log

- 2026-09-13 — kits acquired and verified CC0; cave/space grammar identity
  found; plan written.
- 2026-09-13 — cinematic continuity pass reuses the restyled cave/space kits in
  SET-D and transfers the runtime sky layers into the 4K film HDR. Long renders
  were stopped non-destructively with 893 completed frames preserved; they must
  restart only after the bunker-planet contact sheet passes, so blank floors or
  missing planetary architecture cannot consume another multi-hour render.


---

## 7. Phase 3 — day cycle (implemented)

`src/dayCycle.js`. Pure: no DOM, no Three.js, no storage. The caller owns
persistence and presentation, which keeps the whole cycle unit-testable and
lets the rest phase be a lit camp rather than a menu.

### State machine

```
EXPEDITION --beginSleep--> SLEEPING --completeRest--> RESTING --beginExpedition--> EXPEDITION
                                      day += 1
                                      missed beats expire
                                      difficulty recomputed
```

Each transition refuses from the wrong phase. Sleeping twice would advance the
day twice and silently expire a beat the player never had a chance at, so
`beginSleep` returns `started: false` rather than doing it.

### Difficulty

Sub-linear and capped: `1 + (day - 1) * 0.085`, ceiling `2.25`. Linear scaling
makes early days trivial and late days impossible, and an uncapped curve means
the campaign has a day beyond which it cannot be played. The cap is what lets a
player who has fallen behind still catch up.

`threatScaleForDay` **multiplies** the existing depth scale rather than
replacing it, so depth still dominates within a run and the day is what makes
each run harder than the last — they are different pressures and collapsing them
would lose both. Speed scales at a third of HP's rate, because an enemy that
outruns the player is unfair in a way that a tougher one is not.

### Story deadlines

Four beats carry a `closesOnDay`, expressed as the first day the beat is **no
longer** available — "you have until day 4" is how a player reads it, and an
off-by-one here silently eats content.

`resolved` and `expired` are kept as separate lists on purpose. "Did it" and
"can never do it" are different states, and collapsing them loses the reason an
ending became unavailable — which is exactly what the ending-lock system needs
to explain itself.

`deadlinesClosingTonight` exists so the game can warn before the player sleeps.
A deadline the player did not know about is a trap, not pressure.

### Remaining for phase 3

Persistence under `hb_day_cycle` (new key — bank and skill-tree keys are
frozen), the sleep trigger at camp, and the rest-phase lighting state.


---

## 8. Phase 2 — corridor grammar (implemented)

`src/kitGrammar.js`. A generator asks for a **role**; the biome decides which
skin renders.

```
kitPieceFor('corridorCorner', 'bio')     -> kit_cave_corridor_corner
kitPieceFor('corridorCorner', 'active')  -> kit_space_corridor_corner
kitPieceFor('gate', 'bio')               -> kit_cave_gate_rock
kitPieceFor('gate', 'active')            -> kit_space_gate_door
kitPieceFor('ladder', 'active')          -> null
```

That last line is the important one. A role a skin does not have returns
**null** rather than substituting: a rock slab standing in for a powered door is
worse than no door, and a silent substitution is an art bug nobody traces.

**Biome mapping** follows meaning the game already carries: `bio` and cave
sectors are rock, everything bunker-side is fabricated.

**Grid breaking.** Modular kits repeat at a fixed interval and the eye finds it
fast. `chooseKitPiece` picks a cardinal rotation and, where a `-variation` twin
exists, sometimes takes it — from the seeded random the world generator already
threads through, so a seed still reproduces its world exactly. Rotation is
cardinal only: these pieces socket on a grid and an arbitrary angle would break
the seams the kit exists to provide.

**The guard that matters:** a test resolves *every* shared role in *both* skins
and asserts the result is a registered model. The whole promise of the grammar
is that a generator can ask for a role and get something that renders; a role
resolving to a type nobody registered is exactly the failure worth catching, and
it would otherwise surface as an invisible corridor at runtime.


---

## 9. Phases 4-5 — portals, sub-levels and camera (implemented)

`src/portalPlanes.js`. A stack, because that is what "go in, go deeper, come
back out in order" is.

```
SURFACE                      camera 3.65 / far 160 / no fade
  -> INTERIOR   (structure)  camera 3.10 / far  60 / ceiling fade
    -> SUBLEVEL (hole)       camera 2.70 / far  42 / ceiling fade
```

### Decisions worth keeping

**`returnTo` per plane.** Leaving puts the player back at the door they used,
not at the plane's origin. Stepping out of a building and appearing somewhere
else is the classic portal bug and it is a save-state problem once it happens.

**The surface is never popped.** It is the floor of the stack; popping it would
leave the player standing in no world at all.

**Depth is bounded** at 3. An unbounded stack is a way to lose a player inside
their own save.

**Re-entering a plane already in the stack is refused.** Otherwise leaving is
ambiguous — which copy do you return to?

**Camera pulls in as you descend**, and the far plane shortens with it. That
does double duty: it sells confinement, and it means a sub-level costs less to
render than the surface it hangs off, which is what lets sub-levels exist at
all on a Steam Deck.

### Ceiling fade

`ceilingFadeAlpha` fades geometry that is **above the player AND between them
and the camera**. Both conditions matter:

- A hard cull pops as the camera moves; a fade reads as a deliberate cutaway.
- Fading a wall the player is standing *behind* would expose the world outside
  the structure, so only the in-the-way test qualifies it.
- It never fades fully — a roof at 12% alpha still reads as a roof, where one at
  0% reads as a missing wall.
- It ramps over a band rather than snapping, so a roof edge does not pop as the
  player walks under it.
- It is inert on the surface, which has no roof to hide behind.

### Remaining across 4-5

The pocket sublevel is now runtime-wired through the plane stack and cutaway
camera contract (§13). Still open: authored building-door portals, deeper
stacked planes, and per-plane connector generation using the kit grammar.

---

## 10. Audit pass — five defects found and fixed

The three modules were re-checked by probing them adversarially rather than
re-reading them. Every defect below was live, and none was caught by the
original tests.

### 10.1 `kitGrammar` resolved prototype members as roles — the worst one

```
kitPieceFor('constructor', 'active')
  -> 'kit_space_function Object() { [native code] }'
```

A bare `SHARED_ROLES[role]` lookup reaches inherited `Object.prototype` members,
so `constructor`, `toString`, `valueOf` and friends produced a placement type
built from a function's source text. That string would travel to the renderer as
a model name.

Reachable rather than theoretical: role names come from authored room-build
data. Fixed with own-property lookups (`Object.hasOwn`) and a type guard; all
such keys now return `null`.

### 10.2 `resolveDeadline` ignored its own deadline

A beat could be resolved on day 99 even though it closed on day 4. Expiry only
ran during rest, so a beat past its day but not yet slept through stayed
resolvable — which defeats the entire deadline system it exists to enforce.

Now refused with `reason: 'deadline passed'`, while day 3 on a day-4 deadline
still resolves, because the boundary is "you have until day 4" and an off-by-one
here quietly eats a day of content.

### 10.3 `normalizeDayState` trusted unknown ids

Saved `resolved`/`expired` entries were kept whatever they said. A renamed or
removed beat would linger in a save forever, and a corrupt save could mark a
beat resolved that never existed — silently unlocking or locking an ending.
Now filtered against the real deadline set, and deduplicated.

### 10.4 `transitioning` was a guard that did not guard

The flag was declared and checked, and nothing ever set it. A portal fade is
long enough for a second trigger volume to fire, which would put the player two
planes deep from one doorway. `beginTransition`/`endTransition` now drive it,
and both `enterPlane` and `leavePlane` respect it.

### 10.5 `SURFACE` could be pushed onto the stack

`enterPlane` accepted `kind: 'surface'`, producing a leaveable "world" that is
not the real one — and the camera would then treat the open world as an
interior, with ceiling fade active outdoors. Now refused.

### Also hardened

`chooseKitPiece` folded a `NaN` roll to zero. A NaN rotation places the piece
unrotated *and* poisons any transform built from it downstream, which is much
harder to trace than an obviously wrong angle.

**13 regression tests added**, one per defect plus boundary cases. Suite: 3329.

---

## 11. Runtime connection pass — day/rest vertical slice

The day-cycle module is no longer test-only. `ThreeGame` now restores and
normalizes `hb_day_cycle` during construction and republishes it after boot so
the live HUD shows `DAY N` immediately.

The first playable loop is deliberately built from existing camp and foundry
grammar:

1. A living, dormant camp offers **SLEEP UNTIL DAY N+1** after its immediate
   dialogue, support, quest, favor and signature-verb work is exhausted.
2. Sleep advances exactly once and persists before presentation begins.
3. Expedition input is disabled and the existing fabrication bay opens as the
   safe rest space. Players can spend banked salvage, activate the foundry,
   print equipment and prepare the next deployment there.
4. Closing that bay is the explicit **begin expedition** boundary. Input is
   restored and the phase returns to `EXPEDITION`; reopening the ordinary
   foundry later cannot advance another day.
5. Non-boss enemy spawn stats now use `threatScaleForDay(day,
   getDepthThreatScale(depth))`, preserving radial depth pressure while making
   later days materially harder.

The bridge dispatches `day-cycle-changed`, `day-rest-open`, and
`day-expedition-started` so later sleep cinematics, deadline warnings and a
dedicated camp tableau can replace the current presentation without changing
the state-machine contract.

Focused runtime evidence: 28 tests pass across the day-cycle core, the new
`ThreeGame` persistence/rest bridge, and camp first-contact behavior. The new
bridge tests prove save repair, one-day advancement, rest input lock, safe-phase
entry, and return to expedition.

The canonical deadline bindings and closing-tonight confirmation are completed
in §15. Still open in Phase 3: graduate the foundry-backed safe phase into the
full authored crash-site camp tableau.

---

## 12. Runtime connection pass — biome corridor kits

`kitGrammar` is no longer test-only. The authored hallway producer already
emitted sparse route markers carrying its `dressingKit` and `lightingRhythm`;
`ThreeGame.createChunkSetPiecePlacements` now consumes those markers and emits
real GLB-only architectural placements owned by the normal chunk lifecycle.

Each marker inspects its four carved neighbors and selects the right silhouette:

- two opposite sockets → straight corridor;
- two perpendicular sockets → corner;
- three sockets → junction;
- four sockets → intersection;
- one socket → corridor end.

The biome chooses the restyled skin (`bio` → cave, `active`/`cryo` → space),
while topology—not RNG—chooses the cardinal rotation. This corrects an earlier
grammar assumption: random 90-degree rotation is safe for freestanding room
modules, but on a corridor it puts a wall across an open socket. The generated
placement is explicitly non-solid because navigation and collision remain
owned by the proven tile grid; the kit is architectural presentation, not a
second contradictory physics map.

Runtime evidence now covers the entire handoff: a generated hallway marker is
consumed by `ThreeGame`, becomes a `kit_cave_corridor` placement with the
expected world position, rotation, dressing metadata and chunk-stable key, and
the selected model is guarded by the existing world-model registry tests.

---

## 13. Runtime connection pass — first real sublevel

The existing fall pocket is now the production vertical slice for
`portalPlanes`, rather than a bespoke boolean teleport:

- `ThreeGame` owns a bounded plane stack beginning at `surface`.
- Falling through a non-lethal hole enters a uniquely keyed `sublevel` plane
  and records the exact surface return position.
- The surface chunk graph is hidden while the pocket group is active, retaining
  the existing simulation isolation.
- Perspective and orthographic far planes contract to 42 m; third-person
  distance contracts to 2.7 m. The player's selected surface camera values are
  captured before entry and restored exactly on exit.
- The pocket now has a real double-sided roof. `ceilingFadeAlpha` drives it to
  the 12% cutaway minimum while the player is underneath, so the room reads as
  covered architecture without hiding the operator.
- The climb point pops the plane stack and returns to the recorded doorway;
  the existing hole seal prevents an immediate second fall.
- Death/run reset is a hard unwind to the surface plane and surface camera, so
  a stale dungeon state cannot leak into the next deployment.

Runtime events (`portal-plane-entered`, `portal-plane-left`) expose the seam for
future door-close/fade/audio presentation. Existing transition guards reject
re-entry while a portal change is already in flight.

Focused evidence: 56 tests across plane contracts, pocket mounting, pocket
content scoping, fall/return behavior, hole interactions and surface-simulation
pause. The integration assertions cover plane identity/depth, confined camera,
exact camera restoration, and the physical cutaway ceiling.

This proves sublevel traversal, not the whole interior roadmap. The next slice
is an authored structure doorway that enters an `interior` plane generated from
the space-kit room grammar, then returns through its inside door.

---

## 14. Runtime connection pass — authored Foundry interior

The Foundry is now the first surface structure with a real inside. Interacting
with its exterior enters a fixed 11×11 `interior` plane instead of opening the
fabrication interface in the exposed world. The room uses the existing
`kit_space_room_small` shell, a physical cutaway ceiling, a deliberately
authored south airlock, and a central emissive fabrication workbench. It proves
that the reskinned construction kits can form destinations rather than only
dress procedural paths.

The plane contract keeps exterior and interior concerns separate:

- entry records the player's exact surface position, hides surface chunk
  groups, confines the camera to a 60 m far plane and a 3.1 m follow distance,
  and places the player at the structure's world anchor on the interior layer;
- deferred GLB proximity checks resolve child positions in world space, so a
  room shell parented under an interior group still loads correctly;
- contextual interactions inside are intentionally narrow: the central bench
  opens fabrication and the south airlock exits;
- exiting restores the exact exterior position and camera settings without
  sealing the doorway as though it were a collapsed sublevel hole;
- nearby prompt state is cleared on exit and on run reset, preventing interior
  instructions from leaking back onto the surface.

Focused evidence covers entry, shell and ceiling presence, camera confinement,
workbench and airlock interaction candidates, exact return, non-destructive
doorway exit, and prompt cleanup. This closes the first authored-building slice;
the next reusable step is to extract the fixed room description into a small
interior blueprint registry before adding hospital, camp and hive interiors.

---

## 15. Runtime connection pass — deadlines that alter the run

The campaign clock now binds to actual story actions instead of maintaining a
parallel list that gameplay never reads:

| Deadline | Resolving action | Missed-window consequence |
|---|---|---|
| Meridian First Contact | First real talk at Meridian | The unique first-contact interstitial is gone; later dialogue remains available. |
| Tallow Infection Choice | Successfully warn or latent-seed Tallow | Both infection choices show **TOO LATE** and are disabled. |
| Vesper Last Shelter | Complete the authored Bunker Holdout quest | The holdout is skipped by Vesper's quest offer sequence. |
| Suture Hive Parley | Complete Nahl's Host Mercy rite | Host Mercy shows **MISSED** and cannot be selected or invoked directly. |

These boundaries preserve the rest of each faction's content. Missing one
timed beat does not erase a whole camp or make a save unwinnable; it removes the
specific opportunity named in the warning. Direct resolver paths are guarded
as well as button state so debug calls and stale UI cannot bypass expiration.

Sleeping on the night before any unresolved deadline now opens a dedicated
confirmation overlay before state changes. It names each signal and describes
the consequence in fiction, offers **STAY AWAKE** as the focused default, and
only advances the day through the captured confirmation callback. An active
camp quest also suppresses the sleep verb, preventing an accepted holdout from
being silently expired while it is in progress.

Focused evidence covers warning-before-mutation, confirmation and expiry,
Meridian first-contact resolution, Vesper holdout resolution, Tallow's resolved
and expired paths, Suture option gating, and the existing save repair and
single-advance invariants.

---

## 16. Runtime connection pass — rest becomes a place

The between-day phase now uses the authored Foundry interior from §14 whenever
that structure is available. Sleep records the exact camp position, moves the
operator into the covered workshop plane, pauses the exterior chunk simulation,
then opens fabrication. Input remains locked behind the fabrication interface
until the player finishes preparing the next expedition.

Closing fabrication advances `RESTING → EXPEDITION` while leaving the operator
inside the workshop. The south airlock is then the physical departure action;
using it restores the exact camp where sleep began. This produces a readable
sequence—camp bedroll → protected workshop → loadout decisions → airlock → new
day—without adding a second teleport or duplicating the proven portal stack.

If the Foundry has not yet been discovered, rest deliberately falls back to the
camp exterior and reports that fallback in the `day-rest-open` event. The day
loop therefore remains usable in unusual saves while ordinary progression gains
a genuinely safe authored space. Focused runtime coverage proves relocation,
input locking, and the emitted safe-space identity.
