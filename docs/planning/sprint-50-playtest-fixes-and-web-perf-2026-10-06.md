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

**Next, in order:**
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

- [ ] **Earned keys.** Boss kills grant the *paid, marketable* key 4001, so free keys can be sold on the Community Market. Proposal:
  - Boss kills grant 4154 instead.
  - Add `4000x1,4154x1` as a second exchange on generator 4002 in `steam/inventory_schema_hunker_bunker.json`.
  - Accept either key in `server/steamRecipeExchange.js` and `src/steamVaultUi.js`.
  - Owner uploads the schema.
- [ ] **Quartermaster shards → reagents** (doc 05 §4): Matrix 35 shards (max 3/week), Ambergris 50 (max 2/week), Earned Key 75 (max 1/week).
  - Server route on the existing `commitExchange`, with weekly caps held server-side.
  - Only worth building once reagents have a sink.
- [ ] **A sink for ingots and reagents.** Doc 05 §6 overclock assembly needs components that aren't real items (Micro-Capacitor, Coolant Line…) and Scrap, which lives in the client-side bank and can't be charged on the server. Proposal: assemble overclocks 4140–4147 from ingots + matrices + ambergris only (the doc's quantities, components dropped).
- [ ] **A Steam source for ingots.** The Quartermaster pack is paid in tech, which the server can't verify, so it stays sandbox-only. Proposal: ingots ride on the existing server-verified boss-kill milestone.
- [ ] **Retire 4155** from the schema (owner upload).
- [ ] **Duplicate shards whose grant failed.** The cache reward stands and the response says `duplicateBonus.ok: false`, but nothing retries it. Add a sweep that re-sends the shard grant from the journal (the AddItem request id is stable, so a retry can't double-grant).

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
  - [ ] Keyboard key hints in authored text: "Radar Scan [Q]", "BREACH CACHE [F]", "PRESS [M] / [TAB] TO TOGGLE TACTICAL MAP", "PRESS [1-4]". These need device-aware text.
  - [ ] Verify on the Deck: trade with a squadmate from D-pad ←, the squad radial from D-pad →, and pan the map with the stick.

## Status log

- 2026-10-06: items 1, 2 and 4 fixed with tests; item 6 step 1 done; this plan written. Items 3 (remaining), 5 and 6 (remaining) open.
- 2026-10-06 (later): item 6 steps 2–3 (Performance 52–53); item 7 (bed) fixed; item 8 audited, with scrap, duplicate shards and the Steam partial-open message fixed and four economy decisions listed.
- 2026-10-06 (evening): item 9 (Deck controls) done; item 6 round 2 (Performance 63–65 locally). Open e2e failures not from this work: `camp-quests` (the bounty chip wins the objective lane over an accepted quest, `515f42fe`) and `foundry-lifecycle` (exact float compare of the player's Y).
