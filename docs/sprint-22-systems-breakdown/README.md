# Sprint 22: Systems Breakdown & Master Syllabus

This directory contains the exhaustive, parsed breakdown of Hunker Bunker's architecture, narrative, and mechanical systems. It is designed as a **Learning Workload** for the new Product Manager and the development team to understand the massive transition occurring in Sprint 22.

## How to Read This Directory (The Syllabus)

This workload is split into four distinct tracks. Review them in order based on your lane assignment (Claude, Codex, Gemini):

### Track 1: Vision & Onboarding (Start Here)
- **[00-master-pm-onboarding.md](00-master-pm-onboarding.md)**
  - *Summary:* The 10,000-foot view of the core fantasy, the genre betrayal, and the path to 1.0.
  - *Primary Citations:* `docs/master-implementation-plan-2026-07-28.md`, `docs/current-feature-status.md`

### Track 2: World, UX, & Presentation (Lane 1: Claude)
- **[12-ux-first-hour-and-presentation.md](12-ux-first-hour-and-presentation.md)**
  - *Summary:* The brutal teardown of the 90-second intro gauntlet and the "AI Slop" art unification.
  - *Primary Citations:* `docs/player-teardown-and-next-level-plan.md`
- **[01-world-generation-and-wfc.md](01-world-generation-and-wfc.md)** & **[06-engineering-wfc-chunk-math.md](06-engineering-wfc-chunk-math.md)**
  - *Summary:* How Radial WFC generates the maze and the critical P0 bug caused by scaling `CHUNK_SIZE` from 19 to 49.

### Track 3: Combat, Backend, & Systems (Lane 2: Codex)
- **[02-combat-and-classes.md](02-combat-and-classes.md)** & **[07-engineering-combat-boss-phases.md](07-engineering-combat-boss-phases.md)**
  - *Summary:* Solving the "sponge" problem with Boss Phases, hitstop, and the new Sprint/Slam/Slide mobility verbs.
  - *Primary Citations:* `docs/game-wide-review-and-solution-plan.md`
- **[13-systems-run-director-and-events.md](13-systems-run-director-and-events.md)**
  - *Summary:* Replacing static ambient pressure with dynamic event decks and a physical stalker presence.
- **[05-platform-and-backend.md](05-platform-and-backend.md)** & **[09-engineering-steam-backend-auth.md](09-engineering-steam-backend-auth.md)**
  - *Summary:* Steamworks IPC, the transition from local JSON to a trusted Node.js/SQLite backend, and fixing the `HB_SESSION_SECRET` leak.
  - *Primary Citations:* `docs/steam-make-it-real-plan.md`

### Track 4: Factions, Narrative, & Audio (Lane 3: Gemini)
- **[03-factions-and-hives.md](03-factions-and-hives.md)** & **[08-engineering-act2-state-schema.md](08-engineering-act2-state-schema.md)**
  - *Summary:* The Act 1 Human Camps vs Act 2 Hive Sites, and collapsing the UI spreadsheet into readable summaries.
  - *Primary Citations:* `docs/hive-swarm-camps-and-humanity-system-design.md`
- **[04-narrative-and-manifest.md](04-narrative-and-manifest.md)** & **[11-narrative-secret-sauce-and-lore.md](11-narrative-secret-sauce-and-lore.md)**
  - *Summary:* The 4-seat logic puzzle that determines the 5 endings, and the "Canon Weld" of Specimen 0047 to the Queen.
  - *Primary Citations:* `docs/lore-coherence-and-secret-sauce-review.md`, `docs/expanded-universe-narrative-design.md`
- **[10-engineering-audio-and-soundtrack.md](10-engineering-audio-and-soundtrack.md)**
  - *Summary:* Hooking the 43 generated OST tracks into the Three.js spatial audio engine.
  - *Primary Citations:* `docs/suno-scene-soundtrack-prompts.md`
