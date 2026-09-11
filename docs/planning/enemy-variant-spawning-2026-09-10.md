# Enemy model variants: wiring the `_A` / `_B` meshes to spawn

**Date:** 2026-09-10
**Branch:** `dev/sprint-34`
**Status:** implemented

## Why this exists

A retail-payload audit flagged `sentinel_A.glb` and `alien_proto_crawler_A.glb`
as byte-identical duplicates of their base mesh and proposed deleting them. That
was the wrong read: they are variant slots waiting on art, not waste. Pulling the
thread showed the real problem — **no variant mesh has ever appeared in
gameplay.**

## What was actually broken

Three separate causes, found by tracing every spawn site:

1. **Every spawn site emits the family name.** `roomEncounters.js:10`,
   `threeGame.js:24558 / 25123 / 26876 / 26884`, `bossPhases.js:343`,
   `mazeTiers.js:129`, `milestoneBossLifecycle.js:43` all emit `'sentinel'`.
   Nothing ever emitted `sentinel_A`, `sentinel_B` or `alien_proto_crawler_A`.

2. **The type registry rejects them.** `threeGame.isEnemyType()` whitelists the
   family names only, so a variant type string would not have been treated as an
   enemy even if something had emitted one.

3. **Sentinels never called the 3D overlay at all.** `isSentinel()` takes a
   dedicated early-return branch in `createScatterInstance` that builds a 2D
   sprite and returns before `setupEnemy3dCosmeticOverlay()`. So *all three*
   sentinel meshes were unreachable — including `sentinel_B.glb`, which is
   genuinely distinct art, not a duplicate.

Before this change the variants existed only in the 3D catalog, in
`ENEMY_STATS`, and in `debugShowroom.js:131-133`.

### Correction to an earlier claim

An earlier note in this session said the spawning sentinel fell through to the
2 HP snail baseline. That was wrong — it traced `getEnemyStats`, which the
sentinel branch never reaches. Sentinels used a flat `SENTINEL_MAX_HP = 3`. The
authored `sentinel_A` (4 HP) and `sentinel_B` (5 HP) stats were unused, which is
the real defect.

## Decisions

**D1 — The family name stays the spawnable type; the variant rides alongside.**
Rejected making the instance type `sentinel_A`. `isSentinel()` is a literal
`type === 'sentinel'` and the family name is load-bearing in at least six more
places (`universalEncounter.js:21` encounter category, the gear-poof at
`threeGame.js:26837`, the mothership line at `main.js:3487`, the death-cause
string at `main.js:4458`, `data/codex.js:17`, `ENEMY_STAGGER_DEFS`). Renaming
the instance type means auditing all of them in a 29k-line file for no player-
visible gain. Instead `userData.modelVariant` carries the mesh identity and
`userData.type` stays the single source of behaviour. This mirrors the existing
`ALIEN_MUTATIONS` shape — a modifier layered on a base type.

**D2 — Pool membership is "has its own `ENEMY_STATS` entry".**
Not an arbitrary list. `sentinel` has no entry, and that absence is the evidence
it was never meant to spawn as itself, so the pool is `[sentinel_A, sentinel_B]`
and the bare mesh never renders. `alien_proto_crawler` *does* have an entry
(identical to its `_A`), so it is a legitimate pool member and the pool is
`[alien_proto_crawler, alien_proto_crawler_A]`. A test pins this rule so adding
a variant without stats fails rather than silently taking the base numbers.

**D3 — Variant selection is deterministic, seeded from world position.**
Not `Math.random()`. Co-op is host-authoritative but each client builds its own
sprite from shared placement data, so a random pick would show the two players
different meshes for the same enemy. Seeding from `x * 31 + z * 17` — which both
peers already have — keeps them identical and keeps a seeded run reproducible.

**D4 — Variants take the authored HP. They do not take the authored speed.**
A sentinel is a stationary turret and never reads `userData.speed`, so importing
1.6 / 1.5 there would be dead data implying movement that does not exist.

## Balance change, called out explicitly

Sentinel HP was a flat **3**. It is now **4 or 5**, split evenly by position, so
average sentinel HP rises ~50%. This is the intended effect of giving the
variants distinct stats, but it is a real difficulty change and the one thing
here a player will feel. Revert by dropping D4's stat lookup and restoring
`SENTINEL_MAX_HP` if it plays too heavy.

`alien_proto_crawler` is unchanged in balance — its two pool members carry
identical stats, so only the mesh differs.

## Changes

| File | Change |
|---|---|
| `src/data/enemies.js` | `ENEMY_VARIANTS` map, `pickEnemyVariant(type, seed)` |
| `src/threeGame.js` | generic branch resolves a variant, keys stats off it, stores `modelVariant` |
| `src/threeGame.js` | sentinel branch resolves a variant, applies its HP, and now calls `setupEnemy3dCosmeticOverlay()` |
| `src/threeGame.js` | overlay loads `modelVariant ?? type` |
| `src/enemy3dOverlay.js` | exports `ENEMY_3D_MODELS` so the catalog is testable |
| `src/enemyVariants.test.js` | 8 tests: catalog coverage, stats coverage, the D2 rule, determinism, passthrough, both variants reachable, the HP fix |

## Follow-up: giving the variants something to show (same day)

Wiring the spawning was only half of it — both `_A` meshes were byte-identical
to their base, so an enemy that resolved to `sentinel_A` still looked exactly
like one that resolved to `sentinel`. `scripts/blender/build_enemy_variant_meshes.py`
now derives them.

**D5 — Shape in the mesh, colour in the engine.**
Silhouette is changed by moving existing vertices (scale, taper, a radial
bulge). Colour is a `tint` entry in `enemy3dOverlay`'s `MODEL_CONFIG`, which
multiplies the material colour at load — the existing cryosnail-on-cybersnail
pattern. Tint costs no payload and cannot damage the scan textures.

**D6 — Never add geometry to these meshes.**
The first attempt joined cones and cylinders on as sensor spires and dorsal
spines. A test render showed them as floating, untextured grey primitives:
these are photoscan assets and new geometry has no place in their UV layout. It
looked markedly worse than the duplicate it was meant to fix. The rebuilt script
only ever moves vertices that are already there, so the texture, normals and UVs
survive intact. **Do not reintroduce primitive greebling here.**

**D7 — Keep added height small.**
`normalizeRoot()` scales each model to a fixed `config.height`, so anything that
raises the bounding box shrinks the body to compensate. The first sentinel_A was
70% taller and would have rendered with a body ~40% smaller than its base.

Resulting silhouettes, all three sentinels now separable:

| mesh | width | depth | height | reads as |
|---|---|---|---|---|
| `sentinel` | 0.774 | 0.646 | 0.796 | the middle |
| `sentinel_A` | 0.60 | 0.45 | 0.92 | narrow, tapered, mass carried low |
| `sentinel_B` | 0.852 | 0.871 | 0.728 | broad and squat |
| `alien_proto_crawler` | 0.670 | 1.136 | 0.367 | long and lean |
| `alien_proto_crawler_A` | 0.82 | 0.98 | 0.40 | broad, stocky, swollen abdomen |

Config heights were spread to match (`_A` 1.18, base 1.25, `_B` 1.32) so the
weight difference reads before the player shoots anything. Tints: `_A` cold blue
`0x9fc4dd`, `_B` warm rust `0xd8b48c`, crawler `_A` bone `0xc2a887`.

Both rebuilt meshes came out *smaller* than their base (5.11 vs 5.55 MB,
4.36 vs 4.85 MB), so this returned ~0.9 MB of retail payload rather than costing
any. The script is deterministic — a rebuild is a no-op in git.

## Known-remaining

- **Duplicate-group count is down to one over 100 KB** (`C6-A.mp4` /
  `C6-B.mp4`, still a deliberate placeholder pair). The sentinel and crawler
  groups are gone because the variants are genuinely different files now.
- **`isEnemyType()` was left alone.** Under D1 no variant string ever reaches it,
  so widening the whitelist would be dead code.
- **Retail headroom is ~2.7 MB.** Unchanged by this work in net terms.
