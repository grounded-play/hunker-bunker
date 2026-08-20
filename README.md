<p align="center">
  <img src="./steam/store/steam_header_capsule_en.png" alt="Hunker Bunker key art: a lone operator in an industrial bunker corridor" width="820">
</p>

# HUNKER BUNKER

<p align="center">
  <a href="https://github.com/grounded-play/hunker-bunker/actions/workflows/presubmit.yml?query=branch%3Amothership"><img src="https://img.shields.io/github/actions/workflow/status/grounded-play/hunker-bunker/presubmit.yml?branch=mothership&label=tests%20%2B%20coverage&logo=vitest" alt="Tests and coverage status on mothership"></a>
  <a href="https://github.com/grounded-play/hunker-bunker/actions/workflows/steam-build.yml?query=branch%3Amothership"><img src="https://github.com/grounded-play/hunker-bunker/actions/workflows/steam-build.yml/badge.svg?branch=mothership" alt="Steam package status on mothership"></a>
  <a href="https://github.com/grounded-play/hunker-bunker/actions/workflows/codeql.yml?query=branch%3Amothership"><img src="https://github.com/grounded-play/hunker-bunker/actions/workflows/codeql.yml/badge.svg?branch=mothership" alt="CodeQL status on mothership"></a>
  <a href="https://github.com/grounded-play/hunker-bunker/actions/workflows/lighthouse.yml?query=branch%3Amothership"><img src="https://github.com/grounded-play/hunker-bunker/actions/workflows/lighthouse.yml/badge.svg?branch=mothership" alt="Lighthouse status on mothership"></a>
  <a href="https://app.netlify.com/projects/hunkerbunker/deploys"><img src="https://api.netlify.com/api/v1/badges/3d99b6f8-2e77-4a86-8292-1fffe5c9c308/deploy-status" alt="Netlify Status"></a>
  <a href="https://discord.gg/XXwwz3rauu"><img src="https://img.shields.io/badge/Discord-Join%20Server-5865F2?logo=discord&logoColor=white" alt="Discord Server"></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT"></a>
  <a href="https://threejs.org/"><img src="https://img.shields.io/badge/Three.js-r184-00e5ff.svg?logo=three.js" alt="Three.js"></a>
</p>

> **Crash in. Scavenge O2. Upgrade your suit. Survive the depths.**  
> **Hunker Bunker** is a retro-futuristic tactical survival game where you navigate ice-locked subterranean corridors, balance failing life support, uncover lost telemetry, and decide what leaves the planet with you.

🎮 **[Play Live Browser Build](https://hunkerbunker.netlify.app/)** • 💬 **[Join Discord Server](https://discord.gg/XXwwz3rauu)** • 📜 **[Steam Readiness Specs](docs/steam-docs-master-index.md)**

> **Status**: In active development, heading into Steam review. Sprint 26 landed Steam-native multiplayer — production Steam auth confirmed live, real Steam Lobby integration (Friends invite, Join Game, Rich Presence) code-complete — with Sprint 27 up next. The browser build above is always current — play it, then come tell us what broke in Discord. No wishlist link yet; Discord is the fastest way to hear the moment that changes.
>
> The automated suite currently covers **1,780 passing tests across 219 files** — see [`docs/releases/`](docs/releases/) for what shipped each sprint.

---

## 📸 Sector Zero Teaser

| Ice-Locked Perimeter | Subterranean Tactical Run | Hostile Sector Contacts |
| :---: | :---: | :---: |
| <img src="./public/title_key_art_v2.png" alt="Sector Zero Perimeter" width="380"> | <img src="./public/hunker_bunker_hero.png" alt="Tactical Run" width="380"> | <img src="./public/cutscenes/poster-art/death-combat.png" alt="Hostile Contacts" width="380"> |

---

## ⚡ Core Features

- **Procedural Bunker Runs**: WebGL-powered isometric corridors with dynamic fog of war, environmental hazards, and O2 survival pressure — no two runs share a layout.
- **3 Exosuit Classes**: Distinct playstyles for **Scout** (Speed & Recon), **Tank** (Endurance & Armor), and **Engineer** (Systems & Terminals).
- **Deep Progression**: Bank salvage between runs, research a full combat skill tree, craft specialized gear, and level a **50-tier Season 0 Battle Pass**.
- **10 Branching Endings**: Survivor encounters, faction standing with the Meridian/Tallow/Vesper camps, and hive diplomacy all feed into which of ten real Act 2 outcomes you land.
- **Real Multiplayer**: Socket.IO relay lobby with LAN and online play — drop in with a friend or run solo against AI.
- **Live Steamworks Integration**: 5 trusted backend leaderboards, Steam Cloud Auto-Cloud saves, a full Steam Vault economy (weapon skins, charms, cosmetics), and 24 Steam Achievements.
- **In-Game Dev & QA Console (`~`)**: Real-time diagnostic telemetry, event interceptors, audio/network monitors, and QA cheat commands (`resetachievements`).

---

## 🛡️ Specialist Classes

| SCOUT | TANK | ENGINEER |
| :---: | :---: | :---: |
| <img src="./public/Scout.Intro.gif" alt="Scout Class Exosuit" width="240"> | <img src="./public/Tank.Intro.gif" alt="Tank Class Exosuit" width="240"> | <img src="./public/Eng.Intro.gif" alt="Engineer Class Exosuit" width="240"> |
| **Active Ability**: Sprint Burst<br>Fast recon & high-risk salvage runs. | **Active Ability**: Heavy Brace<br>Absorbs punishment & clears corridors. | **Active Ability**: Systems Reroute<br>Hacks terminals & maximizes extraction. |

---

## 🕹️ Controls

| Action | Keyboard / Mouse | Gamepad / Touch |
| --- | --- | --- |
| **Move** | `WASD` / Arrow Keys | Left Stick / Touch Joystick |
| **Aim & Fire** | Mouse Aim + Left Click | Right Stick / Fire Trigger |
| **Interact** | `E` | Action / Confirm Button |
| **Reload** | `R` | Reload Button |
| **Class Ability** | `F` | Special Ability Button |
| **Radar Scan** | `Q` | Sub-weapon / Scan |
| **Sprint** | `Shift` | Left Stick Click / Sprint Toggle |
| **Dev Telemetry** | `~` (Tilde) | Open Diagnostic Overlay |

---

## 🚀 Quickstart & Setup

### Prerequisites
- **Node.js**: v20 or newer
- **npm**: v9+

```bash
# Clone the repository
git clone https://github.com/grounded-play/hunker-bunker.git
cd hunker-bunker

# Install dependencies & launch dev server
npm install
npm run dev
```
> Open **`http://localhost:5173`** in your browser.

### 🧪 Verification & Build

```bash
npm test         # Run the complete unit and integration test suite
npm run coverage # Run tests and generate the coverage report
npm run lint     # Check formatting & code safety
npm run build    # Compile production WebGL bundle
```

The badges above report the latest merged `mothership` workflow results. Pull
request checks may be newer; use the PR checks view when validating an
unmerged branch.

---

## 🛠️ Tech Architecture

- **WebGL 3D Engine**: Powered by **Three.js** (r184) with procedural dungeon generation, dynamic fog of war, and WebAudio spatial soundscapes.
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
1. Read [`CONTRIBUTING.md`](CONTRIBUTING.md) for the fork/branch/PR workflow.
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
