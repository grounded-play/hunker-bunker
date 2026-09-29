# Sprint 47 status and the Sprint 48 plan (2026-09-28)

Branch `release/v2.4.12-beta-invisible-essentials` → PR #93 (open, mergeable;
v2.4.12-beta). Sources: the branch history (`git log origin/mothership..`), the
2026-09-24 Deck + PC QA session (`qa-2026-09-24-deck-pc-coop-game-plan.md`), the
2026-09-25 PC log, and the plan documents linked below.

**Verification levels:**
- **Unit**: vitest.
- **Browser**: Playwright against a static build, headless.
- **Hardware**: the packaged game on the owner's Steam Deck and PC.

Almost everything below has only unit or browser evidence. **Nothing done since the
2026-09-24 QA session has been confirmed on hardware yet.** That session is the
first job of Sprint 48.

Checks at the head of the branch (`ffbd480e`):
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
- **Layout:** one narrow band of three panels, with the same layout for every class:
  map left, health and status centre, gun and ammo right (`1c3223d`, `a0e0c5d`).
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

**Goal:** confirm on hardware what Sprint 47 built, finish "the host decides, everyone
sees it" for co-op, and make the dock HUD the default.

| Priority | Work | Done when |
| :--- | :--- | :--- |
| **P0** | **Deck + PC QA session** on a packaged build of PR #93: the full §2 hardware list, with session logs saved to `logs/` | every row marked pass/fail with its log; failures filed as Sprint 48 items |
| **P0** | Fix what that session finds | a re-run of the failing rows passes |
| **P0** | Merge PR #93 once the session passes; owner closes #78/#80/#81/#82 as their conditions are shown | PR merged; tickets updated |
| **P1** | Co-op authority: companions networked; Ring 1 events, arrival fight, reward cache and bounty host-authoritative | relay test per event type; two-client diff probe green |
| **P1** | Dock HUD to default: objective drawer (C), prompts into H, scan ring, HUD Scale menu item, 7-locale pass | layout spec extended to C/H; Deck hardware check; flip `hb_hud_layout` default to `dock` |
| **P1** | Dock wear model v1: `suitCondition` + first state art (blood, frost, damage tier 1) for one class, then all three | unit tests per signal; screenshots per state |
| **P2** | Gameplay Phase 4: boss phase conversion (cyber/cryo snail), expedition report expansion; decide Lane 2's formation rule | unit + slice probe |
| **P2** | Foundry: one item catalog + card, hub skeleton with tabs; smelter trade-up logging and fix | the same item looks identical on all four screens; trade-up sticks across reload |
| **P3** | Performance: chunk-mount spikes, pickup/prop instancing | frame profiler before/after; no visual diff |
| **P3** | Invisible Essentials Phase 6 (claimed by Claude) | phase acceptance in its doc |

**Not in Sprint 48:** talking portraits, event housings, store capsule regeneration,
Phases 7–8, and the architecture debt (GAP-AR-*). They wait for P0/P1.

---

## 5. Decisions waiting on the owner

1. Is "trade in / trade up" the smelter?
2. Invisible models: which objects, which rooms?
3. Remove `public/ui/suit/` (superseded placeholder art, 4.1 MB)?
4. Blood on the HUD: wipe at the bunker and heal stations (proposed), or keep it for
   the run?
5. Portraits: start with the three operators plus the Mothership and camp NPCs?
6. The canon names of the dead corporate space gods.
7. Store capsules in the new style now or after the HUD?
8. The two moderate Dependabot alerts: fix on the release branch or on `mothership`?
