# Sprint 19 Wave 6 — Punch List & Objective Framework Lane Split (Claude / Codex / Gemini)

Date: 2026-07-16.

Follows the wave 4/5 convention. Scoped to **the gameplay/UX punch list's
remaining items plus what `docs/things-we-missed.md` calls out as the
highest-leverage planning gaps** — not the Steam-connection track (that's
`sprint-19-wave5-steam-connection-lane-split.md`, still separately open).
See `docs/steam-docs-master-index.md` for the full doc map.

## What landed since the punch list was written (verify against current
code, not just this list — this branch has multiple agents co-editing it
live and several items below closed out from under the punch list before
this doc was even finished)

- Desktop compass (`#desktop-compass`, `index.html`) — done.
- Black-box guard gate (`interactWithBlackBox` blocks while
  `corruptedOperator` is alive, `src/threeGame.js`) — done.
- Signal-flare fog visibility (`camp.js` signal material `fog: false`) — done.
- Skill-tree false-click affordance (`.skill-node-card` base
  `cursor: default`, only `--available` gets `pointer`, `style.css`) — done.
- Full-screen combat-alert overlay replaced with a corner toast
  (`showTacticalNotificationToast` via `.hud-notification-stack`,
  `main.js`) — done.
- Lore double-counting bug (`lore-terminal-read` now carries
  `skipSave: true` for physical drops, checked at `main.js:3726`) — done.
- Maze `floorTarget` lowered 0.80 → 0.76 (`src/landforms.js`) — partial;
  the fill/widen passes are still shape-blind, see Claude lane below.
- Boss HP retuned down (`boss_cybersnail` 20 → 15,
  `src/data/enemies.js`) — done, but **broke its own test** (see Tier 0).
- Camp Bonding Quests (six named quests, HUD tracker, six reward hooks)
  shipped end to end this session — `src/threeGame.js`,
  `src/threeGame.campQuests.test.js`, `tests/e2e/camp-quests.spec.js`.
  This is the reason a general objective framework is now the natural next
  step (see Claude lane, item 4) rather than a cold start.

## Still genuinely open (confirmed against current code this pass)

- Hive/camp distance bands still overlap (camps 70-120u, hives 45-90u,
  hives still fanned on the camp bisector angles) — "hives too close" is
  unfixed.
- Maze fill/widen passes still don't know about the carved plaza
  silhouette — shape-aware fill is not done, only the numeric target moved.
- No lore compass/radar branch in `getRadarCompassState()`.
- No skill-tree keyboard/controller spatial navigation, no "next unlock"
  path preview.
- Ammo economy vs. boss HP: only `cybersnail` was retuned; `cryosnail`
  (40hp) and `sporesnail` (75hp) still cost more shots than a fresh
  24-round starting pool.
- `server/steamStore.js` has no refund/reversal handling.
- Real DB migration (JSON → SQLite) hasn't happened; `HB_DB_BACKEND=sqlite`
  scaffolding exists but JSON stays the default.
- General sub-objective/checklist framework doesn't exist — every
  objective HUD element (`loop-step-hud`, `mission-progress-hud`,
  `camp-quest-hud`) is still its own single-line, bespoke component.

## Lane split

Same rationale as prior waves — minimize file overlap, keep primary files
distinct per lane. **Always `git status`/`git diff` immediately before
editing a file another lane claims below** — this branch is being edited
concurrently right now.

### Claude lane (this session) — world-gen numerics + objective framework

**Status 2026-07-17:** items 1-5 landed on `dev/sprint-20` (Tier-0 test
fix was already done at merge time; hive/camp bands separated with
placement tests; plaza-halo shape shielding through soften/fill/widen/
trim with a regression test; lore compass branch + session read-tracking;
skill-tree keyboard nav with spatial-arrow unit tests and a real-browser
e2e — which also surfaced and fixed a genuine deadlock in
`startRunAndSkipIntro`, see `tests/e2e/helpers.js`). Item 6 now has its
design pass: `docs/objective-system-spec.md` — implementation not
started. Also fixed along the way: Steam-drop toast CSS identity (§1.4)
and two stale punch-list findings corrected in place (§1.3 priority
inversion, §3a lore-prompt placement — both already resolved by earlier
work).

1. **Tier 0, do first**: fix `src/data/enemies.test.js` — it asserts
   `boss_cybersnail.maxHp === 20`, current code has `15`
   (`src/data/enemies.js:14`). Confirm 15 is the intended final value
   (not a half-finished tune) before updating the assertion.
2. Hive/camp distance separation: widen the gap between
   `chooseCampPosition` (`src/threeGame.js:7537+`, 70-120u) and
   `chooseHiveSitePosition` (`src/threeGame.js:7174+`, 45-90u) — push
   hive median down and/or camp median up, and/or move hives off the
   camp-bisector angles so they stop sitting on every path outward.
3. Maze shape-aware fill: make `openMazeTerrain`'s fill/widen passes
   (`src/landforms.js:126+`) respect the carved diamond/cross/ellipse
   plaza silhouette instead of blindly opening cells up to `floorTarget`.
4. Lore compass branch: add a priority branch to `getRadarCompassState()`
   (`src/threeGame.js:9150+`) for the nearest undiscovered lore
   terminal/drop, inserted below the story-critical branches and the
   camp-quest branch added this session, above the general Act-1 side
   signal.
5. Skill tree keyboard nav: real `tabindex`/arrow-key navigation matching
   the visual row/column grid (`src/skillTree.js`), plus a highlighted
   "path to next unlock" on the connector graph.
6. **Bigger item, natural next step after Camp Bonding Quests**: design
   and build the general sub-objective/checklist framework
   `docs/things-we-missed.md` and the punch list both call out — one data
   shape for parent objective + child steps (reuse the `questFlags`-style
   flag-dict pattern), one real multi-line HUD checklist component, and a
   single priority/compass contract that mission objectives, black box,
   lore, and camp quests all route through instead of each owning its own
   event names. This should probably get its own design pass
   (`docs/objective-system-spec.md`) before code, given the size.
- Primary files: `src/threeGame.js`, `src/landforms.js`,
  `src/skillTree.js`, `style.css`, `src/data/enemies.test.js`.

### Codex lane — backend/economy (continues Wave 5)

1. Refund/reversal handling in `server/steamStore.js` — still absent,
   carried over from Wave 5.
2. Real DB migration: JSON → SQLite-on-volume as the first step (the
   scaffolding in `server/db.js` already supports
   `HB_DB_BACKEND=sqlite`/`HB_DB_SQLITE_PATH`; this is about making it the
   real path, not just an opt-in flag, plus updating
   `docs/steam-backend-admin-runbook.md` once the default changes).
3. Ammo economy vs. boss HP: retune `cryosnail`/`sporesnail` HP
   (`src/data/enemies.js`) and/or the starting ammo pool/class reserve
   caps (`src/threeGame.js`, `WEAPON_CLIP_SIZE` and reserve constants) so
   a base-kit player can actually sustain a boss fight — grouped here
   rather than Claude lane since it's numeric-data-driven, not
   world-gen/UI code.
4. Verify the Item Store overlay link is actually gated on
   `marketEligibility === 'eligible'` (`main.js:8696+`), not just showing
   the read-only badge — confirm the link-rendering branch, not just the
   state variable's existence.
- Primary files: `server/steamStore.js`, `server/db.js`,
  `src/data/enemies.js`, `main.js` (market-eligibility gate only — avoid
  the HUD/objective-framework sections Claude lane may be touching).

### Gemini lane — design docs + Camp-3 climax

1. **First-hour acceptance plan** (`docs/first-hour-acceptance-plan.md`):
   5/15/60-minute pass/fail scripts per
   `docs/things-we-missed.md`'s #1 highest-leverage gap — the single
   highest-value planning doc nobody's written yet.
2. Faction verb depth: a per-camp verb/economy matrix (unique
   actions/costs/failure states for Meridian/Tallow/Vesper, and how they
   change after Act 2 corruption/recruitment/robbery/culling) —
   `src/campEconomy.js` is the code side, but this needs a design pass
   first (`docs/faction-verb-matrix.md`) given how underspecified it is.
3. Dedicated Camp-3 boss climax: arena setup, intro/outro beats,
   class-specific mechanics, win/loss consequences feeding into the camp
   choice that follows — currently just corrupted-leader visuals plus
   generic apex-threat behavior. Design doc first
   (`docs/camp3-boss-climax-plan.md`), implementation after.
- Primary files: new docs only for items 1-2; `src/campEconomy.js` and
  `src/bossPhases.js`/`src/threeGame.js` (Camp-3-specific sections only)
  for item 3's eventual implementation — coordinate with Claude lane
  before touching `threeGame.js` given the objective-framework work above.

## Coordination note

Same as prior waves: this is a proposal against current `git log`/`git
status`, not a lock. If a lane is already mid-task on something listed
under another lane, keep going — update this doc afterward rather than
stopping to renegotiate.
