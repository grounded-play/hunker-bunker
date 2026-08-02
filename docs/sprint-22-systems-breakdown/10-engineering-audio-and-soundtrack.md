# Engineering Deep Dive: Audio and Soundtrack

## Current Audio Architecture

`src/audio.js` provides a shared Web Audio manager with music, SFX, world, and voice mixing; loading, mute/volume controls, procedural cues, ambience, and context/tension changes are connected through `main.js` and gameplay events. This is not currently a universal `THREE.PositionalAudio` score system.

Room themes describe visual/encounter/prop identities in `src/roomThemes.js`; they do not independently select one of 43 OST tracks for every room.

## OST Status

- 43 MP3 sources are validated from `public/audio/ost`.
- Steam CSV metadata, titles, durations, ID3 tagging, cover art, tracklist, and a separate soundtrack depot are automated.
- Five core cues are loaded for title/safe ship/cryo/bio/combat contexts.
- Authored song interstitials connect additional narrative cues.
- The Steam store metadata lists all 43 tracks; store art and descriptions were updated separately.

“43 tracks packaged” does not mean all 43 should rotate during ordinary gameplay. Many are character, boss, consequence, or ending-specific.

## Sprint 22 Audio Map

Create an authored cue table with:

- cue/track ID;
- narrative owner;
- trigger and cancellation condition;
- diegetic versus score classification;
- priority and crossfade policy;
- replay cooldown;
- fallback cue;
- DLC-only flag where appropriate.

Prioritize ship, biome exploration, threat, three camps, three hives, Queen phases, major consequence beats, and endings. Avoid assigning tracks merely to increase usage count.

## Spatial Audio Decision

Camp machinery, hive cores, vents, alarms, and creature emitters are good positional candidates. Full songs attached to characters may produce awkward attenuation and repeated overlap. If positional music is pursued, prototype one camp and one hive with distance falloff, occlusion, re-entry behavior, and mix ducking before generalizing.

## Packaging Boundary

`npm run package-soundtrack` builds `dist_soundtrack`; the soundtrack VDF maps only that directory and excludes the convenience ZIP. Game store art under `steam/store/` is not included. `npm run steam:upload` uploads game and soundtrack builds, but a human still sets the soundtrack build live and publishes Steamworks metadata/store changes.

## Acceptance

- No overlapping full-length tracks after rapid context changes.
- Crossfades survive pause, cutscenes, death, and return to title.
- Mix sliders and mute apply consistently to music/video/voice.
- Missing assets fall back without blocking boot.
- Track title/number/duration match Steam metadata and packaged filenames.
- Installed soundtrack downloads all 43 MP3s in order.
