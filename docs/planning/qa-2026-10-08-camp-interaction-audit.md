# QA 2026-10-08: what happens when you talk at a camp

Owner, 2026-10-08: "when we get to a camp, there are 3 different sets of dialogue and movies playing behind them ... too many options are showing on one, I'm not sure what's really hooked up and functional either."

## Evidence

Session logs from the drop box (`steam.tuesdaycinema.club/logs/session`):

| Capture | Build | What one camp visit did |
|---|---|---|
| `2026-10-01T00-14-42` | 2.4.13 `95ff7285` | Pressing E at Kaelen opened the choice tree ("Your fingers are electric…", "Let the synchronization go deeper") **and** the staged camp conversation (CONTINUE → FINISH CONVERSATION). A song video was clicked behind them at 618 s. Talking again repeated all three. |
| `2026-10-01T23-29-55` | 2.4.14 `5dd08cc0` | Meridian's first contact: one E press, then within 15 s the choice tree ("[5] SKIP QUEST // BRIBE"), the staged conversation ("ANOTHER SUIT FROM THE SURFACE."), and a song video, all clicked in turn. |
| `2026-10-07T20-04-50` | 2.4.16 `6d5fc7ed` | The staged conversation, and Kaelen's choice-tree modal, again together. |

The session log's menu tracker watches a fixed list of surfaces that includes none of these three, so the overlap never shows as a menu "open". It is visible only in the click trail.

## What one "TALK" press does

`ThreeGame.interactWithCamp` → `action === 'talk'`:

1. **First visit only.** `camp-first-contact` plays the camp's **song title card** (`SongInterstitialController`), then calls `talkToLeader` when it finishes.
2. `talkToLeader(kind, entity)` (`src/threeGame.js`) then does **two things**:
   - it dispatches `leader-dialogue`, which opens the **staged camp conversation** (`#leader-conversation-modal`): the leader's 3D portrait, the voice, BOND / CAMP LEVEL / STORY STAGE, and CONTINUE;
   - it calls `window.openNpcDialogueTree(treeMap[entity.id])`, which opens the **choice tree** (`#npc-dialogue-modal`, `src/npcDialogueTrees.js`).
3. If the tree's opening node has an `interstitial`, a **second song video** starts behind both modals (`playSideStoryInterstitial`). Every later choice that reaches a node with an `interstitial` starts another one. Twenty of the trees' nodes carry one.

The result: up to two dialogue modals and two music videos from one key press.

## The two conversation systems

| | Staged camp conversation | Choice tree |
|---|---|---|
| Source | `src/campDialogue.js` (ladder), `act2.js` | `src/npcDialogueTrees.js`, `src/sideStorySystem.js` |
| Shape | Linear lines; CONTINUE; new lines unlock as camp level, bond and the reveal advance | Branching choices [1–4], plus an appended **[SKIP QUEST // BRIBE]** and **[PAUSE / COME BACK LATER]** |
| Tied to | Camp bond 0–5, camp quests, the finals, the endings | Its own bond 0–100 ("WARM TRUST // SOULBOUND"), romance and "sensual story perks", side-story stages |
| Saved | Yes, in the campaign Act 2 save (`hb_act2_v1`) | Story stages: yes, under a separate key (`hb_side_stories_v1`). **Earned perks and bond: no.** `activePerks` and `bondState` are memory-only and are not rebuilt on load. |
| Perks do anything? | n/a | Yes. Each of the 9 perks has one real effect in `threeGame.js` (radar range, damage resistance, evasion, regen and so on), but only until the game reloads. |
| Leader names | Meridian: Kaelen; Tallow: **Martha**; Vesper: Briggs | Meridian: Kaelen; Tallow: **Sister Val**; Vesper: Briggs |

The two systems disagree about who runs Tallow, and they track two unrelated "bond" values for the same person.

## The action list ("too many options")

`getCampActionsAt` collects every action available where you stand, and C cycles through them ("1/7 C ▸"). At a living camp in Act 1 the list can hold:
- talk to a resident;
- TALK to the leader;
- support or fortify;
- start a quest;
- run a camp favour;
- the camp's active verb;
- shore up defences;
- negotiate a package deal;
- treat a scar;
- field workbench;
- sleep;
- settle a survivor.

That is up to twelve items, all sharing one prompt. Exclusive states (turret, lockdown, cull, decision) already replace the list correctly.

## Hooked up and working

- Staged conversation: works and is saved. It is the camp's story spine.
- Song title card on first contact: works.
- Choice tree: opens, branches, and its perks apply, but they do not persist. Bribe-skip deducts banked resources through `sideStoryManager.skipCurrentStageWithCost`. Pause works.
- Choice-tree interstitials: work. That is the problem: they stack on the title card.
- Every camp action in the list: each one is wired to a handler.

## Decisions (owner, 2026-10-08: all three recommendations)

1. **One conversation per camp.** TALK opens only the staged conversation. When its lines end, the leader's choice tree continues in the same window, with its choices as buttons. Number keys, Escape and LEAVE work as before. Perks and bond are saved.
2. **Music videos on first contact only.** One title card the first time you reach each camp, then never behind dialogue.
3. **TALK + CAMP SERVICES.** The prompt offers at most three actions: TALK, the most relevant action, and CAMP SERVICES. The services menu lists the rest.

## What changed

- **`talkToLeader`** (`src/threeGame.js`) passes `treeId` in the single `leader-dialogue` event. It no longer calls `openNpcDialogueTree`, so the second modal never opens from a camp.
- **`main.js`** hosts the tree inside `#leader-conversation-modal`:
  - `openLeaderConversationTree` and `renderLeaderConversationTree` draw the tree's node and choices in the conversation window;
  - `npcTreeHost` routes the manager's updates to that window;
  - in choice mode the panel holds a fixed height, and the choice list scrolls inside it.
- **`src/npcDialogueTrees.js`:**
  - perks and bond are rebuilt from the saved side stories (`hb_side_stories_v1`, profile-synced), so earned perks survive a reload;
  - choices no longer start song videos;
  - the appended **[PAUSE / COME BACK LATER]** is gone: nothing ever resumed or read a paused story, so it was a third way to leave.
- **Song videos:** the camp-decision modal (Act 2) no longer plays the camp's title card again. It plays once, on first contact.
- **Tallow's leader** is **Sister Martha** everywhere: the tree, side-story config, song-card captions and the mature-content audit. The internal id `sister_val` and the save keys are unchanged.
- **Action list:**
  - `src/campActionMenu.js` trims the prompt to three entries, ranked by relevance;
  - `ThreeGame.performCampService` re-checks a menu pick against what the camp still offers;
  - `src/campServicesUi.js` and `#camp-services-modal` hold the list, registered with the controller lists (`src/inputActions.js`, `SPATIAL_FOCUS_ROOT_IDS`);
  - strings `ui.camp.services*` are in all 7 locales.
- **HUD:** the mission banner, objective drawer and notification stack (16800+) drew over every gameplay modal. They step aside while a camp conversation or the services menu is open (`html[data-camp-dialog]`).

## Verification

- **Unit:** `src/threeGame.campConversation.test.js`, `src/threeGame.campServices.test.js`, `src/campActionMenu.test.js`, `src/campServicesUi.test.js`, and new cases in `src/npcDialogueTrees.test.js`. The full suite passes: 646 files.
- **Browser** (`tests/e2e/camp-conversation.spec.js`, GPU config):
  - talking to Kaelen shows one window and no song video; his choices appear in the same window after the staged lines;
  - after a choice, still one window; LEAVE closes both layers;
  - the camp prompt shows 3 of 5–6 actions, and CAMP SERVICES opens with the rest;
  - first contact at Tallow plays the title card once, then Sister Martha's conversation; a second TALK goes straight to the conversation.

## Still open

- **The npc-dialogue modal (`#npc-dialogue-modal`) is no longer opened from camps.** `window.openNpcDialogueTree` remains for any future non-camp use. If none appears, remove the modal markup and `updateNpcDialogueUi`.
- **The trees' romance content** is unchanged. It is gated behind the existing mature-content audit.
