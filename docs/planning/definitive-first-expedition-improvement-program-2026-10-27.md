# Definitive First Expedition improvement program

**Date:** 2026-10-27

**Branch:** `dev/sprint-53`

**Status:** execution plan; implementation claims remain subordinate to
[`PRODUCT_STATE.md`](../../PRODUCT_STATE.md)

**Target experience:** one legible, performant, replayable 35–45 minute
expedition on desktop, Steam Deck, and two-account co-op

## 1. Executive decision

Hunker Bunker does not need another layer of feature breadth before release
proof. It already has the required expedition, enemy roles, relics, camp
recalibration, faction state, crossings, extraction, co-op, PvP, and ending
structure. The current problem is **coherence under play**:

- the player can encounter a threat before understanding the practical answer;
- important equipment can exist without looking immediately usable;
- build choices are mechanically real but their combat consequence can be
  easier to miss than their menu text;
- the world has extensive authored material, but a room's function, route, and
  promise are not always readable at its threshold;
- co-op and PvP systems pass automation while the complete packaged journeys
  still lack required human and hardware proof;
- the October 27 playthrough measured 9.4 fps on Deck, 20–26 fps on the test
  PCs, and a 36.5-second deployment block, so presentation quality cannot yet
  reliably reach the player.

The program therefore adopts one rule:

> **Coherence before breadth. Every improvement must make the existing Proof
> Run easier to read, more satisfying to act on, or more reliable to complete.**

This is not a rewrite. It is a bounded integration and proof program around the
game that already exists.

## 2. Source-of-truth hierarchy

When older proposals disagree, use this order:

1. [`PRODUCT_STATE.md`](../../PRODUCT_STATE.md) for what is implemented and
   what evidence is still owed.
2. [`game-outline-and-proof-run.md`](../design/game-outline-and-proof-run.md)
   for the current player-facing expedition shape.
3. [`one-more-ring-design-pillars.md`](../design/one-more-ring-design-pillars.md),
   the [art style bible](../design/art-style-bible.md), the
   [camp narrative style guide](../design/camp-narrative-style-guide.md), and
   the [arching storyline](../design/arching-storyline-and-endings.md) for
   product, visual, narrative, and ending intent.
4. The [Sprint 53 master verification plan](sprint-53-master-verification-and-execution-plan-2026-10-17.md)
   for acceptance routes and evidence.
5. Dated audits and plans as historical evidence, not automatic instruction.

Two previous directions are explicitly superseded:

- Do not expand classes, biomes, currencies, arcade modes, or ending count
  before the Definitive First Expedition passes.
- Do not solve performance by silently removing the authored lighting,
  shadows, composition, or post-processing. First reduce unnecessary CPU work,
  scene submission, material churn, and synchronous deployment work. Any
  quality trade must be measured, visible, and approved with an A/B capture.

## 3. Experience thesis

The mechanical, narrative, and emotional promises are one system:

| Promise | Player question | Required expression |
| --- | --- | --- |
| **One more ring** | Do we leave safely or spend oxygen for a better return? | A crossing previews increased danger and reward before commitment. |
| **Who owns this body?** | Is my suit protecting me, controlling me, or changing me? | Oxygen, armor, infection, equipment, and faction help carry visible costs and authorship. |
| **The world remembers** | Did the expedition change anything beyond a score? | Extraction, death, camp response, faction state, and the four-seat manifest show consequences. |

Every major beat should create at least one of anticipation, decision, payoff,
mastery, surprise, or story. A surface that produces none of them should be
simplified, combined, or removed from the critical path.

## 4. Current evidence and the actual gap

| Area | What already exists | What remains to prove or improve |
| --- | --- | --- |
| First-run teaching | Authored Sector 0 teaches movement, weapon acquisition, salvage, combat, and departure. | A new player completes it without coaching, arrives armed, and can state the next objective. |
| Hazard protection | Distinct hazard HUD, safety actions, antitoxin acquisition, and the newly clarified print → install → active route. | A player exposed to toxins identifies the immediate escape and durable protection route within five seconds. |
| Combat | Hit-stop, directional damage, weapon punch, enemy triangle, Stalker counterplay, and surface/audio feedback. | Each enemy role elicits the intended response during the Proof Run without explanation. |
| Buildcraft | Eight relics, three synergies, and deterministic camp recalibration with before/after comparison. | A player and their peer can describe how the selected modifier changed the next fight. |
| World | Large authored prop, lighting, district, hazard, and environmental-story library. | Rooms communicate function, route choice, threat, and reward at the threshold instead of reading as dressed trays. |
| Return loop | Extraction, Black Boxes, faction state, objectives, endings, and debrief systems exist. | The result screen explains gained, lost, retained, changed, and next pursuit in that order. |
| Multiplayer | PvE/PvP authority and lifecycle paths have broad automation; recent same-build PvE/PvP play completed core combat and results. | Packaged Deck/PC expedition, reconnect, workbench, death, TRY AGAIN, and extraction need two-account proof. Abort semantics and mission ownership must stay unambiguous. |
| Performance | Multiple CPU hot-path reductions, KTX2, layout caching, mixer culling, adaptive resolution, and recent deployment fixes exist. | Re-run the exact failed routes. Deck p95 must be at most 33.3 ms; RTX 2070 p95 at most 16.7 ms; no unexplained stall above 250 ms. |
| Presentation | The Nordic Cathedral Biomech language and Order → Decay → Synthesis progression are defined. | Gameplay readability must consistently survive detail, darkness, effects, and 1280×800 presentation. |

### 4.1 Changes made after the October 27 QA capture

These are implemented hypotheses, not accepted closures:

- `1e53c84a` removes deployment texture waits, presents the first gameplay frame
  through the composer, and keeps prefetched chunks hidden until needed.
- `6dd468e8` places field weapon pickups flat on the ground.
- `dd35ba16` clarifies toxin protection as an explicit print, install, and active
  equipment route.

All three must be exercised in the same packaged play route that exposed the
original problem. A code diff does not close the corresponding finding.

## 5. Player comprehension grammar

Use one consistent sequence for every critical system:

1. **Signal the threat or opportunity.** Use world shape, sound, restrained
   color, and a short HUD label.
2. **Name the immediate action.** Tell the player what prevents the next harm
   now: leave the pool, illuminate the Stalker, collect the sidearm, or return
   to breathable space.
3. **Reveal the durable answer.** Point to the equipment, upgrade, route, or
   cooperation that changes future decisions.
4. **Make acquisition physical.** The item lies, hangs, sockets, or installs in
   a believable place and orientation.
5. **Confirm state change.** Show a short world/HUD/audio confirmation and the
   active benefit or tradeoff.
6. **Test mastery soon.** Present a safer repeat followed by a meaningful
   pressured use.

This pattern should govern weapons, toxins, oxygen, cold, Stalker light
counterplay, recalibration, ring crossings, extraction, and Black Box recovery.
It prevents a warning from becoming a detached tutorial paragraph.

At any moment in the Proof Run, the HUD should prioritize no more than:

- one primary objective;
- one optional opportunity;
- one survival state requiring action.

Additional lore, goals, and economy detail remain available through the map,
terminal, codex, and debrief rather than competing with the current action.

## 6. The 35–45 minute target journey

### 0–3 minutes: briefing and custody

- Establish who sent the operator, what must be recovered or learned, and why
  oxygen limits the attempt.
- Put the next physical destination in the world and on the HUD.
- Give one early line that frames the suit as both protection and control.
- Success: the player can say, in plain language, “I am going there to do this,
  and oxygen is the clock.”

### 3–8 minutes: orientation and readiness

- Teach movement, interaction, firing, pickup, salvage, and banking through
  world actions.
- A field weapon must read as a usable weapon from silhouette and placement:
  flat/resting, clean interaction clearance, restrained pickup light, and
  correct glyph.
- Prevent accidental unarmed deployment, or make the intended scavenger start
  explicit and place its weapon acquisition inside the first safe sightline.
- Introduce toxin exposure only with an immediate safe response available.

### 8–15 minutes: first tactical commitment

- Use one encounter recipe with clearly separated enemy jobs, not an undirected
  crowd.
- Make the threat's source, telegraph, damage direction, and counteraction
  agree across world, HUD, and audio.
- Place the first optional reward where taking it visibly costs oxygen, safety,
  or route position.

### 15–22 minutes: first camp and crossing

- Camp is a change in rhythm: safety, labor, one dense relationship beat, and
  one consequential preparation choice.
- Recalibration closes into the real workbench: select → socket/install → pulse
  and sound → readable upside/downside → control returned. Do not apply the
  mechanical result twice.
- The crossing names what gets harder and previews the class of reward that
  gets better before the player commits.

### 22–32 minutes: build expression

- The next encounter should let the selected relic or recalibration solve a
  problem differently.
- Feedback should show the effect in combat, not only in inventory text.
- In co-op, the peer sees the relevant selection and a restrained effect cue
  without receiving a forced camera or modal.

### 32–40 minutes: escalation and ownership

- Combine two known enemy jobs, one environmental pressure, and one route
  decision. Do not introduce several new rules at once.
- Faction or hive assistance should feel like accepting custody, obligation, or
  transformation—not a neutral vending transaction.
- Reveal a visible consequence in the operator, suit, room, or manifest.

### 40–45 minutes: extract or spend the breath

- Make the “one more ring” offer concrete: projected reward, oxygen cost/risk,
  and the route home.
- Extraction becomes a short authored ritual with urgency, response, and
  release, not merely a button and fade.
- Debrief order: condition/survival → gained/lost/retained → build impact →
  world/faction change → next ship objective → next lead.

## 7. Prioritized workstreams

### P0-A — First-run clarity and survival literacy

**Goal:** a fresh player can act without live coaching.

Deliverables:

- Run Sector 0 with three fresh profiles and record confusion timestamps.
- Validate weapon placement, prompt clearance, pickup animation/state, ammo,
  and equipped confirmation on keyboard, controller, and Deck.
- Validate the toxin loop in four states: first exposure, immediate escape,
  protection acquisition/install, and protected re-entry.
- Use redundant status communication: icon/shape + short label + restrained
  color + sound. Never rely on green alone.
- Add a short “protection installed” acknowledgement and persistent equipment
  state where the player already looks for suit status.
- Verify skip grants enough equipment and currency to avoid a soft start.
- Remove or defer prompts that do not support the next required action.

Acceptance:

- Three of three fresh players acquire and use a weapon without help.
- Three of three leave first toxin exposure before a second avoidable damage
  tick and can later identify where durable protection comes from.
- Each can state the current objective and oxygen response at minute eight.

### P0-B — Frame pacing and deployment latency

**Goal:** preserve the authored look while making it consistently playable.

The evidence points to a CPU/main-thread limit rather than raw GPU capacity:
GPU time was small while presented frames were extremely slow. Treat asset
size as relevant to parsing, upload, material count, and object count—not proof
that the GPU itself is saturated.

Execution order:

1. Re-run the October 27 fixed route after `1e53c84a`; split boot, lobby,
   deploy, first-frame, and steady-state timings.
2. Add long-task attribution around world construction, GLTF parse/clone,
   texture transcode/upload, shader/program creation, DOM/layout, and network
   reconciliation.
3. Capture a CPU profile in a representative dense room. Rank work by total
   milliseconds, not call count.
4. Reduce scene submission: instance repeated static props; merge safe
   architectural trim; eliminate hidden prefetched nodes from traversal;
   share materials; avoid per-frame matrix work on static objects.
5. Time-slice noncritical construction and prewarm only the programs needed by
   the first visible room. No synchronous “load everything before control.”
6. Move safe queries to event-driven or lower-frequency updates: decorative
   raycasts, offscreen mixers, ambience, and noncritical layout inspection.
7. Re-profile after each class of change. Stop optimizing a category when it
   is no longer in the top measured costs.

Budgets and gates:

| Gate | Required result |
| --- | --- |
| Steam Deck fixed 25-minute route | presented p95 ≤ 33.3 ms; no sustained section below 30 fps |
| RTX 2070 fixed route | presented p95 ≤ 16.7 ms |
| Deployment | no unexplained main-thread block > 250 ms; deploy-to-control timing recorded separately |
| Dense representative view | draw calls, visible triangles, scene nodes, programs, active lights, and long tasks attached to evidence |
| Visual safety | same-location captures show no lost route cue, interaction cue, enemy telegraph, or approved style-defining light |

### P0-C — Co-op trust and complete journey

**Goal:** both players believe the same expedition happened.

Deliverables:

- One authoritative owner for objective progress, abort, extraction, death,
  retry, world events, drops, and recalibration state.
- Explicit abort copy that states whether it affects only the local player or
  the whole squad before confirmation.
- Stable remote interpolation without large companion snaps; record correction
  magnitude and frequency.
- Unique quest/objective identifiers and one marker per live objective.
- Deck-safe modal height and controller navigation at 1280×800.
- Paired evidence for host and guest through workbench, one death, Black Box,
  reconnect, TRY AGAIN, and extraction.

Acceptance is `[2P]` packaged proof, not two browser tabs or automation alone.

### P1-D — Combat readability and game feel

**Goal:** the player reads cause, response, and payoff inside the fight.

- Compose encounters from jobs: pressure, displacement, flank, protection,
  denial, or pursuit. Avoid adding enemies that only differ by health and skin.
- Keep telegraph timing, effect origin, damage direction, and death report
  semantically consistent.
- Give each critical counter a discoverable low-pressure rehearsal before a
  combined encounter.
- Preserve short hit-stop and camera trauma as punctuation; cap stacking so
  clarity and input response survive swarm combat.
- Test reduced-motion and low-visibility alternatives for every essential cue.

### P1-E — Builds that alter decisions

**Goal:** a build is remembered as a changed play style, not a percentage list.

- Keep the existing relic/recalibration system; do not create another upgrade
  economy.
- Phrase cards as changed action, upside, downside, and synergy.
- Preview before/after values only when the comparison is meaningful.
- After installation, schedule a nearby encounter or prop interaction that
  demonstrates the selected behavior.
- At debrief, report the most-used synergy or equipped components and one
  concrete effect produced during the run.
- Passive effects belong in equipment/status surfaces, not permanent competing
  HUD panels.

### P1-F — World rhythm, landmarks, and functional rooms

**Goal:** the bunker feels built, occupied, repaired, worshipped, fought
through, and lost—not procedurally decorated.

For each important room define:

1. primary function;
2. dominant silhouette;
3. spatial verb (cross, descend, circle, hold, sneak, climb, defend);
4. visible promise;
5. meaningful state change.

Apply these constraints:

- rhythm: safe orientation → connector → glimpse → functional room → choice or
  loop → danger → state change → shortcut or quiet release → changed hub;
- no more than two connectors without a vista, decision, or event;
- composition target: roughly 60% navigation/quiet, 30% functional cluster,
  10% story accent;
- use three major shapes and density islands instead of uniform scatter;
- light reveals navigation and function; sound pulls before light confirms;
- one dominant ambient motion per room;
- preserve interaction clearance and combat lanes before decorative density.

Prioritize one exemplary room in each of the Broken Spine, Lived-In Hold,
Pressure Works, Cryo Wound, Wet Hive, and Machine Cathedral districts before
expanding overall prop count.

### P1-G — Return, camp, and narrative consequence

**Goal:** returning changes the player's understanding and next decision.

- Build camp scenes from the established five beats: Body, Work, Power,
  Intimacy, Choice.
- Put labor before exposition and use fewer, denser conversations.
- Keep CAPS for radio/authority/distance and mixed case for in-person speech;
  quieter/private moments become typographically quieter.
- Advance relationships through first encounter/power, second/shared work,
  third/noticing transformation, then post-reveal tests of entitlement.
- Make faction aid visibly claim something: access, obligation, body, memory,
  or a future seat.
- Add a clear four-seat manifest readout when story state begins allocating
  seats. It must show capacity, assignment pressure, and irreversible decisions
  without spoiling unseen outcomes.
- Treat the Queen's two-seat cost as a central dramatic fact, not a late rules
  surprise.

### P1-H — UI, controller, and accessibility cohesion

**Goal:** all critical surfaces feel like one game and remain operable on Deck.

- Treat 1280×800 as the canonical layout stage and preserve its safe frame.
- Every visible card or action must be focusable; a locked action must expose
  its reason to controller users.
- Keep critical modal content above the fold; use deliberate secondary pages
  instead of nested scrolling.
- Show exact before/after values where choices spend scarce resources.
- Retain stable IDs, localization keys, input actions, and existing working
  paths while reskinning or consolidating.
- Use carved monumental capitals for short headers and a clean condensed sans
  for body/HUD text. Legibility outranks ornament.

## 8. Art and presentation guardrails

The visual target remains **Nordic Cathedral Biomech**: National Romantic and
Jugendstil monumentality, blackened iron, carved interlace, frost glass, bone,
rib, vertebra, corporate liturgy, and biology emerging from seams, joints, and
cracks rather than pasted across clean faces.

Map the three visual states onto play:

| State | Gameplay use | Readability rule |
| --- | --- | --- |
| **Order** | ship, Meridian, intact infrastructure, briefing | rectilinear mass, restrained practical light, clean hierarchy |
| **Decay** | breached bunker, failed labor, contested routes | damaged repetition, exposed repair, negative space, readable route scars |
| **Synthesis** | hive influence, infection, transformed operator/world | biology grows from structural logic; silhouette and interaction remain readable |

Additional rules:

- Menu and corporate surfaces are calm and monumental; camps add repaired folk
  craft and task light; hives fuse structure and anatomy rather than becoming
  undifferentiated slime.
- Use bone ivory, soot-black metal, bruised flesh, restrained amber practicals,
  and sparse teal/green diagnostics with semantic consistency.
- Preserve dark negative space, but never hide the next traversable threshold,
  interactable, weapon, enemy telegraph, or extraction path.
- Props and cutscene inserts follow the current hand-inked, painted
  graphic-novel horror direction where specified; do not drift into generic
  glossy sci-fi or soap-opera framing.
- Mature body horror must remain solemn, authored, and compliant with the
  style bible's content boundaries; shock cannot replace gameplay purpose.

## 9. Implementation phases

### Phase 0 — Baseline and freeze (1–2 days)

- Freeze expansion work that does not serve the Proof Run.
- Package the current branch and repeat the failed October 27 route.
- Record build SHA, devices, resolution, route timestamps, profiles, video, and
  telemetry bundle.
- Create a single confusion/performance timeline so design and engineering work
  from the same moments.

Exit: reproducible baseline and named owners for every P0 finding.

### Phase 1 — Readiness and hazards (2–4 days)

- Validate the weapon-orientation and toxin-guidance changes.
- Resolve unarmed-deploy ambiguity and complete the threat → action → durable
  answer → install → confirmation cycle.
- Run fresh-player desktop/controller checks before widening scope.

Exit: P0-A acceptance met on desktop; Deck layout route ready.

### Phase 2 — Main-thread performance (time-boxed profiling cycles)

- Execute P0-B in measured slices: deployment, first visible room, dense combat,
  camp, crossing, extraction.
- Land only changes with before/after profiles and same-location visual checks.
- Re-run the fixed route after each meaningful cost category changes.

Exit: Deck and PC performance gates pass on packaged builds.

### Phase 3 — Complete co-op authority route (3–5 days)

- Close objective/abort ownership and remaining companion correction issues.
- Verify workbench, death, Black Box, reconnect, retry, and extract with two
  accounts and controller-only Deck host navigation.

Exit: P0-C `[2P]` evidence attached.

### Phase 4 — Expression pass (one bounded sprint)

- Tune the Proof Run's encounter sequence around existing enemy roles.
- Add install payoff and next-fight build demonstration.
- Recompose six landmark rooms using functional anatomy and district rhythm.
- Integrate body custody, faction consequence, and manifest visibility into
  existing beats rather than adding a parallel lore campaign.

Exit: players can describe one enemy counter, one build-caused decision, one
world consequence, and the extract/push choice.

### Phase 5 — Human proof and release decision

- Run three uncoached fresh-player sessions, one controller-only Deck journey,
  and one two-account expedition.
- Record comprehension answers, failure points, performance, and accessibility
  observations.
- Fix only release-blocking failures; log optional polish separately.

Exit: every item in the Definitive First Expedition contract has the correct
evidence mark in `PRODUCT_STATE.md`.

## 10. Telemetry and playtest evidence

Add or confirm event coverage for:

- objective shown, acknowledged, replaced, completed, and abandoned;
- first weapon visible, prompt shown, pickup, equip, first shot;
- hazard enter/exit, warning shown, first damage, safety reached, protection
  discovered, printed, installed, activated, and protected re-entry;
- camp arrival, recalibration options, choice, install complete, subsequent
  effect activation;
- crossing preview, commit/cancel, oxygen at commit, return decision;
- extraction started/completed/failed and abort scope;
- co-op authority correction, reconnect reconciliation, companion snap size;
- frame p50/p95/p99, presented frames, long tasks with labels, deployment phase
  timings, scene nodes, draw calls, visible triangles, programs, and lights.

At the end of each uncoached session ask only evidence-producing questions:

1. What was your primary objective?
2. What threatened you, and what did you do about it?
3. How did your build change the way you fought?
4. Why did you take or refuse the deeper route?
5. What changed when you returned, and what would you pursue next?
6. Who seemed to have a claim on your operator's body, and why?

Do not coach during the route. Mark the first moment of confusion and let the
player attempt recovery; recovery quality is part of the product.

## 11. Ticket disposition

Ticket numbers follow the current Sprint/QA documents and must be reconciled
against the live tracker before closing.

| Ticket/theme | Plan disposition | Closure evidence |
| --- | --- | --- |
| `#52` performance | Keep open | Packaged fixed-route Deck and PC thresholds pass after the deployment fix. |
| `#53` co-op/PvP acceptance | Keep open | Required PvE and PvP route rows complete on two real devices/accounts. |
| `#51` Deck/controller journey | Keep open | Controller-only Title → Sector 0 → camp → extraction → debrief passes at 1280×800. |
| `#85` / `#77` mission/companion trust | Close only reproduced findings individually | Objective ownership is unique; correction metrics and paired video show acceptable remote motion. |
| `#45` broader release readiness | Keep open as umbrella | All subordinate evidence is attached; no external gate is represented as locally complete. |
| Weapon pickup orientation | Candidate for closure | Same packaged world pickup lies correctly and remains interactable on flat and uneven floors. |
| Toxin protection clarity | Candidate for closure after human test | Fresh player escapes exposure and obtains/installs protection without coaching. |
| Deployment stall | Candidate for closure after profiling | No unexplained >250 ms main-thread stall on the same route and hardware. |

Never close a hardware, comprehension, or two-account ticket solely from a
source inspection or automated test.

## 12. Non-goals

Until the program exits Phase 5, do not add:

- another class, biome, faction, currency, arcade game, or ending family;
- a replacement combat, inventory, or upgrade architecture;
- uniform prop density or a bulk asset drop without a room-function brief;
- permanent HUD panels for every passive system;
- cinematics that interrupt first-contact enemy grammar;
- performance modes that quietly erase the visual identity;
- lore exposition that does not affect a choice, relationship, route, or
  consequence in the Proof Run.

## 13. Definition of done

The improvement program is complete when:

- three fresh players finish the 35–45 minute route without coaching and can
  accurately explain objective, oxygen, hazard response, build, crossing, and
  extraction;
- weapon and protection acquisition are physically legible and controller
  reachable;
- the Deck and PC fixed-route performance gates pass with profiles attached;
- a two-account packaged co-op journey completes the required lifecycle;
- the build visibly changes a combat decision;
- at least six landmark rooms pass the three-second threshold test;
- the debrief communicates gained, lost, retained, changed, and next pursuit;
- body custody and the four-seat pressure are visible through play rather than
  dependent on a lore document;
- all presentation remains inside the established art, narrative, UI, mature
  content, and accessibility guardrails;
- `PRODUCT_STATE.md` is updated only with evidence-backed marks.

## 14. Research basis

This plan consolidates, rather than replaces, the following work:

- [Definitive Proof Run](../design/game-outline-and-proof-run.md)
- [One More Ring design pillars](../design/one-more-ring-design-pillars.md)
- [Art style bible](../design/art-style-bible.md)
- [Camp narrative style guide](../design/camp-narrative-style-guide.md)
- [Arching storyline and endings](../design/arching-storyline-and-endings.md)
- [World-design doctrine](world-design-doctrine-n64-lessons-2026-10-10.md)
- [UI surfaces, menu map, and controller navigation](../design/ui-surfaces-menu-map-and-controller-navigation.md)
- [Equipment effects and visual sockets](equipment-effects-and-visual-sockets-plan-2026-09-21.md)
- [Camp interaction and cinematics audit](camp-interaction-and-cinematics-audit-2026-10-16.md)
- [Gameplay feature review](gameplay-feature-review-2026-09-24.md)
- [Sprint 53 performance plan](sprint-53-plan-2026-10-15.md)
- [Sprint 53 master verification plan](sprint-53-master-verification-and-execution-plan-2026-10-17.md)
- [October 26 co-op review](qa-2026-10-26-coop-playthrough-pr-review.md)
- [October 27 PvE/PvP playthrough](qa-2026-10-27-pve-pvp-playthrough.md)
- [Historical gameplay FPS findings](../log13-gameplay-fps-findings-and-fix-plan-2026-08-20.md)
- [Earlier broad gameplay/tutorial plan](aaa-gameplay-juice-story-tutorial-and-arcade-expansion-plan-2026-10-16.md), used only where it agrees with the newer product state and bounded Proof Run.

## 15. Implementation log

Code changes made against this plan. Each is a hypothesis until the matching
evidence in §10–§11 exists; none of them closes a ticket by itself.

### 2026-10-28 (overnight, `dev/sprint-53`)

| Workstream | Change | Commit | Evidence still owed |
| --- | --- | --- | --- |
| P0-A / P0-C | PvP rounds put the class gun in hand at gameplay-ready and never start the Sector Zero tutorial (its unarmed rack start lost the Deck a round). | `73f8ca3f` | `[2P]` PvP round on Deck + PC: both armed at first frame. |
| P0-A | Every field-weapon equip is logged (`WEAPON field-weapon-equipped`); the analyzer prints the first equip time. | `73f8ca3f`, `502c359c` | Next uploaded logs show `armed: firstEquip=`. |
| P0-C | Abort confirm names its scope: co-op, only you leave; PvP, the relay awards the round. The October 27 "abort ends the squad" finding was wrong (the host aborted separately) and is corrected in the QA doc. | `73f8ca3f` | `[2P]` co-op abort: guest leaves, host keeps playing. |
| P1-H | Unaffordable and used workbench choices are `aria-disabled` + `data-controller-focusable`, so a pad can reach them and read the shortfall. | `73f8ca3f` | Controller-only workbench visit on Deck. |
| P0-A | Oxygen and cold name the immediate escape and the durable answer (repair/upgrade the O₂ generator, live class-discounted cost); ≥20% installed protection is confirmed instead. Act 2 hazard walls announce themselves and point at the Substation Keycard. Detail wraps to two lines. | `45532bd8` | Fresh-player test: names the O₂ answer at minute eight. |
| P1-E | Every module/charm install (Foundry and Armory) shows where it went, its mount, and before → after per stat, e.g. `PRESSURE SEAL INSTALLED IN SUIT BAY A · CHEST · O₂ DRAIN 1.00 → 0.75 · HEALING RECEIVED 1.00 → 0.60`. | `9e5e05d1` | Player can state what the install changed. |
| P1-E | The debrief build line names installed suit modules instead of "no field upgrades". | `50ba2c2e` | — |
| §5 | The single prompt lane ranks the optional camp quest below the required step and the zone prompt (it was ranked urgent). | `e80eceaf` | Proof Run capture: one primary, one optional, one survival state. |
| P0-B | GLB budget gate: all 699 runtime models measured from their headers; the 47 already over budget are baselined and may not grow; new over-budget models fail the suite (`npm run audit:glb-budgets`). No LOD rule: the engine has no LOD system to consume one. | `502c359c` | — |
| P0-B | Per-platform scene budgets (visible chunks 9; draw calls, triangles, programs per Deck/PC), checked every frame-breakdown window and logged as `PERF scene-budget-exceeded`; the analyzer reports worst overages. | `502c359c` | Fixed-route Deck + PC captures with zero overage windows. |

Not started here, needing hardware or a free GPU: the CPU profile of the
deployment stall and dense rooms (§7 P0-B steps 2–6; the GPU was busy with the
overnight cinematic render), remote interpolation metrics, and every `[2P]` row.
