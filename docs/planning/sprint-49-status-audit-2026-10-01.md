# Sprint 49 status audit: S49-15 to S49-38 (2026-10-01)

Status: audit snapshot | Owner: Claude lane | Updated: 2026-10-01 | Review: when a listed ticket changes state

Scope: the P1/P2 tickets of [Sprint 49](sprint-49.md), checked against the code at `ba9298df` (v2.4.14-beta, [PR #100](https://github.com/grounded-play/hunker-bunker/pull/100)). For S49-01 to S49-14, use each ticket's "Implementation checkpoint" paragraph in [sprint-49.md](sprint-49.md), maintained by the [implementation handoff](sprint-49-implementation-handoff.md) lane. This audit does not repeat them.

This records **implementation state, not acceptance**. Most tickets still close only on human, hardware or two-account evidence. Under the plan's own rules, none of them is closed here.

## Legend

| State | Meaning |
| :--- | :--- |
| **Not started** | No Sprint 49 work. Earlier code may exist. |
| **Code exists, acceptance open** | The runtime and tests exist; the ticket's Accept condition needs play, hardware or accounts. |
| **Partial** | Some of the ticket is done in Sprint 49; named gaps remain. |
| **Decision needed** | Blocked on an owner or product decision, not on code. |

## P1 (S49-15 to S49-33)

| Ticket | State | Evidence (checked 2026-10-01) | What is left |
| :--- | :--- | :--- | :--- |
| **S49-15** Co-op parity | Code exists, acceptance open | Host-authoritative companions and Ring 1 events (`712d0f75`, `b77c74cd`) with unit tests. Sprint 49 added: enemies on a squadmate no longer hurt the local player, and the relay build gate (`1334b1e1`). | A paired journey covering Ring 1, bounty, companions, camps, drops, death/redeploy and host loss. The 2026-09-30 session can't count: the Deck ran 2.4.9 ([QA](qa-2026-09-30-deck-pc-coop-session.md)). |
| **S49-16** Companions | Code exists, acceptance open | Archetype assists (`9a520382`) and the multi-room pathing probe (`fbf9e424`), both 2026-09-30. No Sprint 49 work. | A paired run with six archetypes, documented behavior, and camp/save persistence of recruited identity. |
| **S49-17** First hour | Not started | Human playtests required. The QA session showed the gaps: a guest suffocated next to spawn, nobody finished "clear six hostiles", and there were 2 kills in 11 minutes. | Three fresh players, a recorded 35–45 minute route; fix the blocks found. |
| **S49-18** Combat | Not started (in Sprint 49) | Boss phase controllers converted 2026-09-30 (`f0676af3`), with `scripts/combat-encounter-report.js`. The QA log shows 78% of the Deck's trigger presses were rejected (fire cooldown/reload). | Tell/response captures per boss, class-distinct runs, an ammo softlock check. Re-check Deck fire feel on 2.4.14. |
| **S49-19** Inert drops | Code done (disposition); acceptance open | `plasma_bounce`, `tesla_thrusters`, `pheromone_aura` and `synapse_pulse` are `implemented: false`. The roller (`runDrops.js:254`) and both claim paths (`threeGame.js:8121`, `statusEffects.js:320`) refuse them, so they are out of the pools: an explicit disposition. Every rollable entry has a runtime consumer, through `threeGame.js` stat reads or `runDrops.js` helpers with tests. **Done in `583ab298`:** the Bio-Vampiric Membrane text (7 locales) and stats now match its consumer, and a test pins the four exclusions. Left: build any of the four effects, if wanted. |
| **S49-20** World variety | Code exists, acceptance open | `node scripts/world-seed-portfolio-report.js`: **5,000 seeds, 0 validity failures, 0 site-spacing conflicts, 0 manifest/territory conflicts, 0 determinism failures**. Biome-boundary flicker fixed (`b388698f`). | Reachability after world transformations, destroyed walls and save/load; three visibly different played routes. |
| **S49-21** Narrative/debrief | Other lane | Claimed by the [implementation handoff](sprint-49-implementation-handoff.md) (S49-13/14/21). | — |
| **S49-22** Foundry journey | Partial | The controller journey probe walks the hub from both entries and selects every tab by pad; closing returns focus to the opener (`e12b4beb`). | Cost previews, disabled reasons, empty and error states; "see the deployed cosmetic" end to end. |
| **S49-23** Earned power | Decision needed | All 10 charms (4130–4139) are `marketable` and `tradable` in `steam/inventory_schema_hunker_bunker.json` and carry combat modifiers (e.g. 4130 `cryoDurationMultiplier: 1.05`). Earned rig modules (4160–4167) are already split as `source: 'earned'`. | Owner choice (economy plan P1): split charms into a tradeable cosmetic plus an earned perk, or make them non-marketable. Then tests through the real grant/equip pipeline. |
| **S49-24** Reward economy | Decision needed | Economy plan P2/P3 open (cosmetic-only caches with pity; one price per key). | Approved design first. |
| **S49-25** HUD | Not started (in Sprint 49) | The dock is the default (`7d2bd377`, 2026-09-30); the layout e2e exists. Chat now adds a HUD entry point (`82501e4f`). | Deck and desktop captures at every text/HUD scale with chat, pings and subtitles together. |
| **S49-26** Camera/lighting | Not started | Decision 12 (isometric as the default gameplay camera) is **not applied**: `main.js:2773` still defaults to `third-person`. Gameplay tilt-shift is still present (`threeGame.js` `TiltShiftPassShader`, `.gameplay-tilt-shift`). | Apply decision 12, remove gameplay tilt-shift, world-space darkness and rim light, then matched before/after captures. |
| **S49-27** Audio | Partial (other contributor) | `5e3510ca`: every OST track triggered in context, boss tracks, enemy movement and impact SFX. | Combat-plus-radio stress capture, ducking, caption parity. Not claimed here, to avoid that contributor's files. |
| **S49-28** Accessibility | Code exists, acceptance open | Settings exist (`e511e8e2`). Shake honors 0: `triggerCameraShake` scales by `cameraShakeScale` and skips at ≤0.001. | End-to-end persistence checks, a reduced-flash/motion audit, and Deck deadzone and hold/toggle tests with players. |
| **S49-29** Seven languages | Partial | `npm run i18n:audit` unchanged/improved. New Sprint 49 text ships in seven locales: chat (`82501e4f`), commentary (`3c68c914`), build-mismatch toast (`1334b1e1`). | Native-speaker review (chat filter and commentary especially), font/wrapping checks, switching locale mid-run. |
| **S49-30** Saves/Cloud/suspend | Not started | No Sprint 49 work. | Packaged two-machine drills. |
| **S49-31** Performance | Partial | Draw-call and triangle telemetry fixed (`35cdecc5`). A measured PC/Deck baseline is in the [QA analysis](qa-2026-09-30-deck-pc-coop-session.md): CPU-bound PC, a 13.6 s unattributed main-thread block during deploy, 4,469 unique materials. | **Done:** lossless WebP textures for ten GLBs, −24.8 MiB, renders pixel-identical; budget 2780→2755 MiB (`2e2178c7`). Meshopt was rejected because it changed the render. Deploy stages attributed (`43513578`). **Finding for S49-37:** the five largest 2026-09-30 models are byte-identical copies of existing models (e.g. `bio_charger` = `scout_xeno_stalker`), i.e. placeholders. Left: a committed baseline scene/device, Deck measurement. |
| **S49-32** Services | Partial | Backend deploy hardened after the 2026-10-01 outage: clean-worktree build, smoke run, `~/server/deploy-backend.sh` with auto-rollback, image-contents test (`7783278f`), and a data backup before deploy. Chat report retention documented (`82501e4f`). | Fault drill (auth expiry, relay outage, worker restart, DB restore), alerts, localized retry states. |
| **S49-33** Journey tests | Partial | Controller journey probe, 15 surfaces (`0e7bba0c`…`7e31a8e9`); chat browser → relay → peer e2e (`82501e4f`); `server/deployImageContents.test.js`. | Workbench event → panel → debit → effect; ping input → peer marker; purchase → grant → reconciliation; package smoke for both platforms. |

## P2 (S49-34 to S49-38)

| Ticket | State | Note |
| :--- | :--- | :--- |
| **S49-34** Expedition choices | Not started | — |
| **S49-35** Social loop | Not started | Depends on 02–05 and 14–15. Chat and the build gate are prerequisites now in place. |
| **S49-36** Seasons | Not started | Depends on 07–09 and 23–24, so blocked on the same decisions. |
| **S49-37** Art in context | Not started | — |
| **S49-38** Integration debt | Partial | Chat landed as bounded modules (`src/playerChat.js`, `src/playerChatUi.js`, `server/chatPolicy.js`). Commentary and purchase presentation still live in `main.js`. |

## What this lane picks up next

The other contributor holds S49-01 to S49-04, S49-07/08 and S49-13/14/21, and is currently editing `sprint-49.md`. A third contributor owns audio (`5e3510ca`). This lane takes:

1. ~~S49-19 close-out~~: done (`583ab298`).
2. ~~S49-31 asset compression~~: done (`2e2178c7`), lossless WebP rather than meshopt.
3. ~~S49-31 deploy-wait attribution~~: done (`43513578`).

Progress is logged in the [Claude lane handoff](sprint-49-claude-lane-handoff.md).
