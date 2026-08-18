# Sprint 23 Dev Notes: Steam Review Remediation, Multiplayer, & Narrative Expansion

**Date:** August 14, 2026  
**Sprint:** Sprint 23  
**Branch:** `dev/sprint23`  
**App Title:** Hunker Bunker (App ID: `4957040`)

---

## 1. Overview & Objectives

This sprint log documents the complete implementation and design plans addressing Valve's Steam review feedback, the multi-ending narrative expansion, dual-perspective alien mimicry mechanics, and the test execution policy.

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    SPRINT 23 PILLARS                                        │
├───────────────────────────────┬─────────────────────────────────────────────────────────────┤
│ 1. Steam Review Remediation   │ Full feature compliance across Multiplayer (PvP/Co-Op),     │
│                               │ Steam Cloud, Mature Content Suite, In-App Purchases,        │
│                               │ Controller Input, AI Disclosure, and Library Art Assets.    │
├───────────────────────────────┼─────────────────────────────────────────────────────────────┤
│ 2. Narrative & Ending Arcs    │ Documentation and verification of all 10 endings, including  │
│                               │ suicide in the void, Queen will-crush, and secret martyrdom.│
├───────────────────────────────┼─────────────────────────────────────────────────────────────┤
│ 3. Dual-Perspective Mimicry   │ Structural framework for human vs. alien infiltrator roles, │
│                               │ sensory/pheromone deception, and inter-hive swarm wars.     │
├───────────────────────────────┼─────────────────────────────────────────────────────────────┤
│ 4. QA & Test Execution Policy │ Primary validation on fast Vitest unit tests (~11s); Play-  │
│                               │ wright e2e tests gated for dedicated milestone passes.      │
└───────────────────────────────┴─────────────────────────────────────────────────────────────┘
```

---

## 2. Steam Review Remediation Breakdown

### A. Online Multiplayer: PvP & Co-Op Implementation
* **Strategy**: Retain and fully support the "PVP" and "Co-Op" categories on the Steam store page.
* **Lobby & UI**: Added Title Menu entry for **"TACTICAL NET (MULTIPLAYER)"** with mode selection:
  - **Co-Op Expedition**: 2-4 player synchronized bunker dive with shared revives and objectives.
  - **Sector Skirmish (PVP)**: Deathmatch / duel combat with live projectile syncing and kill tracker.
* **Networking**: Driven by [server/relay.js](file:///home/caveman/Desktop/icecave/hunker-bunker/server/relay.js) Socket.IO relay for Online play, and local loopback/subnet networking for LAN play.
* **Reviewer Instructions**: Clear instructions included in the resubmission notes detailing LAN/Online lobby setup.

### B. Steam Cloud
* **Status**: Unchecked "Cloud support for developers only" in Steamworks App Admin.
* **Auto-Cloud**: Verified cross-platform sync for `save.json` between `%APPDATA%/hunker-bunker` (Windows) and `~/.config/hunker-bunker` (Linux/SteamOS).

### C. Mature Content Verification Suite
* **Reviewer Hotkeys**: Press **`F9` / `Ctrl+M`** on keyboard or **`LB + RB + R3`** on gamepad at the Title Menu.
* **Instant Verification Hub**: Immediate scene and cutscene player for all 6 mature categories flagged by Valve (suicide cutscenes, operator skins, bio-incubator stills, adult lore logs, and alien Queen reveals).

### D. In-App Purchases & Steam Vault Store
* **Fix**: Replaced empty catalog failure with an active fallback catalog in [src/steamVaultUi.js](file:///home/caveman/Desktop/icecave/hunker-bunker/src/steamVaultUi.js).
* **Steam Wallet Flow**: Integrated simulated and sandbox Steam Wallet authorization modals so clicking "BUY" invokes the wallet checkout dialog smoothly.

### E. Full Controller Support Fixes
* **Settings `<select>` Elements**: Stage Resolution, UI Accessibility Scale, and Text Speed now cycle on D-Pad Left/Right and A/Confirm buttons.
* **Operator Callsign**: Integrated Steam virtual keyboard (`showGamepadTextInput`, `showFloatingGamepadTextInput`, and in-engine on-screen keyboard fallback).
* **Achievements Menu**: Added `tabindex="0"` and auto-scrolling to all `.achievement-card` elements, enabling full D-Pad and stick scrolling.

### F. AI Content Survey & Library Graphical Assets
* **AI Disclosure**: Provided clean, factual survey description covering 2D concept/interstitial art, suno soundtrack generation, and AI coding agent assistance.
* **Library Assets**: Uploaded full-bleed English Library Capsule (`600x900`), Header (`920x430`), transparent single-title Logo (`1280x720`), and text-free Hero (`3840x1240`).

---

## 3. Narrative Endings & Mature Moral Dilemmas

Documented in [docs/narrative-endings-and-mature-content-guide.md](file:///home/caveman/Desktop/icecave/hunker-bunker/docs/narrative-endings-and-mature-content-guide.md):

1. **Self-Annihilation / Suicide in the Void (Dying to Prevent Humanity's Contagion)**:
   - **`EMPTY_HUSK`**: The operative refuses to carry the parasite to either human colonies or the Queen, launching alone into the freezing dark with life support running down (*"Crew manifest: one... There was so much to carry. You carried nothing"*).
   - **`SCORCHED_SKY`**: Purging all eggs, survivor camps, and bio-nodes before dying alone in the void (*"Four seats. One heartbeat"*).
   - **Pvt. M. Reyes (Log C11 / Courier Quest)**: Pvt. Reyes' letter accepting her death in the bunker ruins.
   - **Director Chen (Log C13)**: The dark secret that all operators were deployed on a suicidal containment lock (*"You are the containment"*).

2. **Obeying the Queen & Complete Will-Crush (`FULL_BROOD`)**:
   - The operative yields completely to the Queen's telepathic directives. Over the course of the story, she overrides the operator's consciousness, memories, and personal autonomy (*"Two heartbeats. One purpose... Sleep, carrier. When you wake, we choose a new world"*), reducing the operative to an obedient host.

3. **Secret Martyrdom (`CARRIER'S BARGAIN`)**:
   - The operative rescues human survivors while concealing the lethal parasite in their own spine (*"The survivors are safe. Nobody checked your neck"*).

---

## 4. Dual-Perspective Alien Mimicry & Infiltration Framework

Documented in [docs/narrative-branching-symbiosis-and-allegiances.md](file:///home/caveman/Desktop/icecave/hunker-bunker/docs/narrative-branching-symbiosis-and-allegiances.md):

* **4 Relationship Vectors**:
  1. *Predatory Mimicry & Seduction*: Alien bio-infiltrator ("Aria" / Unit 0047-B) using synthetic warmth and sensory allure to compromise human defenses.
  2. *Human Solidarity & Vows*: Camaraderie, shared shelter, and escape pledges with camp leaders (Briggs, Martha, Kael).
  3. *Renegade Symbiosis*: Empathic neural bridge with alien ally Nahl against the Queen.
  4. *Swarm Wars*: Operative aligning with insurgent alien strains in inter-hive dominance conflicts.
* **Dual Roles**: Playing as the human defender (thermal biosensing, lure detection) vs. playing as the alien infiltrator (pheromone calming fields, vocal mimicry, social vs. predator mode switching).

---

## 5. QA & Test Execution Policy

* **Fast Unit / Regression Suite (`npm test`)**:
  - Uses Vitest to run all 180 test suites and 1,526 unit tests across mathematical invariants, world generation, AI, UI, and Steam contracts in **~11 seconds**.
  - Serves as the primary validation gate for every commit and feature branch.
* **Playwright E2E Suite (`npm run test:e2e`)**:
  - Full browser end-to-end rendering and playthrough tests take significantly longer to execute.
  - **Policy**: Run Playwright E2E tests only on special occasions (e.g. major release milestones, pre-release staging builds, or specific visual regression passes), keeping routine development fast and responsive.

---

## 6. Associated Documentation Links

- [docs/steam-review-failures-and-action-plan.md](file:///home/caveman/Desktop/icecave/hunker-bunker/docs/steam-review-failures-and-action-plan.md) — Steam review rejection remediation blueprint.
- [docs/narrative-endings-and-mature-content-guide.md](file:///home/caveman/Desktop/icecave/hunker-bunker/docs/narrative-endings-and-mature-content-guide.md) — 10-ending moral matrix and mature content guide.
- [docs/narrative-branching-symbiosis-and-allegiances.md](file:///home/caveman/Desktop/icecave/hunker-bunker/docs/narrative-branching-symbiosis-and-allegiances.md) — Alien mimicry, human bonding, and swarm war framework.
- [docs/steam-docs-master-index.md](file:///home/caveman/Desktop/icecave/hunker-bunker/docs/steam-docs-master-index.md) — Master index of all Steam and narrative documentation.
