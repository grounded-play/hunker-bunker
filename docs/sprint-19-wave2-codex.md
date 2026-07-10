# Sprint 19 Wave 2 Brief — Codex: Achievements Engine & Page

Derived from [sprint-19-wave2-work.md](sprint-19-wave2-work.md). Siblings:
[Gemini — Assets](sprint-19-wave2-gemini.md),
[Claude — Tree & Lore](sprint-19-wave2-claude.md).

## Mission

Turn the death-only achievements stub into a real meta layer: a data-driven
engine that watches the game's existing event stream, and a home-screen
ACHIEVEMENTS page that stays hidden until the first unlock.

## What exists (migrate, don't orphan)

`main.js` has `hb_achievements_v1` (totalDeaths, totalKills, maxKillsOneRun,
deepTierReachedAlive, unlockedHardened), fired only from the death path, with
two hardcoded unlock strings. Existing players' counters must survive the
migration into the new schema.

## Deliverables

### 1. `src/achievements.js` (new, pure, tested — house style)

- `ACHIEVEMENT_DEFS`: data table `{ key, title, blurb, icon, secret?,
  check(stats, event) }`. Launch set (~16, coordinate icon keys with Gemini):
  - **QUICK STUDY** — die within 5 seconds of a run starting
  - **HUNKERED** — survive a single run past 20 minutes
  - **SCOUT'S HONOR / TANK COMMANDER / CHIEF ENGINEER** — reach any ending
    as each class
  - one per **ending family** reached (10 exist; group tail cases if needed)
  - **CARTOGRAPHER** — discover all three camps in one run (wave-1
    `campDiscovered` milestone events)
  - **ARCHIVIST** — collect N lore drops (listen for Claude's
    `lore-drop-collected`)
  - **KIN** — reach max bond with any hive
  - **GHOST** — reach the reveal with zero suspicion gained
  - **HARDENED** — migrate the existing 5-deaths unlock
  - **SLAY THE QUEEN** — define now, mark `comingSoon: true` (fight is wave 3)
- Engine: `recordEvent(name, detail)` + `recordRunEnd(stats)`; returns new
  unlocks; persists merged stats to `hb_achievements_v1` (schema v2 with
  migration from v1 fields).

### 2. Event wiring (the game already broadcasts nearly everything)

Listen, don't instrument: `act2-milestone` (incl. `campDiscovered`),
`player-suspicion-changed`, `hive-choice-resolved`, `run-cards-drawn`,
`shell-collected`, `lore-drop-collected` (Claude's, coming), death path,
**and the ending path — the stub's biggest hole: victories currently record
nothing.** Hook the ending picker flow in `main.js` where the ending
cutscene/card is chosen.

### 3. Home-screen ACHIEVEMENTS page

- Button on the start screen, **hidden until ≥1 unlock exists** (the user's
  gating ask); appears with a one-time shine.
- Grid of cards: icon (Gemini's `ach_<key>.png`), title, blurb; locked =
  silhouette + "???" for `secret` defs; progress counters where meaningful
  (e.g. lore 7/12).
- Unlock toast in-run: reuse the notification-deck pattern; play Gemini's
  achievement-burst FX via `KeyedVideoSprite` when it exists, plain card
  until then.
- Dispatch `achievement-unlocked { key, title, blurb }` for anything else
  that wants it.
- Fold in the gap-analysis freebie: a "COPY SAVE CODE" button on this page
  (calls existing `exportSaveCode`).

### 4. If achievements land early (stretch, from wave-1 leftovers)

Sweep your three contract-only cards: `spore_bloom` economy consumers,
`ice_collapse` canyon sealing (coordinate with Claude — landform grids are
his), `egg_instability` manifest enforcement.

## Files owned

`src/achievements.js` (+ test), achievements page markup/styles/wiring in
`index.html` / `style.css` / `main.js` (menu + toast regions), migration of
the `main.js` stub.

**Off-limits:** `bank.js` and terminal modal (Claude's tree), `public/`
asset generation (Gemini's — you consume `ach_*.png` by key).

## Done when

- A fresh profile shows no achievements button; dying in <5s unlocks QUICK
  STUDY, the toast fires, and the button appears on the home screen.
- Beating the game as any class records both the class and ending unlocks.
- The v1 stub's death count carries into the new page.
- Unit tests cover defs, migration, and the check functions; a headless
  probe drives the <5s death and asserts the toast + page gating.
