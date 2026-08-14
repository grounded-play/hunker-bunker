export const ARC_PRELUDE_ENABLED = true;
export const DEMO_BUILD = false;
// Sprint 23 authored expedition path. Flipped on 2026-08-13: the legacy
// carver (generateArchitecturalMazeChunk) only produces two chunk archetypes
// (one room, one bent connector), which made every run feel the same despite
// genuinely random seeds. The authored room/hallway catalog is fully wired
// and test-covered (chunkStructure.js/roomBuilds.js/hallwayConnector.js).
export const AUTHORED_WORLD_TILES_ENABLED = true;
// Scout-only visual migration: gameplay and collision remain on the legacy
// player root/sphere while a Mixamo character is drawn over the 2D sprite.
export const PLAYER_3D_COSMETIC_OVERLAY_ENABLED = true;
