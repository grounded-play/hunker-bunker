# Sprint 19 Wave 3 Brief — Gemini: Lore Coherence Content & Aesthetics

Derived from [lore-coherence-and-secret-sauce-review.md](file:///home/caveman/Desktop/icecave/hunker-bunker/docs/lore-coherence-and-secret-sauce-review.md). 
Sibling brief: [Codex — Lore Coherence Systems & Mechanics](file:///home/caveman/Desktop/icecave/hunker-bunker/docs/sprint-19-wave3-codex.md).

## Mission

Own the writing, narrative presentation, visual styling, dialogue layouts, and SFX integrations to fuse the lore of Hunker Bunker and unlock the "secret sauce" emotional resonances. You will craft the dialogue lines, date clusters, CSS styles, and audio hooks that make players feel the weight of their choices.

---

## Deliverables

### 1. The Canon Weld & Class-Keyed Wreck Logs (Part 1 §1, §2, §3, §6)
- **Origin Weld Copy**: Write and integrate the 5 connecting copy points:
  - `dishBuilt` Queen line: `"QUEEN: THE LITTLE BUILDERS TRIED THIS ONCE. THEY LACKED HANDS. YOU ARE BETTER HANDS."`
  - A Queen line referencing: `"the cold box they kept me in"` (echoing stasis).
  - A Chen Confession log update: `"the signal doesn't need the antenna — it needs a body."`
  - A cave-reveal echo line: `"Pod 312... opened from the inside."`
  - The unified codex entry for Specimen 0047 outlining the lineage once both halves are found.
- **Three-Ships Class Payload Logs**: Author and render the three class-specific wreckage logs in the salvage console:
  - **Scout**: Tracking signal log (explains why Specimen 0047 is listening now).
  - **Engineer**: Relay log (detail about the broadcast payload).
  - **Tank**: Weapon log (foreshadowing the Queen fight payload).
- **Timeline Date Styling & Discovery Text**: 
  - Render the dated logs in two visually separate clusters in the lore reader UI (representing the historical collapse vs. recent Chen operation).
  - Add coordinates and sector names to camp discovery modals (`CAMP MERIDIAN — SECTOR A-9 GRID RUINS`), cave entrance (`SECTOR ZERO`), and stasis bay room landmarks (`BAY C`).

### 2. Narrative Polish & System Voices (Part 1 §5, §7)
- **EXOSUIT OS Glitch Styling**:
  - Implement CSS classes and text animations (e.g., glitching characters, monospace shifts) for the suit's interface.
  - Write the degraded versions of suit dialogue (corporate comedy $\rightarrow$ glitchy warnings $\rightarrow$ reverence as infection rises).
- **Small Canon Welds**:
  - Write Briggs' line linking the Iron Guild to "Vesper, K."
  - Write 10 reactive lines for Act 2 states (e.g., the Mothership reacting to the player's silence after the uplink is severed).
  - Write Kaelen's line acknowledging the BunkerDirector: `"It rerouted power around you. It LIKES you."`

### 3. Secret Sauce Dialogues & Audio Hooks (Part 2 §1, §2, §5, §7)
- **Paired Camp Lines (Dramatic Irony)**:
  - Write 3 paired lines per camp leader: a heartwarming quote pre-reveal and a corrupted/chilling echo post-reveal (e.g., *"The children sleep"* $\rightarrow$ *"They say the pipes hum"*).
- **Death-Unlocked Beats**:
  - Write leader dialogue beats responding to player deaths (*"You died out there. I heard. Sit down."*).
  - Write the Queen's post-reveal death response: `"I FELT THAT. DO NOT DO IT AGAIN."`
- **Queen Obedience Dial & Audio Sting**:
  - Style the Queen's UI dialogue panel differently when warm (maternal, green/amber accents) vs. imperious/hostile (sharp red glows).
  - Integrate a two-note eerie audio sting when she speaks (invoking `audio.js` channels).
- **Mixed-Case Tone Control**:
  - Implement mixed-case formatting for intimate dialogue states (stage 3/4 intimacy) and ending cards to distinguish them from ALL-CAPS radio transmissions.

### 4. Hallucinations & Visual Tells (Part 2 §3)
- **Queen Hallucinations**:
  - Design and render visual glitch overlays (screen shakes, chromatic aberration, silhouette flashes) and audio whispers that pulse as the player approaches the cave entrance.
- **Hunter & Lander Warnings**:
  - Create visual HUD warning flashes and audio klaxons when Briggs' hunter pair spawns (suspicion $\ge$ 75) and when the Mothership lander deploys (outed).

---

## Files Owned

- `src/data/campDialogue.js` (dialogue lines and leader beats)
- `src/data/dialogueLines.js` (system and suit lines)
- `src/data/codex.js` (log dates and coordinates text)
- `style.css` (glitch, case-control, and Queen dial CSS rules)
- `index.html` (modal overlays and HUD modifications)
- `src/threeGame.js` (UI building, modal dialog presentation, particle/glitch triggers)

## Off-Limits

- `src/act2.js` (ending calculations, manifest building, state checks)
- `src/achievements.js` (achievement tracking and gating)
- `src/camp.js` and `src/hiveSite.js` (gameplay rules, AI spawning, and state transitions)
- `src/director.js` and `src/runModifiers.js` (run logic and card mechanics)

---

## Verification

- Run `npm test` before committing to verify dialogue resolution is unbroken.
- Build the game (`npm run build`) and use a local test script in `scratch/` to verify that UI CSS classes apply properly under various infection/suspicion states.
- Audibly verify the two-note Queen sting and the hallucination whisper triggers in a local browser session.
