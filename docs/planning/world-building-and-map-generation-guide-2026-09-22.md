# World Building & Map Generation Guide

**Date:** 2026-09-22
**Status:** Diagnosis measured, design proposed, one fix shipped
**Scope:** Why every run feels like the same map, what the generator actually varies, and the design that makes a run predictable in structure but never identical in shape.

---

## 1. The complaint, and what is actually true

> "every time I start the game it's the same layout, same spaces, same building / layout doors"

This is correct, but not for the reason it looks like. The game is **not** missing a generator. It has three, and they run every launch:

| Layer | Module | Varies per run? |
|---|---|---|
| Macro topology (rings, spine, route chunks) | `mazeExpedition.js` | **Yes** — seeded from `runEntropy` |
| Chunk interiors (rooms, halls, doors) | `wfcGenerator.js` | **Yes** — but only when authored tiles are OFF |
| Authored reservations (camps, hives, setpieces, gates) | `ringManifest.js` → `authoredWorldRuntime.js` | **Partly — this is the problem** |

`runEntropy` is crypto-random per launch (`src/runEntropy.js`), and `getRadialMazePlan()` even *re-rolls* until the new layout signature differs from the previous run. The randomness is real. What is wrong is that the parts a player actually navigates by are pinned.

### 1.1 Measured: what repeats across 60 seeds

Built 60 world plans from 60 different seeds and compared them:

| Thing | Distinct values across 60 seeds |
|---|---|
| `ring-1-gate` position | **2** (`3,1` and `1,3` — the same point mirrored) |
| `ring-2-gate` position | **2** (`-5,-1` and `-1,-5` — mirrored) |
| `ring-3-gate` position | **1** — it is at `2,7` in *every single run* |
| `ring-4-gate` position | **3** (all axis mirrors) |
| Reservation role inventory | **1** — the same kinds of places, in the same counts, always |
| Setpiece ids | **1** — the same setpieces, always |

Reservation *positions* do vary. But the four gates — the things that gate progression and therefore the things a player routes around — have between one and three possible placements, all of them reflections of each other.

### 1.2 Root cause: the gates are not random at all

`mazeExpedition.js`, blocker placement:

```js
const targetRadius = (RADIAL_RING_RADII[blocker.ring] + RADIAL_RING_RADII[blocker.blocksRing]) / 2;
const candidate = topology.spineChunkKeys
    .filter(...)
    .map(...)                        // distance from targetRadius
    .sort((a, b) => a.delta - b.delta)[0];   // <- always the nearest
```

There is **no `random()` call in this function**. It is a deterministic argmin: take the spine chunk whose radius is closest to a fixed target. `RADIAL_RING_RADII` is a constant, and the spine is a short list, so the argmin lands on the same chunk nearly every time. The 2–3 observed variants are just which spine arm happened to exist.

Compare the reservation placer a few hundred lines earlier, which *does* jitter:

```js
let angle = phase + rule.ring * 1.37 + (random() - 0.5) * 1.4;
const radius = RADIAL_RING_RADII[rule.ring] + Math.round((random() - 0.5) * 10);
```

So the fix is not "add a generator". It is "let the existing seed reach the four decisions that matter most."

### 1.3 The second cause: the inventory is a constant

Every run contains exactly the same multiset of reservation roles, and exactly the same setpiece ids. Even with perfect positional variety, a player meets the same list of places in the same quantities. Variety of *arrangement* without variety of *content* still reads as "the same map".

---

## 2. Camp Meridian is invisible — fixed

Separate bug, same investigation.

`ensureAct2Camps()` anchored camps with:

```js
camp.reveal(x, z, this.getTerrainHeightAt?.(x, z) ?? 0);
```

`getTerrainHeightAt()` returns `TERRAIN_HEIGHTS.GROUND` in two different situations it cannot tell apart: the ground really is at ground level, **or the chunk has not streamed in yet**. Camps are revealed the moment the story says so — after the first boss, from across the map — which is exactly when their chunk is *not* loaded. So the camp anchored to the fallback height, and because `reveal()` is called once and nothing re-anchors afterwards, a camp on raised terrain stayed buried under the floor: listed in objectives, invisible in the world.

**Fixed** by `sampleTerrainHeight()` (returns `{ height, anchored }` so a caller can tell a real sample from a fallback) and `reanchorUnanchoredCamps()`, which re-anchors each unanchored camp exactly once, as soon as its terrain arrives.

**Rule this establishes:** anything that anchors a set piece to the ground must know whether the ground was real. Hives, foundries, the cave entrance and the crashed ships use the same one-shot pattern and should be audited against it.

---

## 3. The target: predictable structure, unpredictable shape

The goal is not "more random". A player should be able to say **what** they have to do next, and never be able to say **where** it will be or **what it will look like**.

```
FIXED (the contract)           VARIABLE (every run)
---------------------------    ----------------------------------
4 rings, outward only          which arm of the spine each gate sits on
1 mandatory ship goal / ring   which chunk holds the goal console
1 camp + 1 hive per ring       their angle, distance, and approach
gate order 1 -> 2 -> 3 -> 4    the route between them
story beats in fixed order     which rooms the beats are staged in
```

### 3.1 Action points and the space between them

The world is a graph of **action points** — gate, goal console, camp, hive, setpiece, boss — connected by **connective tissue**. Those are different problems and deserve different generators:

- **Action points** are placed by the *manifest* (authored requirements, seeded position). They must be reachable, correctly ringed, and spaced.
- **Connective tissue** is WFC's job. Between two action points the generator should be free, constrained only at the sockets where it meets them.

Today the manifest places action points too rigidly and WFC is switched off wholesale whenever authored tiles are on (`if (!this.authoredWorldTiles)` in the chunk builder). The result is that the authored path carries the whole map.

### 3.2 Scaling by ring

Ring is the difficulty and complexity dial. It should drive generation parameters, not just enemy stats:

| Ring | Room density | Hallway runs | Loops | Creep presence | Enemy mix |
|---|---|---|---|---|---|
| 1 | high, small rooms | short (1–2) | rare | none | single type |
| 2 | mixed | 2 | occasional | edges only | two types |
| 3 | sparse, large | 3 | common | contested | mutations begin |
| 4 | vaults + voids | 3+ | frequent | dominant | elites |

`collapseChunkLattice()` already accepts `hallwayContinuation`, `minimumHallwayRun`, `loopChance` and `maxLoops`, and the caller already varies them by ring. That plumbing is in place; it is simply bypassed on the authored path.

---

## 4. The design

### Step 1 — Let the seed reach the gates *(smallest change, biggest felt difference)*

Replace the argmin with a seeded pick from the plausible candidates:

```js
const ranked = spineCandidates.sort((a, b) => a.delta - b.delta);
// Any spine chunk within a ring-scaled band is a legitimate home for this
// gate; pick among them with the run seed instead of always taking [0].
const band = ranked.filter((c) => c.delta <= ranked[0].delta + GATE_PLACEMENT_BAND);
const candidate = band[Math.floor(random() * band.length)] ?? ranked[0];
```

Keep the existing validation (must be on the spine, must not collide with another blocker). This alone turns "the ring-3 gate is always at 2,7" into a real choice, and it costs one RNG call.

**Acceptance:** across 60 seeds, every gate has ≥ 8 distinct positions, and `reachability.test.js` still passes for all of them.

### Step 2 — Vary the inventory, not just the arrangement

Give each ring a *budget* rather than a fixed list:

- required: 1 ship goal, 1 gate, 1 camp, 1 hive
- optional pool, drawn to a seeded budget: alternative resource route, lore vault, ambush arena, derelict setpiece, relic cache

Two runs then differ in what exists, not only where. Keep the required four so the contract in §3 holds.

**Acceptance:** across 60 seeds, ≥ 6 distinct reservation role multisets, and every run still contains the four required reservations per ring.

### Step 3 — Put WFC back between the action points

Stop treating authored tiles and WFC as either/or. A chunk is one of three kinds:

1. **Anchor chunk** — holds an action point. Authored, reserved, untouched by WFC.
2. **Socket chunk** — neighbours an anchor. WFC runs with its edge openings pinned to the anchor's sockets.
3. **Free chunk** — everything else. WFC runs with ring-scaled parameters from §3.2.

This is the change that makes corridors, room shapes and door positions stop repeating, because free chunks are the majority of what a player walks through.

**Acceptance:** two runs at the same ring produce different room/hall signatures for free chunks, while anchor chunks remain byte-identical to their authored definition.

### Step 4 — Story beats in fixed order, variable staging

Beats already have a fixed order (`STORY_DEADLINES`, `HIVE_TERRITORY_BEATS`: warning → approach → outer nest → choice chamber → consequence → escape). What varies should be the room each beat is staged in, drawn from rooms that satisfy the beat's requirements (a choice chamber needs a defensible interior; a warning needs a sightline).

**Acceptance:** beat order is identical across runs; the chunk hosting each beat is not.

---

## 5. Order of work

1. **Step 1 (gates).** One function, one RNG call, immediately felt. Do this first.
2. **Camp/hive anchor audit.** Same one-shot bug as Camp Meridian, other set pieces.
3. **Step 3 (WFC between anchors).** The big one; most of the felt repetition lives here.
4. **Step 2 (inventory budget).** Content variety once shape variety exists.
5. **Step 4 (beat staging).** Last, because it depends on rooms being varied enough to stage into.

## 6. How to check any of this

The measurement harness used for §1.1 is worth keeping as a test:

```js
// build N plans from N seeds, assert distinct-position counts per gate
const positions = new Map();
for (let i = 0; i < 60; i += 1) {
    const plan = buildWorldPlan(generateRadialMazeExpedition(seedFor(i)));
    for (const c of plan.ringCrossings) positions.get(c.id).add(c.chunkKey);
}
```

A variety ratchet in `reachability.test.js` — "every gate has at least N distinct placements across N seeds" — would have caught this the day it regressed, and stops it regressing again.
