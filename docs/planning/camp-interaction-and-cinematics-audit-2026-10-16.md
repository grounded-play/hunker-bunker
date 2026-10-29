# Camp Interactions, Dialogue, Cinematics and World Props: Audit and Plan

**Document ID:** `HB-AUDIT-2026-10-16-CAMP-CINEMATICS`
**Date:** 2026-10-16; revised 2026-10-18 against the live server logs and the Definitive First Expedition implementation.
**Status:**
- Live-play log review complete (§2).
- Option gating, choice memory and the leader-tree fix have shipped (§5).
- Door-bookended cards, all 32 song-card triggers, side-story still fallbacks and the first three in-engine interaction sequences have shipped (§13.6).
- Sector 0 and safe-camp Field Recalibration are committed; the Mycelium Stalker redesign is present in the working tree but is not yet a committed/shipped baseline (§14).
- Remaining work is summarized in §0 and §12. Do not read proposal-era wording in §8 or §13 as current status without checking their Status columns/logs.

**Ingest paths:**

| Kind | Paths |
|---|---|
| Code | `src/threeGame.js`, `src/npcDialogueTrees.js`, `src/data/campDialogue.js`, `src/act2.js`, `src/songInterstitials.js`, `src/cinematicBeats.js`, `src/interactionSequenceRunner.js`, `src/sectorZeroTutorial.js`, `src/fieldWorkbenchUi.js`, `src/fieldRecalibration.js`, `src/propInteractions.js`, `src/propExperience.js`, `src/propFx.js` |
| Video | `public/cutscenes/`, `public/interstitials/`, `public/interstitials/motion/` |
| Models | `public/3d/runtime/new3ds/` (the world-expansion props in §8 are registered) |

---

## 0. What to do next (one page)

### 0.1 The work, in order

| Pri | Work | Why (evidence) | Done when |
|---|---|---|---|
| **P0** | ~~Gate intimate choices; remember choices; pay rewards once~~ **done** | 3 of 4 live conversations offered intimacy in the first 30 s and repeated it on the next visit (§2) | shipped `b4bedd83`, `be2bf7b8`, `63610473` |
| **P0** | ~~Open the tree of the leader standing there~~ **done** | Deck 2026-10-07: "TALK — SISTER MARTHA" at Meridian opened Kaelen's lines | shipped `dfbe80c9` |
| **P0** | Decide D-1 (leader rotation versus camp identity) | Martha can lead Meridian while its quest says "SIGN KAELEN'S LEDGER" | owner decision |
| **P0** | Capture a fresh-profile packaged Proof Run after the 2026-10-17 changes | the newest hosted capture is 2026-10-16, so no live upload proves Sector 0, recalibration, the real sequence runner or the new Stalker | one desktop and one Deck upload show Sector 0 → Ring 1 → first safe camp → recalibration; attach video for visual judgments |
| **P1** | Give Meridian's first meeting a real Stranger tier, for whichever leader is there | Meridian is the **only** camp any logged player reached (188 runs) | each leader's tree has Stranger content |
| **P1** | Move perks off intimate branches | after gating, 4 of the 5 human perks are reachable only through intimacy | each leader has a perk on a non-intimate path |
| **P1** | One conversation grammar: sentence case, chip tags, ≤ 4 choices; delete the dead standalone modal | lines clicked through about 2 s apart; staged line closed after 1 s | one layout at a camp |
| **P1** | Dialogue telemetry: `DIALOGUE open/line/choice/close` with leader, node, ms on screen and close reason | the logs only show clicks; we inferred everything in §2 from button text | a session log answers "what did they read and pick" |
| **Done** | Interaction-sequence runner + S-1, S-3 and S-11 (§8) | shipped `fe664c2e`; headed browser proof recorded in §13.6 | each plays once; skip applies the end state; missing anchor applies the end state |
| **P2** | Commission the clips in §10 (P1 rows first) | borrowed clips are removed, but all 15 side stories and cards 33–38 still use their own stills rather than final motion | each commissioned slot is `final`; uncommissioned slots remain honest `still` fallbacks |
| **P2** | Trees into i18n; voice the tree lines | 0 tree lines recorded or translated | the i18n audit passes; recorded lines play |
| **Done** | Door bookends + every song video triggered (§13): doors shut → video → doors shut → conversation over gameplay | shipped across §13.6; all 32 cards mapped | packaged Proof Run still required |
| **P1** | Add first-expedition continuity telemetry (§14.3) | current logs cannot answer whether players completed Sector 0, used the skip, saw S-1, or understood recalibration | one upload reconstructs the complete onboarding-to-camp chain without inferring it from clicks |
| **P2** | Add S-17, the Field Recalibration install beat (§14.2) | recalibration applies correctly but resolves as a menu selection plus bunker line | selection → close UI → walk to workbench socket → install chosen module → visible weapon/bench pulse → return control |
| **P3** | Vey and Rhun covenant trees | Aria is now Queen-gated, but Vey and Rhun still have no trees | each hive being has offered/accepted/refused |
| **P3** | Check the three `camp_fire_loop` plays at run start | three plays within 13 ms (one per camp?) | one loop per audible camp |

### 0.2 Decisions needed

- **D-1, leader rotation versus camp identity.** `getCampClassMapping` assigns leaders by the player's class:

  | Player class | Leader at Meridian (first camp) |
  |---|---|
  | Scout | Briggs |
  | Tank | Kaelen |
  | Engineer | Martha |

  But camp quests (`grid_covenant`: "SIGN KAELEN'S LEDGER"), props, dressing, song cards and the camp's name are keyed to the camp.

  **Recommendation:** rotate *which camp is met first* (the order), not which leader lives in which camp. Then Meridian is always Kaelen's grid, Tallow always Martha's hearth, and Vesper always Briggs's line. The class rule ("meet the two other disciplines first, your mirror last") still holds.
- **D-2, intimacy threshold.** Today it is bond ≥ 3 of 5 and story stage ≥ 2. Keep it, or require a completed camp quest as well?
- **D-3, cutscene skip.** Intro sequences are skipped 74% of the time after a median 3.5 s. Event cutscenes (O2, boss, black box) show zero skips in 120+ plays. Either keep it that way, or add one skip control everywhere (hold A / hold Esc).

---

## 1. The asks

**2026-10-16, after a camp visit:**

> "When I went to a camp there were too many styles of dialogue, and all the options to seduce before I'd done anything. Map how these options get uncovered and don't show them over and over, and fix the UI. Audit all these in-game interaction systems and solidify them, and make clear how we show what image/video for the voices. Document this ask, these issues and what we suggest to change and fix, what interstitial graphics we need for storylines, and how we placehold until them: animated sequences where we walk over to a prop and do an interaction of sorts and then go back to dialogue, in-game cutscenes as well as image cutscenes."

**2026-10-16, follow-up:**

> "Review and enhance this based on logs from the server we've pushed from live plays and make more clear what's to be done. Outline what we can do to improve and add what's missing. Make the prompts in the style of first frame, last frame and action for movies, and outline when we take X item a new in-game cutscene happens where we walk to Y, the player and NPC, to this Z interaction triggering this event."

---

## 2. What live play shows (verified)

### 2.1 The data

| Item | Value |
|---|---|
| Source | `steam.tuesdaycinema.club/logs/session` (in-game log upload) |
| Logs | 85 session logs, 2026-09-11 → 2026-10-16 |
| Runs | 188 (`run-start` events) |
| Builds | 2.4.4-beta → 2.4.17-beta |
| Platforms | Steam Deck and PC |
| Limitation | No log records dialogue content. Conversations are reconstructed from click targets (button text) and timestamps. |

### 2.2 Findings

| # | Finding | Evidence |
|---|---|---|
| F-1 | **Meridian is the whole camp experience.** It is the only camp any logged player reached. Tallow and Vesper never appear. Hives were reached once each (Relay, Carapace). | `MAP Room revealed` camp rooms: only `camp_meridian_*`, across all 188 runs |
| F-2 | **Intimacy on first meeting, and repeated.** All four logged conversations opened with intimate choices. | `2026-10-01T00-14` PC 2.4.13: 30 s after discovering Meridian, clicked "Your fingers are electric, Kae…" ([BIO-LINK INTIMACY]) then "Let the synchronization go dee…"; at 00:14:06, **the same choices again**. `2026-10-05T20-38` Deck 2.4.14: [BIO-LINK INTIMACY] in the first second, then LEAVE. `2026-10-07T20-04` Deck 2.4.16: same choices at 19:56:18 and **again** at 19:56:47. |
| F-3 | **A bribe before an introduction.** The first thing clicked at Meridian was a quest bribe; the staged greeting was closed after one second. | `2026-10-01T23-29` PC 2.4.14: 18 s after discovery, "[5] [SKIP QUEST // BRIBE (25 S…", then LEAVE; the line "ANOTHER SUIT FROM THE SURFACE." was closed after 1 s |
| F-4 | **Stacked windows (pre-2.4.15).** The standalone tree modal, the camp conversation and the song video were all on screen together. | same two 01 Oct sessions: clicks alternate between `npc-dialogue-content`, `leader-conversation-*` and `song-interstitial-video` within 2–4 s. Fixed 2026-10-08 (`da3cbaac`); the dead modal is still in the page. |
| F-5 | **Wrong leader's lines.** The prompt said "TALK — SISTER MARTHA" at Meridian and Kaelen's tree opened. | `2026-10-07T20-04` Deck. Fixed `dfbe80c9`; the root cause is D-1. |
| F-6 | **Lines are skimmed.** Continue and Finish clicks land 1.5–3 s apart; no conversation lasted over 30 s. | all four sessions |
| F-7 | **Intros get skipped.** 72 intro sequences, 53 skipped (74%), median 3.5 s in (quartiles 2.4 / 5.4 s). | `Starting intro cutscene sequence` → `global-skip-intro-btn` |
| F-8 | **Event cutscenes play out.** O2 generator 23, Cybersnail boss 23, black box 21, abyss death 19, foundry 14: zero skip clicks. | `Playing cutscene video:` lines (see D-3) |
| F-9 | **The camp decision window does triple duty**: Act 2 camp decisions, survivor doors (Scan / Open / Breach) and the companion recruit; each answered in seconds. | `camp-choice-option--scan/open/breach`, `RECRUIT COMPANION` (09-25, 10-06) |
| F-10 | **Three camp fire loops start at run start**, likely one per camp. | `camp_fire_loop` played 3 times within 13 ms (10-06, 09-13, 09-11) |

### 2.3 Corrections to the earlier draft

The previous revision of §2 contained claims the logs do not support:

| Earlier claim | What the logs show |
|---|---|
| "28+ logs, 1–15 October" | 85 logs, 188 runs, 11 September – 16 October |
| `2026-10-01T23-29-55` was a Steam Deck | a PC |
| The 2026-10-15 session was "v2.4.17 4faf9b31" | `4faf9b31` is 2.4.16 |
| "Players routinely asphyxiate within 300 s" | `o2-depletion` caused 7 deaths, against 19 `pit-fall` and 10 `mission-abort` |
| Players arrived "at Camp Tallow" | Tallow never appears |
| A 35.6 s freeze "when closing the dialogue modal" | the co-op freeze was a shader-compile stall unrelated to dialogue (`qa-2026-10-15-pve-coop-session.md`) |
| The §9 trigger items (`tallow_pipe_keepsake`, `meridian_logic_core`, `vanguard_dogtags`, `carapace_lifting_tether`, `pale_suture_resin`, `relic_frequency_crystal`) | none exists in the game; §8 now uses real hooks |
| `src/interactionSequenceRunner.js` "utilizes" | at the time of the first log review the file did not exist; it shipped afterward and is verified in §13.6 |

### 2.4 Evidence boundary after the 2026-10-17 implementation

The hosted server still lists 85 captures, and the newest upload is `2026-10-16T02:19:48.091Z`. Therefore:

- §2.2 is valid evidence for the problems players saw before the fixes.
- The shipped status in §5 and §13.6 is supported by code, unit tests and headed-browser checks, not by a later packaged live-play upload.
- Sector 0, Field Recalibration and Sub-Zero Necrosis are committed implementation. They still need the packaged Proof Run in §14.4.
- The Mycelium Stalker flanking/pounce redesign and its tests exist only as uncommitted working-tree changes as of this revision. Treat them as **implemented locally, not shipped** until committed and built.

Do not use old logs to claim that a new flow is readable, paced correctly or controller-safe. Logs can prove event order and timing once telemetry exists; video and a human route are still required for camera composition, animation quality and player comprehension.

---

## 3. What a camp visit can show today (12 surfaces)

| # | Surface | Trigger | Writing style | Media | Voice | Source |
|---|---|---|---|---|---|---|
| 1 | Proximity prompt | standing near the leader, a resident or a service | `[E] TALK — NAME` + up to 2 more | none | none | `src/campActionMenu.js` |
| 2 | Song title card | first contact with a camp (once) | song title | key art still; motion clip when shipped; music | music | `src/songInterstitials.js` |
| 3 | Leader conversation: staged lines | TALK | `KAELEN: ALL CAPS RADIO LINES` | 3D bust, else 2D portrait | recorded where the exact line exists (113) | `src/data/campDialogue.js` |
| 4 | Leader conversation: choice tree | after the staged lines | sentence case, italic narration, `[TONE]` tags | same window | **none** (0 recorded, not in i18n) | `src/npcDialogueTrees.js` |
| 5 | Standalone NPC modal | nothing calls it | prose | emoji avatar | none | `#npc-dialogue-modal` |
| 6 | Camp decision / doors / recruit | Act 2 decision, survivor doors, recruit | cards; ending-lock confirm | none | none | `main.js` `renderCampChoice` |
| 7 | Camp services | "CAMP SERVICES (n)" | list | none | none | `src/campServicesUi.js` |
| 8 | Resident chatter | TALK to a worker | `NAME (ROLE): "line"` in the HUD bunker line | none | typing blip | `src/data/campResidents.js` |
| 9 | System lines | support, bond, turret events | `SYSTEM: …` | none | none | `main.js` `showBiomePrompt` |
| 10 | Radio callouts | combat and vitals cues | subtitle | none | voice banks | `src/voiceCallouts.js` |
| 11 | Wanderer modal | meeting a wanderer | its own portrait column | portrait | keyword voice | `src/wandererModal.js` |
| 12 | Brief transmission / Mothership | fallback for #3; Mothership beats | terminal text | Mothership portrait | recorded where present | `src/dialogue.js` |

---

## 4. How options are uncovered

### 4.1 Who you meet

`src/act2.js`:
- Camps are met in a fixed order: Meridian, Tallow, Vesper.
- Leaders are assigned by the player's class (`ACT2_CLASS_RPS_ORDER`): the two other disciplines first, the mirror of your own class last.
- Everything else (quests, props, dressing, song cards, names) is keyed by camp (D-1).

### 4.2 Staged lines (the ladder)

`src/data/campDialogue.js`:
- Up to four stages per leader. Each visit plays the next beat.
- When a stage's beats run out, its loop line repeats until the stage requirement is met: camp level, bond out of 5, the Act 2 reveal, or a quest flag.
- These lines are earned, non-repeating and voiced. The only problem is the ALL-CAPS radio register.

### 4.3 Choice trees

`src/npcDialogueTrees.js`: five trees.

| Tree | Opens for |
|---|---|
| `sister_val` | Martha |
| `commander_briggs` | Briggs |
| `overseer_kaelen` | Kaelen |
| `dr_nahl` | Nahl at the Suture hive |
| `aria_queen_mimic` | nobody, until a Queen context exists |

Rules since 2026-10-16:
- **Gate:** intimate choices need bond ≥ 3 of 5 and story stage ≥ 2.
- **Memory:** a choice is hidden once everything behind it that the relationship currently allows has been heard.
- **Rewards:** bond and perks pay out on the first visit to a node only.
- **Nothing new:** when only a way out or a bribe would remain, the tree doesn't open.

**Perk gap:** in the human trees every perk sits behind an intimate branch:

| Perk | Tree | Reached through |
|---|---|---|
| `tallows_seductive_warmth` | Martha | intimate branch |
| `flesh_communion_blessing` | Martha | intimate branch |
| `vesper_vanguard_adrenaline` | Briggs | intimate branch |
| `meridian_neural_overclock` | Kaelen | intimate branch |
| `nahl_symbiotic_resonance` | Nahl | `[EMPATHIC RESONANCE]`, not gated |

A player who declines intimacy gets no human leader's perk (fix in §7).

### 4.4 Everything else

- **Prompt:** at most 3 slots (TALK, the most relevant action, CAMP SERVICES).
- **Residents:** the line rotates with talk count and camp condition.
- **Camp quests:** 4 per camp; the signature quest gives bond 2.
- **Side stories:** 3 stages each; a perk node completes a stage.
- **Song card:** first contact only.

### 4.5 Regenerating the unlock table

```sh
node -e "import('./src/npcDialogueTrees.js').then(({ NPC_DIALOGUE_TREES: T, isIntimateChoice }) => {
  for (const tree of Object.values(T)) for (const node of Object.values(tree.nodes)) for (const c of node.choices ?? [])
    console.log([tree.name, node.id, c.tone, c.nextNode ?? '(ends)', isIntimateChoice(c) ? 'gated' : 'always'].join(' | '));
});"
```

---

## 5. Shipped on `dev/sprint-53`

| Commit | Change | Test |
|---|---|---|
| `b4bedd83`, `be2bf7b8`, `63610473` | Intimacy gate (`INTIMACY_REQUIREMENT`); choice memory in `hb_side_stories_v1` (`takenChoices`, `visitedNodes`); rewards once; no tree when nothing is new; perks announced by toast; one bond readout (`BOND x/5`) | `src/npcDialogueTrees.test.js` |
| `b4bedd83` | Suture hive → Nahl's tree. Vey and Rhun get **no** tree (their conversation ends after the staged lines); they used to open Aria's. | `src/threeGame.campConversation.test.js` |
| `dfbe80c9` | The tree follows the leader standing at the camp (`LEADER_TREES` by leader key), not the camp id | `src/threeGame.campConversation.test.js` |

---

## 6. One conversation grammar

### 6.1 One window

All talk with a person happens in `#leader-conversation-modal`:

```
+-----------------------------------------------------------------------------------+
|  [3D BUST]   OVERSEER KAELEN                                                      |
|              Camp Meridian // Grid Overseer        TRUST 3/5 • STAGE 2            |
+-----------------------------------------------------------------------------------+
|  *He doesn't look up from the soldering iron.*                                    |
|  "The coolant pumps in Sector 4 are chattering. If you're heading toward the      |
|   substation, watch your footing."                                                |
+-----------------------------------------------------------------------------------+
|  (1) Ask     What caused the coolant pressure drop?                               |
|  (2) Assist  I have the spare logic core you asked for.                           |
|  (3) Trust   Do you ever regret staying down here?                                |
|  (4) Leave   I'll check the perimeter.                                            |
+-----------------------------------------------------------------------------------+
```

- **Speaker strip:** name, camp and role, `TRUST x/5 • STAGE n`. Nothing else.
- **Spoken line:** sentence case. Convert the `campDialogue.js` ladder text. ALL CAPS stays only for radio callouts and the Mothership.
- **Narration:** at most one italic sentence, only for what the bust can't show.
- **Choices:** at most 4; the intent tag is a small muted chip: Ask, Assist, Trade, Trust, Flirt, Leave.
- **Reading pace (F-6):** lines over 140 characters split into two. Continue is held back for 600 ms after a line appears, so a double press can't skip unread text.
- **Controller:** D-pad focus, A selects, B or Esc leaves (unchanged).

### 6.2 Fold the other surfaces in

| Today | Proposal |
|---|---|
| #5 standalone modal | Delete it. |
| #8 residents | Same window in compact mode: portrait chip, name and role, one line, auto-close after 4 s. |
| #11 wanderers | Same window; the offer becomes choices. |
| #6 decision window | Keep it, restyled to the conversation's type and accent. Give survivor doors their own kicker ("DOOR") so it doesn't read as a camp decision (F-9). |
| #12 brief transmission | Mothership and radio only. |

### 6.3 What media goes with what

| Situation | Shows | Never |
|---|---|---|
| Talking to someone present | 3D bust, gesture per line; 2D portrait if the model fails | a video |
| First contact with a camp | the camp's song card, once | a second card later |
| A quest or covenant changes the world | an in-engine sequence (§8) | another character's clip |
| A side-story stage completes | its side-story card (§10) | another scene's clip |
| Perk or reward | toast | a modal |
| Radio / Mothership | subtitle + voice | a portrait of someone not on the radio |
| Death, ending, intro, boss arrival | the cutscene video; image fallback while missing | silence |

---

## 7. Three tiers per leader

| Tier | Requirement | Content | Perk |
|---|---|---|---|
| Stranger | first meeting | who they are, what the camp needs, the first quest, leave | none |
| Trusted | bond ≥ 2 or story stage ≥ 2 | history, fear, stake in the ending, favours | **the leader's perk lives here** (move it off the intimate branch) |
| Close | bond ≥ 3 **and** stage ≥ 2 | vulnerability, optional intimacy, always refusable at no cost | a cosmetic or story keepsake, never power |

### 7.1 Per-leader content

The Trusted and Close lines follow the earlier draft; Stranger is new.

**Kaelen (Meridian grid)**
- **Stranger:** "Another suit from the surface. Grid's holding. Barely." Choices:
  - Ask: what feeds the grid?
  - Assist: offer to find the lost probe (`lost_probe`).
  - Leave.
- **Trusted:**
  - the voices in the data bus;
  - fear of losing himself to the machine;
  - calibrate his diagnostic cradle → **Meridian Neural Overclock**.
- **Close:** a synchronised biometric link, offered as trust ("Link our suits") with a no-cost refusal.

**Martha (Tallow hearth)**
- **Stranger:** frostbite, the boiler, tallow from moss. Choices:
  - Ask how the chamber stays warm;
  - Assist: report the ruptured insulation (`spore_cleansing`).
- **Trusted:**
  - why "Sister";
  - the squad she lost;
  - tend the wounded with her → **Tallow's Seductive Warmth**, renamed **Tallow's Warmth**.
- **Close:** sharing heat at the hearth.

**Briggs (Vesper line)**
- **Stranger:** ammunition, chokepoints, the barricade. Choices:
  - Ask for the ammo status;
  - Report a cleared nest (`armory_breach`).
- **Trusted:**
  - the mutiny against Chen;
  - the Ledger of the Dead;
  - drill with him → **Vesper Vanguard Adrenaline**.
- **Close:** checking an old wound, on his terms.

**Hive beings (Nahl, Vey, Rhun):** covenant tiers (offered → accepted / refused) tied to the covenant props in §8.

**Aria:** only after Queen contact.

---

## 8. When X happens → a sequence: walk to Y → interaction Z → event

Every trigger below is a hook that already exists in the code. Every prop is registered. **Leader** means whoever leads that camp; D-1 decides whether that is fixed. The **Status** column says what has to be built.

### 8.1 Trigger map

| # | When (X) | Where (Y) | Who | Interaction (Z) | Fires | Status |
|---|---|---|---|---|---|---|
| S-1 | First TALK after `act2-milestone {key: campDiscovered}` at Meridian | `meridian_logic_core_drum` (Meridian core) | Leader + player | the leader holds position and gestures while the player walks to the grid drum; lights steady; offers `lost_probe` | quest offer (`quest-offer`) | **Shipped** `fe664c2e`; leader walk cycle remains an animation gap |
| S-2 | `lost_probe` objective reached (quest object `quest_lost_probe`), then TALK | `meridian_probe_return_catchframe` | Leader + player | the player sets the probe in the catch-frame; the jaws close; the leader pulls the core | `camp-quest-progress` (lost_probe done), bond +1 | runner + place prop in a Meridian room |
| S-3 | `grid_covenant` (signature) accepted | `meridian_grid_covenant_seal` | Leader + player | the player walks to the seal; the leader gestures; the knife switch closes and arcs | quest complete, bond +2, Meridian Neural Overclock; prop state `signed` | **Shipped** `fe664c2e`; replace the current single-actor blocking with two-actor contact once leader locomotion exists |
| S-4 | `reactor_venting` started | `meridian_reactor_vent_load_selector` (`reactor_vent_station` room) | Player (the leader on radio) | choose the branch that takes the surge; the vent shroud glows | quest complete; chosen branch room dims | runner + branch effect |
| S-5 | `spore_cleansing` started at Tallow | `tallow_red_mold_quarantine_loom` | Leader + player | the leader draws the filter; the player clips the sample; seal | quest progress; loom `sealed` | runner |
| S-6 | `lost_cultist` found (`quest_cultist_shrine` landmark) | `tallow_cultist_escort_tether_reel` | Player, cultist, leader | the player reels the line in; the cultist stumbles out; the leader catches them | quest complete; a camp resident is added | runner + escort follower |
| S-7 | `warm_pipes` returned before the deadline | `martha_warm_pipe_return_nest` | Leader + player | the leader sits in the warm hollow; the player hangs the keepsake | quest complete, bond +2; prop `occupied` | runner |
| S-8 | `armory_breach` cleared | `vesper_robbed_armory_shadowboard` (stocked state) | Leader + player | the player rehangs the rifles; the leader checks each outline | quest complete | runner + prop states |
| S-9 | `bunker_holdout` wave survived | `vesper_defense_grid_fire_director` | Leader + player | the leader hands over the yoke; one tracking sweep | quest complete | runner |
| S-10 | `iron_ledger` (signature) complete | `vesper_iron_ledger_totem` | Leader + player | the leader opens the witness lock and cuts the player's tally on the blank leaf | quest complete, bond +2; prop `amended` | runner |
| S-11 | `base-module-installed` with `cot_bed` | the berth / `base_cot_installed` | Player (Mothership voice) | the player walks to the cot; the berth lamp warms; Mothership line | first-night prompt; `sleep-bunker` on rest | **Shipped** `fe664c2e`; sitting animation remains a polish gap |
| S-12 | `ship-rebuild-progress` (life-support core installed) | ship life-support socket | Player | the player seats the core; ship lights cascade on | Mothership line; rebuild 1/4 | runner (short) |
| S-13 | `black-box-recovered` | the black box | Player | the player kneels; the last moments replay as an **image cutscene** (3 stills + the death line) | the black-box codex entry | image cutscene |
| S-14 | `hive-choice-resolved` (accept) at Suture / Relay / Carapace | `nahl_covenant_suture_knot` / `vey_covenant_twin_listening_cowl` / `rhun_covenant_weight_stone` | Hive being + player | bind the knot / stand in the cowl / lift the stone together | covenant state; tree tier | runner + trees for Vey and Rhun |
| S-15 | `camp-choice-resolved` (grow / rob / recruit / turn) | the outcome prop (Meridian: `meridian_grid_restored_bus_crown` / `meridian_robbed_stripped_transformer_carcass` / `meridian_recruited_packdown_sled` / `meridian_turned_resin_choked_breaker_gallery`) | Leader (or the empty camp) + player | an aftermath walk to the changed prop | camp outcome state | runner + outcome props in rooms |
| S-16 | Act 2 boarding, manifest open | `evac_passenger_muster_abacus` | Player + boarding NPCs | slide a bead per passenger; the stop drops at four | the manifest commits | runner |

**Next three to build:** S-2, S-7 and S-10. They establish the reusable pattern the owner asked for: retrieve a real quest object, return to the correct camp, walk with the leader to a named prop, place/use the object, apply the persistent prop state, grant the result once, and return to the conversation. S-1, S-3 and S-11 are already live.

### 8.2 Sequence format

This is the target two-actor choreography. The shipped S-1 currently walks the player while the leader holds position and gestures; use this fuller form once camp leaders have locomotion clips.

```js
{
    id: 'meridian_first_meeting',
    trigger: { event: 'act2-milestone', key: 'campDiscovered', campId: 'camp_meridian', on: 'firstTalk' },
    anchors: { core: 'meridian_logic_core_drum' },
    actors: { leader: 'campLeader', player: true },
    steps: [
        { do: 'lockInput' },
        { do: 'camera', shot: 'two-shot', target: 'leader', ms: 600 },
        { do: 'walk', actor: 'leader', to: { anchor: 'core', offset: [0.9, 0, 0] } },
        { do: 'walk', actor: 'player', to: { anchor: 'core', offset: [-0.9, 0, 0] } },
        { do: 'gesture', actor: 'leader', clip: 'pointingForward' },
        { do: 'fx', anchor: 'core', effect: 'grid_steady' },
        { do: 'line', speaker: 'leader', key: 'narrative.sequences.meridian_first_meeting.0' },
        { do: 'camera', shot: 'conversation', ms: 500 },
        { do: 'resumeConversation', offer: 'lost_probe' },
        { do: 'unlockInput' }
    ],
    endState: {
        propStates: { meridian_logic_core_drum: 'active' },
        questOffer: 'lost_probe'
    },
    skip: 'applyEndStateAndResume'
}
```

### 8.3 Runner rules

- 4–12 seconds; skippable at any time (D-3). Skipping applies the end state.
- Steps use existing parts:
  - **walkers:** camp NPC walkers;
  - **gestures:** `leaderConversation3d` clips;
  - **articulation:** `propExperience` `HB_*` nodes;
  - **effects:** `propFx`;
  - **choreography precedent:** the O2 doors.
- Lines are i18n keys, so they can be voiced.
- Each sequence plays once per campaign; completion is persisted in `hb_cinematics_v1` and reset with campaign-specific state.
- If an actor model or anchor is missing, the sequence applies its end state. It may play its **own** placeholder card, never another beat's song card (§13.2). The three shipped sequences have none.
- Runner: `src/interactionSequenceRunner.js` (shipped). New sequences should be data entries plus real anchors, not bespoke modal code.

---

## 9. Image cutscenes versus video cutscenes

| Kind | Use for | Built from |
|---|---|---|
| Video | set pieces the engine can't stage: intro, deaths, endings, boss arrivals, sleep | `public/cutscenes/*.webm` with a poster still |
| Image | the same slots while video is missing; quiet beats (black-box replay S-13, morning card, codex) | 1–3 stills with slow pans, timed captions, music (`cinematicFallback`) |
| In-engine sequence | anything that changes the world the player is standing in | §8 |

---

## 10. Movie prompts: first frame, last frame, action

### 10.0 How to use these

- **One clip = one continuous shot**, 6–8 seconds, made image-to-video: the first-frame still, then the action prompt, ending on the last frame.
- **Where a key-art still already exists**, use it as the first frame (listed per clip). The first-frame prompt is there only for regenerating it.
- **Every frame prompt** begins with *"Hunker Bunker key art, 16:9 cinematic still, deep-space corporate industrial horror with restrained H.R. Giger biomechanics:"* and ends with *"Soot-black iron, bone ivory, bruised maroon tissue only at seams, amber practical light, sparse teal diagnostics; mature and suggestive, never explicit; adults only; no readable text, logos or watermarks."*
- **Characters stay consistent** with their 3D models and portraits:

  | Character | Description |
  |---|---|
  | Kaelen | adult grid engineer in an orange-and-charcoal pressure suit; a braided data cable runs from a port behind his ear; scorched gloves |
  | Martha | adult medic in patched quilted layers; spore-amber eyes; steam-reddened hands |
  | Briggs | adult commander in scarred heavy armour plates; close-cropped grey hair |
  | Nahl | tall alien healer; luminous amber eyes; delicate neural antennae; warm three-fingered hands |
  | Aria | a shimmering spectral silhouette that is never fully solid |

Slots needing clips, in priority order:

| Pri | Slot | Target file | Pre-fix borrowed motion (removed) |
|---|---|---|---|
| P1 | `kaelen_diagnostic_cradle` | `/interstitials/motion/int_kaelen_diagnostic_cradle_motion_v1.webm` | song 02 clip |
| P1 | `kaelen_frequency_overclock` | `/interstitials/motion/int_kaelen_frequency_overclock_motion_v1.webm` | song 19 clip |
| P1 | `kaelen_supercharged_matrix` | `/interstitials/motion/int_kaelen_supercharged_matrix_motion_v1.webm` | song 30 clip |
| P1 | `val_hearth_warmth`, `val_spore_communion`, `val_eternal_hearth` | `int_val_*_motion_v1.webm` | song 04 / 20 / 04 |
| P1 | `briggs_scorched_rig`, `briggs_scar_tissue`, `briggs_vanguard_fire` | `int_briggs_*_motion_v1.webm` | song 06 / 21 / 29 |
| P2 | `nahl_mind_link`, `nahl_co_evolution`, `nahl_transcendence` | `int_nahl_*_motion_v1.webm` | 08 / 08 / none |
| P2 | `aria_whispers_abyss`, `aria_silk_trance`, `aria_queens_mark` | `int_aria_*_motion_v1.webm` | 11 / 12 / 31 |
| P2 | song cards 33–38 | `int_3x_*_motion_v1.webm` | still only |
| P3 | `sleep-camp`, `sleep-cryo`, `sleep-hive`, `sleep-squad` | `public/cutscenes/sleep-*.webm` | night interstitial |

The Kaelen clips come first because Meridian is where players actually are (F-1). With D-1 unresolved, Meridian can also be Martha's or Briggs's, so their clips are P1 too.

### 10.1 Kaelen, Camp Meridian

**K-1 `kaelen_diagnostic_cradle`, "Diagnostic Cradle"** (first frame: `int_kaelen_diagnostic_cradle_key_v1.webp`)
- **Narrative context:** Trusted tier. Kaelen lets the player see how close he lives to the machine.
- **First Frame Prompt:** Hunker Bunker key art, 16:9 cinematic still, deep-space corporate industrial horror with restrained H.R. Giger biomechanics: a cramped cyan-lit diagnostic bay beneath Meridian's grid core. Kaelen reclines in a half-ring diagnostic cradle of blackened iron and bone-ivory ribs, his orange-and-charcoal pressure suit open at the collar, the braided data cable behind his ear plugged into the cradle's spine. Phosphor-cyan instrument glass lights his tired face from below; coolant lines sweat beads of condensation. Eyes closed. Soot-black iron, bone ivory, bruised maroon tissue only at seams, amber practical light, sparse teal diagnostics; mature and suggestive, never explicit; adults only; no readable text, logos or watermarks.
- **Last Frame Prompt:** Hunker Bunker key art, 16:9 cinematic still, deep-space corporate industrial horror with restrained H.R. Giger biomechanics: close shot of Kaelen sitting up in the cradle, eyes open and steady, one scorched gloved hand resting on the cradle's ivory rib while a slow wave of cyan light settles along the grid conduits behind him; the condensation on the glass has cleared. Soot-black iron, bone ivory, bruised maroon tissue only at seams, amber practical light, sparse teal diagnostics; mature and suggestive, never explicit; adults only; no readable text, logos or watermarks.
- **Image-to-Video Action Prompt:** Slow overhead jib that settles to eye level. Kaelen's eyelids flicker; the cradle's ribs tick through a calibration cycle with small mechanical clicks; a wave of cyan light runs along the cable from the cradle into the port behind his ear and out across the wall conduits. He exhales, sits up, and rests his hand on the ivory rib as the grid hum steadies. Single continuous shot, 7 seconds.

**K-2 `kaelen_frequency_overclock`, "Frequency Overclock"**
- **Narrative context:** Kaelen pushes the grid past its rating to keep the camp lit. Trusted tier; the reactor-venting story.
- **First Frame Prompt:** Hunker Bunker key art, 16:9 cinematic still, deep-space corporate industrial horror with restrained H.R. Giger biomechanics: Meridian's breaker gallery, a wall of heavy knife switches on glazed ceramic insulators, copper bus bars dulled green at the joints. Kaelen stands half-turned to camera, an insulated tuning probe in both hands, its tip an inch from the main contact. The room is dim amber; cyan pilot lamps blink along the bars. Soot-black iron, bone ivory, bruised maroon tissue only at seams, amber practical light, sparse teal diagnostics; mature and suggestive, never explicit; adults only; no readable text, logos or watermarks.
- **Last Frame Prompt:** Hunker Bunker key art, 16:9 cinematic still, deep-space corporate industrial horror with restrained H.R. Giger biomechanics: the same gallery blazing with steady cyan light, every pilot lamp lit; Kaelen stands back from the contact with the probe lowered, breathing hard, faint corona still crawling on his scorched gloves, a thin smile of relief. Soot-black iron, bone ivory, bruised maroon tissue only at seams, amber practical light, sparse teal diagnostics; mature and suggestive, never explicit; adults only; no readable text, logos or watermarks.
- **Image-to-Video Action Prompt:** Steady dolly-in. Kaelen seats the probe; a bright cyan arc jumps the bus bars and runs the length of the gallery, switch by switch, each pilot lamp snapping on in sequence. Corona discharge crawls over his gloves; he leans into it for a second, then pulls back and lowers the probe as the hum settles to a deep, even tone. Single shot, 7 seconds.

**K-3 `kaelen_supercharged_matrix`, "Supercharged Matrix"**
- **Narrative context:** The covenant payoff. Kaelen and the player bring the whole grid up together; it pairs with in-engine sequence S-3.
- **First Frame Prompt:** Hunker Bunker key art, 16:9 cinematic still, deep-space corporate industrial horror with restrained H.R. Giger biomechanics: a glass-and-iron catwalk across Meridian's reactor well, turquoise coolant glowing far below, brass and porcelain conduits climbing the curved walls like ribs. Kaelen and an armoured operator stand at a central actuator lever, his gloved hand resting over the operator's gauntlet on the grip. Soot-black iron, bone ivory, bruised maroon tissue only at seams, amber practical light, sparse teal diagnostics; mature and suggestive, never explicit; adults only; no readable text, logos or watermarks.
- **Last Frame Prompt:** Hunker Bunker key art, 16:9 cinematic still, deep-space corporate industrial horror with restrained H.R. Giger biomechanics: the reactor well fully lit, concentric rings of gold-teal light pulsing out along the conduits into distant tunnels; Kaelen turns toward the operator with a rare open smile, the lever locked down between them. Soot-black iron, bone ivory, bruised maroon tissue only at seams, amber practical light, sparse teal diagnostics; mature and suggestive, never explicit; adults only; no readable text, logos or watermarks.
- **Image-to-Video Action Prompt:** Slow push-in from behind the two figures. Together they draw the lever down; the actuator locks with a heavy clunk; rings of gold-teal light pulse outward through the glass floor and race up the conduits into the tunnels. Camera arcs to a side two-shot as Kaelen turns his head toward the operator and smiles. Single shot, 8 seconds.

### 10.2 Martha, Camp Tallow

**M-1 `val_hearth_warmth`, "Warmth of the Suture"** (first frame: `int_val_hearth_warmth_key_v1.webp`)
- **Narrative context:** Trusted tier. Martha treats the player's frostbite at the hearth; care, not seduction.
- **First Frame Prompt:** Hunker Bunker key art, 16:9 cinematic still, deep-space corporate industrial horror with restrained H.R. Giger biomechanics: Camp Tallow's boiler chapel, a vaulted chamber of black iron pipes sweating steam. Martha sits on a worn leather pipe saddle in patched quilted layers, a bronze kettle steaming on a glowing pipe joint beside her, a small dish of golden tallow balm in her lap; pale moss glows on the stones. Soot-black iron, bone ivory, bruised maroon tissue only at seams, amber practical light, sparse teal diagnostics; mature and suggestive, never explicit; adults only; no readable text, logos or watermarks.
- **Last Frame Prompt:** Hunker Bunker key art, 16:9 cinematic still, deep-space corporate industrial horror with restrained H.R. Giger biomechanics: close shot of Martha's steam-reddened hands working balm into the frost-burned knuckles of an armoured operator's bare hand, amber pipe glow behind them, the frost on the operator's cuff melted to droplets. Soot-black iron, bone ivory, bruised maroon tissue only at seams, amber practical light, sparse teal diagnostics; mature and suggestive, never explicit; adults only; no readable text, logos or watermarks.
- **Image-to-Video Action Prompt:** Slow dolly-in to the saddle. Martha lifts a ladle of warm balm, breathes on it, and reaches out of frame; the camera follows her hands down to the operator's frost-white knuckles, which slowly flush as she works the balm in; frost on the cuff melts to beads. Steam curls through the amber light. Single shot, 7 seconds.

**M-2 `val_spore_communion`, "Botanical Spore Oil"**
- **Narrative context:** Martha shows the living spore loom she cultivates (`spore_cleansing`).
- **First Frame Prompt:** Hunker Bunker key art, 16:9 cinematic still, deep-space corporate industrial horror with restrained H.R. Giger biomechanics: a humid alcove behind Tallow's clinic; a tall loom of bone struts strung with amber resin threads and pale mycelium, crimson mould creeping in at one edge; Martha stands before it, one bare palm hovering near a glowing spore sac; drifting motes of teal light. Soot-black iron, bone ivory, bruised maroon tissue only at seams, amber practical light, sparse teal diagnostics; mature and suggestive, never explicit; adults only; no readable text, logos or watermarks.
- **Last Frame Prompt:** Hunker Bunker key art, 16:9 cinematic still, deep-space corporate industrial horror with restrained H.R. Giger biomechanics: the loom glowing evenly green-gold, the crimson mould sealed behind a drawn filter curtain; Martha framed in an arch of glowing threads, hand at her chest, calm. Soot-black iron, bone ivory, bruised maroon tissue only at seams, amber practical light, sparse teal diagnostics; mature and suggestive, never explicit; adults only; no readable text, logos or watermarks.
- **Image-to-Video Action Prompt:** Slow arc around the loom. Martha lays her palm on the spore sac; light pulses out along the mycelium in gold-green waves; with her other hand she draws the woven filter across the mouldy edge and it seals against the floor ribs. She turns toward camera and breathes out. Single shot, 7 seconds.

**M-3 `val_eternal_hearth`, "The Eternal Hearth"**
- **Narrative context:** The `warm_pipes` payoff, paired with sequence S-7.
- **First Frame Prompt:** Hunker Bunker key art, 16:9 cinematic still, deep-space corporate industrial horror with restrained H.R. Giger biomechanics: a low angle up Tallow's great heat exchanger, curved black-iron pipes arching like a vault; Martha on an iron catwalk, both hands on a huge valve wheel, steam leaking from patched joints; the chamber cold blue at the edges. Soot-black iron, bone ivory, bruised maroon tissue only at seams, amber practical light, sparse teal diagnostics; mature and suggestive, never explicit; adults only; no readable text, logos or watermarks.
- **Last Frame Prompt:** Hunker Bunker key art, 16:9 cinematic still, deep-space corporate industrial horror with restrained H.R. Giger biomechanics: the whole vault glowing warm amber, white steam rolling up from every vent; Martha stands with the valve locked, silhouetted against the furnace light, quilted layers lifting in the warm draft. Soot-black iron, bone ivory, bruised maroon tissue only at seams, amber practical light, sparse teal diagnostics; mature and suggestive, never explicit; adults only; no readable text, logos or watermarks.
- **Image-to-Video Action Prompt:** Slow tilt down and push along the catwalk. Martha hauls the valve wheel a half-turn; a deep thud runs through the pipes; vents open one after another up the vault, steam rolling out; cold blue light at the edges gives way to amber as the heat comes up. Single shot, 8 seconds.

### 10.3 Briggs, Camp Vesper

**B-1 `briggs_scorched_rig`, "The Scorched Rig"**
- **Narrative context:** Briggs after a holdout (`bunker_holdout`).
- **First Frame Prompt:** Hunker Bunker key art, 16:9 cinematic still, deep-space corporate industrial horror with restrained H.R. Giger biomechanics: Vesper's canyon barricade at dawn, scorched black, spent casings everywhere; Briggs leans against the burned chassis of a siege gun, armour plates gouged by claws, helmet still sealed; one red hazard lamp turning. Soot-black iron, bone ivory, bruised maroon tissue only at seams, amber practical light, sparse teal diagnostics; mature and suggestive, never explicit; adults only; no readable text, logos or watermarks.
- **Last Frame Prompt:** Hunker Bunker key art, 16:9 cinematic still, deep-space corporate industrial horror with restrained H.R. Giger biomechanics: close shot of Briggs bare-headed, soot on his face, breath fogging, grey hair cropped close, looking out over the barricade with tired resolve, the red lamp sweeping across him. Soot-black iron, bone ivory, bruised maroon tissue only at seams, amber practical light, sparse teal diagnostics; mature and suggestive, never explicit; adults only; no readable text, logos or watermarks.
- **Image-to-Video Action Prompt:** Steady push past sandbags. Briggs unlatches his helmet collar with a pneumatic hiss, lifts the helmet off, wipes his brow with the back of a heavy glove and exhales a long cloud; he surveys the canyon as the red lamp sweeps over him. Single shot, 7 seconds.

**B-2 `briggs_scar_tissue`, "Scar Tissue"**
- **Narrative context:** Trusted tier. Briggs cleans his rifle and says nothing about the scar.
- **First Frame Prompt:** Hunker Bunker key art, 16:9 cinematic still, deep-space corporate industrial horror with restrained H.R. Giger biomechanics: Vesper's low armoury under one bare bulb; Briggs sits on an ammo crate with his chest plate set aside, a thermal undershirt cut at the shoulder showing an old surgical scar and steel staples, an oilcloth across his knees with a rifle stripped into ordered parts. Soot-black iron, bone ivory, bruised maroon tissue only at seams, amber practical light, sparse teal diagnostics; mature and suggestive, never explicit; adults only; no readable text, logos or watermarks.
- **Last Frame Prompt:** Hunker Bunker key art, 16:9 cinematic still, deep-space corporate industrial horror with restrained H.R. Giger biomechanics: Briggs holds the reassembled rifle across his knees and offers it, stock first, toward camera; his eyes meet the viewer; the bulb swings slightly. Soot-black iron, bone ivory, bruised maroon tissue only at seams, amber practical light, sparse teal diagnostics; mature and suggestive, never explicit; adults only; no readable text, logos or watermarks.
- **Image-to-Video Action Prompt:** Slow orbit around the crate. Briggs fits the last pins with practised speed, works the bolt once, glances at the scar on his shoulder and presses a thumb to it, then turns the rifle around and holds it out stock first. Single shot, 7 seconds.

**B-3 `briggs_vanguard_fire`, "Vanguard Unyielding"**
- **Narrative context:** The `iron_ledger` arc's peak.
- **First Frame Prompt:** Hunker Bunker key art, 16:9 cinematic still, deep-space corporate industrial horror with restrained H.R. Giger biomechanics: a parapet over a dark canyon; Briggs stands at a manual fire-director yoke with three braided cables running off to unseen guns; tracer light far below; cables whip in the wind. Soot-black iron, bone ivory, bruised maroon tissue only at seams, amber practical light, sparse teal diagnostics; mature and suggestive, never explicit; adults only; no readable text, logos or watermarks.
- **Last Frame Prompt:** Hunker Bunker key art, 16:9 cinematic still, deep-space corporate industrial horror with restrained H.R. Giger biomechanics: the canyon lit white by muzzle flare dissipating into smoke; Briggs braced at the yoke, turning his head toward camera with a grim nod; red beacons pulse along the rampart. Soot-black iron, bone ivory, bruised maroon tissue only at seams, amber practical light, sparse teal diagnostics; mature and suggestive, never explicit; adults only; no readable text, logos or watermarks.
- **Image-to-Video Action Prompt:** Crane down to a tight two-shot. Briggs swings the yoke; the three cables snap taut; out of frame the guns fire and the canyon flashes white; the deck shudders; Briggs holds through the shockwave and nods to the viewer. Single shot, 6 seconds.

### 10.4 Nahl, the Suture hive

**N-1 `nahl_mind_link`, "Synaptic Inoculation"**
- **Narrative context:** Nahl offers to quiet the Queen's frequency in the player's suit (the `dr_nahl` greeting).
- **First Frame Prompt:** Hunker Bunker key art, 16:9 cinematic still, deep-space corporate industrial horror with restrained H.R. Giger biomechanics: a moss-grown chamber of humming bio-relays inside the Suture hive; Nahl, a tall slender alien with luminous amber eyes and fine neural antennae, reaches a warm three-fingered hand toward an armoured operator's helmet; pale resin threads hang between the relays. Soot-black iron, bone ivory, bruised maroon tissue only at seams, amber practical light, sparse teal diagnostics; mature and suggestive, never explicit; adults only; no readable text, logos or watermarks.
- **Last Frame Prompt:** Hunker Bunker key art, 16:9 cinematic still, deep-space corporate industrial horror with restrained H.R. Giger biomechanics: close shot of Nahl's three fingers resting on the operator's visor; the visor's red interference glitches have smoothed into a calm amber line; Nahl's antennae glow softly. Soot-black iron, bone ivory, bruised maroon tissue only at seams, amber practical light, sparse teal diagnostics; mature and suggestive, never explicit; adults only; no readable text, logos or watermarks.
- **Image-to-Video Action Prompt:** Slow push-in. Nahl's hand touches the visor; red static rippling across the visor glass slows and resolves into a steady amber line; Nahl's antennae brighten in rhythm; the relays around them quiet to a low hum. Single shot, 7 seconds.

**N-2 `nahl_co_evolution`, "Cellular Empathy"**
- **Narrative context:** The covenant knot (sequence S-14), seen as a clip.
- **First Frame Prompt:** Hunker Bunker key art, 16:9 cinematic still, deep-space corporate industrial horror with restrained H.R. Giger biomechanics: a waist-high stand with two pale bone hoops, one sized for a human hand and one for three fingers, joined by a loose stitched seam; Nahl and the operator stand on either side, hands at the hoops. Soot-black iron, bone ivory, bruised maroon tissue only at seams, amber practical light, sparse teal diagnostics; mature and suggestive, never explicit; adults only; no readable text, logos or watermarks.
- **Last Frame Prompt:** Hunker Bunker key art, 16:9 cinematic still, deep-space corporate industrial horror with restrained H.R. Giger biomechanics: the seam pulled tight into a glowing resin clasp between the two hoops, amber light pulsing through it; Nahl's head bowed; the operator's hand still on the human hoop. Soot-black iron, bone ivory, bruised maroon tissue only at seams, amber practical light, sparse teal diagnostics; mature and suggestive, never explicit; adults only; no readable text, logos or watermarks.
- **Image-to-Video Action Prompt:** Slow tracking shot across the stand. Both draw their hoop back at once; the seam tightens; the clasp closes with a soft wet click and glows amber; light pulses out along the threads into the chamber walls. Single shot, 6 seconds.

**N-3 `nahl_transcendence`, "Neural Sovereignty"** (first frame: `int_nahl_transcendence_key_v1.webp`; the only side card with no motion clip at all)
- **Narrative context:** Nahl frees the player from Queen disorientation, the end of the Nahl arc.
- **First Frame Prompt:** Hunker Bunker key art, 16:9 cinematic still, deep-space corporate industrial horror with restrained H.R. Giger biomechanics: the Suture hive's heart, a dome of ribbed pale tissue veined with faint violet Queen signal; Nahl stands at the centre facing the operator, both still, violet light pressing in from the walls. Soot-black iron, bone ivory, bruised maroon tissue only at seams, amber practical light, sparse teal diagnostics; mature and suggestive, never explicit; adults only; no readable text, logos or watermarks.
- **Last Frame Prompt:** Hunker Bunker key art, 16:9 cinematic still, deep-space corporate industrial horror with restrained H.R. Giger biomechanics: the dome cleared of violet, glowing warm amber from Nahl's antennae outward; the operator stands upright and steady; Nahl's hand lowered. Soot-black iron, bone ivory, bruised maroon tissue only at seams, amber practical light, sparse teal diagnostics; mature and suggestive, never explicit; adults only; no readable text, logos or watermarks.
- **Image-to-Video Action Prompt:** Slow 180-degree orbit. Nahl raises both hands; amber light spreads from its antennae across the dome, pushing the violet veins back into the walls until they fade; the operator straightens as the light reaches them. Single shot, 8 seconds.

### 10.5 Aria (Queen context only)

**A-1 `aria_whispers_abyss`, "Whispers in the Abyss"**
- **Narrative context:** The Queen's mimic first speaks inside the helmet.
- **First Frame Prompt:** Hunker Bunker key art, 16:9 cinematic still, deep-space corporate industrial horror with restrained H.R. Giger biomechanics: an operator alone in a dark hive cavern, the helmet lamp the only light; behind them, barely visible in drifting spores, a tall shimmering silhouette that is not fully solid. Soot-black iron, bone ivory, bruised maroon tissue only at seams, amber practical light, sparse teal diagnostics; mature and suggestive, never explicit; adults only; no readable text, logos or watermarks.
- **Last Frame Prompt:** Hunker Bunker key art, 16:9 cinematic still, deep-space corporate industrial horror with restrained H.R. Giger biomechanics: extreme close shot of the visor; reflected in the glass, the silhouette leans close beside the operator's head; teal pinpoints flicker on the visor rim. Soot-black iron, bone ivory, bruised maroon tissue only at seams, amber practical light, sparse teal diagnostics; mature and suggestive, never explicit; adults only; no readable text, logos or watermarks.
- **Image-to-Video Action Prompt:** Slow push toward the operator's back as spores drift; the silhouette glides closer without walking; the camera rounds to the visor where its reflection settles beside the operator's ear; the helmet lamp flickers once. Single shot, 7 seconds.

**A-2 `aria_silk_trance`, "The Silk Trance"**
- **Narrative context:** The pull to obey; the player can resist.
- **First Frame Prompt:** Hunker Bunker key art, 16:9 cinematic still, deep-space corporate industrial horror with restrained H.R. Giger biomechanics: a cavern hung with fine resin silk; the operator stands entangled to the shoulders in pale threads, still upright; the shimmering silhouette faces them, one hand raised. Soot-black iron, bone ivory, bruised maroon tissue only at seams, amber practical light, sparse teal diagnostics; mature and suggestive, never explicit; adults only; no readable text, logos or watermarks.
- **Last Frame Prompt:** Hunker Bunker key art, 16:9 cinematic still, deep-space corporate industrial horror with restrained H.R. Giger biomechanics: the silk parted around the operator, who has stepped back with a hand up; the silhouette recedes into the threads, its light dimming. Soot-black iron, bone ivory, bruised maroon tissue only at seams, amber practical light, sparse teal diagnostics; mature and suggestive, never explicit; adults only; no readable text, logos or watermarks.
- **Image-to-Video Action Prompt:** Slow dolly-in. The threads tighten and draw the operator a half-step forward; the operator stops, braces, and tears free; threads snap and drift; the silhouette pulls back into the silk and dims. Single shot, 7 seconds.

**A-3 `aria_queens_mark`, "The Queen's Mark"**
- **Narrative context:** If the player surrenders, the Queen marks them.
- **First Frame Prompt:** Hunker Bunker key art, 16:9 cinematic still, deep-space corporate industrial horror with restrained H.R. Giger biomechanics: the operator kneeling in a ring of glowing egg-shell fragments, gauntlet held palm-up; the silhouette stands over them, its hand above the gauntlet. Soot-black iron, bone ivory, bruised maroon tissue only at seams, amber practical light, sparse teal diagnostics; mature and suggestive, never explicit; adults only; no readable text, logos or watermarks.
- **Last Frame Prompt:** Hunker Bunker key art, 16:9 cinematic still, deep-space corporate industrial horror with restrained H.R. Giger biomechanics: close shot of the gauntlet palm, a faint teal glyph-free spiral glowing beneath the plating seams; the egg-shell ring dark. Soot-black iron, bone ivory, bruised maroon tissue only at seams, amber practical light, sparse teal diagnostics; mature and suggestive, never explicit; adults only; no readable text, logos or watermarks.
- **Image-to-Video Action Prompt:** Top-down slow descent. The silhouette's hand lowers; teal light seeps into the gauntlet's seams and curls into a spiral; the egg-shell ring fades to dark around them. Single shot, 6 seconds.

### 10.6 Act 3 and ending cards (33–38)

Use each card's existing key art (`int_3x_*_key_v1.webp`) as the first frame; only the last frame and action are new.

| Card | Last Frame Prompt (with the shared prefix and suffix) | Image-to-Video Action Prompt |
|---|---|---|
| 33 The Cave Was Breathing | the cave mouth wall seen from inside, its ribbed stone walls swelled outward mid-breath, warm air fogging the operator's helmet lamp | slow push into the cave; walls expand and contract twice like lungs; dust lifts off the floor on each exhale; 7 s |
| 34 Four Seats, One Survivor | the escape cockpit's four seats, three empty with straps hanging, one occupied by the operator looking back at the hatch | slow pan across the empty seats, landing on the operator who turns to look back; 6 s |
| 35 Contraband Sunrise | the escape vessel breaking through cloud into a cold dawn, a frosted cargo cell glowing faintly in the hold | climb through cloud into sunrise; the camera tilts into the hold where the cargo cell pulses; 7 s |
| 36 We Escaped Together, Technically | a crowded cabin of humans and aliens strapped in side by side, an awkward shared silence, one alien hand resting on a human armrest | slow track down the aisle; heads turn as the vessel shudders; the alien hand settles on the armrest; 7 s |
| 37 The Ice Gets Smaller | the glacier and the bunker's crash scar shrinking far below through a frosted window | pull back from the window as the ice field falls away beneath; 6 s |
| 38 Destination: Core Worlds | a bright corporate orbital ring ahead, docking lights blinking, the battered vessel small against it | the vessel glides toward the ring; docking lights sweep across its scarred hull; 8 s |

### 10.7 Sleep cutscenes (`public/cutscenes/sleep-*.webm`)

**SL-1 `sleep-camp`**
- **First Frame Prompt:** a survivor bunkhouse at night, workers asleep in quilted rolls beside warm radiator pipes, a lantern burning low, the operator sitting against a locker in armour.
- **Last Frame Prompt:** the bunkhouse dark, the lantern out, a blanket over the sleeping operator's shoulders, frost on the shutter.
- **Image-to-Video Action Prompt:** a slow glide past the lantern; a resident lays a blanket over the operator; the lantern dims to nothing; 7 s.

**SL-2 `sleep-cryo`**
- **First Frame Prompt:** an open cryo pod rimed with frost, nitrogen vapour spilling over the edge, the operator lying back on the gel cushion.
- **Last Frame Prompt:** the sealed pod alone in a frosted vault, one green heartbeat light blinking.
- **Image-to-Video Action Prompt:** the canopy swings down and seals with a hiss; frost spreads across the glass; the heartbeat light slows; 7 s.

**SL-3 `sleep-hive`**
- **First Frame Prompt:** the operator curled in a warm hive alcove of pale ribbed tissue, faint amber pulse in the walls, helmet beside them.
- **Last Frame Prompt:** the alcove closed softly around the sleeping operator like cupped hands, the amber pulse slow and even.
- **Image-to-Video Action Prompt:** the alcove's ribs fold gently inward; the pulse slows to match breathing; the light dims; 7 s.

**SL-4 `sleep-squad`**
- **First Frame Prompt:** two or three operators asleep back to back in a sealed berth, one still awake on watch with a rifle across their knees.
- **Last Frame Prompt:** the watch-stander's head finally lowered, all asleep, the berth's O2 regulator glowing steady.
- **Image-to-Video Action Prompt:** a slow pan across the sleepers; the watch-stander checks the regulator, sets the rifle down and leans back; 7 s.

---

## 11. Placeholders and asset status

### 11.1 Status matrix (verified 2026-10-18)

| Slot | Today | Target |
|---|---|---|
| Martha, Briggs and Kaelen side cards (9) | each scene's own still + Ken Burns pan + its OST music; borrowed motion removed | own clip (§10.1–10.3) |
| Nahl side cards (3) | each scene's own still + Ken Burns pan + its OST music | own clips (§10.4) |
| Aria side cards (3) | each scene's own still + Ken Burns pan + its OST music; Aria entry is Queen-gated | own clips (§10.5) |
| Song cards 33–38 | still + music | motion (§10.6) |
| Sleep camp / cryo / hive / squad | night interstitial | video (§10.7) |
| Vey, Rhun | no cards, no trees | in-engine covenants (S-14); stills later |

### 11.2 Placeholder ladder

Every slot resolves down this ladder, and the manifest records which rung it is on (`status: 'final' | 'still' | 'placeholder'`):

1. **Final motion clip.**
2. **The slot's own key-art still** with a slow pan and its music.
3. **In-engine stand-in:** the 3D bust or prop, a camera move, the voiced line.
4. **Title slate:** kicker, title, one line.

> **Rule:** never use another character's or another scene's clip as a placeholder. This is now enforced: all 15 side-story cards use rung 2 until their own clips exist.

---

## 12. Work plan

| Order | State | Work | Files | Acceptance |
|---|---|---|---|---|
| 1 | **Decision** | Resolve D-1: fixed leader per camp, rotating camp order | `src/act2.js`, `src/data/campQuests.js` | a quest, prop, card and speaker never disagree about who owns the camp |
| 2 | **Next** | Stranger tier for Kaelen, Martha and Briggs; move power perks to Trusted | `src/npcDialogueTrees.js` | every first meeting is non-intimate; every human perk has a non-intimate path |
| 3 | **Next** | One grammar; delete `#npc-dialogue-modal`; residents and wanderers in the shared window; "DOOR" kicker | `main.js`, `index.html`, `src/data/campDialogue.js` | one person-facing layout; controller path unchanged |
| 4 | **Next** | Add dialogue and first-expedition continuity telemetry (§14.3) | `main.js`, `src/threeGame.js`, `src/sectorZeroTutorial.js`, `src/fieldWorkbenchUi.js` | one capture reconstructs open → line → choice → close and Sector 0 → camp → recalibration |
| 5 | **Next** | Build S-2 lost-probe return, S-7 warm-pipes return and S-10 iron-ledger signing | `src/interactionSequenceRunner.js`, camp dressing/anchors | item acquisition is preserved; skip applies identical quest, reward and prop state; conversation resumes once |
| 6 | **Next** | Build S-17 Field Recalibration install beat (§14.2) | `src/interactionSequenceRunner.js`, `src/fieldWorkbenchUi.js`, camp workbench dressing | selected card closes into a 4–6 s install at the real bench; co-op peers receive state without forced camera |
| 7 | **Next** | Move choice trees into i18n and voice-render NPC lines | `src/npcDialogueTrees.js`, `scripts/voice/` | i18n audit passes; narration and player choices remain silent |
| 8 | **Asset** | Commission §10 motion clips, P1 first | `public/interstitials/motion/`, `public/cutscenes/` | each delivered slot changes from `still` to `final`; no borrowed media |
| 9 | **Later** | Vey and Rhun covenant trees and S-14 variants | `src/npcDialogueTrees.js`, `src/interactionSequenceRunner.js` | offered, accepted and refused states exist for each hive being |
| 10 | **Proof** | Fresh-profile packaged run on desktop and Deck, then paired co-op camp/workbench route | hosted session logs + capture video | gates in §14.4 pass; no claim relies on pre-fix logs |

Already complete and no longer backlog: dialogue gating/memory/rewards; leader-based tree selection; door bookends; all 32 song-card triggers; side-story node triggers and own-still fallbacks; Aria Queen gating; persisted runner completions; S-1, S-3 and S-11.

---

## 13. Doors → video → doors → conversation (owner ask, 2026-10-16 evening)

> "I still want files like these [`public/interstitials/int_11_her_voice_inside_your_helmet_key_v1.mp4`] to be mapped and triggered, and it should do a set of doors, closing gameplay, open to video, then doors again, go to chat after, and that chat is dialogue windows over the gameplay."

This section also folds in a second agent's work on this branch, committed as `2699c189` (side-story manifest edit, four `_v2` stills, `src/interactionSequenceRunner.js` and its `threeGame.js` glue). §13.4 reviews it.

### 13.1 The beat, step by step

| Step | Screen | Today | Change |
|---|---|---|---|
| 1 | Doors slide shut over live gameplay (540 ms) | yes (`is-closing`) | none |
| 2 | Doors open on the video, which plays with its own audio | yes (`is-open`, webm has Opus audio) | none |
| 3 | Video ends or is skipped (Space / Enter / Esc / click) | the overlay fades out (`is-settled`, 260 ms), no doors | **doors shut again** over the last frame (`is-closing-out`, 540 ms) |
| 4 | Behind the closed doors, the conversation window mounts and the overlay's black backdrop is dropped | the window opens separately, if at all | `show(spec, { then: 'conversation', onBehindDoors })`: the caller opens the window during this step |
| 5 | Doors open on gameplay with the dialogue window on top | — | doors slide out; the root hides once they clear |

If the row's `then` is `'gameplay'` (bosses, endings, Mothership beats), step 4 does nothing and step 5 opens straight on play.

**"Dialogue window over the gameplay" — today, almost.** `#leader-conversation-modal` sits over the running scene, but its backdrop is `rgba(2, 6, 10, 0.88)` (`style.css:8585`), so the game reads as black. To read as "over the gameplay", drop it to about 0.35 with a darker band behind the panel only. Doors render at z 16190, the window at 10020, so the doors cover the window while it mounts.

Skip rules (ties to D-3): the skip press jumps to step 3. It never cuts to the window without doors. Hold-to-skip stays an owner decision.

### 13.2 Every video gets a trigger

**Before this work only 9 of the 32 videos ever played** (corrected 2026-10-16 evening): 01, 02, 04, 06 and 22/23 through `camp-first-contact`; 04 (O2 upgrade) and 13/26/27 (snail bosses) through the cutscene path in `main.js:8800`. `selectCampInterstitial` returns 11 for a hive, but `camp-first-contact` is only ever dispatched for camps, so **`int_11` played nowhere**. Nothing opened Aria's tree either. Now: see the **Live** column below and §13.6.

Implemented as one table in `src/cinematicBeats.js`, `{ beat, when, card, then, once }`, listened to in `main.js`. All events below already fire in the code. Rows marked *live* kept their original trigger.

| Card | Title | When | Then |
|---|---|---|---|
| 01 | Someone Is Still Alive | *live:* first contact, unknown camp | conversation |
| 02 | Kaelen's Sleeping Machine | *live:* first contact, Meridian | conversation (Kaelen) |
| 03 | The Math Is Beautiful Now | `camp-bonded`, Meridian, bond 3 | conversation |
| 04 | Warmth Beneath the Ice | *live:* first contact, Tallow; O2 upgrade | conversation (Martha) / gameplay |
| 05 | The Pipes Are Singing | first `ship-module-activated` | gameplay |
| 06 | Briggs Keeps the Ledger | *live:* first contact, Vesper | conversation (Briggs) |
| 07 | Your Name Was Written Twice | `camp-bonded`, Vesper, bond 3 | conversation |
| 08 | Dr. Nahl Remembers the Tissue | first contact, **Suture** hive (split from 11) | conversation (Nahl) |
| 09 | Mothership Customer Support | first `player-respawned` | gameplay |
| 10 | Mothership Is Not Feeling Well | `act2-console-dead` | gameplay |
| **11** | **Her Voice Inside Your Helmet** | first `queen-hallucination` (Aria, Queen context per §10.5) | **conversation (Aria tree)** |
| 12 | The Queen Makes a Reasonable Offer | `queen-fight-started` | gameplay |
| 13 | A Snail Blocks the Hallway | *live:* cybersnail boss | gameplay |
| 14 | Cold Enough to Think | first `depth-tier-changed` to tier 2 | gameplay |
| 15 | The Spores Know Your Name | first `infection-stage-changed` | gameplay |
| 16 | We Could Avoid Doing This | `hive-choice-resolved`, non-violent choice | conversation (hive being) |
| 17 | It Understands the Gun | `act2-apex-threat-spawned` | gameplay |
| 18 | The Creature Lets You Pass | first `snail-befriended` | gameplay |
| 19 | Meridian Remembers You | `camp-quest-complete`, Meridian | conversation |
| 20 | Tallow Keeps the Steam | `camp-quest-complete`, Tallow | conversation |
| 21 | Vesper Sleeps in Shifts | `camp-quest-complete`, Vesper | conversation |
| 22 | You Robbed the Only People Left | *live:* camp robbed | gameplay |
| 23 | They Still Have Their Faces | *live:* camp turned | gameplay |
| 24 | Nobody Says Goodbye | `act2-departed` | gameplay |
| 25 | Gigawatt Goliath | `hive-harvest-boss-spawned` | gameplay |
| 26 | Absolute Zero Has a Shell | *live:* cryosnail boss | gameplay |
| 27 | The Bloom That Hunts | *live:* sporesnail boss | gameplay |
| 28 | Martha Runs Faster Now | `camp-final-resolved`, Tallow | conversation |
| 29 | Briggs Became the Barricade | `camp-final-resolved`, Vesper | conversation |
| 30 | Kaelen Is the Grid | `camp-final-resolved`, Meridian | conversation |
| 31 | Mother of the Last World | Queen fight won | gameplay |
| 32 | Black Box Stain | first `black-box-recovered` (before S-13's image cutscene) | gameplay |
| 33–38 | Act 3 and endings | unchanged (still + Ken Burns until §10.6 clips land) | gameplay |

The "when" choices for 05, 09, 14, 15, 17, 25 are my best fit by title. The owner should confirm or swap them.

Table rules:
- **Once per save.** The seen set is saved with the run (not in memory).
- **One card at a time.** If a second beat fires within 20 s, it waits. If it is lower priority, it is dropped. Priority order: story, then camp, then flavour.
- **Never mid-fight.** Combat beats (bosses) play at spawn, as today. All other beats wait for `combat-state-changed` to calm.
- **Co-op:** doors never close on a player while others fight. A guest gets a toast with the card title, and the clip goes to the codex/museum.
- A card plays **as itself**. A song clip is never re-used as another scene's side-story card (§11.2 still holds). So int_11 is mapped as track 11 at its own beat (Aria's voice), not borrowed for `aria_whispers_abyss`.

### 13.3 Historical gap: side-story cards did not play

At audit time, the side-story cards did not show borrowed clips in gameplay; they showed nothing at all:
- 18 tree nodes name an `interstitial:` (`npcDialogueTrees.js:92–853`), but only `matureContentAudit.js` reads the field.
- `window.playSideStoryInterstitial` (`main.js:14574`) has no caller.

Shipped fix: when a chosen node has `interstitial`, run §13.1 with `then: 'conversation'`. The doors close on the chat, the still pans, and the doors reopen on the next line of the same tree. See §13.6 step 2.

### 13.4 What the other agent's work changes in this plan

| Their change (`2699c189`) | Verdict | Follow-up |
|---|---|---|
| Removed borrowed `motion*` from all 15 `SIDE_STORY_INTERSTITIALS` | **Keep.** It is §12 step 7, the rule in §11.2. | Add the `status: 'still'` field from §11.2. |
| Claim: "the controller prioritizes `motionMp4`" | Wrong. `loadMotion` reads `motion`, then `motionWebm`. `motionMp4` is unused by all 38 entries. Harmless, because the webm has Opus audio. | Drop `motionMp4` or make it the Safari fallback. |
| 4 `_v2` 16:9 stills (Briggs rig, Kaelen cradle, Nahl mind-link, Martha hearth) | Unreferenced: the manifest still points at `_v1`. | Owner looks at them, then swap the 4 `image` paths. |
| `src/interactionSequenceRunner.js` + test (5 tests pass, run 16:44) | Format matches §8.2. `skip` applies the end state. | Persist `completedSequences` (it lives in memory today, so it replays every load). Bind skip to input. |
| `threeGame.js` glue for S-1, S-3, S-11 | Stubs that look done but do nothing visible. See the list below. | Step 14. |

Glue gaps found by reading the diff:
- `displaySequenceSubtitle`, `resumeConversationAfterSequence` and `grantSequenceReward` dispatch `narrative-sequence-subtitle`, `leader-dialogue-resume` and `perk-unlocked`. **Nothing listens** for any of the three. No line shows, the conversation doesn't resume, and there is no toast.
- `this.bank.addPerk?.()`: `addPerk` doesn't exist, so the Grid Covenant perk is silently never granted.
- `walkActorToAnchor` teleports the player to fixed offsets from Meridian, whatever the anchor. The leader never moves. `transitionCamera` and `spawnPropFx` hardcode Meridian or the player's position. `setWorldPropState` ignores the state.
- `findPropAnchor` checks `worldDressingNetwork` and `props`, not the dressing instancer. If `meridian_logic_core_drum` isn't found there, S-1 falls back to card 19 **right after** first contact has already played card 02: two cards back to back on the first meeting. Under §13.2, 19 belongs to the quest's completion. S-1's fallback should be "skip to the conversation", not a card.
- S-1 fires on the TALK handler while the conversation window opens, so the two race. The sequence should run first, and its `resumeConversation` step should open the window (§13.1 step 4).

### 13.5 Order of work

1. §13.1 door bookends + the backdrop change, and route `camp-first-contact` through them (02/04/06 already exist, so the owner sees the beat in the first camp visit). **Done** (see §13.6).
2. §13.3 node interstitials, using the same call. **Done** (see §13.6).
3. §13.4 glue fixes, so the runner's lines and resumes are real. **Done** (see §13.6, 2026-10-17).
4. §13.2 beat table, in two passes: first the conversation rows (03, 07, 08, 11, 16, 19–21, 28–30), then the gameplay rows. **Done** (see §13.6). Every video now has a home:
   - **Event beats** (`src/cinematicBeats.js`): 03, 05, 07, 09, 10, 11, 14, 15, 16, 17, 18, 19, 20, 21, 25, 28, 29, 30, 31, 32.
   - **Inside their own flow**, claimed once per save with `director.claim()`:
     - 08 on Suture's first contact, before its window;
     - 12 when the boarding choice (the Queen's offer) first opens;
     - 24 at the start of the departure.
   - **Unchanged:** camp first contact (01, 02, 04, 06, 22, 23) and the snail bosses (13, 26, 27).
5. Verify in the dev server (vite + system Chrome). Capture the Meridian first visit: doors → 02 → doors → Kaelen's window over the live camp.


### 13.6 Status log

| Date | Step | What shipped | Verified |
|---|---|---|---|
| 2026-10-16 | 1 | `SongInterstitialController.show(spec, { onBehindDoors })`: doors shut over the last frame, the callback mounts the window, the doors open on play (`is-closing-out` → `is-revealing`). `main.js` `showCardThenScene()` runs the scene exactly once, even if the card can't show. `camp-first-contact` uses it. `#leader-conversation-modal` backdrop is 0.38 with a 2 px blur (was 0.88 / 14 px). | Unit: `songInterstitials.test.js` (8). Browser, :5211 no-HMR: the Meridian class log reads `is-closing` → `is-open` (int_02 webm, audio on) → `is-closing-out` → window mounts → `is-revealing` → `hidden`, and nothing follows in the next 8 s. Spec: `tests/e2e/camp-first-contact-doors.spec.js`. It failed twice at the boot helper (stuck at the armory, ahead of this beat). A hand-driven boot passed the same checks. |
| 2026-10-16 | 1 (bug) | Browser run caught the §13.4 double card. S-1's fallback played card 19 while the doors were revealing Kaelen's window. Fix: the controller queues cards (one at a time), and the runner's three borrowed placeholders (19, 30, 01) are gone. | Unit: `interactionSequenceRunner.test.js` "never borrows another beat's song card". Browser re-run is clean. |
| 2026-10-16 | 2 | Tree choices whose node names a side-story card play it first: doors shut over the window → still + music (7 s, skippable) → doors shut → the node renders behind them → doors open on the window. `NpcDialogueTreeManager.cardForChoice()` / `markCardPlayed()` decide: once per save (`playedCards` in `hb_side_stories_v1`), never the opening node. Number keys and Esc are ignored by the tree while a card is up. The card caption reads "Overseer Kaelen // Camp Meridian" instead of "TRACK kaelen_…". | Unit: `npcDialogueTrees.test.js` (+3), `songInterstitials.test.js` (10). Browser: Kaelen at bond 3 / stage 1, choice `kaelen_bio_link`, Esc mid-card → the log shows the line change to `kaelen_biolink_response` while `is-closing-out`; the window stays open; `playedCards` saved. |
| 2026-10-16 | 2 (bug) | Esc used to skip the card **and** close the conversation behind it. Space/Enter would have pressed the window's focused choice. Any other key first (W) silently removed the skip listener (`once: true`). Fix: the card listens in the capture phase and swallows only Space/Enter/Esc. | Unit: "owns its skip keys". Browser re-run: the window survives Esc. |
| 2026-10-16 | 3 (part) | The sequence perk is real: `SideStoryManager.grantPerk()` records it on the owning story (saved), adds it to the tree manager's live perks, and shows the toast. `bank.addPerk` never existed, and the `perk-unlocked` event had no listener. Sequence lines show as a bunker line ("MOTHERSHIP: …") and hold for a reading beat. Completions are saved in `hb_cinematics_v1` (reset with the campaign), not in memory. | Unit: `sideStorySystem.test.js` (+2), `interactionSequenceRunner.test.js` (+1), `threeGame.campConversation.test.js` (+2). Full suite 6,336 / 744 files pass; i18n audit unchanged. |
| 2026-10-16 | 4 (pass 1) | `src/cinematicBeats.js`: 16 beats (03, 07, 10, 11, 14, 15, 17, 18, 19, 20, 21, 25, 28, 29, 30, 32), each with the doors in and out. Rules: once per save (`beats` in `hb_cinematics_v1`, shared with the runner's `sequences`); wait out a fight, keeping the higher-priority beat; boss beats (17, 25) play at spawn; co-op gets a toast with the title instead of doors; a flavour beat within 20 s of another card is dropped (not spent). `then: 'camp-conversation'` opens the leader only if the player stands at that camp. **11 → Aria**: the first `queen-hallucination` plays int_11, and the doors open on Aria's window ("Why do you tremble so, sweet contractor?"). At bond 0 she offers only *Resist psychic pull*. A song card now **freezes play** (`#song-interstitial` joined `hasBlockingGameplayOverlay`). Before this, enemies kept simulating behind every card, first contact included. | Unit: `cinematicBeats.test.js` (9: each card maps once to a shipped webm on disk, int_11 → Aria, detail matching, once per save, combat deferral, boss, co-op, spacing, shared record), `threeGame.blockingOverlay.test.js` (+1). Full suite 6,346 / 745 files pass. Browser: one whisper → `int_11_her_voice_inside_your_helmet_motion_v1.webm` played in full with play blocked → doors → Aria's window → `aria_resist`. A second whisper does nothing. |
| 2026-10-16 | 4 (bug) | The browser run found card 14 already spent at boot. `depth-tier-changed` re-announces the current tier on spawn and respawn. Card 14 now needs a real crossing (`detail.crossing`). | Unit: "matches on the event detail". |
| 2026-10-16 | 4 (pass 2) | All 7 remaining videos mapped in `src/cinematicBeats.js`: **05** (`ship-module-activated`), **08** (`hive-first-contact` for Suture hive), **09** (`player-respawned`), **12** (`queen-fight-started`), **16** (`hive-choice-resolved` non-violent options), **24** (`act2-departed`), **31** (`act2-milestone` Queen defeated). All 32 shipped song cards now have explicit triggers. Side-story cards now use `status: 'still'` with Ken Burns camera pan and their OST music (no borrowed videos). Swapped in `_v2` stills for Briggs (`int_briggs_scorched_rig_key_v2.webp`), Kaelen (`int_kaelen_diagnostic_cradle_key_v2.webp` and new `int_kaelen_frequency_overclock_key_v2.webp` featuring Kaelen at the breaker gallery), Nahl (`int_nahl_mind_link_key_v2.webp`), and Martha (`int_val_hearth_warmth_key_v2.webp`). Moved side-story cards off greetings onto Trusted nodes (`kaelen_trusted`, `briggs_trusted`, `val_trusted`) so they play on non-intimate trust paths. Aria's title resolved to `Specimen 0047-B` (`HIVE MIMIC`). | Unit: `cinematicBeats.test.js`, `songInterstitials.test.js`, `leaderIdentity.test.js`, `npcDialogueTrees.test.js`. 117 tests pass across 14 suites; 0 unlocalized strings. |
| 2026-10-16 | 4 (review) | Review fixes to pass 2:
- **08:** the card played over the hive window that had already opened, then reopened it. Now `openHiveChoice` holds the window, and `hive-first-contact` plays the card first and opens the window behind the doors. `selectCampInterstitial` gives Suture 08 and other hives no card; 11 stays Aria's.
- **12:** it fired on Queen-fight start, on top of `event-queen-encounter`. It now plays when the boarding choice first opens.
- **24:** it fired on `act2-departed`, alongside the ending sequence. It is now the first step of `runAct2DepartureSequence`.
- **31:** it now needs `combat: true`. The boarding purge/bargain also reports `queenKilled`, right before departure.
- **16:** `hive-parley` doesn't exist, and the bond fallback matched almost every action, including `hive-talk`, whose window the card would cover. It now lists real actions, and `then` is gameplay.
- **09:** `player-respawned` fires on **every deploy**. Card 09 now needs `afterDeath`, which `respawnPlayer` reports after a `player-death`.
- **New rule:** a beat also waits while any other cutscene, dialogue, window or card is up (`isBusy`, polled every 1.5 s).
- **Game bug:** every deploy recorded a fake **tier-3 ABYSS crossing**. The profile turns `gameplay` one frame before the player leaves the menu showcase chunk (100, 100). That inflated `maxDepthTierReached` and the arc's `deepestDepthTier`, fired the survivor contract and a camera shake, and spent card 14 at boot. `updateDepthTierProgress` now ignores the showcase chunk. | Unit: `cinematicBeats.test.js` (11), `songInterstitials.test.js`, `threeGame.campConversation.test.js` (+1 hive order), `threeGame.depthShowcase.test.js` (new). Full suite 6,352 / 746 pass. Browser:
- the boarding choice → card 12 → doors → the boarding window behind them, and no replay;
- a respawn beat fired during a conversation waited, then played 0.1 s after the window closed;
- deploy now records tier 1, where the player stands (it was 3). |
| 2026-10-17 | 3 (rest) | The sequences play for real.
- **Anchors:** they resolve to places: the camp's own dressing (`resolveSequenceAnchor`), which now holds `meridian_logic_core_drum` and `meridian_grid_covenant_seal` at Meridian, or the installed cot. The old check read `worldDressingNetwork`, which never existed, so every sequence fell back.
- **Steps:** the camera focuses on the target, the player walks to the mark over 0.7 s, and FX and the prop state land at the prop. Each sequence names its camp (no Meridian hardcoding). The leader holds position and gestures; camp leaders have no walk cycle.
- **Order and input:** a sequence waits for a clear stage (no card, window or cutscene), and Esc/Space/Enter skips it. S-1 runs **before** the conversation and its end opens it; with no anchor, the conversation just opens.
- **Rewards:** Grid Covenant paid its +2 bond and perk twice (in a step and again in the end state). Now once.
- **Re-entry:** a run is spent when it starts, so a resume can't loop back into it. (`fe664c2e`) | Unit: `interactionSequenceRunner.test.js` (8), `threeGame.campConversation.test.js` (S-1 order, anchors). Full suite 6,369 pass. Browser, headed on Vulkan: first contact → card → doors → camera on Kaelen → the operator walks from (3, 2) to (−2, 3) beside the drum → "Overseer Kaelen: The core is holding…" → camera released → Kaelen's window over the live camp, 9 s after the card. |

**Resolved from owner review:**
- **All 32 song videos mapped:** no card is left unmapped. Each plays once per save, pauses play and waits out fights and other cutscenes, with doors in and out. Where each lives: §13.5 step 4.
- **Side-story art & Ken Burns ladder:** Cards 33–38 and all 15 side-story scenes run rung 2 (key-art still + Ken Burns pan + audio) without borrowing other clips. `int_kaelen_frequency_overclock_key_v2.webp` generated and committed to depict Kaelen.
- **Unshadowed side stories:** `briggs_scorched_rig`, `kaelen_diagnostic_cradle`, and `val_hearth_warmth` now trigger from their respective Trusted nodes instead of being shadowed by camp first-contact greetings.
- **Aria title:** Window header displays "Specimen 0047-B // HIVE MIMIC" instead of generic "SCOUT".

---

## 14. Definitive First Expedition integration (2026-10-18)

### 14.1 The intended first-run chain

This is the canonical handoff. It should feel like one expedition, not a tutorial followed by unrelated systems.

`Fresh profile` → `Sector 0 phases 1–5` → `cross perimeter blast gate` → `Ring 1 live play` → `discover first safe camp` → `doors / camp card / doors` → `S-1 at the Meridian core` → `Stranger conversation` → `field workbench` → `one recalibration` → `return to expedition with a changed combat verb`

| Beat | Player action | System response | Presentation rule |
|---|---|---|---|
| F-1 | Click DEPLOY on a fresh solo profile | `ProfileManager.shouldStartSectorZero()` routes to Sector 0 | no explanatory movie; teach through the playable room |
| F-2 | Move, equip the sidearm, break the cable, bank salvage, kill the tutorial crawler | `SectorZeroTutorialManager` advances five authored phases | objective and world reaction only; never stack a song card over instruction |
| F-3 | Cross `perimeter_blast_gate` | dispatch `sector-zero-completed`; persist `hasCompletedSectorZero`; continue into Ring 1 | continuous camera/audio; do not cut to menu or loading-card language |
| F-4 | Returning player selects **SKIP ONBOARDING** | finish Sector 0 as skipped, open the gate, grant standard sidearm + 25 tech | one confirmation toast; no fake completion montage |
| F-5 | Enter the first safe camp | existing first-contact card plays between doors | one card only, once per save; simulation blocked in solo |
| F-6 | First TALK at Meridian | shipped S-1 walks the player to `meridian_logic_core_drum`, plays the line, then opens dialogue | this is the first deliberate story staging after the playable onboarding |
| F-7 | Use the field workbench | show Supply Fabrication / Field Recalibration tabs; one recalibration per camp | keep this a choice UI until selection; do not play a movie merely for opening the menu |
| F-8 | Confirm a recalibration | apply cost/mod/synergy, save it, broadcast `field-recalibration-applied` | add S-17 below: a short install animation, then immediate control |
| F-9 | Trigger the new combat verb | Sub-Zero Necrosis nova, altered weapon behavior or another chosen modifier appears in real combat | feedback belongs in play: FX, audio, hit reaction and debrief telemetry, not another interruption |

### 14.2 S-17: Field Recalibration install sequence

This uses the runner rather than introducing another modal or full-screen movie. The selected card is **X**, the authored workbench socket is **Y**, and seating/calibrating the module is **Z**.

| Field | Specification |
|---|---|
| Trigger | local `field-recalibration-applied` after payment and state commit; run only for the local selecting player |
| X | `detail.choice.id` and its element/rarity; this is a selected module specification, not a world pickup unless a physical cassette model is added |
| Y | new per-camp sequence anchor `field_recalibration_socket`; resolve it from the workbench the player actually used |
| Actors | local player; camp leader may watch/gesture only if already present and idle |
| Z | player walks to the socket, seats the module, workbench clamps close, light color follows the element, weapon emits one safe diagnostic pulse |
| End state | selected overclock remains equipped, camp use remains spent, synergy toast/debrief record remains authoritative, input returns |
| Skip | snap to the same equipped state and spent-camp state; never charge or broadcast twice |
| Co-op | do not seize peer cameras; host-authoritative `field-recalibration-applied` updates peer state and plays a small bench pulse/toast |
| Failure | if the anchor/model is missing, keep the committed selection and show the normal bunker line; do not roll back payment |

Recommended spec-factory output (the caller fills `campId`, `choiceId` and `elementColor` before passing the object to the existing runner):

```js
{
    id: `field_recalibration_install:${campId}:${choiceId}`,
    trigger: { event: 'field-recalibration-applied', localOnly: true },
    anchors: { socket: 'field_recalibration_socket' },
    actors: { player: true },
    steps: [
        { do: 'lockInput' },
        { do: 'camera', shot: 'medium', target: 'socket', ms: 400 },
        { do: 'walk', actor: 'player', to: { anchor: 'socket', offset: [0, 0, 0.55] } },
        { do: 'prop', anchor: 'socket', state: 'clamped' },
        { do: 'fx', anchor: 'socket', effect: 'recalibration_pulse', color: elementColor },
        { do: 'line', speaker: 'workbench', key: 'narrative.sequences.field_recalibration.installed' },
        { do: 'camera', shot: 'gameplay', ms: 350 },
        { do: 'unlockInput' }
    ],
    skip: 'applyEndStateAndResume'
}
```

**Do not reapply the recalibration in the runner.** `recalibrateFieldWeapon` has already spent the currency, equipped the choice, recorded the synergy and broadcast the shared-world event. S-17 is presentation over committed state.

### 14.3 Telemetry needed to prove the chain

Use one structured category and stable ids; do not rely on button text.

| Event | Required fields |
|---|---|
| `ONBOARDING sector-zero-started` | profile state, fresh/legacy, build, input mode |
| `ONBOARDING phase-changed` | previous phase, next phase, elapsed ms, reason |
| `ONBOARDING sector-zero-completed` | skipped, elapsed ms, previous phase |
| `CINEMATIC sequence-started/completed/skipped/fallback` | sequence id, trigger, missing anchor if any, elapsed ms |
| `DIALOGUE opened/line-shown/choice-selected/closed` | speaker id, tree/node/choice id, trust tier, elapsed ms, close reason |
| `WORKBENCH recalibration-opened/rerolled/applied/closed` | camp id, offered ids, selected id, costs, synergy id, elapsed ms |
| `COMBAT fusion-triggered` | fusion id, target, affected enemy count, damage, radius |
| `ENEMY stalker-state-changed` | previous/next state, distance, line of sight, flashlight-lit, cause |

Privacy/volume rule: record ids and timings, not rendered dialogue prose, free text or per-frame positions. Sample repeated enemy-state transitions so the Stalker does not flood uploads.

### 14.4 Packaged Proof Run acceptance

The next live-play upload should deliberately prove this route:

1. Fresh profile automatically enters Sector 0; all five phases complete with controller and no coaching.
2. Crossing the blast gate is continuous and sets `hasCompletedSectorZero`; redeploy does not replay it.
3. A separate returning-profile run uses the explicit skip and receives exactly one sidearm and 25 tech.
4. First camp contact shows exactly one door-bookended card, then S-1, then one Stranger-tier conversation over gameplay.
5. No intimate option appears before trust 3 and stage 2; no completed option or reward repeats after return/reload.
6. The workbench offers three deterministic recalibrations, charges rerolls once, allows one choice per camp and presents S-17 without double-applying state.
7. The selected modifier changes the next combat encounter visibly; if Sub-Zero Necrosis is selected, the log records one nova with affected-target count.
8. In paired co-op, recalibration state reaches the peer without closing the peer's doors or taking their camera.
9. Upload the session log from every participating machine and retain a short video for camera, animation, text readability and player comprehension.

### 14.5 Implementation truth versus the supplied execution summary

| Claim | Repository truth on 2026-10-18 | Document action |
|---|---|---|
| Sector 0 is the fresh-profile first expedition | committed in `2a753f4a` | integrated into F-1–F-4 and the Proof Run |
| Safe-camp Field Recalibration is live | committed in `2a753f4a` | integrated into F-7–F-9; S-17 is the missing presentation beat |
| Three named cards: Cryo Overclock, Biometric Siphon, Kinetic Spalling | those names are not the current data. `RECALIBRATION_MODS` contains seven entries including `cryo_rime`, `caustic_payload`, `subzero_necrosis`, `kinetic_hollow_point`, `hyper_split_core`, `corrupted_overcharge` and `o2_siphon_chamber` | use runtime ids as canonical; rename only through a deliberate data/localization migration |
| Sub-Zero Necrosis combat fusion is live | committed implementation exists in run drops/combat/death reporting | prove it in packaged play with `fusion-triggered` telemetry |
| Mycelium Stalker redesign is shipped | implementation and tests are currently uncommitted working-tree changes | do not mark shipped until committed, built and proven in the same route |
| `definitive_first_expedition_summary.md` exists | no file by that name is present | this §14 is the canonical execution summary unless a separate artifact is intentionally added |

### 14.6 New movie/reference prompt: Field Recalibration install

Runtime should use S-17 in engine. This prompt is for an optional codex/trailer insert or for generating a first/last-frame reference pair; it must not interrupt every workbench choice.

**FR-1 `field_recalibration_install`, "The Weapon Learns a New Rule"**

- **First Frame Prompt:** Hunker Bunker key art, 16:9 cinematic still, deep-space corporate industrial horror with restrained H.R. Giger biomechanics: a safe-camp field workbench under a focused amber task lamp, an armoured operator holding a palm-sized black-iron recalibration cassette just above an open weapon socket; three thin diagnostic bands glow cryo blue, toxic green and warm white around the socket; tool shadows and cable ribs frame the hands. Soot-black iron, bone ivory, bruised maroon tissue only at seams, amber practical light, sparse teal diagnostics; no readable text, logos or watermarks.
- **Last Frame Prompt:** Hunker Bunker key art, 16:9 cinematic still, deep-space corporate industrial horror with restrained H.R. Giger biomechanics: the cassette locked flush inside the weapon housing, clamp petals closed around it, a controlled blue-green pulse traveling from the bench into the weapon while the operator's gauntleted hand steadies the receiver; the camp remains visible and safe behind the bench. Soot-black iron, bone ivory, bruised maroon tissue only at seams, amber practical light, sparse teal diagnostics; no readable text, logos or watermarks.
- **Image-to-Video Action Prompt:** One continuous 6-second macro-to-medium pullback. The operator seats the cassette; three clamp petals close in sequence; the bench emits a low diagnostic pulse; blue frost races along one channel while green bioluminescent spores answer along another; both meet in a brief contained white-blue nova inside the transparent chamber, then settle into a steady status glow as the camera reveals the safe camp behind the operator. No explosion, no recoil, no cut, no text.

### 14.7 Combat presentation rule for the Mycelium Stalker

The Stalker is a gameplay grammar test, not a movie trigger. Preserve control and teach the counter through readable states:

- darkness/occlusion → stalk/flank;
- direct sight → lateral maneuver away from the center cone;
- 3.8–7.2 m → 650 ms pre-pounce, cyan/green mandible glow and hiss;
- flashlight or gunfire → flinch, retreat into shadow, 3.2 s pounce lockout;
- committed pounce → 9.8 m/s lunge, one-heart damage, toxic puddle, short camera trauma, retreat.

Add a codex replay only after the player survives or kills one. Never freeze the first encounter for an interstitial: the pounce telegraph itself is the authored scene.

---

## Appendix A: Mining the live logs again

```sh
D=$(mktemp -d); cd "$D"
curl -s https://steam.tuesdaycinema.club/logs/session -o index.json
python3 -c "import json; [print(e['name']) for e in json.load(open('index.json'))['entries']]" |
  while read n; do curl -s -o "$n" "https://steam.tuesdaycinema.club/logs/session/$n"; done
# Conversations: INPUT clicks on npc-choice / leader-conversation-*;
# camps reached: WORLD/MAP 'Room revealed' with role camp;
# cutscenes: AUDIO 'Playing cutscene video:'; skips: INPUT global-skip-intro-btn.
```
