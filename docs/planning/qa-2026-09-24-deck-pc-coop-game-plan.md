# QA 2026-09-24 — Deck + PC co-op session: findings and game plan

Status: plan from one QA session · Updated: 2026-09-24

The owner played the packaged Steam build on a Steam Deck and a Windows PC, two Steam accounts, in co-op. This plan takes every issue they reported, checks each against the exported session logs, and orders the work. Each item says whether the logs **confirm** it, **partly** show it, or do **not** record it (reported by the player only). Nothing here was fixed yet.

## Sources

| | Deck | PC |
|---|---|---|
| Log | `logs/hunker-bunker-session-2026-09-24T21-11-38-478Z-mug11pto-kmzk.json` | `logs/hunker-bunker-session-2026-09-24T21-11-45-579Z-mug11v9w-lew5.json` |
| Build | `v2.4.12-beta-1631488fb33a`, packaged (Steam, Electron 44) | same |
| Account | tuesday-cinema-club (host) | Deadman's Hand (guest) |
| Length | 62 min, 5,529 entries | 4.7 min, 726 entries |
| Play | solo TANK (4 min, ended by mission abort), solo ENGINEER (25 min, died of poison), co-op SCOUT twice (died by pit-fall both times) | co-op TANK (died by pit-fall), redeployed |
| Stage | 1280×800, Steam Deck controller | 2304×1440, keyboard/mouse |

The `logs/` directory is git-ignored; the numbers below are quoted from the logs so this document stands alone. The build is `1631488`, which predates `d0227a0` (Phase 4 transit binding) and the later report fixes on the release branch.

**What the session proves:** two separate Steam accounts joined one relay room, readied, deployed together, saw each other's 3D avatars and redeployed after death on packaged builds — the first real evidence for the two-account co-op gate. No errors were logged on either machine. The leaderboard accepted the co-op run payload.

## Claims

Several agents work this plan at once. Claim an item here, in a commit, before editing its files; `git status` before every edit.

| Item | Owner | Since |
|---|---|---|
| Everything networked (co-op deaths, black boxes, power-up drops, props, world state across TRY AGAIN) | Claude | 2026-09-24 |

## Findings

### P0 — Frame rate on the Deck (confirmed)

- Main-thread render (`frame:render`) median **29.4 ms**, p95 41 ms, over 8,495 samples: the render alone caps the Deck near 34 fps before anything else runs.
- 1,527 long-task windows totalling **1,308 s of a 3,723 s session** (35 %); 35 windows had a single task ≥ 500 ms, the worst 2,583 ms. Largest ones are in `frame:render` and chunk mounts (`chunk:mount:*` median 54–60 ms).
- The GPU timer reports 0.39 ms average on the Deck — not credible against the above; treat it as broken on this device.
- Adaptive quality **engaged on the PC but not on the Deck** (`adaptive=no`), which is backwards.
- PC: render median 19.8 ms at 2304×1440; freezes of **10.3 s** (`world-model:prepare`, 3:16 in) and 4.2 s (0:52).
- `scripts/analyze-session-logs.mjs` reports `longTasks count=0` for both logs: it no longer parses the "Long task window" entries. Its performance line cannot be trusted until fixed.

Plan: profile what `frame:render` spends 29 ms on (draw calls, shadow passes, the invisible-model count below); make adaptive quality engage on the Deck; move chunk mounts and `world-model:prepare` off the frame or split them; fix the analyzer so every future log reports this automatically. Acceptance: a Deck log with render median ≤ 16 ms and no task ≥ 500 ms after the first minute.

### P0 — Everything in co-op must be networked (owner's rule; gaps found in code)

Owner (2026-09-24): power-ups were not seen by both players and did not look the same on both screens; **everything in the game should be networked.**

What is shared today (sent between clients in `src/threeGame.js` / `server/relay.js`): player avatars and positions, downed state, extraction, enemy damage and hits (host-authoritative), destroyed walls, bunker and procedural doors, pickups collected, black box recovered, lore terminals, O₂ generator upgrades, maze access, radio lines, enemy projectiles; boss phases and adds, milestone defeats, descent and encounter formation (through `src/coopTransitions.js`).

What is **not** shared — each machine does it on its own:

| Not networked | Why it diverges | Seen in QA |
|---|---|---|
| In-run power-ups (relic/overclock drops) | `rollEnemyLootDrop(Math.random, …)` rolls on each client and `spawnPhysicalLootDrop` is never sent | "power-ups not seen by both, not the same" |
| Death other than being downed | `playerDowned` is relayed, but a pit-fall calls `handleDeath('pit-fall')` directly and sends nothing | partner shown standing; black box confusion |
| Black box placement | each client records its own; the guest's box reached the host and was "recovered" on the host's death | yes |
| World state across TRY AGAIN | co-op redeploys regenerate the world from the room seed; no maze state is kept | walls came back |
| Destructible props and their drops | `destructible-prop-broken` is local only | not reported |
| Companions | local only | Meridian stuck on one screen |
| Ring 1 events, arrival fight, reward cache, bounty | solo-only by design (Sprint 46/47) | — |

**Status (Claude, 2026-09-24):**

| Gap | Fix | Commit |
|---|---|---|
| Deaths other than downed | every co-op death announces `player-died`; the partner sees the body down where it fell with its black box; TRY AGAIN announces `player-redeployed` | `39a7375` |
| Black box ownership | recoveries carry the owner; a squadmate's recovery no longer wipes ours | `39a7375` |
| Power-up drops | only the host rolls (`dropLootForKill`); `loot-drop-spawned` / `loot-drop-collected` | `39a7375` |
| Relay dropping events in busy fights | streamed effects (projectiles, radio lines) get their own 40/s budget; state events 20/s (was 8/s shared) | `39a7375` |
| World state across TRY AGAIN | a co-op death keeps the run's world changes; a retry in the same room restores them; MAIN MENU clears them | `42c4bbc` |
| Props and their drops | the breaker rolls once and announces `prop-broken` with each drop; the partner breaks the same prop with identical drops and shared pickup ids | `42c4bbc` |
| Solo companion in co-op | co-op starts without the solo profile's companion (companions stay solo until networked) | `1dd8056` |
| Same co-op map every run | each lobby deploy adds fresh entropy to the room seed; TRY AGAIN keeps the map | `caf5816` |

All covered by unit and relay tests (`src/threeGame.coopNetworkedState.test.js`, `server/relaySharedWorldEvents.test.js`); **none is verified on two real machines yet** — the next Deck + PC session should confirm each row. Still open: networked companions; the Sprint 46/47 solo-only systems (Ring 1 events, arrival fight, reward cache, bounty) made host-authoritative instead of solo-only; a two-client probe that diffs both worlds.

Plan: one rule for co-op — **the host decides, everyone sees it.** Anything random that changes the world (drops, props, companions, events) is rolled on the host and broadcast; guests render it. Route every death through a relayed state (not only downed); black boxes carry their owner. Make the Sprint 46/47 solo-only systems host-authoritative instead of solo-only. Add a relay test per event type and a two-client probe that compares both clients' world after a scripted sequence (kill with a drop, break a prop, pit-fall, TRY AGAIN) and fails on any difference.

### P0 — Co-op spawns next to a lethal pit (confirmed)

All three co-op deaths were **pit-falls a few metres from spawn**: Deck at (0.9, −2.3), again 30 s after redeploying at (−0.3, −3.3); PC Tank at (1.4, −1.9). The spawn chunk `0,0` is a "field" with **1,852 void tiles of ~2,336**. Solo spawns elsewhere (the two solo deaths were an abort and poison, far from spawn).

**Fixed (`7480bd9`):** within 24 tiles of the spawn a lethal edge blocks movement instead of killing; farther out cliffs stay lethal. Checked on the real map in a browser: the three QA death spots are blocked with no fall, the ledge stays walkable, a cliff at (−40, −57) is still lethal (`docs/reports/assets/qa-2026-09-24/`). Cause found with a tile dump: the ledge beside the first corridor drops straight into cliff and void with nothing to stop the player.

Original plan: co-op spawn points must be on walkable ground with a clear margin; add a spawn-safety check (and a unit test over seeds) that no void lies within N tiles of either co-op spawn.

### P0 — A partner's death is not shown to the other player (partly confirmed)

- The PC player died at 21:09:41; the Deck host logged **nothing** at that moment — no remote death, downed or body state. The remote avatar stays a standing character (the reported bug).
- Three seconds after the Deck host itself died, it logged `black-box-recovered` for a TANK black box at exactly the PC player's death spot — the guest's black box ended up on the host and was "recovered" after the host was already dead.

Plan: replicate death/downed state to the remote avatar (pose + black-box marker) through `src/coopTransitions.js`; black boxes in co-op belong to their owner and must not be recoverable by the partner's death sequence. Add a log line for remote death so the next session can confirm it.

### P1 — The map never changes (confirmed) and is the wrong shape (confirmed)

- All four deployments — two solo (expedition seeds `expedition-86397314`, `expedition-1961912786`) and two co-op — generated the **same landforms around spawn** (`0,0` field; `1,0`, `−1,0`, `0,1` canyon; `−1,−3`, `−2,−2` canyon; the rest maze).
- Solo campaign geography is fixed per campaign **by design** (conditions re-roll per deployment; see `src/threeGame.expeditionProgression.test.js`). Co-op pins `runEntropy` to 0 and derives the layout from the room seed `run-STEAM-109775242703783293`, so every co-op session in the same Steam room is the same world. Why the solo campaign and the co-op room produce the same spawn neighbourhood is not yet traced.
- **Big square rooms with no hallways:** 15 of 62 generated chunks are "canyon" chunks that are entirely floor (2,030–2,049 floor tiles, 0 walls, **0 portals**) — three of them surround spawn. Another 23 maze chunks use the `large-room` architecture.
- **No camps:** in 62 minutes there is no camp contact, discovery or quest event; only camp props were broken (crates, sandbags at z 33–66).

**Owner's rule (2026-09-24):** after a death, **TRY AGAIN keeps the same map** — right there, with its changes; **MAIN MENU resets the run**, and the next deployment gets a new map. Against the logs: the co-op TRY AGAIN kept the same map (as intended) but restored the destroyed walls (not intended); the Deck's first solo death → MAIN MENU → next deployment produced the **same** spawn neighbourhood (not intended). The cause is a design decision, not a glitch: solo geography is keyed to the campaign (`campaignWorld.js`, route layout per campaign), and only New Campaign changes it. This rule replaces that: the map belongs to the run, not the campaign.

Plan: key the layout to the run — TRY AGAIN reuses the run's seed and saved maze state, MAIN MENU (and a fresh co-op session) draws a new one; keep campaign progress (bank, goals, unlocks) separate from geography; replace all-floor canyon chunks near spawn with rooms joined by corridors (portals on every chunk edge that has a route); grow Ring 1 so the first route has somewhere to go; guarantee a camp within reach of Ring 1 and log camp discovery. Acceptance: three runs each started from MAIN MENU (solo, and co-op in the same room) produce three different spawn neighbourhoods, while TRY AGAIN reproduces the same map with its changes; no chunk within 2 of spawn has zero portals.

### Owner's run and story rules (2026-09-24)

1. **Co-op and PvP:** every new run starts the story fresh. Today the story managers (`arcManager`, `act2Manager`) are profile-wide, so a co-op run reads the solo story (how Meridian appeared) and writes back into it.
2. **Solo:** CONTINUE on the title screen keeps the story. Today only NEW CAMPAIGN resets it; MAIN MENU from a run does not touch it in code (`returnToMainMenuFromRun` respawns with `resetRunState: false`).
3. **Map:** TRY AGAIN keeps the map with its changes; MAIN MENU ends the run, and the next run gets a new map.
4. **Answered:** the owner meant NEW CAMPAIGN — it resets the story, which the game already does (no bug). Campaign world changes (bridges built, camps fortified, hives transformed, shortcuts opened) **count as story**: kept with CONTINUE, reset by NEW CAMPAIGN. Consequence for rule 3: a new map per run can only keep them if they are stored by what they are (camp id, crossing id, hive id), not by map position, so they can be re-applied to the new layout — to check before building the solo half.

### P1 — Co-op does not start fresh (reported; not in the logs)

The player saw Camp Meridian and power-ups at co-op start. The logs have no camp or relic events at the co-op deployment, so where they appeared is unknown (question 3). Code check needed: which solo campaign state (act 2 camps, run drops, bank) the co-op run reads.

Plan: a co-op session starts from a clean shared state; solo campaign progress is neither shown nor applied. Test: start co-op on a profile with solo progress and assert none of it is visible.

### P1 — The Meridian companion gets stuck and does nothing (reported; cause found in code)

Owner: the Meridian recruit sits stuck behind a wall, does nothing, cannot be led anywhere, does not walk and shoot like an ally, and should walk to our camp instead of getting stuck in a corner. It was also present at co-op start (see "Co-op does not start fresh").

Cause, from `updateCompanions` in `src/threeGame.js` and `src/companionFollow.js`:

- **No pathfinding.** A companion steers in a straight line toward a point 2 m behind the player and slides along a wall only when one axis is free. Any wall between them pins it; the only recovery is a teleport when it is more than **16 m** away, so anywhere closer it stays stuck. There is no pathfinder anywhere in the codebase.
- **It barely fights.** A wanderer companion fires one 2-damage shot, then waits its assist cooldown (12–25 s, e.g. `Covering Fire` 15 s) before the next; there is no aim, no movement toward threats and no retreat.
- **It only follows.** No other behaviour exists — nothing that takes it to a camp or lets the player direct it.

Plan: a bounded grid path search over `isSnailTileWalkable` (re-planned every ~0.5 s or when blocked) so the companion walks around walls to the player; a stuck detector that re-paths, then relocates behind the player when no path exists; a combat loop — keep a firing position with a clear lane (`hasCompanionFireLane` already exists), fire at a steady rate, use the assist ability on its own cooldown; an escort goal — once recruited, the companion can be led to (or sent to) the player's camp and settles there, with its arrival logged. Acceptance: a unit test with a wall between companion and player where the companion arrives within N s; a probe where the companion follows through three rooms without teleporting and kills a hostile; a log line for companion stuck/re-path/arrived-at-camp.

### P1 — Destroyed walls come back after death (reported; not in the logs)

The logs record wall damage and destruction (`wall:destroy` 18×) but nothing about persistence. In co-op the redeploy regenerates the identical world (above), which would restore walls; the solo campaign saves maze state, co-op does not.

Owner's rule: TRY AGAIN continues the same map, so destroyed walls and opened routes must stay destroyed on a retry, in solo and co-op (host-authoritative in co-op); MAIN MENU starts over with a new map.

Plan: carry the run's maze state across TRY AGAIN (co-op: the host's state, sent to the guest on redeploy); clear it on MAIN MENU. Acceptance: break a wall, die, TRY AGAIN — the wall is still broken on both machines; die, MAIN MENU, deploy — a different map.

### P1 — Steam Vault trade-up does not stick (partly confirmed)

On the Deck, across two Vault visits, SMELT was clicked about 30 times; the card still read **"RARE → EPIC OWNED: 5 / 5"** throughout. "UNCOMMON" went 20 → 160, matching 14 "Cryo-Alloy Ingot Pack (x10)" purchases — purchases stick, smelts apparently do not. The log has **no result line for any smelt**, so it cannot say whether the smelt failed or the display did not refresh.

Plan: log every smelt result (inputs consumed, output granted, Steam inventory response); fix so a completed smelt is reflected immediately and after reopening. Acceptance: smelt 5 → 1 and see both counts change, close and reopen, counts unchanged.

### P1 — One item presentation across Armory, Foundry, hero screen and Vault (reported; mismatches found in code)

Owner (2026-09-24): the Foundry UI is out of date with current standards; weapon and item images do not match; the Armory, the in-game Foundry and the hero screen should use the same UI — make it all one, and better.

What the code shows — four surfaces, three unrelated art pipelines:

| Surface | Where | Item art comes from |
|---|---|---|
| Foundry (Fab Bay) | `src/fabricator.js` recipes, markup in `main.js` | generic numbered cards `/schematics/schematic_00–07.webp`; broken images fall back to `bunker_junk_rare.png` |
| Armory | `src/armoryUi.js`, `src/armoryPicker.js` | `/economy/<model>.png` derived from the item's 3D model (`resolveItemIcon` → `deriveIconFromModelUrl`), else the item's initials |
| Steam Vault | `src/steamVaultUi.js` | `/economy/<id>.png`; one hardcoded chassis picture per class |
| Hero screen | `src/scoutHeroPreview.js` | live 3D class preview |

Mismatches this produces:

- **The six Foundry weapons exist only in the Foundry.** `mk1_sidearm`, `pulse_carbine`, `scatter_rep`, `rail_marksman`, `neon_smg` and `cryo_lance` appear in no other source file — no 3D model, no Armory icon, no weapon entry — yet fabricating one equips it by that id. The Armory can only show initials for it.
- **Different items share one picture.** `schematic_05` is both CRYO LANCE and CRYO-CAPACITOR; `schematic_06` both GEODETIC COMPASS CHARM and ECHO-LOCATION TRANSCEIVER; `schematic_07` is THERMAL HEAT EXCHANGER, KINETIC IMPACT BUSHING and SPORESNAIL PEARL CHARM; BIO-HAZARD FILTER uses RAIL MARKSMAN's `schematic_03`.
- **Recipe ids name different things than they grant** (`salvage_drill` → GEODETIC COMPASS CHARM, `exo_plating` → THERMAL HEAT EXCHANGER, `tallow_thermal_wrap` → CRYO-CAPACITOR), which makes the mapping easy to get wrong again.
- The Deck log shows three Fab Bay visits (activate, fabricate, view reveal) but records neither the previewed model nor the granted item, so the mismatch cannot be confirmed from logs alone.

Plan:

1. **One item catalog.** Every weapon, mod, charm, skin and relic has one entry — id, localized name key, rarity, kind, class, 3D model, and one icon — that every surface reads. Foundry recipes reference catalog ids instead of defining their own items; the six Foundry-only weapons either get real catalog entries (model, stats, icon) or are removed.
2. **One item card and one preview.** A single card component (art, name, rarity, kind, cost/state) and a single 3D preview, used by the Armory, the Foundry, the hero screen and the Vault, built to the Armory's current styling (the newest, token-based design) unless the owner picks another.
3. **Art that matches the item.** Icons rendered from each item's own model (the Armory's existing rule), so the card, the preview and the in-game model always agree; no shared placeholders, no junk fallback for shipped items.
4. **Log it.** Every fabricate logs recipe id, previewed item and granted item.

**Owner's design (2026-09-24): the Foundry is one hub with tabs, some locked.** It is more than one thing: it is the player's **stash** (resources and owned items) and where things are **made**. It opens from the **main menu** and **in game** (at the Foundry). **Making things must be unlocked during a playthrough, but the player can always see their resources**, even before the unlock.

Today these are two unconnected windows: the Steam Vault (main menu; tabs for owned inventory, smelter & dispensary, store) and the Fabrication Bay (in game; unlocked by discovering the Foundry in a run and paying its activation cost, with a "have / need" readout). The hub merges them:

| Tab | Available | Contents |
|---|---|---|
| Stash | always, main menu and in game | resources (bank and carried), owned weapons, mods, charms, skins, relics — one card per item from the one catalog |
| Loadout | always | what the Armory does today, on the same cards and 3D preview |
| Fabricate | **locked** until the Foundry is discovered and activated in a playthrough; shows what unlocks it and the player's progress toward the cost | recipes and printing |
| Trade-up (smelter) | per current Vault rules | 5→1 trade-ups; results logged and reflected immediately (see the smelter item) |
| Store | per current Vault rules | Quartermaster purchases |

Locked tabs stay visible with their unlock condition, never hidden.

**Look (owner, 2026-09-24):** Loadout is a tab of the hub. The hub uses the **Armory's look as its base**, made **more in theme with the game** (the in-run HUD's bunker/terminal styling) and **themed to the active class**. The class theme already exists for the Armory — `--armory-accent` / `--armory-accent-secondary` per class in `style.css` (Scout `#00f0ff`, Tank `#ff9f1c`, Engineer green), from [armory-ui-redesign-and-class-theming-spec.md](../armory-ui-redesign-and-class-theming-spec.md) — so the hub reuses those tokens across every tab, and switching class in the Loadout tab re-themes the whole hub. No hard-coded colours; every string localized (today's "READY TO ACTIVATE" in the Fab Bay is not). In-game access opens the same hub (at the Foundry, the Fabricate tab first); the main menu opens it at Stash. The hero screen uses the same item cards and preview.

Acceptance: a test that walks every catalog id through each surface's card data and asserts the same name, rarity and image everywhere; no two items share an image; no shipped item falls back to initials or a placeholder; a screenshot set of one item in all four surfaces.

### P2 — Models invisible in large rooms (reported; not a load failure)

Every model fetch in both logs returned 200 OK; no load errors. So invisible models are a placement/visibility problem, not missing files. Some fetches were slow (up to 3.5 s on the PC).

Plan: identify which models (question 5); log model mounts that end up with no visible mesh.

### Logging gaps found

Remote death/downed, black-box ownership, wall persistence, smelt results, fabricate output, invisible model mounts, the analyzer's long-task parser. Each is listed with its item above; closing them is part of the fix, so the next QA session can confirm it from logs.

## Questions for the owner

1. ~~Map variety~~ — **answered:** TRY AGAIN keeps the map; MAIN MENU resets the run and the map.
2. ~~Co-op persistence~~ — **answered:** on TRY AGAIN the map continues, so destroyed walls stay destroyed; MAIN MENU starts fresh.
3. ~~Co-op fresh start~~ — **answered:** Meridian appeared as the recruited companion following the player (stuck behind a wall); see the companion item. Power-ups: **answered** — they were not seen by both players and looked different; see "Everything in co-op must be networked".
4. ~~Foundry~~ — **answered:** the UI is out of date and item images do not match; Armory, Foundry and hero screen should be one UI (see "One item presentation"). The hub design and look are answered (Stash / Loadout / Fabricate (locked until unlocked in a playthrough) / Trade-up / Store; Armory look, in the game's theme, class-themed). Still open: is "trade in / trade up" the smelter (the logs point there)?
5. **Invisible models.** Which objects, in which rooms?
6. ~~22-minute gap~~ — **answered:** the owner turned the Deck off and came back. The log agrees: last entry 20:16:22 on the main menu, next 20:38:19; input, Steam and the controller came back at once and the next deployment started 35 s later, with 1.7 s and 1.1 s stalls just after waking. This was a suspend **at the menu**, not mid-expedition, so resuming an interrupted expedition (Invisible Essentials Phase 1) is still untested on hardware. Also seen: after MAIN MENU on the results screen the app phase never left `gameover` (the next logged transition is `gameover -> armory`), which may be part of why MAIN MENU did not reset the run.

## Status against tonight's QA gates

| Gate | From this session |
|---|---|
| Two-account co-op (join, ready, deploy, avatars, redeploy) | **Observed** on packaged builds |
| Deck frame pacing | **Failed** (render median 29.4 ms; 35 % of the session in long tasks) |
| Suspend/resume | **Observed at the menu** (22 min off, resumed cleanly); mid-expedition resume not exercised |
| Steam Cloud | Available, not exercised |
| Achievements | Events recorded; no unlock verified |
| Leaderboard | Co-op payload accepted |
