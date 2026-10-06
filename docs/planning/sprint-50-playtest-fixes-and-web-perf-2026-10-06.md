# Sprint 50 — playtest fixes and web performance (2026-10-06)

Status: in progress | Branch: `dev/sprint-50` | PR #105 | Issue #106

Source: the owner's two-account co-op session on 2026-10-06, 18:42–18:57 UTC.
- **Build:** `2.4.15-beta` (`58a0f732`) on both machines.
- **Windows host:** `Deadman's Hand`, 2560×1440.
- **Deck guest:** `tuesday-cinema-club`.
- **Logs:** `hunker-bunker-session-2026-10-06T18-56-25-273Z`, `…T18-57-06-922Z` and `…T18-57-17-154Z` in the session-log drop box.

Also the Netlify Lighthouse report: mobile Performance 38.

## What the owner asked for

1. "I made a snail chase me, but it went to the other player and sat at the model not hitting them, and they couldn't see it."
2. "When I killed the first boss on PC, the game lags, it goes black and I hear a video play but it's all messed up; the other player had no lag."
3. "I want the players and their counterparts seeing the same thing."
4. "I also think the rotation is off for the other player."
5. "The UI is getting clipped and I want things more on the lower part of the screen."
6. Improve the Lighthouse score (#106).

## 1. Host enemies a guest could not see — fixed (`7686fbc7`)

- **Cause.** In co-op the host runs every enemy and broadcasts their positions and HP (`broadcastEnemyStateSnapshot`, 10 Hz). A guest only *moved* enemies it already had (deterministic spawns with the same `scatterKey`) and created missing ones **only for bosses** (`materializeRemoteBoss`). An enemy spawned or pulled in on the host had no counterpart on the guest:
  - on the host it chased the guest's avatar and sat on it;
  - on the guest it didn't exist, so it could neither be seen nor do damage (each player takes damage on their own machine).
- **Fix.** `materializeRemoteEnemy` creates any live host enemy the guest lacks; bosses keep their path.
  - At most 4 are created per snapshot, so a burst can't hitch the guest; the rest arrive 100 ms later.
  - `pruneRemoteReplicas` removes a replica 3 s after the host stops reporting it, so no ghosts linger.
  - Deterministic enemies the guest spawned itself are never pruned.
- **Tests:** `src/threeGame.coopSync.test.js` (4 enemy cases). The `coopSharedWorld` boss tests still pass.
- **Verify on hardware:** host spawns or pulls a snail toward the guest. The guest sees it and takes damage from it; killing it on either side removes it on both.

## 2. PC freeze after the first boss kill — fixed (`e4bebc6e`)

- **Cause.** Windows log, 11:49:05 PDT: two **single frames** took **13.9 s** and **11.4 s** (`frame:render` long tasks). Each coincided with a model drawing for the first time: `boss_cybersnail_dead.glb`, then the `eng_foxhole_shadow` chassis skin.
  - That's a **synchronous shader compile**. Chrome on Windows runs WebGL on Direct3D 11, and a program for this scene (~20 point lights plus shadows) can take seconds to compile.
  - The Deck's Linux driver compiles it quickly, which is why the partner had no lag.
  - The "Foundry discovered" cutscene had just started, so its audio played over a frozen frame.
  - Same family as the PC wall bug earlier this week: Direct3D limits WebGL doesn't show on Linux.
- **Fix.** `ThreeGame.prewarmLateModel(root)` runs `renderer.compileAsync(root, camera, scene)` before a late model enters the scene, the same technique `preloadEnemy3dTemplates` already uses for enemies.
  - It's bounded at 30 s, so a compile that never settles can't keep a model out of the world.
  - Wired into every mid-run attach: corpses, world-3D prop swaps, camp/hive site props, a squadmate's chassis, the local chassis rebuild and the black-box corpse.
  - Visuals are unchanged; each guard is re-checked after the wait.
- **Tests:** `src/threeGame.corpse3d.test.js` (compile before add; an expired corpse is dropped).
- **Verify on hardware:** Windows host kills the Cyber Snail boss. There's no multi-second stall (Long Task windows stay under ~0.5 s), and the corpse appears within a second or two.
- **Follow-up (not done):** warm the corpse and skin programs during the boot shader-warmup phase, so even the background compile is done before the fight.

## 3–4. Seeing the same thing; squadmate rotation — rotation fixed (`7686fbc7`)

- **Cause of the rotation.** A squadmate's 3D chassis turns itself toward travel and aim in world space (`player3dOverlay.update`), exactly like the local one. But `updateMultiplayer` also rotated the chassis's parent to the broadcast yaw, so the two rotations added up. Also, `hasAim` was `false`, so a standing squadmate never turned toward their aim.
- **Fix.** The parent stays unrotated when a chassis is present (the 2D sprite fallback faces by frame row and is unaffected), and the chassis gets the real aim from the broadcast yaw.
- **Tests:** `src/threeGame.coopSync.test.js` (2 facing cases).
- **Still to do for "the same thing":**
  - [ ] **PvP remote-health drift** (10-06 05:33 PvP pair): each side's view of the rival's health misses heals between hits, so both recorded a final hit at "0 HP" while the rival had 2. Make the relay's health authoritative in PvP and stop estimating locally.
  - [ ] **Enemy aggro target.** The host's enemy picks the nearest player on the host. The guest now sees it move there, but host and guest can still disagree when they target different players near a chunk edge. Broadcast `targetPlayerId` in the snapshot and have the guest replica face/attack that target.
  - [ ] **Cutscene parity.** Milestone cutscenes play on the machine that triggered them. Decide which beats should play for the whole squad (boss intro, O2 upgrade) and send them with the existing shared-world beat messages.
  - [ ] **Verify** with the two-account route in #85.

## 5. UI clipping and a lower layout — needs a screenshot

- **What we know.** The Windows machine runs **2560×1440 (16:9)**. The game's 16:10 stage is scaled 1.8× to 2304×1440, with 128 px side bars (`stage.offsetX: 128`). The Deck runs the native 1280×800, the shape most layout tests use.
- **Likely cause.** Elements positioned against the *window* (`position: fixed` against the viewport, or `vw`/`vh` units) instead of the stage. On 16:9 they land in or past the side bars. `docs/design/ui-surfaces-menu-map-and-controller-navigation.md` and `docs/planning/ui-overhaul-plan-2026-10-05.md` hold the fixed-positioning traps found earlier.
- **"More on the lower part of the screen."** A layout rule: keep the HUD in a bottom band and pull top-anchored notification decks and mission stacks down toward it, inside the stage.
- [ ] **Owner:** a screenshot (or the screen names) of what clips on the PC.
- [ ] Add a 16:9 viewport (e.g. 2560×1440) to `tests/e2e/ui-layout-contract.spec.js`, so clipping at that shape fails a test.
- [ ] Bottom-band layout proposal, implemented behind the existing UI-overhaul plan.

## 6. Web performance (#106)

**Done:**
- unused door art no longer preloaded
- hidden-screen images lazy
- SVG favicon
- installable service worker (PR #105)
- **only the active language loads** (this commit). English is bundled, the other six load on demand, and `src/boot.js` loads the player's language before the game's modules evaluate.
  - The six were ~330 KB gzipped of boot JavaScript.
  - In the browser: every language boots and live switching works (`tests/e2e/i18n-localization.spec.js`, 9/9).

**Remaining**, in #106's order: Three.js out of the boot graph, chunk config, fonts, critical CSS, deferred sprite sheets, and a mobile Lighthouse check in CI.

## Status log

- 2026-10-06: items 1, 2 and 4 fixed with tests; item 6 step 1 done; this plan written. Items 3 (remaining), 5 and 6 (remaining) open.
