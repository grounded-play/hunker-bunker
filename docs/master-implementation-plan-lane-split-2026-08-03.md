# Master Implementation Plan — Lane Split (Claude / Codex / Gemini)

Date: 2026-08-03.
Source: `docs/master-implementation-plan-2026-08-03.md` (Phases A-F) and
`docs/sprint-22-systems-breakdown/`.

Follows the `docs/sprint-19-wave*-lane-split.md` / Sprint 21 two-way
convention, extended to three agents. **Always `git status`/`git diff`
before starting a session in this branch** — all three lanes touch a live
tree, and two lanes share large files (`src/threeGame.js`,
`src/inputActions.js`).

## Known risk from prior sprints

Sprint 19's docs assigned a three-way Claude/Codex/Gemini split
(`docs/sprint-19-work-gemini.md` existed), but per project memory **no
Gemini agent ever actually touched that branch** — the Gemini-lane design
docs it was assigned went unwritten until Claude covered them out-of-lane
weeks later. Sprint 21 reverted to a two-way split for that reason. This
document restores a three-way split because Sprint 22's UX/audio/narrative-
content work (Phase D) is large enough to justify a dedicated lane and is
mostly decoupled from the other two lanes' files — but the PM should
explicitly confirm the Gemini lane is being executed by someone before
counting on Phase D landing. If it isn't, Phase D falls back to whichever
lane has bandwidth, same as last time — flag this early rather than
discovering it at sprint end.

## Why this split

Phase A (instrumentation) is prerequisite tooling, not owned by one lane —
each lane builds the instrument its own phase needs (A2 belongs with
Claude/Phase B, A4 belongs with Codex/Phase C, etc.), rather than one lane
front-loading all of Phase A before the others start.

Phase F (human acceptance) is not assigned to any lane. It is the user's
(or the user's recruited testers'). No lane should report a Phase F item as
"done."

- **Claude lane = gameplay/world/combat/faction/narrative-state engineering**
  — matches Sprint 21's split rationale (recent branch history: WFC,
  objectives, faction verbs, humanAI, ending/manifest are Claude-authored
  commits on this branch).
- **Codex lane = platform/backend/rendering/performance engineering** —
  self-contained from the gameplay-logic surface; historically Codex's lane
  on this branch (server, scripts, electron, input plumbing, asset
  pipeline, docs hygiene).
- **Gemini lane = UX/presentation/audio/narrative-content engineering** —
  new dedicated lane this sprint (see risk note above). Its primary files
  (menu/settings UI, `src/audio.js`, stick-input-to-cursor mapping) mostly
  don't overlap Claude's or Codex's gameplay-logic edits, but **does**
  share `src/inputActions.js` with Codex (native Steam Input plumbing) and
  the HUD/menu shell with whichever lane last touched `main.js`.

## Claude lane — World, Combat, and Faction Follow-Through

Primary files: `src/mazeExpedition.js`, `src/wfcGenerator.js`,
`src/tileCatalog.js`, `src/mazeTiers.js`, `src/bossPhases.js`,
`src/data/enemies.js`, `src/campEconomy.js`, `src/humanAI.js`,
`src/act2.js`, `src/endingExplanations.js`; gameplay/world/combat/faction
sections of `src/threeGame.js`.

- **A2 + B1 — Combat/boss encounter audit and gated boss extension.** Build
  the per-class × per-enemy TTK/ammo/oxygen/decision-point harness first;
  only extend `src/bossPhases.js` for a boss the data actually flags as a
  stat package. Deterministic test per converted boss, same shape as
  `src/queenFightAcceptance.test.js`.
- **A1 + A3 — World-gen instrumentation.** Seed-portfolio report (route
  length, gate reachability, site spacing, dead-space flags) across the
  five named seed categories in `01-world-generation-and-wfc.md`; separate
  large-N (thousands of seeds) reachability/seam/collision/determinism
  batch job. Output format should be consumable by a human without reading
  code — a table or short report, not raw JSON dumps.
- **B2 — Faction aftermath matrix.** Distinct population/props/ambient
  audio/interaction affordances per camp disposition
  (fortified/robbed/culled/turned/outed) in `campEconomy.js`/`humanAI.js`.
  This was named the largest open quality gap in
  `03-factions-and-hives.md` — treat it as the highest-value single item in
  this lane.
- **B3 — Act2 state-surface audit.** Grep every UI call site touching act2
  state; confirm each routes through `src/act2.js` manager functions, not
  direct mutation. Add save/reload/death-boundary tests per ending family.
  Add QA instrumentation for impossible/contradictory manifest vectors.
  High-risk changes list in `08-engineering-act2-state-schema.md` applies —
  read it before touching ending priority order.

## Codex lane — Platform, Rendering, and Backend Hardening

Primary files: rendering/instancing sections of `src/threeGame.js`,
`server/`, `scripts/`, `electron/`, `steam/`, `src/inputActions.js` (native
Steam Input plumbing only — see overlap note below).

- **C1 — Door-rib animation gap.** Read the `KNOWN GAP` comment in
  `src/threeGame.js` near the door rib/panel pool construction and the
  design doc it references
  (`docs/superpowers/specs/2026-08-02-wall-door-instancing-design.md`)
  before choosing an approach. Pick one of the two accepted fixes (patch
  instance matrices per-frame in the door-animation loop, or revert ribs to
  individual meshes) and finish it — don't land a partial version of both.
- **C2 — InstancedMesh pool disposal.** Add `.dispose()` on chunk unmount
  for floor/void/cliff/rubble/wall/door pools alike — this is a
  pre-existing gap the Sprint 21 instancing work inherited, not something
  it introduced, but it's now bigger with more pool types.
- **A4 — Automated draw-call regression check.** Headless/Playwright load
  of a wall-dense chunk; assert renderer stats stay near the post-fix
  baseline (2,096 draw calls was the pre-fix number this guards against
  regressing toward). This replaces "a human loads a build and eyeballs
  the stats overlay" as the standing regression gate.
- **C3 — Steam backend acceptance pre-flight.** Re-run
  `npm run steam:audit-backend:strict`; verify session-expiry/renewal/
  tamper/app-mismatch test coverage; confirm no ticket/token material can
  reach logs or support bundles; write the exact runbook checklist for the
  human-only live ticket exchange (Phase F). Do not attempt the live
  exchange — no agent holds a Steam session or Publisher key.

**Overlap note:** Codex owns `src/inputActions.js`'s native Steam Input
*polling/action-set* code; Gemini owns the *stick-to-cursor/aim-point*
mapping layered on top of it (D1/D2). If both lanes need to touch this file
in the same session window, coordinate via a quick message before editing —
same pattern the Sprint 21 rendering work used when it discovered a second
agent had independently started the same instancing task.

## Gemini lane — UX, Input Feel, and Audio/Narrative Content

Primary files: menu/settings UI modules, stick-input-to-cursor/aim-point
mapping (layered on `src/inputActions.js`), `src/audio.js`,
`src/data/` (new cue-table file), narrative/codex UI surfaces, `main.js`
settings sections.

- **D1 — Right Joystick virtual mouse cursor + smooth menu scrolling.**
  Menu-mode stick input drives a virtual cursor and scrolls container
  panels smoothly (not discrete focus-jump only).
- **D2 — In-game 3D world aim-point targeting.** Gameplay-mode right stick
  drives the targeting reticle/aim point directly. Sequence after D1 if the
  same agent does both — likely reuses D1's stick-mapping primitives.
- **D3 — Steam Deck Settings menu overhaul (1280×800).** Sectioned
  categories, auto-scroll focus centering.
- **D4 — Authored audio cue table.** New data file: cue/track ID,
  narrative owner, trigger/cancellation condition, diegetic-vs-score
  classification, priority/crossfade policy, replay cooldown, fallback
  cue, DLC-only flag. Wire it into `src/audio.js` for ship, biome
  exploration, threat, the three camps, the three hives, Queen phases,
  major consequence beats, and endings. Do not assign tracks just to raise
  usage count — `10-engineering-audio-and-soundtrack.md` is explicit that
  43-packaged does not mean 43-rotating.
- **D5 — Spatial audio prototype.** One camp + one hive with positional
  falloff, occlusion, re-entry behavior, and mix ducking, before any
  broader spatial-audio rollout is considered.
- **D6 — Timeline surface + discovery-order map.** In-world/codex UI
  presenting Horizon research → Chen's operation → crash → camps → Act 2
  as a legible dated sequence; separately, a written map of the minimum
  evidence chain a normal player sees before and after the Queen reveal
  (doc artifact, informs D6's UI ordering and Phase F's blind-tester
  script).

## Status Log

Update this section as work lands — this is the authoritative "what's
actually done" record, not the plan above (mirrors the Sprint 21
lane-split doc's role).

| Date | Lane | Item | Status | Evidence |
| --- | --- | --- | --- | --- |
| 2026-08-03 | — | Plan drafted | Proposed | This doc + master plan |
| 2026-08-03 | Claude | B2 — Faction aftermath matrix | Shipped | `getCampAftermathDisposition/-Reason/-Summary` (campEconomy.js), fortified-crossing event (camp.js), wired into camp-choice-resolved + lockdown prompt (threeGame.js); 23 tests |
| 2026-08-03 | Claude | B3 — Act2 state-surface audit + boundary tests | Shipped | Zero direct `.act2.state.` mutation found outside act2.js (now a standing test guard); save/reload round-trip for all 10 ending families; 400-vector manifest/ending invariant sweep |
| 2026-08-03 | Claude | A1+A3 — World-gen seed portfolio + large-N sweep | Shipped | `scripts/world-seed-portfolio-report.js` (`npm run audit:world-seeds[:sweep]`); 5,000-seed sweep clean, 0 site-spacing conflicts found — flagged for the human readability pass |
| 2026-08-03 | Claude | A2+B1 — Combat encounter harness + boss-phase gate | Shipped, gate revised to MET | `scripts/combat-encounter-report.js` (`npm run audit:combat-encounters`). Initial pass checked only "has a bossPhases.js entry" and found every non-Queen boss equally phase-less (gate NOT MET). Reread threeGame.js's actual per-boss attack code afterward and found a real discriminating signal — boss_sporesnail: highest HP by far, longest idealized TTK, zero direct damage from its one mechanic. Converted it (`SPORESNAIL_FIGHT_DEF`, `src/bossPhases.js` + runtime wiring in `threeGame.js`, mirroring the Queen fight's exact integration pattern). Side effect: gentle armor (0.6x) flattens a pre-existing TANK-clears-it-twice-as-fast quirk, restoring rough class parity for this one fight. Remaining 5 bosses NOT flagged — no comparably extreme profile; still needs the human combat-feel pass to decide if any of them need it |
| 2026-08-03 | Claude | Fixed stale `CHUNK_SIZE=19` literal in `mazeGenerationStress.test.js` | Shipped | Found auditing world-gen tests for A1+A3; unrelated drive-by fix |
| 2026-08-03 | Gemini | Phase 8.1 & 8.2 — Camp-3 boss climax + faction verb UI | Shipped (implemented, connected, automated) | `docs/camp3-boss-climax-design.md` (Camp-3 Vesper perimeter siege, Corrupted Operator phase transitions, faction verb synergy, boarding vector consequences); Faction Active Verb UI biome prompts + `camp-verb-activated`/`camp-verb-denied` handlers wired into `main.js`; `src/campActiveVerbUi.test.js` added. Landed directly on `dev/sprint-22` — confirms the Gemini lane is actually staffed this sprint (see this doc's earlier risk note) |
| 2026-08-03 | Codex | Phase 2.1 — release-gate hardening | Shipped | `steam:prepare` now rejects dirty release inputs by default (`--allow-dirty` limited to non-upload local QA, closing a bypass that previously only guarded uploads); depot audit now also rejects `backend.env`-style files and SQLite main/WAL/shared-memory artifacts. Landed directly on `dev/sprint-22`. Real clean Windows/Linux package + Steam upload/install pass remains operator acceptance work (Phase F) |

## Non-Goals For This Sprint

- No lane should attempt a Phase F item and report it as accepted. Produce
  the instrumentation/runbook; leave the actual observation to the user.
- No lane should extend `bossPhases.js` to more than one boss without A2
  data justifying it (see Claude lane, B1).
- No lane should generalize spatial audio beyond the one camp + one hive
  prototype (D5) without a follow-up decision.
- No lane should change Act2 ending priority order without the specific
  vector tests and existing-vector regression proof
  `08-engineering-act2-state-schema.md` requires.
