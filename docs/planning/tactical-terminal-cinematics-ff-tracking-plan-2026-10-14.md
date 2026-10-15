# Tactical Terminal Cinematics Master Plan: ff-tracking Integration

**Date**: 2026-10-14  
**Branch**: `dev/sprint-52`  
**External Tool Location**: `/home/caveman/Desktop/icecave/ff-tracking` (sibling repository outside `hunker-bunker`)  
**Target Asset Destination**: `public/cutscenes/`  

---

## 1. Executive Summary & Aesthetic Alignment

Hunker Bunker features a distinct retro-futuristic, high-contrast tactical terminal aesthetic:
- Industrial monospace typography (`JetBrains Mono`, scanline CRTs).
- High-contrast color palettes: Phosphor green, Amber CRT, Thermal infrared, Navy telemetry, Stark Monochrome, and Neon green alert.
- In-game lore framed as military command logs, biometric telemetries, personnel archives, distress beacons, and quarantine alerts.
- High-impact graphic realism with functional red-only locks, scanline tearing, and bit-crushed glitch transitions.

`ff-tracking` (https://github.com/mrsarac/ff-tracking) is a specialized procedural motion-design and video rendering engine built in Rust, Skia, SkSL, and Python/SciPy. It simulates a virtual camera filming a terminal screen with:
1. **Physical camera optics**: 3D perspective tilt/yaw/roll, dynamic depth-of-field with circle of confusion & bokeh weighting, chromatic aberration, bloom, and LED grid textures.
2. **Dynamic computer-vision tracker**: Bracket boxes that lock onto live typed characters with coordinate readouts (`x: 1403 y: 559`), chain-of-thought links, and focal plane racks.
3. **Pure algorithmic synthesis**: 100% procedural sound design (`tools/sfx.py`) matching terminal keystrokes, screen hum, bit-crushed cuts, lock beeps, and sub hits panned to coordinates.
4. **Hyper-fast rendering**: 180 frames rendered in ~14 seconds at 1080p/4K using hardware GPU shaders (Vulkan/Metal).

This document plans the external setup, scene definitions, pipeline tooling, and in-game integration for generating Hunker Bunker tactical videos.

---

## 2. Local Environment & Platform Architecture

### 2.1 Repository Boundary
- **External Path**: `/home/caveman/Desktop/icecave/ff-tracking`
- Kept **outside** the `hunker-bunker` repository to avoid inflating the game's repository size, git history, or npm dependencies with Rust build targets (~5GB target artifacts) and raw intermediate 4K video passes.
- Version-controlled independently with upstream tracking.

### 2.2 Linux / Vulkan Toolchain Verified
The host environment is Ubuntu Linux (`x86_64`) with an NVIDIA GeForce RTX 2070 SUPER GPU (Driver 580.178, CUDA 13.0, Vulkan 1.3).

The external repository has been adapted for Linux rendering:
- **Rust Toolchain**: `rustc 1.99.0` via `rustup`.
- **Compiler Flags**: `BINDGEN_EXTRA_CLANG_ARGS="-I/usr/lib/gcc/x86_64-linux-gnu/13/include"` for bindgen C-header resolution.
- **Library Linking**: System `libfontconfig.so`, `libfreetype.so`, and Vulkan loader.
- **Cargo Profiles**: Multi-target Vulkan Skia renderer backend (`fframes_skia_renderer` with Vulkan context) replacing Apple-Metal-only defaults.
- **Benchmarks**:
  - `tracks` generation: < 0.1s
  - `flat` Pass 1 (3840×2160 SVG frame generation): 4.2s (180 frames @ 30fps)
  - `sfx.py` Audio Synthesis (Stereo 48kHz -14 LUFS): 0.8s
  - `lens` Pass 2 (1920×1080 SkSL Vulkan shader pass): 10.4s
  - Total end-to-end video render time: **~15.4 seconds**.

---

## 3. Video Asset Specifications & Narrative Roles

### 3.1 Asset A: Tactical Personnel Archive // Production Credits
- **Output Files**: `public/cutscenes/credits-terminal.webm`, `public/cutscenes/credits-terminal.mp4`
- **Duration**: ~12–18 seconds (multi-scene sequence).
- **Narrative Content**:
  - `◈ PERSONNEL ARCHIVE // PRODUCTION CREDITS`
  - `DEVELOPED BY: TUESDAY CINEMA CLUB`
  - `GRAPHICS ENGINE: THREE.JS R184`
  - `SOUNDS & MUSIC: TUESDAY CINEMA CLUB AUDIO COLLECTIVE`
  - `DISCORD COMMUNITY: DISCORD.GG/XXWWZ3RAUU`
  - `PROJECT REPO: GITHUB.COM/GROUNDED-PLAY/HUNKER-BUNKER`
  - `SPECIAL THANKS: OUR AMAZING COMMUNITY & PLAYERS`
  - `FINAL LOCK: SYS VER 2.4.16-BETA // ACTIVE // DONE`
- **Visual Style**:
  - Palette progression: Mono -> Phosphor -> Thermal -> Neon.
  - Background terminal log scrolling repository commit history, asset audits, and bunker telemetry.
  - Camera racking across developer titles, ending on the green "DONE" / "ACTIVE" status pill.
- **In-Game Placement**:
  - **Option 1 (Credits Modal)**: Embedded as an animated video background or video player inside `#about-modal` (`.credits-modal-content`).
  - **Option 2 (Campaign Finish)**: Triggered upon completing Act II or Act III endings before returning to the main menu.

### 3.2 Asset B: Tactical Bunker Boot // Intro Transmission
- **Output Files**: `public/cutscenes/intro-boot.webm`, `public/cutscenes/intro-boot.mp4`
- **Duration**: 6–9 seconds.
- **Narrative Content**:
  - `› SYS_BOOT // SECURE BUNKER 07`
  - `BIO-CONTAINMENT: BREACH DETECTED`
  - `EXOSUIT TELEMETRY: ONLINE`
  - `DEPLOYING SCOUT / TANK / ENGINEER`
  - `DIRECTIVE: DEEP EXTRACTION`
- **Visual Style**:
  - Palettes: Amber -> Phosphor -> Navy.
  - Camera with intentional jitter/shake, sudden zoom pushes on "BREACH DETECTED", red tracker lock on emergency warnings.
  - Audio: Low frequency transformer hum, alarm beeps, aggressive cut glitches.
- **In-Game Placement**:
  - Accessible on game launch or playable via a "Mission Briefing" button on `#menu`.
  - Can precede character selection or cut into class intros (`scout-class-intro.webm`, etc.).

### 3.3 Asset C: Incident & Boss Interstitials
- **Output Files**:
  - `public/cutscenes/interstitial-boss-cryo.webm`
  - `public/cutscenes/interstitial-boss-cyber.webm`
  - `public/cutscenes/interstitial-boss-spore.webm`
  - `public/cutscenes/interstitial-queen-alert.webm`
  - `public/cutscenes/interstitial-black-box.webm`
- **Duration**: 3–5 seconds each.
- **Narrative Content**:
  - Sensor intercepts, seismic tremor readings, DNA sequencer logs for boss encounters (Cryosnail, Cybersnail, Sporesnail, Mother Snail / Queen).
  - Designed to be intercut or paired with existing RGB still posters (`public/cutscenes/poster-art/`).

---

## 4. Pipeline & Automation Tooling

To generate assets reproducibly, we will implement a lightweight bridge script inside `hunker-bunker`:

### 4.1 Bridge Script: `scratch/generate_tactical_videos.py`
A CLI utility that:
1. Accepts a target scene preset (`--preset credits|intro|boss_cryo|boss_queen`).
2. Synthesizes a tailored `hud/src/lib.rs` (or writes scene JSON) containing Hunker Bunker lines, credits, and palette schedules.
3. Invokes the release build in `/home/caveman/Desktop/icecave/ff-tracking`:
   - Runs `tracks` -> `out/tracks.json`
   - Runs `flat` -> `out/pass/flat.mp4`
   - Runs `tools/sfx.py` -> `out/pass/sfx.wav`
   - Runs `lens` -> `out/tracking.mp4`
4. Uses `ffmpeg` to produce web-optimized outputs:
   - WebM (VP9 / Opus) for modern desktop/browser playback.
   - MP4 (H.264 / AAC) for universal fallback.
   - Poster image (`-poster.jpg`) using a selected hero frame.
5. Copies outputs directly to `public/cutscenes/<target-basename>.[webm|mp4|jpg]`.

---

## 5. Game Integration Architecture

### 5.1 Credits Modal UI (`#about-modal`)
- Add an optional video backdrop element `#credits-video-bg` in `index.html` within `#about-modal`.
- When the user opens the Credits dialog, the terminal video loops subtly behind the translucent tactical overlay, matching the existing `.terminal-scanline` and CRT styling.
- Provide a "Watch Tactical Archive Video" toggle or fullscreen playback.

### 5.2 Presentation & Cutscene Manager (`src/presentationLayer.js`)
- Register the new cinematic keys in the presentation layer and cutscene fallbacks.
- Support smooth crossfades between terminal text cutscenes and gameplay.

---

## 6. Implementation Stages & Verification

| Stage | Scope | Verification |
|---|---|---|
| **Stage 1 (Current)** | Commit this plan to `dev/sprint-52` documenting setup and asset definitions | Clean git status, valid markdown links |
| **Stage 2** | Create parameterized generator script in `scratch/generate_tactical_videos.py` | CLI tests generate valid test scenes without manual file edits |
| **Stage 3** | Generate `credits-terminal` and `intro-boot` videos; transcode to WebM + MP4 + Poster | `ffprobe` validates codec, resolution (1920×1080), duration, audio tracks |
| **Stage 4** | Integrate credits terminal video into `#about-modal` in `index.html` & styling in `index.css` | Vitest and Playwright e2e test suite pass; visual inspection |
| **Stage 5** | Interstitial cutscene registration in `endingCutscenes.js` / `presentationLayer.js` | All existing cutscene and presentation unit tests remain green |
