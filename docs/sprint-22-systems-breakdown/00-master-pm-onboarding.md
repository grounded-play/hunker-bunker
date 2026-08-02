# Hunker Bunker: Master Project Onboarding (PM Primer)

Welcome to **Hunker Bunker**. This document is the entry point for the Sprint 22 Systems Breakdown. It synthesizes the entire history, design philosophy, short/long-term goals, and critical unknowns of the project into a comprehensive primer for new Product Managers.

## 1. What is Hunker Bunker? (The Core Fantasy)
Hunker Bunker is a retro-futuristic tactical survival roguelike built on a WebGL/Three.js engine wrapped in Electron. Set on the frozen, tidally locked world of Cocytus IV, the player navigates procedural subterranean corridors under severe oxygen pressure.

**The Genre Betrayal:** The game pitches itself as a survival looter, but halfway through a run, it reveals its true nature. The player is infected by the Alien Queen. The game flips from a pure resource grind into a tense, dual-faction social puzzle where every kindness you showed to the human camps becomes leverage, and every alien hive you mined becomes a hostile or cooperative force.

### The Three Classes (The "Three Ships" Secret)
The player chooses one of three Exosuit classes, each with distinct playstyles that tie into the lore of the three crashed ships:
- **Scout (Speed & Recon):** Tied to the *Tracking Signal* ship.
- **Tank (Endurance & Armor):** Tied to the *Weapon* ship.
- **Engineer (Systems & Terminals):** Tied to the *Relay* ship.

---

## 2. The Faction Duality & The Narrative Engine
The game operates on a mirrored faction system. In Act 1, the player builds human camps and mines "anomalies." In Act 2 (Post-Infection), those anomalies are revealed to be living Alien Hive minds. 

### The Human Camps (Survival & Compromise)
1. **Meridian (Sector A-9):** Tech-scavengers led by Overseer Kaelen. (Engineers).
2. **Tallow (Sector B-4):** Pacifist hydro-cultists led by Sister Martha. (Scouts).
3. **Vesper (Sector C-7):** Militarized security led by Commander Briggs. (Tanks).

### The Hive Sites (Intimacy & Infection)
1. **Suture Hive (Nahl):** The healer and mask-maker.
2. **Relay Hive (Vey):** The communication and synapse router.
3. **Carapace Hive (Rhun):** The defender and hull-grower.

### The Ultimate Puzzle: The Boarding Manifest
The game ends with a strict logic puzzle. The escape vessel has exactly **4 seats**. Who gets them? The player, human survivors, alien allies, the Queen, or the eggs? This manifest mathematically determines which of the **5 endings** (Full Brood, Clean Escape, Mixed Crew, Carrier's Bargain, Scorched Sky) the player receives.

---

## 3. Technology Stack & Architecture
- **Client:** Three.js (r184) for procedural isometric WebGL rendering, packaged in an Electron shell for desktop distribution.
- **Steam Integration:** Native `steamworks.js` IPC integration for Achievements, Cloud Saves, Steam Input (Controller/Deck), and Steam Inventory/Vault.
- **Trusted Backend:** A Node.js/Express relay server deployed via Docker/Caddy (`steam.tuesdaycinema.club`). It enforces Steam Auth Ticket verification and HMAC session tokens to prevent leaderboard and inventory spoofing.

---

## 4. Long-Term Goals (The Path to 1.0)
The long-term vision is to ship a "Steam-installed vertical slice" that survives contact with real players.
1. **Roguelike Legibility (Kill the Spreadsheet):** The game currently tracks too many visible meters (bond, suspicion, humanity, obedience). The long-term goal is to collapse these into three readable UI pressures: *Survival*, *Social*, and *Launch*.
2. **The "Secret Sauce" Lore Alignment:** Connect the disparate lore threads. Specifically, linking the Act 1 horror logs (Specimen 0047) seamlessly with the Act 2 Queen infection arc.
3. **Physical Hardware Acceptance (Steam Deck):** The game boots on the Deck but is unplayable due to controller input mapping gaps in the Three.js renderer. 
4. **Run Director Scaling:** Move from static "HP sponge" enemies to a dynamic event deck that changes the safe routes and applies real roguelike pressure.

---

## 5. Short-Term Goals (Sprint 22 Focus)
Sprint 22 is entirely focused on breaking down the game into its parsed components, stabilizing the WFC generation, addressing the First-Hour teardown, and proving the backend.

### Lane 1: WFC Stabilization & The First-Hour Teardown (UX/World)
- **WFC Blockers:** We recently scaled the `CHUNK_SIZE` from 19 to 49, which broke 23 tests in `src/tileCatalog.test.js`. This must be fixed immediately so the procedural maze generates correctly.
- **Time-to-First-Input:** The game currently takes 90–150 seconds to start. We must compress the intro gauntlet and add a global "SKIP ALL" to get this under 30 seconds.
- **Modal Purge:** Discovery events (like finding a camp) currently lock the screen for 15 seconds. Convert these to non-blocking HUD toasts.

### Lane 2: Combat Juice & Backend Security (Systems/Math)
- **Security P0:** The Publisher Web API key and `HB_SESSION_SECRET` were historically exposed in docs. Rotate these in Steamworks before any live beta push.
- **Boss Phase Framework:** Convert the three biome bosses from 75-HP walls into 60-90s fights with two distinct phases and weak-point windows.
- **Mobility Verbs:** Standardize the class mobility (Sprint Burst, Shoulder-Slam, Overclock Slide) and add 50ms hitstop flashes to make combat feel visceral.

### Lane 3: Factions & Sound (Narrative)
- **Hive Integration:** Build out the mechanical states for the Suture, Relay, and Carapace hives in `src/act2.js`.
- **Soundtrack:** Hook the 43 newly minted tracks into the `src/roomThemes.js` spatial audio system.

---

## 6. Major Unknowns & Risks (What Keeps Us Awake)

**1. The Art Style Clash ("Two Games in One Frame")**
We are mixing hand-modeled 3D blocks with AI-generated sprites of wildly different pixel densities. If we do not lock a unified pixel grid (the walk-sheet density) and regenerate the outlier portraits, we will be review-bombed for "AI slop" on Steam.

**2. The Combat "Sponge" Problem**
Our current minute-to-minute combat is "one verb against sponges"—players walk backward while holding left-click for 40 seconds against bosses. If the Boss Phase Framework and mobility verbs fail to make combat engaging, the narrative depth won't matter because players will quit in Hour 1.

**3. Testing the Giant Interactive Systems**
We have 270+ unit tests, but our End-to-End (E2E) and hardware acceptance testing lags severely behind the sheer size of `main.js` and `threeGame.js`. We do not know if the game survives a 60-minute, zero-death run on a physical Steam Deck because we haven't built the automated pipeline to prove it yet.
