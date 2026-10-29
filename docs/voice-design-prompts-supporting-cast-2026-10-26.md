# Voice design prompts — supporting cast

Status: provisional casting (auto-qa picks pending a listen) | Owner: audio + narrative | Updated: 2026-10-26 | Review: when a pick is confirmed or a character's canon changes

Companion to the [core casting bible](elevenlabs-voice-design-prompts-11-core-roles-2026-08-25.md), same format and the same prompt rules (§2): only the `VOICE DESCRIPTION` block is the identity prompt, no effects in it, no real person or existing character as a reference, every role unmistakably adult. Reads come from the [integration doc](voice-cast-prompts-and-game-integration-2026-08-25.md) (Aria, the wanderer families). Mayor Tina had no entry; hers is new, and her "Teacup Siren" lure lines are the same character.

These roles speak the hard-coded lines that the narrative catalogs never covered: camp conversation trees (`src/npcDialogueTrees.js`), wanderer encounters (`src/wandererSystem.js`), Tina's boss and archive lines. `scripts/voice/build-voice-cast.mjs` reads this file after the core bible.

## 1. Prompt 12 — Aria, Queen Mimic

### Dramatic function

Specimen 0047-B, the Queen's psychic mimic: a voice assembled from what the listener wants to hear. It should be the most beautiful voice in the game and the least trustworthy.

### VOICE DESCRIPTION

```text
Native English, neutral North American dialect. Feminine adult voice, perceived age 30–40. Excellent studio quality. Persona: elegant, hypnotic confidante. Emotion: warm, intimate, quietly certain. Smooth medium-low timbre with polished resonance and soft, precise consonants. Unhurried, slightly too measured pacing; every pause feels placed. Affection is offered as a gift with conditions attached. Avoid breathy seduction, whispering, sing-song lilts, villain menace, robotic flatness, and youthful brightness. The listener should feel welcomed and, a moment later, studied.
```

### PREVIEW TEXT

```text
[softly] You came back. I knew you would; you always do the brave thing a little after the sensible thing. [short pause] Sit with me. The cold cannot reach us here, and I have so much to show you.

[calmly] You think I am her voice. I am only what you hoped to hear.
```

### Direction after saving the voice

- Keep every line a little slower than a human would choose.
- Warmth never tips into flirtation; the mask is elegance, not invitation.

### Reject if

- She sounds like a generic seductress, a narrator, or a cartoon villain.
- Whisper or breath replaces voiced tone.
- The Queen's own voice and Aria's could be the same actor.

## 2. Prompt 13 — Mayor Tina

### Dramatic function

A former city-council mayor mutated into a giant roach matriarch in Sector 9. Civic politeness over something hungry: she talks about the swarm like a municipal budget and lures operators in as the "Teacup Siren".

### VOICE DESCRIPTION

```text
Native English, neutral North American dialect with a faint small-town civic polish. Feminine adult voice, perceived age 55–65. Excellent studio quality. Persona: genteel town mayor who has become something else. Emotion: sweet, amused, possessive. Medium pitch with a bright, slightly reedy timbre, crisp diction, and a hostess's sing-along friendliness that hardens instantly into command. Pacing is chatty and conversational, then clipped and loud when she threatens. Avoid witch cackles, monster growls, elderly frailty, cartoon squeakiness, and camp exaggeration. The menace comes from the manners staying on.
```

### PREVIEW TEXT

```text
[cheerfully] Well, look at you, neighbor! Come in, come in, the council always saves a seat for a hard worker. We balanced the budget down here, you know. Nobody goes hungry anymore.

[coldly] Put that down. I am asking once.
```

### Direction after saving the voice

- "Dear", "neighbor" and "Operator" are hospitality, never warmth.
- Boss threats stay articulate; volume rises, words stay clear.

### Reject if

- She reads as a horror-movie hag or a children's cartoon.
- Politeness and threat sound like two different actors.

## 3. Prompt 14 — Manic Hacker

### Dramatic function

Wanderer family: a fast-talking rig builder who heard the base terminal from three strata away.

### VOICE DESCRIPTION

```text
Native English, neutral North American dialect. Feminine adult voice, perceived age 25–32. Excellent studio quality. Persona: brilliant, restless hardware tinkerer. Emotion: excited, playful, quick to bristle. Bright medium-high timbre, rapid articulate delivery, technical words handled with ease. Energy is high but controlled; jokes land on the beat. Avoid cartoon squealing, baby talk, valley-girl parody, and shrillness.
```

### PREVIEW TEXT

```text
[excited] Whoa, okay, hold fire! Your terminal was screaming an unencrypted handshake from three strata away, I had to see who built this thing. Hand me a soldering iron and give me ten minutes.

[annoyed] Tch. Fine. Enjoy the first laser barrier you trip.
```

### Direction after saving the voice

- Speed comes from enthusiasm, not panic.

### Reject if

- Delivery becomes a caricature or loses intelligibility at speed.

## 4. Prompt 15 — Corpo Shadow Runner

### Dramatic function

Wanderer family: a Horizon Corp operative left for dead, still negotiating every sentence.

### VOICE DESCRIPTION

```text
Native English, neutral North American dialect. Masculine adult voice, perceived age 35–45. Excellent studio quality. Persona: composed corporate dealmaker. Emotion: cool, appraising, faintly amused. Smooth medium-low timbre, precise diction, measured pacing; every sentence sounds like terms being offered. Avoid villain sneering, smarmy salesman energy, and whispered menace.
```

### PREVIEW TEXT

```text
[evenly] Lower the muzzle. Horizon left me for dead when the lower bulkheads collapsed, and I see you survived the crash too. That makes us the only two assets on this ledger.

[dryly] Contract ratified. Keep me alive and every bullet you fire will earn its keep.
```

### Direction after saving the voice

- Politeness is leverage; never raise the voice.

### Reject if

- He sounds like a movie villain or a used-car commercial.

## 5. Prompt 16 — Foxhole Shadow

### Dramatic function

Wanderer family: a squad veteran from the trench line, direct and companionable.

### VOICE DESCRIPTION

```text
Native English, neutral North American dialect. Masculine adult voice, perceived age 30–40. Excellent studio quality. Persona: dependable infantry veteran. Emotion: steady, upbeat, loyal. Warm medium-low timbre with a little grit, clear radio-ready diction, brisk confident pacing. Avoid drill-sergeant shouting, action-hero growl, and gravelly caricature; must stay distinct from Commander Briggs, who is older and harder.
```

### PREVIEW TEXT

```text
[cheerfully] Heads up, soldier! Vasquez squad reporting in. Heard your oxygen generator roar to life from the trench line, and it is good to see friendly armor out here.

[firmly] Lock and load, partner. Nothing breaches this perimeter while we draw breath.
```

### Direction after saving the voice

- Friendly first; authority only when the line calls for it.

### Reject if

- He could be mistaken for Briggs.

## 6. Prompt 17 — Crash Survivor Queen

### Dramatic function

Wanderer family: a drop-pod survivor with calm command presence and spiritual confidence.

### VOICE DESCRIPTION

```text
Native English, neutral North American dialect. Feminine adult voice, perceived age 35–45. Excellent studio quality. Persona: serene field commander. Emotion: calm, resolute, gently reverent. Clear medium-low timbre, rounded vowels, unhurried deliberate pacing, quiet authority that never needs volume. Avoid preacher cadence, fantasy-priestess mysticism, and breathiness; must not resemble the Queen or Aria.
```

### PREVIEW TEXT

```text
[calmly] Peace, operator. My drop pod sheared in half through the upper mantle, and I watched your beacon pierce the ash. I followed the light; it seemed the wise thing to do.

[resolutely] Then let our light burn through this darkness. My shields are yours.
```

### Direction after saving the voice

- Faith is stated plainly, as fact.

### Reject if

- She sounds like a sermon or a meditation app.

## 7. Prompt 18 — Space ABG Tripper

### Dramatic function

Wanderer family: a casual, irreverent tunnel cruiser who followed the generator's bass drop.

### VOICE DESCRIPTION

```text
Native English, neutral North American dialect. Feminine adult voice, perceived age 22–28. Excellent studio quality. Persona: carefree party traveler. Emotion: breezy, delighted, unbothered. Bright medium timbre, fast relaxed delivery, conversational slang spoken naturally. Avoid exaggerated slang parody, ethnic or regional caricature, baby voice, and drowsiness.
```

### PREVIEW TEXT

```text
[delighted] Yo! That bass drop from your generator was wild. I have been cruising these tunnels with no signal for days, so you are basically my favorite person right now. Got any extra fuel?

[shrugging] Okay, rude. Your loss.
```

### Direction after saving the voice

- Keep slang light and sincere; she is fun, not a joke.

### Reject if

- The read leans on accent or stereotype for character.

## 8. Prompt 19 — Species Chrysalis

### Dramatic function

Wanderer family: a human plurality speaking carefully through a changed body.

### VOICE DESCRIPTION

```text
Native English, neutral North American dialect. Androgynous adult voice, perceived age 30–40. Excellent studio quality. Persona: gentle, transformed survivor. Emotion: careful, curious, tender. Soft medium timbre, deliberate pacing with small searching pauses, very clear articulation as if each word is chosen fresh. Avoid monster growls, robotic flatness, whispering, and childlike wonder.
```

### PREVIEW TEXT

```text
[carefully] We are still people. Some of us, anyway. The shell came in pieces, and we learned to speak around it, one word at a time. You do not need to lower the weapon. Only listen.

[warmly] Thank you. It has been a long time since anyone waited for us to finish.
```

### Direction after saving the voice

- "We" is natural to them; never play it as eerie.

### Reject if

- The voice reads as alien horror rather than a changed human.

## 9. Post-processing boundaries

| Role | Allowed post chain | Never bake into the only master |
| --- | --- | --- |
| Aria | Light stereo shimmer, nearly inaudible reversed tail | Effects that hide the beauty of the voice |
| Tina | Light cleanup, small-room presence | Pitch shifts or monster processing |
| Wanderers | Light cleanup, leveling (human cast) | Character-defining pitch shifts |
