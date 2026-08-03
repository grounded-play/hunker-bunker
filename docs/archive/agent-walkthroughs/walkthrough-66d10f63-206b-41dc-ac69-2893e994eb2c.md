# Walkthrough: Detroit: Become Human Style Narrative Flowchart for RGB

Completed the interactive narrative flowchart and branching path tree system for **RGB (Riverside Global 'Botics)** inspired by *Detroit: Become Human*.

---

## Key Accomplishments

1. **Chapter Flowchart Node Schema (`content.js`)**:
   Exported `CHAPTER_FLOWCHARTS` in [content.js](file:///home/caveman/Desktop/icecave/hunker-bunker/src/minigames/rgb/content.js) defining all decision nodes, waves, parent dependencies, choice labels, and consequence summaries across Chapters 1 through 6.

2. **Cross-Run Discovery Tracking (`save.js`)**:
   - Added `discoveredBeats: string[]` to the RGB save schema (`hb_minigame_rgb_v1`).
   - Exported `recordDiscoveredBeat(save, beatId)` to persist choices and visited nodes across multiple playthroughs without breaking existing saves.

3. **Flowchart Node UI & Visual Distinction (`runtime.js` & `style.css`)**:
   - **Active (Current Run)**: Highlighted node with choice title, active badge, and consequence text.
   - **Unlocked (Past Run)**: Translucent, unhighlighted node displaying revealed choice title from past playthroughs (`UNLOCKED IN PAST RUN`).
   - **Hidden / Missed (Undiscovered)**: Dotted locked node displaying `??? UNDISCOVERED PATH ???` to hint at unexplored branches.
   - Integrated flowchart trees into `renderRecapOverlay()` ("YOUR PATH" overlay, key `R`) and ending cards.

---

## Verification Results

### Automated Tests
- `npm run lint`: Passed with 0 errors.
- `npx vitest run src/minigames/rgb/`: All 110 RGB unit tests passed (including `discoveredBeats` round-trip persistence tests).
- `npm test`: All 742 project tests passed.
- `npm run build`: Production bundle built in 2.13s with zero errors.
