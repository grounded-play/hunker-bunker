# Narrative Branching Architecture: Symbiosis, Alliances & Infiltration

**Date:** August 14, 2026  
**App Title:** Hunker Bunker  
**Purpose:** High-Level Structural Outline for Writers & Content Designers

---

## 1. Overview & Relationship Vectors

This document outlines the high-level structural framework for character relationship branches, species allegiances, and deceptive infiltration arcs (e.g., alien mimicry, inter-species bonds, human solidarity, and alien-on-alien conflict). 

Content writers and narrative teams can use this architecture to author dialogue trees, cutscenes, and lore logs across four primary relationship axes:

```
                                  ┌───────────────────────────────────┐
                                  │      OPERATIVE CORE CHOICES       │
                                  └─────────────────┬─────────────────┘
                                                    │
                 ┌──────────────────┬───────────────┴───────────────┬──────────────────┐
                 ▼                  ▼                               ▼                  ▼
   ┌──────────────────────────┐   ┌──────────────────────────┐   ┌──────────────────────────┐   ┌──────────────────────────┐
   │ VECTOR 1: PREDATORY      │   │ VECTOR 2: HUMAN          │   │ VECTOR 3: SYMBIOTIC      │   │ VECTOR 4: INTER-HIVE     │
   │ DECEIT / ALIEN MIMIC     │   │ SOLIDARITY & BONDING     │   │ ALLY HYBRIDIZATION       │   │ CONFLICT (ALIEN VS ALIEN)│
   │ Alien entity uses allure │   │ Camaraderie and mutual   │   │ Genuine inter-species    │   │ Operative sides with an  │
   │ and sensory mimicry to   │   │ protection with human    │   │ emotional/neural bridge  │   │ insurgent strain against │
   │ compromise the operator. │   │ camp survivors.          │   │ against the Queen.       │   │ the dominant hive mind.  │
   └──────────────────────────┘   └──────────────────────────┘   └──────────────────────────┘   └──────────────────────────┘
```

---

## 2. Character Archetypes & Cast Design

### Archetype A: The Mimic / Hybrid Entity ("Femme Fatale" / Bio-Infiltrator)
* **Identity / Tag**: *Specimen Emissary (e.g., "Aria" / "Unit 0047-B")*
* **Design Concept**: A specialized biomechanical organism engineered to project an alluring, form-fitting humanoid appearance, synthetic warmth, and voice mimicry to disarm and manipulate human operatives.
* **Core Dynamic**: Deceit vs. Symbiosis. She promises biological immortality, enhanced physical prowess, and sensory bliss in exchange for opening bunker airlocks and disabling defense turrets.

### Archetype B: The Human Survivor Leaders (Human-to-Human Camaraderie)
* **Commander Briggs (Camp Vesper)**: Veteran frontline soldier seeking steadfast military brotherhood and shared sacrifice.
* **Chemist Martha (Camp Tallow)**: Empathetic healer offering warmth, medical sanctuary, and emotional intimacy amid the apocalypse.
* **Engineer Kael (Camp Meridian)**: Pragmatic tech specialist seeking intellectual partnership, shared ingenuity, and mutual survival.

### Archetype C: The Renegade Alien Ally (Mutualist Non-Hostile Strain)
* **Identity / Tag**: *Nahl / Hive Bio-Resonant*
* **Design Concept**: An alien entity that possesses emotional empathy and rejects the Queen's totalitarian hive mind, seeking an authentic symbiotic union with the player based on mutual protection rather than domination.

### Archetype D: Rival Alien Queens / Faction Matriarchs (Alien vs. Alien)
* **The Spore Mother vs. The Cryo Matriarch vs. The Cyber-Hive Intelligences**: Competing alien subspecies battling for evolutionary dominance over Sector 9, using the player as a pawn to exterminate rival broods.

---

## 3. Branching Plotline Framework

### Plotline 1: The Mimic’s Web (Predatory Infiltration Arc)
* **Phase 1 (First Contact)**: The operative encounters an apparently human survivor trapped in Pod 312. She displays deep vulnerability and intimate attachment to the operative.
* **Phase 2 (Sensory Entanglement)**: As the operative visits her private chamber, she offers neurological enhancements, form-fitting bio-mesh suits, and soothing sensory communion that slowly lowers the operative's defensive caution.
* **Phase 3 (The Deceit Revealed)**: The operative must choose whether to embrace the alien illusion (granting full clearance to the human camps) or resist her seductive grip before the human settlements are compromised.

### Plotline 2: Human Hearth & Vows (Human-to-Human Bond Arc)
* **Phase 1 (Sanctuary Building)**: Completing high-tier camp quests unlocks personal dialogue vignettes, private quarters interactions, and shared shelter moments during freezing blizzards.
* **Phase 2 (The Pact)**: The operative forms an exclusive personal bond with a chosen camp leader, pledging to escape together or die defending their bunker.
* **Phase 3 (The Ultimate Test)**: When the infection begins manifesting in the operative, the player must decide whether to confess the truth to their partner or hide it to preserve their bond until the shuttle launches.

### Plotline 3: The True Symbiosis (Inter-Species Bridge Arc)
* **Phase 1 (Mind Link Initiation)**: The operative and the renegade alien Nahl establish a voluntary telepathic resonance, experiencing each other's memories, emotions, and sensory perceptions.
* **Phase 2 (Co-Evolution)**: The bond unlocks unique hybrid abilities (e.g., bio-cloaking, shared life pools) and intimate cross-species dialogue exploring alien consciousness and human emotion.
* **Phase 3 (Transcendence or Tragedy)**: The partnership culminates in either leading a joint human-alien exodus or falling together while severing the Queen's neural link.

### Plotline 4: Swarm Wars (Alien-on-Alien Dominance Arc)
* **Phase 1 (Pheromone Manipulation)**: The player infiltrates competing alien hive territories, playing rival matriarchs against one another through genetic sabotage and bio-chemical lures.
* **Phase 2 (Brood Allegiance)**: The operative aligns with an insurgent strain, receiving exotic biological adaptations and commanding subordinate drone units in open swarm warfare.
* **Phase 3 (Evolutionary Zenith)**: Overthrowing the primary Queen establishes the allied strain as the supreme bio-intelligence of the planet.

---

## 4. Technical State Machine & Game Systems Integration

Writers can link dialogue choices and event branches to these state variables:

```javascript
// State additions in hb_act2_v1 / src/act2.js:
{
    // Relationship Affinity Meters (0 to 100):
    affinityMimic: 0,         // Entanglement with the alien infiltrator
    affinityHumanMartha: 0,   // Bond with Tallow leader
    affinityHumanBriggs: 0,   // Bond with Vesper leader
    affinityHumanKael: 0,     // Bond with Meridian leader
    affinityAlienNahl: 0,     // Symbiotic trust with renegade alien

    // Faction Alignment Vectors:
    activeAlliance: 'neutral', // 'mimic_cabal' | 'human_fellowship' | 'alien_symbiosis' | 'hive_rebel'
    
    // Narrative Flags:
    intimacyVowActive: false,
    mimicIdentityDiscovered: false,
    partnerChosen: null        // 'aria' | 'martha' | 'briggs' | 'kael' | 'nahl'
}
```

---

## 5. Ending & Passenger Manifest Resolutions

Each narrative path dynamically alters the Act 2 launch sequence and final cinematic:

1. **The Infiltrator's Triumph**: The operative escapes with the mimic, realizing too late that their mind and body have been fully claimed by the organism.
2. **Human Fellowship**: The operative and their chosen human partner launch together, having preserved their humanity through love and sacrifice.
3. **The Hybrid Covenant**: The operative and the alien ally depart into the stars as the first true symbiotic pair, founding a new hybrid lineage.
4. **Swarm Usurper**: The operative leads the allied alien strain to purge all rivals, reigning supreme over the bunker depths.
