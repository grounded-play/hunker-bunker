# Records & Leaderboards — plan and scope

**Date:** 2026-10-05 · **Branch:** `dev/sprint-49` · **Status:** plan, nothing built
**Ask:** a home-page popup with all-time stats, the player's own and the
leaderboards; find the spot where it best belongs.

## Decision: a RECORDS tab in the Archive

Records go into the **Archive** (`#archive-modal`) as a fifth tab, **RECORDS**,
after ACHIEVEMENTS. The tab has two views: **SERVICE RECORD** (your all-time
stats and personal bests) and **LEADERBOARDS** (the five Steam boards). Other
screens link to it instead of growing their own stat panels.

### Why the Archive and not the Foundry

| Candidate | What it is today | Fit |
| --- | --- | --- |
| **Archive** | LORE LOGS · DOSSIER · STORY ENDINGS · ACHIEVEMENTS: the player's history | **Best.** Its Achievements tab is built from the same lifetime-stats engine (`src/achievements.js`). It has tabs, panels, controller focus and the operator-menu button already, so Records needs no new modal, focus root or menu button |
| Foundry hub | STASH · LOADOUT · FABRICATE · TRADE-UP, with a TECH/COIN/MED/SHELLS strip in the header | Poor. It is the item economy; stats would sit under currency counters and mix "what I own" with "how I've done". The hub is also class-scoped (`data-hub-class`), while records are mostly account-wide |
| Tactical Net | Deployment console: mode cards, CAREER LEDGER, Daily Ops "leaderboard" chip | A shortcut in, not a home: it is the screen right before a run |
| Its own modal | — | Another menu button and focus root on an already full command grid |

### Shortcuts that open Archive → RECORDS

- Operator menu: the CAREER TELEMETRY panel opens it (SERVICE RECORD).
- Tactical Net: the CAREER LEDGER panel opens it (SERVICE RECORD); the DAILY
  LEADERBOARD chip opens it on LEADERBOARDS → DAILY OPS.
- Game Over: a "VIEW ALL RECORDS" link under the top-10 panel opens it on the
  board that run counted for.
- Title screen: optional (open question 1).

## Status (2026-10-05)

| Steps | State |
| --- | --- |
| 1 Archive tab skip bug | Done (`64b297fa`): one handler for left/right on every tab bar |
| 2 Data-driven Archive tabs | Done |
| 3–5 Shared leaderboard fetch/renderer, score formats, service-record builder | Done (`6bb4c026`) |
| 6–13 Strings (7 locales), tab, styles (`src/styles/records.css`), service record, boards, scopes, 60 s cache | Done |
| 14 E2E | Done: `tests/e2e/records-tab.spec.js` |
| 15–18 Shortcuts | Done: `openArchiveModal()`, operator menu, Tactical Net, Game Over. The DAILY LEADERBOARD chip is not a shortcut: it sits inside the Daily Ops mode button, and a button cannot hold a button |
| 19–23 New tracking (save-format bump) | Not started |
| 24–25 Web Global boards (backend CORS deploy) | Not started |
| 26–28 Polish | Not started |

Calls made on the open questions: no title-screen entry; default board BEST
RUN (Game Over opens the run's own board); per-class stats stay local when
built; web build shows an honest offline state; Tactical Net's ledger stays.

## What already exists

| Piece | Where | Gives |
| --- | --- | --- |
| Lifetime stats | `src/achievements.js` `stats` (saved, Steam Cloud) | runs, victories, deaths, kills, distance, most kills in a run, longest run, deepest tier, lore drops, shells, endings, classes completed, hive bond, camps in a run, Queen defeated |
| Campaign ledger | `src/campaignLedger.js` | campaign start date (its counts duplicate the above) |
| Leaderboard fetch + render | `src/leaderboardUi.js` `renderGameOverLeaderboard` | top 10, your row pinned, mock / offline states, score formatting |
| Leaderboard read API | `electron/preload.cjs` `getSteamLeaderboard(board, Global\|Friends\|AroundUser, n)` → backend `GET /steam/leaderboards/:board` | Valve rows with names; Global needs no auth |
| Boards | `server/leaderboardScoring.js` | `best_run_score`, `daily_ops_score`, `fastest_extraction_ms` (ascending), `deepest_depth_score`, `survival_time_seconds` |
| Archive tabs | `index.html` `#archive-modal`, `main.js` `setArchiveTab` | tab buttons, panels, per-tab renderers |

Gaps: no single view of all stats; boards appear only after a death; the web
build shows no boards; no local personal best per board; no per-class stats or
total play time.

## Layout of the RECORDS tab

```
ARCHIVE   [LORE LOGS] [DOSSIER] [STORY ENDINGS] [ACHIEVEMENTS] [RECORDS]
┌──────────────────────────────────────────────────────────────────┐
│ ( SERVICE RECORD | LEADERBOARDS )                    view switch │
├──────────────────────────────────────────────────────────────────┤
│ SERVICE RECORD                                                   │
│  CAREER        RUNS 42 · VICTORIES 3 · DEATHS 39 · SINCE 2026-07 │
│  COMBAT        HOSTILES 1,204 · MOST IN A RUN 61 · QUEEN ✓       │
│  EXPLORATION   DEEPEST TIER 3 · DISTANCE 18,420u · CAMPS IN A RUN 4 │
│  STORY         LORE 17/42 · ENDINGS 4/10 · CLASSES DONE 2/3      │
│  PERSONAL BESTS (step 15+)  BEST RUN 1,550 #12 · LONGEST 18m 40s │
│  BY CLASS (step 18+)        SCOUT · TANK · ENGINEER              │
├──────────────────────────────────────────────────────────────────┤
│ LEADERBOARDS                                                     │
│  [BEST RUN] [SURVIVAL] [DEEPEST] [FASTEST] [DAILY OPS]           │
│  [GLOBAL] [FRIENDS] [AROUND ME]                                  │
│   #1 Operator Aegis 1,550 … top 10, your row pinned             │
│  LIVE / DEV MOCK / OFFLINE — SCORES BANKED LOCALLY               │
└──────────────────────────────────────────────────────────────────┘
```

Controls: Archive tabs on LB/RB and Q/E (already wired); the view switch,
board chips and scope chips on D-pad left/right; rows focusable so the pad
scrolls; B / Esc closes and returns focus to whatever opened it.

## Steps

Each step is one commit with its own test, small enough to review alone.
Sizes are rough. Steps 1–14 need no new tracking and no backend change.

### A. Groundwork

1. **Check the Archive tabs for the Settings skip bug.** The Archive tab
   buttons have their own ArrowLeft/Right handler, like the Settings tabs
   did before `061d80a4`. Add an e2e step (arrows and A/D walk the four
   tabs one at a time); if it skips, apply the same fix (the capture-phase
   directional handler owns left/right on a tab; the tab handler checks
   `defaultPrevented`). *~1 h.*
2. **Make the Archive tab list data-driven.** `setArchiveTab` and the tab
   keydown handler each hard-code `['lore','dossier','endings','achievements']`.
   Read the list from the DOM (`[data-archive-tab]`) so a fifth tab needs no
   code edits. Unit-free; covered by step 1's e2e. *~30 min.*
3. **Leaderboard fetch/render split.** Pull a pure
   `fetchLeaderboard({ board, scope, count, api })` out of
   `renderGameOverLeaderboard` returning `{ state: live|mock|offline, entries,
   selfSteamId, statusKey }`. The Game Over renderer calls it; behaviour is
   unchanged. Tests in `leaderboardUi.test.js`: live, mock, offline, no
   identity, your row outside the top 10, ascending board. *~2 h.*
4. **Score formatting for all boards.** `formatLeaderboardScore` has no case
   for `fastest_extraction_ms` (milliseconds) or `daily_ops_score`. Add
   them, with tests. *~30 min.*

### B. Service record (existing data only)

5. **`src/serviceRecord.js`.** Pure `buildServiceRecord({ stats, ledger,
   locale })` → ordered sections of `{ key, labelKey, value, display }`.
   Handles a fresh save (zeros, no "NaN"), large numbers (thousands
   separators per locale), `maxRunMs` → "18m 40s", depth tier → its name,
   endings / classes as "n / total". Tests in `serviceRecord.test.js`.
   *~2 h.*
6. **Strings.** Section and label keys under `ui.records.*` in all 7 locales;
   reuse existing labels where they exist (`ui.multiplayer.runs`, …). Run
   `npm run i18n:audit`; it must not get worse. *~1 h.*
7. **Tab markup.** Add `#archive-tab-records` (`role="tab"`,
   `aria-controls`) and `#archive-panel-records` with the view switch and an
   empty `#records-service` / `#records-boards`. No behaviour yet. *~30 min.*
8. **Service record renderer.** `renderArchiveRecords()` fills
   `#records-service` from `buildServiceRecord`; called from `setArchiveTab`
   when RECORDS opens and whenever achievement state changes while it is
   open. *~1 h.*
9. **Styles.** New `src/styles/records.css` (not `style.css`): two-column
   label/value rows, 18 px text floor, sections as cards matching
   `archive-console-card`. *~1–2 h.*
10. **Layout and reach checks.** Add RECORDS to `ui-surface-audit` and
    `ui-layout-contract`; verify at 1280×800, 1280×720, 1920×1080: no clip,
    no overlap, no spill, every value readable. *~1 h.*

### C. Leaderboards view

11. **Board and scope chips.** Five board chips, three scope chips
    (`role="tab"` inside the view, or `aria-pressed` buttons); D-pad
    left/right moves within a chip row, up/down between rows and into the
    list. *~1–2 h.*
12. **Leaderboard list renderer.** Uses step 3's fetch; top 10 with your row
    pinned; state line (LIVE / DEV MOCK / OFFLINE); a loading state; one
    request per board+scope with a short cache (60 s) so chip-hopping does
    not hammer the backend. *~2 h.*
13. **Scope rules.** FRIENDS and AROUND ME need a Steam session: hide them on
    the web build and show "SIGN IN THROUGH STEAM" when the identity call
    fails. *~1 h.*
14. **E2E `records-tab.spec.js`.** Open Archive → RECORDS by mouse, keyboard
    and pad; switch views; walk boards and scopes; the offline state on the
    web build; Esc returns focus. Add to `menu-reachability`. *~2 h.*

### D. Shortcuts in

15. **`openArchiveModal({ tab, view, board })`.** One entry point other
    screens call. *~30 min.*
16. **Operator menu.** The CAREER TELEMETRY panel becomes a button (keeps its
    chips, gains a "RECORDS ▸" hint) that opens RECORDS. *~1 h.*
17. **Tactical Net.** CAREER LEDGER opens RECORDS; the DAILY LEADERBOARD chip
    opens LEADERBOARDS → DAILY OPS. *~1 h.*
18. **Game Over.** "VIEW ALL RECORDS" under the top-10 panel opens the board
    that run counted for. Existing `game-over-leaderboard.spec.js` still
    passes. *~1 h.*

### E. New tracking (needs a save-format bump)

19. **Personal bests store.** `hb_personal_bests_v1`: per board, best score,
    date and class, written where the run payload is built for submission
    (the same score `leaderboardScoring` computes), so offline and web runs
    count. Cloud-synced like achievements. Unit tests. *~2 h.*
20. **Show personal bests** in SERVICE RECORD, with the Steam rank when
    AROUND ME returns one. *~1 h.*
21. **Per-class records and total play time.** Extend `stats` with
    `byClass: { SCOUT|TANK|ENGINEER: { runs, victories, bestScore,
    deepestTier } }` and `totalRunMs`; bump `ACHIEVEMENT_SCHEMA_VERSION` with
    a migration (old saves start at 0). Tests for each counter at run end
    and for the migration. *~2–3 h.*
22. **Show BY CLASS and TIME IN THE CRUST.** *~1 h.*
23. **Steam stats (optional).** If wanted, add `total_run_seconds` and
    per-class runs to `steamStats.js` and the Steamworks stat list. *~1 h + a
    Steamworks change you make.*

### F. Web / demo build

24. **Global boards on the web build.** When `window.electronAPI` is
    missing, `fetchLeaderboard` reads `GET /steam/leaderboards/:board` from
    the backend URL for Global only. *~1 h.*
25. **Backend CORS for the web origin** (allow-list, not `*`), with a test;
    deployed through the clean-worktree candidate flow, and you run the
    deploy. *~1 h + deploy.*

### G. Polish (optional)

26. Rank badge on the operator menu's ARCHIVE button ("#12").
27. "NEW PERSONAL BEST" line on Game Over (after step 19).
28. Retire the duplicate CAREER LEDGER numbers on Tactical Net to one
    summary line once step 17 links to RECORDS.

## Order and size

| Block | Steps | Size | Ships alone? |
| --- | --- | --- | --- |
| A Groundwork | 1–4 | ~½ day | yes (fixes and refactor) |
| B Service record | 5–10 | ~1 day | yes: RECORDS tab with your stats |
| C Leaderboards | 11–14 | ~1 day | yes: boards on Steam builds |
| D Shortcuts | 15–18 | ~½ day | yes |
| E New tracking | 19–23 | ~1–1½ days | yes |
| F Web boards | 24–25 | ~½ day + deploy | yes |
| G Polish | 26–28 | ~½ day | optional |

A + B + C (about 2½ days) is the first useful release: everything already
tracked, plus live boards on Steam.

## Constraints

- Deck-first stage: 1280×800, 18 px body floor, 44 px primary targets, corner
  slot (CHAT · ⚙) clear; checked by `ui-layout-contract.spec.js`.
- Keep every existing Archive id and `data-i18n` key; update the menu map in
  `docs/design/ui-surfaces-menu-map-and-controller-navigation.md` §3 and §4.6.
- Read-only on leaderboards until step 19; no run-payload schema change
  (`server/runPayloadContract.test.js` stays as is).
- Each step bumps nothing; the PR that ships a block bumps the patch version.

## Open questions

1. Also link RECORDS from the title screen, or only from the operator menu,
   Tactical Net and Game Over?
2. Default board: BEST RUN, or the board of the last run?
3. Per-class records and play time: local only, or also Steam stats
   (step 23, needs a Steamworks change)?
4. For the LAN demo: Global boards on the web build (steps 24–25, backend
   deploy), or a clearly labelled mock board?
5. Step 28: shrink Tactical Net's CAREER LEDGER to a summary line once
   RECORDS exists?
