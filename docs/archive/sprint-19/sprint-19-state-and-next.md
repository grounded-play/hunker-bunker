# Sprint 19: Current State and What Comes Next

Snapshot date: 2026-07-10, branch `dev-sprint-19` (commits `cae2839`, `0de2f2c`).
Companion docs: [PR_OUTLINE.md](../PR_OUTLINE.md) (sprint starting map) and
[game-wide-review-and-solution-plan.md](game-wide-review-and-solution-plan.md)
(design northstar + Appendix A code audit). This doc is the working synthesis:
what just landed, what it unlocked, and the recommended build order from here.

## What Landed This Sprint (so far)

### Ending cutscene pipeline (`cae2839`)

- Five ending branches now have generated webm cutscenes + poster frames:
  FULL BROOD, CLEAN ESCAPE, MIXED CREW, CARRIER'S BARGAIN, SCORCHED SKY.
- `cave-reveal` and `act3-departure` re-rendered; asset contract updated in
  `public/cutscenes/README.md`.
- The runtime already picked ending video basenames and falls back gracefully,
  so dropping the files in completed the handoff — no code changes needed.

### Proto-enemy groundwork (`cae2839`)

- New walk sprites: `civilian_miner`, `civilian_researcher`,
  `alien_proto_crawler`, `alien_proto_spitter` (generator:
  `scratch/generate_character_sprites.js`).
- Stats registered in `src/data/enemies.js`, textures/materials/type checks
  wired in `threeGame.js`. **No spawner yet** — they cannot appear in-game
  until something places them.

### Camp discovery incentive (`0de2f2c`)

- Undiscovered camps burn a tall distress-flare light column visible over the
  maze walls — the in-world reason to walk toward a camp before you know why.
- First contact (7u) pays 10 shells + 35 O₂, fires the `campDiscovered` radio
  milestone (teaches the O₂-haven and support mechanics), and douses the flare.
- `discovered` persists in the act2 camp record; the payout cannot be farmed
  across deaths or sessions. Culled camps never relight.

### Chunk landforms (`0de2f2c`)

- `src/landforms.js`: every chunk rolls a seeded archetype —
  **maze** (most common), **field** (clearing + rock outcrops), **canyon**
  (parallel ridge halls, taller walls), **crater** (rimmed arena bowl),
  **ruins** (half-collapsed maze, mostly toppled walls).
- Biome-weighted: cryo leans canyon, bio leans field. The two-chunk ring
  around the crash site stays maze so the tutorial reads unchanged.
- Pure grid transforms — collision, pickups, room templates, radar all adapt
  for free. Portals tunnel inward so entrances never dead-end.
- Regression harness: `scratch/verify_discovery_landforms.js` (headless boot,
  landform distribution + portal reachability, discovery payout / re-entry /
  reload-persistence probes).

## What This Unlocked (new follow-ups)

These didn't exist as options before this sprint:

1. **Craters are natural stages.** Camp/hive/boss placement currently ignores
   landforms. Biasing `chooseCampPosition` (and the future queen fight) toward
   crater arenas would make the world feel authored for free.
2. **Landforms are run-director hooks.** ICE COLLAPSE (seal canyon gaps),
   SPORE BLOOM (field chunks sprout hazards) — the pressure-card system from
   review-doc Appendix A.3.2 now has terrain to act on.
3. **The flare pattern generalizes.** Hives, the foundry, and the cave could
   get their own signal language (color-coded columns) — one legibility system
   instead of three bespoke ones.
4. **Proto enemies need a spawner.** Cheapest win: tie them to landforms
   (proto crawlers nest in ruins, spitters guard craters) so enemy variety and
   terrain variety reinforce each other.

## Recommended Build Order From Here

Order follows the review doc's discipline: **legibility → variability →
physicality → content.** Estimates from Appendix A.3.

### 1. Legibility layer (~1 week, highest leverage)

The consequence engine is complete and invisible; make it speak:

- **Consequence lines on every camp/hive modal option** (~1d) — data already
  exists in `getEndingVector()` / `buildAct2Manifest()`.
- **Queen's Ledger HUD chip** (~2d) — `♛ obedience −1 · seats 3/4 · vector:
  OUTED ESCAPE`, updating live. The single highest-value UI element in the
  backlog.
- **Manifest Forecast at the vessel** (~2d) — four-slot seat diagram with
  eligibility reasons; reuses `buildAct2Manifest` verbatim.
- **Run summary card** at death/launch (~1d) — doubles as the ending
  explanation nobody currently gets.

### 2. Boarding climax

- Dedicated vessel object (the climax currently happens at a tent) plus the
  pre-launch summary from PR_OUTLINE §2. Pairs naturally with the forecast.

### 3. Run director / pressure cards

- `runModifiers.js` does not exist yet; `director.js` is 113 lines. Draw 2–3
  visible cards per seed (RELAY BLACKOUT, SPORE BLOOM, PATROL SURGE, ICE
  COLLAPSE, CAMP PARANOIA, EGG INSTABILITY — table in review doc A.3.2), each
  creating a route decision. Wire landforms in as targets (see above).

### 4. Physicality pass

- **Queen boss fight** — the biggest unbuilt promise of the defiance paths;
  reuse the boss framework + corrupted-leader sprites.
- **Suspicion tells** — leaders stop approaching, barter prices tick up,
  camp lockdowns at suspicion 50. Meters become behavior.
- **Proto-enemy spawner** — landform-keyed (see above).
- **Class Act 2 verbs** — Scout slips turret cones, Tank shrugs first zap,
  Engineer reprograms spoofed turrets.

### 5. Polish backlog (from PR_OUTLINE §3)

- Objective HUD resilience after reset/death, black box multi-object state,
  compass distance feedback, fabricator determinism, dialogue panel sizing,
  cutscene overscan.

## Verification Assets (protect these)

- 229 unit tests across 31 files (`npm test`), including `landforms.test.js`
  connectivity/distribution proofs.
- Headless smoke suites in `scratch/`: full ladder (`smoke_act2.js`), camps
  (`smoke_camps.js`), fresh boot (`smoke_fresh_intro.js`), infection/turrets
  (`smoke_infection_turrets.js`), HUD/shells (`verify_hud_shells.js`),
  discovery/landforms (`verify_discovery_landforms.js`).
- Recipe gotchas: scripts must live in `scratch/` (repo ESM resolution), vite
  on :5199 may already be held by a parallel session, boot-to-live can take
  up to ~7 min under software rendering — budget 420s.

## Standing Cautions

- **This branch is co-edited live by multiple agents.** Check `git status`
  before assuming the tree is yours; mid-session edits trigger Vite HMR that
  can break an in-flight headless boot.
- Every new meter must earn a face, a sound, or a turret (Appendix A.3.4) —
  otherwise it goes internal or dies.
