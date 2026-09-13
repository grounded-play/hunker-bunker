# Asset gap audit

Measured, not estimated. Every number below comes from walking `public/` against
the source that references it.

## Headline: there is no unused-asset problem

| | |
| --- | ---: |
| GLBs in `public/3d/runtime` | 227 |
| Referenced from `src/` or `main.js` | **227** |
| Never referenced anywhere | **0** |

The 3D library is fully wired, including all 30 community chassis skins. A first
pass of this audit reported 28 orphans; that was wrong — it scanned `src/*.js`
and missed `src/data/`, where `communitySkins.js` declares them. Recorded
because the same mistake is easy to repeat.

**So the gaps are missing assets, not wasted ones.**

## Gap 1 — half the endings have no cutscene

The highest-impact gap in the project, and directly against the multiple-endings
goal.

| Ending | Cutscene | Present |
| --- | --- | :---: |
| `FULL_BROOD` | `ending-fullbrood.webm` | ✅ |
| `CLEAN_ESCAPE` | `ending-cleanescape.webm` | ✅ |
| `MIXED_CREW` | `ending-mixedcrew.webm` | ✅ |
| `CARRIERS_BARGAIN` | `ending-carriersbargain.webm` | ✅ |
| `SCORCHED_SKY` | `ending-scorchedsky.webm` | ✅ |
| `MOTHERSHIP_INFECTION` | `ending-mothershipinfection.webm` | ❌ |
| `ALIEN_EXODUS` | `ending-alienexodus.webm` | ❌ |
| `OUTED_ESCAPE` | `ending-outedescape.webm` | ❌ |
| `FAILED_CARRIER` | `ending-failedcarrier.webm` | ❌ |
| `EMPTY_HUSK` | `ending-emptyhusk.webm` | ❌ |

**Player impact:** `playCutsceneVideo` resolves silently when an asset is
missing, so reaching one of the five expanded endings plays *nothing*. A player
who does the hardest thing in the game — allying all three hives for
`ALIEN_EXODUS` — currently gets less payoff than one who stumbles into
`MIXED_CREW`.

These five are also precisely the endings the linchpin system gates, so the
consequence machinery is pointing at empty slots.

**How to close it:** `scratch/generate_cave_scenes.js` already generates the
five that exist, via a reusable in-browser `recordVideo(name, drawFrame,
durationMs, posterT)` helper. Five more calls, plus optional source stills. This
is the cheapest large win available.

## Gap 2 — the new props are not registered

Twenty props were added to `public/` as loose `.glb` files. None appear in
`world3dOverlay.js`'s `MODEL_CONFIG`, which is what maps a scatter type to a
model.

Until they are registered they cannot be placed, and — relevant to the
destruction work — they cannot shatter either, because `spawnPropDebris`
resolves its geometry from `userData.world3dRoot`, which only exists for
registered types.

Each needs one line: `{ url, height, yaw }`.

## Gap 3 — camps have no signature art

The three hives have named leader models (`npc_alien_rhun`, `npc_alien_vey`).
The camps have leader *portraits* for dialogue but no distinct world models, so
Meridian, Tallow and Vesper read as the same dressing with different props.

Lowest-cost improvement: reuse existing NPC models per camp
(`npc_civilian_miner`, `npc_civilian_researcher`, `npc_martha`) as leader
stand-ins, which needs no new art at all.

## What to make, in value order

1. **Five ending cutscenes** — unblocks half the narrative payoff; generator
   already exists.
2. **Register the 20 props** — twenty lines of config; also makes them
   destructible for free.
3. **Camp leader models** — or reuse existing NPCs now and author later.
4. **A manifest readout** — not art, but the single change that would make the
   seat economy visible while it matters. See
   `docs/design/arching-storyline-and-endings.md`.
