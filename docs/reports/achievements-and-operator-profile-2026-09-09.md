# Achievement Progress and Operator Profile — Fixes

Status: implementation evidence | Owner: Claude | Updated: 2026-09-09
| Request: maintainer, 2026-09-09 — achievements not showing progress, active operator profile not updating, must work in Steam offline mode and reset with a save reset

## 1. What was actually broken

The achievement engine was **not** the problem. A browser reproduction confirmed
`src/achievements.js` records correctly: firing three `lore-drop-collected`
events and one `hive-choice-resolved` moved ARCHIVIST to `3 / 12` and KIN to
`3 / 5` in `localStorage` and in the modal. Everything broken was downstream, in
`main.js` wiring that unit tests cannot reach.

### F1 — the career readout only ever rendered at boot (P1)

`refreshCareerStats()` and `refreshTitleProfileHud()` were called at startup and
on a class-card click, and nowhere else. Neither return-to-title path — the
hero-select back-out or the post-run door transition — repainted them. A run's
deaths, longest run and depth were recorded correctly but did not appear on the
title screen until the next launch.

Reproduced directly: `DEATHS 0` / `LONGEST 00:00` before driving events, and
byte-identical after.

### F2 — the save-data probe called the wrong function (P1)

`main.js` gated both the CONTINUE button and the operator profile HUD on:

```js
const hasUnlocks = hasAnyUnlock(getAchievementProgress());
```

`getAchievementProgress(def, state)` takes two arguments. Called with none it
returns `null` on its first line, so `hasUnlocks` was **permanently false**. A
player whose only progress was achievements got no CONTINUE button and no
operator profile HUD at all. The reproduction showed `hudHidden: true`.

### F3 — most achievements had nothing to show (P2)

Only 4 of 14 definitions had a `progress` function. Nine of the remaining ten are
`secret` and render as `???` by design, which is correct. HUNKERED was the one
non-secret achievement with a genuinely trackable target — "survive past twenty
minutes", against a `maxRunMs` the state already stores for the career readout —
and it showed nothing.

## 2. Fixes

| Fix | Detail |
| --- | --- |
| F1 | Both recorders now dispatch `achievement-stats-changed`, and the title screen listens. Both return-to-title paths refresh explicitly, since the listener is deliberately inert while the title is off-screen. |
| F2 | `hasAnyUnlock(achievementEngine.getState())` — the state the helper actually expects. |
| F3 | HUNKERED reports whole minutes of the best run so far (`10 / 20`). Whole minutes rather than seconds: a seconds-accurate bar would tick every frame of a long run without telling the player anything more. |

`achievement-stats-changed` fires on every `shell-collected`, which happens
constantly mid-run, and the handler repaints title-screen DOM. It therefore
no-ops unless the splash is actually visible; the explicit refresh on the
return-to-title paths covers the case that matters.

Also added `window.__DEBUG__.recordRunEnd(stats)`, consistent with the rest of
that surface, so the career readout and progress bars can be QA'd without
playing a full expedition.

## 3. Steam offline mode

Already correct, and now covered by a test rather than an assumption:

- All achievement state is `localStorage` (`hb_achievements_v1`). No network path.
- `syncSteamStats` returns `[]` when `setStat` is not a function, so a web build
  or a missing preload changes nothing.
- The unlock→Steam forward is guarded on `window.electronAPI`.
- On the Electron side, `steamClient.achievement.activate` and
  `stats.setInt` + `stats.store()` write to Steam's local stats cache and sync on
  reconnect; both are already wrapped in try/catch.

`tests/e2e/achievements-and-profile.spec.js` stubs an `electronAPI` whose every
call rejects and confirms local progress and the career readout still update.

## 4. Save reset

Local reset already worked and is now pinned by a test: `clearSaveData()` removes
every `hb_`-prefixed key, `hb_achievements_v1` included. The settings reset path
reloads the page; the new-game path re-probes save data, which now returns the
right answer given F2.

**Steam achievements are not cleared, deliberately.** They can be — Steam exposes
`ISteamUserStats::ClearAchievement` for one and `ResetAllStats(true)` for all, and
both work offline against the local cache. This repo already wires the latter as
`hb:resetAchievements` in `electron/main.cjs`, gated behind the QA-tools check so
a normal player cannot reach it. It is not called from the save-reset path, and
was left that way: Steam achievements are account history rather than save state,
and most games treat them as such. Say the word if you want the save reset to
clear them too — the plumbing already exists and needs one call.

## 4a. Follow-up: the profile showed all zeros (and shouldn't have shown at all)

Reported after the first pass: the operator profile still displayed, with every
field reading zero.

### F4 — the menu recorded ABYSS into permanent career state (P1)

`getSpawnTile()` deliberately parks the menu showcase in chunk **(100, 100)** to
keep it blank. `getDepthTier()` measures distance from chunk **(0, 0)** and
returns its deepest band, 3, for anything past chunk 9. The animation loop's
chunk-visibility pass calls `updateDepthTierProgress` regardless of profile, so
**simply reaching the title screen recorded `deepestDepthTier: 3` into the
persistent arc signals** — before the player had ever deployed.

Confirmed on a wiped profile: `arcDepth: 3`, `profile: "menu"`, player at
`(4925, 4925)`, chunk size 49 → chunk 100.5 → `hypot(100, 100) ≈ 141` → tier 3.

That is why the panel read `DEPTH ABYSS` beside `DEATHS 0` and `LONGEST 00:00`.
It also fed `CAVE_SIGNAL_MIN_DEPTH`, so the cave-signal arc condition was partly
satisfied from boot for every profile.

`recordSignal` only ever raises this value (`Math.max`), so it could never
recover on its own.

**Fixed** by gating the persisted signal on `performanceProfile === 'gameplay'`.
`currentDepthTier` stays truthful for live systems (O2 drain, salvage, elite
rolls); only the career signal is gated.

**Existing saves repaired**: `ArcStateManager.clearUnearnedDepthSignal(hasRunHistory)`
clears a recorded depth when the player has never finished a run — then any
recorded depth must be menu pollution. A player with real run history keeps what
they earned; there is no separate record to reconcile against, and silently
lowering an earned number would be worse than leaving it high.

### F5 — "has a save" and "has a career worth showing" were the same question (P2)

The profile HUD was gated on the same probe as the CONTINUE button. Banked
salvage or a recoverable black box make CONTINUE meaningful but put nothing in a
readout that reports runs, deaths, longest run and depth. The two are now
separate: CONTINUE asks whether there is anything to resume, the panel asks
whether there is anything to report.

Both probes also OR-ed `hb_run_stats_v1` and `hb_bank_v1` by key existence.
**Neither key is written anywhere in the game** — the bank's key is `hb_bank` —
so those terms only ever fired for an e2e that wrote them by hand. Replaced with
real content checks.

Also added a `bank-deposited` listener beside the achievement one, so the title
reflects current state whenever it is visible.

## 5. Verification

| Check | Result |
| --- | --- |
| `src/achievements.test.js` | 15 pass (12 pre-existing + 3 new for HUNKERED progress) |
| Full suite | 287 files, **2579 tests pass** |
| `npm run lint` / `presubmit` / `build` / `audit:docs` | Pass |
| `src/arcState.test.js` | 12 pass (4 new for the depth-signal repair) |
| `src/threeGame.depthContractCrossing.test.js` | 6 pass (3 new for the menu guard) |
| Browser | `tests/e2e/achievements-and-profile.spec.js` — **8/8 pass**: career readout updates after a run; achievement-only progress enables CONTINUE and the profile HUD; progress renders for all four trackable achievements; progress records with Steam unreachable; a save reset clears it; a fresh profile shows no operator profile at all; banked salvage enables CONTINUE without showing an all-zero profile; a real run makes the profile appear with its actual numbers |

Two of the five needed a retry on first attempt — the boot-under-load flake this
container is already known for and which `playwright.config.js` documents, not a
behaviour difference.

## 6. Not claimed

Not tested on the packaged Electron build or against a real Steam client in
offline mode; the offline evidence is a stubbed `electronAPI`, which exercises
the renderer's guards but not Steamworks itself. The nine secret achievements
still show `???` with no progress, which is intended.
