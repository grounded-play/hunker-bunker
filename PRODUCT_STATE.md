# Hunker Bunker — Product State

Updated: 2026-10-17

Active branch: `dev/sprint-53`

Package: `2.4.17-beta`

Active milestone: **The Definitive First Expedition**

This is the canonical answer to “what is true today?” Plans, audits, release
notes, and worklogs are supporting evidence or history; they do not override
this file. A feature is not release-proven merely because its automated tests
pass.

## Verification marks

| Mark | Meaning |
| --- | --- |
| `[x]` | Implemented and covered by repeatable automated verification. |
| `[o]` | Exercised by a human in the desktop game. |
| `[D]` | Verified on a physical Steam Deck using a packaged build. |
| `[2P]` | Verified with two real Steam accounts/devices. |
| `[EXT]` | Requires publisher, platform, art, legal, or another external dependency. |
| `[DEF]` | Deliberately deferred beyond the current milestone. |

Marks are cumulative. For example, `[x][o]` means the implementation has both
automated and desktop play evidence; it does not imply Deck or two-account
acceptance.

## Current release truth

| Status | Area | What is true now | Next acceptance gate |
| --- | --- | --- | --- |
| `[x]` | Core expedition | Act 1 and Act 2, seeded campaign runs, camps, hives, world transformations, ten motion endings, faction state, objective packages, Depth Contract crossings, extraction, TRY AGAIN map persistence, and MAIN MENU map renewal are implemented. | Record the defined 35–45 minute run with a player who has not seen the game. They must understand the objective, O₂, build, crossing risk, extraction, and retained/lost progress without coaching. |
| `[x]` | Sector 0 onboarding | The five-phase authored tutorial drives movement, weapon acquisition, salvage banking, combat, and departure through real world actions. Fresh solo profiles automatically enter Sector 0. Completion persists on the profile; established legacy saves are migrated without being forced back through it. The pause menu offers an explicit skip that opens Sector 1 and grants a standard sidearm plus 25 tech. | Run the fresh-profile route on desktop and Deck. Confirm that death/retry restarts onboarding, completion does not replay it, and the transition into Ring 1 feels continuous. |
| `[x][o]` | Combat feel | Unified hit-stop, directional damage feedback, heavy-weapon FOV punch, oriented sparks, surface-aware footsteps, pitch variation, low-O₂ filtering, and synthesized heartbeat are live. | Balance in the Proof Run and capture packaged frame-time evidence during dense combat. |
| `[x][o]` | Enemy grammar | The tactical enemy triangle is complete: Chitin Scuttler swarms force rapid aim and pack clearing; Spore Mortars provide biological artillery that displaces the player from cover; and the Mycelium Stalker executes raycast-driven shadow flanking, breaks line-of-sight around walls, telegraphs high-speed pounces with mandible glow and predatory audio hisses, and flinches into retreat when illuminated by the suit flashlight or shot. | Prove all three enemy roles under live combat pressure during the 35–45 minute human Proof Run; verify that players naturally use flashlight aim and cover to counter the Stalker. |
| `[x]` | Relics and build expression | Eight transformative relics and the Cryo Shatter, Bio Predator, and Sub-Zero Necrosis synergy chains are live. Each safe-camp Field Workbench offers one deterministic three-choice recalibration draft, a 10-tech reroll, before/after comparison, meaningful upside/downside modifiers, localized UI, suspend-safe equipped mods, and a network-visible selection event alongside resupply recipes. | Prove in the First Expedition run that the choice changes how the player fights and is legible to a co-op peer. Component sacrifice and richer peer VFX are follow-up depth, not blockers for this bounded draft. |
| `[x][o]` | Arcade | SUB-CRUST PROTOCOL: 1984 and Black-Ice 21 are playable. Arcade Reflexes, CHROMA VECTOR 84, Tina radio payoff, score persistence, fixed-step simulation, and published arcade achievements are integrated. | Keep stable during controller and Deck journey testing; do not add another arcade mode during this milestone. |
| `[x]` | Co-op PvE | Lobby, authentication, ready/deploy, synchronized operators, authoritative enemies and drops, prop breakage/movement, death markers, Black Boxes, redeploy, reconnect reconciliation, chat, pings, and shared world events are automated. | `[2P]` Run a packaged Deck-host/PC-guest expedition through combat, workbench use, one death, TRY AGAIN, extraction, and reconnect. Networked companions and remaining solo-only events are still open. |
| `[x]` | PvP | Four-heart authority, spawn protection, healing, hit telemetry, round lifecycle, leaderboard exclusion, deterministic world seed, dynamic prop authority, and hostile snapshots are implemented and tested across PvE/PvP modes. | `[2P]` Verify bidirectional damage, death/result, rematch, prop movement, and reconnect against the deployed relay on two devices. Do not reopen the completed parity architecture without a reproduced failure. |
| `[x]` | Controller and input | Twin-stick control, Steam Input configurations, action-set routing, D-pad tactical ping, focus navigation, glyphs, double-press suppression, and browser-gamepad fallback are implemented. | `[D]` Complete Title → Armory → Sector 0 → camp/workbench → extraction → debrief without keyboard, touch, focus traps, or incorrect prompts. |
| `[x]` | Save, recovery, and Cloud | Solo expedition suspend/resume, Black Box fallback, portable save codes, Steam Cloud bridge, and stat definitions exist. | `[D]` Sleep/wake mid-expedition with no corrupt state or audio lock. `[EXT]` Complete a real Machine A → Cloud → Machine B conflict/offline round trip. |
| `[x]` | Performance | CPU hot paths, light pool stability, mixer culling, cliff batching, layout caching, adaptive resolution, KTX2 runtime textures, boot deferral, and the mobile Lighthouse 93 CI gate are implemented. | `[D]` Capture a fixed 25-minute Deck route at presented p95 ≤ 33.3 ms. Capture the Windows RTX 2070 route at p95 ≤ 16.7 ms and confirm no unexplained shader stall above 250 ms. Per-cell wall/door trim batching remains contingent on profiling. |
| `[x]` | Localization | Seven locales have key parity, runtime switching, localized narrative/UI catalogs, and automated DOM/runtime audits. | `[EXT]` Native-speaker linguistic review remains required. Machine-authored parity is not linguistic acceptance. |
| `[x]` | Presentation | AgX tone mapping, reflections, bloom, dynamic shadows, 3D tracers, radar wavefront, default lower dock, cinematics, and voice banks are integrated. | Verify 1080p, 1440p, 4K, and 1280×800 readability. Reactive visor wear and animated radio portraits remain optional polish after the Proof Run. |
| `[x]` | Steam backend and commerce code | Steam authentication, lobbies, leaderboards, inventory/store paths, trusted submissions, purchase reconciliation, and retry contracts are implemented. | `[EXT]` Re-run production smoke tests, enable approved production commerce flags, confirm live Item Store definitions, and execute a real purchase/settlement/reversal drill. |
| `[x]` | Retail assets | Automated media, model, chroma-key, soundtrack, and catalog audits exist. The chroma report currently has zero unallowlisted findings; known generated sprites still use an allowlisted CPU keying path. | Pre-bake the highest-cost keyed sprites to RGBA/KTX2 when profiling justifies it. `[EXT]` Confirm external actor/art rights and receive/register Prop 80 Hull Shard. |
| `[DEF]` | Expansion breadth | Additional operator classes, multiple new biomes, broad black-market economy, another arcade game, and achievement-count expansion are outside the current milestone. | Reconsider only after the Proof Run, Deck journey, and two-account expedition pass. |

## Definitive First Expedition contract

The current milestone is complete only when all of the following are true:

1. A fresh solo profile enters Sector 0 automatically and can explicitly skip
   it without becoming under-equipped or trapped.
2. The player receives a clear objective in the first minute and learns
   movement, firing, interaction, salvage banking, O₂ pressure, and departure
   through play.
3. One safe camp produces a meaningful build decision, not only resupply.
4. At least three enemy roles create visibly different tactical responses.
5. A ring crossing clearly communicates both increased reward and increased
   danger.
6. Extraction or death explains what was gained, lost, retained, and worth
   pursuing next.
7. The complete route passes as a packaged desktop run, a controller-only
   Steam Deck run, and a two-account co-op run.

The executable player-facing shape is defined in
[`docs/design/game-outline-and-proof-run.md`](docs/design/game-outline-and-proof-run.md).
The active hardware, multiplayer, performance, visual, Cloud, and publisher
gates live in
[`docs/planning/sprint-53-master-verification-and-execution-plan-2026-10-17.md`](docs/planning/sprint-53-master-verification-and-execution-plan-2026-10-17.md).
Implementation status for the recent arcade, combat-juice, audio, Sector 0,
and enemy work is recorded in
[`docs/planning/aaa-gameplay-juice-story-tutorial-and-arcade-expansion-plan-2026-10-16.md`](docs/planning/aaa-gameplay-juice-story-tutorial-and-arcade-expansion-plan-2026-10-16.md#11-implementation-status-verified-2026-10-17).

## Update rule

Change a mark only when its named evidence exists. Automated test counts do
not replace human comprehension, physical hardware, real accounts, production
services, or publisher approval. When a plan conflicts with this file, either
update this file with new evidence or treat the plan as historical.
