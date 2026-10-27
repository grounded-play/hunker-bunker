# Release PR: v2.4.18-beta — Definitive First Expedition, Camp Cinematics, Enemy Grammar, Crash-Site Rebuild & Voiced Speech

**Target:** `mothership` ← **Source:** `dev/sprint-53`
**Baseline:** `v2.4.17-beta` (`d3d8d391`, released 2026-10-15)
**Version:** `2.4.17-beta` → **`2.4.18-beta`** (one patch, `55a4e20a`)
**Scope:** 171 commits since the release

Release notes: [`docs/releases/v2.4.18-beta.md`](v2.4.18-beta.md) · Canonical QA: [Sprint 53 master verification plan](../planning/sprint-53-master-verification-and-execution-plan-2026-10-17.md)

## Summary

Sprint 53 turns the opening hour into a deliberate first expedition and makes what follows read as one authored game:

- **First expedition:** fresh profiles play a five-phase Sector 0 that continues into Ring 1; a rebuilt crash site, first night and O₂-boss breach loop follow it.
- **Camps and cinematics:** earned, non-repeating dialogue in one grammar; all 32 song cards on explicit triggers, now behind **one** door system.
- **Combat:** Chitin Scuttlers, Spore Mortars and Mycelium Stalkers form a readable triangle; Field Recalibration adds camp buildcraft.
- **World:** physical vignettes, emitters and hazards; props, items and enemies replicate in multiplayer.
- **Performance:** the 30–40 s shader freezes are gone; mobile Lighthouse clears its gate.
- **Voice:** 276 lines of speech that were only ever text are now voiced; camp conversations finally speak.
- **Steam:** review build 25965936 remediation (overlay hook, wallet fallback, Shift+Tab).
- **CI:** desktop and mobile Lighthouse pass in the cloud. The latest run found narrow presubmit failures for stale generated asset reports and unused imports; both now pass locally and await the cloud rerun.

> [!WARNING]
> **Co-op is not release-ready.** The 2026-10-27 same-build PvE/PvP session (`7c19a7f8`) proves join/ready/deploy, synchronized PvE boss/world state, proportional PvP damage and matching PvP results. It does **not** close #85/#77 or #51: the PvE guest log and extraction route are missing, PvP rematch/return-to-lobby were not tested, players can deploy unarmed, and Deck performance failed at 9.4 fps with a 36.5 s deploy stall. See the [10-27 QA review](../planning/qa-2026-10-27-pve-pvp-playthrough.md) and the earlier [10-26 co-op review](../planning/qa-2026-10-26-coop-playthrough-pr-review.md).

## CI status

Every workflow that runs on this PR was reproduced locally from a clean checkout (`npm ci`, Node 22, same commands and env as `.github/workflows`) at `55a4e20a`; the two failures it found are fixed in `59b03438` and re-measured (package audit, Lighthouse).

| Workflow / step | Local result |
| :--- | :--- |
| `pr-checks` / `presubmit`: `npm ci`, `lint`, `audit:dependencies` | ⚠️ latest cloud run found three unused Python imports; fixed after `aaa78f3d` |
| `pr-checks` / `presubmit`: `coverage` | ✅ 6,584 tests across 768 files; 98.6% statements |
| `steam-build`: `presubmit` (generated-asset audits) | ⚠️ latest cloud run found two stale generated retail-asset reports; refreshed after `aaa78f3d` |
| `steam-build`: `npm test`, `build`, `steam:config`, `electron-builder --dir`, Linux launch payload | ✅ |
| `steam-build`: `audit:retail-assets:package` | ✅ app.asar 995,310,105 bytes (was 1,075 MB) |
| `steam-build`: `steam:audit-depot` | ✅ |
| `lighthouse` desktop | ✅ |
| `lighthouse` mobile | ✅ cloud job passed at `aaa78f3d`; this satisfies #106's 80+ gate |
| `codeql` | ✅ cloud CodeQL and Code Quality jobs passed at `aaa78f3d` |

`npm audit` (not run by CI) reports two production advisories (body-parser high, ip-address moderate) and dev-only ones (undici, zod); follow-up.

CodeQL cannot run locally (no CodeQL CLI); the cloud CodeQL analysis passed on every push of this branch, most recently `cf925ae9`, and the commits after it change the asset audit, version and docs.

**Why `steam-build` was red, and why this PR deletes images.** Three gates were failing; none of the deleted files is loaded by the game, and every one has a source copy outside `public/`.
- `audit:retail-assets:check` (`10fc8b95`): 233/160 unknown assets, 160/140 duplicate groups. **32 decal PNGs** under `public/3d/runtime/decals/` were byte-identical copies of the `public/decal_*.png` the game loads and the sticker bake reads; removed, and the art script stops writing the copy. The 80 world-expansion GLBs (loaded by data id) and the menu art (index.html `--asset-*` map) are now credited by the audit. Back to the v2.4.17-beta numbers (116 / 128).
- `audit:retail-assets:package` (`59b03438`): app.asar 1,075 MB over its 950 MiB budget. **256 PBR `.webp` masters** (`_baseColor`, `_normal`, `_orm`, `_emissive`) sat in `public/3d/runtime/surfaces/` although the game samples only their `.ktx2` bakes; they are byte-identical to `art/source/textures/world-expansion-80-2026-10-16/pbr/`, so they leave `public/` and the art script writes them there only. Budget 950 → 1000 MiB for the real growth (53 MB of expansion decals).
- Lighthouse mobile (`59b03438`): the **vault gear images** were re-encoded 1024 → 512 px (the largest draw is ~390 css px at 4K; 1024 px masters kept in `art/source/ui/gear-vault-2026-10-26/`) and load after the page is idle.

## Tickets

### Closed by this PR

| Ticket | What closed it |
| :--- | :--- |
| **S53-03** Previous class left on screen | Armory reloads with the requested class; probe covers all six switches. |
| **S53-05** New players wipe on O₂ | Bubble-exit and 50% O₂ warnings. |
| **S53-06 – S53-11** (DEF-01 – DEF-06) PC UI | Settings spill, menu music isolation, Mothership uplink sizing, square operator preview, readable back button, global 11/12 px text floor. |
| Steam review build 25965936 | Early overlay hook, wallet fallback, Shift+Tab, packaged overlay runtime audit (`c0102b48`, `7e5fdf9b`). |
| CI `steam-build` failure | `10fc8b95` (above). |
| 2026-10-26 playtest, resume and sleep | Gameplay audio held until deployment completes; full field weapon restored on resume; resume at the base spawn; sleep film plays above the doors with the bed wake behind them; no automatic Foundry after sleep (`6dc702a6`). |
| 2026-10-26 playtest, presentation | One door system for song cards (no grey doors); one black-box cinematic instead of two (`d4e96f2b`); room names in full at top center (`3648eac6`); briefing card at top, folds to a pill (`e41db11e`). |
| 2026-10-26 playtest, missing voice | Camp tree nodes request voice; 276 code-only lines rendered for 8 new and 11 existing voices (`e41db11e`, `cf925ae9`). The co-op playthrough on `cf925ae9` logs the remaining gaps as `VOICE unvoiced-line` (mostly HUD notices). |

### Opened by the 2026-10-26 co-op playthrough

`2dcaa27a` (landed while this PR was prepared) starts on these: host-authoritative mission state, relay-validated enemy contact damage, the companion lifecycle and modal-fit CSS. None of it has been through a two-account packaged run yet, so the items below stay open until the [retest route](../planning/qa-2026-10-26-coop-playthrough-pr-review.md#retest-route) passes.

P0: host-authoritative mission/boss progression; enemy contact damage with hit intent/acknowledgement; companion recruit pop and snapping relocation. P1: one camp-quest objective id with a minimap target; multiplayer-select and game-over screens that fit 1280×800 and 1280×720 without scrolling; Deck frame pacing (15 fps). P2: raw ids in the overnight report, telemetry gaps. Details: [QA review](../planning/qa-2026-10-26-coop-playthrough-pr-review.md).

### Updated by the 2026-10-27 PvE/PvP playthrough

Three server logs from the same packaged build (`2.4.18-beta`, `7c19a7f8`) provide useful partial acceptance:

- **PvE:** two accounts joined, readied and deployed; remote wall destruction, guest death/redeploy, two boss kills and synchronized mission abort reached the host. #85/#77 stay open because the guest log, extraction, companion, camp quest, suspend/resume and Game Over layout evidence are missing.
- **PvP:** two accounts completed one round; four standard hits removed one heart each, the cadence guard rejected an over-fast hit, and both clients recorded the same winner/results. #51 stays open because rematch/return-to-lobby were not exercised and the session exposed an unarmed deploy.
- **Performance/Deck:** #52 and #53 stay open. Deck PvP averaged 106 ms/frame (9.4 fps, p95 201 ms), and PvE deployment contained a 36.5 s main-thread stall.

Full evidence and the next two-machine route: [10-27 QA review](../planning/qa-2026-10-27-pve-pvp-playthrough.md).

### Superseded Dependabot PRs (close after merge)

| PR | Covered by |
| :--- | :--- |
| #112 codeql-action 4.38.3 → 4.39.0 | `865b77ec` (workflows pin 4.39.0) |
| #113 follow-redirects 1.16.0 → 1.16.1 | `9d3d63b5` (lockfile has 1.16.2) |
| #114 coverage-v8, electron-builder, eslint, vitest | `865b77ec` (all four at the target versions) |
| #115 electron 44.4.4 → 45.0.0 | `865b77ec` |

### Advanced, not closed (hardware or operations evidence still owed)

Refs #85, #77, #51, #52, #53, #45

| Ticket | Code state | Closes when |
| :--- | :--- | :--- |
| #85 Two-account PvE | 10-27 proves join/deploy, remote wall state, death/redeploy, bosses and synchronized end | paired packaged extraction plus both logs and required route evidence |
| #77 Playthrough umbrella | Dependent engineering complete | #85 accepted |
| #51 PvP certification | 10-27 proves proportional damage, cadence guard, attribution and matching results | armed deploy plus rematch/return-to-lobby acceptance |
| #52 Performance | 10-27 fails: Deck 9.4 fps; 36.5 s PvE deploy stall | fixed-route Deck and RTX frame-time reports meeting the stated bars |
| #53 Deck acceptance | 10-27 proves a controller PvP slice only | full physical controller-only route including suspend/resume |
| #45 Ship gate | Candidate and runbook | all P0 QA and publisher gates |

## What to QA

Test the packaged build from this PR's head, and record the SHA shown in the build on every machine: Deck and PC must match. Items marked **new** landed after the 10-18 candidate draft and have never been through packaged QA.

### 1. First launch, deployment and resume

- [ ] Fresh profile deploys into Sector 0 and completes phases 1–5, crossing into Ring 1 without a cut.
- [ ] Returning profile: pause → **SKIP ONBOARDING** grants exactly one sidearm and 25 tech.
- [ ] **New:** no music, Mothership or Foundry dialogue plays behind the title or the loading doors. Audio starts when the doors open.
- [ ] **New:** Resume Expedition: you appear at the base spawn (not beside the black box or wherever you quit), holding the gun you had with its clip and reserve ammo. Guns you dropped are still on the ground.
- [ ] **New:** an old suspend save (made on 2.4.17) resumes with a usable sidearm.

### 2. Crash site, first night and O₂ loop (new)

- [ ] Crash site layout reads clearly: landing gear, nearby life support, objective chevrons pointing at uninstalled ship modules.
- [ ] Module install takes priority over repair at a station; interaction cycling works when several targets overlap.
- [ ] Punch works when you have no gun.
- [ ] O₂ boss breach plays its first reveal, survivors arrive through the airlock, and the fabricated welder repairs the wall.
- [ ] Camp oxygen and the escape craft are separate progress (rebuilding one does not complete the other).
- [ ] Sleep unlocks after the O₂ field reveal.

### 3. Sleep and doors (new)

- [ ] Sleep: doors close → the sleep film is **visible** → you wake beside the bed with no teleport as the doors open → morning text. The Foundry does **not** open by itself.
- [ ] Only one style of door appears anywhere (hero or area art). The grey doors are gone.
- [ ] Camp first contact and story beats: doors shut → video → conversation already open as the doors part.
- [ ] Black box pickup plays **one** cinematic (card 32), not two. It may wait for the patrol fight to end.

### 4. HUD (new)

- [ ] Discovering a room shows its full name at top center, wrapping to two lines if long, with the NEW tag and subtitle. Nothing is cut off.
- [ ] Expedition briefing shows in full at top center on landing, folds to a pill at the top edge after ~7 s, and reopens on click or tap. It is gone on the results screen and menus.

### 5. Voice (new)

- [ ] Camp conversations (Martha, Briggs, Kaelen, Aria, Nahl) speak each node.
- [ ] Wanderer encounters, the Meridian sequence, Mayor Tina / Teacup Siren and Mothership / System radio lines speak.
- [ ] Listen to the eight new voices (Aria, Mayor Tina, six wanderer families). They are **provisional automatic picks**; auditions are in `art/source/voice/auditions/<role>/`.
- [ ] Export a session log after a camp visit and check for `VOICE unvoiced-line` entries: each one is on-screen speech still without audio.
- [ ] In a non-English language, code lines play in English (they are English-only text) and catalog lines play in the selected language.

### 6. Combat, camps and buildcraft

- [ ] Chitin Scuttlers swarm, Spore Mortars force you out of cover, Mycelium Stalkers flank, hiss before the pounce and retreat from light.
- [ ] Field Recalibration: three deterministic cards, one 10-tech reroll, one use per camp, the change visible in the next fight.
- [ ] No intimate dialogue at first contact; no choice, perk or reward repeats after a reload.
- [ ] Arcade cabinet pauses the world; SUB-CRUST PROTOCOL and Black-Ice 21 pay out.

### 7. Steam (new)

- [ ] Steam overlay opens with Shift+Tab in the packaged build.
- [ ] Store purchase falls back to the wallet when the overlay is unavailable.

### 8. Multiplayer, Deck, performance (owed tickets)

- [ ] **PvE (#85):** two accounts, host reversed once: props, items, enemy facing, recalibration, down/redeploy, extraction agree. Upload both logs.
- [ ] **PvP (#51):** spawn protection, standard damage, healing, results agree, rematch.
- [ ] **Deck (#53):** controller-only 1280×800 route through every screen; suspend 30 s and resume.
- [ ] **Performance (#52):** Deck p95 ≤ 33.3 ms, RTX 2070 SUPER p95 ≤ 16.7 ms on the fixed routes; no stall > 250 ms after deploy.
- [ ] **Visual:** 1280×800, 1920×1080, 2560×1440 and 4K screenshots for the UI matrix.

## Reviewer focus

1. `launchStandardRun` and `restoreExpeditionSuspend`: the `deployment` app phase, base-spawn resume and field-weapon restore (including the legacy-save migration).
2. `showCardThenScene`: cards are queued, play over the stage doors and never strand the queue when another transition takes the doors.
3. `AudioManager.playVoiceForMessage`: catalog lines first, then authored keyword clips, then generated code lines; unvoiced lines logged once.
4. `scripts/audit-retail-assets.js`: the new reference sources (data-keyed models, `--asset-*` map) credit only what loads.
5. Sector 0 routing, Field Recalibration atomicity, cinematic beats playing once, Stalker behaviour, and multiplayer reconciliation (unchanged from the candidate review).

## Known gaps

- The 10-27 packaged two-account and physical-Deck session is partial evidence only; it does not complete the §8 acceptance routes.
- The eight new voices are provisional; code lines are voiced in English only.
- Co-op blockers from the 10-26 review remain; the 10-27 session additionally exposes unarmed deploy, 9.4 fps Deck performance and a 36.5 s deploy stall.
- Foundry discovery, Queen encounter and snail-boss videos still play without doors (song cards use them now).
- The daily-run launch path still enters the gameplay phase before loading completes.
- Vey and Rhun covenant trees, final motion for still-backed side stories, and S-17 (visible recalibration install) are follow-up content.
- Publisher Item Store, MicroTxn and refund checks remain external gates.

<details>
<summary>First 130 commits since v2.4.17-beta (the PR now contains 171)</summary>

| # | Commit | Date | Subject |
| ---: | :--- | :--- | :--- |
| 1 | `39101c19` | 2026-10-15 | docs(qa): 2026-10-15 PvE co-op session review — shader-compile freezes regressed to 38 s |
| 2 | `613221ec` | 2026-10-15 | docs(sprint-53): plan from the 2026-10-15 co-op QA and the PC UI audit |
| 3 | `ef925e83` | 2026-10-15 | fix(render): stop the 30-40 s shader-compile freezes (S53-01) |
| 4 | `26881858` | 2026-10-15 | feat(trailer): equip class skins, guns and finishes for a capture take |
| 5 | `41ca6fe8` | 2026-10-15 | feat(world): calibrate wall contact planes, depths, and flush offsets across all 89 wall models |
| 6 | `79b4601c` | 2026-10-15 | feat(gameplay): implement contextual physical interaction vignettes |
| 7 | `87eb18c6` | 2026-10-15 | feat(gameplay): implement exosuit docking gantry cinematic vignette and milestone effects |
| 8 | `155d2ece` | 2026-10-15 | feat(gameplay): implement terminal and biometric safe cinematic vignette with decryption milestones |
| 9 | `bb94c106` | 2026-10-15 | feat(gameplay): implement heavy weapon case and field cot rest recovery interaction vignettes |
| 10 | `d6b07238` | 2026-10-15 | fix(render): render natural ground terrain outside bunker instead of metal floor grid |
| 11 | `2ba474a7` | 2026-10-15 | perf(render): S53-02 measurement, container-size cache tests, scene-weight probe |
| 12 | `c2a7b4e5` | 2026-10-15 | fix(armory): show the class just picked on the bench (S53-03) |
| 13 | `15253474` | 2026-10-15 | fix(input): a controller-only Deck no longer flips to keyboard mode (S53-04) |
| 14 | `6b0b8a1b` | 2026-10-15 | perf(world): animated props off screen and past shadow reach bank their time (S53-02) |
| 15 | `05515049` | 2026-10-15 | feat(ui): resolve PC UI defects across settings, menu music, mothership uplink, and operator select (DEF-01 - DEF-06) |
| 16 | `ebdc591d` | 2026-10-15 | docs(sprint-53): S53-02 mixer culling result and measured-but-deferred items |
| 17 | `d971bd76` | 2026-10-15 | feat(world): orient prop emissions and clean up destroyed FX |
| 18 | `ef6e2d24` | 2026-10-15 | docs(planning): update sprint-53-plan to mark S53-06 through S53-11 resolved |
| 19 | `5f0e1da4` | 2026-10-15 | feat(gameplay): add deterministic world emitter state machine |
| 20 | `cceb0ada` | 2026-10-15 | feat(gameplay): wire directional prop hazards into runtime |
| 21 | `1d4fb293` | 2026-10-15 | test(gameplay): cover emitter payloads and runtime reset |
| 22 | `5a0c0624` | 2026-10-15 | feat(world): manage slime and liquid pools through bounded registry |
| 23 | `bda376cf` | 2026-10-15 | fix(gameplay): rearm cyclic emitters and mirror generic switches |
| 24 | `09056a7b` | 2026-10-15 | docs(gameplay): record emitter slice verification and follow-ups |
| 25 | `b0cd6b02` | 2026-10-15 | chore(assets): audit gameplay emitter outlet anchors |
| 26 | `c9761ca8` | 2026-10-15 | feat(gameplay): transfer destroyed emitters into world hazards |
| 27 | `d1e4e242` | 2026-10-15 | feat(gameplay): migrate fungal vents to telegraphed exposure |
| 28 | `9e1fa9c3` | 2026-10-15 | feat(gameplay): visualize emitter outlets and hazard volumes |
| 29 | `dc32a2cb` | 2026-10-15 | feat(gameplay): add decon foam emitter payloads |
| 30 | `5450846e` | 2026-10-15 | feat(gameplay): unify world pool exposure cadence |
| 31 | `6fd9954b` | 2026-10-15 | feat(gameplay): transfer coolant leaks into world pools |
| 32 | `93639f28` | 2026-10-15 | docs(gameplay): record final emitter verification |
| 33 | `523d1df3` | 2026-10-15 | fix(base): move the sleep bay off the console, keep the cot by the wreck |
| 34 | `d66b776b` | 2026-10-15 | fix(base): keep the cot in view and landing wreckage off the sleep bay |
| 35 | `7970f7f2` | 2026-10-15 | docs(multiplayer): plan PvE/PvP prop, item, and enemy synchronization parity |
| 36 | `b12f0f89` | 2026-10-15 | feat(world): place spriteless story models; give authored rooms their own machines |
| 37 | `36dbe55d` | 2026-10-15 | feat(multiplayer): synchronize prop movement, interactions, and enemy snapshots across PvE and PvP |
| 38 | `9517af91` | 2026-10-15 | docs(assets): whole-game GLB census and a gap-first 80-prompt sheet |
| 39 | `86b00d2a` | 2026-10-15 | test(multiplayer): add end-to-end multi-client simulation probe and relay enemy rotation synchronization |
| 40 | `5836d305` | 2026-10-15 | test(relay): expect enemy facing in host snapshots |
| 41 | `e7dacd39` | 2026-10-16 | fix(multiplayer): tell players why a join failed instead of dropping silently |
| 42 | `f10c83f9` | 2026-10-16 | docs(qa): what last night's two solo Steam Deck runs show |
| 43 | `1959b52c` | 2026-10-16 | fix(deck): open dropdowns in the in-game picker on touch; log settings changes |
| 44 | `5926e68b` | 2026-10-16 | perf(deck): spread first-draw texture uploads, prewarm streamed chunks, trim per-frame waste |
| 45 | `11bc785a` | 2026-10-16 | docs(qa): record the freeze, CPU and settings follow-up and the Deck capture still needed |
| 46 | `b4bedd83` | 2026-10-16 | feat(world): integrate and audit expansion asset set |
| 47 | `be2bf7b8` | 2026-10-16 | test(dialogue): cover earned nonrepeating choices |
| 48 | `63610473` | 2026-10-16 | docs(camps): audit camp interactions, dialogue and cinematics; no bribe-only conversations |
| 49 | `dfbe80c9` | 2026-10-16 | fix(camps): open the choice tree of the leader standing there, not the camp's |
| 50 | `c787b72e` | 2026-10-16 | docs(camps): rebuild the camp/cinematics audit on verified live-play logs |
| 51 | `47121bc1` | 2026-10-16 | feat(camps): each camp keeps its own leader (D-1) |
| 52 | `e1b45eea` | 2026-10-16 | feat(camps): stranger and trusted tiers; leader perks off intimate paths |
| 53 | `60199e7f` | 2026-10-16 | feat(camps): leader lines in sentence case; voice strips one speaker prefix of any case |
| 54 | `c18e17b3` | 2026-10-16 | feat(camps): one conversation grammar and DIALOGUE telemetry |
| 55 | `2699c189` | 2026-10-16 | feat(cinematics): hook interaction sequence runner, placeholder frames, and uncouple borrowed motion from side stories |
| 56 | `627a8cbf` | 2026-10-16 | docs(cinematics): document sequence runner choreography and v2 keyframe assets |
| 57 | `4663fdcc` | 2026-10-16 | feat(cinematics): door bookends around song cards; one card at a time |
| 58 | `efac5e92` | 2026-10-16 | feat(camps): side-story cards play behind doors between choice and node |
| 59 | `3643787b` | 2026-10-16 | fix(cinematics): sequence perks, lines and completions are real |
| 60 | `552fcf4a` | 2026-10-16 | feat(cinematics): beat table maps 16 more song videos; int_11 opens Aria |
| 61 | `d6b4e86e` | 2026-10-16 | feat(cinematics): map the held-back beats, v2 side-story stills, Aria's title |
| 62 | `4b052801` | 2026-10-16 | feat(sprint-54): AAA plan, arcade cabinet, hit-stop, audio juice, Sector 0 tutorial |
| 63 | `6e7ee8fa` | 2026-10-16 | fix(cinematics): beats never stack on another flow; deploy no longer records ABYSS |
| 64 | `21d28fd6` | 2026-10-16 | fix(arcade): the cabinet is a real screen that owns input and pauses the world |
| 65 | `63069403` | 2026-10-16 | feat(audio): suffocation deepens with O2; AAA plan gets a verified status |
| 66 | `ec8a94b4` | 2026-10-17 | fix(juice): one hit-stop system; a kill no longer shortens a hit's freeze |
| 67 | `a3e2cd6d` | 2026-10-17 | feat(arcade): high scores pay out; arcade achievements held for Steamworks |
| 68 | `cb5f80da` | 2026-10-17 | chore(armory): drop socket offsets for classes that don't exist |
| 69 | `25c86111` | 2026-10-17 | feat(enemies): chitin scuttler swarmer pack archetype end-to-end |
| 70 | `6b2e9a92` | 2026-10-17 | fix(enemies): soften the chitin scuttler pack; AAA status row corrected |
| 71 | `fe664c2e` | 2026-10-17 | feat(cinematics): interaction sequences play for real at real props |
| 72 | `6d075bd3` | 2026-10-17 | docs(cinematics): log the real interaction sequences (fe664c2e) |
| 73 | `7f62cfcc` | 2026-10-17 | feat(audio): one SFX pitch spread; a heartbeat quickens as O2 runs out |
| 74 | `346aa79c` | 2026-10-17 | fix(e2e): runs no longer "stall at the Armory"; camp specs follow the doors |
| 75 | `882574a6` | 2026-10-17 | fix(arcade,audio,tutorial): fixed-step arcade, sane leaderboard, safe audio inputs |
| 76 | `3174f509` | 2026-10-17 | feat(aaa-expansion): spore mortar sentry, combat juice camera punch, and sector 0 onboarding |
| 77 | `c08e78f9` | 2026-10-17 | feat(audio): footstep banks per real floor texture, layered, synced to the feet |
| 78 | `76980af2` | 2026-10-17 | feat(sprint-53): expand sector zero arcade and world systems |
| 79 | `35e99055` | 2026-10-17 | fix(arcade): complete blackjack economy and rewards |
| 80 | `17fa7d7c` | 2026-10-17 | chore(steam): publish completed arcade achievements |
| 81 | `7bdd35c1` | 2026-10-17 | feat(gameplay): add early O2 bubble exit prompt and 50% warning toast (S53-05) |
| 82 | `03d1fba6` | 2026-10-17 | docs(planning): consolidate Sprint 53 master verification plan and resolve historical todo sprawl |
| 83 | `7a03d0ab` | 2026-10-17 | docs(planning): add consolidation notices and close dangling table todos across historical docs |
| 84 | `1e4ae274` | 2026-10-17 | perf(web): clear Sprint 53 mobile Lighthouse gate |
| 85 | `29bde7eb` | 2026-10-17 | updated the audit report |
| 86 | `2a753f4a` | 2026-10-17 | feat: complete first expedition onboarding and recalibration |
| 87 | `d85c5daa` | 2026-10-18 | feat(combat): complete stalker grammar and expedition audit |
| 88 | `7add8c30` | 2026-10-18 | fix(combat): preserve stalker emergence test contract |
| 89 | `bb0bfc81` | 2026-10-18 | DIY |
| 90 | `d6e9e273` | 2026-10-18 | DIY2 |
| 91 | `1d5c8772` | 2026-10-18 | fix(gameplay): resolve live-play navigation and feedback regressions |
| 92 | `1a3eb786` | 2026-10-18 | fix(deployment): atomic launch sequencing, Sector 0 combat gating, scan guidance, and synchronous save reset |
| 93 | `125b6117` | 2026-10-19 | fix(gameplay): crash site layout, directional interaction, O2 generator cheats, objective chevrons, and default third-person camera |
| 94 | `b4c63154` | 2026-10-19 | fix(crash-site): restore primaryChamber boundaries, clearManeuverLane and Sector 0 prop coordinates |
| 95 | `d7dd9b61` | 2026-10-19 | fix(gameplay): resolve bed spawn in wall, disable third-person wall cutaways, and restore O2 generator visibility and chevrons |
| 96 | `93e98d3c` | 2026-10-19 | fix(gameplay): expand crash site and repair interaction O2 flows |
| 97 | `b55ae219` | 2026-10-19 | fix(level): tighten crash-site opening flow |
| 98 | `95b3c224` | 2026-10-19 | fix(nav): route chevrons to uninstalled ship rebuild modules and scan objectives |
| 99 | `caa4e7e9` | 2026-10-19 | fix(core): resolve frame update crash, restore human bulkhead door, and streamline pad progression |
| 100 | `785de246` | 2026-10-19 | fix(level): make crash objectives and authored spaces readable |
| 101 | `869a5c6a` | 2026-10-19 | fix(onboarding): stage landing gear and nearby life support |
| 102 | `d96b20a3` | 2026-10-20 | fix(progression): separate camp oxygen from escape craft |
| 103 | `f28adeb1` | 2026-10-20 | fix(combat): punch when primary fire is unavailable |
| 104 | `c0102b48` | 2026-10-20 | fix(steam): resolve review failure by enabling early overlay hook, wallet fallback, and Shift+Tab support |
| 105 | `16eb806a` | 2026-10-20 | docs(steam): record remediation commit c0102b48 in build 25965936 report |
| 106 | `37161a70` | 2026-10-20 | fix(camp): unlock sleep through the O2 field reveal |
| 107 | `57956e74` | 2026-10-20 | feat(gameplay): connect O2 boss breach, airlock survivor arrival, and fabrication welder wall repair |
| 108 | `04c02816` | 2026-10-20 | fix(i18n): localize field bulkhead welder fabrication strings across all locales |
| 109 | `07ca2225` | 2026-10-20 | fix(interaction): prioritize module install over repair, restore physical cot recovery, and add interaction cycling |
| 110 | `035d81df` | 2026-10-20 | fix(audio): resolve AudioManager manifest coverage and guard station interaction tests |
| 111 | `7e5fdf9b` | 2026-10-21 | build(steam): audit packaged overlay runtime |
| 112 | `863aeb65` | 2026-10-26 | fix(gameplay): restore bed wake and companion feedback |
| 113 | `d54a75aa` | 2026-10-26 | fix(loading): report full deployment readiness |
| 114 | `9d3d63b5` | 2026-10-26 | fix(deps): resolve Vite redirect security alerts |
| 115 | `6495bd72` | 2026-10-26 | fix(gameplay): restore first O2 boss breach reveal |
| 116 | `865b77ec` | 2026-10-26 | deps: bump electron to 45.0.0, npm-minor-and-patch group, and codeql-action to 4.39.0 |
| 117 | `6dc702a6` | 2026-10-26 | fix(resume): hold audio until deployed, restore field weapon, fix sleep sequence |
| 118 | `d4e96f2b` | 2026-10-26 | fix(cinematics): one door system for song cards; one black box cinematic |
| 119 | `6d023c96` | 2026-10-26 | feat(ui): add biomechanical vault gear spinner and door transition kinematics |
| 120 | `3648eac6` | 2026-10-26 | fix(hud): show discovered room names in full at top center |
| 121 | `c20f2bc1` | 2026-10-26 | chore(reports): refresh chroma green audit timestamp |
| 122 | `e41db11e` | 2026-10-26 | feat(hud,voice): top briefing pill; voice the speech that lived in code |
| 123 | `cf925ae9` | 2026-10-26 | feat(voice): record the 276 code-line voices and the supporting cast picks |
| 124 | `10fc8b95` | 2026-10-26 | fix(ci): steam-build retail-asset audit back under budget |
| 125 | `55a4e20a` | 2026-10-26 | release: v2.4.18-beta (Sprint 53) |
| 126 | `59b03438` | 2026-10-26 | fix(ci): steam-build package payload and mobile boot gears |
| 127 | `0a4e8e9f` | 2026-10-26 | docs(qa): record October 26 co-op playthrough findings |
| 128 | `c1c73aae` | 2026-10-26 | perf(boot): hold the vault gear animations until their art is installed |
| 129 | `2dcaa27a` | 2026-10-26 | fix(coop): synchronize combat missions companions and UI |
| 130 | (this commit) | 2026-10-26 | docs(release): v2.4.18-beta notes, PR body, QA addendum and version references |

</details>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
