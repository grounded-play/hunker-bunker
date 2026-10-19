<p align="center">
  <img src="./steam/store/steam_main_capsule_en.png" alt="Hunker Bunker key art: an armed operator at the mouth of a glowing hive tunnel in a frozen bunker" width="880">
</p>

# HUNKER BUNKER

<p align="center">
  <a href="https://github.com/grounded-play/hunker-bunker/actions/workflows/presubmit.yml?query=branch%3Amothership"><img src="https://img.shields.io/github/actions/workflow/status/grounded-play/hunker-bunker/presubmit.yml?branch=mothership&label=tests%20%2B%20coverage&logo=vitest" alt="Tests and coverage status on mothership"></a>
  <a href="https://github.com/grounded-play/hunker-bunker/actions/workflows/steam-build.yml?query=branch%3Amothership"><img src="https://github.com/grounded-play/hunker-bunker/actions/workflows/steam-build.yml/badge.svg?branch=mothership" alt="Steam package status on mothership"></a>
  <a href="https://github.com/grounded-play/hunker-bunker/actions/workflows/codeql.yml?query=branch%3Amothership"><img src="https://github.com/grounded-play/hunker-bunker/actions/workflows/codeql.yml/badge.svg?branch=mothership" alt="CodeQL status on mothership"></a><br>
  <a href="https://github.com/grounded-play/hunker-bunker/actions/workflows/lighthouse.yml?query=branch%3Amothership"><img src="https://github.com/grounded-play/hunker-bunker/actions/workflows/lighthouse.yml/badge.svg?branch=mothership" alt="Lighthouse status on mothership"></a>
  <a href="https://app.netlify.com/projects/hunkerbunker/deploys"><img src="https://api.netlify.com/api/v1/badges/3d99b6f8-2e77-4a86-8292-1fffe5c9c308/deploy-status" alt="Netlify Status"></a>
  <a href="https://discord.gg/XXwwz3rauu"><img src="https://img.shields.io/badge/Discord-Join%20Server-5865F2?logo=discord&logoColor=white" alt="Discord Server"></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT"></a>
  <a href="https://threejs.org/"><img src="https://img.shields.io/badge/Three.js-r186-00e5ff.svg?logo=three.js" alt="Three.js"></a>
</p>

> **Crash in. Scavenge O2. Upgrade your suit. Survive the depths.**  
> **Hunker Bunker** is a retro-futuristic tactical survival game where you navigate ice-locked subterranean corridors, balance failing life support, uncover lost telemetry, and decide what leaves the planet with you.

🎮 **[Play Live Browser Build](https://hunkerbunker.netlify.app/)** • 💬 **[Join Discord Server](https://discord.gg/XXwwz3rauu)** • 📚 **[Documentation Map](docs/README.md)**

> **Status (2026-10-18):** Sprint 53 candidate validation on `dev/sprint-53`, source baseline `7add8c30`.
>
> The current package still identifies itself as `v2.4.17-beta`; `v2.4.18-beta` is the intended promoted release after packaged PvE, PvP, Steam Deck, performance, cloud, and operations acceptance. Local documentation edits made after the baseline are not part of the build under test.
>
> **Sprint 53 highlights:**
>
> - **The Definitive First Expedition:** fresh profiles enter Sector 0 directly, learn the survival loop through five authored phases, and cross the blast threshold continuously into Ring 1. Returning players retain an explicit onboarding skip.
> - **Field Recalibration:** safe-camp workbenches now offer one curated build-defining recalibration per camp, including Cryo Overclock, Biometric Siphon, and Kinetic Spalling, with deterministic rerolls and squad replication.
> - **Elemental and enemy grammar:** Sub-Zero Necrosis fuses cryo and bio-corrosion; Mycelium Stalkers flank, telegraph, pounce, react to light and gunfire, and retreat to darkness. Scuttler and Spore Mortar encounters received complementary combat passes.
> - **Camps and cinematics:** interaction gating, dialogue telemetry, physical walk-to interactions, fallback staging, doors, and all 32 cinematic cards now form a clearer authored event chain.
> - **Multiplayer parity:** moving and breakable props, items, enemy state, deaths, redeploys, and recalibration effects use host-authoritative replication paths.
> - **Feel and performance:** hit-stop, footsteps, combat audio, arcade/achievement integration, bounded light pools, scene batching, mixer culling, deferred boot assets, and mobile Lighthouse 93/93 clearance.
>
> Read the local [candidate release notes](docs/releases/v2.4.18-beta.md), [PR description draft](docs/releases/pr-body-v2.4.18-beta.md), and [master verification plan](docs/planning/sprint-53-master-verification-and-execution-plan-2026-10-17.md). Acceptance remains open until the evidence gates in that plan pass.

---

## 📸 Sprint 53 Candidate Showcase

### 🎮 Current Build and Cinematic Captures

| Cryo Expedition Route | Live Combat and Current HUD | Camp Narrative Cinematic |
| :---: | :---: | :---: |
| <img src="./docs/reports/assets/sprint-53/cryo-route-working-tree-2026-10-18.jpg" alt="Sprint 53 deterministic gameplay capture of the repaired cryo expedition route, terrain materials, and wall-mounted fixtures" width="380"> | <img src="./docs/reports/assets/sprint-53/welcome-committee-working-tree-2026-10-18.jpg" alt="Sprint 53 live combat capture showing the repaired industrial floor and current lower-console survival HUD" width="380"> | <img src="./public/interstitials/int_kaelen_frequency_overclock_key_v2.webp" alt="Camp narrative cinematic key art for Kaelen's frequency overclock interaction" width="380"> |

The cryo-route and combat frames were recaptured from the local validation working tree after the floor, prop-repetition, and wall-fixture finish fixes. Both use the deterministic trailer harness. They document the working visual state; packaged hardware acceptance is tracked separately in the [Sprint 53 master plan](docs/planning/sprint-53-master-verification-and-execution-plan-2026-10-17.md).

### 🌌 Deep Crust Lore & Interstitials

| Warmth Beneath the Ice | Gigawatt Goliath (Apex Threat) | The Cave Was Breathing |
| :---: | :---: | :---: |
| <img src="./public/interstitials/int_04_warmth_beneath_the_ice_key_v1.webp" alt="Warmth Beneath the Ice Subterranean Outpost" width="380"> | <img src="./public/interstitials/int_25_gigawatt_goliath_key_v1.webp" alt="Gigawatt Goliath Biomechanical Boss Encounter" width="380"> | <img src="./public/interstitials/int_33_the_cave_was_breathing_key_v1.webp" alt="The Cave Was Breathing Deep Crust Caverns" width="380"> |

---

### 🖼️ Steam Store & Library Art

<p align="center">
  <img src="./steam/store/steam_library_hero_en.png" alt="Library hero: an operator silhouetted in a long amber-lit bunker corridor" width="880">
</p>

| Library Capsule | Vertical Capsule | Small Capsule & Logo |
| :---: | :---: | :---: |
| <img src="./steam/store/steam_library_capsule_en.png" alt="Hunker Bunker library capsule" width="240"> | <img src="./steam/store/steam_vertical_capsule_en.png" alt="Hunker Bunker vertical capsule" width="260"> | <img src="./steam/store/steam_small_capsule_en.png" alt="Hunker Bunker small capsule" width="280"><br><br><img src="./steam/store/steam_library_logo_en.png" alt="Hunker Bunker title logo" width="280"> |

All store and library art lives in [`steam/store/`](steam/store/) (English slots; replacements use the same file names).

---

## ⚡ Core Features

- **Authored First Expedition**: New profiles deploy into Sector 0's Impact Zone instead of a random maze. Five guided phases teach movement, O₂, salvage, combat, and extraction before a continuous transition into Ring 1; returning operators can skip onboarding from pause.
- **Safe-Camp Field Recalibration**: Once per camp, reshape the current build with a strong benefit and a meaningful cost. Deterministic card offers, scrap rerolls, and host-authoritative squad broadcasts keep the choice legible and synchronized.
- **Reactive Combat Ecosystem**: Freeze plus bio-corrosion triggers Sub-Zero Necrosis novas, while Stalkers use cover, light sensitivity, flanking, readable pre-pounce cues, and retreat behavior instead of relying on raw health alone.
- **Physical Camp Storytelling**: Camp progression connects item pickup, location, player and NPC movement, staged interaction, dialogue choice, cinematic first/last frames, and persistent consequences through explicit event gates and telemetry.
- **Persistent Campaigns, Seeded Expeditions**: A campaign keeps one world — its rings, gates, camps and hives — while every deployment rolls its own condition (gale, spore bloom, resin surge, geothermal arc, stillness) with real gameplay effects, fresh corridor rubble and a briefing. New campaigns get their own route shape, gate challenges and an optional objective package for each ship goal, with a reward and a lasting consequence.
- **A World That Remembers**: Bridge the canyon, fortify a camp's perimeter, bond with or harvest a hive — each choice changes the map for the rest of the campaign. Overnight, hive creep spreads and camps strain; radar scans lift the fog on the tactical map as they sweep.
- **Deep Localization (7 Languages)**: Complete localization across **English (`en`)**, **German (`de`)**, **Latin American Spanish (`es-419`)**, **Japanese (`ja`)**, **Brazilian Portuguese (`pt-BR`)**, **Russian (`ru`)**, and **Simplified Chinese (`zh-CN`)** — 0 unannotated markup, 0 unlocalized runtime strings, 1,898 keys per locale at exact parity, live in-session switching, and a coverage ratchet (`npm run i18n:audit`) that fails CI if any of those regress.
- **Alternate Radio Voice Banks & Personas**: Equip the grizzled Soviet Sub-Commander (`4148`) or tactical AI AURA (`4149`) with 104 callout slots (208 authentic takes), intro cutscene HUD persona cards, and customized opening crash dialogue.
- **10 Branching Motion Endings**: Survivor encounters, faction standing with the Meridian/Tallow/Vesper camps, and hive diplomacy determine which of ten fully-rendered 3D motion cinematic endings with dedicated audio beds you achieve.
- **Lit, Readable Bunkers**: Procedural rooms carry their own ceiling strips, role screens, door headers and wet floors, and walls toward the camera are cut down so you can see inside, under AgX tone mapping, IBL reflections and selective bloom.
- **3 Exosuit Classes**: Distinct playstyles for **Scout** (Speed & Recon), **Tank** (Endurance & Armor), and **Engineer** (Systems & Terminals).
- **Deep Progression**: Bank salvage between runs, research a full combat skill tree, craft specialized gear, and level a **50-tier Season 0 Battle Pass**.
- **Online Co-op & PvP**: Title menu → **MULTIPLAYER**. Steam lobbies (public list, friend invites, room codes) over our relay server; the host runs companions, Ring 1 events and drops, and tactical pings work from a controller. Solo runs stay fully offline-capable.
- **The Foundry**: One window for your stash, loadout, fabrication, 5→1 trade-ups and the store. One item catalog means every item looks and reads the same on every screen, and trade-ups on your Steam inventory are decided by the server.
- **Steamworks Integration**: Code-backed support for trusted leaderboards, Steam Cloud saves, Steam lobbies, 24 achievements, and a cosmetic-only Steam Vault economy. That economy covers inventory drops, trade-ups, the Steam Item Store and Microtransactions checkout with `GetReport` reconciliation. It is free to play and never pay to win ([economy plan](docs/planning/economy-master-plan-2026-09-30.md)). Production acceptance varies by feature and is tracked in [Product State](PRODUCT_STATE.md).
- **Developer Commentary**: Settings → Audio → Developer Commentary shows designer notes as you reach the moments they discuss, over the menus as well as in a run; **Read All** lists every note.
- **In-Game Dev & QA Console (`~`)**: Real-time diagnostic telemetry, event interceptors, audio/network monitors, and QA cheat commands (`resetachievements`).
- **3D Asset Museum**: `window.__DEBUG__.openMuseum()` lays out every shipped 3D model at its in-game size and facing (weapons, chassis, NPCs, props, kits, enemies); `window.__DEBUG__.museumReport()` lists each exhibit's load result and measured size.

---

## 🛡️ Specialist Classes

| SCOUT | TANK | ENGINEER |
| :---: | :---: | :---: |
| <img src="./public/cutscenes/scout-class-intro-poster.jpg" alt="Scout class intro: a light exosuit on a green-lit calibration ring" width="240"> | <img src="./public/cutscenes/tank-class-intro-poster.jpg" alt="Tank class intro: a heavy exosuit rising on a thruster cradle" width="240"> | <img src="./public/cutscenes/engineer-class-intro-poster.jpg" alt="Engineer class intro: an operator servicing a dropship gantry" width="240"> |
| **Active Ability**: Sprint Burst<br>Fast recon & high-risk salvage runs. | **Active Ability**: Heavy Brace<br>Absorbs punishment & clears corridors. | **Active Ability**: Systems Reroute<br>Hacks terminals & maximizes extraction. |

---

## 🕹️ Controls

Full map of every menu, sub-menu and tab, the input model and the UI
improvement plan: [`docs/design/ui-surfaces-menu-map-and-controller-navigation.md`](docs/design/ui-surfaces-menu-map-and-controller-navigation.md).

### Gameplay Controls

| Action | Keyboard / Mouse | Steam Deck / Gamepad (official layout) |
| --- | --- | --- |
| **Move** | `WASD` / Arrow keys | Left stick |
| **Aim & Fire** | Mouse + left click | Right stick or trackpad + **RT** |
| **Interact** | `E` (or `Enter`) | **A** |
| **Dodge** | — | **B** |
| **Reload** | `R` | **X** / D-pad ◀ |
| **Smash / Class Ability** | `F` | **Y** / D-pad ▶ |
| **Scan** | `Q` | **LB** / D-pad ▼ |
| **Tactical Map** | `M` or `Tab` | **RB** / D-pad ▲ / View |
| **Sprint** | `Shift` | Left stick click |
| **Melee** | `V` | — |
| **Tactical Ping** | `T` (with a squadmate in the room, `T` also opens trade) | — |
| **Pause / Settings** | `Esc` | ☰ Menu |
| **Chat** | HUD **CHAT** button, or Pause → Settings → Session → Room Chat | Pause → Settings → Session → Room Chat |
| **Dev Telemetry** | `~` | — |

### 🎮 Controller Navigation & Menu Accessibility

Every menu is built for the Steam Deck stage (1280×800) and driven by one
focus system shared by the pad, the keyboard and the mouse. Every surface is
registered in `MENU_FOCUS_ROOT_IDS` (`src/inputActions.js`) and covered by the
`menu-reachability`, `controller-focus` and `menu-tab-switching` browser suites.

| Action | Steam Deck / Gamepad | Keyboard | Function |
| :--- | :--- | :--- | :--- |
| **Navigate** | D-pad / left stick | `W` `A` `S` `D` or arrows | Spatial focus across buttons, cards and slots; wraps at the edges. |
| **Activate** | **A** or **RT** | `Enter` / `Space` | Equips gear, buys upgrades, selects an operative; A on a dropdown opens its full list. |
| **Back / Close** | **B** | `Esc` | Closes the topmost surface and returns focus to the button that opened it. |
| **Switch Tabs** | **LB** / **RB** (also **X** / **Y**) | `Q` / `E` | Settings, Archive, Foundry hub / Vault, Dossier, ship terminal; class cards on the operator menu and in the Armory. |
| **Adjust Values** | D-pad ◀ ▶ (focused) | `A` / `D` or ◀ ▶ | Sliders, volume, UI scale, dropdowns. |
| **Scroll Text** | D-pad ▲ ▼ | `W` / `S` or ▲ ▼ | Scrolls lore, codex detail and commentary text that has nothing to focus. |
| **Enter Text** | **A** (Steam keyboard; in-game keyboard fallback) | type | Callsign and chat. |
| **Pointer** | Right trackpad / stick cursor + **A** | Mouse | Optional; never the only way to reach a control. |


---

## 🚀 Quickstart & Setup

### Prerequisites
- **Node.js**: v22 or newer (matches CI)
- **npm**: the version bundled with Node.js 22 or newer

```bash
# Clone the repository
git clone https://github.com/grounded-play/hunker-bunker.git
cd hunker-bunker

# Install dependencies & launch dev server
npm install
npm run dev
```
> Open **`http://localhost:5173`** in your browser.

For the desktop shell, `npm run electron:dev` runs Electron against the dev server with DevTools detached and the F12 / Ctrl+Shift+I and F5 / Ctrl+R shortcuts. Set `HB_DEVTOOLS_OPEN=0` to keep DevTools closed, or list Chrome Web Store extension IDs in `HB_DEVTOOLS_EXTENSIONS` (comma-separated) to install them.

### 🧪 Verification & Build

```bash
npm test         # Run the complete unit and integration test suite
npm run coverage # Run tests and generate the coverage report
npm run lint     # Check formatting & code safety
npm run build    # Compile production WebGL bundle
npx playwright test tests/e2e/<spec>.spec.js  # Browser specs (each cold-boots the game; allow ~30s–3m per test)
```

Other agents or editors changing `src/` make a watched Vite server reload the page mid-test; run browser specs against a server without HMR when the tree is busy.

The badges above report the latest merged `mothership` workflow results. Pull
request checks may be newer; use the PR checks view when validating an
unmerged branch.

---

## 🛠️ Tech Architecture

- **WebGL 3D Engine**: Powered by **Three.js** (r186) with procedural dungeon generation, dynamic fog of war, and WebAudio spatial soundscapes.
- **3D & Surface Pipeline**: Zero-detail-loss 25,000 triangle GLTF assets optimized with `gltfpack` meshopt vertex compression and Basis Universal KTX2 textures (`KHR_texture_basisu`). Dual-array BC7 KTX2 floor surfaces with multi-layer height-blend shaders, procedural noise jitter, and deterministic BFS traffic wear mapping.
- **Desktop & Steam Shell**: Built with **Electron** featuring native **Steamworks** integration for Steam Cloud saves, Steam Input, real Steam Lobbies (Friends invite, Join Game, Rich Presence), and 24 Steam Achievements.
- **Trusted Relay Server**: Node.js & Express server running in **Docker Compose** behind **Caddy** (`steam.tuesdaycinema.club`), enforcing verified score validation for 5 Steam Leaderboards and Steam-session-authenticated multiplayer.

---

## 🤝 Join the Team

Hunker Bunker is built in the open. Whether you write code or just want first
crack at every new drop, there's a seat for you.

**Playtesters & community** — the fastest way in. Jump into Discord, play the
live browser build, break things, and tell us what you found. Community
feedback has directly shaped classes, endings, and the economy in this repo.

**Contributors** — this is a real MIT-licensed open-source project, not a
mirror. Bug fixes, balance tuning, new content, tooling — all welcome.
1. Read [`CONTRIBUTING.md`](.github/CONTRIBUTING.md) for the fork/branch/PR workflow.
2. Check [open issues](https://github.com/grounded-play/hunker-bunker/issues) for
   something to grab, or file a [bug report](https://github.com/grounded-play/hunker-bunker/issues/new?template=bug_report.md) /
   [feature request](https://github.com/grounded-play/hunker-bunker/issues/new?template=feature_request.md).
3. `npm test && npm run lint` before you open a PR — CI runs the same checks.

- 💬 **Discord**: [Join Server](https://discord.gg/XXwwz3rauu)
- 🛠️ **Issues & PRs**: [github.com/grounded-play/hunker-bunker](https://github.com/grounded-play/hunker-bunker)

---

## 📄 License & Contact

Distributed under the **MIT License**. Built with ❤️ by **Tuesday Cinema Club**.

- 💬 **Discord**: [Join Server](https://discord.gg/XXwwz3rauu)
- 📧 **Support & Contact**: [Support@TuesdayCinema.Club](mailto:Support@TuesdayCinema.Club)
