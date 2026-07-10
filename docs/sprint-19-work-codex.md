# Sprint 19 Work Brief — Codex: Run Director & Pressure Cards

Derived from [sprint-19-next-work.md](sprint-19-next-work.md) §3.
Sibling briefs: [Gemini — Legibility & Boarding](sprint-19-work-gemini.md),
[Claude — Physicality](sprint-19-work-claude.md).

## Mission

Make each seed a different problem. The game is strong on consequence and
thin on run-to-run pressure: today a seed changes placement and little else.
Randomness should change decisions, not just coordinates.

## Status

Implemented 2026-07-10:

- `src/runModifiers.js` now owns the six-card pressure deck, deterministic
  seed draws, public card serialization, and merged effect contracts.
- `src/director.js` now stores active cards and exposes `activeCards`,
  `cardEffects`, and `cardState`.
- Existing runtime modifier wiring now dispatches `run-cards-drawn` with
  `{ seed, cards }` for Gemini's UI seam.
- `threeGame.js` now consumes card effects for patrol pressure, relay blackout
  radar degradation, blackout pulses, camp paranoia suspicion scaling, and
  relay-blackout outing suppression.
- `src/data/runModifiers.js` remains as the compatibility adapter for the
  existing `main.js` import.
- `scratch/verify_run_cards.js` verifies fixed seeds, different card draws, and
  observable effect differences without needing a full browser boot.

Wave 2 stretch sweep, implemented 2026-07-10:

- `spore_bloom` now feeds a tested camp-payout helper that doubles Tallow
  medical salvage rewards.
- `ice_collapse` now seals seeded canyon gaps with a connectivity-preserving
  landform helper.
- `egg_instability` now passes an optional manifest rule into boarding previews
  and launch validation, requiring Nahl/Suture aboard with the eggs.

## Why Codex

This lane is almost entirely **new files** — the lowest-collision systems
work on a branch three agents edit live — and it is the same design territory
as the review docs Codex authored (`game-wide-review-and-solution-plan.md`
Appendix A.3.2 has the full card table).

## Deliverables

### 1. `src/runModifiers.js` (new, pure, tested)

- Seeded draw of 2–3 visible cards per run: max one faction card + one world
  card. Deterministic from the run seed.
- Each card is data: `{ key, label, blurb, effects }` where `effects` is a
  plain object other systems consume (e.g. `{ spawnBias, economy,
  routeBlocks, suspicionMult, questPayMult }`).
- House style: pure module + `runModifiers.test.js`, like `act2.js` and
  `landforms.js`.

### 2. Card set (start with these six, from the review doc)

| Card | Effect sketch | Decision it creates |
| --- | --- | --- |
| RELAY BLACKOUT | radar degraded; outing cannot propagate | the safest run to be sloppy in |
| SPORE BLOOM | bio biome spreads; meds pay double at Tallow | herbalist run vs. avoidance run |
| PATROL SURGE | denser, faster snails; cheap ammo at Vesper | fight-through vs. daylight routing |
| ICE COLLAPSE | seal a seeded set of canyon-chunk gaps; one camp needs digging out | route around vs. rescue dig |
| CAMP PARANOIA | suspicion ×2, bond quests pay ×2 | high-risk high-trust run |
| EGG INSTABILITY | egg seat requires Nahl even with the queen | reshapes the boarding calculus |

Every card must create a **route decision** — a stat tax alone does not ship.

### 3. Director integration

- Extend `src/director.js` (`BunkerDirector`, already instantiated by
  `threeGame.js`) to hold the drawn cards and expose a getter (e.g.
  `director.activeCards` / `director.cardEffects`).
- Consumers pull effects from the director; do not push changes into other
  systems' files. If a consumer hook is missing in `threeGame.js`, add the
  smallest possible seam and flag it in the commit message.

### 4. Surfacing

- Dispatch `run-cards-drawn` (CustomEvent, detail: `{ seed, cards: [{ key,
  label, blurb }] }`) at run start — Gemini renders it. Same pattern as the
  existing `act2-milestone` events.
- Expose the seed for debugging and sharing (HUD + run summary display is
  Gemini's side of the seam).

## Done when (from the master plan)

- Two runs with the same broad story still demand different routes.
- At least one modifier changes what the player *does*, not just what they
  read.
- The modifiers are easy to debug from the seed.

## Files owned

`src/runModifiers.js` (new), `src/runModifiers.test.js` (new),
`src/director.js`, `src/director.test.js`.

**Off-limits:** `main.js` / `index.html` / `style.css` (Gemini's),
spawn/placement regions of `threeGame.js` and `landforms.js` / `camp.js` /
`hiveSite.js` (Claude's — his spawner *reads* your card effects; agree on the
`effects` shape early, it is the contract).

## Verification

- `npm test` green before every commit.
- Headless probe in `scratch/`: boot two known seeds, assert different card
  draws, assert one observable world difference (e.g. sealed canyon gap,
  changed barter price). Recipe gotchas in
  [sprint-19-state-and-next.md](sprint-19-state-and-next.md).
- `git pull --rebase` before each work block. Merge order: after Gemini's
  legibility layer, before Claude's physicality rebase.
