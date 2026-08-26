# ElevenLabs Voice Design Prompts — 11 Core Hunker Bunker Roles

**Status:** casting-ready prompt bible  
**Date:** 2026-08-25  
**Target:** ElevenLabs Voice Design v3 / Text to Voice  
**Roles:** Mothership Command, System/Exosuit, Bunker Director, the Queen, Sister Martha, Commander Briggs, Overseer Kaelen, Dr. Okonkwo-Vass, Nahl, Vey, and Rhun

## 1. Purpose

This document replaces the coarse six-preset auditions with detailed ElevenLabs Voice Design prompts. It is a casting document, not a request to make one generated performance carry an entire role. Use each prompt to generate three identity previews, select or reject the identity, save the approved voice, and only then render the character's individual production lines.

The eleven voices are designed as one ensemble. They must remain immediately distinguishable under combat noise:

| Vocal space | Roles | Shared quality | Required contrast |
| --- | --- | --- | --- |
| Corporate machinery | Mothership, System, Bunker Director | Precise, emotionally constrained | Mothership is human bureaucracy; System is immediate and clinical; Bunker is old, dry, and watchful |
| Human survivors | Martha, Briggs, Kaelen, Okonkwo-Vass | Tired adults with tactile, grounded speech | Care, command, engineering skepticism, and scientific curiosity must not collapse into generic grit |
| Hive consciousness | Queen, Nahl, Vey, Rhun | Calm nonhuman certainty | Intimate control, empathy, signal hunger, and oath-bound physicality each need their own rhythm |

The Scout, Tank, and Engineer protagonists remain silent.

## 2. ElevenLabs setup

ElevenLabs currently recommends a Voice Design description structured as native language/dialect, gender and age, quality, persona, emotion, then specific timbre, pacing, and delivery. Voice descriptions accept 20–1000 characters; preview text accepts 100–1000 characters. Longer preview text generally produces a more stable identity than isolated callouts.

### Starting settings

These are audition starting points, not immutable production values.

| Control | Start | Why |
| --- | --- | --- |
| Model | Voice Design v3 / `eleven_ttv_v3` when available | Best target for expressive character voices and later Eleven v3 delivery |
| Guidance | 30% for humans and machines; 35% for hive roles | Detailed prompts generally benefit from moderate rather than extreme guidance |
| Loudness | Neutral/default | Loudness is normalized later; do not cast by volume |
| Quality | Highest practical preview quality | Evaluate identity, not codec damage |
| Preview count | All three returned options | Voice Design produces alternatives; never approve the first by default |
| Seed | Record it when using the API | Makes a promising generation reproducible |
| Enhancement | Off for the first pass | Preserve the exact authored prompt; test enhancement only as a controlled variant |

### Prompt rules

- Paste only the `VOICE DESCRIPTION` block into Voice Design.
- Paste the corresponding `PREVIEW TEXT` into Text to Preview.
- Do not paste the role name, rejection criteria, pronunciation notes, or post-processing notes into either field.
- Do not put radio, telephone, tape, reverb, echo, vocoder, or corruption effects in the `VOICE DESCRIPTION` identity prompt. Those terms can damage casting output. The separate `PREVIEW TEXT` may use sound-effect tags to stage the full scene, while the approved production voice is also rendered clean and dry.
- Do not use a celebrity, actor, streamer, public figure, or existing game character as a reference.
- Treat age as vocal age. Every human or human-presenting role is unmistakably adult.
- The preview is deliberately multi-emotional and uses inline Eleven v3 direction. A voice that works only for its first sentence is not production-ready.

### Eleven v3 direction syntax used below

Eleven v3 does **not** support SSML `<break>` tags. Its scripts use bracketed natural-language audio tags, punctuation, and physical line breaks instead:

```text
[short pause]    brief intentional beat
[pause]          normal dramatic beat
[long pause]     major thought or reveal boundary
[deliberate]     slower, controlled phrasing
[rushed]         compressed urgent phrasing
[softly]         reduced intensity without necessarily whispering
[whispers]       actual whispered delivery; use rarely
[exhales]        audible human release
[sighs]          emotionally weighted breath
[laughs softly]  restrained character reaction, not generic comedy
```

Tags are written immediately before the words they affect. Blank lines divide performance paragraphs and usually create a larger conceptual break. Ellipses add weight or hesitation; em dashes create a sharper interruption. Capitalization is reserved for an occasional stressed word, not entire scripts.

The full-foley previews additionally use manually authored environmental tags such as `[radio static crackles]`, `[breaker slams]`, and `[massive chitin plates shift]`. Eleven v3 officially demonstrates sound-effect tags such as `[gunshot]` and `[explosion]`, and permits experimentation with similar audible descriptions. These more specific tags are deliberately treated as experimental: the ElevenLabs **Enhance** function is instructed to add voice-only tags, so it will not build this environmental pass automatically. If v3 speaks a tag aloud, produces the wrong effect, or masks dialogue, remove that tag and use the separate Sound Effects/layered workflow in section 14.

Do not mix v3 tags with SSML. If production later moves a line to Multilingual v2, Flash v2, or Flash v2.5, replace pause tags with explicit syntax such as `<break time="1.0s" />`; do not send that syntax to Eleven v3.

### Ensemble frequency plan

This plan is descriptive, not a request for exact hertz values.

| Role | Perceived register | Texture | Rhythm |
| --- | --- | --- | --- |
| Mothership | Mid | Smooth, firm, minimally warm | Even clauses, policy-shaped emphasis |
| System | Upper-mid | Clean, light, exact | Short metrical bursts |
| Bunker | Low | Dry, dense, old | Slow, sardonic conclusions |
| Queen | Mid-low | Velvety, intimate, controlled | Fluid clauses, dangerous pauses |
| Martha | Mid | Warm, weathered, embodied | Gentle but practical |
| Briggs | Low | Chest-resonant, lightly rough | Command first, warmth last |
| Kaelen | Mid-low | Dry, narrow, alert | Technical momentum, clipped wit |
| Okonkwo-Vass | Mid | Clear, energetic, humane | Hypothesis-driven acceleration |
| Nahl | Mid-high | Soft, luminous, steady | Careful thought groups |
| Vey | Upper-mid | Lean, bright, uncanny | Repetition and abrupt discovery |
| Rhun | Very low | Broad, stable, restrained | Deliberate oath-like units |

## 3. Prompt 01 — Mothership Command

### Dramatic function

Mothership is remote corporate authority disguised as rescue support. It should initially sound reassuring because it is competent, not because it is kind. As the story darkens, the same voice must deliver extermination orders without turning into a theatrical villain. Its menace is procedural certainty.

### VOICE DESCRIPTION

```text
Native English, neutral North American dialect. Androgynous adult voice, perceived age 38–48. Excellent studio quality. Persona: orbital operations controller. Emotion: composed, detached, quietly authoritative. Smooth mid-register timbre with firm consonants, restrained warmth, minimal breath, and a natural human core beneath institutional discipline. Even, measured pacing around a calm conversational rate; short pauses divide information into operational clauses. Important nouns and status changes receive precise emphasis, while threats remain level and administrative. The voice never shouts, performs action-hero bravado, becomes cheerful, sounds seductive, or slips into a cartoon robot. It should sound credible giving rescue instructions and deeply unsettling when the same professionalism authorizes a purge.
```

### PREVIEW TEXT

```text
[radio static crackles] [electronic carrier chirp] [measured] Agent. [short pause] You're alive. [distant metal impact] Your ship took a hypersonic strike on descent, but the salvage console remains operational. [console beeps] Bank what you recover and rebuild the vessel — system by system.

[low radio interference] [pause] [firmly] Warning: an unauthorized biological signal has entered the channel. [faint organic clicking beneath static] Do not answer it. [warning alarm pulses] [rushed] Your vital signs are critical. An early extraction window is open.

[radio signal drops out] [long pause] [coldly] Correction: recovery has been abandoned. [distant launch rumble] Orbital extermination is now authorized. [short pause] Remain where you are. [carrier tone ends] [static cuts to silence]
```

### Direction after saving the voice

- Baseline read: objective, useful, never hurried.
- Critical warnings: compress pauses, add urgency through articulation rather than volume.
- Act 2 hostility: slow by roughly 5%; make final words land like completed paperwork.
- Radio texture is post-processing only. Preserve a dry master.

### Reject if

- It sounds like a movie trailer, military drill instructor, superhero handler, customer-service parody, or seductive AI.
- It is fully robotic; the bureaucracy is frightening because a recognizable person could be behind it.
- Sentence endings rise like questions or soften into apology.
- Urgent material causes shouting, rasp, or melodramatic anger.

## 4. Prompt 02 — System / Exosuit

### Dramatic function

System is the local diagnostic layer around the operator's body. It reports oxygen, hull, infection, manifests, and launch state. Unlike Mothership it has no agenda at first; unlike Bunker it has no humor. Later register changes reveal corrupted logic and Queen influence.

### VOICE DESCRIPTION

```text
Native English, neutral international pronunciation with no strong regional dialect. Feminine-leaning gender-neutral adult voice, perceived age 28–38. Excellent studio quality. Persona: embodied diagnostic system. Emotion: neutral, attentive, exact. Clean upper-mid timbre, light vocal weight, very low breath noise, crisp consonants, stable pitch, and no synthetic caricature. Even pacing with compact phrases and consistent spacing between technical terms; numbers, warnings, and state changes are exceptionally legible. Delivery feels close, immediate, and informational, as though the listener has heard it for years. No sarcasm, sales warmth, maternal comfort, panic, vocal fry, singsong melody, or exaggerated robotic staccato. Subtle damaged uncertainty must remain possible without changing the core identity.
```

### PREVIEW TEXT

```text
[soft electronic boot tone] [air valve opens] [oxygen rushes through vents] [evenly] Oxygen field life support at one hundred percent. [confirmation chime] [short pause] Base console stabilized. [hydraulic brace locks] Hull integrity expanded. Structural capacity increased.

[data relay clicks] [signal abruptly disconnects] [pause] Uplink severed. Mothership telemetry lost. [heartbeat monitor accelerates] [rushed] Warning: operator respiration is approaching critical limits.

[scanner sweeps] [faint electrical glitch] [slows down] Residual neural activity detected beneath the approved signal floor. [data processing beeps] Manifest check complete. Four seats pressurized. [long pause] [single extra heartbeat] Five heartbeats detected. [short pause] Recounting… [scanner sweeps again] [pause] Five heartbeats detected. [low error tone]
```

### Direction after saving the voice

- Keep normal system lines rhythmically consistent.
- For glitched lines, preserve the performance and add edits, dropouts, and duplicate fragments in post.
- For reverent lines, reduce the clinical spacing and allow slightly longer vowels; do not recast the voice.
- Pronounce `O₂` as “oxygen” in render scripts.

### Reject if

- It sounds like Mothership with a higher pitch.
- It becomes cute, perky, apologetic, snide, or conspicuously sensual.
- Technical phrases blur or numbers lose intelligibility.
- The delivery is a monotone with no usable distinction between routine and anomaly.

## 5. Prompt 03 — Bunker / Facilities Director

### Dramatic function

The Bunker is an old industrial intelligence embedded in the structure. It observes movement, power use, depth, and rule-breaking. Its dry humor is not a comedy routine; jokes are machine-generated conclusions delivered with ancient patience.

### VOICE DESCRIPTION

```text
Native English, neutral North American dialect. Masculine adult voice, perceived age 58–70. Excellent studio quality. Persona: obsolete facilities intelligence. Emotion: dry, watchful, faintly disapproving. Low-pitched dense timbre with restrained chest resonance, slightly worn edges, precise diction, and very little breathiness. Slow, deliberate pacing with small pauses before bureaucratic reversals and understated final words. The intelligence sounds old because it has processed decades of failures, not because it is frail. Humor is delivered completely straight, with only a trace of private amusement. Avoid booming trailer narration, horror growls, jovial grandfather warmth, theatrical evil, slurred gravel, and obvious robot voices. Every word must remain clear beneath ambience.
```

### PREVIEW TEXT

```text
[deep machinery hum] [fluorescent lights buzz] [deliberate] Unauthorized exploration detected. [breaker slams] [lights power down] Local lighting has been suspended. [short pause] [understated] Please enjoy the darkness responsibly.

[distant metal groan] [slow mechanical footsteps begin far away] [pause] Movement logged. Facilities has dispatched a welcome committee to your position. [footsteps draw closer] Your curiosity continues to exceed your clearance.

[relay bank clacks from left to right] [long pause] Power has been rerouted to a department that resents you. [compass electronics sputter] Navigation telemetry is no longer considered authoritative. [subterranean structure creaks] [slows down] The structure notes your depth… and disapproves. [machinery hum stops]
```

### Direction after saving the voice

- Let the joke live in syntax, never add a wink or laugh.
- Use slightly longer pauses at greater depth to imply increased attention.
- PA resonance and structural vibration are added after rendering.
- Glitched Bunker variants should sound damaged, not possessed; Queen register material may then soften the same voice unnaturally.

### Reject if

- The actor sounds gleefully evil or broadly comedic.
- Low pitch destroys consonants on “unauthorized,” “telemetry,” or “responsibly.”
- It resembles Briggs; Bunker must feel disembodied and unhurried.
- Age becomes weakness, wheezing, or a shaky elderly stereotype.

## 6. Prompt 04 — The Queen

### Dramatic function

The Queen is the central seducer, biological intelligence, antagonist, and potential ally. She speaks inside the operator rather than across a room. Her authority is intimate certainty. She rarely needs volume; anger narrows and cools instead of exploding.

### VOICE DESCRIPTION

```text
Native English, neutral international pronunciation with no identifiable regional dialect. Feminine adult voice, perceived age 38–50. Excellent studio quality. Persona: ancient intimate sovereign. Emotion: tender, certain, possessive. Velvety mid-low timbre with rich resonance, clean consonants, controlled breath, and a close natural presence; beautiful but unmistakably mature. Slow fluid pacing, joining thoughts into graceful clauses, with deliberate silence before words such as carrier, heart, together, and ours. Affection and threat occupy the same calm delivery. Anger becomes quieter, colder, and more exact rather than louder. Never breathy pin-up seduction, innocent fairy softness, witch cackling, monster growling, regal stage projection, ASMR exaggeration, or maternal baby talk. The listener should feel understood, claimed, and endangered.
```

### PREVIEW TEXT

```text
[slow human heartbeat] [second deeper heartbeat fades in] [softly] Two heartbeats. [short pause] One purpose. [ice cracks softly] The cold box they kept me in could not freeze the mind… [wet neural tendrils shift] and now we share the body.

[distant radio whisper under static] [pause] [quietly] The Mothership still whispers through your wreck. [orbital signal pulses overhead] It will send exterminators. [whispers] Sever the uplink, Carrier. [electrical cable tears free] [radio dies]

[hive chamber resonates] [long pause] [satisfied exhale] Good. Their grid dies with it. [multiple muffled heartbeats emerge] You hide warm bodies in my ship, and I feel every heartbeat. [coldly] You may call that mercy. I call it a door left open.

[organic membrane closes softly] [softly] Sleep now. [pause] When you wake, we choose a new world. [heartbeats synchronize] [low hive resonance fades]
```

### Direction after saving the voice

- Use plain text for most production lines; reserve `[whispers]` for rare authored moments.
- The word “Carrier” is relational, not a fantasy title shouted to an audience.
- Obedient-path warmth should be genuine enough to complicate the player's judgment.
- Create hive width from a quiet doubled layer in post; never sacrifice the central dry performance.

### Reject if

- It reads as conventionally sexy, breathy, youthful, campy, or witch-like.
- Threats acquire a villain smile or overt relish.
- The voice sounds physically distant or theatrically projected.
- Tender lines lose the impression of immense intelligence and control.

## 7. Prompt 05 — Sister Martha

### Dramatic function

Martha leads Camp Tallow, where steam, cultivated growth, ritual, and bodily care are survival infrastructure. She is a spiritual caretaker and capable Scout, not a fragile mystic. Her intimacy grows from attention to temperature, pulse, plants, and work.

### VOICE DESCRIPTION

```text
Native English, neutral North American dialect with a very slight rural softness, never a broad regional accent. Feminine adult voice, perceived age 45–55. Excellent studio quality. Persona: survivalist spiritual caretaker. Emotion: warm, vigilant, quietly tired. Medium-pitched mellow timbre with grounded chest warmth, lightly weathered texture, clear articulation, and natural breath. Relaxed conversational pacing that becomes brisk and practical when danger or work is named. Ritual phrases carry sincere belief without sermon cadence; terms of care sound earned rather than sugary. Strength stays present beneath gentleness. Avoid youthful ingénue energy, frail mysticism, breathy seduction, exaggerated maternal cooing, folk caricature, and melodramatic grief. She can command a perimeter, tend a wound, and confess fear with the same recognizable voice.
```

### PREVIEW TEXT

```text
[steam pipes hiss] [camp fire crackles] [ceramic cup settles on metal] [warmly] Welcome to the warm pipes, child. The steam keeps us… and we keep each other. [short pause] [wet leaves rustle] The moss is warm because we carried it here one living tray at a time.

[distant creature shrieks] [rifle sling shifts] [firmly] Do not mistake care for softness. [quick footstep and cloth movement] I can cross that perimeter before your rifle clears its sling. [rifle mechanism clicks safe]

[radio static fades in and goes flat] [long pause] [exhales] You died out there. I felt the cold arrive before the radio did. [fire settles] [softly] Give me your hand. [glove and fabric move] The other one. [short pause] There. [faint irregular heartbeat] [worried] Your pulse is counting something I do not recognize. [steam hisses softly]
```

### Direction after saving the voice

- “Child” is community language addressed to an adult, never infantilizing.
- Practical clauses move faster than ritual clauses.
- Later suspicion tightens consonants and removes warmth without turning Martha shrill.
- Corrupted boss material should preserve her identity under processing.

### Reject if

- She sounds naïve, dreamy, elderly, coquettish, or like a generic fantasy priestess.
- Warmth erases field competence.
- The slight rural softness becomes a distracting or stereotyped accent.
- Danger lines require a different apparent actor to feel credible.

## 8. Prompt 06 — Commander Briggs

### Dramatic function

Briggs leads Camp Vesper's former security personnel. He is suspicious, tactical, physically imposing, and capable of unexpected restraint. He speaks in commands because brevity kept people alive; tenderness arrives indirectly through logistics, scars, and who covers whose back.

### VOICE DESCRIPTION

```text
Native English, neutral North American dialect. Masculine adult voice, perceived age 48–60. Excellent studio quality. Persona: exhausted defensive commander. Emotion: guarded, decisive, loyal. Low chest-resonant timbre with a lightly gravelled edge, firm consonants, controlled breath, and substantial vocal weight without forced bass. Brisk command pacing at sentence openings, followed by measured assessment; private lines slow slightly and allow warmth to appear in the final clause rather than throughout. Authority is habitual, not performed. Avoid drill-sergeant shouting, action-movie swagger, macho parody, constant anger, slurred rasp, cowboy coloring, and sentimental softness. The voice must remain intelligible during combat and believable when speaking quietly to one trusted person.
```

### PREVIEW TEXT

```text
[automated turret swivels] [weapon safety disengages] [sharply] Stop. Identify. [short pause] A corporate suit. [exhales] Fine. Keep your hands where the turrets can see them. [turret motor holds position]

[distant barricade takes a heavy impact] [loose shell casing rolls] [rapid-fire] The defense line is solid, but solid is not the same as safe. [rifle magazine seats firmly] Check the southern barricade, count every magazine, and tell me what moved beyond the flare. [flare ignites outside]

[radio transmission collapses into static] [long pause] [quietly] You died out there. I heard the frequency go empty. [metal chair scrapes] Sit down. Do that again. Blink. [short pause] There. That is new. [paper ledger opens] [understated] I am not putting it in the ledger yet. [ledger closes]
```

### Direction after saving the voice

- Never shout a line that can be made urgent through timing.
- Use short breaths between orders, not inside them.
- Intimate dialogue retains weight and restraint; it does not become a romance-novel growl.
- Combat radio treatment is added to a clean master.

### Reject if

- It sounds like an imitation of a famous soldier character or actor.
- Gravel obscures words or feels deliberately “cool.”
- Every line carries identical anger.
- Quiet material becomes seductive performance instead of guarded human contact.

## 9. Prompt 07 — Overseer Kaelen

### Dramatic function

Kaelen leads Camp Meridian and treats the Bunker grid as both machine and sleeping divinity. He is a skilled engineer whose skepticism protects a capacity for awe. His humor is dry; intimacy emerges when technical observation becomes personal.

### VOICE DESCRIPTION

```text
Native English, neutral North American dialect. Masculine adult voice, perceived age 42–54. Excellent studio quality. Persona: skeptical systems overseer. Emotion: analytical, sleep-deprived, fascinated. Mid-low narrow timbre with a dry clean texture, alert consonants, restrained nasal brightness, and modest vocal weight; neither booming nor gravelly. Natural conversational pacing that accelerates slightly through technical chains, then stops cleanly for a dry conclusion. Questions sound diagnostic rather than uncertain. Wonder appears as focused attention, not breathless excitement. Avoid mad-scientist theatrics, smug tech-bro cadence, robotic monotone, mystical sermonizing, broad sarcasm, and romantic purring. He should sound equally credible repairing a generator, challenging a doctrine, and noticing an impossible change in someone's pulse.
```

### PREVIEW TEXT

```text
[transformer hum] [relay switches chatter] [assessing] Another suit from the surface. The machine dreamed you would come. [short pause] The grid keeps the dark at bay, operator — [electrical arc snaps] as long as the lights hum and nobody improvises with the primary bus.

[console keys click rapidly] [curious] The central computer sleeps under Sector Zero. [deep server pulse] Everything here may be its dream. [pause] Even you, probably. [laughs softly] [dryly] No offense. [soldering iron hisses]

[interface cable clicks into armor] [electric diagnostic tone rises] [long pause] [focused] Sit still. Your sensory telemetry is fluctuating in a pattern I have never seen. [oscilloscope beeps irregularly] [quieter] Your pulse reads through the floor plating now. It did not before. [short pause] I checked. [diagnostic tone cuts out]
```

### Direction after saving the voice

- Technical terms should gain momentum without becoming fast or showy.
- Dry jokes land by returning immediately to work.
- Awe slightly widens the voice but does not raise pitch dramatically.
- Corrupted Kaelen keeps recognizable articulation beneath cybernetic processing.

### Reject if

- It sounds like Briggs with less gravel.
- Technical delivery becomes smug, frantic, eccentric, or comedic.
- Mystical lines turn into cult-leader projection.
- Intimacy reads as practiced charm rather than involuntary attention.

## 10. Prompt 08 — Dr. Okonkwo-Vass

### Dramatic function

Okonkwo-Vass is the field scientist who recognizes that the shelled creatures read behavior rather than merely attack. She changes the player's relationship with the fauna through observation, humility, and an experiment that could prove her career wrong.

### VOICE DESCRIPTION

```text
Native English, educated Nigerian English with a light, authentic Lagos influence; the dialect is clear to an international audience and never exaggerated. Feminine adult voice, perceived age 38–48. Excellent studio quality. Persona: humane field xenobiologist. Emotion: incisive, curious, cautiously hopeful. Clear medium register with warm undertones, precise consonants, agile pitch movement, and contained physical energy. Conversational pacing is efficient and evidence-led; hypotheses accelerate slightly, while ethical admissions slow and become plain. Excitement sounds like a scientist seeing data align, not a manic breakthrough. Avoid caricatured accent, lecturer stiffness, breathless nerd enthusiasm, clinical coldness, maternal sweetness, and broad comedy. She is brave enough to test her theory and humble enough to name the harm caused by being wrong.
```

### PREVIEW TEXT

```text
[field scanner chirps] [distant shell scrapes across stone] [observant] You move like someone who has not been bitten yet. [notebook page turns] I study the shelled ones, and they are not as simple as the reports say. Every camp logs them as vermin. [dismissive] That is lazy science.

[sample vial clicks into analyzer] [scanner pulses quicken] [quickening with curiosity] Here is my theory: they do not hate us. They READ us. [creature clicks softly in response] Something about what we carry may change the answer.

[rifle lowers] [pause] [firmly] So do not kill the next one. Stand your ground and let it decide. [slow heavy shell movement approaches] If I am wrong, you lose a few minutes. [long pause] [creature emits a calm resonant chirp] If I am right… [laughs softly] [hopeful] we owe them more than a footnote. [pencil writes quickly]
```

### Direction after saving the voice

- Pronounce **Okonkwo-Vass** approximately `oh-KON-kwoh vahs`; approve with the narrative team before final rendering.
- The light dialect choice is an original casting proposal, not established canon; if authenticity cannot be reviewed, use neutral international English instead.
- Her final success should briefly break professional restraint, then settle into accountability.
- Do not use a “scientist voice” effect.

### Reject if

- The dialect is inconsistent, stereotyped, difficult to understand, or appears only on selected words.
- Curiosity becomes whimsy or eccentricity.
- Ethical lines sound sanctimonious.
- Excited lines become much younger in apparent age.

## 11. Prompt 09 — Nahl, the Suture

### Dramatic function

Nahl is a hive intelligence defined by care, repair, equality, and chosen connection. He is the counterargument to the Queen's coercion. His alien qualities come from attention and unusual metaphors, not from monster effects.

### VOICE DESCRIPTION

```text
Native English, neutral international pronunciation with no strong regional dialect. Masculine-leaning androgynous adult voice, perceived age 34–46. Excellent studio quality. Persona: empathic biological surgeon. Emotion: gentle, sorrowful, steadfast. Medium-to-high smooth timbre with warm resonance, soft edges, immaculate consonants, and a faintly luminous tonal quality produced by performance rather than effects. Slow measured pacing organized into careful thought groups, with quiet emphasis on consent, choice, hurt, and repair. The voice listens even while speaking. Strength appears as unwavering calm, never dominance. Avoid whispery fragility, ethereal elf performance, mystical sing-song cadence, clinical detachment, romantic breathiness, monster resonance, and naïve innocence. He must feel nonhuman, adult, intelligent, and morally grounded.
```

### PREVIEW TEXT

```text
[wet membrane flexes] [biological relay hums] [surprised] [softly] Oh. [short pause] You can hear me now. [fluid drips into a shallow pool] I felt every sac you cut, little Carrier… [organic fibers tighten] and I healed around the holes you left.

[distant hive choir vibrates] [firmly] Do not look away. Pain is information, but it is not permission. [sorrowful] The Queen sees every death and calls it growth. [short pause] I do not. [hive choir recedes]

[neural thread snaps] [long pause] [gentle exhale] I felt your thread sever… [living fibers weave together] and I stitched it back because I chose to keep you here. [two soft heartbeats begin apart] [softly] Love and shared consciousness require two separate hearts… choosing to beat in rhythm. [heartbeats align]
```

### Direction after saving the voice

- Pronounce **Nahl** as one open syllable, approximately `nahl`.
- “Little Carrier” is compassionate recognition, not flirtation or infantilization.
- Add only a subtle harmonic double in post; the dry voice must work alone.
- Use the same saved identity for `Dr. Nahl` unless canon explicitly separates the characters.

### Reject if

- The voice reads as young, weak, elven, angelic, or conventionally seductive.
- Calm becomes low-energy or sleepy.
- Care sounds paternalistic.
- Alien material depends on an audio effect to feel distinct.

## 12. Prompt 10 — Vey, the Listener

### Dramatic function

Vey experiences the world as signals, gaps, static, forgery, and listening. Their repetitions are moments of acquisition rather than nervous stutters. They are the most rhythmically alien core speaker and must still remain highly intelligible.

### VOICE DESCRIPTION

```text
Native English, neutral international pronunciation. Androgynous adult voice, perceived age 26–40. Excellent studio quality. Persona: signal-hungry neural listener. Emotion: alert, wounded, intensely curious. Lean upper-mid timbre with bright clean overtones, little chest weight, exact consonants, and controlled energy; unusual but recognizably adult. Pacing alternates between brief repeated words, abrupt analytical bursts, and sudden complete stillness. Repetition sounds like locking onto a frequency, never a comic stammer. Emotional closeness reduces speed and sharpness without becoming soft or romantic. Avoid childlike pitch, hyperactive chatter, glitch-robot cliché, nasal caricature, singsong alien speech, random stuttering, and vocal fry. The identity must survive without electronic effects and make every signal metaphor feel physically perceived.
```

### PREVIEW TEXT

```text
[antenna chirps once] [static burst] [alert] Signal. [short pause] [antenna chirps twice] Signal. [frequency locks with a clear tone] [with sudden recognition] You are a signal now, not just noise. Finally.

[filaments strain and tear] [rapid-fire] I heard every filament you ripped out of me. [data tone records] I archived the sound. [human radio chatter far away] The humans have a relay. [low hive chorus answers] The Queen has a choir. [long pause] [signal drops into an empty hum] [wounded] I have… gaps where you mined me.

[static gradually clears] [softening] The static quiets when you are near. [orbital carrier signal emerges] [curious] I can hear the Mothership from here, Carrier. It is very loud — and very sure of itself. [short pause] [mischievously] Sure things are the easiest to forge. [false clearance tone duplicates the carrier] [both signals vanish]
```

### Direction after saving the voice

- Pronounce **Vey** to rhyme with `day`.
- Maintain identical tone on a repeated word, then shift on the discovery that follows.
- Antenna chirps belong between sentences in post, never under consonants.
- Reserve production audio tags for rare reactions; the default rhythm is already expressive.

### Reject if

- Repetition sounds accidental, anxious, cute, or comedic.
- The voice appears adolescent.
- Brightness becomes nasal or piercing.
- The delivery is so erratic that subtitles become necessary for ordinary lines.

## 13. Prompt 11 — Rhun, the Shield

### Dramatic function

Rhun is a living defensive structure learning that an oath may be chosen rather than inherited. His speech is physical, sparse, and morally direct. Low pitch must convey mass without sacrificing human-scale intimacy or intelligibility.

### VOICE DESCRIPTION

```text
Native English, neutral international pronunciation with no strong regional dialect. Masculine adult voice, perceived age 45–60. Excellent studio quality. Persona: living oath-bound guardian. Emotion: restrained, solemn, protective. Very low broad timbre with stable chest resonance, clean unforced bass, minimal rasp, controlled breath, and slow muscular articulation. Deliberate pacing divides language into short complete units; silence carries consideration rather than confusion. He never wastes emphasis. Loyalty warms the center of the voice without lifting its pitch, while anger becomes harder and more still. Avoid booming deity narration, monster growls, fantasy-orc caricature, caveman simplicity, sluggish speech, macho swagger, and theatrical nobility. Every consonant must remain legible, and quiet lines must feel as physically substantial as commands.
```

### PREVIEW TEXT

```text
[massive chitin plates shift] [heavy footstep impacts stone] [deliberate] The one who pried my plates. [pause] Stand still so I may look at you. [armor creaks under weight]

[slow armored breathing] [long pause] No. [claw retracts against stone] You are not prey. You are not Queen. [low plate resonance] You are something new… wearing old armor.

[distant impact strikes chitin] [slowly] I guard. It is all I am. The question is only ever: guard what. [pause] [forearm shield unfolds and locks] A shield that changes hands is still a shield. A shield that hesitates… is a gravestone.

[biological brand sizzles and fades] [deep exhale] It is done. Her mark fades from my plates. [heavy step moves forward] [quietly] [with certainty] Where you stand, I stand in front. [shield plants into stone] [debris settles]
```

### Direction after saving the voice

- Pronounce **Rhun** as one syllable, approximately `roon`.
- Do not stretch every vowel; mass comes from resonance and timing.
- Private loyalty lines get quieter but not breathier.
- A subtle subharmonic may be tested in post, but clarity at the dry-master stage is mandatory.

### Reject if

- It sounds like a monster, god, trailer narrator, barbarian, or simple-minded brute.
- Bass is forced, unstable, or muddy.
- Slow pacing feels drugged or vacant.
- Tenderness causes a sudden different vocal placement.

## 14. Full-foley production blueprint

The inline previews above are intentionally “fully staged” stress tests. They ask Eleven v3 to perform the character and sketch the scene in one pass. That is useful for judging atmosphere, but a single generated file is not the production master: a perfect line with a bad impact should not force a voice regeneration.

### Required deliverables per scene

Produce five separable layers:

1. **Dry voice:** the approved character with voice-only emotional and nonverbal tags.
2. **Room tone:** a seamless ambience bed with no speech, melody, or large transient.
3. **Foley:** close physical actions such as cloth, armor, pages, tools, membranes, or footsteps.
4. **Technology/creature cues:** radio, scanners, alarms, hive tones, and other authored world signals.
5. **Composite review mix:** the dry voice and separate effects assembled to match the inline full-foley preview.

Use the one-pass v3 render only as a direction reference. Generate complex effects in short separate segments and assemble them manually, following the pasted ElevenLabs guidance on layered outputs and manual adjustments.

### Mixing hierarchy

| Layer | Target behavior |
| --- | --- |
| Voice | Always dominant and centered; retain a dry archival master |
| Sync foley | Audible in the intended gap, normally 8–14 dB below speech |
| Information cue | May briefly approach the voice level before or after speech, never over a critical noun |
| Room tone | Felt continuously, normally 18–26 dB below speech |
| Low-frequency event | High-pass or duck under dialogue so bass does not mask consonants |
| Tail | End naturally or be authored as a loop; never cut at the file boundary |

Do not place music in TTS or foley generations. Music remains on the game's dedicated music bus.

### Foley prompt 01 — Mothership communications

**Room tone prompt**

```text
Twelve-second seamless science-fiction communications channel ambience from a damaged orbital command network: very low broadband radio hiss, restrained encrypted data texture, faint distant relay pulses, sterile and controlled, no voices, no intelligible Morse code, no melody, no alarm, no large transient, clean loop point, game-ready stereo but narrowly centered.
```

**Opening cue prompt**

```text
One-and-a-half-second military spacecraft communications link acquisition: a brief dry static crackle, two precise digital handshake chirps, then a stable carrier lock; clean isolated sound effect, no voice, no music, no reverb tail, immediate readable transient.
```

**Threat cue prompt**

```text
Four-second distant orbital launch heard through a radio telemetry link: restrained warning pulse, massive engine ignition far above a planet, low controlled rumble transmitted through compression, then the signal limits the bass; ominous but realistic, no voice, no melody, no cinematic braam.
```

**Closing cue prompt**

```text
One-second encrypted radio carrier termination: narrow electronic end tone, abrupt static collapse, absolute clean silence at the tail; no voice, no music.
```

### Foley prompt 02 — System / Exosuit interior

**Room tone prompt**

```text
Twelve-second seamless interior exosuit life-support ambience: quiet filtered airflow close around the helmet, tiny servo corrections, soft medical electronics, sealed pressure system, intimate and clean, no voice, no melody, no warning alarm, no footsteps, subtle stereo enclosure, clean loop point.
```

**Startup cue prompt**

```text
Three-second exosuit life-support startup sequence: soft electronic boot tone, pressure valve opens, oxygen rushes into a sealed helmet, two hydraulic braces lock, and a restrained confirmation chime; crisp isolated game foley, no speech, no music, minimal room tail.
```

**Anomaly cue prompt**

```text
Four-second medical scanner anomaly sequence inside a spacesuit: smooth scanner sweep, faint digital checksum glitch, four normal heartbeat pulses followed by one unexpected deeper extra heartbeat, recounting sweep, low unresolved error tone; clinical rather than horror-stinger, no voice, no music.
```

**Disconnect cue prompt**

```text
Two-second suit uplink severing: rapid relay clicks, compressed data stream pinches off, carrier vanishes, one dry diagnostic tick remains; no explosion, no speech, no music.
```

### Foley prompt 03 — Bunker / Facilities Director

**Room tone prompt**

```text
Fifteen-second seamless abandoned subterranean industrial facility ambience: enormous old ventilation machinery at low load, distant transformer hum, occasional structural steel strain, cold concrete volume, no voices, no footsteps, no melody, no dramatic hit, dark but realistic, wide stereo depth, clean loop point.
```

**Blackout cue prompt**

```text
Three-second industrial sector blackout: fluorescent tubes buzz unevenly, a heavy breaker slams, electrical hum cascades off from right to left, ventilation coasts down but does not stop; no voice, no music, grounded mechanical realism.
```

**Welcome committee cue prompt**

```text
Six-second distant autonomous maintenance machine approaching through a metal corridor: slow heavy mechanical footsteps, servo weight transfer, loose conduit vibration, beginning very far away and becoming slightly clearer without arriving; no creature growl, no speech, no music.
```

**Navigation corruption cue prompt**

```text
Three-second failing underground navigation instrument: relay bank clacks left to right, compass motor hunts, digital heading sputters into an unresolved electrical wobble; isolated interface foley, no voice, no music.
```

### Foley prompt 04 — Queen neural chamber

**Room tone prompt**

```text
Fifteen-second seamless living hive chamber ambience beneath glacial rock: two extremely soft asynchronous heartbeat layers, moist membrane tension, distant biological resonance, occasional tiny chitin movement, intimate and internal rather than disgusting, no voice, no melody, no monster roar, dark spacious stereo, clean loop point.
```

**Bond cue prompt**

```text
Five-second neural bond forming inside a sealed helmet: one human heartbeat, a second deeper heartbeat slowly emerges, delicate wet neural filaments connect, both pulses nearly synchronize but retain slight organic drift; beautiful and unsettling, no speech, no music, no gore impact.
```

**Uplink sever cue prompt**

```text
Three-second physical communications cable torn from a biomechanical socket: taut electrical cable strain, sharp connector tear, brief arc crackle, radio static collapses instantly while a low organic resonance remains; no voice, no music.
```

**Sleep cue prompt**

```text
Five-second living membrane closing protectively around the listener: soft layered organic folds, warm low resonance, two heartbeats settle into synchronization, gentle sealed tail; intimate science-fiction biology, no voice, no music, not slimy comedy.
```

### Foley prompt 05 — Sister Martha / Camp Tallow

**Room tone prompt**

```text
Fifteen-second seamless survivor greenhouse camp inside hot steam tunnels: old pipes breathe and hiss, small contained fire crackles, damp cultivated leaves shift, occasional water drop on warm metal, safe but precarious, no speech, no melody, no alarm, natural stereo depth, clean loop point.
```

**Caretaking cue prompt**

```text
Four-second close tactile medical foley: ceramic cup set gently on a metal bench, work gloves adjust a cold armored wrist, heavy suit fabric shifts, bare fingertips find an irregular pulse through a glove; restrained realistic detail, no voice, no music, no romantic sound design.
```

**Scout readiness cue prompt**

```text
Three-second experienced scout reacting to a distant threat: far creature shriek, rifle sling slides across weathered fabric, one impossibly quick planted footstep, rifle mechanism clicks safely under control; compact game foley, no gunshot, no voice, no music.
```

**Radio-death cue prompt**

```text
Three-second survivor field radio losing a person: weak voice-band carrier without intelligible speech, rising static, sudden empty flatline-like silence, nearby camp fire settles; mournful through realism, no score, no spoken words.
```

### Foley prompt 06 — Commander Briggs / Camp Vesper

**Room tone prompt**

```text
Fifteen-second seamless fortified survivor camp ambience inside an underground armory: distant automated turret servos, restrained generator vibration, occasional casing tick on steel, barricade under pressure far away, disciplined and tense, no voices, no gunfire, no music, clean loop point.
```

**Challenge cue prompt**

```text
Three-second automated sentry acquiring a close target: armored turret swivels rapidly, weapon safety disengages with a hard mechanical click, motor stops under tension; no gunshot, no voice, no alarm, dry readable game transient.
```

**Defense cue prompt**

```text
Four-second bunker defense foley: massive impact lands on a distant steel barricade, loose shell casing rolls across concrete, heavy rifle magazine seats firmly, signal flare ignites outside with a controlled chemical hiss; no speech, no music, no active firefight.
```

**Ledger cue prompt**

```text
Three-second private command-post foley: metal chair scrapes once, thick paper field ledger opens, pencil pauses above paper without writing, ledger closes decisively; intimate dry room sound, no voice, no music.
```

### Foley prompt 07 — Overseer Kaelen / Camp Meridian

**Room tone prompt**

```text
Fifteen-second seamless improvised underground power-grid workshop: stable transformer hum, relay switches chatter occasionally, cooling fan with worn bearing, tiny controlled electrical arcs, dense but not noisy, no voice, no melody, no alarm, stereo workbench detail, clean loop point.
```

**Work cue prompt**

```text
Four-second expert electrical repair foley: rapid console key sequence, soldering iron touches a contact with a brief hiss, ceramic insulator taps the bench, relay closes successfully; clean close-mic mechanical detail, no voice, no music.
```

**Diagnostic cue prompt**

```text
Five-second neural diagnostic connected to powered armor: copper interface cable locks into a collar socket, electrical test tone rises smoothly, oscilloscope gives an irregular biological rhythm, one static spark, tone cuts out on an unresolved result; no speech, no music.
```

**Grid-dream cue prompt**

```text
Four-second enormous sleeping computer pulse heard through a local power grid: transformer harmonics align, one deep server pulse travels under the floor, nearby relays answer in sequence, then normal workshop hum resumes; subtle technological awe, no choir, no voice, no music.
```

### Foley prompt 08 — Dr. Okonkwo-Vass field research

**Room tone prompt**

```text
Fifteen-second seamless subterranean xenobiology observation post: restrained field scanner ticks, pencil on waterproof notebook, distant shelled creature moving slowly across stone, occasional sample refrigerator relay, curious and grounded, no voices, no melody, no creature attack, clean loop point.
```

**Evidence cue prompt**

```text
Four-second field sample analysis: glass vial clicks into a rugged analyzer, scanner pulses accelerate as data aligns, soft positive tone stops before becoming celebratory, pencil immediately writes a note; realistic scientific equipment, no speech, no music.
```

**Creature response cue prompt**

```text
Four-second intelligent shelled alien responding without aggression: enormous shell shifts carefully over stone, soft resonant throatless chirp, tiny feelers brush rock, movement stops at respectful distance; non-cute, non-monstrous, no voice, no music.
```

**Weapon-lowered cue prompt**

```text
Two-second armed explorer choosing restraint: gloved hands relax, rifle barrel lowers away from target, sling and armor settle, safety clicks on; no speech, no music, no gunshot.
```

### Foley prompt 09 — Nahl / Suture Hive

**Room tone prompt**

```text
Fifteen-second seamless biological healing chamber ambience: warm cellular relay hum, sparse fluid drops into a shallow mineral pool, living fibers under gentle tension, extremely distant hive vibration, caring rather than grotesque, no voice, no melody, no monster sound, clean loop point.
```

**Wound-repair cue prompt**

```text
Five-second alien tissue repairing without gore: damaged wet membrane flexes, fine organic fibers draw together, liquid tension releases, soft cellular resonance stabilizes; intimate medical science-fiction foley, no squelchy comedy, no scream, no voice, no music.
```

**Thread-sever cue prompt**

```text
Four-second psychic life-thread severing and being restored: delicate taut filament snaps in sudden silence, a gentle breath-sized gap, many living microfibers weave across the break, two quiet heartbeats resume; emotional but not musical, no voice.
```

**Queen-distance cue prompt**

```text
Four-second distant hive collective pressure: low layered biological vibration approaches like a choir without human vowels, holds briefly, then recedes as a warmer single relay tone remains; no intelligible voice, no melody, no horror sting.
```

### Foley prompt 10 — Vey / Relay Hive

**Room tone prompt**

```text
Fifteen-second seamless living communications nest: delicate antenna ticks, controlled narrow-band static, suspended neural filaments resonating in air, distant encrypted carrier traces, spacious and alert, no voices, no melody, no harsh white noise, clean loop point.
```

**Signal-lock cue prompt**

```text
Three-second biological antenna finding a signal: one questioning chirp, short static burst, two faster chirps, frequency snaps into a pure restrained lock tone; alien but readable as communication, no speech, no music.
```

**Mined-gap cue prompt**

```text
Four-second neural relay damage memory: several fine wet-dry filaments strain and tear, data recorder captures the sound, surrounding signal suddenly drops into an empty electrical hum with conspicuous missing frequencies; wounded and precise, no voice, no music.
```

**Forgery cue prompt**

```text
Four-second alien signal forgery: strong orbital carrier tone emerges, living relay samples it in rapid fragments, constructs an almost identical second tone, both align perfectly, then vanish together; clever and subtle, no voice, no melody, no error buzzer.
```

### Foley prompt 11 — Rhun / Carapace Hive

**Room tone prompt**

```text
Fifteen-second seamless enormous living armored guardian at rest in a stone chamber: slow controlled armored breathing, huge chitin plates settling under weight, sparse grit falling, distant impacts absorbed by the structure, no growls, no voice, no music, powerful but quiet, clean loop point.
```

**Movement cue prompt**

```text
Four-second massive biological armored step: layered chitin plates shift and grind without metal, one extremely heavy foot plants on stone, low structural resonance travels outward, small debris settles; no roar, no voice, no cinematic impact sweetener.
```

**Shield cue prompt**

```text
Three-second living forearm shield deployment: dense carapace segments unfold in sequence, tendon tension rises, plates interlock into a solid wall with one final organic lock; weighty and protective, no weapon slash, no voice, no music.
```

**Oath-sever cue prompt**

```text
Five-second alien control brand releasing from armor: biological mark sizzles quietly, brittle outer layer flakes away, deep restrained exhale, one heavy step moves in front of the listener, shield plants into stone, debris settles; solemn and physical, no voice, no music.
```

### Repository reuse before generating new effects

Audition existing assets before creating replacements:

| Foley family | Existing candidates |
| --- | --- |
| Bunker bed and structure | `public/audio/vg2/amb_bunker_loop.wav`, `amb_metal_stress1.wav`–`3.wav` |
| Doors, breakers, heavy mechanics | `door_gears_spin*.wav`, `door_slam_vertical*.wav`, `door_slide_horiz*.wav` |
| UI and scanner electronics | `ui_boot*.wav`, `ui_scan_ping*.wav`, `ui_error*.wav`, `ui_typing*.wav` |
| Camp fire | `camp_fire_loop.wav`, `camp_fire_douse.wav` |
| Camp threat machinery | `camp_lockdown_alarm.wav`, `camp_lockdown_chains.wav`, `weapon_reload*.wav` |
| Hive bed and biology | `hive_eggs_hum.wav`, `hive_queen_throne.wav`, `hive_spores_puff.wav`, `hive_webs_sticky.wav`, `hive_wounded_drip.wav` |
| Meridian/Tallow/Vesper signatures | `public/audio/generated/camp_verb_meridian.wav`, `camp_verb_tallow.wav`, `camp_verb_vesper.wav` |

Generate only the missing close foley or replace an existing asset after an A/B review. Layer reuse keeps the voices acoustically connected to gameplay instead of sounding like detached audio dramas.

### Runtime cue contract

Do not hard-code effect timing by `setTimeout()` against guessed sentence duration. Store semantic sync anchors, then resolve them against final word timestamps or an approved baked composite:

```js
{
    id: 'queen_intro_two_heartbeats',
    voiceKey: 'voice_queen_intro_two_heartbeats',
    roomToneKey: 'foley_queen_room_loop',
    cues: [
        { anchor: 'before:first_word', key: 'foley_heartbeat_human', offsetMs: -450 },
        { anchor: 'after:Two heartbeats.', key: 'foley_heartbeat_deep', offsetMs: 80 },
        { anchor: 'before:share the body', key: 'foley_neural_connect', offsetMs: -120 }
    ]
}
```

For tightly synchronized cinematic dialogue, render and ship an approved composite plus the dry master. For interactive dialogue that can be skipped or interrupted, keep voice and cues addressable so `stopDialogueVoice()` also stops the scene's active foley handles.

## 15. Casting comparison procedure

Generate all eleven identities before locking any one of them. A good isolated voice can still be wrong for the ensemble.

### Round A — blind identity review

1. Generate three candidates per prompt.
2. Export previews with neutral IDs such as `MOTHERSHIP_A`, `MOTHERSHIP_B`, and `MOTHERSHIP_C`.
3. Loudness-match the candidates; do not prefer the loudest.
4. Review without seeing seed, prompt, or provider candidate order.
5. Score identity fit, intelligibility, age stability, emotional range, and cliché risk from 1–5.
6. Reject the entire triplet if none meets the role. Do not select a merely tolerable voice because credits were spent.

### Round B — collision review

Play these sequences back-to-back:

1. Mothership → System → Bunker.
2. Martha → Briggs → Kaelen → Okonkwo-Vass.
3. Queen → Nahl → Vey → Rhun.
4. Briggs → Rhun → Bunker to expose low-register collision.
5. System → Vey to expose bright-register collision.
6. Martha → Queen → Nahl to expose “soft voice” collision.

If two voices can be confused after a one-second gap, recast one. Do not depend on effects to create the distinction.

### Round C — stress test

Render five lines with the saved candidate:

- neutral exposition;
- urgent combat information;
- a quiet personal admission;
- a long technical or biological sentence;
- a hostile or morally difficult line.

Reject candidates whose perceived age, dialect, pitch center, or persona changes significantly between those conditions.

## 16. Production rendering rules

### Script preparation

- Remove UI prefixes such as `MOTHERSHIP:` and `QUEEN:`.
- Replace `O₂` with `oxygen` in spoken scripts.
- Render each stable runtime line as its own file.
- Keep long subtitle beats under roughly 12 spoken seconds when editorially possible.
- Use punctuation before audio tags. A strong saved identity should not require tags on every line.
- Record three takes only for pivotal lines; ordinary status lines need one approved take plus QA.

### Eleven v3 delivery tags

The previews deliberately use several tags to stress-test identity and emotional range. Production lines should use the smallest set that produces the intended take. Candidate directions include emotion tags such as `[curious]` and `[worried]`, delivery tags such as `[softly]`, `[understated]`, and `[rapid-fire]`, reactions such as `[laughs softly]`, `[sighs]`, and `[exhales]`, and pacing tags such as `[short pause]`, `[pause]`, and `[long pause]`. Tags are performance instructions and may be inconsistent; test every tagged line. Never store a tag in the on-screen subtitle.

Suggested limited use:

| Role | Permitted occasional tags | Avoid |
| --- | --- | --- |
| Mothership | `[measured]`, `[firmly]`, `[coldly]`, pause tags | Laughter, sighs, playful emotion |
| System | `[evenly]`, `[rushed]`, `[slows down]`, pause tags | Human reaction sounds |
| Bunker | `[deliberate]`, `[understated]`, pause tags | Laughter or overt comedy |
| Queen | `[softly]`, `[whispers]`, `[coldly]`, `[exhales]`, pause tags | Giggles, moans, theatrical anger |
| Martha | `[warmly]`, `[firmly]`, `[worried]`, `[exhales]`, pause tags | Whispering routine lines |
| Briggs | `[sharply]`, `[rapid-fire]`, `[quietly]`, `[exhales]`, pause tags | Shouting unless combat readability demands it |
| Kaelen | `[assessing]`, `[curious]`, `[focused]`, `[laughs softly] [dryly]`, pause tags | Broad or repeated laughter |
| Okonkwo-Vass | `[observant]`, `[quickening with curiosity]`, `[laughs softly] [hopeful]`, pause tags | Manic laughter or comic eccentricity |
| Nahl | `[softly]`, `[firmly]`, `[sorrowful]`, `[exhales]`, pause tags | Constant whispering |
| Vey | `[alert]`, `[rapid-fire]`, `[wounded]`, `[mischievously]`, pause tags | Generic glitch or random stutter tags |
| Rhun | `[deliberate]`, `[slowly]`, `[quietly] [with certainty]`, `[exhales]`, pause tags | Growls, roars, shouting |

### File identity

Save the ElevenLabs `voice_id`, Voice Design prompt, preview text, model, generated candidate ID, seed when available, selection date, reviewer, and production settings in the voice ledger. A character name alone is not enough to reproduce a voice.

## 17. Post-processing boundaries

Generate clean identities first. Apply world placement non-destructively:

| Role | Allowed post chain | Never bake into the only master |
| --- | --- | --- |
| Mothership | Communications band-pass, light compression, carrier chirp | Heavy distortion or permanent background static |
| System | Minimal EQ; controlled digital breakup for glitched variants | One corrupted render used for all story states |
| Bunker | Short industrial reflection, subtle low resonance | Muddy cavern reverb |
| Queen | Quiet double, restrained stereo width, subtle harmonic bed | Wet whisper wash that masks words |
| Human cast | Light cleanup, leveling, scene-space send | Character-defining pitch shifts |
| Hive allies | Role-specific quiet double or resonance | Shared “alien” preset that makes all three alike |

Always retain the dry source. Runtime voice ducking, not destructive limiting, should create space over music.

## 18. Naming and review ledger

Use the stable asset IDs from the integration document. Add a casting ledger row for each saved identity:

```text
speaker_id, character, elevenlabs_voice_id, generated_voice_id, model,
prompt_revision, preview_revision, seed, guidance, loudness,
selected_date, selected_by, pronunciation_version, status, notes
```

Recommended prompt revision IDs:

```text
VD-MOTHERSHIP-01
VD-SYSTEM-01
VD-BUNKER-01
VD-QUEEN-01
VD-MARTHA-01
VD-BRIGGS-01
VD-KAELEN-01
VD-OKONKWO-01
VD-NAHL-01
VD-VEY-01
VD-RHUN-01
```

## 19. Sources and version note

This prompt structure follows the ElevenLabs Voice Design documentation available on 2026-08-25:

- [Voice Design prompting guide](https://elevenlabs.io/docs/eleven-creative/voices/voice-design/)
- [Voice Design API reference](https://elevenlabs.io/docs/api-reference/text-to-voice/design)
- [Prompting Eleven v3](https://elevenlabs.io/docs/best-practices/prompting)

Voice Design is an iterative casting tool and its output varies. ElevenLabs describes generated previews as an exploration workflow and recommends reviewing all returned options. Recheck the official documentation before automating a large batch because model names, limits, parameters, and recommended ranges may change.
