# Playtest Evidence: Log1 Findings and Improvement Plan

This is a human-observed playtest analysis of one real session, cross-checked
against the `dev/sprint-22` source at the time of writing (branch 2 commits
ahead of `origin/dev/sprint-22`, working tree clean, **1,211 passing Vitest
tests across 153 files** — supersedes the 1,101/143 figure in
[README.md](README.md) and [00-master-pm-onboarding.md](00-master-pm-onboarding.md),
both updated alongside this doc). It exists because Sprint 22's stated job is
to convert "implemented" into "accepted" using recorded human observation,
not diagrams — see [Master PM Onboarding](00-master-pm-onboarding.md#sprint-22-priorities)
priorities 2 and 3. This is that evidence for one representative run, plus
two bugs the log surfaced that are confirmed against the code, not just
inferred from symptoms.

## Session Facts

Source: `docs/dev-logs/Log1.log` (Electron/Steam build, `HunkerBunker/2.1.0`,
AppID 4957040), 24 minutes 26 seconds of session time, 807 log entries.

| Field | Value |
|---|---|
| Class | TANK |
| Outcome | Death — `frost-shockwave` (boss_cryosnail), depth tier SHALLOW |
| Distance travelled | 2,142 |
| Snails killed | 46 |
| Pickups | 66 |
| Mission | RETRIEVE: PRIORITY TECH CACHE — completed |
| Achievement unlocked | HUNKERED ("survive a run past twenty minutes") |
| Near-death flag | true |
| Onboarding path | Chose `[B] RUN ME THROUGH PROTOCOLS` (guided tutorial) |
| Run modifiers drawn | PATROL SURGE, SPORE BLOOM, CAMP PARANOIA |

Nothing in this run crashed, soft-locked, or hung. Boot, loadout, tutorial
onboarding, world streaming, mission completion, the death black-box, and the
achievement/telemetry pipeline all completed correctly end-to-end. The
findings below are about specific, reproducible sharp edges inside that
otherwise-working loop, not systemic failure.

## Findings

Ranked most to least actionable. The first two are confirmed against
`src/threeGame.js`, not just log symptoms.

### 1. `foundry-discovered` re-fires on every base-return tick instead of once — confirmed bug

**Evidence:** the event fired **14 times** across the run, always for the
same site (`x: -16, z: 36`), with only `distance` changing between firings:

```
20:41:03.074 / 20:41:03.076 / 20:41:41.704 / 20:43:02.454 / 20:44:46.445 /
20:45:10.778 / 20:45:24.433 / 20:45:24.453 / 20:46:50.824 / 20:47:22.253 /
20:56:07.318 / 20:56:19.967 / 20:56:25.140 / 20:56:42.739
```

**Root cause:** `revealFoundry()` (`src/threeGame.js:8744-8753`)
unconditionally dispatches `window.dispatchEvent(new CustomEvent('foundry-discovered', ...))`
every time it runs, with no check on `this.foundry.isRevealed`. It is called
unguarded from `ensureO2BubbleVisualState()` (`src/threeGame.js:11895`,
inside the "Returning to an already-online base: snap the flood-light grid
and the Foundry on with no theatrics" branch), which itself is invoked from
at least five call sites (`src/threeGame.js:3496, 4685, 7669, 8483, 12815`)
including whatever runs on bunker-door interaction — which lines up with the
13 `bunker-door-toggled` events in this same log.

**Impact:** `foundry-discovered` drives a codex unlock and a cinematic
poster-art event (`src/data/codex.js:31`, `src/cinematicFallback.js:72`) —
if either is wired to a toast/notification on every dispatch, the player saw
the "you found the Foundry" beat up to 14 times in one run. Even if the UI
happens to dedup visually today, the event contract is wrong and any future
listener (achievements, audio stinger, analytics) will double-count.

**Fix:** guard the dispatch in `revealFoundry()` on
`!this.foundry.isRevealed` before calling `reveal()`/`revealInstant()`, the
same pattern `updateAct2()` already uses correctly one call site over
(`src/threeGame.js:11895` immediately follows `if (phase === 'dish' &&
!this.foundry?.isRevealed)` a few lines earlier at line 11857 — the guard
exists nearby, it just isn't applied to this call site).

### 2. Bunker door gives no protection from boss AoE — the actual death in this log

**Evidence, reconstructed timeline of the final 15 seconds:**

```
20:57:07.055  player-damaged  boss_cryosnail   hp 1/5
20:57:07.601  bunker-door-toggled open: true
20:57:08.214  bunker-door-toggled open: false      (closed again 613ms later, unresolved)
20:57:10.549  Hotkey R — RELOAD
20:57:17.305  Click -> canvas
20:57:21.889  bunker-door-toggled open: true        (2nd attempt to retreat)
20:57:22.283  player-damaged  frost-shockwave  hp 0/5 — DEATH, 394ms after the door opened
```

**Root cause:** `boss_cryosnail`'s frost-shockwave (`src/threeGame.js:21921-21935`)
is a hit-scan check with no separate telegraph: on a 5.5s cooldown, once the
boss is within 12 units of the target, it calls
`spawnFrostShockwaveEffect(...)` and in the same frame checks
`d <= 4.5` (player distance to boss) to apply 1 damage. There is no delay
between the visual effect spawning and the damage landing, and the bunker
door has no interaction with damage/immunity at all — it is a pure
traversal/visual toggle. The player's read (open the door, get inside, be
safe) is a reasonable one that the mechanic doesn't support.

**Impact:** this is the proximate cause of the run's only death, and it cost
the player their reload-and-retreat play at 1 HP — the moment a roguelike
run is supposed to feel decideable, not instant. Whether the fix is a real
i-frame/safe-zone grant on door-open, a wider shockwave telegraph window, or
just clearer feedback that "closed door ≠ safe from AoE already in flight,"
is a design call, not a bug fix — flagging it here as the concrete instance
the design decision should be tested against.

**Recommendation:** route this into Sprint 22 priority 4 ("Combat
comparison... extend phase mechanics only where the test shows monotony") —
this is exactly the kind of boss-outside-Queen finding that section asks
for. `boss_cryosnail` is not on the Queen's phase framework and this log
shows why that gap is visible in play, not just in the roster diff.

### 3. World navigation leans almost entirely on Radar Scan, not movement/dash

**Evidence — input action counts for the whole run:**

| Action | Count |
|---|---|
| RADAR SCAN (Tab/F) | 53 |
| INTERACT (E/Enter) | 23 |
| DASH (Shift) | 7 |
| RELOAD (R) | 4 |

Radar scan was used **7.5x more often than dash**, roughly once every 27
seconds of gameplay on average. Chunk generation telemetry for this run
shows why: of 68 generated chunks, **53 (78%) were `maze` landform** (the
remainder: 14 `canyon`, 1 `field`), and the average void-tile fraction across
all generated chunks was **37%** (`floor`+`ledge`+`cliff` walkable vs `void`
unwalkable).

**Interpretation:** this is the "world readability after the 49×49 merge"
risk the onboarding doc already names as open
([00-master-pm-onboarding.md](00-master-pm-onboarding.md#what-is-still-product-risky)),
now with a concrete behavioral signature — a player leaning on the scan
button instead of dashing through space suggests the maze-heavy layout isn't
reading as legible routes at a glance, which is the exact acceptance
criterion Sprint 22 priority 2 asks to test.

**Recommendation:** don't fix landform mix off one run — but this log is a
usable baseline. Pull 3-5 more `Log1`-shaped exports across different seeds
and compare radar-scan-per-minute and maze-landform-fraction; if the ratio
holds, it's a route-clarity finding worth a world-gen pass (fewer/larger
maze cells, or landmark-based radar guidance instead of raw scan spam)
rather than a one-off.

### 4. Boot takes 19.1s with 67 main-thread long tasks (5.7s blocked)

**Evidence:**

```
20:34:14.710 warn Boot contained 67 long tasks (5726ms total) {
  slowest: [363ms @ 2350ms, 248ms @ 732ms, 232ms @ 297ms, 215ms @ 6582ms, 175ms @ 6860ms]
}
```

Cold boot (`dom-content-loaded` to `boot-ready`) took 19,253ms; asset
manifest loading alone accounted for ~9s of that (core assets 3.1s +
gameplay assets 5.9s, sequential, not overlapped with `three-module-import`).
[14-engineering-rendering-and-performance.md](14-engineering-rendering-and-performance.md)
covers in-scene draw-call and frame-time work but has no boot-path content —
this is a gap in that doc's scope, not a duplicate finding.

**Recommendation:** worth a follow-up boot-path pass alongside the frame-time
work already tracked in doc 14 — specifically whether gameplay-asset loading
(38 images/47 audio) can start concurrently with core-asset loading rather
than after it, and whether any of the 67 long tasks are avoidable synchronous
work during atlas repacking (`Repacking sprite atlas: ENGINEER/TANK/...`
entries correlate with several of the longer tasks in the timeline).

### 5. Biome boundary flapping near active/cryo edges

**Evidence:** `biome-changed` fired 17 times in the run, including three
transitions inside a single 9-second window late in the run
(`active@20:54:20.597 → cryo@20:54:22.740 → active@20:54:29.015`).
`emitBiomeChanged()` is correctly deduped on key-change already
(`src/threeGame.js:14170-14172`), so this isn't a spam bug like Finding 1 —
it's a real signal that the player was moving back and forth across a biome
band edge (`BIOME_BLEND_HALF_WIDTH = 10` world units,
`src/threeGame.js:614`) during active play, most likely combat, near that
boundary.

**Impact:** each transition re-fires the `o2DrainMultiplier` change and the
ambient notification message ("ENTERING CRYO SECTOR..."), which is minor UX
noise if it's firing every few seconds during a fight rather than as a
deliberate zone crossing.

**Recommendation:** low priority relative to 1-4. If it recurs across more
logs, consider hysteresis on the notification/audio cue specifically (keep
the O2 multiplier logic instant and correct, just don't re-announce the
transition within some minimum interval).

### 6. Steam backend auth failures — two separate paths, one session

**Evidence:**

```
20:33:58.712 error [steam-vault] failed to load inventory:
  { ok: false, status: 405, reason: "steam_auth_http_error" }
...
20:57:29.623 info  [steam] leaderboard submit skipped: steam_auth_http_error
```

The backend's own `[STEAM] Backend Service: ACTIVE (Auth Configured: true)`
banner logs green throughout, but two consumer paths — Vault inventory load
(405, at boot) and leaderboard submit (at run end) — both failed with the
same `steam_auth_http_error` reason. [09-engineering-steam-backend-auth.md](09-engineering-steam-backend-auth.md)
and [current-feature-status.md](../current-feature-status.md) both already
flag installed-Steam auth acceptance as an open human gate; this log is a
concrete repro of that gate failing, in an environment that otherwise
reports itself healthy. Worth attaching to that existing open item rather
than treating as new scope — but the specific 405-on-Vault-load symptom is
new information for whoever runs that acceptance pass next.

## Improvement Plan

### Implementation update — 2026-08-04

The first four actions have now been worked:

1. **Implemented + automated:** `revealFoundry()` exits when the foundry is
   already revealed. A regression test proves repeated reveal attempts produce
   one reveal and one `foundry-discovered` event.
2. **Implemented + automated:** Cryosnail frost shockwave damage now resolves
   after a 900ms wind-up instead of on the telegraph frame. The engine emits a
   `boss-attack-telegraph` event with attack, radius, and wind-up metadata, and
   tests prove moving beyond 4.5 units during that window avoids damage.
3. **Connected + automated, not yet accepted:**
   `npm run audit:playtest-navigation -- docs/dev-logs/Log1.log` now reports
   scan rate, dash ratio, landform mix, and void fraction for one or many logs.
   Log1 establishes the baseline at 2.22 scans/minute, a 7.57 scan-to-dash
   ratio, 77.9% maze chunks, and 38.1% void tiles. Acceptance still requires
   the requested additional human sessions; the tooling does not fabricate
   that evidence.
4. **Implemented, awaiting fresh cold-boot acceptance:** player atlas loading
   and directional enemy atlas pixel scanning/repacking are deferred out of the
   title boot path and flushed when the renderer enters gameplay. Network image
   loading can finish earlier, but the synchronous canvas work no longer lands
   inside the measured title boot window. A fresh Electron cold-boot log is
   required to record the new long-task count and total.

Ordered by what unblocks the most Sprint 22-stated risk per unit of effort.
Each item follows the doc set's existing status vocabulary
(Implemented/Connected/Automated/Accepted) so it can be dropped straight into
[current-feature-status.md](../current-feature-status.md) once picked up.

1. **DONE — Fix the `foundry-discovered` dedup gap.** One-line guard in
   `revealFoundry()`, `src/threeGame.js:8744`, with a regression test
   asserting the event fires exactly once across repeated
   `ensureO2BubbleVisualState()` calls after the foundry is revealed. Small,
   isolated, no design decision required — do this first.
2. **DONE — Decide the bunker-door-vs-AoE contract and implement it.** The
   selected contract is a readable 900ms shockwave wind-up with escape based on
   the player's position when damage resolves; the bunker door does not become
   universal immunity. A regression test asserts the selected behavior. Keep
   `boss_cryosnail` in the Sprint 22 priority-4 combat comparison for a human
   feel check of the wind-up duration.
3. **TOOLING DONE / HUMAN RUNS OPEN — Collect 3-5 more session logs across different seeds/classes** and
   re-run the radar-scan-rate / maze-landform-fraction comparison from
   Finding 3 before committing to a world-gen change. This is the
   "representative world seeds have recorded human readability findings"
   acceptance criterion from [00-master-pm-onboarding.md](00-master-pm-onboarding.md#definition-of-sprint-22-done)
   — this doc is seed 1 of that set, not the full picture.
4. **IMPLEMENTED / RE-MEASUREMENT OPEN — Boot-path profiling pass**, scoped as a follow-up to doc 14
   (rendering/performance), not a rewrite of it: atlas repacking has moved out
   of the long-task-heavy title window. Capture a fresh cold-boot log before
   deciding whether manifest concurrency is still necessary.
5. **Re-run the Vault/leaderboard Steam auth acceptance pass** referenced in
   doc 9, using this log's 405-on-inventory-load as a known repro rather
   than starting from scratch.
6. **Optional:** hysteresis on the biome-transition notification/audio cue
   if Finding 5 recurs in the additional logs collected for item 3.

## Suggested Logging Follow-up

This analysis was only possible because `Log1.log` already captures
structured `category`/`level`/`elapsedMs` entries with event detail
payloads — that schema did all the work here. The one gap worth closing: a
`foundry.isRevealed` (or equivalent) value in the `foundry-discovered`
payload itself would have made Finding 1 visible from the log alone, without
needing to cross-reference the call sites in `threeGame.js`. Consider adding
current-state flags to repeat-prone events generally, not just this one.
