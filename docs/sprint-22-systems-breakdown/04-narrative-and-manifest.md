# System Breakdown: Narrative Structure & The Boarding Manifest

## Overview
Hunker Bunker features a highly branching narrative that hinges on a dramatic genre-shift between Act 1 and Act 2, culminating in a complex, 4-seat logic puzzle that determines the game's ending.

## The Genre Betrayal (Act 1 vs Act 2)
### Act 1: The Survival Looter
The player explores the bunker, mines anomalies, helps human camps, and builds an escape vessel. The primary goal is simple survival and resource accumulation. The story appears to follow the "Specimen 0047" horror logs scattered throughout the bunker.

### Act 2: The Infection
The game flips. The player is infected by the Alien Queen (dormant in Sector Zero). The anomalies the player mined are revealed to be living Hive minds. The game becomes a tense social puzzle:
- **Humanity/Cover:** The player is slowly transforming. They must hide their infection from the Human Camps using masking tech (from the Suture Hive) or risk being "Outed to Humans," which turns camps hostile.
- **The Choice:** Do you cull the human camps to feed the Queen, or defy the Queen to save your friends?

## The 4-Seat Manifest Puzzle
The climax of the game occurs at the launch pad. The escape vessel has exactly **4 seats**. The state of the world (`src/act2.js`) dictates who boards and, consequently, which of the 5 endings plays out.

### The Actors
- **The Player** (1 Seat)
- **Human Camps** (Up to 3 Seats, if saved/recruited)
- **Alien Hive Allies** (Up to 3 Seats, if rescued)
- **The Queen** (If obeyed/aboard)
- **The Eggs** (If smuggled)

### The 5 Endings Matrix
The ending is computed based on the manifest state:
1. **FULL BROOD:** All camps destroyed, Queen aboard, Eggs aboard. The player is fully assimilated.
2. **CLEAN ESCAPE:** All camps saved, Queen killed, Eggs destroyed. The human survivors escape together.
3. **MIXED CREW:** Queen aboard, at least one human camp saved, at least one camp "Turned" (mutated into cyber-hybrids). A tense, fragile coexistence on the ship.
4. **CARRIER'S BARGAIN:** Queen killed, but Eggs smuggled aboard. Humans saved. The player hides their own infection, bringing the alien seed to the Core Worlds.
5. **SCORCHED SKY:** Queen killed, all camps destroyed. The player launches alone.

## Sprint 22 Scope
- **Finalize Manifest Logic:** Build the mathematical solver that processes the `storyState` vector and assigns the correct ending cutscene (`ending-fullbrood.webm`, etc.).
- **Connect the Lore:** The biggest narrative flaw is that the Act 1 "Specimen 0047" logs and the Act 2 Queen reveal never intersect in the text. Sprint 22 will add 8-10 lines of "canon weld" dialogue confirming that Specimen 0047 was the Queen's original seed-carrier, fusing the two storylines permanently.
