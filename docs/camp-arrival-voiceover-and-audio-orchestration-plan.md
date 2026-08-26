# Camp Arrival Voice-Over, Dialogue Overwrite Bug Analysis & Audio Orchestration Plan

**Status:** Technical Investigation, Root Cause Analysis & Architecture Plan  
**Date:** 2026-08-25  
**Target Systems:** `src/audio.js`, `src/threeGame.js`, `src/dialogue.js`, `main.js`, `src/songInterstitials.js`, `src/voiceCallouts.js`  
**Related Documents:**
- `docs/voice-cast-prompts-and-game-integration-2026-08-25.md`
- `docs/audio-voice-cutting-and-foley-integration-plan-2026-08-25.md`
- `docs/elevenlabs-voice-design-prompts-11-core-roles-2026-08-25.md`

---

## 1. Executive Summary

When a player approaches and interacts with a survivor camp (e.g., Camp Tallow, Camp Vesper, Camp Meridian), multiple gameplay subsystems fire simultaneously within a single frame or within a narrow 1–2 second window:
1. **Camp Discovery Milestone & 4-Line Radio Blast** (`campDiscovered` -> `showRadioTransmission` x4)
2. **Audio Voice Clip Playback on Fixed 1.4s Timer** (`renderRadioTransmission` -> `AudioManager.playVoiceForMessage`)
3. **Camp First Contact Song Interstitial** (`camp-first-contact` -> `songInterstitial.show`)
4. **Leader Conversation Modal & 3D Dialogue** (`talkToLeader` -> `leader-dialogue`)
5. **Mature NPC Dialogue Tree System** (`openNpcDialogueTree`)
6. **Mothership / Biome Environmental Reactive Lines** (`renderBiomeStatus`, `MOTHERSHIP_REACTIVE_LINES`)
7. **Cosmetic Tactical Voice Callouts** (`voiceCallouts.js`)

Because there is **no centralized speech arbiter or audio queue priority system**, these triggers fire concurrently. Authored audio clips (3–6 seconds long) and procedural vocalizer bleeps get clipped, interrupted, or played simultaneously on the Web Audio `voiceGain` bus, resulting in a cacophony where lines trample and overwrite one another.

This document outlines:
- A detailed code trace of what happens during camp arrival.
- The 6 root causes in the codebase.
- A proposed **Centralized Voice & Dialogue Orchestrator** architecture.
- A sequenced **Camp Arrival State Machine** and step-by-step implementation plan.

---

## 2. Step-by-Step Anatomy of the Camp Arrival Interaction

```
                                  PLAYER APPROACHES CAMP
                                             │
             ┌───────────────────────────────┴───────────────────────────────┐
             ▼ (Distance <= 7.0u)                                            ▼ (Presses 'E' / Talk)
   [1. Proximity Trigger]                                          [4. Interaction Trigger]
   • ThreeGame.updateCampState()                                   • ThreeGame.interactWithAct2Camp()
   • act2.discoverCamp()                                           • talkToLeader('camp', camp)
             │                                                               │
             ▼                                                               ▼
   [2. Milestone Broadcast]                                        [5. Interstitial + Dialogue]
   • CustomEvent('act2-milestone', { campDiscovered })             • CustomEvent('camp-first-contact')
             │                                                     • songInterstitial.show() (Stops OST, starts track)
             ▼                                                     • CustomEvent('leader-dialogue')
   [3. 4-Line Radio Queue Flood]                                   • openNpcDialogueTree(treeId)
   • Line 1: SYSTEM: Sector & Coordinates                                    │
   • Line 2: SYSTEM: Camp Located. Flare Doused.                             ▼
   • Line 3: SYSTEM: Supplies Shared (Shells/O2)                   [6. Typewriter Voice Trigger]
   • Line 4: SYSTEM: O2 Haven Fortification Tip                    • DialogueManager.typeLine()
             │                                                     • Fires AudioManager.playVoiceForMessage()
             ▼                                                       on every 3 characters typed!
   [Audio Bus Collision]
   • Radio queue pops every 1400ms (fixed)
   • Voice lines (3-6s) are chopped & overwritten
   • Interstitial music clashes with Radio VO & Leader VO
```

### Trace Details:

### Step 1: Spatial Proximity Trigger (`src/threeGame.js:12013-12030`)
As the player moves within `CAMP_DISCOVERY_RADIUS` (7.0 units) of an undiscovered camp:
```javascript
// src/threeGame.js:12021-12029
if (camp.distanceTo(this.player.position.x, this.player.position.z) > CAMP_DISCOVERY_RADIUS) continue;
this.act2.discoverCamp(camp.id);
camp.setDiscovered(true);
this.bank?.addShells?.(CAMP_DISCOVERY_SHELLS);
this.adjustOxygen(CAMP_DISCOVERY_O2);
this.spawnGearPoofEffect(camp.pos.x, camp.pos.z, 'bunker_junk_uncommon');
window.dispatchEvent(new CustomEvent('act2-milestone', {
    detail: { key: 'campDiscovered', campId: camp.id, campLabel: camp.label, x: camp.pos.x, z: camp.pos.z }
}));
```

### Step 2: Milestone Broadcast & 4-Line Radio Flood (`main.js:11260-11282`)
The `act2-milestone` listener immediately generates **4 distinct lines** and pushes all four into the radio queue in a tight loop:
```javascript
// main.js:11272-11281
lines = [
    `SYSTEM: ${campLabel} — ${sector}${locStr}`,
    ...ACT2_LINES.campDiscovered // 3 more lines
];

lines.forEach((line) => {
    const rawLine = typeof line === 'object' ? line.text : line;
    showRadioTransmission(rawLine);
});
```

### Step 3: Decoupled 1.4s Radio Dequeue Timer (`main.js:3508-3553`)
The radio system processes messages with `RADIO_MIN_GAP_MS = 1400` (1.4 seconds):
```javascript
// main.js:3540-3552
const wait = Math.max(0, RADIO_MIN_GAP_MS - (now - lastRadioRenderAt));
// ...
renderRadioTransmission(rawText);
if (radioQueue.length) {
    radioPumpTimer = window.setTimeout(pumpRadioQueue, RADIO_MIN_GAP_MS);
}
```
In `renderRadioTransmission(rawText)` (line 3620):
```javascript
AudioManager.playVoiceForMessage({ name: sender }, text);
```
**The Failure Point:** An authored Exosuit/System voice clip (e.g. `voice_system_01_o2_stabilized`) or Mothership transmission takes **3.5 to 5.2 seconds** to speak. But after only **1.4 seconds**, the radio queue pops line 2 and calls `AudioManager.playVoiceForMessage` again. The new line immediately starts playing, trampling the unfinished speech.

### Step 4: Simultaneous First Contact & Song Interstitial (`src/threeGame.js:14274-14298`)
If the player presses interaction (`E`) upon arriving, or if auto-interact occurs:
```javascript
// src/threeGame.js:14288-14297
this._seenCampFirstContact.add(camp.id);
window.dispatchEvent(new CustomEvent('camp-first-contact', {
    detail: { campId: camp.id, campLabel: camp.label, campState: this.getCampRecord(camp.id) }
}));
return this.talkToLeader('camp', camp);
```
1. `camp-first-contact` triggers `songInterstitial.show(...)` in `main.js:10874`.
   - `songInterstitial.show` immediately calls `audio.stopMusic({ fadeSeconds: 0.18 })` and starts the camp theme track (`audio.play(spec.musicKey, { bus: 'music' })`).
2. In the **exact same call frame**, `talkToLeader('camp', camp)` executes!

### Step 5: Leader Dialogue Modal & NPC Dialogue Tree Conflict (`src/threeGame.js:13864-13954`)
Inside `talkToLeader`:
1. `window.dispatchEvent(new CustomEvent('leader-dialogue', { detail: ... }))` fires.
   - Opens `leaderConversationModal` (`main.js:10878`).
   - Renders the leader's line (e.g. Commander Briggs or Sister Martha).
2. Concurrently, lines 13934–13951 evaluate:
   ```javascript
   window.sideStoryManager.evaluateTriggers(...);
   if (window.openNpcDialogueTree) {
       window.openNpcDialogueTree(treeId);
   }
   ```
   Both the Leader Conversation Modal and the NPC Dialogue Tree open at the same time.

### Step 6: Dialogue Typewriter Vocalizer Chirp Storm (`src/dialogue.js:714-724`)
When dialogue lines are printed letter-by-letter:
```javascript
// src/dialogue.js:714
window.AudioManager?.playVoiceForMessage(speaker, textToType);
// ... and during typing loop:
// src/dialogue.js:724
window.AudioManager?.playVoiceForMessage(speaker, textToType.slice(index, index + 3));
```
`playVoiceForMessage` is invoked at line start, and then **again every 3 characters during typewriting**. If an authored audio clip is mapped, it can be re-triggered or mixed with synthetic oscillator beeps dozens of times per second.

---

## 3. Root Cause Analysis Matrix

| # | Root Cause | File Location | Impact |
|---|---|---|---|
| **RC-1** | **No Central Voice Arbiter / Priority Queue** | `src/audio.js` | Audio sources are spawned directly via `source.start(0)` on `voiceGain`. No tracking of whether a voice line is currently active, no queue, and no priority preemption rules. |
| **RC-2** | **Hardcoded Fixed Radio Gap (`1400ms`)** | `main.js:3508` | Fixed 1.4s delay ignores audio buffer duration (3–6s), forcing consecutive milestone lines to overwrite active voice clips. |
| **RC-3** | **Unsequenced Camp First Contact Interaction** | `src/threeGame.js:14288` | `camp-first-contact` (title card & song) and `talkToLeader` (dialogue modal & NPC trees) are dispatched simultaneously in the same function call. |
| **RC-4** | **Milestone Line Spam on Discovery** | `main.js:11264-11282` | 4 separate long lines are pushed into the queue simultaneously on single-point proximity entry instead of playing one concise notification or batching text cleanly. |
| **RC-5** | **Typewriter Repeated Audio Invocations** | `src/dialogue.js:714, 724` | `playVoiceForMessage` is called at index 0 and every 3-character increment, repeatedly spawning Web Audio nodes while speech is ongoing. |
| **RC-6** | **Uncoordinated Tactical Callouts** | `src/voiceCallouts.js` | Low health, shield critical, reload, and objective events trigger `playVoiceCallout` blindly over narrative and dialogue lines without checking channel availability. |

---

## 4. Architecture Design: Centralized Voice & Dialogue Orchestrator

To permanently resolve audio trampling across the game, we propose a lightweight **Speech Director / Voice Queue Subsystem** integrated into `AudioManager`.

### 4.1 Voice Priority Hierarchy

```
┌───────────────────────────────────────────────────────────────┐
│ Priority 0 (CRITICAL / CUTSCENE)                              │
│ • Main Story Briefings, Ending Sequences, Staged Cutscenes    │
│ -> Pauses/cancels lower priority lines; ducks music 65%       │
├───────────────────────────────────────────────────────────────┤
│ Priority 1 (LEADER & NPC DIALOGUE)                            │
│ • Camp Leaders (Briggs, Martha, Kaelen), Hive Leaders, Nahl   │
│ -> Holds Radio & Banter in queue; ducks room tone & music 50% │
├───────────────────────────────────────────────────────────────┤
│ Priority 2 (CAMP INTERSTITIAL & MILESTONE CUES)               │
│ • Camp First Contact, Depth Crossing, Boss Spawns             │
│ -> Cleanly gates subsequent UI until audio/title finishes     │
├───────────────────────────────────────────────────────────────┤
│ Priority 3 (RADIO TRANSMISSIONS & SYSTEM ALERTS)              │
│ • Discovery Milestones, Mothership Reactive Lines             │
│ -> Queued sequentially; pops only AFTER current line ends     │
├───────────────────────────────────────────────────────────────┤
│ Priority 4 (TACTICAL CALLOUTS & AMBIENT BANTER)               │
│ • Reload, Low Health, Line Director Banter                    │
│ -> Dropped or deferred if Priority 0-3 voice is active        │
└───────────────────────────────────────────────────────────────┘
```

### 4.2 Voice Lifecycle Management in `AudioManager`

Instead of fire-and-forget `source.start(0)`, `AudioManager` will maintain an active voice state object:

```javascript
class AudioManager {
    static activeVoice = {
        source: null,
        gainNode: null,
        priority: -1,
        startedAt: 0,
        estimatedDuration: 0,
        promise: null,
        resolve: null
    };

    /**
     * Plays a voice line with priority gating, duration tracking, and completion promise.
     */
    static playVoiceTrack(key, options = {}) {
        const priority = options.priority ?? 3;
        const now = audioCtx.currentTime;

        // If a higher priority line is active, reject or queue
        if (this.activeVoice.source && this.activeVoice.priority < priority) {
            const timeRemaining = (this.activeVoice.startedAt + this.activeVoice.estimatedDuration) - now;
            if (timeRemaining > 0.2) {
                if (options.defer) {
                    this.enqueueVoice(key, options);
                }
                return null;
            }
        }

        // Stop existing lower-or-equal priority voice with 80ms gentle fade
        this.stopActiveVoice(0.08);

        const buffer = this.buffers[key];
        const duration = buffer ? (buffer.duration / (options.playbackRate || 1.0)) : (options.duration || 1.5);

        const playback = this.play(key, {
            bus: 'voice',
            volume: options.volume ?? 1.0,
            varyPitch: false
        });

        if (!playback) return null;

        let resolveFn;
        const completionPromise = new Promise((resolve) => { resolveFn = resolve; });

        this.activeVoice = {
            source: playback.source,
            gainNode: playback.gainNode,
            priority,
            startedAt: now,
            estimatedDuration: duration,
            promise: completionPromise,
            resolve: resolveFn
        };

        playback.source.onended = () => {
            if (this.activeVoice.source === playback.source) {
                this.activeVoice.source = null;
                this.activeVoice.priority = -1;
                resolveFn?.(true);
                this.pumpVoiceQueue();
            }
        };

        return { ...playback, duration, promise: completionPromise };
    }
}
```

---

## 5. Camp Arrival Interaction Sequencing

To guarantee clean narrative pacing, the camp arrival flow is restructured into a 4-phase sequential pipeline:

```
[Phase 1: Approach & Discovery] (Distance <= 7.0u)
 ├── 1. Play gear poof / supply drop SFX ('bunker_junk_uncommon')
 ├── 2. Show single condensed HUD banner: "CAMP DISCOVERED: [LABEL] // SUPPLIES RECEIVED"
 └── 3. Play Exosuit/System discovery voice clip.
        (All other radio lines wait in queue until this completes!)

                                   │ (Player walks up & talks / interact prompt)
                                   ▼
[Phase 2: First Contact Title Card & Song Interstitial]
 ├── 1. Camp First Contact event dispatches.
 ├── 2. Song interstitial modal opens (`songInterstitial.show`).
 ├── 3. Music bus crossfades to camp track; Radio and Voice callouts are paused.
 └── 4. Awaits modal dismiss (1.2s - 2.5s hold).

                                   │ (Interstitial finishes and closes)
                                   ▼
[Phase 3: Leader Conversation Modal]
 ├── 1. `leader-dialogue` opens modal cleanly.
 ├── 2. Plays Leader authored voice clip (`playVoiceTrack(..., { priority: 1 })`).
 ├── 3. Typewriter runs text silently OR with subtle single-character click SFX
        (Procedural synth bleeps are SUPPRESSED while authored audio is playing).
 └── 4. Player reads and clicks 'CONTINUE' / 'FINISH'.

                                   │ (Leader modal closes)
                                   ▼
[Phase 4: Side Stories & Radio Backlog]
 ├── 1. Side story / NPC trees trigger only after modal closes.
 └── 2. Remaining background radio tips play one by one with proper spacing.
```

---

## 6. Detailed Implementation & Remediation Plan

### Phase 1: Radio Queue & Voice Duration Decoupling (`main.js`, `src/act2.js`)
1. **Condense Camp Discovery Milestones:**
   - In `src/act2.js`, replace the 3-line boilerplate for `campDiscovered` with a single high-impact line:
     `SYSTEM: SURVIVOR CAMP LOCATED. FLARE DOUSED — SUPPLIES & O₂ SECURED.`
2. **Audio-Aware Radio Queue Pumping:**
   - In `main.js:pumpRadioQueue()`, instead of a static `RADIO_MIN_GAP_MS = 1400`, calculate wait time dynamically:
     ```javascript
     const activeDuration = AudioManager.getActiveVoiceDurationRemaining();
     const dynamicGap = Math.max(RADIO_MIN_GAP_MS, (activeDuration * 1000) + 400);
     ```
   - This guarantees that line $N+1$ never starts until line $N$'s audio has finished plus a 400ms breath gap.

### Phase 2: Speech Director & Priority Management in `AudioManager` (`src/audio.js`)
1. **Implement `playVoiceTrack(key, options)`**:
   - Add explicit priority channels (`0: Cutscene`, `1: Leader`, `2: Interstitial`, `3: Radio`, `4: Callout`).
   - Track `activeVoice` node and attach `onended` listeners.
   - Add `isVoiceSpeaking()` check.
2. **Channel Ducking Coordination:**
   - When a Priority 0 or Priority 1 voice plays, automatically duck `musicGain` to 0.35 and `foleyGain` to 0.5 with a smooth 150ms ramp.
   - Restore volumes on `onended` with a 400ms release ramp.

### Phase 3: Camp First Contact & Leader Interaction Sequencing (`src/threeGame.js`, `main.js`)
1. **Async / Sequential Gate in `interactWithAct2Camp()`**:
   - Refactor `interactWithAct2Camp()` in `src/threeGame.js`:
     ```javascript
     if (action === 'talk') {
         if (!this._seenCampFirstContact?.has(camp.id)) {
             this._seenCampFirstContact.add(camp.id);
             window.dispatchEvent(new CustomEvent('camp-first-contact', {
                 detail: {
                     campId: camp.id,
                     campLabel: camp.label,
                     campState: this.getCampRecord(camp.id),
                     onComplete: () => {
                         this.talkToLeader('camp', camp);
                     }
                 }
             }));
             return true;
         }
         return this.talkToLeader('camp', camp);
     }
     ```
   - In `main.js`, update `camp-first-contact` listener to await `songInterstitial.show()` and call `event.detail.onComplete?.()` once the transition doors open.
2. **Separate NPC Dialogue Tree Trigger**:
   - Defer `openNpcDialogueTree` so it does not open simultaneously over the `LeaderConversationModal`.

### Phase 4: Dialogue Typewriter Vocalizer Gating (`src/dialogue.js`)
1. **Suppress Typewriter Beeps during Authored Audio:**
   - In `dialogue.js`, check `AudioManager.isVoiceSpeaking()` before playing procedural typewriter audio.
   - Restrict typewriter audio triggers to once per sentence / punctuation boundary rather than every 3 characters.

### Phase 5: Tactical Voice Callout Gating (`src/voiceCallouts.js`)
1. **Check Narrative Voice Gate Before Callouts:**
   - In `voiceCallouts.js`, verify `!AudioManager.isVoiceSpeaking()` before triggering cosmetic cues like `reloading` or `low_health`.
   - If a camp leader or mothership transmission is speaking, silently drop combat chatter callouts.

---

## 7. Verification & Testing Strategy

### 7.1 Automated Vitest Test Suite
Create unit tests in `src/campVoiceOrchestration.test.js`:
- **Test 1:** `campDiscovered` milestone queues lines without overlapping audio calls.
- **Test 2:** `pumpRadioQueue` respects active voice clip duration instead of advancing after 1.4s.
- **Test 3:** `camp-first-contact` waits for interstitial completion before dispatching `leader-dialogue`.
- **Test 4:** Dialogue typewriter skips procedural oscillator beeps when an authored voice track is playing.
- **Test 5:** Tactical voice callouts are suppressed when a Priority 1 leader voice is active.

### 7.2 Manual In-Game Walkthrough
1. Start run in Act 1 / Act 2.
2. Walk within 7 units of Camp Tallow:
   - Verify discovery sound plays.
   - Verify Exosuit voice line finishes completely.
   - Verify radio banner displays cleanly without jitter.
3. Approach Sister Martha and press `E` (Interact):
   - Verify Title Card / Song Interstitial displays first.
   - Verify music crossfade is smooth.
   - Verify Leader Conversation opens only after the interstitial card settles.
   - Verify Sister Martha's voice line plays clearly without typewriter chirp distortion.
   - Verify no second modal (NPC tree) overlaps the conversation.

---

## 8. Summary of Files to Modify

| File | Proposed Change |
|---|---|
| `docs/camp-arrival-voiceover-and-audio-orchestration-plan.md` | **[NEW]** Complete architecture, trace, and remediation plan (this document). |
| `src/audio.js` | Add `activeVoice` state, `playVoiceTrack` with priority gating, duration tracking, and auto-ducking. |
| `src/threeGame.js` | Sequence `camp-first-contact` and `talkToLeader` via callback / async flow. |
| `main.js` | Update radio queue pump to respect audio duration; wire interstitial `onComplete` callback. |
| `src/act2.js` | Condense `campDiscovered` lines to eliminate radio spam. |
| `src/dialogue.js` | Gate typewriter sound effects when authored voice audio is active. |
| `src/voiceCallouts.js` | Suppress tactical callouts while narrative voice channels are active. |
| `src/campVoiceOrchestration.test.js` | **[NEW]** Regression tests for priority queue and camp arrival sequencing. |
