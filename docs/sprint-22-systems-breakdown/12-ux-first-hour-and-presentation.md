# System Breakdown: UX, The First Hour, & Presentation

*Primary Citation: [Player Teardown and Next-Level Plan](../player-teardown-and-next-level-plan.md)*
*Secondary Citation: [Game-Wide Review and Solution Plan](../game-wide-review-and-solution-plan.md)*

## Overview
As explicitly stated in the *Player Teardown* (lines 17-105), Hunker Bunker's first five minutes are currently unacceptable. The onboarding is bloated with full-screen modals, and the art style suffers from severe inconsistency ("two art games in one frame"). Sprint 22 demands a brutal pass on the presentation layer.

## 1. The Intro Gauntlet Compression
- **The Finding:** The Teardown notes that "Time-to-first-input is ~90-150s." The player sits through a blank title screen, class select, 7 lines of unskippable typing dialogue, and a tutorial choice before moving.
- **Sprint 22 Action:** 
  - Add a global `SKIP ALL` binding mapped to `ESC` and the `Start` button on controllers.
  - Ensure all typing text can be clicked to instantly complete.
  - Replace the blank title screen with the nano-banana hero image.
  - **Target:** Time-to-first-input < 30 seconds.

## 2. The Modal-to-Toast Conversion
- **The Finding:** The Game-Wide Review explicitly criticizes "full-screen modal takeovers for minor events." Discovering a new camp or skill tree node currently triggers a 15-second radio modal, locking the player out of gameplay and destroying flow.
- **Sprint 22 Action:** 
  - Modals are strictly reserved for branching choices (e.g., Steal vs Cull). 
  - All discovery and lore events must be routed to `.hud-notification-stack` in `main.js`. These non-blocking toasts queue up (max 2 on screen) and fade out over 6 seconds.

## 3. The "AI Slop" Art Unification
- **The Finding:** The Teardown calls out the mixed pixel density between our hand-modeled 3D blocks (low density) and AI-generated portraits/sprites (high density) as a major liability that risks the game being branded as "AI slop."
- **Sprint 22 Action:** 
  - Lock the resolution to the pixel grid of the walk-sheets. 
  - Down-sample and index-color the overly detailed "painterly" radio portraits to match the chunky, retro-industrial aesthetic of the in-game sprites.

## 4. The Settings Surface
- **The Finding:** The Teardown noted that pressing ESC does not pause the game.
- **Sprint 22 Action:** Implement a true pause state that halts the Three.js clock. Add a unified settings modal containing: Text Speed, Camera Shake Toggle, Colorblind Assist, and the currently hidden Difficulty readout.
