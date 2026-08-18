# Debug QA Proving Grounds: Asset Colonnade & Architectural Room Grid Plan

**Status**: Architectural Proposal & Implementation Specification  
**Authors**: Grounded Play / Tuesday Cinema Club Engineering  
**Target Systems**: `src/debugAssetColonnade.js`, `src/debugRoomGrid.js`, `main.js`, `src/debugAssetCatalogs.js`  

---

## 1. Executive Summary & Vision

To provide developers, 3D artists, and level designers with instant, deterministic visual validation of all game assets, world generation tiles, boss mechanics, and camp states, we are expanding the debug environment into a unified **QA Proving Grounds** with four dedicated wings and an interactive **QA Nexus Command Center Modal**:

> [!TIP]
> For the interactive combat, event triggers, and boss testing matrix, see the companion guide:  
> 🔗 [`docs/debug-scenarios-and-boss-testing-guide.md`](debug-scenarios-and-boss-testing-guide.md)

```
                               ┌──────────────────────────────────────────────┐
                               │            QA CENTRAL NEXUS KIOSK            │
                               │          Coordinates: (9250, 9250)           │
                               │      In-Game Modal: #qa-nexus-modal          │
                               └──────────────────────┬───────────────────────┘
                                                      │
         ┌────────────────────────┬───────────────────┴───────────────────┬────────────────────────┐
         ▼                        ▼                                       ▼                        ▼
┌──────────────────┐    ┌──────────────────┐                    ┌──────────────────┐     ┌──────────────────┐
│ WING 1: ASSETS   │    │ WING 2: ROOMS    │                    │ WING 3: BOSSES   │     │ WING 4: CAMPS    │
│  (9000, 9000)    │    │  (9500, 9500)    │                    │  (9700, 9700)    │     │  (9300, 9300)    │
├──────────────────┤    ├──────────────────┤                    ├──────────────────┤     ├──────────────────┤
│• Solo Stage      │    │• 32m Chunk Grid  │                    │• Cybersnail      │     │• Nominal 100% O2 │
│• Forward Pedestals│   │• Biomes x Rooms  │                    │• Cryosnail       │     │• 0% O2 Emergency │
│• Static Enemies  │    │• Cliff Indicators│                    │• Sporesnail      │     │• Outpost Siege   │
│• Zero Collision  │    │• Door Sockets    │                    │• Rogue Operatives│     │• NPC Dialogues   │
│• Info Placards   │    │• Camp/Hive Tiles │                    │• Cave Queen (1-3)│     │• Power Matrix    │
└──────────────────┘    └──────────────────┘                    └──────────────────┘     └──────────────────┘
```

---

## 2. Wing 1: Static Solo Asset Colonnade ("Pedestal Walkway")

### Core Requirements
1. **Solo Blank Stage**: Dark metallic exhibition floor (`#0a0f18`) with directional studio spotlights and cyan base accents.
2. **Pedestal Elevation**: Every item sits atop a dedicated hexagonal pedestal (`height = 0.6m`, `radius = 0.8m`) elevated off the floor.
3. **Uniform Orientation**: All assets (guns, charms, mods, props, decals, chassis billboards, and enemies) are rotated to face uniformly toward the player's viewing axis (+Z direction).
4. **Non-Interactive & Hazard-Free**:
   - No pickup triggers or inventory mutations.
   - Zero physical collision traps.
   - Enemies instantiated with **zero AI behavior trees**, **zero root motion**, **zero aggro radius**, and **zero collision damage**. They stand in a static default frame or loop their walk cycle in-place.
5. **Holographic Info Placard**: Floating monospace holographic nameplate above each pedestal displaying:
   - `[CATEGORY] // [ASSET_KEY]`
   - Itemdef ID or Mesh identifier
   - Polycount / Texture resolution indicator

### Category Walkway Order
```
[START] ──► 1. Base Weapon Archetypes
        ──► 2. Season 0 Weapon Finishes
        ──► 3. Tactical Weapon Charms
        ──► 4. Rig Overclock Modules
        ──► 5. Chassis Armor Billboards
        ──► 6. Cosmetic Decal Badges
        ──► 7. Tactical Bunker Props
        ──► 8. Biomech Specimen Props
        ──► 9. Structural Setpieces & Wrecks
        ──► 10. Environmental Wall Decals
        ──► 11. Floor Overlays & Puddles
        ──► 12. Complete Enemy & Boss Bestiary ──► [END]
```

---

## 3. Wing 2: Architectural Tile & Room Grid Matrix ("The Proving Grounds")

### Core Requirements
1. **Engineered Ruler & Grid Texture Floor**:
   - A procedural high-contrast demo grid texture applied across the entire staging grounds.
   - Bold $32\text{m} \times 32\text{m}$ chunk boundary outlines with yellow hazard corner hashes (`[#eab308]`).
   - Sub-meter ruler markings ($1\text{m}$ minor grid, $5\text{m}$ major grid lines) so artists and designers can measure dimensions at a glance.
   - High-contrast edge markers highlighting canyon drops, cliff ledges, and elevation step boundaries.
2. **2D Cartesian Matrix Layout**:
   - **Columns (4 Biomes)**:
     - **Column 0**: `ACTIVE` (Industrial Bunker / Meridian Sector — orange lighting, metal walls)
     - **Column 1**: `CRYO` (Sub-Zero Frost Labs — cyan lighting, icy terrain, coolant vents)
     - **Column 2**: `BIO` (Biomech Spore Caves — amber/green lighting, organic resin, flesh walls)
     - **Column 3**: `NEUTRAL / JUNK` (Raw Structural & Scrapyard dressing)
   - **Rows (7 Room Archetypes)**:
     - **Row 0**: Standard Corridors (Straight corridor, L-Turn, T-Junction, 4-Way Cross)
     - **Row 1**: Central Hub Chambers & Multi-Portal Hubs
     - **Row 2**: Canyons & Chasms (Cliff drops, elevation ramps, narrow bridges)
     - **Row 3**: Survivor Outposts & Camps (O2 Generator, Fabricator Workstation, Security Barricade, Med-Bed)
     - **Row 4**: Hive Spore Nests (Hive Resin Walls, Egg Clusters, Spore Vents, Queen Heart)
     - **Row 5**: Boss Arenas (Queen Lair & Corrupted Operative Chambers)
     - **Row 6**: Gates & Autodoors (Vault Blast Doors, Laser Trap Gates, Proximity Autodoor Sockets)
3. **Room Spacing & Navigation**:
   - Each cell in the matrix is spaced by $48\text{m}$ to allow complete isolation of room lighting and audio zones.
   - Overhead floating billboard beacons label each room (`[BIOME: CRYO] // [ARCHETYPE: CANYON_02]`).

---

## 4. Console Commands & Developer API

### Dev Console Cheats (Press `~`)
| Command | Action |
| :--- | :--- |
| **`debug assets`** / **`tp colonnade`** | Teleport to Wing 1 (Static Asset Colonnade at `(9000, 9000)`) |
| **`debug rooms`** / **`tp roomgrid`** | Teleport to Wing 2 (Architectural Room Grid at `(9500, 9500)`) |
| **`debug hub`** / **`tp qahub`** | Teleport to QA Central Nexus at `(9250, 9250)` |
| **`debug close`** | Cleanly dismantle debug scenes and return operative to bunker crash site |

### Global Window API
```javascript
window.__DEBUG__.openAssetColonnade(); // Launches Wing 1
window.__DEBUG__.openRoomGrid();       // Launches Wing 2
window.__DEBUG__.openQaHub();          // Launches Nexus
window.__DEBUG__.closeQaLab();         // Teardown & memory GC
```

---

## 5. Implementation Stages & Verification Plan

1. **Stage 1**: Create shared procedural pedestal generator and studio lighting rig in `src/debugAssetColonnade.js`.
2. **Stage 2**: Implement non-interactive forward-facing asset mounting and static-posed enemy loader.
3. **Stage 3**: Create procedural engineered grid shader and 2D biome $\times$ room matrix generator in `src/debugRoomGrid.js`.
4. **Stage 4**: Wire console commands and global `window.__DEBUG__` controls in `main.js`.
5. **Stage 5**: Author unit tests (`src/debugAssetColonnade.test.js`, `src/debugRoomGrid.test.js`) and live browser verification.

---

## 6. Claude Review Notes (2026-08-17, before implementation)

Reviewed this plan against the real codebase before any code gets written. Three things need a
decision or a fix before Stage 1 starts; the rest is solid and ready to build as written.

### 6a. Real coordinate collision — Wing 2's anchor overlaps the existing showroom

`src/debugShowroom.js` already occupies world coordinates **(9500, 9500)** —
`SHOWROOM_CHUNK_X/Y = 500`, and `originX = SHOWROOM_CHUNK_X * (threeGame.chunkSize || 19) =
500 * 19 = 9500`. This plan's §1 diagram anchors the new **Wing 2 (Room Grid Matrix) at the
same (9500, 9500)**. Building Wing 2 there would spawn a 4×7 room matrix directly on top of the
existing 4-wall stall gallery, corrupting both scenes. **Needs a coordinate change before Stage
3** — suggest shifting Wing 2 further out (e.g. `(10000, 9500)` or a dedicated chunk far from
both `(500,500)` and the asset colonnade's `(9000,9000)`/`(9000,9000)`-adjacent hallway used by
`src/debugMuseum.js`) so none of the four debug scenes (showroom, museum, colonnade, room grid)
share footprint.

### 6b. "Static enemies, zero AI, in a walk-cycle pose" is new code, not a config flag

Both existing debug tools (`debugShowroom.js`, `debugMuseum.js`) spawn enemies via
`game.createScatterInstance({ type, ... })`, which unconditionally attaches full AI userData —
`pathNodes`, `aiMode: 'hunt'`, `attackCooldown`, `sporesnailFight`/`queenFight` objects, and
(per this session's earlier work) a `frozenTimer` field the Cryo-Capacitor overclock can set.
There's no existing "inert display mode" for enemy sprites. Wing 1's colonnade needs either:
(a) a new opt-out parameter threaded through `createScatterInstance` (e.g.
`placement.displayOnly = true` short-circuits before the AI-state block runs), or (b) a
colonnade-local enemy spawner that builds just the sprite + material + walk-cycle animation
frame directly, bypassing `createScatterInstance` entirely. **(b) is safer** — it can't
accidentally regress real gameplay enemy spawning by touching shared code, at the cost of
duplicating a small amount of sprite-setup logic. Recommend (b), flagging (a) as the
alternative if a reviewer prefers a single code path.

### 6c. Six Season 0 categories have no 3D or 2D-billboard-worthy asset to pedestal

Itemdefs 4148-4159 (voice packs, HUD themes, tracer/muzzle FX mutators, crafting reagents)
aren't visual assets in the way weapons/charms/decals are — voice packs are audio-only, HUD
themes are CSS custom-property swaps with no mesh, tracer/muzzle FX are runtime particle
effects triggered on weapon fire (this session wired real code for both — see
`src/threeGame.js`'s `spawnMuzzleFlash`/`spawnProjectile` tracer-color branch — not static
objects), and crafting reagents (4154-4159) are icon-only, same as chassis skins. The plan's
12-category walkway doesn't list these at all. Recommend adding them as a 13th category showing
icon placards with a short text description of the *effect* (e.g. "Emerald Void Tracer — color
swap on projectile fire, no static mesh") rather than a pedestal — otherwise these 12 items
either get silently skipped (consistent with this session's established defensive-skip pattern)
or someone tries to force a pedestal display for something that has nothing to pedestal.

### 6d. Wing 2 is a materially bigger lift than Wing 1 — consider phasing

Wings 1 and the colonnade's category-walk are extensions of a pattern already proven twice this
session (`debugShowroom.js`, `debugMuseum.js` both spawn individual assets via existing
functions). Wing 2 is different in kind: it needs *actual room instances* — real geometry from
the WFC/chunk-mounting pipeline (`mountChunk`, `buildChunk`, room-template application in
`threeGame.js`), not individual props. Isolating that pipeline to spawn 28 (4 biome × 7
archetype) independent, non-interfering room instances in a fixed grid — without them trying to
path-connect to each other, without triggering real chunk-streaming/despawl logic meant for the
open world — is a genuinely separate, harder problem from anything the debug tooling has done
so far. Recommend treating Wing 2 as its own stage-gated follow-up after Wing 1 and Wing 5 (§7
below) ship and get used, rather than building all three simultaneously — there's a real risk
of the room-grid work either taking much longer than estimated or producing rooms that don't
actually reflect real WFC output (e.g. hand-placed approximations) if rushed.

---

## 7a. Claude Review Notes — Round 2 (scope grew to 4 Wings + QA Nexus UI, not yet addressed)

The plan grew from 2 wings to 4 wings plus a full new UI system
(`#qa-nexus-modal`, `src/qaNexusUi.js`, `src/debugScenarioRunner.js`) since Round 1 — worth
naming plainly: this is now a materially bigger undertaking than the original ask, in the
"multiple independent subsystems, should be decomposed and prioritized" sense, not just "add
two more wings." Reviewed the new Wing 3 (boss arenas) / Wing 4 (camp labs) additions and the
Nexus UI against real code:

1. **§6a's coordinate collision is still unresolved.** This doc's own §1 diagram still shows
   Wing 2 anchored at `(9500, 9500)` — the exact world position `src/debugShowroom.js` already
   occupies (`SHOWROOM_CHUNK_X/Y=500 × chunkSize 19 = 9500`). Flagging again since it carried
   forward into the new 4-wing diagram unchanged.

2. **The coordinate-collision *pattern* is now a bigger risk with 6+ hand-placed zones.**
   Current tally: `debugShowroom.js` (9500,9500 via chunk 500,500), `debugMuseum.js`
   ((9000,9000), hallway extends to ~9280 in +X), and now proposed Wing 1 (9000,9000 — **also
   collides with `debugMuseum.js`'s existing hallway**, unless Wing 1 fully replaces it),
   Wing 2 (9500,9500), Wing 3 (9700,9700 through 10020,9700), Wing 4 (9300,9300), Nexus
   (9250,9250), and the hazard strip (9300,9500). Hand-verifying each pair by arithmetic (as
   this review is doing) doesn't scale past a handful of zones. Recommend a single
   `src/debugZoneRegistry.js` exporting `{ name, originX, originZ, width, depth }` for every
   reserved debug zone, with a small helper that throws in dev if two registered zones'
   bounding boxes overlap — cheap insurance against this class of bug recurring a third time.

3. **Wing 1 and `debugMuseum.js` need an explicit relationship, not just a shared coordinate.**
   Is Wing 1 (`debugAssetColonnade.js`, pedestal walkway) meant to *replace*
   `debugMuseum.js` (continuous hallway, same 9000,9000 origin, same category list already
   consolidated via `src/debugAssetCatalogs.js` per §6's earlier resolution), or coexist at a
   different anchor? As written, building Wing 1 at the same coordinates as the already-shipped
   `debugMuseum.js` reads as an intent to replace it — worth confirming explicitly rather than
   ending up with a fifth accidental collision.

4. **Boss arena phase-forcing (`boss phase <1|2|3>`) is real but not a direct field.**
   Checked `src/bossPhases.js`: `currentPhase(fight)` derives the active phase from `fight.hp`
   against each phase definition's HP threshold — there's no settable "current phase" field to
   force directly. `boss phase 2` would need to compute and set `fight.hp` to land inside phase
   2's threshold band, not just flip an enum. Buildable, just a slightly different
   implementation than "phase override toggle" implies — worth the implementer knowing before
   Stage 3 of that component.

5. **Wings 3 and 4 are a third, different kind of complexity again** (Wing 1 = spawn assets,
   Wing 2 = spawn static room geometry, Wings 3/4 = spawn and drive live, multi-phase *stateful
   simulations* — boss fight state machines and camp resource/siege state — in isolation from
   the real dungeon/chunk context they normally run inside). Each of Wings 2/3/4 individually
   is roughly comparable in difficulty to everything built in the debug tooling so far this
   session combined. Recommend explicit prioritization from the user rather than treating all
   4 wings + the Nexus UI as one implementation pass — which should ship first is a product
   call, not something to assume.

---

## 7. Wing 5 (new): Gameplay Progression Walkthrough — "all things in gameplay order testable"

The user's request included a capability neither existing plan (this doc's original draft, nor
the Antigravity/Gemini implementation plan) addressed: being able to step through the game's
actual **progression order** — not just inspect isolated assets or room templates, but trigger
and verify each real gameplay/story beat in the sequence a player encounters it, without
playing for hours to reach late-game content.

### Existing precedent to generalize, not reinvent

`src/matureContentAudit.js` already solves exactly this problem for one narrow slice (mature
content compliance): a manifest array (`MATURE_CONTENT_MANIFEST`) of content items, each with
one or more `scenes: [{ kind: 'ending'|'log', ... , label }]` entries wired to a real jump/
trigger action, rendered as a gallery with clickable buttons (F9 shortcut). Wing 5 is the same
pattern, generalized to the full campaign instead of just mature-content beats.

### Proposed structure

A `PROGRESSION_MANIFEST` ordered array, each entry a real, already-existing trigger point:

1. **Tutorial & Boot** — crash cutscene, class select, mothership dialogue, skip/tutorial
   choice (existing cutscene system per `project_cutscene_tutorial_plan` memory).
2. **Depth Tier 0-3 unlocks** — `getDepthTier()`'s existing tier thresholds; jump via
   `tp chunk <x> <y>` at the right distance, or a direct `depth-tier-changed` event dispatch.
3. **Camp & Hive discovery** — first-contact reward flow (existing per `project_landforms_
   camp_discovery` memory), triggered via existing `tp camp`/`tp hive` console targets.
4. **Milestone bosses** — `milestone-boss-spawned` event (already dispatched at 3 real sites in
   `threeGame.js`, reusable as a trigger the same way `voiceCallouts.js` listens to it).
5. **Queen fight & Act 2 endings** — already has real jump buttons in `matureContentAudit.js`
   for `EMPTY_HUSK`/`SCORCHED_SKY`/`FULL_BROOD` — Wing 5 can directly reuse those, not
   reimplement them.
6. **Battle Pass tier progression** — `SeasonPassManager.addXp()`/`claim()`, already real
   (`src/seasonPass.js`); Wing 5 can jump to any of the 50 tiers directly.
7. **Achievements** — `unlock_all`/`unlock <key>` dev commands already exist; Wing 5 can
   present them in unlock order with individual jump buttons instead of the current all-or-
   nothing console command.
8. **Extraction & run-end** — `player-extracted` event, already real and already wired to a
   voice callout this session.

### Presentation

Unlike Wings 1/2 (3D scenes you walk through), this is naturally a **DOM gallery/checklist**,
matching `matureContentAudit.js`'s existing F9 modal pattern rather than a 3D space — no new 3D
scene, no new coordinate anchor, no collision risk with §6a. Each entry: label, one-line
description of the real trigger it fires, a button. Reuses the existing modal/gallery CSS
already built for the mature content audit rather than inventing new UI chrome.

### Scope discipline

Every entry must map to a **real, already-shipped trigger** (an existing event dispatch, an
existing dev-console command, an existing manager method) — this generalizes an existing
verification tool, it does not invent new gameplay hooks. If a progression beat has no real
trigger to jump to yet (e.g. if any tutorial step turns out to be pure narrative with no
dispatchable state change), list it as a known gap in the manifest rather than fake a button
that does nothing, consistent with this session's established practice of flagging rather than
faking incomplete coverage.

### Open question for the user

Should Wing 5's manifest live in a new `src/progressionWalkthrough.js`, or should
`matureContentAudit.js` itself grow a second manifest/gallery mode (same file, same F9 modal,
a tab switcher between "Mature Content" and "Full Progression")? The latter avoids a second
near-identical modal/gallery UI; the former keeps the reviewer-compliance tool's scope narrow
and undiluted. No strong recommendation either way — flagging for your call rather than
guessing.

**Resolved by implementation**: went with the standalone file (`src/progressionWalkthrough.js`,
F10 shortcut, `progression`/`walkthrough` console command) to keep the Steam-reviewer-facing
tool's scope undiluted — see §8 below.

---

## 8. Implementation Status (2026-08-17, later pass — "implement them now")

**Built and live-verified this pass:**

- **`src/debugZoneRegistry.js`** (+ test): resolves §6a/§7a's coordinate-collision findings.
  Every debug zone now registers `{originX, originZ, width, depth}` and the registry throws on
  real overlap. Pre-registered `debugShowroom` and `debugMuseum` at their *actual* verified
  coordinates (not the plan's hand-picked ones) so new zones can't silently collide. Wing 2
  moved to `(11000, 9500)`, clear of everything. The other agent has already started
  registering Wings 3/4 here too.
- **Wing 1 (Asset Colonnade)**: built by evolving `debugMuseum.js` in place (per §6c/§7's
  "supersedes debugMuseum" decision) rather than a new file — every spawned item now sits on a
  procedural pedestal (hex cylinder + glowing cyan base ring), uniform `rotation.y = 0`
  orientation, and an upgraded placard showing live triangle counts pulled from the actual
  mesh. Live-verified: 117 pedestals + 117 base rings spawn correctly, 0 console errors.
  Confirmed §6b's AI-safety requirement was **already satisfied by construction** — spawned
  enemies were never pushed into `game.scatterSprites`, the array the real AI tick loop
  iterates, so they were already inert; no new AI-bypass code was needed.
- **Wing 5 (Progression Walkthrough)**: `src/progressionWalkthrough.js` + `#progression-
  walkthrough-modal` (reuses `matureContentAudit.js`'s CSS classes, no new styling), F10
  shortcut. All 8 categories from §7's design, 23 real trigger buttons, zero invented hooks —
  reuses `window.__DEBUG__.runCommand()` (new: runs a command string through the exact
  `executeDevCommand()` dispatcher the console itself uses), `getDebugPointsOfInterest()` for
  camp/hive jumps, `window.seasonPass.addXp()` for Battle Pass tiers, and the same ending-
  cutscene/log-viewer logic `matureContentAudit.js` already has for Act 2's 10 endings.
  Live-verified real state changes: Battle Pass tier 46→47 via the "+1 TIER" button,
  achievements 0→24 unlocked via "UNLOCK: ALL ACHIEVEMENTS" — not just UI, actual persisted
  state.
- **Found and fixed a real app-breaking bug along the way**: `src/debugQaNexus.js` (the other
  agent's Wing 3/4/Nexus UI, built concurrently) imported `openDebugShowroom` from
  `debugShowroom.js`, but that function actually lives in `main.js` and was never exported —
  broke the module graph, the entire app failed to boot (blank page, console showed the import
  error). Fixed by routing through `window.__DEBUG__.teleport('showroom')`, the existing public
  entry point, instead of the broken direct import.

**Not attempted this pass**: Wing 2 (Room Grid — real WFC output, flagged in §7a item 5 as
comparable in difficulty to everything else built combined) and Wings 3/4 (boss arenas, camp
labs) — the other agent already has `debugTileGrid.js`, `debugBossArenas.js`,
`debugCampSimulator.js`, and `debugQaNexus.js` in progress; duplicating that work risked a
repeat of the debugMuseum/debugShowroom collision from earlier tonight, so left to them.

**Verification**: 203 test files, 1676 tests, 100% passing. Lint clean across every touched
file. Live-verified in a real browser, not just unit tests.
