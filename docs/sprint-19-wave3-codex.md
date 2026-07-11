# Sprint 19 Wave 3 Brief — Codex: Lore Coherence Systems & Mechanics

Derived from [lore-coherence-and-secret-sauce-review.md](file:///home/caveman/Desktop/icecave/hunker-bunker/docs/lore-coherence-and-secret-sauce-review.md). 
Sibling brief: [Gemini — Lore Coherence Content & Aesthetics](file:///home/caveman/Desktop/icecave/hunker-bunker/docs/sprint-19-wave3-gemini.md).

## Mission

Own the backend state tracking, gameplay systems, math, spawning logic, and event wires that undergird the narrative coherence and mechanical variety of Wave 3. You will implement class perks, faction camp actions, stalker AI spawning, and the achievements/secrets gating engine.

---

## Deliverables

### 1. Unified Lore State & Class-Keyed Wreck Logs (Part 1 §1, §2, §3, §6)
- **Origin Weld Gating**:
  - Implement a state check in `src/codex.js` (e.g., `isSpecimen0047OriginFound()`) that returns true only when both the Chen confession log and the cave stasis box record are marked as found. Use this to unlock the final unified codex entry.
- **Class-Keyed Wreck Logs**:
  - In `src/codex.js` / `src/data/codex.js`, retrieve the `playerType` (Scout/Engineer/Tank) when the salvage console event fires.
  - Return the appropriate class-specific wreckage log payload (Scout = tracking signal, Engineer = relay, Tank = weapon) keyed to the class hull.
- **Timeline date and sector coordinates**:
  - Store dates and coordinates in the log schemas and camp generation structures.

### 2. Playable Faction Camp Verbs (Part 1 §4)
Implement the core mechanics for the camp actions in `src/campEconomy.js` or `src/camp.js`:
- **Meridian (Radar/Compass Boost)**:
  - Increase radar detection radius and speed up radar ping refresh rate while the boost is active.
- **Tallow (Humanity Decay & Medkits)**:
  - Reduce the rate of humanity decay in the vitals update tick (in `src/vitals.js`).
  - Restock and manage high-quality medkit inventories when trading with Tallow.
- **Vesper (Ammo & Turrets)**:
  - Add ammo reserves to player loadout and grant turret placement/ammo favors.

### 3. Exosuit OS Register & Dialogue Selection (Part 1 §5, Part 2 §2, §5)
- **Suit Register Selection**:
  - Check player's infection level inside the dialogue resolution path.
  - Map dialogue pools from `src/data/dialogueLines.js` to `lowO2` or `director` triggers based on infection stages (corporate $\rightarrow$ glitched $\rightarrow$ reverent).
- **Death Context for Leaders**:
  - Pass total run deaths and current session death counters into the dialogue context `ctx` parameter of `nextDialogueBeat`.
  - Use this context to unlock specific leader lines on death-return visits.
- **Queen Dial Logic**:
  - Read `obedience` values from `src/act2.js` and select the warm/maternal dialogue pools vs. imperious/hostile pools dynamically.

### 4. Apex Stalker Spawns & Class Perks (Part 2 §3, §6)
- **Briggs' Hunter Pair Spawner**:
  - Track player suspicion. If suspicion reaches $\ge$ 75, trigger a named hunter pair spawn (escalating threat) in `src/director.js`.
- **Mothership Lander Spawner**:
  - Trigger a Mothership Exterminator Lander spawn once the player is outed.
- **Class Act 2 Perks**:
  - **Scout**: Reduce turret detection speed and cone angle.
  - **Tank**: Negate the first electrical shock/zap damage from defenses.
  - **Engineer**: Reprogram/hijack active turrets when nearby.

### 5. Surprise Secrets & Gating (Part 2 §4)
Implement the tracking variables and conditions to gate achievements and dialogues:
- **Hive Harmed Check**: Track if the player has avoided harming any hives. If true, unlock KIN achievements and custom Nahl dialogues.
- **Deathless Reveal Check**: Check if the player reaches the reveal with zero deaths. If true, spawn Chen's 13th log.
- **Reyes' Letter Courier**: Check if Reyes' letter is present in the player inventory when interacting with Briggs to trigger the funeral beat.

---

## Files Owned

- `src/act2.js` (ending calculations and manifest logic)
- `src/codex.js` (gating rules and unlock states)
- `src/campEconomy.js` (camp verb effects and merchant inventory updates)
- `src/vitals.js` (humanity decay modulation)
- `src/director.js` (stalker and lander spawn conditions, card draws)
- `src/achievements.js` (secrets gating and condition checks)

## Off-Limits

- `src/data/campDialogue.js` (dialogue lines and copy)
- `style.css` (CSS animation rules and aesthetic styling)
- `src/KeyedVideoSprite.js` (video shader rendering)

---

## Verification

- Ensure `npm test` passes without regression.
- Write unit tests in `src/codex.test.js` or `src/campEconomy.test.js` for the new gating states, class wreckage logs, and camp economy boosts.
- Run the headless test suite `scratch/smoke_act2.js` to ensure the spawner triggers and registry updates execute cleanly.
