# System Breakdown: Factions, Camps, and Hives

## Overview
Hunker Bunker relies on a dual-faction system representing Survival vs Infection. In Act 1, the player builds alliances with Human Camps. In Act 2, the world flips, revealing Alien Hive sites, and forcing the player to manage dual, conflicting loyalties. 

## The Human Camps (Act 1 Focus)
Camps are physical locations on the map that the player can upgrade via resources (Shells, Coins, Tech).

### 1. Meridian (Sector A-9)
- **Leader:** Overseer Kaelen (Engineer Class).
- **Economy:** Tech Modules for Shells.
- **Theme:** Machine-worship, power grids, and diagnostics.
- **Sprint 22 Unique Verb:** Repairs and boosts radar/compass functionality.

### 2. Tallow (Sector B-4)
- **Leader:** Sister Martha (Scout Class).
- **Economy:** Bio-vaccines for Rations.
- **Theme:** Hydro-cultists, bioluminescent flora, steam shafts.
- **Sprint 22 Unique Verb:** Slows Humanity decay and sells the only legitimate medical stock. 

### 3. Vesper (Sector C-7)
- **Leader:** Commander Briggs (Tank Class).
- **Economy:** Ammo Crates for Shells/Upgrades.
- **Theme:** Militarized security, blast doors, turrets.
- **Sprint 22 Unique Verb:** Sells ammunition and temporary turret defense favors.

## The Hive Sites (Act 2 Focus)
In Act 1, these appear as mineable bio-industrial anomalies. In Act 2, they are revealed as sentient alien presences. The player's Act 1 mining actions directly impact their Act 2 starting disposition (Bond vs Wounded).

1. **Suture Hive (Nahl):** Healer/Mask-maker. Can create masking consumables to hide the player's infection from humans.
2. **Relay Hive (Vey):** Communication/Secrecy. Can jam human camp networks to stop suspicion from spreading.
3. **Carapace Hive (Rhun):** Defense/Hull. Grants alien guard assistance and armor upgrades.

## Faction States & UI Presentation
The system relies on complex background math: `campBond`, `suspicion`, `humanity`, `coverIntegrity`, and `queenObedience`. 

### The "Spreadsheet" Problem
Currently, the UI tries to expose too many of these raw variables. If the player has to mentally track 10 different meters, the game feels like a spreadsheet.

### Sprint 22 Solution: One-Line Summaries
The UI will collapse these internal states into plain-language summaries on the tactical HUD:
- Instead of showing `bond: 5, status: recruited, suspicion: 0`, show: **`CAMP MERIDIAN: TRUSTED / FORTIFIED`**
- Instead of showing `humanity: 30, outedToHumans: true`, show: **`VESPER CAMP: HOSTILE / WATCHING YOU`**

This preserves the deep state machine (`src/act2.js`) while keeping the player experience focused and legible.
