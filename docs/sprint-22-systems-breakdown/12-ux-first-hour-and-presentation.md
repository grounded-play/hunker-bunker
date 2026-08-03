# System Breakdown: UX, First Hour, and Presentation

## Current Truth

The teardown remains useful as a player-experience diagnosis, but several absence claims are stale. The runtime now has skip-all intro flow, controller pause routing, text speed, colorblind assist, difficulty display, audio settings, improved title/input focus, objective tracking, and optimized Electron startup. Sprint 22 must measure and tune these surfaces rather than schedule them from zero.

## First-Hour Funnel

Record timestamps for:

- Play pressed to first rendered frame;
- first frame to first input;
- class confirmation;
- first free movement;
- first pickup and combat;
- first objective completion;
- first camp/faction interaction;
- first death and return;
- first ring gate.

Run once as a new player without skipping and once as a returning player using skip flow. The target should distinguish cold install, ordinary restart, and death loop.

## Interruption Budget

Reserve full-screen blocking presentation for choices, irreversible consequences, major reveals, and accessibility/safety needs. Discovery, routine objective progress, minor lore, and inventory feedback should normally use queued HUD surfaces. Audit actual interruption count; do not assume every existing modal remains.

## Settings and Pause

Verify pause actually halts dangerous simulation, oxygen drain, director ticks, and pocket updates where intended. Verify text speed, mix controls, colorblind assist, difficulty readout, camera effects, and controller navigation persist across restart. RGB/archive pause is a separate runtime surface and needs its own traversal check.

## Visual Cohesion

The game mixes procedural 3D geometry, sprites, portraits, video, and illustrated store art. The acceptance standard is not a single pixel density everywhere; it is intentional hierarchy, consistent edge treatment, readable scale, controlled palettes, and no placeholder/chroma remnants. Review screenshots at Steam thumbnail size and gameplay at 1280×800.

## Sprint 22 Deliverables

1. Recorded first-hour observation with confusion/interruption log.
2. Returning-player/death-loop timing pass.
3. Controller-only settings, pause, dialogue, map, archive, and gameplay pass (including Right Joystick virtual mouse cursor and smooth container scrolling in menu screens, and 3D world aim point targeting in-game).
4. Steam Deck (1280×800) Settings menu layout overhaul with category sections and auto-scroll focus centering.
5. Representative screenshot cohesion review.
6. Ranked fixes by player drop-off risk, not cosmetic preference.

## Acceptance Questions

- Can a player move within the promised time without skipping essential context?
- Does every blocking screen justify stopping oxygen/combat?
- Can the player explain the current objective and nearest safe action?
- Can controller users recover from focus loss without a mouse?
- Does moving the Right Joystick in menu screens drive a virtual mouse cursor and smoothly scroll menu panels?
- Does the Right Joystick in-game position the 3D world aim point and targeting reticle directly where aimed?
- Is the Settings menu layout spacious, sectioned into readable categories, and comfortable to scroll on Steam Deck (1280×800)?
- Are difficulty and accessibility settings discoverable before the first demanding fight?
