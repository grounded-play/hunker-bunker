# Hunker Bunker Voice Cast, Generation Prompts, and Game Integration

**Status:** production brief and implementation outline  
**Date:** 2026-08-25  
**Scope:** spoken dialogue and tactical callouts; music, creature sounds, and ordinary SFX are out of scope

## 1. Recommendation

Hunker Bunker should keep the player character silent and build its voice identity around three competing presences:

1. **Corporate machine voices** — clipped, useful, and increasingly untrustworthy.
2. **Human survivors** — physically grounded voices with warmth, fatigue, and guarded intimacy.
3. **Hive voices** — calm and inviting rather than monster-growled; their danger comes from certainty and closeness.

The first production pass should voice Mothership, System/Exosuit, the Queen, the six Act 2 faction leaders, Dr. Okonkwo-Vass, and the two cosmetic combat announcers. The RGB archive already has ten authored clips and should receive a continuity review before any regeneration.

The installed **AI Voice Generator** exposes six presets: `normal`, `clear`, `fancy`, `deep`, `crisp`, and `delicate`. It accepts a transcript, a preset, and an optional short preview transcript. It does **not** expose a free-form voice-description field. The preset and the written cadence must therefore do the casting work; radio, hive, glitch, and terminal coloration should be added in post or at runtime.

Do not imitate a real performer or request a recognizable celebrity voice. Each role should be an original performance.

## 2. What exists in the game today

| Dialogue family | Current source | Current audio behavior | Production implication |
| --- | --- | --- | --- |
| Crash briefing and ship milestones | `src/dialogue.js` | Text plus procedural vocalizer | High-value first-hour voice pass |
| Mothership reactive lines | `src/data/lineDirectorPools.js`, requested in `main.js` | Visual biome prompt only | Needs stable line-ID audio dispatch |
| Suit/Bunker director pools | `src/data/dialogueLines.js`, `src/data/lineDirectorPools.js` | Mostly visual bunker lines | Record by register: corporate, glitched, reverent |
| Act 2 Queen/System story | `src/act2.js` through `DialogueManager.openBriefTransmission()` | Text plus procedural vocalizer | High narrative priority |
| Camp/hive leader ladders | `src/data/campDialogue.js` through `src/threeGame.js` and `src/dialogue.js` | Text plus procedural vocalizer | Seven substantial roles, about 1,600 words before alternates |
| Mature NPC side stories | `src/npcDialogueTrees.js`, rendered by `main.js` | Text only | Separate later pass; some identities overlap Act 2 cast |
| Crash-site wanderers | `src/wandererSystem.js` | Text/UI only | Six small, flavor-heavy roles |
| Cosmetic announcer packs | `src/audio.js`, events in `src/voiceCallouts.js` | Twelve procedural WAV placeholders already wired | Safest drop-in replacement target |
| RGB archive mini-game | `src/minigames/rgb/audio.js` | Ten authored MP3s plus system speech fallback | Preserve and QA; it is the model for explicit mapping |
| Lore terminals | `main.js` | Procedural Bunker Terminal vocalizer | Keep synthetic or record only selected dramatic logs |

The main audio graph is already suitable: `AudioManager` has a dedicated `voiceGain`, a voice volume slider, and a voice-enable toggle. Voice files can be decoded into the same buffer store and played on the `voice` bus.

### Current wiring risks to fix

- `DialogueManager.typeLine()` calls `playVoiceForMessage()` at the beginning of a line and again during typewriting. A real full-line clip would therefore be covered by repeated procedural chirps unless playback is changed to once per line.
- `AudioManager.playVoiceForMessage()` finds authored clips with transcript substring checks. This is brittle when writers revise copy or localize it.
- Main-story voice files are not present in the asset manifest in `main.js`; only the cosmetic Commander/AURA placeholders are loaded there.
- `showBunkerLine()` emits text without a line ID, so Line Director audio cannot be resolved safely.
- Side-story dialogue updates the modal in `main.js` but never requests voice playback.
- RGB direct hotspot playback is correctly explicit, but its keys use `rgb_voice_*` while the generic substring fallback looks for `voice_*`. Continue using the explicit RGB map and remove the duplicate phrase heuristic once migration is complete.

## 3. Voice bible and plugin preset map

The “read” column is direction for casting and editing. It is not pasted into the transcript field, because the generator may speak stage directions aloud.

### Core machines and antagonist

| Role | Plugin preset | Read and cadence | Post treatment | Priority |
| --- | --- | --- | --- | --- |
| **Mothership Command** | `clear` | Adult, gender-ambiguous corporate dispatcher; calm, economical, faintly impatient. Never heroic. Threats sound like policy notices. | Narrow radio band, very light compression, short carrier chirp; keep consonants intelligible | P0 |
| **System / Exosuit** | `crisp` | Neutral onboard diagnostic voice; shorter phrases and exact numbers. No emotion, but timing may expose damaged logic. | Clean close signal, subtle bit reduction only in glitched register | P0 |
| **Bunker / Facilities Director** | `deep` | Old industrial intelligence; dry, observant, almost amused. Slower than System. | Low mechanical resonance, distant PA reflection | P1 |
| **The Queen** | `delicate` | Intimate, patient, maternal without softness becoming innocence. Close enough to feel internal. Anger becomes quieter, not louder. | Dry center voice plus low whispered double; no radio filter | P0 |
| **Aria, Queen Mimic** | `fancy` | A deliberately beautiful mask made from the listener's desires; elegant, hypnotic, slightly too measured. | Light stereo shimmer and nearly inaudible reversed tail | P2 |

Mothership, System, and Bunker must not share the exact same delivery. The plot depends on the player feeling the difference between distant corporate authority, the suit immediately around their body, and the structure watching beneath the ice.

### Human camp and science cast

| Role | Plugin preset | Read and cadence | Canon note | Priority |
| --- | --- | --- | --- | --- |
| **Sister Martha** | `delicate` | Adult, grounded caretaker; warm but exhausted, ritual language spoken as practical survival knowledge | Act 2 Camp Tallow leader | P0 |
| **Commander Briggs** | `deep` | Adult veteran; gravel without caricature, decisive starts, guarded warmth in the last phrase | Use the same actor identity in both Act 2 and mature NPC material | P0 |
| **Overseer Kaelen** | `clear` | Adult systems engineer; skeptical, precise, under-slept; fascination leaks through technical language | Use the same actor identity in both Act 2 and mature NPC material | P0 |
| **Dr. Okonkwo-Vass** | `crisp` | Adult field scientist; alert, humane, curious; refuses melodrama even when excited | Standalone snail researcher | P1 |
| **Sister Val** | `delicate` | Adult healer; lower and more sensual than Martha, assured rather than breathy | Keep distinct from Sister Martha unless narrative canon merges them | P2 |

### Hive allies

| Role | Plugin preset | Read and cadence | Post treatment | Priority |
| --- | --- | --- | --- | --- |
| **Nahl, the Suture / Dr. Nahl** | `delicate` | Gentle adult intellect, careful pauses, grief carried without weakness | Warm harmonic double 25–35 ms late | P0 |
| **Vey, the Listener** | `crisp` | Fast signal-minded intelligence; repetitions are discoveries, not stutters | Tiny antenna chirps between sentences, not under words | P0 |
| **Rhun, the Shield** | `deep` | Massive and deliberate; few contractions; each short sentence feels like an oath | Subtle subharmonic, preserve natural speech clarity | P0 |

`Dr. Nahl` in `npcDialogueTrees.js` and `Nahl, the Suture` in `campDialogue.js` read as the same identity and should share a voice unless the narrative team explicitly declares them separate. Make that canon decision before recording the P2 side-story set.

### Cosmetic combat announcer packs

| Pack | Plugin preset | Read | Existing runtime keys | Priority |
| --- | --- | --- | --- | --- |
| **Soviet Sub-Commander Radio** | `deep` | Gruff original military-radio archetype; terse, forceful, never an imitation of a real person or film performance | `voice_commander_breached`, `reloading`, `low_health`, `boss_spotted`, `killstreak`, `victory` | P0 drop-in |
| **AURA tactical AI** | `crisp` | Calm analytical adult AI; threat calls remain composed, victory is confirmation rather than celebration | `voice_aura_target_down`, `shield_critical`, `reloading`, `threat_high`, `overdrive_ready`, `sector_cleared` | P0 drop-in |

These twelve files are the quickest integration win because `main.js`, `AudioManager.playVoiceCallout()`, loadout IDs `4148`/`4149`, and the event hooks already exist. Replace the procedural WAVs with spoken files using the same runtime keys, or change only their manifest URLs if shipping MP3.

### Crash-site wanderer families

| Archetype | Plugin preset | Read | Priority |
| --- | --- | --- | --- |
| Manic Hacker | `normal` | Rapid, playful, technically competent; excitement without cartoon squealing | P2 |
| Corpo Shadow Runner | `fancy` | Controlled dealmaker; every sentence sounds negotiated | P2 |
| Foxhole Shadow | `deep` | Reliable squad veteran, direct and companionable | P2 |
| Crash Survivor Queen | `clear` | Calm command presence with spiritual confidence | P2 |
| Space ABG Tripper | `normal` | Casual, fast, irreverent; keep slang conversational rather than exaggerated | P2 |
| Species Chrysalis | `delicate` | A human plurality speaking carefully through a changed body | P2 |

Skins within an archetype currently share authored dialogue. Record one voice per archetype unless future content gives individual skins unique names and lines.

### RGB archive cast

| Role | Recommended continuity target | Current authored coverage |
| --- | --- | --- |
| Elias Morales | `normal`; tired working adult, restrained anger, kindness shown through action | Chapters 1–4, four MP3s |
| Lucia | `delicate`; affectionate voicemail, ordinary family intimacy | One voicemail MP3 |
| Marisol | `clear`; worried coworker, plainly spoken | One Chapter 1 MP3 |
| HR | `fancy`; smooth institutional euphemism, no villain growl | One Chapter 3 MP3 |
| Medi-Kiosk | `crisp`; politely immovable transaction system | One Chapter 4 MP3 |
| RGB System | `deep`; archival machine authority, distinct from main-game System | Chapters 5–6, two MP3s |
| RGB Narrator | `normal`; documentary restraint | Currently browser speech/fallback only |
| Robot 4A | Nonverbal | Servo SFX only; keep nonverbal |

Existing files live under `public/minigames/rgb/audio/voice/` and are mapped by `RGB_AUDIO_MANIFEST` and `HOTSPOT_AUDIO`. Do not overwrite them until a listening comparison confirms the new take is better and identity remains consistent across chapters.

### Roles intentionally not cast

- **Scout, Tank, and Engineer player operators:** keep silent. The current fallback labels unprefixed lines as an operator link, but this is UI attribution, not evidence that protagonists should speak.
- **NPC narration boxes:** keep readable text rather than having the NPC narrate their own stage directions.
- **Ordinary lore logs:** retain terminal texture; selectively voice only authored black-box recordings with an identified speaker.
- **Creature vocals:** treat as sound design, not generated human speech.

## 4. How to prompt the installed voice generator

### Tool-call pattern

For every role, audition once with `preview_transcript`, approve the identity, then generate one full file per runtime line.

```text
voice_id: <one of normal | clear | fancy | deep | crisp | delicate>
preview_transcript: <one representative line, under roughly 500 characters>
transcript: <the exact words the player must hear; no file name or stage directions>
```

The tool does not accept a separate descriptive prompt. Consistency comes from:

- using the same preset for every line from that role;
- preserving the role's punctuation and capitalization conventions;
- generating short gameplay lines separately rather than as a long monologue;
- keeping an approved audition clip as the comparison reference;
- applying character-specific processing after generation, not asking the model to speak “through a radio” in the transcript.

### Transcript-writing rules

- Remove the UI speaker prefix. Generate `Agent. You're alive.`, not `MOTHERSHIP: Agent. You're alive.`
- Expand symbols the voice may misread: use `oxygen` instead of `O₂` and spell coordinates as intended.
- Use periods for clipped authority, commas for a natural carry, and ellipses only for genuine hesitation or corruption.
- Avoid bracketed directions such as `[whispers]`; the tool may speak them.
- Keep combat callouts under about 2.5 seconds and story sentences under about 12 seconds where possible.
- Split multi-sentence UI beats into separate stable line IDs if they need independent subtitle timing.
- Preserve contractions for humans. Reduce contractions for Rhun, System, and formal corporate voices.
- Do not bake radio static, echo, reverb, music, or SFX into the generated master.

### Audition prompts

These are ready to use as both `preview_transcript` and `transcript` for casting previews.

| Role | `voice_id` | Audition transcript |
| --- | --- | --- |
| Mothership | `clear` | `Agent. You're alive. Your ship took a hypersonic strike on descent. Salvage what remains and await further instruction.` |
| System | `crisp` | `Oxygen field online. Atmospheric stability is temporary. Return to the blue field before reserves reach critical.` |
| Bunker | `deep` | `Unauthorized exploration detected. Local lighting has been suspended. Please enjoy the darkness responsibly.` |
| Queen | `delicate` | `Two heartbeats. One purpose. The Mothership calls from above, but I am already here with you.` |
| Martha | `delicate` | `Welcome to the warm pipes, child. The steam keeps us, and we keep each other.` |
| Briggs | `deep` | `Stop. Identify. Hands where the turrets can see them. Good. Now tell me what followed you here.` |
| Kaelen | `clear` | `The central computer sleeps under Sector Zero. Everything here is its dream. Even you, probably.` |
| Okonkwo-Vass | `crisp` | `They do not hate us. They read us. That is a hypothesis, operator, and I intend to test it.` |
| Nahl | `delicate` | `I felt your thread sever, and I stitched it back. Sit still. The Queen does not care that you hurt. I do.` |
| Vey | `crisp` | `Signal. Signal. You are a signal now, not just noise. Finally.` |
| Rhun | `deep` | `I guard. It is all I am. The question is only ever: guard what.` |
| Commander pack | `deep` | `Breach confirmed. Reloading. Hold the line.` |
| AURA pack | `crisp` | `Threat level high. Shield integrity critical. Overdrive is ready.` |

### Performance variants

The preset stays constant; punctuation and post-processing establish state.

| State | Transcript treatment | Processing treatment |
| --- | --- | --- |
| Corporate | Normal spelling, concise periods | Clean radio/terminal chain |
| Glitched | Author explicit broken syllables only where already written; do not randomly corrupt words | Dropouts, micro-stutters, narrow-band distortion on a duplicate |
| Reverent/infected | Lowercase is not a reliable performance instruction; rewrite for slower clauses and intimate punctuation | Warm harmonic layer and less radio filtering |
| Combat urgent | Short clause, strong verb first | Mild compression; never time-stretch beyond intelligibility |
| Intimate | Fewer ellipses than the current prose; let a clean pause do the work | Dry and close, reduced ambience |

## 5. File and line-ID contract

### Runtime assets

Use MP3 for consistency with the existing RGB authored voices. Keep lossless generation masters outside the shipped `public/` tree if the generator supplies them.

```text
art/source/audio/voice/<speaker>/<line_id>.wav       # optional lossless master
public/audio/voice/<speaker>/<line_id>.mp3           # shipped story voice
public/audio/generated/voice_commander_*.wav         # existing announcer contract
public/audio/generated/voice_aura_*.wav              # existing announcer contract
public/minigames/rgb/audio/voice/*.mp3                # existing RGB contract
```

Use lowercase snake case. A line ID describes story identity, not the complete transcript:

```text
voice_mothership_intro_agent_alive
voice_mothership_milestone_o2_foundry_signal
voice_system_act2_uplink_severed
voice_queen_act2_intro_two_heartbeats
voice_martha_stage0_warm_pipes
voice_nahl_death_thread_severed
voice_director_glitched_breaker
voice_wanderer_manic_hacker_befriend
```

Never use array index alone (`line_03`) as the canonical ID. Lines move as scripts evolve. A rewritten performance gets a take suffix during review (`_take02`), but the accepted shipped file returns to the stable canonical name.

### Proposed authored manifest

Add `src/data/voiceManifest.js` as the version-controlled runtime catalog. Keep transcript beside the key so tests can detect stale recordings.

```js
export const STORY_VOICE = Object.freeze({
    voice_mothership_intro_agent_alive: {
        speaker: 'mothership',
        text: "Agent {CLASS}. You're alive.",
        url: '/audio/voice/mothership/voice_mothership_intro_agent_alive.mp3',
        preset: 'clear'
    },
    voice_queen_act2_intro_two_heartbeats: {
        speaker: 'queen',
        text: 'Two heartbeats. One purpose.',
        url: '/audio/voice/queen/voice_queen_act2_intro_two_heartbeats.mp3',
        preset: 'delicate'
    }
});

export const STORY_VOICE_AUDIO = Object.entries(STORY_VOICE).map(([key, entry]) => ({
    key,
    url: entry.url
}));
```

For `{CLASS}` lines, record either a neutral replacement such as “Agent” or three explicit variants. Do not rely on a recorded clip saying the literal word “class.”

### Production tracking metadata

Create a non-runtime CSV or JSON ledger with:

```text
line_id, speaker, source_file, source_symbol, transcript, preset, status,
generated_date, generator, take, duration_ms, peak_db, reviewer, notes
```

Record the AI generation source, usage rights, date, preset, transcript, and any processing in `ASSET_PROVENANCE.md` or a dedicated authored-voice provenance document. Do not add these files to `docs/generated-audio-provenance.md`; that document specifically claims the current WAV set is deterministic oscillator-based audio.

## 6. Exact game connection plan

### Step A — load authored files

1. Add `src/data/voiceManifest.js`.
2. Import `STORY_VOICE_AUDIO` in `main.js`.
3. Spread those entries into the existing `manifest.audio` array near the current `voice_commander_*` and `voice_aura_*` entries.
4. Continue routing keys beginning with `voice_` to `AudioManager.voiceGain`; `AudioManager.play()` already does this.
5. A missing voice file must not block game boot. The existing asset loader already logs a failed audio fetch and continues.

### Step B — make dialogue data addressable

Change voiced dialogue from anonymous strings to objects containing a stable ID:

```js
{ id: 'mothership_intro_agent_alive', voiceKey: 'voice_mothership_intro_agent_alive', text: "MOTHERSHIP: AGENT {CLASS}. YOU'RE ALIVE." }
```

- `src/dialogue.js`: add `voiceKey` to `MOTHERSHIP_LINES`, class briefing lines, choice replies, and milestone lines.
- `src/act2.js`: convert `ACT2_LINES` and `ACT2_ENDING_LINES` entries to `{ id, voiceKey, text }`, then retain a normalizer so old string callers continue to work during migration.
- `src/data/campDialogue.js`: convert each beat string to an object or add a parallel ID map. Explicit objects are safer for editing and localization.
- `src/data/lineDirectorPools.js`: these lines already have IDs; derive or store `voiceKey` directly on each entry.
- `src/npcDialogueTrees.js`: each node already has a stable node key. Add `voiceKey` to the node.
- `src/wandererSystem.js`: add voice keys for `greeting`, `question`, `dialogueBefriend`, and `dialogueChase`, ideally as small dialogue objects.

### Step C — play one authored clip per displayed line

Change the dialogue path to pass the line object into `typeLine()` and call voice once:

```js
const voiceHandle = window.AudioManager?.playDialogueVoice?.(line.voiceKey, {
    speaker: speaker.name,
    fallbackText: speaker.cleanText
});
```

Add `AudioManager.playDialogueVoice(voiceKey, options)` with this behavior:

1. Respect global mute, `voiceEnabled`, and `voiceGain`.
2. Stop the prior non-overlapping story voice handle.
3. If `buffers[voiceKey]` exists, play it once on the voice bus with pitch variation disabled.
4. If it is missing, optionally play one short procedural vocalizer at line start—not repeated fragments.
5. Return a stoppable handle and expose `stopDialogueVoice()` for skip, close, scene change, and death.

Keep typewriter ticks separate on the SFX bus if desired. Do not call the voice method from the per-character loop.

### Step D — connect each presentation surface

| Surface | Connection point | Required change |
| --- | --- | --- |
| Fullscreen Mothership/Act 2 transmissions | `DialogueManager.typeLine()` in `src/dialogue.js` | Play `line.voiceKey` once; stop on skip/cancel |
| Camp/hive leader conversations | `openLeaderConversation` flow in `src/threeGame.js` into `DialogueManager` | Preserve line objects and IDs instead of flattening to strings |
| Mothership reactive HUD | `fireMothershipReactiveLine()` in `main.js` | Pass the returned line ID/voice key to the prompt event and play it |
| Director/bunker lines | `showBunkerLine()` in `src/threeGame.js` | Accept `{ text, voiceKey }` or a line object in event detail |
| Mature NPC modal | `updateNpcDialogueUi()` in `main.js` | On node change, play `node.voiceKey`; stop when a choice advances or modal closes |
| Wanderer encounter | spawn/choice handlers in `src/threeGame.js` | Play greeting/question/result voice key alongside its modal/text |
| Cosmetic callouts | `AudioManager.playVoiceCallout()` | Replace assets in place; no event rewrite needed |
| RGB archive | `HOTSPOT_AUDIO` in `src/minigames/rgb/audio.js` | Keep explicit maps; add new keys for uncovered beats as recordings arrive |
| Lore terminals | `lore-terminal-read` listener in `main.js` | Only play an explicit recording key; otherwise one terminal vocalizer at start |

### Step E — mixing and interruption

- Duck music by roughly 3–5 dB while a story voice is active; restore it with a short ramp when the clip ends or is stopped.
- Do not duck for very short cosmetic combat callouts unless playtests show masking.
- Story dialogue is non-overlapping and interrupts the prior story line.
- Combat callouts should not interrupt critical Queen/Mothership story dialogue; suppress or queue them while the dialogue modal owns input.
- All spoken content keeps its on-screen subtitle. The voice toggle disables speech, never text.
- Closing a modal, skipping a cutscene, restarting a run, or opening another transmission must stop the active source.

## 7. Production order

### Pass 1 — drop-in proof (12 clips)

Generate and replace the six Commander and six AURA callouts. This proves generation, download, normalization, runtime decode, voice-bus mixing, and Steam packaging without changing narrative code.

### Pass 2 — first hour (about 25–35 clips)

Record crash briefing, class-specific briefing, choice responses, O2 milestone, major system milestones, and the highest-priority Mothership reactive lines. Implement stable IDs and one-shot playback at the same time.

### Pass 3 — Act 2 spine

Record Queen/System Act 2 events and endings, then the leaders in this order:

1. Martha, Briggs, Kaelen.
2. Nahl, Vey, Rhun.
3. Okonkwo-Vass.

Record one complete role before moving to the next so casting drift is caught early.

### Pass 4 — optional character depth

Record mature NPC trees and wanderer archetypes after resolving the Martha/Val and Nahl identity questions. Review intimate lines in context; close-mic performance should not become breathy parody.

### Pass 5 — RGB completion

Audit the ten existing MP3s for loudness, continuity, and exact transcript match. Fill only missing story-critical beats and the narrator after the main game’s voice mix is stable.

## 8. Acceptance checks

### Automated

- Every data `voiceKey` exists in the voice manifest.
- Every manifest URL exists under `public/` and is included in the Vite build.
- No shipped voice manifest entry is orphaned.
- Opening one dialogue line calls authored playback exactly once.
- Advancing, closing, skipping, death, and run reset stop active story voice.
- Voice-disabled and voice-volume-zero modes create no source.
- Missing recordings fall back without throwing or blocking dialogue.
- Corporate/glitched/reverent variants resolve to the correct register key.
- RGB authored hotspots never also invoke browser speech.
- Both loadout item IDs, `4148` and `4149`, resolve every supported callout.

### Listening QA

- Speech remains intelligible over combat and ambience at the default mix.
- No generated file contains a spoken speaker label or stage direction.
- No two core machine voices are easily confused.
- Hive processing does not smear consonants or make subtitles mandatory.
- The same character retains pitch, pace, distance, and pronunciation across sessions.
- `Kaelen`, `Okonkwo-Vass`, `Cocytus`, `Rhun`, `Vey`, and `Nahl` have approved pronunciations recorded in the ledger.
- Callouts finish before the information becomes stale.
- Mature dialogue sounds like consenting adults and avoids youthful vocal characterization.

## 9. Definition of done

The voice pass is complete when authored clips are addressed by stable IDs, loaded through the normal asset manifest, routed through the existing voice bus, stopped correctly on UI transitions, backed by subtitles and missing-file fallbacks, covered by manifest/playback tests, and documented for provenance. Merely replacing the procedural WAVs is a useful first milestone, but it does not complete story voice integration.

## 10. Generated audition batch 01

**Review result: rejected on 2026-08-25. Do not use these voices or derive production assets from them.** The six-preset generator did not provide enough identity control for this cast. Replacement casting prompts are in `docs/elevenlabs-voice-design-prompts-11-core-roles-2026-08-25.md`.

Generated with the installed AI Voice Generator on 2026-08-25. These are retained only as a provenance record of rejected casting/review reels.

| Set | Preset | Contents | Full audio and download | Generation context |
| --- | --- | --- | --- | --- |
| Mothership Command 01 | `clear` | Crash briefing excerpt, seven beats | [Open Mothership audition](https://www.aidocmaker.com/g0/audio?name=22036e055e9c40148696b9a8d2f3a9d0) | `22036e055e9c40148696b9a8d2f3a9d0` |
| Queen 01 | `delicate` | Act 2 arc excerpt, six beats | [Open Queen audition](https://www.aidocmaker.com/g0/audio?name=7fa5f878e2f84af885d23bd0dad10390) | `7fa5f878e2f84af885d23bd0dad10390` |
| Commander pack 01 | `deep` | Six combat callout candidates | [Open Commander audition](https://www.aidocmaker.com/g0/audio?name=23334738f5484c37a1ceaa6064b9a368) | `23334738f5484c37a1ceaa6064b9a368` |
| AURA pack 01 | `crisp` | Six combat callout candidates | [Open AURA audition](https://www.aidocmaker.com/g0/audio?name=b63b6d07b02e454a9b364219f14dbe2b) | `b63b6d07b02e454a9b364219f14dbe2b` |

All four sets have status `reject` in the production record.
