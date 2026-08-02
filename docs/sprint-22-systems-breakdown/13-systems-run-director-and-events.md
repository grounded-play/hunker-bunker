# System Breakdown: The Run Director & Roguelike Events

## Overview
According to the `game-wide-review-and-solution-plan.md`, the game is at risk of feeling "authored but not replayable." Currently, randomness only shuffles room locations and spawns. To be a true roguelike, the game needs a Run Director that actively alters pressure and route safety based on the player's choices.

## The Current State
- The game has "modifiers" (passive stat bumps), but no active event deck.
- The player can always walk backward and shoot. The pressure is ambient (O2 drain), not dynamic.

## Sprint 22 Engineering Goals

### 1. The Event Deck Engine
Build a Director module that pulls from an authored deck of events based on Biome, Act, and Faction standing.
- **Pressure Cards:** Events that force the player to change tactics. (e.g., "The Vents Open: Crawler spawn rate tripled in dark sectors for 3 minutes.")
- **Positive Cards:** "A Cache Uncovered: Nearest undiscovered room guarantees a tech module."

### 2. The Heartbeat of Fear (The Stalker)
The game lacks an apex predator.
- **Pre-Reveal (Act 1):** The Queen manifests as hallucinations. Radar glitches, audio spikes, but no physical threat.
- **Post-Reveal (Act 2):** If `suspicion >= 75`, Commander Briggs dispatches a named Vesper Hunter pair. They actively pathfind toward the player across chunks. If the player is Outed, the Mothership sends an Exterminator Lander. This creates a terrifying "Mr. X" dynamic that breaks the standard combat loop.

### 3. Faction Demand Shifts
Camps currently offer static trades. The Director should randomize Faction Demands per run.
- Run A: Meridian desperately needs Shells and will trade Tech at a 2x rate.
- Run B: Meridian's systems are stable, so Tech is extremely expensive.
This forces the player to adapt their routing and upgrading strategy every single run, cementing the roguelike replayability.
