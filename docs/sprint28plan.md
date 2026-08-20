# Sprint 28 Plan — Independent Review + Convergence Sprint

**Author's note on method:** this document is an independent review, not a rubber
stamp of any prior recommendation. It was produced by (1) reconstructing the
real Sprint 23–27 chronology from git history rather than trusting doc
filenames/numbering, (2) three parallel investigations cross-checking design
docs and `PRODUCT_STATE.md` against actual runtime code (import graphs, call
sites, git log, and — where possible — live evidence: a real `curl` to the
production backend, real packaged `electron-builder` runs, real Playwright
sessions driving the actual dev server), and (3) firsthand knowledge of the
Sprint 27 multiplayer/perf work, which this reviewer implemented and
live-verified directly in the same session this doc was written. Every claim
below is tagged with how it was verified. Where evidence was inconclusive,
that's stated explicitly rather than guessed.

A second, independently-arrived-at recommendation existed before this review
started (paraphrased: *"Sprint 28 should be a Proof Run convergence sprint —
make One More Ring real, improve combat/buildcraft, prove one excellent
35–45 minute expedition, kill serious perf stalls, complete real two-account
Steam acceptance, instead of adding breadth."*). This review was explicitly
instructed to try to disprove that recommendation, not confirm it. It could
not be disproven — the evidence independently converges on the same
conclusion, for reasons laid out below, with one significant addendum this
review adds that the source recommendation didn't have visibility into (see
"Strong disagreements," item 1).

---

## 1. Executive assessment

Hunker Bunker's actual engineering velocity over the reconstructed Aug 13–20
window is high and real — this is not a stalled project. But the work has
been overwhelmingly **infrastructure and reliability** (multiplayer
plumbing, Steam integration, performance diagnosis, packaging), not
**player-facing feel**. The one document that most directly represents "what
the game is supposed to be" — `docs/design/one-more-ring-design-pillars.md`
— is **less than 24 hours old relative to the current HEAD** and its own
headline mechanic (the Depth Contract) is **fully coded, fully tested, and
entirely disconnected from the runtime**: zero call sites outside its own
module and test file. A player today experiences ring depth as a silent
difficulty ramp, not the "explicit, legible bet" the design doc says is the
single highest-leverage thing to build.

Meanwhile the actual best-implemented, most mechanically substantial system
in the game is oxygen pressure — real multiplier stacking, a real death
consequence, genuinely felt today — and it is the exact system the Depth
Contract was designed to plug into and isn't. This is the clearest, most
concrete argument in this whole review: **the highest-leverage single build
target in the entire codebase is finishing a system that is already 80%
built.** That is a convergence argument, not a breadth argument, and it
didn't require trusting anyone's prior recommendation to reach — it fell out
of independently reading `src/depthContract.js`'s own header comment and
grepping for its call sites.

At the same time, this review found a second, less flattering pattern: a
full day of this week's engineering effort (the Sprint 27 multiplayer flow
rework — Deployment Briefing screen, private lobbies with passwords, a
squad-composition cutscene overlay) was real, well-tested, live-verified
work that fixed genuine player-blocking bugs — but it also added
**discretionary new scope** (private lobbies, the cutscene overlay) that
appears nowhere in the design team's own freshly-written 10-step roadmap.
That roadmap's own step 1 is "freeze scope — no new pillars/systems beyond
what's below." This review takes that tension seriously rather than
smoothing over it (see "Strong disagreements," item 1).

---

## 2. Sprints 23–27: actual outcomes

**A note on numbering, reconstructed from `git log --date=short`:** these are
not sequential week-long sprints. Sprint 23 work landed 2026-08-13. Sprint
24's multiplayer findings and Sprint 26's master plan were **both dated
2026-08-19** — the same day. Sprint 25's own checkin transcript wasn't
distilled into the design docs it produced until 2026-08-20, **after**
"Sprint 26." The work this review calls "Sprint 27" (multiplayer flow
rework) also happened 2026-08-20. Real elapsed time for "five sprints" is
about **eight days**. Treat sprint numbers as loose chronological labels
applied after the fact, not a planning cadence — this matters for Sprint 28
scoping: don't assume a "sprint" here means a fixed multi-week block.

- **Sprint 23 (Aug 13) — authored-world tiles.** Ring manifests,
  room/hallway catalogs, and runtime integration for hand-authored content
  mixed with procedural generation. Landed and is referenced consistently by
  later docs with no contradiction found. **Outcome:** gave the world
  structural bones — but this review found only 2 hits for
  `setPiece`/`SET_PIECE` in `threeGame.js`, a weak signal for how much of
  that authored layer is actually load-bearing today vs. how much of world
  content is procedural connective tissue. **Flagged as inconclusive, not
  negative** — needs a follow-up read of Sprint 23's own doc against
  `ringManifest.js` specifically, not just a grep count.

- **Sprint 24 (Aug 19) — multiplayer runtime findings.** Found and partially
  fixed real bugs: server-authoritative PvP damage, Steam-session-authed
  socket handshake, host-authoritative co-op enemy hit resolution, and
  diagnosed **host assignment as "genuinely fragile under connection
  churn"** — a reconnecting socket could steal or fail to reclaim host
  status. **Outcome:** real reliability work, but the exact
  deploy-to-gameplay handoff this sprint fixed (`waitForArmoryEmbarkButton`
  DOM-click-through) was **entirely removed and rebuilt from scratch twice
  more** since then — once in the Sprint 26 GameController rework, once in
  this week's Sprint 27 work. That's not evidence Sprint 24's fix was wrong;
  it's evidence this seam has been architecturally unstable across three
  separate passes. Treat as a live risk, not a closed one (see risk #1).

- **Sprint 25 — design conversation, not implementation.** `sprint25.checkin.md`
  is a ~6,100-line unstructured design transcript, not a report of shipped
  work. Its value was realized a full sprint-label later, when it was
  distilled (Aug 20) into `one-more-ring-design-pillars.md`,
  `combat-feel-and-juice-plan.md`, and `aaa-polish-and-studio-strategy.md`.
  **Outcome:** this is where the game's actual current creative thesis was
  decided — but as of this review, almost none of it has runtime code
  behind it yet (see next item).

- **Sprint 26 (Aug 19) — "Multiplayer Steam-Native and Production-Safe."**
  Shipped same-day: host-reassignment durability, co-op enemy-damage
  server-side validation, a world-gen seed-sync bug fix, host failover.
  Explicitly left open (in the doc's own words): SteamID64 as universal
  identity, real Steam Lobbies/Friends/Join Game, the chunk-mount stutter
  and 6-second-freeze hypothesis, two-real-Steam-account acceptance.
  **Outcome:** solid reliability increment; the open items it named are
  almost exactly what Sprint 27 (below) picked up.

- **Sprint 27 (this week, Aug 20) — Steam Lobby fixes, packaged-build fix,
  performance investigation, multiplayer flow rework.** This reviewer
  implemented and live-verified this work directly. Real bugs found via
  actual two-machine playtests and fixed: 3D models failing to load in
  packaged builds (missing `asarUnpack` entry — verified via two real
  `electron-builder --dir` runs), Steam lobbies defaulting to a visibility
  that made public browsing structurally impossible, a dead
  `window.profileManager` global that broke the multiplayer roster's
  callsign display and silently dropped stats recording, and a real
  (undocumented-until-now) Steam-region lobby-discovery limitation in the
  installed `steamworks.js` binding. On top of the bug fixes, this session
  also built discretionary new scope: a redesigned Deployment Briefing
  screen (SOLO/CO-OP/PVP unified flow), host-set private lobbies with a
  relay-side password gate, per-player loadout synced onto the roster, and
  a squad-manifest cutscene overlay. All of it is real, tested (full
  1830-test suite + new integration tests), and live-verified against a
  running dev server. **Outcome:** multiplayer is measurably more reliable
  and complete — but this is the era where the gap between "engineering
  effort spent" and "the design team's own stated priority list" is widest
  (see Strong Disagreements #1).

---

## 3. Implemented vs. accepted matrix

Legend: **Designed** = a doc describes it · **Coded** = the module/function
exists · **Connected** = actually called from the live runtime · **Tested**
= automated coverage exists · **Live-verified** = manually or
Playwright-driven confirmed working in a real browser/dev server ·
**Packaged-verified** = confirmed in an actual `electron-builder` packaged
build · **Accepted** = confirmed with real Steam accounts/real players.

| System | Designed | Coded | Connected | Tested | Live-verified | Packaged | Accepted |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| Oxygen pressure loop | — | ✅ | ✅ | partial | — | — | — |
| Depth Contract (One More Ring core) | ✅ | ✅ | ✅ (except elite promotion) | ✅ | ✅ (dev-server) | — | — |
| Transformative relics (8 new) | ✅ | ✅ (8/8 catalog) | ⚠️ (5/8 gameplay hooks) | ✅ (pure + runtime coverage) | — | — | — |
| Boss stagger/armor/weakpoint grammar | ✅ | ✅ (2 fights) | ✅ | — | unknown | — | — |
| Combat hitstop / camera shake | — | ✅ | ✅ | — | unknown | — | — |
| Combat-feel-and-juice plan (broader) | ✅ | ❌ (by its own admission) | ❌ | ❌ | ❌ | — | — |
| Buildcraft weapon/relic catalog | — | ✅ (13 weapon recipes + 21 loot items) | ✅ | partial | — | — | — |
| Authored world set-pieces (Sprint 23) | ✅ | ✅ | inconclusive | — | — | — | — |
| New-run flow (class→Armory→Deploy screen) | ✅ | ✅ | ✅ | ✅ (unit) | ✅ (Playwright) | ❌ | ❌ |
| Steam Lobby create/browse/join (same-region) | ✅ | ✅ | ✅ | ✅ | ✅ | — | ❌ |
| Steam Lobby cross-region discovery | ✅ | ⚠️ (native-binding gap) | ❌ | — | ❌ (confirmed broken) | — | ❌ |
| Private lobby + password | ✅ | ✅ | ✅ | ✅ (10 integration tests) | ✅ | ❌ | ❌ |
| Host failover / reclaim | — | ✅ | ✅ | partial | partial (Aug 19 test) | — | ❌ |
| Squad-composition cutscene overlay | ✅ (post-hoc, this review's call) | ✅ | ✅ | ❌ (no main.js test infra) | ✅ | ❌ | ❌ |
| 3D model loading in packaged build | — | ✅ (asarUnpack fix) | ✅ | — | — | ✅ (2 real builds) | ❌ |
| Real Steam-ticket auth (packaged) | — | ✅ | ✅ | — | — | ❌ | ❌ |
| Production backend (self-hosted) | — | ✅ | ✅ | — | ✅ (live `curl`) | — | — |
| Steam Cloud save round-trip | — | ✅ | ✅ (bridge wired) | ✅ (unit) | ❌ | ❌ | ❌ |
| Save/recovery on crash mid-run | — | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Colorblind accessibility toggle | — | ✅ (UI+state+persistence) | ❌ (zero CSS) | — | — | — | — |
| Reduced-motion accessibility | — | ✅ (5 CSS rules) | ✅ (partial coverage) | — | — | — | — |
| Subtitle/caption system | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| First-hour comprehension | ✅ (plan exists) | n/a | n/a | n/a | ❌ (plan says un-runnable by an agent) | — | ❌ |
| Performance (idle-menu freeze root cause) | — | partial (diagnostic only) | — | ✅ | ⚠️ (sandbox-only, SwiftShader) | — | ❌ |

The single most important row in this table for Sprint 28 is **Depth
Contract**: Designed ✅, Coded ✅, Connected ❌. It is the cheapest possible
win in the entire matrix — the hard part (the data model, the tuning
tables, the tests) is already done.

---

## 4. Top 10 current product/technical risks

Ranked by (likelihood a real player or reviewer hits it) × (how bad it looks
when they do), not by engineering effort to fix.

1. **The multiplayer deploy/Armory handoff has been rearchitected three
   times across three "sprints."** Each rework fixed something real, but the
   pattern itself — the same seam keeps breaking in new ways — is evidence
   of an unstable architecture, not a solved problem. A fourth unplanned
   rework mid-Sprint-28 would be a bad sign. (Sprint 24 → Sprint 26 → Sprint
   27, confirmed via `git log` on `src/multiplayerLobby.js`/
   `src/gameController.js`/`server/relay.js`.)
2. **One More Ring's core mechanic is fully disconnected from the runtime.**
   Confirmed independently three times (this reviewer directly, plus two
   parallel investigations): zero call sites for `depthContract`/
   `DEPTH_CONTRACT` outside its own file. If a reviewer or player is told
   "depth is a legible bet," today it demonstrably isn't one.
3. **The colorblind accessibility toggle was a convincing fake, fixed
   2026-08-20 — twice.** Originally: fully wired UI, state, and persistence,
   zero CSS behind it. A concurrent Sprint 28 pass then added real CSS
   (`body.colorblind-assist` palette remap) — but targeted selectors
   (`#hp-bar`, `.health-bar-fill`, `.vitals-hp-fill`, `#o2-bar`,
   `.o2-bar-fill`, `.vitals-o2-fill`, `.danger-indicator`,
   `.critical-warning`, `.low-o2-pulse`) that don't exist anywhere in
   `index.html`/`main.js` — a second, differently-shaped version of the same
   bug (CSS that parses and "looks" done, targeting nothing real). Traced the
   actual HP/O2 markup (`.vitals-hearts` icon count for HP — already
   colorblind-safe by design, no color-only info — and
   `.vitals-panel__o2-bar` under `.vitals-panel--o2-warning`/
   `--o2-critical`, toggled by `src/vitals.js`, not `main.js`) and retargeted
   the critical-state remap there instead. Live-verified via direct
   `fetch(..., {cache: 'no-store'})` against the served stylesheet (a normal
   browser reload wasn't enough to prove this one — the versioned CSS URL is
   served `Cache-Control: immutable, max-age=1yr`, so a tab that loaded the
   page before this fix landed cannot see it without an explicit cache
   bypass; not a codebase bug, a dev-session caching artifact worth knowing
   about if a future check here seems to contradict a source read).
4. **Cross-region Steam lobby discovery is confirmed broken**, not merely
   unverified — traced to the installed `steamworks.js` binding lacking a
   distance-filter parameter, which per Valve's own docs defaults Steam to
   same-region-only results. Two players in different regions cannot find
   each other's public lobby today, full stop, even though the lobby is
   genuinely Public. This is a real native-binding limitation requiring
   either a binding patch or routing discovery through the relay instead.
5. **No save/recovery on a mid-run crash.** No autosave/checkpoint module
   found anywhere in the codebase. A crash mid-expedition currently means
   losing the run. For a "35–45 minute Proof Run" thesis specifically, this
   is a direct threat to the exact experience Sprint 28 is trying to prove.
6. **The packaged-asset audit scripts create false confidence.** Both
   `scripts/audit-retail-assets.js` and `scripts/audit-build-media.js`
   check existence/file-size/budget only — neither inspects file content.
   A corrupted texture or truncated video with a plausible file size would
   pass cleanly. The one real correctness check found this pass (the
   asarUnpack 3D-model fix) required a manual packaged-build run plus live
   inspection, not these scripts. Treat green here as weaker evidence than
   it looks.
7. **Steam Cloud has never been verified against a real Cloud round-trip.**
   The bridge is wired and unit-tested; `PRODUCT_STATE.md` itself already
   honestly flags this as unverified. Confirmed accurate — not a new
   finding, but a real open risk for a "premium Steam game" commercial bar.
8. **7 of 8 new "transformative relics" are inert catalog entries.** They
   roll into loot, they render in the manifest/UI, they describe an effect
   — and only `last_breath` actually applies one. A player who reads the
   flavor text and finds it does nothing will notice. This directly
   undercuts the "12–20 transformative relics, not stat sticks" pillar as
   currently experienced.
9. **The idle-menu freeze root cause remains genuinely unconfirmed on real
   hardware.** The only investigation sandbox available has SwiftShader
   software WebGL, not a real GPU — so the diagnostic work done (real, and
   it fixed a genuine waste — a 0×0 container still running full render
   passes) could not conclusively explain the original 3.9s/6.5s freezes.
   This needs real-hardware evidence before Sprint 28 can honestly claim it
   solved this, not just instrumented it better.
10. **The multiplayer identity model is not yet SteamID64-universal.**
    Sprint 26 explicitly left this open. Host reclaim currently uses
    `steamId64 || profileId` as a durable key — functional, but a mixed
    identity model (some players keyed by Steam identity, some by a
    localStorage-backed fallback) is a durability risk under real
    cross-network conditions this review could not test directly (no two
    real Steam accounts available in this environment either).

---

## 5. What the player still does not feel strongly enough

- **Depth as a decision.** Oxygen fear is real and felt. But "should I go
  one ring deeper" is currently a vibes-based difficulty read, not the
  explicit bet the design pillar promises. This is the single biggest gap
  between codebase and player experience in the whole review.
- **Relics as build-identity.** 21 items exist and are connected at the
  catalog level, but only one relic actually changes how the player plays.
  The promised "rules change, not stat sticks" feeling isn't there yet for
  87.5% of the new relic set.
- **Combat as a distinct, readable exchange per enemy type.** Hitstop and
  camera shake are real; the broader combat-feel-and-juice plan (enemy
  verbs, stagger/armor/weakpoint spread beyond two bosses, loot ceremony
  tiers) is explicitly not attempted yet, by its own doc's admission.
- **Confidence that a run won't just end for a technical reason.** No
  save/recovery, an unresolved idle-menu freeze, and Steam Cloud's unproven
  round-trip all point the same direction: mechanical trust in the
  platform, not just the game, is unproven.
- **A first hour that's actually been watched.** The first-hour acceptance
  plan exists and has never been run against a real or even simulated new
  player, by its own admission. Nobody currently knows, with evidence,
  whether a new player understands the core loop in their first session.

---

## 6. Strongest ownable hook, and whether it's communicated today

**The hook: oxygen-pressured depth-gambling** — descending further trades a
harder, faster-draining environment for better salvage and rarer rewards,
under a real, felt, escalating suffocation clock. This is the strongest
candidate because it's the only pillar that is simultaneously (a)
substantially real today (oxygen drain/danger/death loop is one of the most
mechanically complete systems in the codebase) and (b) meaningfully
differentiated from generic survival-crafter/roguelite peers, which mostly
gate difficulty by enemy density or a timer, not by a resource the player is
actively spending down every second they choose to stay deep.

**Is it communicated today?** Only half of it. The suffocation clock is
real and legible — the player feels O2 dropping. The "gamble" half — that
going deeper is a knowing, explicit trade, not just harder — is not, because
the Depth Contract that would make the tradeoff legible (a HUD/audio beat at
the crossing, real salvage/danger numbers tied to ring depth) is fully coded
and completely disconnected. This is the clearest, most specific reason this
review lands on convergence rather than breadth: **the hook the game should
own already half-exists in the runtime and is one wiring pass away from
being whole**, which is a categorically cheaper and higher-confidence bet
than inventing a new system from nothing.

Narrative consequence-memory (death-unlocked dialogue, faction verbs, the
Queen/Act 2 canon weld) is real and, per prior internal review, considered
the project's other strong pillar — but it pays off over a full run or
across runs, not in a player's first minutes, so it's a weaker candidate for
the single hook a store page or first-hour trailer needs to sell immediately.
It's a strong second pillar to reinforce, not the lead.

---

## 7. Recommended Sprint 28

### Thesis

**Prove one excellent expedition, and make the game's one real differentiator
— depth as a legible gamble — actually happen in the runtime.** Stop adding
systems. Finish the one that's already 80% built, raise the floor on the
handful of things that would embarrass the game in front of a real reviewer
or a colorblind player, and get real evidence (packaged build, real
hardware, two real Steam accounts) instead of more sandbox-qualified
confidence. The player-facing shape of that expedition is defined in
`docs/design/game-outline-and-proof-run.md`; use it as the shared contract
for onboarding, room pacing, relic expression, extraction, and acceptance.

This reaches the same practical shape as the prior recommendation this
review was asked to try to disprove, but for reasons this review verified
independently: the Depth Contract's disconnection, the relic catalog's
7-of-8 inertness, the still-unconfirmed freeze root cause, and the total
absence of two-account acceptance are not opinions — they're things this
review found directly in the code and git history.

### Priorities (in order)

0. **P0 — explain and reduce packaged-build gameplay stalls before adding
   polish.** `docs/logs/log10.json` is a real Windows Steam-installed session
   with 299 long tasks totaling 44,790 ms, including a 6,176 ms unattributed
   stall, 3,430/1,386/640 ms streaming-adjacent stalls, and repeated
   `gear-poof` tasks of 58–127 ms. First add nested attribution around frame
   update/render, projectile and wall destruction, debris/VFX, chunk generation
   and mounting, renderer first-use, and asset uploads. Then reproduce the
   wall-break hitch and 6-second stall, resolve the apparent `batchSize: 3`
   telemetry contradiction, and pool/defer destruction effects. Do not call
   this fixed based on dev-browser or SwiftShader timings; require a repeat
   packaged-build comparison against log10.
1. **Wire the Depth Contract into the runtime.** Import `depthContract.js`
   into the ring-crossing/salvage/spawn/O2 pipeline it was designed for;
   add the HUD/audio "crossing ritual" beat the design doc calls for. This
   is the highest-leverage single item in this entire review — cheap,
   already tested, already tuned.
2. **Wire the remaining 7 transformative relics into real gameplay hooks**,
   or explicitly cut the ones that don't make it this sprint back to
   flavor-only rather than shipping half-true item descriptions. Quality
   over count — even 3-4 more real ones is a large improvement over 1.
3. **Build and prove one real 35–45 minute expedition end to end**, played
   by a human, not just agent-verified — combining the wired Depth Contract,
   the real relics, existing oxygen pressure, and existing boss
   stagger/weakpoint grammar into one deliberately complete run.
4. **Ship the highest-leverage items from the combat-feel-and-juice plan**
   that don't require new asset production — spreading the existing
   stagger/armor/weakpoint grammar to ordinary elites (the plan's own
   cheapest-to-extend item, since `bossPhases.js` already has the
   framework) is the best per-hour bet here.
5. **Close the accessibility credibility gap.** Wire real colorblind
   palettes or pull the toggle until it's real — this is a half-day fix
   sitting on a real risk (§4.3).
6. **Get real evidence, not more sandbox confidence**, on three specific
   open questions: (a) the idle-menu freeze on real GPU hardware, not
   SwiftShader, (b) a real packaged-Steam build acceptance pass (not just
   `electron-builder --dir`), (c) two real Steam accounts completing a full
   synchronized co-op session — Sprint 26's own definition of done, still
   unmet three sprints later.

### Non-goals (explicit)

- **No new multiplayer architecture changes.** The deploy/Armory handoff has
  been rebuilt three times; Sprint 28 should treat the current shape as
  frozen and only touch it for a confirmed regression, not more redesign.
- **No new lobby features.** Private lobbies + passwords shipped this week
  and are real — leave them alone. Cross-region lobby discovery is a known,
  documented, native-binding-level bug; fixing it is real scope (forking/
  patching a native dependency) that competes directly with this sprint's
  thesis. Explicitly deferred, not silently dropped.
- **No new content categories.** No marketplace expansion, no new
  currencies, no additional minor factions, no new game modes — this
  matches the design doc's own scope-cut list and this review found no
  evidence contradicting it.
- **No large new save-system rewrite.** Save/recovery-on-crash is a real
  gap (risk #5) worth a scoped fix if time allows, but a full save-system
  overhaul is out of scope for a convergence sprint.
- **No further Depth Contract redesign.** The data model is already tuned
  and tested — Sprint 28's job is wiring, not redesigning the tables.

### Definition of done (player-outcome-based)

- A human playtester (not an agent) can play one full expedition, 35–45
  minutes, and describe — unprompted — that going deeper was a decision
  they consciously made, with a moment they remember making it.
- That same playtester can name at least 3 relics that changed how they
  played, not just what number went up.
- The same expedition, replayed twice, produces two different viable
  builds (not the same dominant path both times).
- A colorblind test (real deuteranopia/protanopia simulation, or a
  colorblind tester) confirms the accessibility toggle actually changes
  what's on screen.
- The idle-menu freeze is either fixed with real-hardware evidence, or
  concretely explained with real-hardware evidence — not "still
  unconfirmed" a fourth time.
- A real packaged Steam build (not dev server) is used for the full
  playtest above, with the actual `electron-builder` output, not
  `--dir`-only verification.
- Two real Steam accounts complete one full synchronized co-op session on
  the live production backend, start to finish, with a screen recording or
  equivalent evidence — Sprint 26's own unmet acceptance bar, finally met.

### Concrete human/packaged-Steam acceptance criteria

1. `electron-builder` full packaged build (not `--dir`) on at least one
   target platform, installed and launched from the actual installer.
2. The Proof Run expedition played start-to-finish from that packaged
   build by a human who has not read this document.
3. Depth Contract crossing ritual observed firing at least twice during
   that run, with the player able to state what changed.
4. Two-Steam-account co-op session on the real production backend
   (`steam.tuesdaycinema.club`, confirmed live via this review's own
   health-check), both players reaching extraction together.
5. Colorblind mode toggled on mid-session by the tester, with a visible,
   describable change to at least the HP/O2/danger-state UI.

---

## 8. Likely Sprint 29 (if Sprint 28 succeeds)

If Sprint 28 lands the Proof Run and closes the acceptance gaps, Sprint 29
is naturally a **breadth-with-a-frame sprint**: extend what Sprint 28 proved
works to more of the game rather than opening new systems. Concretely:
extend the Depth Contract's ritual/reward pattern to more rings beyond the
initial tuning pass; extend combat-feel/stagger-weakpoint grammar to the
remaining ordinary enemy roster now that it's proven on elites; extend the
relic catalog past the Sprint-28 core set now that the wiring pattern is
established (cheaper to add relic #9-20 once #2-8 are proven); and only
then revisit the deferred cross-region Steam lobby fix and a real
save/recovery system, now that the core loop they'd be protecting is
actually proven to be worth protecting. Sprint 29 should explicitly NOT be
another new-system sprint — it should be "do more of what Sprint 28 proved
works."

---

## 9. Strong disagreements with current project direction

1. **The prior recommendation this review was asked to stress-test didn't
   have full visibility into how much of this week's actual engineering
   time went to discretionary multiplayer feature work that isn't on the
   design team's own roadmap.** The One More Ring design doc's own 10-step
   sequencing (written the same day as the multiplayer flow rework) doesn't
   mention multiplayer UX anywhere in its list, and its step 1 is literally
   "freeze scope." Fixing the real, acute multiplayer bugs found via live
   playtests (wrong callsign, broken lobby visibility, packaged-build model
   loading) was clearly correct regardless of any roadmap — those are
   floor-level bugs a paying customer would hit immediately. But building a
   new Deployment Briefing screen, password-protected private lobbies, and
   a squad cutscene overlay in the same pass was discretionary scope
   expansion that this review believes should not have competed with Depth
   Contract wiring or combat-feel work for the same week's attention. This
   isn't a criticism of the work's quality — it's real, tested, and
   live-verified — it's a disagreement about sequencing. **Sprint 28's
   explicit non-goal on further multiplayer feature work exists specifically
   to correct this.**
2. **This review disagrees with treating the packaged-asset audit scripts as
   meaningful CI coverage.** They check existence and byte budgets, not
   content correctness, and their presence in the test suite likely creates
   more confidence than they've earned. Sprint 28 doesn't need to fix this
   (out of scope per the non-goals), but it should not be cited as evidence
   of "packaged build verified" without the caveat.
3. **This review disagrees with `PRODUCT_STATE.md`'s accessibility framing.**
   The doc says "not started" — the actual state (a fully-wired-but-inert
   colorblind toggle) is arguably worse than not started, because it will
   read as shipped in a screenshot or a cursory QA pass. Sprint 28 should
   fix this or explicitly relabel it as broken, not leave the doc's
   optimistic framing standing.
4. **This review does not believe convergence-over-breadth needed to be
   assumed — it was independently re-derived**, and specifically because
   the cheapest, highest-confidence win available (Depth Contract wiring)
   is a finishing move, not a new-system bet. If that module didn't already
   exist fully coded and tested, this review's answer might well have been
   different. The recommendation is conditional on that specific fact, not
   a generic "always converge" philosophy.

---

## 10. Working document for multi-agent collaboration (Claude / Gemini / Codex)

This section exists so three agents can pick up scoped, independently
completable lanes against this plan without re-deriving the context above.
Each lane includes: the relevant files, what "done" means for that lane
specifically, and explicit dependencies on other lanes.

### Lane A — Depth Contract wiring — **DONE, 2026-08-20**
**Status:** all fields wired except `eliteSpawnChance`, which has no existing
"promote to elite" mechanism to hook into and was left honestly unwired
rather than fabricated. Full account of what was wired, where, and why —
including the two gaps (salvage/rare-relic, director aggression) that were
deliberately left open in the first pass and filled in a follow-up commit
after investigating the overlap/false-claim risk each one carried — is in
`docs/design/one-more-ring-design-pillars.md`'s own "Status" note under item
1, kept there rather than duplicated here since that's the doc a future
reader will actually check first. Two commits: `feat(depth): wire the Depth
Contract into the runtime` (O2 penalty + crossing ritual) and `feat(depth):
wire the Depth Contract's last two gaps` (salvage + director aggression).
Both live-verified against the real dev server; full suite green throughout.

**Files touched (for reference):** `src/threeGame.js` (ring-crossing/O2/
salvage/loot-roll/director-snapshot call sites), `main.js` (crossing-ritual
message), `src/runDrops.js` (`rollEnemyLootDrop`'s new `ring` param),
`src/director.js` (`chooseDirectorAction`'s new `aggressionBonus` param).
`src/depthContract.js` itself was never redesigned — every field it already
exported got a real caller, not a rewritten table.

### Lane B — Transformative relics wiring
**Files:** `src/runDrops.js` (the remaining 3 inert relics:
`scrap_cycler`, `vesper_doctrine`, `queens_milk` — each has a real `stats`
object already, just no gameplay hook reads it), `src/threeGame.js` (wherever each relic's effect
actually needs to hook in — reload economy, enemy-aggro AI, faction-aware
healing, etc., per relic).
**Done means:** each remaining relic gets one real, testable
gameplay hook each, following the `last_breath`/`applyLastBreathDamage`
pattern already proven in this codebase (a pure function in `runDrops.js`,
called from the relevant `threeGame.js` combat/state site, unit-tested).
Five of the original eight are now wired; finish the remaining three only
when their effects have a clear player-facing decision and a stable runtime
integration. Do not add a shallow hook merely to reach 8/8.
**Depends on:** nothing directly, but coordinate with Lane A if any relic's
effect should scale with ring depth (natural overlap, not a hard blocker).
**Test approach:** one unit test per newly-wired relic's pure function,
matching `last_breath`'s existing test as the template.

### Lane C — Combat-feel extension (stagger/weakpoint to ordinary enemies)
**Files:** `src/bossPhases.js` (the existing framework — `QUEEN_FIGHT_DEF`,
`SPORESNAIL_FIGHT_DEF` — extend the pattern, don't replace it),
`docs/design/combat-feel-and-juice-plan.md` (the source design doc — read
its enemy-verb/stagger-grammar section specifically), `src/threeGame.js`
(enemy spawn/combat logic for ordinary (non-boss) enemy types).
**Done means:** at least 2-3 ordinary enemy types gain a real
stagger/weakpoint state (not full boss-phase complexity — a lighter version
of the existing grammar), changing how a player has to fight them.
**Depends on:** nothing directly.
**Test approach:** unit tests on the new stagger-state logic; live/manual
verification that the enemy behavior actually changes during combat.

### Lane D — Accessibility + save/recovery floor-raising
**Files:** `style.css` (colorblind CSS — currently zero rules for
`.colorblind-assist`, needs real palette remapping for HP/O2/danger-state
UI elements at minimum), a new small autosave/checkpoint module (does not
exist yet — needs design: what state gets checkpointed, how often, where
it's stored — this is genuinely new work, scope it small).
**Done means:** colorblind toggle produces a real, describable visual
change (acceptance criteria #5 in section 7). Save/recovery: at minimum, a
crash mid-run doesn't silently lose all progress — even a coarse
checkpoint (last-extraction-point) is a real improvement over the current
total loss.
**Depends on:** nothing directly. Lowest-risk lane to parallelize since it
touches the least shared surface with A/B/C.
**Test approach:** colorblind — visual diff/manual check with a
deuteranopia/protanopia simulator. Save/recovery — unit test the
checkpoint write/read cycle, manual test of the actual crash-recovery flow.

### Lane E — Real-world acceptance evidence (do last, needs A-D's output)
**Files:** none to edit — this lane is verification, not implementation.
**Done means:** the 5 acceptance criteria in section 7 are actually run and
their results recorded (screen recording or written observation) in a new
`docs/sprint28-acceptance-log.md`: packaged build test, human Proof Run
playthrough, Depth Contract ritual observed firing, two-Steam-account co-op
session, colorblind mode check.
**Depends on:** Lanes A-D substantially complete (the packaged build needs
something real to test).
**Note:** this lane explicitly requires a human, not just an agent — per
this review's own finding that the first-hour acceptance plan has never
been run for exactly this reason (agents can't self-certify "does a human
feel X").

### Lane F — P0 gameplay frame-pacing audit (start immediately)
**Evidence:** `docs/logs/log10.json` (Windows Steam-installed build,
2026-08-20). **Files:** `src/threeGame.js`, `main.js`,
`docs/perf-chunk-mount-plan-2026-08-20.md`, and the existing destruction/chunk
tests.

**Done means:** the next packaged capture can attribute the relevant long tasks
to a concrete phase instead of leaving the worst stalls as `lastPhase: null`,
and the wall-break/streaming hypotheses are proved or disproved.

Required sequence:

1. Add nested timing attribution for frame update/render, projectile
   collision/wall-hit, wall damage/destroy/instance/collision updates,
   debris/loot, `gear-poof` create/update/dispose, chunk generation and each
   mount phase, unmount, renderer compile/first-use, and model/texture
   first-use.
2. Record contextual counters with each long task: draw calls, triangles,
   scene objects, transient effects, wall instances, destroyed walls, new
   meshes/materials/textures, pending mounts, renderer memory/program counts,
   and JS heap where available.
3. Reproduce one wall destruction, ten rapid destructions, junk-pile
   destruction, and destruction during chunk streaming. Verify that one wall
   does not rebuild an entire pool/chunk or recreate GPU resources.
4. Audit `gear-poof` allocations and pool/defer critical-frame work where
   safe; compare first-use and repeat-use timings.
5. Verify whether packaged runtime still uses fixed `batchSize: 3`, whether
   telemetry is stale, or whether another staging path bypasses the
   time-budget scheduler.
6. Re-run the same packaged scenario and compare counts, maximum duration,
   unattributed-task share, and wall/streaming attribution against log10.

**Non-goal:** do not rewrite world generation or renderer architecture before
the instrumentation identifies the dominant phase.

### Explicit cross-lane rules (apply to all agents)
- Do not touch `src/multiplayerLobby.js`, `src/gameController.js`, or
  `server/relay.js` unless fixing a confirmed regression — this is Sprint
  28's explicit non-goal, and that seam has already broken from
  well-intentioned rework three times.
- Do not redesign `src/depthContract.js`'s data model — it's tuned and
  tested; Lane A's job is wiring, not changing the numbers.
- Every new gameplay hook needs a unit test before being called "done" —
  follow the existing `last_breath`/`applyLastBreathDamage` pattern as the
  house style for this kind of small, pure, testable gameplay function.
- Full `npx vitest run` and `npm run build` must stay green after every
  lane's changes — this repo's existing discipline (confirmed via this
  session's own commits) is: implement → test → verify tests fail without
  the fix → restore fix → full suite → build → commit. Keep that bar.
- Update `PRODUCT_STATE.md` as each lane lands — it's the canonical
  "what's true today" doc and this review found it drifts stale quickly
  when systems change without a corresponding row update (see the
  accessibility and multiplayer-row staleness findings above).
