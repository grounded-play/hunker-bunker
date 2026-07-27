<p align="center">
  <img src="steam/store/steam_header_capsule_en.png" alt="Hunker Bunker key art: a lone operator in an industrial bunker corridor" width="820">
</p>

# HUNKER BUNKER

<p align="center">
  <a href="https://github.com/grounded-play/hunker-bunker/actions/workflows/presubmit.yml"><img src="https://github.com/grounded-play/hunker-bunker/actions/workflows/presubmit.yml/badge.svg" alt="Presubmit CI"></a>
  <a href="https://app.netlify.com/projects/hunkerbunker/deploys"><img src="https://api.netlify.com/api/v1/badges/3d99b6f8-2e77-4a86-8292-1fffe5c9c308/deploy-status" alt="Netlify Status"></a>
  <a href="https://discord.gg/XXwwz3rauu"><img src="https://img.shields.io/badge/Discord-Join%20Server-5865F2?logo=discord&logoColor=white" alt="Discord Server"></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT"></a>
  <a href="https://threejs.org/"><img src="https://img.shields.io/badge/Three.js-r184-00e5ff.svg?logo=three.js" alt="Three.js"></a>
  <a href="https://vitest.dev/"><img src="https://img.shields.io/badge/Testing-83%20Suites%20%7C%20677%20Passed-41b883.svg?logo=vitest" alt="Vitest"></a>
</p>

> **Crash in. Scavenge O2. Upgrade your suit. Survive the depths.**  
> **Hunker Bunker** is a retro-futuristic tactical survival game where you navigate ice-locked subterranean corridors, balance failing life support, uncover lost telemetry, and decide what leaves the planet with you.

🎮 **[Play Live Browser Build](https://hunkerbunker.netlify.app/)** • 💬 **[Join Discord Server](https://discord.gg/XXwwz3rauu)** • 📜 **[Steam Readiness Specs](docs/steam-docs-master-index.md)**

---

## 📸 Sector Zero Teaser

| Ice-Locked Perimeter | Subterranean Tactical Run | Hostile Sector Contacts |
| :---: | :---: | :---: |
| <img src="public/title_key_art_v2.png" alt="Sector Zero Perimeter" width="380"> | <img src="public/hunker_bunker_hero.png" alt="Tactical Run" width="380"> | <img src="public/cutscenes/poster-art/death-combat.png" alt="Hostile Contacts" width="380"> |

---

## ⚡ Core Features

- **Procedural Bunker Runs**: WebGL-powered isometric corridors with dynamic fog of war, environmental hazards, and O2 survival pressure.
- **3 Exosuit Classes**: Distinct playstyles for **Scout** (Speed & Recon), **Tank** (Endurance & Armor), and **Engineer** (Systems & Terminals).
- **Deep Progression**: Bank salvage between runs, research skill tree nodes, craft specialized medkits, and unlock weapons.
- **Branching Decisions & Extraction**: Navigate survivor encounters, discover underground signals, and determine your mission outcome.
- **Live Steamworks Integration**: 5 trusted backend leaderboards, Steam Cloud Auto-Cloud saves, Steam Vault Inventory Service, and 23 Steam Achievements.
- **In-Game Dev & QA Console (`~`)**: Real-time diagnostic telemetry, event interceptors, audio/network monitors, and QA cheat commands (`resetachievements`).

---

## 🛡️ Specialist Classes

| SCOUT | TANK | ENGINEER |
| :---: | :---: | :---: |
| <img src="public/Scout.Intro.gif" alt="Scout Class Exosuit" width="240"> | <img src="public/Tank.Intro.gif" alt="Tank Class Exosuit" width="240"> | <img src="public/Eng.Intro.gif" alt="Engineer Class Exosuit" width="240"> |
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
npm test         # Run unit test suite (83 files | 677 tests)
npm run lint     # Check formatting & code safety
npm run build    # Compile production WebGL bundle
```

---

## 🛠️ Tech Architecture

- **WebGL 3D Engine**: Powered by **Three.js** (r184) with procedural dungeon generation, dynamic fog of war, and WebAudio spatial soundscapes.
- **Desktop & Steam Shell**: Built with **Electron** featuring native **Steamworks** integration for Steam Cloud saves, Steam Input, and 23 Steam Achievements.
- **Trusted Relay Server**: Node.js & Express server running in **Docker Compose** behind **Caddy** (`steam.tuesdaycinema.club`), enforcing verified score validation for 5 Steam Leaderboards.


---

## 📄 License & Contact

Distributed under the **MIT License**. Built with ❤️ by **Tuesday Cinema Club**.

- 💬 **Discord**: [Join Server](https://discord.gg/XXwwz3rauu)
- 📧 **Support & Contact**: [Support@TuesdayCinema.Club](mailto:Support@TuesdayCinema.Club)

