/**
 * Which real audio assets each ending's soundtrack is built from.
 *
 * Two sources, deliberately kept apart:
 *
 *  - VOICE comes from public/audio/voice/, the game's own recorded lines. These
 *    already ship, so there is no licence question and no new asset: the ending
 *    is spoken in the same voices the rest of the game uses.
 *  - SFX comes from the CC0 intake under art/source/audio/. Provenance is
 *    recorded in docs/reports/blender-ending-audio-source-intake-2026-09-12.md.
 *
 * Lines are chosen for what they SAY, not to fill a slot. A carrier ending gets
 * the queen counting two heartbeats; a dead husk gets the bunker inviting you to
 * enjoy the darkness. If a line does not fit an ending, that ending gets no
 * line rather than a wrong one.
 */
export const ENDING_VOICE = Object.freeze({
    MOTHERSHIP_INFECTION: 'public/audio/voice/mothership/voice_mothership_02_warning_bio.mp3',
    ALIEN_EXODUS: 'public/audio/voice/nahl/voice_nahl_01_you_can_hear_me.mp3',
    OUTED_ESCAPE: 'public/audio/voice/system/voice_system_02_uplink_severed.mp3',
    FAILED_CARRIER: 'public/audio/voice/queen/voice_queen_01_two_heartbeats.mp3',
    EMPTY_HUSK: 'public/audio/voice/bunker/voice_bunker_01_enjoy_darkness.mp3'
});

/** Cue type -> CC0 source, keyed off the spot cues derived from the brief. */
export const CUE_SFX = Object.freeze({
    engine: 'art/source/audio/cinematic-source/opengameart/kenney-sci-fi-sounds/extracted/Audio/spaceEngineLow_003.ogg',
    scanner_sweep: 'art/source/audio/cinematic-source/opengameart/kenney-sci-fi-sounds/extracted/Audio/forceField_000.ogg',
    door_movement: 'art/source/audio/cinematic-source/opengameart/kenney-sci-fi-sounds/extracted/Audio/impactMetal_000.ogg',
    pressure_release: 'art/source/audio/cinematic-source/opengameart/kenney-sci-fi-sounds/extracted/Audio/forceField_002.ogg',
    monitor_tone: 'art/source/audio/cinematic-source/opengameart/kenney-sci-fi-sounds/extracted/Audio/laserSmall_001.ogg',
    organic_wet: 'art/source/audio/cinematic-source/opengameart/kenney-sci-fi-sounds/extracted/Audio/impactMetal_003.ogg',
    ice_stress: 'art/source/audio/cinematic-source/opengameart/kenney-sci-fi-sounds/extracted/Audio/impactMetal_001.ogg',
    // Acquired specifically for this: Kenney Impact Sounds, CC0. Previously
    // null because the first intake had no convincing footstep and silence
    // beats a wrong sound -- that gap is now closed rather than papered over.
    footsteps: 'public/audio/footsteps/footstep_concrete_001.ogg'
});
