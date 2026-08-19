# Debug Proving Grounds Audit

Date: 2026-08-19
Scope: `src/debugQaNexus.js`, `src/debugMuseum.js`, `src/debugShowroom.js`,
`src/debugTileGrid.js`, `src/debugBossArenas.js`, `src/debugCampSimulator.js`.

User ask: "audit the demo area of objects and things... we should have
like a whole museum I can walk around to see objects right? and a place
to test things as well like hives and camps?"

## Headline: it already exists, in more depth than the ask implied — but two of its five wings are broken in ways that would make it feel like it doesn't exist

There is a genuinely comprehensive existing system, the **QA Nexus //
Proving Grounds Command** (open via the `~` console's `tp nexus`, or
`window.__DEBUG__.openNexus()`), with 5 wings plus quick-jump lists:

| Wing | What it is | Origin |
|---|---|---|
| Wing 1: Solo Colonnade (**the museum**) | Every weapon archetype/skin, charm, rig mod, chassis skin, cosmetic decal, wall decal, world prop/setpiece, floor decal, and enemy/boss in the game, one per labeled pedestal in a walkable corridor, with live triangle counts on each placard | (9000, 9000) |
| 4-Wall Orientation Showroom | Every item above again, in 8×8m stalls with 4-wall + center-pedestal repeats to check orientation/lighting from every angle | (9500, 9500) |
| Wing 2: Architectural Grid | 32m demo grid of canyon edges, rooms, and doors | (11000, 9500) |
| Wing 3: Boss Arenas | **5 live boss encounters** with phase jumpers (Hive Queen Crucible — 3 phases, Cryo Behemoth, Spore Snail Overlord, Mycelium Stalker Den, Cyber Snail Matrix) | (13000, 9500) |
| Wing 4: Camp Testing Lab | **4 camp lifecycle states** including "Under Hive Siege" (Uncontacted/Dark, Powered Trading Post, Under Hive Siege, Overrun/Abandoned) | (15000, 9500) |

This is already what was asked for — a walkable museum, plus a dedicated
proving ground for encounter testing including hives (via the Hive Queen
boss arena and the camp lab's siege state) and camps (the whole of
Wing 4). It's under-discovered, not under-built: reachable via the `~`
console (`tp nexus`, or `tp museum` / `tp showroom` / `tp wing2` / `tp
wing3` / `tp wing4` directly), with test coverage for 5 of its 6 modules
(`debugMuseum`, `debugQaNexus`, `debugTileGrid`, `debugBossArenas`,
`debugCampSimulator` all have passing `.test.js` files; `debugShowroom`
does not).

## Bug 1 (confirmed, severe): Wings 1, 3, and 4 kill the player on arrival

**Root cause, confirmed live**: `openDebugMuseum`, `openDebugBossArenas`,
`openDebugTileGrid`, and `openDebugCampSimulator` all position the player
with a bare `game.player.position.set(x, 0, z)` instead of the game's
real teleport helper, `game.teleportPlayerTo(x, z)`. The real helper
does several things these skip — most importantly `syncVisibleChunks()`,
which generates/validates real tile data at the destination. Without it,
the destination has decorative Three.js floor meshes (visually solid)
but no real tile data behind them, and the game's normal per-frame
`isPlayerOverAnyHole()` check reads that as **standing over a hole** —
triggering the same lethal pit-fall mechanic a real run uses ("Pocket
worlds temporarily disabled; all falls are lethal", per the code
comment). `setGodMode(true)` — which all four call right after
teleporting, presumably as their safety net — does **not** block this,
since it's a scripted fall-death, not a damage/HP event.

**Verified live, precisely**, on Wing 1: teleport lands cleanly at
(8996, 9000), `isPlayerFalling` flips `true` within the same or next
frame, and ~5 seconds later `isPlayerDead: true`, player scale shrunk to
0, godMode confirmed still `true` throughout. The museum populates
correctly in the background the whole time (confirmed the pedestal group
growing from 17 to 24+ children) — the content is fine, you just don't
survive long enough to see it. Wings 3 and 4 use the identical
`position.set(...)` + `setGodMode(true)` pattern (confirmed via source
read, not yet live-tested individually, but there is no reason to expect
a different outcome) — this is likely 3 of the 5 wings for anyone who
has tried this system.

Wing 2 (Architectural Grid) uses the same pattern too but wasn't
independently checked live — worth confirming during the fix pass, not
assumed safe just because it wasn't tested here.

**Fix direction**: swap `game.player.position.set(x, 0, z)` for
`game.teleportPlayerTo(x, z, { safeFloor: false })` (keep `safeFloor:
false` since these are exact staged coordinates, not "nearest walkable
tile to a rough target" — but let `syncChunks` run, which is the part
that actually matters here) in all four files. Small, mechanical,
low-risk — this is exactly the pattern the Showroom already uses
correctly (see below).

## Bug 2 (confirmed, severe): the 4-Wall Showroom hangs for minutes on open

**Root cause, confirmed via source read** (the live repro was still
running past 120s at the time of writing, moved to background): unlike
the museum — which already had this exact bug and was fixed for it, per
its own code comment ("previously... ~76 sequential (unbatched,
one-await-at-a-time) GLB loads... confirmed live to take multiple
minutes with zero visible progress") — the showroom's `buildShowroomScene()`
(`src/debugShowroom.js:258`) never got the same fix. It's a doubly-nested
loop: for every item in the full ~80-100-item catalog, for each of that
item's up to 5 wall placements (N/S/E/W/center), it `await`s a fresh GLB
or world-model load, one at a time. Props in particular load their model
fresh at all 5 placements rather than once — the exact antipattern the
museum's fix comment describes, just never applied here.

**Fix direction**: mirror the museum's own fix — cache loaded
models/GLBs by URL (`glbCache`-style `Map`) and reuse across placements
of the same item instead of reloading, and/or batch loads with
`Promise.all` per category instead of one sequential `await` per
placement. Given the museum already solved this exact problem in this
same codebase, the fix is more "port an existing pattern" than "design
something new."

## Smaller gap, not a bug: no dedicated "hive" wing

Hives are testable today, but only indirectly: the Hive Queen boss fight
(Wing 3) and the camp lab's "Under Hive Siege" state (Wing 4) are the
only hive-related content. There's no standalone hive/nest structure to
walk through the way camps get their own dedicated lifecycle lab. Not
urgent — the user's literal ask ("test things... like hives and camps")
is functionally covered — but worth naming if a deeper hive-specific
testing area (e.g. hive growth stages, swarm density tuning) becomes
useful later.

## Priority and risk

1. **Bug 1 (pit-fall death on 3-4 of 5 wings)** — highest priority. This
   is almost certainly why the system feels broken/nonexistent to anyone
   who's tried it: you die within ~5 seconds of arriving, before you can
   see anything. Fix is small, mechanical, and copies a pattern that
   already works correctly elsewhere in the same codebase (the Showroom's
   own teleport call). Low risk — touches only debug-only code paths.
2. **Bug 2 (showroom multi-minute hang)** — second priority, same reasoning
   (copies an existing, already-proven fix from the museum). Low risk,
   same reason.
3. Hive-specific wing — not scoped, not urgent, flagged for later if wanted.

Not yet fixed — this doc is the audit/findings step. Recommend fixing
both bugs together in one pass (they're both small, mechanical, and each
has a working reference implementation already in the codebase to copy
from) once reviewed.
