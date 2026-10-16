# Camp Interactions, Dialogue and Cinematics: Audit and Plan

**Date:** 2026-10-16
**Status:** audit complete. The option-reveal and repetition fixes have shipped (§5); everything from §6 on is a proposal awaiting owner review.

## 1. The ask

The owner, after visiting a camp:

> When I went to a camp there were too many styles of dialogue, and all the options to seduce before I'd done anything. Map how these options get uncovered and don't show them over and over, and fix the UI. Audit all these in-game interaction systems and solidify them, and make clear how we show what image/video for the voices. It's a whole mess now. Document this ask, these issues and what we suggest to change and fix, what interstitial graphics we need for storylines, and how we placehold until them: animated sequences where we walk over to a prop and do an interaction of sorts and then go back to dialogue, in-game cutscenes as well as image cutscenes.

## 2. What a camp visit can show today

One walk into Camp Tallow can put up to twelve different presentation surfaces in front of the player, each with its own layout, type style, media and voice rules.

| # | Surface | Opens when | Writing style | Media | Voice | Source |
|---|---|---|---|---|---|---|
| 1 | Proximity prompt | standing near the leader, a resident or a service | `[E] TALK` + up to 2 more | none | none | `src/campActionMenu.js` |
| 2 | Song title card | first contact with a camp (once) | song title | key art image, or motion video when shipped, plus music | music only | `src/songInterstitials.js` |
| 3 | Leader conversation, staged lines | TALK | `KAELEN: ALL CAPS RADIO LINES` | 3D leader bust, falling back to a 2D portrait | recorded if the exact line exists (113 of these are recorded) | `main.js` `leader-dialogue`; `src/data/campDialogue.js` |
| 4 | Leader conversation, choice tree | after the staged lines | sentence-case prose, italic narration, `[TONE]` tags | same window, same bust | **none**: 0 lines recorded, not in the i18n catalog | `src/npcDialogueTrees.js` |
| 5 | Standalone NPC dialogue modal | nothing calls it any more | prose | emoji avatar | none | `npc-dialogue-modal` in `index.html` |
| 6 | Camp choice (decision) modal | the Act 2 camp decision | menu cards; arc confirm with ending locks | none | none | `main.js` `renderCampChoice` |
| 7 | Camp services menu | "CAMP SERVICES (n)" | list | none | none | `src/campServicesUi.js` |
| 8 | Resident chatter | TALK to a camp worker | `NAME (ROLE): "line"` in the HUD bunker line | none | typing blip | `talkToCampResident`, `src/data/campResidents.js` |
| 9 | System lines | support, bond, turret events | `SYSTEM: …` biome prompt | none | none | `main.js` `showBiomePrompt` |
| 10 | Radio callouts | combat and vitals cues | subtitle | none | voice banks | `src/voiceCallouts.js`, `src/data/voiceBanks.js` |
| 11 | Wanderer modal | meeting a wanderer | its own portrait-column layout | portrait | keyword voice | `src/wandererModal.js` |
| 12 | Brief transmission / Mothership terminal | fallback for #3 and Mothership beats | terminal text | Mothership portrait | recorded where present | `src/dialogue.js` |

Plus the cinematic layers that can follow a story beat:
- video cutscenes in `public/cutscenes/`: intros, class intros, deaths, endings, events, `sleep-bunker`;
- image fallbacks (`src/cinematicFallback.js`);
- the O2 door choreography (`src/o2CinematicDoors.js`);
- sleep cutscenes (`src/sleepCutscene.js`).

## 3. How options are uncovered today

### 3.1 Staged leader lines (the ladder)

`src/data/campDialogue.js`: each leader has up to four stages. Within a stage, each visit plays the next beat. When the beats run out, the stage's loop line repeats until its requirement is met (camp level, bond out of 5, the Act 2 reveal, or a quest flag). Stage 3 is the leader's "final thing". This part already behaves well: it is earned, it doesn't repeat, and it's voiced.

### 3.2 Choice trees (the problem)

`src/npcDialogueTrees.js`: five trees (Martha, Briggs, Kaelen, Aria, Nahl). Before today:
- every conversation restarted at the tree's first node, unless a side-story stage pointed elsewhere;
- the first node of Martha, Briggs and Kaelen offered **two intimate or seductive choices out of four on first meeting**, with no requirement at all;
- every choice was offered again on every visit;
- bond points and perks were granted again on every walk down the same branch, so they could be farmed;
- the tree's bond score (+25 to +40 per node, labelled "ENAMORED" and so on) was shown beside the camp's `BOND x/5`, so the window displayed two contradicting bonds.

### 3.3 Other reveal paths

- **Prompt:** at most 3 slots: TALK, the most relevant action, then CAMP SERVICES holding the rest (owner rule, 2026-10-08).
- **Residents:** the line rotates with how many times you've talked to that person, and with the camp's condition.
- **Camp decision:** Act 2 only. Choices touching a story linchpin show a confirm with the endings they permanently lock.
- **Side stories:** three stages per leader. Arriving at a perk node completes the current stage. A "skip quest" bribe is appended to the tree while a stage has a skip cost.

### 3.4 Unlock map after today's fix

The intimacy gate is camp trust (bond out of 5) of at least 3 **and** the leader's story past its first stage, from `INTIMACY_REQUIREMENT` in `src/npcDialogueTrees.js`. Ways out (`[LEAVE]`, closing lines) are always offered. Bond and perks pay out the first time a node is reached.

| Leader | Node | Choice | Leads to | Offered when | First-visit reward |
|---|---|---|---|---|---|
| Sister Martha | val_greeting | [INTIMATE TOUCH] | val_massage_response | bond ≥ 3 and story stage ≥ 2 | +25 bond pts, perk: Tallow's Seductive Warmth |
| Sister Martha | val_greeting | [SENSUAL / EMBRACE] | val_embrace_response | bond ≥ 3 and story stage ≥ 2 | +35 bond pts, perk: Flesh Communion Blessing |
| Sister Martha | val_greeting | [PRAGMATIC LORE] | val_spores_response | always | +15 bond pts |
| Sister Martha | val_greeting | [LEAVE] | (ends) | always | — |
| Sister Martha | val_massage_response | [DEEPEN INTIMACY] | val_intimate_climax | bond ≥ 3 and story stage ≥ 2 | +40 bond pts |

The full 54-row table for all five trees can be regenerated with the command in Appendix A. Every intimate choice in Briggs, Kaelen and Aria follows the same gate.

## 4. Issues found

Each issue is numbered. **Fixed** means fixed today; **Proposed** means it is planned in §6–§10.

| # | Issue | Evidence | Status |
|---|---|---|---|
| I-1 | Seduction choices offered on first meeting with Martha, Briggs, Kaelen (2 of 4) and Aria | first nodes in `src/npcDialogueTrees.js` | **Fixed:** gated (§5) |
| I-2 | The same choices on every visit | the tree always restarted at its first node | **Fixed:** choice memory |
| I-3 | Bond and perks farmable by repeating a branch | `bondDelta` and `rewardPerk` applied on every arrival | **Fixed:** first visit only |
| I-4 | Nahl, Vey and Rhun's hives opened **Aria's** seduction tree | `threeGame.talkToLeader` treeMap; hives defined in `src/act2.js` | **Fixed:** Suture → Nahl's tree; Vey and Rhun get none until written |
| I-5 | Perks granted silently | the tree called `showSteamDropToast(object)`, which expects a Steam itemdefid | **Fixed:** toast via `window.showToastNotification` |
| I-6 | Two contradicting bond readouts in one window | tree points versus camp `BOND x/5` | **Fixed:** the tree no longer overwrites the guidance line |
| I-7 | Two writing styles in one window: ALL-CAPS radio lines, then sentence-case prose with italic narration and `[TONE]` tags | `campDialogue.js` versus `npcDialogueTrees.js` | Proposed §6.1 |
| I-8 | Tree lines never voiced and never translated | 0 recorded; not in the `localizeCatalog` | Proposed §6.4 |
| I-9 | Dead standalone dialogue modal still in the page | no caller of `openNpcDialogueTree` | Proposed §6.2: remove |
| I-10 | Naming collisions | tree id `sister_val` is Martha, with portrait `tallow_val.png` while the conversation uses `tallow_martha.png`; a separate "Val" identity exists; `LEADER_IDENTITIES.scientist` is called "Dr. Nahl" with a human survivor portrait while Nahl is the Suture being | Proposed §6.5 |
| I-11 | Six different layouts at one camp (services, choice modal, resident HUD line, wanderer modal, terminal, conversation) | §2 | Proposed §6.2 |
| I-12 | Side-story cards reuse other scenes' videos: all three Martha cards and all three Briggs cards play song-card clips; 9 cards (Kaelen, Aria, Nahl) have no MP4 | `SIDE_STORY_INTERSTITIALS` | Proposed §8 |
| I-13 | Song cards 33–38 (Act 3 and endings) have no motion clip | file check | Proposed §8 |
| I-14 | No grammar for a staged in-world beat (walk to a prop, use it, return to the conversation); only the O2 door choreography exists, hand-built | `src/o2CinematicDoors.js` | Proposed §9 |
| I-15 | Briggs's 3D bust is a generic heavy chassis | `LEADER_IDENTITIES.briggs.modelUrl` | Proposed §8 |

## 5. Fixed today

These shipped on `dev/sprint-53` in commits `b4bedd83`, `be2bf7b8` and the follow-up. Tests: `src/npcDialogueTrees.test.js`, "earned, non-repeating leader conversations".

- **Intimacy gate.** `INTIMACY_REQUIREMENT = { bond: 3, stage: 1 }`. Intimate choices are recognised by an `intimate: true` flag or by their tone (INTIMATE, SENSUAL, SEDUCTION, EMBRACE, PASSION, FLIRT, SURRENDER, TOUCH, TASTE, CARESS). The conversation passes the camp's bond and the leader's story stage into the tree.
- **Choice memory**, saved with the side stories (`hb_side_stories_v1`, `takenChoices` and `visitedNodes`). A choice disappears once every line it leads to has been heard. Exhaustion is judged by what the relationship allows **now**, so a branch reopens when intimacy unlocks new lines inside it.
- **Nothing new, no tree.** When only a way out (or just a quest bribe) would remain, the tree doesn't open, and the conversation ends after its staged lines.
- **Rewards once.** Bond and perks pay out on the first arrival at a node.
- **Tree mapping corrected:** Suture → Nahl. Relay and Carapace have no tree.
- **Perks are announced** with a toast.
- **One bond readout:** camp `BOND x/5`.

## 6. Proposed: one conversation grammar

### 6.1 One window, one voice

All talk with a person uses the leader conversation window (#3/#4). Inside it:

- **Speaker strip:** name, title, camp, and `BOND x/5 • STAGE n`. Nothing else.
- **Line:** spoken words in sentence case, never ALL CAPS. Convert the `campDialogue.js` ladder text to sentence case. The radio register (caps, callsign prefix) belongs only to radio callouts and the Mothership.
- **Narration:** one short italic sentence at most, before the line, and only when it shows something the bust can't.
- **Choices:** at most 4, each a plain sentence, with a short intent tag shown as a small chip rather than a bracketed shout: `Ask`, `Trust`, `Flirt`, `Leave`.
- **Continue/Leave:** same buttons, same place, every time.

### 6.2 Fold the other surfaces in

| Today | Proposal |
|---|---|
| Standalone NPC modal (#5) | Delete it (dead). |
| Resident HUD line (#8) | Same window in a compact mode: portrait chip, name and role, one line, auto-close after 4 s. |
| Wanderer modal (#11) | Same window; the wanderer's offer becomes choices. |
| Camp choice modal (#6) | Keep it as the one decision surface, restyled to the conversation's type and accent; the ending-lock confirm stays. |
| Camp services (#7) | Keep it, with the same type and accent. |
| Brief transmission (#12) | Keep it for the Mothership and radio only, never for a person standing in front of you. |

### 6.3 What media goes with a line

| Situation | Shows | Never |
|---|---|---|
| Talking to someone present | 3D bust with a gesture per line (`dialogueReactionForLine`); 2D portrait if the model fails | a video |
| First contact with a camp | the camp's song card (key art + music; motion clip when shipped), once | a second card later |
| A story beat changes the world (a camp outcome, a covenant, a reveal) | an interaction sequence (§9) if staged in-engine; otherwise the story card (§8) | another character's clip |
| A perk or reward | a toast | a modal |
| Radio / Mothership | subtitle + voice | a portrait of someone not on the radio |
| Death, ending, intro, class intro | the cutscene video; image fallback (`cinematicFallback`) while it is missing | silence |

### 6.4 Voice

- Every line shown in the conversation window is voiced, or explicitly marked as text-only.
- Move the choice trees into the i18n catalog (`localizeCatalog('narrative.leaderTrees', …)`), so they are translatable and the voice pipeline (`scripts/voice/`) can render them by key.
- Narration is never voiced.
- The player's choices are never voiced.

### 6.5 Names and identity

One id per character, used everywhere:

| Character | Id | Fix |
|---|---|---|
| Martha | `martha` | rename tree `sister_val` → `martha`, migrating the saved side-story key; one portrait |
| Briggs | `briggs` | — |
| Kaelen | `kaelen` | — |
| Nahl | `nahl` | the Suture being |
| Vey | `vey` | — |
| Rhun | `rhun` | — |
| Aria | `aria` | the Queen's mimic |
| Dr. Okonkwo-Vass | `vass` | the scientist; rename `LEADER_IDENTITIES.scientist` from "Dr. Nahl" |
| Val | `val` | — |

## 7. Proposed: how options should be revealed

Three tiers per leader. Each opens content and never repeats it.

| Tier | Requirement | Options on offer |
|---|---|---|
| Stranger | first meeting | who they are, the camp's need, a quest offer, leave |
| Trusted | bond ≥ 2 or story stage ≥ 1 | personal history, their fear, their stake in the ending, favours |
| Close | bond ≥ 3 **and** story stage ≥ 1 (today's gate) | intimacy, which is always optional and always refusable, with a respectful "not now" that doesn't cost trust |

Camp outcomes change the tier set:
- **Robbed** closes Close and turns Trusted lines cold.
- **Recruited** moves the conversation to the base.
- **Turned** replaces the tree with a hostile one.

Hive beings (Nahl, Vey, Rhun) use covenant tiers instead (offered → accepted / refused), matching the covenant objects in the world-expansion sheet.

**Missing content:**
- Vey and Rhun have no trees at all.
- Aria's tree should open only in a Queen context.
- Each human tree needs Stranger and Trusted content; today they are almost all Close content.

## 8. Interstitial art needed, and placeholders

### 8.1 What exists

- **Song cards 01–38:** all have key art and music; 01–32 also have a motion clip.
- **Side-story cards (15):** all have stills. The Martha and Briggs cards reuse song-card videos. The Kaelen, Aria and Nahl cards have no MP4.
- **Cutscene videos:** intros (boot, Mothership briefing), class intros, deaths (10), endings (11), events (black box, foundry, O2, three boss encounters, the Queen), cave reveal, Act 3 departure, credits, `sleep-bunker`.

### 8.2 What each storyline needs

| Storyline | Needed | Priority |
|---|---|---|
| Martha / Tallow | 3 side-story motion clips of her own (hearth, spore communion, eternal hearth); outcome stills: grown, robbed, recruited, turned | High |
| Briggs / Vesper | 3 motion clips of his own (scorched rig, scar tissue, vanguard fire); 4 outcome stills; a real 3D bust (not the generic chassis) | High |
| Kaelen / Meridian | 3 motion clips (cradle, overclock, matrix); 4 outcome stills | High |
| Nahl / Suture | 3 motion clips; covenant stills (offered, accepted, refused) | Medium |
| Vey / Relay | tree, first-contact card, 3 covenant stills | Medium |
| Rhun / Carapace | tree, first-contact card, 3 covenant stills | Medium |
| Aria / Queen | 3 motion clips; Queen-context entry card | Medium |
| Act 3 and endings | motion clips for song cards 33–38 | Medium |
| Sleep | `sleep-camp`, `sleep-cryo`, `sleep-hive`, `sleep-squad` (only `sleep-bunker` ships) | Low |
| Interaction sequences (§9) | none needed in advance: they use in-engine 3D | — |

### 8.3 Placeholder ladder

Every card or cutscene slot resolves down this ladder, and the manifest records which rung it's on. That way a tool can list what's still placeholder (add `status: 'final' | 'still' | 'placeholder'` to each manifest entry).

1. **Final motion clip.**
2. **Key-art still** with a slow pan and the scene's music. `songInterstitials` already falls back to the still.
3. **In-engine stand-in:** the 3D bust or prop with a camera move and the line voiced.
4. **Title slate:** kicker, title and one line, as `cinematicFallback` does for deaths.

Never use another character's or another scene's clip as a placeholder. A reused clip reads as a mistake; a slate reads as unfinished.

## 9. Proposed: interaction sequences (walk to a prop, use it, back to the conversation)

The pattern is a short in-engine beat staged from data, built on parts that already exist:
- **Choreography:** the O2 doors (lock input, ordered beats, skip, resume).
- **Actors:** camp NPC walkers.
- **Articulation:** `propExperience` (named `HB_*` nodes), `propFx` (lights, steam, sparks).
- **Faces:** `leaderConversation3d` gestures.

### 9.1 Sequence format

```js
{
    id: 'martha_warm_pipe_return',
    trigger: { quest: 'warm_pipes', when: 'complete' },
    actors: { leader: 'martha', player: true },
    steps: [
        { do: 'lockInput' },
        { do: 'camera', shot: 'two-shot', target: 'leader', ms: 600 },
        { do: 'walk', actor: 'leader', to: { anchor: 'martha_warm_pipe_return_nest' } },
        { do: 'face', actor: 'player', toward: 'leader' },
        { do: 'gesture', actor: 'leader', clip: 'happyHand' },
        { do: 'prop', anchor: 'martha_warm_pipe_return_nest', verb: 'return keepsake', state: 'occupied' },
        { do: 'fx', anchor: 'martha_warm_pipe_return_nest', effect: 'steam' },
        { do: 'line', speaker: 'martha', key: 'narrative.sequences.martha_warm_pipe_return.0' },
        { do: 'camera', shot: 'conversation', ms: 500 },
        { do: 'resumeConversation' }
    ],
    skip: 'jumpToEndState',
    placeholder: { card: 'side:val_eternal_hearth' }
}
```

### 9.2 Rules

- 4–12 seconds, skippable at any point. Skipping applies the end state.
- Uses the authored room anchor and prop states from the world-expansion manifest, so the same prop works in play.
- Lines are voiced keys (§6.4).
- If an actor model or anchor is missing, the sequence plays its placeholder card instead.
- No sequence runs twice: completion is saved with the quest.

**First candidates:**
- Martha's warm-pipe return;
- signing the Grid Covenant (`meridian_grid_covenant_seal`);
- Briggs's ledger line (`vesper_iron_ledger_totem`);
- the escort tether reel (lost cultist);
- one covenant per hive being.

### 9.3 Image cutscenes versus video cutscenes

| Kind | Use for | Built from |
|---|---|---|
| **Video** | authored set pieces the engine can't stage: intro, deaths, endings, boss arrivals | `public/cutscenes/*.webm` with a poster still |
| **Image** | the same slots while video is missing, and quiet beats (sleep, morning card, codex) | key art, timed captions, music; `cinematicFallback` |
| **In-engine sequence** | anything that changes the world the player is standing in | §9.1 |

## 10. Work plan

| Step | Work | Acceptance |
|---|---|---|
| 1 | Done: gate, memory, once-only rewards, mapping, perk toast, one bond readout | tests in `src/npcDialogueTrees.test.js` |
| 2 | One conversation grammar: sentence-case ladder text, chip tags, ≤ 4 choices, delete the standalone modal, residents and wanderers in the window | one layout at a camp; controller path unchanged |
| 3 | Trees into i18n; voice-render the tree lines | the i18n audit passes; recorded lines play |
| 4 | Identity cleanup (§6.5) with a save migration | a saved side-story key survives the rename |
| 5 | Stranger/Trusted content for the three human leaders; Vey and Rhun covenant trees | each tree has content at every tier |
| 6 | Interaction sequence runner + first two sequences | skip applies the end state; a missing asset falls back to its card |
| 7 | Manifest `status` field and a gap report; commission §8.2 art | the report lists every placeholder slot |

## Appendix A: regenerate the unlock table

```sh
node -e "import('./src/npcDialogueTrees.js').then(({ NPC_DIALOGUE_TREES: T, isIntimateChoice }) => {
  for (const tree of Object.values(T)) for (const node of Object.values(tree.nodes)) for (const c of node.choices ?? [])
    console.log([tree.name, node.id, c.tone, c.nextNode ?? '(ends)', isIntimateChoice(c) ? 'gated' : 'always'].join(' | '));
});"
```
