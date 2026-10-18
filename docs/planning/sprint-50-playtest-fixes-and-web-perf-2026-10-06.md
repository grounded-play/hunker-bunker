# Sprint 50 — playtest fixes and web performance (2026-10-06)

> [!NOTE]
> **Consolidation Notice (2026-10-17):** Playtest remediations from this pass have been completed. Hardware verification routes for co-op expedition (#85), Steam Deck controller input (#53), and web performance (#106) are consolidated into the canonical [Sprint 53 Master Verification & Execution Plan (2026-10-17)](sprint-53-master-verification-and-execution-plan-2026-10-17.md).

Status: **historical / consolidated into Sprint 53 Master Plan** | Original branch: `dev/sprint-50` | PR #105 | Issue #106

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
7. "The night sleep isn't working, I don't see a bed, I can't interact with it."
8. "We need more of the currencies and trade-ups and melting materials to be present and working: look at what's there but not actualized, add them to the plan and into the game now."
9. "Make sure that every command maps to something on the Steam Deck out of the box; a bunch doesn't right now, like press T to trade."

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
- **Follow-up completed 2026-10-08:** regular corpse variants, exact gib materials and fallback sprites prewarm before use; late models compile against both EffectComposer buffers. `tests/e2e/probes/shot-shader-stalls.spec.js` fell from 11 new programs on a kill to at most one lightweight sprite program and now enforces that budget (`1eb220f0`–`bf22ba2d`, Sprint 52 continuation).

## 3–4. Seeing the same thing; squadmate rotation — rotation fixed (`7686fbc7`)

- **Cause of the rotation.** A squadmate's 3D chassis turns itself toward travel and aim in world space (`player3dOverlay.update`), exactly like the local one. But `updateMultiplayer` also rotated the chassis's parent to the broadcast yaw, so the two rotations added up. Also, `hasAim` was `false`, so a standing squadmate never turned toward their aim.
- **Fix.** The parent stays unrotated when a chassis is present (the 2D sprite fallback faces by frame row and is unaffected), and the chassis gets the real aim from the broadcast yaw.
- **Tests:** `src/threeGame.coopSync.test.js` (2 facing cases).
- **Still to do for "the same thing":**
  - [x] **PvP remote-health drift** (10-06 05:33 PvP pair): relay-authoritative healing landed in Sprint 51 (`051a5334`, `server/relayPvPAuthority.test.js`).
  - [x] **Enemy aggro target.** The host's enemy picks the nearest player on the host. The guest now sees it move there, but host and guest can still disagree when they target different players near a chunk edge. Broadcast `targetPlayerId` in the snapshot and have the guest replica face/attack that target.
    Done in Sprint 51: the snapshot carries `targetId`/`mode`, and the relay passes them through. It also fixed a worse gap: a guest's enemy copy only slid along and never bit. The host leaves a squadmate's hearts to their own client, so a snail chasing the guest did no damage at all. Now `updateRemoteEnemyReplica` bites and faces the player the host named. Boss bodies hurt on touch, and hive-kin and Act 2 talkers are spared as on the host.
  - [x] **O2 milestone parity.** Shared-world events relay the O2 build/upgrade beat through both clients, including the cutscene, generator state and retaliation boss (`1149fdae`; relay and client tests).
  - [x] **Remaining cutscene parity:** consolidated into [Sprint 53 Master Verification Plan](sprint-53-master-verification-and-execution-plan-2026-10-17.md#1-github-issues-consolidation--clearance-pack) (#85).
  - [x] **Verify** with the two-account route in #85: consolidated into [Sprint 53 Master Verification Plan](sprint-53-master-verification-and-execution-plan-2026-10-17.md#1-github-issues-consolidation--clearance-pack) (#85).

## 5. UI clipping and a lower layout — resolved

- **What we know.** The Windows machine runs **2560×1440 (16:9)**. The game's 16:10 stage is scaled 1.8× to 2304×1440, with 128 px side bars (`stage.offsetX: 128`). The Deck runs the native 1280×800, the shape most layout tests use.
- **Likely cause.** Elements positioned against the *window* (`position: fixed` against the viewport, or `vw`/`vh` units) instead of the stage. On 16:9 they land in or past the side bars. `docs/design/ui-surfaces-menu-map-and-controller-navigation.md` and `docs/planning/ui-overhaul-plan-2026-10-05.md` hold the fixed-positioning traps found earlier.
- **"More on the lower part of the screen."** A layout rule: keep the HUD in a bottom band and pull top-anchored notification decks and mission stacks down toward it, inside the stage.
- [x] **Owner:** PC clipping surfaces audited in [PC UI defects audit](pc-ui-defects-and-feedback-audit-2026-10-15.md) (DEF-01 through DEF-06) and remediated in Sprint 53 (S53-06 through S53-11).
- [x] Add a 16:9 viewport regression: `tests/e2e/deferred-screens.spec.js` opens the co-op deployment briefing at 2560×1440 and fails if a visible control is clipped or covered (`6ad75ec1`). The broader layout contract also accepts `HB_CONTRACT_SIZE=WxH` for manual matrix runs.
- [x] Bottom-band layout proposal: completed via [Unified Lower Console HUD Plan](hud-unified-lower-console-2026-10-12.md).

## 6. Web performance (#106)

**Done:**
- unused door art no longer preloaded
- hidden-screen images lazy
- SVG favicon
- installable service worker (PR #105)
- **only the active language loads** (this commit). English is bundled, the other six load on demand, and `src/boot.js` loads the player's language before the game's modules evaluate.
  - The six were ~330 KB gzipped of boot JavaScript.
  - In the browser: every language boots and live switching works (`tests/e2e/i18n-localization.spec.js`, 9/9).

- **Three.js out of the boot graph, and the chunk config** (steps 2–3).
  - The armory, hero preview, leader conversation, enemy-template preload and reward preview now load on first use. Their model URL tables moved to a Three.js-free module (`src/data/operatorModelUrls.js`).
  - The hand-written `manualChunks` groups are gone. Rolldown pulls each group's dependencies into it, so the "debug-tools" chunk was really 2.3 MB of Three.js and the locales, all on the boot path.
  - Boot JavaScript is now 462 KiB (1032 KiB before step 1, 705 KiB after it).
  - Lighthouse 9.6.8 mobile (local preview, three runs): **Performance 52–53** (was 42–46); FCP 2.5–3.0 s, LCP 7.9–8.3 s, TBT ~500 ms, TTI 7.1–7.7 s.

- **Round 2**, from the deploy reports of 2026-10-06 (Performance 47, then 55), profiled with a 4× CPU-throttled boot of an unminified build. Every fix leaves the output unchanged.
  - **Title portrait:** the title profile drew one frame from the 2048×2048 walk sheet, so boot downloaded 1.3 MB (TANK) and chroma-keyed 4.2M pixels on the main thread. It now draws a pre-cut ~40 KB frame cut by the game's own code (`scripts/build-title-portraits.mjs`, `public/portraits/`).
  - **Loadout preview:** it now draws only on the loadout screen. It used to decode a sheet behind the title and redraw every 110 ms for a whole run.
  - **Door art:** four door images that nothing displays (1.4 MB) are no longer preloaded. The rest load once the page is idle.
  - **Chat filter:** every term's pattern is compiled on first use, not at import. That was ~600 ms of throttled boot.
  - **Focus-root scan:** it runs once a frame, only for mutations that can change the result, and uses `checkVisibility()` instead of a forced layout. It ran per mutation batch over ~60 surfaces: ~650 ms.
  - **Presentation-cursor observer:** it queries the document only when an overlay changes. It used to run a 7-part selector over 2,700 elements for every class change and loader line: ~380 ms.
  - **HUD column layout:** it measures only during a run.
  - **Webfont stylesheet:** no longer render-blocking. The loader avatar is lazy.
  - **Result** (Lighthouse 9.6.8 mobile, local preview, three runs): **Performance 63–65**, TBT 180–230 ms (was ~600), payload 2.2 MB (was 3.4).
- **PWA is fine.** The "47" and the earlier "38" were the Performance score; the deploy audits PWA 100.

- **Round 3** (Netlify: Performance 70 on `6ac5a404`):
  - The title key art is preloaded, and the door art waits for the first input.
  - The RGB minigame (runtime and chapter content) loads with the archive, and socket.io loads on connect. Boot JS went from 462 to 435 KiB; Lighthouse "unused JavaScript" from 217 to 197 KiB.
  - The language picker's seven flags are files (`public/flags/`), not inline SVG: DOM went from 2,799 to 2,696 elements.
  - A loader showing the title art scored 74–77, but the owner preferred the plain loader, so it was reverted.

**Next, in order:**
- **Continue splitting `main.js` per screen.** Sprint 51 moved the deployment briefing, Steam Vault, trade window and legacy dev console to first-open templates (`c51a02b8`; boot DOM ~2,700 → ~2,200). Settings and the ship console remain because boot-time settings sync still reads and writes them.
- **LCP (~8 s, the biggest remaining weight).** The LCP element is the title (`#splash`), which JavaScript reveals late in boot. Paint the title shell from static HTML and CSS, then let the boot fill it in.
- **`main.js` evaluation** (~1.4 s throttled).
- Critical CSS (the 96 KB stylesheet is ~90% unused at first paint).
- A mobile Lighthouse check in CI.
- **Note:** `main.js` has a Lighthouse-only boot path (`isLighthouse`, `c030269d`) that skips the loading screen and asset manifest. Scores therefore describe a boot real players don't get. Decide whether to keep it.

What still costs the most:
- **TBT.** `main.js` evaluation is ~1.8 s of main-thread time, including one 576 ms task. A 522 ms task runs in the `presentationTelemetry` chunk. The next step is splitting `main.js`'s top-level setup into idle-time work.
- **LCP.** The title art paints after the boot JavaScript.

## 7. Night sleep: the bed was somewhere else — fixed

- **Cause.** The bunker cot is placed once, when the game is constructed. At that moment the game is on the menu profile, whose spawn tile is the showroom chunk at (100, 100). So the cot stood about 3,200 units away, while the rest trigger sat at the real spawn: a prompt with no bed, or no prompt at all.
- **Fix.**
  - `syncBunkerCot()` moves the cot (sprite and 3D model) to the live rest point whenever the gameplay profile starts, and every frame the rest prompt runs, so it follows a moved spawn.
  - The cot now has a 3D model (`prop_camp_cot`), with its shaders compiled in the background.
  - Standing at the cot when rest is refused now says why: an active quest, or hostiles or an unsafe camp nearby (`ui.prompt.rest_blocked_quest`, `ui.prompt.rest_blocked_unsafe`, all 7 languages).
- **Tests:** `src/threeGame.restPoint.test.js` (cot at the rest point; follows a spawn change; 3D model mirrors it; refusal reason).
- **Verified in the browser:** `tests/e2e/bunker-cot.spec.js` starts a run, stands at the cot, sees "PRESS E · REST — END DAY 2" and starts the rest.

## 8. Currencies, trade-ups and smelting: what exists vs. what works

The design is `docs/season-zero-protocol/05-crafting-matrix-and-salvage-economy.md`. Audit, 2026-10-06:

| Thing | Exists | Worked before | Now |
|---|---|---|---|
| Scrap from props (9 props: siphon, salvage, pry…) | `game.addScrap?.(n)` in `src/propInteractions.js`, "+N SCRAP" text | **No.** ThreeGame had no `addScrap`; the optional call did nothing | **Fixed.** Scrap banks as tech, which the bank already treats as scrap. A test fails if any prop hook is missing from ThreeGame. |
| Duplicate protection (doc 05 §3) | `DUPLICATE_SHARD_BONUS`, `resolveDuplicateGrant` | **No.** Never called. Steam gave nothing for a duplicate; the sandbox *replaced* the item with shards from a different table | **Fixed.** A cache roll the player already owns grants the item **plus** shards (epic +40, legendary +100). It's the same table on the server and in the sandbox. |
| Deep Core Shards 4159 (Dispensary currency) | Dispensary redeem is live on Steam | Spendable, but **no Steam source** | Source added: cache duplicates. |
| "Partial grant" after every Steam cache open | `adaptSteamCacheResult` | Required 3 rewards; a Steam cache gives 1 | **Fixed.** One reward is a complete open. |
| Smelter 5→1 trade-up | live on Steam (`/steam/inventory/trade-up`) | yes | unchanged |
| Fragment crafts 2100/2200 | live on Steam | yes | unchanged |
| Cryo-Alloy Ingot 4156 | Quartermaster pack (400 tech), sandbox only | Source in sandbox only; **no sink anywhere** | needs a decision (below) |
| Sub-Core Matrix 4157, Ambergris 4158 | itemdefs, sandbox cache drops | **No source on Steam, no sink anywhere** | needs a decision |
| Earned Relic Key 4154 | itemdef, non-marketable | **Unusable.** The cache generator (4002) only accepts the paid key 4001 | needs a decision |
| Key Master Pack 4155 | itemdef | Superseded by the store's 4005/4015 key bundles | retire |

**Needs a decision before it can be built** (each touches real Steam items):

- [x] **Earned keys.** Boss kills grant the non-marketable earned key 4154 and generator 4002 accepts either key (`0d2b599b`; schema revision 3 uploaded).
  - Boss kills grant 4154 instead.
  - Add `4000x1,4154x1` as a second exchange on generator 4002 in `steam/inventory_schema_hunker_bunker.json`.
  - Accept either key in `server/steamRecipeExchange.js` and `src/steamVaultUi.js`.
  - Owner uploads the schema.
- [x] **Quartermaster shards → reagents** (doc 05 §4): Matrix 35 shards (max 3/week), Ambergris 50 (max 2/week), Earned Key 75 (max 1/week).
  - Server route on the existing `commitExchange`, with weekly caps held server-side.
  - Only worth building once reagents have a sink.
- [x] **A sink for ingots and reagents.** Overclock assembly for 4140–4147 landed in `db05d7bc` using ingots, matrices and ambergris.
- [x] **A Steam source for ingots.** Server-verified boss kills grant five ingots (`db05d7bc`).
- [x] **Resolve 4155:** retained for compatibility but hidden from the store and made non-marketable in uploaded schema revision 3.
- [x] **Duplicate shards whose grant failed.** `7f991a74` retries from the completed journal on the same cache-open replay and opportunistically before the player's next exchange. It reuses the stable AddItem request ID, never consumes another key and never rerolls the cache reward.

**Owner steps for what shipped here:** deploy the backend (cache-open duplicate shards are server-side). No schema change is needed: shards 4159 already exist and are granted with AddItem.

## 9. Every command on the Steam Deck — done

- **Cause.** On the Deck, input comes from Steam Input's action manifest, and its gameplay set had no action for:
  - T: tactical ping, or trade with a squadmate;
  - G: the squad command radial (and Alt+1–5);
  - C: next interaction target.

  A Deck player couldn't trade at all. The open tactical map only closed from a controller (no pan, zoom, home or "find me"). The target panel printed keyboard keys ("E", "T"). The glyphs named sprint "LS" and scan "B", while the layout binds LT and LB.
- **Fix.**
  - **Three new manifest actions,** bound on every bundled layout (`scripts/build-steam-input-configs.js`, layout revision 11 so existing players get it), read natively in `electron/main.cjs`, and mirrored in the browser-gamepad map:
    - `tactical_ping` on D-pad ←;
    - `quick_command` on D-pad → (both previously repeated X and Y);
    - `cycle_interact` on aim-stick click.
  - **D-pad ← does what T does:** trade when a squadmate is present, otherwise ping (one `toggleSquadTrade()` for both).
  - **Tactical map on a controller:** sticks pan, RT/LT zoom, A centres on you, Y on home, X resets.
  - **Prompts** name the controller button when a pad is in use, and the glyph table matches the layout.
- **Tests:**
  - `scripts/build-steam-input-configs.test.js`: every layout binds every manifest action; Electron reads every gameplay action.
  - `src/browserGamepad.test.js`, `src/inputGlyphs.test.js`, `src/threeGame.controllerPrompts.test.js`.
- **Owner steps.** The manifest and layouts ship in the Steam build (depot upload). The Steamworks Steam Input page may need the official layout re-published for revision 11.
- **Not done:**
  - [x] Keyboard key hints in authored UI text are device-aware through `src/inputHints.js` (`8d5c4d06`), including radar, tactical map and dialogue choices. The untranslated source keeps its keyboard wording; the active controller swaps the i18n key.
  - [x] Verify on the Deck: trade with a squadmate from D-pad ←, the squad radial from D-pad →, and pan the map with the stick: consolidated into [Sprint 53 Master Verification Plan](sprint-53-master-verification-and-execution-plan-2026-10-17.md#1-github-issues-consolidation--clearance-pack) (#53).
    2026-10-10: none of these actions writes a session-log event, so the Deck logs can't confirm them. This needs an owner check.

## Status log

- 2026-10-06: items 1, 2 and 4 fixed with tests; item 6 step 1 done; this plan written. Items 3 (remaining), 5 and 6 (remaining) open.
- 2026-10-06 (later): item 6 steps 2–3 (Performance 52–53); item 7 (bed) fixed; item 8 audited, with scrap, duplicate shards and the Steam partial-open message fixed and four economy decisions listed.
- 2026-10-06 (evening): item 9 (Deck controls) done; item 6 round 2 (Performance 63–65 locally). Open e2e failures not from this work: `camp-quests` (the bounty chip wins the objective lane over an accepted quest, `515f42fe`) and `foundry-lifecycle` (exact float compare of the player's Y).
- 2026-10-07: Sprint 51 carried the earned-key/reagent loop, co-op aggro, controller hints and first-open briefing/Vault/trade markup to completion.
- 2026-10-08: duplicate-shard journal recovery and the 2560×1440 briefing regression landed. The first-kill shader follow-up now permits only one lightweight sprite program. Remaining gates are the owner's unidentified clipping surface, two-account/Deck verification, and the settings/ship-console perf split.
