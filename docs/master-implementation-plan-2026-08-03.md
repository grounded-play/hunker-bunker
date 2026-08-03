# Hunker Bunker Master Implementation Plan — Sprint 22

Date: 2026-08-03
Branch baseline: `dev/sprint-22` (branches from the merged `dev/sprint-21` /
`mothership` history — PR #23)
Status: Proposed execution plan
Source: `docs/sprint-22-systems-breakdown/` (14 system docs + README +
onboarding), `docs/current-feature-status.md`.

## 1. Purpose

Sprint 21 built systems. Sprint 22's job, per the syllabus, is different in
kind: **"Sprint 22 should not rebuild systems that already exist. Its job is
to turn the implemented vertical slice into accepted product evidence."**
(`docs/sprint-22-systems-breakdown/README.md`)

That reframes what a coding agent can usefully do here. Most Sprint 22 line
items in the syllabus are phrased as *observation* ("record human readability
findings", "ask a blind tester to explain..."), not *construction*. This plan
separates the two explicitly so no lane quietly claims an acceptance outcome
it cannot produce.

## 2. Definitions of Done

The syllabus's four-word ladder, plus the fifth rung it names but doesn't
formalize:

1. **Designed** — behavior and constraints are documented.
2. **Implemented** — code exists.
3. **Connected** — the shipped runtime invokes it.
4. **Automated** — tests/build gates exercise it.
5. **Accepted** — a human has proved it in the environment that matters
   (installed Steam build, physical Deck, a live playtest, a blind
   tester's retelling).

Agents can move work from 1→4. Only a human can produce rung 5. Every task
below is tagged with which rungs it targets.

## 3. What this plan is NOT

It is not a rebuild of any of the 14 systems in `sprint-22-systems-breakdown/`.
Per that syllabus, world gen, combat, factions, narrative, platform, audio,
UX, run director, and rendering are all already Implemented/Connected/
Automated to varying degrees. Re-reading those docs before touching any file
below is required — the risk in this sprint is regressing shipped work while
chasing a "repair" that isn't needed.

## 4. Phases

### Phase A — Evidence & Instrumentation Tooling (prerequisite work)

Several syllabus acceptance items ask for a "measured table" or "recorded
portfolio" before a human judgment call can happen. Building the
*instrument* is agent work; reading it and deciding "does this feel right"
is not. This phase produces the instruments the human-acceptance phase (F)
will consume.

- A1. Seed-portfolio report generator (world gen: route length, gate
  reachability, site spacing, dead-space detection across a fixed named
  seed set). See `01-world-generation-and-wfc.md` §"Seed portfolio".
- A2. Combat/boss encounter-audit harness (per class × per enemy/boss:
  time-to-kill, ammo consumed, oxygen spent, hits taken, decision points).
  See `02-combat-and-classes.md` §"Sprint 22 Acceptance Matrix" and
  `07-engineering-combat-boss-phases.md` §"Sprint 22 Engineering
  Deliverables".
- A3. Large-scale WFC seed validation batch (thousands of seeds; reachability/
  seam/collision/determinism only — no readability judgment). See
  `06-engineering-wfc-chunk-math.md` §"Engineering Acceptance".
- A4. Automated draw-call regression check (headless/Playwright load of a
  wall-dense chunk, assert against the post-fix baseline). See
  `14-engineering-rendering-and-performance.md`.

**Rungs targeted:** Implemented, Automated. Output is data/tooling for phase
F, not a verdict.

### Phase B — World & Combat Follow-Through (Claude lane)

- B1. Consume A2's encounter table; if and only if it shows a boss reading as
  a pure stat package (no decision variety vs. the Queen), extend
  `src/bossPhases.js` for at most one additional boss, per
  `07-engineering-combat-boss-phases.md` §"Extending the Framework"
  (phase entry threshold, attack change, add policy, weak-point condition,
  failure recovery, telegraph, dialogue ownership, deterministic test).
  Do not extend a boss the data doesn't flag — this is explicitly gated,
  not a default deliverable.
- B2. Faction aftermath matrix: give fortified/robbed/culled/turned/outed
  camp states visibly distinct population, props, ambient audio, and
  interaction affordances in `src/campEconomy.js` / `src/humanAI.js`. See
  `03-factions-and-hives.md` §"Visible Aftermath" (named the largest open
  quality gap in that doc).
- B3. Act2 state-surface audit: confirm every UI choice surface mutates
  state only through `src/act2.js` manager functions (no direct state
  mutation from UI code); add save/reload/death-boundary tests at each of
  the ten ending-family branches; add QA instrumentation that flags
  impossible/contradictory manifest vectors. See
  `08-engineering-act2-state-schema.md` §"Sprint 22 Work" and "High-Risk
  Changes".

**Rungs targeted:** Implemented, Connected, Automated.

### Phase C — Platform & Rendering Hardening (Codex lane)

- C1. Fix the door-rib animation gap: patch the door-rib `InstancedMesh`
  pool's matrices per-frame inside the existing door open/close loop in
  `src/threeGame.js` (search `KNOWN GAP`). Alternative accepted by the
  syllabus: revert ribs to individual meshes — pick one, don't leave both
  half-done. See `14-engineering-rendering-and-performance.md`.
- C2. Add `.dispose()` on chunk unmount for every `InstancedMesh` pool type
  (floor/void/cliff/rubble/wall/door) — closes the flagged GPU-buffer-leak
  gap shared by old and new pools alike.
- C3. Steam backend acceptance pre-flight: re-run
  `npm run steam:audit-backend:strict`, verify session-expiry/renewal/
  tamper/app-mismatch tests exist and pass, confirm logs/support bundles
  never contain ticket/token material, and produce the exact runbook
  checklist for the human-only live ticket exchange. Do not attempt the
  live exchange itself — no coding agent holds a Steam session. See
  `09-engineering-steam-backend-auth.md`.

**Rungs targeted:** Implemented, Connected, Automated. C3's actual live pass
is out of scope (Phase F).

### Phase D — UX, Input, and Audio Engineering (Gemini lane)

- D1. Right Joystick virtual mouse cursor + smooth container scrolling in
  menu/settings screens. See `12-ux-first-hour-and-presentation.md`.
- D2. In-game 3D world aim-point targeting: right stick drives the
  targeting reticle/aim point directly rather than a relative-turn model.
- D3. Steam Deck (1280×800) Settings menu layout overhaul: sectioned
  categories, auto-scroll focus centering.
- D4. Authored audio cue table (`src/data/` — cue/track ID, narrative
  owner, trigger/cancellation condition, diegetic-vs-score, priority,
  crossfade policy, replay cooldown, fallback, DLC flag) wired into
  `src/audio.js` for ship/biome/threat/3 camps/3 hives/Queen phases/
  consequence beats/endings. See `10-engineering-audio-and-soundtrack.md`.
- D5. Spatial audio prototype: one camp + one hive with distance falloff,
  occlusion, re-entry behavior, and mix ducking — before generalizing to
  more sites.
- D6. In-world timeline surface (UI/codex addition) presenting Horizon
  research → Chen's operation → crash → camps → Act 2 as a legible dated
  sequence, plus a written discovery-order map of the minimum evidence
  chain before/after the Queen reveal. See
  `11-narrative-secret-sauce-and-lore.md` §"Timeline strata" and
  §"Discovery order".

**Rungs targeted:** Implemented, Connected, Automated.

### Phase E — Claims & Documentation Hygiene (any lane, low priority)

- E1. Update `docs/current-feature-status.md` rows for anything Phase B/C/D
  changes (do not let implementation outrun the claim matrix).
- E2. Keep `npm run steam:claims:check` green throughout — this is a gate,
  not a one-time pass.

### Phase F — Human Acceptance (NOT agent-executable)

Flagged explicitly so no lane attempts these or reports them "done":

- First-hour timed observation (skip and non-skip runs), interruption-count
  audit, death-loop timing (`12-ux-first-hour-and-presentation.md`).
- Blind-tester retelling pass, before and after the Queen reveal and after
  an ending (`11-narrative-secret-sauce-and-lore.md`).
- World-seed *readability* judgment consuming A1's report — agents produce
  the numbers, a human decides if merged rooms/halls feel purposeful
  (`01-world-generation-and-wfc.md`).
- Combat *feel* judgment consuming A2's report — agents produce the table,
  a human decides monotony and target durations
  (`02-combat-and-classes.md`, `07-engineering-combat-boss-phases.md`).
- Installed-Steam live auth ticket exchange, achievement/stat/leaderboard
  live read-write, Inventory live reconciliation, overlay from an installed
  build (`05-platform-and-backend.md`, `09-engineering-steam-backend-auth.md`).
- Two-machine Steam Cloud conflict/offline matrix.
- Physical Steam Deck hardware: suspend/resume, dock, battery, built-in
  controls.
- Audio mix-by-ear acceptance (crossfade quality, overlap-free transitions)
  consuming D4/D5's wiring.
- Screenshot cohesion review at Steam thumbnail size and 1280×800.
- Final store-claim sign-off (the `steam:claims:check` gate is automatable;
  the decision of *what to claim* is the PM's).

## 5. Dependency Notes

- B1 depends on A2's output (do not extend a boss without data).
- Phase F's world/combat items depend on A1/A2/A3 existing first — build
  the instrumentation before scheduling the human pass.
- C1/C2 both touch the `InstancedMesh` pool code introduced at the end of
  Sprint 21 (`70f4193` and the wall/door instancing work) — read that
  commit and `docs/sprint-22-systems-breakdown/14-*.md` in full before
  editing, the "known gap" and "deferred" notes there are load-bearing.
- D1/D2 both touch stick-input routing in `src/inputActions.js` — sequence
  D1 before D2 if one agent does both, since D2's aim-point logic likely
  reuses D1's stick-to-cursor mapping in gameplay mode.

See `docs/master-implementation-plan-lane-split-2026-08-03.md` for the
three-way Claude/Codex/Gemini assignment and file-overlap risk notes.
