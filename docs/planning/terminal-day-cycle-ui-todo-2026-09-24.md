# TODO: Make the Terminal Day Cycle Legible and Live

**Status:** Complete  
**Priority:** P1 — visible feature appears inactive  
**Reported:** 2026-09-24 QA, build `v2.4.12-beta`  
**Branch inspected:** `release/v2.4.12-beta-invisible-essentials`
**Resolved:** 2026-09-24

## Player report

The day-cycle UI in the Bunker Tactical Terminal does not appear activated or
functional. The terminal shows an expedition day, cycle phase, local light and
next transition, but those values look static and do not explain how the player
causes a campaign day to advance.

This is primarily a presentation/runtime-wiring defect. The underlying campaign
day, rest, deadline, fatigue and overnight systems exist and have unit coverage.

## Confirmed diagnosis

### 1. The terminal's live tick is unreachable while the terminal is open

The gameplay frame exits early whenever a blocking modal is visible:

- [`ThreeGame.hasBlockingGameplayOverlay()`](../../src/threeGame.js#L8084)
- [blocking-overlay early return in `ThreeGame.render()`](../../src/threeGame.js#L9648)

The terminal clock tick is called later in the normal gameplay path, after that
return:

- [`ThreeGame.updateTerminalClockTick()` call](../../src/threeGame.js#L9717)
- [`ThreeGame.updateTerminalClockTick()` implementation](../../src/threeGame.js#L23787)

Because `#console-terminal-modal` itself is a blocking overlay, the code that is
supposed to live-update the terminal cannot execute while that modal is open.

### 2. Objective / Night Log is an open-time snapshot

Opening the terminal calls `renderConsoleBanking()`, which renders the day and
night journal once:

- [`ThreeGame.openConsoleModal()`](../../src/threeGame.js#L13475)
- [`ThreeGame.renderConsoleBanking()`](../../src/threeGame.js#L13014)
- [`ThreeGame.renderTerminalObjectiveJournal()`](../../src/threeGame.js#L12941)

The journal prevents duplicate history entries, but it is not subscribed to
mission, day, deadline or local-light changes while the modal remains open.
This conflicts with the existing DP-25 acceptance requirement that the summary
and history subscribe to real state changes:

- [DP-25 terminal objective/night-log requirement](master-deep-play-feedback-2026-09-14.md#dp-25--p1--terminal-layout-and-real-objectivenight-log--uigameplay--m)

### 3. Two different clocks are displayed without explaining their relationship

The game deliberately keeps these concepts separate:

- `timeOfDay`: a 150-second visual lighting/sky loop initialized in the
  [`ThreeGame` constructor](../../src/threeGame.js#L1860) and advanced by
  [`ThreeGame.updateDayNightCycle()`](../../src/threeGame.js#L23928).
- `dayState.day`: the persistent campaign day owned by
  [`dayCycle.js`](../../src/dayCycle.js), which advances only when the player
  explicitly sleeps.

The terminal currently presents both without explaining that daylight cycling
does **not** advance the campaign day. `CYCLE PHASE` usually reads `EXPEDITION`
because it is displaying the campaign rest phase, not the day/night phase.

The intended relationship is documented here:

- [Campaign day-cycle plan: the clocks are connected at sleep](campaign-day-cycle-camps-hives-and-rest-hub-2026-09-22.md#51-the-clocks-are-now-connected)
- [Release notes: campaign day-cycle behavior](../releases/v2.4.9-beta.md#1-the-campaign-day-cycle-playable)

### 4. The terminal provides no route to the action that advances a day

Campaign day advances through the bunker cot or a safe camp bed:

- [`ThreeGame.getBunkerRestPoint()`](../../src/threeGame.js#L17867)
- [`ThreeGame.canRestAt()`](../../src/threeGame.js#L17908)
- [`ThreeGame.beginCampRest()`](../../src/threeGame.js#L17941)
- [`ThreeGame.finishCampRest()`](../../src/threeGame.js#L17995)

The terminal has no status explaining whether rest is available, blocked by an
active contract, unavailable in co-op, or accessible at a cot/camp. As a result,
the displayed campaign day resembles an inert counter.

### 5. Existing UI surfaces do not communicate the state consistently

Current presentation surfaces:

- [Terminal header clock markup](../../index.html#L1802)
- [Objective / Night Log summary markup](../../index.html#L1977)
- [Expedition HUD day/cycle markup](../../index.html#L1251)
- [`updateCampaignCycleIndicator()` HUD adapter](../../main.js#L13183)
- [Terminal clock styling](../../style.css#L13033)
- [Terminal objective-summary styling](../../style.css#L23165)

The HUD receives `time-of-day-changed` events, while the terminal reads state
directly only when rendered. These surfaces can therefore disagree or appear to
have different activation rules.

## Intended behavior

The terminal must clearly distinguish:

1. **Campaign day** — persistent and advanced only by voluntary sleep.
2. **Campaign state** — expedition, sleeping or morning/rest phase.
3. **Local solar time** — the current 24-hour lighting-loop time.
4. **Local light** — daylight or night operations.
5. **Next light transition** — dawn/dusk countdown.
6. **Advance-day availability** — where and why the player can or cannot rest.

Opening the terminal should pause combat and world simulation. The terminal UI
must continue refreshing on a small, bounded cadence and explicitly say that
the local-light clock is held while the terminal is active. A paused value must
look intentionally paused, not broken.

## Implementation TODO

### A. Restore a reachable terminal-only refresh

- [x] Call a lightweight terminal refresh before the blocking-overlay return in
  `ThreeGame.render()`.
- [x] Gate it on `#console-terminal-modal` being visible; do no terminal DOM work
  during ordinary gameplay.
- [x] Continue refreshing `SURVIVED` while the modal is open.
- [x] Do not resume enemy AI, hazards, O₂ drain, lighting simulation, combat or
  other world systems behind the terminal.
- [x] Display `CYCLE HOLD — TERMINAL ACTIVE` when the local-light clock is paused.

Primary code:

- [`ThreeGame.render()` blocking branch](../../src/threeGame.js#L9648)
- [`ThreeGame.updateTerminalClockTick()`](../../src/threeGame.js#L23787)
- [`ThreeGame.updateTerminalClock()`](../../src/threeGame.js#L23797)

### B. Split lightweight status updates from journal reconstruction

- [x] Extract a terminal cycle-status renderer for day, campaign state, local
  time, light phase and transition countdown.
- [x] Update text/progress values at most twice per second while open.
- [x] Rebuild journal rows only when a bounded state signature changes; do not
  replace the list every animation frame.
- [x] Include mission status, active base goal, resolved deadlines and expired
  deadlines in the journal signature.
- [x] Reset the terminal-only signature when a new expedition starts.

Primary code:

- [`ThreeGame.renderTerminalObjectiveJournal()`](../../src/threeGame.js#L12941)
- [`ThreeGame.renderConsoleBanking()`](../../src/threeGame.js#L13014)
- [`ThreeGame.openConsoleModal()`](../../src/threeGame.js#L13475)

### C. Make the UI explain how campaign days work

- [x] Rename or clarify `CYCLE PHASE` as `CAMPAIGN STATE` so `EXPEDITION` is not
  mistaken for a day/night phase.
- [x] Add a compact status to the Objective / Night Log tab, for example
  `DAY 3 · 18:42 · NIGHT`.
- [x] Add an `ADVANCE DAY` status card with one of these truthful states:
  - `AVAILABLE AT BUNKER COT`
  - `AVAILABLE AT SAFE CAMP`
  - `BLOCKED — ACTIVE CONTRACT`
  - `BLOCKED — SITE UNSAFE`
  - `CO-OP VISITOR — LOCAL CAMPAIGN CYCLE LOCKED`
- [x] Add a visible full-cycle progress track and accessible text equivalent.
- [x] Keep all new strings in the locale catalogs; do not add English-only UI.

Primary code:

- [Terminal markup](../../index.html#L1797)
- [English terminal strings](../../src/locales/en.json#L785)
- [Terminal styles](../../style.css#L13033)
- [Objective summary styles](../../style.css#L23165)

### D. Keep the HUD and terminal on one presentation contract

- [x] Introduce one formatter/view-model for campaign day, local time, light
  phase, transition countdown and difficulty.
- [x] Use it from both the HUD event payload and terminal renderer.
- [x] Keep `timeOfDay` and `dayState.day` separate in storage and simulation;
  presentation unification must not merge their gameplay meanings.
- [x] Ensure sleeping pins local time to morning and immediately refreshes both
  HUD and terminal state.

Primary code:

- [`ThreeGame.persistDayCycleState()`](../../src/threeGame.js#L17759)
- [`ThreeGame.setTimeOfDayToMorning()`](../../src/threeGame.js#L17928)
- [`ThreeGame.updateDayNightCycle()`](../../src/threeGame.js#L23928)
- [`updateCampaignCycleIndicator()`](../../main.js#L13183)

## Decision required

Should the terminal itself offer an `END DAY / SLEEP` button?

- **Recommended:** no. Preserve the authored physical cot/camp interaction and
  make the terminal clearly state where rest is available and why it may be
  blocked.
- Alternative: allow sleep directly from the bunker terminal, routed through
  `canRestAt()` and `beginCampRest()` so warnings, deadlines, fatigue and the
  overnight simulation cannot be bypassed.

Whichever option is chosen, the terminal must never mutate `dayState.day`
directly.

## Verification TODO

### Unit tests

- [x] Extend [`threeGame.terminalObjectiveJournal.test.js`](../../src/threeGame.terminalObjectiveJournal.test.js)
  to cover live status refresh, campaign/local-clock labels, transition
  countdown and no duplicate journal rows.
- [x] Extend [`threeGame.dayCycleRuntime.test.js`](../../src/threeGame.dayCycleRuntime.test.js)
  to verify the terminal presentation never advances campaign day.
- [x] Add coverage proving the terminal-only tick runs from the blocking-overlay
  branch without running world simulation.
- [x] Verify co-op shows the visitor-cycle explanation and cannot invoke rest.

### Browser QA

- [x] Open Objective / Night Log and verify all fields have real values rather
  than initial `--:--` placeholders.
- [x] Leave the terminal open for at least five seconds: `SURVIVED` changes,
  while local time is explicitly marked as held.
- [x] Close the terminal: local time resumes without jumping.
- [x] Sleep at the bunker cot: campaign day increments once, morning time is
  visible immediately, and journal/deadline rows update.
- [x] Repeat at a safe camp and with an active contract blocking rest.
- [x] Verify 1280×800 PC, 1280×800 Steam Deck/Gamescope and co-op visitor UI.
- [x] Confirm the Objective / Night Log tab remains bounded without accidental
  full-terminal scrolling.

Existing browser coverage to extend:

- [`tests/e2e/bunker-tree.spec.js`](../../tests/e2e/bunker-tree.spec.js)

## Acceptance criteria

- The terminal cannot show stale campaign-day, mission, deadline or light-state
  information while open.
- Every clock communicates whether it is running or intentionally paused.
- Players can tell exactly how to advance the campaign day and why rest may be
  unavailable.
- Campaign day advances exactly once per confirmed sleep and never from merely
  opening or viewing the terminal.
- Co-op never silently advances either player's local campaign.
- Terminal refresh adds no unbounded timers, listeners, history or per-frame DOM
  reconstruction.
- The production build, media audit, focused day-cycle/terminal tests and full
  Vitest suite pass.
