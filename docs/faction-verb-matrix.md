# Faction Verb Matrix — Design Pass

Date: 2026-07-28. Status: design, not yet fully implemented.

Origin: `docs/sprint-19-wave6-punch-list-lane-split.md` assigned this design
pass to the Gemini lane ("faction verb depth... needs a design pass first,
`docs/faction-verb-matrix.md`") on 2026-07-16. It was never written — no
Gemini agent has actually touched this branch (checked `git log` and branch
list on 2026-07-28). Written now by Claude because it directly gates
`docs/master-implementation-plan-2026-07-28.md` Phase 8.1 ("faction verb
matrix... each verb requires cost, benefit, cooldown, failure/exploit rules,
visual state, audio feedback, and ending consequence"), which is in the
Claude lane. See `docs/master-implementation-plan-lane-split-2026-07-28.md`.

## What already exists (verified against code, not assumed)

The game already has real per-faction mechanical identity — this is not a
cold start. Two separate systems currently carry it:

### 1. Passive ambient buffs — `src/campEconomy.js`

`getCampVerbEffects(campRecord, playerType)` gives each camp one named
passive `verb` that scales with camp `level` (0-3) and `bond` (0-5), plus a
flat +20%/-20% class-affinity bonus (Meridian↔ENGINEER, Tallow↔SCOUT,
Vesper↔TANK, `CAMP_AFFINITIES` at campEconomy.js:1-5):

| Camp | Verb | Effect |
| --- | --- | --- |
| Meridian | `radar_compass_boost` | radar range/cooldown, compass-hold seconds |
| Tallow | `stabilize_cover` | humanity-decay multiplier, medkit inventory |
| Vesper | `ammo_and_turret_favor` | ammo reserve, turret cooldown/suspicion/placement favor |

`mergeCampVerbEffects()` combines all allied camps' effects for the active
run. `getCampTrades()` gives each camp a barter pair (sell one resource,
buy another) with the same affinity/level/bond scaling.

### 2. Discrete player-triggered actions — `src/threeGame.js`

Camps carry a status enum (`camp.js:712`): `alive → robbed | culled |
recruited | turned`. Player-facing actions already implemented:
`resolveCampCull` (threeGame.js:10203), `resolveCampRecruit`
(threeGame.js:10204, modes include `'human'`/`'turned'`), a `bond` action
(threeGame.js:10115), and camp-choice-menu options gated by state
(threeGame.js:9698-9958: `cull`, `recruit`). These call into
`act2.recruitCamp()` / `act2.cullCamp()` for the actual state mutation.

**What's missing is not the verbs themselves — it's the dimensions the
master plan asks every verb to carry**: cost, cooldown, failure/exploit
rules, visual state, audio feedback, and which ending vector each verb
choice feeds into. `getCampVerbEffects` has benefit and a bond/level curve
but no cost, no cooldown, and no failure state — it's a passive stat modifier,
not a verb with stakes. The discrete actions (cull/recruit/bond) have state
consequences but no documented cost/cooldown/failure/feedback contract
either.

## The matrix (target shape — fill in as each cell ships)

For every faction, one **signature active verb** (cost + cooldown +
failure/exploit rule + visual + audio), on top of the passive buff that
already exists. Hives use the existing bond-sensitive threshold mechanic
(`hive_threshold` rooms, `unlockExitOnClear`, `src/mazeExpedition.js`
`MAZE_ROOM_TILES.hive_threshold`) as their base, needing the same
cost/cooldown/failure treatment.

| Faction | Existing passive | Proposed active verb | Cost | Cooldown | Failure / exploit rule | Visual | Audio | Ending consequence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Meridian | `radar_compass_boost` | **ROUTE INTEL** — reveal one ring's mission-blocker location + a shortest-path ping | 1 `tech` | one per ring (can't re-ping the same ring) | pinged location is wrong if camp status is `robbed` (bad intel, not a hard fail) | HUD compass flashes gold, route line overlay for 4s | short data-burst SFX | feeds `mothership_infection`/`outed_escape` branches (intel implies compliance with a watching system) |
| Tallow | `stabilize_cover` | **TRIAGE** — cure one stage of the player's own infection progress or fully heal, player's choice | 1 `med` | 90s | cannot triage while `humanityDecayMultiplier` is already at its floor (0.45) — no free stacking | camp NPC animation + green pulse on player | organic squelch/heal chime | strongly weights `clean_escape`/`carriers_bargain` branches away from `full_brood` |
| Vesper | `ammo_and_turret_favor` | **FIELD RESUPPLY** — instant ammo-to-full + one bonus turret charge | 1 `coin` | 120s, and once per boss encounter (prevents trivializing the anti-softlock gap in `src/combatEconomy.test.js`) | turret placement favor is revoked for the rest of the run if the camp is later `culled` | muzzle-flash-colored particle burst at the camp | mechanical reload/clang SFX | feeds `scorched_sky` if paired with culling other camps (militarized survival read) |
| Hives (Suture/Relay/Carapace) | bond-sensitive threshold unlock | **CULL / RESCUE / BOND** choice at the threshold room (cull already exists as a state transition; rescue and wound-vs-cull tradeoffs need the same cost/cooldown/failure/visual/audio pass) | none consumed, but irreversible per hive | n/a (one-shot per hive) | wrong choice for the player's current obedience/humanity state can lock out `alien_exodus` or `clean_escape` — needs explicit warning text before commit, not just a silent state flip | hive membrane visual state change on resolution | organic distress/calm cue depending on choice | directly determines `full_brood`/`alien_exodus`/`scorched_sky` eligibility per `pickAct2Ending()` |

Cells left blank in a future revision of this doc should be treated as
**not yet implemented**, not as "implemented but undocumented" — this table
is the design target, not a status report of shipped code. Update
`docs/current-feature-status.md` (Phase 12.1, once it exists) with the real
Designed/Implemented/Connected/Automated/Accepted/Claimable status per cell.

## What this doc deliberately does not decide

- **Exact numeric costs/cooldowns above are a starting proposal**, not
  final balance — they should be tuned alongside the boss-HP-vs-ammo
  question already flagged as an open, undecided balance call in
  `src/combatEconomy.test.js` / the lane-split doc, not decided in
  isolation.
- **Hive verb detail is the least-verified section of this table** — the
  cull/rescue/bond state machine for hives needs its own closer code pass
  (this doc did not do a full `src/hiveSite.js` read) before implementation
  starts.
- Camp-3 boss climax (the third item in the original wave-6 Gemini lane)
  remains unwritten — out of scope for what feeds Phase 8/10 directly.

## Implementation order (once this design is reviewed)

1. Add cost/cooldown/failure fields to `getCampVerbEffects`'s return shape
   in `src/campEconomy.js` (pure, testable — same pattern as the existing
   function).
2. Wire the three new active verbs into the camp-choice menu
   (`threeGame.js:9698-9958` region) alongside existing `cull`/`recruit`/
   `bond` options.
3. Visual/audio feedback hooks: **audio shipped 2026-07-28**. Meridian,
   Tallow, and Vesper each use an original generated cue connected through
   `camp-verb-activated`; deterministic source and provenance live in
   `scripts/generate-plan-sfx.js` and `docs/generated-audio-provenance.md`.
   Existing gear-poof feedback supplies the shared activation visual; the
   faction-specific visual treatments in the matrix remain open.
