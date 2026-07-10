# Sprint 19 Work Brief — Claude: Physicality & World Behavior

Derived from [sprint-19-next-work.md](sprint-19-next-work.md) §4 and §5.
Sibling briefs: [Gemini — Legibility & Boarding](sprint-19-work-gemini.md),
[Codex — Run Director](sprint-19-work-codex.md).

## Mission

Once the UI is readable (Gemini) and seeds create pressure (Codex), the world
has to *behave* like it remembers the player. State changes get a face, a
sound, or a turret — any meter that can't earn that goes internal or dies.

## Why Claude

This lane builds directly on what Claude shipped this sprint: the landform
system (`landforms.js`), camp discovery flares, and the headless verification
harness (`scratch/verify_discovery_landforms.js`). It also consumes the proto
sprites Gemini generated (`alien_proto_crawler`, `alien_proto_spitter`,
`civilian_miner`, `civilian_researcher`) — wired with stats and materials in
commit `cae2839` but with **no spawner yet**.

## Deliverables

### 1. Landform-keyed proto-enemy spawner

- Proto crawlers nest in **ruins** chunks; proto spitters guard **crater**
  rims. Civilians appear near camps (ambient, non-hostile).
- Respect Codex's card effects: read `director.activeCards` /
  `director.cardEffects` for `spawnBias` (e.g. PATROL SURGE densities).
- Done when at least one new enemy family naturally belongs to a terrain type
  and a playtester can name which without being told.

### 2. Suspicion tells + camp lockdowns

- Suspicion becomes behavior, not a number: leaders stop approaching, barter
  prices tick up, workers stare. Leader sprites already animate — this is
  state-driven animation, not new systems.
- At suspicion ≥ 50 the camp becomes a *place* that distrusts you: gates,
  refused barter, warning strobes.
- Reuse the flare/visual-state pattern from `camp.js` (`setDiscovered` is the
  template for state-driven prop toggles).
- Done when a player can rank the three camps by suspicion with the HUD
  hidden.

### 3. Crater-anchored placement

- Bias `chooseCampPosition` (and future boss stages) toward crater-arena
  chunks so authored-feeling spaces come free from terrain.
- Keep the existing walkability fallbacks — never fail placement because no
  crater is in range.

### 4. Hive signal language

- Generalize the camp distress flare into a signal vocabulary: hives get
  their own column (different color/behavior keyed to hive state), giving
  hives the same find-me readability camps now have.
- One system, color-coded — not three bespoke ones.

### 5. Stretch: queen boss fight

- The biggest unbuilt promise of the defiance paths. Reuse the boss framework
  and the corrupted-leader boss sprites already in the repo; stage it in the
  cave you crawled out of (or a crater arena). Only start once 1–4 land.

### 6. Stabilization stewardship (ongoing, from master plan §5)

- Keep `scratch/` smoke suites and unit tests current as all three lanes
  land; update docs when code reality changes.

## Files owned

`src/landforms.js` (+ tests), `src/camp.js` (+ tests), `src/hiveSite.js`
(+ tests), `threeGame.js` **spawn/placement/update-loop regions** (enemy
spawning, `chooseCampPosition`, `updateCamps`/`updateHives`), `scratch/`
verification scripts.

**Off-limits:** `index.html` / `style.css` / `main.js` and `threeGame.js`
modal-builder regions (Gemini's), `director.js` / `runModifiers.js`
internals (Codex's — consume via the getter, propose shape changes to Codex
rather than editing).

## Verification

- `npm test` green before every commit; new behavior ships with unit tests
  (pure-module pattern) plus headless probes extending
  `scratch/verify_discovery_landforms.js` (boot → teleport → assert spawns /
  tells / lockdown props).
- Known harness gotchas: scripts must live in `scratch/`, vite :5199 may be
  held by another agent, boot budget 420s, never clear localStorage on every
  navigation.
- `git pull --rebase` before each work block. This lane merges **last** and
  rebases on both siblings.

## Done when (from the master plan)

- State changes have visible behavior in the world.
- At least one new enemy family naturally belongs to a terrain type.
- The big defiance path has a real gameplay payoff (stretch).
