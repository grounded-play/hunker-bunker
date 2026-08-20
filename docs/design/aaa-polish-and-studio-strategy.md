# AAA Polish Checklist & Studio/Scope Strategy

Source: distilled from `docs/sprint25.checkin.md`'s AAA-polish audit,
engineering-architecture advice, and studio/publishing-strategy sections.
Three different concerns bundled into one doc because they're all
"housekeeping that unlocks everything else," rather than new gameplay
systems.

## The quality bar (target, not aspiration)

| Metric | Target |
|---|---|
| Normal gameplay frame hitches >50ms | Essentially zero |
| Multi-second stalls | Zero |
| Death → retry/control | <5–10 sec |
| Second-run boot → control | <30 sec |
| Mouse-required controller screens | Zero |
| Unrebindable gameplay actions | Zero |
| Critical spoken dialogue without subtitles | Zero |
| Critical information conveyed by color alone | Zero |
| Full-screen interruptions during combat | Zero |
| Multiplayer disconnect causing lost identity/match | Zero |
| Unexplained player death | Zero |
| Bosses whose primary identity is "more HP" | Zero |

The "multiplayer disconnect causing lost identity/match" row is the direct
overlap with Sprint 26's own goal (`docs/sprint26-master-plan-2026-08-19.md`)
— that work counts toward this bar, not a separate effort.

## AAA-polish priority list (condensed)

1. **Performance becomes sacred.** Frame budgets, move heavy chunk/world
   work off the critical frame, pool allocations/VFX, prewarm assets/
   shaders, eliminate traversal hitches, measure 1%/0.1% lows not average
   FPS. Directly overlaps Sprint 26's open perf item (the 6s freeze /
   60-200ms chunk-mount stutter).
2. **Combat as showcase system.** See `combat-feel-and-juice-plan.md`.
3. **Real PC options suite.** Display mode, resolution, render scale,
   VSync, frame cap (incl. uncapped), quality presets, shadows/effects/
   lighting/texture quality, brightness/gamma, camera shake toggle, FOV,
   UI scale, mouse/controller sensitivity, deadzones, inversion, vibration
   strength, reset-to-default. Controller glyphs should follow the active
   input device; mixed mouse/keyboard/controller input should work; text
   entry on controller should summon an appropriate on-screen keyboard.
4. **Accessibility as core, not later patch.** Scalable text/UI, full
   subtitles with speaker ID, captions for critical non-speech cues,
   color-independent enemy/item/objective info, colorblind presets, reduced
   shake/flash/motion options, hold-vs-toggle choices, controller
   deadzones, aim assist, difficulty assists, high-contrast interactables.
   No clear existing implementation found for subtitles/captions, text
   scaling, reduced motion, or colorblind modes in this repo — this is a
   real gap, not already partially built.
5. **Information architecture.** One notification style, one critical-
   warning style, one objective hierarchy, one interaction prompt, one
   modal grammar, one focus behavior, one back button. Explicit hierarchy:
   ambient toast → objective update → urgent HUD warning → blocking
   decision modal. Full-screen interruption should be rare. (See memory:
   `[Shells & HUD Economy]` already established some of this
   notification-deck/mission-stack layout discipline — extend that
   convention rather than inventing a second one.)
6. **First-hour teaching, invisible.** Teach movement while moving,
   shooting while shooting, interaction at the first interactable, oxygen
   when it matters, crafting when useful. Explain death-persistence
   immediately after the first death. A new player should be able to
   answer: where am I going, why, what can kill me, what do I keep, what do
   I want next.
7. **Save/recovery bulletproof.** Autosave at meaningful boundaries, atomic
   writes, corrupted-save fallback, previous-save backup, clear save
   indicator, Steam Cloud conflict strategy, session recovery. For
   multiplayer specifically, this is the same reconnect-identity work
   tracked in Sprint 26.
8. **Social multiplayer UX**, not just networking. Steam lobby → invite →
   join friend → ready → play → reconnect → results → rematch as one
   continuous flow, with ping/connection-quality indication, AFK handling,
   host migration, mute/block/report, and a ping wheel. Overlaps Sprint 26
   item 2 (real Steam Lobbies) directly. Players should never see the words
   "socket," "relay," "auth ticket," or "fallback" outside a diagnostics
   screen.
9. **Unify art production rules.** One palette bible, silhouette
   philosophy, lighting philosophy, material language, sprite/3D
   integration rule, VFX grammar, color semantics (amber = reward, cyan =
   safe tech, red = hostile/authority — never decorative). A screenshot
   should read as this game without the logo.
10. **Localization architecture, now.** No obvious i18n system found in
    this repo. Externalize strings, support font fallback and variable text
    lengths, design for 30–50% text expansion — even shipping English-only
    first, this prevents a painful later rewrite.

## Engineering-hygiene advice (condensed; each is its own investigation)

Stop allocating garbage inside the frame loop; add a real performance
profiler layer; use spatial indexing for proximity queries; decouple
simulation rate from rendering rate; make randomness fully deterministic
end-to-end; adopt state machines everywhere one is implicit already; build
gameplay around data-driven modifiers instead of hardcoded bonuses (directly
relevant to the transformative-relics plan in
`one-more-ring-design-pillars.md`); build a real gameplay-event vocabulary;
consider a presentation director; add an adaptive-quality controller; build
a `ResourceManager`; add real lifecycle/disposal discipline; gradually type
the JavaScript; version every persistent save/data format; make debug
tooling first-class; build network simulation (latency/packet-loss
injection) into the dev workflow; use tests differently — as a design
feedback tool, not just a regression net.

None of these are implemented as part of this doc-writing pass — each is a
standalone investigation/refactor with its own blast radius, and several
(gradual typing, ResourceManager, network simulation) are multi-day efforts
that shouldn't be started opportunistically alongside a design-planning
task.

## Studio/scope strategy (the doc's business-side advice, condensed)

- **Freeze scope.** No new pillars until the items above are real. New
  breadth (marketplace, more currencies, more cosmetics, more minor
  factions, more endings for completeness) is explicitly considered
  *failure* for this milestone, not progress.
- **One canonical `PRODUCT_STATE.md`.** The repo has accumulated reviews,
  master plans, wave plans, sprint plans, worklogs, truth-checks, and
  implementation guides — genuinely valuable as history, but there was no
  single file answering "what is true today" without reading several docs
  and reconciling contradictions (a real, observed problem: several docs
  in this repo already contain their own "this statement is stale"
  corrections, this session's own sprint26 doc included). A sibling commit
  adds this file at the repo root as a small, always-current status table;
  every other design doc stays historical/point-in-time.
- **Reduce advertised ending count** and build toward "the streamer
  sentence" / "the GIF test" — can someone describe why this game is
  different in one sentence, and does a five-second clip prove it? Both are
  planning/marketing exercises for the user, not engineering tasks.
- **Reliability budget, observability, contributor ownership, bus-factor**
  — organizational concerns for the human team, out of scope for this doc
  to resolve unilaterally.

## What actually got built this pass

- `docs/design/one-more-ring-design-pillars.md`,
  `docs/design/camp-narrative-style-guide.md`,
  `docs/design/combat-feel-and-juice-plan.md`, and this doc — the "several
  new docs... game plans with added context" the goal asked for.
- `src/depthContract.js` — first data-driven cut of the Depth Contract
  (pure functions, unit-tested), the single highest-leverage concrete
  mechanic named across the source document.
- `PRODUCT_STATE.md` (repo root) — the canonical current-state file, since
  it's cheap, safe, and directly addresses a real pain point (document
  entropy) this very session has been contributing to across many sprint
  docs.

Everything else catalogued above is deliberately left as plan, not
fabricated implementation — narrative scenes, combat VFX/audio tuning,
relic design, art unification, and localization all need human creative
iteration and playtesting that an autonomous pass shouldn't invent
wholesale into the game.
