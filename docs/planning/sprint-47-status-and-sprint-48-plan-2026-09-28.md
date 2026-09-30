# Sprint 47 status and the Sprint 48 plan (2026-09-28)

Branch `release/v2.4.12-beta-invisible-essentials` → PR #93 (open, mergeable;
v2.4.12-beta). Sources: the branch history (`git log origin/mothership..`), the
2026-09-24 Deck + PC QA session (`qa-2026-09-24-deck-pc-coop-game-plan.md`), the
2026-09-25 PC log, the 2026-09-28 live HUD comparison
(`hud-overlay-review-and-recovery-plan-2026-09-28.md`), and the plan documents linked
below.

**Verification levels:**
- **Unit**: vitest.
- **Browser**: Playwright against a static build, headless.
- **Hardware**: the packaged game on the owner's Steam Deck and PC.

Almost everything below has only unit or browser evidence. **Nothing done since the
2026-09-24 QA session has been confirmed on hardware yet.** That session is the
first job of Sprint 48.

Checks at the reviewed code head (`ffbd480e`; documentation consolidation at
`8be6b7cd`):
- `npm run lint`: clean;
- vitest: **4,285 tests / 483 files**, green;
- `vite build`: passes;
- `tests/e2e/hud-layout.spec.js`: 4/4.

---

## 1. Done this sprint

### Ring 1 vertical slice (Sprint 47 three-lane split)

| Item | Commits | Evidence |
| :--- | :--- | :--- |
| Ring 1 event pool, cross-lane contract registry, repetition guard; events in the runtime; report items | `a12028f`, `e0ad74b`, `e1d47fd`, `2d2dfd4` | unit; slice probe 9/9 (`docs/reports/sprint-47-ring1-slice-2026-09-24.md`) |
| Lane 2: coordinated encounters, boss phase conversions | `6157ff4` | unit; audit (see §3: formation damage rule not in runtime) |
| Lane 3: status effects, synergy chains, Ring 1 reward cache | `1cc7db1` | unit |
| Encounters, synergies, reward cache and expedition resume wired into the runtime | `efcb5ae` | unit + browser |
| Sprint 46 carry-over: arrival fight, bounties that pay, expedition report; crash-site wreckage per landing | `233d2dc`, `cf4132a` | unit |

### Invisible Essentials (`invisible-essentials-2026-09-24.md`)

| Phase | State | Evidence |
| :--- | :--- | :--- |
| 1: solo expedition continuation (suspend / claim / resume) | built | unit + browser probe (`expedition-resume.spec.js`); **mid-expedition resume never tried on the Deck** |
| 2: comfort and pressure controls (camera shake, aim assist, reduced pressure) | done (Gemini, `e511e8e`) | unit |
| 3: legible death: results say why you died and what to do next | done (Claude, `608d2be`, `fe8b7b2`) | unit + browser probe |
| 4: navigation friction and return network | done (Gemini) | unit |

### Co-op: "everything networked" (owner's rule, 2026-09-24)

The host rolls anything random that changes the world, and every client shows it.

| Fixed | Commit |
| :--- | :--- |
| Every co-op death is announced; the partner sees the body and its black box; TRY AGAIN announces the redeploy | `39a7375` |
| Black boxes carry their owner; a squadmate's recovery no longer wipes yours | `39a7375` |
| Power-up drops rolled only by the host and broadcast | `39a7375` |
| Relay budgets: state events 20/s, streamed effects 40/s (was 8/s shared) | `39a7375` |
| TRY AGAIN keeps the run's world changes (walls, doors); MAIN MENU clears them | `42c4bbc` |
| Broken props and their drops identical on both screens | `42c4bbc` |
| Co-op starts without the solo profile's companion | `1dd8056` |
| Each lobby deploy is a new map; TRY AGAIN keeps it | `caf5816` |

Evidence: unit + relay tests. **Not yet seen on two machines.**

### Runs, maps and story (owner's rules)

- TRY AGAIN keeps the map and its changes.
- MAIN MENU ends the run; the next run gets a new map (solo: `d3ec634`, `fcce193`).
- The solo story carries over with CONTINUE; NEW CAMPAIGN resets it. World changes
  count as story.
- Co-op and PvP play a fresh story every run (`de61860`).

Evidence: browser probe `run-maps.spec.js` (TRY AGAIN same seed and layout; MAIN MENU
new map; same campaign).

### Deck and PC fixes from the 09-24 QA

| Fix | Commit | Evidence |
| :--- | :--- | :--- |
| Lethal edges within 24 tiles of spawn block movement (all three co-op deaths were a walk off one cliff) | `7480bd9` | browser: the three death spots blocked on the real map |
| Title screen froze a few seconds after load (presentation-cursor observer loop) | `6ea3506` | browser |
| Steam Deck: one press acts once, in the context it started in (B → pause menu, ☰ flashing, sprint after quitting a menu) | `c0b5ab0`, `f1c6faa` | unit + browser reproduction probe (native copy up to 3.3 s late is ignored) |
| Right stick turned the camera the wrong way | `0bbb438` | unit (view turns right in both camera modes) |
| Title/menu 30 fps cap was landing on 20 fps at 60 Hz | `cfbfaff` | unit |

### Performance: full quality restored, frame time recovered on the CPU

Owner's rule: never trade look for frame rate. Report:
`docs/reports/perf-quality-restore-2026-09-25.md`.

- **Reverted quality cuts:**
  - post-processing off, shadows frozen, 3D enemies swapped to sprites, 3D props not
    loading, and 10 Hz player animation, on every Deck run (`cfbfaff`);
  - the Sprint 28 resolution cut (the PC rendered at about 65 % of native), the
    suit-light shadows and the halved sun shadow map (`3a22c64`).
- **Lower resolution only when GPU-bound:** adaptive quality now lowers resolution only
  when measured GPU time fills most of the frame. The Deck is no longer forced down.
- **CPU fixes that don't change the picture:**
  - a wall raycast index (light cone, fog of war, projectiles, camera, audio);
  - an enemy pathfinding edge pre-check;
  - single-pass flat decals, where three.js had been drawing them twice and
    re-resolving ~60 shader programs a frame.
- **Headless result:** game logic went from 42.0 to 13.3 ms per frame. **Not yet
  measured on the Deck or PC.**

### HUD: the lower dock (behind a flag)

Plan: `hud-lower-dock-plan-2026-09-25.md`.

- **Art direction:** `docs/design/art-style-bible.md` sets "Nordic Cathedral Biomech":
  Nordic Jugendstil / National Romantic hard-line design, decayed, with Giger biology
  growing from within. It has a palette sampled from the whole game and a shared
  prompt block.
- **Layout skeleton:** three lower regions—map left, health and status centre, gun and
  ammo right—landed behind the flag (`1c3223d`, `a0e0c5d`). This is the intended
  information order, but the live painted implementation does not yet preserve the
  plan's common slim geometry; see the 09-28 review below.
- **Painted housings:** the owner's painted class housings (Tank, Scout, Engineer ×
  map / status / arms) are in the game. `scripts/build_hud_dock_housings.py` keys
  them, finds every window, and generates per-class placement, so new art drops in by
  re-running the script. Layers are glass, then live UI, then the painted frame
  (`65bb816`).
- **Chroma-key pipeline:** a prompt pack for new panels and state variants, with green
  background for housings and magenta for biology layers, plus `scripts/chroma_key.py`
  (`8d4761f`).
- **Turning it on:** `hb_hud_layout = 'dock'` (default `classic`). The Armory debug
  button toggles it (`fb538ce`). Browser-tested at 1080p and Deck size; **not seen on
  hardware**.

#### 09-28 live HUD review: useful direction, incomplete implementation

The classic and dock layouts were booted into the same Tank run and captured at
1920×1080 and 1280×800. The evidence and rect dump are in
[`hud-overlay-review-and-recovery-plan-2026-09-28.md`](hud-overlay-review-and-recovery-plan-2026-09-28.md).

- The dock has the stronger game-specific silhouette and clears the upper combat view.
  Keep the direction.
- The plan specifies common 220×64 / 520×64 / 380×64 u panels. The live Tank panels
  are approximately 209×150 / 283×150 / 207×150 u: three tall islands rather than one
  slim command band.
- The Tank weapon content window is 26.1 px wide at 1080p and 20.9 px on Deck. Critical
  information has been made subordinate to the frame art.
- The smallest visible dock text is 9 px at 1080p and 7.2 px on Deck; the plan's Deck
  floor is 11 px.
- The unchanged mission/notification column is about 268 px tall on Deck—roughly one
  third of the screen—and remains the dominant HUD mass.
- The three housing rectangles meet the approximate opaque-area budget (about 5.6% of
  the 1080p stage and 6.6% on Deck), but the occupied lower band is 150 u tall rather
  than 64 u.
- `hud-layout.spec.js` remains 4/4 green because it checks flagging, containment,
  non-overlap, keep-out and gear position. It does not yet check readable type,
  clipping, common class geometry, state priority, localization, or visual hierarchy.

**Consequence for Sprint 48:** do not promote the dock or couple more state art to its
current dimensions. First restore one shared slim geometry, make the core combat data
readable with the housing art disabled, and retire the legacy objective/prompt stack.
Then add the first wear layers. Talking portraits remain outside Sprint 48.

### Release and repository hygiene

- CI: Lighthouse timeout and PAGE_HUNG (`c030269`, `d6ed49f`).
- CodeQL fixes (`c6d984d`, `13b596c`); code-quality findings (`ffbd480`).
- Lint ignores the `.agents/` skill examples (`4c66a31`).
- Dependencies: socket.io 4.8.4, three 0.186.1, vitest 5.0.2, eslint 10.11.0 (`f5fa59d`).
- TODO-tree audit: 175 legacy checkboxes migrated to
  `todo-audit-backlog-and-conflicts-2026-09-24.md` (`1631488`, `c375252`, `1cc3aef`).
- PR #93 body matches the evidence. Tickets #78, #80, #81 and #82 are "advanced", not
  closed: the owner closes them by hand after QA.

---

## 2. Planned, not done

Grouped by area. The source document for each group is in its heading.

### Needs the owner's hardware (Deck + PC session)

- Every co-op networking fix in §1: deaths, black boxes, drops, props, TRY AGAIN world,
  per-deploy maps.
- Spawn cliff guard; map and story rules.
- Deck input:
  - B on the map;
  - the ☰ settings button;
  - held buttons after leaving a menu;
  - the right-stick direction.
- Frame time with full quality: compare with the 09-25 PC log (~48 ms frames) and the
  09-24 Deck log (29.4 ms render median).
- Mid-expedition suspend/resume on the Deck (Invisible Essentials Phase 1).
- Steam Cloud round trip, achievements unlocking, leaderboard (QA gates not exercised).
- Dock HUD readability at arm's length on the Deck.

### Co-op (`qa-2026-09-24-deck-pc-coop-game-plan.md`)

- Networked companions: Meridian is still solo-only in co-op.
- Make the solo-only Sprint 46/47 systems host-authoritative: Ring 1 events, arrival
  fight, reward cache, bounty.
- A two-client diff probe: script a kill with a drop, a prop break, a pit-fall and
  TRY AGAIN; compare both worlds; fail on any difference.
- Meridian escort-to-camp. Pathing and steady fire landed; escort did not.
- Invisible Essentials Phase 5: two-player intent and co-op reconnect.

### Foundry / Armory / Vault (`qa-2026-09-24-deck-pc-coop-game-plan.md`)

- One item catalog and one card/preview across Armory, Foundry, hero screen and Vault.
  Six Foundry-only weapons have no model or Armory icon.
- The unified Foundry hub: Stash / Loadout / Fabricate (locked until unlocked in a
  playthrough, resources always visible) / Trade-up / Store, in the Armory look,
  class-themed.
- Smelter trade-up not sticking. Add logging first; open question: is "trade up" the
  smelter?

### HUD dock (`hud-lower-dock-plan-2026-09-25.md`)

- **Readability recovery gate (new from the 09-28 live review):** one semantic content
  grid for all classes; planned 64 u lower band; ≥11 px critical Deck text; ammo,
  weapon identity and reload state readable without relying on unlabeled glyphs.
- **Housing correction:** use 9-slice or cap-and-stretch frames so art no longer
  dictates content geometry. Class identity changes material, accents and decoration,
  not the positions of health, ammo or ability state.
- **C, objective drawer:** the right-hand mission stack is still the old stacked cards.
  This is the gate for making dock the default.
- **H:** PRESS-E and world prompts into the prompt lane.
- **Scan ring:** radar scan as a cooldown ring on the map disc (it sits with the gun
  meanwhile).
- **Wear model runtime:**
  - `suitCondition` module;
  - blood that dries and wipes off;
  - cracks that repair but leave a scratch;
  - scuffs for the life;
  - frost and freeze lock;
  - infection following `infectionLoad` ("squish fades, scars stay").
- **State art:** state layers for the painted housings (blood, frost, damage tiers,
  bio). Prompts ready in `hud-housing-prompts-2026-09-25.md`.
- **Portraits:** StarCraft-style talking portraits (2D key-art style, layered cut-out
  animation) for the operators and NPCs. They replace the stand-in `survivor_01/02/03`
  operator portraits in dialogue.
- **Event housings:** Act 2 infection stages up to an alien "ascendant" console; other
  characters; boss/EMP.
- **HUD Scale in settings:** the `hb_hud_scale` setting exists; the menu item does not.
- **i18n and accessibility:** a 7-locale pass on the dock, and contrast high/max.
- **Acceptance harness:** all three classes at Deck, 1080p, 2304×1440 and ultrawide;
  Idle / Engaged / Critical / boss+hazard / reload / prompt / multi-objective states;
  German, Russian and controller glyphs; assertions for text clipping, minimum type,
  common class content rectangles and occupied vertical bands.
- **Cleanup decision:** `public/ui/suit/` (4.1 MB of superseded procedural panels and
  edge-check images) ships but is unused.

### Gameplay roadmap (`gameplay-feature-review-2026-09-24.md`)

- **Phase 3 (47/48):** class traversal affordances: Tank wall breach, Engineer nanite
  bridge (GAP-GP-05).
- **Phase 4 (48):**
  - convert `boss_cybersnail` and `boss_cryosnail` onto `bossPhases.js`;
  - expand the expedition report (blueprints, faction shifts, next leads);
  - Hive Queen communion for Mayor Tina (GAP-ST-01);
  - in-run timeline divergence HUD warnings (GAP-ST-02).
- **Lane 2 finding 8:** the formation damage rule (`encounterDamageMultiplier`) is only
  in the audit model, not the runtime. Either apply it or label the audit table as
  design intent.
- **Infection actions:** infection rises only with time today. Actions should feed
  `infectionLoad` too: hive verbs, bio/caustic hits, spores, eggs aboard.

### Invisible Essentials (`invisible-essentials-2026-09-24.md`)

- Phase 5: co-op intent and reconnect.
- Phase 6: in-expedition build decisions. Claimed by Claude, **not started**.
- Phase 7: physical ship memory and campaign artifacts.
- Phase 8: mastery without compulsory grind.

### Performance (`docs/reports/perf-quality-restore-2026-09-25.md`)

- Chunk-mount spikes (`syncVisibleChunks` up to ~60 ms).
- 1,000–2,000 draw calls a frame on the PC; instance pickups and props, with no visual
  change.
- The long-task reporter's GPU-memory scene walk runs during stalls.

### Art (`docs/design/art-style-bible.md`)

- Store capsules in the new style (open question: now or after the HUD).
- Name the dead corporate space gods in the canon (iconography needs names).
- Doors, menus and typography in the Nordic style.

### Repository

- Two moderate Dependabot alerts on the default branch.
- Close Dependabot's grouped PR (the same bumps are on PR #93).
- Architecture debt P3, GAP-AR-01…05, all "Sprint 48+":
  - seam extraction from `threeGame.js`;
  - unwired modules;
  - orphaned events;
  - permanent flags.

---

## 3. Known problems (found, not fixed)

| Problem | Where it's recorded |
| :--- | :--- |
| Lane 2's formation damage rule exists only in the audit model | gameplay review, finding 8 |
| After MAIN MENU on the results screen the app phase never left `gameover` | QA plan, question 6 |
| Models invisible in large rooms (not a load failure; which rooms?) | QA plan, P2 |
| `public/ui/suit/` superseded assets ship in the build | this doc |

---

## 4. Sprint 48: proposed plan

> **The canonical Sprint 48 plan is [sprint-48-plan.md](sprint-48-plan.md).** It merges
> this section, the HUD review's R0–R4 order and the Gemini track draft, and checks them
> against the code. Where they differ, it wins:
> - flipping the dock default and the wear layers for all classes move to Sprint 49;
> - wear v1 for one class is a Sprint 48 stretch after R1–R2;
> - the companion track is rescoped to escort + networking, since pathfinding already
>   exists (`05c4300`).
>
> The table below is kept as the original draft.

**Goal:** confirm on hardware what Sprint 47 built, finish "the host decides, everyone
sees it" for co-op, and make the dock HUD the default.

| Priority | Work | Done when |
| :--- | :--- | :--- |
| **P0** | **Deck + PC QA session** on a packaged build of PR #93: the full §2 hardware list, with session logs saved to `logs/` | every row marked pass/fail with its log; failures filed as Sprint 48 items |
| **P0** | Fix what that session finds | a re-run of the failing rows passes |
| **P0** | Merge PR #93 once the session passes; owner closes #78/#80/#81/#82 as their conditions are shown | PR merged; tickets updated |
| **P1** | Co-op authority: companions networked; Ring 1 events, arrival fight, reward cache and bounty host-authoritative | relay test per event type; two-client diff probe green |
| **P1** | Dock recovery gate: authoritative screenshot/rect harness; one shared 64 u content grid for all classes; ≥11 px critical Deck text; objective drawer (C), prompts into H, scan ring, HUD Scale menu item and 7-locale pass | harness fails on today's known defects, then passes at all four target sizes; core combat data reads correctly with housing art disabled; Deck hardware check |
| **P1** | Promote the dock only after the recovery gate | no permanent legacy mission column; no clipped critical text; owner Deck + PC sign-off; then flip `hb_hud_layout` default to `dock` |
| **P2** | Dock wear model v1 after geometry freezes: `suitCondition` + blood, frost and damage tier 1 for one class, then all three | unit tests per signal; screenshots per state; overlays never cover instruments; ≤0.3 ms HUD layout/style cost |
| **P2** | Gameplay Phase 4: all six milestone boss conversions complete; expedition report expansion and Lane 2's formation rule remain | phase-machine unit tests + runtime attack/sync probes green; remaining work needs unit + slice probe |
| **P2** | Foundry: one item catalog + card, hub skeleton with tabs; smelter trade-up logging and fix | the same item looks identical on all four screens; trade-up sticks across reload |
| **P3** | Performance: chunk-mount spikes, pickup/prop instancing | frame profiler before/after; no visual diff |
| **P3** | Invisible Essentials Phase 6 (claimed by Claude) | phase acceptance in its doc |

**Not in Sprint 48:** talking portraits, event housings, store capsule regeneration,
Phases 7–8, and the architecture debt (GAP-AR-*). They wait for P0/P1. If hardware QA
or the dock recovery gate expands, wear v1 slips before any readability work does.

---

## 5. Decisions waiting on the owner

These are product or release choices, not questions engineering should answer silently.
The recommendation is the planning default only; no destructive cleanup, canon change,
or release-branch dependency work happens without the owner's answer.

### D1. Does “trade in / trade up” mean the Smelter?

- **Option A — yes, one system (recommended):** name the tab **SMELTER / TRADE UP** and
  define the verb as consuming five lower-rarity items for one higher-rarity item.
  This gives the QA complaint, UI, telemetry and persistence test one shared identity.
- **Option B — separate verbs:** “trade in” sells or exchanges items while “trade up”
  is the 5→1 Smelter. This requires separate currencies, receipts, UI copy and tests.
- **Why it matters now:** the Foundry workstream cannot fix the reported “trade-up
  does not stick” until the action and expected inventory transaction are unambiguous.
- **Planning default if deferred:** implement and test only the existing 5→1 Smelter;
  do not invent a second economy action.

### D2. Which models disappear, and in which large rooms?

- Needed evidence: room/biome name, object description, whether it is missing on Deck,
  PC or both, and ideally a screenshot or a map coordinate from the telemeter.
- **Recommended capture:** when it happens, open the tactical map, take one wide shot
  and one aimed shot, then export the session log before leaving the room.
- **Why it matters:** successful HTTP asset loads point toward culling bounds, placement,
  LOD or room/chunk ownership—not missing files. Without a room/object pair, a global
  renderer change risks hiding the real defect.
- **Planning default if deferred:** add a debug capture for visible-room meshes and
  wait for a reproducible room; do not disable frustum culling globally.

### D3. Delete the unused `public/ui/suit/` panel art (4.1 MB)?

- **Option A — remove it from the retail build (recommended):** first prove no runtime,
  CSS, manifest, prompt or documentation path references it; preserve source art in
  version history or a non-shipping art archive.
- **Option B — keep shipping it:** zero short-term migration risk, but every build and
  depot continues carrying superseded panels and edge-check images.
- **Acceptance before removal:** `rg` reference audit, production build, retail-asset
  audit, and a full class/HUD screenshot pass.
- **Planning default if deferred:** exclude it from packaging once the reference audit
  is green; do not delete source files merely to save depot size.

### D4. How long should blood remain on the HUD housing?

- **Option A — dries after combat; wipes at bunker/heal station (recommended):** damage
  leaves a visible history during the expedition without permanently muddying critical
  instruments. Death/new life starts clean.
- **Option B — lasts the whole run:** stronger “battle record,” but higher cumulative
  visual noise and more risk to Deck readability.
- In both cases blood belongs behind text, avoids instrument centres, follows reduced
  visual-pressure settings, and never communicates health by itself.
- **Planning default if deferred:** momentary hit splat → darken over ~30 seconds → wipe
  at bunker/heal station; cap decal density.

### D5. Who receives talking portraits first?

- **Recommended first pack:** the three operators, the Mothership/AURA voice, Mayor
  Tina, and the two most frequent camp radio speakers. This covers class identity,
  mission control and recurring story conversations before rare NPCs.
- **Smaller option:** three operators plus Mothership only, reducing art cost but leaving
  common camp dialogue in the old presentation.
- **Acceptance:** no operator uses the generic survivor stand-in; idle/talk/react states
  work; subtitle timing remains authoritative; each layered portrait stays within its
  memory budget.
- **Scheduling consequence:** portraits remain after the Sprint 48 dock recovery gate
  and first wear slice; they must not delay the default-HUD decision.

### D6. What are the canon names of the dead corporate space gods?

- Decide whether they are **literal former corporate AIs/executives treated as gods**
  (recommended for the setting), corporate brands mythologized after collapse, or
  genuinely supernatural entities appropriated by corporations.
- For each approved figure, provide a public name, former corporate function/domain,
  symbol, taboo or ritual, and whether the truth is known or only implied.
- The names gate iconography on doors, menus, relics and store capsules. Temporary
  descriptive IDs should remain internal until canon is approved.
- **Planning default if deferred:** no invented public-facing names or pseudo-runes;
  continue abstract interlace and corporate devotional imagery.

### D7. Restyle store capsules now or after the HUD?

- **Option A — after the HUD (recommended):** freeze the Nordic UI grammar, palette,
  line weight and material treatment on the high-frequency gameplay surface first,
  then reuse it in commerce art.
- **Option B — now:** improves store cohesion sooner, but risks regenerating capsules
  again if the dock geometry or style changes during recovery.
- **Planning default if deferred:** audit and prepare prompts now; do not produce final
  capsule assets until the dock passes hardware readability review.

### D8. Where should the two moderate dependency alerts be fixed?

- **Option A — default branch first, then bring the exact lockfile change into the
  release branch (recommended):** keeps the durable fix on `mothership` and avoids a
  release-only dependency history.
- **Option B — release branch first:** appropriate only if an alert affects shipped
  runtime code and the release cannot wait; requires backport/forward-port verification.
- Before choosing, record affected packages, runtime versus development reachability,
  available patched versions, lockfile diff, build/test result and any Electron impact.
- **Planning default if deferred:** triage immediately; do not merge a blind major
  upgrade into PR #93. Fix reachable runtime exposure before release, otherwise land the
  tested update on the default branch and sync it deliberately.

### Resolved 2026-09-29

Delegated by the owner ("resolve these without my input using industry and gaming
standards and players' wants"): D1 A, D2 capture-first (no global renderer change),
D3 A (done `a5f154d7`), D4 A, D5 first pack, D6 framing A (names from a narrative
pass), D7 A, D8 A (done `cc12ac3f`). Rationale and status for each are in the
[Sprint 48 plan §6](sprint-48-plan.md).

### Decision reply format

The owner can answer compactly, for example:
`D1 A, D3 A, D4 A, D5 first pack, D6 deferred, D7 A, D8 A`, plus the room/object
details for D2. Record each answer here with its date before the dependent work starts.
