# Sprint 48 plan

**Date:** 2026-09-28 · **Branch base:** `release/v2.4.12-beta-invisible-essentials`
(PR #93, open) · **Status:** active plan, canonical for Sprint 48.

This is the one Sprint 48 plan. It merges three drafts written the same day and checks
their claims against the code:
- [Sprint 47 status and Sprint 48 draft](sprint-47-status-and-sprint-48-plan-2026-09-28.md):
  what shipped, the verification level of each item, the open backlog;
- the first version of this file: tracks for the Foundry, companion, co-op pings,
  HUD and hardware;
- the [HUD overlay review and recovery plan](hud-overlay-review-and-recovery-plan-2026-09-28.md):
  measured Deck readability failures and the R0–R4 recovery order.

For **what Sprint 47 delivered**, read the status doc. This file is the forward plan.

---

## 1. Where we start

- **Nothing built since the 2026-09-24 QA session has been confirmed on hardware.**
  Co-op networking, the spawn guard, Deck input, the map rules and the full-quality
  performance work all rest on unit and browser evidence.
- **Deck performance is unknown for the current build.** The last Deck capture (09-24,
  an older build) had a 29.4 ms render median with 35 % of the session in long tasks.
  Since then game logic is down from 42.0 to 13.3 ms per frame (headless), and full
  resolution and shadows are back. The net effect on the Deck has not been measured.
- **The dock HUD is not ready.** The 09-28 review measured, for the Tank on the Deck:

  | Measured | Target |
  | :--- | :--- |
  | smallest text 7.2 px | 11 px |
  | weapon window 20.9 px wide | — |
  | band 150 u tall | 64 u |

  Class window geometry also differs, and the old objective column still fills a third
  of the Deck screen. The 150 u band was a stop-gap to fit the thick painted frames; it
  traded the narrow-band goal for fitting the art, and readability lost. Classic stays
  the default.
- **Already built, which the first draft of this plan missed:**
  - companion A* pathfinding, stuck re-pathing and a steady basic shot (`05c4300`:
    `src/companionPath.js`, `stepCompanionAlongPath`, `fireCompanionBasicShot`);
  - AgX tone mapping and PMREM reflections, present since the Phase A render work and
    never cut.

## 2. Goal and exit criteria

**Goal:** prove Sprint 47 on the owner's Deck and PC, finish "the host decides,
everyone sees it" for co-op, make the dock HUD readable, and ship the first slice of the
unified Foundry.

The sprint is done when all of these hold:
1. The hardware session (§3, P0) is run and every row has pass/fail and a log. Failures
   are fixed or carried with an owner.
2. PR #93 is merged. The owner has closed the milestone tickets whose conditions were
   shown (#78, #80, #81, #82, #85).
3. A two-client diff probe passes for drops, props, deaths, TRY AGAIN, companions and
   Ring 1 events.
4. The HUD harness (R0) fails today's dock for the right reasons. After R1–R2 it passes
   all three classes at 1280×800 and 1920×1080 with 11 px minimum text.
5. One item catalog drives the Armory, Foundry, hero screen and Vault cards, and a
   smelter trade-up sticks across close and reopen.
6. The 35–45 minute Proof Run is recorded on hardware. If it slips, the blocker is
   written down.

## 3. Work, in priority order

### P0: hardware acceptance (first two days)

Package PR #93's head and run the owner's Deck + PC session. Every row gets pass/fail
and the exported session log (in `logs/`, analysed with
`scripts/analyze-session-logs.mjs`).

| Row | Pass when |
| :--- | :--- |
| **Deck frame pacing**, 20 minutes solo | gameplay frame-interval p50 ≤ 33 ms (30 fps floor), stretch ≤ 16.7 ms; `frame:render` median ≤ 16 ms; no long task ≥ 500 ms after boot; log shows `postprocessing: true` and full-quality settings |
| **PC frame pacing** | frame-interval p50 well below the 09-25 log's ~48 ms; `adaptive-resolution-kept-cpu-bound` explains any slowdown |
| **Co-op: deaths and black boxes** | partner sees the body where it fell and the owner's black box |
| **Co-op: drops and props** | the same power-up drop and the same prop breaks on both screens |
| **Co-op: TRY AGAIN / new deploy** | TRY AGAIN keeps map and changes; a new lobby deploy is a new map |
| **Spawn guard** | no death at the spawn cliffs; far cliffs still lethal |
| **Map and story rules (solo)** | TRY AGAIN same map; MAIN MENU new map; CONTINUE keeps the story |
| **Deck input** | B on the map closes it and nothing else; ☰ stays open; no sprint after leaving a menu; right stick turns right |
| **Mid-expedition suspend/resume** (Invisible Essentials Phase 1) | Deck sleep mid-run, wake, RESUME EXPEDITION restores it |
| **Steam Cloud / achievements / leaderboard** | a round trip, one unlock, one accepted entry |

Anything that fails becomes a P0 fix for the rest of week 1.

### P1: co-op authority ("the host decides, everyone sees it")

Source: QA game plan, "Everything in co-op must be networked".

- **Companions in co-op.** Network the recruited companion: host-owned position, target
  and shots, rendered on both screens. Remove the "companions stay solo in co-op" gate
  (`1dd8056`) once it works.
- **Solo-only Sprint 46/47 systems become host-authoritative:**
  - Ring 1 events (False Distress Signal, Unstable Vault), with the host rolling and
    both clients seeing the choice and outcome;
  - the arrival fight;
  - the bounty;
  - the reward cache, with a per-player or split rule to be decided (§6).
- **Two-client diff probe.** Two headless clients on one relay run a scripted sequence:
  - a kill with a drop;
  - a prop break;
  - a pit-fall;
  - TRY AGAIN;
  - a companion shot;
  - a Ring 1 event.

  It serialises both worlds and fails on any difference.
- **Tactical pings v1** (Invisible Essentials Phase 5, first slice):
  - input: tap a button to ping context (enemy / floor / item / hazard), 6 s marker,
    relayed;
  - the ping wheel and reconnect are **stretch**.
- **Acceptance:**
  - a relay test per new event type;
  - the diff probe green;
  - a ping from client A shows on client B within 100 ms on a local relay.

### P1: HUD dock recovery (R0–R2 this sprint; R3–R4 start if time allows)

Source: [HUD overlay review](hud-overlay-review-and-recovery-plan-2026-09-28.md). Keep
`classic` as the default all sprint.

- **R0: make the harness authoritative (first).** Extend `tests/e2e/hud-layout.spec.js`,
  or add a screenshot matrix spec, to cover:
  - 3 classes × 1280×800, 1920×1080, 2304×1440 and 3440×1440;
  - the states: idle, engaged, critical, boss + hazard, reload, cooldown, prompt,
    notification, three objectives;
  - `de` and `ru`, and controller glyphs;
  - these assertions: 11 px minimum text on Deck, no unintended clipping or ellipsis,
    identical content rectangles across classes, opaque-area budget (≤ 7 % Deck,
    ≤ 6 % 1080p) and lower-band height ≤ 64 u excluding temporary prompts.

  **Exit:** it fails today's dock for the known reasons.
- **R1: one shared slim geometry.**
  - Stop generating per-class content rectangles. One semantic slot grid for all
    classes: map 220×64 u, status 520×64 u, arms 380×64 u.
  - Class identity comes from frame material, ornament, accent and state layers.
    Instruments never move between classes.
  - Housing art becomes cap-and-stretch (ornamented end caps, a stretchable middle), or
    is repainted at slim proportions. Owner decision, §6.
  - `scripts/build_hud_dock_housings.py` switches from "detect windows, place content"
    to "fit art around the fixed grid". It exports a **window template** per panel (the
    exact empty-glass boxes) for the painter to paint around.
  - Radar scan moves to the ring on the map disc. The arms panel holds weapon, ammo
    (largest type in the band), reload, class ability, and dash/melee.
  - Loot is icon + number with accessible labels, never bare glyphs.

  **Exit:** all three classes pass one geometry snapshot, Deck critical text is
  ≥ 11 px, and the core combat state still reads with the frame art switched off.
- **R2: one information architecture above the dock.**
  - One prompt-lane controller: interaction > urgent tutorial > loop guidance, one at a
    time, and every PRESS-E surface moves into it.
  - Replace the right mission column with a one-line primary-objective drawer with a
    `+n` count. It expands on click and while the tactical map is open. One renderer
    covers mission progress, camp quests and the objective tracker.
  - An exclusive alert lane: boss > hazard > Queen's Ledger, queued, not stacked.
  - Notifications anchor under the drawer, capped in height.

  **Exit:** no permanent right-side column in normal play; the three-objective Deck
  state stays within budget.
- **R3 (start only once R1–R2 pass):**
  - the four-second combat signal, which assigns the `this.inCombat` field the game
    already reads but never sets;
  - a pure state resolver: Idle / Engaged / Critical / Reloading / Ability Ready /
    Frozen / Toxic / Boss / Dead;
  - distinct feedback for damage, low O₂, reload completion, ability ready and pickups,
    respecting reduced motion.
- **Sprint 48 stretch, only after R1 and R2 pass:** wear model v1 (`suitCondition` +
  blood, frost and damage tier 1 for one class). Overlays never cover instruments; HUD
  style/layout ≤ 0.3 ms per frame.
- **Moved to Sprint 49:**
  - talking portraits;
  - event housings;
  - wear for all classes, if v1 didn't land;
  - flipping the default to `dock`.

  They depend on R1's geometry. The flip also needs R0–R4 plus a one-week opt-in
  comparison, per the review.

### P2: the unified Foundry, first slice (tickets #80, #82; QA P1)

- **One item catalog** (`src/data/itemCatalog.js`): `id`, `nameKey`, `rarity`, `kind`,
  `class`, `modelUrl`, `iconUrl`.
  - The Armory, Foundry, hero screen and Vault cards all read it.
  - Resolve the six Foundry-only weapons (`mk1_sidearm`, `pulse_carbine`,
    `scatter_rep`, `rail_marksman`, `neon_smg`, `cryo_lance` in
    `src/fieldWeapon.js` / `src/fabricator.js`): give each a model and icon, or map it
    to a canonical class weapon.
  - Retire the shared `schematic_00–07` placeholder images.
- **Hub skeleton:** one modal with tabs Stash / Loadout / Fabricate / Trade-up / Store.
  - Fabricate stays locked until unlocked in a playthrough, with resources always
    visible.
  - Armory look, class-themed. Accent colours follow the style bible: Scout teal,
    Tank amber, Engineer orange/brass; green stays reserved for alien biology.
  - Tabs may start by embedding the existing screens.
- **Smelter trade-up:** add logging first (inputs consumed, output granted, inventory
  response), then fix it so the result appears immediately and survives close and
  reopen.
- **Acceptance:**
  - a catalog unit test: every id resolves to the same name, rarity and icon on all
    four surfaces;
  - a browser probe for the trade-up.

### P2: companion escort (QA P1, rescoped)

Pathfinding, stuck recovery and steady fire exist. Remaining:
- **Escort-to-camp:** leading a recruited companion into the player's camp settles it
  as a resident with ambient lines.
- **Assist ability** on an independent cooldown.
- **A journey probe:** the companion behind a wall reaches the player within 5 s without
  relocating, follows through three rooms, and engages a hostile.
- **Co-op networking** is under P1 co-op authority, above.

### P2: the Proof Run (end of sprint)

A continuous 35–45 minute new-player run on hardware, from fresh spawn through the
Ring 1 milestones to extraction or an ending. Record video plus the session log in
`docs/reports/`. It runs on the **classic** HUD: dock readiness is not a dependency.

### P3: only if P0–P2 are on track

- **Performance:** chunk-mount spikes (`syncVisibleChunks` up to ~60 ms); instance
  pickups and props (1,000–2,000 draw calls on the PC), with no visual change.
- **Invisible Essentials Phase 6** (in-expedition build decisions: a field workbench at
  camps). Claimed by Claude; start only if the P1 lanes are done.
- **Gameplay Phase 4 remnants:** boss phase conversion for `boss_cybersnail` /
  `boss_cryosnail`; expedition report expansion; decide Lane 2's formation damage rule
  (apply it in the runtime, or label the audit table as design intent).
- **Actions raise infection** (hive verbs, bio/caustic hits, spores, eggs aboard),
  feeding `infectionLoad`.

## 4. Order and dependencies

| When | Lane: hardware and co-op | Lane: HUD | Lane: Foundry and companion |
| :--- | :--- | :--- | :--- |
| Days 1–2 | package; owner's Deck + PC session; triage | R0 harness | item catalog data model and unit test |
| Days 3–5 | P0 fixes; co-op authority design + relay tests | R0 lands (failing baseline); R1 slot grid with plain frames | catalog wired into the four surfaces; smelter logging |
| Week 2, first half | companions + Ring 1 events host-authoritative; diff probe | R1 art fit (templates → owner/painter); R2 prompt lane + objective drawer | hub skeleton tabs; trade-up fix; escort-to-camp |
| Week 2, second half | pings v1; merge PR #93 after P0 passes | R2 alert lane + notifications; R3 if green | companion journey probe; Proof Run on hardware |

Dependencies:
- **Merging PR #93** waits on the P0 session.
- **The Proof Run** waits on the P0 fixes, not on the HUD.
- **R1 housing art** waits on the owner's choice between cap-and-stretch and repaint.
- **Wear and portraits** wait on R1 (Sprint 49).

## 5. Lanes (claim before starting)

Several agents work this branch. Claim a lane here in a commit before editing its
files, and run `git status` before every edit. Don't sweep other agents' uncommitted
files into your commits.

| Lane | Scope | Owner | Since |
| :--- | :--- | :--- | :--- |
| A | P0 hardware support + co-op authority + pings | — | — |
| B | HUD recovery R0–R3 | Codex | 2026-09-28 |
| C | Foundry catalog/hub + smelter + companion escort | — | — |

## 6. Decisions needed from the owner

The options and a recommendation for most of these are written out in the status
doc's [§5](sprint-47-status-and-sprint-48-plan-2026-09-28.md) (D1–D8).

1. **Housing art for the slim band:** slice the current painted housings into caps and a
   stretchable middle, or repaint at slim proportions from exported window templates?
2. **The reward cache in co-op:** per-player rolls or one shared, split cache?
3. **Deck frame target:** is a 30 fps floor with 60 as a stretch acceptable for
   Sprint 48 sign-off?
4. **Is "trade in / trade up" the smelter?**
5. **Invisible models:** which objects, in which rooms?
6. **Remove `public/ui/suit/`** (4.1 MB of superseded procedural panels and edge-check
   images, unused but shipped)?
7. **Blood on the HUD:** keep the wear model (dries, wiped at the bunker or a heal
   station). An earlier draft of this file said "fades over 12 s", which contradicts
   it.
8. **The two moderate Dependabot alerts:** fix on the release branch or on `mothership`?

## 7. Risks

| Risk | Mitigation |
| :--- | :--- |
| The hardware session finds more than a week of fixes | P0 takes the capacity; the P2 Foundry and Proof Run slip first |
| Agents overwrite each other's work (seen in Sprint 47: a checkout reverted an uncommitted dependency bump; a broad commit swept up other lanes' files) | claims table; commit small and often; stage by path; never `git checkout .` or stash others' work |
| HUD art is made again before the geometry is fixed | R1 exports window templates first; art requests reference them |
| Co-op authority changes break solo behaviour | solo keeps the local path behind `isMultiplayer`; the existing solo unit tests plus the slice probe must stay green |
| Deck still can't hold 30 fps at full quality | profile on hardware first (the CPU is the suspect); never cut visual quality (owner rule), and keep the adaptive resolution-only tier |
