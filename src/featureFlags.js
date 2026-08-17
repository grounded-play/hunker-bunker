export const ARC_PRELUDE_ENABLED = true;
export const DEMO_BUILD = false;
// Sprint 23 authored expedition path. Flipped on 2026-08-13: the legacy
// carver (generateArchitecturalMazeChunk) only produces two chunk archetypes
// (one room, one bent connector), which made every run feel the same despite
// genuinely random seeds. The authored room/hallway catalog is fully wired
// and test-covered (chunkStructure.js/roomBuilds.js/hallwayConnector.js).
export const AUTHORED_WORLD_TILES_ENABLED = true;
// Visual migration for all 3 classes (Scout/Tank/Engineer, threeGame.js:3766):
// gameplay and collision remain on the legacy player root/sphere while a
// Mixamo character is drawn over the 2D sprite. (Comment corrected 2026-08-17
// — this started Scout-only at b2e976c but was extended to Tank/Engineer
// without the comment being updated; see docs/armory-and-class-weapons-worklog.md.)
export const PLAYER_3D_COSMETIC_OVERLAY_ENABLED = true;
// Gates the new pre-run "Armory" screen (appPhase='armory') where the player
// equips a class-unique gun + mods/charms/patches before a run starts. Off
// until the screen shell (task 5, docs/armory-and-class-weapons-worklog.md)
// lands — flip on once EMBARK correctly routes into the existing
// launchStandardRun/cinematic chain.
export const ARMORY_SCREEN_ENABLED = true;
