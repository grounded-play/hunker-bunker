# Hunker Bunker: Master PM Onboarding

## Product in One Sentence

Hunker Bunker is a single-player, isometric Three.js survival roguelike in which an oxygen-limited bunker expedition turns into a faction and identity crisis after the player becomes linked to the alien Queen beneath Cocytus IV.

The memorable promise is not merely “procedural bunker shooter.” It is: **the resources, camps, anomalies, deaths, and class choices from the first half of a run become evidence against—or leverage for—the player in the second half.**

## The Player Arc

### Act 1: survive, salvage, and misunderstand

The player deploys from a crashed vessel, restores ship systems, explores increasingly dangerous radial bands, discovers human camps, and treats alien structures as resources or hazards. Oxygen is the route timer. The radial world and mission gates determine how far the player can safely push.

### Act 2: infection makes earlier choices legible

The Queen relationship reframes the world. Human camps remember support, theft, and violence. Hive sites reveal personalities and wounds. Humanity, cover, suspicion, obedience, camp status, and hive bond feed a boarding manifest with only four seats.

### Ending: explain the consequence

The code supports ten ending families, not five: the five original endings plus Mothership Infection, Alien Exodus, Outed Escape, Failed Carrier, and Empty Husk. The product requirement is that the player can answer “why did I get this ending?” without reading raw state.

## Class Identity

- **Scout:** speed/recon identity; class secret is the tracking-signal ship.
- **Engineer:** systems/terminal identity; class secret is the relay ship.
- **Tank:** durability/armor identity; class secret is the weapon ship.

All classes have universal sprint. Their implemented differentiation is currently strongest in stats, passives, interaction affinity, and the class-keyed wreckage/lore payoff—not three fully separate traversal ability kits. Do not schedule “Sprint Burst / Shoulder Slam / Overclock Slide” as if those are already approved production verbs; treat them as optional combat-design proposals requiring a feel decision.

## What Is Strong Today

- A large consequence state machine with persistence and migration.
- Camps, active faction verbs, ambient human behavior, and hive state.
- A radial procedural world with authored ring progression and landmark gates.
- A real run director and apex-threat triggers rather than only static spawn noise.
- A three-phase Queen fight with armor, add-control, and weak-point windows.
- Objective history and player guidance across major producers.
- A coherent Steam/Electron/backend architecture with unusually strong automated audits.
- Distinctive writing: 0047, Director Chen, the Queen, camp leaders, and Mothership voices.

## What Is Still Product-Risky

### First-hour friction

Skip flow, settings, input routing, and presentation work exist, but that does not prove the first 30 minutes are paced well. The remaining work is observed timing, comprehension, and interruption count on a clean profile.

### World readability after the 49×49 merge

The tile-band branch is merged and tests pass. The risk has moved from correctness to feel: whether merged halls read as purposeful routes, whether room identities are legible, and whether ring gates become learnable landmarks.

### Combat quality outside the Queen

The Queen has the phase framework and an automated economy simulation. Other bosses may still read as durable stat packages. Do not generalize Queen acceptance to the whole boss roster.

### State legibility

The internal model is deep enough. The PM problem is selecting the few player-facing summaries, warnings, and causal explanations that drive decisions.

### External acceptance

Code preparation is not Steam acceptance. Overlay, auth, achievements, stats, five leaderboards, Inventory, Auto-Cloud, controller-only traversal, and physical Deck behavior retain manual gates.

## Current Technical Shape

- **Renderer/runtime:** Three.js with a large `src/threeGame.js` integration surface and smaller pure modules around it.
- **Web shell:** `main.js` owns menus, dialogue, settings, Act 2 surfaces, audio loading, and renderer orchestration.
- **Desktop:** Electron packages `dist/`, the shell, and Steam Input configurations into Linux and Windows depots.
- **Persistence:** `hb_*` local state is mirrored into an atomic Electron `save.json`; server SQLite is for trusted online state, not a replacement for the full local narrative save.
- **Backend:** Express verifies one Steam auth ticket, mints a short-lived HMAC session, and handles trusted leaderboard, Inventory, and disabled-by-default store paths.
- **Release:** `npm run steam:upload` builds game/input/soundtrack depots; Steamworks publishing and setting the soundtrack build live remain operator actions.

## Sprint 22 Priorities

1. **Evidence before invention:** convert automated readiness into installed and human-observed acceptance.
2. **World tuning:** test merged rooms/halls, ring-gate identity, route clarity, and site spacing across representative seeds.
3. **First-hour observation:** measure first input, first decision, first combat, first camp, and first meaningful consequence.
4. **Combat comparison:** benchmark Queen, biome bosses, and ordinary enemies; extend phase mechanics only where the test shows monotony.
5. **Consequence UX:** show readable camp/hive/manifest summaries and preserve “why” explanations.
6. **Steam closure:** run the live auth/dashboard/Cloud/Input/Deck matrices before changing claims.
7. **Audio curation:** map selected OST cues to meaningful beats; avoid treating “43 files exist” as “43 cues should all play dynamically.”

## Decisions the PM Must Own

- What is the target first-session length and first meaningful choice?
- Which boss encounters need phases versus shorter HP/economy tuning?
- Which three state summaries deserve permanent HUD presence?
- What content is required for beta versus intentionally deferred?
- Which Steam features may be claimed only after recorded acceptance?
- Which soundtrack cues are diegetic, spatial, stateful, or DLC-only?

## Definition of Sprint 22 Done

- No syllabus item describes implemented code as hypothetical.
- Representative world seeds have recorded human readability findings.
- First-hour and combat acceptance scripts have observed results and follow-up owners.
- Installed Steam and physical Deck gaps are explicitly passed, failed, or scheduled—not implied.
- Store claims match the evidence matrix.
- Open work is expressed as a product outcome and acceptance test, not merely a proposed filename.
