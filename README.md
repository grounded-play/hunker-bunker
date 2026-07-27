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
> **Hunker Bunker** is a retro-futuristic tactical survival game where you navigate ice-locked subterranean corridors, balance failing life support, recover lost black boxes, and choose what leaves the planet with you.

🎮 **[Play Live Browser Build](https://hunkerbunker.netlify.app/)** • 💬 **[Join Discord Server](https://discord.gg/XXwwz3rauu)** • 📜 **[Steam Readiness Specs](docs/steam-docs-master-index.md)**

---

## 📸 Tactical Gallery

| Field Combat & Oxygen Depletion | Bunker Tech & Upgrade Tree | Survivor Camps & Factions |
| :---: | :---: | :---: |
| <img src="steam/store/steam_screenshot_01_en.png" alt="Field combat run" width="380"> | <img src="steam/store/steam_screenshot_03_en.png" alt="Bunker skill tree terminal" width="380"> | <img src="steam/store/steam_screenshot_02_en.png" alt="Survivor camp encounter" width="380"> |

| Black Box Archive Recovery | Hive Sites & Specimen-0047 |
| :---: | :---: |
| <img src="steam/store/steam_screenshot_04_en.png" alt="Lore archive terminal" width="380"> | <img src="steam/store/steam_screenshot_05_en.png" alt="Queen hive fight" width="380"> |

---

## ⚡ Core Features

- **Procedural Bunker Runs**: WebGL-powered isometric corridors with dynamic fog of war, environmental hazards, and O2 survival pressure.
- **3 Exosuit Classes**: Distinct playstyles for **Scout** (Speed & Recon), **Tank** (Endurance & Armor), and **Engineer** (Systems & Terminals).
- **Deep Progression**: Bank salvage between runs, research skill tree nodes, craft specialized medkits, and unlock weapons.
- **Multiple Factions & Endings**: Navigate survivor camps (Meridian, Tallow, Vesper), decide the fate of alien hives, and choose your extraction manifest.
- **In-Game Dev Console (`~`)**: Real-time diagnostic telemetry, event interceptors, input logs, and audio/network monitors.
- **Steam & Desktop Ready**: Built-in Electron wrapper, Steam Input binding layer, Steam Cloud saves, and Steam Vault inventory scaffolding.

---

## 🛡️ Specialist Classes

| SCOUT | TANK | ENGINEER |
| :---: | :---: | :---: |
| <img src="public/cutscenes/scout-intro-poster.jpg" alt="Scout class poster" width="240"> | <img src="public/cutscenes/tank-intro-poster.jpg" alt="Tank class poster" width="240"> | <img src="public/cutscenes/engineer-intro-poster.jpg" alt="Engineer class poster" width="240"> |
| **Active Ability**: Sprint Burst<br>Fast recon & high-risk salvage runs. | **Active Ability**: Heavy Brace<br>Absorbs punishment & clears corridors. | **Active Ability**: Systems Reroute<br>Hacks terminals & maximizes extraction. |

---

## 👁️ Factions of Sector Zero

| Queen | Meridian | Tallow | Vesper |
| :---: | :---: | :---: | :---: |
| <img src="public/lore_portraits/queen_00.webp" alt="Queen" width="130"> | <img src="public/lore_portraits/meridian_kaelen.png" alt="Kaelen" width="130"> | <img src="public/lore_portraits/tallow_martha.png" alt="Martha" width="130"> | <img src="public/lore_portraits/vesper_briggs.png" alt="Briggs" width="130"> |
| *The hivemind below.* | *Tech-scavengers & order.* | *Hydro-cultists & mercy.* | *Barricade mercenaries.* |

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

```mermaid
graph TD
    A[index.html + main.js UI Shell] --> B[src/threeGame.js WebGL Runtime]
    B --> C[src/generator.js Procedural World Engine]
    B --> D[src/director.js Threat & Pressure Systems]
    B --> E[src/audio.js WebAudio Soundscape]
    A --> F[src/debugConsole.js Live Telemetry ~]
    A --> G[electron/ Desktop Shell & Steam Bridge]
```

---

## 📄 License & Community

Distributed under the **MIT License**. Built with ❤️ by **Tuesday Cinema Club**.

Join our community on **[Discord](https://discord.gg/XXwwz3rauu)** to report bugs, discuss builds, and test upcoming releases!
