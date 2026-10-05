# Records & Leaderboards popup — plan and scope

**Date:** 2026-10-05 · **Branch:** `dev/sprint-49` · **Status:** plan, nothing built
**Ask:** a popup on the home page with all-time stats, both the player's own
and the leaderboards.

## Decision

Add one **RECORDS** modal, opened from the operator menu (homebase) and
optionally the title screen, with two tabs:

1. **SERVICE RECORD** — the player's all-time stats and personal bests, read
   from local save data. Works offline, on the web build and on Steam.
2. **LEADERBOARDS** — the five Steam boards (Global / Friends / Around me),
   built on the code that already fills the Game Over leaderboard.

Most of the data already exists. Phase 1 needs no new tracking and no backend
change. New stats (per-class records, total play time, personal bests per
board) come in Phase 2.

## What already exists

| Piece | Where | What it gives |
| --- | --- | --- |
| Lifetime stats | `src/achievements.js` `stats` (saved, Steam Cloud) | runs, victories, deaths, kills, distance, most kills in a run, longest run, deepest tier, lore drops, shells, endings, classes completed, hive bond, camps in a run, Queen defeated |
| Campaign ledger | `src/campaignLedger.js` (`hb_campaign_ledger_v1`) | runs, deaths, victories, deepest tier, campaign start date (overlaps the above) |
| Steam stats | `src/steamStats.js` | the same lifetime numbers pushed to Steam |
| Leaderboard fetch + render | `src/leaderboardUi.js` `renderGameOverLeaderboard` | top 10, your row when outside it, mock/offline states, score formatting |
| Leaderboard read API | `electron/preload.cjs` `getSteamLeaderboard(board, Global\|Friends\|AroundUser, n)` → backend `GET /steam/leaderboards/:board` | Valve entries with persona names; **Global needs no auth** |
| Boards | `server/leaderboardScoring.js` | `best_run_score`, `daily_ops_score`, `fastest_extraction_ms` (ascending), `deepest_depth_score`, `survival_time_seconds` |
| Stat surfaces today | operator menu CAREER TELEMETRY chips; Tactical Net CAREER LEDGER; Game Over leaderboard | three partial views of the same numbers |

Gaps: no screen shows all of it; nothing outside Game Over shows a board;
the web build shows no boards at all (it only checks `window.electronAPI`); no
local record of personal bests per board; no per-class stats; no total play
time.

## Player experience

**Entry points**
- Operator menu: a **RECORDS** button in the command grid (beside ARCHIVE /
  CODEX), with "BEST 1,550 · #12" as its status line once a rank is known.
- The CAREER TELEMETRY panel becomes a button that opens the same modal.
- Title screen: optional, open question 1.
- Game Over keeps its own top-10 panel; a "VIEW ALL RECORDS" link opens the
  modal on the board that run counted for.

**Layout** (1280×800 stage, inside the 48 px menu safe frame)

```
┌ RECORDS // SERVICE RECORD ───────────────────────────── ✕ ┐
│ [ SERVICE RECORD ]  [ LEADERBOARDS ]           (LB/RB, Q/E) │
├──────────────────────────────────────────────────────────────┤
│ SERVICE RECORD                                               │
│  CAREER            RUNS 42 · VICTORIES 3 · DEATHS 39         │
│                    TIME IN THE CRUST 6h 12m (Phase 2)        │
│  COMBAT            HOSTILES 1,204 · BEST RUN 61 · QUEEN ✓    │
│  EXPLORATION       DEEPEST TIER 3 · DISTANCE 18,420u         │
│                    LORE 17/42 · CAMPS IN A RUN 4             │
│  PERSONAL BESTS    BEST RUN 1,550 (#12) · LONGEST 18m 40s    │
│                    DEEPEST 3-450m · FASTEST EXTRACT 4m 02s   │
│  BY CLASS (Ph. 2)  SCOUT · TANK · ENGINEER: runs, best, wins │
│  ENDINGS           4 / 10 · CLASSES COMPLETED 2 / 3          │
├──────────────────────────────────────────────────────────────┤
│ LEADERBOARDS                                                 │
│  board: BEST RUN · SURVIVAL · DEEPEST · FASTEST · DAILY OPS  │
│  scope: GLOBAL · FRIENDS · AROUND ME                         │
│  #1  Operator Aegis      1,550                               │
│  …   (top 10, your row pinned and highlighted)               │
│  status: LIVE / DEV MOCK / OFFLINE — SCORES BANKED LOCALLY   │
└──────────────────────────────────────────────────────────────┘
```

**Controls:** tabs on LB/RB and Q/E; board chips and scope chips on D-pad
left/right; rows focusable so a pad can scroll the list; B / Esc closes and
returns focus to the RECORDS button. This uses the existing tab contract
(`role="tab"`, `aria-selected`) and the one-step tab fix from `061d80a4`.

## Data model

- **Service record** = `achievementEngine.getState().stats`, plus the
  campaign start date from `campaignLedger`. A pure
  `buildServiceRecord(stats, ledger, personalBests)` in
  `src/serviceRecord.js` returns display rows (label, value, formatted).
  Unit-tested; no DOM.
- **Personal bests (Phase 2)** — new `hb_personal_bests_v1`: per board, the
  best score, the date, the class. Written where the run payload is built for
  submission (the same score the server computes in `leaderboardScoring`), so
  offline and web runs count too. Steam Cloud-synced like achievements.
- **Per-class and play time (Phase 2)** — extend `stats` with
  `byClass: { SCOUT: { runs, victories, bestScore, deepestTier } … }` and
  `totalRunMs`. Bump `ACHIEVEMENT_SCHEMA_VERSION` with a migration (existing
  saves start at 0) and add the two numbers to `steamStats.js` only if they
  should also exist as Steam stats (open question 4).
- **Leaderboards** — split `renderGameOverLeaderboard` into a fetch
  (`fetchLeaderboard(board, scope, count)` → `{ status, entries, self }`) and
  two renderers (Game Over panel, Records modal) so both use one code path.
  On the web build, Global reads go to the backend's public
  `GET /steam/leaderboards/:board` directly (Phase 3; needs the backend URL and
  CORS for the web origin). Friends / Around me stay Steam-only.

## Phases

| Phase | Scope | Size | Accept |
| --- | --- | --- | --- |
| **1. Popup + service record + boards (Steam build)** | Modal markup and styles; RECORDS button on the operator menu; `serviceRecord.js` + tests; leaderboard fetch/render split; five boards × three scopes in the modal; offline / mock / live states; focus root registered in `MENU_FOCUS_ROOT_IDS`; strings in 7 locales | 2–3 days | Opens from the menu with mouse, keyboard and pad; every number matches the save; Game Over panel unchanged (its spec passes); `ui-layout-contract` and the UI surface audit clean at 1280×800 / 720 / 1080; i18n audit not worse |
| **2. New tracking** | Personal bests per board (local, cloud-synced); per-class records; total time in the crust; schema migration | 1–2 days | Unit tests for each counter at run end; migration keeps old saves; records show after one offline run |
| **3. Web / demo boards** | Global boards on the web build from the public backend route; rate-limit and CORS checked; clear "GLOBAL ONLY ON WEB" note | ½–1 day | LAN demo shows live Global boards; Friends / Around me hidden on web |
| **4. Polish (optional)** | Rank badge on the RECORDS button; "new personal best" toast at Game Over; share card; daily-ops history | 1 day | Owner call |

## Constraints this must respect

- Deck-first stage: authored at 1280×800, 18 px body text floor, 44 px
  primary targets, corner slot (CHAT · ⚙) left clear.
- New surfaces go into `MENU_FOCUS_ROOT_IDS` and the menu map in
  `docs/design/ui-surfaces-menu-map-and-controller-navigation.md`.
- No new keys in `style.css`'s override pile: the modal gets its own stylesheet
  (`src/styles/records.css`), per the UI overhaul plan's Phase 6.
- Leaderboard schema is pinned by `server/runPayloadContract.test.js`; Phase
  1–3 read only, so no schema bump.
- Backend changes (Phase 3 CORS) deploy only through the clean-worktree
  candidate flow, and you run the deploy.

## Tests

- Unit: `serviceRecord.test.js` (formatting, empty save, huge numbers,
  missing fields), leaderboard fetch split (`leaderboardUi.test.js`: mock,
  offline, self row outside the top 10, ascending board formatting),
  Phase 2 counters and migration.
- E2E: `records-modal.spec.js` — opens from the menu, tab and chip
  navigation by keyboard and pad, close returns focus, offline state on the
  web build; added to `menu-reachability` and the UI surface audit walk.

## Open questions

1. Entry points: operator menu only, or also the title screen?
2. Should the CAREER TELEMETRY chips on the operator menu and the CAREER
   LEDGER on Tactical Net stay, or shrink to a summary line that opens
   RECORDS?
3. Which board is the default tab: BEST RUN, or the board of the last run?
4. Should per-class records and total play time also become Steam stats
   (needs a Steamworks stats update), or stay local?
5. For the LAN demo, is Global-only on the web build enough (Phase 3), or
   is a mock board acceptable?
