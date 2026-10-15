# Steam Store Page v2: Copy, Images and Settings

Date: 2026-10-14. Branch: `dev/sprint-52`. App 4957040 (Steamworks item
1247290). Status: **proposal**. New screenshots are captured and committed in
`steam/store/screenshots-v2/`. Nothing has been uploaded to Steamworks, and no
copy has been changed in the localization pipeline yet.

Companion: [trailer-v4-capture-edit-and-sound-plan-2026-10-14.md](trailer-v4-capture-edit-and-sound-plan-2026-10-14.md).
This supersedes the store-copy sections of `docs/steam-store-assets-plan.md`
(2026-07-13) and `docs/steam-portal-copy.md` § About This Game.

---

## 1. What the live page shows today

Read from `https://store.steampowered.com/app/4957040/Hunker_Bunker/?beta=1`
on 2026-10-14 (store HTML and the `appdetails` API).

| Area | Live state | Problem | Severity |
| --- | --- | --- | --- |
| **Screenshots** | **None.** | A visitor sees no game. Steam's search hover, "More like this" tiles and the page header gallery are empty. | Critical |
| **Trailers** | **None.** Two 8 s 480×270 loops (`extras/scout.intro`, `extras/eng.intro`) sit inside About. | Nothing autoplays. | Critical |
| **About text** | Broken into fragments: "…a tactical survival game about leading" / "a squad through…" / "the lights on…". | The copy in `steam-portal-copy.md` is hard-wrapped at about 80 columns. Steam made each wrapped line its own `[p]` paragraph (visible in `steam/store/localization/storepage_1247290_english.json`). Every language inherits it. | High |
| **Short description** | "Guide your squad of operators through a dark, grid-based cybernetic bunker…" | You play **one** operator per run, and the world is no longer a flat grid. This copy predates the 3D isometric world, camps, hives and the Queen. | High |
| **Feature checkboxes** | Single-player, **PvP, Co-op, In-App Purchases**, Achievements, Cloud, Stats, Leaderboards, **Commentary, Steam Timeline**, Family Sharing | PvP, Co-op, IAP and Timeline are in "Do Not Claim Yet" in `docs/steam-store-feature-claim-checklist.md`. Claiming multiplayer on a single-player game draws refunds and negative reviews at launch. | High |
| **Languages** | Interface + Full Audio + Subtitles in all 7 | 308 narrative lines are voiced in every locale (`public/audio/voice/lines/manifest.json`). Plausible, but confirm that **all** spoken dialogue is voiced per locale before keeping Full Audio. | Verify |
| **Tags** | Includes Walking Simulator, Casual, Open World, Pixel Graphics, Multiplayer, Time Management, Choose Your Own Adventure, Strategy, 2.5D | These steer Steam's recommender toward the wrong players. It is a 3D isometric shooter, not pixel art, not open world, not multiplayer. | High |
| **Genre** | Adventure, Casual, Strategy, **Free To Play** | "Casual" and "Strategy" mis-sell it. Free To Play is a business decision. Confirm it is intended, because it changes the whole page treatment (no price, F2P browsing shelf). | Owner |
| **Capsules** | Painted soldier-in-tunnel art, "HUNKER BUNKER" in a plain sans with a two-color underline | The art doesn't look like the game (no snails, no ice, no iso view). The wordmark is a default font. At 120×45 (search row) it reads as a generic shooter. | Medium–High |
| **AI disclosure / mature content** | Present and specific | Fine. Keep. | — |

Old screenshots (`steam/store/steam_screenshot_0{1..5}_en.png`, never
uploaded) are an intro cutscene with a SKIP INTRO button, two Mothership
dialogue modals, a skill-tree terminal and an archive modal. None show
gameplay. Retire them.

---

## 2. What successful comparable pages do

Pulled with `store.steampowered.com/api/appdetails` on 2026-10-14:

| Game | Shots | Movies | About structure | Short description pattern |
| --- | --- | --- | --- | --- |
| Dome Keeper | 8 | 5 | 6 inline GIFs | Genre phrase + verb list + stakes ("…just hurry back before your dome is destroyed!") |
| Hades | 11 | 3 | 6 ALL-CAPS section headers, one per pillar | One sentence: verb, setting, genre, pedigree |
| SIGNALIS | 11 | 4 | 10 inline images, 237 words | Genre, setting, mystery, protagonist |
| Barotrauma | 15 | 5 | 6 headers ("WELCOME TO EUROPA", "EMBRACE THE ABYSS"…) | Genre in the first clause, then a verb list, then "danger doesn't announce itself" |
| Escape from Duckov | 19 | 4 | 6 headers per pillar | Genre + loop + tone |
| Lethal Company | 9 | 1 | 179 words, no headers | One line: "A co-op horror about scavenging … to sell scrap to the Company." |
| Darkwood | 10 | 2 | 3 images | Positioning line + day/night loop |
| Brotato / Nuclear Throne / Void Bastards | 8–14 | 1–5 | Short, a bulleted feature list | Genre named in the first 6 words |

Patterns this page will follow:
1. **Name the genre in the first clause** of the short description, then the
   loop, then the stakes or the joke.
2. **8–12 screenshots, all gameplay**, with the first four the strongest.
   Those four appear in search hover and recommendation tiles.
3. **About is skimmable**: 4–6 pillar headers (Hades, Barotrauma, Duckov),
   each with one short paragraph and an animated image (Dome Keeper,
   SIGNALIS). About 250–400 words.
4. **The game's voice shows up on the page.** Lethal Company sells "the
   Company". Hunker Bunker's Facilities Director should do the same job.
5. **Trailer #1 is gameplay** (see the trailer plan).

---

## 3. Short description (≤300 characters)

**Recommended (A)**, 279 characters:

> Crash-landed in a frozen sector with one exosuit and a dying oxygen supply. Hunker Bunker is an isometric sci-fi extraction roguelite: raid a hostile bunker, bank salvage to rebuild your ship, and choose between the survivors and the swarm, before the Mothership gives up on you.

**(B) Voice-first**, for an A/B test once there is traffic:

> "Unauthorized exploration detected. Please enjoy the darkness responsibly." An isometric sci-fi roguelite about raiding a bunker that resents you: fight cyber-snails, bank your salvage, rebuild your ship, and decide who survives the ice.

**(C) Shortest:**

> An isometric sci-fi extraction roguelite. Raid a frozen bunker, bank what you can carry, rebuild your ship, and pick a side between the last survivors and the hive that wants your heartbeat.

Every noun is something on screen in the current build: exosuit, oxygen
meter, bunker, banking at the ship console, ship systems, survivor camps,
hives, Mothership uplink, cyber-snails. None of them promises multiplayer or
purchases.

---

## 4. About This Game (paste-ready BBCode)

**Format rule (the bug in §1): one paragraph per line, no hard wraps inside a
paragraph.** The block below is intentionally unwrapped. Image tokens point at
the About-section animations listed in §5.2. Upload those first, or delete
the `[img]` lines.

```text
[img]{STEAM_APP_IMAGE}/extras/hb_about_01_combat.webm[/img]
[p][b]Your ship is down. Your suit is leaking. The bunker below is the only salvage for a hundred kilometers, and it has opinions about visitors.[/b][/p]
[p]HUNKER BUNKER is an isometric sci-fi extraction roguelite. Every run leaves the wreck of your ship for a frozen industrial bunker that rebuilds itself while you are gone. Bring back salvage, rebuild your ship system by system, and go deeper while the air lasts.[/p]
[h2]SALVAGE. BANK IT. GO DEEPER.[/h2]
[img]{STEAM_APP_IMAGE}/extras/hb_about_02_bank.webm[/img]
[p]Oxygen is your clock. Shells, alloy and tech caches are your progress, but only what you bank at the ship survives a bad decision. Push one more room and you might come home rich. Push two and your black box might be all that comes home.[/p]
[h2]THREE OPERATORS, ONE SUIT AT A TIME[/h2]
[list]
[*][b]Scout[/b]: fast, light, sprints through gaps the others can't.
[*][b]Tank[/b]: heavy frame, shockwave stomp, holds the line when the corridor fills.
[*][b]Engineer[/b]: deploys turrets, bridges holes, reroutes the bunker's own systems.
[/list]
[p]Find field weapons on the way down, from scatter repeaters and neon SMGs to a rail marksman, a cryo lance and an M-70 flamethrower, and fabricate better ones at home.[/p]
[h2]THE BUNKER RESENTS YOU[/h2]
[img]{STEAM_APP_IMAGE}/extras/hb_about_03_lights_out.webm[/img]
[p]The facility's AI is still running, still polite, and still on the clock. "Unauthorized exploration detected. Local lighting has been suspended. Please enjoy the darkness responsibly." Then it sends a welcome committee: cyber-snails, crawlers, spore-snails and things that used to be staff.[/p]
[h2]THE SURVIVORS OR THE SWARM[/h2]
[img]{STEAM_APP_IMAGE}/extras/hb_about_04_camp_hive.webm[/img]
[p]You are not the only one down here. Survivor camps trade, plead and lie. Hives pulse beneath the ice and offer something warmer than rescue. Help one, starve the other, and live with what that does to the world. When the Mothership stops answering, a different voice starts.[/p]
[h2]FEATURES[/h2]
[list]
[*]Procedural bunker runs across bunker, cryo and bio sectors, with destructible walls and lived-in rooms.
[*]Three operator classes, field weapons and a persistent skill tree.
[*]Oxygen pressure, salvage banking and a ship you rebuild between runs.
[*]Survivor camps and hives with their own quests, stakes and allegiances.
[*]Bosses including the Queen, and 10 endings.
[*]A fully voiced cast in 7 languages.
[*]Controller support, remappable keys, touch controls and accessibility options.
[/list]
```

Word count is about 380, inside the 250–400 range of the comparables.

**Claims to verify before pasting:**
- "A fully voiced cast in 7 languages": keep only if Full Audio survives the
  §1 check; otherwise say "Voiced story moments".
- "10 endings": 10 `ending-*.webm` in `public/cutscenes/`. Confirm each is
  reachable in the build being sold.
- "persistent skill tree": the Bunker Tree / COMBAT MATRIX.
- "Controller support": keep in sync with the Full Controller Support
  checkbox state.

**Pipeline:** this must go through `scripts/build-steam-store-localization.mjs`
(the `buildAbout` template plus per-language fragments), not be pasted per
language. The English JSON is "exported, never regenerated" today. For this
change, edit the English export by hand to the block above, then update the
generator's template and fragments to the new section structure so the six
other languages get the same fixed markup.

---

## 5. Images

### 5.1 Screenshots: new set (captured 2026-10-14)

Captured from the current build with
`tests/e2e/probes/steam-store-shots.spec.js` on the RTX 2070 (Vulkan ANGLE,
graphics pinned High, auto-adjust off). Rendered at 2× device pixel ratio,
trimmed to 16:9 from the top so the HUD stays whole, and downsampled to
1920×1080 by `scripts/steam-store-shots.sh`.

Upload in this order. **1–4 are the search-hover set.**

Contact sheet: `steam/store/screenshots-v2/contact-sheet.jpg`.

| # | File (`steam/store/screenshots-v2/`) | What it sells | Source take |
| --- | --- | --- | --- |
| 1 | `hb_store_01_scout-cryo-engineering-fight.jpg` | **Hero.** Scout fighting a cryosnail in a lit cryo engineering bay: combat, dressing and the iso look in one frame. | Scout, room fight, zoom 1.35 |
| 2 | `hb_store_02_engineer-bunker-snail-pack.jpg` | Snail pack closing on the player in a bunker corridor, the red biomech monolith, burn splatter | Engineer, flamethrower |
| 3 | `hb_store_03_scout-obsidian-shrine-fight.jpg` | Fight in the giger-obsidian shrine room. Shows the horror-architecture side. | Scout, cryo lance |
| 4 | `hb_store_04_engineer-cryo-scatter-repeater.jpg` | Scatter-repeater triple bolts, cryo sector, snail and crawler in close | Engineer, scatter repeater |
| 5 | `hb_store_05_scout-bio-feeding-chamber.jpg` | Crawlers converging in a bio feeding chamber, gore splatter | Scout, room fight |
| 6 | `hb_store_06_scout-crash-site-dusk.jpg` | The crash site: the downed ship, dusk light, the starting point of every run | Scout, spawn wreck |
| 7 | `hb_store_07_bio-sentinel-pod.jpg` | A huge chitin sentinel pod with a harvest prompt: discovery and salvage | Engineer, furnished room |
| 8 | `hb_store_08_scout-bio-medical-fight.jpg` | Bio medical bay fight, green palette | Scout, room fight |
| 9 | `hb_store_09_cryo-thawing-coils.jpg` | Cryo thawing-coil room, interaction prompt, cold palette | Engineer, furnished room |
| 10 | `hb_store_10_tank-hive-suture.jpg` | Hive Suture: the hive set piece, the other half of the faction choice | Tank, hive site |

Coverage: all three operators (Scout, Engineer, Tank), all three sectors
(bunker, cryo, bio), five combat frames, crash site, hive, two interaction
prompts. Raw 2× frames and alternates from the four capture runs are in the
session scratchpad. Re-run the probe to regenerate them; nothing else depends
on them.

**Not used, and why:**
- Camp frames: a black hemisphere renders under the player and the camp tents
  are untextured brown pyramids. Recapture after an art fix. Camps are a
  selling point.
- Tactical map: mostly empty lines at this point in a run.
- Queen: unusable in three tries (§7).

Screenshot rules applied (Steamworks Graphical Asset Rules and the
comparables): gameplay only, no marketing text on top, no debug UI, no
key art, 16:9 1920×1080, real HUD.

### 5.2 About-section animations (four, 616 px wide)

Steam renders About images at up to 616 px wide. Use WebM/MP4 "extras"
(supported; that is how the two class loops are already embedded), 4–6 s
seamless loops, under 3 MB each. Render them from the trailer captures, so
they arrive with trailer Phase 1:

| File | Content |
| --- | --- |
| `hb_about_01_combat` | Flamethrower or scatter-repeater burst into a snail pack, with a gib |
| `hb_about_02_bank` | Corpse shell pickup, then the ship console bank tick-up |
| `hb_about_03_lights_out` | Room lights die, the flashlight cone sweeps, crawlers appear |
| `hb_about_04_camp_hive` | Split frame: survivor camp fire vs hive pulse |

Retire `scout.intro` / `eng.intro` from About. They show the cutscene, not
play.

### 5.3 Capsule and library art: new briefs

Problem: the current set is one painted image of a generic soldier in a
generic tunnel. The game's identity is **an armored exosuit in an icy
industrial bunker, isometric, facing giant cyber-snails, with
teal-cold/amber-warm light.** None of that appears.

**Route (recommended):** build the key art from the game's own GLBs in
Blender, using the live Blender MCP plus the Player Chassis and enemy models
already in `public/`. The player chassis, a cybersnail and crawlers go in a
frosted corridor with the in-game palette, at a slightly lower angle than
gameplay for drama. Then paint-over. Outcome: the capsule looks like the game
because it *is* the game. The fallback is a commissioned illustration with
this brief.

**Logo / wordmark** (`steam_library_logo` and the capsule title):
- Custom stencil or industrial lettering, "HUNKER" over "BUNKER" stacked.
  Frost on the top edges and a hazard-stripe or bulkhead-plate motif.
- Must read at **120×45** (search row) and on the 462×174 small capsule,
  where the logo should fill about 70% of the width with nearly no art.
- Two colors maximum plus the outline. Test it on Steam's `#1b2838`.

| Asset | Size | Composition |
| --- | --- | --- |
| Header capsule | 920×430 | Logo left-center 55% width. Right: the exosuit's shoulder-lamp beam hitting a snail's shell. |
| Small capsule | 462×174 | Logo only, plus a sliver of the lamp beam. |
| Main capsule | 1232×706 | Hero shot: exosuit (back-three-quarter), lamp cone into the corridor, snail silhouette filling the far end, frost particles. Logo bottom-left. |
| Vertical capsule | 748×896 | Stacked logo top, exosuit low, a snail looming above. Reads as a poster. |
| Library capsule | 600×900 | Same as vertical, logo larger. |
| Library hero | 3840×1240 | **No text.** Wide corridor panorama, safe area centered for the overlaid logo. |
| Page background | 1438×810 | Dark, low-contrast ice/bulkhead texture (not a busy scene). |

Rules (Steamworks): no review scores, awards or "wishlist now" text on base
capsules. The logo is the only text.

---

## 6. Tags (20, in priority order)

Steam weights the top tags most. Replace the current set with:

1. Action Roguelike
2. Top-Down Shooter
3. Roguelite
4. Survival
5. Sci-fi
6. Isometric
7. Twin Stick Shooter
8. Horror
9. Atmospheric
10. Exploration
11. Procedural Generation
12. Multiple Endings
13. Dark Comedy
14. Aliens
15. Base Building
16. Choices Matter
17. Story Rich
18. Space
19. Underground
20. Singleplayer

**Remove:** Walking Simulator, Casual, Open World, Pixel Graphics,
Multiplayer, Time Management, Choose Your Own Adventure, Strategy, 2.5D,
Surreal, Conspiracy.

Check "Base Building" and "Twin Stick Shooter" against the build: turret
building and ship-system rebuild exist, and mouse-aim + WASD / dual-stick
aim exist. Drop either one if a playtester disagrees.

**Genre field:** Action + Indie (+ Adventure). Drop Casual and Strategy. Keep
or remove Free To Play per the owner's business decision.

---

## 7. Feature checkboxes: corrections

Per `docs/steam-store-feature-claim-checklist.md`, updated with today's state:

| Checkbox | Live | Should be | Why |
| --- | --- | --- | --- |
| PvP | ✔ | **☐** | The relay is an experimental prototype; Steam builds are single-player. |
| Co-op | ✔ | **☐** | Same. |
| In-App Purchases | ✔ | **☐ until Valve MicroTxn approval and the live item-store tests pass** | Beta sandbox only (`project_store_purchase_flow`). |
| Steam Timeline | ✔ | **☐** | `steamworks.js` lacks `ISteamTimeline`. |
| Commentary available | ✔ | ☐ unless audio commentary exists | Text commentary only. |
| Full Audio (all 7 languages) | ✔ | Keep **only if** all spoken dialogue is voiced per locale | 308 lines × 7 locales exist. |
| Single-player, Achievements, Stats, Leaderboards, Cloud, Family Sharing | ✔ | ✔ if each acceptance test in the claim checklist passed | Unchanged |

**Also found while capturing (game issues, not store):**
- `startQueenFight()` across three GPU capture sessions (1920×1080 @2×,
  Vulkan): one hang, one renderer crash ("Target crashed"), one completed run.
  In the completed run the boss bar read THE QUEEN 120/120, but she was not
  readable on camera, and six aimed bursts never moved her HP. Investigate
  before the trailer's Act 4 Queen shots.
- The weapon panel title is a static `SIDEARM` (`index.html:1429`,
  `ui.weapon_status.sidearm`). It stays SIDEARM with a field weapon equipped
  (flamethrower, scatter repeater…), and the cache read 240/48 after a swap.
  The trailer's weapon montage would show this.
- Camp frames: a black hemisphere renders under the player at the camp
  center, and the camp tents are untextured pyramids.

---

## 8. Rollout checklist (owner, Steamworks)

1. Uncheck PvP, Co-op, In-App Purchases and Steam Timeline. Decide Commentary
   and Full Audio. This can be done today.
2. Upload screenshots 1–10 from `steam/store/screenshots-v2/` in the §5.1
   order. Delete nothing (none are live).
3. Replace the short description with §3 (A).
4. Replace About with §4 (English by hand first, then regenerate the six
   others after the generator update).
5. Replace tags and genres (§6).
6. Upload the trailer when trailer v4 Phase 4 is approved.
7. Capsules and logo (§5.3) when the art is done. This is the biggest single
   conversion lever once there is traffic.
8. After each change, check the page in an incognito window and on the
   Steam Deck store client (the About section renders narrower there).
