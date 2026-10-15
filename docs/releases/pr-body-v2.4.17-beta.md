# Release PR: v2.4.17-beta — Base Rebuild & Carry, Field Weapons & Flamethrower, Lived-in World, Lower-Console HUD, Playtest Fixes

**Target Branch:** `mothership` ← **Source Branch:** `dev/sprint-52`

---

## Summary

Sprint 52, from `v2.4.16-beta` (`920f2406`) to `dev/sprint-52`: 110 commits. Release notes: [`docs/releases/v2.4.17-beta.md`](https://github.com/grounded-play/hunker-bunker/blob/dev/sprint-52/docs/releases/v2.4.17-beta.md).

- **Base rebuild and carry:**
  - two-handed carry, with mass slowdown and stagger drops;
  - glowing install sockets that snap the load in;
  - a sealed first-night berth (carry the cot, recover walls and doors, sleep);
  - berth pressure and breach repair;
  - stranded cargo, plus camp and hive handoffs;
  - ship rebuild from recovered modules.
- **Weapons:**
  - physical field weapons;
  - the M-70 flamethrower (swept cone, burning, meltable ice gates, a thermal alternate route);
  - guns held muzzle-out in the hand, with the Armory close-up matching the hero;
  - sheens that keep the paintwork;
  - Armory picks that survive the launch.
- **World:**
  - biome door families, and every door between rooms now drops into the floor;
  - a two-zone crash approach with the exit walled;
  - N-way floor blending without specular sparkle;
  - semantic wall runs, staged ledge collapse, and coverage and exposure guarantees.
- **Art:** 40 pass-2 world-story GLBs, 60 world-expansion models, 12 PBR surface suites and 48 keyed decals, all placed, lit, interactive and destructible.
- **Audio:** room tones, indoor/outdoor acoustics, point emitters, surface impacts, casing Foley, and OST rotation.
- **HUD and UI:**
  - a unified lower console with a circular named minimap;
  - a weapon panel that names the gun in hand (not SIDEARM);
  - Vault stacking, one Settings tab bar, and a transactional cache reveal;
  - one spatial menu navigation model (Start pauses again; destructive confirms open on CANCEL).
- **Cinematics:** tactical terminal intro and credits, a comms HUD overlay, the briefing video behind dialogue, and skippable opening videos.
- **Tooling:** trailer v4 (virtual-time capture, beat grid, SFX kit, EDL assembler, five cuts), the store page v2 plan, and a weapon-fit capture script.
- **Security and quality:**
  - every CodeQL alert open on `dev/sprint-52` is fixed (`ee041c20`);
  - the 19 unused Python imports and locals flagged by the code-quality bot, and found by the local quality suite, are removed (`e0539d5f`).
- **Boot performance** (`56f74c81`): the title screen no longer loads the 22 MB briefing film or the 3D hero preview. Lighthouse is back to its release level (see Verification).

## Tickets

No open issue is closed by this PR: each remaining item needs hardware, two Steam accounts or an installed build. This PR moves them as follows.

Refs #77, #85, #53, #52, #45 · supersedes Dependabot #108 and #109 (closed; their bumps are in `caff840e`)

| Ticket | In this PR | Still needed |
| :--- | :--- | :--- |
| #77 Playthrough remediation (Armory) | Armory picks survive launch (`822a27cf`); guns face away and sit in the hand, close-up matches hero (`c1cfca67`); hero shows the armed loadout (`60007a19`, `5e69ac4f`) | #85 |
| #53 Deck controller-only acceptance | One spatial navigation model; Start pauses mid-run; confirms default to CANCEL (`c9ad9a26`); Hero Select and Armory D-pad edges (T8, `a60d53a3`) | The route on a physical Deck |
| #52 GPU / frame pacing | Resident chunks bounded to 5×5, frame-budgeted mounting, split profiler buckets (T10, `a60d53a3`) | A fixed-route Deck and PC capture against the p95 targets |
| #85 Two-account co-op | Chat is multiplayer-only in the new console (`755ba7a5`) | A two-account session on this build |
| #45 Ship gates | Umbrella | Close with the above |
| #106 Mobile Lighthouse | Not addressed | — |
| CodeQL #104, #106–#113 | Fixed in `ee041c20` (#105 was already fixed) | They close on the next scan |

Internal tickets closed: playtest remediation T1–T10 ([plan](https://github.com/grounded-play/hunker-bunker/blob/dev/sprint-52/docs/planning/playtest-remediation-steam-deck-and-pc-2026-10-12.md)); Sprint 52 A1–A7 and C–G ([sprint doc](https://github.com/grounded-play/hunker-bunker/blob/dev/sprint-52/docs/planning/sprint-52-playthrough-2026-10-07.md)). B1 (walk-through archways) is reopened.

## Scope

### Type of change

- [x] Bug fix
- [x] Player-facing feature/change
- [ ] Platform / Steam / multiplayer
- [x] Performance / reliability
- [ ] Refactor / ownership extraction
- [x] Asset / content / audio / 3D
- [x] Documentation / release governance
- [ ] Breaking change / migration

### Explicit non-goals

- No Steam upload, backend deploy or store-page change ships with this PR.
- Trailer v4 renders are local (`dist/`, gitignored), not part of the build.

## Evidence reached

- [x] **Designed**
- [x] **Coded**
- [x] **Connected**
- [x] **Tested**
- [x] **Live-verified** for:
  - Armory skins into the run (8 chassis skins);
  - weapon fit on every gun and finish;
  - the door drop;
  - the HUD weapon label;
  - the floor blend;
  - the trailer captures.
- [ ] **Packaged-verified**
- [ ] **Accepted**

**Highest honest evidence state:** Live-verified in a GPU dev build for the items above; the rest is Tested.

## Verification performed

### Automated (clean worktree at the release head)

- [x] `npm run lint`: 0 errors
- [x] `npm run audit:dependencies`: ok (every production dependency referenced)
- [x] `npm run coverage`: 6,152 tests across 718 files, all passing
- [x] `npm run presubmit`: passing (Steam claims, SFX plan, retail assets, item and trade-up catalogs, soundtrack, chroma-green, economy icons)
- [x] `npm run i18n:audit`: unchanged against baseline (markup and runtime unchanged, 4 fewer orphan keys)
- [x] `npm run audit:docs`: passing; a clean checkout still flags 9 links to gitignored local files (art sources, logs, Steam config), the same as at `v2.4.16-beta`
- [x] `npm run build`: ok (build-media audit: 50 required door and cinematic assets)
- [x] `npm audit --omit=dev`: 0 vulnerabilities
- [x] Lighthouse CI (`lighthouserc.json`, `lhci` locally): the first run on this PR failed (performance 0.61, TBT 990 ms). Fixed in `56f74c81`. Locally: performance 0.95–0.96, TBT 36–69 ms, LCP ~1.37 s, 954 KB; all assertions pass (v2.4.16-beta measured 0.96 and 41 ms on the same machine)
- [x] CodeQL 2.27.2 locally with the CI suites (`security-extended`, `security-and-quality`; Python `security-and-quality`: 0 results after `e0539d5f`): 2 JS results, both `js/http-to-file-access` already dismissed as won't fix on GitHub (#54, #60); no new alerts

### Environment-specific / human

- [x] Browser/dev live verification (GPU, Vulkan ANGLE)
- [ ] Packaged Electron verification
- [ ] Steam-launched installed build
- [ ] Physical Steam Deck / 1280×800
- [ ] Human visual/audio acceptance

## Known gaps / carry-forward

- None of this is verified on an installed Steam build, a physical Deck or with two accounts.
- B1 walk-through archways are reopened.
- The Deck and PC p95 targets have not been re-measured.
- The trailer v4 cuts wait for the owner's watch-through.

## Reviewer focus

1. `src/data/weaponModelFrames.js` and `src/weaponModelFrame.js`: the per-model yaw and grip data. A replaced weapon GLB needs a new entry; a test checks coverage.
2. `main.js` `resetRunToStartingState`: `loadout.resetRunGear()` replaces `loadout.reset()`. Only the fabricated weapon resets per run.
3. `src/proceduralDoors.js`: every family uses `sink-floor`, and old saved motions sink too.

---

## Commit ledger (110 commits, `v2.4.16-beta..dev/sprint-52`, oldest first)

| # | Commit | Date | Subject |
| ---: | :--- | :--- | :--- |
| 1 | `c98456cb` | 2026-10-11 | docs: playtest remediation plan for steam deck and pc sessions (2026-10-12) |
| 2 | `ff136222` | 2026-10-11 | docs: consolidate playtest remediation findings |
| 3 | `a60d53a3` | 2026-10-12 | fix: remediate deck and pc playtest issues |
| 4 | `257403b6` | 2026-10-12 | fix: move expedition HUD into readable lower third |
| 5 | `48305149` | 2026-10-12 | docs: plan unified lower console HUD |
| 6 | `755ba7a5` | 2026-10-12 | feat(hud): implement unified lower console HUD with enlarged named map and multiplayer-only chat |
| 7 | `08e6e161` | 2026-10-12 | fix(hud): circle radar clipping and latent cover row guard |
| 8 | `d5ea2513` | 2026-10-12 | feat(hud): edge-to-edge lower console with stylized cutout overlays and circular minimap |
| 9 | `91ec86c6` | 2026-10-12 | feat(art): ingest, optimize, and register 40 world-story GLBs, PBR floor texture arrays, and keyed decals |
| 10 | `fab01707` | 2026-10-12 | fix(hud): prioritize readable unified console |
| 11 | `cbae3a91` | 2026-10-12 | fix(hud): align hero-style console frame |
| 12 | `d00defb7` | 2026-10-12 | fix(hud): clarify color-coded pickup counters |
| 13 | `6486e7cf` | 2026-10-12 | feat: ingest and integrate Pass 2 world-story props, PBR surfaces, and decals into gameplay |
| 14 | `eba70e7c` | 2026-10-12 | docs: author comprehensive lighting, interaction, and spatial overhaul plan for all recent GLBs |
| 15 | `e1d67476` | 2026-10-12 | feat(props): implement lighting, interaction specs and fx for 19 pass-2 world story glbs |
| 16 | `8ffa4f21` | 2026-10-12 | feat(props): implement practical lighting, interaction specs and fx for waves D, E and F (61 models) |
| 17 | `85d641b0` | 2026-10-12 | fix(props): use ThreeGame.triggerCameraShake in tank_orbital_siege_cannon interaction |
| 18 | `f14c6dd0` | 2026-10-12 | feat(audio): integrate AudioCraft neural Foley and layered soundsets |
| 19 | `17597035` | 2026-10-12 | feat(audio): ambient room tone beds, outdoor-indoor acoustic transitions, and OST playlist rotations |
| 20 | `0f5f55e0` | 2026-10-12 | docs: master plan for hyper-localized audio, weapon soundsets, casing ejection VFX, and persistent trails |
| 21 | `634c6883` | 2026-10-12 | feat(audio): implement room tones, dynamic indoor/outdoor acoustics, non-infinite OST rotation, and 3D casing Foley |
| 22 | `5610b5d6` | 2026-10-12 | feat(audio): ambient point emitters, dynamic acoustics filter, surface impacts, and advanced 3D spatial coverage |
| 23 | `5f887783` | 2026-10-12 | feat(world): enforce doorway and recent prop coverage |
| 24 | `dffbc224` | 2026-10-12 | feat(world): add supported biome door families |
| 25 | `29ad2639` | 2026-10-12 | feat(weapons): add run-only field weapon state |
| 26 | `1096bcb0` | 2026-10-12 | feat(base): add owned two-handed carry state |
| 27 | `619b666c` | 2026-10-12 | feat(weapons): add physical field weapon runtime |
| 28 | `05ffc69a` | 2026-10-12 | feat(audio): add room tone acoustic feature suite, 3D casing Foley polish, and ovipositor geometry fix |
| 29 | `7e783ad1` | 2026-10-12 | feat(world): author wide two-zone crash approach |
| 30 | `8331043e` | 2026-10-12 | feat(walls): plan semantic wall runs and instanced facade presentation |
| 31 | `36a8f510` | 2026-10-12 | feat(utility): deterministic utility network planner and cable socket registry |
| 32 | `e510ef1b` | 2026-10-12 | feat(combat): flamethrower swept weapon profile, burning status effect, and meltable ice gate system |
| 33 | `d6b8eb43` | 2026-10-12 | feat(base): base modules catalog, sealed-room oxygen model, and companion cover-carrier stance |
| 34 | `d666b73c` | 2026-10-12 | docs(audit): 98-prop audit artifact, room exposure budgets, and updated master plan progress |
| 35 | `963a77dd` | 2026-10-12 | docs(art): author 20 generation prompts and ingestion contracts for flamethrower, ice gates, and base assets |
| 36 | `36d30ab7` | 2026-10-12 | docs(art): rewrite prompts 10-20 with signature biomechanical body horror eroticism |
| 37 | `993e2b91` | 2026-10-12 | feat(art): integrate rebuild and flamethrower GLB cohort |
| 38 | `3486b9f0` | 2026-10-12 | feat(gameplay): add live flamethrower ice gate cache |
| 39 | `c6359780` | 2026-10-13 | feat(base): add first-night cot carry and sealed sleep |
| 40 | `599da297` | 2026-10-13 | feat(base): simulate berth pressure and leak status |
| 41 | `126f821a` | 2026-10-13 | feat(base): require wall and door recovery for first night |
| 42 | `f4fb4419` | 2026-10-13 | feat(base): recover and track stranded mission cargo |
| 43 | `863b4f2c` | 2026-10-13 | feat(base): add breach damage door cycling and repair |
| 44 | `a0b8af0c` | 2026-10-13 | feat(missions): add camp and hive cargo handoffs |
| 45 | `80113a0e` | 2026-10-13 | feat(world): enforce clear thresholds and distinct door motion |
| 46 | `baffc199` | 2026-10-13 | feat(world): guarantee authored room and hallway exposure |
| 47 | `7af35467` | 2026-10-13 | feat(base): add physical ship rebuild cargo loop |
| 48 | `a865070e` | 2026-10-13 | feat(progression): require recovered ship modules |
| 49 | `d09913e0` | 2026-10-13 | feat(carry): add mass mobility and stagger drops |
| 50 | `6bc5ba60` | 2026-10-13 | all the agents have no more tokens |
| 51 | `75c4cdb9` | 2026-10-13 | fix(world): restore floor shaders and open crash exit |
| 52 | `5c284128` | 2026-10-13 | docs(ui): add Foundry/Vault/Settings remediation plan and audit captures |
| 53 | `dacca113` | 2026-10-13 | fix(ui): stack vault inventory and unify settings tabs |
| 54 | `f21245bc` | 2026-10-13 | fix(ui): make cache reveal transactional |
| 55 | `c018786a` | 2026-10-13 | test(ui): cover vault and settings layout matrix |
| 56 | `db801373` | 2026-10-13 | feat(world): add alternate-route thermal gate |
| 57 | `a7abbb17` | 2026-10-13 | feat(camp): add first-night cot handoff |
| 58 | `386c3f45` | 2026-10-14 | docs(world): plan floor door and wall fixes |
| 59 | `a950c20b` | 2026-10-14 | fix(world): blend crash floor and repair breach paths |
| 60 | `cc1c2507` | 2026-10-14 | docs(world): plan mixed spaces and crumbling ledges |
| 61 | `8035f4aa` | 2026-10-14 | fix(traversal): stage fragile ledge collapse |
| 62 | `bc3f5b30` | 2026-10-14 | feat(world): vary exterior traversal spaces |
| 63 | `33d40e1a` | 2026-10-14 | docs(assets): plan model placement and armed hero audit |
| 64 | `d5e1ba9f` | 2026-10-14 | fix(world): require support for wall machines |
| 65 | `91a031ec` | 2026-10-14 | test(assets): inventory runtime model presentation metadata |
| 66 | `52b1f0ec` | 2026-10-14 | fix(world): expand wall machine and fixture classification |
| 67 | `b7311811` | 2026-10-14 | fix(weapons): calibrate upright grip rotation and sight axes |
| 68 | `60007a19` | 2026-10-14 | feat(hero): present equipped armed loadout and reactive charm |
| 69 | `a9d0f2cf` | 2026-10-14 | feat(art-pipeline): add ingestion, decal keying, and photorealistic PBR generation scripts for expansion props |
| 70 | `b38fb921` | 2026-10-14 | asset(3d): ingest 59 high-fidelity optimized GLB models for interactive world expansion |
| 71 | `48deddb6` | 2026-10-14 | asset(textures): add 12 photorealistic seamless PBR surface suites and 48 keyed decals |
| 72 | `2b302f86` | 2026-10-14 | feat(world-props): wire up 60 expansion models with dimensions, interactions, dynamic lighting, and showroom exhibition |
| 73 | `7fa6ed1a` | 2026-10-14 | docs(world-expansion): update master plan and 60-prop prompts with ingest status and verification report |
| 74 | `da8603d3` | 2026-10-14 | feat(art): integrate 60 world expansion models into room dressing kits, vignettes, and decal scales |
| 75 | `0517afd4` | 2026-10-14 | feat(world): integrate world expansion models into theme catalogs and map environmental floor surfaces |
| 76 | `9e48d3f2` | 2026-10-14 | docs(plan): record completion of room dressing, vignettes, theme catalogs, and floor splats |
| 77 | `f16a8eaf` | 2026-10-14 | fix(assets): audit expansion model coverage |
| 78 | `5e69ac4f` | 2026-10-14 | fix(hero): preserve finishes and animate ready aim |
| 79 | `1c943f5a` | 2026-10-14 | fix(textures): enforce room decal support surfaces |
| 80 | `c9ad9a26` | 2026-10-14 | fix(input): one spatial menu navigation model for keys, WASD and pads |
| 81 | `40006f5f` | 2026-10-14 | fix(world): keep expansion dressing destructible |
| 82 | `51e191b9` | 2026-10-14 | docs(plan): record model audit verification |
| 83 | `a0a399a0` | 2026-10-14 | docs(cinematics): plan ff-tracking tactical video generation pipeline |
| 84 | `593cd687` | 2026-10-14 | feat(cinematics): generate tactical terminal credits and intro videos using ff-tracking |
| 85 | `5e6805e7` | 2026-10-14 | docs(steam): store page v2 plan, trailer v4 plan, new gameplay screenshots |
| 86 | `00bf27e1` | 2026-10-14 | feat(cinematics): implement alternative verbatim timed intro and tactical terminal cutscene |
| 87 | `2d71d1a1` | 2026-10-14 | feat(cinematics): overlay UI headshot and live comms HUD over tactical intro video |
| 88 | `75de8275` | 2026-10-14 | feat(juice): implement hyper-localized point audio emitters, weapon profiles, persistent trails & casing foley |
| 89 | `a086ed1f` | 2026-10-14 | feat(trailer): v4 virtual-time capture, beat grid, FX kit, EDL assembler and cuts |
| 90 | `dc333891` | 2026-10-14 | fix(weapons): calibrate upright weapon holding orientation and hero/armory idle stance loop |
| 91 | `91a09c38` | 2026-10-14 | fix(world): wall the crash exit, drop walk-through kit cap, calm pickups and bloom |
| 92 | `033dce08` | 2026-10-14 | fix(cinematics): wire tactical briefing video as dialogue background and fix cutscene playback |
| 93 | `caff840e` | 2026-10-14 | deps: bump the npm-minor-and-patch group with 4 updates (#108) and codeql-action (#109) |
| 94 | `0e48c330` | 2026-10-14 | fix(floor): blend every surface at a junction, tame specular sparkle |
| 95 | `c45562c7` | 2026-10-14 | ci: fix steam-build remote backend default, adjust asset allowances and clean linter warnings |
| 96 | `4fc1f8a7` | 2026-10-15 | docs(trailer): revise v4 cut with films, VO-synced text clips, class skins and arsenal |
| 97 | `2b7b80d6` | 2026-10-15 | fix(cinematics): enable mouse cursor visibility, clickable skip button, and any-key/controller skip in opening videos |
| 98 | `822a27cf` | 2026-10-15 | fix(loadout): keep Armory picks when a run launches |
| 99 | `4fb256f3` | 2026-10-15 | feat(carry): add glowing bed install socket, easy drop, and zone auto-snap |
| 100 | `8c8b6e7d` | 2026-10-15 | chore(tools): add weapon fit capture script |
| 101 | `c1cfca67` | 2026-10-15 | fix(armory): guns face away from the operator, sit in the hand, match the close-up |
| 102 | `68c5a8df` | 2026-10-15 | feat(doors): change door animations from hinged swing to vertical drop into ground |
| 103 | `6046ed3b` | 2026-10-15 | fix(doors): every door between rooms drops straight into the floor |
| 104 | `2029327d` | 2026-10-15 | feat(vfx): style damage popup as circular gradient with outlined drop-shadow text |
| 105 | `4faf9b31` | 2026-10-15 | feat(hud): weapon panel names the gun in hand instead of SIDEARM |
| 106 | `ee041c20` | 2026-10-15 | fix(security): clear the open CodeQL alerts on dev/sprint-52 |
| 107 | `a55d5928` | 2026-10-15 | release: v2.4.17-beta (Sprint 52) |
| 108 | `e0539d5f` | 2026-10-15 | chore(quality): remove unused Python imports and locals flagged on PR #110 |
| 109 | `56f74c81` | 2026-10-15 | perf(boot): stop loading the briefing film and the 3D hero at the title |
| 110 | (this commit) | 2026-10-15 | docs(release): v2.4.17-beta notes and PR body cover the boot fix and the quality cleanup |
