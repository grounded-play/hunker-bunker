# Things We Missed: Audit of Deferred Plans, Dropped Features, and Open Gaps

This document presents a comprehensive audit of design promises, narrative branches, technical tasks, and playtest bug fixes that were proposed in previous bibles, plans, and reviews, but were either deferred to future sprints, dropped from execution, or left incomplete in the [dev-sprint-19](file:///home/caveman/Desktop/icecave/hunker-bunker/docs/dev-sprint-19-branch-audit-and-open-work.md) branch.

By looking back at the documents in our `docs/` folder, this audit details what slipped through the cracks as we prioritized core systems over content and polish.

## Implementation Pass: Steam Feature Claims

Started 2026-07-16.

- **Developer Commentary:** Added an optional in-game Commentary Mode toggle
  in Settings. When enabled, short developer commentary cards appear on major
  run/discovery beats such as black boxes, armories, nests, class wreckage,
  the Queen fight, achievements, the Steam Vault, and trusted leaderboard
  submission. This makes the Steam "Commentary available" claim code-backed
  as a text commentary feature.
- **Steam Cloud Visibility:** Electron now exposes Steam Cloud account/app
  status through the Steam identity snapshot, and the debug HUD reports
  `CLOUD: READY/OFF/UNKNOWN`. Dashboard Auto-Cloud configuration and a
  two-machine sync test are still required before treating Cloud as fully
  accepted.
- **Steam Timeline Bridge:** The renderer now emits Timeline-style events for
  run start, discoveries, black boxes, achievements, Queen combat, and run
  end. Electron exposes defensive Timeline IPC handlers. The current
  `steamworks.js` package does not expose `ISteamTimeline`, so this bridge
  fails safe until a binding/SDK path is added and tested from a
  Steam-installed build.
- **Still not code-complete:** PvP and Co-op remain unclaimable on the store
  page. The Socket.io relay is still only an experimental prototype and is not
  wired into Steam builds as a real multiplayer loop.
- **Dashboard Handoff:** Added `npm run steam:dashboard-handoff`, which
  generates `docs/steam-dashboard-handoff.md` and
  `steam/dashboard_handoff.json` from the live repo definitions. This gives
  the owner exact Steamworks values for leaderboards, achievements, stats,
  Cloud paths, Steam Input, Inventory schema, Item Store filters, backend env,
  and the current `4957040` / `4957041` app-depot setup.

---

## 🌌 Section 1: Narrative & World-Building Promises

While the core faction state machine and the Queen's ledger are fully implemented, several rich features described in the [expanded-universe-narrative-design.md](file:///home/caveman/Desktop/icecave/hunker-bunker/docs/expanded-universe-narrative-design.md) and [lore-coherence-and-secret-sauce-review.md](file:///home/caveman/Desktop/icecave/hunker-bunker/docs/lore-coherence-and-secret-sauce-review.md) remain absent from the game.

### 1. Act 1 Camp Bonding Quests
* **The Promise**: In [expanded-universe-narrative-design.md](file:///home/caveman/Desktop/icecave/hunker-bunker/docs/expanded-universe-narrative-design.md#L73-L84), each camp was planned to offer two optional bonding quests (e.g., *Reactor Venting* and *The Lost Probe* for Meridian; *Spore Cleansing* and *The Lost Cultist* for Tallow; *Armory Breach* and *Bunker Holdout* for Vesper). Completing them was meant to yield gameplay benefits (e.g., the *Substation Keycard* to bypass hazard rooms, or a *Bio-Dampener* to slow infection).
* **The Reality**: None of these quests are implemented as interactive gameplay loops. The `bond` meter is increased through simplified means, but the actual quest objectives, items, and specialized rewards do not exist.
* **The Gap**: The game lacks a sub-objective/checklist HUD tracker for quests, meaning there is no way to display multi-line step progression to the player.

### 2. Inverted Class Boss Battles
* **The Promise**: [expanded-universe-narrative-design.md](file:///home/caveman/Desktop/icecave/hunker-bunker/docs/expanded-universe-narrative-design.md#L238-L253) detailed three major boss battles at Camp 3, representing the inverted mirror of the player's class (e.g., a high-speed bio-predator Scout boss, a massive biomechanical titan Tank boss, or a cybernetic terminal Engineer boss).
* **The Reality**: These boss battles were entirely dropped from implementation. Only the Queen fight is wired in [src/threeGame.js](file:///home/caveman/Desktop/icecave/hunker-bunker/src/threeGame.js).
* **The Gap**: Defeating Camp 3 in Act 2 currently evaluates as a standard camp cull or boarding decision rather than a climactic, mechanical class showdown.

### 3. Ambient Camp NPC Pathfinding & Behaviors
* **The Promise**: [expanded-universe-narrative-design.md](file:///home/caveman/Desktop/icecave/hunker-bunker/docs/expanded-universe-narrative-design.md#L207-L236) laid out an ambient node-based pathfinding system where camp leaders (Sister Martha, Commander Briggs, Overseer Kaelen) would walk between stations (weld consoles, check barricades, inspect plants) and play specific animations. It also promised state-driven animations, such as leaders pulling out weapons if robbed, or twitching with green bio-spores if turned.
* **The Reality**: The leaders are largely static billboard sprites. They stand in place and play default idle animation loops without traversing nodes, reacting physically to proximity, or shifting into active hostile/corrupt stances.

### 4. "Three Ships" Class-Keyed Payoff
* **The Promise**: Lore log `B03` reveals that three ships crashed, carrying the tracking signal, the relay, and the weapon. The [lore-coherence-and-secret-sauce-review.md](file:///home/caveman/Desktop/icecave/hunker-bunker/docs/lore-coherence-and-secret-sauce-review.md#L52-L61) proposed class-specific wreckage logs found at salvage consoles that would grant unique class gameplay perks or narrative revelations.
* **The Reality**: While class-specific texts exist in [src/data/codex.js](file:///home/caveman/Desktop/icecave/hunker-bunker/src/data/codex.js), the actual gameplay impact is missing; the wreckage consoles serve only to deliver static log text.

---

## 🛠️ Section 2: Steam & Production Readiness Gaps

As detailed in [steam-launch-readiness-master-plan.md](file:///home/caveman/Desktop/icecave/hunker-bunker/docs/steam-launch-readiness-master-plan.md), the repository contains extensive mock structures but is missing critical deployment components.

### 1. Production-Grade Persistence
* **The Promise**: The backend requires durable, concurrent storage to track inventory drops, Leaderboard runs, and microtransaction receipts.
* **The Reality**: The database in [server/db.js](file:///home/caveman/Desktop/icecave/hunker-bunker/server/db.js) remains an atomic-write JSON file. This lacks any concurrency safety for multiple users, has no garbage collection for transaction tables, and is only suitable for single-machine tests. SQLite/Postgres integration was planned but deferred.

### 2. Live Fly.io Deployment & Secrets
* **The Promise**: A deployed, secure HTTPS backend service is needed to run client verification and prevent cheating.
* **The Reality**: While the Fly configuration exists, no live Fly.io deployment has been run. The production backend URL has not been baked into Electron builds, which still fall back to localhost in packaged tests.

### 3. DRM Wrapping & Steamworks Dashboard Setup
* **The Promise**: The build pipeline was intended to include DRM wrapping and automated configuration verification.
* **The Reality**: DRM wrapping is still a manual step. Setting up Steam Cloud save directories, achievements/stats associations, and the Steam Input configuration mapping must be done by hand on the Steamworks dashboard.

### 4. Paid Commerce Gating and Legal Compliance
* **The Promise**: The Store tab and Cache Keys are intended for live microtransactions.
* **The Reality**: Real money transactions are completely mocked. The system has no legal compliance mechanisms (e.g., geogating or direct-purchase alternatives) for strict loot-box regulations in countries like Belgium or the Netherlands.

---

## 🎮 Section 3: UX, Balancing, and Game-Feel Gaps

A recent review in [ux-and-game-feel-punch-list-2026-07-16.md](file:///home/caveman/Desktop/icecave/hunker-bunker/docs/ux-and-game-feel-punch-list-2026-07-16.md) highlighted multiple places where systems do not connect to visual player-facing elements, leading to a clunky user experience.

### 1. Tactical Combat Screen Blur
* **The Problem**: Whenever high-priority events occur (like `hunter-pair-spawned` or `lander-deployed`), `showTacticalOverlay` uses the fullscreen `#loading-screen` element to display briefing text. This blurs the battlefield for 3.8 to 4.8 seconds, blinding the player during combat.
* **The Solution**: Move these notifications to a corner HUD stack to preserve player control and line-of-sight.

### 2. HUD Notification Priority and Styling
* **The Problem**:
  * Four distinct alert categories (achievement, tutorial, progress, radio) share the top-right HUD slot with no unifying design.
  * Real Steam item drops use the exact same CSS class (`.achievement-toast`) as standard achievements, losing their visual prestige.
  * Onboarding suffers from priority inversion: minor achievement pops override critical tutorial guides in the display queue.

### 3. Navigation and Radar Compass for Desktop Players
* **The Problem**: The distance-to-target calculations for camps and hives exist in [src/threeGame.js](file:///home/caveman/Desktop/icecave/hunker-bunker/src/threeGame.js) but are only rendered on the mobile touch joystick UI. Desktop players using a keyboard/mouse receive zero navigational indicators, leaving them walking blindly through the maze.

### 4. Visibility of Discovery Flares
* **The Problem**: Camps burn an additive distress flare to guide players, but the material is affected by the scene's fog. Since fog-far values loop on a 150s timer and camps sit 70–120u away, the flares are completely fogged out and invisible during the entire "day" cycle.

### 5. Boss Spawn and Ammo Mismatch
* **The Problem**:
  * Biome bosses spawn based on story progress (O2-generator steps) rather than weapon upgrades. A player can reach the 75 HP Sporesnail boss with a base 1-damage weapon kit.
  * Starting reserve ammo is capped at 24. Since bosses cost between 20 to 75 shots to defeat, players are mathematically soft-locked upon entering boss fights unless they farmed extra ammunition beforehand.

### 6. Skill Tree UI Interaction
* **The Problem**: Fully purchased/unlocked nodes in the console's skill tree retain their `cursor: pointer` style and hover glows. This falsely suggests they can be clicked, but clicking them silently does nothing. Tabbing through the tree also follows HTML insertion order rather than visual grid layout.

### 7. Black Box Boss Bypass
* **The Problem**: The Corrupted Operator guard boss is spawned alongside the Black Box. However, [src/threeGame.js:interactWithBlackBox](file:///home/caveman/Desktop/icecave/hunker-bunker/src/threeGame.js#L4348) checks only player proximity, not the guard's status. The player can easily run past the boss, grab the box, and leave without fighting.

### 8. Lore Pickup Inconsistencies and Double-Counting Bug
* **The Problem**:
  * Lore terminals require an interaction keypress ('E'), while physical lore drops auto-collect on proximity.
  * Lore terminal prompts have low CSS visual weight and a tiny z-index (150 vs. 9999 for other prompts).
  * A double-write bug in [src/threeGame.js](file:///home/caveman/Desktop/icecave/hunker-bunker/src/threeGame.js) logs physical drops twice under two different names. This breaks the log count denominator, displaying values like "56/28 logs."

---

## 📊 Section 4: Summary of Dropped, Deferred, and Gapped Features

| Feature / Bug | Category | Originating Plan | Current Code Status | Priority / Impact |
| --- | --- | --- | --- | --- |
| **Act 1 Bonding Quests** | Narrative | [expanded-universe-narrative-design.md](file:///home/caveman/Desktop/icecave/hunker-bunker/docs/expanded-universe-narrative-design.md) | **Dropped** — No gameplay code exists; bond is incremented directly. | **Medium** — Reduces Act 1 gameplay variety. |
| **Inverted Class Bosses** | Narrative | [expanded-universe-narrative-design.md](file:///home/caveman/Desktop/icecave/hunker-bunker/docs/expanded-universe-narrative-design.md) | **Dropped** — Only the Queen boss fight exists. | **High** — Sparing/culling camps in Act 2 lacks climax. |
| **Camp NPC Pathfinding** | Aesthetics | [expanded-universe-narrative-design.md](file:///home/caveman/Desktop/icecave/hunker-bunker/docs/expanded-universe-narrative-design.md) | **Dropped** — NPCs are static billboards; no node walking. | **Low** — Minor immersion loss in camps. |
| **Production DB Concurrency** | Backend | [steam-launch-readiness-master-plan.md](file:///home/caveman/Desktop/icecave/hunker-bunker/docs/steam-launch-readiness-master-plan.md) | **Deferred** — Using local JSON file; no SQLite/Postgres. | **High** — Prevents real deployment at scale. |
| **Live Fly.io Deployment** | Infrastructure | [steam-launch-readiness-master-plan.md](file:///home/caveman/Desktop/icecave/hunker-bunker/docs/steam-launch-readiness-master-plan.md) | **Deferred** — Never run against a live Fly app. | **High** — Blocks Steam packaging verification. |
| **EU Lootbox Compliance** | Legal | [dev-sprint-19-branch-audit-and-open-work.md](file:///home/caveman/Desktop/icecave/hunker-bunker/docs/dev-sprint-19-branch-audit-and-open-work.md) | **Deferred** — No geo-gating or direct key purchases. | **Medium** — Store page cannot launch in EU. |
| **Tactical Screen Blur** | Gameplay / UX | [ux-and-game-feel-punch-list-2026-07-16.md](file:///home/caveman/Desktop/icecave/hunker-bunker/docs/ux-and-game-feel-punch-list-2026-07-16.md) | **Incomplete** — Loading screen still used during spawns. | **High** — Disrupts combat sightlines. |
| **PC Compass / Nav Aid** | Gameplay / UX | [ux-and-game-feel-punch-list-2026-07-16.md](file:///home/caveman/Desktop/icecave/hunker-bunker/docs/ux-and-game-feel-punch-list-2026-07-16.md) | **Incomplete** — Compass element only visible on mobile touch. | **High** — Desktop players get lost in the maze. |
| **Daytime Flare Visibility** | Graphics / UX | [ux-and-game-feel-punch-list-2026-07-16.md](file:///home/caveman/Desktop/icecave/hunker-bunker/docs/ux-and-game-feel-punch-list-2026-07-16.md) | **Incomplete** — Camp signal flare material is affected by fog. | **Medium** — Navigational flares vanish on fog loops. |
| **Boss HP / Ammo Mismatch** | Balance | [ux-and-game-feel-punch-list-2026-07-16.md](file:///home/caveman/Desktop/icecave/hunker-bunker/docs/ux-and-game-feel-punch-list-2026-07-16.md) | **Incomplete** — Sporesnail HP (75) exceeds starting ammo pool (24). | **High** — Causes unfair soft-locks for base players. |
| **Skill Tree false Click** | UI / UX | [ux-and-game-feel-punch-list-2026-07-16.md](file:///home/caveman/Desktop/icecave/hunker-bunker/docs/ux-and-game-feel-punch-list-2026-07-16.md) | **Incomplete** — Already-purchased nodes show click pointers. | **Low** — Minor UI irritation. |
| **Black Box Guard Bypass** | Exploiting | [ux-and-game-feel-punch-list-2026-07-16.md](file:///home/caveman/Desktop/icecave/hunker-bunker/docs/ux-and-game-feel-punch-list-2026-07-16.md) | **Incomplete** — Black box proximity check does not enforce boss kill. | **Medium** — Trivializes black box recovery missions. |
| **Lore Double-Count Bug** | Bug / UI | [ux-and-game-feel-punch-list-2026-07-16.md](file:///home/caveman/Desktop/icecave/hunker-bunker/docs/ux-and-game-feel-punch-list-2026-07-16.md) | **Incomplete** — Physical drop registers twice under different keys. | **Low** — Visual error in summary counts ("56/28"). |
