# Camp-3 Boss Climax Specification & Narrative Design

Date: 2026-08-03  
Branch: `dev/sprint-22`  
Author: Antigravity (Gemini Lane)  
Reference: `docs/master-implementation-plan-2026-08-03.md`, `docs/faction-verb-matrix.md`

## 1. Overview & Setting

Camp 3 (Vesper Outpost, Sector C-7 Hive Shadow) sits at the threshold of Ring 3/4 leading directly into the terminal Ring 5 Hive Core. The Camp-3 climax represents the final operational checkpoint before the boarding vessel extraction vector or the Queen Slay/Bargain decision.

```
                  +-------------------------------+
                  | CAMP 3: VESPER OUTPOST        |
                  | Sector C-7 (Hive Shadow Edge) |
                  +---------------+---------------+
                                  |
               [VERB: FIELD RESUPPLY / FORTIFY]
                                  |
                                  v
                  +---------------+---------------+
                  | CORRUPTED OPERATOR / BROOD    |
                  | Ring 4-5 Climax Encounter     |
                  +---------------+---------------+
                                  |
        +-------------------------+-------------------------+
        |                                                   |
        v                                                   v
+-------+-------+                                   +-------+-------+
| SLAY QUEEN    |                                   | BARGAIN WITH  |
| Full Extraction                                   | HIVE BROOD    |
+---------------+                                   +---------------+
```

## 2. Encounter Structure

The Camp-3 climax unfolds in three distinct phase transitions:

### Phase 1 — Vesper Perimeter Siege
- **Trigger**: Reaching Camp 3 with max-bond or initiating the Ring 3/4 breach sequence.
- **Environment**: High-intensity dark fog, active Vesper auto-turret perimeter.
- **Mechanic**: Swarm assault waves (Sporesnails + Drone Stalkers). Player utilizes Vesper's Field Resupply verb to sustain continuous turret fire and prevent perimeter collapse.

### Phase 2 — Inverted Command (Corrupted Operator)
- **Boss Target**: Fallen Unit 0047 / Corrupted Operator.
- **HP & Armor**: Multi-layered armor plating with dynamic weakpoint state machine (`bossPhases.js`).
- **Combat Mechanics**:
  - Armored shell deflects non-piercing damage down to 1 HP floor per hit.
  - Periodic Weakpoint Exposes (5-second vulnerability window after heavy fire or turret overload).
  - Spore Infection Aura: Spreads active infection stacks requiring Tallow Triage cleanse.

### Phase 3 — Climax Resolution & Boarding Vector
- **Defeat / Resolution**: Defeating the Corrupted Operator yields the Ring 5 Master Security Key.
- **Manifest Impact**:
  - **Vesper Survival**: Vesper Leader secures Slot 3 on the launch vessel if unculled.
  - **Neural Hybrid Risk**: If infection stage is 3+ at climax resolution, Vesper Leader converts to Neural Hybrid state on the boarding manifest.

## 3. Faction Verb Synergy Matrix

| Faction Verb | Camp Source | Climax Role & Tactical Benefit | Degraded Mode Effect |
|---|---|---|---|
| **ROUTE INTEL** | Meridian (Camp 1) | Highlights Weakpoint exposes on radar & HUD for 20s. | Delay in weakpoint ping (7s offset). |
| **TRIAGE** | Tallow (Camp 2) | Cleanses Spore Infection DOT stacks & restores player to full max HP mid-fight. | Restores 50% HP max, infection remains stage 1. |
| **FIELD RESUPPLY** | Vesper (Camp 3) | Instant loaded clip + reserve ammo cap fill + bonus turret charge. | Clip refill only, reserve cap unchanged. |

## 4. Systems & Code Connections

- **`src/threeGame.js`**: `activateCampVerb(camp)` handles cost spending, cooldowns, and runtime state changes.
- **`src/campEconomy.js`**: `canActivateCampVerb` validates resource readiness (`tech`, `med`, `coin`).
- **`src/act2.js`**: `pickAct2Ending` reads camp status (`alive`, `culled`, `robbed`) and passenger states for climax ending text.
- **`src/endingExplanations.js`**: Formats run outcome and manifest blocker reasons post-climax.

## 5. Verification & Acceptance Criteria

1. **Automated Integration**: `src/campActiveVerbUi.test.js` covers active verb availability, cost verification, and activation state effects across all three camps.
2. **Combat Economy Balance**: Tested via `src/queenFightAcceptance.test.js` and `src/combatEconomy.test.js` to guarantee no ammo softlocks exist for any class during the climax fight.
