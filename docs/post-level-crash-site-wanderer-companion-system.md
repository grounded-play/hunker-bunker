# Post-Level Crash Site Wanderer & Companion System Specification

**Date:** 2026-08-21  
**Status:** Architecture & Design Specification  
**Target Systems:** Inter-Floor Transitions, Survivor Camp Intermission, 3D Companion AI (`src/companionFollow.js`, `src/threeGame.js`), Quests (`src/data/campQuests.js`), and Skin Unlocks (`src/data/communitySkins.js`, `src/loadout.js`).

---

## 1. Executive Summary & Core Gameplay Loop

Between subterranean dungeon levels (or upon returning to the Crash Site haven), a random wanderer from the outer bunker ruins arrives at your camp perimeter. The player engages in a cinematic encounter choice:

```
                          ┌────────────────────────┐
                          │  Level Cleared / Exit  │
                          │   Crash Site Haven     │
                          └───────────┬────────────┘
                                      │
                                      ▼
                          ┌────────────────────────┐
                          │ Wanderer Enters Camp   │
                          │  (Random 3D Archetype) │
                          └───────────┬────────────┘
                                      │
              ┌───────────────────────┴───────────────────────┐
              │                                               │
              ▼                                               ▼
   [OPTION A: BEFRIEND]                            [OPTION B: CHASE OFF]
 • Joins as 3D Active Companion                  • Flees into outer corridors
 • Grants class-specific passive & assist        • Drops immediate salvage/scrap
 • Initiates unique Multi-Floor Personal Quest   • Increases stealth / decreases suspicion
 • Unlocks Character Skin upon quest completion  • Can reappear as rogue/hostile later
```

---

## 2. Wanderer Archetypes, Personalities & Companion Quests

Each wanderer is randomly drawn from the **30 Community 3D Models** across the thematic archetypes:

### 2.1 The 6 Wanderer Archetype Families

| Archetype Family | Represented 3D Models | Personality & Vibe | Passive Combat Buff | Active Assist Ability | Personal Quest Line |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Manic Hacker GFs** | `scout_soft_manic_infiltrator_gf`, `tank_chubby_protective_hacker_gf`, `eng_soft_manic_architect_gf` | Chaotic, tech-savvy space punks, pink cyber-hair, irreverent | **+15% Hack Speed & Trap Detection** | **EMP Glitch Burst**: Stuns mechanical enemies & disables laser tripwires for 4s | *"Override the Core"*: Decrypt 3 encrypted terminals across Deep Strata to unlock her custom chassis. |
| **2. Corpo Shadow Runners** | `scout_corpo_shadow_runner`, `tank_corpo_shadow_runner`, `eng_corpo_shadow_runner` | Cynical, razor-sharp corporate agents, sleek techwear overcoats | **+20% Scrap & Bounty Yield** | **Precision Mark**: Marks high-value elites, increasing crit damage taken by +35% | *"Severance Package"*: Recover stolen Horizon Corp ledger from a sub-boss vault. |
| **3. Foxhole Buddies** | `scout_foxhole_shadow`, `tank_foxhole_shadow`, `eng_foxhole_shadow` | Tough, loyal, Vasquez-coded trench soldiers | **+10% Max Health & +15% Knockback Resistance** | **Covering Fire / Bodyguard**: Intercepts projectile attacks and pushes back swarms | *"Leave No One Behind"*: Recover her squad's dog tags from an infected forward post. |
| **4. Crash Survivors (Royals)**| `scout_tank_crash`, `tank_afro_crash`, `eng_afro_crash` | Regal, resilient deep-space survivors with sparking cyberware | **+12% Shield Recharge Rate** | **Supercharged Barrier**: Deploys a protective kinetic dome when player drops below 30% HP | *"Beacon in the Dark"*: Repair the crashed drop-ship transceiver in Stratum 3. |
| **5. Space ABG Trippers** | `scout_abg`, `tank_abg`, `eng_abg` | Fearless, stylish party vanguards in street gear | **+10% Movement Speed & Sprint Recovery** | **Flash-Vibe Flare**: Blinds approaching swarms with neon flares and high-tempo distortion | *"VIP Access"*: Find the hidden subterranean lounge room and retrieve the golden vinyl. |
| **6. Chrysalis & Species Hybrids** | `scout_xeno_stalker`, `tank_brood_matron`, `eng_neural_weaver`, `scount_sil`, `tank_sil`, `eng_sil` | Mysterious, seductive bio-hybrids with glowing tendrils | **+15% Acid / Toxin Resistance** | **Bio-Silk Entangle**: Roots swarms in biological webbing for 3.5s | *"Symbiotic Genesis"*: Harvest 5 pure spore pods without destroying hive sites. |

---

## 3. Encounter Flow & Decision Mechanics

### 3.1 Encounter Trigger
* At the start of the inter-floor crash site intermission (or after resting at a camp haven), a dynamic camera pan highlights a silhouette entering the clearing.
* The NPC walks in using their signature locomotion animation (e.g. `catwalkWalking`, `femaleWalk`, `drunkWalk`, etc.).

### 3.2 Dialogue & Choice Modal
When the player approaches and presses `[E] Interact`:
1. **Exposition Dialogue**: The wanderer delivers 2–3 randomized voice/text lines establishing their current plight and temperament.
2. **Action Choice**:
   * **[BEFRIEND / RECRUIT]**:
     - Consumes 15 Scrap or 1 Ration (or free if matching class).
     - Wanderer equips weapon, assumes companion state, and grants their passive aura.
     - Adds their personal quest to the active mission objective tracker.
   * **[CHASE OFF / INTIMIDATE]**:
     - Player fires a warning shot or demands they leave.
     - Wanderer drops a cache of `25–40 Scrap` + `1–2 Cryo Ingots` in panic and flees using `injuredWalkBackwards` or `fleeing` animation.
     - Decreases local area suspicion / grants +5% speed bonus for the next floor entrance.
   * **[TRADE / BARTER]**:
     - Browse unique vendor wares (rare charms, mods, or ammo packs) without recruiting.

---

## 4. 3D Companion AI & Combat Assist Architecture

### 4.1 3D Model Spawning & Locomotion
* The companion uses their actual `.glb` model from [`public/3d/runtime/community/`](../public/3d/runtime/community) instead of 2D sprites.
* Uses [`src/companionFollow.js`](../src/companionFollow.js) for distance trailing (`computeTrailPosition(playerPos, facingDir, 2.5)`).
* Smoothly blends locomotion clips (`idle`, `walk`, `run`, `crouchToStand`) with their unique action emote when idle.

### 4.2 Combat State Machine
```
                       ┌─────────────────────────┐
                       │     TRAIL_LEADER        │
                       │ (Follows behind player) │
                       └───────────┬─────────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    │ Enemies within 8m           │ No enemies
                    ▼                             ▼
       ┌─────────────────────────┐   ┌─────────────────────────┐
       │     COMBAT_ASSIST       │   │       IDLE_EMOTE        │
       │ Fires sidearm / deploys │   │ Plays signature gesture │
       │ assist ability on CD    │   │ (Fax, Drink, Plank, etc)│
       └─────────────────────────┘   └─────────────────────────┘
```

### 4.3 Companion Survival & Downed State
* Companions have an independent HP bar (scaled to 60% of player max HP).
* When depleted, they enter an **Incapped / Downed** state (`sittingAngry` or `crouchToStand` pose).
* Player has 20 seconds to revive them (`[E] Hold 3s`); otherwise, they retreat back to the Crash Site haven.

---

## 5. Technical Implementation Roadmap & Required Files

To wire this complete system into the existing codebase, the following components will be implemented:

### Component 1: Wanderer Generation & State Tracker
* **New File:** `src/wandererSystem.js`
  * Manages current floor wanderer spawn roll (70% base chance per floor transition).
  * Stores active companion state, HP, active quest stage, and assist cooldowns.
  * Serializes companion data to `localStorage` under `hb_companion_state_v1`.

### Component 2: 3D Companion Mesh & Animation Bridge
* **Modify:** `src/threeGame.js` (`updateCompanions`, `spawnCompanion3dModel`)
  * Replace 2D sprite companion spawning with full `GLTFLoader` instance using `COMMUNITY_GLB_MAP[companionId]`.
  * Bind AnimationMixer to companion instance for directional walk cycles and assist one-shots.

### Component 3: Crash Site Dialogue & Intermission UI
* **Modify:** `src/data/campDialogue.js` & `src/intermissionUi.js`
  * Add dialogue trees for all 6 archetype families (Befriend / Chase Off / Quest Turn-In).
  * Render the 2-choice decision prompt in the bottom HUD overlay.

### Component 4: Personal Quests & Armory Unlock Bridge
* **Modify:** `src/data/campQuests.js` & `src/achievements.js`
  * Add 6 multi-stage companion quest definitions.
  * When a companion quest is completed at the Crash Site campfire:
    1. Triggers `grantAchievement('quest_' + companionId)`.
    2. Automatically grants the corresponding Chassis Skin (`5014–5022` / `comm_*`) in the player's Armory loadout.
    3. Plays victory cheer gesture (`thankful` / `salute`).

---

## 6. Development Checklist

- [x] **3D Assets & Animations Ready:** All 30 models converted and mapped in `src/data/communitySkins.js`.
- [ ] **State Machine & Storage:** Implement `src/wandererSystem.js` with persistence.
- [ ] **3D Follow AI Integration:** Upgrade `threeGame.js` companion pipeline from 2D sprites to 3D GLBs.
- [ ] **Intermission Encounter Modal:** Build Befriend / Chase Off UI in `src/intermissionUi.js`.
- [ ] **Quest & Unlock Pipeline:** Wire quest completion callbacks to grant permanent skin access in `src/loadout.js`.
